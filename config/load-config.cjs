'use strict';

/**
 * Shared configuration loader.
 *
 * Used by the application (src/config/config-loader.ts) and by the PM2
 * ecosystem file. It is plain CommonJS with no dependencies so PM2 can
 * load it directly.
 *
 * Merge rules: `config/default.json` is the base. `config/env/<APP_ENV>.json`
 * is deep-merged over it. Objects merge key by key, arrays are replaced.
 * Secrets never belong in these files; they come from environment variables.
 */

const { existsSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

const APP_ENVIRONMENTS = ['local', 'test', 'uat', 'sit', 'staging', 'prod'];
const DEFAULT_APP_ENV = 'local';

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const deepMerge = (base, override) => {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return override === undefined ? base : override;
  }

  const result = { ...base };

  for (const key of Object.keys(override)) {
    result[key] =
      key in base ? deepMerge(base[key], override[key]) : override[key];
  }

  return result;
};

const resolveAppEnv = (value) => {
  const appEnv = value === undefined || value === '' ? DEFAULT_APP_ENV : value;

  if (!APP_ENVIRONMENTS.includes(appEnv)) {
    throw new Error(
      `Invalid APP_ENV "${appEnv}". Expected one of: ${APP_ENVIRONMENTS.join(', ')}.`,
    );
  }

  return appEnv;
};

const readJsonFile = (filePath) => {
  if (!existsSync(filePath)) {
    throw new Error(`Config file not found: "${filePath}".`);
  }

  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    throw new Error(`Invalid JSON in config file "${filePath}": ${reason}`);
  }
};

/**
 * @param {{ configDir: string, appEnv?: string }} options
 * @returns {{ appEnv: string, config: Record<string, unknown> }}
 */
const loadConfig = ({ configDir, appEnv }) => {
  const env = resolveAppEnv(appEnv);
  const defaults = readJsonFile(join(configDir, 'default.json'));
  const overlay = readJsonFile(join(configDir, 'env', `${env}.json`));
  const merged = deepMerge(defaults, overlay);

  merged.app = { ...merged.app, environment: env };

  return { appEnv: env, config: merged };
};

module.exports = {
  APP_ENVIRONMENTS,
  DEFAULT_APP_ENV,
  deepMerge,
  loadConfig,
  resolveAppEnv,
};
