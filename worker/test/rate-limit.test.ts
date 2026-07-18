import { describe, expect, it } from "vitest";

import {
  checkAndIncrement,
  hashLearnerId,
  limits,
} from "../src/lib/rate-limit";
import { makeKvMock } from "./helpers/kv-mock";

describe("hashLearnerId", () => {
  it("produces a stable 64-char hex digest", async () => {
    const a = await hashLearnerId("learner-one");
    const b = await hashLearnerId("learner-one");
    const c = await hashLearnerId("learner-two");
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});

describe("checkAndIncrement", () => {
  it("allows messages up to the session limit, then blocks", async () => {
    const kv = makeKvMock();
    for (let i = 0; i < limits.perSession; i++) {
      const r = await checkAndIncrement(kv, "hash1", "sess1");
      expect(r.allowed, `message ${i + 1}`).toBe(true);
    }
    const blocked = await checkAndIncrement(kv, "hash1", "sess1");
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("per_session_exhausted");
  });

  it("a fresh session continues until the daily limit, then blocks", async () => {
    const kv = makeKvMock();
    let sent = 0;
    for (let session = 0; session < 3; session++) {
      for (let i = 0; i < limits.perSession && sent < limits.perDay; i++) {
        const r = await checkAndIncrement(kv, "hash1", `sess${session}`);
        expect(r.allowed).toBe(true);
        sent++;
      }
    }
    expect(sent).toBe(limits.perDay);
    const blocked = await checkAndIncrement(kv, "hash1", "sess-final");
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toBe("per_day_exhausted");
  });

  it("limits are per learner — one learner cannot exhaust another", async () => {
    const kv = makeKvMock();
    for (let i = 0; i < limits.perSession; i++) {
      await checkAndIncrement(kv, "hashA", "s1");
    }
    const other = await checkAndIncrement(kv, "hashB", "s1");
    expect(other.allowed).toBe(true);
  });

  it("a rejected request does not burn a slot", async () => {
    const kv = makeKvMock();
    for (let i = 0; i < limits.perSession; i++) {
      await checkAndIncrement(kv, "hash1", "s1");
    }
    await checkAndIncrement(kv, "hash1", "s1"); // rejected
    await checkAndIncrement(kv, "hash1", "s1"); // rejected
    /* Day counter should still equal perSession, not perSession + 2. */
    const dayKey = [...kv.store.keys()].find((k) => k.startsWith("rl:day:"));
    expect(dayKey).toBeDefined();
    expect(kv.store.get(dayKey as string)).toBe(String(limits.perSession));
  });

  it("reports remaining daily allowance", async () => {
    const kv = makeKvMock();
    const first = await checkAndIncrement(kv, "hash1", "s1");
    expect(first.remainingDay).toBe(limits.perDay - 1);
  });
});
