import { describe, expect, it } from "vitest";

import {
  emptyScores,
  HUB_HISTORY_MAX,
  parseScores,
  pushScore,
  summariseHub,
  summariseTool,
} from "../src/lib/hub";

describe("score history", () => {
  it("pushes, clamps and caps", () => {
    let s = emptyScores();
    for (let i = 0; i < HUB_HISTORY_MAX + 4; i++) {
      s = pushScore(s, "cv", 40 + i, 1000 + i);
    }
    expect(s.cv.length).toBe(HUB_HISTORY_MAX);
    s = pushScore(s, "interview", 150, 2000);
    expect(s.interview[0]!.s).toBe(100);
    expect(parseScores(JSON.stringify(s)).interview[0]!.s).toBe(100);
    expect(parseScores("junk")).toEqual(emptyScores());
    expect(parseScores(null)).toEqual(emptyScores());
  });
});

describe("summariseTool", () => {
  it("computes latest, delta and attempts", () => {
    const t = summariseTool([
      { s: 40, at: 1 },
      { s: 55, at: 2 },
    ]);
    expect(t.latest).toBe(55);
    expect(t.delta).toBe(15);
    expect(t.attempts).toBe(2);
    expect(summariseTool([]).latest).toBeNull();
  });
});

describe("summariseHub", () => {
  it("guides CV, LinkedIn, interview, cover letter — then the weakest score", () => {
    let s = emptyScores();
    expect(summariseHub(s).next.tool).toBe("cv");
    expect(summariseHub(s).readiness).toBeNull();
    s = pushScore(s, "cv", 60, 1);
    expect(summariseHub(s).next.tool).toBe("linkedin");
    expect(summariseHub(s).readiness).toBe(60);
    s = pushScore(s, "linkedin", 50, 2);
    expect(summariseHub(s).next.tool).toBe("interview");
    s = pushScore(s, "interview", 40, 3);
    expect(summariseHub(s).next.tool).toBe("cover");
    s = pushScore(s, "cover", 100, 4);
    const done = summariseHub(s);
    expect(done.next.tool).toBe("interview"); // lowest score
    expect(done.next.reason).toContain("40");
    expect(done.readiness).toBe(Math.round((60 * 0.4 + 50 * 0.25 + 40 * 0.35) / 1));
  });

  it("counts journey tasks Hiration-style (x/7) into a career readiness %", () => {
    let s = emptyScores();
    expect(summariseHub(s).tasksDone).toBe(0);
    expect(summariseHub(s).careerReadiness).toBe(0);
    /* CV reviewed at 75 = two tasks (reviewed + 70-plus). */
    s = pushScore(s, "cv", 75, 1);
    const one = summariseHub(s);
    expect(one.tasksDone).toBe(2);
    expect(one.careerReadiness).toBe(Math.round((2 / 7) * 100));
    /* Everything tried and strong = all seven. */
    s = pushScore(s, "linkedin", 80, 2);
    s = pushScore(s, "interview", 71, 3);
    s = pushScore(s, "cover", 100, 4);
    const all = summariseHub(s);
    expect(all.tasksDone).toBe(7);
    expect(all.careerReadiness).toBe(100);
    expect(all.tasks).toHaveLength(7);
  });
});
