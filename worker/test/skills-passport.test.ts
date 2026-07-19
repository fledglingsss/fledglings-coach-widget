import { describe, expect, it } from "vitest";

import {
  advanceStreak,
  cohortTag,
  computeSkillsPassport,
  displayName,
  formatMinutes,
  gradeFor,
  isModuleTitle,
  rankOf,
  upsertLeaderboard,
  type CourseRecord,
} from "../src/lib/skills-passport";

const NOW = new Date("2026-07-19T12:00:00Z");

function course(over: Partial<CourseRecord>): CourseRecord {
  return {
    courseId: "x",
    title: "Budgeting That Actually Works",
    label: "Financial Literacy",
    status: "in_progress",
    progressRate: 50,
    scoreRate: null,
    timeSeconds: 600,
    ...over,
  };
}

describe("streak", () => {
  it("starts, continues, and resets correctly", () => {
    const day1 = advanceStreak(null, "2026-07-19");
    expect(day1).toEqual({ cur: 1, best: 1, last: "2026-07-19" });
    expect(advanceStreak(day1, "2026-07-19")).toEqual(day1); // same-day no-op
    const day2 = advanceStreak(day1, "2026-07-20");
    expect(day2).toEqual({ cur: 2, best: 2, last: "2026-07-20" });
    const gap = advanceStreak(day2, "2026-07-25");
    expect(gap).toEqual({ cur: 1, best: 2, last: "2026-07-25" });
  });
});

describe("leaderboard", () => {
  it("ranks by completions then score, and upserts without duplicates", () => {
    let b = upsertLeaderboard(null, { h: "aaa", n: "Amy", completed: 2, score: 60 }, "t");
    b = upsertLeaderboard(b, { h: "bbb", n: "Ben", completed: 3, score: 40 }, "t");
    b = upsertLeaderboard(b, { h: "ccc", n: "Cal", completed: 2, score: 80 }, "t");
    expect(b.entries.map((e) => e.n)).toEqual(["Ben", "Cal", "Amy"]);
    expect(rankOf(b, "aaa")).toBe(3);
    /* Amy improves — replaces her old entry. */
    b = upsertLeaderboard(b, { h: "aaa", n: "Amy", completed: 4, score: 70 }, "t");
    expect(rankOf(b, "aaa")).toBe(1);
    expect(b.entries.length).toBe(3);
  });
});

describe("cohortTag", () => {
  it("prefers a cohort-ish tag, falls back to first, handles none", () => {
    expect(cohortTag(["september-24", "Cohort 24B"])).toBe("Cohort 24B");
    expect(cohortTag(["Group A"])).toBe("Group A");
    expect(cohortTag([])).toBeNull();
    expect(cohortTag(undefined)).toBeNull();
  });
});

describe("displayName", () => {
  it("derives a spaced, title-cased name from the email local part", () => {
    expect(displayName({ email: "sak.awan@example.com" })).toBe("Sak Awan");
    expect(displayName({ email: "sak_awan@example.com" })).toBe("Sak Awan");
    expect(displayName({ email: "SAK-AWAN@example.com" })).toBe("Sak Awan");
  });
  it("splits a run-together username using the first name as prefix", () => {
    expect(displayName({ email: "sakawan@example.com", firstName: "sak", username: "sakawan" })).toBe("Sak Awan");
  });
  it("prefers first+last fields when both are present", () => {
    expect(displayName({ email: "x@example.com", firstName: "sak", lastName: "awan" })).toBe("Sak Awan");
  });
  it("falls back gracefully", () => {
    expect(displayName({ email: "sakawan@example.com" })).toBe("Sakawan");
    expect(displayName({})).toBe("Fledglings Learner");
  });
});

describe("grades and formatting", () => {
  it("maps score bands", () => {
    expect(gradeFor(90)).toBe("Distinction");
    expect(gradeFor(75)).toBe("Merit");
    expect(gradeFor(55)).toBe("Pass");
    expect(gradeFor(10)).toBe("Taking Flight");
  });
  it("formats minutes", () => {
    expect(formatMinutes(42 * 60 + 30)).toBe("42h 30m");
    expect(formatMinutes(59)).toBe("59m");
    expect(formatMinutes(60)).toBe("1h 00m");
  });
});

