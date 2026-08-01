import * as Joi from 'joi';

// Checked once at boot — app won't start if something required is missing.
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  PORT: Joi.number().default(3001),
  DATABASE_URL: Joi.string().required(),
  REDIS_URL: Joi.string().required(),
  FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),
  JWT_SECRET: Joi.string().min(10).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
  // Shared secret for server-to-server calls — never sent to a browser.
  INTERNAL_API_KEY: Joi.string().min(10).required(),
  // Optional — falls back to the static bank / leaves answers ungraded
  // when unset (see ai/ai-client.service.ts).
  AI_SERVICE_URL: Joi.string().uri().optional(),
  // All optional — logs the code to the console instead of emailing it
  // when unset (see mail/mail.service.ts).
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().optional(),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASS: Joi.string().optional(),
  MAIL_FROM: Joi.string().optional(),
  // Donations returns a clean 503 instead of crashing when these are unset.
  STRIPE_SECRET_KEY: Joi.string().allow('').optional(),
  STRIPE_WEBHOOK_SECRET: Joi.string().allow('').optional(),
});
