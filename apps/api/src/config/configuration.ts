export default () => ({
  port: parseInt(process.env.PORT || '3001', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key',
    expiry: process.env.JWT_EXPIRY || '15m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },
  urls: {
    api: process.env.API_URL || 'http://localhost:3001',
    admin: process.env.ADMIN_URL || 'http://localhost:3000',
    web: process.env.WEB_URL || 'http://localhost:3002',
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
  ai: {
    provider: (process.env.AI_PROVIDER as 'claude' | 'openai') || 'claude',
    claudeApiKey: process.env.ANTHROPIC_API_KEY,
    claudeModel: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
    openaiApiKey: process.env.OPENAI_API_KEY,
    openaiModel: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: parseInt(process.env.AI_MAX_TOKENS || '500', 10),
    temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  },
  zego: {
    appId: parseInt(process.env.ZEGO_APP_ID || '0', 10),
    serverSecret: process.env.ZEGO_SERVER_SECRET || '',
  },
});
