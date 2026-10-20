# NAVRO Backend

REST API for NAVRO, a personal finance platform. It provides user registration with email verification, account and transaction management, and the building blocks for budgets, savings goals, loans, investments, reports, and dashboards.

The API is consumed by the React web app and, later, by mobile apps. Every request must come from a registered client, identified by an API key.

## Features

### Available now

| Module       | Capabilities                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Auth         | Register, verify email with a one-time code (OTP), resend OTP, login, forgot password, reset password |
| Users        | Current user profile (`GET /users/me`)                                                                |
| Accounts     | Create, list, get, archive, and read the balance of an account                                        |
| Transactions | Create, list, get, and reverse transactions. INCOME transactions can link to an income category       |
| Income       | Create, list, get, rename, and archive custom income categories. Eight system categories are seeded   |
| Expenses     | Create, list, get, rename, and archive custom expense categories. EXPENSE transactions can link to one |
| FX           | Converts transactions to the base currency (INR by default) using stored, provider, or manual rates    |
| Health       | Liveness, readiness, and combined health checks                                                       |

Login is blocked until the email address is verified (`EMAIL_NOT_VERIFIED`).

### Planned

Budgets, savings, goals, investments, loans, notifications, reports, dashboard, and financial insights. These modules have folders in `src/modules/` but no endpoints yet.

## Technology stack

| Area              | Technology                                  | Version                                           |
| ----------------- | ------------------------------------------- | ------------------------------------------------- |
| Language          | TypeScript                                  | ^5.7.3                                            |
| Runtime           | Node.js                                     | >= 20.19.0 (`engines`), 24.x used for development |
| Framework         | NestJS (core, common, platform-express)     | ^11.0.1                                           |
| API documentation | @nestjs/swagger                             | ^11.4.6                                           |
| Database          | PostgreSQL                                  | via `pg` ^8.22.0                                  |
| ORM               | Prisma (client, adapter-pg)                 | ^7.9.1                                            |
| Authentication    | @nestjs/jwt, @nestjs/passport, passport-jwt | ^11.0.2, ^11.0.5, ^4.0.1                          |
| Password hashing  | bcrypt                                      | ^6.0.0                                            |
| Validation        | class-validator, class-transformer, Joi     | ^0.15.1, ^0.5.1, ^18.2.3                          |
| Rate limiting     | @nestjs/throttler                           | ^6.5.0                                            |
| Security headers  | helmet                                      | ^8.3.0                                            |
| Logging           | nestjs-pino, pino-http                      | ^4.6.1, ^11.0.0                                   |
| Email             | nodemailer (SMTP)                           | ^7.0.13                                           |
| Process manager   | PM2                                         | ^7.0.4                                            |
| Testing           | Jest, ts-jest, Supertest                    | ^30.0.0, ^29.2.5                                  |
| Linting           | ESLint, typescript-eslint                   | ^9.18.0, ^8.20.0                                  |
| Formatting        | Prettier                                    | ^3.4.2                                            |
| Spell checking    | cspell                                      | ^10.4.0                                           |
| Code quality      | SonarCloud                                  | `sonar-project.properties`                        |
| Postman export    | openapi-to-postmanv2                        | ^6.4.0                                            |
| CI                | GitHub Actions (PostgreSQL 16 service)      | `.github/workflows/ci.yml`                        |

## Architecture

Each feature module under `src/modules/` is split into four layers:

- `presentation/`: controllers, request and response DTOs.
- `application/`: services that implement use cases.
- `domain/`: entities and repository interfaces (ports).
- `infrastructure/`: Prisma repositories and adapters.

Shared code lives in these folders:

