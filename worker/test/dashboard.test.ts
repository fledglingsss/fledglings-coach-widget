/* Provider dashboard endpoints: auth, tag scoping, the attention
 * list, CSV export and login redirect. LearnWorlds is mocked; the
 * portal-session auth, hub-score join and rollups run for real. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";
import { COURSE_MAP } from "../src/lib/course-map";

vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return {
    ...actual,
    listUsersPage: vi.fn(),
    listAllUsers: vi.fn(),
    courseTitleMap: vi.fn().mockResolvedValue(new Map()),
    accurateUserCourses: vi.fn(),
    getUserByEmail: vi.fn(),
  };
});

import { app, type Env } from "../src/index";
import { hashLearnerId } from "../src/lib/rate-limit";
import { signPayload } from "../src/lib/sign";
import { accurateUserCourses, getUserByEmail, listAllUsers, listUsersPage } from "../src/lib/learnworlds";

const listUsersMock = vi.mocked(listUsersPage);
const listAllMock = vi.mocked(listAllUsers);
const getUserMock = vi.mocked(getUserByEmail);
const coursesMock = vi.mocked(accurateUserCourses);

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

const NOW = Date.now() / 1000;
const USERS = [
  {
    id: "u1",
    email: "amy@swift.test",
    first_name: "Amy",
    last_name: "Ash",
    tags: ["Swift Learners"],
    created: NOW - 60 * 86_400,
    last_login: NOW - 2 * 86_400,
  },
  /* Ben has never logged in — the risk engine tiers him "high". */
  { id: "u2", email: "ben@swift.test", username: "ben.b", tags: ["Swift Learners"] },
  {
    id: "u3",
    email: "cal@other.test",
    tags: ["Other College"],
    created: NOW - 60 * 86_400,
    last_login: NOW - 2 * 86_400,
  },
  { id: "u4", email: "staff@fledglings.co", is_admin: true, tags: [] },
];

const AMY_COURSES = [
  { title: "Budgeting That Actually Works", progressRate: 100, completed: true },
  { title: "Cybersecurity Fundamentals", progressRate: 40, completed: false },
  { title: "Financial Literacy", progressRate: null, completed: false }, // container — excluded
];

