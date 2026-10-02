/* The Share button on the Skills Passport.
 *
 * On 11 August 2026 the worker stopped minting passport links for a
 * bare email address: only a signed identity bound to the device counts
 * (see "issues NOTHING for a raw email" in api-tools.test.ts). The one
 * caller of that route, this button, went on posting the bare address.
 * Every learner who pressed Share for the next seven weeks was told
 * "Could not create your share link - please try again", and trying
 * again could never help.
 *
 * The rule was right and stays. The button now does what every other
 * tool does: it gets a token for this device under the ordinary
 * first-claim rules and sends that. These tests pin both halves - what
 * the page sends, and that what it sends is accepted. */
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
import { accurateUserCourses, getUserByEmail } from "../src/lib/learnworlds";
import { computeSkillsPassport } from "../src/lib/skills-passport";
import { renderSkillsPassport } from "../src/pages-skills";

const getUserMock = vi.mocked(getUserByEmail);
const coursesMock = vi.mocked(accurateUserCourses);

const ORIGIN = "https://www.fledglings.co";
const DEVICE = "a".repeat(32);
const OTHER_DEVICE = "b".repeat(32);
const EMAIL = "learner@example.com";

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

function passportPage(shareEmail: string | null): string {
  const model = computeSkillsPassport({
    firstName: "Alex",
    fullName: "Alex Smith",
    cohort: "Cohort 24B",
    courses: [],
    streak: { cur: 1, best: 1, last: "2026-10-01" },
    rank: null,
    cohortSize: null,
    now: new Date("2026-10-02T09:00:00Z"),
  });
  return renderSkillsPassport(model, { demo: shareEmail === null, shareEmail });
}

beforeEach(() => {
  getUserMock.mockReset().mockResolvedValue({ id: "u1", first_name: "Alex", created: 1_750_000_000 });
  coursesMock.mockReset().mockResolvedValue([
    { title: "Budgeting That Actually Works", progressRate: 100, completed: true },
  ]);
});

describe("what the Share button sends", () => {
  const html = passportPage(EMAIL);
  /* the one request that asks for the link */
  const call = html.slice(html.indexOf("fetch('/api/passport'"), html.indexOf("fetch('/api/passport'") + 320);

  it("asks for the link with a token", () => {
    expect(call).toContain("token:tok");
  });

  it("never sends the bare address to the passport route", () => {
    expect(call).not.toMatch(/email:/);
  });

  it("gets that token from the identity route, the same way every other tool does", () => {
    expect(html).toContain("fetch('/api/identity'");
    expect(html).toContain("localStorage.getItem('fl_hub_token_v1')");
  });

  it("tells a learner it cannot sign in what to do, instead of 'try again'", () => {
    expect(html).toContain("Sign in on your Employability Hub first");
  });

  it("parses", () => {
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    expect(scripts.length).toBeGreaterThan(0);
    for (const src of scripts) expect(() => new Function(src)).not.toThrow();
  });

  it("shows no Share button on the sample passport", () => {
    expect(passportPage(null)).not.toContain("id='share'");
  });
});

describe("an address written into the page cannot end its script", () => {
  it("escapes the angle bracket", () => {
    const html = passportPage("a</script><b>@example.com");
    expect(html).not.toContain("</script><b>@example.com");
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    for (const src of scripts) expect(() => new Function(src)).not.toThrow();
  });
});

describe("what the button sends is accepted", () => {
  /* The two requests the button makes, in order, against the real
   * routes: this is the share working end to end. */
  async function share(env: Env, device: string) {
    const minted = (await (
      await app.request(post("/api/identity", { learner_id: device, email: EMAIL }), undefined, env)
    ).json()) as { ok: boolean; token?: string; reason?: string };
    if (!minted.ok || !minted.token) return { minted, link: null };
    const link = (await (
      await app.request(
        post("/api/passport", { learner_id: device, session_id: device, token: minted.token }),
        undefined,
        env,
      )
    ).json()) as { ok: boolean; url?: string; reason?: string };
    return { minted, link };
  }

  it("a learner sharing from their own device gets a link the passport page honours", async () => {
    const env = makeEnv();
    const { link } = await share(env, DEVICE);
    expect(link?.ok).toBe(true);
    expect(link?.url).toMatch(/^\/passport\?d=.+&s=[0-9a-f]{64}$/);
    const page = await app.request(`http://coach.test${link!.url}`, {}, env);
    expect(await page.text()).toContain("Budgeting That Actually Works");
  });

  it("the old request - a bare address, no token - is still refused", async () => {
    const env = makeEnv();
    const out = (await (
      await app.request(
        post("/api/passport", { learner_id: DEVICE, session_id: DEVICE, email: EMAIL }),
        undefined,
        env,
      )
    ).json()) as { ok: boolean; reason?: string };
    expect(out).toMatchObject({ ok: false, reason: "no_identity" });
  });

  it("a second device cannot share an address the first has claimed", async () => {
    const env = makeEnv();
    expect((await share(env, DEVICE)).link?.ok).toBe(true);
    const second = await share(env, OTHER_DEVICE);
    expect(second.minted.ok).toBe(false);
    expect(second.link).toBeNull();
  });
});
