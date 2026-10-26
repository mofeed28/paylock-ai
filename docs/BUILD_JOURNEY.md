# Paylock AI — build journey

This is a factual development log. Entries before the first Git commit are reconstructed from work completed in this session; they are not historical commits. No user conversations, credentials, or personal attachments are included.

## 2026-10-11 — First working prototype

Built a Next.js/React/TypeScript application with Prisma and SQLite. Implemented agreements, milestone planning, seller submission links, structured AI review with conservative fallback, explicit human decisions, PayPal sandbox authorize/capture adapters, and an auditable payment record. Practice mode works without credentials.

The original example was a $900 Shopify optimization project, with four milestones and a clearly labeled prewritten review. Local build, lint, typecheck, 10 tests, and browser workflow checks passed for that version. See VERIFICATION.md for the historical baseline. Actual PayPal and model calls had not been exercised because credentials were not configured.

## 2026-10-11 — Product critique and direction

User feedback: the interface looked scattered. Inspection showed the narrow-panel table clipped titles and required horizontal scrolling. Too many metrics and repeated demo agreements obscured the next action.

The competitive gap was deeper than styling: written seller claims did not establish that a website met its requirements. Chosen direction: one merchant website job, artifact evidence, a missing requirement, revision, buyer approval, and a payment receipt. Keep human control and distinguish automated checks from live AI.

## 2026-10-11 — Focused redesign in progress

- Replace the dashboard table and metric grid with a single next-action panel and responsive agreement cards.
- Keep earlier samples accessible behind a toggle; do not delete user data.
- Reopen the latest walkthrough by default instead of creating duplicate samples.
- Introduce a three-milestone $900 Northstar product page example; its first milestone is $300.
- Parse submitted HTML without executing it or fetching links. Check explicit source requirements for a product heading, purchase link, and delivery note; compute an artifact SHA-256 fingerprint.
- Show a missing delivery note, retain the original submission, and allow a corrected practice submission after the buyer requests revision.
- Label deterministic checks, live AI, and simulated payments distinctly. Source checks cannot prove deployment, browser layout, or checkout functionality.

Status at first repository checkpoint: implementation in progress; redesign tests and browser QA still pending. The historical baseline must not be interpreted as validation of these unverified edits.

## 2026-10-11 — Private repository requested

Created mofeed28/paylock-ai as PRIVATE at the user's explicit request. The hackathon submission eventually requires a public open-source repository. Visibility will stay private unless the owner authorizes changing it.

Repository includes the application, setup instructions, license, automated checks, demo script, submission draft, and this log. Local credentials, databases, build output, and dependency folders are excluded.

## Next milestones

1. Finish redesign tests and responsive browser walkthrough; record actual results.
2. Verify live model behavior and real PayPal sandbox authorize/capture with configured credentials.
3. Validate the use case with target users and document observed feedback.
4. Update the submission description and record a working demo under three minutes.
5. At the owner's direction, publish repository visibility and upload the public video for submission.

## Logging convention

Each meaningful implementation checkpoint gets a descriptive Git commit and a dated log entry with: problem, change, verification, and known limitations. Record outcomes as observed, never as assumed or promised.

## 2026-10-11 — Redesign validated locally

Completed the focused workspace and HTML evidence walkthrough. Added explicit source-check patterns that accept custom product names, link labels, and delivery notes. Unsupported criteria remain AI/manual review. A model recommendation cannot override a failed recognized source check. Corrected an empty-citation validation gap discovered while extending evidence tests.

Validation: ESLint and TypeScript pass; all 16 tests pass; optimized build succeeds. Browser inspection completed at desktop and two narrow widths. The end-to-end practice test produced 2/3 → revision → 3/3 → explicit approval → a $300 simulated receipt. The first visual check exposed a 3px navigation overflow in the narrow panel; a responsive navigation grid fixed it. No user agreements were deleted.

Updated README, demo script, submission draft, and verification record for the current product. Preserved the initial verification as historical evidence. Actual model and PayPal sandbox testing still needs credentials; no claim of connected testing is made.

## 2026-10-11 — GitHub verification passed

