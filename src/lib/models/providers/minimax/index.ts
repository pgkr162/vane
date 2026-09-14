import { UIConfigField } from '@/lib/config/types';
import { getConfiguredModelProviderById } from '@/lib/config/serverRegistry';
import { Model, ModelList, ProviderMetadata } from '../../types';
import BaseEmbedding from '../../base/embedding';
import BaseModelProvider from '../../base/provider';
import BaseLLM from '../../base/llm';
import MiniMaxLLM from './minimaxLLM';

interface MiniMaxConfig {
  apiKey: string;
  baseURL: string;
}

const MINIMAX_CN_BASE_URL = 'https://api.minimaxi.com/v1';

const MINIMAX_CHAT_MODEL: Model = {
  name: 'MiniMax M3',
  key: 'MiniMax-M3',
};

const providerConfigFields: UIConfigField[] = [
  {
    type: 'password',
    name: 'API Key',
    key: 'apiKey',
    description: 'Your MiniMax CN API key',
    required: true,
    placeholder: 'MiniMax API Key',
    env: 'MINIMAX_API_KEY',
    scope: 'server',
  },
  {
    type: 'string',
    name: 'Base URL',
    key: 'baseURL',
    description: 'MiniMax CN OpenAI-compatible API base URL',
    required: true,
    placeholder: MINIMAX_CN_BASE_URL,
    default: MINIMAX_CN_BASE_URL,
    env: 'MINIMAX_BASE_URL',
    scope: 'server',
  },
];

class MiniMaxProvider extends BaseModelProvider<MiniMaxConfig> {
  constructor(id: string, name: string, config: MiniMaxConfig) {
    super(id, name, config);
  }

  async getDefaultModels(): Promise<ModelList> {
    return {
      embedding: [],
      chat: [MINIMAX_CHAT_MODEL],
    };
  }

  async getModelList(): Promise<ModelList> {
    const configProvider = getConfiguredModelProviderById(this.id)!;

    return {
      embedding: [...configProvider.embeddingModels],
      chat: [MINIMAX_CHAT_MODEL],
    };
  }

  async loadChatModel(key: string): Promise<BaseLLM<any>> {
    const modelList = await this.getModelList();

    const exists = modelList.chat.find((m) => m.key === key);

    if (!exists) {
      throw new Error(
        'Error Loading MiniMax Chat Model. Invalid Model Selected',
      );
    }

    return new MiniMaxLLM({
      apiKey: this.config.apiKey,
      model: key,
      baseURL: this.config.baseURL || MINIMAX_CN_BASE_URL,
    });
  }

  async loadEmbeddingModel(key: string): Promise<BaseEmbedding<any>> {
    throw new Error('MiniMax Provider does not support embedding models.');
  }

  static parseAndValidate(raw: any): MiniMaxConfig {
    if (!raw || typeof raw !== 'object')
      throw new Error('Invalid config provided. Expected object');
    if (!raw.apiKey)
      throw new Error('Invalid config provided. API key must be provided');

    return {
      apiKey: String(raw.apiKey),
      baseURL: String(raw.baseURL || MINIMAX_CN_BASE_URL),
    };
  }

  static getProviderConfigFields(): UIConfigField[] {
    return providerConfigFields;
  }

  static getProviderMetadata(): ProviderMetadata {
    return {
      key: 'minimax',
      name: 'MiniMax CN',
    };
  }
}

export default MiniMaxProvider;
