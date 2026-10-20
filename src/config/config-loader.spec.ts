import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  APP_ENVIRONMENTS,
  deepMerge,
  loadConfig,
  REPO_CONFIG_DIR,
  resolveAppEnv,
} from './config-loader';

describe('config-loader', () => {
  describe('deepMerge', () => {
    it('merges nested objects and keeps base keys missing from the override', () => {
      expect(
        deepMerge({ a: { b: 1, c: 2 }, keep: true }, { a: { c: 3 } }),
      ).toEqual({ a: { b: 1, c: 3 }, keep: true });
    });

    it('replaces arrays instead of concatenating them', () => {
      expect(deepMerge({ list: ['a', 'b'] }, { list: ['c'] })).toEqual({
        list: ['c'],
      });
    });

    it('does not mutate the base object', () => {
      const base = { a: { b: 1 } };

      deepMerge(base, { a: { b: 2 } });

      expect(base).toEqual({ a: { b: 1 } });
    });
  });

  describe('resolveAppEnv', () => {
    it('defaults to local when APP_ENV is unset or empty', () => {
      expect(resolveAppEnv(undefined)).toBe('local');
      expect(resolveAppEnv('')).toBe('local');
    });

    it.each(APP_ENVIRONMENTS)('accepts "%s"', (env) => {
      expect(resolveAppEnv(env)).toBe(env);
    });

    it('rejects unknown environments with the allowed list', () => {
      expect(() => resolveAppEnv('development')).toThrow(
        'Invalid APP_ENV "development"',
      );
    });
  });

  describe('loadConfig', () => {
    let configDir: string;

    const writeOverlay = (env: string, content: unknown): void => {
      writeFileSync(
        join(configDir, 'env', `${env}.json`),
        JSON.stringify(content),
      );
    };

    beforeEach(() => {
      configDir = mkdtempSync(join(tmpdir(), 'ww-config-'));
      mkdirSync(join(configDir, 'env'));
      writeFileSync(
        join(configDir, 'default.json'),
        JSON.stringify({
          app: { name: 'NAVRO', apiPrefix: 'api' },
          server: { port: 3000 },
        }),
      );
    });

    afterEach(() => {
      rmSync(configDir, { recursive: true, force: true });
    });

    it('merges the environment overlay over defaults and stamps app.environment', () => {
      writeOverlay('uat', { server: { port: 4000 } });

      const { appEnv, config } = loadConfig({ configDir, appEnv: 'uat' });

      expect(appEnv).toBe('uat');
      expect(config).toEqual({
        app: { name: 'NAVRO', apiPrefix: 'api', environment: 'uat' },
        server: { port: 4000 },
      });
    });

    it('throws when the overlay for the requested environment is missing', () => {
      expect(() => loadConfig({ configDir, appEnv: 'prod' })).toThrow(
        /Config file not found/,
      );
    });

    it('throws a readable error when a JSON file is malformed', () => {
      writeFileSync(join(configDir, 'default.json'), '{ not json');
      writeOverlay('local', {});

      expect(() => loadConfig({ configDir, appEnv: 'local' })).toThrow(
        /Invalid JSON/,
      );
    });

    it.each(APP_ENVIRONMENTS)(
      'loads the real config/ files for "%s"',
      (env) => {
        const { config } = loadConfig({
          configDir: REPO_CONFIG_DIR,
          appEnv: env,
        });

        expect(config.app.environment).toBe(env);
      },
    );
  });
});
