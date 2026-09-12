# WealthWise Backend — AI Engineering Instructions

## 1. Purpose

This document is the persistent engineering context for the **WealthWise Backend** project.

When an AI assistant receives this document, it must use the information in this file as the primary project context and continue development consistently with the existing architecture, coding style, conventions, project scope, engineering principles, and current implementation state.

The AI must **not unnecessarily redesign, restructure, rename, or replace existing architecture** unless explicitly requested.

If the requested change conflicts with this document, identify the conflict before making the change.

The **actual source tree and current implementation are the latest source of truth** when they differ from older documentation.

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
- Role/permission-based authorization

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

The backend follows a:

**Modular Monolith + Layered/Clean Architecture**

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
- Repository abstractions
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
- Security implementations

Infrastructure implements interfaces defined by the domain/application layers where appropriate.

---

# 5. Current Backend Structure

The current source structure is:

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

NestJS dependency injection binds the abstraction to the implementation.

Do not inject Prisma directly into application/domain services when a repository abstraction already exists.

The current `UserRepository` supports:

- `create`
- `findByEmail`
- `findById`
- `findPermissionsByUserId`

This allows authentication and authorization logic to remain independent from Prisma.

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
src/modules/users/infrastructure/repositories/
```

Current implementation:

```text
PrismaService
      ↓
PrismaUserRepository
      ↓
UserRepository abstraction
```

---

# 11. Testing Strategy

The project uses three testing levels.

## Unit Tests

Test individual business/application components in isolation.

Examples:

```text
*.service.spec.ts
```

Unit tests should mock dependencies.

They should not require a real database.

Current authorization unit coverage includes:

- No permissions required
- Required permission exists
- Missing permission
- Wildcard permission
- Missing authenticated identity
- Multiple required permissions
- All required permissions
- Wildcard with multiple required permissions
- Permission metadata lookup

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

├── users.e2e-spec.ts
├── auth.e2e-spec.ts
└── authorization.e2e-spec.ts
```

Authentication E2E coverage includes:

- Successful login
- Unknown email
- Invalid password
- Invalid email
- Invalid password length
- Unexpected fields
- Missing JWT
- Invalid JWT
- Valid JWT
- JWT payload verification

Authorization E2E coverage includes:

- Super admin can perform protected operation
- Normal user is authenticated but forbidden
- User without roles cannot create users
- Valid JWT alone does not grant permissions
- Permission-based access is enforced through the HTTP layer

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

The preferred validation sequence when making substantial backend changes is:

```bash
npm run db:validate
npm run build
npm run lint:check
npm test
npm run test:integration
npm run test:e2e -- --runInBand
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
CreateUserDto
      ↓
UsersController
      ↓
CreateUserInput
      ↓
UsersService
```

---

# 17. Domain Entity Rules

Domain entities belong under:

```text
domain/entities/
```

They should represent business concepts rather than database records.

The current `User` entity contains:

- id
- email
- passwordHash
- firstName
- lastName
- createdAt
- updatedAt

The domain entity is independent from Prisma.

The `passwordHash` exists because authentication requires access to the credential representation internally, but it must never cross the public API boundary.

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

Current authentication behavior distinguishes:

```text
401 Unauthorized
```

from:

```text
403 Forbidden
```

Authentication failures use `401`.

Authorization failures use `403`.

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

The JWT currently contains:

```typescript
{
  sub: user.id,
  email: user.email,
}
```

The password or password hash must never be included in the JWT.

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
11. Brute-force protection must eventually be implemented for authentication endpoints.
12. Password reset/change flows require dedicated security design.

Current login DTO validates:

```text
email → valid email format
password → string + minimum length
```

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
users:create
users:read
users:update
users:delete
```

Controllers declare required permissions:

```typescript
@Permissions('users:create')
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
users:create
       ↓
Allowed
```

### Required permission missing

```text
users:create
       ↓
User only has users:read
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

