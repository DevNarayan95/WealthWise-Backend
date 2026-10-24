# NAVRO Business Requirements Document

| Field    | Value                                                           |
| -------- | --------------------------------------------------------------- |
| Document | Business Requirements Document (BRD)                            |
| Version  | 1.0                                                             |
| Date     | 2026-10-20                                                      |
| Product  | NAVRO, a personal finance and wealth tracking application       |
| Status   | Approved for Phase 1 design. Items marked Pending are open.     |
| Related  | [AI-INSTRUCTIONS.md](../AI-INSTRUCTIONS.md) (engineering rules) |

This document defines **what** NAVRO must do and **why**. It does not define how the code is structured. The engineering rules, architecture, and roadmap are in [AI-INSTRUCTIONS.md](../AI-INSTRUCTIONS.md).

Requirement IDs (for example `BR-AUTH-01`) are stable. Reference them in design notes, tests, and pull requests.

---

## 1. Purpose and Vision

NAVRO helps an individual understand their money in one place. A user records every account, income, expense, loan, deposit, and investment. The application then shows where the money goes, what the user owns and owes, and what the user can afford next.

The product must answer these questions:

- How much did I earn and spend this month, this year, or in any date range?
- How much did I spend on groceries, house rent, or medical bills?
- What is my net worth today, and how has it changed?
- Am I within my monthly budget? How does this month compare with past months?
- How close am I to my goals, such as buying a home or a car?
- How is each loan progressing, and when will it end?
- Can I afford another month of expenses, or a new loan, and how large a loan could I take?

---

## 2. Scope

### 2.1 In scope for Phase 1 (Core application)

- Account registration, login, logout, and password management.
- Accounts of many types, including savings, current, wallet, FD, and RD.
- Income and expense categories, with system defaults and user-created categories.
- Immutable transactions with history, filters, and reversal.
- Transfers between the user's own accounts.
- Fixed deposits and recurring deposits with full maturity details.
- Investment records for stocks, mutual funds, bonds, FD, and RD.
- Loans and EMIs of any type.
- Monthly budgets with comparison.
- Financial goals with progress tracking.
- Net worth and dashboard data (APIs only).
- Monthly, yearly, and custom-range reports, exported as CSV and PDF, and printable. Every list (accounts, transactions, income categories, expense categories) can also be exported as CSV or PDF.
- Forecasting: runway, extra-month check, next-loan timing, and maximum affordable loan.

### 2.2 In scope for Phase 2 (Super Admin)

