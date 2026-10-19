> Development status: private hackathon build. PayPal sandbox authorization and a $200 capture have been exercised; the capture was independently read back as COMPLETED. Amazon Nova 2 Lite has passed live Bedrock planning, evidence-review and tool-result checks. The protected judge demo is hosted on Lightsail with HTTPS; live Nova browser verification, revision, simulated capture and hosted PayPal sandbox order creation have been exercised. See [the build journey](docs/BUILD_JOURNEY.md).

# Paylock AI

**Work agreed. Evidence reviewed. Payment earned.**

A working PayPal AI Hackathon MVP for small freelance projects: turn a brief into measurable milestones, collect evidence, inspect an AI review, and capture a PayPal sandbox authorization after manual approval or an explicit, time-limited buyer policy.

This repository is a **single-merchant private beta with optional permanent accounts**, not a regulated escrow service or a production marketplace. Buyers own persistent workspaces and explicitly approve seller access. Legacy isolated judge sessions remain available. Practice mode is usable without external credentials; the connected sandbox path requires PayPal and model credentials.

See [permanent accounts and seller invitations](docs/ACCOUNTS.md) for setup, access rules and remaining production-launch requirements. Email verification and password-reset mail need a sender before open enrollment.

## Run locally

For the protected, budget-limited hosted demo, see [Judge deployment](docs/JUDGE_DEPLOYMENT.md).
`AI_PROVIDER=bedrock` selects native Bedrock Converse for both structured reviews
and the browser tool loop. Set `AWS_REGION`, `BEDROCK_MODEL_ID`, and a dedicated
`AWS_BEARER_TOKEN_BEDROCK` or SDK credentials; no OpenAI key is needed in that mode.
The model must support forced tool use. Provider settings alone do not prove access.
The current $20/month deployment plan is a $12 Lightsail instance in us-east-1
with the remaining allowance reserved for capped Bedrock use and incidental costs.

Requirements: Node.js 22 LTS recommended (20.12+ supported), npm, internet for dependency installation.

```bash
npm install
npx playwright install chromium
cp .env.example .env
npm run db:deploy
npm run dev
```

On Windows PowerShell, replace `cp .env.example .env` with `Copy-Item .env.example .env`.

Open **http://127.0.0.1:3000**. Visit `/agent` and choose **Try the browser agent**. The older HTML-source walkthrough remains at `/demo`. It reopens the latest sample; the expandable restart section creates a fresh walkthrough when needed. No API keys are necessary for practice. SQLite data persists across restarts in `prisma/dev.db`. The included migration is versioned; `npm run db:deploy` applies it without creating a new migration. A small bootstrap script creates an empty SQLite file if needed for Prisma's Windows engine; it never overwrites existing data.

For a production-mode local run:

```bash
npm run build
npm start
```

## Browser agent workflow

1. Open `/agent` and start the Northstar sample. It has a $300 verification milestone and a $100 manual handoff milestone. The first payment is authorized in practice mode.
2. Optionally check the explicit authorization box and enable one $300 simulated capture for 24 hours. Automatic capture starts **off**.
3. Run browser verification. Chromium renders the actual offline sample HTML; its purchase destination returns HTTP 404. The agent records screenshots and observations and requests a revision. No payment is captured.
4. Choose **Submit corrected page & recheck**. The corrected destination returns HTTP 200. All four requirements are inspected again.
5. With valid buyer permission, Paylock records one simulated capture. With permission off or revoked, the passing result waits for manual approval. Inspect the tool activity, screenshots, original submission, and ledger.

Without a configured model provider, this is a clearly labeled **deterministic browser rehearsal**. With a configured function-calling model, the planner selects browser tools, receives observations, and chooses its next tool or stops with findings. Amazon Nova 2 Lite on Bedrock has passed live structured planning, evidence review, and sequential tool-result checks. Mock-model tests separately cover validation and failure behavior.

For a real deployed site, open **PayPal sandbox verification · deployed website** and define its exact HTTPS URL, product heading, delivery text, purchase link label, and destination heading. The seller must submit that exact URL. Submissions automatically trigger verification. Set `PAYMENT_MODE=sandbox` before creating the agreement for actual PayPal sandbox integration; authorize its payment using the PayPal button. The offline sample remains practice-only and cannot verify a sandbox capture.

The hosted demo includes a public test storefront and a $5 verification preset.
Use **Fill with test storefront requirements**, review the plan, then create it.
Only authorize the $5 milestone; the $100 handoff remains separate. The buyer
needs a Personal PayPal sandbox login. The storefront's purchase link is a
preview; payment for the delivered work happens inside Paylock. Setup and
revision instructions are in [Judge deployment](docs/JUDGE_DEPLOYMENT.md).

For submission packaging and known remaining steps, see the
[submission checklist](docs/SUBMISSION_CHECKLIST.md).

Tools: `inspect_heading`, `inspect_delivery`, `test_purchase_link`, and `inspect_mobile`. The model has no payment tool. Server-side policy checks require all four passing observations, no blocked requests, an unchanged current submission, a fresh completed run, exact authorized amount, a valid PayPal authorization, an open milestone, and an unexpired buyer grant. Sandbox automatic capture additionally requires a successful live planner. A failed planner never silently gains payment authority.

