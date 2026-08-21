/* The marking scheme, written down once.
 *
 * The dimensions were already described to the model inside the review
 * prompt, but a learner only ever saw the resulting number: "Impact
 * 35". Nothing told them what Impact is judged on, what 35 means, or
 * what a better answer would look like — which makes a score feel like
 * a verdict handed down rather than something they can act on.
 *
 * So the rubric lives here, in one place, and is used twice: to brief
 * the model, and to show the learner the same bands they are being
 * marked against. Because both read this file, the marking scheme a
 * learner sees cannot drift from the one actually applied. */

export interface RubricBand {
  /** Lowest score in this band. */
  min: number;
  label: string;
  /** What a document in this band actually looks like — concrete, in
   * the learner's terms, never "good" or "poor". */
  means: string;
}

export interface RubricDimension {
  key: string;
  label: string;
  /** Share of the overall score, in points. The four sum to 100. */
  weight: number;
  /** One line: what this dimension is judging. */
  measures: string;
  /** Highest band first. */
  bands: RubricBand[];
}

/* Weights reflect what actually decides whether a young person gets a
 * reply: proof of achievement first, then getting past the screening
 * software, then whether it can be skim-read and whether it speaks to
 * the role. They are shown to the learner, not hidden. */
export const CV_RUBRIC: RubricDimension[] = [
  {
    key: "impact",
    label: "Impact",
    weight: 35,
    measures:
      "Whether your lines prove what changed because you were there — not just what you were told to do.",
    bands: [
      {
        min: 70,
        label: "Strong",
        means:
          "Most lines name a result, a number or a scale — “served 200+ customers a shift”, “trained two new starters”.",
      },
      {
        min: 50,
        label: "Getting there",
        means:
          "Some lines show a result, others still list duties. The proof is there, but not everywhere.",
      },
      {
        min: 0,
        label: "Needs work",
        means:
          "Lines describe responsibilities — “responsible for”, “helped with” — without showing what came of them.",
      },
    ],
  },
  {
    key: "ats",
    label: "ATS readiness",
    weight: 25,
    measures:
      "Whether screening software can read it: standard headings, plain formatting, and the words the advert actually uses.",
    bands: [
      {
        min: 70,
        label: "Strong",
        means:
          "Ordinary headings, no tables or columns, and the advert's own terms appear where you genuinely have that experience.",
      },
      {
        min: 50,
        label: "Getting there",
        means:
          "Mostly readable, but some casual phrasing or a heading a parser will not recognise.",
      },
      {
        min: 0,
        label: "Needs work",
        means: "Formatting or wording that filters you out before a person ever sees it.",
      },
    ],
  },
  {
    key: "clarity",
    label: "Clarity & structure",
    weight: 20,
    measures: "Whether a recruiter skimming for six seconds finds the important things first.",
    bands: [
      {
        min: 70,
        label: "Strong",
        means: "Clear sections in a sensible order, short bullets, nothing buried in a paragraph.",
      },
      {
        min: 50,
        label: "Getting there",
        means:
          "Readable, but something important sits too low, or a role runs on as one block of text.",
      },
      {
        min: 0,
        label: "Needs work",
        means: "Hard to skim — missing sections, or experience written as flowing prose.",
      },
    ],
  },
  {
    key: "tailoring",
    label: "Tailoring",
    weight: 20,
    measures:
      "Whether this reads as written for the role you are aiming at, rather than sent to everyone.",
    bands: [
      {
        min: 70,
        label: "Strong",
        means:
          "Opens with what you offer that role, and your existing experience is framed in its language.",
      },
      {
        min: 50,
        label: "Getting there",
        means: "The direction is stated, but the experience underneath has not been connected to it.",
      },
      {
        min: 0,
        label: "Needs work",
        means: "Nothing signals which job this is for — it could have been sent anywhere.",
      },
    ],
  },
];

