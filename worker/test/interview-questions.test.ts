import { describe, expect, it } from "vitest";

import {
  parseGeneratedQuestions,
  questionsSigningPayload,
  validateQuestionGenRequest,
} from "../src/lib/interview-questions";

const FIVE = [
  "Tell me about yourself and why this warehouse role interests you.",
  "The advert asks for reliability — describe a time you kept a commitment when it was hard.",
  "Tell me about a time you worked as part of a team to get something finished.",
  "A delivery arrives short-staffed and orders are backing up — what do you do first?",
  "What would you want to learn in your first three months here?",
];

describe("validateQuestionGenRequest", () => {
  it("rejects a too-short advert", () => {
    expect(validateQuestionGenRequest({ jd: "short" })).toEqual({ error: "jd_too_short" });
  });
  it("accepts and sanitises a real advert", () => {
    const r = validateQuestionGenRequest({
      jd: "Warehouse operative wanted. Duties include picking, packing and keeping the floor safe. Reliability essential.",
    });
    expect("error" in r).toBe(false);
  });
});

describe("parseGeneratedQuestions", () => {
  it("parses a valid five-question set", () => {
    const parsed = parseGeneratedQuestions(
      JSON.stringify({ role_label: "Warehouse Operative", questions: FIVE }),
    );
    expect(parsed).not.toBeNull();
    expect(parsed).not.toBe("crisis");
    if (parsed && parsed !== "crisis") {
      expect(parsed.questions).toHaveLength(5);
      expect(parsed.roleLabel).toBe("Warehouse Operative");
    }
  });

  it("rejects the wrong number of questions", () => {
    expect(
      parseGeneratedQuestions(
        JSON.stringify({ role_label: "Role", questions: FIVE.slice(0, 3) }),
      ),
    ).toBeNull();
  });

  it("rejects junk questions and missing labels", () => {
    expect(
      parseGeneratedQuestions(JSON.stringify({ role_label: "", questions: FIVE })),
    ).toBeNull();
    expect(
      parseGeneratedQuestions(
        JSON.stringify({ role_label: "Role", questions: ["hi", ...FIVE.slice(1)] }),
      ),
    ).toBeNull();
  });

  it("passes crisis through", () => {
    expect(parseGeneratedQuestions('{"crisis":true}')).toBe("crisis");
  });
});

describe("questionsSigningPayload", () => {
  it("is stable and order-sensitive", () => {
    expect(questionsSigningPayload(FIVE)).toBe(questionsSigningPayload([...FIVE]));
    expect(questionsSigningPayload(FIVE)).not.toBe(
      questionsSigningPayload([...FIVE].reverse()),
    );
  });
});
