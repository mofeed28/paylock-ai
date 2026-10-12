import { chromium } from "playwright";
import { createHash } from "node:crypto";
import type { AgentTool, BrowserPolicy, Observation } from "./agent-contract";
import { allowedTarget, safePageGet } from "./agent-network";
import { fixtureResponse } from "./agent-fixture";

export async function openVerificationBrowser(
  policy: BrowserPolicy,
  fixedFixture = false,
) {
  const target = allowedTarget(policy.targetUrl);
  const browser = await chromium.launch({
    headless: true,
    chromiumSandbox: true,
  });
  const context = await browser.newContext({
    javaScriptEnabled: false,
    serviceWorkers: "block",
    acceptDownloads: false,
    viewport: { width: 1440, height: 900 },
  });
  let blockedRequests = 0,
    requests = 0,
    bytes = 0;
  const screenshots: { name: string; data: string }[] = [];
  const cutoff = setTimeout(() => {
    void browser.close();
  }, 90000);
  await context.routeWebSocket("**/*", (ws) => ws.close());
  await context.route("**/*", async (route) => {
    try {
      if (++requests > 60 || route.request().method() !== "GET")
        throw new Error("Request budget or method denied.");
      const url = allowedTarget(route.request().url(), target.origin);
      let response;
      if (policy.fixture) {
        if (target.hostname !== "paylock-demo.invalid")
          throw new Error("Invalid fixture origin.");
        const fixture = fixtureResponse(url.href, fixedFixture);
        response = {
          ...fixture,
          body: Buffer.from(fixture.body),
          headers: { "content-type": "text/html; charset=utf-8" },
        };
      } else response = await safePageGet(url.href, target.origin);
      bytes += response.body.length;
      if (bytes > 8_000_000) throw new Error("Run resource budget exceeded.");
      await route.fulfill({
        status: response.status,
        headers: {
          ...response.headers,
          "content-security-policy":
            "default-src 'self' data:; script-src 'none'; connect-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'; base-uri 'none'; style-src 'self' 'unsafe-inline'",
        },
        body: response.body,
      });
    } catch {
      blockedRequests++;
      await route.abort().catch(() => {});
    }
  });
  const page = await context.newPage();
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /content security policy/i.test(message.text())
    )
      blockedRequests++;
  });
  page.setDefaultTimeout(7000);
  page.setDefaultNavigationTimeout(12000);
  async function visitProduct(width = 1440) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(target.href, { waitUntil: "load" });
    if (!response?.ok())
      throw new Error(
        `Product page returned ${response?.status() || "no response"}.`,
      );
  }
  async function shot(name: string) {
    const buffer = await page.screenshot({
      type: "jpeg",
      quality: 65,
      fullPage: false,
      timeout: 7000,
    });
    screenshots.push({ name, data: buffer.toString("base64") });
    return screenshots.length - 1;
  }
  let artifactHash = "";
  try {
    await visitProduct();
    artifactHash = createHash("sha256")
      .update(await page.content())
      .digest("hex");
    await shot("Desktop product page");
  } catch (e) {
    clearTimeout(cutoff);
    await browser.close();
    throw e;
  }
  return {
    screenshots,
    get blockedRequests() {
      return blockedRequests;
    },
    artifactHash,
    async execute(tool: AgentTool): Promise<Observation> {
      try {
        if (tool === "inspect_mobile") {
          await visitProduct(390);
          const overflow = await page.evaluate(() => ({
            content: document.documentElement.scrollWidth,
            viewport: document.documentElement.clientWidth,
          }));
          const heading = page
            .getByRole("heading", { name: policy.heading, exact: true })
            .first();
          const link = page
            .getByRole("link", { name: policy.linkText, exact: true })
            .first();
          const passed =
            overflow.content <= overflow.viewport + 1 &&
            (await heading.isVisible()) &&
            (await link.isVisible());
          return {
            tool,
            passed,
            detail: `390px viewport: document ${overflow.content}px / viewport ${overflow.viewport}px. Product heading and purchase link ${passed ? "visible with no horizontal overflow" : "need inspection"}.`,
            screenshot: await shot("Mobile product page · 390px"),
          };
        }
        await visitProduct();
        if (tool === "inspect_heading" || tool === "inspect_delivery") {
          const value =
            tool === "inspect_heading" ? policy.heading : policy.deliveryText;
          const locator =
            tool === "inspect_heading"
              ? page.getByRole("heading", { name: value, exact: true }).first()
              : page.getByText(value, { exact: false }).first();
          const passed = await locator.isVisible();
          return {
            tool,
            passed,
            detail: passed
              ? `Visible ${tool === "inspect_heading" ? "heading" : "text"}: ${value}`
              : `Missing visible ${tool === "inspect_heading" ? "heading" : "text"}: ${value}`,
            screenshot: 0,
          };
        }
        const link = page
          .getByRole("link", { name: policy.linkText, exact: true })
          .first();
        if (!(await link.isVisible()))
          return {
            tool,
            passed: false,
            detail: `No visible link labeled ${policy.linkText}. JavaScript-only buttons require human review.`,
            screenshot: 0,
          };
        const href = await link.getAttribute("href");
        if (!href || href.startsWith("#"))
          return {
            tool,
            passed: false,
            detail: "Purchase link has no navigable destination.",
            screenshot: 0,
          };
        const destination = allowedTarget(
          new URL(href, target).href,
          target.origin,
        );
        const response = await page.goto(destination.href, {
          waitUntil: "load",
        });
        const passed =
          !!response?.ok() &&
          (await page
            .getByRole("heading", {
              name: policy.destinationHeading,
              exact: true,
            })
            .first()
            .isVisible());
        return {
          tool,
          passed,
          detail: `${destination.pathname}: HTTP ${response?.status() || "unavailable"}; expected heading "${policy.destinationHeading}" ${passed ? "found" : "not confirmed"}. No checkout transaction was attempted.`,
          screenshot: await shot("Purchase-link destination"),
        };
      } catch (e) {
        return {
          tool,
          passed: false,
          error: true,
          detail:
            e instanceof Error
              ? e.message.slice(0, 400)
              : "Browser check failed.",
        };
      }
    },
    async close() {
      clearTimeout(cutoff);
      await browser.close();
    },
  };
}
