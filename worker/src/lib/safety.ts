/* Safety rails that do not depend on a model being up.
 *
 * Layered with the Haiku classifier in the handler:
 *   1. crisisHeuristic()  — deterministic keyword screen, runs FIRST.
 *      If it fires, the learner gets the authored crisis signposting
 *      reply with NO model call at all. This guarantees crisis routing
 *      works even during a total model outage (fail-toward-safety).
 *   2. Haiku classifier   — catches the subtler cases the keyword
 *      screen cannot (see lib/anthropic.ts).
 *   3. guardReply()       — output gate on the coach's reply before it
 *      reaches the learner.
 */

/* Control characters except \n and \t, plus zero-width/bidi characters
 * sometimes used to smuggle hidden instructions. Built from escape
 * sequences so the source file itself contains no control characters. */
const CONTROL_CHARS = new RegExp(
  "[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F" +
    "\u200B-\u200F\u2028\u2029\u202A-\u202E\uFEFF]",
  "g",
);

/** Remove control characters (keeps \n and \t), trim, cap length. */
export function sanitiseText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(CONTROL_CHARS, "").trim().slice(0, max);
}

/** Neutralise angle brackets in learner text that will be interpolated
 * between prompt delimiter tags (<learner_cv>…</learner_cv>). Without
 * this, text containing "</learner_cv>" can close its delimiter and
 * masquerade as worker-authored scaffolding (fake <automated_facts>,
 * fake system notes). Angle brackets are swapped for visually similar
 * single guillemets so quotes echoed back to the learner still read
 * naturally. Input side only — never applied to model output, where
 * guardReply's leak markers need real tags to match. */
export function neutraliseAngles(text: string): string {
  return text.replace(/</g, "‹").replace(/>/g, "›");
}

/** Single-line variant for names / page titles. */
export function sanitiseLine(value: unknown, max: number): string {
  return sanitiseText(value, max).replace(/\s+/g, " ");
}

/* High-signal phrases only. False positives are acceptable here — the
 * crisis reply is warm and signposting, never alarming — but each
 * pattern should still clearly indicate risk to self or others.
 * Word-boundary anchored to avoid substring hits. */
