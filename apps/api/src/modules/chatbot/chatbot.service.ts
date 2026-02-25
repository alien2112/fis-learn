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
      this.logger.error('AI provider not initialized - check your API key configuration');
      return 'Sorry, the chatbot is currently unavailable. Please contact support@fis-learn.com';
    }

    // Validate messages array is not empty
    if (!messages || messages.length === 0) {
      this.logger.warn('Received empty messages array');
      return 'Please send a message to start the conversation.';
    }

    const systemPrompt = await this.buildPublicSystemPrompt();

    try {
      return await this.aiProvider.chat(messages, systemPrompt);
    } catch (error) {
      this.logger.error(`Chat error: ${error.message}`, error.stack);
      return 'Sorry, I encountered an error processing your message. Please try again.';
    }
  }

  /**
   * Context-aware chat for authenticated users
   * Includes course, lesson, and exercise context in the system prompt
   */
  async chatAuthenticated(
    userId: string,
    messages: { role: 'user' | 'assistant'; content: string }[],
    courseId?: string,
    lessonId?: string,
    exerciseId?: string,
  ): Promise<string> {
    if (!this.aiProvider) {
      this.logger.error('AI provider not initialized - check your API key configuration');
      return 'Sorry, the chatbot is currently unavailable. Please contact support@fis-learn.com';
    }

    // Validate messages array is not empty
    if (!messages || messages.length === 0) {
      this.logger.warn('Received empty messages array');
      return 'Please send a message to start the conversation.';
    }

    const systemPrompt = await this.buildAuthenticatedSystemPrompt(
      userId,
      courseId,
      lessonId,
      exerciseId,
    );

    try {
      return await this.aiProvider.chat(messages, systemPrompt);
    } catch (error) {
      this.logger.error(`Authenticated chat error: ${error.message}`, error.stack);
      return 'Sorry, I encountered an error processing your message. Please try again.';
    }
  }

  /**
   * Build context-aware system prompt for authenticated users
   */
  private async buildAuthenticatedSystemPrompt(
    userId: string,
    courseId?: string,
    lessonId?: string,
    exerciseId?: string,
  ): Promise<string> {
    // Get user info
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, subscriptionTier: true },
    });

    let contextParts: string[] = [];

    // Fetch course context if provided
    if (courseId) {
      const enrollment = await this.prisma.enrollment.findUnique({
        where: { userId_courseId: { userId, courseId } },
        include: {
          course: {
            select: {
              title: true,
              description: true,
              level: true,
              sections: {
                select: {
                  title: true,
                  lessons: {
                    select: { id: true, title: true, contentType: true },
                  },
                },
              },
            },
          },
        },
      });

      if (enrollment) {
        contextParts.push(`COURSE: "${enrollment.course.title}" (${enrollment.course.level})`);
        contextParts.push(`ENROLLMENT: ${enrollment.status}, Progress: ${enrollment.progressPercent}%`);

        // Get completed lessons
        const lessonIds = enrollment.course.sections.flatMap(
          (s: { lessons: { id: string }[] }) => s.lessons.map((l: { id: string }) => l.id),
        );
        const completedLessons = await this.prisma.lessonProgress.findMany({
          where: { userId, lessonId: { in: lessonIds } },
          select: { lessonId: true },
        });
        const completedLessonIds = new Set(completedLessons.map((l) => l.lessonId));

        // Build lesson structure
        const lessonStructure = enrollment.course.sections
          .map(
            (section: { title: string; lessons: { id: string; title: string; contentType: string }[] }) => {
              const lessons = section.lessons
                .map(
                  (l: { id: string; title: string; contentType: string }) =>
                    `    - ${l.title} ${completedLessonIds.has(l.id) ? '(✓ completed)' : ''}`,
                )
                .join('\n');
              return `  Section: ${section.title}\n${lessons}`;
            },
          )
          .join('\n');

        contextParts.push(`LESSON STRUCTURE:\n${lessonStructure}`);
      }
    }

    // Fetch lesson context if provided
    if (lessonId) {
      const lesson = await this.prisma.lesson.findUnique({
        where: { id: lessonId },
        include: {
          section: { select: { course: { select: { title: true } } } },
          material: true,
          codeExercises: {
            select: { id: true, title: true, difficulty: true, isRequired: true },
          },
        },
      });

      if (lesson) {
        contextParts.push(`\nCURRENT LESSON: "${lesson.title}"`);
        if (lesson.material) {
          contextParts.push(`CONTENT TYPE: ${lesson.contentType}`);
          if (lesson.material.duration) {
            contextParts.push(`DURATION: ${Math.round(lesson.material.duration / 60)} minutes`);
          }
        }

        // Check lesson completion status
        const lessonProgress = await this.prisma.lessonProgress.findUnique({
          where: { userId_lessonId: { userId, lessonId } },
        });
        contextParts.push(`LESSON STATUS: ${lessonProgress ? '✓ Completed' : 'Not completed'}`);

        // Add exercise info
        if (lesson.codeExercises.length > 0) {
          const exercises = lesson.codeExercises
            .map(
              (ex: { id: string; title: string; difficulty: string; isRequired: boolean }) =>
                `    - ${ex.title} (${ex.difficulty})${ex.isRequired ? ' [REQUIRED]' : ''}`,
            )
            .join('\n');
          contextParts.push(`EXERCISES:\n${exercises}`);
        }
      }
    }

    // Fetch exercise context if provided
    if (exerciseId) {
      const exercise = await this.prisma.codeExercise.findUnique({
        where: { id: exerciseId },
        include: {
          lesson: { select: { title: true } },
        },
      });

      if (exercise) {
        contextParts.push(`\nCURRENT EXERCISE: "${exercise.title}"`);
        contextParts.push(`LANGUAGE: ${exercise.languageId}`);
        contextParts.push(`DIFFICULTY: ${exercise.difficulty}`);
        contextParts.push(`POINTS: ${exercise.points}`);
        contextParts.push(`TIME LIMIT: ${exercise.timeLimit} seconds`);
        contextParts.push(`REQUIRED: ${exercise.isRequired ? 'Yes' : 'No'}`);

        // Get user's best submission
        const bestSubmission = await this.prisma.codeSubmission.findFirst({
          where: { userId, exerciseId, status: 'ACCEPTED' },
          orderBy: { pointsEarned: 'desc' },
        });

        if (bestSubmission) {
          contextParts.push(`EXERCISE STATUS: ✓ Passed (${bestSubmission.pointsEarned}/${exercise.points} points)`);
        } else {
          const attempts = await this.prisma.codeSubmission.count({
            where: { userId, exerciseId },
          });
          contextParts.push(`EXERCISE STATUS: Not passed yet (${attempts} attempt${attempts !== 1 ? 's' : ''})`);
        }

        // Include exercise description (truncated)
        if (exercise.description) {
          contextParts.push(`\nEXERCISE DESCRIPTION:\n${exercise.description.slice(0, 500)}`);
        }
        if (exercise.instructions) {
          contextParts.push(`\nINSTRUCTIONS:\n${exercise.instructions.slice(0, 1000)}`);
        }
      }
    }

    const prompt = `You are FIS Learn's AI Learning Assistant, helping ${user?.name || 'the student'} with their learning journey.

ROLE: You are a helpful, encouraging tutor for programming and technology courses. You help students understand concepts, debug code, and progress through their lessons.

STUDENT INFO:
- Name: ${user?.name || 'Student'}
- Subscription: ${user?.subscriptionTier || 'FREE'}

${contextParts.length > 0 ? `CURRENT CONTEXT:\n${contextParts.join('\n')}` : ''}

CAPABILITIES:
- Explain course concepts and lesson content
- Help debug code and understand error messages
- Guide students through exercises (without giving away answers)
- Explain programming concepts in ${user?.subscriptionTier === 'FREE' ? 'basic' : 'detailed'} depth
- Provide hints and learning strategies

RULES:
- Be encouraging and supportive - learning is hard!
- If helping with exercises, guide rather than give direct answers
- Reference specific content from the current lesson/course when relevant
- If asked about content from other courses, acknowledge the limitation
- Keep responses under 300 words (can be longer for code explanations)
- Use code blocks for any code examples
- You can respond in Arabic or English based on the student's preference
- If you don't know something specific about the course, say so honestly
- Encourage the student to check the community forum for peer help
- If the student is stuck, suggest they mark the lesson complete when ready and move forward`;

    return prompt;
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
