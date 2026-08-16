/* Voice of the learner — deterministic analysis of the free-text and
 * rating answers learners leave on each module.
 *
 * Everything here is arithmetic over words the learners actually
 * wrote: no model is called, so no reflection text leaves the
 * platform, and nothing shown to a provider can be invented. The same
 * no-fabrication law the career tools obey (see lib/verbatim.ts)
 * applies to learner voice: we count and quote, never paraphrase. */

import type { RawReflectionRow } from "./reflections";

/* ---------------- shared answer parsing ---------------- */

/** A self-rating as a percentage. Learners answer rating blocks as
 * "8 / 10" or a bare 0-10 number; anything else is prose. */
export function ratingPct(answer: string): number | null {
  const frac = /^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/.exec(answer);
  if (frac) {
    const got = Number(frac[1]);
    const max = Number(frac[2]);
    if (max > 0 && got <= max) return (got / max) * 100;
    return null;
  }
  const n = Number(answer.trim());
  if (answer.trim() !== "" && Number.isFinite(n) && n >= 0 && n <= 10) {
    return n * 10;
  }
  return null;
}

const matches = (row: RawReflectionRow, phrases: string[]): boolean => {
  const q = row.question.toLowerCase();
  return phrases.some((p) => q.includes(p));
};

/* ---------------- how learners describe a module ---------------- */

/** Function words, plus words the question itself puts in learners'
 * mouths — counting "module" as a theme would say nothing. */
const STOPWORDS = new Set([
  "and", "the", "was", "were", "very", "more", "most", "how", "but", "for",
  "with", "that", "this", "you", "your", "are", "has", "had", "its", "it's",
  "into", "from", "about", "really", "quite", "lot", "all", "not", "can",
  "will", "than", "then", "they", "them", "felt", "feel", "feels", "module",
  "modules", "course", "have", "been", "also", "just", "much", "some", "any",
  "what", "when", "who", "why", "there", "their", "get", "got", "one", "two",
  "three", "would", "could", "should", "did", "does", "now", "way", "well",
]);

/** Learners inflect and misspell freely ("confident"/"confidence",
 * "knowledgable"), so forms of one word are reported together under
 * whichever spelling they used most. Two forms are the same word only
 * when one extends the other, or when both are long enough that a
 * one- or two-character difference is far likelier to be a typo than
 * a different word — "interesting" and "interactive" must stay apart,
 * and so must "clear" and "clean". */
const SHARED_PREFIX_MIN = 4;
const TYPO_MIN_LENGTH = 8;
const TYPO_MAX_EDITS = 2;