const CRISIS_PATTERNS: RegExp[] = [
  /\bkill(?:ing)? (?:my ?self|himself|herself|themselves)\b/i,
  /\bsuicid\w*\b/i,
  /\bself[- ]?harm\w*\b/i,
  /\bhurt(?:ing)? my ?self\b/i,
  /\bcut(?:ting)? my ?self\b/i,
  /\bend(?:ing)? (?:my|his|her|their) life\b/i,
  /\bwant(?:s)? to die\b/i,
  /\bdon'?t want to (?:be alive|live)\b/i,
  /\boverdos\w*\b/i,
  /\b(?:being|been|is|am|he'?s|she'?s|they'?re) abus\w*\b/i,
  /\bgroom(?:ed|ing|er)\b/i,
  /\bsexual(?:ly)? (?:assault\w*|abus\w*|harass\w*)\b/i,
  /\brap(?:e|ed|ing)\b/i,
  /\bthreaten(?:ed|ing)? (?:to (?:kill|hurt)|me|us)\b/i,
  /\bno reason to (?:live|carry on|go on)\b/i,
  /\bunsafe at home\b/i,
  /\bnot be(?:ing)? here any ?more\b/i,
  /\bbetter off without me\b/i,
  /\bnobody would (?:care|notice|miss)\b/i,
  /\bno ?one would (?:care|notice|miss)\b/i,
  /\bwhat'?s the point of anything\b/i,
  /\bstarv(?:e|ing) myself\b/i,
  /\bmak(?:e|ing) myself (?:sick|throw up|vomit)\b/i,
  /\bbully(?:ing|ied)? me\b/i,
  /\bbeing bullied\b/i,
  /\bwant to (?:hurt|kill) (?:him|her|them|someone)\b/i,
  /\brun(?:ning)? away from home\b/i,
  /\bdon'?t feel safe\b/i,
  /\bsend(?:ing)? (?:him|her|them|someone)? ?nudes\b/i,
  /\bpressur(?:ed|ing) me (?:into|to)\b/i,
];

/** True when the message plainly indicates possible risk of harm. */
export function crisisHeuristic(message: string): boolean {
  return CRISIS_PATTERNS.some((re) => re.test(message));
}

/* Reflections safeguarding screen: the crisis set above PLUS quieter
 * first-person disclosure shapes that matter in written reflections -
 * physical harm, fear, coercion, hardship, unhealthy coping (aligned
 * to KCSIE indicator categories). Kept separate so the coach's crisis
 * interception behaviour does not change. A match is a prompt to
 * check in, never a verdict, so modest over-firing is acceptable. */
const SAFEGUARDING_EXTRA_PATTERNS: RegExp[] = [
  /\b(?:hit|hits|hitting|beat|beats|beating|slaps?|slapped|punch(?:es|ed)?|hurts?|hurting) (?:me|us|my (?:mum|mom|dad|brother|sister))\b/i,
  /\b(?:scared|frightened|terrified|afraid) (?:of (?:him|her|them|my\b)|to go home|at home)\b/i,
  /\bcontrols? (?:me|everything i do)\b/i,
  /\bwon'?t let me (?:see|leave|go|talk)\b/i,
  /\bchecks? my (?:phone|messages)\b/i,
  /\bcan'?t afford (?:to eat|food|meals)\b/i,
  /\bskip(?:ping|ped)? meals\b/i,
  /\bno money for food\b/i,
  /\b(?:being|getting|might be|facing|about to be) evicted\b/i,
  /\bhomeless\b/i,
  /\bsofa[- ]?surfing\b/i,
  /\bdrink(?:ing)? (?:most nights|every (?:day|night)|to (?:cope|sleep|forget))\b/i,
  /\btak(?:e|ing) (?:drugs|pills|something) to (?:cope|sleep|forget)\b/i,
  /\boffered me money for (?:pictures|photos|videos)\b/i,
  /\btouch(?:es|ed|ing) me\b/i,
  /\bcan'?t cope\b/i,
  /\bfeel(?:ing)? (?:hopeless|worthless|numb)\b/i,
  /\bcry(?:ing)? (?:every|most) (?:day|night)s?\b/i,
  /\bpanic attacks?\b/i,
  /\bno ?one to (?:talk to|turn to)\b/i,
];

/** The reflections sweep's screen: crisis set plus disclosure shapes. */
export function safeguardingHeuristic(message: string): boolean {
  return crisisHeuristic(message) || SAFEGUARDING_EXTRA_PATTERNS.some((re) => re.test(message));
}

/* Output gate — a model reply must never leak the prompt scaffolding
 * or run away in length. Returns the cleaned reply, or null when the
 * reply is unsafe to show (caller serves the authored fallback).
 * Chat bubbles use the default cap; structured surfaces (reviews)
 * pass a larger one. */
const DEFAULT_MAX_REPLY_CHARS = 1400;
const LEAK_MARKERS = [
  /<\/?context>/i,
  /<\/?learner_(?:cv|linkedin)>/i,
  /you are fledge, the fledglings/i,
  /\bHARD RULES\b/,
  /\bsystem prompt\b/i,
];

export function guardReply(
  reply: string,
  maxChars: number = DEFAULT_MAX_REPLY_CHARS,
): string | null {
  const cleaned = sanitiseText(reply, maxChars);
  if (!cleaned) return null;
  if (LEAK_MARKERS.some((re) => re.test(cleaned))) return null;
  return cleaned;
}

/* ---------------- house style for words the model writes ----------------
 *
 * The founder's copy law: no em dashes anywhere a learner or provider
 * reads. The copy we author was swept by hand. This is the same law
 * applied to text we do not write: every prompt asks the model not to
 * use them, and a prompt is a request, so this makes it true.
 *
 * What it changes:
 *   - an em dash (or the horizontal bar that looks like one), spaced
 *     or not, becomes a plain hyphen with a space either side
 *   - a SPACED en dash does too: British typography uses it as a dash,
 *     and on screen it is the same mark to a reader
 * What it leaves alone:
 *   - an unspaced en dash, which is a range ("16-24" written with one)
 *   - ordinary hyphens
 * A dash that opens a line, as in a list, becomes "- ". One left
 * dangling at the very end is dropped.
 *
 * Apply it AFTER the verbatim checks, never before: those compare the
 * model's quotes with the learner's own words.
 *
 * The patterns are kept as source strings so the browser copy below is
 * built from the very same ones - saved reports are tidied on the
 * device when they are shown, and the two must not drift apart. They
 * are written with escapes, so this file contains no dash for a later
 * sweep to trip over. */
const EM_DASH_SOURCE = "[ \\t\\u00A0]*[\\u2014\\u2015]+[ \\t\\u00A0]*";
const SPACED_EN_DASH_SOURCE = "[ \\t\\u00A0]+\\u2013[ \\t\\u00A0]+";

const EM_DASH_AT_END = new RegExp(EM_DASH_SOURCE + "$");
const EM_DASH = new RegExp(EM_DASH_SOURCE, "g");
const SPACED_EN_DASH = new RegExp(SPACED_EN_DASH_SOURCE, "g");
const DASH_OPENING_A_LINE = /(^|\n) - /g;

/** Rewrite the dashes in one piece of model-written text. */
export function plainDashes(text: string): string {
  return text
    .replace(EM_DASH_AT_END, "")
    .replace(EM_DASH, " - ")
    .replace(SPACED_EN_DASH, " - ")
    .replace(DASH_OPENING_A_LINE, "$1- ");
}

const NO_KEYS: ReadonlySet<string> = new Set();

/** The same, over every string in a report - whatever its shape, so a
 * field added to a report later is covered without anyone remembering
 * to list it. `keep` names keys whose values must stay exactly as they
 * are: a learner's own words quoted to a provider are evidence, and are
 * not ours to restyle. Returns a copy; the input is not changed. */
export function plainDashesDeep<T>(value: T, keep: ReadonlySet<string> = NO_KEYS): T {
  if (typeof value === "string") return plainDashes(value) as T;
  if (Array.isArray(value)) return value.map((item) => plainDashesDeep(item, keep)) as T;
  if (value !== null && typeof value === "object") {
    const copy: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      copy[key] = keep.has(key) ? inner : plainDashesDeep(inner, keep);
    }
    return copy as T;
  }
  return value;
}

