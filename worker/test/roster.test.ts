/* Rolling roster — staggered refresh so the platform API never sees a
 * burst. Pure logic: reconcile, stalest-first ordering, stale marks. */
import { describe, expect, it } from "vitest";

import {
  markStale,
  parseRoster,
  perTickFor,
  reconcileRoster,
  stalestIndices,
  type RosterSnapshot,
} from "../src/lib/roster";

const user = (id: string, email: string, tags: string[] = []) => ({
  id,
  email,
  tags,
});

describe("reconcileRoster", () => {
  it("adds new accounts as stale and keeps fetched courses for known ones", () => {
    const prev: RosterSnapshot = {
      entries: [
        {
          user: user("u1", "amy@x.test", ["Swift Learners"]),
          courses: [{ title: "Budgeting", progressRate: 100, completed: true }],
          fetchedAt: 1000,
        },
      ],
      listSyncedAt: 1000,
    };
    const next = reconcileRoster(prev, [user("u1", "amy@x.test", ["Swift Learners", "New Tag"]), user("u2", "ben@x.test")], 2000);
    expect(next.entries).toHaveLength(2);
    const amy = next.entries.find((e) => e.user.id === "u1")!;
    expect(amy.courses).toHaveLength(1); // fetched data survives
    expect(amy.fetchedAt).toBe(1000);
    expect(amy.user.tags).toEqual(["Swift Learners", "New Tag"]); // fresher fields win
    const ben = next.entries.find((e) => e.user.id === "u2")!;
    expect(ben.fetchedAt).toBe(0); // joins stale — picked up next tick
    expect(next.listSyncedAt).toBe(2000);
  });

  it("drops departed accounts", () => {
    const prev = reconcileRoster(null, [user("u1", "amy@x.test"), user("u2", "ben@x.test")], 1000);
    const next = reconcileRoster(prev, [user("u2", "ben@x.test")], 2000);
    expect(next.entries.map((e) => e.user.id)).toEqual(["u2"]);
  });
});

describe("stalestIndices", () => {
  it("orders oldest-first and respects the count", () => {
    const snap = reconcileRoster(null, [user("a", "a@x"), user("b", "b@x"), user("c", "c@x")], 1);
    snap.entries[0]!.fetchedAt = 300;
    snap.entries[1]!.fetchedAt = 100;
    snap.entries[2]!.fetchedAt = 200;
    expect(stalestIndices(snap, 2)).toEqual([1, 2]);
  });
});

describe("markStale", () => {
  it("zeroes the matching learner case-insensitively", () => {
    const snap = reconcileRoster(null, [user("a", "Amy@X.Test")], 1);
    snap.entries[0]!.fetchedAt = 500;
    expect(markStale(snap, "amy@x.test")).toBe(true);
    expect(snap.entries[0]!.fetchedAt).toBe(0);
    /* Already-stale entries report no change. */
    expect(markStale(snap, "amy@x.test")).toBe(false);
  });
});

describe("perTickFor", () => {
  it("sizes the tick so a full cycle takes about half an hour at any scale", () => {
    expect(perTickFor(61)).toBe(11); // 61/11 ≈ 6 ticks ≈ 30 min
    expect(perTickFor(600)).toBe(100); // still 6 ticks = 30 min
    expect(perTickFor(5)).toBe(3); // floor: tiny schools converge fast
  });
});

describe("parseRoster", () => {
  it("rejects junk without throwing", () => {
    expect(parseRoster(null)).toBeNull();
    expect(parseRoster("not json")).toBeNull();
    expect(parseRoster('{"entries":"nope"}')).toBeNull();
  });
});
