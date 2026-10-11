export const WEBSITE_DEMO_TITLE = "Northstar · product page delivery";
export const WEBSITE_CRITERIA = [
  'HTML source contains an h1 with the product name "Northstar Power Bank".',
  'HTML source contains a purchase link labeled "Buy now" pointing to an HTTPS URL.',
  'HTML source contains a delivery note with the text "Ships in 2 business days".',
];
export function websiteSample(corrected = false) {
  return `Product page source submitted for acceptance review. This is a sample artifact, not a deployed store.

\`\`\`html
<!doctype html>
<html lang="en">
<head><meta name="viewport" content="width=device-width, initial-scale=1"><title>Northstar</title></head>
<body>
  <main>
    <h1>Northstar Power Bank</h1>
    <p>10,000mAh. Power for wherever the day takes you.</p>
    <p>$49.00</p>
    <a href="https://example.com/checkout">Buy now</a>
${corrected ? '    <p class="delivery-note">Ships in 2 business days</p>' : "    <!-- Delivery note still to be added -->"}
  </main>
</body>
</html>
\`\`\`

Limitations: checkout is an example URL. Browser layout, checkout functionality, and deployment require buyer inspection.`;
}
export function extractHtml(content: string) {
  const blocks = [...content.matchAll(/```html\s*\n([\s\S]*?)```/gi)];
  return blocks.length === 1 ? blocks[0][1].trim() : null;
}
