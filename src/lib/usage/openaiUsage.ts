export type OpenAIUsageLike = {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
  input_tokens?: number;
  output_tokens?: number;
} | null | undefined;

export function usageFromOpenAI(usage: OpenAIUsageLike) {
  if (!usage) return null;
  const promptTokens = usage.prompt_tokens ?? usage.input_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? usage.output_tokens ?? 0;
  const totalTokens =
    usage.total_tokens ?? promptTokens + completionTokens;
  if (promptTokens <= 0 && completionTokens <= 0 && totalTokens <= 0) {
    return null;
  }
  return {
    promptTokens,
    completionTokens,
    totalTokens: totalTokens || promptTokens + completionTokens,
  };
}
