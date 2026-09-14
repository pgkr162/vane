import OpenAI from 'openai';
import BaseLLM from '../../base/llm';
import { zodTextFormat, zodResponseFormat } from 'openai/helpers/zod';
import {
  GenerateObjectInput,
  GenerateOptions,
  GenerateTextInput,
  GenerateTextOutput,
  StreamTextOutput,
  ToolCall,
} from '../../types';
import { parse } from 'partial-json';
import z from 'zod';
import {
  ChatCompletionAssistantMessageParam,
  ChatCompletionMessageParam,
  ChatCompletionTool,
  ChatCompletionToolMessageParam,
} from 'openai/resources/index.mjs';
import type {
  FunctionTool,
  ResponseFunctionToolCall,
  ResponseInputItem,
} from 'openai/resources/responses/responses';
import { Message } from '@/lib/types';
import { repairJson } from '@toolsycc/json-repair';
import { recordTokenUsage } from '@/lib/usage/store';
import { usageFromOpenAI } from '@/lib/usage/openaiUsage';

type OpenAIConfig = {
  apiKey: string;
  model: string;
  baseURL?: string;
  options?: GenerateOptions;
};

class OpenAILLM extends BaseLLM<OpenAIConfig> {
  openAIClient: OpenAI;

  constructor(protected config: OpenAIConfig) {
    super(config);

    this.openAIClient = new OpenAI({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseURL || 'https://api.openai.com/v1',
    });
  }

  noteUsage(usage: Parameters<typeof usageFromOpenAI>[0]) {
    const parsed = usageFromOpenAI(usage);
    if (!parsed) return;
    recordTokenUsage({
      model: this.config.model,
      promptTokens: parsed.promptTokens,
      completionTokens: parsed.completionTokens,
      totalTokens: parsed.totalTokens,
    });
  }

  convertToOpenAIMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.map((msg) => {
      if (msg.role === 'tool') {
        return {
          role: 'tool',
          tool_call_id: msg.id,
          content: msg.content,
        } as ChatCompletionToolMessageParam;
      } else if (msg.role === 'assistant') {
        return {
          role: 'assistant',
          content: msg.content,
          ...(msg.tool_calls &&
            msg.tool_calls.length > 0 && {
              tool_calls: msg.tool_calls?.map((tc) => ({
                id: tc.id,
                type: 'function',
                function: {
                  name: tc.name,
                  arguments: JSON.stringify(tc.arguments),
                },
              })),
            }),
        } as ChatCompletionAssistantMessageParam;
      }

      return msg;
    });
  }

  async generateText(input: GenerateTextInput): Promise<GenerateTextOutput> {
    if (usesResponsesForTools(this.config.model, input.tools)) {
      return this.generateTextViaResponses(input);
    }

    const openaiTools = toOpenAITools(input.tools);

    const response = await this.openAIClient.chat.completions.create({
      model: this.config.model,
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      messages: this.convertToOpenAIMessages(input.messages),
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      max_completion_tokens:
        input.options?.maxTokens ?? this.config.options?.maxTokens,
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
    });

    if (response.choices && response.choices.length > 0) {
      this.noteUsage(response.usage);
      return {
        content: response.choices[0].message.content!,
        toolCalls:
          response.choices[0].message.tool_calls
            ?.map((tc) => {
              if (tc.type === 'function') {
                return {
                  name: tc.function.name,
                  id: tc.id,
                  arguments: JSON.parse(tc.function.arguments),
                };
              }
            })
            .filter((tc) => tc !== undefined) || [],
        additionalInfo: {
          finishReason: response.choices[0].finish_reason,
        },
      };
    }

    throw new Error('No response from OpenAI');
  }

  private async generateTextViaResponses(
    input: GenerateTextInput,
  ): Promise<GenerateTextOutput> {
    const response = await this.openAIClient.responses.create({
      model: this.config.model,
      input: toResponseInput(input.messages),
      tools: toResponseTools(input.tools),
      reasoning: reasoningConfig(this.config.model),
      max_output_tokens:
        input.options?.maxTokens ?? this.config.options?.maxTokens,
    });

    this.noteUsage(response.usage);
    return {
      content: response.output_text ?? '',
      toolCalls: response.output
        .filter(
          (item): item is ResponseFunctionToolCall =>
            item.type === 'function_call',
        )
        .map((item) => ({
          id: item.call_id,
          name: item.name,
          arguments: JSON.parse(item.arguments || '{}'),
        })),
      additionalInfo: {
        finishReason: response.status,
      },
    };
  }

  async *streamText(
    input: GenerateTextInput,
  ): AsyncGenerator<StreamTextOutput> {
    if (usesResponsesForTools(this.config.model, input.tools)) {
      yield* this.streamTextViaResponses(input);
      return;
    }

    const openaiTools = toOpenAITools(input.tools);

    const stream = await this.openAIClient.chat.completions.create({
      model: this.config.model,
      messages: this.convertToOpenAIMessages(input.messages),
      tools: openaiTools.length > 0 ? openaiTools : undefined,
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      max_completion_tokens:
        input.options?.maxTokens ?? this.config.options?.maxTokens,
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
      stream: true,
      stream_options: { include_usage: true },
    });

    let recievedToolCalls: { name: string; id: string; arguments: string }[] =
      [];

    for await (const chunk of stream) {
      if (chunk.usage) {
        this.noteUsage(chunk.usage);
      }
      if (chunk.choices && chunk.choices.length > 0) {
        const toolCalls = chunk.choices[0].delta.tool_calls;
        yield {
          contentChunk: chunk.choices[0].delta.content || '',
          toolCallChunk:
            toolCalls?.map((tc) => {
              if (!recievedToolCalls[tc.index]) {
                const call = {
                  name: tc.function?.name!,
                  id: tc.id!,
                  arguments: tc.function?.arguments || '',
                };
                recievedToolCalls.push(call);
                return { ...call, arguments: parse(call.arguments || '{}') };
              } else {
                const existingCall = recievedToolCalls[tc.index];
                existingCall.arguments += tc.function?.arguments || '';
                return {
                  ...existingCall,
                  arguments: parse(existingCall.arguments),
                };
              }
            }) || [],
          done: chunk.choices[0].finish_reason !== null,
          additionalInfo: {
            finishReason: chunk.choices[0].finish_reason,
          },
        };
      }
    }
  }

  private async *streamTextViaResponses(
    input: GenerateTextInput,
  ): AsyncGenerator<StreamTextOutput> {
    const stream = this.openAIClient.responses.stream({
      model: this.config.model,
      input: toResponseInput(input.messages),
      tools: toResponseTools(input.tools),
      reasoning: reasoningConfig(this.config.model),
      max_output_tokens:
        input.options?.maxTokens ?? this.config.options?.maxTokens,
    });

    const toolCalls = new Map<
      string,
      { name: string; id: string; arguments: string }
    >();

    for await (const event of stream) {
      if (event.type === 'response.failed') {
        throw new Error(
          event.response.error?.message ?? 'OpenAI response failed',
        );
      }

      if (event.type === 'response.output_text.delta' && event.delta) {
        yield {
          contentChunk: event.delta,
          toolCallChunk: [],
          done: false,
        };
        continue;
      }

      if (
        event.type === 'response.output_item.added' &&
        event.item.type === 'function_call'
      ) {
        toolCalls.set(event.item.id ?? event.item.call_id, {
          name: event.item.name,
          id: event.item.call_id,
          arguments: event.item.arguments || '',
        });
        continue;
      }

      if (event.type === 'response.function_call_arguments.delta') {
        const existing = toolCalls.get(event.item_id);
        if (!existing) {
          continue;
        }

        existing.arguments += event.delta;
        yield {
          contentChunk: '',
          toolCallChunk: [
            {
              name: existing.name,
              id: existing.id,
              arguments: parse(existing.arguments || '{}'),
            },
          ],
          done: false,
        };
        continue;
      }

      if (event.type === 'response.function_call_arguments.done') {
        const existing = toolCalls.get(event.item_id);
        const call = existing ?? {
          name: event.name,
          id: event.item_id,
          arguments: event.arguments,
        };
        call.arguments = event.arguments;
        yield {
          contentChunk: '',
          toolCallChunk: [
            {
              name: call.name,
              id: call.id,
              arguments: parse(call.arguments || '{}'),
            },
          ],
          done: false,
        };
        continue;
      }

      if (event.type === 'response.completed') {
        this.noteUsage(
          event.response.usage as Parameters<typeof usageFromOpenAI>[0],
        );
        yield {
          contentChunk: '',
          toolCallChunk: [],
          done: true,
          additionalInfo: {
            finishReason: event.response.status,
          },
        };
      }
    }
  }

  async generateObject<T>(input: GenerateObjectInput): Promise<T> {
    const response = await this.openAIClient.chat.completions.parse({
      messages: this.convertToOpenAIMessages(input.messages),
      model: this.config.model,
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      max_completion_tokens:
        input.options?.maxTokens ?? this.config.options?.maxTokens,
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
      response_format: zodResponseFormat(input.schema, 'object'),
    });

    if (response.choices && response.choices.length > 0) {
      this.noteUsage(response.usage);
      try {
        return input.schema.parse(
          JSON.parse(
            repairJson(response.choices[0].message.content!, {
              extractJson: true,
            }) as string,
          ),
        ) as T;
      } catch (err) {
        throw new Error(`Error parsing response from OpenAI: ${err}`);
      }
    }

    throw new Error('No response from OpenAI');
  }

  async *streamObject<T>(input: GenerateObjectInput): AsyncGenerator<T> {
    let recievedObj: string = '';

    const stream = this.openAIClient.responses.stream({
      model: this.config.model,
      input: input.messages,
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 1.0,
      top_p: input.options?.topP ?? this.config.options?.topP,
      max_completion_tokens:
        input.options?.maxTokens ?? this.config.options?.maxTokens,
      stop: input.options?.stopSequences ?? this.config.options?.stopSequences,
      frequency_penalty:
        input.options?.frequencyPenalty ??
        this.config.options?.frequencyPenalty,
      presence_penalty:
        input.options?.presencePenalty ?? this.config.options?.presencePenalty,
      text: {
        format: zodTextFormat(input.schema, 'object'),
      },
    });

    for await (const chunk of stream) {
      if (chunk.type === 'response.output_text.delta' && chunk.delta) {
        recievedObj += chunk.delta;

        try {
          yield parse(recievedObj) as T;
        } catch (err) {
          console.log('Error parsing partial object from OpenAI:', err);
          yield {} as T;
        }
      } else if (chunk.type === 'response.output_text.done' && chunk.text) {
        try {
          yield parse(chunk.text) as T;
        } catch (err) {
          throw new Error(`Error parsing response from OpenAI: ${err}`);
        }
      }
    }
  }
}