function get(path: string, cookie?: string) {
  return new Request(`http://coach.test${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
}

beforeEach(() => {
  listUsersMock.mockReset();
  listUsersMock.mockResolvedValue({ users: USERS, totalItems: 4 } as never);
  listAllMock.mockReset();
  listAllMock.mockResolvedValue(USERS as never);
  getUserMock.mockReset();
  coursesMock.mockReset();
  coursesMock.mockImplementation(async (_env, userId) =>
    (userId === "u1" ? AMY_COURSES : []) as never,
  );
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
      learners: Array<{
        name: string;
        email: string;
        employability: Record<string, { latest: number | null; attempts: number }>;
        learning: { enrolled: number; completed: number; inProgress: number };
        engagement: { tier: string | null; daysSinceLogin: number | null };
      }>;
      attention: Array<{ email: string; issue: string; readiness: number | null }>;
      kpis: { learners: number; avgCv: number | null; modulesCompleted: number };
      analytics: {
        courses: Array<{ title: string; enrolled: number; completed: number; pct: number }>;
        curriculum: Array<{ area: string; pct: number }>;
      };
    };
    expect(data.scopedTag).toBe("Swift Learners");
    /* Out-of-scope learner and staff never appear. */
    const emails = data.learners.map((l) => l.email);
    expect(emails).toEqual(["amy@swift.test", "ben@swift.test"]);
    const amy = data.learners.find((l) => l.email === "amy@swift.test")!;
    expect(amy.name).toBe("Amy Ash");
    expect(amy.employability.cv).toMatchObject({ latest: 72, attempts: 2, history: [60, 72] });
    expect(amy.employability.interview!.latest).toBe(81);
    /* LearnWorlds learning join: 2 real modules (container excluded),
     * 1 completed, 1 in progress; engagement tier from the risk engine. */
    expect(amy.learning).toMatchObject({ enrolled: 2, completed: 1, inProgress: 1 });
    /* Per-module detail, in-progress first, completed last. */
    expect(
      (amy.learning as unknown as { modules: Array<{ t: string; p: number; done: boolean }> }).modules,
    ).toEqual([
      { t: "Cybersecurity Fundamentals", p: 40, done: false },
      { t: "Budgeting That Actually Works", p: 100, done: true },
    ]);
    expect(amy.engagement.tier).toBe("ok");
    expect(amy.engagement.daysSinceLogin).toBe(2);
    expect(data.kpis.learners).toBe(2);
    expect(data.kpis.avgCv).toBe(72);
    expect(data.kpis.modulesCompleted).toBe(1);
    /* The cross-system funnel: Amy advances every stage, Ben none. */
    const funnel = (data as unknown as { funnel: Array<{ stage: string; n: number }> }).funnel;
    expect(funnel.map((f) => f.n)).toEqual([2, 1, 1, 1, 1, 1]);
    expect(funnel[0]!.stage).toBe("In your scope");
    expect(funnel[5]!.stage).toBe("Job-ready (70+)");
    /* Learning rollups for the analytics charts. */
    const budgeting = data.analytics.courses.find((cs) => cs.title === "Budgeting That Actually Works");
    expect(budgeting).toMatchObject({ enrolled: 1, completed: 1, pct: 100 });
    expect(data.analytics.curriculum.length).toBeGreaterThan(0);
    /* Amy is healthy (scores + recent login) — never flagged. Ben has
     * never even logged in: the risk engine leads his issue. */
    expect(data.attention.some((a) => a.email === "amy@swift.test")).toBe(false);
    const ben = data.attention.find((a) => a.email === "ben@swift.test");
    expect(ben).toBeDefined();
    expect(ben!.issue).toBe("Never logged in");
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

  it("serves from the rolling roster without a learner-fetch burst", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    await env.RATE_LIMITS.put(
      "roster:v1",
      JSON.stringify({
        listSyncedAt: Date.now(),
        entries: [
          {
            user: { id: "u1", email: "amy@swift.test", first_name: "Amy", last_name: "Ash", tags: ["Swift Learners"] },
            courses: AMY_COURSES,
            fetchedAt: Date.now(),
          },
          {
            user: { id: "u3", email: "cal@other.test", tags: ["Other College"] },
            courses: [],
            fetchedAt: Date.now(),
          },
        ],
      }),
    );
    const res = await app.request(
      get("/dashboard/data", await cookieFor("swift-code-1")),
      undefined,
      env,
    );
    const data = (await res.json()) as {
      totalUsers: number;
      learners: Array<{ email: string; learning: { completed: number } }>;
    };
    /* Scoped to the tag, learning data straight from the store, and
     * crucially: the burst-prone live sample path (listUsersPage +
     * per-learner course fetches) never ran. The risk engine's own
     * 6-hour-cached build accounts for any background fetches. */
    expect(data.learners.map((l) => l.email)).toEqual(["amy@swift.test"]);
    expect(data.learners[0]!.learning.completed).toBe(1);
    expect(data.totalUsers).toBe(2);
    expect(listUsersMock).not.toHaveBeenCalled();
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
    expect(lines[0]).toContain("Modules completed");
    expect(lines).toHaveLength(3); // header + 2 in-scope learners
    expect(lines[1]).toContain('"amy@swift.test"');
    expect(lines[1]).toContain("72");
    /* Modules enrolled=2, completed=1 straight after the tags column. */
    expect(lines[1]).toMatch(/"Swift Learners",2,1,1,2,/);
    expect(lines.join("\n")).not.toContain("cal@other.test");
  });

  it("rejects without a session", async () => {
    const res = await app.request(get("/dashboard/export.csv"), undefined, makeEnv());
    expect(res.status).toBe(401);
  });
});

describe("GET /dashboard/modules.csv and cohorts.csv", () => {
  it("modules export lists per-module completion for the scope", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    const res = await app.request(
      get("/dashboard/modules.csv", await cookieFor("swift-code-1")),
      undefined,
      env,
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("Module,Curriculum area,Enrolled,Completed,Completion %");
    expect(text).toContain('"Budgeting That Actually Works"');
    expect(text).toMatch(/Budgeting That Actually Works",[^,]*,1,1,100/);
  });

  it("cohorts export rolls up both systems per tag", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    await seedScores(env, "amy@swift.test", { cv: [60, 72], interview: [81] });
    const res = await app.request(
      get("/dashboard/cohorts.csv", await cookieFor("swift-code-1")),
      undefined,
      env,
    );
    expect(res.status).toBe(200);
    const lines = (await res.text()).split("\r\n");
    expect(lines[0]).toContain("Cohort,Learners,Modules enrolled");
    const swift = lines.find((l) => l.includes("Swift Learners"))!;
    /* 2 learners, 2 modules enrolled, 1 completed, 50%, 1 using tools,
     * avg 76, 0 journeys done, 1 never logged in. */
    expect(swift).toBe('"Swift Learners",2,2,1,50,1,76,0,1');
  });

  it("both reject without a session", async () => {
    expect((await app.request(get("/dashboard/modules.csv"), undefined, makeEnv())).status).toBe(401);
    expect((await app.request(get("/dashboard/cohorts.csv"), undefined, makeEnv())).status).toBe(401);
  });
});

describe("GET /dashboard/reflections.csv", () => {
  /** A completed sweep snapshot, as advanceReflections stores it —
   * totalCourses must match the live COURSE_MAP or the state is
   * treated as stale and rebuilt. */
  const REAL_COURSES = Object.values(COURSE_MAP).filter((v) => v !== null).length;
  async function seedReflections(env: Env) {
    await env.RATE_LIMITS.put(
      "portal:reflect:v4",
      JSON.stringify({
        status: "ready",
        responsesEnabled: true,
        cursor: REAL_COURSES,
        totalCourses: REAL_COURSES,
        coverage: [],
        shifts: [],
        flags: [
          {
            email: "amy@swift.test",
            courseTitle: "Money Confidence",
            unitTitle: "Post Completion Feedback",
            question: "How are you feeling?",
            answer: "not great to be honest",
            submittedAt: 1_753_100_000,
            matched: "crisis-language",
          },
        ],
        responses: [
          {
            email: "amy@swift.test",
            courseTitle: "Money Confidence",
            unitTitle: "Initial Self - Reflection",
            kind: "pre",
            submittedAt: 1_753_000_000,
            question: "How confident are you?",
            answer: "=2+3 not very, money stresses me out",
          },
          {
            email: "cal@other.test",
            courseTitle: "Money Confidence",
            unitTitle: "Initial Self - Reflection",
            kind: "pre",
            submittedAt: 1_753_000_000,
            question: "How confident are you?",
            answer: "Fine thanks",
          },
        ],
        userTags: {
          "amy@swift.test": ["Swift Learners"],
          "cal@other.test": ["Other College"],
        },
        preRespondents: ["amy@swift.test", "cal@other.test"],
        postRespondents: [],
        builtAt: new Date().toISOString(),
      }),
    );
  }

  it("exports only in-scope raw answers, formula-injection hardened", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    await seedReflections(env);
    const res = await app.request(
      get("/dashboard/reflections.csv", await cookieFor("swift-code-1")),
      undefined,
      env,
    );
    expect(res.status).toBe(200);
    const text = await res.text();
    const lines = text.split("\r\n");
    expect(lines[0]).toContain("Question,Answer");
    expect(lines).toHaveLength(2); // header + Amy only
    expect(text).toContain("amy@swift.test");
    expect(text).not.toContain("cal@other.test");
    /* The =2+3 answer must arrive neutralised, never as a live formula. */
    expect(text).toContain(`"'=2+3 not very, money stresses me out"`);
  });

  it("rejects without a session", async () => {
    const res = await app.request(get("/dashboard/reflections.csv"), undefined, makeEnv());
    expect(res.status).toBe(401);
  });

  it("wellbeing flags carry a key and acknowledge persistently", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    await seedReflections(env);
    const cookie = await cookieFor("swift-code-1");
    const before = (await (
      await app.request(get("/portal/reflections", cookie), undefined, env)
    ).json()) as { flags: Array<{ key: string; acked: boolean }> };
    expect(before.flags).toHaveLength(1);
    expect(before.flags[0]!.acked).toBe(false);
    const key = before.flags[0]!.key;
    expect(key).toContain("amy@swift.test");

    const ack = await app.request(
      new Request("http://coach.test/portal/reflections/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: cookie },
        body: JSON.stringify({ key }),
      }),
      undefined,
      env,
    );
    expect(((await ack.json()) as { ok: boolean }).ok).toBe(true);

    const after = (await (
      await app.request(get("/portal/reflections", cookie), undefined, env)
    ).json()) as { flags: Array<{ acked: boolean }> };
    expect(after.flags[0]!.acked).toBe(true);
  });

  it("ack refuses unauthenticated and malformed requests", async () => {
    const env = makeEnv();
    await seedCode(env, "swift-code-1", "Swift Training", "Swift Learners");
    const noAuth = await app.request(
      new Request("http://coach.test/portal/reflections/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "a|b|1" }),
      }),
      undefined,
      env,
    );
    expect(noAuth.status).toBe(401);
    const bad = await app.request(
      new Request("http://coach.test/portal/reflections/ack", {
        method: "POST",
        headers: { "Content-Type": "application/json", Cookie: await cookieFor("swift-code-1") },
        body: JSON.stringify({ key: "no-pipes-here" }),
      }),
      undefined,
      env,
    );
    expect(bad.status).toBe(400);
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

  it("returns the learner's own module progress, cached", async () => {
    const env = makeEnv();
    getUserMock.mockResolvedValue({ id: "u1", email: "amy@swift.test" } as never);
    const res = await app.request(hubReq("amy@swift.test"), undefined, env);
    const data = (await res.json()) as {
      ok: boolean;
      learning?: { enrolled: number; completed: number; inProgress: number };
    };
    expect(data.ok).toBe(true);
    expect(data.learning).toEqual({ enrolled: 2, completed: 1, inProgress: 1 });
    /* Second call rides the 10-minute cache — no second progress fetch. */
    await app.request(hubReq("amy@swift.test"), undefined, env);
    expect(coursesMock).toHaveBeenCalledTimes(1);
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
