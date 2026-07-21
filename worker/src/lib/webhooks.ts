/* LearnWorlds webhook ingestion — the real-time layer. LW POSTs JSON
 * with a PRE-SHARED signature header (Learnworlds-Webhook-Signature:
 * v1=<value>, found under Settings > Developers > Webhooks); we verify
 * with a constant-time compare and translate events into a compact
 * activity feed + live updates. Payments/subscriptions are ignored by
 * design — Fledglings takes no payments through LearnWorlds. */

export interface FeedEntry {
  kind: "completion" | "joined" | "lead";
  email: string;
  name: string;
  detail: string; // course title for completions; "" otherwise
  cohort: string | null;
  at: number; // epoch seconds
}

export const FEED_MAX = 100;

/** Constant-time-ish comparison of the signature header against the
 * stored secret. Both sides tolerate the v1= prefix and whitespace. */
export function verifyWebhookSignature(
  header: string | undefined,
  secret: string | undefined,
): boolean {
  if (!header || !secret) return false;
  const norm = (s: string): string => s.trim().replace(/^v1=/, "");
  const a = norm(header);
  const b = norm(secret);
  if (a.length !== b.length || a.length === 0) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export interface WebhookEvent {
  type: "courseCompleted" | "userUpdated" | "leadCreated";
  email: string;
  name: string;
  tags: string[] | null;
  courseId: string | null;
  courseTitle: string | null;
  userCreatedAt: number | null;
  at: number;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

/** Parse a LearnWorlds webhook body into a compact event, or null for
 * event types we deliberately ignore (payments, subscriptions, etc.)
 * or malformed payloads. */
export function parseWebhookEvent(body: unknown, now: Date): WebhookEvent | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const type = str(b.type);
  if (!["courseCompleted", "userUpdated", "leadCreated"].includes(type)) return null;
  const data = (typeof b.data === "object" && b.data !== null ? b.data : {}) as Record<
    string,
    unknown
  >;
  const user = (typeof data.user === "object" && data.user !== null
    ? data.user
    : data) as Record<string, unknown>;
  const email = str(user.email).toLowerCase();
  if (!email) return null;
  const first = str(user.first_name) || str(user.username);
  const last = str(user.last_name);
  const course = (typeof data.course === "object" && data.course !== null
    ? data.course
    : {}) as Record<string, unknown>;
  return {
    type: type as WebhookEvent["type"],
    email,
    name: [first, last].filter(Boolean).join(" ") || email.split("@")[0]!,
    tags: Array.isArray(user.tags) ? user.tags.map((t) => str(t)).filter(Boolean) : null,
    courseId: str(course.id) || null,
    courseTitle: str(course.title) || null,
    userCreatedAt: typeof user.created === "number" ? user.created : null,
    at:
      typeof data.completed_at === "number"
        ? data.completed_at
        : Math.floor(now.getTime() / 1000),
  };
}

/** Translate an event into a feed entry, or null when it shouldn't be
 * shown (e.g. routine profile updates — only genuinely-new users make
 * the feed, to keep it signal not noise). */
export function toFeedEntry(
  ev: WebhookEvent,
  cohort: string | null,
  now: Date,
): FeedEntry | null {
  if (ev.type === "courseCompleted") {
    return {
      kind: "completion",
      email: ev.email,
      name: ev.name,
      detail: ev.courseTitle ?? "a module",
      cohort,
      at: ev.at,
    };
  }
  if (ev.type === "leadCreated") {
    return { kind: "lead", email: ev.email, name: ev.name, detail: "", cohort, at: ev.at };
  }
  /* userUpdated fires for every profile touch — only surface users
   * created in the last 10 minutes as "joined". */
  const nowS = now.getTime() / 1000;
  if (ev.userCreatedAt !== null && nowS - ev.userCreatedAt < 600) {
    return { kind: "joined", email: ev.email, name: ev.name, detail: "", cohort, at: ev.at };
  }
  return null;
}

/** Prepend an entry, dedupe identical neighbours, cap the buffer. */
export function pushFeed(feed: FeedEntry[], entry: FeedEntry): FeedEntry[] {
  const dup = feed.some(
    (f) =>
      f.kind === entry.kind &&
      f.email === entry.email &&
      f.detail === entry.detail &&
      Math.abs(f.at - entry.at) < 5,
  );
  if (dup) return feed;
  return [entry, ...feed].slice(0, FEED_MAX);
}
