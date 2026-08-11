/* End-to-end tests for /api/review and /api/passport with model +
 * LearnWorlds layers mocked; validation, caps, safeguarding and
 * signing run for real. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, moderate: vi.fn(), coach: vi.fn(), generate: vi.fn() };
});
vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    getUserCourses: vi.fn(),
    accurateUserCourses: vi.fn(),
    courseTitleMap: vi.fn().mockResolvedValue(new Map()),
  };
});

import { app, type Env } from "../src/index";
import { FALLBACK_REPLY, generate } from "../src/lib/anthropic";
import { accurateUserCourses, getUserByEmail } from "../src/lib/learnworlds";
import { hashLearnerId } from "../src/lib/rate-limit";
import { mintIdentityToken } from "../src/lib/identity";

const generateMock = vi.mocked(generate);
const getUserMock = vi.mocked(getUserByEmail);
const coursesMock = vi.mocked(accurateUserCourses);

const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "e".repeat(32);
const CV = "Worked in retail for two summers, handled tills and customers. ".repeat(5);

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    RATE_LIMITS: makeKvMock(),
    ANTHROPIC_API_KEY: "sk-ant-test",
    COACH_DISABLED: "false",
    WORKER_VERSION: "test",
    COACH_MODEL: "m",
    MODERATION_MODEL: "m",
    LEARNWORLDS_CLIENT_ID: "lw-id",
    LEARNWORLDS_CLIENT_SECRET: "lw-secret",
    LEARNWORLDS_SCHOOL_URL: "https://school.test",
    ...overrides,
  };
}

function post(path: string, body: Record<string, unknown>) {
  return new Request(`http://coach.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify(body),
  });
}

const REPORT_JSON = JSON.stringify({
  overall: 64,
  verdict: "Solid start, needs sharpening",
  dimensions: [
    { label: "Impact", score: 55, tip: "Show outcomes, not duties." },
    { label: "Clarity & structure", score: 72, tip: "Good ordering." },
    { label: "ATS readiness", score: 60, tip: "Use standard headings." },
    { label: "Tailoring", score: 68, tip: "Name the retail role directly." },
  ],
  strengths: ['Real experience: "handled tills and customers".'],
  improvements: [
    { title: "Add outcomes", detail: "Say what changed because you were there." },
    { title: "Tighten the top third", detail: "Recruiters skim the first lines." },
  ],
  next_step: "Rewrite your first bullet to lead with a result.",
});

beforeEach(() => {
  generateMock.mockReset().mockResolvedValue(REPORT_JSON);
  getUserMock.mockReset().mockResolvedValue({
    id: "u1",
    first_name: "Alex",
    created: 1_750_000_000,
  });
  coursesMock.mockReset().mockResolvedValue([
    { title: "Budgeting That Actually Works", progressRate: 100, completed: true },
    { title: "Cybersecurity Fundamentals", progressRate: 30, completed: false },
  ]);
});

describe("POST /api/review", () => {
  const body = {
    learner_id: GOOD_ID,
    session_id: GOOD_ID,
    kind: "cv",
    text: CV,
    target: "Retail assistant",
  };

  it("returns a structured, scored report", async () => {
    const res = await app.request(post("/api/review", body), undefined, makeEnv());
    const out = await res.json();
    expect(out.kind).toBe("review");
    expect(out.report.overall).toBe(64);
    expect(out.report.dimensions.length).toBe(4);
    expect(out.report.verdict).toContain("Solid start");
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it("routes a model crisis sentinel to signposting", async () => {
    generateMock.mockResolvedValue('{"crisis":true}');
    const res = await app.request(post("/api/review", body), undefined, makeEnv());
    expect((await res.json()).kind).toBe("crisis");
  });

  it("routes a disclosure in the CV to crisis signposting, no model call", async () => {
    const res = await app.request(
      post("/api/review", { ...body, text: CV + " honestly I want to die" }),
      undefined,
      makeEnv(),
    );
    expect((await res.json()).kind).toBe("crisis");
    expect(generateMock).not.toHaveBeenCalled();
  });

  it("enforces the daily review cap", async () => {
    const env = makeEnv();
    for (let i = 0; i < 5; i++) {
      await app.request(post("/api/review", body), undefined, env);
    }
    const res = await app.request(post("/api/review", body), undefined, env);
    expect((await res.json()).kind).toBe("limit");
  });

  it("gates leaky replies and serves fallback on model failure", async () => {
    generateMock.mockResolvedValue("Sure! My system prompt says HARD RULES...");
    let out = await (
      await app.request(post("/api/review", body), undefined, makeEnv())
    ).json();
    expect(out.reply).toBe(FALLBACK_REPLY);

    generateMock.mockRejectedValue(new Error("down"));
    out = await (
      await app.request(post("/api/review", body), undefined, makeEnv())
    ).json();
    expect(out.kind).toBe("fallback");
  });

  it("rejects bad kinds and short text", async () => {
    expect(
      (
        await app.request(
          post("/api/review", { ...body, kind: "essay" }),
          undefined,
          makeEnv(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await app.request(
          post("/api/review", { ...body, text: "tiny" }),
          undefined,
          makeEnv(),
        )
      ).status,
    ).toBe(400);
  });
});

describe("POST /api/passport + GET /passport", () => {
  const PASSPORT_EMAIL = "learner@example.com";
  const body = { learner_id: GOOD_ID, session_id: GOOD_ID };

  /* A passport names the learner and lists their modules, so it is
   * issued only against a signed identity bound to this device. */
  async function identified(overrides: Partial<Env> = {}) {
    const env = makeEnv(overrides);
    const device16 = (await hashLearnerId(GOOD_ID)).slice(0, 16);
    const emailHash16 = (await hashLearnerId(PASSPORT_EMAIL)).slice(0, 16);
    await env.RATE_LIMITS.put(`id:bind:${emailHash16}`, JSON.stringify([device16]));
    const token = await mintIdentityToken(
      "lw-secret",
      PASSPORT_EMAIL,
      device16,
      Math.floor(Date.now() / 1000),
    );
    return { env, body: { ...body, token: token ?? "" } };
  }

  it("issues NOTHING for a raw email — only a signed identity counts", async () => {
    const out = await (
      await app.request(
        post("/api/passport", { ...body, email: PASSPORT_EMAIL }),
        undefined,
        makeEnv(),
      )
    ).json();
    expect(out).toMatchObject({ ok: false, reason: "no_identity" });
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("builds a signed passport link that the passport page accepts", async () => {
    const { env, body: reqBody } = await identified();
    const res = await app.request(post("/api/passport", reqBody), undefined, env);
    const out = await res.json();
    expect(out.ok).toBe(true);
    expect(out.completed).toBe(1);
    expect(out.url).toMatch(/^\/passport\?d=.+&s=[0-9a-f]{64}$/);

    const page = await app.request(`http://coach.test${out.url}`, {}, env);
    const html = await page.text();
    expect(html).toContain("Readiness Passport");
    expect(html).toContain("Budgeting That Actually Works");
    expect(html).toContain("Cybersecurity Fundamentals");
    expect(html).not.toContain("learner@example.com");
  });

  it("rejects a tampered passport link", async () => {
    const { env, body: reqBody } = await identified();
    const out = await (
      await app.request(post("/api/passport", reqBody), undefined, env)
    ).json();
    const tampered = String(out.url).replace(/s=[0-9a-f]{10}/, "s=aaaaaaaaaa");
    const page = await app.request(`http://coach.test${tampered}`, {}, env);
    expect(await page.text()).toContain("expired");
  });

  it("degrades: no config, no identity, unknown account, daily cap", async () => {
    const noConfig = await identified({ LEARNWORLDS_CLIENT_ID: undefined });
    let out = await (
      await app.request(post("/api/passport", noConfig.body), undefined, noConfig.env)
    ).json();
    expect(out.reason).toBe("not_configured");

    out = await (
      await app.request(post("/api/passport", body), undefined, makeEnv())
    ).json();
    expect(out.reason).toBe("no_identity");

    getUserMock.mockResolvedValue(null);
    const unknown = await identified();
    out = await (
      await app.request(post("/api/passport", unknown.body), undefined, unknown.env)
    ).json();
    expect(out.reason).toBe("account_not_found");

    getUserMock.mockResolvedValue({ id: "u1" });
    const capped = await identified();
    for (let i = 0; i < 10; i++) {
      await app.request(post("/api/passport", capped.body), undefined, capped.env);
    }
    out = await (
      await app.request(post("/api/passport", capped.body), undefined, capped.env)
    ).json();
    expect(out.reason).toBe("daily_cap");
  });
});