```text
@Permissions(
  'users:create',
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

Health endpoint remains unversioned.

Example:

```text
/health
```

Current authentication endpoint:

```text
POST /api/v1/auth/login
```

Current user endpoint:

```text
GET /api/v1/users/me
```

Current protected user creation endpoint:

```text
POST /api/v1/users
```

---

# 26. Configuration

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

JWT configuration includes:

```text
JWT_SECRET
JWT_EXPIRES_IN
```

Secrets must come from environment/secret management and must not be committed to source control.

---

# 27. Logging

The project uses:

```text
nestjs-pino
```

and Pino logging.

Do not use random `console.log` statements in production application code.

Use the configured application logger.

Never log:

- Passwords
- Password hashes
- JWT secrets
- Access tokens
- Refresh tokens
- Sensitive financial information

Authentication and authorization failures should eventually provide useful operational information without exposing credentials or sensitive data.

---

# 28. API Documentation

Swagger/OpenAPI is part of the backend.

When adding public APIs, consider:

- Request DTO documentation
- Response documentation
- Authentication requirements
- API versioning
- Error responses
- Authorization requirements

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

Never log:

- Passwords
- Password hashes
- JWT secrets
- Access tokens
- Refresh tokens
- Sensitive financial information

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

When the admin user already exists, the seed must synchronize the password hash as well as the account metadata.

Current seed behavior:

```text
SEED_ADMIN_PASSWORD
        ↓
bcrypt.hash()
        ↓
passwordHash
        ↓
User upsert
        ↓
existing user → passwordHash updated
new user      → passwordHash created
```

This prevents stale test/development credentials when the environment password changes.

The admin role assignment is also idempotent through the `UserRole` upsert.

---

# 31. Current Testing Status

The authentication and authorization implementation has passed the current regression tests.

Current status:

```text
User E2E                         ✅
Authentication E2E               ✅
Authorization E2E                ✅
PermissionsGuard unit tests      ✅
User service tests               ✅
Password hasher tests            ✅
Repository integration tests     ✅
Build                            ✅
Lint                             ✅
```

The authorization E2E suite validates the important distinction:

```text
No/invalid authentication
        ↓
401 Unauthorized
```

versus:

```text
Valid authentication
        ↓
Missing permission
        ↓
403 Forbidden
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

# 33. Known Architectural Review Item

There is one known implementation-level ownership issue that should be reviewed later.

`PermissionsGuard` belongs conceptually to the Auth module:

```text
modules/auth/infrastructure/guards/permissions.guard.ts
```

However, the current NestJS provider wiring requires it to be available through the Users module because it depends on `UserRepository`.

This currently works and is covered by tests.

**Do not perform a file move or module redesign merely to correct this.**

Treat it as a future architectural refinement when the Auth module is hardened.

Any future change must preserve:

- Auth module ownership
- User repository abstraction
- Existing authorization behavior
- Existing E2E tests

---

# 34. Current Development Philosophy

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

A green test is evidence of correctness for the tested behavior, not automatically proof of production readiness.

---

# 35. How AI Should Work on This Project

When asked to implement something:

## Step 1 — Understand

First determine:

- Which module owns the feature?
- Which architectural layer owns the change?
- What existing abstraction should be reused?
- What dependencies already exist?
- What tests should change?
- What security implications exist?

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

If a change appears architecturally necessary, explain it first.

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

Current authentication/authorization milestone was committed after all tests became green.

---

# 38. Current Project Progress

The backend has established:

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
- Application input separation
- Authentication module
- Login
- Password hashing
- JWT authentication
- JWT strategy
- JWT guard
- Permission guard
- Permission decorator
- Authenticated request abstraction
- Role/permission authorization
- Wildcard authorization
- Global exception handling
- API response utilities
- Health endpoint
- Pino logging
- Swagger configuration
- Unit testing
- Integration testing
- E2E testing
- Authentication E2E tests
- Authorization E2E tests
- Idempotent admin seed behavior
- Authentication/authorization architecture review

The backend currently follows a modular-monolith architecture.

---

# 39. Completed Authentication & Authorization Milestone

The following milestone is considered complete:

```text
Authentication & Authorization Foundation

├── User registration
├── Password hashing
├── Login
├── JWT generation
├── JWT validation
├── Protected endpoints
├── Current-user endpoint
│
├── Permissions decorator
├── PermissionsGuard
├── User → Role
├── Role → Permission
├── Permission checking
├── Multiple permissions
├── Wildcard permission
│
├── Authentication unit tests
├── Authorization unit tests
├── Repository integration tests
├── Authentication E2E tests
└── Authorization E2E tests
```

Status:

```text
✅ COMPLETE
```

---

# 40. Current Immediate Objective

The next objective is **Authentication Hardening**.

The implementation has established that authentication works.

The next phase is to make the authentication system appropriate for production conditions.

The planned sequence is:

```text
Authentication Hardening

9.1  Password & Credential Security Policy      ✅
9.2  JWT Security Review                        ⏳
9.3  Login Failure Handling                     ⏳
9.4  Brute-Force Protection Strategy            ⏳
9.5  Refresh Token Decision                     ⏳
9.6  Token Revocation / Logout Strategy         ⏳
9.7  Account Status Enforcement                 ⏳
9.8  Sensitive Data / Logging Review             ⏳
9.9  Security-Focused Tests                     ⏳
9.10 Production Authentication Checklist        ⏳
```

