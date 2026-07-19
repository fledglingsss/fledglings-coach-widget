import { describe, expect, it } from "vitest";

import {
  buildPassport,
  isPassportData,
  passportAgeDays,
} from "../src/lib/passport";

const NOW = new Date("2026-07-19T12:00:00Z");

const USER = {
  id: "u1",
  first_name: "Alex Smith",
  created: Date.parse("2026-01-05") / 1000,
};

describe("buildPassport", () => {
  it("splits completed and in-progress and excludes container courses", () => {
    const data = buildPassport(
      USER,
      [
        { title: "Financial Literacy", progressRate: 100, completed: true },
        { title: "Budgeting That Actually Works", progressRate: 100, completed: true },
        { title: "Online Scams, Fraud & Money Safety", progressRate: 40, completed: false },
        { title: "Tutor Resources", progressRate: null, completed: false },
      ],
      NOW,
    );
    expect(data.completed).toEqual(["Budgeting That Actually Works"]);
    expect(data.inProgress).toEqual([
      { title: "Online Scams, Fraud & Money Safety", pct: 40 },
    ]);
    expect(data.totalEnrolled).toBe(2);
    expect(data.firstName).toBe("Alex");
    expect(data.sinceYear).toBe("2026");
    expect(data.issuedAt).toBe("2026-07-19");
  });

  it("falls back gracefully when names are missing", () => {
    const data = buildPassport({ id: "u2" }, [], NOW);
    expect(data.firstName).toBe("Learner");
    expect(data.sinceYear).toBe("");
    expect(isPassportData(data)).toBe(true);
  });
});

describe("passport link ageing", () => {
  it("computes age and treats corrupt dates as expired", () => {
    const data = buildPassport(USER, [], NOW);
    const age = passportAgeDays(data, new Date("2026-07-21T12:00:00Z"));
    expect(age).toBeGreaterThan(2);
    expect(age).toBeLessThan(3);
    expect(passportAgeDays({ ...data, issuedAt: "garbage" }, NOW)).toBe(Infinity);
  });

  it("rejects non-passport payloads", () => {
    expect(isPassportData(null)).toBe(false);
    expect(isPassportData({ v: 2 })).toBe(false);
    expect(isPassportData("hi")).toBe(false);
  });
});
