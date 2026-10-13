import { AsyncLocalStorage } from "node:async_hooks";

const context = new AsyncLocalStorage<string>();
export const judgeDemo = () => process.env.DEMO_MODE === "judges";
export function workspaceId() {
  const id = context.getStore();
  if (judgeDemo() && !id) throw new Error("Judge workspace context required");
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
