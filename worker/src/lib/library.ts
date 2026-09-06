/* My work, synced across a learner's devices.
 *
 * This is a deliberate change to what the platform stores. Until now a
 * learner's server-side record was whole numbers and timestamps —
 * never their documents — and the on-device library kept that true at
 * the cost of the library being stranded on one browser. The founder
 * asked for it to follow them, so their CVs, profiles and letters are
 * now held server-side too. That is a real widening of what we hold
 * about a sixteen-year-old, so the shape below is built to keep it
 * narrow:
 *
 *   - Nothing is stored without a signed identity token. The device
 *     library still works for a learner who has not signed in; only a
 *     proven identity gets a server copy.
 *   - Keys are hashes of the email, never the address itself.
 *   - Entries expire on their own (180 days, same as scores), so an
 *     abandoned account does not hold documents indefinitely.
 *   - The index carries only what the list needs. Full text lives in
 *     its own key, read one document at a time.
 *   - Provider surfaces never touch these keys. A provider sees
 *     scores and engagement, exactly as before — never a document.
 */

/** Documents kept per learner. Beyond this the oldest is dropped. */
export const LIBRARY_MAX_DOCS = 40;
/** Longest document body we will hold, in characters. */
export const LIBRARY_MAX_CHARS = 20_000;
/** How long a document survives without being touched. */
export const LIBRARY_TTL_SECS = 180 * 24 * 3600;

export type LibraryKind = "cv" | "linkedin" | "cover";
const KINDS: LibraryKind[] = ["cv", "linkedin", "cover"];

/** One row in the list — small enough that the whole index is a single
 * cheap read. */
export interface LibraryEntry {
  id: string;
  kind: LibraryKind;
  title: string;
  /** Epoch seconds. */
  at: number;
  score: number | null;
  /** The one next fix, lifted from the report for the card. */
  fix: string;
  /** The opening of the document, so a card for work saved on another
   * device is not blank before it is opened. Never the whole text. */
  snip: string;
}

function str(value: unknown, max: number): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

/** Ids are minted by the client; accept only a shape safe to put in a
 * key, so nothing can traverse into another learner's namespace. */
export function validDocId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9_-]{6,48}$/.test(value);
}

export function parseEntry(value: unknown): LibraryEntry | null {
  if (typeof value !== "object" || value === null) return null;
  const raw = value as Record<string, unknown>;
  if (!validDocId(raw.id)) return null;
  const kind = KINDS.includes(raw.kind as LibraryKind) ? (raw.kind as LibraryKind) : null;
  if (!kind) return null;
  const at =
    typeof raw.at === "number" && Number.isFinite(raw.at) ? Math.round(raw.at) : 0;
  if (at <= 0) return null;
  const score =
    typeof raw.score === "number" && Number.isFinite(raw.score)
      ? Math.max(0, Math.min(100, Math.round(raw.score)))
      : null;
  return {
    id: raw.id,
    kind,
    title: str(raw.title, 120),
    at,
    score,
    fix: str(raw.fix, 400),
    snip: str(raw.snip, 240),
  };
}

export function parseIndex(raw: string | null): LibraryEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return (Array.isArray(parsed) ? parsed : [])
      .map(parseEntry)
      .filter((e): e is LibraryEntry => e !== null)
      .sort((a, b) => b.at - a.at)
      .slice(0, LIBRARY_MAX_DOCS);
  } catch {
    return [];
  }
}

/**
 * Add or replace an entry, newest first.
 *
 * Returns the new index and the ids that fell off the end, so the
 * caller can delete their bodies rather than leaving them orphaned in
 * storage until their TTL expires.
 */
export function upsertEntry(
  index: LibraryEntry[],
  entry: LibraryEntry,
): { index: LibraryEntry[]; evicted: string[] } {
  const without = index.filter((e) => e.id !== entry.id);
  const next = [entry, ...without].sort((a, b) => b.at - a.at);
  const kept = next.slice(0, LIBRARY_MAX_DOCS);
  const evicted = next.slice(LIBRARY_MAX_DOCS).map((e) => e.id);
  return { index: kept, evicted };
}

export function removeEntry(
  index: LibraryEntry[],
  id: string,
): { index: LibraryEntry[]; removed: boolean } {
  const next = index.filter((e) => e.id !== id);
  return { index: next, removed: next.length !== index.length };
}

/** The stored body of one document. */
export interface LibraryDoc {
  text: string;
  /** The report as the tool rendered it, kept so the advice comes back
   * with the document rather than the learner seeing a score with no
   * explanation. */
  report: unknown;
}

export function parseDoc(raw: string | null): LibraryDoc | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.text !== "string") return null;
    return { text: parsed.text.slice(0, LIBRARY_MAX_CHARS), report: parsed.report ?? null };
  } catch {
    return null;
  }
}

/* Key names. The hash is of the learner's email, computed by the
 * caller — this module never sees an address. */
export function indexKey(emailHash16: string): string {
  return `lib:idx:${emailHash16}`;
}
export function docKey(emailHash16: string, id: string): string {
  return `lib:doc:${emailHash16}:${id}`;
}
