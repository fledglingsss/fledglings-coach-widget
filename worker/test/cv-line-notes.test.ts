/* "1 line opens with a weak verb" is a count. A mark on the line
 * itself is something a learner can act on. These pin what each mark
 * means, and that headings and lists are left alone. */
import { describe, expect, it } from "vitest";

import { analyseLines, MAX_LINE_NOTES } from "../src/lib/cv-checks";

function flagsOf(line: string) {
  return analyseLines(line)[0]?.flags ?? [];
}

describe("marks on the learner's own lines", () => {
  it("flags a duty-list opener and its missing number together", () => {
    expect(flagsOf("Responsible for restocking shelves every weekend")).toEqual([
      "weak-opener",
      "no-number",
    ]);
  });

  it("marks the pattern worth copying", () => {
    expect(flagsOf("Served 200+ customers a shift on tills and the plant desk")).toEqual(["strong"]);
  });

  it("asks for a number only on lines that read as achievements", () => {
    expect(flagsOf("Trained two new starters on the till system")).toEqual(["no-number"]);
    /* a skills list is not supposed to carry a number */
    expect(flagsOf("Tills, rotas, spreadsheets, customer service, teamwork")).toEqual([]);
  });

  it("catches passive voice, clichés and first person", () => {
    /* "was given" is the example the check's own copy quotes — the
     * old -ed-only pattern never matched it */
    expect(flagsOf("I was given responsibility for the weekend rota and stock")).toContain("passive");
    expect(flagsOf("Was asked to cover the tills when a colleague went home ill")).toContain("passive");
    expect(flagsOf("I was given responsibility for the weekend rota and stock")).toContain("pronoun");
    expect(flagsOf("A hard-working team player who thinks outside the box always")).toContain("cliche");
  });

  it("leaves headings and short lines unmarked", () => {
    const notes = analyseLines("WORK EXPERIENCE\nSkills\nTesco, Leeds\n");
    expect(notes.map((n) => n.flags)).toEqual([[], [], []]);
  });

  it("strips bullet markers and keeps the learner's words", () => {
    expect(analyseLines("• Trained two new starters on the till system")[0]!.text).toBe(
      "Trained two new starters on the till system",
    );
  });

  it("is bounded", () => {
    const many = Array.from({ length: 500 }, (_, i) => `Line number ${i} of a very long document indeed`).join("\n");
    expect(analyseLines(many)).toHaveLength(MAX_LINE_NOTES);
  });
});
