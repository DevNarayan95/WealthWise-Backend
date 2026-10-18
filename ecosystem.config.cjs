'use strict';

/**
 * PM2 ecosystem file. Select the environment with APP_ENV, for example:
 *   APP_ENV=uat npm run pm2:start
 *
 * All PM2 settings come from config/default.json (pm2 section) merged with
 * config/env/<APP_ENV>.json. Secrets stay in .env and are loaded by the app.
 */

const { buildPm2Apps } = require('./config/pm2-apps.cjs');

module.exports = {
  apps: buildPm2Apps({
    projectRoot: __dirname,
    appEnv: process.env.APP_ENV,
  }),
};