describe("computeSkillsPassport", () => {
  it("uses real assessment scores when present and computes stats", () => {
    const model = computeSkillsPassport({
      firstName: "Alex",
      fullName: "Alex Smith",
      cohort: "Cohort 24B",
      courses: [
        course({ courseId: "a", status: "completed", progressRate: 100, scoreRate: 90, timeSeconds: 3600 }),
        course({ courseId: "b", title: "Money Confidence & Everyday Decisions", scoreRate: 70, timeSeconds: 1800 }),
        course({ courseId: "c", title: "Tutor Resources", label: "" }), // excluded
      ],
      streak: { cur: 3, best: 5, last: "2026-07-19" },
      rank: 2,
      cohortSize: 10,
      now: NOW,
    });
    expect(model.score.percent).toBe(80);
    expect(model.score.grade).toBe("Merit");
    expect(model.stats.modulesDone).toBe(1);
    expect(model.stats.modulesTotal).toBe(2);
    expect(model.stats.totalMinutes).toBe(90);
    expect(model.learner.initials).toBe("AS");
    expect(model.learner.year).toBe("2025/26");
    expect(model.skills[0]).toEqual({ name: "Financial Literacy", percent: 75 });
  });

  it("awards curriculum badges by completion count with toGo on locked", () => {
    const done = (n: number): CourseRecord[] =>
      Array.from({ length: n }, (_, i) =>
        course({
          courseId: `c${i}`,
          title: `FL Module ${i}`,
          status: "completed",
          progressRate: 100,
        }),
      );
    const model = computeSkillsPassport({
      firstName: "A",
      fullName: "A B",
      cohort: null,
      courses: done(4),
      streak: { cur: 8, best: 8, last: "2026-07-19" },
      rank: null,
      cohortSize: null,
      now: NOW,
    });
    const mm = model.badges.find((b) => b.code === "MM")!;
    expect(mm.state).toBe("earned");
    expect(mm.tier).toBe("silver"); // 4 of 7 ≥ ceil(7/2)
    const jr = model.badges.find((b) => b.code === "JR")!;
    expect(jr.state).toBe("locked");
    expect(jr.toGo).toBe(1);
    const onFire = model.badges.find((b) => b.code === "OF")!;
    expect(onFire.state).toBe("earned"); // 8-day streak
  });

  it("builds the top-5 board (plus me if outside), nearly-there and steps", () => {
    const entries = Array.from({ length: 7 }, (_, i) => ({
      h: `h${i}`,
      n: `Learner ${i}`,
      completed: 7 - i,
      score: 80,
    }));
    const model = computeSkillsPassport({
      firstName: "A",
      fullName: "A B",
      cohort: "Cohort 24B",
      courses: [
        course({ courseId: "a", status: "completed", progressRate: 100, scoreRate: 90, unitsDone: 8, unitsTotal: 8 }),
        course({ courseId: "b", title: "Money Confidence & Everyday Decisions", progressRate: 62, unitsDone: 5, unitsTotal: 8 }),
        course({ courseId: "c", title: "What is Online Safety?", label: "Staying Safe Online", progressRate: 30, unitsDone: 2, unitsTotal: 6 }),
      ],
      streak: { cur: 1, best: 1, last: "2026-07-19" },
      rank: 7,
      cohortSize: 7,
      board: { entries, builtAt: "2026-07-19" },
      myHash: "h6",
      now: NOW,
    });
    expect(model.board.length).toBe(6); // top 5 + me
    expect(model.board[0]).toEqual({ rank: 1, name: "Learner 0", completed: 7, isMe: false });
    expect(model.board[5]).toEqual({ rank: 7, name: "Learner 6", completed: 1, isMe: true });
    expect(model.nearlyThere).toEqual([
      { title: "Money Confidence & Everyday Decisions", percent: 62 },
      { title: "What is Online Safety?", percent: 30 },
    ]);
    expect(model.stats.stepsDone).toBe(15);
    expect(model.stats.stepsTotal).toBe(22);
  });

  it("filters container courses everywhere", () => {
    expect(isModuleTitle("Tutor Resources")).toBe(false);
    expect(isModuleTitle("The Learner Games")).toBe(false);
    expect(isModuleTitle("Budgeting That Actually Works")).toBe(true);
  });
});
