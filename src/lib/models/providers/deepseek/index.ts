import { UIConfigField } from '@/lib/config/types';
import { getConfiguredModelProviderById } from '@/lib/config/serverRegistry';
import { Model, ModelList, ProviderMetadata } from '../../types';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import DeepSeekLLM from './deepseekLLM';

interface DeepSeekConfig {
  apiKey: string;
}

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com';

const MODEL_NAMES: Record<string, string> = {
  'deepseek-flash': 'DeepSeek Flash',
  'deepseek-v4-pro': 'DeepSeek V4 Pro',
};

const FALLBACK_CHAT_MODELS: Model[] = [
  { name: MODEL_NAMES['deepseek-flash'], key: 'deepseek-flash' },
  { name: MODEL_NAMES['deepseek-v4-pro'], key: 'deepseek-v4-pro' },
];

const providerConfigFields: UIConfigField[] = [
  {
    type: 'password',
    name: 'API Key',
    key: 'apiKey',
    description: 'Your DeepSeek API key',
    required: true,
    placeholder: 'DeepSeek API Key',
    env: 'DEEPSEEK_API_KEY',
    scope: 'server',
  },
];

class DeepSeekProvider extends BaseModelProvider<DeepSeekConfig> {
  constructor(id: string, name: string, config: DeepSeekConfig) {
    super(id, name, config);
  }

  async getDefaultModels(): Promise<ModelList> {
    try {
      const res = await fetch(`${DEEPSEEK_BASE_URL}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.config.apiKey}`,
        },
      });

      if (!res.ok) {
        return {
          embedding: [],
          chat: FALLBACK_CHAT_MODELS,
        };
      }

      const data = await res.json();
      const chat: Model[] = Array.isArray(data?.data)
        ? data.data.map((m: { id?: string }) => {
            const key = String(m.id ?? '');
            return {
              key,
              name: MODEL_NAMES[key] ?? key,
            };
          })
        : FALLBACK_CHAT_MODELS;

      return {
        embedding: [],
        chat: chat.filter((m) => m.key),
      };
    } catch {
      return {
        embedding: [],
        chat: FALLBACK_CHAT_MODELS,
      };
    }
  }

  async getModelList(): Promise<ModelList> {
    const defaultModels = await this.getDefaultModels();
    const configProvider = getConfiguredModelProviderById(this.id)!;

    return {
      embedding: [
        ...defaultModels.embedding,
        ...configProvider.embeddingModels,
      ],
      chat: [...defaultModels.chat, ...configProvider.chatModels],
    };
  }

  async loadChatModel(key: string): Promise<BaseLLM<any>> {
    const modelList = await this.getModelList();

    const exists = modelList.chat.find((m) => m.key === key);

    if (!exists) {
      throw new Error(
        'Error Loading DeepSeek Chat Model. Invalid Model Selected',
      );
    }

    return new DeepSeekLLM({
      apiKey: this.config.apiKey,
      model: key,
      baseURL: DEEPSEEK_BASE_URL,
    });
  }

  async loadEmbeddingModel(key: string): Promise<BaseEmbedding<any>> {
    throw new Error('DeepSeek Provider does not support embedding models.');
  }

  static parseAndValidate(raw: any): DeepSeekConfig {
    if (!raw || typeof raw !== 'object')
      throw new Error('Invalid config provided. Expected object');
    if (!raw.apiKey)
      throw new Error('Invalid config provided. API key must be provided');

    return {
      apiKey: String(raw.apiKey),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: 'deepseek',
      name: 'DeepSeek',
    };
  }
}

export default DeepSeekProvider;
