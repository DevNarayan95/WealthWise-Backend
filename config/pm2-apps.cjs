'use strict';

/**
 * Builds PM2 app definitions from `config/` so PM2 settings are not hard-coded
 * in the ecosystem file. Used by the root `ecosystem.config.cjs`.
 *
 * @typedef {{ projectRoot: string, appEnv?: string }} BuildPm2AppsOptions
 * @typedef {{
 *   name: string,
 *   script: string,
 *   cwd: string,
 *   instances: number | 'max',
 *   exec_mode: string,
 *   max_memory_restart: string,
 *   autorestart: boolean,
 *   max_restarts: number,
 *   min_uptime: number,
 *   kill_timeout: number,
 *   listen_timeout: number,
 *   env: Record<string, string>,
 * }} Pm2AppConfig
 */

const { join } = require('node:path');
const { loadConfig } = require('./load-config.cjs');

/**
 * @param {BuildPm2AppsOptions} options
 * @returns {Pm2AppConfig[]}
 */
const buildPm2Apps = ({ projectRoot, appEnv }) => {
  const { appEnv: env, config } = loadConfig({
    configDir: join(projectRoot, 'config'),
    appEnv,
  });

  const pm2 = config.pm2;

  if (!pm2 || typeof pm2 !== 'object') {
    throw new Error('Missing "pm2" section in config/default.json.');
  }

  return [
    {
      name: pm2.appName,
      script: pm2.script,
      cwd: projectRoot,
      instances: pm2.instances,
      exec_mode: pm2.execMode,
      max_memory_restart: pm2.maxMemoryRestart,
      autorestart: pm2.autorestart,
      max_restarts: pm2.maxRestarts,
      min_uptime: pm2.minUptimeMs,
      kill_timeout: pm2.killTimeoutMs,
      listen_timeout: pm2.listenTimeoutMs,
      env: {
        APP_ENV: env,
        NODE_ENV: 'production',
      },
    },
  ];
};

module.exports = { buildPm2Apps };
