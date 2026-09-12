import * as joi from 'joi';

export const envValidationSchema = joi.object({
  NODE_ENV: joi
    .string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: joi.number().port().default(3000),
  API_PREFIX: joi.string().default('api'),
  JWT_SECRET: joi.string().min(32).required(),
  JWT_EXPIRES_IN: joi.string().default('15m'),
  DATABASE_URL: joi.string().uri().required(),
});
