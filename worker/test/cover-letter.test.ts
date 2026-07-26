import { describe, expect, it } from "vitest";

import {
  parseCoverLetterDraft,
  validateCoverLetterRequest,
} from "../src/lib/cover-letter";

const JD =
  "Retail assistant wanted for busy Birmingham store. You will serve customers, keep shelves stocked and support the team on weekends. Friendly and reliable people welcome.";

describe("validateCoverLetterRequest", () => {
  it("rejects a too-short advert", () => {
    expect(validateCoverLetterRequest({ jd: "tiny" })).toEqual({
      error: "jd_too_short",
    });
  });

  it("accepts a full request and sanitises single-line fields", () => {
    const r = validateCoverLetterRequest({
      jd: JD,
      cv_text: "Volunteered at the school shop for two years.",
      role: "Retail\nAssistant",
      company: "  Shopmart ",
    });
    expect("error" in r).toBe(false);
    if (!("error" in r)) {
      expect(r.role).toBe("Retail Assistant");
      expect(r.company).toBe("Shopmart");
    }
  });

  it("treats a missing CV as empty, not an error", () => {
    const r = validateCoverLetterRequest({ jd: JD });
    expect("error" in r).toBe(false);
    if (!("error" in r)) expect(r.cvText).toBe("");
  });
});

describe("parseCoverLetterDraft", () => {
  const good = {
    greeting: "Dear [Hiring manager's name],",
    paragraphs: [
      "I want the retail assistant role at Shopmart because [why this store].",
      "At my school shop I served customers for two years.",
      "I would bring that reliability to your weekend team.",
    ],
    signoff: "Yours sincerely,",
    personalise: ["[Hiring manager's name]", "[why this store]"],
    tips: ["Name a product range you know", "Keep it to one page"],
  };

  it("parses a valid draft", () => {
    const d = parseCoverLetterDraft(JSON.stringify(good));
    expect(d).not.toBeNull();
    expect(d).not.toBe("crisis");
    if (d && d !== "crisis") {
      expect(d.paragraphs).toHaveLength(3);
      expect(d.personalise).toHaveLength(2);
    }
  });

  it("rejects drafts missing the essentials", () => {
    expect(parseCoverLetterDraft(JSON.stringify({ ...good, greeting: "" }))).toBeNull();
    expect(
      parseCoverLetterDraft(JSON.stringify({ ...good, paragraphs: ["only one"] })),
    ).toBeNull();
    expect(parseCoverLetterDraft("not json")).toBeNull();
  });

  it("passes crisis through", () => {
    expect(parseCoverLetterDraft('{"crisis":true}')).toBe("crisis");
  });
});
