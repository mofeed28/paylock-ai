# Paylock AI submission checklist

Updated October 15, 2026. Deadline: November 12, 2026, 12:00 PM PST.
Requirements: https://paypalaihackathon.devpost.com/

## Ready

- Meaningful PayPal Orders authorization and Payments capture implementation.
- Live Amazon Bedrock / Amazon Nova 2 Lite planning and evidence verification.
- Hosted HTTPS judge demo with isolated, access-code-protected workspaces.
- MIT license at the repository root, source code and local setup instructions.
- Automated checks for payment permissions, duplicate capture, evidence handling,
  workspace isolation, model fallback and the browser revision loop.
- Clear buyer requirements, seller submission view and payment decision flow.
- Hosted $5 PayPal sandbox authorization, live Nova browser verification and
  manual capture completed October 15. Independent PayPal lookup confirmed
  COMPLETED, USD 5.00. See `VERIFICATION.md` for the evidence record.

## Finish before submitting

- Publish the repository only with the owner's approval. It is currently private.
  Before publication, scan tracked files and Git history for credentials and
  personal data. Do not publish `.env`, databases, private judge codes or SSH keys.
- Rehearse a fresh judge session from login, including access instructions.
  Confirm remaining model allowance before judging; logging in again creates
  a fresh workspace and does not recover earlier session work.
- Record the working product using `DEMO_SCRIPT.md`; public YouTube video below
  three minutes. No stock music or unauthorized third-party media.
- Finalize `DEVPOST.md`, naming Bedrock/Nova and the PayPal APIs actually shown.
  Disclose that the judge tests both roles, the merchant is preconfigured, and
  offline walkthrough payments are simulated. Do not call this regulated escrow.
- Add the public repository, demo URL, video URL and private judge instructions
  to Devpost. Check entrant eligibility and official rules, then submit.

## Private judge instructions template

Demo: https://paylock-demo.52.202.219.38.sslip.io/login

Access code: insert privately in the judging instructions; never put it here.

Start with the guide. “Browser walkthrough” runs a prepared revision example
with simulated payments. “PayPal sandbox verification” uses the hosted public
storefront and a $5 verification milestone; a Personal sandbox buyer login is
needed for checkout. The separate $100 handoff need not be authorized.
Use “Try seller view” and “Back to buyer view” in the same session.

The demo uses test funds only. Browser evidence checks exact headings, delivery
text, the purchase destination and mobile overflow, with JavaScript disabled.
A passing destination check does not prove that product checkout works.
