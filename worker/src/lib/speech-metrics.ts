/* Interview delivery metrics — all deterministic, all computed from
 * things we can genuinely measure (transcript text, answer durations
 * timed in the browser, and on-device face-check sampling). Nothing is
 * estimated by a model and nothing we cannot measure is scored: when a
 * signal is absent (typed answers, no camera) the metric is null and
 * its weight folds back into the answer evaluation, clearly labelled
 * "not measured" — never a made-up number. */

export type PaceBand = "slow" | "good" | "fast";

/* Hiration-aligned words-per-minute bands for interview answers. */
export const PACE_BANDS = {
  slowBelow: 110,
  fastFrom: 160,
} as const;

/* Fillers a UK speech-to-text transcript can actually surface. Web
 * speech APIs strip many "um"s, so this under-counts — which is the
 * fair direction to err. Word-boundary matched. */
const FILLER_PATTERNS: RegExp[] = [
  /\bum+\b/gi,
  /\buh+\b/gi,
  /\ber+m*\b/gi,
  /\bhmm+\b/gi,
  /\byou know\b/gi,
  /\bsort of\b/gi,
  /\bkind of\b/gi,
  /\bbasically\b/gi,
  /\bliterally\b/gi,
  /\bi guess\b/gi,
];

export function countFillers(text: string): number {
  let count = 0;
  for (const re of FILLER_PATTERNS) {
    count += (text.match(re) || []).length;
  }
  return count;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export interface SpeechStats {
  totalWords: number;
  totalSecs: number;
  wpm: number;
  fillerCount: number;
  fillersPer100Words: number;
  timedAnswers: number;
}

/** Aggregate stats over the answers that carry a measured duration.
 * Returns null when nothing was timed (typed-only run). */
export function speechStats(
  answers: Array<{ answer: string; durationSecs: number | null }>,
): SpeechStats | null {
  const timed = answers.filter(
    (a): a is { answer: string; durationSecs: number } =>
      typeof a.durationSecs === "number" &&
      Number.isFinite(a.durationSecs) &&
      a.durationSecs >= 1,
  );
  if (timed.length === 0) return null;
  const totalSecs = timed.reduce((s, a) => s + Math.min(a.durationSecs, 300), 0);
  const totalWords = timed.reduce((s, a) => s + wordCount(a.answer), 0);
  const fillerCount = timed.reduce((s, a) => s + countFillers(a.answer), 0);
  return {
    totalWords,
    totalSecs: Math.round(totalSecs),
    wpm: totalSecs > 0 ? Math.round((totalWords / totalSecs) * 60) : 0,
    fillerCount,
    fillersPer100Words:
      totalWords > 0 ? Math.round((fillerCount / totalWords) * 1000) / 10 : 0,
    timedAnswers: timed.length,
  };
}

export interface SpeechEvaluation {
  score: number; // 0-10
  paceBand: PaceBand;
  paceScore: number; // 0-5
  fillerScore: number; // 0-5
  wpm: number;
  fillerCount: number;
  totalSecs: number;
}

export function paceBandOf(wpm: number): PaceBand {
  if (wpm < PACE_BANDS.slowBelow) return "slow";
  if (wpm >= PACE_BANDS.fastFrom) return "fast";
  return "good";
}

/** Score delivery out of 10: pace /5 + fillers /5. */
export function evaluateSpeech(stats: SpeechStats): SpeechEvaluation {
  const band = paceBandOf(stats.wpm);
  let paceScore: number;
  if (band === "good") {
    paceScore = 5;
  } else if (band === "slow") {
    /* 0 wpm -> 0, just under the band -> 4. */
    paceScore = Math.max(0, Math.min(4, Math.round((stats.wpm / PACE_BANDS.slowBelow) * 4)));
  } else {
    /* Just over -> 4, 250+ -> 1. */
    paceScore = Math.max(1, Math.min(4, Math.round(4 - (stats.wpm - PACE_BANDS.fastFrom) / 30)));
  }
  /* Fillers per 100 words: 0 -> 5, 2 -> 4, 4 -> 3, 8+ -> 1. */
  const rate = stats.fillersPer100Words;
  const fillerScore =
    rate === 0 ? 5 : rate <= 2 ? 4 : rate <= 4 ? 3 : rate <= 8 ? 2 : 1;
  return {
    score: paceScore + fillerScore,
    paceBand: band,
    paceScore,
    fillerScore,
    wpm: stats.wpm,
    fillerCount: stats.fillerCount,
    totalSecs: stats.totalSecs,
  };
}

/* ---------------- camera presence (on-device sampling) ---------------- */

export interface PresenceSamples {
  frames: number; // sampled frames during recording
  faceVisible: number; // frames where a face was detected
  centred: number; // frames where the face was roughly centred
  goodDistance: number; // frames where the face filled a sensible share
}

export interface PresenceEvaluation {
  score: number; // 0-10
  faceVisiblePct: number;
  centredPct: number;
  goodDistancePct: number;
}

/** Validate + clamp client-reported presence sampling. Returns null
 * when there was no usable sampling (no camera, or the browser cannot
 * detect faces) — "not measured", never a guess. */
export function evaluatePresence(raw: unknown): PresenceEvaluation | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const int = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) && v >= 0
      ? Math.min(100_000, Math.round(v))
      : null;
  const frames = int(r.frames);
  const face = int(r.faceVisible);
  const centred = int(r.centred);
  const distance = int(r.goodDistance);
  if (frames === null || face === null || centred === null || distance === null) {
    return null;
  }
  if (frames < 3) return null; // too little sampling to be meaningful
  const pct = (n: number) => Math.round(Math.min(n, frames) * 100 / frames);
  const faceVisiblePct = pct(face);
  const centredPct = pct(centred);
  const goodDistancePct = pct(distance);
  /* Face in frame /4, centred /3, distance /3. */
  const score =
    Math.round((faceVisiblePct / 100) * 4) +
    Math.round((centredPct / 100) * 3) +
    Math.round((goodDistancePct / 100) * 3);
  return { score: Math.min(10, score), faceVisiblePct, centredPct, goodDistancePct };
}

/* ---------------- combined final score ---------------- */

export interface InterviewBreakdown {
  final: number; // 0-100
  answer: number; // 0-80 (or more when other signals were unmeasured)
  answerMax: number;
  speech: number | null; // 0-10
  presence: number | null; // 0-10
}

/** Blend: answers 80%, speech 10%, presence 10%. The weight of any
 * unmeasured signal folds back into the answers so a typed run is not
 * penalised for having no microphone. */
export function combineInterviewScores(
  answerAvg: number, // 0-100 from the model's per-answer evaluation
  speech: SpeechEvaluation | null,
  presence: PresenceEvaluation | null,
): InterviewBreakdown {
  const clampedAvg = Math.max(0, Math.min(100, answerAvg));
  let answerWeight = 0.8;
  if (speech === null) answerWeight += 0.1;
  if (presence === null) answerWeight += 0.1;
  const answerPart = clampedAvg * answerWeight;
  const speechPart = speech ? speech.score * 10 * 0.1 : 0;
  const presencePart = presence ? presence.score * 10 * 0.1 : 0;
  return {
    final: Math.round(answerPart + speechPart + presencePart),
    answer: Math.round(answerPart),
    answerMax: Math.round(answerWeight * 100),
    speech: speech ? speech.score : null,
    presence: presence ? presence.score : null,
  };
}
