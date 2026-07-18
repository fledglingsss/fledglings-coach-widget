/* Classify Anthropic API failures so the learner sees the right
 * authored message and the logs say what actually went wrong.
 *
 *   billing — credits exhausted / payment required. The coach is down
 *             until the founder tops up: say "currently unavailable".
 *   auth    — key invalid/revoked. Same learner message, louder log.
 *   busy    — rate limited or overloaded upstream: say "try again in
 *             a minute".
 *   other   — anything else (network, timeout, 5xx): generic fallback.
 */

export type ModelErrorKind = "billing" | "auth" | "busy" | "other";

export function classifyModelError(err: unknown): ModelErrorKind {
  if (err === null || err === undefined) return "other";
  const e = err as { status?: number; message?: string; error?: unknown };
  const text = `${e.message ?? ""} ${safeJson(e.error)}`.toLowerCase();

  if (
    e.status === 402 ||
    text.includes("credit balance") ||
    text.includes("billing") ||
    text.includes("payment required") ||
    text.includes("purchase credits")
  ) {
    return "billing";
  }
  if (
    e.status === 401 ||
    e.status === 403 ||
    text.includes("authentication") ||
    text.includes("invalid x-api-key") ||
    text.includes("could not resolve authentication")
  ) {
    return "auth";
  }
  if (
    e.status === 429 ||
    e.status === 529 ||
    text.includes("overloaded") ||
    text.includes("rate limit")
  ) {
    return "busy";
  }
  return "other";
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v ?? "");
  } catch {
    return "";
  }
}
