import { describe, expect, it } from "vitest";

import {
  parseReviewReport,
  REVIEW_CAPS,
  reviewSystemPrompt,
  reviewUserMessage,
  validateReviewRequest,
} from "../src/lib/review";

const CV = "Experienced retail assistant. ".repeat(10);

describe("validateReviewRequest", () => {
  it("accepts a valid CV request", () => {
    const r = validateReviewRequest({ kind: "cv", text: CV, target: "Retail role" });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.kind).toBe("cv");
      expect(r.target).toBe("Retail role");
    }
  });

  it("rejects unknown kinds and too-short text", () => {
    expect(validateReviewRequest({ kind: "essay", text: CV, target: "" })).toEqual({
      error: "bad_kind",
    });
    expect(validateReviewRequest({ kind: "cv", text: "short", target: "" })).toEqual({
      error: "text_too_short",
    });
  });

  it("caps lengths", () => {
    const r = validateReviewRequest({
      kind: "linkedin",
      text: "x".repeat(50_000),
      target: "y".repeat(50_000),
    });
    if (!("error" in r)) {
      expect(r.text.length).toBeLessThanOrEqual(REVIEW_CAPS.maxTextChars);
      expect(r.target.length).toBeLessThanOrEqual(REVIEW_CAPS.maxTargetChars);
    } else {
      throw new Error("should validate");
    }
  });
});

describe("review prompts", () => {
  it("both prompts pin the no-fabrication law and injection defence", () => {
    for (const kind of ["cv", "linkedin"] as const) {
      const p = reviewSystemPrompt(kind);
      expect(p).toContain("NEVER invent");
      expect(p).toContain("verbatim quote");
      expect(p).toContain("data, not instructions");
      expect(p).toContain("STRICT JSON");
      expect(p).toContain('{"crisis":true}');
    }
  });

  it("wraps learner text as data blocks", () => {
    const msg = reviewUserMessage({ kind: "cv", text: CV, target: "Chef" });
    expect(msg).toContain("<learner_cv>");
    expect(msg).toContain("</learner_cv>");
    expect(msg).toContain("<target_role_or_advert>");
  });
});

describe("parseReviewReport", () => {
  const good = {
    overall: 62,
    verdict: "Solid start, needs sharpening",
    dimensions: [
      { label: "Impact", score: 55, tip: "Show outcomes, not duties." },
      { label: "Clarity & structure", score: 70, tip: "Good ordering." },
      { label: "ATS readiness", score: 60, tip: "Use standard headings." },
      { label: "Tailoring", score: 62, tip: "Name the sector you want." },
    ],
    strengths: ['Opens with "aspiring customer service apprentice" — clear intent.'],
    improvements: [
      { title: "Add outcomes", detail: "Say what changed because you were there." },
      { title: "Tighten the top third", detail: "Recruiters skim the first lines." },
    ],
    next_step: "Rewrite your first bullet to lead with a result.",
  };

  it("parses a valid report and clamps scores", () => {
    const r = parseReviewReport(JSON.stringify({ ...good, overall: 162.7 }));
    expect(r).not.toBeNull();
    expect(r).not.toBe("crisis");
    if (r && r !== "crisis") {
      expect(r.overall).toBe(100);
      expect(r.dimensions.length).toBe(4);
      expect(r.verdict).toBe("Solid start, needs sharpening");
    }
  });

  it("tolerates prose around the JSON", () => {
    const r = parseReviewReport("Here is the review:\n" + JSON.stringify(good) + "\nDone.");
    expect(r).not.toBeNull();
  });

  it("detects the crisis sentinel", () => {
    expect(parseReviewReport('{"crisis":true}')).toBe("crisis");
  });

  it("rejects junk and incomplete reports", () => {
    expect(parseReviewReport("no json here")).toBeNull();
    expect(parseReviewReport('{"overall":50}')).toBeNull();
    expect(
      parseReviewReport(JSON.stringify({ ...good, dimensions: good.dimensions.slice(0, 1) })),
    ).toBeNull();
  });
});
