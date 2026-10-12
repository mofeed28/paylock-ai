import { z } from "zod";
export const AGENT_TOOLS = [
  "inspect_heading",
  "inspect_delivery",
  "test_purchase_link",
  "inspect_mobile",
] as const;
export type AgentTool = (typeof AGENT_TOOLS)[number];
export const browserPolicySchema = z.object({
  targetUrl: z.string().url().max(1000),
  heading: z.string().trim().min(3).max(120),
  deliveryText: z.string().trim().min(5).max(160),
  linkText: z.string().trim().min(2).max(80),
  destinationHeading: z.string().trim().min(3).max(120),
  fixture: z.boolean().default(false),
});
export type BrowserPolicy = z.infer<typeof browserPolicySchema>;
export type Observation = {
  tool: AgentTool;
  passed: boolean;
  detail: string;
  screenshot?: number;
  error?: boolean;
};
export type AgentTrace = {
  kind: "plan" | "tool" | "decision" | "error";
  message: string;
  at: string;
  tool?: string;
};
export type AgentResult = {
  observations: Observation[];
  complete: boolean;
  allPassed: boolean;
  blockedRequests: number;
  artifactHash: string;
  revision: string;
  scope: string;
};
export const AGENT_SCOPE =
  "Read-only browser checks with JavaScript disabled. A reachable purchase destination is not proof of checkout or payment functionality. No forms are submitted. External origins and private networks are blocked.";
export function browserCriteria(p: BrowserPolicy) {
  return [
    `At desktop width, the visible product heading is "${p.heading}".`,
    `At desktop width, the visible delivery text includes "${p.deliveryText}".`,
    `The visible "${p.linkText}" link opens a successful same-origin page with heading "${p.destinationHeading}".`,
    "At 390px width, the product page has no horizontal overflow and its heading and purchase link are visible.",
  ];
}
export function capturePermission(
  input: {
    enabled: boolean;
    until: Date | null;
    limit: number;
    amount: number;
    paymentStatus: string;
    status: string;
    planner: string;
    paymentMode: string;
    complete: boolean;
    allPassed: boolean;
    blockedRequests: number;
  },
  now = new Date(),
) {
  if (!input.enabled)
    return "Buyer approval is required; automatic capture is off.";
  if (!input.until || input.until <= now)
    return "The buyer's automatic-capture authorization expired.";
  if (input.limit !== input.amount)
    return "The milestone amount does not match the buyer's authorized amount.";
  if (input.status !== "IN_REVIEW" || input.paymentStatus !== "AUTHORIZED")
    return "The milestone is not open with an authorized payment.";
  if (!input.complete || !input.allPassed || input.blockedRequests)
    return "The evidence is incomplete, failed, or limited by blocked requests.";
  if (input.paymentMode !== "practice" && input.planner !== "live")
    return "Sandbox automatic capture requires a successful live AI tool loop.";
  return null;
}