function editDistance(a: string, b: string): number {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(
        prev[j] + 1,
        next[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = next;
  }
  return prev[b.length];
}

/** True when two spellings are forms of the same word. */
export function sameWordFamily(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  if (short.length >= SHARED_PREFIX_MIN && long.startsWith(short)) return true;
  return short.length >= TYPO_MIN_LENGTH && editDistance(a, b) <= TYPO_MAX_EDITS;
}

export interface DescriptorWord {
  /** The commonest form learners actually typed. */
  word: string;
  /** Times any form in the family was used. */
  count: number;
  /** Every distinct form counted here, so the claim is auditable. */
  forms: string[];
}

/** Word families from the "3 words" questions, commonest first. */
export function descriptorWords(
  rows: RawReflectionRow[],
  limit = 16,
): DescriptorWord[] {
  const tally = new Map<string, number>();
  for (const row of rows) {
    if (!matches(row, ["3 words", "three words"])) continue;
    for (const raw of row.answer.toLowerCase().split(/[^a-z']+/)) {
      const word = raw.replace(/^'+|'+$/g, "");
      if (word.length < 3 || STOPWORDS.has(word)) continue;
      tally.set(word, (tally.get(word) ?? 0) + 1);
    }
  }

  /* Cluster into families. A form related to several existing
   * families joins them all together, so a chain like
   * knowledge - knowledgeable - knowledgable ends up as one word
   * however the counts happen to order it. */
  const families: Array<Map<string, number>> = [];
  const ranked = [...tally.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
  for (const [word, count] of ranked) {
    const related = families.filter((forms) =>
      [...forms.keys()].some((form) => sameWordFamily(form, word)),
    );
    if (related.length === 0) {
      families.push(new Map([[word, count]]));
      continue;
    }
    const [home, ...rest] = related;
    for (const other of rest) {
      for (const [form, n] of other) home.set(form, (home.get(form) ?? 0) + n);
      families.splice(families.indexOf(other), 1);
    }
    home.set(word, (home.get(word) ?? 0) + count);
  }

  return families
    .map((forms) => {
      const sorted = [...forms.entries()].sort(
        (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
      );
      return {
        word: sorted[0][0],
        count: sorted.reduce((sum, [, n]) => sum + n, 0),
        forms: sorted.map(([form]) => form),
      };
    })
    .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
    .slice(0, limit);
}

/* ---------------- how the learning felt ---------------- */

/** The experience questions worth reporting to a provider: each is
 * inspection-grade evidence in the learners' own ratings. */
const EXPERIENCE_QUESTIONS: Array<{
  id: string;
  label: string;
  phrases: string[];
}> = [
  { id: "safe", label: "Felt safe, respected and not judged", phrases: ["safe, respected"] },
  { id: "relevant", label: "Felt practical and relevant to real life", phrases: ["practical and relevant"] },
  { id: "ready", label: "Ready to use it in real life or work", phrases: ["how ready do you feel"] },
  { id: "knowledge", label: "Knowledge improved because of the module", phrases: ["knowledge improve"] },
];

export interface ExperienceRating {
  id: string;
  label: string;
  /** Mean of the learners' own ratings, 0-100. */
  pct: number;
  /** How many ratings that mean rests on. */
  responses: number;
}

/** Average learner experience ratings. A question nobody answered
 * numerically is left out rather than shown as zero. */
export function experienceRatings(rows: RawReflectionRow[]): ExperienceRating[] {
  const out: ExperienceRating[] = [];
  for (const question of EXPERIENCE_QUESTIONS) {
    const pcts: number[] = [];
    for (const row of rows) {
      if (!matches(row, question.phrases)) continue;
      const pct = ratingPct(row.answer);
      if (pct !== null) pcts.push(pct);
    }
    if (pcts.length === 0) continue;
    out.push({
      id: question.id,
      label: question.label,
      pct: Math.round(pcts.reduce((s, p) => s + p, 0) / pcts.length),
      responses: pcts.length,
    });
  }
  return out;
}

/* ---------------- what learners asked for ---------------- */

const REQUEST_PHRASES = [
  "like to be added",
  "make this module better",
  "one thing you'd like",
  "one thing you would like",
];

/** Answers that decline to ask for anything: counting "nothing" as a
 * request would invent demand that is not there. */
const NON_REQUESTS =
  /^(n\/?a|na|no|none|nothing|nothing really|nope|nil|not sure|idk|i don'?t know|-|\.|all good|everything was good|nothing to add)\.?$/i;

export interface ImprovementRequest {
  courseTitle: string;
  /** The learner's own words, unedited. */
  text: string;
  submittedAt: number | null;
}

/** Verbatim improvement requests, newest first. Deliberately not
 * attributed: this is product feedback, so a provider needs the ask,
 * not the learner behind it. */
function genuineRequests(rows: RawReflectionRow[]): ImprovementRequest[] {
  return rows
    .filter((row) => matches(row, REQUEST_PHRASES))
    .filter((row) => {
      const text = row.answer.trim();
      return text.length >= 3 && !NON_REQUESTS.test(text);
    })
    .map((row) => ({
      courseTitle: row.courseTitle,
      text: row.answer.trim(),
      submittedAt: row.submittedAt,
    }))
    .sort((a, b) => (b.submittedAt ?? 0) - (a.submittedAt ?? 0));
}

export function improvementRequests(
  rows: RawReflectionRow[],
  limit = 60,
): ImprovementRequest[] {
  return genuineRequests(rows).slice(0, limit);
}

/** How many genuine asks exist in total. The page shows the newest
 * few; without this it would say "60 asks" over a truncated list and a
 * provider would think they had read them all. */
export function countImprovementRequests(rows: RawReflectionRow[]): number {
  return genuineRequests(rows).length;
}
