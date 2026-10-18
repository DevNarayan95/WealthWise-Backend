import { existsSync } from 'node:fs';

import * as dotenv from 'dotenv';
import * as joi from 'joi';

import {
  APP_ENVIRONMENTS,
  type AppEnvironment,
  loadConfig,
  REPO_CONFIG_DIR,
} from './config-loader';

export type ApiClientPlatform = 'web' | 'mobile' | 'service';

/** Placeholder that environment overlays must replace before the app starts. */
export const PLACEHOLDER_SMTP_HOST = 'CHANGE_ME_SMTP_HOST';

export type LogLevel =
  'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';

export interface ApiClientConfig {
  name: string;
  keyEnv: string;
  platform: ApiClientPlatform;
}

export interface ResolvedApiClient extends ApiClientConfig {
  key: string;
}

export interface SslConfig {
  enabled: boolean;
  keyPath: string;
  certPath: string;
  caPath: string;
}

export interface AppConfigFile {
  app: {
    name: string;
    environment: AppEnvironment;
    baseUrl: string;
    apiPrefix: string;
    trustProxy: boolean;
  };
  server: {
    host: string;
    port: number;
    ssl: SslConfig;
  };
  errors: {
    statusCodePrefix: string;
    statusCodeSeparator: string;
  };
  security: {
    apiKeyHeader: string;
    publicRouteMetadataKey: string;
    apiClients: ApiClientConfig[];
    cors: {
      allowedOrigins: string[];
      allowCredentials: boolean;
      maxAgeSeconds: number;
    };
    throttle: {
      ttlMs: number;
      defaultLimit: number;
      loginLimit: number;
      sensitiveLimit: number;
    };
  };
  auth: {
    jwtExpiresIn: string;
    passwordSaltRounds: number;
  };
  registration: {
    emailVerificationRequired: boolean;
  };
  otp: {
    length: number;
    expiresInSeconds: number;
    maxAttempts: number;
    resendCooldownSeconds: number;
  };
  mail: {
    fromAddress: string;
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      connectionTimeoutMs: number;
    };
  };
  database: {
    poolMax: number;
    idleTimeoutMs: number;
    connectionTimeoutMs: number;
    ssl: {
      enabled: boolean;
      rejectUnauthorized: boolean;
    };
  };
  health: {
    databaseTimeoutMs: number;
  };
  pagination: {
    defaultPageSize: number;
    maxPageSize: number;
  };
  logging: {
    level: LogLevel;
    pretty: boolean;
    logsPath: string;
    retentionDays: number;
    redactPaths: string[];
  };
  monitoring: {
    apiBenchmark: {
      enabled: boolean;
      slowRequestMs: number;
      criticalRequestMs: number;
    };
    queryLogging: {
      enabled: boolean;
      slowQueryMs: number;
    };
  };
  cache: {
    enabled: boolean;
    ttlSeconds: number;
  };
  thirdParty: {
    notification: {
      enabled: boolean;
      baseUrl: string;
      timeoutMs: number;
    };
  };
  swagger: {
    enabled: boolean;
    path: string;
    title: string;
    description: string;
    version: string;
  };
  pm2: {
    appName: string;
    script: string;
    instances: number;
    execMode: 'fork' | 'cluster';
    maxMemoryRestart: string;
    autorestart: boolean;
    maxRestarts: number;
    minUptimeMs: number;
    killTimeoutMs: number;
    listenTimeoutMs: number;
  };
}

export interface AppConfig extends Omit<AppConfigFile, 'security'> {
  security: Omit<AppConfigFile['security'], 'apiClients'> & {
    apiClients: ResolvedApiClient[];
  };
  secrets: {
    jwtSecret: string;
    databaseUrl: string;
    smtpUsername?: string;
    smtpPassword?: string;
  };
}

const apiClientSchema = joi
  .object({
    name: joi.string().trim().min(1).required(),
    keyEnv: joi
      .string()
      .pattern(/^[A-Z][A-Z0-9_]*$/)
      .required(),
    platform: joi.string().valid('web', 'mobile', 'service').required(),
  })
  .required();

const sslSchema = joi
  .object({
    enabled: joi.boolean().required(),
    keyPath: joi.when('enabled', {
      is: true,
      then: joi.string().min(1).required(),
      otherwise: joi.string().allow('').required(),
    }),
    certPath: joi.when('enabled', {
      is: true,
      then: joi.string().min(1).required(),
      otherwise: joi.string().allow('').required(),
    }),
    caPath: joi.string().allow('').required(),
  })
  .required();

