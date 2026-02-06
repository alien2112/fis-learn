import OpenAI from 'openai';
import { AIProviderConfig, BaseAIProvider, ChatMessage } from '../interfaces/ai-provider.interface';

export class OpenAIProvider extends BaseAIProvider {
  private client: OpenAI;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new OpenAI({
      apiKey: config.apiKey,
    });
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    // Build messages array, including system prompt if provided
    const apiMessages: ChatMessage[] = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const response = await this.client.chat.completions.create({
      model: this.config.model || 'gpt-4o-mini',
      max_tokens: this.config.maxTokens,
      temperature: this.config.temperature,
      messages: apiMessages.map(m => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    });

    return response.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
  }

  getProviderName(): string {
    return 'openai';
  }
}
