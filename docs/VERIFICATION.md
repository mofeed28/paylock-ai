# Verification record

Verified October 11, 2026 on Windows, Node.js 22.17.1, Next.js 16.4.0, Prisma 6.12.0, and SQLite.

## Passed

- Dependency installation and Prisma client generation.
- Versioned SQLite migration; `npm run db:deploy` reports no pending migrations after initialization.
- `npm run lint`: no errors or warnings.
- `npm run typecheck`: no TypeScript errors.
- `npm test`: 10 passing tests, including the isolated database workflow and mocked PayPal adapter checks.
- `npm run build`: successful optimized production build, including all requested application routes.
- `npm audit`: zero reported vulnerabilities at the time of installation after dependency remediation. This is a time-specific dependency check, not a security certification.
- Production-mode HTTP preview at `http://127.0.0.1:3000`.
- Fresh-database setup: `npm run db:deploy` successfully initializes a separate empty SQLite database using the included migration.
- HTTP checks: requested routes return successfully, evidence exports omit seller tokens/raw provider data, invalid inputs and cross-origin mutations are rejected, and untrusted forwarded hosts cannot read buyer data or call buyer mutations.

## Browser walkthrough

- Empty dashboard and one-click sample agreement creation.
- Four-milestone $900 sample; labeled prewritten review and practice authorization.
- Buyer approval modal requires a note and explicit checkbox; confirming records a $200 practice capture and updates the released balance.
- New agreement form, sample brief, labeled fallback generation, editable acceptance criteria, and saved balanced budget.
- Practice authorization of a newly created milestone.
- Seller portal, evidence text and URL submission, success state, and buyer dashboard review count.
- Desktop and narrow mobile layouts inspected. Text contrast was improved following visual inspection.

## Automated behavior coverage

- Cent conservation for small, uneven, and large budgets.
- Rejection of mismatched budget totals, dates after the deadline, invalid calendar dates, and executable URLs.
- Conservative model fallback, suspicious instruction detection, complete checklist validation, and citation matching.
- Serialized mutations and queue recovery after a failed operation.
- Invalid seller link rejection, revision resubmission, dispute blocking, reopening, and expired authorization rejection.
- Duplicate authorization/capture requests do not create duplicate money events.
- Mocked PayPal OAuth, AUTHORIZE order contract, order ownership verification, pending capture state, and completion via provider lookup.

## Not verified / not included

- Actual PayPal sandbox checkout or provider connectivity: no credentials were supplied.
- Live model generation/review: no API key was supplied. Runtime schema and validation logic are implemented; a real model call still needs to be exercised.
- No public repository, hosted deployment, YouTube upload, or Devpost submission was performed.
- Multi-user/multi-instance operation, real-money payments, seller payouts, webhooks, refunds, and production security certification are outside this prototype.

The screenshot in `dashboard.png` shows the working practice workspace following the browser tests. The distributable zip excludes `.env`, local databases, build output, and `node_modules`.
