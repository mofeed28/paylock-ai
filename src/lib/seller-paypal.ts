import { randomBytes } from "node:crypto";
import { db } from "./db";
import { ApiError } from "./auth";
import { platformConfigured, platformPayPal } from "./paypal-platform";

export async function sellerPayPalStatus(userId: string) {
  const row = await db.payPalConnection.findUnique({ where: { userId } });
  return {
    configured: platformConfigured(),
    status:
      row && row.partnerClientId === process.env.PAYPAL_PLATFORM_CLIENT_ID
        ? row.status
        : "NOT_CONNECTED",
    merchantId: row?.merchantId || null,
    checkedAt: row?.checkedAt?.toISOString() || null,
  };
}
export async function startSellerPayPal(userId: string, consent: boolean) {
  if (!consent)
    throw new ApiError(
      400,
      "Confirm that you want to share connection status with PayPal before continuing.",
    );
  if (!platformConfigured())
    throw new ApiError(
      503,
      "Seller connection is awaiting PayPal platform setup.",
    );
  const partnerClientId = process.env.PAYPAL_PLATFORM_CLIENT_ID!;
  const appUrl = new URL(process.env.APP_URL!);
  const row = await db.payPalConnection.upsert({
    where: { userId },
    create: {
      userId,
      trackingId: randomBytes(24).toString("hex"),
      partnerClientId,
      consentedAt: new Date(),
    },
    update: {},
  });
  if (row.partnerClientId !== partnerClientId)
    throw new ApiError(
      409,
      "This connection belongs to a different platform app. Ask the operator to restore its configuration.",
    );
  // Reuse the server-owned referral and tracking ID after an interrupted redirect.
  const result = row.referralId
    ? await platformPayPal(
        `/v2/customer/partner-referrals/${encodeURIComponent(row.referralId)}`,
      )
    : await platformPayPal(
        "/v2/customer/partner-referrals",
        "POST",
        {
          tracking_id: row.trackingId,
          partner_config_override: {
            return_url: new URL("/account?paypal=returned", appUrl).href,
          },
          operations: [
            {
              operation: "API_INTEGRATION",
              api_integration_preference: {
                rest_api_integration: {
                  integration_method: "PAYPAL",
                  integration_type: "THIRD_PARTY",
                  third_party_details: { features: ["PAYMENT", "REFUND"] },
                },
              },
            },
          ],
          products: ["EXPRESS_CHECKOUT"],
          legal_consents: [{ type: "SHARE_DATA_CONSENT", granted: true }],
        },
        `seller-referral:${row.trackingId}`,
      );
  const links = result.links as { rel: string; href: string }[] | undefined;
  const action = links?.find((link) => link.rel === "action_url")?.href;
  const self = links?.find((link) => link.rel === "self")?.href;
  if (!action)
    throw new ApiError(502, "PayPal did not return an onboarding link.");
  const url = new URL(action);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "www.sandbox.paypal.com" ||
    url.username ||
    url.password
  )
    throw new ApiError(
      502,
      "PayPal returned an unexpected onboarding destination.",
    );
  // PayPal referral IDs use Base64, including +, / and =. Decode the
  // suffix once, validate it, and encode it as one path parameter on reuse.
  let referralId: string | undefined;
  try {
    const reference = self ? new URL(self) : undefined;
    const prefix = "/v2/customer/partner-referrals/";
    if (
      reference?.protocol === "https:" &&
      ["api-m.sandbox.paypal.com", "api.sandbox.paypal.com"].includes(
        reference.hostname,
      ) &&
      !reference.username &&
      !reference.password &&
      !reference.port &&
      !reference.search &&
      !reference.hash &&
      reference.pathname.startsWith(prefix)
    ) {
      const candidate = decodeURIComponent(
        reference.pathname.slice(prefix.length),
      );
      if (/^[A-Za-z0-9+/_=-]{1,255}$/.test(candidate)) referralId = candidate;
    }
  } catch {
    // A malformed provider link must never be persisted or followed.
  }
  if (!referralId)
    throw new ApiError(
      502,
      "PayPal did not return a valid referral reference.",
    );
  await db.payPalConnection.update({
    where: { userId },
    data: { referralId, consentedAt: new Date() },
  });
  return { url: url.href };
}

type MerchantStatus = {
  merchant_id?: string;
  tracking_id?: string;
  payments_receivable?: boolean;
  primary_email_confirmed?: boolean;
  oauth_integrations?: {
    oauth_third_party?: { partner_client_id?: string; scopes?: string[] }[];
  }[];
};
export async function refreshSellerPayPal(userId: string) {
  const row = await db.payPalConnection.findUnique({ where: { userId } });
  if (!row)
    throw new ApiError(409, "Start connecting your PayPal account first.");
  if (row.partnerClientId !== process.env.PAYPAL_PLATFORM_CLIENT_ID)
    throw new ApiError(
      409,
      "The PayPal platform configuration changed. Connection verification is blocked.",
    );
  // Never trust merchantIdInPayPal, permissionsGranted or email from a callback.
  const base = `/v1/customer/partners/${encodeURIComponent(process.env.PAYPAL_PARTNER_MERCHANT_ID || "")}/merchant-integrations`;
  try {
    const found = (await platformPayPal(
      `${base}?tracking_id=${encodeURIComponent(row.trackingId)}`,
    )) as MerchantStatus;
    if (!found.merchant_id) {
      await db.payPalConnection.update({
        where: { userId },
        data: { status: "PENDING", checkedAt: new Date() },
      });
      return sellerPayPalStatus(userId);
    }
    if (
      !/^[A-Z0-9]{13}$/.test(found.merchant_id) ||
      found.tracking_id !== row.trackingId ||
      (row.merchantId && row.merchantId !== found.merchant_id)
    )
      throw new ApiError(
        409,
        "PayPal returned a different seller identity. No connection was changed.",
      );
    const detail = (await platformPayPal(
      `${base}/${found.merchant_id}`,
    )) as MerchantStatus;
    if (
      detail.merchant_id !== found.merchant_id ||
      detail.tracking_id !== row.trackingId
    )
      throw new ApiError(
        409,
        "PayPal could not confirm ownership of this connection.",
      );
    const permission = detail.oauth_integrations
      ?.flatMap((i) => i.oauth_third_party || [])
      .some(
        (p) =>
          p.partner_client_id === row.partnerClientId &&
          p.scopes?.includes(
            "https://uri.paypal.com/services/payments/payment/authcapture",
          ),
      );
    const ready =
      detail.payments_receivable === true &&
      detail.primary_email_confirmed === true &&
      permission;
    const duplicate = await db.payPalConnection.findUnique({
      where: { merchantId: found.merchant_id },
    });
    if (duplicate && duplicate.userId !== userId)
      throw new ApiError(
        409,
        "This PayPal merchant is already connected to another Paylock account.",
      );
    await db.payPalConnection.update({
      where: { userId },
      data: {
        merchantId: found.merchant_id,
        status: ready ? "READY" : "ACTION_REQUIRED",
        checkedAt: new Date(),
      },
    });
    return sellerPayPalStatus(userId);
  } catch (error) {
    await db.payPalConnection.update({
      where: { userId },
      data: { status: "CHECK_FAILED", checkedAt: new Date() },
    });
    throw error;
  }
}

export async function verifiedSeller(userId: string) {
  const result = await refreshSellerPayPal(userId);
  if (result.status !== "READY" || !result.merchantId)
    throw new ApiError(
      409,
      "The seller must finish connecting PayPal before payment can proceed.",
    );
  return result.merchantId;
}
