import { describe, expect, it } from "vitest";

import {
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
      expect(p).toContain("No scores");
    }
  });

  it("wraps learner text as data blocks", () => {
    const msg = reviewUserMessage({ kind: "cv", text: CV, target: "Chef" });
    expect(msg).toContain("<learner_cv>");
    expect(msg).toContain("</learner_cv>");
    expect(msg).toContain("<target_role_or_advert>");
  });
});
