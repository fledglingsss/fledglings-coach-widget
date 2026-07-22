import { describe, expect, it } from "vitest";

import {
  emptyHealthState,
  healthSummary,
  stallReport,
  type CourseHealth,
} from "../src/lib/module-health";

const u = (name: string, viewers: number, type = "scorm") => ({
  name,
  type,
  viewers,
  completed: viewers,
  avgTimeSecs: 60,
});

describe("stallReport", () => {
  it("finds the biggest drop and computes retention", () => {
    const course: CourseHealth = {
      courseId: "c1",
      title: "Module",
      units: [u("Intro", 20), u("Video", 18), u("The Hard Bit", 16), u("Quiz", 6), u("Summary", 5)],
    };
    const r = stallReport(course)!;
    expect(r.retention).toBe(25);
    expect(r.stallUnit).toBe("The Hard Bit"); // 16 -> 6 is the biggest loss
    expect(r.stallLossPct).toBe(63);
    expect(r.funnel).toEqual([20, 18, 16, 6, 5]);
  });

  it("ignores certificates and refuses to judge tiny samples", () => {
    expect(
      stallReport({
        courseId: "c",
        title: "T",
        units: [u("A", 2), u("B", 1)],
      }),
    ).toBeNull();
    const withCert = stallReport({
      courseId: "c",
      title: "T",
      units: [u("A", 10), u("B", 9), { ...u("Cert", 3), type: "certificateCompletion_v2" }],
    })!;
    expect(withCert.funnel).toEqual([10, 9]);
  });

  it("reports no stall unit when drop-off is gentle", () => {
    const r = stallReport({
      courseId: "c",
      title: "T",
      units: [u("A", 20), u("B", 19), u("C", 18), u("D", 18)],
    })!;
    expect(r.stallUnit).toBeNull();
    expect(r.retention).toBe(90);
  });
});

describe("healthSummary", () => {
  it("sorts worst retention first", () => {
    const state = emptyHealthState(2, new Date());
    state.courses = [
      { courseId: "good", title: "Good", units: [u("A", 10), u("B", 9)] },
      { courseId: "bad", title: "Bad", units: [u("A", 10), u("B", 2)] },
    ];
    const s = healthSummary(state);
    expect(s.map((x) => x.courseId)).toEqual(["bad", "good"]);
  });
});
