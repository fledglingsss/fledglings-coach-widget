/* A model call that fails must not cost the learner their day.
 *
 * Every tool spends the learner's daily slot before calling the model,
 * so an input crafted to produce unparseable output cannot burn
 * unlimited calls. The unintended cost was that an outage upstream
 * spent every learner's slots on fallbacks and left them locked out
 * after the model recovered. These tests pin the line: a call that
 * THREW gives the slot back; a call that returned rubbish still counts.
 *
 * They also pin the register of what a learner reads. Tool failures
 * used to reuse the chat coach's replies, helplines and all — the
 * wrong note for "your review timed out". */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, generate: vi.fn(), moderate: vi.fn(), coach: vi.fn() };
});

import { app, type Env } from "../src/index";
import { generate } from "../src/lib/anthropic";
import { hashLearnerId } from "../src/lib/rate-limit";

const generateMock = vi.mocked(generate);

const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "d".repeat(32);
const DAY = new Date().toISOString().slice(0, 10);

const CV =
  "IMOGEN HART\n07700 900123 | imogen@example.com\n\nCareer History\n" +
  "Weekend Team Member, Garden Centre - Sept 24 - present\n" +
  "Served 200+ customers a shift on tills and the plant desk\n" +
  "Trained two new starters on the till system\n\nEducation\n" +
  "Leeds City College - BTEC Business\n\nSkills\nTills, rotas, spreadsheets";

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

async function reviewSlot(env: Env): Promise<number> {
  const key = `rv:day:${await hashLearnerId(GOOD_ID)}:${DAY}`;
  return parseInt((await env.RATE_LIMITS.get(key)) || "0", 10) || 0;
}

async function review(env: Env) {
  const res = await app.request(
    post("/api/review", { learner_id: GOOD_ID, session_id: GOOD_ID, kind: "cv", text: CV }),
    undefined,
    env,
  );
  return (await res.json()) as { kind: string; reply?: string };
}

const HELPLINES = /116 123|0800 1111|85258|Samaritans|Childline/;

beforeEach(() => {
  generateMock.mockReset();
});

describe("a model call that throws gives the slot back", () => {
  it("busy upstream: slot refunded, learner told nothing was used", async () => {
    generateMock.mockRejectedValue({ status: 429, message: "rate limit" });
    const env = makeEnv();
    const body = await review(env);
    expect(body.kind).toBe("busy");
    expect(await reviewSlot(env)).toBe(0);
    expect(body.reply).toMatch(/nothing has been used/i);
    expect(body.reply).not.toMatch(HELPLINES);
  });

  it("credits exhausted: slot refunded, honest pause message", async () => {
    generateMock.mockRejectedValue({ status: 402, message: "credit balance too low" });
    const env = makeEnv();
    const body = await review(env);
    expect(body.kind).toBe("unavailable");
    expect(await reviewSlot(env)).toBe(0);
    expect(body.reply).not.toMatch(HELPLINES);
  });

  it("timeout or network: slot refunded", async () => {
    generateMock.mockRejectedValue(new Error("socket hang up"));
    const env = makeEnv();
    const body = await review(env);
    expect(body.kind).toBe("fallback");
    expect(await reviewSlot(env)).toBe(0);
    expect(body.reply).not.toMatch(HELPLINES);
  });

  it("the refund covers other tools too", async () => {
    generateMock.mockRejectedValue({ status: 529, message: "overloaded" });
    const env = makeEnv();
    const res = await app.request(
      post("/api/improve-line", {
        learner_id: GOOD_ID,
        line: "Responsible for restocking shelves every weekend",
      }),
      undefined,
      env,
    );
    const body = (await res.json()) as { kind: string };
    expect(body.kind).toBe("busy");
    const key = `il:day:${await hashLearnerId(GOOD_ID)}:${DAY}`;
    expect(parseInt((await env.RATE_LIMITS.get(key)) || "0", 10) || 0).toBe(0);
  });
});

describe("a model call that returned rubbish still counts", () => {
  /* This is the abuse guard: an input crafted to make the model answer
   * in prose instead of JSON must not get unlimited free calls. */
  it("unparseable output spends the slot", async () => {
    generateMock.mockResolvedValue("Here is a poem about your CV instead of JSON.");
    const env = makeEnv();
    const body = await review(env);
    expect(body.kind).toBe("fallback");
    expect(await reviewSlot(env)).toBe(1);
  });
});

describe("the chat coach keeps its own register", () => {
  it("chat failures still carry the support lines", async () => {
    const { FALLBACK_REPLY, BUSY_REPLY } = await import("../src/lib/anthropic");
    expect(FALLBACK_REPLY).toMatch(HELPLINES);
    expect(BUSY_REPLY).not.toMatch(/allowance/);
  });
});
