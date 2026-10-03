/* Who is signed in, and what they are shown because of it: the avatar
 * beside the logo and in the chat, the cohort leaderboard, and the
 * first-time sign-in help. The platform is mocked; identity tokens,
 * cohort scoping and the boards run for real. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/learnworlds", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/learnworlds")>();
  return {
    ...actual,
    getUserByEmail: vi.fn(),
    getEnrolments: vi.fn().mockResolvedValue([]),
    getUserProgressAll: vi.fn().mockResolvedValue([]),
    accurateUserCourses: vi.fn().mockResolvedValue([]),
    courseTitleMap: vi.fn().mockResolvedValue(new Map()),
  };
});

import { app, type Env } from "../src/index";
import { mintIdentityToken } from "../src/lib/identity";
import { getUserByEmail } from "../src/lib/learnworlds";
import { hashLearnerId } from "../src/lib/rate-limit";
import { cohortSlug, displayName, initialsOf, type Leaderboard } from "../src/lib/skills-passport";
import { APP_NAV, IDENTITY_JS, renderAiPrivacyPage, renderToolsPage } from "../src/pages";
import { renderHubPage } from "../src/pages-hub";
import { renderLeaderboardPage } from "../src/pages-leaderboard";
import { renderOpsPage } from "../src/pages-portal";
import widgetSource from "../src/widget/coach-widget.js.txt";

const getUserMock = vi.mocked(getUserByEmail);

const SECRET = "lw-secret";
const DEVICE = "d".repeat(32);
const MONTH = new Date().toISOString().slice(0, 7);

type TestEnv = Env & { RATE_LIMITS: KVNamespace & { store: Map<string, string> } };

function makeEnv(): TestEnv {
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
  } as TestEnv;
}

const SAM = {
  id: "u1",
  email: "sam.avery@swift.test",
  first_name: "Sam",
  last_name: "Avery",
  username: "samavery",
  tags: ["Swift Learners"],
};
const CAL = { id: "u3", email: "cal.reed@other.test", username: "calreed", tags: ["Other College"] };
const LONER = { id: "u5", email: "lee.nobody@solo.test", username: "leenobody", tags: [] as string[] };

function userFor(email: string) {
  return [SAM, CAL, LONER].find((user) => user.email === email) ?? null;
}

/** A token for this device, bound the way /api/identity binds it. */
async function signIn(env: Env, email: string): Promise<string> {
  const deviceHash16 = (await hashLearnerId(DEVICE)).slice(0, 16);
  const emailHash16 = (await hashLearnerId(email)).slice(0, 16);
  await env.RATE_LIMITS.put(`id:bind:${emailHash16}`, JSON.stringify([deviceHash16]));
  return (await mintIdentityToken(SECRET, email, deviceHash16, Math.floor(Date.now() / 1000))) ?? "";
}

