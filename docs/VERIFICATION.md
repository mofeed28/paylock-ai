# Latest verification — Bedrock adapter and judge demo, October 13, 2026

- PayPal sandbox OAuth returns HTTP 200. The user completed sandbox authorization,
  submission, manual approval and capture. A direct read-only PayPal capture lookup
  returned HTTP 200, COMPLETED, USD 200.00, matching the local payment record.
- That submission used fallback review, so this is **not** live-AI verification.
- 23 automated tests pass, including native Bedrock Converse HTTP doubles,
  tool-result feedback, invalid/truncated model results, judge session isolation,
  forged-cookie rejection, expired demo access and persistent model quota rollback.
- Production HTTP checks with an isolated database and dummy credentials pass:
  separate judge samples, secure/HttpOnly cookies, authenticated APIs, protected
  exports, seller content, screenshots, dashboard, ledger and payment mutations.
  Run `node scripts/verify-judge-http.mjs` after `npm run build` to repeat.
- ESLint, TypeScript and production build pass. The additive migration preserves
  existing agreements in the local workspace. Backup files under `work/` are now
  excluded from lint and typecheck.
- Bedrock provider connectivity, AWS provisioning, Linux systemd/Chromium runtime,
  domain/TLS setup, hosted checkout and live-model quality remain unverified.
- No cloud resources created, no public repository publication and no video uploaded.

# Earlier verification — focused website walkthrough

Verified October 11, 2026 on Windows with Node.js 22.17.1.

- TypeScript and ESLint pass.
- 16 automated tests pass. Added coverage for missing and corrected HTML, source fingerprints, hidden/script/comment decoys, custom products, executable links, ambiguous multiple artifacts, model/source-check conflicts, and empty citations.
- Isolated SQLite workflow confirms demo reopening does not create duplicates, fresh walkthroughs keep old records, sample revision requires a buyer revision request, and both submitted versions are preserved.
- Optimized production build succeeds.
- Browser walkthrough: initial computed 2/3 result → buyer revision request → corrected source → computed 3/3 result → explicit buyer confirmation → $300 simulated capture and receipt.
- Desktop layout inspected at a 1440px viewport. At 390px and 320px viewports, the loaded agreement detail and cards have no document-level horizontal overflow (375px and 305px content widths after the scrollbar). Search filters cards correctly.
- Replaced clipping tables with responsive agreement cards. Fixed the additional narrow-navigation overflow observed during QA.
- Dependency installation reported zero audit vulnerabilities after adding node-html-parser; this is a point-in-time check.

The GitHub repository is private by owner request. Real PayPal sandbox calls, real model calls, user research, hosted deployment, public video, and submission remain outstanding. Model and PayPal adapter tests use HTTP doubles; they are not provider connectivity tests.

The historical record below refers to the prior four-milestone sample and must not be mistaken for the current walkthrough. New screenshots show the focused redesign.

---

# Historical baseline — initial MVP

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


## Browser agent checkpoint — October 12, 2026

