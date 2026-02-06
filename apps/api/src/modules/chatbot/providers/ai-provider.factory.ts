import { AIProvider, AIProviderConfig } from '../interfaces/ai-provider.interface';
import { ClaudeProvider } from './claude.provider';
import { OpenAIProvider } from './openai.provider';

export type AIProviderType = 'claude' | 'openai';

export class AIProviderFactory {
  static createProvider(providerType: AIProviderType, config: AIProviderConfig): AIProvider {
    switch (providerType) {
      case 'claude':
        return new ClaudeProvider(config);
      case 'openai':
        return new OpenAIProvider(config);
      default:
        throw new Error(`Unsupported AI provider: ${providerType}`);
    }
  }

  static getAvailableProviders(): AIProviderType[] {
    return ['claude', 'openai'];
  }
}