---

# 41. Step 9.1 — Password & Credential Security Policy

Step 9.1 has been reviewed.

Current decisions:

```text
Plaintext passwords                 ❌ Never store
Password hashing                    ✅ PasswordHasherService
Current algorithm                   ✅ bcrypt
Current cost factor                 ✅ 12
Password in API response            ❌ Never expose
Password hash in API response       ❌ Never expose
Password in JWT                     ❌ Never include
Password hash in JWT                ❌ Never include
Password in logs                    ❌ Never log
Password hash in logs               ❌ Never log
Password reset                      ⏳ Future dedicated flow
Password change                     ⏳ Future dedicated flow
Brute-force protection              ⏳ Future hardening
```

No unnecessary code change was introduced during this review.

---

# 42. Next Topic

The next engineering topic is:

## Step 9.2 — JWT Security Review

The review will cover:

```text
JWT_SECRET
     ↓
Token signing
     ↓
JWT claims
     ↓
Algorithm configuration
     ↓
Token expiration
     ↓
Token validation
     ↓
Token storage
     ↓
Token theft
     ↓
Refresh token strategy
     ↓
Logout / revocation
```

The goal is to determine which JWT security controls WealthWise actually needs and which would be unnecessary complexity.

Do not implement refresh tokens, token revocation, or other JWT changes until the architectural/security decision has been made.

---

# 43. Requirement → Implementation Workflow

Every future WealthWise feature should follow:

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
    ↓
Validation
    ↓
Focused Git Commit
```

The AI should preserve this sequence wherever practical.

---

# 44. AI Continuation Rule

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
11. Do not skip completed milestones.
12. Do not assume a feature is production-ready merely because its happy-path tests pass.
13. Before introducing a new abstraction, check whether an existing abstraction already solves the problem.
14. When an architectural improvement is identified but not required immediately, record it as a review item instead of performing an unnecessary refactor.
15. Keep implementation, tests, architecture, and documentation synchronized.

---

# 45. Important Instruction

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
- What trade-offs exist
- How it should be tested
- What production risks remain

Keep explanations practical and connected to the actual WealthWise codebase.

---

# 46. Current Learning Position

The user is learning WealthWise development as both:

1. A real production-quality backend implementation
2. A software engineering/Tech Lead learning exercise

Therefore, important implementation decisions should be explained from both perspectives:

```text
Implementation
     +
Architecture
     +
Security
     +
Testing
     +
Operational concerns
     +
Engineering reasoning
```

The assistant should teach the reasoning behind decisions rather than only provide code.

---

# 47. Current Status Summary

```text
WEALTHWISE BACKEND
────────────────────────────────────────

Foundation
├── NestJS application                    ✅
├── Configuration                         ✅
├── Environment validation                ✅
├── PostgreSQL                            ✅
├── Prisma                                ✅
├── Logging                               ✅
├── Swagger                               ✅
├── Global exception handling             ✅
├── API response utilities                ✅
└── Health endpoint                       ✅

Users
├── User domain entity                    ✅
├── Repository abstraction                ✅
├── Prisma repository                     ✅
├── Application service                   ✅
├── DTOs                                  ✅
├── Application inputs                    ✅
├── Controller                            ✅
└── Tests                                 ✅

Authentication
├── Password hashing                      ✅
├── Login                                 ✅
├── JWT generation                        ✅
├── JWT strategy                          ✅
├── JWT guard                             ✅
├── /users/me                             ✅
├── Authentication E2E                    ✅
└── Authentication architecture review   ✅

Authorization
├── Permission model                      ✅
├── Permissions decorator                 ✅
├── PermissionsGuard                      ✅
├── Multiple permissions                  ✅
├── Wildcard permission                   ✅
├── 401 / 403 semantics                   ✅
├── Unit tests                            ✅
├── E2E tests                             ✅
└── Architecture review                   ✅

Database / Seed
├── Test database                         ✅
├── Test migrations                       ✅
├── Admin seed                            ✅
├── Idempotent role assignment            ✅
└── Idempotent password synchronization  ✅

Current Milestone
└── Authentication & Authorization       ✅ COMPLETE

Current Phase
└── Authentication Hardening             🔄 IN PROGRESS

Current Topic
└── 9.2 JWT Security Review               ⏳ NEXT
```
