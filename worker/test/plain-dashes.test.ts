/* The founder's copy law is "no em dashes anywhere a learner or
 * provider reads". The copy we author was swept by hand; what the
 * MODEL writes was not, and a live interview report came back full of
 * them. These tests pin the rule for model-written text:
 *
 *   1. the rewrite itself, in the server function and in the browser
 *      copy that tidies feedback saved before the rule existed;
 *   2. every route that returns model-written text, end to end with
 *      only the model mocked - so a route added later that forgets the
 *      rule is the only way to get one through;
 *   3. that the rule runs AFTER the verbatim checks: praise that quotes
 *      the learner's own words, dash and all, must still survive. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, moderate: vi.fn(), coach: vi.fn(), generate: vi.fn() };
});

import { app, type Env } from "../src/index";
import { coach, generate, moderate } from "../src/lib/anthropic";
import { COURSE_MAP } from "../src/lib/course-map";
import { questionSet } from "../src/lib/interview";
import { hashLearnerId } from "../src/lib/rate-limit";
import { NO_LONG_DASH_RULE, PLAIN_DASHES_JS, plainDashes, plainDashesDeep } from "../src/lib/safety";
import { signPayload } from "../src/lib/sign";
import { coverLetterSystemPrompt } from "../src/lib/cover-letter";
import { interviewSystemPrompt } from "../src/lib/interview";
import { questionGenSystemPrompt } from "../src/lib/interview-questions";
import { linkedinSystemPrompt } from "../src/lib/linkedin";
import { reviewSystemPrompt } from "../src/lib/review";
import { renderInterviewPage } from "../src/pages-interview";
import { renderLibraryPage } from "../src/pages-library";
import coachSystemText from "../src/prompts/coach-system.txt";
import widgetSource from "../src/widget/coach-widget.js.txt";

const generateMock = vi.mocked(generate);
const coachMock = vi.mocked(coach);
const moderateMock = vi.mocked(moderate);

/* Built from code points so this file never depends on how an editor
 * or a tool treats the characters themselves. */
const EM = String.fromCharCode(0x2014);
const EN = String.fromCharCode(0x2013);
const BAR = String.fromCharCode(0x2015);
const NBSP = String.fromCharCode(0x00a0);
const ANY_LONG_DASH = new RegExp(`[${EM}${BAR}]|\\s${EN}\\s`);

const client = new Function(PLAIN_DASHES_JS + ";return {flPlain:flPlain,flPlainDeep:flPlainDeep};")() as {
  flPlain(t: unknown): unknown;
  flPlainDeep(v: unknown): unknown;
};

const CASES: Array<[string, string, string]> = [
  ["a spaced em dash", `Solid start ${EM} needs sharpening`, "Solid start - needs sharpening"],
  ["an unspaced em dash", `Solid start${EM}needs sharpening`, "Solid start - needs sharpening"],
  ["a pair around an aside", `The result ${EM} 'I got a Merit' ${EM} is there`, "The result - 'I got a Merit' - is there"],
  ["uneven spacing", `one${EM} two ${EM}three`, "one - two - three"],
  ["a non-breaking space beside it", `one${NBSP}${EM}${NBSP}two`, "one - two"],
  ["two in a row", `wait${EM}${EM}what`, "wait - what"],
  ["the horizontal bar", `quote ${BAR} author`, "quote - author"],
  ["a spaced en dash, used as a dash", `Good ${EN} but thin`, "Good - but thin"],
  ["a list written with dashes", `Do this:\n${EM} first\n${EM} second`, "Do this:\n- first\n- second"],
  ["a dash opening the text", `${EM} first`, "- first"],
  ["one left dangling at the end", `and then ${EM}`, "and then"],
];

const UNTOUCHED: Array<[string, string]> = [
  ["an en dash in a number range", `aged 16${EN}24`],
  ["an en dash in a time range", `9${EN}5, Monday${EN}Friday`],
  ["ordinary hyphens", "part-time, well-run - and tidy"],
  ["a line break", "first line\nsecond line"],
  ["plain text", "Nothing to change here."],
  ["an empty string", ""],
];

