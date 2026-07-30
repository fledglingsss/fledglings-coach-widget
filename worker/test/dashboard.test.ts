/* Provider dashboard endpoints: auth, tag scoping, the attention
 * list, CSV export and login redirect. LearnWorlds is mocked; the
 * portal-session auth, hub-score join and rollups run for real. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return {
    ...actual,
    listUsersPage: vi.fn(),
    courseTitleMap: vi.fn().mockResolvedValue(new Map()),
    accurateUserCourses: vi.fn().mockResolvedValue([]),
    getUserByEmail: vi.fn(),
  };
});

import { app, type Env } from "../src/index";
import { hashLearnerId } from "../src/lib/rate-limit";
import { signPayload } from "../src/lib/sign";
import { getUserByEmail, listUsersPage } from "../src/lib/learnworlds";

const listUsersMock = vi.mocked(listUsersPage);
const getUserMock = vi.mocked(getUserByEmail);

const SECRET = "lw-secret";
const NOW_SECS = Math.floor(Date.now() / 1000);

function makeEnv(): Env & { RATE_LIMITS: KVNamespace & { store: Map<string, string> } } {
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
  } as Env & { RATE_LIMITS: KVNamespace & { store: Map<string, string> } };
}

async function seedCode(env: Env, code: string, label: string, tag?: string) {
  await env.RATE_LIMITS.put(`portal:code:${code}`, JSON.stringify({ label, tag }));
}

async function cookieFor(code: string): Promise<string> {
  const sig = await signPayload(SECRET, `portal:${code}`);
  return `fl_portal=${code}.${sig}`;
}

/* Lists are chronological (oldest first) — `latest` is the last entry. */
async function seedScores(env: Env, email: string, scores: Record<string, number[]>) {
  const hash = (await hashLearnerId(email.toLowerCase())).slice(0, 16);
  const value: Record<string, Array<{ s: number; at: number }>> = {};
  for (const [tool, list] of Object.entries(scores)) {
    value[tool] = list.map((s, i) => ({
      s,
      at: NOW_SECS - (list.length - 1 - i) * 86_400,
    }));
  }
  await env.RATE_LIMITS.put(`hub:scores:${hash}`, JSON.stringify(value));
}

const USERS = [
  {
    id: "u1",
    email: "amy@swift.test",
    first_name: "Amy",
    last_name: "Ash",
    tags: ["Swift Learners"],
  },
  { id: "u2", email: "ben@swift.test", username: "ben.b", tags: ["Swift Learners"] },
  { id: "u3", email: "cal@other.test", tags: ["Other College"] },
  { id: "u4", email: "staff@fledglings.co", is_admin: true, tags: [] },
];

