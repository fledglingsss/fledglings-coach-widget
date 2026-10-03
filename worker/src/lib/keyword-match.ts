/* Job-advert keyword matching for the CV review.
 *
 * The Job match tab shows which of the advert's key terms are "found in
 * your document" beside a gauge with a 75% target - the model Jobscan
 * uses, and a claim about WORDING: screening software looks for the
 * advert's own words. The lists used to come straight from the model,
 * which judges whether the CV *evidences* a term, which is a different
 * question. A live review marked "cash and card payments" as found on
 * a CV that says only "tills", then told the learner, two tabs later,
 * to add those very words.
 *
 * So the split is made here, on the words:
 *   matched - the term's own words are in the document;
 *   reword  - the model saw evidence of it, but the words are not there.
 *             These are the quickest wins: say it the way the advert does;
 *   missing - neither.
 * The gauge counts only the first group, because that is all a keyword
 * filter would count.
 *
 * Words are compared ignoring case and the endings -s, -ed, -ing and
 * -ly ("payments" is "payment"; "handled" is "handling"), which is what
 * a learner can be told in one sentence. It does not go further:
 * "communicated" is not "communication" here, and nor is it to most
 * screening software - the advice to use the advert's wording stands. */

const WORD = /[a-z0-9]+(?:'[a-z]+)?/g;
/* A PDF's curly apostrophe is the same apostrophe. Built from its code
 * point so this file holds no look-alike characters. */
const CURLY_APOSTROPHE = new RegExp(String.fromCharCode(0x2019), "g");

function wordsOf(text: string): string[] {
  return text.toLowerCase().replace(CURLY_APOSTROPHE, "'").match(WORD) ?? [];
}

/* Words that carry no meaning of their own in a term: "attention to
 * detail" is about attention and detail. */
const STOP_WORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "in", "is", "of", "on", "or",
  "the", "to", "with", "your", "our", "their",
]);
/* Words adverts bolt on to a skill: "good communication skills" is
 * about communication. A term made only of these is matched on all of
 * them, so "experience" on its own still means something. */
const FILLER_WORDS = new Set([
  "skill", "skills", "ability", "abilities", "experience", "knowledge", "strong", "good",
  "excellent", "genuine", "clear", "basic", "proven", "solid",
]);

/** A word's stem, by the four endings a learner can be told about. */
export function wordStem(word: string): string {
  let stem = word.toLowerCase().replace(/'s$/, "");
  if (stem.length > 4 && stem.endsWith("ies")) stem = stem.slice(0, -3) + "y";
  else if (stem.length > 3 && stem.endsWith("s") && !/(ss|us|is)$/.test(stem)) stem = stem.slice(0, -1);
  if (stem.length > 5 && stem.endsWith("ly")) stem = stem.slice(0, -2);
  if (stem.length > 5 && stem.endsWith("ing")) stem = stem.slice(0, -3);
  else if (stem.length > 4 && stem.endsWith("ed")) stem = stem.slice(0, -2);
  if (stem.length > 3 && stem.endsWith("e")) stem = stem.slice(0, -1);
  return stem;
}

/** The stems of every word in a text. */
export function stemsIn(text: string): Set<string> {
  return new Set(wordsOf(text).map(wordStem));
}

/** The words of a term that have to be present for it to count. */
function significantWords(term: string): string[] {
  const words = wordsOf(term).filter((w) => !STOP_WORDS.has(w));
  const meaningful = words.filter((w) => !FILLER_WORDS.has(w));
  return meaningful.length > 0 ? meaningful : words;
}

/** True when the document uses the term's own words (every meaningful
 * word of it, anywhere in the document). */
export function termIsWorded(term: string, documentStems: ReadonlySet<string>): boolean {
  const words = significantWords(term);
  return words.length > 0 && words.every((w) => documentStems.has(wordStem(w)));
}

export interface KeywordSplit {
  matched: string[];
  reword: string[];
  missing: string[];
}

/**
 * Sort the model's advert terms by what the document actually says.
 *
 * `evidenced` is what the model judged the text to show, `unevidenced`
 * what it judged missing. The document's wording decides the first
 * group either way: a term the model called missing whose words are
 * there is still there. Duplicates (ignoring case) are kept once.
 *
 * The terms are meant to be the ADVERT's: a live review listed "tills"
 * for an advert that never says it (the CV does). With `advertText`,
 * a term the advert does not word is left out altogether.
 */
export function splitKeywords(
  evidenced: readonly string[],
  unevidenced: readonly string[],
  documentText: string,
  advertText = "",
): KeywordSplit {
  const stems = stemsIn(documentText);
  const advertStems = advertText ? stemsIn(advertText) : null;
  const seen = new Set<string>();
  const split: KeywordSplit = { matched: [], reword: [], missing: [] };
  const place = (term: string, evidencedByModel: boolean) => {
    const key = term.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    if (advertStems && !termIsWorded(term, advertStems)) return;
    if (termIsWorded(term, stems)) split.matched.push(term);
    else if (evidencedByModel) split.reword.push(term);
    else split.missing.push(term);
  };
  evidenced.forEach((t) => place(t, true));
  unevidenced.forEach((t) => place(t, false));
  return split;
}
