import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import {
  ApiError,
  equal,
  guardOrigin,
  rateLimit,
  requireBuyer,
  serialized,
  session,
} from "@/lib/auth";
import { generateAgreementMilestones } from "@/lib/ai";
import { briefSchema, submissionSchema } from "@/lib/schema";
import {
  authorize,
  capture,
  createAgreement,
  createOrder,
  decide,
  rereview,
  seedDemo,
  submitDemoRevision,
  submitWork,
} from "@/lib/service";
import { getAgreement } from "@/lib/data";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const idSchema = z.string().min(1).max(100);
async function handle(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path } = await context.params;
    const route = path.join("/");
    if (request.method === "GET") {
      await requireBuyer();
      if (path[0] === "agreements" && path[2] === "export") {
        const data = await getAgreement(path[1]);
        if (!data) throw new ApiError(404, "Agreement not found.");
        // Exclude the bearer seller token and provider payloads from portable evidence packets.
        const { sellerToken: omittedToken, payments, ...publicData } = data;
        void omittedToken;
        return new NextResponse(
          JSON.stringify(
            {
              ...publicData,
              payments: payments.map(({ rawJson: omittedRaw, ...p }) => {
                void omittedRaw;
                return p;
              }),
            },
            null,
            2,
          ),
          {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="paylock-${data.id}.json"`,
              "Cache-Control": "no-store",
            },
          },
        );
      }
      throw new ApiError(404, "Endpoint not found.");
    }
    guardOrigin(request);
    rateLimit(request);
    if (Number(request.headers.get("content-length") || 0) > 50000)
      throw new ApiError(413, "Request too large.");
    const text = await request.text();
    if (text.length > 50000) throw new ApiError(413, "Request too large.");
    const body = text ? JSON.parse(text) : {};
    if (route === "login") {
      const key = z.object({ key: z.string().max(512) }).parse(body).key;
      if (
        !process.env.BUYER_ACCESS_KEY ||
        !equal(key, process.env.BUYER_ACCESS_KEY)
      )
        throw new ApiError(401, "Incorrect buyer access key.");
      (await cookies()).set("paylock-buyer", session(), {
        httpOnly: true,
        sameSite: "strict",
        secure: new URL(request.url).protocol === "https:",
        path: "/",
        maxAge: 8 * 3600,
      });
      return NextResponse.json({ ok: true });
    }
    if (path[0] === "seller" && path[2] === "submit") {
      const input = submissionSchema
        .extend({ milestoneId: idSchema })
        .parse(body);
      const result = await serialized(() =>
        submitWork(input.milestoneId, path[1], input.content, input.url),
      );
      return NextResponse.json(result);
    }
    await requireBuyer();
    const result = await serialized(async () => {
      if (route === "ai/generate")
        return generateAgreementMilestones(briefSchema.parse(body));
      if (route === "agreements") return createAgreement(body);
      if (route === "demo")
        return seedDemo(
          z.object({ fresh: z.boolean().optional() }).parse(body).fresh,
        );
      if (route === "paypal/create-order")
        return createOrder(idSchema.parse(body.milestoneId));
      if (route === "paypal/authorize-order")
        return authorize(
          idSchema.parse(body.milestoneId),
          idSchema.parse(body.orderId),
        );
      if (route === "paypal/capture-order")
        return capture(
          idSchema.parse(body.milestoneId),
          z.string().trim().min(10).max(1000).parse(body.reason),
        );
      if (path[0] === "milestones") {
        const id = idSchema.parse(path[1]);
        if (path[2] === "practice-authorize") {
          const { milestone } = await import("@/lib/service");
          if ((await milestone(id)).agreement.paymentMode !== "practice")
            throw new ApiError(
              409,
              "Practice actions are disabled for sandbox agreements.",
            );
          return authorize(id);
        }
        if (path[2] === "review") return rereview(id);
        if (path[2] === "demo-revision") return submitDemoRevision(id);
        if (path[2] === "decision") {
          const input = z
            .object({
              action: z.enum(["revise", "dispute", "reopen"]),
              reason: z.string().trim().min(10).max(1000),
            })
            .parse(body);
          return decide(id, input.action, input.reason);
        }
      }
      throw new ApiError(404, "Endpoint not found.");
    });
    return NextResponse.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: error.issues.map((i) => i.message).join(" ") },
        { status: 400 },
      );
    if (error instanceof ApiError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid JSON request." },
        { status: 400 },
      );
    console.error(
      "Paylock request failed",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      {
        error:
          "The request could not be completed. Please retry; existing work is saved.",
      },
      { status: 500 },
    );
  }
}
export const POST = handle;
export const GET = handle;
