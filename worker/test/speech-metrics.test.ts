import { describe, expect, it } from "vitest";

import {
  combineInterviewScores,
  countFillers,
  evaluatePresence,
  evaluateSpeech,
  paceBandOf,
  speechStats,
} from "../src/lib/speech-metrics";

describe("countFillers", () => {
  it("counts classic fillers with word boundaries", () => {
    expect(countFillers("um so I basically did it, you know, um yes")).toBe(4);
  });
  it("does not fire inside words", () => {
    expect(countFillers("umbrella under summer drummer")).toBe(0);
  });
});

describe("speechStats", () => {
  it("returns null when nothing was timed", () => {
    expect(
      speechStats([{ answer: "typed answer with no timing at all", durationSecs: null }]),
    ).toBeNull();
  });

  it("aggregates words, seconds and wpm over timed answers", () => {
    const stats = speechStats([
      { answer: "one two three four five six seven eight nine ten", durationSecs: 5 },
      { answer: "typed and untimed", durationSecs: null },
    ]);
    expect(stats).not.toBeNull();
    expect(stats!.totalWords).toBe(10);
    expect(stats!.totalSecs).toBe(5);
    expect(stats!.wpm).toBe(120);
    expect(stats!.timedAnswers).toBe(1);
  });

  it("caps a runaway duration at five minutes", () => {
    const stats = speechStats([{ answer: "a b c", durationSecs: 9999 }]);
    expect(stats!.totalSecs).toBe(300);
  });
});

describe("evaluateSpeech", () => {
  const base = { totalWords: 0, fillerCount: 0, fillersPer100Words: 0, timedAnswers: 1 };

  it("gives full pace marks in the good band", () => {
    const e = evaluateSpeech({ ...base, totalSecs: 60, wpm: 130, totalWords: 130 });
    expect(e.paceBand).toBe("good");
    expect(e.paceScore).toBe(5);
    expect(e.score).toBe(10); // no fillers either
  });

  it("marks 60 wpm as slow with a low pace score", () => {
    const e = evaluateSpeech({ ...base, totalSecs: 60, wpm: 60, totalWords: 60 });
    expect(e.paceBand).toBe("slow");
    expect(e.paceScore).toBeLessThanOrEqual(2);
  });

  it("marks 200 wpm as fast", () => {
    expect(paceBandOf(200)).toBe("fast");
    const e = evaluateSpeech({ ...base, totalSecs: 60, wpm: 200, totalWords: 200 });
    expect(e.paceBand).toBe("fast");
    expect(e.paceScore).toBeLessThan(5);
  });

  it("penalises heavy filler use", () => {
    const heavy = evaluateSpeech({
      ...base,
      totalSecs: 60,
      wpm: 130,
      totalWords: 100,
      fillerCount: 10,
      fillersPer100Words: 10,
    });
    expect(heavy.fillerScore).toBe(1);
  });
});

describe("evaluatePresence", () => {
  it("returns null for missing or tiny samples", () => {
    expect(evaluatePresence(null)).toBeNull();
    expect(evaluatePresence({})).toBeNull();
    expect(
      evaluatePresence({ frames: 2, faceVisible: 2, centred: 2, goodDistance: 2 }),
    ).toBeNull();
  });

  it("scores a fully-present run 10/10", () => {
    const e = evaluatePresence({ frames: 20, faceVisible: 20, centred: 20, goodDistance: 20 });
    expect(e).not.toBeNull();
    expect(e!.score).toBe(10);
    expect(e!.faceVisiblePct).toBe(100);
  });

  it("clamps client-reported counts to the frame total", () => {
    const e = evaluatePresence({ frames: 10, faceVisible: 999, centred: 0, goodDistance: 0 });
    expect(e!.faceVisiblePct).toBe(100);
    expect(e!.centredPct).toBe(0);
    expect(e!.score).toBe(4);
  });
});

describe("combineInterviewScores", () => {
  const goodSpeech = evaluateSpeech({
    totalWords: 130,
    totalSecs: 60,
    wpm: 130,
    fillerCount: 0,
    fillersPer100Words: 0,
    timedAnswers: 5,
  });
  const fullPresence = evaluatePresence({
    frames: 20,
    faceVisible: 20,
    centred: 20,
    goodDistance: 20,
  });

  it("blends 80/10/10 when everything was measured", () => {
    const b = combineInterviewScores(75, goodSpeech, fullPresence);
    expect(b.answerMax).toBe(80);
    expect(b.answer).toBe(60);
    expect(b.final).toBe(80); // 60 + 10 + 10
  });

  it("folds unmeasured weights back into the answers", () => {
    const b = combineInterviewScores(75, null, null);
    expect(b.answerMax).toBe(100);
    expect(b.final).toBe(75);
    expect(b.speech).toBeNull();
    expect(b.presence).toBeNull();
  });

  it("never exceeds 100 or drops below 0", () => {
    expect(combineInterviewScores(200, goodSpeech, fullPresence).final).toBe(100);
    expect(combineInterviewScores(-50, null, null).final).toBe(0);
  });
});

describe("anti-forgery rails (QA 2026-07-30)", () => {
  it("evaluatePresence rejects frame tallies beyond the plausible sampling window", () => {
    const forged = { frames: 100, faceVisible: 100, centred: 100, goodDistance: 100 };
    /* 60s of timed answers at ~1.5s sampling -> max ~45 frames. */
    expect(evaluatePresence(forged, 45)).toBeNull();
    /* A plausible tally still scores. */
    expect(evaluatePresence({ frames: 30, faceVisible: 30, centred: 30, goodDistance: 30 }, 45)).not.toBeNull();
    /* Typed-only run (no timed answers) -> maxFrames 0 -> never scored. */
    expect(evaluatePresence({ frames: 5, faceVisible: 5, centred: 5, goodDistance: 5 }, 0)).toBeNull();
  });
});
