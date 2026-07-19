import { describe, expect, it } from "vitest";

import { aggregate, csvExport, narrativeSystemPrompt } from "../src/lib/portal";

const NOW = new Date("2026-07-19T12:00:00Z");

const SAMPLE = [
  {
    user: { id: "a", email: "a@x.com", username: "A One" },
    courses: [
      { title: "Budgeting That Actually Works", progressRate: 100, completed: true },
      { title: "Cybersecurity Fundamentals", progressRate: 20, completed: false },
      { title: "Financial Literacy", progressRate: null, completed: false },
    ],
  },
  {
    user: { id: "b", email: "b@x.com", username: "B, Two" },
    courses: [
      { title: "Budgeting That Actually Works", progressRate: 0, completed: false },
    ],
  },
  { user: { id: "c", email: "c@x.com" }, courses: [] },
];

describe("aggregate", () => {
  it("computes per-course stats excluding container courses", () => {
    const stats = aggregate(120, SAMPLE, NOW);
    expect(stats.totalUsers).toBe(120);
    expect(stats.sampleSize).toBe(3);
    expect(stats.activeInSample).toBe(1);
    const budgeting = stats.courseStats.find(
      (s) => s.title === "Budgeting That Actually Works",
    );
    expect(budgeting).toEqual({
      title: "Budgeting That Actually Works",
      enrolled: 2,
      completed: 1,
      completionRate: 50,
    });
    expect(
      stats.courseStats.find((s) => s.title === "Financial Literacy"),
    ).toBeUndefined();
  });

  it("handles an empty sample without dividing by zero", () => {
    const stats = aggregate(null, [], NOW);
    expect(stats.sampleSize).toBe(0);
    expect(stats.avgModulesPerLearner).toBe(0);
    expect(stats.courseStats).toEqual([]);
  });
});

describe("csvExport", () => {
  it("escapes commas and includes counts", () => {
    const csv = csvExport(SAMPLE);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("email,name,modules_enrolled,modules_completed,in_progress,days_since_login,attention_level");
    expect(lines[1]).toBe("a@x.com,A One,2,1,1,,");
    expect(lines[2]).toBe("b@x.com,B  Two,1,0,1,,");
  });
});

describe("narrative prompt", () => {
  it("pins the honesty rules", () => {
    const p = narrativeSystemPrompt();
    expect(p).toContain("never invent numbers");
    expect(p).toContain("Never name any individual");
    expect(p).toContain("sample");
  });
});
