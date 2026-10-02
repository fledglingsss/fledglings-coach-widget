import { describe, expect, it } from "vitest";

import {
  QUESTION_GEN_CAPS,
  parseGeneratedQuestions,
  questionGenSystemPrompt,
  questionsSigFresh,
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

describe("question length: the model is told the limit the parser enforces", () => {
  /* The parser used to reject anything over 220 characters and the
   * model was never told. Real questions came back at 186 to 218, and
   * one over the line threw the whole set away - about one request in
   * five, with the learner's daily go already spent. */
  const ofLength = (n: number) => `${"Tell me about a time you had to be accurate. ".repeat(10).slice(0, n - 1)}?`;

  it("accepts a question as long as a real interviewer's two sentences", () => {
    const set = [ofLength(215), ofLength(240), ofLength(260), ...FIVE.slice(3)];
    const parsed = parseGeneratedQuestions(JSON.stringify({ role_label: "Role", questions: set }));
    expect(parsed).not.toBeNull();
    expect(parsed).not.toBe("crisis");
  });

  it("still refuses a question that has turned into a paragraph", () => {
    const set = [ofLength(QUESTION_GEN_CAPS.maxQuestionChars + 40), ...FIVE.slice(1)];
    expect(parseGeneratedQuestions(JSON.stringify({ role_label: "Role", questions: set }))).toBeNull();
  });

  it("gives the model a target with room to spare under the cap", () => {
    expect(QUESTION_GEN_CAPS.targetQuestionChars).toBeLessThan(QUESTION_GEN_CAPS.maxQuestionChars - 50);
  });

  it("states that target in every version of the prompt", () => {
    for (const mode of ["jd", "cv", "admission"] as const) {
      expect(questionGenSystemPrompt(mode), mode).toContain(
        `never more than ${QUESTION_GEN_CAPS.targetQuestionChars} characters`,
      );
    }
  });
});

describe("questionsSigningPayload (v2: learner-bound + issued-at)", () => {
  const HASH = "a1b2c3d4e5f6a7b8";
  const IAT = 1_753_900_000;

  it("is stable and order-sensitive", () => {
    expect(questionsSigningPayload(FIVE, HASH, IAT)).toBe(
      questionsSigningPayload([...FIVE], HASH, IAT),
    );
    expect(questionsSigningPayload(FIVE, HASH, IAT)).not.toBe(
      questionsSigningPayload([...FIVE].reverse(), HASH, IAT),
    );
  });

  it("binds to the learner and the issue time — different learner or time, different payload", () => {
    expect(questionsSigningPayload(FIVE, HASH, IAT)).not.toBe(
      questionsSigningPayload(FIVE, "ffffffffffffffff", IAT),
    );
    expect(questionsSigningPayload(FIVE, HASH, IAT)).not.toBe(
      questionsSigningPayload(FIVE, HASH, IAT + 1),
    );
  });
});

describe("questionsSigFresh", () => {
  const NOW = 1_753_900_000;
  it("accepts a set inside the 24h window", () => {
    expect(questionsSigFresh(NOW - 3600, NOW)).toBe(true);
    expect(questionsSigFresh(NOW, NOW)).toBe(true);
  });
  it("rejects expired, far-future and junk timestamps", () => {
    expect(questionsSigFresh(NOW - 25 * 3600, NOW)).toBe(false);
    expect(questionsSigFresh(NOW + 600, NOW)).toBe(false);
    expect(questionsSigFresh(0, NOW)).toBe(false);
    expect(questionsSigFresh(Number.NaN, NOW)).toBe(false);
  });
});
