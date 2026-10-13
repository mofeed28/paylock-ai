# Judges-only demo: Amazon Lightsail + Bedrock

Prepared October 13, 2026. No AWS infrastructure has been created by this change.
Live Bedrock access, Linux deployment, HTTPS and hosted checkout still require verification.

## Budget and region

Use **us-east-1**, one **$12/month Linux Lightsail bundle with 2 GB RAM,
60 GB storage and public IPv4**, and a static IP attached to that instance.
This accommodates the existing single-process SQLite application and sandboxed Chromium.
Do not add a load balancer, RDS, NAT gateway or paid CDN for this demo.

Reserve approximately $5 for Bedrock and $3 for taxes or incidental usage within
the owner's $20/month target. These allocations are a planning allowance, not
a guaranteed bill. Domain purchases, snapshots, excess transfer, detached IPs,
other AWS resources and model price changes can add costs. Use an existing
domain/subdomain where possible. Configure AWS billing alerts before launch;
alerts do not enforce a hard spending cap.

Recommended initial model: `us.anthropic.claude-haiku-4-5-20251001-v1:0` through
native Bedrock Converse. The US inference profile may route within the US;
the application region is us-east-1. Verify model access in the target AWS account.
Provider code supports a dedicated Bedrock API key or the AWS SDK credential
chain. Lightsail deployment below uses a dedicated Bedrock key, never a root key.
Use credentials permitted only for the intended model/profile. A local AWS CLI
profile for another project is not automatically authorized for this deployment.

Sources:
- https://docs.aws.amazon.com/lightsail/latest/userguide/amazon-lightsail-bundles.html
- https://docs.aws.amazon.com/bedrock/latest/userguide/model-card-anthropic-claude-haiku-4-5.html
- https://aws.amazon.com/bedrock/pricing/
- https://docs.aws.amazon.com/bedrock/latest/userguide/api-keys-use.html

## Demo behavior

- `DEMO_MODE=judges` requires an access code even on localhost. Each successful
  login receives a signed, eight-hour cookie with a random workspace ID.
- Agreements, ledger entries, exports, screenshots and buyer mutations are
  scoped to that workspace. Existing local agreements remain under `local`.
- Seller links in judge mode require the same signed session. They let a judge
  play both sides without exposing their submissions to other judges.
- Access code goes in the **private judging instructions**, never public source
  or the video. Code holders can enter; this is not identity verification.
- Eight agreements per session. Model requests are limited to **60 globally per
  UTC calendar month and 20 per session per UTC day**, persisted in SQLite.
  Each agent step counts separately. Failed requests count too; no SDK retries.
  Requests above 40,000 UTF-8 bytes are rejected; output is capped at 4,096
  tokens for structured results and 600 for tool decisions. These controls bound
  this application's usage, not other services in the AWS account.
- A quota or provider failure produces a labeled fallback, never fake live AI.
- `DEMO_ALLOWED_ORIGINS` defaults empty: only bundled browser fixtures are
  available. Add an exact HTTPS origin only after deploying an owned demo site.
  Ordinary text review and sandbox checkout remain available.
- Payment API base is hardcoded to PayPal sandbox. The browser sample simulates
  payments and explicitly labels them. New ordinary agreements use sandbox.
- Default expiry is December 16, 2026 UTC, after the published judging period.
  Expiry denies demo access but **does not stop AWS billing**. Delete the demo
  instance and release its static IP when the owner is ready after judging.
- No-index metadata and headers discourage indexing; authentication controls access.

## Host preparation

Create a dedicated Lightsail Linux instance in the chosen account only after
confirming the profile and monthly cost. Prefer Ubuntu 22.04 for the currently
verified Chromium sandbox environment. Allow TCP 80/443 publicly, SSH only from
the administrator's IP, and keep port 3000 closed externally.

