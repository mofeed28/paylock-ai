import { db } from "./db";
import { buyerPage } from "./auth";
export const agreementInclude = {
  sellerUser: {
    select: {
      id: true,
      name: true,
      email: true,
      paypalConnection: { select: { merchantId: true, status: true } },
    },
  },
  accessRequests: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: "desc" as const },
  },
  milestones: {
    orderBy: { position: "asc" as const },
    include: {
      submissions: { orderBy: { createdAt: "desc" as const } },
      agentRuns: {
        orderBy: { createdAt: "desc" as const },
        take: 5,
        select: {
          id: true,
          milestoneId: true,
          submissionId: true,
          status: true,
          planner: true,
          summary: true,
          traceJson: true,
          resultJson: true,
          createdAt: true,
          completedAt: true,
        },
      },
    },
  },
  payments: { orderBy: { createdAt: "desc" as const } },
  timeline: { orderBy: { createdAt: "desc" as const } },
};
export async function getAgreement(id: string) {
  const workspaceId = await buyerPage();
  return db.agreement.findFirst({
    where: { id, workspaceId },
    include: agreementInclude,
  });
}
export async function getDashboard() {
  const workspaceId = await buyerPage();
  return db.agreement.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
    include: agreementInclude,
  });
}
export type AgreementData = NonNullable<
  Awaited<ReturnType<typeof getAgreement>>
>;
export type Serialized<T> = T extends Date
  ? string
  : T extends Array<infer U>
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;
export type AgreementView = Serialized<AgreementData>;
export function jsonData<T>(data: T): Serialized<T> {
  return JSON.parse(JSON.stringify(data));
}
