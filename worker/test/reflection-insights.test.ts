/* Voice-of-the-learner analysis. These numbers are shown to providers
 * as evidence, so the tests fix the honesty properties: nothing
 * invented, nothing attributed, nothing counted that was not said. */
import { describe, expect, it } from "vitest";

import {
  descriptorWords,
  experienceRatings,
  improvementRequests,
  ratingPct,
  sameWordFamily,
} from "../src/lib/reflection-insights";
import type { RawReflectionRow } from "../src/lib/reflections";

function row(question: string, answer: string, over: Partial<RawReflectionRow> = {}): RawReflectionRow {
  return {
    email: "learner@example.com",
    courseTitle: "What is Online Safety",
    unitTitle: "Post-module reflection",
    kind: "post",
    submittedAt: 1_750_000_000,
    question,
    answer,
    ...over,
  } as RawReflectionRow;
}

describe("ratingPct", () => {
  it("reads the fraction and bare-number forms learners actually use", () => {
    expect(ratingPct("8 / 10")).toBe(80);
    expect(ratingPct("4/5")).toBe(80);
    expect(ratingPct("7")).toBe(70);
  });

  it("refuses prose and impossible ratings rather than guessing a number", () => {
    expect(ratingPct("really useful")).toBeNull();
    expect(ratingPct("")).toBeNull();
    expect(ratingPct("11")).toBeNull(); // above the 0-10 scale
    expect(ratingPct("12 / 10")).toBeNull(); // more than the maximum
  });
});

describe("descriptorWords", () => {
  const Q = "What 3 words describe how this module felt?";

  it("counts word families under the form learners used most", () => {
    const rows = [
      row(Q, "confident, informative, useful"),
      row(Q, "confidence and knowledge"),
      row(Q, "confidence, helpful"),
    ];
    const top = descriptorWords(rows)[0];
    expect(top.word).toBe("confidence"); // used twice, "confident" once
    expect(top.count).toBe(3);
    expect(top.forms).toEqual(expect.arrayContaining(["confidence", "confident"]));
  });

  it("drops filler and the question's own vocabulary", () => {
    const words = descriptorWords([row(Q, "and the very module felt informative")]).map((w) => w.word);
    expect(words).toEqual(["informative"]);
  });

  it("ignores answers to other questions entirely", () => {
    const rows = [row("How ready do you feel to use this in real life/work?", "brilliant excellent superb")];
    expect(descriptorWords(rows)).toEqual([]);
  });
});

describe("experienceRatings", () => {
  it("averages each experience question over the ratings given", () => {
    const rows = [
      row("I felt safe, respected, and not judged while learning this.", "10 / 10"),
      row("I felt safe, respected, and not judged while learning this.", "8 / 10"),
      row("This module felt practical and relevant to real life.", "7 / 10"),
    ];
    const out = experienceRatings(rows);
    expect(out.find((r) => r.id === "safe")).toMatchObject({ pct: 90, responses: 2 });
    expect(out.find((r) => r.id === "relevant")).toMatchObject({ pct: 70, responses: 1 });
  });

  it("omits a question with no numeric answers instead of showing zero", () => {
    const rows = [row("I felt safe, respected, and not judged while learning this.", "yes definitely")];
    expect(experienceRatings(rows)).toEqual([]);
  });
});

describe("improvementRequests", () => {
  const Q = "What's one thing you'd like to be added to this module?";

  it("returns the learner's words verbatim, newest first, unattributed", () => {
    const out = improvementRequests([
      row(Q, "more real examples from actual workplaces", { submittedAt: 100 }),
      row(Q, "videos instead of so much reading", { submittedAt: 200 }),
    ]);
    expect(out.map((r) => r.text)).toEqual([
      "videos instead of so much reading",
      "more real examples from actual workplaces",
    ]);
    /* Product feedback must not carry the learner who gave it. */
    expect(JSON.stringify(out)).not.toContain("learner@example.com");
  });

  it("does not turn a declined answer into a demand", () => {
    const rows = ["nothing", "N/A", "none", "no", "idk", "-", "Nothing really"].map((a) => row(Q, a));
    expect(improvementRequests(rows)).toEqual([]);
  });

  it("keeps a genuine ask that merely starts with a refusal word", () => {
    const out = improvementRequests([row(Q, "nothing except maybe a quiz at the end")]);
    expect(out).toHaveLength(1);
  });
});

/* Merging two different words into one bar would overstate a theme to
 * a provider, so the family rule is pinned in both directions. */
describe("word families", () => {
  it("joins inflections and plain misspellings", () => {
    expect(sameWordFamily("confident", "confidence")).toBe(true);
    expect(sameWordFamily("aware", "awareness")).toBe(true);
    expect(sameWordFamily("helpful", "helpfull")).toBe(true);
    expect(sameWordFamily("knowledge", "knowlede")).toBe(true);
  });

  it("keeps genuinely different words apart", () => {
    expect(sameWordFamily("interesting", "interactive")).toBe(false);
    expect(sameWordFamily("clear", "clean")).toBe(false);
    expect(sameWordFamily("confident", "confusing")).toBe(false);
  });

  it("collapses a spelling chain even when the ends differ too much to pair directly", () => {
    /* "knowledgable" is three edits from "knowledge" but one from
     * "knowledgeable", so the family holds together through the form
     * in the middle — all three appear in the live data. */
    expect(sameWordFamily("knowledge", "knowledgable")).toBe(false);
    const Q = "What 3 words describe how this module felt?";
    const words = descriptorWords([
      row(Q, "knowledge"),
      row(Q, "knowledgeable"),
      row(Q, "knowledgable"),
    ]);
    expect(words).toHaveLength(1);
    expect(words[0].count).toBe(3);
  });

  it("counts interesting and interactive as separate themes", () => {
    const Q = "What 3 words describe how this module felt?";
    const rows = [row(Q, "interesting"), row(Q, "interesting"), row(Q, "interactive")];
    const words = descriptorWords(rows);
    expect(words.map((w) => w.word)).toEqual(["interesting", "interactive"]);
    expect(words[0].count).toBe(2);
  });
});