- User administration: list, create, block, unblock, and assign roles.
- System monitoring: CPU, memory, uptime, and event-loop metrics.
- Database backups: on demand and scheduled.
- Admin audit log.
- Management of configuration from the admin panel (deferred, see [section 11](#11-decisions-log)).

### 2.3 Future scope

- Subscription plans and billing.
- Mobile application (uses the same APIs as the web frontend).

### 2.4 Out of scope

- The React web frontend. It is developed separately. This document only defines the data and APIs it needs.
- Automatic bank or broker sync. All data is entered by the user or imported by the user.
- Live market prices. Investment current values are entered by the user in Phase 1.
- Live (intraday) exchange rates and live market prices. Conversion uses one reference rate per date (NFR-DATA-05).
- Tax calculation and tax filing.
- Financial advice. Forecasts are estimates, not promises.

---

## 3. Users and Roles

| Role            | Who                        | Phase | Summary                                                                   |
| --------------- | -------------------------- | ----- | ------------------------------------------------------------------------- |
| Customer        | Individual end user        | 1     | Manages their own accounts, money records, and reports.                   |
| Account Manager | Support staff (planned)    | 2     | Helps customers with account issues. Exact rights are defined in Phase 2. |
| Admin           | Operations staff (planned) | 2     | Manages users and monitors the system, with limited rights.               |
| Super Admin     | Owner of the platform      | 2     | Full control: users, roles, system, backups, and configuration.           |

Rules that apply to all roles:

- A user can see and change only their own financial data.
- Admins can manage users but cannot read a customer's financial records unless a documented support process allows it (defined in Phase 2).
- Every admin action is recorded in the audit log.

---

## 4. Business Goals and Success Measures

| Goal                               | Measure                                                                                                                          |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Users can trust their records      | No financial record is edited or deleted. Corrections are reversals.                                                             |
| Users see the full picture quickly | Net worth, monthly totals, and goal progress are returned in one request each.                                                   |
| Users can plan ahead               | Forecast results are available for each loan and goal.                                                                           |
| Data stays private                 | Only the owner, or an authorized admin under Phase 2 rules, can access a user's data. Secrets never appear in logs or responses. |
| The product is operable            | Every request can be traced end to end in logs. Health and metrics are available.                                                |
| The product is maintainable        | All settings come from configuration. Every behavior change has tests.                                                           |

---

## 5. Delivery Plan

Phase 1 is delivered first. Phase 2 starts only after Phase 1 works end to end.

| Order | Item                                  | Depends on                             |
| ----- | ------------------------------------- | -------------------------------------- |
| 1     | Authentication and session management | None                                   |
| 2     | Account types extension               | Accounts (done)                        |
| 3     | Income system categories extension    | Income (done)                          |
| 4     | Expense categories                    | Income pattern (done)                  |
| 5     | Transaction history filters           | Transactions (done)                    |
| 6     | Transfers                             | Transactions, Accounts                 |
| 7     | Deposits (FD and RD)                  | Accounts                               |
| 8     | Loans and EMIs                        | Transactions, Expense categories       |
| 9     | Investments                           | Accounts, Transactions                 |
| 10    | Budgets                               | Expense categories, Loans              |
| 11    | Financial goals                       | Accounts, Investments                  |
| 12    | Net worth and dashboard data          | Accounts, Deposits, Investments, Loans |
| 13    | Reports (CSV, PDF, print)             | Transactions, Categories               |
| 14    | Forecasting and planning              | Income, Expenses, Loans, Net worth     |
| 15    | Super Admin panel (Phase 2)           | Phase 1 complete                       |

Each item is complete only when it works end to end, has tests, and is documented.

---

## 6. Functional Requirements: Phase 1

Priority: **M** = must have, **S** = should have, **C** = could have.

### 6.1 Authentication and Session Management

| ID         | Requirement                                                                                                                                                                         | Priority |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-AUTH-01 | A user registers with name, email, and password.                                                                                                                                    | M        |
| BR-AUTH-02 | The system sends a one-time password (OTP) to the email. The account is active only after the OTP is verified.                                                                      | M        |
| BR-AUTH-03 | A user can request a new OTP. Requests for a new OTP are rate-limited, and the limit is configurable.                                                                               | M        |
| BR-AUTH-04 | A user who has not verified their email cannot log in.                                                                                                                              | M        |
| BR-AUTH-05 | A user resets a forgotten password by verifying an OTP sent to the registered email.                                                                                                | M        |
| BR-AUTH-06 | A user logs in with email and password and receives a short-lived access token and a refresh token.                                                                                 | M        |
| BR-AUTH-07 | The access token expires quickly (default 15 minutes, configurable). The user gets a new one with the refresh token without logging in again.                                       | M        |
| BR-AUTH-08 | Each refresh token is single-use. Every refresh issues a new refresh token and invalidates the old one.                                                                             | M        |
| BR-AUTH-09 | Refresh tokens are stored only as hashes. A plain token is never stored.                                                                                                            | M        |
| BR-AUTH-10 | If an old, already used refresh token is presented again, the system treats it as theft and revokes the whole session family.                                                       | M        |
| BR-AUTH-11 | **Logout:** the user logs out of the current session. The refresh token is revoked immediately, and the current access token is rejected on its next use, not only when it expires. | M        |
| BR-AUTH-12 | **Logout all:** the user logs out of every session on every device.                                                                                                                 | M        |
| BR-AUTH-13 | Changing or resetting a password logs the user out of all sessions.                                                                                                                 | M        |
| BR-AUTH-14 | A blocked (suspended) user is logged out of all sessions and cannot log in until unblocked.                                                                                         | M        |
| BR-AUTH-15 | Failed logins are limited and locked temporarily. Limits and lock time are configurable.                                                                                            | S        |
| BR-AUTH-16 | Users can view their active sessions (device, last used time) and revoke any of them.                                                                                               | C        |

Logout must behave the same way for web and mobile clients. Revoking a session always takes effect at once.

### 6.2 Accounts

| ID        | Requirement                                                                                                                                                 | Priority |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-ACC-01 | A user creates accounts of these types: Savings, Current, Bank account, Wallet, Cash, Credit card, Investment, Fixed deposit, Recurring deposit, and Other. | M        |
| BR-ACC-02 | Each account has a name, type, currency (default INR), and opening balance.                                                                                 | M        |
| BR-ACC-03 | Each account has a status: Active or Archived. An account with history is archived, never deleted.                                                          | M        |
| BR-ACC-04 | A user sees a list of their accounts with each current balance.                                                                                             | M        |
| BR-ACC-05 | Fixed deposit and recurring deposit accounts link to deposit details (see [6.6](#66-deposits-fd-and-rd)).                                                   | M        |
| BR-ACC-06 | A credit card account shows the amount owed. Its balance is included in net worth as a liability.                                                           | M        |

### 6.3 Income and Expense Categories

Income and expense categories work the same way. The only difference is which transaction type uses them.

| ID        | Requirement                                                                                                       | Priority |
| --------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| BR-CAT-01 | The system provides default (system) categories for income and for expenses. Users cannot edit or delete them.    | M        |
| BR-CAT-02 | A user adds their own categories for income and for expenses.                                                     | M        |
| BR-CAT-03 | A category name is unique per user. Two categories with the same name are not allowed, even when one is archived. | M        |
| BR-CAT-04 | An archived category keeps its name reserved. It cannot be reused, and it still appears on old transactions.      | M        |
| BR-CAT-05 | A category is archived, never deleted, once it has transactions.                                                  | M        |
| BR-CAT-06 | Income categories are used only on income transactions. Expense categories are used only on expense transactions. | M        |

**Default income categories** (already implemented, R3 adds the last three): Salary, Business, Freelance, Interest, Interest from FD, Dividends, Capital Gains, Rental, Gifts, Refunds, Other.

**Additional income defaults** (Phase 1, item 3): Rental income and Capital gains.

**Default expense categories** (approved, see [section 11](#11-decisions-log)):

Groceries, House rent, Electricity, Water, Internet, Mobile, Transport, Medical bills, Education, Dining, Shopping, Entertainment, Insurance, Loan EMI, Other.

### 6.4 Transactions and History

| ID        | Requirement                                                                                                                          | Priority |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BR-TXN-01 | A user records income, expense, and transfer transactions. Each has an amount, transaction date, account, and category where needed. | M        |
| BR-TXN-02 | A transaction is never edited or deleted after it is created.                                                                        | M        |
| BR-TXN-03 | A wrong transaction is corrected with a reversal. A transaction can be reversed only once.                                           | M        |
| BR-TXN-04 | Amounts are exact decimal values. They are never stored as floating-point numbers.                                                   | M        |
| BR-TXN-05 | A user lists transactions across all accounts, or for one account.                                                                   | M        |
| BR-TXN-06 | The list filters by date range, transaction type, category, and account, and supports pagination.                                    | M        |
| BR-TXN-07 | History is grouped by the transaction date (not the creation date), so a user can view any month or year.                            | M        |
| BR-TXN-08 | Transfers move money between two of the user's own accounts. Both sides are recorded as transactions and stay linked.                | M        |

### 6.5 Balances

| ID        | Requirement                                                                                                                                  | Priority |
| --------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-BAL-01 | Each account balance equals the opening balance plus income, minus expenses, plus transfers received, minus transfers sent, after reversals. | M        |
| BR-BAL-02 | A balance can be shown as of any date.                                                                                                       | M        |

### 6.6 Deposits (FD and RD)

A fixed deposit (FD) or recurring deposit (RD) is an account type that holds money. Its maturity details are stored in full.

| ID        | Requirement                                                                                                                                                                                                                                                                                   | Priority |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-DEP-01 | A deposit records: institution name, a masked deposit reference (last four characters only), principal amount, interest rate per year, compounding frequency, start date, tenure, maturity date, maturity amount, interest payout type (cumulative or non-cumulative), and auto-renewal flag. | M        |
| BR-DEP-02 | An RD also records: monthly installment amount, installment day of the month, total installments, paid installments, and missed installments.                                                                                                                                                 | M        |
| BR-DEP-03 | A deposit has a status: Active, Matured, or Closed early. Closing early records the reason and the amount received.                                                                                                                                                                           | M        |
| BR-DEP-04 | Each installment paid into an RD, and each interest credit, is recorded as a transaction linked to the deposit.                                                                                                                                                                               | M        |
| BR-DEP-05 | Maturity is recorded as a transaction. The user can see when the next maturity or installment is due.                                                                                                                                                                                         | M        |
| BR-DEP-06 | The system shows the expected maturity amount, based on the stored terms. It does not claim the bank's actual payout.                                                                                                                                                                         | S        |

### 6.7 Investments

| ID        | Requirement                                                                                                                             | Priority |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-INV-01 | A user records investments of these types: Stock, Mutual fund, Bond, and Other. FD and RD are covered in [6.6](#66-deposits-fd-and-rd). | M        |
| BR-INV-02 | Each investment records: name, type, units or quantity, purchase price per unit, purchase date, charges, and linked investment account. | M        |
| BR-INV-03 | Buying, selling, receiving dividends, and receiving interest are recorded as transactions linked to the investment.                     | M        |
| BR-INV-04 | The user updates the current value per unit manually. The system shows the current value, gain or loss, and percentage return.          | M        |
| BR-INV-05 | Recurring contributions, such as a monthly SIP, are recorded each period, and the user can see total contributed so far.                | M        |
| BR-INV-06 | Sold units reduce the holding. The realized gain or loss is stored with the sale.                                                       | S        |

### 6.8 Loans and EMIs

| ID         | Requirement                                                                                                                                 | Priority |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-LOAN-01 | A user records a loan of any type: Education, Consumer, Personal, Home, Car, or Other.                                                      | M        |
| BR-LOAN-02 | Each loan records: lender, principal, annual interest rate, tenure in months, EMI amount, start date, and the account the EMI is paid from. | M        |
| BR-LOAN-03 | Each EMI payment is recorded as an expense transaction, linked to the loan and the Loan EMI category.                                       | M        |
| BR-LOAN-04 | The system shows EMIs paid, EMIs remaining, outstanding principal, progress percentage, and the expected closing date.                      | M        |
| BR-LOAN-05 | A user can record a prepayment. It reduces the outstanding principal and is stored as a transaction.                                        | S        |
| BR-LOAN-06 | A loan is closed when its outstanding principal reaches zero. Closed loans stay in history.                                                 | M        |

### 6.9 Budgets

| ID        | Requirement                                                                                                            | Priority |
| --------- | ---------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-BUD-01 | A user creates one budget per month. Each budget line has a planned amount and links to an expense category or a loan. | M        |
| BR-BUD-02 | Actual amounts come from expense transactions in that month, by transaction date.                                      | M        |
| BR-BUD-03 | The system shows planned, actual, and remaining amounts for each line and for the whole month.                         | M        |
| BR-BUD-04 | When the month ends, the budget is closed. A closed budget cannot change its plan.                                     | M        |
| BR-BUD-05 | A user compares any two budgets, or a budget against its previous month, and sees the difference by line.              | M        |

### 6.10 Financial Goals

| ID         | Requirement                                                                                                                                                                       | Priority |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-GOAL-01 | A user creates a goal with a name, target amount, and target date (for example, buy a home).                                                                                      | M        |
| BR-GOAL-02 | A goal links only to the accounts and investments the user explicitly attaches. Nothing is linked automatically.                                                                  | M        |
| BR-GOAL-03 | The goal shows current amount, target amount, and progress percentage. Current amount is the balance of the attached accounts plus the current value of the attached investments. | M        |
| BR-GOAL-04 | The goal shows its related transactions, so the user can see how the amount was built up.                                                                                         | M        |
| BR-GOAL-05 | A goal can be marked achieved or cancelled. Its history is kept.                                                                                                                  | S        |

### 6.10A Savings

| ID        | Requirement                                                                                             | Priority |
| --------- | ------------------------------------------------------------------------------------------------------- | -------- |
| BR-SAV-01 | A user creates a savings plan with a name. An optional target amount can be set.                        | M        |
| BR-SAV-02 | A savings plan links only to the accounts the user explicitly attaches.                                 | M        |
| BR-SAV-03 | A savings plan shows the transactions of its attached accounts and their combined balance.              | M        |
| BR-SAV-04 | When a target amount is set, the savings plan shows progress as a percentage.                           | M        |
| BR-SAV-05 | Savings plans are separate from Financial Goals (section 6.10). Changing one does not change the other. | M        |

### 6.11 Net Worth and Dashboard Data

| ID       | Requirement                                                                                                                                                                                             | Priority |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-NW-01 | Net worth equals: asset account balances, plus investment current values, plus deposit balances, minus loan outstanding principal, minus credit card balances owed.                                     | M        |
| BR-NW-02 | Net worth is shown in the currency the user selects (default INR). Each amount is converted at the rate for the as-of date. The original amounts are kept.                                              | M        |
| BR-NW-03 | Net worth can be shown for any date, and as a trend over time.                                                                                                                                          | M        |
| BR-NW-04 | The dashboard data includes: income and expense trend, category breakdown, budget against actual, goal progress, loan progress, upcoming EMIs and maturities, net worth trend, and recent transactions. | M        |
| BR-NW-05 | Dashboard data is returned by read-only APIs. The interactive dashboard is built in the React frontend.                                                                                                 | M        |

### 6.12 Reports

| ID        | Requirement                                                                                                                                 | Priority |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-REP-01 | A user generates a monthly, yearly, or custom date-range report.                                                                            | M        |
| BR-REP-02 | A report shows: total income, total expense, net savings, expense by category, income by category, and the transaction list for the period. | M        |
| BR-REP-03 | A report can be downloaded as CSV. The CSV holds the transaction list with columns that spreadsheet tools can read.                         | M        |
| BR-REP-04 | A report can be downloaded as PDF.                                                                                                          | M        |
| BR-REP-05 | A report can be printed. The PDF is laid out for printing, and the frontend can also print the report page directly.                        | M        |
| BR-REP-06 | Reports are based on transaction date, and reversed transactions are shown with their reversal so totals stay correct.                      | M        |
| BR-REP-07 | Reports are generated when requested. They are not stored on the server.                                                                    | S        |

### 6.13 Forecasting and Planning

Forecasts are estimates. Each forecast shows the inputs it used and the date it was calculated. Forecasts never promise a loan or a result.

| ID       | Requirement                                                                                                                                              | Priority |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| BR-FC-01 | **Runway:** how many months the user's liquid balances can cover the average monthly expense.                                                            | M        |
| BR-FC-02 | **Extra month check:** whether the user can cover one more month of expenses from current balances, and how much would be left.                          | M        |
| BR-FC-03 | **Next loan timing:** the date a new loan could start, based on when the current loan ends. The user can enter the number of months they want to wait.   | M        |
| BR-FC-04 | **Maximum loan:** the largest loan the user can afford for a target, based on income, existing EMIs, and a maximum EMI-to-income ratio.                  | M        |
| BR-FC-05 | Average expense uses a configurable number of past months.                                                                                               | M        |
| BR-FC-06 | The maximum EMI-to-income ratio, the averaging window, the interest rate, and the tenure used for estimates are configuration values, not fixed in code. | M        |
| BR-FC-07 | Each forecast result states that it is an estimate, and lists the assumptions used.                                                                      | M        |

---

## 7. Functional Requirements: Phase 2 (Super Admin)

Phase 2 starts only after Phase 1 is complete.

| ID        | Requirement                                                                                                                                                                          | Priority |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| BR-ADM-01 | A Super Admin lists all users, with search and status filter.                                                                                                                        | M        |
| BR-ADM-02 | A Super Admin creates a user and assigns a role.                                                                                                                                     | M        |
| BR-ADM-03 | A Super Admin blocks and unblocks a user. A blocked user is logged out of all sessions (see BR-AUTH-14).                                                                             | M        |
| BR-ADM-04 | A Super Admin assigns and removes roles. Changes are audited.                                                                                                                        | M        |
| BR-ADM-05 | A Super Admin sees system metrics: CPU, memory, uptime, and event-loop delay, with a history for the last period.                                                                    | M        |
| BR-ADM-06 | A Super Admin takes a database backup on demand, sees the backup list, and schedules automatic backups.                                                                              | M        |
| BR-ADM-07 | Restoring a backup is a documented manual procedure, not a button in the admin panel.                                                                                                | M        |
| BR-ADM-08 | Every admin action is written to an audit log: who, what, when, and the target.                                                                                                      | M        |
| BR-ADM-09 | Configuration can be viewed and changed from the admin panel. Secrets are never shown or stored in the database. This requirement is deferred (see [section 11](#11-decisions-log)). | S        |
| BR-ADM-10 | Subscription plans are managed by the Super Admin. This is future scope.                                                                                                             | C        |

---

## 8. Non-Functional Requirements

### 8.1 Security

| ID         | Requirement                                                                                                                                                                  |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-SEC-01 | Only the React web frontend and future mobile apps can call the APIs. Each call needs a valid API key and a valid user token.                                                |
| NFR-SEC-02 | Passwords are stored with bcrypt. Passwords and OTPs are never logged or returned.                                                                                           |
| NFR-SEC-03 | Secrets (database URL, JWT secret, mail password, API keys) come only from environment variables. They never appear in configuration files, source code, logs, or responses. |
| NFR-SEC-04 | Every query is limited to the owner's data. Ownership is checked at the data access boundary.                                                                                |
| NFR-SEC-05 | Account numbers and deposit references are masked. Only the last four characters are stored and shown.                                                                       |
| NFR-SEC-06 | All traffic uses HTTPS in staging and production.                                                                                                                            |
| NFR-SEC-07 | Errors return a stable error code and a safe message. Stack traces are never returned to clients.                                                                            |

### 8.2 Data Integrity

| ID          | Requirement                                                                                                                                                                                                                                                                              |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-DATA-01 | Financial history is never physically deleted without a written architectural decision.                                                                                                                                                                                                  |
| NFR-DATA-02 | Money is stored and calculated as exact decimals.                                                                                                                                                                                                                                        |
| NFR-DATA-03 | Financial events use the user's local calendar date, based on the user's time zone.                                                                                                                                                                                                      |
| NFR-DATA-04 | Each amount has a currency. The default is INR.                                                                                                                                                                                                                                          |
| NFR-DATA-05 | Each transaction stores the exchange rate for its date. Rates come from Frankfurter (ECB reference rates, no API key). Net worth, balances, and the dashboard convert at the rate for the as-of date. Reports convert each row at its own date's rate.                                   |
| NFR-DATA-06 | Conversion uses daily reference rates only. Live market prices and intraday rates are out of scope.                                                                                                                                                                                      |
| NFR-DATA-07 | A transaction is never rejected because the rate provider is unavailable. Its rate comes from the stored rate on or before the date, then the most recent stored rate for that currency, then a manual rate in config. The rate source (PROVIDER, FALLBACK, MANUAL, or IDENTITY) is stored, so approximate values can be flagged. |

### 8.3 Performance and Scale

| ID          | Requirement                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| NFR-PERF-01 | All list APIs are paginated with the same response shape. The page size and maximum are configurable.      |
| NFR-PERF-02 | Balances, net worth, and reports stay accurate and responsive for users with at least 10 years of history. |
| NFR-PERF-03 | Report generation does not load the whole history into memory at once.                                     |

### 8.4 Operability and Observability

| ID         | Requirement                                                                                                                                  |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-OPS-01 | Each request gets a unique ID. Logs for one request can be followed from start to end (request, database queries, outbound calls, response). |
| NFR-OPS-02 | Logs are written to daily files and are searchable. Old logs are deleted automatically after a configurable number of days.                  |
| NFR-OPS-03 | Health endpoints report liveness and readiness. Metrics for the admin panel are provided separately (Phase 2).                               |
| NFR-OPS-04 | The application runs under PM2 in staging and production. Each environment has its own configuration.                                        |
| NFR-OPS-05 | Benchmarks for key APIs are measured and recorded, so changes that slow the system are visible.                                              |

### 8.5 Configuration and Maintainability

| ID         | Requirement                                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------------------- |
| NFR-CFG-01 | Every business threshold, limit, default, and schedule is set in configuration, not in code.                |
| NFR-CFG-02 | Every behavior change has unit tests written first. Changed endpoints have controller and end-to-end tests. |
| NFR-CFG-03 | API documentation (Swagger and Postman collection) stays in step with the code.                             |

---

## 9. Standard API Behavior

These rules apply to every Phase 1 API. They are summarized here for business readers. The engineering details are in [ERROR_CODES.md](./ERROR_CODES.md) and [CONFIGURATION.md](./CONFIGURATION.md).

- Every successful response has the same envelope.
- Every list response uses the same pagination shape.
- Every error returns a stable error code and an HTTP status that matches it.
- Every request is traceable through its request ID.

---

## 10. Glossary

| Term      | Meaning                                                                          |
| --------- | -------------------------------------------------------------------------------- |
| Account   | A place where money is held, such as a savings account, wallet, or FD.           |
| Archive   | Hide an account or category from new use while keeping its history.              |
| Budget    | A planned spending amount for a month, compared with actual spending.            |
| EMI       | Equated Monthly Installment. The fixed monthly amount paid on a loan.            |
| Expense   | Money spent. Each expense has an expense category.                               |
| FD        | Fixed Deposit. Money held with a bank for a fixed tenure at a fixed rate.        |
| Goal      | A future target with an amount and a date, such as buying a home.                |
| Income    | Money received. Each income has an income category.                              |
| Maturity  | The date a deposit ends and the amount is paid back, with interest.              |
| Net worth | Assets minus liabilities at a point in time.                                     |
| Reversal  | A new transaction that cancels an earlier one. The original stays in history.    |
| RD        | Recurring Deposit. A monthly installment deposit with a bank for a fixed tenure. |
| Runway    | How many months the liquid balances can cover current expenses.                  |
| SIP       | Systematic Investment Plan. A fixed recurring investment in a mutual fund.       |
| Transfer  | Money moved between two of the user's own accounts.                              |

---

## 11. Decisions Log

| #   | Topic                       | Decision                                                                                                                                                                                                         | Status   |
| --- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | Logout                      | Best practice: short-lived access tokens, rotating single-use refresh tokens stored as hashes, logout revokes the session at once, reuse detection, and logout-all. See BR-AUTH-06 to BR-AUTH-13.                | Approved |
| 2   | New account types           | Add Savings, Current, Wallet, Fixed deposit, and Recurring deposit. Existing types stay.                                                                                                                         | Approved |
| 3   | FD and RD                   | Account types that hold the balance. All maturity details are stored. Maturity and installments are recorded as transactions.                                                                                    | Approved |
| 4   | Expense categories          | Users can add their own categories, as with income. System defaults are provided, as with income.                                                                                                                | Approved |
| 5   | Default expense list        | The 15 default expense categories in section 6.3 are approved. Users can add their own.                                                                                                                          | Approved |
| 6   | Report export               | CSV and PDF for every list (accounts, transactions, income categories, expense categories). Reports can be printed. Exports are generated on request and never stored. | Approved |
| 7   | Phase order                 | Phase 1 (core application) first. The Super Admin panel follows.                                                                                                                                                 | Approved |
| 8   | Admin config from dashboard | Changing configuration from the admin panel conflicts with the rule that configuration comes from files. Deferred. Configuration stays in files until the admin panel phase is designed.                         | Deferred |
| 9   | Goal progress               | Current amount = balances of the accounts plus current values of the investments the user explicitly attaches to the goal. Nothing is linked automatically.                                                      | Approved |
| 10  | Savings module              | Savings is a separate module. The user attaches accounts to it and sees its transactions and progress. This reverses the earlier proposal to merge savings into goals and account types.                         | Approved |
| 11  | Time zone                   | Each user has a time zone. Financial dates use the user's local calendar date.                                                                                                                                   | Approved |
| 12  | Mobile app                  | Uses the same APIs as the web frontend. Mobile design is out of scope until Phase 2 is complete.                                                                                                                 | Approved |
| 13  | Multi-currency              | Each amount has a currency, with INR as the default. The user chooses the currency on income, expense, investment, loan, and other inputs. Net worth, reports, and the dashboard can show any selected currency. | Approved |
| 14  | Exchange rates              | Source: Frankfurter (ECB reference rates, no API key). Income in RM converts to INR at that day's rate. Each transaction stores the rate for its date. Coverage of INR, MYR, and AUD is verified before release. | Approved |
| 15  | Savings target              | Proposed: the target amount is optional. Progress is shown only when a target is set.                                                                                                                            | Pending  |
| 16  | Product name and prefixes   | Product name NAVRO. Error code prefix `NV`. Database table prefix `nv_`.                                                                                                                                         | Approved |
| 17  | Exchange-rate fallback      | Provider rate for the date, then the most recent stored rate on or before the date, then the most recent stored rate of any date (last given rate), then a manual rate in config. Transactions are never rejected. The rate source is stored. (NFR-DATA-07)                          | Approved |
| 18  | Loan EMI category           | Loan EMI is a system category. Users do not create it.                                                                                                                                                           | Approved |
| 19  | Transaction currency        | A transaction uses its account's currency. Conversion is used only for base-currency reporting, net worth, and the dashboard.                                                                                    | Approved |
| 20  | System category rows        | Default categories are shared rows (`user_id` NULL) with a partial unique index on the normalized name. Users can archive system categories for themselves through a per-user archive table. | Approved |
| 21  | Transaction date            | `transactionDate` and `rateDate` are calendar dates (`YYYY-MM-DD`), not timestamps. This is a breaking API change, made in development before release. Base amounts store 4 decimal places. | Approved |

---

## 12. Acceptance Criteria for Phase 1

Phase 1 is complete when all of these are true:

1. A new user can register, verify email, log in, use the app, log out, and log out of all sessions.
2. A logged-out token is rejected on its next call.
3. A user can create every account type, including FD and RD with full maturity details.
4. Income and expense categories work with system defaults and user-created categories, with unique names that stay reserved after archive.
5. Transactions cannot be edited or deleted. Reversals work, and history filters by date range, type, category, and account.
6. Transfers keep both sides linked.
7. Investments, loans, budgets, and goals each show their progress and related transactions.
8. Net worth, dashboard data, and forecasts return correct results against a known test dataset.
9. A monthly, yearly, and custom-range report can be downloaded as CSV and PDF, and printed.
10. Every API call can be traced end to end in the logs.
11. Every rule above is covered by unit, controller, and end-to-end tests.

---

## 13. Out of Scope for This Document

- Screen designs and the React frontend. These are defined in the frontend project.
- Infrastructure choices beyond the environment variables and PM2 setup.
- Detailed data types, table designs, and endpoint paths. These are defined in the technical design for each module.
