/* Syncing a learner's documents widened what this platform holds
 * about a sixteen-year-old, so the boundaries are pinned by tests: no
 * storage without a proven identity, no reading across learners, and
 * an index that cannot be grown without bound by whoever is calling.
 */
import { describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return { ...actual, getUserByEmail: vi.fn() };
});

import { app, type Env } from "../src/index";
import {
  docKey,
  indexKey,
  LIBRARY_MAX_DOCS,
  parseEntry,
  parseIndex,
  removeEntry,
  upsertEntry,
  validDocId,
  type LibraryEntry,
} from "../src/lib/library";
import { mintIdentityToken } from "../src/lib/identity";
import { hashLearnerId } from "../src/lib/rate-limit";

const SECRET = "lw-secret";
const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "d".repeat(32);
const OTHER_ID = "e".repeat(32);
const EMAIL = "learner@example.com";

function makeEnv(): Env {
  return {
    RATE_LIMITS: makeKvMock(),
    ANTHROPIC_API_KEY: "sk-ant-test",
    COACH_DISABLED: "false",
    WORKER_VERSION: "test",
    COACH_MODEL: "m",
    MODERATION_MODEL: "m",
    LEARNWORLDS_CLIENT_ID: "lw-id",
    LEARNWORLDS_CLIENT_SECRET: SECRET,
    LEARNWORLDS_SCHOOL_URL: "https://school.test",
  } as Env;
}

