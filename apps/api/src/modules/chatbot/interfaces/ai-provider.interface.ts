export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIProviderConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  chat(messages: ChatMessage[], systemPrompt?: string): Promise<string>;
  getProviderName(): string;
}

export abstract class BaseAIProvider implements AIProvider {
  protected config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = {
      maxTokens: 500,
      temperature: 0.7,
      ...config,
    };
  }

  abstract chat(messages: ChatMessage[], systemPrompt?: string): Promise<string>;
  abstract getProviderName(): string;
}
