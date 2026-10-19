import { AsyncLocalStorage } from "node:async_hooks";

const context = new AsyncLocalStorage<string>();
export const accountsEnabled = () => process.env.AUTH_MODE === "accounts";
export const hostedLimits = () =>
  process.env.DEMO_MODE === "judges" || accountsEnabled();
export const judgeDemo = () =>
  process.env.DEMO_MODE === "judges" && !accountsEnabled();
export function workspaceId() {
  const id = context.getStore();
  if (hostedLimits() && !id) throw new Error("Workspace context required");
  return id || "local";
}
export function inWorkspace<T>(id: string, action: () => T): T {
  return context.run(id, action);
}
export function demoAvailable() {
  if (!judgeDemo()) return true;
  const until = Date.parse(process.env.DEMO_EXPIRES_AT || "");
  return (
    !!process.env.BUYER_ACCESS_KEY &&
    Number.isFinite(until) &&
    Date.now() < until
  );
}