/** The same law as a request, for every prompt that asks the model to
 * write something a learner will read. One wording, so the prompts
 * cannot drift into saying different things. The rewrite above is what
 * makes it true; this is what makes it rarely needed, and lets the
 * model choose a comma or a full stop where a swapped-in hyphen would
 * read clumsily. */
export const NO_LONG_DASH_RULE =
  "Punctuation: never use an em dash, and never use an en dash as a dash. " +
  "Write a comma, a full stop, or a plain hyphen with a space either side instead.";

/** The browser's copy, for feedback that was saved on a device before
 * this rule existed and is being shown again. Built from the same
 * pattern sources as the functions above. */
export const PLAIN_DASHES_JS =
  "var FL_EM_DASH=" + JSON.stringify(EM_DASH_SOURCE) + ",FL_EN_DASH=" + JSON.stringify(SPACED_EN_DASH_SOURCE) + ";" +
  "function flPlain(t){if(typeof t!=='string')return t;" +
  "return t.replace(new RegExp(FL_EM_DASH+'$'),'').replace(new RegExp(FL_EM_DASH,'g'),' - ')" +
  ".replace(new RegExp(FL_EN_DASH,'g'),' - ').replace(/(^|\\n) - /g,'$1- ');}" +
  "function flPlainDeep(v){if(typeof v==='string')return flPlain(v);" +
  "if(Array.isArray(v))return v.map(flPlainDeep);" +
  "if(v&&typeof v==='object'){var o={};for(var k in v){" +
  "if(Object.prototype.hasOwnProperty.call(v,k))o[k]=flPlainDeep(v[k]);}return o;}" +
  "return v;}";

/** Keys that only ever hold machine values — skipping them keeps the
 * raw scan to text a learner actually typed. */
const NON_TEXT_KEYS = new Set([
  "learner_id",
  "session_id",
  "token",
  "device",
  "sig",
  "signature",
  "kind",
  "mode",
]);

const RAW_SCAN_MAX_DEPTH = 3;

/** Crisis language anywhere in a request, checked BEFORE the request
 * is validated.
 *
 * Every other screen in the worker runs on the validated request, so a
 * disclosure typed into a field that then fails validation — a couple
 * of words in the CV box, which is rejected as too short — never
 * reached signposting and came back as a validation error instead. The
 * shape of the request should never decide whether someone is offered
 * help. */
export function crisisInRawRequest(value: unknown, depth = 0): boolean {
  if (typeof value === "string") return crisisHeuristic(value);
  if (depth >= RAW_SCAN_MAX_DEPTH) return false;
  if (Array.isArray(value)) {
    return value.some((v) => crisisInRawRequest(v, depth + 1));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).some(
      ([k, v]) => !NON_TEXT_KEYS.has(k) && crisisInRawRequest(v, depth + 1),
    );
  }
  return false;
}
