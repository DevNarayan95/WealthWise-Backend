# Error Codes

Every error response from the WealthWise API uses the same envelope. This page lists the codes and HTTP statuses the API returns, and how clients should read them.

## Response envelope

```json
{
  "success": false,
  "statusCode": "WS404",
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
| `statusCode`     | Branded status: `errors.statusCodePrefix` + `errors.statusCodeSeparator` + the HTTP status. Default `WS404`. |
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
  "statusCodePrefix": "WS",
  "statusCodeSeparator": ""
}
```

Setting the separator to `-` produces `WS-404`. Clients should not depend on either shape. Read the `statusCode` string as a label and use `error.code` for logic.

## Error codes

### Generic

| `error.code`            | HTTP status | `statusCode` (default) | When it is returned                                                                          |
| ----------------------- | ----------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `VALIDATION_ERROR`      | 400         | `WS400`                | Request body, query, or params failed validation. `details` lists each problem.              |
| `BAD_REQUEST`           | 400         | `WS400`                | Malformed request that is not a validation failure.                                          |
| `UNAUTHORIZED`          | 401         | `WS401`                | Missing or invalid JWT, invalid login credentials, or an inactive user account.              |
| `FORBIDDEN`             | 403         | `WS403`                | Authenticated, but the user lacks the required permission.                                   |
| `API_KEY_MISSING`       | 401         | `WS401`                | The `x-api-key` header is missing. Only web and mobile clients can call the API.             |
| `API_KEY_INVALID`       | 401         | `WS401`                | The `x-api-key` header does not match a registered client.                                   |
| `RESOURCE_NOT_FOUND`    | 404         | `WS404`                | Route or generic resource not found.                                                         |
| `CONFLICT`              | 409         | `WS409`                | Unique constraint violated (for example a duplicate email).                                  |
| `TOO_MANY_REQUESTS`     | 429         | `WS429`                | Rate limit exceeded. Wait before retrying. Login is limited more strictly than other routes. |
| `SERVICE_UNAVAILABLE`   | 503         | `WS503`                | A dependency such as the database is not reachable. Returned by `/health`.                   |
| `INTERNAL_SERVER_ERROR` | 500         | `WS500`                | Unexpected failure. Details are logged, never returned.                                      |

### Users

| `error.code`          | HTTP status | `statusCode` (default) | When it is returned                            |
| --------------------- | ----------- | ---------------------- | ---------------------------------------------- |
| `USER_ALREADY_EXISTS` | 409         | `WS409`                | Registering with an email that already exists. |

### Auth and registration

| `error.code`            | HTTP status | `statusCode` (default) | When it is returned                                                                                              |
| ----------------------- | ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `EMAIL_NOT_VERIFIED`    | 403         | `WS403`                | Login was attempted before the email address was verified with an OTP.                                           |
| `EMAIL_DELIVERY_FAILED` | 503         | `WS503`                | The OTP or welcome email could not be sent. The account is kept; call `resend-verification` to retry.            |
| `OTP_INVALID`           | 400         | `WS400`                | The code is wrong, already used, or the email has no pending OTP. Unknown and wrong codes return the same error. |
| `OTP_EXPIRED`           | 400         | `WS400`                | The OTP is older than the configured expiry (`otp.expiresInSeconds`). Request a new one.                         |
| `OTP_ATTEMPTS_EXCEEDED` | 429         | `WS429`                | Too many wrong codes for the current OTP (`otp.maxAttempts`). Request a new one.                                 |
| `OTP_RESEND_TOO_SOON`   | 429         | `WS429`                | A new OTP was requested before the cooldown (`otp.resendCooldownSeconds`) ended.                                 |

### Accounts

| `error.code`               | HTTP status | `statusCode` (default) | When it is returned                                                                |
| -------------------------- | ----------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `INVALID_ACCOUNT`          | 400         | `WS400`                | Account input is not valid for the operation.                                      |
| `ACCOUNT_NOT_FOUND`        | 404         | `WS404`                | The account does not exist, or the service could not find it for the current user. |
| `ACCOUNT_ALREADY_ARCHIVED` | 409         | `WS409`                | Archiving an account that is already archived.                                     |

### Transactions

| `error.code`                     | HTTP status | `statusCode` (default) | When it is returned                                                                    |
| -------------------------------- | ----------- | ---------------------- | -------------------------------------------------------------------------------------- |
| `INVALID_TRANSACTION`            | 400         | `WS400`                | Transaction input is not valid for the operation.                                      |
| `TRANSACTION_NOT_FOUND`          | 404         | `WS404`                | The transaction does not exist, or the service could not find it for the current user. |
| `TRANSACTION_ALREADY_REVERSED`   | 400         | `WS400`                | Reversing a transaction that was already reversed.                                     |
| `TRANSACTION_CANNOT_BE_REVERSED` | 400         | `WS400`                | The transaction type cannot be reversed.                                               |

### Income

| `error.code`                       | HTTP status | `statusCode` (default) | When it is returned                                                                                                    |
| ---------------------------------- | ----------- | ---------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `INVALID_INCOME_CATEGORY`          | 400         | `WS400`                | Income category input is not valid (for example, an empty or too-long name).                                           |
| `INCOME_CATEGORY_NOT_FOUND`        | 404         | `WS404`                | The income category does not exist, or it belongs to another user.                                                     |
| `INCOME_CATEGORY_ALREADY_EXISTS`   | 409         | `WS409`                | An income category with the same name (case-insensitive) already exists for the user, or it matches a system category. |
| `SYSTEM_INCOME_CATEGORY_READ_ONLY` | 403         | `WS403`                | Renaming or archiving a system income category. System categories are read-only.                                       |

Linking an EXPENSE transaction to an income category returns `INVALID_TRANSACTION` (400), not `INVALID_INCOME_CATEGORY`.

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
