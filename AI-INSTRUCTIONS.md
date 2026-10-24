# NAVRO Backend — AI Engineering Instructions

## 1. Purpose

This document is the persistent engineering context for the **NAVRO Backend** project.

When an AI assistant receives this document, it must use the information in this file as the primary project context and continue development consistently with the existing architecture, coding style, conventions, project scope, engineering principles, and current implementation state.

The AI must **not unnecessarily redesign, restructure, rename, or replace existing architecture** unless explicitly requested.

If the requested change conflicts with this document, identify the conflict before making the change.

The **actual source tree and current implementation are the latest source of truth** when they differ from older documentation.

---

# 2. Project

## Project Name

NAVRO

## Component

Backend API

## Purpose

NAVRO is a personal finance management platform.

The platform is intended to help users manage:

- Self-registration with email OTP verification, password reset, login, and logout
- Multiple accounts: savings, current, investment, wallets, fixed deposits (FD), recurring deposits (RD), cash, and credit cards
- Income and expenses with categories (for example Salary, Freelance, Rental, Groceries, House Rent, Electricity)
- Immutable transaction history, viewable month-wise and year-wise
- Monthly budgets, checked after the month completes and comparable across months
- Future financial goals (for example buy a home or car) with progress, linked accounts, linked investments, and transactions
- Loans and EMIs of any type, with EMI payments stored as transactions and loan progress
- Investment records (stocks, mutual funds, bonds, FD, RD) and recurring contributions
- Net worth, an interactive dashboard, and monthly, yearly, and historical reports
- Forecasting: runway, timing of the next loan, and loan affordability (for example for a house)
- Multiple users with roles and permissions
- Super admin: user management, system monitoring, backups, and configuration
- Subscription management (future)
- Only the React web frontend and future mobile apps can call the APIs

The backend must be designed as a **production-ready modular monolith**.

The architecture should allow future extraction of modules into microservices if the system grows.

---

## Product Requirements

This section is the functional requirement baseline for NAVRO. Each requirement has a status:

```text
✅  Implemented and tested
⏳  Planned in the roadmap (section 51), design not started
❌  Gap: required but not yet designed or missing from the roadmap
```

Items marked **Approved** are final. Items marked **Proposed** are recommendations that still need confirmation. The business rules behind this section are in `docs/BUSINESS_REQUIREMENTS.md`, which is the authoritative source for requirement IDs (BR-*).

Delivery order: Phase 1 (core application) first. The Super Admin panel (R13 admin items) follows after Phase 1 works end to end.

### R1. Authentication and Account Access

```text
Self-registration with email OTP verification      ✅
Resend verification OTP                            ✅
Reset password by email OTP                        ✅
Login (blocked until email is verified)            ✅
Logout (current session)                           ✅
Logout all sessions                                ✅
Refresh access token (rotating refresh token)      ✅
```

Logout uses a database-backed session. Each access token carries a session id (`sid`), and every request checks that session, so logout takes effect immediately.
**Approved (best practice):** short-lived access tokens, single-use rotating refresh tokens stored as hashes, logout that revokes the session immediately, logout-all, and reuse detection. Full rules: `docs/BUSINESS_REQUIREMENTS.md`, BR-AUTH-06 to BR-AUTH-13.

### R2. Accounts

Users keep many accounts: savings, current, investment, wallet, FD, RD, cash, and credit card.

```text
Account creation, listing, archive, ownership      ✅
Types BANK_ACCOUNT, CASH, CREDIT_CARD,
  INVESTMENT, OTHER                                ✅
Types SAVINGS, CURRENT, WALLET,
  FIXED_DEPOSIT, RECURRING_DEPOSIT                 ✅
```

**Approved:** add the five missing types to `AccountType` with a migration. Existing values stay, so current data is unchanged.

### R3. Income

Example categories: Salary, Freelance, Rental, Interest from FD, stock gains.

```text
Per-user income categories, unique names, archive  ✅
System income categories                           ✅
Rental and stock-gain system categories            ✅
```

The seed has Salary, Business, Freelance, Interest, Interest from FD, Dividends, Capital Gains, Rental, Gifts, Refunds, and Other. Approved: add Rental, Capital Gains (stock gains), and Interest from FD.

### R4. Expenses

Example categories: Groceries, House Rent, Electricity, Medical Bills.

```text
Expense categories (per-user unique, system, archive)  ✅
EXPENSE transactions linked to an expense category     ✅
```

Users add their own expense categories, and system defaults are provided, as with income. `expenseCategoryId` is set only on EXPENSE transactions. `incomeCategoryId` stays INCOME-only. System defaults are the approved list in [BUSINESS_REQUIREMENTS.md](./docs/BUSINESS_REQUIREMENTS.md) (`Loan EMI` is system-only, decision 18).

### R5. Transactions and History

Every transaction is stored and never updated after creation. Corrections use reversal. History is queried by `transactionDate`, a calendar date (`YYYY-MM-DD`).

```text
Immutable transactions, reversal workflow          ✅
Listing per account, pagination                    ✅
Listing across all accounts of a user              ✅
Filter by date range (from, to)                    ✅
Filter by type and category                        ✅
Month-wise and year-wise history                   ✅ (via from and to, inclusive)
```

`accountId` is optional. Without it, the list covers every account the caller owns. A supplied `accountId` must belong to the caller, or the request returns 404. Dates are inclusive. `from` must not be after `to`, or the request returns 400 `INVALID_TRANSACTION`. Monthly and yearly report aggregates are not built yet; they belong to Reporting (R11).

### R6. Budgets

Monthly budgets set planned amounts for items such as house rent and loan EMI. After the month completes, the user checks the budget and compares it with older budgets.

```text
Monthly budget with planned amount per line        ❌
Planned vs actual, by transactionDate              ❌
Closed month budget is read-only                   ❌
Compare budgets across months                      ❌
```

**Proposed rules:**

- A budget belongs to one user and one month (`YYYY-MM`). Each line links to an expense category or a loan.
- Actual amounts come from EXPENSE transactions in that month.
- When the month ends, the budget is CLOSED and its plan can no longer change. Actual amounts still come from the immutable transactions.

### R7. Financial Goals

A goal, such as buying a home or a car, shows progress as a percentage. It also shows the accounts where the user saves for it, the investments held for it, and its transactions.

```text
Goal with name, target amount, target date         ❌
Progress percentage                                ❌
Goal linked to accounts                            ❌
Goal linked to investments (for example 5-6 stocks) ❌
Goal transaction history                           ❌
```

The current amount is measured from the attached accounts and investments only (Open Decision 5, approved).

### R8. Loans and EMIs

Loans can be of any type: education, consumer, personal, home, car, or other. The user records each EMI payment, the system stores it as a transaction, and the user can see loan progress.

```text
Loan record (type, principal, rate, tenure, EMI)   ❌
EMI payment stored as an EXPENSE transaction       ❌
Loan progress (EMIs paid, outstanding, percent)    ❌
```

`src/modules/loans` exists with no endpoints, and Loans is not in the roadmap. **Proposed:** add Loans and EMIs to the roadmap before Financial Goals. EMI payments are expenses, and goals and forecasting depend on loans.

### R9. Investments and Deposits

Records for stocks, mutual funds, bonds, FD, and RD. Recurring contributions (SIP, RD installments) are stored as transactions.

```text
Investment records (stock, MF, bond, FD, RD)       ❌
Buy, sell, dividend, and interest events as transactions ❌
Recurring monthly contributions                    ❌
```

FD and RD are account types (R2). Their full maturity details are stored (approved). See `docs/BUSINESS_REQUIREMENTS.md`, BR-DEP-01 to BR-DEP-06.

### R10. Net Worth and Dashboard

```text
Net worth                                          ❌
Dashboard data (read-only aggregate APIs)          ❌
Per-category totals for any period                 ❌
```

**Proposed net worth formula**, calculated per currency without conversion:

```text
Net worth = sum of active asset account balances
          + investment current value
          - outstanding loan principal
          - credit card balances owed
```

The backend provides read-only aggregate APIs. The interactive dashboard is built in the React frontend. The APIs must support: income vs expense trend, category breakdown, budget vs actual, goal progress, loan progress, upcoming EMIs, net worth trend, and recent transactions.

### R11. Reports

```text
Monthly report                                     ❌
Yearly report                                      ❌
Historical report (custom date range)              ❌
Totals: income, expense, net savings, category     ❌
```

Reports use `transactionDate`, not `createdAt`. Export: CSV and PDF, printable, generated on request (approved). List export is built for accounts, transactions, income categories, and expense categories (see Data Exports). The monthly, yearly, and historical report aggregates above are not built yet.

### R12. Forecasting and Planning

These answer planning questions with estimates.

```text
Runway: months of expenses covered by balances     ❌
Extra month check (skip or extend a month)         ❌
Timing of next loan (after current loan ends)      ❌
Maximum loan for a target (for example a house)    ❌
```

**Proposed rules:**

- The expense average uses a configured window (for example 6 months) from `config/default.json`.
- Loan affordability: max EMI = monthly income × max EMI-to-income ratio (config) − existing EMIs. The loan amount comes from the standard EMI formula, using a rate and tenure.
- All thresholds are configuration, not code.
- Every response is labelled as an estimate and does not promise loan approval.
- Lives in the `financial-insights` module.

### R13. Multi-User, RBAC, and Super Admin

```text
Multiple users, roles, and permissions             ✅
Roles SUPER_ADMIN, ADMIN, ACCOUNT_MANAGER, CUSTOMER ✅
Blocked (SUSPENDED) users cannot log in            ✅
List, create, block, and unblock users (admin API) ❌
Assign roles (admin API)                           ❌
System monitoring: CPU, memory, uptime, event loop ❌
Database backup: on demand, scheduled, and listed  ❌
Admin audit log                                    ❌
Manage configuration from the dashboard            ❌ (conflict, see Open Decisions)
Subscription management                            ⏳ future, no design
```

The health endpoints (`/health/live`, `/health/ready`) report status only. They are not system metrics.

**Proposed:** blocking uses the existing `SUSPENDED` status. Restoring a backup is a manual operator procedure, not an API.

### R14. API Access

```text
Only the React web frontend and future mobile apps  ✅
  can call the APIs (API key and JWT)
```

---

## Open Decisions

Each decision must be answered before the related module is implemented. The AI must not decide these silently.

