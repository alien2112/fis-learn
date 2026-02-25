export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiry: process.env.JWT_EXPIRY || '3650d',   // default 10 years (effectively no expiry)
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '3650d', // default 10 years
  },
  urls: {
    api: process.env.API_URL || 'http://localhost:3011',
    admin: process.env.ADMIN_URL || 'http://localhost:3004',
    web: process.env.WEB_URL || 'http://localhost:3010',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || './uploads',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.SMTP_FROM || 'noreply@fis-learn.com',
  },
  auth: {
    emailVerificationRequired: process.env.EMAIL_VERIFICATION_REQUIRED === 'true',
  },
  ai: {
    provider: (process.env.AI_PROVIDER as 'claude' | 'openai' | 'gemini') || 'claude',
    claudeApiKey: process.env.ANTHROPIC_API_KEY,
    claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    geminiApiKey: process.env.GEMINI_API_KEY,
    geminiModel: process.env.GEMINI_MODEL || 'gemini-1.5-pro',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '500', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  },
  zego: {
    appId: parseInt(process.env.ZEGO_APP_ID || '0', 10),
    serverSecret: process.env.ZEGO_SERVER_SECRET || '',
  },
});
