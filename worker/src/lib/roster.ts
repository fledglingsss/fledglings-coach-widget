/* Rolling learner roster — the staggered-refresh store behind the
 * provider dashboard.
 *
 * Instead of bursting one API call per learner whenever a dashboard
 * cache goes cold (which brushes the platform's ~30 req/10s limit as
 * cohorts grow), a 5-minute cron refreshes the STALEST few learners
 * each tick. A full cycle covers every account roughly every half
 * hour, activity webhooks mark a learner stale so they refresh within
 * one tick of doing something, and dashboard loads read the snapshot
 * with zero learner-list bursts. */

import type { LwUser, LwUserCourse } from "./learnworlds";

export interface RosterEntry {
  user: Pick<
    LwUser,
    "id" | "email" | "first_name" | "last_name" | "username" | "tags"
  >;
  courses: LwUserCourse[];
  /** Epoch ms of the last successful course fetch; 0 = marked stale. */
  fetchedAt: number;
}

export interface RosterSnapshot {
  entries: RosterEntry[];
  /** Epoch ms the user LIST was last reconciled with the platform. */
  listSyncedAt: number;
}

export const ROSTER_KV_KEY = "roster:v1";

/** Learners refreshed per 5-minute tick, sized so one full cycle
 * takes about half an hour whatever the roster grows to (6 ticks per
 * cycle), with a small floor so tiny schools still converge quickly. */
export function perTickFor(rosterSize: number): number {
  return Math.max(3, Math.ceil(rosterSize / 6));
}

export function parseRoster(raw: string | null): RosterSnapshot | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as RosterSnapshot;
    if (!Array.isArray(parsed.entries)) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Merge the live user list into the snapshot: new accounts join as
 * stale (so the next ticks pick them up), departed accounts drop,
 * existing entries keep their fetched courses but take the fresher
 * user fields (name/tags can change platform-side any time). */
export function reconcileRoster(
  snapshot: RosterSnapshot | null,
  users: LwUser[],
  now: number,
): RosterSnapshot {
  const byId = new Map((snapshot?.entries ?? []).map((e) => [e.user.id, e]));
  const entries: RosterEntry[] = users.map((u) => {
    const prev = byId.get(u.id);
    return {
      user: {
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        username: u.username,
        tags: u.tags,
      },
      courses: prev?.courses ?? [],
      fetchedAt: prev?.fetchedAt ?? 0,
    };
  });
  return { entries, listSyncedAt: now };
}

/** The indices of the entries most overdue a refresh, oldest first. */
export function stalestIndices(snapshot: RosterSnapshot, count: number): number[] {
  return snapshot.entries
    .map((e, i) => ({ i, at: e.fetchedAt }))
    .sort((a, b) => a.at - b.at)
    .slice(0, count)
    .map((x) => x.i);
}

/** Mark one learner (by email) stale so the next tick refreshes them —
 * called from activity webhooks. Returns true if anything changed. */
export function markStale(snapshot: RosterSnapshot, email: string): boolean {
  const target = email.toLowerCase();
  let changed = false;
  for (const e of snapshot.entries) {
    if ((e.user.email ?? "").toLowerCase() === target && e.fetchedAt !== 0) {
      e.fetchedAt = 0;
      changed = true;
    }
  }
  return changed;
}
