import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { AIProvider } from './interfaces/ai-provider.interface';
import { AIProviderFactory, AIProviderType } from './providers/ai-provider.factory';
import { ChatMessage } from './interfaces/ai-provider.interface';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);
  private aiProvider: AIProvider;
  private systemPromptCache: { prompt: string; timestamp: number } | null = null;
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.initializeProvider();
  }

  private initializeProvider(): void {
    const providerType = this.configService.get<AIProviderType>('ai.provider') || 'claude';
    const apiKey = this.configService.get<string>(`ai.${providerType}ApiKey`);

    if (!apiKey) {
      this.logger.warn(`No API key found for provider: ${providerType}. Chatbot will not function.`);
      return;
    }

    try {
      this.aiProvider = AIProviderFactory.createProvider(providerType, {
        apiKey,
        model: this.configService.get<string>(`ai.${providerType}Model`),
        maxTokens: this.configService.get<number>('ai.maxTokens') || 500,
        temperature: this.configService.get<number>('ai.temperature') || 0.7,
      });
      this.logger.log(`AI provider initialized: ${providerType}`);
    } catch (error) {
      this.logger.error(`Failed to initialize AI provider: ${error.message}`);
    }
  }

  // Build system prompt with live platform data
  private async buildPublicSystemPrompt(): Promise<string> {
    // Check cache
    if (this.systemPromptCache && Date.now() - this.systemPromptCache.timestamp < this.CACHE_TTL) {
      return this.systemPromptCache.prompt;
    }

    // Fetch current course catalog
    const courses = await this.prisma.course.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        title: true,
        description: true,
        level: true,
        pricingModel: true,
        price: true,
        category: { select: { name: true } },
      },
      take: 50,
    });

    // Fetch subscription plans
    const plans = await this.prisma.subscriptionPlan.findMany({
      where: { isActive: true },
      select: {
        name: true,
        tier: true,
        price: true,
        billingCycle: true,
        features: true,
      },
    });

    const prompt = `You are FIS Learn's helpful assistant on the public website.

ROLE: Answer questions about FIS Learn, an e-learning platform for programming and technology courses.

PLATFORM INFO:
- FIS Learn offers interactive coding courses with a built-in code editor
- Features: video lessons, interactive code exercises with real-time execution, community chat per course, live streaming classes, skill trees, progress tracking
- Languages supported: Python, JavaScript, Java, C++, Go, Rust, and more
- Code exercises run in a secure sandbox (Judge0) with automated test cases

CURRENT COURSES:
${courses.map(c => `- ${c.title} (${c.level}, ${c.pricingModel}${c.price ? ` $${c.price}` : ''}) — ${c.category?.name || 'General'}: ${c.description?.slice(0, 100) || 'No description'}`).join('\n')}

SUBSCRIPTION PLANS:
${plans.map(p => `- ${p.name} (${p.tier}): $${p.price}/${p.billingCycle} — Features: ${JSON.stringify(p.features)}`).join('\n')}

RULES:
- Be friendly, concise, and helpful
- If asked about specific student data, grades, or progress, say "Please log in to access your personal dashboard, or ask me once you're signed in!"
- If asked something you don't know, say "I'm not sure about that. You can contact our support team at support@fis-learn.com"
- Encourage users to sign up for free to explore the platform
- Keep responses under 200 words
- You can respond in Arabic or English based on the user's language`;

    // Cache the prompt
    this.systemPromptCache = { prompt, timestamp: Date.now() };
    return prompt;
  }

  async chatPublic(messages: { role: 'user' | 'assistant'; content: string }[]): Promise<string> {
    if (!this.aiProvider) {
      return 'Sorry, the chatbot is currently unavailable. Please try again later or contact support@fis-learn.com';
    }

    const systemPrompt = await this.buildPublicSystemPrompt();

    try {
      return await this.aiProvider.chat(messages, systemPrompt);
    } catch (error) {
      this.logger.error(`Chat error: ${error.message}`, error.stack);
      return 'Sorry, I encountered an error. Please try again later.';
    }
  }

  // Method to manually clear cache (useful after admin updates courses/plans)
  clearCache(): void {
    this.systemPromptCache = null;
    this.logger.log('System prompt cache cleared');
  }

  // Get current provider info for debugging
  getProviderInfo(): { provider: string; available: boolean } {
    return {
      provider: this.aiProvider?.getProviderName() || 'none',
      available: !!this.aiProvider,
    };
  }
}
