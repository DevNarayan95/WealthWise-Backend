# Developer Guide

This guide is for developers working on the NAVRO backend. It covers setup, how the code is organized, how to add a module, endpoint, error code, or database model, the testing rules, and how to troubleshoot common problems.

Read these first:

- [README.md](../README.md): stack, setup, and scripts.
- [CONFIGURATION.md](./CONFIGURATION.md): how settings and environments work.
- [ERROR_CODES.md](./ERROR_CODES.md): every error code the API returns.
- [AI-INSTRUCTIONS.md](../AI-INSTRUCTIONS.md): project rules that apply to all changes.

## 1. Set up a local environment

```bash
npm install                 # also runs prisma generate (postinstall)
cp .env.example .env        # then replace every placeholder
npm run db:migrate          # apply migrations to the dev database
npm run db:seed             # create the seed admin and roles
npm run start:dev           # APP_ENV defaults to local
```

Check that it is running:

```bash
curl http://localhost:3000/health/live
curl http://localhost:3000/health/ready
```

Open the API docs at `http://localhost:3000/docs`. Protected routes need two headers: `x-api-key` and a bearer token. In Swagger UI, click **Authorize**, set `api-key` to the value of `API_KEY_WEB_FRONTEND` from `.env`, then log in with `POST /api/v1/auth/login` and set `access-token` to the returned `accessToken`. The steps are in the [README](../README.md#documentation).

To test in Postman, import `docs/postman/navro.postman_collection.json`, set the `apiKey` variable, and set `accessToken` after login. Regenerate the collection after API changes with the server running: `npm run docs:postman`.

### Generated Prisma client

The Prisma client is generated into `prisma/generated/prisma` and is not committed. It is created by `npm install`. In CI or after pulling schema changes, run `npm run db:generate`. If you see an import error from `prisma/generated/prisma/client`, run that command.

## 2. Project layout

```
src/
  app.module.ts          Root module. Registers global guards, filters, and pipes.
  main.ts                Bootstrap entry point.
  bootstrap/             App setup (prefix, versioning, validation, CORS).
  config/                Config loading, validation, logging, Swagger, HTTPS.
  common/                Shared code: constants, decorators, exceptions, filters,
                         interfaces, pagination, utilities.
  infrastructure/        Technical services: database, mail, security (hashing, API keys).
  modules/
    auth/                Login, registration, OTP, password reset, permissions.
    users/               Current user profile.
    accounts/            Financial accounts.
    transactions/        Transactions and reversals.
    health/              Liveness and readiness checks.
config/                  default.json, env overlays, PM2 helpers.
prisma/                  schema/, migrations/, seed/, generated/ (not committed).
test/                    e2e/, integration/, helpers/, setup.ts.
docs/                    Reference documentation.
```

Each feature module uses the same layers:

| Layer          | Folder            | Contains                                                                         |
| -------------- | ----------------- | -------------------------------------------------------------------------------- |
| Presentation   | `presentation/`   | Controllers, request and response DTOs, mappers, HTTP exceptions.                |
| Application    | `application/`    | Services that run use cases. Input and output types.                             |
| Domain         | `domain/`         | Entities, repository interfaces (ports), domain exceptions, validation rules.    |
| Infrastructure | `infrastructure/` | Repository implementations (for example Prisma), guards, strategies, decorators. |

Rules for dependencies:

- Controllers call services. They do not call repositories or Prisma directly.
- Services depend on repository interfaces in `domain/`, not on Prisma.
- Infrastructure implements the domain interfaces. Nothing in `domain/` imports from `infrastructure/`.

## 3. How a request flows

1. **Global API key check.** `ApiClientGuard` runs for every route. It checks `x-api-key` against the configured clients. Routes marked `@Public()` skip the check (for example health checks).
2. **Route guards.** Protected routes add `JwtAuthGuard` for a bearer token and `PermissionsGuard` with `@Permissions('...')` for permissions.
3. **Validation.** The global validation pipe checks DTOs with `class-validator`. Bad input returns `VALIDATION_ERROR`.
4. **Service.** The controller calls a service. The service uses domain rules and repositories.
5. **Response.** Success is wrapped by `successResponse` in [api-response.util.ts](../src/common/utils/api-response.util.ts).
6. **Errors.** `HttpExceptionFilter` turns every error into the standard envelope. The public `statusCode` uses the `errors.statusCodePrefix` setting (for example `NV404`).

Each request has a request ID. A valid `x-request-id` header is reused; otherwise one is generated. The ID is logged and returned in `meta.requestId` on error responses. Use it to find all log lines for one request.

## 4. Add a new feature module

Use `accounts` as the reference. Its files are under [src/modules/accounts/](../src/modules/accounts/).

1. **Plan the module in small pieces.** Add one slice at a time: domain, then service, then controller, then e2e tests.
2. **Domain.** Create entities, a repository interface in `domain/repositories/`, and domain exceptions in `domain/exceptions/`.
3. **Infrastructure.** Create a Prisma repository in `infrastructure/repositories/` that implements the interface.
4. **Application.** Create the service in `application/services/`, with input and output types.
5. **Presentation.** Create DTOs, a mapper, and the controller. Use `@Controller({ path: '<name>', version: '1' })`.
6. **Module.** Create `<name>.module.ts`. Bind the repository interface to the Prisma class with `{ provide: Interface, useClass: Implementation }`. Export what other modules need.
7. **Register.** Import the module in [app.module.ts](../src/app.module.ts).
8. **Tests.** Add unit tests next to each file (see [Testing](#7-testing)). Add an e2e spec under `test/e2e/`.
9. **Docs.** Add any new error codes to [ERROR_CODES.md](./ERROR_CODES.md). Add new config to [CONFIGURATION.md](./CONFIGURATION.md).

## 5. Add an endpoint

1. Add the route to the controller. Document it with Swagger decorators (`@ApiOperation`, `@ApiOkResponse`, and the error decorators).
2. Add the DTO with `class-validator` rules. Include `@ApiProperty` so it appears in the docs.
3. Protect it. For a logged-in user, use `@UseGuards(JwtAuthGuard, PermissionsGuard)` and `@Permissions('module:action')`. For a public route, use `@Public()`.
4. For sensitive actions (OTP, login, password reset), add `@Throttle(...)` with a limit from `security.throttle` in config.
5. Return `successResponse(data)` for success.
6. Add unit tests for the service and controller, and an e2e test for the HTTP behavior (status, body, and error code).

## 5a. Add a CSV and PDF export to a list

Every list endpoint must have an export. The shared code is in [src/common/export/](../src/common/export/). The rules are in [AI-INSTRUCTIONS.md](../AI-INSTRUCTIONS.md) section 58.

1. **Mapper.** Add `presentation/mappers/<name>-export.mapper.ts`. It turns records into an `ExportTable` with static column headers. Add a spec for it. Write the spec first.
2. **Service.** Add `findAllForExport(userId, ...)`. Fetch `export.maxRows + 1` rows and call `assertWithinExportLimit`. Exclude archived rows if the list does.
3. **Controller.** Add `@Get('export')` before any `@Get(':id')` route. Use the list's read permission. Query with `ExportQueryDto` and return a `StreamableFile` from `renderExport`.
4. **Tests.** Add unit specs for the service and controller. Add an e2e block that checks the CSV header and row, the PDF header bytes (`%PDF`), the `Content-Disposition` file name, and the permission check.
5. **Docs.** If you add a new export setting, add it to `config/default.json`, the joi schema, and [CONFIGURATION.md](./CONFIGURATION.md#export).

## 6. Add an error code

Every API error must have a code that is documented and returns a correct HTTP status.

1. Add the code to the `ErrorCode` enum in [error-code.constant.ts](../src/common/constants/error-code.constant.ts).
2. Throw it with `ApplicationException(ErrorCode.X, 'message', HttpStatus.Y)` from the presentation or domain layer. Use the status that matches the meaning:
   - `400` bad input, `401` not authenticated, `403` not allowed, `404` not found, `409` conflict, `429` too many requests, `503` dependency unavailable.
3. Add a row to [ERROR_CODES.md](./ERROR_CODES.md) with the HTTP status, the `NV` status code, and when it happens.
4. Add a test that asserts the code and the HTTP status.

The public `statusCode` (for example `NV404`) is built from the HTTP status and the prefix in config. Do not hard-code it.

## 7. Testing

Three layers exist:

| Layer       | Command                    | Location                         | Needs         |
| ----------- | -------------------------- | -------------------------------- | ------------- |
| Unit        | `npm run test:unit`        | Next to the source (`*.spec.ts`) | Nothing       |
| Integration | `npm run test:integration` | `test/integration/`              | Test database |
| End to end  | `npm run test:e2e`         | `test/e2e/`                      | Test database |

Setup for database tests:

```bash
cp .env.test.example .env.test   # then set the test database URL and secrets
npm run db:test:migrate          # apply migrations to the test database
```

Rules for every change:

- **Write the test first** for new behavior, then the code. For bug fixes, first write a test that fails.
- **Every changed file gets a unit test.** Config-only or documentation-only changes are the exception. Say so in the commit proposal.
- **Type the mocks and fixtures** wherever practical. Test files have a narrower lint override in `eslint.config.mjs`: the `no-unsafe-*`, `unbound-method`, and `require-await` rules are off for `*.spec.ts` and `test/**`, because Jest mocks and untyped supertest response bodies trigger them. Production code keeps every rule on. Do not add new overrides to production code.
- **Run the smallest command that covers the change**, then the full check before a commit:

```bash
npm run test:unit -- <path-or-pattern>
npm run check                    # validate schema, build, lint, unit, and e2e
npm run spellcheck
npm run format:check
```

Continuous integration (`.github/workflows/ci.yml`) runs the same checks against a fresh PostgreSQL 16 service, so a green local `npm run check` is the goal before you push.

Test files use the Jest globals (`describe`, `it`, `expect`). `tsconfig.json` and `tsconfig.spec.json` include the `jest` types, so these names resolve in the editor. If they still show as not found, open the `backend/` folder itself as the VS Code workspace root (not the parent `1 - WealthWise` folder), then reload the window.

## 8. Database changes

1. Edit a file in `prisma/schema/`.
2. Create a migration: `npm run db:migrate:create` for a draft, or `npm run db:migrate` to apply it on the dev database.
3. Regenerate the client: `npm run db:generate`.
4. Update repositories, unit tests, and integration tests.
5. Apply to the test database with `npm run db:test:migrate` before running e2e tests.

Never edit an existing migration that has been applied or pushed. Add a new migration instead.

## 9. Logs and troubleshooting the app

Log files are in `logs/` by default (`logging.logsPath`). A new pair of files is started each day: `app-YYYY-MM-DD.log` and `error-YYYY-MM-DD.log`. Old files are deleted based on `logging.retentionDays`.

Search by request ID to follow one request:

```bash
grep '<requestId>' logs/app-*.log
```

Each request logs `Request started` at debug level, then any database queries, then `request completed`. All of these lines carry the same `requestId`, so one search shows the full flow:

```bash
grep '<requestId>' logs/app-*.log | grep -E '"msg":"(Request started|Database query|Slow database query|request completed)"'
```

Find slow requests and slow database queries (each line is JSON, so search on the `msg` field):

```bash
grep -E '"msg":"(Slow API request|Critical API request)"' logs/app-*.log
grep '"msg":"Slow database query"' logs/app-*.log
```

To see every database query, not just slow ones, set `monitoring.queryLogging.traceAllQueries` to `true` for the environment. Those lines are logged at debug level, so the app log level must also be `debug`. Keep this off in UAT, SIT, staging, and prod unless you are investigating a problem.

Common problems:

| Problem                                           | Likely cause and fix                                                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `Invalid APP_ENV`                                 | Use `local`, `test`, `uat`, `sit`, `staging`, or `prod`.                                                                               |
| Startup fails with an "Invalid ..." message       | A config or env value is wrong. The message names the key. See [CONFIGURATION.md](./CONFIGURATION.md#troubleshooting-configuration).   |
| `API_KEY_MISSING` or `API_KEY_INVALID` (401)      | Send `x-api-key` with the matching key from `.env`.                                                                                    |
| `UNAUTHORIZED` or `FORBIDDEN` (401 or 403)        | Send a valid bearer token. Check the user has the permission for the route.                                                            |
| `EMAIL_NOT_VERIFIED` (403) on login               | Complete email OTP verification first.                                                                                                 |
| `EMAIL_DELIVERY_FAILED` (503)                     | Check SMTP settings. Locally, Mailpit listens for SMTP on port 1025 (see `mail.smtp` in config).                                       |
| Import error from `prisma/generated/prisma`       | Run `npm run db:generate`.                                                                                                             |
| Migration drift or missing tables                 | Run `npm run db:migrate` (dev) or `npm run db:test:migrate` (test).                                                                    |
| Tests fail with database connection errors        | Check `.env.test` and that the test database is running.                                                                               |
| Editor shows red `describe` or `it` in test files | Open `backend/` as the VS Code workspace root, then reload the window. Jest types are set in `tsconfig.json` and `tsconfig.spec.json`. |
| `API_KEY_MISSING` (401) in Swagger                | Click **Authorize** and set `api-key` (see the Swagger steps in section 1).                                                            |
| Postman requests return 401                       | Set the `apiKey` variable, and set `accessToken` after login.                                                                          |
| `429 TOO_MANY_REQUESTS` during manual testing     | Wait for the throttle window (`security.throttle.ttlMs`) to pass.                                                                      |
| Port 3000 already in use                          | Change `server.port` in your environment overlay, or stop the other process.                                                           |

## 10. Working rules

- Make changes in small module-sized chunks. Keep each commit focused on one chunk.
- Developers commit and push. Copilot proposes the commit message and the file list, then waits for the developer.
- After any API change (routes, DTOs, or Swagger decorators), run `npm run docs:postman` with the server running and commit the regenerated collection.
- Before committing, check `git status` and make sure only the intended files are staged.
- Follow [AI-INSTRUCTIONS.md](../AI-INSTRUCTIONS.md). Update it when a rule changes.
- Do not commit secrets. `.env` and `.env.test` are ignored by git.
- Commit messages use Conventional Commits, for example `feat(accounts): add archive endpoint`.
