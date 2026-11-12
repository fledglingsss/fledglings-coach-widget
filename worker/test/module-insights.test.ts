/* Module insights: which enrolled modules each learner has and has
 * not finished. Pure rules, no I/O. */
import { describe, expect, it } from "vitest";

import {
  buildModuleInsights,
  outstandingRows,
  type InsightPerson,
} from "../src/lib/module-insights";

function person(name: string, courses: InsightPerson["courses"], tags: string[] = []): InsightPerson {
  return { name, email: `${name.toLowerCase().replace(/ /g, ".")}@swift.test`, tags, courses };
}

describe("module insights", () => {
  it("lists every enrolled module once, A to Z, and points learners at it by index", () => {
    const insights = buildModuleInsights([
      person("Amy Ash", [
        { title: "Module 10: Payslips", progressRate: 0, completed: false },
        { title: "Module 2: Budgeting", progressRate: 100, completed: true },
      ]),
      person("Ben Bell", [{ title: "Module 2: Budgeting", progressRate: 40, completed: false }]),
    ]);
    /* Numeric-aware: Module 2 sorts before Module 10. */
    expect(insights.modules).toEqual(["Module 2: Budgeting", "Module 10: Payslips"]);
    expect(insights.learners.map((l) => l.name)).toEqual(["Amy Ash", "Ben Bell"]);
    expect(insights.learners[0]!.m).toEqual([
      [0, 100, 0],
      [1, 0, 0],
    ]);
    expect(insights.learners[1]!.m).toEqual([[0, 40, 0]]);
  });

  it("never shows an unfinished module as complete, however far through it is", () => {
    const insights = buildModuleInsights([
      person("Amy Ash", [{ title: "Budgeting", progressRate: 100, completed: false }]),
    ]);
    /* 100 is reserved for genuinely completed modules. */
    expect(insights.learners[0]!.m[0]![1]).toBe(99);
    expect(outstandingRows(insights)).toHaveLength(1);
  });

  it("does not flag a finished module because of a stale duplicate enrolment", () => {
    const insights = buildModuleInsights([
      person("Amy Ash", [
        { title: "Budgeting", progressRate: 20, completed: false, timeSeconds: 600 },
        { title: "Budgeting", progressRate: 100, completed: true, timeSeconds: 1800 },
      ]),
    ]);
    expect(insights.modules).toEqual(["Budgeting"]);
    expect(insights.learners[0]!.m).toEqual([[0, 100, 30]]);
    expect(outstandingRows(insights)).toEqual([]);
  });

  it("leaves out container courses that are not learner modules", () => {
    const insights = buildModuleInsights([
      person("Amy Ash", [
        { title: "Online Safety Games", progressRate: 0, completed: false },
        { title: "Budgeting", progressRate: 0, completed: false },
      ]),
    ]);
    expect(insights.modules).toEqual(["Budgeting"]);
  });

  it("builds the chase list: only unfinished modules, the nearly-done ones first", () => {
    const insights = buildModuleInsights([
      person(
        "Amy Ash",
        [
          { title: "Budgeting", progressRate: 100, completed: true },
          { title: "Payslips", progressRate: 0, completed: false },
          { title: "Interviews", progressRate: 65, completed: false, timeSeconds: 1260 },
        ],
        ["Swift Learners"],
      ),
      person("Cal Cole", [{ title: "Budgeting", progressRate: 100, completed: true }]),
    ]);
    const rows = outstandingRows(insights);
    expect(rows.map((r) => [r.name, r.module, r.status, r.pct, r.minutes])).toEqual([
      ["Amy Ash", "Interviews", "In progress", 65, 21],
      ["Amy Ash", "Payslips", "Not started", 0, 0],
    ]);
    expect(rows[0]!.tags).toEqual(["Swift Learners"]);
  });

  it("keeps a learner with no enrolments in the picture, with nothing outstanding", () => {
    const insights = buildModuleInsights([person("Dee Dunn", [])]);
    expect(insights.learners).toHaveLength(1);
    expect(insights.learners[0]!.m).toEqual([]);
    expect(outstandingRows(insights)).toEqual([]);
  });
});
