/* Per-learner rate limiting, backed by KV.
 *   - 30 coach messages per learner per UTC day.
 *   - 20 coach messages per browser session (6h TTL).
 *
 * The learner key is a client-generated browser id, hashed server-side
 * before it is used as a KV key. A learner can reset it by clearing
 * storage, so these limits are a cost guard, not a security boundary —
 * the origin allowlist and daily cap bound worst-case spend.
 *
 * KV is eventually consistent: a concurrent burst can leak one slot.
 * Acceptable at these limits (30 vs 31). */

export interface RateLimitResult {
  allowed: boolean;
  reason?: "per_day_exhausted" | "per_session_exhausted";
  remainingDay?: number;
}

const PER_DAY_LIMIT = 30;
const PER_SESSION_LIMIT = 20;
const SESSION_TTL_SECONDS = 6 * 3600;

function dayKey(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

function secondsUntilEndOfDayUtc(now = new Date()): number {
  const end = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  return Math.max(60, Math.floor((end - now.getTime()) / 1000));
}

/** SHA-256 hex of the client id — raw ids never become KV keys. */
export async function hashLearnerId(id: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(id),
  );
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function readCount(kv: KVNamespace, key: string): Promise<number> {
  const v = await kv.get(key);
  const n = v ? parseInt(v, 10) : 0;
  return Number.isFinite(n) ? n : 0;
}

/**
 * Check + increment both counters. Returns { allowed: false } without
 * incrementing when a limit is hit, so a rejected request never burns
 * a slot.
 */
export async function checkAndIncrement(
  kv: KVNamespace,
  learnerHash: string,
  sessionId: string,
): Promise<RateLimitResult> {
  const now = new Date();
  const dayK = `rl:day:${learnerHash}:${dayKey(now)}`;
  const sessK = `rl:session:${learnerHash}:${sessionId}`;

  const [dayCount, sessCount] = await Promise.all([
    readCount(kv, dayK),
    readCount(kv, sessK),
  ]);

  if (dayCount >= PER_DAY_LIMIT) {
    return { allowed: false, reason: "per_day_exhausted", remainingDay: 0 };
  }
  if (sessCount >= PER_SESSION_LIMIT) {
    return {
      allowed: false,
      reason: "per_session_exhausted",
      remainingDay: Math.max(0, PER_DAY_LIMIT - dayCount),
    };
  }

  await Promise.all([
    kv.put(dayK, String(dayCount + 1), {
      expirationTtl: secondsUntilEndOfDayUtc(now),
    }),
    kv.put(sessK, String(sessCount + 1), {
      expirationTtl: SESSION_TTL_SECONDS,
    }),
  ]);

  return {
    allowed: true,
    remainingDay: Math.max(0, PER_DAY_LIMIT - (dayCount + 1)),
  };
}

export const limits = { perDay: PER_DAY_LIMIT, perSession: PER_SESSION_LIMIT };
