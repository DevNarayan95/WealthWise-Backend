# Error Codes

Every error response from the NAVRO API uses the same envelope. This page lists the codes and HTTP statuses the API returns, and how clients should read them.

## Response envelope

```json
{
  "success": false,
  "statusCode": "NV404",
  "error": {
    "code": "ACCOUNT_NOT_FOUND",
    "message": "Account not found"
  },
  "meta": {
    "requestId": "9f0c3c1e-6a53-4b8e-9d54-2b6f0a1d7e11"
  },
  "timestamp": "2026-10-16T09:41:56.000Z",
  "path": "/api/v1/accounts/abc"
}
```

| Field            | Meaning                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------ |
| `success`        | Always `false` for errors.                                                                                   |
| `statusCode`     | Branded status: `errors.statusCodePrefix` + `errors.statusCodeSeparator` + the HTTP status. Default `NV404`. |
| `error.code`     | Stable, machine-readable domain code such as `ACCOUNT_NOT_FOUND`. Use this for logic in clients.             |
| `error.message`  | Human-readable text. May change. Do not parse it.                                                            |
| `error.details`  | Present only for validation errors. A list of `{ "message": string }` items.                                 |
| `meta.requestId` | Matches the `x-request-id` response header and the request's log lines. Quote it when reporting a bug.       |
| `timestamp`      | UTC time the error was produced.                                                                             |
| `path`           | The request URL.                                                                                             |

The real HTTP status is also set on the response (for example `404`). Use it for generic HTTP handling. Use `error.code` for specific behavior.

## Configuring the prefix

The prefix and separator live in `config/default.json` under `errors`. They can be overridden per environment in `config/env/<APP_ENV>.json`.

```json
"errors": {
  "statusCodePrefix": "NV",
  "statusCodeSeparator": ""
}
```

Setting the separator to `-` produces `NV-404`. Clients should not depend on either shape. Read the `statusCode` string as a label and use `error.code` for logic.

## Error codes

### Generic