function post(path: string, body: Record<string, unknown>) {
  return new Request(`http://coach.test${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: "https://www.fledglings.co" },
    body: JSON.stringify(body),
  });
}

async function call<T>(env: Env, path: string, body: Record<string, unknown>): Promise<T> {
  const res = await app.request(post(path, body), undefined, env);
  return (await res.json()) as T;
}

/** The module counts the hub keeps for a learner (its ten-minute copy). */
async function seedModules(env: Env, email: string, completed: number, enrolled: number) {
  const hash = (await hashLearnerId(email)).slice(0, 16);
  await env.RATE_LIMITS.put(
    `hub:learn:v1:${hash}`,
    JSON.stringify({ enrolled, completed, inProgress: 0 }),
  );
}

const SWIFT_BOARD: Leaderboard = {
  builtAt: "2026-10-01T09:00:00.000Z",
  entries: [
    { h: "aaaaaaaaaaa1", n: "Priya Shah", completed: 9, score: 90 },
    { h: "aaaaaaaaaaa2", n: "Tom Okoro", completed: 8, score: 80 },
    { h: "aaaaaaaaaaa3", n: "Erin Doyle", completed: 7, score: 70 },
    { h: "aaaaaaaaaaa4", n: "Jamie Lee", completed: 6, score: 60 },
    { h: "aaaaaaaaaaa5", n: "Noor Aziz", completed: 5, score: 50 },
    { h: "aaaaaaaaaaa6", n: "Ben Carter", completed: 4, score: 40 },
  ],
};

async function seedBoards(env: Env) {
  await env.RATE_LIMITS.put(`sp:lb:${cohortSlug("Swift Learners")}`, JSON.stringify(SWIFT_BOARD));
  /* this month's race: three completions for Swift, one for Other College */
  for (const course of ["c1", "c2", "c3"]) {
    await env.RATE_LIMITS.put(`chl:${MONTH}:swift-learners:aaaaaaaaaaa1:${course}`, "Swift Learners");
  }
  await env.RATE_LIMITS.put(`chl:${MONTH}:other-college:bbbbbbbbbbb1:c1`, "Other College");
}

interface HubAnswer {
  ok: boolean;
  name?: string;
  profile?: { name: string; initials: string; cohort: string | null };
}

interface BoardAnswer {
  ok: boolean;
  signedIn: boolean;
  month: string;
  race: Array<{ cohort: string; count: number; mine: boolean }>;
  cohort: string | null;
  board: Array<{ rank: number; name: string; completed: number; isMe: boolean }>;
  onBoard: number;
}

beforeEach(() => {
  getUserMock.mockReset();
  getUserMock.mockImplementation(async (_env, email) => userFor(String(email)) as never);
});

describe("the profile behind the avatar", () => {
  it("gives a signed-in learner their first name, initials and cohort", async () => {
    const env = makeEnv();
    const token = await signIn(env, SAM.email);
    const data = await call<HubAnswer>(env, "/api/hub", { learner_id: DEVICE, token });
    expect(data.ok).toBe(true);
    expect(data.name).toBe("Sam");
    expect(data.profile).toEqual({ name: "Sam", initials: "SA", cohort: "Swift Learners" });
  });

  it("asks the platform once, then answers from what it kept", async () => {
    const env = makeEnv();
    const token = await signIn(env, SAM.email);
    await call<HubAnswer>(env, "/api/hub", { learner_id: DEVICE, token });
    const again = await call<HubAnswer>(env, "/api/hub", { learner_id: DEVICE, token });
    expect(again.profile?.initials).toBe("SA");
    expect(getUserMock).toHaveBeenCalledTimes(1);
  });

  it("reads the initials off the address when the account holds no separate names", async () => {
    const env = makeEnv();
    const token = await signIn(env, CAL.email);
    const data = await call<HubAnswer>(env, "/api/hub", { learner_id: DEVICE, token });
    expect(data.profile).toEqual({ name: "Cal", initials: "CR", cohort: "Other College" });
  });

  it("gives a device with no token no profile, and looks nobody up for it", async () => {
    const env = makeEnv();
    const data = await call<HubAnswer>(env, "/api/hub", { learner_id: DEVICE, email: SAM.email });
    expect(data.ok).toBe(true);
    expect(data.profile).toBeUndefined();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("hands the chat the same initials the hub shows", async () => {
    const env = makeEnv();
    const token = await signIn(env, SAM.email);
    const step = await call<{ ok: boolean; me?: { initials: string } }>(env, "/api/next-step", {
      learner_id: DEVICE,
      token,
    });
    expect(step.me).toEqual({ initials: "SA" });
    const hub = await call<HubAnswer>(env, "/api/hub", { learner_id: DEVICE, token });
    expect(hub.profile?.initials).toBe(step.me?.initials);
  });
});

describe("the cohort leaderboard", () => {
  it("shows a visitor who is not signed in the cohort race, and nobody's name", async () => {
    const env = makeEnv();
    await seedBoards(env);
    const data = await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE });
    expect(data.ok).toBe(true);
    expect(data.signedIn).toBe(false);
    expect(data.race).toEqual([
      { cohort: "Swift Learners", count: 3, mine: false },
      { cohort: "Other College", count: 1, mine: false },
    ]);
    expect(data.cohort).toBeNull();
    expect(data.board).toEqual([]);
    expect(JSON.stringify(data)).not.toContain("Priya");
  });

  it("shows a learner their own cohort's top five and their own place, and marks their cohort in the race", async () => {
    const env = makeEnv();
    await seedBoards(env);
    await seedModules(env, SAM.email, 3, 10);
    const token = await signIn(env, SAM.email);
    const data = await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE, token });
    expect(data.signedIn).toBe(true);
    expect(data.cohort).toBe("Swift Learners");
    expect(data.race.find((row) => row.cohort === "Swift Learners")?.mine).toBe(true);
    expect(data.race.find((row) => row.cohort === "Other College")?.mine).toBe(false);
    expect(data.onBoard).toBe(7);
    expect(data.board.map((row) => row.name)).toEqual([
      "Priya Shah",
      "Tom Okoro",
      "Erin Doyle",
      "Jamie Lee",
      "Noor Aziz",
      "Sam Avery",
    ]);
    expect(data.board[5]).toEqual({ rank: 7, name: "Sam Avery", completed: 3, isMe: true });
    /* sixth place is somebody else, further down than the top five: not shown */
    expect(JSON.stringify(data)).not.toContain("Ben Carter");
  });

  it("never gives one cohort's board to a learner from another", async () => {
    const env = makeEnv();
    await seedBoards(env);
    await seedModules(env, CAL.email, 2, 10);
    const token = await signIn(env, CAL.email);
    const data = await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE, token });
    expect(data.cohort).toBe("Other College");
    expect(data.board.map((row) => row.name)).toEqual(["Cal Reed"]);
    const text = JSON.stringify(data);
    for (const entry of SWIFT_BOARD.entries) expect(text).not.toContain(entry.n);
    /* and the Swift board itself is untouched */
    expect(env.RATE_LIMITS.store.get("sp:lb:swift-learners")).toBe(JSON.stringify(SWIFT_BOARD));
  });

  it("puts a learner with no cohort on no board", async () => {
    const env = makeEnv();
    await seedBoards(env);
    await seedModules(env, LONER.email, 5, 10);
    const token = await signIn(env, LONER.email);
    const data = await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE, token });
    expect(data.signedIn).toBe(true);
    expect(data.cohort).toBeNull();
    expect(data.board).toEqual([]);
    const boards = [...env.RATE_LIMITS.store.keys()].filter((key) => key.startsWith("sp:lb:"));
    expect(boards).toEqual(["sp:lb:swift-learners"]);
  });

  it("adds nobody to a board until their modules have been counted", async () => {
    const env = makeEnv();
    await seedBoards(env);
    const token = await signIn(env, SAM.email);
    const data = await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE, token });
    expect(data.onBoard).toBe(6);
    expect(data.board.some((row) => row.isMe)).toBe(false);
    expect(env.RATE_LIMITS.store.get("sp:lb:swift-learners")).toBe(JSON.stringify(SWIFT_BOARD));
  });

  it("stores the board again only when the learner's place on it could have changed", async () => {
    const env = makeEnv();
    await seedBoards(env);
    await seedModules(env, SAM.email, 3, 10);
    const token = await signIn(env, SAM.email);
    const put = vi.spyOn(env.RATE_LIMITS, "put");
    const boardWrites = () => put.mock.calls.filter(([key]) => String(key).startsWith("sp:lb:")).length;
    await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE, token });
    expect(boardWrites()).toBe(1);
    await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE, token });
    expect(boardWrites()).toBe(1);
    /* one more module finished: now it is written */
    await seedModules(env, SAM.email, 4, 10);
    put.mockClear();
    const after = await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE, token });
    expect(boardWrites()).toBe(1);
    expect(after.board.find((row) => row.isMe)?.completed).toBe(4);
  });

  it("ranks modules completed and nothing else: no tool score is read for a board", async () => {
    const env = makeEnv();
    await seedBoards(env);
    await seedModules(env, SAM.email, 3, 10);
    const emailHash = (await hashLearnerId(SAM.email)).slice(0, 16);
    await env.RATE_LIMITS.put(
      `hub:scores:${emailHash}`,
      JSON.stringify({ cv: [{ s: 91, at: 1 }], linkedin: [], interview: [], cover: [] }),
    );
    const token = await signIn(env, SAM.email);
    const data = await call<BoardAnswer>(env, "/api/leaderboard", { learner_id: DEVICE, token });
    expect(JSON.stringify(data)).not.toContain("91");
  });

  it("is a page that asks only for the leaderboard and the learner's next module", () => {
    const html = renderLeaderboardPage();
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
    const own = scripts.find((src) => src.includes("lbd-race")) ?? "";
    const asked = [...own.matchAll(/fetch\('([^']+)'/g)].map((m) => m[1]);
    expect(new Set(asked)).toEqual(new Set(["/api/leaderboard", "/api/next-step"]));
    expect(html).toContain("never ranked");
  });
});

describe("a whole school behind one network address", () => {
  const SCHOOL_IP = "203.0.113.7";
  const DAY = new Date().toISOString().slice(0, 10);

  function postFrom(path: string, body: Record<string, unknown>) {
    return new Request(`http://coach.test${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://www.fledglings.co",
        "CF-Connecting-IP": SCHOOL_IP,
      },
      body: JSON.stringify(body),
    });
  }

  /** The address has already used up the day's allowance for callers
   * nobody has vouched for. */
  async function exhaustAddress(env: Env) {
    const ipHash = (await hashLearnerId(SCHOOL_IP)).slice(0, 16);
    await env.RATE_LIMITS.put(`hub:ip:${ipHash}:${DAY}`, "240");
    await env.RATE_LIMITS.put(`ns:ip:${ipHash}:${DAY}`, "120");
  }

  it("still answers a signed-in learner when the address has used its allowance", async () => {
    const env = makeEnv();
    await exhaustAddress(env);
    const token = await signIn(env, SAM.email);
    const hub = await app.request(postFrom("/api/hub", { learner_id: DEVICE, token }), undefined, env);
    expect(hub.status).toBe(200);
    expect(((await hub.json()) as HubAnswer).profile?.initials).toBe("SA");
    const step = await app.request(postFrom("/api/next-step", { learner_id: DEVICE, token }), undefined, env);
    expect(((await step.json()) as { me?: { initials: string } }).me).toEqual({ initials: "SA" });
  });

  it("still caps a caller with no token at that address", async () => {
    const env = makeEnv();
    await exhaustAddress(env);
    const res = await app.request(postFrom("/api/hub", { learner_id: DEVICE }), undefined, env);
    expect(res.status).toBe(429);
  });

  it("still caps each signed-in device on its own", async () => {
    const env = makeEnv();
    const token = await signIn(env, SAM.email);
    const deviceHash = await hashLearnerId(DEVICE);
    await env.RATE_LIMITS.put(`hub:rl:${deviceHash}:${DAY}`, "60");
    const res = await app.request(postFrom("/api/hub", { learner_id: DEVICE, token }), undefined, env);
    expect(res.status).toBe(429);
  });
});

