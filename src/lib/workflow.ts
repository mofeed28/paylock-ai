// Presentation guidance only. Payment authorization remains enforced by the server.
export function nextMilestoneStep(m: {
  status: string;
  paymentStatus: string;
  hasSubmission: boolean;
}) {
  if (m.paymentStatus === "CAPTURED" || m.status === "RELEASED")
    return "receipt";
  if (m.paymentStatus === "CAPTURE_PENDING") return "pending";
  if (m.status === "DISPUTED") return "dispute";
  if (m.paymentStatus === "UNFUNDED") return "authorize";
  if (m.status === "REVISION_REQUESTED") return "revise";
  if (!m.hasSubmission) return "submit";
  return "review";
}
