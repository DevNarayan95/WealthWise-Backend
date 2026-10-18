import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

interface Pm2AppConfig {
  name: string;
  script: string;
  cwd: string;
  instances: number | 'max';
  exec_mode: string;
  max_memory_restart: string;
  autorestart: boolean;
  max_restarts: number;
  min_uptime: number;
  kill_timeout: number;
  listen_timeout: number;
  env: Record<string, string>;
}

interface BuildPm2AppsOptions {
  projectRoot: string;
  appEnv?: string;
}

const projectRequire = createRequire(__filename);

const { buildPm2Apps } = projectRequire('../../config/pm2-apps.cjs') as {
  buildPm2Apps: (options: BuildPm2AppsOptions) => Pm2AppConfig[];
};

const REPO_ROOT = join(__dirname, '..', '..');

const writeConfigTree = (
  projectRoot: string,
  defaults: Record<string, unknown>,
  overlays: Record<string, Record<string, unknown>> = {},
): void => {
  const configDir = join(projectRoot, 'config');
  const envDir = join(configDir, 'env');

  mkdirSync(envDir, { recursive: true });
  writeFileSync(join(configDir, 'default.json'), JSON.stringify(defaults));

  for (const [name, overlay] of Object.entries(overlays)) {
    writeFileSync(join(envDir, `${name}.json`), JSON.stringify(overlay));
  }
};

const PM2_DEFAULTS = {
  pm2: {
    appName: 'wealthwise-backend',
    script: 'dist/main.js',
    instances: 1,
    execMode: 'fork',
    maxMemoryRestart: '512M',
    autorestart: true,
    maxRestarts: 10,
    minUptimeMs: 5000,
    killTimeoutMs: 5000,
    listenTimeoutMs: 10000,
  },
};

describe('pm2-apps', () => {
  let tempRoot: string;

  beforeEach(() => {
    tempRoot = mkdtempSync(join(tmpdir(), 'pm2-apps-'));
  });

  afterEach(() => {
    rmSync(tempRoot, { recursive: true, force: true });
  });

  it('maps the pm2 section of config into PM2 app options', () => {
    writeConfigTree(tempRoot, PM2_DEFAULTS, { uat: {} });

    const [app] = buildPm2Apps({ projectRoot: tempRoot, appEnv: 'uat' });

    expect(app).toEqual(
      expect.objectContaining({
        name: 'wealthwise-backend',
        script: 'dist/main.js',
        instances: 1,
        exec_mode: 'fork',
        max_memory_restart: '512M',
        autorestart: true,
        max_restarts: 10,
        min_uptime: 5000,
        kill_timeout: 5000,
        listen_timeout: 10000,
      }),
    );
  });

  it('runs from the project root and passes the selected APP_ENV', () => {
    writeConfigTree(tempRoot, PM2_DEFAULTS, { uat: {} });

    const [app] = buildPm2Apps({ projectRoot: tempRoot, appEnv: 'uat' });

    expect(app.cwd).toBe(tempRoot);
    expect(app.env).toEqual(
      expect.objectContaining({ APP_ENV: 'uat', NODE_ENV: 'production' }),
    );
  });

  it('defaults to the local environment when appEnv is not provided', () => {
    writeConfigTree(tempRoot, PM2_DEFAULTS, { local: {} });

    const [app] = buildPm2Apps({ projectRoot: tempRoot });

    expect(app.env.APP_ENV).toBe('local');
  });

  it('applies per-environment overrides from config/env', () => {
    writeConfigTree(tempRoot, PM2_DEFAULTS, {
      prod: { pm2: { instances: 'max', maxMemoryRestart: '1G' } },
    });

    const [app] = buildPm2Apps({ projectRoot: tempRoot, appEnv: 'prod' });

    expect(app.instances).toBe('max');
    expect(app.max_memory_restart).toBe('1G');
    expect(app.name).toBe('wealthwise-backend');
  });

  it('rejects an unknown environment name', () => {
    writeConfigTree(tempRoot, PM2_DEFAULTS);

    expect(() => buildPm2Apps({ projectRoot: tempRoot, appEnv: 'qa' })).toThrow(
      'Invalid APP_ENV "qa"',
    );
  });

  it('fails clearly when the pm2 section is missing from config', () => {
    writeConfigTree(
      tempRoot,
      { app: { baseUrl: 'http://localhost:3000' } },
      {
        local: {},
      },
    );

    expect(() =>
      buildPm2Apps({ projectRoot: tempRoot, appEnv: 'local' }),
    ).toThrow('Missing "pm2" section');
  });

  it('builds apps from the real repository config for every environment', () => {
    for (const appEnv of ['local', 'test', 'uat', 'sit', 'staging', 'prod']) {
      const [app] = buildPm2Apps({ projectRoot: REPO_ROOT, appEnv });

      expect(app.env.APP_ENV).toBe(appEnv);
      expect(app.script).toBe('dist/main.js');
    }
  });
});
