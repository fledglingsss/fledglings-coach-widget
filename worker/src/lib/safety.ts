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

/* Output gate — the coach reply must never leak the prompt scaffolding
 * or run away in length. Returns the cleaned reply, or null when the
 * reply is unsafe to show (caller serves the authored fallback). */
const MAX_REPLY_CHARS = 1400;
const LEAK_MARKERS = [
  /<\/?context>/i,
  /you are fledge, the fledglings learning coach/i,
  /\bHARD RULES\b/,
  /\bsystem prompt\b/i,
];

export function guardReply(reply: string): string | null {
  const cleaned = sanitiseText(reply, MAX_REPLY_CHARS);
  if (!cleaned) return null;
  if (LEAK_MARKERS.some((re) => re.test(cleaned))) return null;
  return cleaned;
}
