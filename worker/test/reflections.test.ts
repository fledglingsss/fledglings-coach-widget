import { describe, expect, it } from "vitest";

import {
  classifyUnit,
  emptyState,
  moduleShift,
  parseResponse,
  scanForSafeguarding,
  type AssessmentUnit,
  type ReflectionResponse,
} from "../src/lib/reflections";

const UNIT: AssessmentUnit = {
  courseId: "sso-2-2",
  courseTitle: "Money Confidence & Everyday Decisions",
  unitId: "u1",
  unitTitle: "Initial Self - Reflection",
  kind: "pre",
};

/* Shape copied from the LearnWorlds API docs example. */
const LW_ROW = {
  id: "63231d88da4ed9ba7d0198f4",
  user_id: "549d7ee2e4b4c8b511000000",
  email: "Learner@Example.com",
  grade: 50,
  passed: true,
  submittedTimestamp: 1663246805.047033,
  answers: [
    {
      blockId: "mc1",
      blockType: "mc",
      description: "How confident do you feel managing money?",
      answer: "3",
      points: 3,
      blockMaxScore: 5,
    },
    {
      blockId: "ft1",
      blockType: "freeText",
      description: "Anything you want to tell us?",
      answer: "Looking forward to learning about budgeting properly.",
      points: 0,
      blockMaxScore: 0,
    },
  ],
};

describe("classifyUnit", () => {
  it("recognises the Fledglings pre/post unit titles", () => {
    expect(classifyUnit("Initial Self - Reflection")).toBe("pre");
    expect(classifyUnit("Post Completion Feedback")).toBe("post");
    expect(classifyUnit("The Money Confidence Quiz")).toBe("other");
    expect(classifyUnit("Understanding Your Spending Habits")).toBe("other");
  });
});

describe("parseResponse", () => {
  it("parses the documented LearnWorlds response shape", () => {
    const r = parseResponse(LW_ROW);
    expect(r).not.toBeNull();
    expect(r!.email).toBe("learner@example.com");
    expect(r!.answers.length).toBe(2);
    expect(r!.answers[0]).toEqual({
      question: "How confident do you feel managing money?",
      answer: "3",
      points: 3,
      maxPoints: 5,
    });
  });

  it("rejects rows without identity and tolerates junk", () => {
    expect(parseResponse({ answers: [] })).toBeNull();
    expect(parseResponse("junk")).toBeNull();
    expect(parseResponse(null)).toBeNull();
  });
});

describe("scanForSafeguarding", () => {
  it("flags crisis language in free-text answers only", () => {
    const resp = parseResponse({
      ...LW_ROW,
      answers: [
        { blockType: "freeText", description: "How are you feeling?", answer: "honestly I want to hurt myself", points: 0, blockMaxScore: 0 },
        { blockType: "mc", description: "Confidence 1-5", answer: "2", points: 2, blockMaxScore: 5 },
      ],
    })!;
    const flags = scanForSafeguarding(UNIT, resp);
    expect(flags.length).toBe(1);
    expect(flags[0]!.answer).toContain("hurt myself");
    expect(flags[0]!.courseTitle).toBe(UNIT.courseTitle);
  });

  it("does not flag ordinary reflective answers", () => {
    const resp = parseResponse(LW_ROW)!;
    expect(scanForSafeguarding(UNIT, resp)).toEqual([]);
  });
});

describe("moduleShift", () => {
  const rated = (score: number, max: number): ReflectionResponse => ({
    userId: "u",
    email: "a@b.c",
    submittedAt: null,
    answers: [{ question: "q", answer: String(score), points: score, maxPoints: max }],
  });

  it("computes pre/post averages and the shift", () => {
    const s = moduleShift("c1", "Module", [rated(2, 5), rated(3, 5)], [rated(4, 5), rated(5, 5)]);
    expect(s.preAvgPct).toBe(50);
    expect(s.postAvgPct).toBe(90);
    expect(s.shift).toBe(40);
    expect(s.preCount).toBe(2);
  });

  it("falls back to numeric answers when no points are set", () => {
    const noPoints = (n: string): ReflectionResponse => ({
      userId: "u",
      email: "a@b.c",
      submittedAt: null,
      answers: [{ question: "q", answer: n, points: null, maxPoints: null }],
    });
    const s = moduleShift("c1", "Module", [noPoints("4")], [noPoints("8")]);
    expect(s.preAvgPct).toBe(40);
    expect(s.postAvgPct).toBe(80);
  });

  it("returns null shift when a side has no rateable data", () => {
    const s = moduleShift("c1", "Module", [], [rated(4, 5)]);
    expect(s.preAvgPct).toBeNull();
    expect(s.shift).toBeNull();
  });
});

describe("emptyState", () => {
  it("starts a building sweep at course zero", () => {
    const s = emptyState(33, new Date("2026-07-21T12:00:00Z"));
    expect(s.status).toBe("building");
    expect(s.cursor).toBe(0);
    expect(s.totalCourses).toBe(33);
    expect(s.flags).toEqual([]);
  });
});
