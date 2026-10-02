/* When the model's answer cannot be used.
 *
 * Every tool wants strict JSON back and nearly always gets it. In the
 * October 2026 QA one cover letter in seven came back unusable, and one
 * set of interview questions in five: each miss cost the learner a
 * daily go and showed them the chat coach's "having trouble thinking"
 * reply, helpline numbers included, for what was a formatting slip.
 *
 * These pin what happens now: the tool asks once more, the second
 * answer is served if it is good, a go is never spent twice, the retry
 * cannot outrun the spend ceiling, and what a learner reads on a real
 * failure is about the tool - not a signpost to a crisis line. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, generate: vi.fn(), moderate: vi.fn(), coach: vi.fn() };
});

import { app, type Env } from "../src/index";
import { FALLBACK_REPLY, generate } from "../src/lib/anthropic";
import { hashLearnerId } from "../src/lib/rate-limit";

const generateMock = vi.mocked(generate);

const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "f".repeat(32);
const DAY = new Date().toISOString().slice(0, 10);
const HELPLINES = /116 123|0800 1111|85258|Samaritans|Childline/;

const ADVERT =
  "Customer Service Apprentice, Leeds branch. You will greet customers, handle cash and card " +
  "payments, answer account questions and support the team with daily admin. Level 2, 18 months.";
const CV =
  "IMOGEN HART\n07700 900123 | imogen@example.com\n\nCareer History\n" +
  "Weekend Team Member, Garden Centre - Sept 24 - present\n" +
  "Served 200+ customers a shift on tills and the plant desk\n" +
  "Trained two new starters on the till system\n\nEducation\n" +
  "Leeds City College - BTEC Business\n\nSkills\nTills, rotas, spreadsheets";

const LETTER = JSON.stringify({
  greeting: "Dear [Hiring manager's name],",
  paragraphs: [
    "I would like to be considered for the Customer Service Apprentice role at your Leeds branch.",
    "At the garden centre I served 200+ customers a shift on tills and the plant desk.",
    "[One sentence on why this employer.] I would welcome the chance to talk it through.",
  ],
  signoff: "Yours sincerely,",
  personalise: ["[Hiring manager's name] - ring the branch and ask"],
  tips: ["Read it out loud once before you send it."],
});
const QUESTIONS = JSON.stringify({
  role_label: "Customer Service Apprentice",
  questions: [
    "Tell me a bit about yourself and what drew you to this apprenticeship.",
    "This role involves handling cash and card payments. Tell me about a time you had to be accurate.",
    "A customer is confused about a charge on their account. What do you do?",
    "How would you fit study around an eighteen-month apprenticeship?",
    "What would you want to have learnt by the end of your first three months?",
  ],
});
const PROSE = "Of course! Here is the cover letter you asked for, written out in full below.";

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

async function slot(env: Env, prefix: string): Promise<number> {
  const key = `${prefix}:day:${await hashLearnerId(GOOD_ID)}:${DAY}`;
  return parseInt((await env.RATE_LIMITS.get(key)) || "0", 10) || 0;
}

async function coverLetter(env: Env) {
  const res = await app.request(
    post("/api/cover-letter", { learner_id: GOOD_ID, session_id: GOOD_ID, jd: ADVERT, cv_text: CV }),
    undefined,
    env,
  );
  return (await res.json()) as { kind: string; reply?: string; draft?: { greeting: string } };
}

async function questions(env: Env) {
  const res = await app.request(
    post("/api/interview-questions", { learner_id: GOOD_ID, mode: "jd", jd: ADVERT }),
    undefined,
    env,
  );
  return (await res.json()) as { kind: string; reply?: string; questions?: string[] };
}

beforeEach(() => {
  generateMock.mockReset();
});

describe("an unusable answer is asked for once more", () => {
  it("serves the second answer when the first was prose", async () => {
    generateMock.mockResolvedValueOnce(PROSE).mockResolvedValueOnce(LETTER);
    const env = makeEnv();
    const body = await coverLetter(env);
    expect(body.kind).toBe("cover-letter");
    expect(body.draft?.greeting).toContain("Dear");
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it("spends the learner's go once, however many times it asked", async () => {
    generateMock.mockResolvedValueOnce(PROSE).mockResolvedValueOnce(LETTER);
    const env = makeEnv();
    await coverLetter(env);
    expect(await slot(env, "cl")).toBe(1);
  });

  it("asks a first-time-right answer only once", async () => {
    generateMock.mockResolvedValue(LETTER);
    const env = makeEnv();
    await coverLetter(env);
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it("also rescues a set of interview questions", async () => {
    generateMock.mockResolvedValueOnce("{not json").mockResolvedValueOnce(QUESTIONS);
    const body = await questions(makeEnv());
    expect(body.kind).toBe("questions");
    expect(body.questions).toHaveLength(5);
  });
});

describe("two unusable answers", () => {
  it("stops at two calls - the abuse guard still holds", async () => {
    generateMock.mockResolvedValue(PROSE);
    const env = makeEnv();
    const body = await coverLetter(env);
    expect(body.kind).toBe("fallback");
    expect(generateMock).toHaveBeenCalledTimes(2);
    /* still spent: an input built to make the model answer in prose
     * must not earn unlimited free calls */
    expect(await slot(env, "cl")).toBe(1);
  });

  it("tells the learner about the tool, not about a crisis line", async () => {
    generateMock.mockResolvedValue(PROSE);
    for (const body of [await coverLetter(makeEnv()), await questions(makeEnv())]) {
      expect(body.reply).toBeTruthy();
      expect(body.reply).not.toBe(FALLBACK_REPLY);
      expect(body.reply).not.toMatch(HELPLINES);
    }
  });

  it("is honest that the go was used", async () => {
    generateMock.mockResolvedValue(PROSE);
    const body = await coverLetter(makeEnv());
    expect(body.reply).toMatch(/used one of today's goes/);
    expect(body.reply).not.toMatch(/nothing has been used/);
  });
});

describe("the second attempt answers to the same spend ceiling", () => {
  it("is not made when the daily model ceiling has been reached", async () => {
    generateMock.mockResolvedValue(PROSE);
    const env = makeEnv();
    /* a ceiling of one call: the first attempt takes it */
    await env.RATE_LIMITS.put("ops:model-daily-cap", "1");
    const body = await coverLetter(env);
    expect(body.kind).toBe("fallback");
    expect(generateMock).toHaveBeenCalledTimes(1);
  });
});

describe("a call that throws is still a different thing", () => {
  it("is not retried here, and the go comes back", async () => {
    generateMock.mockRejectedValue({ status: 529, message: "overloaded" });
    const env = makeEnv();
    const body = await coverLetter(env);
    expect(body.kind).toBe("busy");
    expect(generateMock).toHaveBeenCalledTimes(1);
    expect(await slot(env, "cl")).toBe(0);
    expect(body.reply).toMatch(/nothing has been used/i);
  });
});

describe("the kill switch, on a tool", () => {
  it("says reviews are paused and nothing was used - no helplines, no model call", async () => {
    const env = { ...makeEnv(), COACH_DISABLED: "true" } as Env;
    const body = await coverLetter(env);
    expect(generateMock).not.toHaveBeenCalled();
    expect(body.reply).toMatch(/nothing has been used/i);
    expect(body.reply).not.toMatch(HELPLINES);
    expect(await slot(env, "cl")).toBe(0);
  });
});
