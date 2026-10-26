import { randomBytes } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./auth";

export async function inviteSellerAccount(
  agreementId: string,
  workspace: string,
  accountId: string,
) {
  return db.$transaction(async (tx) => {
    const agreement = await tx.agreement.findFirst({
      where: { id: agreementId, workspaceId: workspace },
    });
    if (!agreement || !workspace.startsWith("account:"))
      throw new ApiError(404, "Agreement not found.");
    if (
      agreement.sellerUserId ||
      (await tx.sellerAccessRequest.findFirst({
        where: { agreementId, status: { in: ["INVITED", "DECLINED"] } },
      }))
    )
      throw new ApiError(
        409,
        "Renew the invitation before choosing another recipient.",
      );
    const user = await tx.user.findUnique({ where: { id: accountId } });
    if (
      !user ||
      workspace === `account:${user.id}` ||
      user.email.trim().toLowerCase() !==
        agreement.sellerEmail.trim().toLowerCase()
    )
      throw new ApiError(
        400,
        "Use the account ID your seller shared, with their matching Paylock email.",
      );
    await tx.sellerAccessRequest.updateMany({
      where: { agreementId, status: "PENDING" },
      data: { status: "DECLINED" },
    });
    await tx.sellerAccessRequest.upsert({
      where: { agreementId_userId: { agreementId, userId: user.id } },
      create: { agreementId, userId: user.id, status: "INVITED" },
      update: { status: "INVITED" },
    });
    await tx.agreement.update({
      where: { id: agreementId },
      data: { sellerInviteExpiresAt: new Date(Date.now() + 7 * 86400000) },
    });
    await tx.timelineEvent.create({
      data: {
        agreementId,
        actor: "buyer",
        type: "SELLER_INVITED",
        message: `Buyer invited ${user.name} (account ${user.id}). Waiting for seller acceptance.`,
      },
    });
    return { ok: true };
  });
}

export async function respondSellerInvitation(
  token: string,
  userId: string,
  action: "accept" | "decline",
) {
  return db.$transaction(async (tx) => {
    const agreement = await tx.agreement.findUnique({
      where: { sellerToken: token },
    });
    if (!agreement || !agreement.workspaceId.startsWith("account:"))
      throw new ApiError(404, "Invitation unavailable.");
    if (agreement.workspaceId === `account:${userId}`)
      throw new ApiError(409, "You cannot accept your own invitation.");
    if (agreement.sellerUserId === userId && action === "accept")
      return { status: "APPROVED" };
    if (
      agreement.sellerUserId ||
      !agreement.sellerInviteExpiresAt ||
      agreement.sellerInviteExpiresAt <= new Date()
    )
      throw new ApiError(409, "Invitation expired or no longer available.");
    const invitation = await tx.sellerAccessRequest.findUnique({
      where: { agreementId_userId: { agreementId: agreement.id, userId } },
    });
    if (invitation?.status === "DECLINED" && action === "decline")
      return { status: "DECLINED" };
    if (invitation?.status !== "INVITED")
      throw new ApiError(
        403,
        "Only the account chosen by the buyer can accept this invitation.",
      );
    const status = action === "accept" ? "APPROVED" : "DECLINED";
    if (action === "accept")
      await tx.agreement.update({
        where: { id: agreement.id },
        data: { sellerUserId: userId },
      });
    await tx.sellerAccessRequest.update({
      where: { id: invitation.id },
      data: { status },
    });
    await tx.timelineEvent.create({
      data: {
        agreementId: agreement.id,
        actor: "seller",
        type: action === "accept" ? "SELLER_ACCEPTED" : "SELLER_DECLINED",
        message:
          action === "accept"
            ? "Seller accepted the buyer's invitation. Payment approval remains with the buyer."
            : "Seller declined the invitation.",
      },
    });
    return { status };
  });
}

export async function manageSellerAccess(
  agreementId: string,
  ownerWorkspace: string,
  action: "renew",
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
    }
    return { ok: true };
  });
}