function get(path: string, cookie?: string) {
  return new Request(`http://coach.test${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
}

beforeEach(() => {
  listUsersMock.mockReset();
  listUsersMock.mockResolvedValue({ users: USERS, totalItems: 4 } as never);
  getUserMock.mockReset();
});

describe("GET /dashboard", () => {
  it("serves the shell without a session", async () => {
    const res = await app.request(get("/dashboard"), undefined, makeEnv());
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Provider Dashboard");
    expect(html).toContain("/dashboard/data");
  });
});

describe("GET /dashboard/data", () => {
  it("rejects without a session", async () => {
    const res = await app.request(get("/dashboard/data"), undefined, makeEnv());
    expect(res.status).toBe(401);
  });

  it("scopes learners to the code's tag and joins hub scores", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    await seedScores(env, "amy@swift.test", { cv: [60, 72], interview: [81] });
    const res = await app.request(
      get("/dashboard/data", await cookieFor("swift-code-1")),
      undefined,
      env,
    );
    expect(res.status).toBe(200);
    const data = (await res.json()) as {
      scopedTag: string;
      learners: Array<{ name: string; email: string; employability: Record<string, { latest: number | null; attempts: number }> }>;
      attention: Array<{ email: string; issue: string; readiness: number | null }>;
      kpis: { learners: number; avgCv: number | null };
    };
    expect(data.scopedTag).toBe("Swift Learners");
    /* Out-of-scope learner and staff never appear. */
    const emails = data.learners.map((l) => l.email);
    expect(emails).toEqual(["amy@swift.test", "ben@swift.test"]);
    const amy = data.learners.find((l) => l.email === "amy@swift.test")!;
    expect(amy.name).toBe("Amy Ash");
    expect(amy.employability.cv).toMatchObject({ latest: 72, attempts: 2 });
    expect(amy.employability.interview!.latest).toBe(81);
    expect(data.kpis.learners).toBe(2);
    expect(data.kpis.avgCv).toBe(72);
    /* Amy is healthy (readiness 76, 4 tasks) — never flagged. Ben has
     * never engaged, which is exactly what a provider must see. */
    expect(data.attention.some((a) => a.email === "amy@swift.test")).toBe(false);
    const ben = data.attention.find((a) => a.email === "ben@swift.test");
    expect(ben).toBeDefined();
    expect(ben!.issue).toBe("Not started any tool");
    expect(ben!.readiness).toBeNull();
  });

  it("whole-school code sees every learner but never staff", async () => {
    const env = makeEnv();
    await seedCode(env, "hq-code-0001", "Fledglings HQ");
    const res = await app.request(
      get("/dashboard/data", await cookieFor("hq-code-0001")),
      undefined,
      env,
    );
    const data = (await res.json()) as { scopedTag: null; learners: Array<{ email: string }> };
    expect(data.scopedTag).toBeNull();
    expect(data.learners.map((l) => l.email)).toEqual([
      "amy@swift.test",
      "ben@swift.test",
      "cal@other.test",
    ]);
  });

  it("caches per scope so a scoped code never sees the school payload", async () => {
    const env = makeEnv();
    await seedCode(env, "hq-code-0001", "Fledglings HQ");
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    await app.request(get("/dashboard/data", await cookieFor("hq-code-0001")), undefined, env);
    const res = await app.request(
      get("/dashboard/data", await cookieFor("swift-code-1")),
      undefined,
      env,
    );
    const data = (await res.json()) as { learners: Array<{ email: string }> };
    expect(data.learners.map((l) => l.email)).toEqual([
      "amy@swift.test",
      "ben@swift.test",
    ]);
  });
});

describe("GET /dashboard/export.csv", () => {
  it("exports scoped rows with scores and attempts", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    await seedScores(env, "amy@swift.test", { cv: [72], cover: [100, 100] });
    const res = await app.request(
      get("/dashboard/export.csv", await cookieFor("swift-code-1")),
      undefined,
      env,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/csv");
    const lines = (await res.text()).split("\r\n");
    expect(lines[0]).toContain("CV score");
    expect(lines).toHaveLength(3); // header + 2 in-scope learners
    expect(lines[1]).toContain('"amy@swift.test"');
    expect(lines[1]).toContain("72");
    expect(lines.join("\n")).not.toContain("cal@other.test");
  });

  it("rejects without a session", async () => {
    const res = await app.request(get("/dashboard/export.csv"), undefined, makeEnv());
    expect(res.status).toBe(401);
  });
});

describe("POST /api/hub greeting", () => {
  const DEVICE = "d".repeat(32);

  function hubReq(email?: string) {
    return new Request("http://coach.test/api/hub", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://www.fledglings.co" },
      body: JSON.stringify({ learner_id: DEVICE, email }),
    });
  }

  it("returns the learner's first name and caches it", async () => {
    const env = makeEnv();
    getUserMock.mockResolvedValue({
      id: "u1",
      email: "amy@swift.test",
      username: "AmyAsh",
    } as never);
    const res = await app.request(hubReq("amy@swift.test"), undefined, env);
    const data = (await res.json()) as { ok: boolean; name?: string };
    expect(data.ok).toBe(true);
    expect(data.name).toBe("Amy");
    /* Second call hits the cache — LearnWorlds asked exactly once. */
    await app.request(hubReq("amy@swift.test"), undefined, env);
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  it("omits the name for unknown emails and survives LW failures", async () => {
    const env = makeEnv();
    getUserMock.mockResolvedValue(null as never);
    const res = await app.request(hubReq("nobody@x.test"), undefined, env);
    const data = (await res.json()) as { ok: boolean; name?: string };
    expect(data.ok).toBe(true);
    expect(data.name).toBeUndefined();

    getUserMock.mockRejectedValue(new Error("lw down"));
    const res2 = await app.request(hubReq("other@x.test"), undefined, env);
    const data2 = (await res2.json()) as { ok: boolean; name?: string };
    expect(data2.ok).toBe(true);
    expect(data2.name).toBeUndefined();
  });

  it("skips the lookup entirely without an email", async () => {
    const res = await app.request(hubReq(), undefined, makeEnv());
    const data = (await res.json()) as { ok: boolean; name?: string };
    expect(data.ok).toBe(true);
    expect(getUserMock).not.toHaveBeenCalled();
  });
});

describe("POST /portal/login next handling", () => {
  function login(body: Record<string, string>) {
    return new Request("http://coach.test/portal/login", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(body).toString(),
    });
  }

  it("redirects to /dashboard after a dashboard login", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    const res = await app.request(
      login({ code: "swift-code-1", next: "/dashboard" }),
      undefined,
      env,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/dashboard");
    expect(res.headers.get("Set-Cookie")).toContain("fl_portal=swift-code-1.");
  });

  it("never follows an arbitrary next target", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    const res = await app.request(
      login({ code: "swift-code-1", next: "https://evil.test/phish" }),
      undefined,
      env,
    );
    expect(res.headers.get("Location")).toBe("/portal");
  });

  it("bounces a bad code back to the dashboard login with the error flag", async () => {
    const res = await app.request(
      login({ code: "wrong-code-999", next: "/dashboard" }),
      undefined,
      makeEnv(),
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/dashboard?login=failed");
  });
});
