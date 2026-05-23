import 'dotenv/config';

function required(key: string): string {
  const val = process.env[key];
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

export const config = {
  port:        parseInt(optional('PORT', '4000')),
  nodeEnv:     optional('NODE_ENV', 'development'),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:3000'),
  mongoUri:    optional('MONGODB_URI', 'mongodb://localhost:27017/vedaai'),
  redisUrl:    optional('REDIS_URL', 'redis://localhost:6379'),
  groqApiKey:  optional('GROQ_API_KEY', ''),
  aiModel:     optional('AI_MODEL', 'llama-3.3-70b-versatile'),
  isDev:       optional('NODE_ENV', 'development') === 'development',
  isProd:      optional('NODE_ENV', 'development') === 'production',
};
