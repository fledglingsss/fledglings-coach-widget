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
