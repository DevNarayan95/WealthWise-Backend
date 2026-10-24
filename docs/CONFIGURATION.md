# Configuration Guide

This guide explains where each setting lives, how environments are chosen, and how to add or change a setting.

## Where settings live

There are three places. Each has one job.

| Location                               | Holds                                                                                    | Committed to git |
| -------------------------------------- | ---------------------------------------------------------------------------------------- | ---------------- |
| `config/default.json`                  | Every setting, with safe defaults. The app will not start without it.                    | Yes              |
| `config/env/<APP_ENV>.json`            | Overrides for one environment (database SSL, log level, host names, paths).              | Yes              |
| `.env` (or real environment variables) | Secrets only: database URL, JWT secret, API keys, SMTP credentials, seed admin password. | No               |

Rules:

- Put non-secret values in the JSON files. Do not put secrets in JSON.
- Do not read `process.env` in feature code. Read the typed config instead (see [Using config in code](#using-config-in-code)).
- A value that differs between environments belongs in `config/env/<APP_ENV>.json`, not in code.

## Choosing an environment

Set `APP_ENV` before the app starts. It must be one of:

| `APP_ENV` | Overlay file              | Typical use                            |
| --------- | ------------------------- | -------------------------------------- |
| `local`   | `config/env/local.json`   | Developer machine. Default when unset. |
| `test`    | `config/env/test.json`    | Automated tests.                       |
| `uat`     | `config/env/uat.json`     | User acceptance testing.               |
| `sit`     | `config/env/sit.json`     | System integration testing.            |
| `staging` | `config/env/staging.json` | Pre-production.                        |
| `prod`    | `config/env/prod.json`    | Production.                            |

Any other value stops startup with `Invalid APP_ENV "<value>"`.

Examples:

```bash
APP_ENV=local npm run start:dev
APP_ENV=uat npm run pm2:start
```

The active value is exposed as `app.environment` in the loaded config.

## How the files are merged

1. `config/default.json` is read first. If it is missing or invalid JSON, startup fails.
2. `config/env/<APP_ENV>.json` is read next. If it is missing, startup fails.
3. The two are deep-merged. Objects merge key by key. **Arrays are replaced, not merged.** For example, an overlay that sets `security.cors.allowedOrigins` replaces the whole list.
4. The merged result is validated against a schema in [src/config/app-config.ts](../src/config/app-config.ts). Unknown keys, wrong types, and invalid combinations stop startup with a message that names the key.

The same loader is used by the app and by [ecosystem.config.cjs](../ecosystem.config.cjs) (PM2). See [config/load-config.cjs](../config/load-config.cjs).

## Secrets and environment variables

These values come only from the environment. The app reads them from `.env` (loaded with `dotenv`) or from the real process environment.

| Variable               | Required | Purpose                                                                  |
| ---------------------- | -------- | ------------------------------------------------------------------------ |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string.                                            |
| `JWT_SECRET`           | Yes      | Signs access tokens and keys the OTP HMAC. At least 32 characters.       |
| `API_KEY_WEB_FRONTEND` | Yes      | API key for the React web app. At least 32 characters.                   |
| `API_KEY_MOBILE_APP`   | Yes      | API key for the mobile app. At least 32 characters.                      |
| `SEED_ADMIN_EMAIL`     | Seeding  | Email of the seed admin account (`npm run db:seed`).                     |
| `SEED_ADMIN_PASSWORD`  | Seeding  | Password of the seed admin account.                                      |
| `SMTP_USERNAME`        | No       | SMTP login. Leave empty for servers without login (for example Mailpit). |
| `SMTP_PASSWORD`        | No       | SMTP password.                                                           |

Generate strong values:

```bash
openssl rand -base64 48   # JWT_SECRET
openssl rand -hex 32      # API keys
```

Copy [.env.example](../.env.example) to `.env` and replace every placeholder. Never commit `.env`. If a secret was ever committed, rotate it.

The API key variable names are set in `security.apiClients[].keyEnv` in `config/default.json`. To add a client, see [Adding an API client](#adding-an-api-client).

## Settings reference

Every key below is in `config/default.json`. Overlays may change any of them.

### `app`

| Key          | Default                 | Meaning                                                                            |
| ------------ | ----------------------- | ---------------------------------------------------------------------------------- |
| `name`       | `NAVRO Backend`         | Display name.                                                                      |
| `baseUrl`    | `http://localhost:3000` | Public base URL. Used in emails and links.                                         |
| `apiPrefix`  | `api`                   | Global path prefix. Routes look like `/api/v1/...`.                                |
| `trustProxy` | `false`                 | Trust `X-Forwarded-*` headers. Set `true` behind a load balancer or reverse proxy. |

### `server`

| Key            | Default   | Meaning                                         |
| -------------- | --------- | ----------------------------------------------- |
| `host`         | `0.0.0.0` | Bind address.                                   |
| `port`         | `3000`    | Listen port.                                    |
| `ssl.enabled`  | `false`   | Serve HTTPS when `true`.                        |
| `ssl.keyPath`  | `""`      | Private key file. Required when SSL is enabled. |
| `ssl.certPath` | `""`      | Certificate file. Required when SSL is enabled. |
| `ssl.caPath`   | `""`      | Optional CA chain file.                         |

When SSL is enabled, the startup check confirms the files exist and stops the app if they do not.

### `errors`

| Key                   | Default | Meaning                                                           |
| --------------------- | ------- | ----------------------------------------------------------------- |
| `statusCodePrefix`    | `NV`    | Prefix for the public `statusCode` field (for example `NV404`).   |
| `statusCodeSeparator` | `""`    | Text between the prefix and the HTTP status. Empty gives `NV404`. |

The HTTP status on the response is always numeric. Only the body field `statusCode` uses the prefix. See [ERROR_CODES.md](./ERROR_CODES.md).

### `security`

| Key                       | Default                | Meaning                                                            |
| ------------------------- | ---------------------- | ------------------------------------------------------------------ |
| `apiKeyHeader`            | `x-api-key`            | Header that carries the client API key.                            |
| `publicRouteMetadataKey`  | `isPublic`             | Metadata key used by the `@Public()` decorator.                    |
| `apiClients[]`            | web and mobile clients | Each client has `name`, `keyEnv` (env var name), `platform`.       |
| `cors.allowedOrigins`     | local dev origins      | Browser origins allowed to call the API.                           |
| `cors.allowCredentials`   | `false`                | Allow cookies or credentials in CORS requests.                     |
| `cors.maxAgeSeconds`      | `600`                  | Preflight cache duration.                                          |
| `throttle.ttlMs`          | `60000`                | Rate-limit window.                                                 |
| `throttle.defaultLimit`   | `100`                  | Default requests per window.                                       |
| `throttle.loginLimit`     | `5`                    | Login attempts per window.                                         |
| `throttle.sensitiveLimit` | `10`                   | Limit for registration, OTP, and password-reset routes per window. |

### `auth`

| Key                  | Default | Meaning                                 |
| -------------------- | ------- | --------------------------------------- |
| `jwtExpiresIn`       | `15m`   | Access token lifetime.                  |
| `passwordSaltRounds` | `12`    | bcrypt cost factor for password hashes. |
| `refreshTokenTtlDays` | `30`   | Absolute lifetime of a login session. Refresh tokens and sessions expire at this age, regardless of activity. |

### `registration`

| Key                         | Default | Meaning                                                 |
| --------------------------- | ------- | ------------------------------------------------------- |
| `emailVerificationRequired` | `true`  | Block login until the email address is verified by OTP. |

### `otp`

| Key                     | Default | Meaning                                       |
| ----------------------- | ------- | --------------------------------------------- |
| `length`                | `6`     | Digits in an OTP code.                        |
| `expiresInSeconds`      | `600`   | OTP lifetime.                                 |
| `maxAttempts`           | `3`     | Wrong attempts before the code is locked out. |
| `resendCooldownSeconds` | `60`    | Minimum wait before a new code can be sent.   |

### `mail`

| Key                        | Default                        | Meaning                                           |
| -------------------------- | ------------------------------ | ------------------------------------------------- |
| `fromAddress`              | `NAVRO <no-reply@navro.local>` | Sender address for all emails.                    |
| `smtp.host`                | `localhost`                    | SMTP host. Must be replaced in real environments. |
| `smtp.port`                | `1025`                         | SMTP port (1025 is Mailpit locally).              |
| `smtp.secure`              | `false`                        | Use TLS from the start (for port 465).            |
| `smtp.connectionTimeoutMs` | `10000`                        | Connection timeout.                               |

`smtp.host` set to `CHANGE_ME_SMTP_HOST` is a placeholder. Environment overlays must replace it before the app starts.

### `database`

| Key                      | Default | Meaning                                    |
| ------------------------ | ------- | ------------------------------------------ |
| `poolMax`                | `10`    | Maximum pooled connections.                |
| `idleTimeoutMs`          | `30000` | Close idle connections after this time.    |
| `connectionTimeoutMs`    | `5000`  | Fail a connection attempt after this time. |
| `ssl.enabled`            | `false` | Use TLS to PostgreSQL.                     |
| `ssl.rejectUnauthorized` | `true`  | Verify the database server certificate.    |

### `health`

| Key                 | Default | Meaning                                     |
| ------------------- | ------- | ------------------------------------------- |
| `databaseTimeoutMs` | `2000`  | Database check timeout for `/health/ready`. |

### `pagination`

| Key               | Default | Meaning                                      |
| ----------------- | ------- | -------------------------------------------- |
| `defaultPageSize` | `20`    | Page size when the client does not send one. |
| `maxPageSize`     | `100`   | Largest page size a client may request.      |

### `income` and `expenses`

| Key                   | Default | Meaning                                                                   |
| --------------------- | ------- | ------------------------------------------------------------------------- |
| `categoryNameMaxLength` | `100` | Maximum length of a custom category name. Used by validation and Swagger. |

Changing these values changes validation for new input only.

### `exchangeRates`

| Key                     | Default                          | Meaning                                                                                                                  |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `baseCurrency`          | `INR`                            | Reporting currency. Net worth, dashboard, and reports convert to it.                                                     |
| `provider.name`         | `frankfurter`                    | Rate provider. Frankfurter publishes ECB reference rates and needs no API key.                                           |
| `provider.baseUrl`      | `https://api.frankfurter.dev/v1` | Provider API root.                                                                                                       |
| `provider.timeoutMs`    | `5000`                           | Request timeout. A slow provider is treated as unavailable.                                                              |
| `manualRates`           | `{}`                             | Manual fallback rate per source currency (for example `"USD": 83.5`). Used only when converting to `baseCurrency` and both the provider and stored rates are unavailable. |

Lookup order: same currency, then a stored rate for the exact date, then the provider, then the most recent stored rate on or before the date, then the most recent stored rate of any date, then a manual rate. See [NFR-DATA-07](./BUSINESS_REQUIREMENTS.md).

### `export`

| Key                          | Default  | Meaning                                                                                                     |
| ---------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| `maxRows`                    | `5000`   | Largest number of rows one export may contain. Larger lists return `EXPORT_LIMIT_EXCEEDED` (422).           |
| `fileNamePrefix`             | `navro`  | Prefix of the download file name, for example `navro-transactions-2026-10-20.csv`.                          |
| `csv.delimiter`              | `,`      | Field separator.                                                                                            |
| `csv.includeUtf8Bom`         | `true`   | Write a UTF-8 byte-order mark so Excel opens non-ASCII text correctly.                                      |
| `csv.neutralizeFormulas`     | `true`   | Prefix cells that start with `=`, `+`, `-`, or `@` so spreadsheets do not run them as formulas.             |
| `pdf.pageSize`               | `A4`     | PDF page size.                                                                                              |
| `pdf.orientation`            | `portrait` | `portrait` or `landscape`.                                                                                |
| `pdf.marginPt`               | `36`     | Page margin in points.                                                                                      |
| `pdf.fontSize`               | `9`      | Body text size in points.                                                                                   |
| `pdf.titleFontSize`          | `16`     | Title text size in points.                                                                                  |
| `pdf.fontPath`               | `""`     | Optional path to a Unicode `.ttf` font. The built-in Helvetica font cannot render non-Latin text.          |
| `pdf.showPageNumbers`        | `true`   | Print "Page x of y" in the footer.                                                                          |

Exports are generated on request and never stored. Each list has its own export route, for example `GET /api/v1/transactions/export?format=pdf`. Changing these values changes new exports only.

### `logging`

| Key             | Default  | Meaning                                                                              |
| --------------- | -------- | ------------------------------------------------------------------------------------ |
| `level`         | `info`   | One of `fatal`, `error`, `warn`, `info`, `debug`, `trace`.                           |
| `pretty`        | `false`  | Human-readable console output. Use `true` only in local development.                 |
| `logsPath`      | `logs`   | Folder for log files. Relative paths resolve from the project root.                  |
| `retentionDays` | `30`     | Number of daily log files kept. Older files are deleted at each daily roll.          |
| `redactPaths`   | see file | Fields replaced with `[Redacted]` in logs (auth headers, API key header, passwords). |

Logs are written to two rolling files: an application log and an error log. A new file starts each day. See [README: Logging](../README.md#logging-and-monitoring).

### `monitoring`

| Key                              | Default | Effect                                                                                                                   |
| -------------------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------ |
| `apiBenchmark.enabled`           | `true`  | Turns on slow and critical API request logging.                                                                          |
| `apiBenchmark.slowRequestMs`     | `1000`  | Requests at or above this duration log `Slow API request` (warn).                                                        |
| `apiBenchmark.criticalRequestMs` | `3000`  | Requests at or above this duration log `Critical API request` (error). Must be greater than or equal to `slowRequestMs`. |
| `queryLogging.enabled`           | `true`  | Turns on slow database query logging.                                                                                    |
| `queryLogging.slowQueryMs`       | `500`   | Queries at or above this duration log `Slow database query` (warn).                                                      |
| `queryLogging.traceAllQueries`   | `false` | Logs every database query at debug level (`Database query`). Keep off in shared environments; it is verbose.             |

Thresholds are per environment, so UAT can use stricter values than local development. Query parameters are never logged.

### `thirdParty`

| Key                         | Default  | Status                                        |
| --------------------------- | -------- | --------------------------------------------- |
| `thirdParty.notification.*` | disabled | Validated. Reserved for the notification API. |

### `swagger`

| Key           | Default           | Meaning                      |
| ------------- | ----------------- | ---------------------------- |
| `enabled`     | `true`            | Serve the API docs UI.       |
| `path`        | `docs`            | UI path (served at `/docs`). |
| `title`       | `NAVRO API`       | Title in the docs.           |
| `description` | short description | Description in the docs.     |
| `version`     | `1.0`             | Version in the docs.         |

### `pm2`

| Key                | Default            | Meaning                                                |
| ------------------ | ------------------ | ------------------------------------------------------ |
| `appName`          | `navro-backend`    | PM2 process name.                                      |
| `script`           | `dist/src/main.js` | Entry point. The build output keeps the `src/` folder. |
| `instances`        | `1`                | Number of instances (cluster mode).                    |
| `execMode`         | `fork`             | `fork` or `cluster`.                                   |
| `maxMemoryRestart` | `512M`             | Restart a process above this memory.                   |
| `autorestart`      | `true`             | Restart after a crash.                                 |
| `maxRestarts`      | `10`               | Restart attempts before PM2 gives up.                  |
| `minUptimeMs`      | `5000`             | A process must stay up this long to count as started.  |
| `killTimeoutMs`    | `5000`             | Grace period for shutdown.                             |
| `listenTimeoutMs`  | `10000`            | Time allowed for the app to start listening.           |

## Environment overlays

The overlays set only what differs. For example, [config/env/prod.json](../config/env/prod.json) turns on SSL, sets `trustProxy` to `true`, uses `info` logging, sets `pm2.execMode` to `cluster`, and disables Swagger.

Before using a real environment, check these placeholders in the overlay:

- `mail.smtp.host` (`CHANGE_ME_SMTP_HOST`).
- Certificate paths in `server.ssl` when SSL is enabled.
- `app.baseUrl` and CORS origins.

## Using config in code

Config is loaded once and read through the typed `AppConfig` value in [src/config/app-config.ts](../src/config/app-config.ts). Inject it through NestJS; do not read `process.env` or the JSON files from feature code.

## Adding a new setting

Follow these steps. Each one is needed.

1. Add the key and default to `config/default.json`, in the right section.
2. Add the key to the `AppConfigFile` type and to the Joi schema in [src/config/app-config.ts](../src/config/app-config.ts). Pick the strictest rule that fits (`min`, `max`, `valid`, `required`).
3. If the value differs by environment, add it to the relevant `config/env/<APP_ENV>.json` overlays.
4. If the value is a secret, do not add it to JSON. Read it from an environment variable, add the variable to `.env.example`, and document it in the table above.
5. Add a unit test in [src/config/app-config.spec.ts](../src/config/app-config.spec.ts) that checks the default and that an invalid value is rejected.
6. Document the key in the settings reference above.
7. Run `npm run test:unit` and `npm run lint:check`.

## Adding an API client

Each client that can call the API needs its own key. Keys are compared as SHA-256 digests with a constant-time check.

1. Add an entry to `security.apiClients` in `config/default.json`, for example:

   ```json
   {
     "name": "partner-app",
     "keyEnv": "API_KEY_PARTNER_APP",
     "platform": "service"
   }
   ```

2. Add `API_KEY_PARTNER_APP` to `.env` and to `.env.example`, with at least 32 characters.
3. Clients send the key in the `x-api-key` header.
4. Add a unit or e2e test that a request with the new key is accepted and one without it is rejected.

Note: arrays are replaced when merged. If an overlay sets `apiClients`, it must list every client.

## PM2 configuration

PM2 settings come from `pm2` in `config/default.json` merged with the overlay for `APP_ENV`. The ecosystem file is [ecosystem.config.cjs](../ecosystem.config.cjs). It builds the PM2 app from [config/pm2-apps.cjs](../config/pm2-apps.cjs).

```bash
APP_ENV=prod npm run pm2:start
```

To change instance count or memory limits for one environment, edit its `pm2` section in `config/env/<APP_ENV>.json`.

## Troubleshooting configuration

| Symptom                                                           | Cause and fix                                                                                  |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `Invalid APP_ENV "xyz"`                                           | Use one of `local`, `test`, `uat`, `sit`, `staging`, `prod`.                                   |
| `Config file not found: ".../config/env/xyz.json"`                | The overlay file for `APP_ENV` is missing. Create it or fix the value.                         |
| `Invalid JSON in config file`                                     | A trailing comma or missing quote. Open the file named in the error.                           |
| Startup error that names a config key                             | The value has the wrong type or is out of range. Fix it in the named file.                     |
| `Config file not found` or SSL file error                         | Check `server.ssl.*` paths for the environment.                                                |
| `CHANGE_ME_SMTP_HOST` or emails fail with `EMAIL_DELIVERY_FAILED` | Set `mail.smtp.host` in the overlay for that environment.                                      |
| Every request returns `API_KEY_MISSING` or `API_KEY_INVALID`      | The client must send `x-api-key` with the key from its `keyEnv` variable.                      |
| A value in JSON has no effect                                     | The key may be a validated placeholder. Check the status column in the monitoring table above. |
| Values changed but not applied                                    | Restart the app. Config is read once at startup. With PM2, run `npm run pm2:restart`.          |
