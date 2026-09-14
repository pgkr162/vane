import { MinimalProvider, ModelWithProvider } from '@/lib/models/types';

export const LUNA_MODEL = 'gpt-5.6-luna';
export const FLASH_MODEL = 'deepseek-flash';
export const MINIMAX_MODEL = 'MiniMax-M3';
export const PREFERRED_EMBEDDING = 'text-embedding-3-small';

export type SearchMode = 'speed' | 'balanced' | 'quality';
export type SearchPresetKey =
  | 'auto'
  | 'fast'
  | 'balanced'
  | 'deep'
  | 'long'
  | 'custom';

export type SearchPreset = {
  key: Exclude<SearchPresetKey, 'custom'>;
  mode: SearchMode;
  modelKey: string | null;
};

export const SEARCH_PRESETS: SearchPreset[] = [
  { key: 'auto', mode: 'balanced', modelKey: null },
  { key: 'fast', mode: 'speed', modelKey: FLASH_MODEL },
  { key: 'balanced', mode: 'balanced', modelKey: LUNA_MODEL },
  { key: 'deep', mode: 'quality', modelKey: FLASH_MODEL },
  { key: 'long', mode: 'quality', modelKey: MINIMAX_MODEL },
];

export function getSearchPreset(key: SearchPresetKey) {
  return SEARCH_PRESETS.find((preset) => preset.key === key);
}

export function findChatModel(
  providers: MinimalProvider[],
  modelKey: string,
): ModelWithProvider | null {
  const provider = providers.find((item) =>
    item.chatModels.some((model) => model.key === modelKey),
  );
  return provider ? { providerId: provider.id, key: modelKey } : null;
}

export function resolveChatModel(
  providers: MinimalProvider[],
  preferredKey?: string | null,
): ModelWithProvider | null {
  const preferred = preferredKey
    ? findChatModel(providers, preferredKey)
    : null;
  if (preferred) return preferred;

  return (
    findChatModel(providers, LUNA_MODEL) ??
    findChatModel(providers, FLASH_MODEL) ??
    findChatModel(providers, MINIMAX_MODEL) ??
    firstChatModel(providers)
  );
}

export function findEmbeddingModel(
  providers: MinimalProvider[],
  modelKey: string,
): ModelWithProvider | null {
  const provider = providers.find((item) =>
    item.embeddingModels.some((model) => model.key === modelKey),
  );
  return provider ? { providerId: provider.id, key: modelKey } : null;
}

export function resolveEmbeddingModel(
  providers: MinimalProvider[],
  stored?: ModelWithProvider | null,
): ModelWithProvider | null {
  const chatKeys = new Set([LUNA_MODEL, FLASH_MODEL, MINIMAX_MODEL]);
  const usableStored =
    stored && !chatKeys.has(stored.key) ? stored : null;

  if (usableStored) {
    const provider = providers.find((item) => item.id === usableStored.providerId);
    if (provider?.embeddingModels.some((model) => model.key === usableStored.key)) {
      return usableStored;
    }
  }

  return (
    findEmbeddingModel(providers, PREFERRED_EMBEDDING) ??
    firstEmbeddingModel(providers)
  );
}

function firstChatModel(
  providers: MinimalProvider[],
): ModelWithProvider | null {
  const provider = providers.find((item) => item.chatModels.length > 0);
  if (!provider) return null;
  return { providerId: provider.id, key: provider.chatModels[0].key };
}

function firstEmbeddingModel(
  providers: MinimalProvider[],
): ModelWithProvider | null {
  const provider = providers.find((item) => item.embeddingModels.length > 0);
  if (!provider) return null;
  return { providerId: provider.id, key: provider.embeddingModels[0].key };
}
