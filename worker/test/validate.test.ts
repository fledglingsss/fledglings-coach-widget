import { describe, expect, it } from "vitest";

import { CAPS, validateCoachRequest } from "../src/lib/validate";

const GOOD_ID = "a".repeat(32);
const ZWSP = String.fromCharCode(0x200b); // zero-width space

function goodBody(overrides: Record<string, unknown> = {}) {
  return {
    learner_id: GOOD_ID,
    session_id: GOOD_ID,
    learner_name: "Alex Smith",
    page: "Budgeting That Works",
    messages: [{ role: "user", content: "how do I budget?" }],
    ...overrides,
  };
}

describe("validateCoachRequest", () => {
  it("accepts a well-formed request", () => {
    const result = validateCoachRequest(goodBody());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.learnerId).toBe(GOOD_ID);
      expect(result.request.history).toHaveLength(1);
      expect(result.request.history[0].content).toBe("how do I budget?");
    }
  });

  it("rejects non-object bodies", () => {
    expect(validateCoachRequest(null).ok).toBe(false);
    expect(validateCoachRequest("hi").ok).toBe(false);
    expect(validateCoachRequest([]).ok).toBe(false);
    expect(validateCoachRequest(undefined).ok).toBe(false);
  });

  it("rejects malformed ids rather than cleaning them", () => {
    expect(validateCoachRequest(goodBody({ learner_id: "short" })).ok).toBe(false);
    expect(
      validateCoachRequest(goodBody({ learner_id: "bad id with spaces!" })).ok,
    ).toBe(false);
    expect(validateCoachRequest(goodBody({ session_id: 42 })).ok).toBe(false);
    expect(validateCoachRequest(goodBody({ learner_id: undefined })).ok).toBe(false);
  });

  it("rejects missing, empty or malformed histories", () => {
    expect(validateCoachRequest(goodBody({ messages: [] })).ok).toBe(false);
    expect(validateCoachRequest(goodBody({ messages: "hi" })).ok).toBe(false);
    expect(
      validateCoachRequest(
        goodBody({ messages: [{ role: "wizard", content: "x" }] }),
      ).ok,
    ).toBe(false);
    expect(
      validateCoachRequest(goodBody({ messages: [{ role: "user", content: 7 }] }))
        .ok,
    ).toBe(false);
  });

  it("requires the final turn to be the learner's", () => {
    const result = validateCoachRequest(
      goodBody({
        messages: [
          { role: "user", content: "hi" },
          { role: "assistant", content: "hello!" },
        ],
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("caps turn count and turn length", () => {
    const many = Array.from({ length: 30 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: `turn ${i} ` + "y".repeat(5000),
    }));
    many.push({ role: "user", content: "final question" });
    const result = validateCoachRequest(goodBody({ messages: many }));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.history.length).toBeLessThanOrEqual(CAPS.maxTurns);
      for (const turn of result.request.history) {
        expect(turn.content.length).toBeLessThanOrEqual(CAPS.maxTurnChars);
      }
      expect(result.request.history.at(-1)?.content).toBe("final question");
    }
  });

  it("sanitises name and page context", () => {
    const result = validateCoachRequest(
      goodBody({
        learner_name: "  Alex \n Smith  " + "z".repeat(200),
        page: "Course:" + ZWSP + "  Money   Basics",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.request.learnerName.length).toBeLessThanOrEqual(
        CAPS.maxNameChars,
      );
      expect(result.request.learnerName).not.toContain("\n");
      expect(result.request.learnerName.startsWith("Alex Smith")).toBe(true);
      expect(result.request.page).toBe("Course: Money Basics");
    }
  });

  it("drops empty turns instead of failing", () => {
    const result = validateCoachRequest(
      goodBody({
        messages: [
          { role: "assistant", content: "   " },
          { role: "user", content: "real question" },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.request.history).toHaveLength(1);
  });
});
