import { db } from "./db";

export async function sellerInbox(userId: string) {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  // Unverified email discovers only an opaque invitation, never agreement details.
  const matches = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM Agreement WHERE lower(trim(sellerEmail)) = ${user.email.trim().toLowerCase()}
      AND workspaceId LIKE 'account:%' AND workspaceId <> ${`account:${userId}`}
      AND sellerUserId IS NULL
  `;
  const [agreements, invitations] = await Promise.all([
    db.agreement.findMany({
      where: { sellerUserId: userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        buyerName: true,
        sellerToken: true,
        totalAmount: true,
        milestones: {
          orderBy: { position: "asc" },
          select: { id: true, status: true },
        },
      },
    }),
    db.agreement.findMany({
      where: {
        workspaceId: { startsWith: "account:", not: `account:${userId}` },
        sellerUserId: null,
        sellerInviteExpiresAt: { gt: new Date() },
        OR: [
          { id: { in: matches.map((m) => m.id) } },
          {
            accessRequests: {
              some: {
                userId,
                status: { in: ["PENDING", "INVITED", "DECLINED"] },
              },
            },
          },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        sellerToken: true,
        createdAt: true,
        accessRequests: { where: { userId }, select: { status: true } },
      },
    }),
  ]);
  return { agreements, invitations };
}
