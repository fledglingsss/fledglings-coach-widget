/* School-account sign-in: the one flow that can PROVE a learner owns
 * an address, closing the first-claim residual in docs/IDENTITY.md.
 *
 * The trust chain being pinned here: the code shown to a device is
 * only honoured when it comes back through the school's own record of
 * who submitted it (read server-to-server), the mint is bound to the
 * device that asked, and a verified sign-in evicts any device that had
 * merely claimed the address first. Every test asserts the
 * learner-visible outcome of that chain, not the implementation. */
import { describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return {
    ...actual,
    listCourses: vi.fn(),
    getCourseContents: vi.fn(),
    getAssessmentResponses: vi.fn(),
  };
});

import { app, type Env } from "../src/index";
import {
  getAssessmentResponses,
  getCourseContents,
  listCourses,
} from "../src/lib/learnworlds";
import {
  parseBindingRecord,
  parseBindings,
  serialiseBindingRecord,
  verifiedRebind,
} from "../src/lib/identity";
import { matchSsoResponse, normaliseSsoAnswer } from "../src/lib/sso";
import { hashLearnerId } from "../src/lib/rate-limit";

const coursesMock = vi.mocked(listCourses);
const contentsMock = vi.mocked(getCourseContents);
const responsesMock = vi.mocked(getAssessmentResponses);

const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "d".repeat(32);
const OTHER_ID = "e".repeat(32);

function makeEnv(): Env {
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
  } as Env;
}

