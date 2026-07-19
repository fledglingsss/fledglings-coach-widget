import { describe, expect, it } from "vitest";

import {
  appendHistory,
  assessLearner,
  buildNudge,
  sortAssessments,
  summarise,
  type RiskInput,
} from "../src/lib/risk";

const NOW = new Date("2026-07-19T12:00:00Z");
const DAY = 86_400;
const nowSecs = NOW.getTime() / 1000;

function learner(over: Partial<RiskInput>): RiskInput {
  return {
    id: "u1",
    email: "sak.awan@example.com",
    name: "Sak Awan",
    createdSecs: nowSecs - 60 * DAY,
    lastLoginSecs: nowSecs - 1 * DAY,
    tags: ["Cohort 24B"],
    ...over,
  };
}

describe("assessLearner tiers", () => {
  it("flags long silence as high with a dated reason", () => {
    const a = assessLearner(learner({ lastLoginSecs: nowSecs - 25 * DAY }), NOW);
    expect(a.tier).toBe("high");
    expect(a.daysSinceLogin).toBe(25);
    expect(a.reasons[0]).toContain("No login for 25 days");
    expect(a.reasons[0]).toContain("last seen");
  });

  it("flags never-logged-in accounts by how long they have waited", () => {
    const old = assessLearner(
      learner({ lastLoginSecs: null, createdSecs: nowSecs - 20 * DAY }),
      NOW,
    );
    expect(old.tier).toBe("high");
    expect(old.reasons[0]).toContain("never logged in");

    const recent = assessLearner(
      learner({ lastLoginSecs: null, createdSecs: nowSecs - 4 * DAY }),
      NOW,
    );
    expect(recent.tier).toBe("watch");

    const brandNew = assessLearner(
      learner({ lastLoginSecs: null, createdSecs: nowSecs - 1 * DAY }),
      NOW,
    );
    expect(brandNew.tier).toBe("new");
  });

  it("maps the day bands: medium 10-20, watch 5-9, ok under 5", () => {
    expect(assessLearner(learner({ lastLoginSecs: nowSecs - 14 * DAY }), NOW).tier).toBe(
      "medium",
    );
    expect(assessLearner(learner({ lastLoginSecs: nowSecs - 6 * DAY }), NOW).tier).toBe(
      "watch",
    );
    expect(assessLearner(learner({ lastLoginSecs: nowSecs - 2 * DAY }), NOW).tier).toBe("ok");
  });

  it("treats recent joiners who have logged in as new, not at-risk", () => {
    const a = assessLearner(
      learner({ createdSecs: nowSecs - 3 * DAY, lastLoginSecs: nowSecs - 2 * DAY }),
      NOW,
    );
    expect(a.tier).toBe("new");
  });

  it("raises engaged-but-stuck learners to watch via enrichment", () => {
    const a = assessLearner(learner({ lastLoginSecs: nowSecs - 1 * DAY }), NOW, {
      modulesEnrolled: 6,
      modulesCompleted: 0,
      stalledTitle: null,
    });
    expect(a.tier).toBe("watch");
    expect(a.reasons.some((r) => r.includes("hasn't completed a module"))).toBe(true);
  });

  it("names the stalled module in reasons and nudge for flagged learners", () => {
    const a = assessLearner(learner({ lastLoginSecs: nowSecs - 12 * DAY }), NOW, {
      modulesEnrolled: 4,
      modulesCompleted: 1,
      stalledTitle: "Budgeting That Actually Works",
    });
    expect(a.tier).toBe("medium");
    expect(a.reasons.some((r) => r.includes("Budgeting That Actually Works"))).toBe(true);
    expect(a.nudge).toContain("Budgeting That Actually Works");
  });
});

describe("nudges", () => {
  it("writes a warm first-login invitation for never-logged-in learners", () => {
    const n = buildNudge("Sak Awan", "high", null);
    expect(n).toContain("Hi Sak");
    expect(n).toContain("ready and waiting");
    expect(n).not.toContain("judgement");
  });
  it("never guilt-trips a drifting learner", () => {
    const n = buildNudge("Sak Awan", "medium", 14);
    expect(n).toContain("no judgement");
    expect(n.toLowerCase()).not.toContain("disappoint");
  });
});

describe("sorting and summary", () => {
  it("orders by urgency tier then score", () => {
    const list = sortAssessments([
      assessLearner(learner({ id: "ok", lastLoginSecs: nowSecs - 1 * DAY }), NOW),
      assessLearner(learner({ id: "high", lastLoginSecs: nowSecs - 30 * DAY }), NOW),
      assessLearner(learner({ id: "watch", lastLoginSecs: nowSecs - 6 * DAY }), NOW),
      assessLearner(learner({ id: "med", lastLoginSecs: nowSecs - 12 * DAY }), NOW),
    ]);
    expect(list.map((a) => a.id)).toEqual(["high", "med", "watch", "ok"]);
  });

  it("summarises tiers, 7-day active and never-logged-in", () => {
    const s = summarise(
      [
        assessLearner(learner({ lastLoginSecs: nowSecs - 1 * DAY }), NOW),
        assessLearner(learner({ lastLoginSecs: nowSecs - 30 * DAY }), NOW),
        assessLearner(learner({ lastLoginSecs: null, createdSecs: nowSecs - 20 * DAY }), NOW),
      ],
      NOW,
    );
    expect(s.learners).toBe(3);
    expect(s.tiers.high).toBe(2);
    expect(s.tiers.ok).toBe(1);
    expect(s.activeLast7Days).toBe(1);
    expect(s.neverLoggedIn).toBe(1);
  });
});

describe("history", () => {
  it("appends, replaces same-day, and caps at 60 points", () => {
    const base = summarise([], NOW);
    let h = appendHistory(null, base);
    expect(h.length).toBe(1);
    h = appendHistory(h, { ...base, learners: 5 });
    expect(h.length).toBe(1);
    expect(h[0]!.learners).toBe(5);

    const many = Array.from({ length: 70 }, (_, i) => ({
      date: `2026-05-${String((i % 28) + 1).padStart(2, "0")}`,
      learners: i,
      activeLast7Days: 0,
      high: 0,
      medium: 0,
    }));
    expect(appendHistory(many, base).length).toBeLessThanOrEqual(60);
  });
});
