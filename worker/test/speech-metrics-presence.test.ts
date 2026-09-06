import { describe, expect, it } from "vitest";

import { evaluatePresence } from "../src/lib/speech-metrics";

describe("evaluatePresence v2 (keypoint signals)", () => {
  it("scores five signals at 2 points each when keypoints were measured", () => {
    const e = evaluatePresence({
      frames: 20,
      faceVisible: 20,
      centred: 20,
      goodDistance: 20,
      headStraight: 20,
      lookingAhead: 20,
    });
    expect(e).not.toBeNull();
    expect(e!.score).toBe(10);
    expect(e!.metrics.headStraight).not.toBeNull();
    expect(e!.metrics.eyeContact).not.toBeNull();
    expect(e!.metrics.eyeContact!.band).toBe("great");
  });

  it("penalises poor eye contact and head tilt honestly", () => {
    const e = evaluatePresence({
      frames: 20,
      faceVisible: 20,
      centred: 20,
      goodDistance: 20,
      headStraight: 4, // 20% level
      lookingAhead: 6, // 30% facing camera
    });
    /* 2 + 2 + 2 + round(.2*2)=0 + round(.3*2)=1 = 7 */
    expect(e!.score).toBe(7);
    expect(e!.metrics.headStraight!.band).toBe("work");
    expect(e!.metrics.eyeContact!.band).toBe("work");
  });

  it("falls back to the classic 4/3/3 split without keypoint signals", () => {
    const e = evaluatePresence({
      frames: 20,
      faceVisible: 20,
      centred: 20,
      goodDistance: 20,
    });
    expect(e!.score).toBe(10);
    expect(e!.metrics.headStraight).toBeNull();
    expect(e!.metrics.eyeContact).toBeNull();
  });

  it("bands sit at great>=75, okay>=45, work below", () => {
    const e = evaluatePresence({
      frames: 100,
      faceVisible: 75,
      centred: 45,
      goodDistance: 44,
      headStraight: 100,
      lookingAhead: 0,
    });
    expect(e!.metrics.faceVisible.band).toBe("great");
    expect(e!.metrics.centred.band).toBe("okay");
    expect(e!.metrics.distance.band).toBe("work");
  });
});

describe("feedback-only signals: expression and posture", () => {
  const framing = { frames: 40, faceVisible: 40, centred: 40, goodDistance: 40, headStraight: 40, lookingAhead: 40 };

  it("reports warmth, posture and stillness without touching the score", () => {
    const e = evaluatePresence({ ...framing, exprFrames: 30, smiling: 9, poseFrames: 28, upright: 25, settled: 26 });
    expect(e!.score).toBe(10);
    expect(e!.metrics.warmth).toEqual({ pct: 30, band: "great" });
    expect(e!.metrics.posture!.pct).toBe(89);
    expect(e!.metrics.stillness!.band).toBe("great");
  });

  it("uses warmth bands that expect a natural amount of smiling, not a grin", () => {
    expect(evaluatePresence({ ...framing, exprFrames: 40, smiling: 5 })!.metrics.warmth!.band).toBe("okay");
    expect(evaluatePresence({ ...framing, exprFrames: 40, smiling: 1 })!.metrics.warmth!.band).toBe("work");
  });

  it("stays null when the models never loaded on that device", () => {
    const e = evaluatePresence(framing);
    expect(e!.metrics.warmth).toBeNull();
    expect(e!.metrics.posture).toBeNull();
    expect(e!.metrics.stillness).toBeNull();
  });

  it("treats a tally larger than the framing samples as unmeasured, not as evidence", () => {
    const e = evaluatePresence({ ...framing, exprFrames: 400, smiling: 400, poseFrames: 2, upright: 2, settled: 2 });
    expect(e!.metrics.warmth).toBeNull();
    expect(e!.metrics.posture).toBeNull();
    expect(e!.score).toBe(10);
  });
});