function post(path: string, body: Record<string, unknown>) {
  return new Request(`http://coach.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGIN },
    body: JSON.stringify(body),
  });
}

function schoolHasSignInCourse(): void {
  coursesMock.mockResolvedValue([
    { id: "other-course", title: "Budgeting that Actually Works" },
    { id: "hub-sign-in", title: "Hub sign-in" },
  ]);
  contentsMock.mockResolvedValue([
    { id: "unit-video", title: "Welcome", type: "video" },
    { id: "unit-code", title: "Sign-in code", type: "assessmentV2" },
  ]);
}

function submittedRow(email: string, answer: string, at?: number) {
  return {
    user_id: "u1",
    email,
    submittedTimestamp: at ?? Math.floor(Date.now() / 1000),
    answers: [{ description: "Type your sign-in code", answer }],
  };
}

/* ---------------- binding records ---------------- */

describe("binding records carry a verified flag without migration", () => {
  it("reads the legacy bare-array format as unverified", () => {
    const record = parseBindingRecord(JSON.stringify(["a".repeat(16)]));
    expect(record.devices).toEqual(["a".repeat(16)]);
    expect(record.verified).toBe(false);
  });

  it("round-trips the new format", () => {
    const raw = serialiseBindingRecord({ devices: ["b".repeat(16)], verified: true });
    const record = parseBindingRecord(raw);
    expect(record.devices).toEqual(["b".repeat(16)]);
    expect(record.verified).toBe(true);
  });

  it("parseBindings still returns devices from BOTH formats", () => {
    /* emailFromToken checks bindings on every call through
     * parseBindings — if it returned [] for the new format, every
     * verified learner's token would stop working. */
    expect(parseBindings(JSON.stringify(["c".repeat(16)]))).toEqual(["c".repeat(16)]);
    expect(
      parseBindings(serialiseBindingRecord({ devices: ["c".repeat(16)], verified: true })),
    ).toEqual(["c".repeat(16)]);
  });

  it("a verified rebind is exactly the proven device", () => {
    const record = verifiedRebind("f".repeat(16));
    expect(record).toEqual({ devices: ["f".repeat(16)], verified: true });
  });

  it("garbage parses to an empty unverified record", () => {
    expect(parseBindingRecord("not json")).toEqual({ devices: [], verified: false });
    expect(parseBindingRecord(JSON.stringify({ d: "nope", v: "yes" }))).toEqual({
      devices: [],
      verified: false,
    });
  });
});

/* ---------------- answer matching ---------------- */

describe("matching the submitted code", () => {
  it("accepts however the learner typed it", () => {
    for (const typed of ["ABC234", "abc-234", "abc 234", " a b c 2 3 4 "]) {
      expect(normaliseSsoAnswer(typed)).toBe("ABC234");
    }
  });

  it("finds the row and returns the school's email for it", () => {
    const rows = [
      submittedRow("someone@else.com", "XYZ789"),
      submittedRow("learner@example.com", "abc-234"),
    ];
    const match = matchSsoResponse(rows, "ABC234", Math.floor(Date.now() / 1000));
    expect(match?.email).toBe("learner@example.com");
  });

  it("ignores a stale submission of the same code", () => {
    const now = Math.floor(Date.now() / 1000);
    const rows = [submittedRow("learner@example.com", "ABC234", now - 3600)];
    expect(matchSsoResponse(rows, "ABC234", now)).toBeNull();
  });

  it("never matches a short or empty code", () => {
    const rows = [submittedRow("learner@example.com", "AB")];
    expect(matchSsoResponse(rows, "AB", Math.floor(Date.now() / 1000))).toBeNull();
    expect(matchSsoResponse(rows, "", Math.floor(Date.now() / 1000))).toBeNull();
  });
});

/* ---------------- the routes ---------------- */

async function startSignIn(env: Env, learnerId = GOOD_ID) {
  const res = await app.request(
    post("/api/sso/start", { learner_id: learnerId }),
    undefined,
    env,
  );
  return (await res.json()) as {
    ok: boolean;
    code?: string;
    course_url?: string;
    reason?: string;
  };
}

describe("POST /api/sso/start", () => {
  it("says honestly when the sign-in course does not exist yet", async () => {
    coursesMock.mockResolvedValue([{ id: "x", title: "Some Other Course" }]);
    const body = await startSignIn(makeEnv());
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("not_set_up");
  });

  it("hands out a code and the school course link when it does", async () => {
    schoolHasSignInCourse();
    const body = await startSignIn(makeEnv());
    expect(body.ok).toBe(true);
    expect(body.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(body.course_url).toBe("https://school.test/course/hub-sign-in");
  });
});

describe("POST /api/sso/check", () => {
  it("stays pending until the school shows a submission", async () => {
    schoolHasSignInCourse();
    responsesMock.mockResolvedValue({ rows: [], totalPages: 1 });
    const env = makeEnv();
    const started = await startSignIn(env);
    const res = await app.request(
      post("/api/sso/check", { learner_id: GOOD_ID, code: started.code }),
      undefined,
      env,
    );
    const body = (await res.json()) as { ok: boolean; pending?: boolean };
    expect(body).toEqual({ ok: true, pending: true });
  });

  it("mints a device-bound token once the school attributes the code", async () => {
    schoolHasSignInCourse();
    const env = makeEnv();
    const started = await startSignIn(env);
    responsesMock.mockResolvedValue({
      rows: [submittedRow("learner@example.com", started.code!)],
      totalPages: 1,
    });
    const res = await app.request(
      post("/api/sso/check", { learner_id: GOOD_ID, code: started.code }),
      undefined,
      env,
    );
    const body = (await res.json()) as { ok: boolean; token?: string; email?: string };
    expect(body.ok).toBe(true);
    expect(body.email).toBe("learner@example.com");
    expect(typeof body.token).toBe("string");
    /* The binding is now verified and exactly this device. */
    const emailHash16 = (await hashLearnerId("learner@example.com")).slice(0, 16);
    const record = parseBindingRecord(
      await env.RATE_LIMITS.get(`id:bind:${emailHash16}`),
    );
    expect(record.verified).toBe(true);
    expect(record.devices).toEqual([(await hashLearnerId(GOOD_ID)).slice(0, 16)]);
  });

  it("evicts a device that had merely claimed the address first", async () => {
    schoolHasSignInCourse();
    const env = makeEnv();
    const emailHash16 = (await hashLearnerId("learner@example.com")).slice(0, 16);
    const squatter = (await hashLearnerId(OTHER_ID)).slice(0, 16);
    await env.RATE_LIMITS.put(`id:bind:${emailHash16}`, JSON.stringify([squatter]));
    const started = await startSignIn(env);
    responsesMock.mockResolvedValue({
      rows: [submittedRow("learner@example.com", started.code!)],
      totalPages: 1,
    });
    await app.request(
      post("/api/sso/check", { learner_id: GOOD_ID, code: started.code }),
      undefined,
      env,
    );
    const record = parseBindingRecord(
      await env.RATE_LIMITS.get(`id:bind:${emailHash16}`),
    );
    expect(record.devices).not.toContain(squatter);
    expect(record.verified).toBe(true);
  });

  it("gives another device polling the same code nothing", async () => {
    schoolHasSignInCourse();
    const env = makeEnv();
    const started = await startSignIn(env);
    responsesMock.mockResolvedValue({
      rows: [submittedRow("learner@example.com", started.code!)],
      totalPages: 1,
    });
    const res = await app.request(
      post("/api/sso/check", { learner_id: OTHER_ID, code: started.code }),
      undefined,
      env,
    );
    const body = (await res.json()) as { ok: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("expired");
  });

  it("answers unknown and missing codes identically", async () => {
    schoolHasSignInCourse();
    const env = makeEnv();
    const res = await app.request(
      post("/api/sso/check", { learner_id: GOOD_ID, code: "ABC234" }),
      undefined,
      env,
    );
    const body = (await res.json()) as { ok: boolean; reason?: string };
    expect(body).toEqual({ ok: false, reason: "expired" });
  });
});