GitHub Actions run [38171644616](https://github.com/mofeed28/paylock-ai/actions/runs/38171644616) passed on implementation commit `a8388c7`: clean npm install, migration deploy, lint, typecheck, all 16 tests, and production build on Ubuntu/Node 22. The first checkpoint run failed on an unused import; the validated implementation removed it. The source is now tested on both Windows locally and Linux CI. This entry is a documentation-only checkpoint after the successful run.


## 2026-10-12 — Bounded browser agent implemented and verified locally

The prior source-review workflow did not independently inspect a rendered website. Added an actual function-calling planner with four read-only Chromium tools: product heading, delivery text, purchase destination, and mobile overflow/visibility. Tool outputs feed back into the planner; the five-step loop may stop with a concrete failure or complete all checks. No key is explicitly labeled deterministic; an unavailable or invalid planner becomes fallback, which cannot authorize automatic sandbox capture.

Added immutable buyer-defined verification scope, exact-URL seller submissions, persistent run records and screenshots, automatic revision feedback, and automatic rechecking on resubmission. Payment authority starts off. An explicit 24-hour buyer grant binds one capture to the milestone amount; the payment service rechecks permission, current submission, scope, run freshness, completeness, and payment state. Requests remain serialized in this single-process prototype; revocation is not in-flight cancellation.

Created `/agent` with one focused practice story: a product page whose purchase destination returns 404, then a corrected 200 response. Browser observations and screenshots are computed from actual rendered offline HTML. No model or provider activity is fabricated. The original source demo remains available. Updated the main navigation, seller portal, README, submission draft, and under-three-minute recording script.

Validation: all 21 tests pass, including real Chromium against an isolated SQLite database, permission revocation, stale evidence rejection, original/revised submission retention, and exactly one capture on retry. Mock-model tests verify observation feedback, early finish, and invalid-tool fallback. Private/local IP and URL guards are covered. ESLint, TypeScript, and production build pass. Browser UI verification produced 3/4 → automatic revision → 4/4 → a single $300 simulated capture. All three evidence images loaded. Desktop 1440px and mobile 390px viewport inspection showed no horizontal overflow. See [captured proof](agent-verification.jpg).

Limits: actual live-model and PayPal sandbox end-to-end calls still require credentials. JavaScript is disabled; purchase-destination reachability does not verify transactional checkout. This is one workspace and one process, with no background queue, in-flight cancellation, webhooks, seller payouts, or automatic reconciliation. Run arbitrary public deliveries only within a dedicated OS/container sandbox with outbound restrictions. Repository remains private at the owner's request. Linux CI results for this checkpoint will be recorded after the run completes.

## 2026-10-12 — Linux browser CI environment correction

The first agent CI run, `38214845687`, passed lint, typecheck, and 20 tests but failed the browser workflow because Chromium sandbox startup was blocked by the default Linux runner. Pinned CI to Ubuntu 22.04, whose user-namespace environment supports the sandboxed browser. The application keeps `chromiumSandbox: true`; no test is skipped and sandbox protections are not disabled. Retest pending at this checkpoint.


## 2026-10-12 — Test migration harness corrected

Run `38215048633` confirmed the sandboxed Chromium workflow passes on Ubuntu 22.04. It also exposed an intermittent table-rename failure in the older SQLite test setup. That setup split migration SQL into separate Prisma calls, which does not guarantee connection-scoped PRAGMA state across a migration. Both isolated workflow tests now use the real Prisma migration engine against a new temporary database. No application migration was changed. All 21 tests, lint, and typecheck pass locally after the correction; Linux retest is pending.

## 2026-10-12 — Agent checkpoint passed Linux CI

[GitHub Actions run 38215332691](https://github.com/mofeed28/paylock-ai/actions/runs/38215332691) passed on `8bf0b9a`: dependency installation, migration deploy, lint, typecheck, all 21 tests including sandboxed Chromium, and optimized production build. This verifies the implementation on Windows locally and Ubuntu 22.04 in CI. Live-model and actual PayPal sandbox transactions remain outstanding.

The user selected a new local Paylock workspace. Cloned the same private repository there and preserved local configuration, demo data, and the installed browser runtime. Added `work/` to ignored paths for local dependency caches. No repository visibility change was made.
# October 13, 2026 — sandbox capture and judges-only hosting preparation

The owner completed a PayPal sandbox authorization and manually approved a $200
capture. A subsequent read-only API lookup confirmed COMPLETED/USD 200.00. The
evidence review was a labeled fallback; no live AI success is claimed.

The owner selected Bedrock and a hosted demo only for judges, with a $20/month
budget and region left to implementation judgment. Prepared us-east-1 Lightsail
hosting at the published $12/month 2 GB IPv4 bundle, leaving an allowance for
Bedrock and incidental costs. No paid infrastructure has been created. The
existing AWS profile belongs to another named project, so account/profile choice
and a demo hostname remain pending owner input.

Implemented native Bedrock Converse for structured results and browser tool use,
keeping server-side schema/evidence validation and payment permissions intact.
Judge mode adds signed isolated workspaces, protected seller links, expiry,
persistent monthly/daily AI limits, and an owned-origin browser allowlist. Added
a judge guide, deployment configuration/preflight, and clarified manual-approval
wording when a model was unavailable. Existing local records were preserved.

Validation: 23 tests, lint, typecheck and production build pass. An isolated
production HTTP check verified cross-session protections for buyer mutations,
exports, screenshots, seller content, ledger and dashboard. Bedrock tests use
HTTP doubles; real credentials/model access and a deployed Linux browser still
need verification. The repository remains private.


# October 14, 2026 — Amazon Nova and judge server provisioning

The owner chose the existing AWS account with a separate paylock CLI profile
and requested that Anthropic not be used. Switched the selected model to Amazon
Nova 2 Lite through Bedrock Converse in us-east-1. Live requests generated a
balanced milestone plan, reviewed both text acceptance criteria, and completed
a five-step tool-result loop using synthetic observations. Nova initially
requested parallel tools; an explicit single-tool-per-turn instruction fixed
the observed behavior. Multiple or invalid tool calls still fail closed.

Provisioned a dedicated $12/month Lightsail instance, static IP, restricted SSH
firewall, and scoped Nova-only runtime IAM credential with a December 16 expiry.
State Guard resources are unchanged. The host has Node 22, Caddy, Playwright
and a fresh migrated SQLite database. The first deployment disconnected during
build; the administrator IP changed and the AWS login expired before recovery.
Hosted launch is not yet claimed. Deployment instructions now explicitly install
build-time dependencies even when NODE_ENV is production.

Validation before hosting: all 23 tests, lint and typecheck passed. Live Nova
planning/review used real model calls; the tool loop test used synthetic tool
observations, so it is not evidence of hosted browser success.


# October 14, 2026 — hosted judge workflow verified

Renewed the paylock CLI login and updated SSH to the administrator's current IP.
The Linux build required all dev dependencies and a clean Turbopack cache.
Added scripts/with-env.mjs because Next's build workers rejected propagation of
Node's --env-file flag into NODE_OPTIONS. CI now exercises this launcher.

The production build and isolated HTTP checks passed on the 2 GB Lightsail host.
Caddy serves the access-controlled demo over HTTPS. A hosted live Nova run found
the fixture's broken purchase destination, requested revision, verified the
corrected page, and recorded the buyer-authorized simulated capture. A separate
Nova plan and actual PayPal sandbox order creation also passed. The hosted test
did not approve or capture that PayPal order. The prior USD 200 sandbox capture
remains a separately verified local result.

Verified cross-session read/write and screenshot isolation, localhost-only port
3000, and preservation of the session, agreement, evidence and simulated payment
after restarting the service. Browser inspection found a timestamp hydration
mismatch between server and client timezones; UTC formatting fixes the affected
expiry and activity timestamps. The guide breadcrumb now names the judge demo.

The code repository remains private. Demo access expires December 16; server
billing continues until its instance and attached resources are removed.

Final browser check after the UTC fix: judge guide, saved agreement and new
agreement pages rendered without JavaScript/hydration errors at desktop width;
the judge guide also had no horizontal overflow at 390px.

### October 14 — Make agreement ownership and demo roles clear

User testing showed that requirements, seller submissions and prepared examples
were difficult to distinguish. The main navigation now leads with Your agreements;
browser and text walkthroughs live under Demo & tools. The agreement list no longer
has the large walkthrough banner above the saved work.

The creation form explains that the buyer supplies the brief, edits the AI draft,
and confirms the requirements. Seller email is explicitly contact information,
not an invitation. Each agreement states who set its requirements and who can see
it. Judge sessions get a Try seller view link and a Back to buyer view action on
the submission page. Prepared requirements are labeled as examples; the workflow
no longer implies that a seller has signed or accepted an agreement.

The judge guide explains the buyer → seller → buyer flow and session privacy.
This is still one judge testing both roles, not separate buyer/seller accounts.
Existing workspace authorization and payment controls are unchanged.

Validation: lint and TypeScript passed. The staged Linux production build and
isolated HTTP access checks passed before switching the live release, preserving
the persistent database. Hosted browser checks verified the buyer/seller return
path on the same agreement, desktop pages, and mobile layouts at 390px without
horizontal overflow or JavaScript errors. No new AI calls or payments were needed.

### October 14 — Connect a public deliverable to the sandbox workflow

Added a guided $5 PayPal sandbox website-verification preset and a public test
storefront on the existing server. This path uses actual HTTPS delivery and
preserves the rule that offline fixture evidence cannot verify sandbox payments.
The site starts with a real missing checkout destination; a documented generator
publishes the corrected page. Live Nova requested revision on HTTP 404, then
verified all four checks after resubmission against the corrected site. No
capture occurred without buyer authorization. The embedded browser's PayPal
popup did not open; the remaining buyer step was handed to the owner in a
regular browser. Hosted capture is still unverified.

Increased the global model allowance from 60 to 150 calls after checking AWS
Nova pricing, retaining request/output caps and 20 calls per session/day.
Fixed the test runner so populated developer .env files cannot select a live
provider during automated tests. All 23 tests then passed locally and on the
server, followed by the production build and isolated HTTP checks.

Prepared the submission checklist, hosted recording steps and updated deployment
instructions. Scanned 330 historical Git objects against six known credential
patterns and private-key markers; no matching paths were found. This limited
scan does not substitute for final publication review. The repository remains
private and the video is not yet recorded or published.

### October 15 — Complete the hosted evidence-to-payment flow

The owner authorized the $5 milestone using Personal PayPal sandbox checkout.
In the same judge session, the seller submission triggered live Nova browser
verification of the public storefront. All four checks passed; manual buyer
approval captured USD 5.00. A separate PayPal Payments v2 lookup confirmed
COMPLETED with capture reference 5SF27921LV186002H. The $100 handoff was untouched.

The previous agreement belonged to another isolated session, which explained
why the owner could not find it. Created a fresh agreement through the guided
UI and brought its PayPal button into view. The public repo and public demo
video remain submission tasks; this payment test does not claim delegated
automatic capture or a revision cycle on the fresh agreement.

### October 18 — Make the payment workflow understandable without coaching

The owner could not find PayPal authorization and mistook automatic-payment
permission for funding. Moved the actual PayPal button into a prominent next-step
card, ahead of browser evidence. The card follows the selected milestone through
authorization, seller submission, revision, buyer review, pending capture and
receipt. Optional automation is collapsed and cannot be enabled in the UI until
the milestone is authorized. Existing server payment checks are unchanged.

Added an obvious buyer/seller switch that preserves the selected milestone in
both directions. Completed captures now replace stale approval prompts, and
browser findings are scoped to the current submission. Reworked login and the
judge guide around a concrete broken-link example, while clearly separating
simulated walkthrough payments from the $5 PayPal sandbox path. Login, the guide
and unavailable-page recovery now explain the eight-hour session and new-workspace
behavior; no claim of persistent user accounts was added.

Validation: 24 isolated tests passed locally and on Linux, including payment
permissions, idempotency and workspace isolation. Local browser checks covered
desktop and 390px layouts, the visible funding control, unavailable-agreement
recovery and milestone-preserving role switches. The initial restricted local
Chromium launch failed; the same suite passed with normal process permissions.

The staged Linux production build and isolated HTTP checks passed before the
release switch. Live desktop/mobile inspection confirmed the new guide and
visible PayPal funding card. No additional PayPal authorization, capture, or
paid model call was needed for this UI release. The existing October 15 capture
remains the verified payment checkpoint.


### October 18 — Replace disposable access with permanent accounts

The owner asked for a usable product beyond eight-hour judge sessions. Added an
optional permanent private-beta account mode with Better Auth, durable account
workspace IDs, password changes and revocable database sessions. Existing judge
agreements and payment receipts remain untouched; unverified emails cannot claim
them. No domain or email sender exists yet, so the UI is explicit that email
verification and password-reset mail are unavailable.

Seller participation now uses an expiring invitation, a signed-in access request,
and explicit buyer approval of that account ID. Invitation holders cannot read
the agreement before approval. The approved seller has a persistent inbox and
submission permissions; buyer preview is read-only and retains the milestone.
Revocation invalidates the invitation without removing delivered work. Existing
PayPal sandbox and AI budget safeguards remain in force. See ACCOUNTS.md for the
rollout and remaining commercial-production requirements.


October 19 validation: all 26 tests, lint, typecheck, production build and both
account/judge HTTP suites pass locally and in the staged Linux release. Deployed
implementation commit 3c111dd to the existing Lightsail instance on October 19.
An online SQLite backup and hash comparison of every pre-existing column in all
seven business-data tables verified preservation of 8 agreements, 20 milestones,
8 submissions, 10 payment events, 33 timeline events, 7 agent runs and 5 usage rows.
The existing USD 5 captured milestone remains intact. No old account, agreement
or receipt has been silently reassigned.

Hosted account creation and sign-in are visible over HTTPS. Anonymous access to
private pages redirects to login, protected exports return 401, enrollment without
the beta code returns 403, and the legacy shared-code login returns 404. The
existing Bedrock and PayPal sandbox configuration is preserved. Restored the
original SSH firewall allowlist after deployment; the previous release and a
restricted database/environment backup remain on the host for rollback. No new
cloud resources, paid model calls or payment captures were needed for this release.

### October 20 — Verify a payment across permanent buyer and seller accounts

Created dedicated hosted test accounts and exercised the private invitation flow:
seller requests access, buyer approves the exact account, seller submits evidence,
live AI checks all four website requirements, and the buyer approves a USD 5
PayPal sandbox capture. Fresh sign-in preserved the workspace and receipt.
Independent PayPal verification confirms capture `7GP376298T3177443` is COMPLETED.
The USD 100 second milestone remains unfunded. Test credentials and evidence
exports are kept outside Git in the ignored local test folder.

The in-app checkout popup was not usable, so after independently verifying the
already-approved order's payer, merchant and amount, the normal authenticated
Paylock API recorded authorization. The later capture completed through the UI.
This is a verified account/evidence/payment integration test; the popup/callback
experience still needs a separate regular-browser regression check.


### October 20 — Recover an approved checkout inside Paylock

Added an explicit recovery action beneath the PayPal button for a lost SDK
callback. It reads only the current buyer's saved order, verifies its ID,
AUTHORIZE intent, single purchase unit, milestone reference, USD amount and
approval status, then uses the existing idempotent authorization path. It never
creates another order or captures payment. No-order and pending-approval states
have clear messages; mismatches and unsupported states leave balances unchanged.

All 26 regression tests, lint, typecheck, production build and both HTTP suites
pass. Additional assertions exercise mismatched amount/reference, foreign
workspace access, unapproved/voided orders, duplicate recovery, and seller/
anonymous route rejection. Local UI inspection verifies the recovery control
and no-order message. The initial build's Prisma regeneration hit a Windows DLL
lock from the existing preview; building with the unchanged generated client
succeeded. This change
recovers completed PayPal approvals; it does not claim to fix popup support in
the in-app browser or complete the regular-browser SDK regression check.

### October 21 — Deploy and verify checkout recovery

Deployed implementation commit `d5178ea` to the existing Lightsail host after
AWS sign-in was refreshed. All 26 tests, lint, production build and both HTTP
suites passed on Linux. Backed up the database and environment before switching
releases; hashes across seven business tables confirm existing records survived.
The previous release remains available for rollback. No firewall changes or new
cloud resources were needed.

Verified the hosted buyer session and original USD 5 receipt survived the update.
On the unfunded USD 100 milestone, the new recovery button correctly reports
that no checkout exists and leaves funds unchanged. Public HTTPS and anonymous
access checks pass; Bedrock and PayPal sandbox remain configured. No extra
payment or model call was needed. Regular-browser SDK popup/callback verification
remains outstanding.

### October 21 — Connect independent sellers to PayPal

Added a permanent-account PayPal connection panel, consent-based Partner Referrals
v2 onboarding, server-verified connection status, and seller-routed sandbox orders.
Recipients are pinned before order creation and checked before authorization and
capture. Old agreements preserve their original merchant integration and receipts.
New agreements block payments until the approved seller is ready; they cannot
silently fall back to the platform merchant.

The current merchant app's read-only capability check returned 403 NOT_AUTHORIZED
with no partner scopes. A separate Sandbox Platform app is required. Prepared an
ignored local credential template and documented setup in PAYPAL_SELLERS.md.
External seller onboarding and a seller-routed sandbox capture remain pending
those credentials. All 27 tests, lint, typecheck, production build and both HTTP
suites pass locally. A Windows build-cache reset resolved a cached compiler error.

Deployed `0efb85e` as `sellers-20261021`; the same checks passed on Linux before
switching. Backups and hash comparisons preserved eleven existing tables,
including permanent accounts, active sessions and receipts. Hosted Account now
shows the PayPal connection panel and its truthful awaiting-platform-setup state.
Restored the original SSH allowlist after deployment. No new payment or model
call was made; real seller onboarding is still awaiting Platform credentials.

### October 21 — Activate the sandbox Platform app

Validated the newly supplied credentials without logging their values. OAuth
includes Partner Referrals and merchant-integration permissions; a nonexistent
tracking lookup returns 404 instead of the original app's authorization failure.
Activated the four Platform settings in the hosted environment and ignored local
configuration, preserving the original merchant credentials and legacy receipts.
Restarted the app and verified HTTPS, database integrity, access boundaries and
the existing USD 5 capture. Restored and verified the original SSH allowlist.

Signed in as the saved test seller and verified Account now offers Connect PayPal.
Browser approval review requires action-time confirmation before starting the
permission flow, so no referral, seller grant or additional payment was created.
Real onboarding and seller-routed capture remain pending. Secrets stay ignored.

### October 21 — Correct real PayPal referral ID handling

After the user confirmed starting seller onboarding, PayPal returned a referral
that exposed an overly restrictive ID validator. Its documented Base64 IDs can
contain plus, slash and padding characters. Updated parsing to validate the
sandbox API origin, decode once, accept the bounded ID character set, and encode
the entire ID as one path parameter when reusing it. Regression coverage now
includes raw and encoded IDs, foreign origins, query strings and double encoding.
All 27 local tests and lint pass; the first restricted test run could not launch
Chromium, and its permitted rerun passed. No credentials are included in Git.

Deployed the fix as `referral-20261021` after all server tests, lint, production
build and both HTTP suites passed. Existing record hashes and the legacy USD 5
receipt remain intact; the temporary SSH rule was removed. Real onboarding now
redirects to PayPal, and the saved test seller successfully signs in. Paused at
the final permission grant because PayPal lists broader payment/refund/data
permissions than the connection-reference consent. No new payment was made.

### October 21 — Verify the connected sandbox seller

With the user's explicit approval, submitted PayPal's Allow action for the saved
sandbox seller. PayPal then offered additional profile completion. Without
submitting any new identity information, ran Paylock's Check connection: both
server-side merchant lookups passed ownership and permission checks, and the
hosted account now shows Connected for sandbox payments. This verifies the actual
merchant-status payload, confirmed email, payment eligibility and platform
authorization/capture scope. No transaction was initiated; a new seller-routed
authorization and capture remain the next end-to-end check.

### October 25 — Make seller invitations discoverable and repair the inbox

The user reported that a newly addressed agreement never appeared in the seller
inbox, alongside broken card rendering. The old inbox selected only already
approved sellers; the email field was contact-only. Links styled as cards also
remained inline elements around block content, producing fragmented backgrounds.

Added separate Invitations and Your work sections, block card containers with
explicit action links, pending-approval states, a compact PayPal status summary,
the signed-in email and a correct Seller workspace navigation label. The agreement
form now explains which email to use and that buyer approval is required.

Matching a seller email (case-insensitive, trimmed) discovers only an opaque
invitation. Because emails are not yet verified, no title, buyer identity, scope,
budget or evidence is exposed before buyer approval. Existing invitation-link
requests stay visible too. Expired, self-owned and differently assigned
invitations are excluded. This also makes existing eligible agreements visible
without recreating or changing them. No email delivery is claimed.

All 28 tests, lint and the production build pass. Desktop and 390px mobile
previews with synthetic new, pending and approved work show intact cards and no
horizontal overflow. During validation, npm reported critical Next.js advisories;
updated Next.js from 16.4.0 to 16.4.3. A separate high-severity Zod advisory remains
and requires a reviewed major-version migration. AWS deployment authentication
expired; the hosted rollout is pending the user's refreshed sign-in.

After the user refreshed AWS sign-in, deployed `0af6661` as `inbox-20261025`.
All 28 tests, lint, production build and both HTTP suites passed on Linux before
switching. Backups and row hashes preserved twelve tables, including all eleven
agreements and both PayPal connections. No firewall change was needed.

Signed in as the saved seller on the hosted site and verified one new October 25
invitation appears beside the previously approved Northstar agreement. The
connected-PayPal banner remains correct. No access request, buyer approval or
payment was submitted. Public HTTPS, database integrity, anonymous boundaries
and the existing USD 5 receipt pass. Hosted screenshot capture was unavailable;
the rendered accessibility tree verified the live content, with desktop/mobile
layout screenshots retained from the isolated preview.


## 2026-10-26 — Invite once, seller accepts

Removed the seller-request / buyer-reapproval cycle. A buyer now selects the
seller's permanent account ID, obtained directly from the seller and matched to
the agreement's Paylock email. The seller accepts or declines in their inbox;
acceptance immediately grants seller access. The old approval endpoint no longer
grants access. Account pages include a copy-ID control, and the agreement form
can target the seller at creation or leave recipient selection until afterward.

No email-verification provider exists, so unverified email and invitation links
alone still cannot grant access. Legacy email-only invitations ask for account
identification; existing assigned sellers retain access. Revocation rotates the
link and preserves work/payment records. Accepting is separate from PayPal
connection, funding and payment approval.

Validation: all 28 isolated tests passed, including the browser-agent flow.
Account HTTP checks passed with wrong-account rejection, concurrent acceptance
idempotency, submission gating and revocation; judge HTTP isolation also passed.
Local Turbopack's CSS worker failed to start, so the local production build used
Next's webpack builder and passed TypeScript. The deployment gate will also run
the normal Turbopack build and both HTTP suites on Linux before switching.


## 2026-10-26 — Seller acceptance deployed

Commit `deb63e1` deployed to `/opt/paylock/releases/invite-20261026` after all
28 Linux tests, lint, normal Turbopack production build/TypeScript, and both HTTP
suites passed. Backup: `/var/backups/paylock/invite-20261026`.
Hashes/counts of all 12 existing data tables were unchanged across the switch:
11 agreements, 29 milestones, 10 submissions, 13 payment events, 42 timeline
events, 8 agent runs, 8 quota rows, 5 users, 8 sessions, 5 auth accounts,
2 seller access rows and 2 PayPal connections.

Read-only post-deployment checks passed for HTTPS, account boundaries, database
integrity, Bedrock/PayPal sandbox configuration and a preserved USD 5 receipt.
The signed-in hosted seller inbox shows the new acceptance wording, retains
existing work and the connected PayPal state, and labels the existing email-only
invitation as needing an account ID. No actual invitation was accepted or
payment submitted during this deployment. The local synthetic preview showed
Accept invitation / Decline controls; duplicate acceptance was tested through
isolated HTTP fixtures.


## 2026-10-26 — Reduce workspace clutter

Replaced the crowded shell with Buying, Selling and Payments navigation, one
account entry and collapsed demo tools. Removed repeated role descriptions,
fictitious profile initials and promotional sidebar content. Rebuilt the seller
home as compact invitation rows followed by a work list with progress, amount
and one primary action. Connected PayPal is a small status link; invitation
identity instructions live in an expandable help section. Shortened the seller
acceptance page and made the account ID easier to copy and read.

Validation: production webpack build/TypeScript and both existing HTTP suites
passed. Desktop (1280px) and phone (390px) were inspected in the browser. Phone
content fits without horizontal overflow; navigation, work actions and expandable
invitation details remain usable. No authorization or payment logic changed.


## 2026-10-26 — Simplified UI deployed

UI commit `b9f5949` is live at `/opt/paylock/releases/ui-20261026`. Linux passed
all 28 tests, lint, the normal production build/TypeScript and both HTTP suites.
The deployment backed up the database and environment under
`/var/backups/paylock/ui-20261026`; all 12 existing table hashes were preserved.
Read-only HTTPS/authentication checks and the saved USD 5 receipt passed after
the switch. No payments, invitations or access grants were changed by UI testing.
