import { accountAuth } from "@/lib/account-auth";
import { accountsEnabled } from "@/lib/workspace";
import { equal, guardOrigin, ApiError } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function handle(request: Request) {
  if (!accountsEnabled())
    return Response.json(
      { message: "Accounts are not enabled." },
      { status: 404 },
    );
  try {
    guardOrigin(request);
    // Private beta enrollment. Emails are contact labels, never authorization claims.
    if (new URL(request.url).pathname === "/api/auth/sign-up/email") {
      if (
        !process.env.BUYER_ACCESS_KEY ||
        !equal(
          request.headers.get("x-paylock-access-code") || "",
          process.env.BUYER_ACCESS_KEY,
        )
      )
        throw new ApiError(
          403,
          "A valid beta access code is required to create an account.",
        );
    }
    return await accountAuth().handler(request);
  } catch (error) {
    return Response.json(
      {
        message:
          error instanceof ApiError
            ? error.message
            : "Account service unavailable.",
      },
      { status: error instanceof ApiError ? error.status : 503 },
    );
  }
}
export { handle as GET, handle as POST };