1. **Logout model.** Approved: best practice (rotating refresh tokens, immediate revocation, logout-all, reuse detection). Rules: BR-AUTH-06 to BR-AUTH-13.
2. **New account types.** Approved: add `SAVINGS`, `CURRENT`, `WALLET`, `FIXED_DEPOSIT`, and `RECURRING_DEPOSIT`, and keep the existing values.
3. **FD and RD.** Approved: account types hold the balance. All maturity details are stored (BR-DEP-01 to BR-DEP-06).
4. **Dashboard configuration (conflict).** Sections 1, 26, and 29 say configuration comes from files and secrets come only from environment variables. The requirement asks the Super Admin to manage mail and data configuration from the dashboard. **Deferred:** configuration stays in files for now. The Phase 2 admin-panel design decides whether non-secret settings move to the database. Secrets stay environment-only in all cases. Changing sections 1 and 26 needs your approval at that time.
5. **Goal progress.** Approved: current amount = balances of the accounts plus current values of the investments the user explicitly attaches to the goal. Nothing is linked automatically (BR-GOAL-02, BR-GOAL-03).
6. **Report export.** Approved: CSV and PDF, printable, generated on request. Applies to every list, not only transactions. Implemented for accounts, transactions, income categories, and expense categories. The accounts export includes a live `Current Balance` column, in the account's own currency (approved).
7. **Savings as a module.** Approved: savings is a separate module. The user attaches accounts to it and sees its transactions and progress. The `SAVINGS` account type (R2) is still available for individual accounts. Rules: BR-SAV-01 to BR-SAV-05.
8. **Expense category defaults.** Approved: the 15 default expense categories in BRD section 6.3, as with income. Users can add their own.
9. **Time zone for financial dates.** Approved: each user has a time zone. Financial dates use the user's local date (BRD decision 11, NFR-DATA-03).
10. **Savings target.** Approved: the target is set per month, as a monthly budget line. The target is optional, and progress is shown only when a target is set (BRD decision 15, BR-SAV-04). Implementation waits for the Budgets module.
11. **Multi-currency.** Approved: each amount has a currency, with INR as the default. The user chooses the currency on income, expense, investment, loan, and other inputs. Net worth, reports, and the dashboard can show any selected currency (NFR-DATA-04).
12. **Exchange rates.** Approved: Frankfurter (ECB reference rates, no API key). Income in RM converts to INR at that day's rate. Each transaction stores its rate. Coverage of INR, MYR, and AUD is verified before release (NFR-DATA-05, NFR-DATA-06).
13. **Product name and prefixes.** Approved: product name NAVRO, error code prefix `NV`, database table prefix `nv_`.
14. **Exchange-rate fallback.** Approved: provider rate for the date, then the most recent stored rate on or before the date, then the most recent stored rate of any date (last given rate), then a manual rate in config. Transactions are never rejected (NFR-DATA-07).
15. **Loan EMI category and transaction currency.** Approved: Loan EMI is a system category, and a transaction uses its account's currency (decisions 18 and 19 in BRD section 11).
16. **Expired session cleanup.** Approved: expired auth sessions are deleted on a configurable schedule (`auth.sessionCleanup`, default every 60 minutes, enabled). Only sessions past `expiresAt` are deleted.
17. **Cross-currency transfers.** Approved: the system converts the transfer amount with the stored exchange rate for the transfer date, using the same fallback chain as decision 14. Each leg is recorded in its own account's currency (BRD decision 22).
18. **Transfer reversal.** Approved: reversing either leg reverses the whole transfer, both legs together in one database transaction (BRD decision 23).

---

# 3. Technology Stack

## Backend

- Node.js
- NestJS
- TypeScript
- Node.js 20.19.0 or newer (`engines` in `package.json`). Development uses Node.js 24.

## Database

- PostgreSQL
- Prisma ORM

## Testing

- Jest
- Supertest
- Unit tests
- Integration tests
- E2E tests
- Test files (`*.spec.ts` and `test/**`) have a narrower ESLint override in `eslint.config.mjs`. The `no-unsafe-*`, `unbound-method`, and `require-await` rules are off there. Production code keeps every rule on. Do not extend the override to production code.
- CI: `.github/workflows/ci.yml` runs format, lint, spell check, Prisma validation, migrations, seed, unit, e2e, and build against PostgreSQL 16 on every push and pull request.

## Security

- JWT
- Passport
- bcrypt for password and OTP hashing
- Helmet
- Validation
- Role/permission-based authorization
- SonarCloud token (`SONAR_TOKEN`) comes only from the shell or the CI secret store. `sonar-project.properties` holds placeholders until the SonarCloud project exists.

## API Documentation

- Swagger / OpenAPI: UI at `/docs`, spec at `/docs-json`.
- Postman collection: `docs/postman/navro.postman_collection.json`, generated by `npm run docs:postman` from `/docs-json` with the server running. Regenerate and commit it after any route, DTO, or Swagger change.

## Logging

- Pino
- nestjs-pino
- Notification logs (`SmtpMailSender`): `Notification send started` (debug), `Notification sent` (debug, `durationMs`), and `Notification delivery failed` (error, `durationMs`, `errorCode`). Never log recipient addresses or message bodies.
- Daily files `app-YYYY-MM-DD.log` and `error-YYYY-MM-DD.log`. Retention comes from `logging.retentionDays`.

## Configuration

- Non-secret settings live in `config/default.json` (required base) and `config/env/<APP_ENV>.json` (per-environment overrides, deep-merged over the base).
- Secrets (`JWT_SECRET`, `DATABASE_URL`, API keys, seed admin credentials) come only from environment variables and are never placed in config files.
- `src/config/app-config.ts` is the single loader and Joi validator. Read config through it, not through ad-hoc `process.env` access.
- Shared runtime limits belong in config. Pagination uses `pagination.defaultPageSize` and `pagination.maxPageSize`, read through `src/common/pagination/pagination-config.ts`. Income category name length uses `income.categoryNameMaxLength`. Do not hard-code these values in DTOs, validators, or Swagger docs.
- Decorators and DTO class bodies read config at module load time, so they use the cached `readAppConfigFile()` helpers instead of the Nest container.
- Any new config key requires: the `AppConfigFile` type, a Joi rule, a value in `config/default.json`, and a spec in `src/config/app-config.spec.ts`.

---

# 4. Architectural Style

The backend follows a:

**Modular Monolith + Layered/Clean Architecture**

Each business module should have clear separation between:

```text
presentation
application
domain
infrastructure
```

## Presentation

Responsible for HTTP/API concerns.

Examples:

- Controllers
- DTOs
- HTTP-specific exceptions
- Response mappers

Presentation should not contain business logic.

## Application

Responsible for application use cases and orchestration.

Examples:

- Application services
- Use-case-oriented services
- Application inputs
- Application outputs where appropriate

Application services coordinate domain objects and infrastructure abstractions.

They should not contain unnecessary HTTP-specific concerns.

## Domain

Contains business concepts and abstractions.

Examples:

- Entities
- Repository abstractions
- Domain rules

The domain layer should remain independent from:

- NestJS infrastructure
- Prisma
- HTTP
- PostgreSQL
- Controllers

## Infrastructure

Contains technical implementations.

Examples:

- Prisma repositories
- Authentication infrastructure
- Guards
- Strategies
- External integrations
- Database implementations
- Security implementations

Infrastructure implements interfaces defined by the domain/application layers where appropriate.

---

# 5. Current Backend Structure

The current source structure is:

```text
src/
├── app.module.ts
├── main.ts
│
├── common/
│   ├── constants/
│   │   └── error-code.constant.ts
│   ├── exceptions/
│   │   └── application.exception.ts
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interfaces/
│   │   ├── api-error-response.interface.ts
│   │   └── api-response.interface.ts
│   └── utils/
│       ├── __tests__/
│       │   └── api-response.util.spec.ts
│       └── api-response.util.ts
│
├── config/
│   ├── auth.config.ts
│   ├── configuration.ts
│   ├── database.config.ts
│   ├── env.validation.ts
│   ├── logging.config.ts
│   └── swagger.config.ts
│
├── infrastructure/
│   ├── database/
│   │   ├── database.module.ts
│   │   └── prisma/
│   │       ├── prisma.module.ts
│   │       └── prisma.service.ts
│   └── security/
│       ├── password-hasher.service.spec.ts
│       └── password-hasher.service.ts
│
├── modules/
│   ├── auth/
│   │   ├── application/
│   │   │   ├── inputs/
│   │   │   │   └── login.input.ts
│   │   │   ├── outputs/
│   │   │   │   └── login.output.ts
│   │   │   └── services/
│   │   │       ├── auth.service.spec.ts
│   │   │       └── auth.service.ts
│   │   ├── infrastructure/
│   │   │   ├── decorators/
│   │   │   │   └── permissions.decorator.ts
│   │   │   ├── guards/
│   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   └── permissions.guard.ts
│   │   │   ├── interfaces/
│   │   │   │   └── authenticated-request.interface.ts
│   │   │   └── strategies/
│   │   │       ├── jwt.strategy.spec.ts
│   │   │       └── jwt.strategy.ts
│   │   ├── presentation/
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts
│   │   │   └── dto/
│   │   │       ├── login-data.dto.ts
│   │   │       ├── login-response.dto.ts
│   │   │       └── login.dto.ts
│   │   └── auth.module.ts
│   │
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   │
│   ├── users/
│   │   ├── application/
│   │   │   ├── inputs/
│   │   │   │   └── create-user.input.ts
│   │   │   └── services/
│   │   │       ├── users.service.spec.ts
│   │   │       └── users.service.ts
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   │   └── user.entity.ts
│   │   │   └── repositories/
│   │   │       └── user.repository.ts
│   │   ├── infrastructure/
│   │   │   └── repositories/
│   │   │       └── prisma-user.repository.ts
│   │   ├── presentation/
│   │   │   ├── controllers/
│   │   │   │   └── users.controller.ts
│   │   │   ├── dto/
│   │   │   │   ├── user-response.dto.ts
│   │   │   │   └── user-response-envelope.dto.ts
│   │   │   ├── exceptions/
│   │   │   │   └── user-already-exists.exception.ts
│   │   │   └── mappers/
│   │   │       └── user-response.mapper.ts
│   │   └── users.module.ts
│   │
│   ├── accounts/
│   │   ├── application/
│   │   │   ├── inputs/
│   │   │   └── services/
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   └── repositories/
│   │   ├── infrastructure/
│   │   │   └── repositories/
│   │   ├── presentation/
│   │   │   ├── controllers/
│   │   │   ├── dto/
│   │   │   ├── exceptions/
│   │   │   └── mappers/
│   │   └── accounts.module.ts
│   │
│   └── transactions/
│       ├── application/
│       │   ├── inputs/
│       │   │   ├── create-transaction.input.ts
│       │   │   ├── list-transactions.input.ts
│       │   │   └── reverse-transaction.input.ts
│       │   └── services/
│       │       ├── transactions.service.spec.ts
│       │       └── transactions.service.ts
│       ├── domain/
│       │   ├── entities/
│       │   │   └── transaction.entity.ts
│       │   ├── repositories/
│       │   │   └── transaction.repository.ts
│       │   └── validation/
│       │       └── transaction.validation.ts
│       ├── infrastructure/
│       │   └── repositories/
│       │       └── prisma-transaction.repository.ts
│       ├── presentation/
│       │   ├── controllers/
│       │   │   ├── transactions.controller.spec.ts
│       │   │   └── transactions.controller.ts
│       │   ├── dto/
│       │   │   ├── create-transaction.dto.ts
│       │   │   ├── list-transactions-query.dto.ts
│       │   │   ├── reverse-transaction.dto.ts
│       │   │   ├── transaction-list-response-envelope.dto.ts
│       │   │   ├── transaction-response.dto.ts
│       │   │   └── transaction-response-envelope.dto.ts
│       │   ├── exceptions/
│       │   │   ├── invalid-transaction.exception.ts
│       │   │   ├── transaction-already-reversed.exception.ts
│       │   │   ├── transaction-cannot-be-reversed.exception.ts
│       │   │   └── transaction-not-found.exception.ts
│       │   └── mappers/
│       │       └── transaction-response.mapper.ts
│       └── transactions.module.ts
│
└── main.ts
```

