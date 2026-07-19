/* End-to-end tests of POST /api/pathway (recommendations ONLY — never
 * writes) and POST /api/enrol (one module, learner-confirmed) with
 * only the LearnWorlds client mocked. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, moderate: vi.fn(), coach: vi.fn() };
});
vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return { ...actual, findUserByEmail: vi.fn(), enrolUserInCourse: vi.fn() };
});
vi.mock("../src/lib/course-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/course-map")>();
  return {
    ...actual,
    courseIdFor: (title: string) =>
      ({
        "Money Confidence & Everyday Decisions": "course_mc1",
        "Budgeting that Actually Works": "course_bg1",
      })[title] ?? null,
  };
});

import app, { type Env } from "../src/index";
import { enrolUserInCourse, findUserByEmail } from "../src/lib/learnworlds";

const findMock = vi.mocked(findUserByEmail);
const enrolMock = vi.mocked(enrolUserInCourse);

const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "d".repeat(32);

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

function post(path: string, body: Record<string, unknown>, origin = ORIGIN) {
  return new Request(`http://coach.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify(body),
  });
}

const PATHWAY_BODY = {
  learner_id: GOOD_ID,
  session_id: GOOD_ID,
  stage: "apprenticeship",
  area: "money",
  focus: "day_to_day",
};

const ENROL_BODY = {
  learner_id: GOOD_ID,
  session_id: GOOD_ID,
  email: "learner@example.com",
  title: "Budgeting that Actually Works",
};

beforeEach(() => {
  findMock.mockReset().mockResolvedValue("user_1");
  enrolMock.mockReset().mockResolvedValue({ ok: true, status: 200 });
});

describe("POST /api/pathway (read-only)", () => {
  it("returns the pathway and NEVER touches LearnWorlds", async () => {
    const res = await app.request(post("/api/pathway", PATHWAY_BODY), undefined, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations.map((r: { title: string }) => r.title)).toEqual([
      "Money Confidence & Everyday Decisions",
      "Budgeting that Actually Works",
      "Pay, Payslips, and Planning for Tax & NI",
    ]);
    expect(body.can_enrol).toBe(true);
    expect(findMock).not.toHaveBeenCalled();
    expect(enrolMock).not.toHaveBeenCalled();
  });

  it("reports can_enrol false when LearnWorlds is not configured", async () => {
    const res = await app.request(
      post("/api/pathway", PATHWAY_BODY),
      undefined,
      makeEnv({ LEARNWORLDS_CLIENT_ID: undefined }),
    );
    expect((await res.json()).can_enrol).toBe(false);
  });

  it("rejects out-of-set answers and bad ids", async () => {
    expect(
      (
        await app.request(
          post("/api/pathway", { ...PATHWAY_BODY, focus: "yolo" }),
          undefined,
          makeEnv(),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await app.request(
          post("/api/pathway", { ...PATHWAY_BODY, learner_id: "nope!" }),
          undefined,
          makeEnv(),
        )
      ).status,
    ).toBe(400);
  });
});

describe("POST /api/enrol (one confirmed module)", () => {
  it("enrols exactly the named module", async () => {
    const res = await app.request(post("/api/enrol", ENROL_BODY), undefined, makeEnv());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.title).toBe("Budgeting that Actually Works");
    expect(enrolMock).toHaveBeenCalledTimes(1);
    expect(enrolMock).toHaveBeenCalledWith(
      expect.anything(),
      "user_1",
      "course_bg1",
      expect.stringContaining("Learner-confirmed"),
    );
  });

  it("rejects titles outside the pathway catalogue", async () => {
    const res = await app.request(
      post("/api/enrol", { ...ENROL_BODY, title: "Totally Made Up Course" }),
      undefined,
      makeEnv(),
    );
    expect(res.status).toBe(400);
    expect(enrolMock).not.toHaveBeenCalled();
  });

  it("declines gracefully when the title has no mapped course id", async () => {
    const res = await app.request(
      post("/api/enrol", { ...ENROL_BODY, title: "Managing Stress & Burnout" }),
      undefined,
      makeEnv(),
    );
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("not_mapped");
    expect(enrolMock).not.toHaveBeenCalled();
  });

  it("handles unknown accounts, missing email and missing config", async () => {
    findMock.mockResolvedValue(null);
    let body = await (
      await app.request(post("/api/enrol", ENROL_BODY), undefined, makeEnv())
    ).json();
    expect(body).toMatchObject({ ok: false, reason: "account_not_found" });

    body = await (
      await app.request(
        post("/api/enrol", { ...ENROL_BODY, email: "not-an-email" }),
        undefined,
        makeEnv(),
      )
    ).json();
    expect(body).toMatchObject({ ok: false, reason: "no_email" });

    body = await (
      await app.request(
        post("/api/enrol", ENROL_BODY),
        undefined,
        makeEnv({ LEARNWORLDS_SCHOOL_URL: undefined }),
      )
    ).json();
    expect(body).toMatchObject({ ok: false, reason: "not_configured" });
  });

  it("enforces the daily enrolment cap", async () => {
    const env = makeEnv();
    for (let i = 0; i < 6; i++) {
      const body = await (
        await app.request(post("/api/enrol", ENROL_BODY), undefined, env)
      ).json();
      expect(body.ok).toBe(true);
    }
    const body = await (
      await app.request(post("/api/enrol", ENROL_BODY), undefined, env)
    ).json();
    expect(body).toMatchObject({ ok: false, reason: "daily_cap" });
  });

  it("a LearnWorlds outage degrades to service_error", async () => {
    findMock.mockRejectedValue(new Error("lw down"));
    const body = await (
      await app.request(post("/api/enrol", ENROL_BODY), undefined, makeEnv())
    ).json();
    expect(body).toMatchObject({ ok: false, reason: "service_error" });
  });

  it("a failed enrolment call reports enrol_failed, never a silent success", async () => {
    enrolMock.mockResolvedValue({ ok: false, status: 422 });
    const body = await (
      await app.request(post("/api/enrol", ENROL_BODY), undefined, makeEnv())
    ).json();
    expect(body).toMatchObject({ ok: false, reason: "enrol_failed" });
  });

  it("still gated by origin", async () => {
    expect(
      (
        await app.request(
          post("/api/enrol", ENROL_BODY, "https://evil.example.com"),
          undefined,
          makeEnv(),
        )
      ).status,
    ).toBe(403);
  });
});
