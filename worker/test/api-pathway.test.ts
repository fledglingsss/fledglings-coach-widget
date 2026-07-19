/* End-to-end tests of POST /api/pathway with ONLY the LearnWorlds
 * client mocked. Validation, caps, mapping, and degradation run for
 * real. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, moderate: vi.fn(), coach: vi.fn() };
});
vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return {
    ...actual,
    findUserByEmail: vi.fn(),
    addUserTags: vi.fn(),
    enrolUserInCourse: vi.fn(),
  };
});
vi.mock("../src/lib/course-map", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/course-map")>();
  return {
    ...actual,
    /* Pretend two money modules are mapped; everything else is not. */
    courseIdFor: (title: string) =>
      ({
        "Money Confidence & Everyday Decisions": "course_mc1",
        "Budgeting that Actually Works": "course_bg1",
      })[title] ?? null,
  };
});

import app, { type Env } from "../src/index";
import {
  addUserTags,
  enrolUserInCourse,
  findUserByEmail,
} from "../src/lib/learnworlds";

const findMock = vi.mocked(findUserByEmail);
const tagMock = vi.mocked(addUserTags);
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

function pathwayPost(body: Record<string, unknown>) {
  return new Request("http://coach.test/api/pathway", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify(body),
  });
}

function goodBody(overrides: Record<string, unknown> = {}) {
  return {
    learner_id: GOOD_ID,
    session_id: GOOD_ID,
    email: "learner@example.com",
    stage: "apprenticeship",
    area: "money",
    focus: "day_to_day",
    enrol: true,
    ...overrides,
  };
}

beforeEach(() => {
  findMock.mockReset().mockResolvedValue("user_1");
  tagMock.mockReset().mockResolvedValue(true);
  enrolMock.mockReset().mockResolvedValue({ ok: true, status: 200 });
});

describe("POST /api/pathway", () => {
  it("returns the pathway and enrols mapped courses, skipping unmapped", async () => {
    const res = await app.request(pathwayPost(goodBody()), undefined, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.recommendations.map((r: { title: string }) => r.title)).toEqual([
      "Money Confidence & Everyday Decisions",
      "Budgeting that Actually Works",
      "Pay, Payslips, and Planning for Tax & NI",
    ]);
    expect(body.enrolment.enrolled).toEqual([
      "Money Confidence & Everyday Decisions",
      "Budgeting that Actually Works",
    ]);
    expect(body.enrolment.skipped).toEqual(["Pay, Payslips, and Planning for Tax & NI"]);
    expect(tagMock).toHaveBeenCalledWith(expect.anything(), "user_1", [
      "fledge-pathway",
      "pathway-money",
    ]);
    expect(enrolMock).toHaveBeenCalledTimes(2);
  });

  it("degrades to recommendations-only when LearnWorlds is not configured", async () => {
    const res = await app.request(
      pathwayPost(goodBody()),
      undefined,
      makeEnv({ LEARNWORLDS_CLIENT_ID: undefined }),
    );
    const body = await res.json();
    expect(body.recommendations.length).toBe(3);
    expect(body.enrolment).toEqual({ attempted: false, reason: "not_configured" });
    expect(findMock).not.toHaveBeenCalled();
  });

  it("handles an unknown account gracefully", async () => {
    findMock.mockResolvedValue(null);
    const res = await app.request(pathwayPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.enrolment).toEqual({ attempted: true, reason: "account_not_found" });
    expect(enrolMock).not.toHaveBeenCalled();
  });

  it("recommends without enrolling when no email is available", async () => {
    const res = await app.request(
      pathwayPost(goodBody({ email: undefined })),
      undefined,
      makeEnv(),
    );
    const body = await res.json();
    expect(body.enrolment.reason).toBe("no_email");
    expect(findMock).not.toHaveBeenCalled();
  });

  it("rejects out-of-set answers and bad ids", async () => {
    expect(
      (await app.request(pathwayPost(goodBody({ focus: "yolo" })), undefined, makeEnv()))
        .status,
    ).toBe(400);
    expect(
      (
        await app.request(
          pathwayPost(goodBody({ learner_id: "nope!" })),
          undefined,
          makeEnv(),
        )
      ).status,
    ).toBe(400);
  });

  it("enforces the daily action cap", async () => {
    const env = makeEnv();
    for (let i = 0; i < 3; i++) {
      const res = await app.request(pathwayPost(goodBody()), undefined, env);
      expect((await res.json()).enrolment.enrolled).toBeDefined();
    }
    const res = await app.request(pathwayPost(goodBody()), undefined, env);
    expect((await res.json()).enrolment).toEqual({
      attempted: false,
      reason: "daily_cap",
    });
  });

  it("a LearnWorlds outage degrades to service_error, recommendations intact", async () => {
    findMock.mockRejectedValue(new Error("lw down"));
    const res = await app.request(pathwayPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.recommendations.length).toBe(3);
    expect(body.enrolment).toEqual({ attempted: true, reason: "service_error" });
  });

  it("tagging failure never blocks enrolment", async () => {
    tagMock.mockRejectedValue(new Error("tags endpoint moved"));
    const res = await app.request(pathwayPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.enrolment.enrolled.length).toBe(2);
  });

  it("still gated by origin", async () => {
    const req = new Request("http://coach.test/api/pathway", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example.com" },
      body: JSON.stringify(goodBody()),
    });
    expect((await app.request(req, undefined, makeEnv())).status).toBe(403);
  });
});