describe("plainDashes", () => {
  for (const [name, input, expected] of CASES) {
    it(`rewrites ${name}`, () => {
      expect(plainDashes(input)).toBe(expected);
    });
  }
  for (const [name, input] of UNTOUCHED) {
    it(`leaves ${name} alone`, () => {
      expect(plainDashes(input)).toBe(input);
    });
  }

  it("is safe to apply twice", () => {
    for (const [, input, expected] of CASES) {
      expect(plainDashes(plainDashes(input))).toBe(expected);
    }
  });
});

describe("plainDashesDeep", () => {
  const report = {
    overall: 64,
    verdict: `Good ${EM} keep going`,
    answers: [{ score: 70, improve: `Add a number${EM}any number`, impress: null }],
    flags: { strong: true },
  };

  it("rewrites every string, however deep, and keeps numbers, booleans and nulls", () => {
    expect(plainDashesDeep(report)).toEqual({
      overall: 64,
      verdict: "Good - keep going",
      answers: [{ score: 70, improve: "Add a number - any number", impress: null }],
      flags: { strong: true },
    });
  });

  it("returns a copy and leaves the original as it was", () => {
    plainDashesDeep(report);
    expect(report.verdict).toBe(`Good ${EM} keep going`);
  });

  it("can be told to leave named fields exactly as they are", () => {
    const item = { quote: `I was tired ${EM} really tired`, why: `Worth a check-in ${EM} gently` };
    expect(plainDashesDeep(item, new Set(["quote"]))).toEqual({
      quote: `I was tired ${EM} really tired`,
      why: "Worth a check-in - gently",
    });
  });
});

describe("the browser copy does exactly what the server does", () => {
  for (const [name, input, expected] of CASES) {
    it(`rewrites ${name}`, () => {
      expect(client.flPlain(input)).toBe(expected);
    });
  }
  for (const [name, input] of UNTOUCHED) {
    it(`leaves ${name} alone`, () => {
      expect(client.flPlain(input)).toBe(input);
    });
  }
  it("walks a saved report and passes non-strings through", () => {
    expect(client.flPlainDeep({ a: [`x ${EM} y`, 3, null], b: { c: `p${EM}q` } })).toEqual({
      a: ["x - y", 3, null],
      b: { c: "p - q" },
    });
    expect(client.flPlain(undefined)).toBeUndefined();
  });
});

/* ------------------------------------------------------------------
 * Route level: the model is mocked to write with em dashes throughout,
 * and nothing that comes back to a learner may contain one.
 * ------------------------------------------------------------------ */

const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "e".repeat(32);

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
  };
}

