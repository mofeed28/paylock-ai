import { z } from "zod";
export const daySchema = z
  .string()
  .refine(
    (v) =>
      /^\d{4}-\d{2}-\d{2}$/.test(v) &&
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Use a valid date",
  );
export const milestoneSchema = z.object({
  title: z.string().trim().min(3).max(150),
  description: z.string().trim().min(10).max(2000),
  acceptanceCriteria: z.array(z.string().trim().min(5).max(500)).min(2).max(8),
  amount: z.number().int().min(100).max(10000000),
  dueDate: daySchema.nullable(),
  aiRiskNotes: z.string().max(1000),
});
export const planSchema = z.object({
  milestones: z.array(milestoneSchema).min(2).max(5),
  riskFlags: z.array(z.string().max(500)).max(8),
});
export const briefSchema = z.object({
  title: z.string().trim().min(3).max(150),
  sellerEmail: z.string().email().max(254),
  description: z.string().trim().min(30).max(12000),
  totalAmount: z.number().int().min(500).max(10000000),
  deadline: daySchema.nullable(),
});
export const agreementSchema = briefSchema
  .extend({
    plan: planSchema,
    aiSource: z.enum(["live", "fallback", "demo"]),
    sellerAccountId: z.string().trim().min(1).max(128).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.plan.milestones.reduce((n, m) => n + m.amount, 0) !== v.totalAmount)
      ctx.addIssue({
        code: "custom",
        message: "Milestone amounts must equal the agreement budget.",
      });
    if (
      v.deadline &&
      v.plan.milestones.some((m) => m.dueDate && m.dueDate > v.deadline!)
    )
      ctx.addIssue({
        code: "custom",
        message: "A milestone cannot be due after the project deadline.",
      });
  });
export const reviewSchema = z.object({
  score: z.number().int().min(0).max(100),
  recommendation: z.enum(["release", "revise", "dispute"]),
  explanation: z.string().min(10).max(3000),
  checklist: z
    .array(
      z.object({
        criterionIndex: z.number().int().min(0),
        passed: z.boolean(),
        evidence: z.string().max(2000),
      }),
    )
    .min(1)
    .max(8),
  riskFlags: z.array(z.string().max(500)).max(8),
});
export const submissionSchema = z.object({
  content: z.string().trim().min(20).max(16000),
  url: z
    .union([
      z.literal(""),
      z
        .string()
        .url()
        .max(2000)
        .refine(
          (v) => ["https:", "http:"].includes(new URL(v).protocol),
          "Use an http or https URL",
        ),
    ])
    .optional(),
});
export type Plan = z.infer<typeof planSchema>;
export type Brief = z.infer<typeof briefSchema>;
export type Review = z.infer<typeof reviewSchema>;
