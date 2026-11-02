# Devpost submission draft

## Project name

Paylock AI

## Tagline

Turn a freelance brief into clear milestones, verifiable delivery evidence, and buyer-controlled PayPal payments.

## Inspiration

Small ecommerce teams hire specialists for high-impact deliverables—like product pages, audits, and launch handoffs—but "done" is often undefined. Payment disputes usually start days earlier with an ambiguous brief or a page that looks finished on the surface while a purchase link is broken underneath. We built Paylock AI so the agreement scope, the delivery evidence, and the PayPal payment decision live in one verifiable record.

## What it does

Paylock AI connects milestone agreements, AI and browser evidence verification, and PayPal delayed-capture payments:

1. **Draft measurable milestones:** The buyer describes a fixed-scope project and budget. Amazon Nova 2 Lite drafts 2–5 milestones with concrete acceptance criteria, risk flags, and an exact-cent payment split that the buyer can edit before saving.
2. **Invite and connect the seller:** In permanent-account mode (`AUTH_MODE=accounts`), the buyer invites a specific seller account (`sellerAccountId` + email match). The seller accepts once in their inbox and connects their PayPal Business sandbox account through **PayPal Partner Referrals v2**. Paylock verifies referral ownership, primary email confirmation, `payments_receivable`, and `THIRD_PARTY` `AUTHORIZE`/`CAPTURE` grants before pinning the seller's `merchantId` to the milestone. (A single-session judge mode is also supported for side-by-side role switching.)
3. **Authorize per-milestone funds:** The buyer authorizes each milestone through the PayPal JS SDK (`Orders v2` with `intent: AUTHORIZE`). If a browser popup callback is interrupted, Paylock's server-side recovery endpoint (`POST /api/paypal/recover-authorization`) reconciles the buyer's saved order directly with PayPal—or resets an expired unapproved order (`HTTP 404`) so the buyer can start a fresh checkout without unpinning the seller recipient.
4. **Verify submitted work with AI and browser tools:**
   - **Website verification agent:** For deployed website milestones, an AI planner (`us.amazon.nova-2-lite-v1:0` via Amazon Bedrock Converse) selects from four read-only Playwright Chromium tools (`inspect_heading`, `inspect_delivery`, `test_purchase_link`, `inspect_mobile` at 390px). When the agent catches a broken purchase destination (`HTTP 404`), it records screenshots and tool traces, requests a concrete revision, and keeps the PayPal authorization uncaptured. When the seller submits the corrected page, the agent re-verifies all four checks.
   - **Written & HTML source review:** For written deliverables and HTML snippets, `node-html-parser` deterministically evaluates heading, HTTPS purchase-link, and delivery-note rules (stripping scripts, comments, and hidden nodes and recording a SHA-256 fingerprint), while live AI evaluates custom criteria and quotes supporting excerpts.
5. **Release funds under explicit buyer control:** The AI never holds a payment tool. Capture (`Payments v2`) executes only when the buyer manually approves release with a decision note, or when the buyer has pre-enabled a 24-hour, exact-amount auto-capture policy and a fresh live-planner browser run passes every check. Every order, authorization, and capture is persisted in an auditable ledger and downloadable JSON evidence packet.

## How we built it

- **Frontend & Application Server:** Next.js 16 App Router, React 19, TypeScript, Tailwind CSS, and Radix/shadcn-style UI primitives.
- **Database & Concurrency:** Prisma 6.12 + SQLite with integer USD cents throughout and an in-process serialized mutation queue (`src/lib/locks.ts`) paired with deterministic `PayPal-Request-Id` SHA-256 idempotency keys.
- **PayPal Integration:**
  - **Orders v2 (`AUTHORIZE`) & Payments v2 (`Capture`):** Each milestone creates a bound `AUTHORIZE` order verified for exact currency, cent amount, `reference_id`, and payee `merchant_id` before recording authorization or capture.
  - **Multiparty Seller Routing (`Partner Referrals v2` & `Merchant Integrations v1`):** Sellers onboard via `/v2/customer/partner-referrals` (`PPCP` + `PAYMENT` + `PARTNER_FEE` with `AUTHORIZE`/`CAPTURE` permissions). Server-side calls to `/v1/customer/partners/{partnerId}/merchant-integrations` verify merchant readiness, and seller-routed checkout/capture requests authenticate using an unsigned JWT `PayPal-Auth-Assertion` header and `PayPal-Partner-Attribution-Id`.
- **AI & Browser Verification:**
  - **Amazon Bedrock Converse (`us.amazon.nova-2-lite-v1:0`):** Native Converse API integration (`src/lib/model.ts`) for structured JSON milestone generation, criterion-by-criterion evidence review with verified substring citations, and multi-step browser tool selection (with an optional OpenAI-compatible adapter).
  - **Playwright Chromium & Network Guardrails:** Read-only browser context with JavaScript disabled, same-origin enforcement, public-IP DNS validation, and Chromium `--host-resolver-rules` DNS pinning (`src/lib/agent-network.ts`) to prevent SSRF or DNS rebinding.