async function post(path: string, body: Record<string, unknown>, env: Env = makeEnv()) {
  const res = await app.request(
    new Request(`http://coach.test${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ORIGIN },
      body: JSON.stringify({ learner_id: GOOD_ID, session_id: GOOD_ID, ...body }),
    }),
    undefined,
    env,
  );
  const text = await res.text();
  return { status: res.status, text, json: JSON.parse(text) as Record<string, any> };
}

/* The learner's own document uses an em dash, and the model quotes it
 * word for word - the hardest case for "rewrite after the checks". */
const CV =
  `Weekend team member at a garden centre ${EM} tills and the plant desk. ` +
  "Worked in retail for two summers, handled tills and customers. ".repeat(4);

beforeEach(() => {
  generateMock.mockReset();
  coachMock.mockReset();
  moderateMock.mockReset().mockResolvedValue("ALLOW");
});

describe("CV review", () => {
  const reviewJson = JSON.stringify({
    overall: 60,
    verdict: `Solid start ${EM} needs sharpening`,
    dimensions: [
      { label: "Impact", score: 55, tip: `Show outcomes ${EM} not duties.`, evidence: `"tills and the plant desk"` },
      { label: "Clarity & structure", score: 70, tip: `Good order${EM}keep it.` },
      { label: "ATS readiness", score: 60, tip: "Use standard headings." },
      { label: "Tailoring", score: 65, tip: `Name the role ${EN} plainly.` },
    ],
    strengths: [`Real experience ${EM} "garden centre ${EM} tills and the plant desk" tells me the scale.`],
    improvements: [
      { title: `Add outcomes ${EM} now`, detail: `Say what changed ${EM} because you were there.`, example: `Served [how many] customers ${EM} every shift` },
    ],
    rewrite: { before: "handled tills and customers", after: `Served [how many] customers ${EM} on tills` },
    next_step: `Rewrite the first bullet ${EM} lead with a result.`,
    encouragement: `You have real experience ${EM} show it.`,
  });

  it("returns a report with no long dashes, and keeps the praise that quoted the learner", async () => {
    generateMock.mockResolvedValue(reviewJson);
    const out = await post("/api/review", { kind: "cv", text: CV, target: "Retail assistant" });
    expect(out.json.kind).toBe("review");
    expect(JSON.stringify(out.json.report)).not.toMatch(ANY_LONG_DASH);
    expect(out.json.report.verdict).toBe("Solid start - needs sharpening");
    /* grounded against the learner's own em-dashed line BEFORE the rewrite */
    expect(out.json.report.strengths).toHaveLength(1);
    expect(out.json.report.strengths[0]).toContain("garden centre - tills and the plant desk");
    expect(out.json.report.rewrite.after).toBe("Served [how many] customers - on tills");
  });

  it("does not restyle the learner's own lines in the line-by-line panel", async () => {
    generateMock.mockResolvedValue(reviewJson);
    const out = await post("/api/review", { kind: "cv", text: CV, target: "" });
    const lines = out.json.checks.lines as Array<{ text: string }>;
    expect(lines.some((l) => l.text.includes(EM))).toBe(true);
  });
});

describe("the other learner routes", () => {
  it("improve-line returns a line with no long dashes", async () => {
    generateMock.mockResolvedValue(JSON.stringify({ line: `Ran the tills ${EM} and the stock room ${EM} every Saturday` }));
    const out = await post("/api/improve-line", { line: "Responsible for tills and the stock room every Saturday" });
    expect(out.json.kind).toBe("improve-line");
    expect(out.json.line).toBe("Ran the tills - and the stock room - every Saturday");
  });

  it("LinkedIn rewrite returns paste-ready text with no long dashes", async () => {
    generateMock.mockResolvedValue(
      JSON.stringify({
        headline: `Customer service apprentice candidate ${EM} retail and tills`,
        about: `I work weekends at a garden centre ${EM} tills and the plant desk.\n\nI am studying Business${EM}and I like it.`,
        experience_tip: `${EM} Served [how many] customers a shift`,
        next: `Paste the headline first ${EM} it is what recruiters see.`,
      }),
    );
    const out = await post("/api/linkedin-rewrite", { text: CV, target: "" });
    expect(out.json.kind).toBe("linkedin-rewrite");
    expect(JSON.stringify(out.json.rewrite)).not.toMatch(ANY_LONG_DASH);
    expect(out.json.rewrite.experience_tip).toBe("- Served [how many] customers a shift");
  });

  it("LinkedIn review returns section feedback with no long dashes, praise still grounded", async () => {
    const profile = [
      "Imogen Hart",
      `Customer service apprentice candidate ${EM} retail and tills`,
      "Leeds, England, United Kingdom",
      "Summary",
      "I work weekends at a garden centre and I am studying Business at college.",
      "Experience",
      "Garden Centre",
      "Weekend Team Member",
      "September 2024 - Present (1 year)",
      "Education",
      "City College",
      "September 2023 - May 2025",
      "Top Skills",
      "Customer Service",
    ].join("\n");
    const section = (score: number, right: string[], improve: string[]) => ({ score, right, improve });
    generateMock.mockResolvedValue(
      JSON.stringify({
        headline: section(
          8,
          [`"Customer service apprentice candidate ${EM} retail and tills" says where you are heading ${EM} good.`],
          [`Add the town ${EM} recruiters search by place.`],
        ),
        location: section(5, ['"Leeds, England, United Kingdom" is clear.'], []),
        about: section(10, ['"studying Business at college" is a real fact.'], [`Open with the garden centre${EM}it is your strongest line.`]),
        experience: section(12, ['"Weekend Team Member" at a named employer.'], [`Say what you did ${EN} tills, stock, customers.`]),
        education: section(6, ['"City College" with dates.'], []),
        skills: section(6, ['"Customer Service" fits.'], [`Add two more ${EM} tills and stock control.`]),
        extras: section(0, [], [`Add one thing outside work ${EM} a club or volunteering.`]),
        verdict: `Clear direction ${EM} thin detail`,
        next_step: `Rewrite the About section ${EM} lead with the garden centre.`,
        encouragement: `Your headline already says where you are going ${EM} that is rare.`,
      }),
    );
    const out = await post("/api/linkedin", { text: profile, target: "" });
    expect(out.json.kind).toBe("linkedin");
    expect(JSON.stringify(out.json.report)).not.toMatch(ANY_LONG_DASH);
    expect(out.json.report.verdict).toBe("Clear direction - thin detail");
    const headline = (out.json.report.sections as Array<{ id: string; right: string[] }>).find((s) => s.id === "headline")!;
    expect(headline.right).toHaveLength(1);
    expect(headline.right[0]).toContain("Customer service apprentice candidate - retail and tills");
  });

  it("cover letter draft has no long dashes in the letter or its notes", async () => {
    generateMock.mockResolvedValue(
      JSON.stringify({
        greeting: "Dear [Hiring manager's name],",
        paragraphs: [
          `I am applying for the role ${EM} it fits what I do every weekend.`,
          `At the garden centre I run the tills${EM}and the plant desk.`,
          `I would love to bring that to your team ${EN} and learn more.`,
        ],
        signoff: "Yours sincerely,",
        personalise: [`[Hiring manager's name] ${EM} ring and ask`],
        tips: [`Read it aloud ${EM} cut anything that is not you.`],
      }),
    );
    const out = await post("/api/cover-letter", {
      jd: "Customer Service Apprentice. You will greet customers, handle payments and support the team with daily admin.",
      cv_text: CV,
      role: "Customer Service Apprentice",
      company: "Hillside",
    });
    expect(out.json.kind).toBe("cover-letter");
    expect(JSON.stringify(out.json.draft)).not.toMatch(ANY_LONG_DASH);
    expect(out.json.draft.paragraphs[1]).toBe("At the garden centre I run the tills - and the plant desk.");
  });

  it("the chat coach's reply has no long dashes", async () => {
    coachMock.mockResolvedValue(`Good question ${EM} start with a budget. The module walks through it${EM}step by step.`);
    const out = await post("/api/coach", {
      messages: [{ role: "user", content: "How do I start budgeting?" }],
      learner_name: "Imogen",
      page: "Budgeting",
    });
    expect(out.json.kind).toBe("coach");
    expect(out.json.reply).toBe("Good question - start with a budget. The module walks through it - step by step.");
  });
});