const appConfigFileSchema = joi
  .object({
    app: joi
      .object({
        name: joi.string().min(1).required(),
        environment: joi
          .string()
          .valid(...APP_ENVIRONMENTS)
          .required(),
        baseUrl: joi.string().uri().required(),
        apiPrefix: joi
          .string()
          .pattern(/^[a-z0-9][a-z0-9/-]*$/)
          .required(),
        trustProxy: joi.boolean().required(),
      })
      .required(),
    server: joi
      .object({
        host: joi.string().min(1).required(),
        port: joi.number().integer().port().required(),
        ssl: sslSchema,
      })
      .required(),
    errors: joi
      .object({
        statusCodePrefix: joi
          .string()
          .pattern(/^[A-Za-z]{1,10}$/)
          .required(),
        statusCodeSeparator: joi.string().valid('', '-', '_').required(),
      })
      .required(),
    security: joi
      .object({
        apiKeyHeader: joi
          .string()
          .pattern(/^[a-z0-9-]+$/)
          .required(),
        publicRouteMetadataKey: joi
          .string()
          .pattern(/^[A-Za-z][A-Za-z0-9_]*$/)
          .required(),
        apiClients: joi
          .array()
          .items(apiClientSchema)
          .min(1)
          .unique('keyEnv')
          .unique('name')
          .required(),
        cors: joi
          .object({
            allowedOrigins: joi.array().items(joi.string().uri()).required(),
            allowCredentials: joi.boolean().required(),
            maxAgeSeconds: joi.number().integer().min(0).required(),
          })
          .required(),
        throttle: joi
          .object({
            ttlMs: joi.number().integer().min(1).required(),
            defaultLimit: joi.number().integer().min(1).required(),
            loginLimit: joi.number().integer().min(1).required(),
            sensitiveLimit: joi.number().integer().min(1).required(),
          })
          .required(),
      })
      .required(),
    auth: joi
      .object({
        jwtExpiresIn: joi.string().min(1).required(),
        passwordSaltRounds: joi.number().integer().min(10).max(15).required(),
      })
      .required(),
    registration: joi
      .object({
        emailVerificationRequired: joi.boolean().required(),
      })
      .required(),
    otp: joi
      .object({
        length: joi.number().integer().min(4).max(10).required(),
        expiresInSeconds: joi.number().integer().min(60).max(3600).required(),
        maxAttempts: joi.number().integer().min(1).max(10).required(),
        resendCooldownSeconds: joi
          .number()
          .integer()
          .min(0)
          .max(3600)
          .required(),
      })
      .required(),
    mail: joi
      .object({
        fromAddress: joi.string().trim().min(1).required(),
        smtp: joi
          .object({
            host: joi.string().min(1).invalid(PLACEHOLDER_SMTP_HOST).required(),
            port: joi.number().integer().port().required(),
            secure: joi.boolean().required(),
            connectionTimeoutMs: joi.number().integer().min(100).required(),
          })
          .required(),
      })
      .required(),
    database: joi
      .object({
        poolMax: joi.number().integer().min(1).required(),
        idleTimeoutMs: joi.number().integer().min(0).required(),
        connectionTimeoutMs: joi.number().integer().min(0).required(),
        ssl: joi
          .object({
            enabled: joi.boolean().required(),
            rejectUnauthorized: joi.boolean().required(),
          })
          .required(),
      })
      .required(),
    health: joi
      .object({
        databaseTimeoutMs: joi.number().integer().min(100).required(),
      })
      .required(),
    pagination: joi
      .object({
        defaultPageSize: joi.number().integer().min(1).required(),
        maxPageSize: joi.number().integer().min(1).required(),
      })
      .required()
      .custom(
        (value: { defaultPageSize: number; maxPageSize: number }, helpers) =>
          value.defaultPageSize > value.maxPageSize
            ? helpers.message({
                custom:
                  '"pagination.defaultPageSize" must not exceed maxPageSize',
              })
            : value,
      ),
    logging: joi
      .object({
        level: joi
          .string()
          .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
          .required(),
        pretty: joi.boolean().required(),
        logsPath: joi.string().min(1).required(),
        retentionDays: joi.number().integer().min(1).max(3650).required(),
        redactPaths: joi.array().items(joi.string().min(1)).required(),
      })
      .required(),
    monitoring: joi
      .object({
        apiBenchmark: joi
          .object({
            enabled: joi.boolean().required(),
            slowRequestMs: joi.number().integer().min(1).required(),
            criticalRequestMs: joi.number().integer().min(1).required(),
          })
          .required(),
        queryLogging: joi
          .object({
            enabled: joi.boolean().required(),
            slowQueryMs: joi.number().integer().min(1).required(),
          })
          .required(),
      })
      .required(),
    cache: joi
      .object({
        enabled: joi.boolean().required(),
        ttlSeconds: joi.number().integer().min(1).required(),
      })
      .required(),
    thirdParty: joi
      .object({
        notification: joi
          .object({
            enabled: joi.boolean().required(),
            baseUrl: joi.string().allow('').uri().required(),
            timeoutMs: joi.number().integer().min(100).required(),
          })
          .required(),
      })
      .required(),
    swagger: joi
      .object({
        enabled: joi.boolean().required(),
        path: joi
          .string()
          .pattern(/^[a-z0-9-]+$/)
          .required(),
        title: joi.string().min(1).required(),
        description: joi.string().required(),
        version: joi.string().min(1).required(),
      })
      .required(),
    pm2: joi
      .object({
        appName: joi.string().min(1).required(),
        script: joi.string().min(1).required(),
        instances: joi.number().integer().min(1).required(),
        execMode: joi.string().valid('fork', 'cluster').required(),
        maxMemoryRestart: joi
          .string()
          .pattern(/^\d+(K|M|G)$/i)
          .required(),
        autorestart: joi.boolean().required(),
        maxRestarts: joi.number().integer().min(0).required(),
        minUptimeMs: joi.number().integer().min(0).required(),
        killTimeoutMs: joi.number().integer().min(0).required(),
        listenTimeoutMs: joi.number().integer().min(0).required(),
      })
      .required(),
  })
  .required();

