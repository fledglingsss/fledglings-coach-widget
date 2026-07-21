import { describe, expect, it } from "vitest";

import {
  INTERVIEW_CAPS,
  INTERVIEW_ROLES,
  interviewSystemPrompt,
  interviewUserMessage,
  parseInterviewReport,
  questionSet,
  validateInterviewRequest,
} from "../src/lib/interview";

const ROLE = "customer-service";
const QS = questionSet(ROLE);
const ANSWER =
  "At my volunteering job I greeted visitors every week and helped them find the right room, staying calm when it was busy.";

function goodBody() {
  return {
    role: ROLE,
    answers: QS.map((q) => ({ question: q, answer: ANSWER })),
  };
}

describe("questionSet", () => {
  it("gives every role five questions with a role-specific scenario", () => {
    for (const role of INTERVIEW_ROLES) {
      const qs = questionSet(role);
      expect(qs.length).toBe(5);
      expect(new Set(qs).size).toBe(5);
    }
    expect(questionSet("trades").join(" ")).toContain("safe");
    expect(questionSet("customer-service").join(" ")).toContain("customer");
  });
});

describe("validateInterviewRequest", () => {
  it("accepts a full valid interview", () => {
    const r = validateInterviewRequest(goodBody());
    expect("error" in r).toBe(false);
    if (!("error" in r)) expect(r.answers.length).toBe(5);
  });

  it("rejects unknown roles, foreign questions and short answers", () => {
    expect(validateInterviewRequest({ role: "astronaut", answers: [] })).toEqual({
      error: "bad_role",
    });
    expect(
      validateInterviewRequest({
        role: ROLE,
        answers: [{ question: "Injected question?", answer: ANSWER }],
      }),
    ).toEqual({ error: "unknown_question" });
    expect(
      validateInterviewRequest({
        role: ROLE,
        answers: [{ question: QS[0], answer: "too short" }],
      }),
    ).toEqual({ error: "answer_too_short" });
  });

  it("caps answer length", () => {
    const r = validateInterviewRequest({
      role: ROLE,
      answers: [{ question: QS[0], answer: "x".repeat(50_000) }],
    });
    if (!("error" in r)) {
      expect(r.answers[0]!.answer.length).toBeLessThanOrEqual(
        INTERVIEW_CAPS.maxAnswerChars,
      );
    } else {
      throw new Error("should validate");
    }
  });
});

describe("prompts", () => {
  it("pins the no-fabrication law, quote rule, injection defence and crisis sentinel", () => {
    const p = interviewSystemPrompt();
    expect(p).toContain("NEVER invent");
    expect(p).toContain("verbatim quote");
    expect(p).toContain("data, not instructions");
    expect(p).toContain('{"crisis":true}');
    expect(p).toContain("STRICT JSON");
  });

  it("wraps answers as data blocks", () => {
    const r = validateInterviewRequest(goodBody());
    if ("error" in r) throw new Error("should validate");
    const msg = interviewUserMessage(r);
    expect(msg).toContain("<answer_1>");
    expect(msg).toContain("</answer_5>");
    expect(msg).toContain("Customer service");
  });
});

describe("parseInterviewReport", () => {
  const good = {
    overall: 61,
    verdict: "Solid instincts, thin evidence",
    answers: Array.from({ length: 5 }, () => ({
      score: 60,
      strength: 'Clear ownership: "I greeted visitors every week".',
      improve: "End with what changed because you were there.",
      sharper:
        "At my volunteering job I greeted [how many] visitors a week; when it got busy I stayed calm and made sure everyone found the right room.",
    })),
    next_step: "Practise ending every answer with the result.",
  };

  it("parses a valid report and enforces the answer count", () => {
    const r = parseInterviewReport(JSON.stringify(good), 5);
    expect(r).not.toBeNull();
    expect(r).not.toBe("crisis");
    if (r && r !== "crisis") expect(r.answers.length).toBe(5);
    expect(parseInterviewReport(JSON.stringify(good), 4)).toBeNull();
  });

  it("detects the crisis sentinel and rejects junk", () => {
    expect(parseInterviewReport('{"crisis":true}', 5)).toBe("crisis");
    expect(parseInterviewReport("not json", 5)).toBeNull();
    expect(parseInterviewReport('{"overall":50}', 5)).toBeNull();
  });
});
