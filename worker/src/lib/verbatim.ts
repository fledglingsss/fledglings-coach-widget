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

/* ------------------------------------------------------------------
 * The law once more, for the lines Fledge writes FOR a learner to use
 * as their own: an example bullet, a rewritten headline, a cover
 * letter, a refined interview answer.
 *
 * Praise is checked by its quote. A line written for them has no quote
 * to check - it is new wording - so what can be checked is what it
 * CLAIMS. Most claims need judgement ("reducing customer wait times":
 * did it?), and those are the prompt's job, below. A number does not:
 * it is either in what the learner gave us or it is not. A live review
 * offered "BTEC Business - Level 3" to a learner whose CV says only
 * "BTEC Business"; pasted in, that is a qualification level on their CV
 * that nobody told us was true.
 * ------------------------------------------------------------------ */

/** One wording of the rule for every prompt that writes lines for the
 * learner, so the tools cannot drift into promising different things.
 * The examples in it are the inventions the live reports actually made. */
export const MISSING_PIECE_RULE =
  "THE MISSING-PIECE RULE: in any line you write for the learner to use as their own, the only facts " +
  "are the ones they gave you. A number, result, outcome, reason, level, grade, date or feeling they " +
  "did not write is not yours to supply, however likely it sounds: 'reducing customer wait times', " +
  "'with no errors reported', 'which taught me to stay calm under pressure' and 'Level 3' are all " +
  "inventions unless their own text says so. So are words that grade the work - 'accurately', " +
  "'confidently', 'efficiently', 'under pressure' - and 'ensuring', 'maintaining' or 'keeping' " +
  "clauses that describe an outcome they never reported. Where the line needs one, put a " +
  "[square-bracket placeholder] that names what to add - [what this led to], [how many], [which " +
  "level] - and leave the truth to them. A fact they DID give stays exactly as they gave it, never " +
  "turned into a bracket. They will be asked about every word of it in an interview.";

/* Anything in [square brackets] is a placeholder for the learner to
 * fill in, not a claim. "1. " or "2) " at the start of a line is a list
 * marker, not a number the line states. */
const PLACEHOLDER = /\[[^\]]*\]/g;
const LIST_MARKER = /^\s*\d+[.)]\s+/gm;
const NUMBER = /\d+(?:[.,]\d+)*/g;
const THOUSANDS_COMMA = /,(?=\d{3}(?!\d))/g;
const LETTERS = /[a-z]+/g;

const UNITS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
};
/* A learner who wrote "two new starters" gave the number 2: a line that
 * says "2 new starters" has not invented it. */
const NUMBER_WORDS: Record<string, number> = {
  ...UNITS,
  zero: 0, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15,
  sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40,
  fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
  dozen: 12, once: 1, twice: 2,
  first: 1, second: 2, third: 3, fourth: 4, fifth: 5, sixth: 6, seventh: 7, eighth: 8,
  ninth: 9, tenth: 10,
};

/** "1,200", "200+" and "9.50" compared as the numbers they are. */
function canonicalNumber(written: string): string {
  const value = Number.parseFloat(written.replace(THOUSANDS_COMMA, ""));
  return Number.isFinite(value) ? String(value) : written;
}

/** Every number a text states, in digits or in words. */
function numbersStated(text: string): Set<string> {
  const stated = new Set<string>();
  for (const match of text.matchAll(NUMBER)) stated.add(canonicalNumber(match[0]));
  const words = text.toLowerCase().match(LETTERS) ?? [];
  words.forEach((word, i) => {
    const value = NUMBER_WORDS[word];
    if (value === undefined) return;
    stated.add(String(value));
    /* "twenty-four": a tens word and a unit are one number */
    const unit = UNITS[words[i + 1] ?? ""];
    if (value >= 20 && value <= 90 && unit !== undefined) stated.add(String(value + unit));
  });
  return stated;
}

/** "Sept 23" written out as "September 2023" is the same date, not a
 * new one. Only this direction: a line that says "23" when the learner
 * wrote "2023" is far more likely to be a count than a year. */
function yearWrittenInFull(number: string, given: ReadonlySet<string>): boolean {
  if (number.length !== 4) return false;
  const year = Number.parseInt(number, 10);
  return year >= 2000 && year <= 2099 && given.has(String(year - 2000));
}

/**
 * The numbers a line written for the learner states that they never
 * gave, as written in the line.
 *
 * `sources` is everything the learner supplied for the job: their CV,
 * profile or answer, and any advert they pasted. An empty result means
 * every number in the line is theirs (or a placeholder).
 */
export function inventedNumbers(line: string, sources: readonly string[]): string[] {
  const claims = line.replace(PLACEHOLDER, " ").replace(LIST_MARKER, "");
  const given = numbersStated(sources.join("\n"));
  const invented: string[] = [];
  for (const match of claims.matchAll(NUMBER)) {
    const number = canonicalNumber(match[0]);
    if (given.has(number) || yearWrittenInFull(number, given)) continue;
    invented.push(match[0]);
  }
  return invented;
}
