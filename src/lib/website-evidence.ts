import { createHash } from "node:crypto";
import { parse } from "node-html-parser";
import type { Review } from "./schema";
import { extractHtml } from "./website-sample";

// These explicit criterion formats keep source checks objective and inspectable.
// Arbitrary prose stays with the model/manual reviewer, never silently passes.
function sourceRequirement(criterion: string) {
  const heading = criterion.match(
    /^HTML source contains an h1 with the product name "([^"\n]+)"\.$/,
  );
  if (heading) return { selector: "h1", text: heading[1], https: false };
  const link = criterion.match(
    /^HTML source contains a purchase link labeled "([^"\n]+)" pointing to an HTTPS URL\.$/,
  );
  if (link) return { selector: "a", text: link[1], https: true };
  const note = criterion.match(
    /^HTML source contains a delivery note with the text "([^"\n]+)"\.$/,
  );
  if (note) return { selector: "p", text: note[1], https: false };
  return null;
}
// Parse source only. Never execute scripts, fetch URLs, or infer visual behavior.
export function checkWebsiteSource(criteria: string[], content: string) {
  const html = extractHtml(content);
  const requirements = criteria.map(sourceRequirement);
  if (!html || !requirements.some(Boolean)) return null;
  const root = parse(html, { comment: false });
  root
    .querySelectorAll("script, style, template, noscript")
    .forEach((n) => n.remove());
  root
    .querySelectorAll('[hidden], [aria-hidden="true"]')
    .forEach((n) => n.remove());
  const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
  const checklist: Review["checklist"] = requirements.flatMap(
    (requirement, criterionIndex) => {
      if (!requirement) return [];
      const node = root.querySelectorAll(requirement.selector).find((n) => {
        if (normalized(n.textContent) !== normalized(requirement.text))
          return false;
        if (!requirement.https) return true;
        try {
          return new URL(n.getAttribute("href") || "").protocol === "https:";
        } catch {
          return false;
        }
      });
      return [
        {
          criterionIndex,
          passed: !!node,
          evidence:
            node?.outerHTML.slice(0, 1800) ||
            `Missing source requirement: <${requirement.selector}> containing "${requirement.text}"${requirement.https ? " with an HTTPS destination" : ""}.`,
        },
      ];
    },
  );
  return { checklist, sha256: createHash("sha256").update(html).digest("hex") };
}