Browser scope: fresh Chromium context, JavaScript disabled, no stored credentials or form submissions, HTTPS GET requests restricted to the approved origin, public-IP validation with DNS pinning, and bounded requests/time/bytes. Script-dependent, cross-origin, login-protected, or incomplete deliveries need human review. A reachable purchase destination is **not** proof of working checkout. Deploy Chromium in a dedicated OS/container sandbox with outbound network restrictions before accepting arbitrary public submissions. Install its Linux dependencies using `npx playwright install --with-deps chromium`.

Run metadata, observations, policy snapshot, traces, screenshots, and artifact fingerprint persist in SQLite. Screenshot endpoints require buyer access. The JSON evidence packet includes the latest five runs per milestone and references their screenshot indices; image bytes and older runs remain in the database. This MVP executes synchronously in one process; mutations are serialized, so revocation queued behind an active run only takes effect after that run. Set permission before starting a run; cancellation and background scheduling are not implemented.

## Original source-review workflow

1. Open the website walkthrough: a three-milestone $900 product page job. The $300 source milestone is authorized in practice mode.
2. Inspect the submitted HTML. The server computes **2/3 requirements supported**: product heading and HTTPS purchase link are present; the delivery note is missing.
3. Choose **Request revision**, inspect the prefilled feedback, and save the decision.
4. Choose **Submit corrected sample** to simulate the seller's response. The same checks now report **3/3**. Expand previous submissions to compare versions.
5. Inspect the source, choose **Approve & simulate payment $300**, enter a decision note, and explicitly confirm. A simulated receipt appears and the ledger records one capture.
6. All sample actions are labeled. With a model configured, AI interprets submitted evidence alongside the source checks. Without one, the product says **HTML source checks · no AI model**.
7. Older demo agreements remain accessible behind a toggle. Nothing is deleted when you start a new walkthrough.

Create your own agreement at `/agreements/new`. Generate a draft, edit milestone titles, amounts, descriptions, dates, and criteria, then save. The budget must balance to the cent. Saved scope is immutable in this MVP: create a new agreement for a materially changed scope.

## How it uses PayPal

PayPal is the payment state transition, not a decorative checkout link:

```
Buyer checkout → Orders v2 AUTHORIZE → saved authorization ID
Seller evidence → browser observations / AI review → buyer policy or manual decision
Approved release → Payments v2 capture → saved capture ID → released milestone
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

No key, refusal, timeout, malformed JSON, wrong total, or invalid dates: use a **labeled deterministic fallback**. Fallback agreement templates remain editable; fallback reviews score 0 and ask for human verification. The current website walkthrough uses computed source checks instead of a prewritten score. Recognized criteria are evaluated even without a model; unrecognized criteria retain the conservative fallback. Older saved samples may still carry the clearly labeled historical fixture. A buyer may still manually approve after checking the evidence and providing a decision note.

Seller text is treated as untrusted input. Ordinary text-review URLs are displayed but not fetched. Browser-verification milestones fetch only their buyer-approved target under the restrictions above. Text evidence is not independent verification of completion, and the model is not a dispute arbitrator. These constraints are displayed in the product.

Reference: [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=chat).

## Website source evidence

Submit one fenced `html` block in the seller evidence field (up to the existing 16,000-character submission limit). The server parses it with `node-html-parser`, removes scripts, styles, templates, comments, and explicitly hidden nodes from inspection, and records the source SHA-256. It never executes HTML or fetches external URLs. The buyer sees escaped source, not an executable preview.

Three explicit criterion formats are supported; replace the quoted text to use your own product:

- `HTML source contains an h1 with the product name "Northstar Power Bank".`
- `HTML source contains a purchase link labeled "Buy now" pointing to an HTTPS URL.`
- `HTML source contains a delivery note with the text "Ships in 2 business days".`

Recognized checks take precedence over model judgments. Other criteria remain AI/manual review. A matching node proves only its presence in the submitted source: external CSS, rendering, deployment, checkout behavior, and delivery promises remain unverified. The hash identifies the submitted version, not its authorship or authenticity. The buyer can override a recommendation after an explicit decision; Paylock is a review aid, not an automated escrow authority.

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

Tests cover missing/corrected HTML, custom product checks, unsafe links, hidden/comment/script decoys, artifact fingerprints, model/check conflicts, duplicate demo prevention, revision history, cent conservation, date and URL validation, prompt-injection fallback, model citation checks, serial mutation behavior, and an isolated SQLite workflow: revision, seller authorization, dispute blocking, reopening, capture idempotency, and expiration. The same workflow exercises PayPal HTTP contracts with a mocked provider, including pending capture reconciliation. Those tests do not replace an actual sandbox checkout.

See [the recorded build journey](docs/BUILD_JOURNEY.md), [verification notes](docs/VERIFICATION.md), [demo script](docs/DEMO_SCRIPT.md), and [submission draft](docs/DEVPOST.md).

## Hackathon submission

The [PayPal AI Hackathon](https://paypalaihackathon.devpost.com/) calls for a working PayPal + AI prototype, a public licensed repository, and a public YouTube demo under three minutes. The listed deadline is November 12, 2026, 12:00pm PST (22:00 Israel time). Recheck Devpost before submitting.

This codebase includes an MIT license, lockfile, migration, environment template, tests, and a video script. Before submission, connect and demonstrate **real PayPal sandbox + a real model**, publish the repository, add the repository license to its About section, record the working flow, and complete the Devpost form. Practice mode alone is a rehearsal and does not demonstrate the required integrations.

## License

MIT. See [LICENSE](LICENSE). UI icons are Lucide (ISC); third-party dependencies retain their own licenses. No PayPal logo assets, stock photos, or copyrighted demo music are included.
