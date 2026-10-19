# Permanent accounts and seller access

`AUTH_MODE=accounts` enables the private-beta account system. Better Auth 1.7.10
handles password hashing, database-backed sessions, password changes, CSRF checks
and authentication throttling. Accounts use a stable `account:<userId>` workspace;
session expiry or sign-out does not change ownership or delete agreements.

## Run

1. Install dependencies with `npm ci` and back up any existing SQLite database.
2. Run `npm run db:deploy`. The account migration adds tables and nullable agreement
   columns. It does not delete or automatically reassign existing records.
3. Set `AUTH_MODE=accounts`, a random `BETTER_AUTH_SECRET` of at least 32 characters,
   the exact HTTPS `APP_URL`, and a private `BUYER_ACCESS_KEY` enrollment code.
4. Only behind the supplied Caddy proxy, set `AUTH_TRUST_PROXY=true`. Keep the app
   bound to localhost; otherwise leave this setting false. Caddy must overwrite
   untrusted forwarding headers.
5. Build and start. Create an account at `/login` with the enrollment code, an email
   and a password of at least 12 characters. Subsequent sign-ins need only email
   and password. `/account` supports password changes and session revocation.

Passwords and auth secrets must never be committed. The enrollment code is not an
account password. Account sign-in cannot be bypassed through the old `/api/login`
shared-code endpoint. Leaving `AUTH_MODE` empty preserves the legacy local/judge
flows for isolated tests and compatibility.

## Buyer and seller

- Buyer creates and owns an agreement, defines requirements, authorizes sandbox
  funds, reviews evidence and controls payment. Nothing is publicly listed.
- Buyer copies the invitation from the agreement and shares it directly. Invitations
  expire after seven days; no email is sent automatically.
- Seller signs in with a separate account, opens the invitation and requests access.
  The invitation does not expose the scope or evidence before approval.
- Buyer confirms the request's account ID with the intended seller through their
  existing conversation, then approves that specific account. An email address is
  an unverified contact label, not an authorization claim.
- Approved seller sees the agreement in `/seller` and can submit evidence, but
  cannot access the buyer's ledger, exports, payment actions or other agreements.
- Buyer can revoke access and renew the invitation. Prior links and requests stop
  working; submissions, agreements and receipts are retained.
- Buyer's seller preview is read-only. Switching into and back out of that preview
  preserves the selected milestone. Prepared practice walkthroughs remain examples.

## Data continuity and limits

Old judge agreements and receipts remain in the database with their original
workspace IDs. They are **not** claimed by the first new account or matched by
unverified email. Recovering historical judge work requires an operator to verify
the owner and explicitly migrate only the named workspace IDs after a backup.

Persistent-account mode retains the hosted budget safeguards: 150 model attempts
per calendar month globally, 20 per workspace per day, input/output caps, eight
agreements per workspace and the configured website-origin allowlist. These are
application quotas, not an AWS billing guarantee. PayPal remains sandbox-only and
settles to the configured sandbox merchant; a seller invitation does not onboard
that person as a PayPal payee.

## Production launch work still required

This is a persistent private beta, not a claim of finished commercial production.
No verified sending domain/provider is available yet, so email verification,
password-reset mail and email delivery of invitations are not enabled. The UI
states this explicitly. Add and test these before open enrollment. Also complete
an off-host backup/restore plan, monitoring and incident recovery, privacy/retention
policies, and appropriate PayPal merchant onboarding before considering live money.
SQLite and the process-local payment queue currently require a single app process.

## Validation

`npm test` includes session/ownership, invite approval/revocation and migration
preservation checks. After `npm run build`, run `npm run test:accounts` for actual
HTTP isolation, enrollment, CSRF, buyer/seller permissions, logout/relogin and
password-change revocation. `npm run test:judge` verifies legacy judge isolation.
All use isolated databases and avoid live payment/model calls.
