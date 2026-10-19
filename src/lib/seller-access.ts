import { randomBytes } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./auth";

export async function requestSellerAccess(token: string, userId: string) {
  return db.$transaction(async (tx) => {
    const agreement = await tx.agreement.findUnique({
      where: { sellerToken: token },
    });
    if (
      !agreement ||
      !agreement.workspaceId.startsWith("account:") ||
      !agreement.sellerInviteExpiresAt ||
      agreement.sellerInviteExpiresAt <= new Date()
    )
      throw new ApiError(
        404,
        "Invitation expired or unavailable. Ask the buyer for a new link.",
      );
    if (agreement.workspaceId === `account:${userId}`)
      throw new ApiError(
        409,
        "You own this agreement. Share the invitation with a separate seller account.",
      );
    if (agreement.sellerUserId && agreement.sellerUserId !== userId)
      throw new ApiError(
        409,
        "A seller is already assigned to this agreement.",
      );
    const existing = await tx.sellerAccessRequest.findUnique({
      where: { agreementId_userId: { agreementId: agreement.id, userId } },
    });
    if (existing) return { status: existing.status };
    if (
      (await tx.sellerAccessRequest.count({
        where: { agreementId: agreement.id },
      })) >= 10
    )
      throw new ApiError(
        429,
        "Invitation request limit reached. Ask the buyer to renew the invitation.",
      );
    await tx.sellerAccessRequest.create({
      data: { agreementId: agreement.id, userId },
    });
    return { status: "PENDING" };
  });
}

export async function manageSellerAccess(
  agreementId: string,
  ownerWorkspace: string,
  action: "approve" | "renew",
  requestId?: string,
) {
  return db.$transaction(async (tx) => {
    const agreement = await tx.agreement.findFirst({
      where: { id: agreementId, workspaceId: ownerWorkspace },
    });
    if (!agreement || !ownerWorkspace.startsWith("account:"))
      throw new ApiError(404, "Agreement not found.");
    if (action === "renew") {
      await tx.agreement.update({
        where: { id: agreementId },
        data: {
          sellerUserId: null,
          sellerToken: randomBytes(32).toString("hex"),
          sellerInviteExpiresAt: new Date(Date.now() + 7 * 86400000),
        },
      });
      await tx.sellerAccessRequest.deleteMany({ where: { agreementId } });
      await tx.timelineEvent.create({
        data: {
          agreementId,
          actor: "buyer",
          type: "SELLER_ACCESS_REVOKED",
          message:
            "Seller access revoked and invitation renewed. Previous links no longer work.",
        },
      });
    } else {
      const request = await tx.sellerAccessRequest.findFirst({
        where: { id: requestId || "", agreementId, status: "PENDING" },
        include: { user: true },
      });
      if (!request || agreement.sellerUserId)
        throw new ApiError(
          409,
          "This request is no longer available. Revoke existing access before assigning another seller.",
        );
      await tx.agreement.update({
        where: { id: agreementId },
        data: { sellerUserId: request.userId },
      });
      await tx.sellerAccessRequest.updateMany({
        where: { agreementId, status: "PENDING" },
        data: { status: "DECLINED" },
      });
      await tx.sellerAccessRequest.update({
        where: { id: request.id },
        data: { status: "APPROVED" },
      });
      await tx.timelineEvent.create({
        data: {
          agreementId,
          actor: "buyer",
          type: "SELLER_ACCESS_GRANTED",
          message: `Buyer granted seller access to ${request.user.name} (account ${request.userId}).`,
        },
      });
    }
    return { ok: true };
  });
}
