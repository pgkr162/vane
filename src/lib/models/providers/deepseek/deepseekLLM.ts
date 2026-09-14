import OpenAILLM from '../openai/openaiLLM';
import { GenerateObjectInput } from '../../types';
import { repairJson } from '@toolsycc/json-repair';
import z from 'zod';

class DeepSeekLLM extends OpenAILLM {
  async generateObject<T>(input: GenerateObjectInput): Promise<T> {
    const schemaHint = JSON.stringify(z.toJSONSchema(input.schema));
    const response = await this.openAIClient.chat.completions.create({
      model: this.config.model,
      messages: [
        ...this.convertToOpenAIMessages(input.messages),
        {
          role: 'system',
          content: `Respond with a JSON object that matches this schema:\n${schemaHint}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature:
        input.options?.temperature ?? this.config.options?.temperature ?? 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from DeepSeek');
    }

    try {
      return input.schema.parse(
        JSON.parse(
          repairJson(content, {
            extractJson: true,
          }) as string,
        ),
      ) as T;
    } catch (err) {
      throw new Error(`Error parsing response from DeepSeek: ${err}`);
    }
  }
}

export default DeepSeekLLM;
