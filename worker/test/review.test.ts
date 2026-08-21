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

  it("parses a valid report", () => {
    const r = parseReviewReport(JSON.stringify(good));
    expect(r).not.toBeNull();
    expect(r).not.toBe("crisis");
    if (r && r !== "crisis") {
      expect(r.dimensions.length).toBe(4);
      expect(r.verdict).toBe("Solid start, needs sharpening");
    }
  });

  /* The headline is the weighted sum of the dimensions. Before this it
   * was a separate number the model chose, so the ring could disagree
   * with the bars underneath it — and a learner would be right not to
   * trust either. */
  it("derives the headline from the dimensions and their weights", () => {
    const r = parseReviewReport(JSON.stringify(good), "cv");
    if (!r || r === "crisis") throw new Error("expected a report");
    /* Impact 55 x35 + ATS 60 x25 + Clarity 70 x20 + Tailoring 62 x20 */
    expect(r.overall).toBe(Math.round((55 * 35 + 60 * 25 + 70 * 20 + 62 * 20) / 100));
  });

  it("ignores an overall the model made up, however extreme", () => {
    const honest = parseReviewReport(JSON.stringify(good), "cv");
    for (const invented of [162.7, 0, 99]) {
      const r = parseReviewReport(JSON.stringify({ ...good, overall: invented }), "cv");
      if (!r || r === "crisis" || !honest || honest === "crisis") throw new Error("expected reports");
      expect(r.overall).toBe(honest.overall);
    }
  });

  it("scores a LinkedIn review against the LinkedIn weights", () => {
    const li = {
      ...good,
      dimensions: [
        { label: "Headline", score: 40, tip: "Say where you are heading." },
        { label: "About section", score: 60, tip: "Add a real example." },
        { label: "Experience detail", score: 80, tip: "Good detail." },
        { label: "Starter habits", score: 20, tip: "Add your skills." },
      ],
    };
    const r = parseReviewReport(JSON.stringify(li), "linkedin");
    if (!r || r === "crisis") throw new Error("expected a report");
    expect(r.overall).toBe(Math.round((40 * 30 + 60 * 25 + 80 * 25 + 20 * 20) / 100));
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
