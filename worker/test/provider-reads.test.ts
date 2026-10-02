/* What a tutor is shown from the two AI reads of learner reflections:
 * the weekly read across a cohort, and the read of one learner.
 *
 * Both hand back quotes, and a quote shown to a tutor as a learner's
 * words must be that learner's words. Until October 2026 that was
 * checked character for character, and an entry that failed was dropped
 * without trace. A model asked to copy "i dont want to be here" hands
 * back "I don't want to be here" - so the answers typed most roughly,
 * often the ones that matter most, were the likeliest to be thrown
 * away, after which the page said "Nothing met the safeguarding rubric"
 * and "their answers read as steady".
 *
 * These pin the repaired behaviour:
 *   - a quote is matched on its words and shown in the learner's typing;
 *   - a concern or support need that cannot be quoted is still raised;
 *   - praise that cannot be quoted is still dropped;
 *   - the page claims an all-clear only when it has grounds to. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, moderate: vi.fn(), coach: vi.fn(), generate: vi.fn() };
});

import { app, type Env } from "../src/index";
import { generate } from "../src/lib/anthropic";
import { COURSE_MAP } from "../src/lib/course-map";
import { signPayload } from "../src/lib/sign";
import { learnerWords } from "../src/lib/verbatim";
import { renderDashboardPage } from "../src/pages-dashboard";

const generateMock = vi.mocked(generate);

/* Built from code points: the tests are about exactly which characters
 * are in a string, so none of them is left to an editor. */
const CURLY = String.fromCharCode(0x2019);
const LDQ = String.fromCharCode(0x201c);
const RDQ = String.fromCharCode(0x201d);
const EM = String.fromCharCode(0x2014);

const SECRET = "lw-secret";
const NIAMH = "niamh@swift.test";
const KOFI = "kofi@swift.test";
const HATTIE = "hattie@swift.test";
const AMY = "amy@swift.test";
const CAL = "cal@other.test";

/* As the learners typed them. */
const NIAMH_SAID = "we dont really have food in the house at the end of the month so budgeting is not the problem";
const KOFI_SAID = "i just keep quiet in the workshop because the others laugh";
const HATTIE_SAID = "the videos go too fast for me to read the words";
const AMY_SAID = "Actually check my balance before the weekend instead of after.";
const AMY_ALSO = "I made a budget for the first time and stuck to it";
const AMY_THIRD = "Saving a little each week feels possible now";
const CAL_SAID = "nobody at home asks where i am in the evenings";

function makeEnv(): Env {
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
  } as Env;
}

async function provider(): Promise<{ env: Env; cookie: string }> {
  const env = makeEnv();
  await env.RATE_LIMITS.put(
    "portal:code:swift-code-1",
    JSON.stringify({ label: "Swift Training", tag: "Swift Learners" }),
  );
  const iat = Math.floor(Date.now() / 1000);
  const sig = await signPayload(SECRET, `portal:swift-code-1:${iat}`);
  const courses = Object.values(COURSE_MAP).filter((v) => v !== null).length;
  const row = (email: string, answer: string) => ({
    email,
    courseTitle: "Money Confidence",
    unitTitle: "Final Self - Reflection",
    kind: "post",
    submittedAt: 1_753_000_000,
    question: "How do you feel about money now?",
    answer,
  });
  await env.RATE_LIMITS.put(
    "portal:reflect:v4",
    JSON.stringify({
      status: "ready",
      responsesEnabled: true,
      cursor: courses,
      totalCourses: courses,
      coverage: [],
      shifts: [],
      flags: [],
      responses: [
        row(NIAMH, NIAMH_SAID),
        row(KOFI, KOFI_SAID),
        row(HATTIE, HATTIE_SAID),
        row(AMY, AMY_SAID),
        row(AMY, AMY_ALSO),
        row(AMY, AMY_THIRD),
        row(CAL, CAL_SAID),
      ],
      userTags: {
        [NIAMH]: ["Swift Learners"],
        [KOFI]: ["Swift Learners"],
        [HATTIE]: ["Swift Learners"],
        [AMY]: ["Swift Learners"],
        [CAL]: ["Other College"],
      },
      learnerEmails: [NIAMH, KOFI, HATTIE, AMY, CAL],
      preRespondents: [],
      postRespondents: [NIAMH, KOFI, HATTIE, AMY, CAL],
      builtAt: new Date().toISOString(),
    }),
  );
  return { env, cookie: `fl_portal=swift-code-1.${iat}.${sig}` };
}

async function read(path: string, env: Env, cookie: string) {
  const res = await app.request(
    new Request(`http://coach.test${path}`, { headers: { Cookie: cookie } }),
    undefined,
    env,
  );
  return (await res.json()) as Record<string, any>;
}

