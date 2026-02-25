import { GoogleGenerativeAI, Part } from '@google/generative-ai';
import { AIProviderConfig, BaseAIProvider, ChatMessage } from '../interfaces/ai-provider.interface';
import { Logger } from '@nestjs/common';

export class GeminiProvider extends BaseAIProvider {
  private genAI: GoogleGenerativeAI;
  private readonly logger = new Logger(GeminiProvider.name);

  // Models prioritized by availability and performance based on the user's API key capabilities
  private readonly models = [
    'gemini-3-flash-preview',
    'gemini-3-pro-preview',
    'gemini-2.5-flash',
    'gemini-2.5-pro',
    'gemini-flash-latest',
    'gemini-pro-latest',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
    'gemini-1.5-pro',
  ];

  constructor(config: AIProviderConfig) {
    super(config);
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async chat(messages: ChatMessage[], systemPrompt?: string): Promise<string> {
    let lastError: any = null;

    // Try each model in sequence if we hit quota or other transient errors
    for (const modelName of this.models) {
      try {
        this.logger.debug(`Attempting chat with model: ${modelName}`);
        
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          systemInstruction: systemPrompt,
        });

        // Gemini requires history to start with a 'user' message
        const history = messages.slice(0, -1).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content } as Part],
        }));
        while (history.length > 0 && history[0].role === 'model') {
          history.shift();
        }

        const chatSession = model.startChat({
          history,
          generationConfig: {
            maxOutputTokens: this.config.maxTokens || 500,
            temperature: this.config.temperature,
          },
        });

        const lastMessage = messages[messages.length - 1];
        const result = await chatSession.sendMessage(lastMessage.content);
        const response = await result.response;
        return response.text();
      } catch (error) {
        lastError = error;
        const errorMsg = error.message || '';
        
        // 429: Quota, 503: Busy, 500: Server error, 404: Model not found (try next)
        const shouldRetry = errorMsg.includes('429') || 
                           errorMsg.includes('503') || 
                           errorMsg.includes('500') ||
                           errorMsg.includes('404') ||
                           errorMsg.includes('quota');

        if (shouldRetry) {
          this.logger.warn(`Model ${modelName} failed with error: ${errorMsg}. Rotating to next model...`);
          continue; // Try next model
        }

        // If it's a non-retriable error (e.g. invalid request structure), log and break
        this.logger.error(`Critical error with model ${modelName}: ${errorMsg}`);
        break;
      }
    }

    throw new Error(`Gemini rotation failed. All models exhausted. Last error: ${lastError?.message}`);
  }

  getProviderName(): string {
    return 'gemini';
  }
}