- 21 automated tests pass locally, including a real Chromium 404/revision/200 flow with isolated SQLite and duplicate-capture prevention.
- Function-calling behavior is tested with mock responses; no live-model success is claimed.
- Permission tests reject revoked/expired grants, mismatched amounts, stale or incomplete evidence, disputes, blocked requests, and non-live sandbox planners.
- Lint, TypeScript, and optimized production build pass.
- UI: explicit practice grant, browser failure with no capture, corrected submission, passing observations, simulated capture and receipt. Three protected screenshot images loaded successfully.
- Responsive inspection at 390px and 1440px: no horizontal document overflow.
- Screenshot: [agent-verification.jpg](agent-verification.jpg).
- Outstanding: live model/provider credentials and actual PayPal sandbox authorization/capture; deployed-site integration; multi-user/production hardening. Local sample results must not be presented as completed live integration.
- Linux CI: [run 38215332691](https://github.com/mofeed28/paylock-ai/actions/runs/38215332691) passed all 21 tests, lint, typecheck, migration deploy, and production build on commit `8bf0b9a`, using Ubuntu 22.04 with Chromium sandboxing enabled.


## Bedrock and hosting checkpoint — October 14, 2026

This checkpoint supersedes the earlier no-credentials notes above. PayPal
sandbox authorization and a manually approved USD 200 capture were verified
on October 13, including an independent provider lookup.

Amazon Nova 2 Lite (us.amazon.nova-2-lite-v1:0) passed live structured milestone
generation and evidence review, plus a five-step tool loop with synthetic
observations. The loop receives prior tool results and validates one tool at
a time. All 23 automated tests, lint and typecheck passed after the model change.

A dedicated Lightsail server has been provisioned, but hosted browser behavior,
HTTPS and PayPal connectivity remain pending deployment completion.


## Hosted workflow checkpoint — October 14, 2026

- HTTPS login and no-index headers verified at the Lightsail demo hostname.
- Independent signed sessions cannot read another session's agreement export
  or screenshots, or invoke its browser verification.
- Live Amazon Nova + sandboxed Linux Chromium found the fixture HTTP 404,
  requested revision, verified the corrected fixture, and completed one
  explicitly permitted simulated capture. This sample does not call PayPal.
- Hosted live Nova milestone generation passed. The separate PayPal sandbox
  path created an actual AUTHORIZE-intent order with the configured merchant.
  Hosted buyer approval and capture were not performed by this check.
- Agreement, evidence, payment state and session survived a service restart.
- The app listens on localhost:3000; Caddy exposes only HTTP/HTTPS. SSH is
  restricted to the administrator IP in the Lightsail firewall.
- The first hosted build and isolated HTTP verification both passed.

Final browser check after the UTC fix: judge guide, saved agreement and new
agreement pages rendered without JavaScript/hydration errors at desktop width;
the judge guide also had no horizontal overflow at 390px.

## Public website / sandbox agreement checkpoint — October 14, 2026

The guided sandbox preset creates a $5 browser-verification milestone and a
separate $100 manual handoff. The public Northstar site is served over HTTPS
on the existing Lightsail host, with its own hostname and no judge data.

On a sandbox-mode agreement with `fixture: false`, live Nova and Chromium fetched
the public site, observed the genuine HTTP 404 at `/checkout/`, and recorded a
revision request. Publishing the missing destination and submitting the same
approved URL produced a second live run: all four checks passed, including the
HTTP 200 destination heading and 390px mobile layout. The original submission
and failed run remain in the record. Payment stayed UNFUNDED and capture was
disabled, as expected without buyer authorization.

The PayPal SDK reached its checkout overlay in the in-app browser, but the
popup did not appear there. The owner has been asked to authorize the $5 milestone
in a regular browser with a Personal sandbox account. A hosted capture is still
pending; this checkpoint does not claim one.

All 23 tests passed locally and on Linux, along with lint, typecheck, the staged
production build and isolated HTTP checks. The test launcher now excludes real
developer credentials: previously Prisma's .env loading could select Bedrock in
tests intended for mocks. Quota persistence and rejection tests use the updated
150-call monthly boundary; the 20-call session/day limit remains.

## Hosted PayPal capture checkpoint — October 15, 2026

The owner completed Personal sandbox checkout for a fresh agreement in the
current judge session. The $5 verification milestone became AUTHORIZED.
Submitting the public Northstar URL through the seller view triggered live
Nova browser verification: heading, delivery text, HTTP 200 destination heading,
and the 390px layout all passed. The buyer approval flow then captured $5.

- Agreement: `cmv9ymzyw000qpdrdw9uxrh50`.
- Live verification: `cmv9yqc3y0015pdrdwmrog8wd`, status VERIFIED.
- PayPal capture: `5SF27921LV186002H`.
- Independent read from PayPal Payments v2: COMPLETED, USD 5.00,
  final_capture true, created `2026-10-15T20:00:50Z`.
- App record: RELEASED / CAPTURED; separate $100 handoff remains unfunded.

This verifies the hosted manual approval path with live evidence and actual
sandbox funds. Automatic capture was off for this transaction. The earlier
broken-site/revision run remains a separate agreement; do not describe this
fresh agreement as having gone through that revision sequence.

The previous test agreement was inaccessible after a new judge login, as
expected with session isolation. A fresh agreement was created through the
guided UI rather than recovering or bypassing another workspace's access.
GitHub CI run 38602792656 passed all checks on implementation commit 46aaa5d.

## Judge usability release — October 18, 2026

- 24 isolated regression tests pass on Windows and the Linux host.
- ESLint and TypeScript pass; staged production build and judge HTTP checks pass.
- At 1440px and 390px, inspected the guide, login and funding card. No horizontal
  document overflow on the checked pages.
- The PayPal SDK button appears inside the milestone's next-step card, before
  optional automation. No payment was executed during this UI check.
- Buyer → seller → buyer navigation preserves the chosen milestone; tested with
  the second milestone rather than relying on the first-item default.
- An unavailable agreement gives session-isolation guidance and recovery links.
- Browser results use the current submission, and completed captures no longer
  display the stale pending-approval summary.
- Deployed to the existing Lightsail instance with the persistent database and
  environment unchanged; previous release retained for rollback.


## Permanent accounts — October 19, 2026

- 26 isolated regression tests pass, including additive migration preservation of
  existing agreements, milestones and completed payment receipts.
- ESLint, TypeScript and the production Next.js build pass.
- Legacy judge HTTP checks and the new account HTTP checks pass against the final
  production build with isolated databases and no live provider calls.
- Account checks cover enrollment-code enforcement, cross-origin rejection,
  logout/relogin restoring the same workspace, buyer/seller isolation, private
  invitation requests, buyer approval, seller submission, revocation, old-link
  invalidation, password changes and revocation of other device sessions.
- Browser inspection confirms local account creation and read-only buyer preview
  retaining the second selected milestone.
- Deployed implementation commit 3c111dd to the existing Lightsail instance as
  `accounts-20261019`. All 26 tests, lint, production build, and both isolated HTTP
  suites passed on Linux before the release switch. GitHub CI run 39233322758 passed.
- Backed up SQLite and the environment before applying the additive migration.
  Compared hashes of all pre-existing columns in seven business-data tables:
  all records preserved. Integrity and foreign-key checks pass; the existing
  USD 5 milestone remains RELEASED / CAPTURED with its original capture reference.
- Public HTTPS checks pass: login 200, anonymous account session null, export 401,
  enrollment without a beta code 403, and legacy shared-code login 404. Next.js
  streams the anonymous page redirect in a 200 response; browser inspection
  confirms the final destination is `/login`.
- Inspected hosted sign-in and account-creation screens. Bedrock remains selected,
  PayPal remains sandbox, and the temporary deployment SSH allowance was removed.
  No hosted user account was created during the deployment verification; the
  complete account workflow was exercised against isolated server databases.

## Hosted permanent-account transaction — October 20, 2026

- Created separate buyer and seller test accounts through the hosted registration
  UI. Credentials are local, Git-ignored test artifacts; no PayPal password was
  reused as a Paylock password.
- Buyer created agreement `cmvfoxeq80000pdhhvdvenuy8`, with a USD 5 website
  verification milestone and a separate USD 100 unfunded handoff.
- Seller could not view scope before requesting access. Buyer approved the
  matching test account ID; seller then submitted the buyer-approved website.
- Live planner run `cmvfp2bls000jpdhh6x05ltka` is VERIFIED, with all four browser
  criteria passing and 11 recorded tool steps. Automatic capture was off.
- The in-app PayPal popup did not expose a usable checkout window. An independent
  Orders API lookup found the order already APPROVED and verified that payer and
  payee matched the supplied sandbox accounts. Called Paylock's authenticated
  authorization endpoint to record it. This checkpoint therefore does not claim
  an uninterrupted SDK popup/callback flow in the in-app browser.
- Buyer approved capture through the hosted decision dialog. PayPal Payments v2
  independently confirms receipt `7GP376298T3177443`: COMPLETED, USD 5.00,
  final_capture true, created `2026-10-20T15:48:55Z`. The earlier capture attempt
  was blocked before execution by an approval-review usage limit; retrying after
  the limit cleared produced one completed capture.
- A fresh buyer sign-in restored the same agreement and receipt. Ledger shows
  order, authorization, and completed capture; the USD 100 handoff stays UNFUNDED.
  Evidence packet and sanitized receipt are saved locally under the ignored
  `work/paypal-sandbox/` directory. No real money moved.


## Checkout recovery — October 20, 2026

- Added buyer-only `POST /api/paypal/recover-authorization` and an explicit UI
  recovery control for an already-approved order whose SDK callback was lost.
- Server reads the saved order and verifies ID, intent, single purchase unit,
  milestone reference, currency and amount before authorizing. No capture or
  replacement order is performed. Existing AUTHORIZED/CAPTURED states return
  without another provider mutation.
- All 26 tests, lint, typecheck, production build and both HTTP suites pass.
  Mock-provider regression covers no-order, pending, mismatched amount/reference,
  unrelated buyer, voided order, successful recovery and repeated recovery.
  HTTP checks reject seller, stranger and anonymous callers and practice mode.
- Local UI: recovery renders and reports no checkout without changing the
  unfunded milestone. No additional PayPal transaction or model call was made.
- Hosted activation is pending AWS CLI sign-in. The normal SDK popup/callback
  path still needs a regular-browser check; this is a recovery path, not evidence
  that the in-app browser supports checkout popups.
- Provider contract reference: [PayPal Orders v2](https://developer.paypal.com/api/orders/v2).
