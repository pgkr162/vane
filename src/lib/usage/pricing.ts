const DEFAULT_PRICE = { input: 1, output: 3 };

const PRICES_PER_MILLION: Record<string, { input: number; output: number }> = {
  'gpt-5.6-luna': { input: 2.5, output: 15 },
  'deepseek-flash': { input: 0.14, output: 0.28 },
  'MiniMax-M3': { input: 0.32, output: 1.2 },
  'text-embedding-3-small': { input: 0.02, output: 0 },
  'text-embedding-3-large': { input: 0.13, output: 0 },
};

export function estimateUsageCents(
  model: string,
  promptTokens: number,
  completionTokens: number,
) {
  const price = PRICES_PER_MILLION[model] ?? DEFAULT_PRICE;
  const usd =
    (promptTokens / 1_000_000) * price.input +
    (completionTokens / 1_000_000) * price.output;
  return Math.round(usd * 100);
}
