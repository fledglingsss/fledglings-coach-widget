/* Ops rights are the keys to the platform: minting and revoking
 * provider codes, the coach kill switch, cache busting.
 *
 * They used to be inferred — any unscoped ("whole school") provider
 * code opened the ops console. That conflates two different things: a
 * multi-site provider legitimately needs to see every learner, which
 * is not the same as holding the kill switch for everyone else's
 * platform too. These tests pin the separation so it cannot quietly
 * regress the next time the portal is touched. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return { ...actual, listUsersPage: vi.fn().mockResolvedValue({ users: [], totalPages: 1, totalItems: 0 }) };
});

import { app, type Env } from "../src/index";
import { signPayload } from "../src/lib/sign";

const SECRET = "lw-secret";
const ORIGIN = "https://www.fledglings.co";

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

/** A signed portal cookie for a code, exactly as /portal/login mints. */
async function cookieFor(code: string): Promise<string> {
  const iat = Math.floor(Date.now() / 1000);
  const sig = await signPayload(SECRET, `portal:${code}:${iat}`);
  return `fl_portal=${code}.${iat}.${sig}`;
}

async function seed(env: Env, code: string, record: unknown): Promise<void> {
  await env.RATE_LIMITS.put(`portal:code:${code}`, JSON.stringify(record));
}

function opsAction(cookie: string, body: unknown): Request {
  return new Request("http://coach.test/ops/action", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN, Cookie: cookie },
    body: JSON.stringify(body),
  });
}

let env: Env;
beforeEach(() => {
  env = makeEnv();
});

describe("ops rights are granted, never inferred", () => {
  it("refuses the kill switch to a whole-school provider without ops", async () => {
    await seed(env, "school-aaaaaaaaaaaa", { label: "Big Trust" }); // unscoped, no ops
    const res = await app.request(
      opsAction(await cookieFor("school-aaaaaaaaaaaa"), { op: "coach_kill" }),
      undefined,
      env,
    );
    expect(res.status).toBe(401);
    /* and the coach is still alive */
    expect(await env.RATE_LIMITS.get("ops:coach-disabled")).toBeNull();
  });

  it("refuses the ops console page to that same provider", async () => {
    await seed(env, "school-aaaaaaaaaaaa", { label: "Big Trust" });
    const res = await app.request(
      new Request("http://coach.test/ops", {
        headers: { Cookie: await cookieFor("school-aaaaaaaaaaaa") },
      }),
      undefined,
      env,
    );
    /* the login gate, not the console */
    expect(await res.text()).not.toContain("kill switch");
  });

  it("allows a code that explicitly holds ops", async () => {
    await seed(env, "hq-bbbbbbbbbbbb", { label: "Fledglings HQ", ops: true });
    const res = await app.request(
      opsAction(await cookieFor("hq-bbbbbbbbbbbb"), { op: "coach_kill" }),
      undefined,
      env,
    );
    expect(res.status).toBe(200);
    expect(await env.RATE_LIMITS.get("ops:coach-disabled")).toBe("true");
  });

  it("treats only a literal true as ops — not a truthy value", async () => {
    for (const ops of ["true", 1, "yes", {}]) {
      const code = `odd-${String(ops).replace(/\W/g, "")}xxxxxxxx`;
      await seed(env, code, { label: "Odd record", ops });
      const res = await app.request(
        opsAction(await cookieFor(code), { op: "coach_kill" }),
        undefined,
        env,
      );
      expect(res.status).toBe(401);
    }
  });

  it("gives a scoped provider no ops rights either", async () => {
    await seed(env, "swift-cccccccccccc", { label: "Swift", tag: "Swift" });
    const res = await app.request(
      opsAction(await cookieFor("swift-cccccccccccc"), { op: "coach_kill" }),
      undefined,
      env,
    );
    expect(res.status).toBe(401);
  });

  it("mints provider codes WITHOUT ops unless it is asked for", async () => {
    await seed(env, "hq-bbbbbbbbbbbb", { label: "Fledglings HQ", ops: true });
    const cookie = await cookieFor("hq-bbbbbbbbbbbb");

    const plain = await app.request(
      opsAction(cookie, { op: "mint_code", label: "New College" }),
      undefined,
      env,
    );
    const { code } = (await plain.json()) as { code: string };
    const stored = JSON.parse((await env.RATE_LIMITS.get(`portal:code:${code}`)) || "{}");
    expect(stored.ops).toBeUndefined();

    /* that freshly minted whole-school code cannot reach ops */
    const tryOps = await app.request(
      opsAction(await cookieFor(code), { op: "coach_kill" }),
      undefined,
      env,
    );
    expect(tryOps.status).toBe(401);
  });

  it("can mint a deliberate ops code when asked", async () => {
    await seed(env, "hq-bbbbbbbbbbbb", { label: "Fledglings HQ", ops: true });
    const res = await app.request(
      opsAction(await cookieFor("hq-bbbbbbbbbbbb"), {
        op: "mint_code",
        label: "Second founder",
        ops: true,
      }),
      undefined,
      env,
    );
    const { code } = (await res.json()) as { code: string };
    const stored = JSON.parse((await env.RATE_LIMITS.get(`portal:code:${code}`)) || "{}");
    expect(stored.ops).toBe(true);
  });

  it("legacy plain-string codes carry no ops rights", async () => {
    await env.RATE_LIMITS.put("portal:code:legacy-dddddddddddd", "Old Provider");
    const res = await app.request(
      opsAction(await cookieFor("legacy-dddddddddddd"), { op: "coach_kill" }),
      undefined,
      env,
    );
    expect(res.status).toBe(401);
  });
});