describe("mock interview", () => {
  const ANSWER =
    "At my volunteering job I greeted visitors every week and helped them find the right room, staying calm when it was busy.";

  it("returns feedback with no long dashes and keeps the grounded praise", async () => {
    const qs = questionSet("strengths");
    generateMock.mockResolvedValue(
      JSON.stringify({
        overall: 70,
        verdict: `Clear story ${EM} real detail`,
        answers: [
          {
            score: 70,
            strength: `You said "greeted visitors every week" ${EM} that is specific.`,
            improve: `The result ${EM} what changed ${EM} is missing.`,
            impress: `A number${EM}how many visitors.`,
            sharper: `I greeted [how many] visitors every week ${EM} and kept calm when it was busy.`,
          },
        ],
        next_step: `End every story with the result ${EM} a number or a thank you.`,
        encouragement: `"staying calm when it was busy" ${EM} that is the line they will remember.`,
      }),
    );
    const out = await post("/api/interview", {
      role: "strengths",
      answers: [{ question: qs[0], answer: ANSWER, duration_secs: null }],
    });
    expect(out.json.kind).toBe("interview");
    expect(JSON.stringify(out.json.report)).not.toMatch(ANY_LONG_DASH);
    expect(out.json.report.answers[0].strength).toContain("greeted visitors every week");
    expect(out.json.report.answers[0].improve).toBe("The result - what changed - is missing.");
  });

  it("signs generated questions as the learner will see them, so the set still verifies", async () => {
    const env = makeEnv();
    const generated = [
      `Tell me about yourself ${EM} and why this role?`,
      `Tell me about a time you helped a customer${EM}what did you do?`,
      "What would you do if the till was down and a queue was forming?",
      "Tell me about a time you worked with other people to get something done.",
      `Why should we choose you ${EN} and what would you learn first?`,
    ];
    generateMock.mockResolvedValue(JSON.stringify({ role_label: `Retail ${EM} weekend`, questions: generated }));
    const made = await post(
      "/api/interview-questions",
      { mode: "jd", jd: "Weekend sales assistant. Serve customers, run the tills, restock shelves and keep the shop floor tidy." },
      env,
    );
    expect(made.json.kind).toBe("questions");
    expect(made.json.role_label).toBe("Retail - weekend");
    const questions = made.json.questions as string[];
    expect(questions.join("\n")).not.toMatch(ANY_LONG_DASH);
    expect(questions[0]).toBe("Tell me about yourself - and why this role?");

    /* The set the learner was handed must be the set that was signed. */
    generateMock.mockResolvedValue(
      JSON.stringify({
        overall: 60,
        verdict: "Getting there",
        answers: [{ score: 60, strength: 'You said "greeted visitors every week".', improve: "Add the result.", sharper: "I greeted visitors every week." }],
        next_step: "End with the result.",
      }),
    );
    const scored = await post(
      "/api/interview",
      {
        role: "custom",
        role_label: made.json.role_label,
        questions,
        sig: made.json.sig,
        iat: made.json.iat,
        answers: [{ question: questions[0], answer: ANSWER, duration_secs: null }],
      },
      env,
    );
    expect(scored.status).toBe(200);
    expect(scored.json.kind).toBe("interview");
  });
});

