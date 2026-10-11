import { db } from "./db";
import { buyerPage } from "./auth";
export const agreementInclude = {
  milestones: {
    orderBy: { position: "asc" as const },
    include: { submissions: { orderBy: { createdAt: "desc" as const } } },
  },
  payments: { orderBy: { createdAt: "desc" as const } },
  timeline: { orderBy: { createdAt: "desc" as const } },
};
export async function getAgreement(id: string) {
  await buyerPage();
  return db.agreement.findUnique({ where: { id }, include: agreementInclude });
}
export async function getDashboard() {
  await buyerPage();
  return db.agreement.findMany({
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
