/* THE NO-FABRICATION LAW, enforced in code.
 *
 * Every piece of praise the AI gives must be grounded in a quote taken
 * VERBATIM from the learner's own words. The prompts say so; this
 * makes it true. A praise item survives only if it contains a quoted
 * span that genuinely appears in their text - anything else is
 * dropped before the learner ever sees it.
 *
 * Why bother when the prompt already asks? Because a prompt is a
 * request and this is a promise. Fabricated praise is the single
 * failure that would most damage a young person: it sends them into
 * an interview believing a CV line they never wrote.
 */

/** Normalise for comparison: case, curly quotes, dashes, odd spaces
 * and trailing punctuation are all noise when deciding whether the
 * model quoted the learner accurately. */
function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/[   ]/g, " ")
    .replace(/…/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[\s"'.,;:!?-]+|[\s"'.,;:!?-]+$/g, "")
    .trim();
}

/** The shortest span we will treat as a real quote. Below this a
 * "quote" is a fragment like "I" that proves nothing. */
const MIN_QUOTE_CHARS = 4;
const MAX_QUOTE_CHARS = 300;

/* Double and smart quotes are unambiguous. Single quotes are only
 * treated as a quotation when they open after a space/start and close
 * before a space or punctuation - otherwise every apostrophe in
 * "don't" would look like a quotation mark. */
const QUOTE_PATTERNS: RegExp[] = [
  /"([^"]{2,300})"/g,
  /“([^”]{2,300})”/g,
  /(?:^|[\s(–—-])'([^']{2,300})'(?=[\s.,;:!?)]|$)/g,
  /(?:^|[\s(–—-])‘([^’]{2,300})’(?=[\s.,;:!?)]|$)/g,
];

/** Every quoted span in a piece of model text. */
export function extractQuotes(text: string): string[] {
  if (typeof text !== "string" || text.length === 0) return [];
  const found: string[] = [];
  for (const pattern of QUOTE_PATTERNS) {
    /* Fresh lastIndex per call - these are module-level /g regexes. */
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const raw = match[1] ?? "";
      const cleaned = normalise(raw);
      if (
        cleaned.length >= MIN_QUOTE_CHARS &&
        cleaned.length <= MAX_QUOTE_CHARS &&
        /[a-z0-9]/.test(cleaned)
      ) {
        found.push(cleaned);
      }
    }
  }
  return found;
}

/**
 * True when the praise quotes something the learner actually wrote.
 *
 * `sources` are the learner's own texts (their CV, profile or answer).
 * A single genuine quote is enough - praise often quotes one line and
 * then explains why it works.
 */
export function isGrounded(praise: string, ...sources: string[]): boolean {
  const quotes = extractQuotes(praise);
  if (quotes.length === 0) return false;
  const haystack = sources.map(normalise).join("\n");
  if (haystack.length === 0) return false;
  return quotes.some((q) => haystack.includes(q));
}

/**
 * Keep only the praise that quotes the learner. Returns the survivors
 * and how many were dropped, so the caller can log a regression
 * rather than silently thinning the feedback.
 */
export function keepGrounded(
  items: string[],
  ...sources: string[]
): { kept: string[]; dropped: number } {
  const kept = items.filter((item) => isGrounded(item, ...sources));
  return { kept, dropped: items.length - kept.length };
}

/* ------------------------------------------------------------------
 * The same law on the provider's side: a quote shown to a tutor as a
 * learner's words must BE that learner's words.
 *
 * The two AI reads a provider sees (one learner's reflections, and the
 * weekly read across a cohort) each hand back quotes. They used to be
 * checked by comparing the model's quote to the answer character for
 * character, and an entry that failed was dropped without trace.
 *
 * A model asked to copy text does not copy it character for character.
 * It tidies as it goes: "i dont want to be here" comes back as "I don't
 * want to be here", a straight apostrophe comes back curly. Each of
 * those failed the comparison - so the answers written most roughly,
 * which are often the ones that matter most, were the ones most likely
 * to be thrown away, and the page then reported that nothing had been
 * found.
 *
 * So the comparison is made on the WORDS: the same words, in the same
 * order, in one answer. Capital letters, apostrophes, quotation marks,
 * dashes, spacing and other punctuation are not words. And what comes
 * back is the span of the learner's answer, exactly as they typed it -
 * never the model's tidied copy - so the evidence a tutor reads is the
 * evidence that exists.
 * ------------------------------------------------------------------ */

/* Straight, curly, modifier, backtick and acute: every mark a learner
 * or a model uses as an apostrophe. Built from code points so this file
 * holds no look-alike characters. */
const APOSTROPHE_CHARS = "'" + String.fromCharCode(0x2018, 0x2019, 0x02bc, 0x0060, 0x00b4);
const WORD = new RegExp(`[\\p{L}\\p{N}]+(?:[${APOSTROPHE_CHARS}][\\p{L}\\p{N}]+)*`, "gu");
const APOSTROPHE = new RegExp(`[${APOSTROPHE_CHARS}]`, "g");

interface WordAt {
  /** Lower-cased, apostrophes removed: "Don't" and "dont" are one word. */
  word: string;
  start: number;
  /** Exclusive. */
  end: number;
}

function wordsOf(text: string): WordAt[] {
  const found: WordAt[] = [];
  for (const match of text.matchAll(WORD)) {
    const start = match.index ?? 0;
    found.push({
      word: match[0].toLowerCase().replace(APOSTROPHE, ""),
      start,
      end: start + match[0].length,
    });
  }
  return found;
}

/**
 * The learner's own words for a quote the model handed back.
 *
 * Returns the matching span of one of `answers`, exactly as the learner
 * wrote it, or null when the quote is not theirs: different words, a
 * paraphrase, a corrected spelling, or words stitched together from two
 * separate answers.
 */
export function learnerWords(quote: string, answers: readonly string[]): string | null {
  const wanted = wordsOf(quote).map((w) => w.word);
  if (wanted.length === 0) return null;
  for (const answer of answers) {
    const have = wordsOf(answer);
    for (let from = 0; from + wanted.length <= have.length; from++) {
      let matched = 0;
      while (matched < wanted.length && have[from + matched]!.word === wanted[matched]) matched++;
      if (matched === wanted.length) {
        return answer.slice(have[from]!.start, have[from + wanted.length - 1]!.end);
      }
    }
  }
  return null;
}