/* ------------------------------------------------------------------
 * What a provider reads. Two kinds of field sit side by side there:
 * the model's commentary, which takes the house style, and a learner's
 * quoted words, which are evidence and must reach the tutor exactly as
 * the learner wrote them.
 * ------------------------------------------------------------------ */
describe("what a provider reads", () => {
  const SECRET = "lw-secret";
  const AMY = "amy@swift.test";
  const HER_WORDS = `I feel better ${EM} much better now about money`;
  const TRANSCRIPTS = "I would like transcripts on the videos please";

  async function providerEnv(): Promise<{ env: Env; cookie: string }> {
    const env = makeEnv();
    await env.RATE_LIMITS.put(
      "portal:code:swift-code-1",
      JSON.stringify({ label: "Swift Training", tag: "Swift Learners" }),
    );
    const iat = Math.floor(Date.now() / 1000);
    const sig = await signPayload(SECRET, `portal:swift-code-1:${iat}`);
    const courses = Object.values(COURSE_MAP).filter((v) => v !== null).length;
    const row = (answer: string, kind = "post") => ({
      email: AMY,
      courseTitle: "Money Confidence",
      unitTitle: "Final Self - Reflection",
      kind,
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
          row(HER_WORDS),
          row("I was quite nervous about budgeting before this module", "pre"),
          row("I made a budget for the first time and stuck to it"),
          row(TRANSCRIPTS),
          row("I understand my payslip now and what the deductions mean"),
          row("Saving a little each week feels possible now"),
        ],
        userTags: { [AMY]: ["Swift Learners"] },
        learnerEmails: [AMY],
        preRespondents: [AMY],
        postRespondents: [AMY],
        builtAt: new Date().toISOString(),
      }),
    );
    return { env, cookie: `fl_portal=swift-code-1.${iat}.${sig}` };
  }

  async function get(path: string, env: Env, cookie: string) {
    const res = await app.request(
      new Request(`http://coach.test${path}`, { headers: { Cookie: cookie } }),
      undefined,
      env,
    );
    return { status: res.status, json: (await res.json()) as Record<string, any> };
  }

  it("learner insight: the commentary is restyled, the learner's words are not", async () => {
    const { env, cookie } = await providerEnv();
    generateMock.mockResolvedValue(
      JSON.stringify({
        summary: `Amy sounds nervous at first ${EM} then noticeably more confident.`,
        highlights: [
          { kind: "positive", quote: HER_WORDS, module: "Money Confidence", note: `A clear shift ${EM} worth praising.` },
        ],
      }),
    );
    const out = await get(`/dashboard/learner-insight?email=${AMY}`, env, cookie);
    expect(out.json.status).toBe("ready");
    expect(out.json.summary).toBe("Amy sounds nervous at first - then noticeably more confident.");
    expect(out.json.highlights).toHaveLength(1);
    expect(out.json.highlights[0].note).toBe("A clear shift - worth praising.");
    expect(out.json.highlights[0].quote).toBe(HER_WORDS);
  });

  it("learner insight: a read cached before the rule is tidied when it is served", async () => {
    const { env, cookie } = await providerEnv();
    const hash = (await hashLearnerId(AMY)).slice(0, 16);
    await env.RATE_LIMITS.put(
      `profile:insight:v1:${hash}:6`,
      JSON.stringify({
        ok: true,
        status: "ready",
        count: 6,
        summary: `Nervous at first ${EM} then confident.`,
        highlights: [{ kind: "positive", quote: HER_WORDS, module: "Money Confidence", note: `Good${EM}praise it.` }],
      }),
    );
    const out = await get(`/dashboard/learner-insight?email=${AMY}`, env, cookie);
    expect(generateMock).not.toHaveBeenCalled();
    expect(out.json.summary).toBe("Nervous at first - then confident.");
    expect(out.json.highlights[0].note).toBe("Good - praise it.");
    expect(out.json.highlights[0].quote).toBe(HER_WORDS);
  });

  it("reflection scan: the reason is restyled, the quoted answer is verbatim", async () => {
    const { env, cookie } = await providerEnv();
    generateMock.mockResolvedValue(
      JSON.stringify({
        safeguarding: [],
        adjustments: [
          { email: AMY, quote: TRANSCRIPTS, module: "Money Confidence", why: `Asks for transcripts ${EM} a simple adjustment.` },
        ],
        positives: [
          { email: AMY, quote: HER_WORDS, module: "Money Confidence", why: `A clear shift${EM}pass it on.` },
        ],
      }),
    );
    const out = await get("/portal/reflection-scan", env, cookie);
    expect(out.json.status).toBe("ready");
    expect(out.json.adjustments[0].why).toBe("Asks for transcripts - a simple adjustment.");
    expect(out.json.positives[0].why).toBe("A clear shift - pass it on.");
    expect(out.json.positives[0].quote).toBe(HER_WORDS);
  });

  it("narrative: a stored narrative is served without long dashes", async () => {
    const { env, cookie } = await providerEnv();
    await env.RATE_LIMITS.put(
      "portal:narrative:v2:swift-learners",
      `Engagement is steady ${EM} six learners active this week.\n\nCompletion is rising${EM}slowly.`,
    );
    const out = await get("/portal/narrative", env, cookie);
    expect(out.json.narrative).toBe(
      "Engagement is steady - six learners active this week.\n\nCompletion is rising - slowly.",
    );
  });
});