| Folder                | Purpose                                                                  |
| --------------------- | ------------------------------------------------------------------------ |
| `src/bootstrap/`      | Application setup: global prefix, versioning, validation, CORS, Swagger. |
| `src/config/`         | Config loader, Joi schema, logging, and Swagger configuration.           |
| `src/common/`         | Shared decorators, filters, response envelope, and utilities.            |
| `src/infrastructure/` | Mail, Prisma, and security (API key guard, JWT, password hasher).        |
| `prisma/schema/`      | Prisma schema, split by domain.                                          |
| `prisma/migrations/`  | Database migrations.                                                     |
| `prisma/seed/`        | Seed data, including the admin account.                                  |
| `config/`             | Runtime configuration (see [Configuration](#configuration)).             |
| `docs/`               | API error code reference and SQL reference (`docs/sql/rbac`).            |
| `test/`               | Integration and end-to-end tests, plus shared helpers.                   |

## Prerequisites

- Node.js 20.19.0 or newer (the minimum set in `engines`; Prisma 7 needs it). Development uses Node.js 24. npm comes with Node.js.
- PostgreSQL, reachable from `DATABASE_URL`.
- An SMTP server for email. Locally, [Mailpit](https://mailpit.axllent.org/) on port `1025` works with the default config.

## Setup

```bash
# 1. Install dependencies. This also runs `prisma generate` (see note below).
$ npm install

# 2. Create your local environment file and fill in every placeholder.
$ cp .env.example .env

# 3. Apply database migrations and seed the admin account.
$ npm run db:migrate:deploy
$ npm run db:seed

# 4. Start in watch mode.
$ npm run start:dev
```

`npm install` runs `prisma generate`, which writes the Prisma client to `prisma/generated/`. That folder is not tracked by git. Run `npm run db:generate` to regenerate it manually.

### Environment file (`.env`)

`.env` is the only place for secrets on a developer machine. It is loaded by `dotenv` in the app config loader (`src/config/app-config.ts`), the Prisma config, and the seed script. PM2 passes `APP_ENV` through `ecosystem.config.cjs`, and the app reads the secrets from `.env`. Real `.env` and `.env.test` files are git-ignored. Only the `.env.example` and `.env.test.example` templates are committed.

Secrets such as `JWT_SECRET`, `API_KEY_WEB_FRONTEND`, `API_KEY_MOBILE_APP`, `DATABASE_URL`, and SMTP credentials are never written in `config/*.json`. Non-secret values such as the SMTP host and port are in config. Production and other servers should inject these variables from the platform secret store instead of a file.

## Configuration

Settings are split by purpose:

1. `config/default.json` holds every default. The app does not start without it.
2. `config/env/<APP_ENV>.json` overrides defaults for one environment, such as database pool size, log level, and SMTP host.
3. `.env` holds secrets and connection strings. Never commit it.

`APP_ENV` selects the environment file. Allowed values are `local` (default), `test`, `uat`, `sit`, `staging`, and `prod`.

### Environment variables

| Variable               | Required | Description                                                                |
| ---------------------- | -------- | -------------------------------------------------------------------------- |
| `APP_ENV`              | No       | Environment file to load. Defaults to `local`.                             |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string.                                              |
| `JWT_SECRET`           | Yes      | Signs access tokens and OTP hashes. At least 32 characters.                |
| `API_KEY_WEB_FRONTEND` | Yes      | API key for the React web app. At least 32 characters.                     |
| `API_KEY_MOBILE_APP`   | Yes      | API key for the mobile app. At least 32 characters.                        |
| `SEED_ADMIN_EMAIL`     | Yes      | Email of the admin account created by the seed.                            |
| `SEED_ADMIN_PASSWORD`  | Yes      | Password of the admin account created by the seed.                         |
| `SMTP_USERNAME`        | No       | SMTP login. Leave empty for servers without authentication (e.g. Mailpit). |
| `SMTP_PASSWORD`        | No       | SMTP password. Leave empty for servers without authentication.             |

Generate secrets with:

```bash
$ openssl rand -base64 48   # JWT_SECRET
$ openssl rand -hex 32      # API keys
```

### Key settings in `config/default.json`

| Section      | Examples                                                                 |
| ------------ | ------------------------------------------------------------------------ |
| `app`        | Name, base URL, API prefix (`api`).                                      |
| `server`     | Host, port, and SSL file paths.                                          |
| `errors`     | Status code prefix (`NV`), used in error responses.                      |
| `security`   | API key header, registered API clients, CORS origins, throttling limits. |
| `auth`       | Access token lifetime, password salt rounds.                             |
| `otp`        | Code length, expiry, max attempts, resend cooldown.                      |
| `mail`       | From address and SMTP host, port, and timeouts.                          |
| `database`   | Connection pool size, timeouts, SSL.                                     |
| `logging`    | Level, pretty printing, log folder (`logs`), retention, redacted fields. |
| `income`     | Maximum length of an income category name.                               |
| `expenses`   | Maximum length of an expense category name.                              |
| `exchangeRates` | Base currency (`INR`), rate provider and timeout, manual fallback rates. |
| `monitoring` | API benchmark and slow query thresholds. Both are applied at runtime.    |
| `thirdParty` | Reserved for the notification API. Validated, not yet used.              |
| `swagger`    | Enabled flag, UI path (`docs`), title, version.                          |
| `pm2`        | Application name, instances, memory restart limit, restart policy.       |

## Running the application

```bash
# development, with hot reload
$ npm run start:dev

# build and run the compiled app
$ npm run build
$ npm run start:prod
```

### PM2

The PM2 ecosystem file is [ecosystem.config.cjs](ecosystem.config.cjs). It reads `APP_ENV` and builds the app settings from `config/default.json` and `config/env/<APP_ENV>.json`.

```bash
$ APP_ENV=uat npm run pm2:start     # builds, then starts
$ npm run pm2:status
$ npm run pm2:logs
$ npm run pm2:restart
$ npm run pm2:stop
$ npm run pm2:delete
```

## API

### Base URL and versioning

- Base URL: `http://localhost:3000/api/v1` (set by `app.baseUrl` and `server.port`).
- Routes use URI versioning. The default version is `1`.
- Health routes are outside the API prefix: `/health`, `/health/live`, `/health/ready`.

### Authentication

Every request must send the client API key. Public routes (such as health) are the only exception.

| Header          | Required         | Value                                           |
| --------------- | ---------------- | ----------------------------------------------- |
| `x-api-key`     | Yes              | Key for the calling client (web or mobile).     |
| `Authorization` | Protected routes | `Bearer {accessToken}` from `POST /auth/login`. |

Missing or invalid keys return `API_KEY_MISSING` or `API_KEY_INVALID` (401).

### Response format

Successful responses:

```json
{
  "success": true,
  "data": {},
  "meta": {}
}
```

Error responses:

```json
{
  "success": false,
  "statusCode": "NV404",
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found",
    "details": null
  },
  "meta": { "requestId": "..." },
  "timestamp": "2026-10-18T09:00:00.000Z",
  "path": "/api/v1/accounts/..."
}
```

The HTTP status is the normal numeric code. `statusCode` adds the configured prefix (`NV`) so client logs can tell NAVRO errors apart. `error.code` never has the prefix.

### Documentation

- Interactive API docs (Swagger UI): `http://localhost:3000/docs`. The swagger spec is at `/docs-json`.
- Testing protected routes in Swagger UI:
  1. Click **Authorize** and set `api-key` to the value of `API_KEY_WEB_FRONTEND` (or `API_KEY_MOBILE_APP`) from `.env`.
  2. Call `POST /api/v1/auth/login`, copy `accessToken` from the response, then set `access-token` to that value. Swagger adds the `Bearer` prefix.
  3. Protected routes now send both headers. Without the API key, every route returns 401.
- Postman collection: `docs/postman/navro.postman_collection.json`. It has a sample request body for each endpoint and uses the variables `baseUrl`, `apiKey`, and `accessToken`. Regenerate it after API changes with the server running: `npm run docs:postman`.
- Error code reference, with HTTP status and `NV` status for each code: [docs/ERROR_CODES.md](docs/ERROR_CODES.md)

## Logging and monitoring

- Logs are written to `logs/`, one file per day and type, for example `logs/app-2026-10-18.log` and `logs/error-2026-10-18.log`.
- Old log files are removed automatically. Retention is set by `logging.retentionDays` in `config/default.json`.
- Sensitive fields (authorization and cookie headers, the API key header, passwords) are redacted by `logging.redactPaths`.
- API benchmark logging: requests slower than `monitoring.apiBenchmark.slowRequestMs` log a `warn` entry (`Slow API request`). Requests at or above `criticalRequestMs` log an `error` entry (`Critical API request`). Each entry has the request ID, route pattern, duration, and outcome, but never the raw URL or query string.
- Slow query logging: database queries at or above `monitoring.queryLogging.slowQueryMs` log a `warn` entry (`Slow database query`) with the duration and SQL text. Query parameters are never logged because they can contain user data. Set `traceAllQueries` to `true` to log every query at debug level. Each request logs `Request started` at debug level. All of its database, slow-query, and completion lines share one `requestId`, so you can follow a full request flow in the logs.
- Health endpoints report the application and database status for load balancers and PM2.
- Notification logs: each email send logs `Notification send started` (debug), then `Notification sent` (debug, with `durationMs`) or `Notification delivery failed` (error, with `durationMs` and `errorCode`). Recipient addresses and message bodies are never logged.

## Security

- Each client has its own API key, compared with a timing-safe SHA-256 check. Keys are read from the environment, never from committed files.
- Access tokens are JWTs. Passwords are hashed with bcrypt.
- Email OTPs are stored as HMAC-SHA256 hashes, expire after `otp.expiresInSeconds`, and lock after `otp.maxAttempts` wrong attempts.
- Rate limits apply to all routes. Login and sensitive routes (password reset, OTP) have stricter limits.
- `helmet` sets security headers. CORS allows only `security.cors.allowedOrigins`.
- Optional HTTPS and TLS for PostgreSQL are configured in `server.ssl` and `database.ssl`.

## Database

```bash
$ npm run db:validate          # validate the Prisma schema
$ npm run db:migrate           # create and apply a migration in development
$ npm run db:migrate:deploy    # apply existing migrations (use in UAT, staging, and prod)
$ npm run db:status            # show migration status
$ npm run db:studio            # open Prisma Studio
```

## Testing

| Suite       | Location            | Command                    | Needs                         |
| ----------- | ------------------- | -------------------------- | ----------------------------- |
| Unit        | `src/**/*.spec.ts`  | `npm run test:unit`        | Nothing                       |
| Integration | `test/integration/` | `npm run test:integration` | Test database                 |
| End-to-end  | `test/e2e/`         | `npm run test:e2e`         | Test database and `.env.test` |
| Coverage    | All                 | `npm run test:cov`         | Nothing                       |

For integration and end-to-end tests:

```bash
$ cp .env.test.example .env.test   # fill in the test database URL and secrets
$ npm run db:test:migrate          # apply migrations to the test database
$ npm run db:seed:test             # optional: seed test data
$ npm run test:e2e
```

### Continuous integration

`.github/workflows/ci.yml` runs on every push and pull request. It starts a PostgreSQL 16 service, generates the JWT and API key secrets at runtime, and runs in order: format check, ESLint, spell check, Prisma schema validation, migrations, seed, unit tests, e2e tests, and the build. CI secrets are generated for each run, so none are stored in the repository.

## Code quality

| Tool     | Config file                      | Scripts                                  |
| -------- | -------------------------------- | ---------------------------------------- |
| Prettier | `.prettierrc`, `.prettierignore` | `npm run format`, `npm run format:check` |
| ESLint   | `eslint.config.mjs`              | `npm run lint`, `npm run lint:check`     |
| cspell   | `cspell.json`                    | `npm run spellcheck`                     |

- Prettier sets the formatting rules: 2-space indent, single quotes, trailing commas, 80-column lines, LF line endings. Generated output (`dist/`, `prisma/generated/`, `logs/`, `coverage/`) is excluded in `.prettierignore`.
- ESLint uses typed rules (`recommendedTypeChecked`) and reports Prettier differences as errors. `npm run lint` auto-fixes what it can; `npm run lint:check` only reports.
- cspell checks spelling in source, config, and docs. Add project words to `cspell.json` rather than disabling the check.
- The VS Code settings in `.vscode/settings.json` format on save and remove unused imports.
- SonarCloud settings are in `sonar-project.properties`. The organization and project key are placeholders until the SonarCloud project exists. The token is never stored in the repo. Export `SONAR_TOKEN` in your shell or CI secret store.

## Project scripts

| Script                 | Purpose                                                                       |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run build`        | Compile TypeScript to `dist/`.                                                |
| `npm run start:dev`    | Run in watch mode.                                                            |
| `npm run start:prod`   | Run the compiled app (`dist/src/main.js`).                                    |
| `npm run db:generate`  | Regenerate the Prisma client.                                                 |
| `npm run db:seed`      | Seed the database.                                                            |
| `npm run docs:postman` | Regenerate the Postman collection from `/docs-json` (server must be running). |
| `npm run pm2:start`    | Build and start with PM2 for `APP_ENV`.                                       |

## Documentation

| Document                                                       | Contents                                                  |
| -------------------------------------------------------------- | --------------------------------------------------------- |
| [AI-INSTRUCTIONS.md](AI-INSTRUCTIONS.md)                       | Project rules, coding standards, and workflow.            |
| [docs/ERROR_CODES.md](docs/ERROR_CODES.md)                     | Error codes, HTTP status, and `NV` status codes.          |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md)                 | Environments, settings reference, and how to add config.  |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md)             | Adding modules and endpoints, testing, troubleshooting.   |
| [docs/BUSINESS_REQUIREMENTS.md](docs/BUSINESS_REQUIREMENTS.md) | Product requirements, delivery phases, and decisions log. |

## License

Proprietary. This project is `UNLICENSED` (see `package.json`). All rights reserved.
