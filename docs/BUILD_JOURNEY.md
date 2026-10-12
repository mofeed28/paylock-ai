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
