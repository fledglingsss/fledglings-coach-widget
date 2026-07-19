/* Request validation for POST /api/coach — pure and fully unit-tested.
 * Everything is sanitised and capped BEFORE any model call or KV write. */

import { sanitiseLine, sanitiseText } from "./safety";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface CoachRequest {
  learnerId: string;
  sessionId: string;
  learnerName: string;
  page: string;
  history: ChatTurn[];
}

export const CAPS = {
  /** Max conversation turns forwarded to the model. */
  maxTurns: 12,
  /** Max characters per turn. */
  maxTurnChars: 1200,
  /** Max characters for the learner display name. */
  maxNameChars: 60,
  /** Max characters for the page title context. */
  maxPageChars: 160,
  /** Max characters for client-generated ids. */
  maxIdChars: 80,
  /** Max raw request body size in bytes. */
  maxBodyBytes: 32_768,
} as const;

/* Ids are client-generated hex-ish tokens — anything else is rejected
 * rather than cleaned, because a malformed id means a tampered client. */
export const ID_PATTERN = /^[A-Za-z0-9_-]{8,80}$/;

/* Deliberately simple email shape check — LearnWorlds is the actual
 * authority on whether the account exists. */
export const EMAIL_PATTERN = /^[^\s@]{1,64}@[^\s@]{3,190}$/;

export type ValidationResult =
  | { ok: true; request: CoachRequest }
  | { ok: false; error: string };

function parseHistory(raw: unknown): ChatTurn[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const turns: ChatTurn[] = [];
  for (const item of raw.slice(-CAPS.maxTurns)) {
    if (typeof item !== "object" || item === null) return null;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string") return null;
    const cleaned = sanitiseText(content, CAPS.maxTurnChars);
    if (cleaned.length === 0) continue;
    turns.push({ role, content: cleaned });
  }
  /* The final turn must be the learner's message being answered. */
  if (turns.length === 0 || turns[turns.length - 1].role !== "user") {
    return null;
  }
  return turns;
}

/** Validate a parsed JSON body. Never throws. */
export function validateCoachRequest(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "body_not_object" };
  }
  const b = body as Record<string, unknown>;

  const learnerId = typeof b.learner_id === "string" ? b.learner_id : "";
  const sessionId = typeof b.session_id === "string" ? b.session_id : "";
  if (!ID_PATTERN.test(learnerId)) return { ok: false, error: "bad_learner_id" };
  if (!ID_PATTERN.test(sessionId)) return { ok: false, error: "bad_session_id" };

  const history = parseHistory(b.messages);
  if (!history) return { ok: false, error: "bad_messages" };

  return {
    ok: true,
    request: {
      learnerId,
      sessionId,
      learnerName: sanitiseLine(b.learner_name, CAPS.maxNameChars),
      page: sanitiseLine(b.page, CAPS.maxPageChars),
      history,
    },
  };
}