describe("first-time sign-in", () => {
  it("forgets an address it could not find after ten minutes, and one it found after six hours", async () => {
    const env = makeEnv();
    const put = vi.spyOn(env.RATE_LIMITS, "put");
    const ttlFor = (prefix: string) => {
      const found = put.mock.calls.filter(([key]) => String(key).startsWith(prefix)).pop();
      return (found?.[2] as { expirationTtl?: number } | undefined)?.expirationTtl;
    };
    const miss = await call<{ ok: boolean; reason?: string }>(env, "/api/identity", {
      learner_id: DEVICE,
      email: "new.starter@swift.test",
    });
    expect(miss).toEqual({ ok: false, reason: "cannot_link" });
    expect(ttlFor("id:known:")).toBe(600);

    put.mockClear();
    const hit = await call<{ ok: boolean; token?: string }>(env, "/api/identity", {
      learner_id: DEVICE,
      email: SAM.email,
    });
    expect(hit.ok).toBe(true);
    expect(ttlFor("id:known:")).toBe(6 * 3600);
  });

  it("tells a learner on the hub what to do when their school does not know a password yet", () => {
    const hub = renderHubPage();
    expect(hub).toContain("First time logging in to your school?");
    expect(hub).toContain("Forgot your password?");
    expect(hub).toContain("give it ten minutes and try again");
  });

  it("warns whoever onboards a cohort that no welcome email means no password", () => {
    const ops = renderOpsPage("Fledglings HQ");
    expect(ops).toContain("No welcome email = no password.");
    expect(ops).toContain("NO PASSWORD");
  });
});

