> Development status: private hackathon build. The focused website walkthrough is being refined; historical verification is separated from current changes in [the build journey](docs/BUILD_JOURNEY.md). Real PayPal sandbox and live-model verification remain outstanding.

# Paylock AI

**Work agreed. Evidence reviewed. Payment earned.**

A working PayPal AI Hackathon MVP for small freelance projects: turn a brief into measurable milestones, collect evidence, inspect an AI review, and capture a PayPal sandbox authorization only after a buyer decision.

This repository is a **single-workspace prototype**, not a regulated escrow service or a production marketplace. Practice mode is usable without any external credentials. The connected sandbox path requires your own PayPal and model credentials.

## Run locally

Requirements: Node.js 22 LTS recommended (20.12+ supported), npm, internet for dependency installation.

```bash
npm install
cp .env.example .env
npm run db:migrate -- --name init
npm run dev
```

On Windows PowerShell, replace `cp .env.example .env` with `Copy-Item .env.example .env`.

Open **http://127.0.0.1:3000**. Choose **Try the $900 demo**, or visit `/demo` and launch a fresh sample. No API keys are necessary for practice. SQLite data persists across restarts in `prisma/dev.db`. The included migration is versioned; `npm run db:deploy` applies it without creating a new migration. A small bootstrap script creates an empty SQLite file if needed for Prisma's Windows engine; it never overwrites existing data.

For a production-mode local run:

```bash
npm run build
npm start
```

## Try the complete workflow

1. Load the demo: four milestones totaling $900. The $200 audit has a practice authorization, sample evidence, and a clearly labeled prewritten review.
2. Read the criteria, seller submission, and evidence checklist.
3. Approve release with a decision note and explicit confirmation. The ledger gains one practice capture; the balance and progress update.
4. Select another milestone, simulate authorization, then open its seller portal.
5. Submit evidence. With a model key configured, the app runs AI review; otherwise it reports a conservative fallback, with no invented passing score.
6. Request a revision. The seller sees feedback and can resubmit. Open a dispute to block release, then resolve it to request a new submission.
7. Download an evidence packet from the agreement or payment ledger.

Create your own agreement at `/agreements/new`. Generate a draft, edit milestone titles, amounts, descriptions, dates, and criteria, then save. The budget must balance to the cent. Saved scope is immutable in this MVP: create a new agreement for a materially changed scope.

## How it uses PayPal

PayPal is the payment state transition, not a decorative checkout link:

```
Buyer checkout → Orders v2 AUTHORIZE → saved authorization ID
Seller evidence → AI recommendation → human decision
Buyer release → Payments v2 capture → saved capture ID → released milestone
```

Each milestone has a separate order. The server chooses the amount and currency from the database, binds the order to that milestone, verifies authorization/capture amounts, and uses stable `PayPal-Request-Id` values. A pending capture does not mark work paid: the buyer checks provider status before completion. Repeated capture requests return the stored result.

### PayPal sandbox setup

