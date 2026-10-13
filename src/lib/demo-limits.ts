import { db } from "./db";
import { demoAvailable, judgeDemo, workspaceId } from "./workspace";

// Persisted counters survive restarts; failed requests also consume a slot.
// These are application usage limits, not an AWS account spending cap.
export async function reserveModelCall(payload: unknown) {
  if (!judgeDemo()) return;
  if (!demoAvailable()) throw new Error("Judge demo closed");
  if (Buffer.byteLength(JSON.stringify(payload), "utf8") > 40000)
    throw new Error("Demo model input limit reached");
  const month = new Date().toISOString().slice(0, 7);
  const day = new Date().toISOString().slice(0, 10);
  await db.$transaction(async (tx) => {
    for (const [key, limit] of [
      [`models:${month}`, 60],
      [`models:${workspaceId()}:${day}`, 20],
    ] as const) {
      const changed =
        await tx.$executeRaw`INSERT INTO "DemoUsage" ("key", "count") VALUES (${key}, 1) ON CONFLICT("key") DO UPDATE SET "count" = "count" + 1 WHERE "count" < ${limit}`;
      if (changed !== 1)
        throw new Error(
          "Judge demo AI allowance reached; manual review remains available",
        );
    }
  });
}
