import Anthropic from '@anthropic-ai/sdk';
import { AIProviderConfig, BaseAIProvider, ChatMessage } from '../interfaces/ai-provider.interface';

export class ClaudeProvider extends BaseAIProvider {
  private client: Anthropic;

  constructor(config: AIProviderConfig) {
    super(config);
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    // Filter out system messages from the messages array (Claude uses system parameter)
    const nonSystemMessages = messages.filter(m => m.role !== 'system');
    
    const response = await this.client.messages.create({
      model: this.config.model || 'claude-sonnet-4-5-20250929',
      max_tokens: this.config.maxTokens || 500,
      temperature: this.config.temperature,
      system: systemPrompt,
      messages: nonSystemMessages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
    });

    const content = response.content[0];
    return content.type === 'text' ? content.text : 'Sorry, I could not generate a response.';
  }

  getProviderName(): string {
    return 'claude';
  }
}
