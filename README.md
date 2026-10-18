# WealthWise Backend

REST API for WealthWise, a personal finance platform. It provides user registration with email verification, account and transaction management, and the building blocks for budgets, savings goals, loans, investments, reports, and dashboards.

The API is consumed by the React web app and, later, by mobile apps. Every request must come from a registered client, identified by an API key.

## Features

### Available now

| Module       | Capabilities                                                                                          |
| ------------ | ----------------------------------------------------------------------------------------------------- |
| Auth         | Register, verify email with a one-time code (OTP), resend OTP, login, forgot password, reset password |
| Users        | Current user profile (`GET /users/me`)                                                                |
| Accounts     | Create, list, get, archive, and read the balance of an account                                        |
| Transactions | Create, list, get, and reverse transactions                                                           |
| Health       | Liveness, readiness, and combined health checks                                                       |

Login is blocked until the email address is verified (`EMAIL_NOT_VERIFIED`).

### Planned

Budgets, categories, income, investments, loans, savings goals, notifications, reports, dashboard, and financial insights. These modules have folders in `src/modules/` but no endpoints yet. Income has the income category entity and repository only.

## Technology stack

| Area              | Technology                                  | Version                    |
| ----------------- | ------------------------------------------- | -------------------------- |
| Language          | TypeScript                                  | ^5.7.3                     |
| Runtime           | Node.js                                     | 24.x (development)         |
| Framework         | NestJS (core, common, platform-express)     | ^11.0.1                    |
| API documentation | @nestjs/swagger                             | ^11.4.6                    |
| Database          | PostgreSQL                                  | via `pg` ^8.22.0           |
| ORM               | Prisma (client, adapter-pg)                 | ^7.9.1                     |
| Authentication    | @nestjs/jwt, @nestjs/passport, passport-jwt | ^11.0.2, ^11.0.5, ^4.0.1   |
| Password hashing  | bcrypt                                      | ^6.0.0                     |
| Validation        | class-validator, class-transformer, Joi     | ^0.15.1, ^0.5.1, ^18.2.3   |
| Rate limiting     | @nestjs/throttler                           | ^6.5.0                     |
| Security headers  | helmet                                      | ^8.3.0                     |
| Logging           | nestjs-pino, pino-http, pino-roll           | ^4.6.1, ^11.0.0, ^4.0.0    |
| Email             | nodemailer (SMTP)                           | ^7.0.13                    |
| Process manager   | PM2                                         | ^7.0.4                     |
| Testing           | Jest, ts-jest, Supertest                    | ^30.0.0, ^29.2.5           |
| Linting           | ESLint, typescript-eslint                   | ^9.18.0, ^8.20.0           |
| Formatting        | Prettier                                    | ^3.4.2                     |
| Spell checking    | cspell                                      | ^10.4.0                    |
| Code quality      | SonarCloud                                  | `sonar-project.properties` |

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

- Node.js 24 (the version used for development), with npm.
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
```

`npm install` runs `prisma generate`, which writes the Prisma client to `prisma/generated/`. That folder is not tracked by git. Run `npm run db:generate` to regenerate it manually.

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

| Section               | Examples                                                                         |
| --------------------- | -------------------------------------------------------------------------------- |
| `app`                 | Name, base URL, API prefix (`api`).                                              |
| `server`              | Host, port, and SSL file paths.                                                  |
| `errors`              | Status code prefix (`WS`), used in error responses.                              |
| `security`            | API key header, registered API clients, CORS origins, throttling limits.         |
| `auth`                | Access token lifetime, password salt rounds.                                     |
| `otp`                 | Code length, expiry, max attempts, resend cooldown.                              |
| `mail`                | From address and SMTP host, port, and timeouts.                                  |
| `database`            | Connection pool size, timeouts, SSL.                                             |
| `logging`             | Level, pretty printing, log folder (`logs`), retention, redacted fields.         |
| `monitoring`          | API benchmark and slow query thresholds (validated, not yet applied at runtime). |
| `cache`, `thirdParty` | Reserved for future features (validated, not yet used).                          |
| `swagger`             | Enabled flag, UI path (`docs`), title, version.                                  |
| `pm2`                 | Application name, instances, memory restart limit, restart policy.               |

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

| Header          | Required         | Value                                            |
| --------------- | ---------------- | ------------------------------------------------ |
| `x-api-key`     | Yes              | Key for the calling client (web or mobile).      |
| `Authorization` | Protected routes | `Bearer <access token>` from `POST /auth/login`. |

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
  "statusCode": "WS404",
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

The HTTP status is the normal numeric code. `statusCode` adds the configured prefix (`WS`) so client logs can tell WealthWise errors apart. `error.code` never has the prefix.

### Documentation

- Interactive API docs (Swagger UI): `http://localhost:3000/docs`
- Error code reference, with HTTP status and `WS` status for each code: [docs/ERROR_CODES.md](docs/ERROR_CODES.md)

## Logging and monitoring

- Logs are written to `logs/`, one file per day and type, for example `logs/app.2026-10-18.1.log` and `logs/error.2026-10-18.1.log`.
- Old log files are removed automatically. Retention is set by `logging.retentionDays` in `config/default.json`.
- Sensitive fields (authorization and cookie headers, the API key header, passwords) are redacted by `logging.redactPaths`.
- API benchmark and slow query logging are planned. Their settings (`monitoring.apiBenchmark`, `monitoring.queryLogging`) are validated but not yet used by the application.
- Health endpoints report the application and database status for load balancers and PM2.

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
- SonarCloud settings are in `sonar-project.properties`. The token is never stored in the repo. Export `SONAR_TOKEN` in your shell or CI secret store.

## Project scripts

| Script                | Purpose                                 |
| --------------------- | --------------------------------------- |
| `npm run build`       | Compile TypeScript to `dist/`.          |
| `npm run start:dev`   | Run in watch mode.                      |
| `npm run start:prod`  | Run the compiled app (`dist/main.js`).  |
| `npm run db:generate` | Regenerate the Prisma client.           |
| `npm run db:seed`     | Seed the database.                      |
| `npm run pm2:start`   | Build and start with PM2 for `APP_ENV`. |

## Documentation

| Document                                           | Contents                                                 |
| -------------------------------------------------- | -------------------------------------------------------- |
| [AI-INSTRUCTIONS.md](AI-INSTRUCTIONS.md)           | Project rules, coding standards, and workflow.           |
| [docs/ERROR_CODES.md](docs/ERROR_CODES.md)         | Error codes, HTTP status, and `WS` status codes.         |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md)     | Environments, settings reference, and how to add config. |
| [docs/DEVELOPER_GUIDE.md](docs/DEVELOPER_GUIDE.md) | Adding modules and endpoints, testing, troubleshooting.  |

## License

Proprietary. This project is `UNLICENSED` (see `package.json`). All rights reserved.
