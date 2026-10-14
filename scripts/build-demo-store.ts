// Public, read-only demo deliverable served separately from the judge workspace.
// Example: npx tsx scripts/build-demo-store.ts /var/www/paylock-store --fixed
// Omit --fixed to demonstrate a genuinely missing purchase destination.
import { mkdirSync, writeFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { fixtureResponse } from "../src/lib/agent-fixture";

const directory = process.argv[2];
if (!directory) throw new Error("An output directory is required");
const root = resolve(directory);
const fixed = process.argv.includes("--fixed");
if (!fixed && existsSync(join(root, "checkout", "index.html")))
  throw new Error(
    "Use a fresh output directory for the broken version; existing delivery is preserved",
  );
for (const [path, file] of [
  ["/product", "product/index.html"],
  ...(fixed ? [["/checkout", "checkout/index.html"]] : []),
  ["/missing", "404.html"],
]) {
  const target = join(root, file);
  mkdirSync(resolve(target, ".."), { recursive: true });
  const html = fixtureResponse(`https://example.com${path}`, fixed)
    .body.replace('href="/checkout"', 'href="/checkout/"')
    .replace(
      "Paylock test fixture · no purchases or money movement",
      "Public Paylock demo deliverable · no product purchases · milestone payments happen in Paylock sandbox",
    );
  writeFileSync(target, html);
}
console.log(
  `Public demo store generated (${fixed ? "complete" : "missing checkout destination"})`,
);
