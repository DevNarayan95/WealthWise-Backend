# WealthWise Backend — AI Engineering Instructions

## 1. Purpose

This document is the persistent engineering context for the **WealthWise Backend** project.

When an AI assistant receives this document, it must use the information in this file as the primary project context and continue development consistently with the existing architecture, coding style, conventions, project scope, and engineering principles.

The AI must **not unnecessarily redesign, restructure, rename, or replace existing architecture** unless explicitly requested.

If the requested change conflicts with this document, identify the conflict before making the change.

---

# 2. Project

## Project Name

WealthWise

## Component

Backend API

## Purpose

WealthWise is a personal finance management platform.

The platform is intended to help users manage:

- Income
- Expenses
- Monthly budgets
- Savings
- Financial goals
- Fixed deposits
- Recurring deposits
- Mutual funds
- Stocks
- Bonds
- Investments
- Multiple users
- Authentication and authorization
- Role-based access control
- Permission-based access control

The backend must be designed as a **production-ready modular monolith**.

The architecture should allow future extraction of modules into microservices if the system grows.

---

# 3. Technology Stack

## Backend

- Node.js
- NestJS
- TypeScript

## Database

- PostgreSQL
- Prisma ORM

## Testing

- Jest
- Supertest
- Unit tests
- Integration tests
- E2E tests

## Security

- JWT
- Passport
- bcrypt / argon2 where appropriate
- Helmet
- Validation
- Role/permission based authorization

## API Documentation

- Swagger / OpenAPI

## Logging

- Pino
- nestjs-pino

## Configuration

- `@nestjs/config`
- Joi environment validation

---

# 4. Architectural Style

The backend follows a **modular monolith + layered/clean architecture approach**.

Each business module should have clear separation between:

```text
presentation
application
domain
infrastructure
```

The responsibilities are:

## Presentation

Responsible for HTTP/API concerns.

Examples:

- Controllers
- DTOs
- HTTP-specific exceptions
- Response mappers

Presentation should not contain business logic.

---

## Application

Responsible for application use cases and orchestration.

Examples:

- Application services
- Use-case-oriented services
- Application inputs

Application services coordinate domain objects and infrastructure abstractions.

They should not contain unnecessary HTTP-specific concerns.

---

## Domain

Contains business concepts and abstractions.

Examples:

- Entities
- Repository interfaces
- Domain rules

The domain layer should remain independent from:

- NestJS infrastructure
- Prisma
- HTTP
- PostgreSQL
- Controllers

---

## Infrastructure

Contains technical implementations.

Examples:

- Prisma repositories
- Authentication infrastructure
- Guards
- Strategies
- External integrations
- Database implementations

Infrastructure implements interfaces defined by the domain/application layers where appropriate.

---

# 5. Current Backend Structure

The current structure is:

```text
src/
├── app.module.ts
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
│   │
│   └── security/
│       ├── password-hasher.service.spec.ts
│       └── password-hasher.service.ts
│
├── modules/
│   ├── auth/
│   │   ├── application/
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
│   │   │       └── jwt.strategy.ts
│   │   ├── presentation/
│   │   │   ├── controllers/
│   │   │   │   └── auth.controller.ts
│   │   │   └── dto/
│   │   │       └── login.dto.ts
│   │   └── auth.module.ts
│   │
│   ├── health/
│   │   ├── health.controller.ts
│   │   └── health.module.ts
│   │
│   └── users/
│       ├── application/
│       │   ├── inputs/
│       │   │   └── create-user.input.ts
│       │   └── services/
│       │       ├── users.service.spec.ts
│       │       └── users.service.ts
│       ├── domain/
│       │   ├── entities/
│       │   │   └── user.entity.ts
│       │   └── repositories/
│       │       └── user.repository.ts
│       ├── infrastructure/
│       │   └── repositories/
│       │       └── prisma-user.repository.ts
│       ├── presentation/
│       │   ├── controllers/
│       │   │   └── users.controller.ts
│       │   ├── dto/
│       │   │   ├── create-user.dto.ts
│       │   │   └── user-response.dto.ts
│       │   ├── exceptions/
│       │   │   └── user-already-exists.exception.ts
│       │   └── mappers/
│       │       └── user-response.mapper.ts
│       └── users.module.ts
│
└── main.ts
```

