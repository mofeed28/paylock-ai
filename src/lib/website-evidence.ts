import { createHash } from "node:crypto";
import { parse } from "node-html-parser";
import type { Review } from "./schema";
import { extractHtml, WEBSITE_CRITERIA } from "./website-sample";

// Parse source only. Never render scripts, fetch URLs, or infer visual behavior.
export function checkWebsiteSource(criteria: string[], content: string) {
  const html = extractHtml(content);
  if (!html || !criteria.some((c) => WEBSITE_CRITERIA.includes(c))) return null;
  const root = parse(html, { comment: false });
  root
    .querySelectorAll("script, style, template, noscript")
    .forEach((n) => n.remove());
  root
    .querySelectorAll('[hidden], [aria-hidden="true"]')
    .forEach((n) => n.remove());
  const normalized = (text: string) => text.replace(/\s+/g, " ").trim();
  const title = root
    .querySelectorAll("h1")
    .find((n) => normalized(n.textContent) === "Northstar Power Bank");
  const cta = root.querySelectorAll("a").find((n) => {
    try {
      return (
        normalized(n.textContent) === "Buy now" &&
        new URL(n.getAttribute("href") || "").protocol === "https:"
      );
    } catch {
      return false;
    }
  });
  const delivery = root
    .querySelectorAll("p")
    .find((n) => normalized(n.textContent) === "Ships in 2 business days");
  const nodes = [title, cta, delivery];
  const missing = [
    "No matching product h1 found in the submitted source.",
    "No Buy now link with an HTTPS destination found in the submitted source.",
    "Delivery note missing: add a paragraph containing Ships in 2 business days.",
  ];
  const checklist: Review["checklist"] = criteria.flatMap(
    (criterion, criterionIndex) => {
      const index = WEBSITE_CRITERIA.indexOf(criterion);
      if (index < 0) return [];
      return [
        {
          criterionIndex,
          passed: !!nodes[index],
          evidence: nodes[index]?.outerHTML.slice(0, 1800) || missing[index],
        },
      ];
    },
  );
  return { checklist, sha256: createHash("sha256").update(html).digest("hex") };
}