## What makes it different

Paylock AI links three stages that are usually disconnected: the acceptance criteria agreed before work starts, the rendered or source evidence inspected after delivery, and the exact PayPal authorization/capture transition. Instead of giving an LLM unconstrained payment authority or an opaque confidence score, Paylock separates **observation** (AI planner + Playwright/HTML tools) from **authorization** (deterministic server-side policy + PayPal Orders/Payments v2).

## What we learned

- **Evidence must precede model opinion:** Early iterations relied on prewritten demo fixtures and broad layout tables. We redesigned the workspace around the buyer's next decision, replaced static sample scores with computed `node-html-parser` and Playwright checks, and ensured deterministic checks always take precedence over model claims.
- **Resilient payment state machines matter:** Real browser checkouts can lose popup callbacks or leave unapproved orders overnight. Adding server-side order verification, lost-callback authorization recovery (`POST /api/paypal/recover-authorization`), expired unapproved order reset, and pending-capture reconciliation made the PayPal integration reliable under real network conditions.
- **Strict recipient pinning for multiparty payments:** When moving from a single merchant to seller-routed payments via Partner Referrals v2, pinning `payeeMerchantId` and `payeeUserId` before the provider call prevents a seller swap or lost response from ever misrouting funds.

## Scope & security guardrails

- **Sandbox authorization & delayed capture (not regulated escrow):** Paylock uses PayPal Sandbox `Orders v2` (`AUTHORIZE`) and `Payments v2` (`Capture`) with simulated test funds. Authorizations last up to 29 days (with best capture reliability in the first 3 days). Reauthorization of expired holds, voids, refunds, and signed webhooks are outside MVP scope.
- **Read-only browser inspection:** Playwright inspects buyer-approved public HTTPS URLs with JavaScript disabled and no credentials or form submissions. A reachable purchase destination confirms the link target, not a live storefront checkout.
- **Labeled fallbacks:** If an AI provider is unconfigured or unreachable, Paylock uses a clearly labeled deterministic fallback (`score: 0` for text reviews; never auto-captures in sandbox). Provider errors are surfaced directly and never substituted with simulated payments.

## What's next

- Signed PayPal webhook listeners (`PAYMENT.AUTHORIZATION.CREATED`, `PAYMENT.CAPTURE.COMPLETED`) for asynchronous background reconciliation.
- Authorization void, reauthorization, and partial-refund workflows for disputed milestones.
- Containerized worker isolation for Playwright browser verification runs and transactional email delivery for account verification.

## Built with

Next.js, React, TypeScript, Tailwind CSS, Prisma, SQLite, Better Auth, PayPal JS SDK, PayPal Orders v2, PayPal Payments v2, PayPal Partner Referrals v2, PayPal Merchant Integrations v1, Amazon Bedrock Converse, Amazon Nova 2 Lite (`us.amazon.nova-2-lite-v1:0`), OpenAI-compatible Structured Outputs, Playwright, node-html-parser, Zod, Lucide.

## Current verification status — 2026-11-02

- **Automated test suites:** 28 unit and workflow tests (`npm test`) plus two end-to-end production HTTP suites (`scripts/verify-judge-http.mjs` and `scripts/verify-accounts-http.mjs`), ESLint (`npm run lint`), TypeScript (`npm run typecheck`), and production build (`npm run build`) all pass.
- **Verified live PayPal Sandbox & Amazon Bedrock transactions (see [`docs/VERIFICATION.md`](VERIFICATION.md)):**
  1. **Local sandbox authorization & capture:** `$200.00` capture `9D99696660319874E` independently read back from PayPal as `COMPLETED`.
  2. **Hosted website verification & capture (October 15, 2026):** Live Amazon Nova 2 Lite (`us.amazon.nova-2-lite-v1:0`) verified all four public storefront requirements on the HTTPS Lightsail deployment (`https://paylock-demo.52.202.219.38.sslip.io`), followed by `$5.00` PayPal sandbox capture `5SF27921LV186002H` (`COMPLETED`).
  3. **Permanent accounts & seller acceptance (October 22–26, 2026):** Deployed Better Auth permanent accounts (`AUTH_MODE=accounts`), targeted seller invitations, and `$5.00` sandbox capture `7GP376298T3177443` (`COMPLETED`).
  4. **Multiparty seller-routed Partner Referrals v2 capture (October 29, 2026):** Connected seller merchant `LTJFUUKVMGAPQ` via Partner Referrals v2, created seller-routed `$5.00` order `8SH70367BS353615E`, recovered buyer authorization `1TF68141PB3279455`, exercised a live Bedrock Nova 2 Lite revision-and-approval cycle on agreement `cmvtqkbvx000apdeyixan2dzu`, and captured `$5.00` (`7JF45713HK321441W`, `COMPLETED`, net `$4.53` after `$0.47` sandbox fee) directly to the connected seller merchant.