function post(path: string, body: Record<string, unknown>) {
  return new Request(`http://coach.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify(body),
  });
}

/** Sign a learner in the way /api/identity would, binding the device. */
async function signIn(env: Env, learnerId = GOOD_ID, email = EMAIL): Promise<string> {
  const device = (await hashLearnerId(learnerId)).slice(0, 16);
  const emailHash = (await hashLearnerId(email)).slice(0, 16);
  await env.RATE_LIMITS.put(`id:bind:${emailHash}`, JSON.stringify([device]));
  return (
    (await mintIdentityToken(SECRET, email, device, Math.floor(Date.now() / 1000))) ?? ""
  );
}

function entry(over: Partial<LibraryEntry> = {}): LibraryEntry {
  return {
    id: "d1abcdef",
    kind: "cv",
    title: "My CV",
    at: 1_700_000_000,
    score: 62,
    fix: "Add a number to your second bullet.",
    ...over,
  };
}

/* ---------------- the index, as pure data ---------------- */

describe("the library index", () => {
  it("rejects ids that could reach outside a learner's namespace", () => {
    expect(validDocId("d1abcdef")).toBe(true);
    expect(validDocId("../other")).toBe(false);
    expect(validDocId("lib:doc:xx")).toBe(false);
    expect(validDocId("short")).toBe(false);
    expect(validDocId(42)).toBe(false);
  });

  it("drops entries that are not a real document", () => {
    expect(parseEntry({ ...entry(), kind: "passport" })).toBeNull();
    expect(parseEntry({ ...entry(), id: "no" })).toBeNull();
    expect(parseEntry({ ...entry(), at: 0 })).toBeNull();
    expect(parseEntry(entry())).not.toBeNull();
  });

  it("keeps the newest first and replaces rather than duplicates", () => {
    const older = entry({ id: "d1aaaaaa", at: 100 });
    const newer = entry({ id: "d2bbbbbb", at: 200 });
    const { index } = upsertEntry([older], newer);
    expect(index.map((e) => e.id)).toEqual(["d2bbbbbb", "d1aaaaaa"]);
    const again = upsertEntry(index, entry({ id: "d1aaaaaa", at: 300, title: "Edited" }));
    expect(again.index).toHaveLength(2);
    expect(again.index[0]!.title).toBe("Edited");
  });

  it("caps the index and reports what fell off, so no body is orphaned", () => {
    let index: LibraryEntry[] = [];
    let lastEvicted: string[] = [];
    for (let i = 0; i < LIBRARY_MAX_DOCS + 3; i++) {
      const res = upsertEntry(index, entry({ id: `d${String(i).padStart(7, "0")}`, at: 1000 + i }));
      index = res.index;
      lastEvicted = res.evicted;
    }
    expect(index).toHaveLength(LIBRARY_MAX_DOCS);
    expect(lastEvicted).toHaveLength(1);
  });

  it("survives a corrupt stored index", () => {
    expect(parseIndex("not json")).toEqual([]);
    expect(parseIndex(null)).toEqual([]);
  });

  it("removes by id", () => {
    const { index, removed } = removeEntry([entry()], "d1abcdef");
    expect(removed).toBe(true);
    expect(index).toEqual([]);
  });
});

/* ---------------- the routes ---------------- */

describe("saving needs a proven identity", () => {
  it("refuses to store anything for a caller with no token", async () => {
    const env = makeEnv();
    const res = await app.request(
      post("/api/library/save", { learner_id: GOOD_ID, entry: entry(), text: "My CV text" }),
      undefined,
      env,
    );
    const body = (await res.json()) as { ok: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("not_signed_in");
    /* Nothing was written at all. */
    const hash = (await hashLearnerId(EMAIL)).slice(0, 16);
    expect(await env.RATE_LIMITS.get(indexKey(hash))).toBeNull();
  });

  it("stores the document for a signed-in learner", async () => {
    const env = makeEnv();
    const token = await signIn(env);
    const res = await app.request(
      post("/api/library/save", {
        learner_id: GOOD_ID,
        token,
        entry: entry(),
        text: "Career History\nWeekend Team Member",
        report: { overall: 62 },
      }),
      undefined,
      env,
    );
    expect((await res.json()) as { ok: boolean }).toEqual({ ok: true, id: "d1abcdef" });
    const hash = (await hashLearnerId(EMAIL)).slice(0, 16);
    expect(parseIndex(await env.RATE_LIMITS.get(indexKey(hash)))).toHaveLength(1);
    expect(await env.RATE_LIMITS.get(docKey(hash, "d1abcdef"))).toContain("Weekend Team");
  });
});

describe("a learner only ever sees their own work", () => {
  it("does not return another learner's documents", async () => {
    const env = makeEnv();
    const mine = await signIn(env, GOOD_ID, EMAIL);
    await app.request(
      post("/api/library/save", {
        learner_id: GOOD_ID,
        token: mine,
        entry: entry(),
        text: "My private CV",
      }),
      undefined,
      env,
    );
    /* A different learner, signed in properly as themselves. */
    const theirs = await signIn(env, OTHER_ID, "someone@else.com");
    const res = await app.request(
      post("/api/library/list", { learner_id: OTHER_ID, token: theirs }),
      undefined,
      env,
    );
    const body = (await res.json()) as { ok: boolean; entries: LibraryEntry[] };
    expect(body.entries).toEqual([]);

    /* And cannot fetch the body by guessing the id. */
    const got = await app.request(
      post("/api/library/get", { learner_id: OTHER_ID, token: theirs, id: "d1abcdef" }),
      undefined,
      env,
    );
    const gotBody = (await got.json()) as { ok: boolean; reason?: string };
    expect(gotBody.ok).toBe(false);
    expect(gotBody.reason).toBe("gone");
  });

  it("hands a learner back their own document", async () => {
    const env = makeEnv();
    const token = await signIn(env);
    await app.request(
      post("/api/library/save", {
        learner_id: GOOD_ID,
        token,
        entry: entry(),
        text: "My private CV",
      }),
      undefined,
      env,
    );
    const res = await app.request(
      post("/api/library/get", { learner_id: GOOD_ID, token, id: "d1abcdef" }),
      undefined,
      env,
    );
    const body = (await res.json()) as { ok: boolean; text: string };
    expect(body.ok).toBe(true);
    expect(body.text).toBe("My private CV");
  });
});

describe("deleting removes it everywhere", () => {
  it("clears the index row and the body", async () => {
    const env = makeEnv();
    const token = await signIn(env);
    await app.request(
      post("/api/library/save", {
        learner_id: GOOD_ID,
        token,
        entry: entry(),
        text: "Delete me",
      }),
      undefined,
      env,
    );
    await app.request(
      post("/api/library/delete", { learner_id: GOOD_ID, token, id: "d1abcdef" }),
      undefined,
      env,
    );
    const hash = (await hashLearnerId(EMAIL)).slice(0, 16);
    expect(parseIndex(await env.RATE_LIMITS.get(indexKey(hash)))).toEqual([]);
    expect(await env.RATE_LIMITS.get(docKey(hash, "d1abcdef"))).toBeNull();
  });
});
