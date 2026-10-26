# Connecting sellers to PayPal (sandbox)

Paylock sign-in and PayPal connection are separate. Buyers authorize each milestone
in PayPal Checkout. Sellers use **Account → Your PayPal connection**, consent to
sharing a connection reference, and follow **Connect PayPal** to PayPal. After
returning they select **Check connection**. Paylock never asks for their PayPal
password or personal API keys.

## Platform setup

Create a **Sandbox REST app of Type Platform** in PayPal Developer → Apps &
Credentials. Keep the existing merchant app credentials: they service the old
demo agreements and their saved orders/receipts. Configure these separate server
environment variables (the client ID is also passed to the checkout SDK):

```dotenv
PAYPAL_PLATFORM_CLIENT_ID=""
PAYPAL_PLATFORM_CLIENT_SECRET=""
PAYPAL_PARTNER_MERCHANT_ID=""
PAYPAL_PARTNER_BN_CODE=""
```

The partner merchant ID is the Platform Partner App sandbox account's account
ID. The BN code is under the platform app's Reports settings. APP_URL must be the
public HTTPS app origin, and PAYPAL_ENV remains sandbox. Local HTTP is only for
development. Apply Prisma migrations and restart after changing configuration.

The existing merchant app was checked on October 21: it had no partner scopes and
the merchant-integration lookup returned HTTP 403 NOT_AUTHORIZED. This does not
prevent ordinary legacy sandbox checkout, but it cannot onboard independent
sellers. An ignored credential template is in `work/paypal-sandbox/platform.env`.
Never commit populated credentials.

## Payment behavior

- New sandbox agreements created by permanent accounts use seller routing. Buyer
  must invite the seller's Paylock account; that seller must accept and connect PayPal.
  Missing setup blocks checkout; there is no fallback to the platform merchant.
- Existing agreements retain `legacy` routing and their original credential set.
  Their checkout explicitly identifies them as using the configured test merchant.
  A new connection does not reroute old authorizations or receipts.
- The server generates a random tracking ID, persists a referral, and obtains a
  PayPal-hosted onboarding URL using Partner Referrals v2. Interrupted onboarding
  reuses the referral. Redirect query parameters cannot establish a connection.
- Authenticated status refresh looks up the server-owned tracking ID, then verifies
  merchant ID, confirmed email, payment eligibility and authorization/capture
  permission for this platform client. A merchant may connect to one Paylock
  account. The merchant cannot silently change after connecting.
- Each order pins the seller user ID and merchant ID before calling PayPal. Order
  creation, authorization/recovery and capture use the seller's auth assertion and
  the platform credentials. The payee is explicit in the order. Changing seller
  access after checkout cannot redirect that payment.
- Permission/eligibility are rechecked with PayPal before payment operations;
  failures and revoked permissions block payment. The UI status is a last-checked
  snapshot, not a claim of continuous webhook synchronization.

## Verification and remaining external checks

Mock-provider regressions cover consent, referral reuse, unsafe onboarding URLs,
tracking identity mismatch, duplicate merchant ownership, incomplete setup,
revoked permissions, provider outage, wrong order payee, seller reassignment,
correct recipient headers and idempotent capture. HTTP tests cover sign-in,
cross-origin rejection, consent and forged account IDs. Migration tests preserve
legacy receipts and mark their routing as legacy.

Sandbox Platform credentials were activated on the hosted demo on October 21.
OAuth and partner onboarding scopes were verified; a nonexistent tracking lookup
returned the expected 404 instead of the original merchant app's 403. The hosted
seller Account page now offers Connect PayPal. The real onboarding redirect and
saved seller sign-in were verified after correcting Base64 referral ID handling.
The user confirmed PayPal's final permission grant, and the hosted status check
verified merchant identity, confirmed email, payment eligibility and the platform's
authorization/capture permission. The saved seller now shows Connected for sandbox
payments. PayPal also displayed a further profile-completion flow; no additional
identity information was submitted. A seller-routed sandbox transaction remains
pending. Complete transaction testing with distinct
platform, seller and buyer sandbox accounts before presenting the feature as
end-to-end verified. Also test normal Checkout SDK callbacks in a regular browser.

Production remains disabled. PayPal partner approval is required before going
live. Add signature-verified MERCHANT.ONBOARDING.COMPLETED and
MERCHANT.PARTNER-CONSENT.REVOKED webhooks before production for prompt account
status updates; current payment gates independently verify status on demand.

Sources: [Platform account setup](https://developer.paypal.com/platforms/create-account/),
[Onboarding before payment](https://developer.paypal.com/platforms/seller-onboarding/before-payment/),
[Multiparty checkout](https://developer.paypal.com/platforms/checkout/standard/integrate).