| `error.code`            | HTTP status | `statusCode` (default) | When it is returned                                                                          |
| ----------------------- | ----------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`      | 400         | `NV400`                | Request body, query, or params failed validation. `details` lists each problem.              |
| `BAD_REQUEST`           | 400         | `NV400`                | Malformed request that is not a validation failure.                                          |
| `UNAUTHORIZED`          | 401         | `NV401`                | Missing or invalid JWT, invalid login credentials, or an inactive user account.              |
| `FORBIDDEN`             | 403         | `NV403`                | Authenticated, but the user lacks the required permission.                                   |
| `API_KEY_MISSING`       | 401         | `NV401`                | The `x-api-key` header is missing. Only web and mobile clients can call the API.             |
| `API_KEY_INVALID`       | 401         | `NV401`                | The `x-api-key` header does not match a registered client.                                   |
| `INVALID_REFRESH_TOKEN` | 401         | `NV401`                | The refresh token is unknown, expired, or belongs to a logged-out session. Log in again.     |
| `REFRESH_TOKEN_REUSED`  | 401         | `NV401`                | An already used refresh token was presented. The whole session is revoked (possible theft).  |
| `SESSION_REVOKED`       | 401         | `NV401`                | The access token's session was logged out or revoked. Refresh or log in again.               |
| `RESOURCE_NOT_FOUND`    | 404         | `NV404`                | Route or generic resource not found.                                                         |
| `CONFLICT`              | 409         | `NV409`                | Unique constraint violated (for example a duplicate email).                                  |
| `TOO_MANY_REQUESTS`     | 429         | `NV429`                | Rate limit exceeded. Wait before retrying. Login is limited more strictly than other routes. |
| `SERVICE_UNAVAILABLE`   | 503         | `NV503`                | A dependency such as the database is not reachable. Returned by `/health/ready`.             |
| `INTERNAL_SERVER_ERROR` | 500         | `NV500`                | Unexpected failure. Details are logged, never returned.                                      |

### Users

| `error.code`          | HTTP status | `statusCode` (default) | When it is returned                            |
| --------------------- | ----------- | ---------------------- | ---------------------------------------------- |
| `USER_ALREADY_EXISTS` | 409         | `NV409`                | Registering with an email that already exists. |

### Auth and registration

| `error.code`            | HTTP status | `statusCode` (default) | When it is returned                                                                                              |
| ----------------------- | ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `EMAIL_NOT_VERIFIED`    | 403         | `NV403`                | Login was attempted before the email address was verified with an OTP.                                           |
| `EMAIL_DELIVERY_FAILED` | 503         | `NV503`                | The OTP or welcome email could not be sent. The account is kept; call `resend-verification` to retry.            |
| `OTP_INVALID`           | 400         | `NV400`                | The code is wrong, already used, or the email has no pending OTP. Unknown and wrong codes return the same error. |
| `OTP_EXPIRED`           | 400         | `NV400`                | The OTP is older than the configured expiry (`otp.expiresInSeconds`). Request a new one.                         |
| `OTP_ATTEMPTS_EXCEEDED` | 429         | `NV429`                | Too many wrong codes for the current OTP (`otp.maxAttempts`). Request a new one.                                 |
| `OTP_RESEND_TOO_SOON`   | 429         | `NV429`                | A new OTP was requested before the cooldown (`otp.resendCooldownSeconds`) ended.                                 |

### Accounts

| `error.code`               | HTTP status | `statusCode` (default) | When it is returned                                                                |
| -------------------------- | ----------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `INVALID_ACCOUNT`          | 400         | `NV400`                | Account input is not valid for the operation.                                      |
| `ACCOUNT_NOT_FOUND`        | 404         | `NV404`                | The account does not exist, or the service could not find it for the current user. |
| `ACCOUNT_ALREADY_ARCHIVED` | 409         | `NV409`                | Archiving an account that is already archived.                                     |

### Transactions

| `error.code`                     | HTTP status | `statusCode` (default) | When it is returned                                                                    |
| -------------------------------- | ----------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `INVALID_TRANSACTION`            | 400         | `NV400`                | Transaction input is not valid for the operation.                                      |
| `TRANSACTION_NOT_FOUND`          | 404         | `NV404`                | The transaction does not exist, or the service could not find it for the current user. |
| `TRANSACTION_ALREADY_REVERSED`   | 400         | `NV400`                | Reversing a transaction that was already reversed.                                     |
| `TRANSACTION_CANNOT_BE_REVERSED` | 400         | `NV400`                | The transaction type cannot be reversed.                                               |

### Income

| `error.code`                       | HTTP status | `statusCode` (default) | When it is returned                                                                                                    |
| ---------------------------------- | ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `INVALID_INCOME_CATEGORY`          | 400         | `NV400`                | Income category input is not valid (for example, an empty or too-long name).                                           |
| `INCOME_CATEGORY_NOT_FOUND`        | 404         | `NV404`                | The income category does not exist, or it belongs to another user.                                                     |
| `INCOME_CATEGORY_ALREADY_EXISTS`   | 409         | `NV409`                | An income category with the same name (case-insensitive) already exists for the user, or it matches a system category. |
| `SYSTEM_INCOME_CATEGORY_READ_ONLY` | 403         | `NV403`                | Renaming or archiving a system income category. System categories are read-only.                                       |

Linking an EXPENSE transaction to an income category returns `INVALID_TRANSACTION` (400), not `INVALID_INCOME_CATEGORY`.

### Expenses

| `error.code`                        | HTTP status | `statusCode` (default) | When it is returned                                                                                                     |
| ----------------------------------- | ----------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `INVALID_EXPENSE_CATEGORY`          | 400         | `NV400`                | Expense category input is not valid (for example, an empty or too-long name).                                           |
| `EXPENSE_CATEGORY_NOT_FOUND`        | 404         | `NV404`                | The expense category does not exist, or it belongs to another user.                                                     |
| `EXPENSE_CATEGORY_ALREADY_EXISTS`   | 409         | `NV409`                | An expense category with the same name (case-insensitive) already exists for the user, or it matches a system category. |
| `SYSTEM_EXPENSE_CATEGORY_READ_ONLY` | 403         | `NV403`                | Renaming a system expense category. System categories cannot be renamed, but a user can archive one for themselves. |

Linking an INCOME transaction to an expense category returns `INVALID_TRANSACTION` (400).

### Exchange rates

| `error.code`               | HTTP status | `statusCode` (default) | When it is returned                                                                                                                                                                 |
| -------------------------- | ----------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `EXCHANGE_RATE_UNAVAILABLE` | 503         | `NV503`                | The rate provider is down, no stored rate exists at all for the currency pair, and no manual rate is configured. A transaction is otherwise never rejected for a rate problem (see [NFR-DATA-07](./BUSINESS_REQUIREMENTS.md)). |

### Transaction dates

`transactionDate` and `rateDate` accept only `YYYY-MM-DD`. An ISO timestamp such as `2026-09-01T00:00:00.000Z` is rejected with a 400 validation error.

## Client guidance

- Branch on `error.code`, not on `message`.
- Treat `503` as retryable with backoff. Treat `429` as retryable after waiting. Other `4xx` errors are not.
- Show `error.details` next to form fields when present.
- Log `meta.requestId` with any error you report to support.

## Adding a new error code

1. Add the value to `ErrorCode` in `src/common/constants/error-code.constant.ts`. Use `UPPER_SNAKE_CASE`. Do not add the prefix.
2. Create or reuse an exception that extends `ApplicationException` and passes the code and HTTP status.
3. Add a row to this page.
4. Add a unit test that asserts the status and `error.code`.

See [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for the full workflow.
