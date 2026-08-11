/* THE NO-FABRICATION LAW, enforced in code.
 *
 * Every piece of praise the AI gives must be grounded in a quote taken
 * VERBATIM from the learner's own words. The prompts say so; this
 * makes it true. A praise item survives only if it contains a quoted
 * span that genuinely appears in their text — anything else is
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
 * before a space or punctuation — otherwise every apostrophe in
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
    /* Fresh lastIndex per call — these are module-level /g regexes. */
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
 * A single genuine quote is enough — praise often quotes one line and
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
