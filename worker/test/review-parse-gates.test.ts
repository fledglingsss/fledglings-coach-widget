/* The report parser's gates decide what counts as "unusable", and an
 * unusable report costs the learner a daily slot. So the gates must
 * reject only what is genuinely unusable — not a strong CV that
 * earned a single improvement. */
import { describe, expect, it } from "vitest";

import { parseReviewReport } from "../src/lib/review";

function report(over: Record<string, unknown> = {}): string {
  return JSON.stringify({
    verdict: "Strong and specific",
    next_step: "Add the predicted grade to the BTEC line.",
    dimensions: [
      { label: "Impact", score: 82, tip: "Every line proves a result." },
      { label: "ATS readiness", score: 78, tip: "Standard headings throughout." },
      { label: "Clarity & structure", score: 80, tip: "Skims cleanly." },
      { label: "Tailoring", score: 74, tip: "Opens with the role." },
    ],
    strengths: ["'Served 200+ customers a shift' proves scale."],
    improvements: [
      {
        title: "Add the predicted grade",
        detail: "'BTEC Business' has no grade. Recruiters read a blank as unknown.",
        example: "BTEC Level 3 Business (Predicted: [grade])",
      },
    ],
    keywords: { matched: [], missing: [] },
    ...over,
  });
}

describe("what the parser treats as unusable", () => {
  it("accepts a strong document that earned only one improvement", () => {
    const parsed = parseReviewReport(report(), "cv");
    expect(parsed).not.toBeNull();
    expect(parsed).not.toBe("crisis");
    if (parsed && parsed !== "crisis") {
      expect(parsed.improvements).toHaveLength(1);
      expect(parsed.overall).toBeGreaterThan(70);
    }
  });

  it("still rejects a report with no improvements at all", () => {
    expect(parseReviewReport(report({ improvements: [] }), "cv")).toBeNull();
  });

  it("still rejects a report missing its verdict or next step", () => {
    expect(parseReviewReport(report({ verdict: "" }), "cv")).toBeNull();
    expect(parseReviewReport(report({ next_step: "" }), "cv")).toBeNull();
  });

  it("still rejects prose instead of JSON", () => {
    expect(parseReviewReport("Here is a poem about your CV.", "cv")).toBeNull();
  });
});
