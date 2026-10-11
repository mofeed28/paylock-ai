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
