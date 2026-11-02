# Paylock AI submission checklist

Updated November 2, 2026. Deadline: November 12, 2026, 12:00 PM PST.
Requirements: https://paypalaihackathon.devpost.com/

## Ready & verified

- **PayPal Orders v2 (`AUTHORIZE`) + Payments v2 (`Capture`)**: Verified with real PayPal Sandbox transactions, deterministic `PayPal-Request-Id` idempotency, lost-callback authorization recovery (`POST /api/paypal/recover-authorization`), and expired unapproved order reset.
- **PayPal Partner Referrals v2 + Multiparty Seller Routing**: Sellers connect their own Business PayPal sandbox account (`/account`), verified via Merchant Integrations v1 and paid via `PayPal-Auth-Assertion` (`7JF45713HK321441W`, `COMPLETED` to seller merchant `LTJFUUKVMGAPQ` on October 29, 2026).
- **Live Amazon Bedrock Converse (`us.amazon.nova-2-lite-v1:0`)**: Verified for milestone drafting, criterion-by-criterion evidence review with quote validation, and sequential Playwright browser tool calling.
- **Hosted HTTPS deployment (`https://paylock-demo.52.202.219.38.sslip.io`)**: Hardened with permanent Better Auth accounts (`AUTH_MODE=accounts`), isolated buyer/seller workspaces, and configurable AI usage quotas (`DEMO_MONTHLY_MODEL_LIMIT` / `DEMO_DAILY_WORKSPACE_LIMIT`).
- **Complete test & build verification**: 28 automated unit/workflow tests (`npm test`) and two full-stack HTTP suites (`scripts/verify-judge-http.mjs`, `scripts/verify-accounts-http.mjs`) pass alongside `npm run lint`, `npm run typecheck`, and `npm run build`.
- **MIT License & Documentation**: `LICENSE` at repo root, `.env.example`, `README.md`, `docs/BUILD_JOURNEY.md`, `docs/VERIFICATION.md`, `docs/DEVPOST.md`, and `docs/DEMO_SCRIPT.md`.

## Finish before submitting on Devpost

1. **Publish the GitHub repository**:
   - Confirm no `.env`, `work/`, SQLite `.db` files, SSH keys, or access codes are tracked (`git status` / `git log`).
   - Switch the repository visibility to **Public** and verify the MIT license appears in the GitHub About sidebar.
2. **Check hosted demo quota & credentials**:
   - Confirm `DEMO_MONTHLY_MODEL_LIMIT` on the Lightsail server has ample headroom for November judging (e.g. `DEMO_MONTHLY_MODEL_LIMIT="500"`).
   - Provide pre-created Buyer and connected Seller login credentials (or enrollment code) in the private Devpost judging notes so judges can test immediately without needing to complete Partner Referrals onboarding from scratch.
3. **Record and upload the <3:00 YouTube demo video**:
   - Follow [`docs/DEMO_SCRIPT.md`](DEMO_SCRIPT.md) (target 2:35–2:45).
   - Show the real hosted flow: milestone agreement, PayPal sandbox authorization, AI/browser inspection catching a missing requirement (`HTTP 404` or missing criterion), revision submission, passing re-verification, and PayPal sandbox capture (`COMPLETED` receipt in the ledger).
   - Upload to YouTube as **Public** (or Unlisted if permitted, though Public is safest per Devpost rules).
4. **Submit the Devpost form**:
   - Paste the polished text from [`docs/DEVPOST.md`](DEVPOST.md).
   - Attach the public GitHub repository URL, public YouTube video link, hosted demo URL, and private judge login instructions before **November 12, 2026 at 12:00 PM PST**.

## Private judge instructions template (for Devpost testing notes)

Demo URL: `https://paylock-demo.52.202.219.38.sslip.io/login`

- **Fastest 2-minute walkthrough (no PayPal login required):**
  Sign in with the provided Buyer demo account (or create an account with the enrollment code), open **Guide (`/judge`) → Try the guided demo (`/agent`)**, and click **Try the browser agent**. Run browser verification to watch Chromium + Amazon Nova 2 Lite catch the broken purchase link (`HTTP 404`), request a revision, click **Submit corrected page & recheck**, and observe policy-bound capture.
- **Live $5 PayPal Sandbox + Multiparty Seller flow:**
  Sign in with the provided Buyer and pre-connected Seller demo accounts (or inspect completed agreement `cmvtqkbvx000apdeyixan2dzu` and capture receipt `7JF45713HK321441W` in the workspace ledger). To run a fresh `$5` sandbox transaction, create an agreement inviting the Seller's Account ID (shown on the Seller's `/account` page), accept the invitation from `/seller`, authorize the `$5` milestone with a Personal PayPal sandbox buyer account, submit evidence as Seller, and approve capture as Buyer.
- All payments use PayPal Sandbox test funds only. Browser checks run with JavaScript disabled against approved HTTPS origins.
