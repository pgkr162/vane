import { AsyncLocalStorage } from 'node:async_hooks';

export type UsageSink = {
  promptTokens: number;
  completionTokens: number;
};

type UsageContext = {
  userId: string;
  nonce: string | null;
  sink: UsageSink;
};

const storage = new AsyncLocalStorage<UsageContext>();

export function runWithUsageContext<T>(
  input: string | { userId: string; nonce?: string | null; sink?: UsageSink },
  fn: () => T,
): T {
  const userId = typeof input === 'string' ? input : input.userId;
  const nonce = typeof input === 'string' ? null : (input.nonce ?? null);
  const sink =
    typeof input === 'string'
      ? { promptTokens: 0, completionTokens: 0 }
      : (input.sink ?? { promptTokens: 0, completionTokens: 0 });
  return storage.run({ userId, nonce, sink }, fn);
}

export function getUsageUserId() {
  return storage.getStore()?.userId ?? null;
}

export function captureUsage(promptTokens: number, completionTokens: number) {
  const store = storage.getStore();
  if (!store) return;
  store.sink.promptTokens += Math.max(0, promptTokens);
  store.sink.completionTokens += Math.max(0, completionTokens);
}
