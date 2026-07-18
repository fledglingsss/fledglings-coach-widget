/* Anthropic calls: the Haiku moderation pre-pass and the Sonnet coach.
 *
 * Guard rails at this layer:
 *   - Hard timeouts on both calls (a hung model call must never hold a
 *     learner's request open indefinitely).
 *   - Bounded retries (1) — the handler's authored fallback is the
 *     real recovery path, not endless retrying.
 *   - Output caps: 5 tokens for the classifier, 400 for the coach.
 *   - Prompt caching on both system prompts (byte-identical every
 *     request, so busy periods pay cache-read rates).
 *   - The learner's messages are sent as conversation turns only —
 *     never interpolated into the system prompt.
 *
 * Nothing the learner writes is ever stored by this worker; failure of
 * either call is the caller's problem (it serves authored fallbacks). */

import Anthropic from "@anthropic-ai/sdk";

import coachSystemText from "../prompts/coach-system.txt";
import moderationSystemText from "../prompts/moderation-system.txt";
import type { ChatTurn } from "./validate";

export type ModerationVerdict = "ALLOW" | "BLOCK" | "CRISIS";

/* The proven Fledglings cleanKey() rail: tolerate a secret that was
 * pasted with quotes, whitespace, CR/LF, or surrounding text (the June
 * 2026 incident was a whole curl command pasted as the secret). An
 * sk-ant-… token found anywhere in the value wins; otherwise the value
 * is stripped of anything a header cannot carry. */
export function cleanApiKey(raw: string): string {
  const match = raw.match(/sk-ant-[A-Za-z0-9_-]{10,}/);
  if (match) return match[0];
  return raw.replace(/[^\x21-\x7E]/g, "");
}

const COACH_MAX_TOKENS = 400;
const MODERATION_MAX_TOKENS = 5;
const COACH_TIMEOUT_MS = 30_000;
const MODERATION_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 1;

function textOf(response: Anthropic.Message): string {
  return response.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("")
    .trim();
}

/** Classify the learner's latest message. Throws on API failure. */
export async function moderate(
  apiKey: string,
  model: string,
  message: string,
): Promise<ModerationVerdict> {
  const client = new Anthropic({
    apiKey: cleanApiKey(apiKey),
    timeout: MODERATION_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });
  const response = await client.messages.create({
    model,
    max_tokens: MODERATION_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: moderationSystemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: message }],
  });

  const verdict = textOf(response).toUpperCase();
  /* Fail toward safety on ambiguity: CRISIS outranks BLOCK outranks
   * ALLOW, and an unrecognised answer counts as BLOCK, not ALLOW. */
  if (verdict.includes("CRISIS")) return "CRISIS";
  if (verdict.includes("BLOCK")) return "BLOCK";
  if (verdict.includes("ALLOW")) return "ALLOW";
  return "BLOCK";
}

/**
 * Generate a coach reply. `history` is the validated, capped
 * conversation (oldest first, ending with the learner's latest
 * message). Context rides in the first user turn so the system prompt
 * stays byte-identical for prompt caching.
 */
export async function coach(
  apiKey: string,
  model: string,
  history: ChatTurn[],
  context: { learnerName: string; page: string },
): Promise<string> {
  const client = new Anthropic({
    apiKey: cleanApiKey(apiKey),
    timeout: COACH_TIMEOUT_MS,
    maxRetries: MAX_RETRIES,
  });

  const contextBlock =
    `<context>learner first name: ${context.learnerName || "unknown"}; ` +
    `current page: ${context.page || "unknown"}</context>`;

  const messages: Anthropic.MessageParam[] = history.map((turn, i) => ({
    role: turn.role,
    content:
      i === 0 && turn.role === "user"
        ? `${contextBlock}\n\n${turn.content}`
        : turn.content,
  }));

  const response = await client.messages.create({
    model,
    max_tokens: COACH_MAX_TOKENS,
    system: [
      {
        type: "text",
        text: coachSystemText,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const text = textOf(response);
  if (!text) throw new Error("Empty coach response");
  return text;
}

/* Authored responses — served without a model call. The learner never
 * sees an error state; the worst case is one of these. */

export const CRISIS_REPLY =
  "Thank you for telling me — that sounds really hard, and you deserve proper support from a real person. " +
  "Please talk to someone you trust: your tutor, a family member, or a trusted adult. " +
  "You can also contact Childline on 0800 1111 (if you're under 19), Samaritans on 116 123 (any age, any time), " +
  "or text SHOUT to 85258. If you or someone else is in immediate danger, call 999. " +
  "I'll be here if you want to carry on with your learning later.";

export const BLOCKED_REPLY =
  "I can't help with that one — I'm here for your learning: money, work, confidence and staying safe online. " +
  "Ask me anything about those and I'm all yours.";

export const FALLBACK_REPLY =
  "Sorry — I'm having trouble thinking just now. Give it another go in a minute. " +
  "If it's urgent, your tutor is the best person to ask. If you need someone to talk to, " +
  "Samaritans are on 116 123 and Childline is 0800 1111.";

export const LIMIT_REPLY =
  "You've used all your coach messages for today — nicely worked. " +
  "They'll top back up tomorrow. Your tutor can help with anything that can't wait.";
