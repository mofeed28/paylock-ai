# Devpost submission draft

## Project name

Paylock AI

## Tagline

Turn a freelance brief into clear milestones, reviewable evidence, and human-approved PayPal payments.

## Inspiration

Small ecommerce teams need specialist help, but “done” is often undefined. A payment dispute may begin days earlier with an ambiguous brief. We wanted the agreement, evidence, and payment decision to share one record.

## What it does

The buyer describes a fixed-scope project. AI proposes milestones, acceptance criteria, risk flags, and a budget split. The buyer edits the plan and authorizes each milestone through PayPal sandbox checkout. The seller submits evidence through a private link. AI evaluates each criterion, provides a supporting excerpt or explains missing evidence, and recommends release, revision, or investigation. The buyer makes the final decision. Approved work triggers a PayPal sandbox capture, with the provider reference recorded beside the work and decision note.

The workspace highlights the next buyer decision and presents agreements as responsive cards. The website walkthrough parses submitted HTML, identifies a missing delivery note, and checks the corrected artifact. Recognized source requirements take precedence over AI interpretation; artifact fingerprints and submission history make the evidence inspectable. A revision loop keeps feedback and submission versions together. Internal disputes block release. A downloadable evidence packet makes the record portable.

## How we built it

Next.js App Router, TypeScript, Tailwind CSS, Radix/shadcn-style UI primitives, Prisma, and SQLite. PayPal JS SDK and Orders v2 handle authorization; Payments v2 handles capture. OpenAI-compatible structured outputs and Zod enforce the agreement and review schemas. Submission content is untrusted data; the AI has no payment tools. Server checks validate checklist coverage and verify quoted evidence against submitted text. node-html-parser evaluates explicit heading, purchase-link, and delivery-note source criteria without executing HTML.

## What makes it different

Paylock links three stages that are often disconnected: the acceptance criteria agreed before work, the evidence submitted after work, and the exact payment operation approved by the buyer. Its value is the inspectable decision record, not an unexplained score or autonomous payment claim.

## Challenges and limitations

PayPal authorization is time-limited and is not regulated escrow. This MVP settles to a single configured sandbox merchant; arbitrary seller payouts and onboarding are outside scope. The reviewer evaluates submitted text and explicit HTML source requirements. It does not verify external URLs, rendered layout, deployment, or functioning checkout. Human inspection remains necessary. Provider failures do not silently turn into simulated successes. Practice mode and model fallback are explicitly labeled.

## What we learned

Early feedback identified a scattered interface and a table that clipped in a narrow browser panel. We replaced that dashboard with agreement cards and a clear next action. We also replaced the prewritten sample review with computed HTML checks: a missing delivery note now produces a concrete revision request. Actual connected PayPal and model testing remains outstanding; this draft must be updated after that testing.

## What's next

Merchant onboarding, verified artifact retrieval in an isolated environment, authorization refresh and void flows, signed webhooks, multi-user identity, and evaluation against real project acceptance cases. Interview ecommerce operators and freelancers to test whether clearer criteria reduce review time and revision cycles.

## Built with

Next.js, React, TypeScript, Tailwind CSS, Prisma, SQLite, PayPal JS SDK, PayPal Orders v2, PayPal Payments v2, OpenAI-compatible API (configured model must be named after live verification), node-html-parser, Zod, Lucide.

## Evidence to attach before submission

- Public MIT-licensed repository URL with this code and setup instructions.
- Public YouTube video under three minutes showing actual sandbox authorization, live AI, and capture.
- Working hosted URL **or** verified local run instructions.
- Model/service name actually used in the recorded demo.
- Honest disclosure of AI coding assistance and third-party tools where requested.

## Judging strategy

Prioritize technical implementation, product completeness, and demo clarity. Target the overall awards and Best Use of PayPal + AI with the functioning evidence-to-capture flow. Agentic commerce is a credible extension, but do not present this human-driven MVP as autonomous agent-to-agent commerce. Avoid invented traction, conversion lifts, or “fraud prevention” claims. A real pilot result would strengthen the impact case more than another speculative feature.

Source: https://paypalaihackathon.devpost.com/ (reviewed October 11, 2026). Recheck official rules and eligibility before submitting.
