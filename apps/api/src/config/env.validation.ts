import * as Joi from 'joi';

// Validated once at boot via ConfigModule.forRoot({ validationSchema }) in
// app.module.ts — the app refuses to start if a required var is missing or
// malformed, instead of failing later with a confusing runtime error.
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
  // Shared secret for server-to-server calls (e.g. the frontend's OAuth
  // token exchange) — never sent to a browser, so it isn't a NEXT_PUBLIC_ var.
  INTERNAL_API_KEY: Joi.string().min(10).required(),
});
