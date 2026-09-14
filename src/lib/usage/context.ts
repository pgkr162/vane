import { AsyncLocalStorage } from 'node:async_hooks';

type UsageContext = {
  userId: string;
};

const storage = new AsyncLocalStorage<UsageContext>();

export function runWithUsageContext<T>(userId: string, fn: () => T): T {
  return storage.run({ userId }, fn);
}

export function getUsageUserId() {
  return storage.getStore()?.userId ?? null;
}
