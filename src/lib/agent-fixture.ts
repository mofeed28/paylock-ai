import type { BrowserPolicy } from "./agent-contract";
export const AGENT_DEMO_TITLE = "Northstar · agent verification";
export const demoBrowserPolicy: BrowserPolicy = {
  targetUrl: "https://paylock-demo.invalid/product",
  heading: "Northstar Power Bank",
  deliveryText: "Ships in 2 business days",
  linkText: "Buy now",
  destinationHeading: "Checkout preview",
  fixture: true,
};
export function fixtureResponse(url: string, fixed: boolean) {
  const path = new URL(url).pathname;
  const shell = (body: string) =>
    `<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Northstar sample store</title><style>*{box-sizing:border-box}body{margin:0;background:#f4f0e8;color:#183c30;font:18px/1.6 Arial}header{padding:24px 7%;border-bottom:1px solid #d8d8c9;letter-spacing:3px}main{max-width:1000px;margin:auto;padding:60px 28px}.product{display:grid;grid-template-columns:1fr 1fr;gap:50px;align-items:center}.device{background:#dbe7dd;border-radius:30px;min-height:330px;display:grid;place-items:center}.battery{background:#244838;color:#f7f5e9;padding:70px 25px;border-radius:30px;box-shadow:12px 14px 0 #b6cabc;font-size:20px}h1{font-size:44px;line-height:1.1}a{display:inline-block;background:#214c39;color:white;padding:12px 26px;border-radius:7px;text-decoration:none}.label{font-size:12px;letter-spacing:2px}footer{padding:24px;font-size:13px;text-align:center;color:#627867}@media(max-width:600px){main{padding:24px}.product{grid-template-columns:1fr;gap:20px}.device{min-height:180px}.battery{padding:35px 20px}h1{font-size:32px}}</style></head><body><header>NORTHSTAR / SAMPLE STORE</header><main>${body}</main><footer>Paylock test fixture · no purchases or money movement</footer></body></html>`;
  if (path === "/product")
    return {
      status: 200,
      body: shell(
        `<div class="product"><div class="device"><div class="battery">N / 10,000</div></div><div><p class="label">POWER FOR THE EVERYDAY</p><h1>Northstar Power Bank</h1><p>10,000mAh. Less looking for outlets. More getting there.</p><p>$49.00</p><a href="/checkout">Buy now</a><p>Ships in 2 business days</p></div></div>`,
      ),
    };
  if (path === "/checkout" && fixed)
    return {
      status: 200,
      body: shell(
        "<h1>Checkout preview</h1><p>Your Northstar Power Bank is ready for checkout.</p><p>This is a test destination. No payment form is present.</p>",
      ),
    };
  return {
    status: 404,
    body: shell(
      "<h1>Page not found</h1><p>The purchase destination has not been delivered.</p>",
    ),
  };
}