async function scan(model: Record<string, unknown>) {
  const { env, cookie } = await provider();
  generateMock.mockResolvedValue(
    JSON.stringify({ safeguarding: [], adjustments: [], positives: [], ...model }),
  );
  return read("/portal/reflection-scan", env, cookie);
}

beforeEach(() => {
  generateMock.mockReset();
});

describe("learnerWords: the learner's own words for a quote the model handed back", () => {
  const answers = [NIAMH_SAID, AMY_SAID, AMY_ALSO];

  it("returns an exact quote as it is", () => {
    expect(learnerWords("I made a budget for the first time", answers)).toBe(
      "I made a budget for the first time",
    );
  });

  it("sees through the tidying a model does, and hands back what the learner typed", () => {
    const tidied = `We don${CURLY}t really have food in the house at the end of the month`;
    expect(learnerWords(tidied, answers)).toBe(
      "we dont really have food in the house at the end of the month",
    );
  });

  it("treats capitals, quotation marks, dashes, spacing and full stops as not being words", () => {
    expect(learnerWords(`${LDQ}ACTUALLY check  my balance${RDQ}`, answers)).toBe("Actually check my balance");
    expect(learnerWords(`before the weekend ${EM} instead of after!`, answers)).toBe(
      "before the weekend instead of after",
    );
    expect(learnerWords("stuck\nto   it.", answers)).toBe("stuck to it");
  });

  it("matches a span from the middle of an answer", () => {
    expect(learnerWords("food in the house", answers)).toBe("food in the house");
  });

  it("refuses a paraphrase, however close", () => {
    expect(learnerWords("we do not have food in the house", answers)).toBeNull();
    expect(learnerWords("There is no food at home", answers)).toBeNull();
  });

  it("refuses a corrected word: that is the model's word, not the learner's", () => {
    expect(learnerWords("we don't really have any food", answers)).toBeNull();
  });

  it("matches whole words only", () => {
    /* "the mon" is inside "the month" as characters, not as words */
    expect(learnerWords("end of the mon", answers)).toBeNull();
    expect(learnerWords("budget", ["I love budgeting"])).toBeNull();
  });

  it("refuses words stitched together from two separate answers", () => {
    expect(learnerWords("instead of after I made a budget", answers)).toBeNull();
  });

  it("refuses an empty quote, or one with no words in it", () => {
    expect(learnerWords("", answers)).toBeNull();
    expect(learnerWords(` ${EM} ... `, answers)).toBeNull();
  });
});

describe("the weekly read across a cohort", () => {
  it("keeps a concern whose quote the model tidied, and shows the learner's own typing", async () => {
    const out = await scan({
      safeguarding: [
        {
          email: NIAMH,
          quote: `We don${CURLY}t really have food in the house at the end of the month`,
          module: "Money Confidence",
          why: "Describes going without food.",
          severity: "concern",
        },
      ],
    });
    expect(out.status).toBe("ready");
    expect(out.safeguarding).toHaveLength(1);
    expect(out.safeguarding[0].quote).toBe("we dont really have food in the house at the end of the month");
    expect(out.safeguarding[0].unquoted).toBeUndefined();
    expect(out.safeguarding[0].severity).toBe("concern");
  });

  it("still raises a concern the model paraphrased - with no quote, never with the model's words", async () => {
    const out = await scan({
      safeguarding: [
        {
          email: KOFI,
          quote: "I stay silent at work because people laugh at me",
          module: "Building Real Confidence",
          why: "Possible bullying at placement.",
          severity: "monitor",
        },
      ],
    });
    expect(out.safeguarding).toHaveLength(1);
    expect(out.safeguarding[0]).toMatchObject({
      email: KOFI,
      quote: "",
      unquoted: true,
      why: "Possible bullying at placement.",
      severity: "monitor",
    });
    expect(JSON.stringify(out)).not.toContain("stay silent at work");
  });

  it("still raises a support need the model paraphrased", async () => {
    const out = await scan({
      adjustments: [
        { email: HATTIE, quote: "The videos are too quick to read", module: "Budgeting", why: "May need transcripts." },
      ],
    });
    expect(out.adjustments).toHaveLength(1);
    expect(out.adjustments[0]).toMatchObject({ email: HATTIE, quote: "", unquoted: true });
  });

  it("drops praise it cannot quote: a tutor must not pass on words the learner never wrote", async () => {
    const out = await scan({
      positives: [
        { email: AMY, quote: "I always check my balance now", module: "Budgeting", why: "Praise the habit." },
        { email: AMY, quote: "stuck to it", module: "Budgeting", why: "Praise the persistence." },
      ],
    });
    expect(out.positives).toHaveLength(1);
    expect(out.positives[0].quote).toBe("stuck to it");
  });

  it("drops an entry about someone who is not one of this provider's learners", async () => {
    const out = await scan({
      safeguarding: [
        { email: CAL, quote: CAL_SAID, module: "Money Confidence", why: "Possible neglect.", severity: "concern" },
        { email: "nobody@swift.test", quote: "anything", module: "", why: "Invented learner.", severity: "concern" },
      ],
    });
    expect(out.safeguarding).toEqual([]);
  });

  it("does not let one learner's words be quoted under another learner's name", async () => {
    const out = await scan({
      positives: [{ email: AMY, quote: KOFI_SAID, module: "", why: "" }],
      safeguarding: [{ email: AMY, quote: KOFI_SAID, module: "", why: "Check in.", severity: "monitor" }],
    });
    expect(out.positives).toEqual([]);
    /* raised for the learner the model named, but without the quote */
    expect(out.safeguarding[0]).toMatchObject({ email: AMY, quote: "", unquoted: true });
  });

  it("raises one unquoted entry per learner, not one per repeat", async () => {
    const out = await scan({
      safeguarding: [
        { email: KOFI, quote: "people laugh at me", module: "", why: "First.", severity: "monitor" },
        { email: KOFI, quote: "I am laughed at", module: "", why: "Second.", severity: "monitor" },
      ],
    });
    expect(out.safeguarding).toHaveLength(1);
  });

  it("marks the read, so the page knows an empty list from it can be trusted", async () => {
    expect((await scan({})).reader).toBe(2);
  });
});