**Important:** the actual source tree remains authoritative. If the tree above differs from the current repository, inspect the repository before making assumptions.

---

# 6. Important Architectural Rule

Do NOT automatically move authentication-related components into `common`.

Authentication is a **business/application capability**, not generic shared infrastructure.

The `auth` module owns authentication/authorization-specific components such as:

- JWT strategy
- JWT guard
- Permissions guard
- Permissions decorator
- Authenticated request interface
- Authentication application service

`common` should contain only genuinely cross-cutting, reusable components that do not belong to one business module.

Examples:

```text
common/
├── constants
├── exceptions
├── filters
├── interfaces
└── utils
```

Do not use `common` as a dumping ground.

---

# 7. Module Ownership Rules

## Users Module

Owns:

- User entity
- User repository abstraction
- User persistence implementation
- User application service
- User DTOs
- User controllers
- User-specific exceptions
- User response mapping

## Auth Module

Owns:

- Registration (`POST /auth/register`) with email OTP verification
- Resend verification OTP (`POST /auth/resend-verification`)
- Forgot and reset password by email OTP (`POST /auth/forgot-password`, `POST /auth/reset-password`)
- Login (blocked until the email is verified)
- JWT authentication
- Authentication service
- JWT strategy
- JWT guard
- Permission guard
- Permission decorator
- Authenticated request abstraction

Rules:

- Registration creates the user through `UsersService`. Users module does not expose a create endpoint.
- OTP codes are random, stored only as HMAC-SHA256 hashes, and never logged or returned.
- OTP settings (`otp.*`) and `registration.emailVerificationRequired` come from config, not code.
- Unknown and wrong OTP codes return the same error, so responses do not reveal which emails exist.
- Email delivery goes through the `MailSender` port. Only `infrastructure/mail` talks to SMTP.
- Error codes for this module are listed in [docs/ERROR_CODES.md](./docs/ERROR_CODES.md).

## Accounts Module

Owns:

- Account entity
- Account repository abstraction
- Account persistence implementation
- Account application service
- Account inputs
- Account DTOs
- Account controllers
- Account-specific exceptions
- Account response mapping
- Account lifecycle rules

## Transactions Module

Owns:

- Transaction entity
- Transaction repository abstraction
- Transaction persistence implementation
- Transaction application service
- Transaction inputs
- Transaction validation rules
- Transaction DTOs
- Transaction controllers
- Transaction-specific exceptions
- Transaction response mapping
- Transaction creation
- Transaction retrieval
- Transaction listing
- Transaction reversal workflow
- Transaction base-currency conversion (`baseAmount`, `exchangeRate`, `rateDate`, `rateSource`)
- Transaction date is a calendar date (`YYYY-MM-DD`), not a timestamp (decision 21)
- Optional expense category link on EXPENSE transactions

## Expenses Module

Owns:

- Expense category entity and validation
- Expense category repository abstraction and Prisma implementation
- Expense category service (create, list, get, rename, archive)
- Expense category inputs, DTOs, controller, and response mapping
- Expense-specific exceptions
- System defaults (shared rows with `user_id` NULL) and the per-user archive table

Rules:

- Names are unique per user (case-insensitive) and must not match a system category.
- System categories are read-only, but any user can archive them for themselves.
- The category limit comes from `expenses.categoryNameMaxLength` in config. Do not hard-code it.

## FX Module

Owns:

