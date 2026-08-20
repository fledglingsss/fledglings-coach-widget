/* A disclosure must reach signposting whatever shape the request is
 * in. Screening used to run only on the validated request, so text
 * that failed validation was answered with an error instead. */
import { describe, expect, it } from "vitest";

import { crisisInRawRequest } from "../src/lib/safety";

describe("crisisInRawRequest", () => {
  it("finds a disclosure in a body that would fail validation", () => {
    /* too short for /api/review, so it never reached the old screen */
    expect(crisisInRawRequest({ kind: "cv", text: "i want to die" })).toBe(true);
  });

  it("finds one nested in the shapes the tools actually post", () => {
    expect(crisisInRawRequest({ messages: [{ role: "user", content: "i want to die" }] })).toBe(true);
    expect(crisisInRawRequest({ answers: [{ answer: "honestly I want to die" }] })).toBe(true);
  });

  it("finds one typed into the wrong box", () => {
    expect(crisisInRawRequest({ target: "i want to die", text: "" })).toBe(true);
    expect(crisisInRawRequest({ company: "nothing", role: "i want to die" })).toBe(true);
  });

  it("leaves ordinary requests alone", () => {
    expect(crisisInRawRequest({ kind: "cv", text: "Worked in retail for two summers." })).toBe(false);
    expect(crisisInRawRequest({ target: "Warehouse operative, Leeds" })).toBe(false);
    expect(crisisInRawRequest({})).toBe(false);
    expect(crisisInRawRequest(null)).toBe(false);
  });

  it("does not scan identifiers, and survives odd input", () => {
    expect(crisisInRawRequest({ learner_id: "a".repeat(32), session_id: "b".repeat(32) })).toBe(false);
    expect(crisisInRawRequest({ a: { b: { c: { d: "i want to die" } } } })).toBe(false); // past the depth cap
    expect(crisisInRawRequest(12345)).toBe(false);
  });
});