describe("the read of one learner", () => {
  async function insight(highlights: unknown[]) {
    const { env, cookie } = await provider();
    generateMock.mockResolvedValue(JSON.stringify({ summary: "A steady start.", highlights }));
    return read(`/dashboard/learner-insight?email=${AMY}`, env, cookie);
  }

  it("shows a matched quote in the learner's own typing", async () => {
    const out = await insight([
      { kind: "positive", quote: "actually check my balance before the weekend", module: "Budgeting", note: "A real habit." },
    ]);
    expect(out.highlights).toHaveLength(1);
    expect(out.highlights[0].quote).toBe("Actually check my balance before the weekend");
    expect(out.reader).toBe(2);
  });

  it("keeps a worry it cannot quote, and drops praise it cannot quote", async () => {
    const out = await insight([
      { kind: "concern", quote: "I am scared about money every month", module: "Budgeting", note: "Worth a conversation." },
      { kind: "positive", quote: "I am brilliant with money now", module: "Budgeting", note: "Praise it." },
    ]);
    expect(out.highlights).toHaveLength(1);
    expect(out.highlights[0]).toMatchObject({
      kind: "concern",
      quote: "",
      unquoted: true,
      note: "Worth a conversation.",
    });
  });

  it("never shows more than five", async () => {
    const many = Array.from({ length: 8 }, () => ({ kind: "positive", quote: "stuck to it", module: "", note: "" }));
    expect((await insight(many)).highlights).toHaveLength(5);
  });
});

describe("what the dashboard page says about an empty list", () => {
  const html = renderDashboardPage();

  it("no longer says a learner's answers 'read as steady'", () => {
    expect(html).not.toContain("read as steady");
    expect(html).not.toContain("Nothing stands out for a tutor to act on");
  });

  it("says 'nothing met the safeguarding rubric' only of a read made with the word-level check", () => {
    const at = html.indexOf("Nothing met the safeguarding rubric");
    expect(at).toBeGreaterThan(-1);
    expect(html.slice(at - 40, at)).toContain("d.reader>=2");
    expect(html).toContain("This read has no safeguarding quotes to show");
  });

  it("shows an unquoted entry as unquoted, in both reads", () => {
    expect(html).toContain("function quoteLine(q)");
    expect(html).toContain("No quote shown");
    expect(html.split("quoteLine(h.quote)").length - 1).toBe(2);
  });
});

describe("the dashboard before anyone has signed in", () => {
  const html = renderDashboardPage();

  it("is only the way in: no workbench links with nothing behind them", () => {
    /* pressing one used to hide the sign-in form and leave an empty page */
    expect(html).toContain("document.body.classList.add('signed-out')");
    expect(html).toMatch(/body\.signed-out \.dn,body\.signed-out \.dsec,body\.signed-out \.dfoot,\s*body\.signed-out \.dheadr,body\.signed-out \.dnote\{display:none!important/);
  });

  it("names the access-code field for a screen reader", () => {
    expect(html).toMatch(/<input type='password' name='code' aria-label='Access code'/);
  });
});

describe("dashboard chart labels are not cut off", () => {
  it("wraps a row label instead of ending it in an ellipsis", () => {
    const html = renderDashboardPage();
    expect(html).toMatch(/\.hb-l,\.sh-l,\.stk-l,\.dr-mt\{white-space:normal;overflow:visible;text-overflow:clip/);
  });
});
