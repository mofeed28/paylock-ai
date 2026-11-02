# Paylock AI — 2 minute 45 second demo script

## Before recording

- Record against the live HTTPS deployment (`https://paylock-demo.52.202.219.38.sslip.io`) or a local `PAYMENT_MODE=sandbox` + `AI_PROVIDER=bedrock` instance with real PayPal Sandbox and Amazon Bedrock (`us.amazon.nova-2-lite-v1:0`) credentials.
- Have two browser windows (or profiles) ready if demonstrating `AUTH_MODE=accounts`: **Window 1 (Buyer)** and **Window 2 (Connected Seller with `READY` PayPal Business sandbox account)**. Keep secret keys and passwords off camera.
- Target total runtime: **2:35–2:45** (strictly under the 3:00 Devpost limit).

---

## 0:00–0:25 — The problem & milestone setup

**Visual:** Show the Buyer workspace (`/agreements/new` or `/agent#sandbox-website`). Show a project brief turning into measurable milestones with exact-cent amounts and concrete acceptance criteria.

**Narration:**
> "Freelance projects rarely fail because no one worked—they fail because 'done' wasn't verifiable before payment moved. A delivered product page can look finished while its purchase link is broken. Paylock AI links the agreed acceptance criteria, AI and browser verification evidence, and a buyer-controlled PayPal delayed-capture payment in one record."

---

## 0:25–0:55 — Seller connection & PayPal Sandbox authorization

**Visual:** Briefly show the Seller's `/account` page with their connected PayPal Business sandbox merchant (`Connected · merchant ID verified` via Partner Referrals v2) and accepted invitation in `/seller`. Switch to the Buyer's agreement page (`/agreements/[id]`), authorize the `$5` milestone with PayPal (`Orders v2 AUTHORIZE`), and show the optional 24-hour, exact-amount buyer auto-capture permission toggle.

**Narration:**
> "In Paylock, the seller accepts the buyer's invitation and connects their PayPal Business sandbox account through Partner Referrals v2. Paylock pins their verified merchant ID to the milestone. The buyer then authorizes $5 in PayPal sandbox. Notice that AI has no payment tool—funds stay held in PayPal until every requirement passes and the buyer approves or grants a 24-hour exact-amount capture policy."

---

## 0:55–1:35 — AI & Playwright catch a broken delivery (Revision Loop)

**Visual:** From the Seller view, submit the first delivery (either the storefront URL with the broken destination or the incomplete submission). Show the live `us.amazon.nova-2-lite-v1:0` review / Playwright browser run: `test_purchase_link` hits `HTTP 404` (or 1 of 2 criteria fails). Show the recorded screenshot, tool trace, and revision request while `Payment status` remains `AUTHORIZED`.

**Narration:**
> "When the seller submits their first delivery, Amazon Nova 2 Lite on Bedrock inspects the work against every acceptance criterion. For websites, it drives a read-only Playwright Chromium loop with DNS pinning and JavaScript disabled—checking the heading, delivery text, 390-pixel mobile layout, and following the purchase link. Here, the purchase destination returns HTTP 404. Paylock blocks release, preserves the screenshot and tool trace, and requests a revision while the PayPal authorization stays untouched."

---

## 1:35–2:15 — Recheck & seller-routed PayPal capture

**Visual:** Submit the corrected delivery from the Seller workspace. Show the re-verification passing all criteria (`4/4 passed` / `approve`), then trigger capture (`Approve & capture $5.00` or policy-bound auto-capture). Show the completed PayPal capture ID (e.g. `7JF45713HK321441W` / `5SF27921LV186002H`), the `RELEASED` / `CAPTURED` status, the audit timeline, and the downloadable JSON evidence packet.

**Narration:**
> "After the seller fixes the issue and resubmits, Paylock re-verifies the delivery. Every criterion now passes with cited evidence. Under the buyer's approval, Paylock executes a PayPal Payments v2 capture routed directly to the pinned seller merchant via `PayPal-Auth-Assertion`, recording the provider capture ID alongside the evidence and decision note."

---

## 2:15–2:40 — Architecture & honest scope

**Visual:** Show the payment ledger entry and exported JSON evidence receipt.

**Narration:**
> "Every order, authorization, browser observation, and capture is stored in an auditable ledger with deterministic `PayPal-Request-Id` idempotency and lost-callback recovery. Paylock AI is a sandbox authorization-and-capture workflow with read-only evidence verification—giving buyers and sellers verifiable proof that the work was checked and the payment was earned."