export const LINKEDIN_RUBRIC: RubricDimension[] = [
  {
    key: "headline",
    label: "Headline",
    weight: 30,
    measures:
      "The one line under your name — whether it says what you are and where you are heading.",
    bands: [
      {
        min: 70,
        label: "Strong",
        means:
          "Names what you do and the direction you are going, in your own words, not just a job title.",
      },
      {
        min: 50,
        label: "Getting there",
        means: "Says what you are now, but nothing about where you are heading.",
      },
      {
        min: 0,
        label: "Needs work",
        means: "Empty, or the default job title LinkedIn filled in for you.",
      },
    ],
  },
  {
    key: "about",
    label: "About section",
    weight: 25,
    measures: "Whether it sounds like a person worth talking to, with specifics rather than adjectives.",
    bands: [
      {
        min: 70,
        label: "Strong",
        means:
          "Written in your voice, names real things you have done, and gives a reason to get in touch.",
      },
      {
        min: 50,
        label: "Getting there",
        means: "Something is there, but it leans on words like “hardworking” instead of examples.",
      },
      { min: 0, label: "Needs work", means: "Blank, or a couple of lines that would fit anybody." },
    ],
  },
  {
    key: "experience",
    label: "Experience detail",
    weight: 25,
    measures: "Whether each entry shows what you actually did, not just where you were.",
    bands: [
      {
        min: 70,
        label: "Strong",
        means: "Every role has a few lines showing the work and what came of it.",
      },
      {
        min: 50,
        label: "Getting there",
        means: "Roles are listed with some detail, but at least one is a title and dates only.",
      },
      { min: 0, label: "Needs work", means: "Job titles with nothing underneath them." },
    ],
  },
  {
    key: "starter",
    label: "Starter habits",
    weight: 20,
    measures:
      "The things that make a new profile look alive — skills, a photo, some activity. Judged fairly for someone starting out.",
    bands: [
      {
        min: 70,
        label: "Strong",
        means: "Skills listed, a photo, and some sign of activity or connections.",
      },
      { min: 50, label: "Getting there", means: "A few of the basics done, others still empty." },
      {
        min: 0,
        label: "Needs work",
        means: "The profile looks unused — no skills, no photo, no activity.",
      },
    ],
  },
];

export function rubricFor(kind: "cv" | "linkedin"): RubricDimension[] {
  return kind === "cv" ? CV_RUBRIC : LINKEDIN_RUBRIC;
}

/** The band a score falls in. Bands are ordered highest first. */
export function bandFor(dimension: RubricDimension, score: number): RubricBand {
  return (
    dimension.bands.find((b) => score >= b.min) ??
    dimension.bands[dimension.bands.length - 1]!
  );
}

/** Match a returned dimension to its rubric entry by label, which is
 * what the model is told to echo back. */
export function dimensionRubric(
  rubric: RubricDimension[],
  label: string,
): RubricDimension | null {
  const wanted = label.trim().toLowerCase();
  return rubric.find((d) => d.label.toLowerCase() === wanted) ?? null;
}

/** The overall score, derived from the dimensions rather than taken on
 * trust. The model used to return its own overall alongside its
 * dimension scores, so the headline number could disagree with the
 * bars underneath it. Deriving it means the score is always the sum of
 * its stated parts, and the weights can be shown. */
export function overallFrom(
  dimensions: Array<{ label: string; score: number }>,
  rubric: RubricDimension[],
): number | null {
  let weighted = 0;
  let totalWeight = 0;
  for (const dim of dimensions) {
    const entry = dimensionRubric(rubric, dim.label);
    if (!entry) continue;
    weighted += dim.score * entry.weight;
    totalWeight += entry.weight;
  }
  if (totalWeight === 0) return null;
  return Math.round(weighted / totalWeight);
}

/** The dimension brief handed to the model, generated from the same
 * rubric the learner sees so the two cannot drift apart. */
export function dimensionBrief(rubric: RubricDimension[]): string {
  const list = rubric
    .map((d) => `"${d.label}" (${d.measures} Worth ${d.weight} of the 100.)`)
    .join(" ");
  const bands = rubric[0]!.bands
    .slice()
    .reverse()
    .map((b) => `${b.min}+ = ${b.label}`)
    .join(", ");
  return (
    `The four dimensions, in order: ${list}\n` +
    `Score each 0-100 against these bands: ${bands}. ` +
    `Do NOT invent an overall score — it is derived from your dimension scores and their weights.`
  );
}