const apiKeyEnvSchema = (keyEnvs: string[]): joi.ObjectSchema =>
  joi
    .object({
      JWT_SECRET: joi.string().min(32).required(),
      DATABASE_URL: joi.string().uri().required(),
      SMTP_USERNAME: joi.string().allow('').optional(),
      SMTP_PASSWORD: joi.string().allow('').optional(),
      ...Object.fromEntries(
        keyEnvs.map((keyEnv) => [keyEnv, joi.string().min(32).required()]),
      ),
    })
    .unknown(true);

const formatJoiError = (
  source: string,
  details: joi.ValidationErrorItem[],
): Error =>
  new Error(
    `Invalid ${source}:\n` +
      details.map((detail) => `  - ${detail.message}`).join('\n'),
  );

/**
 * Validates a merged (default + environment overlay) config object.
 * Throws with every problem listed so one run shows the full picture.
 */
export const validateAppConfigFile = (raw: unknown): AppConfigFile => {
  const result = appConfigFileSchema.validate(raw, {
    abortEarly: false,
  }) as joi.ValidationResult<AppConfigFile>;

  if (result.error) {
    throw formatJoiError('application config', result.error.details);
  }

  return result.value;
};

/**
 * Throws if SSL is enabled but a configured certificate file is missing.
 * Failing at startup is better than a half-working HTTPS server.
 */
export const assertSslFilesExist = (file: AppConfigFile): void => {
  const { ssl } = file.server;

  if (!ssl.enabled) {
    return;
  }

  const requiredFiles: [string, string][] = [
    [ssl.keyPath, 'SSL key file'],
    [ssl.certPath, 'SSL certificate file'],
  ];

  if (ssl.caPath) {
    requiredFiles.push([ssl.caPath, 'SSL CA file']);
  }

  for (const [path, label] of requiredFiles) {
    if (!existsSync(path)) {
      throw new Error(
        `${label} not found at "${path}" (server.ssl is enabled for ${file.app.environment}).`,
      );
    }
  }
};

/**
 * Loads config/default.json plus config/env/<APP_ENV>.json and validates it.
 * Defaults to the repository config directory and APP_ENV from the process.
 */
export const loadAppConfigFile = (
  options: { configDir?: string; appEnv?: string } = {},
): AppConfigFile => {
  const { config } = loadConfig({
    configDir: options.configDir ?? REPO_CONFIG_DIR,
    appEnv: options.appEnv ?? process.env.APP_ENV,
  });

  return validateAppConfigFile(config);
};

let cachedConfigFile: AppConfigFile | undefined;

/**
 * Cached, validated config file for the current process. Decorators read
 * it at import time, so it must not depend on the Nest container.
 */
export const readAppConfigFile = (): AppConfigFile => {
  if (!cachedConfigFile) {
    dotenv.config({ quiet: true });
    cachedConfigFile = loadAppConfigFile();
    assertSslFilesExist(cachedConfigFile);
  }

  return cachedConfigFile;
};

/**
 * Combines the validated config file with secrets from environment
 * variables. Secrets are never read from the config files.
 */
export const buildAppConfig = (
  file: AppConfigFile,
  env: NodeJS.ProcessEnv,
): AppConfig => {
  const keyEnvs = file.security.apiClients.map((client) => client.keyEnv);
  const { error } = apiKeyEnvSchema(keyEnvs).validate(env, {
    abortEarly: false,
  });

  if (error) {
    throw formatJoiError('environment secrets', error.details);
  }

  const apiClients: ResolvedApiClient[] = file.security.apiClients.map(
    (client) => ({
      ...client,
      key: env[client.keyEnv] as string,
    }),
  );

  return {
    ...file,
    security: { ...file.security, apiClients },
    secrets: {
      jwtSecret: env.JWT_SECRET as string,
      databaseUrl: env.DATABASE_URL as string,
      smtpUsername: env.SMTP_USERNAME || undefined,
      smtpPassword: env.SMTP_PASSWORD || undefined,
    },
  };
};

export const appConfiguration = (): AppConfig =>
  buildAppConfig(readAppConfigFile(), process.env);