/* ------------------------------------------------------------------
 * The request and the things we wrote ourselves. The rewrite above is
 * the guarantee; these keep it rarely needed, and keep the AI coach's
 * own built-in messages to the same rule as its generated ones.
 * ------------------------------------------------------------------ */
describe("every prompt that writes for a learner asks for plain punctuation", () => {
  const prompts: Array<[string, string]> = [
    ["CV review", reviewSystemPrompt("cv")],
    ["LinkedIn review (legacy shape)", reviewSystemPrompt("linkedin")],
    ["LinkedIn section review", linkedinSystemPrompt()],
    ["interview scoring", interviewSystemPrompt()],
    ["interview questions from an advert", questionGenSystemPrompt("jd")],
    ["interview questions from a CV", questionGenSystemPrompt("cv")],
    ["admission interview questions", questionGenSystemPrompt("admission")],
    ["cover letter", coverLetterSystemPrompt()],
  ];
  for (const [name, prompt] of prompts) {
    it(`${name} carries the rule and sets the example`, () => {
      expect(prompt).toContain(NO_LONG_DASH_RULE);
      /* a prompt written with long dashes teaches the model to use them */
      expect(prompt.includes(EM)).toBe(false);
    });
  }

  it("the chat coach's prompt carries it too, and no longer models the habit", () => {
    expect(coachSystemText).toContain("never use an em dash");
    expect(coachSystemText.includes(EM)).toBe(false);
  });
});

describe("the chat coach's own built-in messages", () => {
  it("contain no long dash, except the one string that must match old page text", () => {
    const offending = widgetSource
      .split("\n")
      .filter((line) => line.includes(EM))
      /* removeLegacySnippetText() looks for this exact text on the
       * school's pages, dash and all, in order to hide it. */
      .filter((line) => !line.includes("paste-in snippet"));
    expect(offending).toEqual([]);
  });

  it("still signposts support, in plain punctuation", () => {
    expect(widgetSource).toContain("**Childline** - 0800 1111");
    expect(widgetSource).toContain("**Samaritans** - 116 123");
  });
});

describe("feedback saved before the rule is tidied when shown again", () => {
  it("every tool page carries the browser copy", () => {
    const html = renderInterviewPage();
    expect(html).toContain("function flPlain(");
    expect(html).toContain("r=flPlainDeep(r);");
    expect(renderLibraryPage()).toContain("flPlain(topFix(r))");
  });
});