function toOpenAITools(
  tools: GenerateTextInput['tools'],
): ChatCompletionTool[] {
  return (
    tools?.map((tool) => ({
      type: 'function' as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: z.toJSONSchema(tool.schema),
      },
    })) ?? []
  );
}

function isReasoningModel(model: string) {
  return /gpt-5|o[1-4]|luna/i.test(model);
}

function usesResponsesForTools(
  model: string,
  tools: GenerateTextInput['tools'],
) {
  return Boolean(tools?.length) && isReasoningModel(model);
}

function reasoningConfig(model: string) {
  if (/gpt-5(?:\.\d+)?-pro/i.test(model)) {
    return { effort: 'high' as const, summary: 'auto' as const };
  }

  return { effort: 'medium' as const, summary: 'auto' as const };
}

function toResponseTools(tools: GenerateTextInput['tools']): FunctionTool[] {
  return (
    tools?.map((tool) => ({
      type: 'function' as const,
      name: tool.name,
      description: tool.description,
      parameters: z.toJSONSchema(tool.schema) as Record<string, unknown>,
      strict: false,
    })) ?? []
  );
}

function toResponseInput(messages: Message[]): ResponseInputItem[] {
  const items: ResponseInputItem[] = [];

  for (const msg of messages) {
    if (msg.role === 'system' || msg.role === 'user') {
      items.push({
        role: msg.role,
        content: msg.content,
      });
      continue;
    }

    if (msg.role === 'assistant') {
      if (msg.content) {
        items.push({
          role: 'assistant',
          content: msg.content,
        });
      }

      for (const toolCall of msg.tool_calls ?? []) {
        items.push({
          type: 'function_call',
          call_id: toolCall.id,
          name: toolCall.name,
          arguments: JSON.stringify(toolCall.arguments ?? {}),
        });
      }
      continue;
    }

    items.push({
      type: 'function_call_output',
      call_id: msg.id,
      output: msg.content,
    });
  }

  return items;
}

export default OpenAILLM;
