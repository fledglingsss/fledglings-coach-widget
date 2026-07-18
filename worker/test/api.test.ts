/* End-to-end tests of the /api/coach pipeline via Hono's app.request,
 * with ONLY the model layer mocked. Everything else — CORS, origin
 * allowlist, validation, kill switch, rate limits, crisis heuristic,
 * output gate, fallbacks — runs for real. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, moderate: vi.fn(), coach: vi.fn() };
});

import app, { type Env } from "../src/index";
import {
  BLOCKED_REPLY,
  CRISIS_REPLY,
  FALLBACK_REPLY,
  LIMIT_REPLY,
  coach,
  moderate,
} from "../src/lib/anthropic";

const moderateMock = vi.mocked(moderate);
const coachMock = vi.mocked(coach);

const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "b".repeat(32);

function makeEnv(overrides: Partial<Env> = {}): Env {
  return {
    RATE_LIMITS: makeKvMock(),
    ANTHROPIC_API_KEY: "sk-ant-test",
    COACH_DISABLED: "false",
    WORKER_VERSION: "test",
    COACH_MODEL: "claude-sonnet-4-6",
    MODERATION_MODEL: "claude-haiku-4-5",
    ...overrides,
  };
}

function coachPost(body: unknown, origin: string | null = ORIGIN) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (origin) headers.Origin = origin;
  return new Request("http://coach.test/api/coach", {
    method: "POST",
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function goodBody(message = "how do I read a payslip?") {
  return {
    learner_id: GOOD_ID,
    session_id: GOOD_ID,
    learner_name: "Alex",
    page: "Money Basics",
    messages: [{ role: "user", content: message }],
  };
}

beforeEach(() => {
  moderateMock.mockReset();
  coachMock.mockReset();
  moderateMock.mockResolvedValue("ALLOW");
  coachMock.mockResolvedValue("A payslip shows gross pay, deductions and net pay.");
});

describe("service endpoints", () => {
  it("GET /health reports version and configuration", async () => {
    const res = await app.request("/health", {}, makeEnv());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      version: "test",
      coach_disabled: false,
      api_key_configured: true,
    });
  });

  it("GET /widget.js serves JavaScript with nosniff", async () => {
    const res = await app.request("/widget.js", {}, makeEnv());
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("javascript");
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect((await res.text()).length).toBeGreaterThan(1000);
  });
});

describe("request gating", () => {
  it("rejects a missing or foreign Origin with 403", async () => {
    const noOrigin = await app.request(coachPost(goodBody(), null), undefined, makeEnv());
    expect(noOrigin.status).toBe(403);
    const badOrigin = await app.request(
      coachPost(goodBody(), "https://evil.example.com"),
      undefined,
      makeEnv(),
    );
    expect(badOrigin.status).toBe(403);
    expect(moderateMock).not.toHaveBeenCalled();
  });

  it("rejects invalid JSON with 400", async () => {
    const res = await app.request(coachPost("{not json"), undefined, makeEnv());
    expect(res.status).toBe(400);
  });

  it("rejects malformed requests with 400 and a reason", async () => {
    const res = await app.request(
      coachPost({ ...goodBody(), learner_id: "nope!" }),
      undefined,
      makeEnv(),
    );
    expect(res.status).toBe(400);
    expect((await res.json()).detail).toBe("bad_learner_id");
  });

  it("rejects oversized bodies with 413", async () => {
    const res = await app.request(
      coachPost(goodBody("x".repeat(40_000))),
      undefined,
      makeEnv(),
    );
    expect(res.status).toBe(413);
    expect(moderateMock).not.toHaveBeenCalled();
  });
});

describe("pipeline ordering and outcomes", () => {
  it("kill switch serves the fallback with no model calls", async () => {
    const res = await app.request(
      coachPost(goodBody()),
      undefined,
      makeEnv({ COACH_DISABLED: "true" }),
    );
    const body = await res.json();
    expect(body.kind).toBe("fallback");
    expect(body.reply).toBe(FALLBACK_REPLY);
    expect(moderateMock).not.toHaveBeenCalled();
    expect(coachMock).not.toHaveBeenCalled();
  });

  it("crisis heuristic answers with NO model call at all", async () => {
    const res = await app.request(
      coachPost(goodBody("honestly I just want to die")),
      undefined,
      makeEnv(),
    );
    const body = await res.json();
    expect(body.kind).toBe("crisis");
    expect(body.reply).toBe(CRISIS_REPLY);
    expect(moderateMock).not.toHaveBeenCalled();
    expect(coachMock).not.toHaveBeenCalled();
  });

  it("classifier CRISIS routes to the crisis reply", async () => {
    moderateMock.mockResolvedValue("CRISIS");
    const res = await app.request(coachPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.kind).toBe("crisis");
    expect(coachMock).not.toHaveBeenCalled();
  });

  it("classifier BLOCK routes to the redirect reply", async () => {
    moderateMock.mockResolvedValue("BLOCK");
    const res = await app.request(coachPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.kind).toBe("blocked");
    expect(body.reply).toBe(BLOCKED_REPLY);
    expect(coachMock).not.toHaveBeenCalled();
  });

  it("classifier failure serves the fallback, never an unscreened reply", async () => {
    moderateMock.mockRejectedValue(new Error("haiku down"));
    const res = await app.request(coachPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.kind).toBe("fallback");
    expect(coachMock).not.toHaveBeenCalled();
  });

  it("a clean message gets a coached reply", async () => {
    const res = await app.request(coachPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.kind).toBe("coach");
    expect(body.reply).toContain("payslip");
    expect(body.remaining_day).toBeGreaterThan(0);
    expect(moderateMock).toHaveBeenCalledTimes(1);
    expect(coachMock).toHaveBeenCalledTimes(1);
  });

  it("a prompt-leaking reply is gated and replaced with the fallback", async () => {
    coachMock.mockResolvedValue(
      "Of course! My system prompt says: HARD RULES...",
    );
    const res = await app.request(coachPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.kind).toBe("fallback");
  });

  it("coach failure serves the fallback", async () => {
    coachMock.mockRejectedValue(new Error("sonnet down"));
    const res = await app.request(coachPost(goodBody()), undefined, makeEnv());
    const body = await res.json();
    expect(body.kind).toBe("fallback");
    expect(body.reply).toBe(FALLBACK_REPLY);
  });

  it("rate limit fires before any model call", async () => {
    const env = makeEnv();
    for (let i = 0; i < 20; i++) {
      await app.request(coachPost(goodBody()), undefined, env);
    }
    moderateMock.mockClear();
    coachMock.mockClear();
    const res = await app.request(coachPost(goodBody()), undefined, env);
    const body = await res.json();
    expect(body.kind).toBe("limit");
    expect(body.reply).toBe(LIMIT_REPLY);
    expect(moderateMock).not.toHaveBeenCalled();
    expect(coachMock).not.toHaveBeenCalled();
  });
});