describe("one avatar everywhere", () => {
  /* The hub's helpers, run as the browser runs them. */
  const hub = new Function(
    `var window={},document={},localStorage={getItem:function(){return null},setItem:function(){},removeItem:function(){}},` +
      `location={search:"",href:"http://x/"},navigator={};${IDENTITY_JS};` +
      "return {colour:flAvatarColour,initials:flInitialsOf,emailInitials:flEmailInitials};",
  )() as {
    colour: (key: string) => string;
    initials: (name: string) => string;
    emailInitials: (email: string) => string;
  };
  /* The chat's own copies, lifted out of the widget file. */
  const chatSource = widgetSource.slice(
    widgetSource.indexOf("var AV_COLOURS"),
    widgetSource.indexOf("var STORAGE_ME"),
  );
  const chat = new Function(`${chatSource};return {colour:avatarColour,initials:initialsFrom};`)() as {
    colour: (key: string) => string;
    initials: (name: string, email: string) => string;
  };

  const PEOPLE = [
    { name: "Sam Avery", email: "sam.avery@swift.test" },
    { name: "Erin Doyle", email: "erin_doyle@college.test" },
    { name: "Jamie Lee", email: "jamie.lee99@swift.test" },
    { name: "Noor Aziz", email: "Noor.Aziz@Swift.Test" },
    /* a digit in front of a name is not an initial */
    { name: "Priya Shah", email: "07priya.shah@swift.test" },
  ];

  it("colours a learner the same in the chat as in the hub", () => {
    expect(chatSource.length).toBeGreaterThan(200);
    for (const person of PEOPLE) {
      expect(chat.colour(person.email), person.email).toBe(hub.colour(person.email));
    }
    /* and not everybody is the same colour */
    expect(new Set(PEOPLE.map((person) => hub.colour(person.email))).size).toBeGreaterThan(1);
  });

  it("gives a learner the same initials on the server, in the hub and in the chat", () => {
    for (const person of PEOPLE) {
      const server = initialsOf(displayName({ email: person.email }));
      expect(hub.initials(person.name), person.name).toBe(server);
      expect(hub.emailInitials(person.email), person.email).toBe(server);
      expect(chat.initials(person.name, person.email), person.name).toBe(server);
      expect(chat.initials("", person.email), person.email).toBe(server);
    }
  });

  it("shows nothing rather than a wrong letter when there is nothing to go on", () => {
    expect(hub.emailInitials("12345@swift.test")).toBe("");
    expect(chat.initials("", "")).toBe("");
  });

  it("puts the avatar beside the logo on every page of the hub, with a way to sign in when signed out", () => {
    for (const html of [renderHubPage(), renderToolsPage(), renderLeaderboardPage()]) {
      const top = html.slice(html.indexOf("<div class='snav-top'>"), html.indexOf("<nav aria-label"));
      expect(top).toContain("id='snav-me'");
      expect(top).toContain("class='snav-logo'");
      expect(top.indexOf("id='snav-me'")).toBeLessThan(top.indexOf("class='snav-logo'"));
      expect(top).toContain(">Sign in</a>");
      expect(html).toContain("flAvatarPaint();</script>");
    }
  });

  it("forgets the avatar and the quiz result when the device is handed to someone else", () => {
    const clear = IDENTITY_JS.slice(
      IDENTITY_JS.indexOf("function flClearEmail()"),
      IDENTITY_JS.indexOf("function flSignOutHere()"),
    );
    expect(clear).toContain("'fl_profile_v1'");
    expect(clear).toContain("'fl_career_quiz_v1'");
  });

  it("never paints a learner's avatar in a provider's read-only view", () => {
    const paint = IDENTITY_JS.slice(IDENTITY_JS.indexOf("function flAvatarPaint()"));
    expect(paint.indexOf("flViewOnly()")).toBeGreaterThan(-1);
    expect(paint.indexOf("flViewOnly()")).toBeLessThan(paint.indexOf("flResolveEmail()"));
    const save = IDENTITY_JS.slice(
      IDENTITY_JS.indexOf("function flProfileSave("),
      IDENTITY_JS.indexOf("function flProfileRefresh("),
    );
    expect(save).toContain("flViewOnly()");
  });
});

describe("what the hub offers", () => {
  it("lists the career quiz and the leaderboard in the menu", () => {
    expect(APP_NAV.map((item) => item.label)).toEqual([
      "Home",
      "Career Quiz",
      "Resume Builder",
      "CV Review",
      "Cover Letter",
      "LinkedIn Review",
      "Interview Practice",
      "Templates & Scripts",
      "My Work",
      "Leaderboard",
    ]);
  });

  it("says on the privacy page what the quiz, the avatar and the leaderboards keep and show", () => {
    const html = renderAiPrivacyPage();
    expect(html).toContain("<b>Career quiz:</b>");
    expect(html).toContain("<b>Your avatar:</b>");
    expect(html).toContain("<b>Leaderboards:</b>");
    expect(html).toContain("never ranked");
  });
});
