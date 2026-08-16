import { describe, expect, it } from "vitest";

import {
  buildCoverage,
  classifyUnit,
  emptyState,
  moduleShift,
  parseResponse,
  RAW_ANSWER_MAX_CHARS,
  rawRows,
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
  it("recognises every real Fledglings pre/post title (live inventory 2026-07-21)", () => {
    expect(classifyUnit("Initial Self - Reflection")).toBe("pre");
    expect(classifyUnit("Initial Self Reflection")).toBe("pre");
    expect(classifyUnit("Post Completion Feedback")).toBe("post");
    expect(classifyUnit("Post Completion Reflection")).toBe("post");
  });

  it("refuses quizzes and mid-module activities (different measurement scales)", () => {
    expect(classifyUnit("Initial Knowledge Check")).toBe("other");
    expect(classifyUnit("Your Initial Knowledge")).toBe("other");
    expect(classifyUnit("Introduction Test")).toBe("other");
    expect(classifyUnit("5-Minute Reset Routine Reflection")).toBe("other");
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

  it("parses fraction-style self-ratings like the live data", () => {
    const frac = (v: string): ReflectionResponse => ({
      userId: "u",
      email: "a@b.c",
      submittedAt: null,
      answers: [{ question: "q", answer: v, points: null, maxPoints: null }],
    });
    const s = moduleShift("c1", "Module", [frac("3 / 10")], [frac("8 / 10")]);
    expect(s.preAvgPct).toBe(30);
    expect(s.postAvgPct).toBe(80);
    expect(s.shift).toBe(50);
    /* Nonsense fractions never poison the average. */
    expect(moduleShift("c1", "M", [frac("15 / 10")], []).preAvgPct).toBeNull();
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
  it("starts a building sweep at course zero with responses assumed on", () => {
    const s = emptyState(33, new Date("2026-07-21T12:00:00Z"));
    expect(s.status).toBe("building");
    expect(s.responsesEnabled).toBe(true);
    expect(s.cursor).toBe(0);
    expect(s.totalCourses).toBe(33);
    expect(s.flags).toEqual([]);
    expect(s.coverage).toEqual([]);
    expect(s.userTags).toEqual({});
  });
});

describe("buildCoverage", () => {
  it("maps the real sso-2-2 unit inventory to pre/post/other", () => {
    const cv = buildCoverage("sso-2-2", "Money Confidence & Everyday Decisions", [
      { title: "Initial Self - Reflection", type: "assessmentV2" },
      { title: "Introduction", type: "scorm" },
      { title: "Understanding Your Spending Habits", type: "assessmentV2" },
      { title: "The Money Confidence Quiz", type: "assessmentV2" },
      { title: "Post Completion Feedback", type: "assessmentV2" },
    ]);
    expect(cv.preTitle).toBe("Initial Self - Reflection");
    expect(cv.postTitle).toBe("Post Completion Feedback");
    expect(cv.otherTitles).toEqual([
      "Understanding Your Spending Habits",
      "The Money Confidence Quiz",
    ]);
  });

  it("reports missing pre/post as null", () => {
    const cv = buildCoverage("x", "Module", [{ title: "A Quiz", type: "assessmentV2" }]);
    expect(cv.preTitle).toBeNull();
    expect(cv.postTitle).toBeNull();
  });
});

describe("rawRows", () => {
  it("flattens a response into one verbatim row per answered question", () => {
    const response: ReflectionResponse = {
      userId: "u9",
      email: "amy@swift.test",
      submittedAt: 1_753_000_000,
      answers: [
        { question: "How confident do you feel about budgeting?", answer: "3", points: 3, maxPoints: 10 },
        { question: "What worries you most about money?", answer: "Running out before payday.", points: null, maxPoints: null },
        { question: "Skipped", answer: "", points: null, maxPoints: null },
      ],
    };
    const rows = rawRows(UNIT, response);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({
      email: "amy@swift.test",
      courseTitle: UNIT.courseTitle,
      unitTitle: UNIT.unitTitle,
      kind: "pre",
      answer: "3",
    });
    expect(rows[1]!.answer).toBe("Running out before payday.");
  });

  it("caps runaway answers at the storage bound, and says that it did", () => {
    const response: ReflectionResponse = {
      userId: "u9",
      email: "amy@swift.test",
      submittedAt: null,
      answers: [{ question: "Q", answer: "x".repeat(2000), points: null, maxPoints: null }],
    };
    const answer = rawRows(UNIT, response)[0]!.answer;
    expect(answer.slice(0, RAW_ANSWER_MAX_CHARS)).toBe("x".repeat(RAW_ANSWER_MAX_CHARS));
    /* Shown as the learner's verbatim words, so the reader must be
     * able to see that the ending is ours and not theirs. */
    expect(answer.endsWith("… [truncated]")).toBe(true);
  });
});

describe("rich-text stripping", () => {
  it("removes editor markup from questions and answers", () => {
    const r = parseResponse({
      ...LW_ROW,
      answers: [{ blockType: "freeText", description: "Do you think budgets are restrictive?", answer: "<strong>empowering</strong> — I can plan ahead.<br />More freedom.", points: 0, blockMaxScore: 0 }],
    })!;
    expect(r.answers[0]!.answer).toBe("empowering — I can plan ahead. More freedom.");
  });
});