1. At [PayPal Developer Dashboard](https://developer.paypal.com/dashboard/), create a REST app in **Sandbox**. Use its business account as the receiving merchant.
2. Create or use a separate **personal sandbox buyer** account for checkout. Do not use production credentials or real payment details.
3. Set in `.env`:

```dotenv
PAYMENT_MODE="sandbox"
PAYPAL_ENV="sandbox"
PAYPAL_CLIENT_ID="your-sandbox-client-id"
PAYPAL_CLIENT_SECRET="your-sandbox-secret"
NEXT_PUBLIC_PAYPAL_CLIENT_ID="the-same-sandbox-client-id"
```

4. Restart the app (rebuild when using `npm start`). `/settings` checks whether credentials are configured; it does **not** claim provider connectivity has been tested.
5. Create a **new agreement**. Existing practice agreements remain practice. Authorize a milestone with the PayPal JS SDK button, logging in as the personal sandbox buyer.
6. Submit work via the seller link, review it as buyer, approve release, and inspect the sandbox capture ID in Activity or the ledger. Confirm it in the merchant sandbox account.

Endpoints:

| Endpoint                           | Action                                                      |
| ---------------------------------- | ----------------------------------------------------------- |
| `POST /api/paypal/create-order`    | Create an AUTHORIZE order from a milestone ID               |
| `POST /api/paypal/authorize-order` | Verify the bound order and persist its authorization        |
| `POST /api/paypal/capture-order`   | Capture or reconcile a pending capture after buyer approval |

PayPal requests only target `api-m.sandbox.paypal.com`. Provider failures are surfaced; they never silently become practice payments. Successful order, authorization, and capture responses are stored in `PaymentEvent.rawJson`. Secrets remain server-side; the public client ID is intended for the JS SDK. The browser-visible evidence export omits seller bearer tokens and raw provider payloads.

**Payment limitations:** this is authorization/capture, not true escrow or payouts. Capture settles to the configured merchant; `sellerEmail` does not route funds to arbitrary sellers. Authorizations last up to 29 days, with the best capture success during the first three days. The app enforces an expiration date even in practice; reauthorization, voids, refunds, webhooks, multi-merchant onboarding, and automatic reconciliation are not implemented. An internal dispute only blocks Paylock release; it is not a PayPal case and does not extend a hold. A terminal failed capture needs operator reconciliation; the app conservatively keeps it blocked.

Reference: [PayPal authorize and delay capture](https://developer.paypal.com/checkout/delay-capture/).

## How it uses AI

Two structured JSON prompts in `src/lib/ai.ts`:

- `generateAgreementMilestones`: translates the brief into 2–5 deliverables, measurable acceptance criteria, due dates, risk notes, and an exact-cent payment split.
- `reviewSubmission`: compares submitted text against every criterion, returns a score, release/revise/dispute recommendation, supporting excerpts, and risk flags.

Set `OPENAI_API_KEY` and `OPENAI_MODEL` in `.env`. The default model is `gpt-4o-mini`; choose a model your account supports with Chat Completions strict JSON-schema outputs. `OPENAI_BASE_URL` supports compatible providers with that same contract. Restart after changes. Prompt and response validation use Zod, with JSON schema sent to the model. The server rejects incomplete checklists and downgrades passing evidence citations that do not match submission text. Model output cannot call payment functions.

No key, refusal, timeout, malformed JSON, wrong total, or invalid dates: use a **labeled deterministic fallback**. Fallback agreement templates remain editable; fallback reviews score 0 and ask for human verification. The sample demo's 92/100 score is a **prewritten fixture**, never represented as a live inference. A buyer may still manually approve after checking the evidence and providing a decision note.

Seller text is treated as untrusted input. External URLs are displayed but not fetched. Text evidence is not independent verification of completion, and the model is not a dispute arbitrator. These constraints are displayed in the product.

Reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat).

## Architecture and access

- Next.js App Router + TypeScript; Tailwind CSS and local shadcn-style Button primitive using Radix Slot/CVA.
- Prisma 6.12 + SQLite, with versioned SQL migration. Integer USD cents throughout.
- Consistent route-handler API in `src/app/api/[...path]/route.ts`; domain operations in `src/lib/service.ts`.
- Buyer reads check access at the data boundary; buyer mutations check access before execution.
- Localhost has frictionless demo access. Set `BUYER_ACCESS_KEY` to require an 8-hour HMAC-signed, HttpOnly buyer cookie. Seller access uses an unguessable 256-bit bearer link, scoped to one agreement.
- Same-origin mutation checks, bounded inputs, a basic in-memory request limiter, no token in exported packets, and `Referrer-Policy: no-referrer`.
- SQLite mutations are serialized within one Node process, including provider requests. Stable PayPal request IDs provide provider-side retry protection. This is not a multi-instance transactional outbox.

Run one Node process only. For hosting, use a Node host with persistent disk, TLS, `BUYER_ACCESS_KEY`, the correct `APP_URL`, and a private demo audience. Bind explicitly to the host-required interface if needed. Do not expose an unauthenticated localhost setup through a proxy. The local Node/Prisma/SQLite architecture is not packaged as a Cloudflare Sites Worker. No hosted deployment is included.

Before real production: add per-user identity, merchant onboarding, durable job queues and locks, webhook verification/reconciliation, authorization refresh/void/refund flows, durable rate limits, seller-token revocation, retention policy, and an independent security review. Do not use this prototype for real funds.

## Verify

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Tests cover cent conservation, date and URL validation, prompt-injection fallback, model citation checks, serial mutation behavior, and an isolated SQLite workflow: revision, seller authorization, dispute blocking, reopening, capture idempotency, and expiration. The same workflow exercises PayPal HTTP contracts with a mocked provider, including pending capture reconciliation. Those tests do not replace an actual sandbox checkout.

See [verification notes](docs/VERIFICATION.md), [demo script](docs/DEMO_SCRIPT.md), and [submission draft](docs/DEVPOST.md).

## Hackathon submission

The [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) calls for a working PayPal + AI prototype, a public licensed repository, and a public YouTube demo under three minutes. The listed deadline is November 12, 2026, 12:00pm PST (22:00 Israel time). Recheck Devpost before submitting.

This codebase includes an MIT license, lockfile, migration, environment template, tests, and a video script. Before submission, connect and demonstrate **real PayPal sandbox + a real model**, publish the repository, add the repository license to its About section, record the working flow, and complete the Devpost form. Practice mode alone is a rehearsal and does not demonstrate the required integrations.

## License

MIT. See [LICENSE](LICENSE). UI icons are Lucide (ISC); third-party dependencies retain their own licenses. No PayPal logo assets, stock photos, or copyrighted demo music are included.
