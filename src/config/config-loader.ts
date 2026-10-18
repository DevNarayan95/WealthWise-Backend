import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

export const APP_ENVIRONMENTS = [
  'local',
  'test',
  'uat',
  'sit',
  'staging',
  'prod',
] as const;

export type AppEnvironment = (typeof APP_ENVIRONMENTS)[number];

export type RawConfig = Record<string, unknown> & {
  app: Record<string, unknown> & { environment: AppEnvironment };
};

export interface LoadConfigOptions {
  configDir: string;
  appEnv?: string;
}

export interface LoadConfigResult {
  appEnv: AppEnvironment;
  config: RawConfig;
}

interface ConfigLoaderModule {
  APP_ENVIRONMENTS: readonly AppEnvironment[];
  deepMerge: (
    base: Record<string, unknown>,
    override: Record<string, unknown>,
  ) => Record<string, unknown>;
  resolveAppEnv: (value: string | undefined) => AppEnvironment;
  loadConfig: (options: LoadConfigOptions) => LoadConfigResult;
}

/**
 * The loader is plain CommonJS at config/load-config.cjs so PM2 can use it
 * too. It is resolved from the project root (the working directory) so the
 * same path works from src/ under ts-node and from dist/ in production.
 */
const projectRequire = createRequire(join(process.cwd(), 'package.json'));

const loader = projectRequire(
  join(process.cwd(), 'config', 'load-config.cjs'),
) as ConfigLoaderModule;

export const REPO_CONFIG_DIR = resolve(process.cwd(), 'config');

export const deepMerge = loader.deepMerge;

export const resolveAppEnv = loader.resolveAppEnv;

export const loadConfig = (options: LoadConfigOptions): LoadConfigResult =>
  loader.loadConfig(options);