This structure is the current source of truth.

---

# 6. Important Architectural Rule

Do NOT automatically move authentication-related components back into `common`.

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

Current structure:

```text
users/
├── application/
├── domain/
├── infrastructure/
├── presentation/
└── users.module.ts
```

---

## Auth Module

Owns:

- Login
- JWT authentication
- Authentication service
- JWT strategy
- JWT guard
- Permission guard
- Permission decorator
- Authenticated request abstraction

Current structure:

```text
auth/
├── application/
├── infrastructure/
├── presentation/
└── auth.module.ts
```

---

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
UserRepository
       ↑
PrismaUserRepository
```

The domain should not depend directly on Prisma.

---

# 9. Repository Pattern

Repositories are defined as abstractions in the domain:

```text
modules/users/domain/repositories/
```

Concrete implementations belong in:

```text
modules/users/infrastructure/repositories/
```

Example:

```text
UserRepository
      ↑
PrismaUserRepository
```

NestJS dependency injection should bind the abstraction to the implementation.

Do not inject Prisma directly into application/domain services when a repository abstraction already exists.

---

# 10. Prisma

Prisma is an infrastructure concern.

Do not allow Prisma types to leak unnecessarily into:

- Domain entities
- Application services
- Controllers
- DTOs

Prisma implementation belongs under:

```text
src/infrastructure/database/prisma/
```

Business-specific Prisma repositories belong under their respective module:

```text
src/modules/users/infrastructure/repositories/
```

---

# 11. Testing Strategy

The project uses three testing levels.

## Unit Tests

Test individual business components in isolation.

Examples:

```text
*.service.spec.ts
```

Unit tests should mock dependencies.

They should not require a real database.

---

## Integration Tests

Test infrastructure implementations against the test database.

Examples:

```text
test/integration/
```

Integration tests may use the real PostgreSQL test database.

The test database must be separate from development/production databases.

Current test database expectation:

```text
wealthwise_test_db
```

---

## E2E Tests

Test the application through HTTP.

Examples:

```text
test/e2e/
```

E2E tests should exercise the real NestJS application/module wiring.

They should validate:

- HTTP routing
- validation
- authentication
- authorization
- application services
- repositories
- database integration

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

Full validation:

```bash
npm run check
```

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

Seed database.

Test database:

```bash
npm run db:test:status
```

```bash
npm run db:test:migrate
```

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

Avoid:

- `any`
- unnecessary abstractions
- huge services
- business logic inside controllers
- Prisma queries inside controllers
- duplicated business rules
- global utility dumping grounds
- premature microservices

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

Example responsibility:

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

---

# 17. Domain Entity Rules

Domain entities belong under:

```text
domain/entities/
```

They should represent business concepts rather than database records.

Do not couple domain entities directly to Prisma.

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
users/presentation/exceptions/
```

Do not create module-specific exceptions in `common`.

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

Permissions should be represented using the existing permission decorator/guard mechanism.

Wildcard permission:

```text
*
```

means the user has all permissions.

Do not introduce a second authorization mechanism without an explicit architectural decision.

---

# 20. API Versioning

The API uses URI versioning.

Expected API format:

```text
/api/v1/...
```

Health endpoint remains unversioned.

Example:

```text
/health
```

---

# 21. Configuration

Environment-specific configuration must not be hardcoded into business logic.

Configuration belongs under:

```text
src/config/
```

Current configuration areas include:

- Authentication
- Database
- Logging
- Swagger
- General application configuration
- Environment validation

Use `ConfigService` where configuration is required.