- Exchange rate entity and `nv_exchange_rates` persistence
- Rate provider abstraction and the Frankfurter implementation
- Exchange rate service (lookup order defined in [CONFIGURATION.md](./docs/CONFIGURATION.md#exchangerates))

Rules:

- Rates are per calendar date (NFR-DATA-05). Each transaction stores its rate and `rateSource`.
- A transaction is never rejected because the provider is down (NFR-DATA-07). The only exception is `EXCHANGE_RATE_UNAVAILABLE` (503), which is returned when no fallback is available. See [ERROR_CODES.md](./docs/ERROR_CODES.md#exchange-rates).
- Transaction currency equals account currency. Conversion to `exchangeRates.baseCurrency` is for reporting only (decision 19).

## Infrastructure

Global technical infrastructure belongs here.

Examples:

```text
infrastructure/
├── database/
└── security/
```

Use this area for infrastructure that is not specific to one business module.

---

# 8. Dependency Direction

Prefer dependencies flowing inward:

```text
Presentation
     ↓
Application
     ↓
Domain
     ↑
Infrastructure
```

Infrastructure may implement domain/application abstractions.

For example:

```text
TransactionRepository
        ↑
PrismaTransactionRepository
```

The domain should not depend directly on Prisma.

---

# 9. Repository Pattern

Repositories are defined as abstractions in the domain.

Example:

```text
modules/transactions/domain/repositories/
```

Concrete implementations belong in:

```text
modules/transactions/infrastructure/repositories/
```

Example:

```text
TransactionRepository
        ↑
PrismaTransactionRepository
```

NestJS dependency injection binds the abstraction to the implementation.

Do not inject Prisma directly into application/domain services when a repository abstraction already exists.

Ownership checks for user-owned resources must be enforced at the repository boundary.

---

# 10. Prisma

Prisma is an infrastructure concern.

Do not allow Prisma types to leak unnecessarily into:

- Domain entities
- Application services
- Controllers
- DTOs

Global Prisma infrastructure belongs under:

```text
src/infrastructure/database/prisma/
```

Business-specific Prisma repositories belong under their respective module:

```text
src/modules/<module>/infrastructure/repositories/
```

Prisma Decimal values must be converted at the infrastructure/domain boundary.

---

# 11. Testing Strategy

The project uses three testing levels.

## Unit Tests

Test individual business/application components in isolation.

Examples:

```text
*.service.spec.ts
*.controller.spec.ts
*.guard.spec.ts
*.strategy.spec.ts
```

Unit tests should mock dependencies.

They should not require a real database.

Every implementation change must have corresponding test coverage appropriate to the layer being changed.

## Integration Tests

Test infrastructure implementations against the test database.

Examples:

```text
test/integration/
```

Integration tests may use the real PostgreSQL test database.

The test database must be separate from development/production databases.

Current test database:

```text
navro_test_db
```

## E2E Tests

Test the application through HTTP.

Examples:

```text
test/e2e/
```

E2E tests exercise the real NestJS application/module wiring.

They validate:

- HTTP routing
- Validation
- Authentication
- Authorization
- Application services
- Repository implementations
- Database integration

Current E2E coverage includes:

```text
test/e2e/
├── accounts.e2e-spec.ts
├── app.e2e-spec.ts
├── auth.e2e-spec.ts
├── authorization.e2e-spec.ts
├── expense-categories.e2e-spec.ts
├── global-setup.ts
├── income-categories.e2e-spec.ts
├── registration.e2e-spec.ts
├── support/
│   └── api-request.ts
└── transactions.e2e-spec.ts
```

---

E2E request rule:

- Build requests with `test/e2e/support/api-request.ts` (`apiRequest(app.getHttpServer())`). It adds the API key header from `API_KEY_WEB_FRONTEND`.
- Do not import `supertest` directly in e2e specs. Otherwise requests fail with `401 API_KEY_MISSING`.
- Tests that change shared seed data must create their own role and user. The seeded super-admin role is shared by parallel suites.

---

# 12. Test Commands

Important commands:

```bash
npm test
```

Run unit/default tests.

```bash
npm run test:integration
```

Run integration tests.

```bash
npm run test:e2e -- --runInBand
```

Run E2E tests.

```bash
npm run build
```

Compile the application.

```bash
npm run lint:check
```

Check linting without modifying files.

```bash
npm run format:check
```

Check formatting.

Full validation:

```bash
npm run check
```

For substantial backend changes, the preferred validation sequence is:

```bash
npm run db:validate
npm run build
npm run lint:check
npm test
npm run test:integration
npm run test:e2e -- --runInBand
```

Use the smallest relevant test command during incremental development, then run the appropriate full validation before establishing a milestone checkpoint.

---

# 13. Database Commands

```bash
npm run db:validate
```

Validate Prisma configuration.

```bash
npm run db:format
```

Format Prisma schema.

```bash
npm run db:generate
```

Generate Prisma client.

```bash
npm run db:status
```

Check migration status.

```bash
npm run db:migrate
```

Create/apply development migration.

```bash
npm run db:migrate:deploy
```

Deploy migrations.

```bash
npm run db:seed
```

Seed development database.

Test database:

```bash
npm run db:test:status
```

```bash
npm run db:test:migrate
```

```bash
npm run db:seed:test
```

The development and test databases must remain separate.

When a schema migration already exists, apply it to the appropriate database rather than creating a duplicate migration.

---

# 14. Coding Style

Use TypeScript strictly.

Prefer:

- Explicit types where useful
- Small focused classes
- Dependency injection
- `async/await`
- `readonly` dependencies
- Clear naming
- Single responsibility
- Domain-oriented naming
- Small methods
- Meaningful exceptions
- Existing abstractions

Avoid:

- `any`
- Unnecessary abstractions
- Huge services
- Business logic inside controllers
- Prisma queries inside controllers
- Duplicated business rules
- Global utility dumping grounds
- Premature microservices

For Jest mocks, prefer precise typing or `as never` where necessary rather than introducing `any`.

---

# 15. NestJS Conventions

Use NestJS dependency injection.

Example:

```typescript
@Injectable()
export class UsersService {
  constructor(private readonly userRepository: UserRepository) {}
}
```

Controllers should remain thin.

Expected responsibility:

```text
HTTP Request
     ↓
Controller
     ↓
Application Service
     ↓
Repository
     ↓
Database
```

Authentication/authorization guards are infrastructure concerns and execute before controller business logic.

---

# 16. DTO Rules

DTOs belong to:

```text
presentation/dto/
```

DTOs are HTTP/API boundary objects.

Do not use presentation DTOs as domain entities.

Application inputs belong under:

```text
application/inputs/
```

This keeps API contracts separate from application use-case inputs.

For example:

```text
CreateTransactionDto
        ↓
TransactionsController
        ↓
CreateTransactionInput
        ↓
TransactionsService
```

Do not create DTO-specific unit tests unless there is a concrete reason to test behavior that cannot be covered adequately through controller/E2E validation.

---

# 17. Domain Entity Rules

Domain entities belong under:

```text
domain/entities/
```

They should represent business concepts rather than database records.

Domain entities must remain independent from Prisma and HTTP.

Financial domain entities must not expose Prisma Decimal types.

---

# 18. Error Handling

Common application-wide errors belong under:

```text
common/exceptions/
```

HTTP exception translation/filtering belongs under:

```text
common/filters/
```

Business-specific exceptions belong inside the owning module.

Example:

```text
transactions/presentation/exceptions/
```

Do not create module-specific exceptions in `common`.

Every error response uses the same envelope, produced by `HttpExceptionFilter`:

```json
{
  "success": false,
  "statusCode": "NV404",
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  },
  "meta": { "requestId": "..." },
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/accounts/..."
}
```

Rules:

- `statusCode` is `errors.statusCodePrefix` + `errors.statusCodeSeparator` + the HTTP status. The default is `NV404`. The prefix and separator come from `config/default.json` and are configurable.
- The real HTTP status is still set on the response. Only the body `statusCode` carries the prefix.
- `error.code` is the plain domain code, such as `ACCOUNT_NOT_FOUND`. Never add the prefix to `ErrorCode` values.
- `error.details` appears only when validation details exist.

Current transaction error codes include:

```text
INVALID_TRANSACTION
TRANSACTION_NOT_FOUND
TRANSACTION_ALREADY_REVERSED
TRANSACTION_CANNOT_BE_REVERSED
```

Authentication failures use:

```text
401 Unauthorized
```

Authorization failures use:

```text
403 Forbidden
```

Resource ownership failures intentionally use not-found semantics where appropriate to avoid exposing another user's resources.

---

# 19. Authentication and Authorization

Authentication uses JWT.

Current conceptual flow:

```text
Request
  ↓
JWT Auth Guard
  ↓
JWT Strategy
  ↓
Authenticated User
  ↓
Permissions Guard
  ↓
UserRepository
  ↓
User Permissions
  ↓
Controller
```

Authentication answers:

> Who is the user?

Authorization answers:

> What is the authenticated user allowed to do?

These concerns must remain separate.

---

# 20. Authentication Implementation

Current login flow:

```text
POST /api/v1/auth/login
        ↓
AuthController
        ↓
AuthService
        ↓
UserRepository.findByEmail()
        ↓
PasswordHasherService.verify()
        ↓
JwtService.signAsync()
        ↓
Access Token
```

The JWT contains only the required identity claims, currently:

```typescript
{
  sub: user.id,
  email: user.email,
}
```

The password or password hash must never be included in the JWT.

**Expired session cleanup.** `AuthSessionCleanupScheduler` deletes sessions whose `expiresAt` has passed, on the interval set in `auth.sessionCleanup`. Refresh tokens are removed by the database cascade. Revoked sessions are kept until they expire. The scheduler uses `setInterval` with `unref()`, not a scheduler package, and does nothing when `auth.sessionCleanup.enabled` is `false`.

---

# 21. Password Security

Password handling follows these rules:

1. Passwords are never stored in plaintext.
2. Passwords are hashed before persistence.
3. `PasswordHasherService` owns password hashing/verification.
4. bcrypt is the current implementation.
5. Current bcrypt cost factor is `12`.
6. Password hashes are never returned through public APIs.
7. Password hashes are never included in JWT claims.
8. Passwords and password hashes must never be logged.
9. Password input must have a reasonable minimum and bounded maximum length.
10. Password policy should prioritize length and resistance to guessing rather than arbitrary complexity requirements.
11. Login brute-force protection is implemented.
12. Password reset/change flows require dedicated security design.

---

# 22. Permission Model

Authorization uses role/permission-based access control.

Current conceptual relationship:

```text
User
  ↓
UserRole
  ↓
Role
  ↓
RolePermission
  ↓
Permission
```

Permissions use:

```text
resource:action
```

Examples:

```text
transactions:create
transactions:read
transactions:update
transactions:delete

accounts:create
accounts:read
accounts:update
```

Controllers declare required permissions:

```typescript
@Permissions('accounts:read')
```

The `PermissionsGuard` retrieves the authenticated user's permissions and determines whether access is allowed.

---

# 23. Wildcard Permission

The existing wildcard permission:

```text
*
```

means:

> The user has all permissions.

Authorization checks allow a request when:

```text
required permission exists
OR
user has *
```

This supports the `SUPER_ADMIN` role without requiring every newly introduced permission to be explicitly assigned to that role.

Do not introduce a second authorization mechanism without an explicit architectural decision.

---

# 24. Authorization Rules

Current authorization behavior:

### No permission metadata

```text
No @Permissions(...)

       ↓

Request allowed by PermissionsGuard
```

### Required permission exists

```text
accounts:read

       ↓

Allowed
```

### Required permission missing

```text
accounts:update

       ↓

User only has accounts:read

       ↓

403 Forbidden
```

### Wildcard

```text
*

       ↓

All permissions allowed
```

### Multiple permissions

The current implementation uses **AND semantics**:

```typescript
@Permissions(
  'accounts:create',
  'users:read',
)
```

requires the user to have both permissions unless the user has `*`.

---

# 25. API Versioning

The API uses URI versioning.

Expected API format:

```text
/api/v1/...
```

Health endpoints remain unversioned and are not under the API prefix:

```text
/health/live
/health/ready
```

`/health/live` is a liveness probe (no dependency checks). `/health/ready` is a readiness probe (bounded database check). There is no plain `/health` route.

Current endpoints include:

```text
POST /api/v1/auth/login

GET /api/v1/users/me

POST /api/v1/users

POST /api/v1/accounts

GET /api/v1/accounts

GET /api/v1/accounts/:id

PATCH /api/v1/accounts/:id/archive

POST /api/v1/transactions

GET /api/v1/transactions

GET /api/v1/transactions/:id

POST /api/v1/transactions/:id/reversal
```

---

# 26. Configuration

Environment-specific configuration must not be hardcoded into business logic.

Configuration belongs under:

```text
src/config/
```

Non-secret configuration is JSON under `config/`:

```text
config/default.json       base settings; the app will not start without them
config/env/<env>.json     per-environment overrides: local, test, uat, sit, staging, prod
config/load-config.cjs    shared loader used by the app and by PM2
```

Loading rules:

- `APP_ENV` selects the environment file. It defaults to `local`.
- The environment file is deep-merged over `default.json`. Objects merge and arrays are replaced.
- The merged result is validated by the Joi schema in `src/config/app-config.ts`. An invalid or missing value stops startup with a readable message.
- The loader resolves files from `process.cwd()`. Run the app and PM2 from the project root.

Configuration areas include:

- App identity, base URL, and API prefix
- Server host, port, and SSL
- Error status-code prefix
- Security: API keys, CORS, throttling, public-route metadata key
- Authentication: JWT expiry, password salt rounds
- Database pool and SSL
- Health checks
- Logging and monitoring
- Swagger

Secrets rules:

- Secrets come only from environment variables. Never put them in `config/*.json`, source code, or tests.
- Config files store only the **name** of an environment variable, such as `keyEnv: "API_KEY_WEB_FRONTEND"`.
- Required secrets: `DATABASE_URL`, `JWT_SECRET` (at least 32 characters), each `security.apiClients[].keyEnv` (at least 32 characters), `SEED_ADMIN_EMAIL`, and `SEED_ADMIN_PASSWORD`.
- Local values go in `.env`, which is git-ignored. Test values go in `.env.test`.

Code rules:

- Every tunable value must come from `AppConfig`: ports, timeouts, limits, paths, prefixes, CORS origins, retention, and thresholds. Do not add new literals to services or controllers.
- Nest providers read config through `ConfigService`. Bootstrap code and decorators read config through `readAppConfigFile()` or `appConfiguration()`, because they run before the Nest container exists.
- Adding a config key means updating `config/default.json`, the Joi schema and `AppConfig` type in `app-config.ts`, and `app-config.spec.ts`.

---

# 27. Logging

The project uses:

```text
nestjs-pino
```

and Pino logging.

File logging (`src/config/logging.config.ts`, `src/config/daily-log-file.ts`):

- Logs are JSON lines written to `logging.logsPath` (default `logs`, resolved from the project root).
- Daily files: `app-YYYY-MM-DD.log` (all levels from trace) and `error-YYYY-MM-DD.log` (level error and above). The file switches at local midnight.
- Retention: `logging.retentionDays` (default 30). Files older than that many days are deleted at each daily switch. Today counts as one day.
- stdout keeps running alongside the files; `logging.pretty` switches stdout to pretty output.
- Search with `grep` or `jq`, for example `jq . logs/error-*.log`.

Do not use random `console.log` statements in production application code.

Use the configured application logger.

Never log:

- Passwords
- Password hashes
- JWT secrets
- Access tokens
- Refresh tokens
- Sensitive financial information

Authentication and authorization failures should provide useful operational information without exposing credentials or sensitive data.

---

# 28. API Documentation

Swagger/OpenAPI is part of the backend.

When adding public APIs, document as appropriate:

- Request DTOs
- Response DTOs
- Authentication requirements
- API versioning
- Error responses
- Authorization requirements
- Pagination semantics

---

# 29. Security Principles

Security is a first-class requirement.

Always consider:

- Input validation
- Authentication
- Authorization
- Password hashing
- JWT security
- Secure headers
- Environment secrets
- Database access
- Error information leakage
- Logging of sensitive information
- Brute-force protection
- Credential lifecycle
- Token lifecycle
- User ownership/isolation

Never log:

- Passwords
- Password hashes
- JWT secrets
- Access tokens
- Refresh tokens
- Sensitive financial information

---

## API Client Access (API Keys)

Every route requires a valid API client key unless it is marked `@Public()`.

- Header: `x-api-key`. The name comes from `security.apiKeyHeader`.
- Known clients are listed in `security.apiClients`: `web-frontend` and `mobile-app`. Each entry names the environment variable that holds its key.
- `ApiClientGuard` is registered globally through `APP_GUARD`. It compares SHA-256 digests in constant time and checks every client.
- A missing key returns `401` with `API_KEY_MISSING`. An unknown or empty key returns `401` with `API_KEY_INVALID`.

An API key identifies the calling application, not the user. It does not replace JWT authentication.

- Browser and mobile apps can be inspected, so an API key is a gate, not a secret.
- Protect user data with JWT, permissions, CORS, rate limits, and HTTPS.

E2E tests must send requests through `test/e2e/support/api-request.ts`, which adds the API key header.

### Declaring security in Swagger

Security is declared once per controller class. Do not add method-level `@ApiBearerAuth` or `@ApiSecurity`.

- `@RequiresApiKey()` (`src/common/decorators/api-security.decorator.ts`): API key only. Use for public auth routes such as register, login, and OTP.
- `@RequiresApiKeyAndJwt()`: API key AND bearer JWT. Use for every user-scoped controller.
- Health routes are `@Public()` and have no Swagger security.

Class and method security metadata are combined as an OR. Mixing a method-level `@ApiBearerAuth` with a class-level API key requirement would let a JWT alone pass in the docs. Keep one declaration per class.

Both schemes are registered in `src/config/swagger.config.ts`: `api-key` (header name from `security.apiKeyHeader`) and `access-token` (bearer). In Swagger UI, authorize both before trying a protected route.

---

# 30. Seed and Test Data Rules

Database seeds should be **idempotent** wherever possible.

The system admin seed uses:

```text
SEED_ADMIN_EMAIL
SEED_ADMIN_PASSWORD
```

The admin user is created/upserted with the `SUPER_ADMIN` role.

The password hash is regenerated from the configured seed password.

When the admin user already exists, the seed must synchronize the password hash as well as account metadata.

The admin role assignment is also idempotent through the `UserRole` upsert.

---

# 31. Current Testing Status

The current backend foundation, authentication, authorization, Accounts module, and Transactions module are green.

```text
User E2E                              ✅
Authentication E2E                    ✅
Authorization E2E                     ✅
PermissionsGuard unit tests           ✅
User service tests                    ✅
Password hasher tests                 ✅
Repository integration tests          ✅
Accounts tests                        ✅
Transactions service tests            ✅
Transactions controller tests         ✅
Transactions E2E                      ✅
Build                                 ✅
Lint                                  ✅
Full project check                    ✅
```

Transactions E2E coverage includes:

```text
Create transaction
Unauthenticated create
Cross-user ownership protection
Amount validation
Decimal precision validation
Integer digit validation
Transaction type validation
Currency validation
Account currency consistency
Archived account protection
Transaction date validation
Description validation
Unexpected-field rejection
Maximum amount boundary
Currency normalization
Null description
Get transaction
Cross-user transaction protection
List transactions
Pagination
Deterministic ordering
Reversal creation
Unauthenticated reversal
Expense → income reversal
Duplicate reversal protection
Reversal-of-reversal protection
Missing transaction reversal
Cross-user reversal protection
Invalid reversal date
Reversal description validation
Unexpected reversal fields
Null reversal description
```

---

# 32. Authentication Architecture Review

The authentication/authorization architecture has been reviewed after implementation.

Current architecture:

```text
                       HTTP Request
                            │
                            ▼
                  ┌──────────────────┐
                  │   JwtAuthGuard    │
                  └────────┬─────────┘
                           │
                           ▼
                  ┌──────────────────┐
                  │   JwtStrategy    │
                  └────────┬─────────┘
                           │
                           ▼
                    request.user
                           │
                           ▼
                  ┌──────────────────┐
                  │ PermissionsGuard │
                  └────────┬─────────┘
                           │
                           ▼
                    UserRepository
                           │
                           ▼
                 User → Role → Permission
                           │
                           ▼
                  Permission decision
                           │
                    ┌──────┴──────┐
                    ▼             ▼
                  Allow          403
                    │
                    ▼
                 Controller
                    │
                    ▼
              Application Service
                    │
                    ▼
              Domain / Repository
                    │
                    ▼
                Infrastructure
                    │
                    ▼
                  Prisma
```

The architecture currently satisfies the major requirements:

- Authentication separated from authorization
- Controllers remain thin
- Application services coordinate use cases
- Repository abstraction protects application/domain layers
- Prisma remains infrastructure
- Password hashing is isolated
- JWT strategy is infrastructure
- Permissions are explicit
- HTTP authentication and authorization semantics are correct

---

# 33. Known Architectural Review Items

Known improvements that are not currently required to complete the active milestone should be recorded rather than forcing unnecessary refactoring.

One known authorization ownership issue:

`PermissionsGuard` belongs conceptually to the Auth module:

```text
modules/auth/infrastructure/guards/permissions.guard.ts
```

However, current NestJS provider wiring requires availability through the Users module because it depends on `UserRepository`.

This currently works and is covered by tests.

**Do not perform a file move or module redesign merely to correct this.**

Future changes must preserve:

- Auth module ownership
- User repository abstraction
- Existing authorization behavior
- Existing E2E tests

Other production-hardening opportunities may similarly be recorded as review items when they are not required immediately.

---

# 34. Current Development Philosophy

NAVRO is being developed as a **real production-quality software engineering project**, not merely as a tutorial application.

The AI should therefore prioritize:

1. Maintainability
2. Correctness
3. Security
4. Testability
5. Clear architecture
6. Observability
7. Scalability
8. Developer experience
9. Long-term evolution

Do not optimize only for making the immediate test pass.

A green test is evidence of correctness for the tested behavior, not automatically proof of production readiness.

---

# 35. How AI Should Work on This Project

## Working Rules — Chunked Delivery and Commits

- Work in small chunks, one module or one logical concern at a time. Do not batch the whole project.
- The user commits every chunk. Do not run `git commit`, `git push`, or amend commits.
- Before proposing a commit for a chunk, run `npx tsc --noEmit` and the unit tests for the touched code. Also run e2e when routes, guards, or the database change. Run `npm run lint:check`, `npm run spellcheck`, and `npm run format:check` too, because CI runs them.
- If routes, DTOs, or Swagger decorators changed, run `npm run docs:postman` with the server running and include the regenerated collection in the proposed commit.
- At the end of each chunk, report:
  - the files changed, grouped by purpose;
  - what each group does, so the user can follow the code;
  - test and lint results;
  - a suggested commit message in Conventional Commits format (`type(scope): summary`, with a short body).
- Wait for the user to commit and confirm before starting the next chunk.

When asked to implement something:

## Step 1 — Understand

First determine:

- Which module owns the feature?
- Which architectural layer owns the change?
- What existing abstraction should be reused?
- What dependencies already exist?
- What tests should change?
- What security implications exist?
- Does the requested change reopen a completed milestone unnecessarily?

## Step 2 — Preserve Architecture

Reuse the existing architecture before introducing new abstractions.

Do not create duplicate patterns.

If a repository abstraction already exists, use it.

## Step 3 — Check Existing Code

Before adding files or changing structure:

- Inspect the existing implementation.
- Inspect existing tests.
- Reuse existing exceptions.
- Reuse existing response patterns.
- Reuse existing validation patterns.
- Do not assume a missing abstraction exists merely because documentation is old.

## Step 4 — Implement

Make the smallest clean change that satisfies the requirement.

Do not make unrelated improvements at the same time.

## Step 5 — Test

Every implementation change must have corresponding tests.

Add/update the appropriate:

- Unit tests
- Integration tests
- E2E tests

Do not add redundant tests solely for the sake of increasing test count.

## Step 6 — Validate

Prefer:

```bash
npm run db:validate
npm run build
npm run lint:check
npm test
npm run test:integration
npm run test:e2e -- --runInBand
```

Use targeted tests first during development.

## Step 7 — Explain

When reporting the change, explain:

- What changed
- Why it changed
- Files affected
- Architectural impact
- Tests executed
- Remaining risks
- Whether a Git checkpoint should be created

---

# 36. Do Not Make Unrequested Changes

Unless explicitly requested, do not:

- Change the overall architecture
- Rename modules
- Move files unnecessarily
- Introduce microservices
- Replace Prisma
- Replace NestJS
- Replace Jest
- Replace the authentication mechanism
- Rewrite working code
- Add unnecessary dependencies
- Change API contracts
- Change database schema
- Modify unrelated modules
- Reopen completed modules without a concrete requirement

If a potential improvement is discovered but is not required, record it as a review item and continue with the planned roadmap.

---

# 37. Git Rules

Use Conventional Commit messages.

Examples:

```text
feat: add user registration

fix: handle duplicate user email

refactor: reorganize module structure

test: add user repository integration tests

docs: add backend architecture documentation

chore: update dependencies
```

Keep commits focused.

Avoid mixing:

```text
feature + refactor + dependency upgrade + unrelated formatting
```

in one commit.

Each major completed milestone should establish a clean Git checkpoint.

The Transactions milestone has already been committed after the implementation and full test suite became green.

---

# 38. Current Project Progress

The NAVRO backend foundation, authentication/authorization, financial foundation, Accounts module, Transactions module, and Income categories have been implemented.

The actual source tree and current implementation remain the source of truth.

## Foundation

```text
Foundation

├── NestJS application                    ✅
├── Configuration                         ✅
├── Environment validation                ✅
├── PostgreSQL                            ✅
├── Prisma                                ✅
├── Database module                       ✅
├── Prisma module/service                 ✅
├── Logging / Pino                        ✅
├── Swagger / OpenAPI                     ✅
├── Global exception handling             ✅
├── API response utilities                ✅
├── Health endpoint                       ✅
├── Unit testing                          ✅
├── Integration testing                   ✅
└── E2E testing                           ✅
```

## Users

```text
Users

├── User domain entity                    ✅
├── Repository abstraction                ✅
├── Prisma repository                     ✅
├── Application service                   ✅
├── Application inputs                    ✅
├── DTOs                                  ✅
├── Controller                            ✅
├── Validation                            ✅
├── Ownership-aware repository access     ✅
└── Tests                                 ✅
```

## Authentication

```text
Authentication

├── Password hashing                      ✅
├── Login                                 ✅
├── JWT generation                        ✅
├── JWT strategy                          ✅
├── JWT guard                             ✅
├── Current-user flow                     ✅
├── Authentication error handling         ✅
├── Account status enforcement             ✅
├── Credential validation                 ✅
├── Authentication E2E                    ✅
└── Security architecture review          ✅
```

## Authorization

```text
Authorization

├── Permission model                      ✅
├── Permissions decorator                 ✅
├── PermissionsGuard                      ✅
├── Multiple permissions                  ✅
├── Wildcard permission                   ✅
├── Permission freshness                  ✅
├── 401 / 403 semantics                   ✅
├── Ownership-aware authorization         ✅
├── Unit tests                            ✅
├── E2E tests                             ✅
└── Architecture review                   ✅
```

## Authentication Hardening

```text
Authentication Hardening

├── Password & credential security         ✅
├── JWT security review                   ✅
├── Login failure handling                ✅
├── Login rate limiting                   ✅
├── Account enumeration protection        ✅
├── Refresh token strategy decision       ✅
├── Token/session security                ✅
├── Account status enforcement             ✅
├── Sensitive data / logging review       ✅
├── Security-focused tests                ✅
├── Expired session cleanup               ✅
└── Production authentication review      ✅
```

---

# 39. Financial Domain Foundation

The financial domain foundation has been established before implementing financial modules.

## Financial Principles

```text
Financial Domain

├── Money representation                  ✅
├── Decimal / NUMERIC strategy            ✅
├── Currency strategy                     ✅
├── User ownership / isolation            ✅
├── UUID record identity                  ✅
├── UTC timestamps                        ✅
├── Business-date distinction             ✅
├── Database transaction strategy         ✅
├── Auditability principles               ✅
├── Immutable/reversal principles         ✅
├── Soft-delete/archive principles        ✅
├── Database constraints                  ✅
├── Database indexing                     ✅
├── Financial conventions                 ✅
└── Architecture review                   ✅
```

## Money

JavaScript `number` is not used as the authoritative representation of financial amounts.

The database uses PostgreSQL `NUMERIC/DECIMAL`, while the application/domain currently represents monetary values as strings.

```text
PostgreSQL NUMERIC/DECIMAL
        ↓
Prisma Decimal
        ↓
Infrastructure mapping
        ↓
Domain monetary string
```

A dedicated Money value object can be introduced later if domain complexity requires it.

## Currency

Currencies use ISO-4217-style three-character currency codes.

Examples:

```text
MYR
USD
SGD
```

Currency conversion is not part of the basic Accounts or Transactions calculation model.

## Ownership

All user-owned financial resources must enforce ownership at the repository boundary.

Example:

```text
findByIdForUser(resourceId, userId)
```

A resource belonging to another user must not be exposed merely because its ID is known.

## Financial Record Lifecycle

Financial records should not be physically deleted when doing so would destroy financial history.

For Accounts:

```text
ACTIVE
   │
   │ archive
   ▼
ARCHIVED
```

For Transactions:

```text
Created
   │
   ├── immutable
   │
   └── correction
          ↓
       reversal
```

---

# 40. Accounts Module

The Accounts module is **COMPLETE**.

It is the first completed financial business module in NAVRO.

## Accounts Scope

```text
Accounts

├── Account creation                     ✅
├── Account retrieval                    ✅
├── Account listing                      ✅
├── Pagination                           ✅
├── Ownership isolation                  ✅
├── Account validation                   ✅
├── Currency normalization               ✅
├── Opening balance validation           ✅
├── Negative opening balance support     ✅
├── Account status                       ✅
├── Account archival                     ✅
├── Double-archive protection             ✅
├── Authentication                       ✅
├── Permission authorization             ✅
├── Swagger documentation               ✅
├── Domain tests                         ✅
├── Application service tests            ✅
├── Repository tests                     ✅
├── Controller tests                     ✅
├── Integration tests                    ✅
├── E2E tests                            ✅
└── Green validation                     ✅
```

## Account Types

```text
BANK_ACCOUNT
CASH
CREDIT_CARD
INVESTMENT
OTHER
SAVINGS
CURRENT
WALLET
FIXED_DEPOSIT
RECURRING_DEPOSIT
```

## Account Status

```text
ACTIVE
ARCHIVED
```

## Account API

```text
POST   /api/v1/accounts
GET    /api/v1/accounts
GET    /api/v1/accounts/:id
PATCH  /api/v1/accounts/:id/archive
```

## Account Permissions

```text
accounts:create
accounts:read
accounts:update
```

CUSTOMER receives `accounts:create` and `accounts:read`. ACCOUNT_MANAGER receives all three. ADMIN receives `accounts:read` and `accounts:update`.

## Expense Permissions

```text
expense:create
expense:read
expense:update
```

CUSTOMER and ADMIN receive all three. SUPER_ADMIN receives every permission through the `*` wildcard.

## Archive Rules

```text
ACTIVE
   │
   │ PATCH /accounts/:id/archive
   ▼
ARCHIVED
```

An archived account:

- remains stored in the database
- remains accessible to its owner
- cannot be archived again
- returns `ACCOUNT_ALREADY_ARCHIVED` when archived again
- remains protected by ownership rules
- does not support physical deletion

Ownership failure intentionally behaves as not-found:

```text
User A account
      ↓
User B attempts access
      ↓
ACCOUNT_NOT_FOUND
```

This avoids exposing the existence of another user's financial resource.

## Accounts Architecture

```text
HTTP
 │
 ▼
AccountsController
 │
 ▼
AccountsService
 │
 ▼
Account domain
 │
 ▼
AccountRepository
 │
 ▼
PrismaAccountRepository
 │
 ▼
Prisma
 │
 ▼
PostgreSQL
```

The module follows:

```text
Presentation
      ↓
Application
      ↓
Domain
      ↑
Infrastructure
```

Prisma remains an infrastructure concern.

---

# 41. Transactions Module

The Transactions module is **COMPLETE**.

Transactions are the second completed financial business module.

## Income Categories

Income categories let a user label INCOME transactions (for example Salary or Freelance).

- Routes: `POST /api/v1/income/categories` (201), `GET /api/v1/income/categories` (paginated), `GET /api/v1/income/categories/:id`, `PATCH /api/v1/income/categories/:id` (rename), `PATCH /api/v1/income/categories/:id/archive`.
- System categories are seeded with `userId = null`. They are visible to all users and are read-only. Renaming or archiving one returns 403 `SYSTEM_INCOME_CATEGORY_READ_ONLY`.
- Another user's category returns 404 `INCOME_CATEGORY_NOT_FOUND`.
- Permissions: `income:create`, `income:read`, `income:update`. There is no `income:delete`; archive uses `income:update`. CUSTOMER receives all three.
- A transaction may set `incomeCategoryId` only when `type` is INCOME. Setting it on EXPENSE returns `INVALID_TRANSACTION`. Reversing a transaction clears `incomeCategoryId`.
- Names are unique per user, compared case-insensitively after trimming. The database enforces this with `@@unique([userId, normalizedName])`, where `normalizedName = lower(btrim(name))`. The service pre-checks it, and a Prisma `P2002` race is mapped to `INCOME_CATEGORY_ALREADY_EXISTS` (409, `NV409`) in the repository.
- Archived categories still reserve their name, because the unique index includes archived rows.
- A user cannot create a category with the same name as a system category (for example "Salary").
- The maximum name length comes from `income.categoryNameMaxLength` in `config/default.json`. Do not hard-code it.
- Transactions routes use `JwtAuthGuard` and `PermissionsGuard`. Permissions are `transactions:create`, `transactions:read`, and `transactions:update` (reversal). CUSTOMER receives all three.

## Paginated Responses

Every list endpoint returns the same `data` shape, and Swagger documents it the same way:

```json
{
  "success": true,
  "data": {
    "items": [],
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 0,
      "totalPages": 0,
      "hasNextPage": false,
      "hasPreviousPage": false
    }
  }
}
```

- Use `PaginatedResponse<T>` and `PaginationMetaDto` from `src/common/pagination/`. Do not define a new list shape per module.
- Accounts, transactions, and income categories already follow this shape.

## Transaction Scope

The initial Transactions module supports:

```text
Transactions

├── Transaction creation                ✅
├── Transaction retrieval               ✅
├── Transaction listing                 ✅
├── Pagination                          ✅
├── Deterministic ordering              ✅
├── Ownership isolation                 ✅
├── Transaction validation              ✅
├── Currency validation                 ✅
├── Account currency consistency        ✅
├── Account status validation           ✅
├── Transaction date validation         ✅
├── Description validation              ✅
├── Immutable transaction model         ✅
├── Reversal workflow                   ✅
├── Reversal ownership protection       ✅
├── Duplicate reversal protection       ✅
├── Reversal-of-reversal protection     ✅
├── Authentication                     ✅
├── Swagger documentation               ✅
├── Service tests                       ✅
├── Controller tests                    ✅
├── E2E tests                           ✅
└── Green validation                    ✅
```

## Transaction Types

```text
INCOME
EXPENSE
```

The transaction amount is always represented as a positive monetary value.

The transaction type determines its financial direction.

```text
INCOME
    → increases account balance

EXPENSE
    → decreases account balance
```

Negative transaction amounts are not used.

## Transaction Ownership

A Transaction belongs to exactly one Account.

An Account belongs to exactly one User.

Therefore:

```text
Transaction
    ↓
Account
    ↓
User
```

The Transaction table does **not** duplicate `userId`.

Ownership is enforced through the Account relationship.

Repository methods use user-aware queries such as:

```text
findByIdForUser(transactionId, userId)
```

and:

```text
findAllByAccountForUser(...)
```

Cross-user access behaves as not-found where appropriate.

## Transaction Dates

Two different timestamps are maintained:

```text
transactionDate
    ↓
When the financial event occurred

createdAt
    ↓
When the record was created
```

Financial reporting and historical calculations must use `transactionDate`, not `createdAt`.

## Transaction Immutability

Transactions are treated as immutable financial records.

There is no initial physical-delete workflow.

Corrections use reversal transactions.

---

# 42. Transaction Reversal Model

A transaction can be reversed by creating a new transaction.

Example:

```text
Original:

EXPENSE
RM 200
```

Reversal:

```text
INCOME
RM 200
reversalOfTransactionId = original.id
```

Therefore:

```text
Original Expense       -RM 200
Reversal Income        +RM 200
                       --------
Net financial effect       RM 0
```

The reversal itself is an ordinary transaction and therefore naturally participates in future balance/reporting calculations.

## Reversal Rules

```text
Original transaction
        ↓
Can be reversed once
        ↓
Reversal transaction
```

A reversal cannot itself be reversed.

A transaction cannot have multiple reversal transactions.

The database enforces the one-reversal relationship using:

```prisma
@@unique([reversalOfTransactionId])
```

This database constraint provides the final concurrency-level protection against duplicate reversals.

The application also performs a pre-check to provide a clean business response during normal sequential requests.

## Reversal API

```text
POST /api/v1/transactions/:id/reversal
```

The client supplies only:

```text
transactionDate
description
```

The service derives:

```text
accountId
type
amount
currency
reversalOfTransactionId
```

from the original transaction.

---

# 43. Transaction Database Model

Current transaction schema conceptually:

```text
Transaction

id
accountId
type
amount
currency
description
transactionDate
reversalOfTransactionId
createdAt
updatedAt
```

Relevant database constraints/indexes include:

```text
Primary key:
id

Index:
accountId

Index:
accountId + transactionDate

Unique:
reversalOfTransactionId
```

Transaction monetary amounts use:

```text
Decimal(19,4)
```

The application/domain representation remains a string.

The Prisma repository converts Decimal values into fixed four-decimal string representations.

---

# 44. Transaction Validation

Current transaction validation rules include:

```text
Transaction type
    → INCOME | EXPENSE

Currency
    → exactly 3 uppercase ISO-style letters

Amount
    → positive
    → 1–15 integer digits
    → optional 1–4 decimal digits

Description
    → nullable
    → maximum 255 characters

Transaction date
    → valid date

Account
    → must exist
    → must belong to authenticated user
    → currency must match
    → must satisfy account status rules
```

The validation helpers remain in the existing transaction validation file.

Do not create a new `domain/utils` directory merely for transaction validation helpers.

---

# 45. Transaction API

Current APIs:

```text
POST /api/v1/transactions

GET /api/v1/transactions

GET /api/v1/transactions/:id

POST /api/v1/transactions/:id/reversal
```

Transaction listing uses page-based HTTP pagination.

Current request semantics:

```text
page
limit
accountId
```

The repository internally uses:

```text
offset
limit
```

This is an intentional separation between API pagination semantics and database pagination mechanics.

Current deterministic transaction ordering:

```text
transactionDate DESC
createdAt DESC
```

The transaction list response includes pagination metadata:

```text
page
limit
total
totalPages
hasNextPage
hasPreviousPage
```

---

# 46. Transaction Testing Status

The Transactions module has completed its required current testing scope.

```text
Transaction domain                    ✅
Transaction validation                ✅
Transaction service tests             ✅
Transaction controller tests          ✅
Transaction repository implementation ✅
Transaction E2E tests                 ✅
Ownership isolation                   ✅
Authentication                        ✅
Pagination                            ✅
Ordering                              ✅
Reversal workflow                     ✅
Reversal E2E coverage                 ✅
Database migration                    ✅
Build                                 ✅
Lint                                  ✅
Full project check                    ✅
```

The transaction E2E test database migration was required because the new:

```text
reversal_of_transaction_id
```

column must exist in the test database as well as the development database.

The existing migration was applied to the test database; a duplicate migration was not created.

---

# 47. Account Balance — Next Financial Capability

The next financial capability is **Account Balance**.

Transactions are complete and should not be reopened merely because balance calculation will consume transaction data.

The next milestone begins from the completed state:

```text
Accounts
    ↓
Transactions
    ↓
Account Balance
```

## Balance Definition

For a single account:

```text
Current Balance
=
Opening Balance
+
SUM(INCOME)
-
SUM(EXPENSE)
```

Reversals require no special balance formula because they are ordinary transactions.

Example:

```text
Opening balance              RM 1,000.00

Salary — INCOME              +RM 5,000.00
Lunch — EXPENSE              -RM    50.00
Shopping — EXPENSE           -RM   200.00
Shopping reversal — INCOME   +RM   200.00

Current balance              RM 5,950.00
```

## Balance Source of Truth

The initial implementation should **not** add a mutable `currentBalance` column to `Account`.

The authoritative information remains:

```text
openingBalance
+
immutable transaction history
```

The balance is derived from those records.

This avoids maintaining two competing financial sources of truth.

## Currency

An Account has one currency.

Transactions belonging to the Account must use the same currency.

Therefore an individual account balance does not require FX conversion.

Multi-currency aggregation is a separate future concern.

## Archived Accounts

Archived accounts retain their financial history and balance.

Archiving means:

```text
No new supported activity
```

It does not mean:

```text
Financial history disappears
```

Therefore an archived account can still have its balance calculated/retrieved.

---

# 48. Account Balance Architecture

The initial balance capability should follow:

```text
HTTP
 │
 ▼
AccountsController
 │
 ▼
AccountsService
 │
 ▼
AccountRepository
 │
 ▼
PrismaAccountRepository
 │
 ▼
PostgreSQL aggregate
 │
 ▼
Decimal result
 │
 ▼
API response string
```

The controller should not:

- load all transactions
- perform financial aggregation
- perform database queries directly
- implement ownership logic

The database should perform the aggregate calculation rather than loading an entire transaction history into Node.js.

This is important for production scalability.

The exact repository abstraction should be inspected before introducing another abstraction.

Do not create a second account repository pattern if the existing `AccountRepository` can naturally support the use case.

---

# 49. Account Balance API — Planned

The planned initial endpoint is:

```text
GET /api/v1/accounts/:id/balance
```

Conceptual response:

```json
{
  "success": true,
  "data": {
    "accountId": "...",
    "currency": "MYR",
    "balance": "5750.0000"
  },
  "meta": {}
}
```

The final response precision/format must follow the existing financial representation conventions and implementation after the repository calculation is established.

The balance must remain a string at the API boundary.

Ownership must be enforced:

```text
Authenticated User
        ↓
Account ID
        ↓
Account belongs to user?
        ↓
Yes → balance
No  → not found
```

---

# 50. Account Balance Implementation Sequence

The Account Balance milestone should proceed in this order:

```text
Account Balance

├── 1. Domain/business rules                ✅
├── 2. Existing repository review           ✅
├── 3. Repository balance abstraction       ✅
├── 4. Prisma aggregate implementation      ✅
├── 5. Application service                  ✅
├── 6. Response DTO                         ✅
├── 7. Controller endpoint                  ✅
├── 8. Unit tests                           ✅
├── 9. Integration tests                    ✅
├── 10. E2E tests                           ✅
├── 11. Ownership tests                     ✅
├── 12. Decimal/reversal tests              ✅
├── 13. Archived-account tests              ✅
├── 14. Full validation                     ✅
└── 15. Focused Git checkpoint              ✅
```

Do not implement balance logic before confirming the existing Accounts repository/service structure.

---

# 51. Financial Development Roadmap

The current financial roadmap is:

```text
Financial Domain

├── Foundation                         ✅
│
├── Accounts                           ✅ COMPLETE
│
├── Transactions                       ✅ COMPLETE
│
├── Account Balance                    ✅ COMPLETE
│
├── Income                             ✅ COMPLETE
│
├── Expenses                           ✅ COMPLETE
│
├── Transaction History Filters        ✅ COMPLETE
│
├── Data Exports (CSV / PDF)           ✅ COMPLETE
│
├── Auth Session (Logout)              ✅ COMPLETE
│
├── Transfers                          ⏳
│
├── Budgets                            ⏳
│
├── Financial Goals                    ⏳
│
├── Loans and EMIs                     ⏳
│
├── Investments                        ⏳
│
├── Deposits (FD / RD)                 ⏳
│
├── Reporting (Monthly / Yearly / Historical)  ⏳
│
├── Net Worth and Dashboard            ⏳
│
├── Forecasting and Planning           ⏳
│
└── Super Admin and System             ⏳
```

Account type extension (R2) and income system categories (R3) are small follow-up items to the completed Accounts and Income modules. They are scheduled alongside Expenses.

Savings is a separate module (Open Decision 7). Users attach accounts to it and see its transactions and progress. It has no implementation status yet.

The ordering follows dependencies: Expenses feeds Budgets and Reports, history filters feed Reports, EMI payments depend on Loans, and Forecasting depends on Income, Expenses, and Loans. The ordering may still evolve, but completed milestones should not be reopened without a concrete reason.

---

# 52. Completed Milestones

Current completed milestones:

```text
NAVRO Backend Foundation
        ↓
        ✅ COMPLETE

Users / RBAC Foundation
        ↓
        ✅ COMPLETE

Authentication & Authorization
        ↓
        ✅ COMPLETE

Authentication Hardening
        ↓
        ✅ COMPLETE

Financial Domain Foundation
        ↓
        ✅ COMPLETE

Accounts Module
        ↓
        ✅ COMPLETE

Transactions Module
        ↓
        ✅ COMPLETE
```

---

# 53. Current Project Status

```text
NAVRO BACKEND

────────────────────────────────────────

Core Foundation                    ✅ COMPLETE

Users                              ✅ COMPLETE

Authentication                     ✅ COMPLETE

Authorization                      ✅ COMPLETE

Authentication Hardening           ✅ COMPLETE

Financial Domain Foundation        ✅ COMPLETE

Accounts                           ✅ COMPLETE

Transactions                       ✅ COMPLETE

Account Balance                    ✅ COMPLETE

Income                             ✅ COMPLETE

Expenses                           ✅ COMPLETE

Transaction History Filters        ✅ COMPLETE

Data Exports (CSV / PDF)           ✅ COMPLETE

Transfers                          ⏳

Budgets                            ⏳

Financial Goals                    ⏳

Loans and EMIs                     ⏳

Investments                        ⏳

Deposits (FD / RD)                 ⏳

Reporting                          ⏳

Net Worth and Dashboard            ⏳

Forecasting and Planning           ⏳

Super Admin and System             ⏳

────────────────────────────────────────

CURRENT MILESTONE

└── Transfers                      ⏳ IN PROGRESS

CURRENT PHASE

└── Financial Modules

CURRENT TOPIC

└── Transfers chunk 2 (service and API) — red specs first  ⏳ NEXT
```

---

# 54. Current Engineering Checkpoint

The latest completed checkpoint is:

```text
Income Module (commit e7aa8e4)

├── Implementation                   ✅
├── Validation                       ✅
├── Per-user unique categories       ✅
├── Pagination shape                 ✅
├── Config-driven limits             ✅
├── Unit tests                       ✅
├── Controller tests                 ✅
├── E2E tests                        ✅
├── Build                            ✅
├── Lint                             ✅
└── Git commit                       ✅

Related fix (commit 503d64d):        Health, RBAC, and lint fixes
```

This is a **green checkpoint**.

Do not modify the completed Transactions implementation unless:

- a real defect is discovered,
- a security issue is discovered,
- a failing integration requirement requires it,
- or the user explicitly requests a change.

Potential future hardening improvements should not automatically interrupt the roadmap.

---

# 55. Known Transaction Hardening Review Items

The current transaction implementation is complete for the current milestone.

There are potential future hardening areas, including infrastructure-level handling of database constraint violations.

For example, the database protects:

```prisma
@@unique([reversalOfTransactionId])
```

against concurrent duplicate reversals.

The application currently performs an application-level duplicate reversal check before creation.

A future infrastructure refinement may map a Prisma unique-constraint violation for `reversalOfTransactionId` to the existing:

```text
TRANSACTION_ALREADY_REVERSED
```

business exception.

However:

**Do not implement this merely because it is theoretically possible.**

It is a hardening item and should only be introduced when we deliberately enter the relevant hardening step.

The application service must remain independent from Prisma.

---

# 56. Continuation Rule

When continuing NAVRO development:

1. Treat the actual source tree as the latest implementation state.
2. Treat this document as the persistent engineering context.
3. Do not restart completed milestones.
4. Do not redesign completed architecture without a concrete reason.
5. Do not introduce duplicate abstractions.
6. Check existing code before adding new code or tests.
7. Every implementation change must have corresponding tests.
8. Preserve the modular-monolith architecture.
9. Preserve domain/application/infrastructure separation.
10. Keep Prisma inside infrastructure.
11. Enforce user ownership at repository boundaries.
12. Do not use JavaScript `number` as authoritative financial money.
13. Do not physically delete financial history without an explicit architectural decision.
14. Follow the requirement → domain → application → infrastructure → API → tests → documentation → validation → commit workflow.
15. Complete one milestone and establish a green checkpoint before moving to the next.
16. Do not assume a feature is production-ready merely because its happy path works.
17. Record architectural improvements as review items when they are not required immediately.
18. Keep implementation, tests, architecture, and documentation synchronized.
19. Do not reopen completed Accounts or Transactions work without a concrete reason.
20. Do not introduce new architecture simply to make two existing modules look identical unless the inconsistency creates a real engineering problem.
21. When multiple valid implementation patterns already exist, prefer consistency for new work rather than retroactively rewriting completed modules.
22. If a proposed improvement is not required for the current milestone, record it as a future review item and continue the roadmap.
23. Always distinguish between **functional completion** and **future hardening opportunities**.

---

# 57. Next Topic and Design Record

## Transfers — Domain Design (in progress)

A transfer moves money between two of the user's own accounts. It is stored as two linked transaction rows, one per account, and the two rows are never edited (BR-TXN-02, BR-TXN-08).

**Approved decisions** (BRD decisions 22 and 23, Open Decisions 17 and 18)

- The source leg has type `TRANSFER_OUT`. The destination leg has type `TRANSFER_IN`. Both share a `transfer_group_id` (UUID).
- Each leg is recorded in its own account's currency. The client sends `amount` in the source account's currency, so no currency field is needed. Source and destination must differ.
- Cross-currency: the destination amount is `amount × rate`, where the rate comes from `ExchangeRateService.getRate` for the transfer date (same fallback chain as decision 17). The rate, rounded to 8 decimal places, and its `rate_source` are stored on both legs.
- Each leg also gets its normal base-currency conversion (`base_amount`, `exchange_rate`, `rate_date`, `rate_source`). Income and expense reports filter by `INCOME` and `EXPENSE` only, so transfers never count as income or spending.
- Balance: `TRANSFER_IN` adds to the account balance and `TRANSFER_OUT` subtracts from it (BR-BAL-01).
- Reversal: reversing either leg reverses the whole pair in one database transaction. Each leg gets its own reversal row. Reversal types map `TRANSFER_OUT` ↔ `TRANSFER_IN`. The two reversal rows share a new `transfer_group_id`, because the unique index on `(transfer_group_id, type)` forbids reusing the original group. The CHECK constraint requires a group ID on every transfer-type row, so the reversal pair always has one.
- Chunk 1 (model, migration `20261105090000_add_transfers`, balance, and the create and reverse guards) is complete and green. Chunk 2 covers `TransfersService`, `POST /transfers`, pair reversal, and e2e tests.
- The generic `POST /transactions` rejects `TRANSFER_IN` and `TRANSFER_OUT`. Transfers are created only through `POST /transfers`.
- Database CHECK: `transfer_group_id` is set only on transfer types, and it is NULL on income and expense rows.

## Expenses — Domain Design (complete)

Expenses mirror Income (section 39 onward) and reuse its patterns. The decisions below were answered for this design. Implementation follows this design.

**Approved decisions**

- Expense categories follow the income model: per-user unique names (normalized), archived names stay reserved, system defaults from R4 are provided.
- Loan EMI is a system category. Users do not create it. (BRD decision 15 covers the category list; this decision covers its owner.)
- `expenseCategoryId` is set only on EXPENSE transactions. `incomeCategoryId` is set only on INCOME transactions. A database CHECK constraint enforces this.
- Transaction currency must equal its account currency (Option A). Accounts already store a currency (BR-ACC-02). Conversion is used only for base-currency reporting, net worth, and the dashboard.
- Exchange rate fallback, so transactions are never rejected because a third party is unavailable:
  1. Frankfurter rate for the transaction date. On weekends and holidays Frankfurter returns the last published rate, and `rate_date` stores the date it returns.
  2. If Frankfurter is unavailable: the most recent rate already stored on or before the transaction date for the same currency.
  3. If no stored rate exists on or before that date: the most recent stored rate for the same currency, whatever its date (the last given rate).
  4. If nothing is stored at all: a manual rate per currency in `config/default.json` (operator-maintained). If that is also missing, the request returns `EXCHANGE_RATE_UNAVAILABLE` (503).
- `rate_source` is stored on each transaction (`PROVIDER`, `FALLBACK`, `MANUAL`, `IDENTITY`). Reports can flag approximate values.
- Frankfurter supports INR, MYR, and AUD (verified against `/v1/currencies`).
- `transaction_date` is a calendar date with no time. This follows the approved time-zone decision.

**Confirmed items**

- Shared system categories use `user_id` NULL, one row each. A partial unique index on `normalized_name WHERE user_id IS NULL` prevents duplicates. The same index fixes `nv_income_categories`.
- Users can archive system categories for themselves. Because the rows are shared, each user's archive state is stored in a per-user table (`nv_user_category_archives`, with `user_id`, `category_id`, `archived_at`). Archiving hides the category from new transactions and keeps its name reserved.
- New `nv_transactions` columns: `expense_category_id`, `base_amount` (DECIMAL 19,4, base currency INR), `exchange_rate` (DECIMAL 19,8), `rate_date` (DATE), `rate_source` (enum). Base-currency rows use rate 1 and source `IDENTITY`.
- `transaction_date` changes from timestamp to DATE. This is development data only, so the migration can convert it directly.
- Proposed error codes, all under the `NV` prefix: `EXPENSE_CATEGORY_NOT_FOUND`, `CATEGORY_TYPE_MISMATCH`, `CURRENCY_MISMATCH`.

**Reporting and filters**

- Expense by category groups on `transaction_date` (month or year) and sums `base_amount`.
- The transaction list (R5) filters by `type`, `expenseCategoryId` or `incomeCategoryId`, `accountId`, `from`, and `to`. It uses the standard paginated envelope.

**Status**

Implemented. Expense categories (system and custom) and the transaction link are complete. Expense category export is complete (see the Data Exports rules below).

**Current position:**

```text
Accounts Module
      ↓
      ✅ COMPLETE

Transactions Module
      ↓
      ✅ COMPLETE

Income Module
      ↓
      ✅ COMPLETE

Expenses Module
      ↓
      ✅ COMPLETE

Data Exports (CSV / PDF)
      ↓
      ✅ COMPLETE
```

# 58. Data Export Rules

Every list endpoint can be exported as CSV or PDF. This covers accounts, transactions, income categories, and expense categories. Future list modules must follow the same pattern.

**Routes**

- `GET /api/v1/<resource>/export?format=csv|pdf`. Declare it before any `GET /:id` route, or Nest matches `export` as an id.
- Permission: the same `read` permission as the list route (for example `income:read`, `expense:read`, `accounts:read`, `transactions:read`).
- Filters on the list also apply to the export (for example the transaction date range).
- Response: `text/csv` or `application/pdf`, with `Content-Disposition: attachment; filename="<fileNamePrefix>-<resource>-<UTC date>.<ext>"`.

**Behavior**

- Rows are fetched with `maxRows + 1`. If more rows exist than `export.maxRows`, the request returns `EXPORT_LIMIT_EXCEEDED` (422, `NV422`). Exports are never truncated silently.
- Archived categories are excluded, matching the list endpoint.
- Exports are generated on request and never stored.
- The accounts export has a `Current Balance` column after `Opening Balance`. It is the opening balance plus income minus expense, in the account's own currency. No FX conversion is applied. It is computed with one account read and one grouped transaction read (`getBalancesForAccounts`), never one query per account.
- CSV cells starting with `=`, `+`, `-`, or `@` are neutralized when `export.csv.neutralizeFormulas` is `true`.

**Structure**

- Shared code lives in `src/common/export/`: `export-table`, `csv-writer`, `pdf-writer`, `export-renderer`, `export-file-name`, `export-limit`, and `dto/export-query.dto`. Do not duplicate it per module.
- Each module adds a mapper in `presentation/mappers/<name>-export.mapper.ts` that turns records into an `ExportTable`. The mapper owns the column headers.
- The service exposes `findAllForExport(userId, ...)`, which applies the limit check. The controller calls `renderExport` and returns a `StreamableFile`.
- Headers are static constants in each mapper. Changing a column is a breaking change for users who import the file.

**Configuration**

- All export settings live in the `export` section of `config/default.json` (see [CONFIGURATION.md](./docs/CONFIGURATION.md#export)). Do not hard-code page size, font, delimiter, or limits in code.

**Known limits (recorded decisions)**

- Account exports do not include a live balance.
- PDFs use Helvetica, which cannot render non-Latin text. Set `export.pdf.fontPath` to a Unicode `.ttf` to change this.
- PDFs are portrait. Wide tables may wrap.

**Testing**

- Each mapper, service method, and controller route has a unit spec. Each module has an e2e block that checks CSV and PDF content, the file name, permission, and the 422 behavior where practical.
- The 422 path has unit coverage only. An e2e test would need a config override.