Attach a static IP and point the selected DNS hostname to it. Install Node.js 22,
Caddy, Git and the Playwright Linux dependencies using their official packages.
Confirm `/usr/bin/node` is Node 22, or update `deploy/paylock.service` accordingly.
Use a dedicated `paylock` OS user with a home directory at `/var/lib/paylock`.

Place the app source in `/opt/paylock/current`, owned by that user. Copy only
source, assets, migrations and the lockfile. **Never copy the local `.env`,
`prisma/dev.db`, `.git`, `work/`, Windows `node_modules` or `.next` output.**
The hosted demo starts with a fresh database.

Copy `deploy/judges.env.example` to `/etc/paylock.env`. Fill in the hostname,
random judge access code, PayPal sandbox credentials and dedicated Bedrock key.
Owner should be root, group paylock, mode 0640. The app can read this file but
cannot edit it. Do not pass secrets on command lines or print the file in logs.

With `/etc/paylock.env` configured, run as the paylock user from the release directory:

```sh
node --env-file=/etc/paylock.env scripts/check-demo-config.mjs
node --env-file=/etc/paylock.env /usr/share/nodejs/npm/bin/npm-cli.js ci
node --env-file=/etc/paylock.env node_modules/prisma/build/index.js migrate deploy
node --env-file=/etc/paylock.env node_modules/playwright/cli.js install chromium
node --env-file=/etc/paylock.env node_modules/next/dist/bin/next build
```

The npm CLI location depends on the Node installation; use its actual path if
different. Make `/opt/paylock-browsers` writable by paylock before installing
Chromium. Install browser OS dependencies as administrator with the installed
Playwright CLI's `install-deps chromium` command. A temporary build swap file
may be needed on a 2 GB host; do not reduce Chromium's sandbox protections.

The build must receive the same public PayPal client ID as runtime. Private
credentials stay server-side. `npm ci` runs the Prisma generation/bootstrap
postinstall with the supplied environment. The persistent database belongs to
paylock under `/var/lib/paylock/demo.db`; do not replace it during redeploys.

Install `deploy/paylock.service` under `/etc/systemd/system/`, then run
`systemctl daemon-reload` and `systemctl enable --now paylock` as administrator.
Replace `YOUR_DEMO_HOSTNAME` in `deploy/Caddyfile`, validate it with Caddy, and
install/reload Caddy. Caddy terminates HTTPS and proxies to localhost:3000.
Do not expose Next directly. Do not enable the systemd service until preflight passes.

## Release verification

1. Run lint, typecheck, all tests and a production build before deployment.
2. Validate configuration without logging values. Confirm Bedrock can produce
   a structured milestone plan and a tool call; permission errors must remain
   visibly labeled fallback. No live Bedrock success is claimed before this.
3. In two browsers, enter the judge code. Create samples in both. Confirm they
   cannot open each other's agreements, exports, screenshots, seller links or
   mutate milestones. Unauthenticated API calls must be rejected.
4. Exercise the broken-link → correction browser sample on the Linux host.
   Keep `chromiumSandbox: true`; resolve OS restrictions instead of disabling it.
5. Create a fresh sandbox agreement, log in with a separate Personal sandbox
   account in PayPal, authorize, submit meaningful evidence, review, manually
   approve capture and verify the receipt against PayPal sandbox.
6. Refresh, restart the service, and confirm data and quota counters persist.
7. Confirm HTTPS, blocked external port 3000, no-index header, demo labels and
   expiry. Include access details and a short troubleshooting note in Devpost.

## Judge instructions to provide privately

Visit `https://YOUR_DEMO_HOSTNAME/login`, enter the access code, then follow
the guide at `/judge`. The browser walkthrough needs no PayPal login and uses
simulated payments. The separate sandbox checkout path uses the dedicated
Personal sandbox buyer login provided privately by the project owner. Do not
provide merchant API secrets or AWS credentials to judges.

The repository stays private during preparation. The hackathon requires a public,
licensed repository at submission; a protected functional demo may still use
private judge access instructions. Keep a public YouTube video under three minutes.