---

# 22. Logging

The project uses:

```text
nestjs-pino
```

and Pino logging.

Do not use random `console.log` statements in production application code.

Use the configured application logger.

---

# 23. API Documentation

Swagger/OpenAPI is part of the backend.

When adding public APIs, consider:

- Request DTO documentation
- Response documentation
- Authentication requirements
- API versioning
- Error responses

---

# 24. Security Principles

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

Never log:

- Passwords
- Password hashes
- JWT secrets
- Access tokens
- Refresh tokens
- Sensitive financial information

---

# 25. Current Development Philosophy

WealthWise is being developed as a **real production-quality software engineering project**, not merely as a tutorial application.

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

---

# 26. How AI Should Work on This Project

When asked to implement something:

## Step 1 — Understand

First determine:

- Which module owns the feature?
- Which architectural layer owns the change?
- What existing abstraction should be reused?
- What dependencies already exist?
- What tests should change?

## Step 2 — Preserve Architecture

Reuse the existing architecture before introducing new abstractions.

Do not create duplicate patterns.

For example, if a repository abstraction already exists, use it.

Do not create another repository pattern beside it.

## Step 3 — Implement

Make the smallest clean change that satisfies the requirement.

## Step 4 — Test

Add/update the appropriate:

- Unit tests
- Integration tests
- E2E tests

## Step 5 — Validate

Prefer running:

```bash
npm run db:validate
npm run build
npm run lint:check
npm test
npm run test:integration
npm run test:e2e -- --runInBand
```

## Step 6 — Explain

When reporting the change, explain:

- What changed
- Why it changed
- Files affected
- Architectural impact
- Tests executed
- Any remaining risks

---

# 27. Do Not Make Unrequested Changes

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

If a change appears architecturally necessary, explain it first.

---

# 28. Git Rules

Use conventional commit messages.

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

---

# 29. Current Project Progress

The current backend has established:

- NestJS application
- Configuration management
- Environment validation
- PostgreSQL
- Prisma
- Database module
- Prisma module/service
- User module
- User domain entity
- User repository abstraction
- Prisma user repository
- User application service
- User controllers
- User DTOs
- Authentication module
- JWT authentication
- Permission guard
- Permission decorator
- Password hashing service
- Global exception handling
- API response utilities
- Health endpoint
- Pino logging
- Swagger configuration
- Unit testing
- Integration testing
- E2E testing

The backend currently follows a modular-monolith architecture.

---

# 30. Current Immediate Objective

Continue building WealthWise incrementally while maintaining the established architecture.

Do not jump directly into unrelated features.

Each feature should follow:

```text
Requirement
    ↓
Domain / Business Rules
    ↓
Application Use Case
    ↓
Infrastructure
    ↓
API / Presentation
    ↓
Tests
    ↓
Documentation
```

---

# 31. AI Continuation Rule

When this document is provided in a new AI conversation:

1. Read this document completely.
2. Treat it as the project's baseline architecture.
3. Do not ask the user to repeat information already contained here.
4. Ask only for information genuinely missing from this document.
5. If the user provides the current source tree, treat the source tree as the latest implementation state.
6. If the current source tree conflicts with this document, prefer the actual source tree and identify the difference.
7. Preserve existing coding style.
8. Preserve existing naming conventions.
9. Preserve existing architecture unless the user explicitly requests a change.
10. Continue from the current project state rather than restarting the project design.

---

# 32. Important Instruction

**WealthWise is a long-term engineering project.**

The goal is not simply to generate code.

The goal is to build the system using professional software engineering practices while allowing the developer to learn the reasoning behind each architectural decision.

Therefore, when introducing an important architectural concept, explain:

- What it is
- Why it exists
- What problem it solves
- Why WealthWise uses it
- Where it belongs
- What alternatives exist
- Why the chosen approach is appropriate

Keep explanations practical and connected to the actual WealthWise codebase.
