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

const DEEPSEEK_CHAT_MODEL: Model = {
  name: 'DeepSeek Flash',
  key: 'deepseek-flash',
};

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
    return {
      embedding: [],
      chat: [DEEPSEEK_CHAT_MODEL],
    };
  }

  async getModelList(): Promise<ModelList> {
    const configProvider = getConfiguredModelProviderById(this.id)!;

    return {
      embedding: [...configProvider.embeddingModels],
      chat: [DEEPSEEK_CHAT_MODEL],
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
