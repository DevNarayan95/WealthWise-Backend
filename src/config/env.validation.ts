import * as joi from 'joi';

export const envValidationSchema = joi.object({
  NODE_ENV: joi
    .string()
    .valid('development', 'test', 'staging', 'production')
    .default('development'),
  PORT: joi.number().port().default(3000),
  API_PREFIX: joi.string().default('api'),
});
