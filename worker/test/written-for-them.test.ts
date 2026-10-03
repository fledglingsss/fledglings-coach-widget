/* The no-fabrication law, for the lines Fledge writes FOR a learner.
 *
 * Praise is checked by its quote (verbatim.test.ts). The lines written
 * for them - an example bullet, a rewrite, a cover letter, a refined
 * interview answer - have no quote to check, and in the October 2026
 * live QA they carried inventions: "BTEC Business - Level 3" for a CV
 * that says only "BTEC Business", results nobody reported ("reducing
 * customer wait time"), and a Job match tab that called "cash and card
 * payments" found in a CV that says only "tills".
 *
 * These pin the two deterministic halves of the fix:
 *   1. a number the learner never gave is caught, and the line that
 *      states it is withheld (or asked for again) - the advice stays;
 *   2. "found in your document" is decided by the document's words.
 * The third half, the prompts' missing-piece rule, is pinned as text:
 * every prompt that writes lines for the learner carries it. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, moderate: vi.fn(), coach: vi.fn(), generate: vi.fn() };
});

import { app, type Env } from "../src/index";
import { generate } from "../src/lib/anthropic";
import { coverLetterSystemPrompt } from "../src/lib/cover-letter";
import { interviewSystemPrompt, questionSet } from "../src/lib/interview";
import { splitKeywords, termIsWorded, stemsIn, wordStem } from "../src/lib/keyword-match";
import { bulletsWithoutCommentary, linkedinSystemPrompt } from "../src/lib/linkedin";
import { reviewSystemPrompt } from "../src/lib/review";
import { MISSING_PIECE_RULE, inventedNumbers } from "../src/lib/verbatim";
import { renderToolsPage } from "../src/pages";

const generateMock = vi.mocked(generate);

const ORIGIN = "https://www.fledglings.co";
const GOOD_ID = "d".repeat(32);

/* The CV from the live review, as the review read it back from the
 * builder's PDF. */
const CV = [
  "Imogen Hart",
  "07700 900123 · imogen@example.com · linkedin.com/in/imogen-hart-1a2b",
  "WORK & VOLUNTEERING",
  "Weekend Team Member - Garden Centre Sept 24 - present",
  "Served 200+ customers a shift on tills and the plant desk",
  "Responsible for restocking shelves every weekend",
  "Trained two new starters on the till system",
  "EDUCATION",
  "Leeds City College Sept 23 - present",
  "BTEC Business",
  "SKILLS",
  "Tills, rotas, spreadsheets, customer service",
  "REFERENCES",
  "References are available on request.",
].join("\n");
const ADVERT =
  "Customer Service Apprentice, Leeds branch. You will greet customers, handle cash and card payments accurately, " +
  "answer account questions, and support the team with daily admin. We look for reliability, attention to detail, " +
  "clear communication and a genuine interest in helping people. Level 2 apprenticeship, 18 months.";

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
  return (await res.json()) as Record<string, any>;
}

beforeEach(() => {
  generateMock.mockReset();
});

/* ------------------------------------------------------------------
 * 1. numbers the learner never gave
 * ------------------------------------------------------------------ */

describe("inventedNumbers", () => {
  const theirs = [CV, ADVERT];

  it("catches the level that the live review made up", () => {
    const example =
      "BTEC Business - Level 3, Leeds City College, Sept 2023 - present. Modules include: " +
      "[e.g. Finance, Business Communication, Administration] - expected completion [month/year].";
    expect(inventedNumbers(example, theirs)).toEqual(["3"]);
  });

  it("passes a line whose numbers are all the learner's own", () => {
    const example =
      "Served 200+ customers a shift processing cash and card payments at the till and advising at the plant desk.";
    expect(inventedNumbers(example, theirs)).toEqual([]);
  });

  it("knows 'two new starters' gave the number 2", () => {
    expect(inventedNumbers("Trained 2 new starters on the till system", theirs)).toEqual([]);
    expect(inventedNumbers("Trained 3 new starters on the till system", theirs)).toEqual(["3"]);
  });

  it("reads 'twenty-four' and 'seventeen' as the numbers they are", () => {
    expect(inventedNumbers("I am 17 and serve 24 tables", ["I am seventeen and serve twenty-four tables"])).toEqual([]);
  });

  it("accepts a year written out in full, but not a count dressed as one", () => {
    expect(inventedNumbers("Garden Centre, September 2024 to present", theirs)).toEqual([]);
    expect(inventedNumbers("a team of 24", ["Joined in 2024"])).toEqual(["24"]);
  });

  it("ignores everything inside a square-bracket placeholder", () => {
    expect(inventedNumbers("Served [e.g. 150] customers a day, up [X]% on last year", ["Served customers"])).toEqual([]);
  });

  it("does not read a list marker as a claim", () => {
    const tip = "1. Served customers on the till\n2. Restocked shelves every weekend";
    expect(inventedNumbers(tip, ["Served customers on the till. Restocked shelves every weekend"])).toEqual([]);
  });

  it("compares 1,200 with 1200 and 9.50 with 9.5 as the same number", () => {
    expect(inventedNumbers("Handled 1,200 orders at £9.50 each", ["1200 orders", "9.5 an hour"])).toEqual([]);
  });

  it("takes numbers from the advert as given too", () => {
    expect(inventedNumbers("keen to join the Level 2 programme over its 18 months", theirs)).toEqual([]);
  });

  it("reports every invented number, as written", () => {
    expect(inventedNumbers("Grew sales 40% and cut waste by 1,500 units", ["Worked on sales"])).toEqual(["40", "1,500"]);
  });
});

describe("the missing-piece rule is in every prompt that writes lines for the learner", () => {
  it("is one wording, in plain punctuation", () => {
    expect(MISSING_PIECE_RULE).not.toContain(String.fromCharCode(0x2014));
    expect(MISSING_PIECE_RULE).toMatch(/\[what this led to\]/);
  });
  it.each([
    ["CV review", reviewSystemPrompt("cv")],
    ["LinkedIn review", linkedinSystemPrompt()],
    ["cover letter", coverLetterSystemPrompt()],
    ["interview", interviewSystemPrompt()],
  ])("%s", (_name, prompt) => {
    expect(prompt).toContain(MISSING_PIECE_RULE);
  });
});

/* ------------------------------------------------------------------
 * 2. the routes, with only the model mocked
 * ------------------------------------------------------------------ */

const REVIEW = {
  overall: 58,
  verdict: "Real promise, thinly presented",
  dimensions: [
    { label: "Impact", score: 55, tip: "Add what the till line achieved.", evidence: "Served 200+ customers a shift" },
    { label: "ATS readiness", score: 62, tip: "The advert says 'cash and card payments'.", evidence: "Tills, rotas" },
    { label: "Clarity & structure", score: 60, tip: "The BTEC entry has no detail.", evidence: "BTEC Business" },
    { label: "Tailoring", score: 55, tip: "Point one bullet at the advert.", evidence: "Served 200+ customers" },
  ],
  strengths: ["'Served 200+ customers a shift' proves scale."],
  improvements: [
    {
      title: "Expand your BTEC Business entry",
      detail: "'BTEC Business' with nothing under it is the weakest line.",
      example: "BTEC Business - Level 3, Leeds City College, Sept 2023 - present. Modules include: [modules].",
    },
    {
      title: "Add the advert's payment language",
      detail: "Your line says 'tills' but never cash or card.",
      example: "Served 200+ customers a shift processing cash and card payments at the till.",
    },
  ],
  rewrite: {
    before: "Responsible for restocking shelves every weekend",
    after: "Restocked shelves every weekend, keeping 40 lines in stock for [what this led to].",
  },
  keywords: {
    matched: ["customer service", "cash and card payments", "communication", "reliability", "attention to detail", "helping people"],
    missing: ["account questions", "daily admin", "accurate payments", "greet customers"],
  },
  next_step: "Add the words 'cash and card payments' to your till bullet.",
  encouragement: "'trained two new starters' is a genuine standout.",
};

describe("CV review", () => {
  it("withholds an example that states a number the CV never gave, and keeps the advice", async () => {
    generateMock.mockResolvedValue(JSON.stringify(REVIEW));
    const out = await post("/api/review", { kind: "cv", text: CV, target: ADVERT });
    expect(out.kind).toBe("review");
    const [btec, payments] = out.report.improvements;
    expect(btec.title).toBe("Expand your BTEC Business entry");
    expect(btec.example).toBeNull();
    expect(payments.example).toContain("200+");
  });

  it("withholds a rewrite with a number of its own", async () => {
    generateMock.mockResolvedValue(JSON.stringify(REVIEW));
    const out = await post("/api/review", { kind: "cv", text: CV, target: ADVERT });
    expect(out.report.rewrite).toBeNull();
  });

  it("is still one model call and one go - the report is served, not retried", async () => {
    generateMock.mockResolvedValue(JSON.stringify(REVIEW));
    await post("/api/review", { kind: "cv", text: CV, target: ADVERT });
    expect(generateMock).toHaveBeenCalledTimes(1);
  });

  it("sorts the advert's terms by the document's own words", async () => {
    generateMock.mockResolvedValue(JSON.stringify(REVIEW));
    const out = await post("/api/review", { kind: "cv", text: CV, target: ADVERT });
    expect(out.report.keywords).toEqual({
      matched: ["customer service"],
      reword: ["cash and card payments", "communication", "reliability", "attention to detail", "helping people"],
      missing: ["account questions", "daily admin", "accurate payments", "greet customers"],
    });
  });
});

describe("improve-line", () => {
  it("asks again when the sharper line has a number the learner's line did not", async () => {
    generateMock
      .mockResolvedValueOnce(JSON.stringify({ line: "Restocked 40 shelves every weekend, keeping the floor full" }))
      .mockResolvedValueOnce(JSON.stringify({ line: "Restocked shelves every weekend, keeping [what this led to]" }));
    const out = await post("/api/improve-line", { line: "Responsible for restocking shelves every weekend" });
    expect(out.kind).toBe("improve-line");
    expect(out.line).toBe("Restocked shelves every weekend, keeping [what this led to]");
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it("keeps a number that was in the learner's line", async () => {
    generateMock.mockResolvedValue(JSON.stringify({ line: "Served 200+ customers a shift on the tills" }));
    const out = await post("/api/improve-line", { line: "Responsible for serving 200+ customers a shift" });
    expect(out.line).toBe("Served 200+ customers a shift on the tills");
    expect(generateMock).toHaveBeenCalledTimes(1);
  });
});

describe("LinkedIn rewrite", () => {
  const draft = (headline: string) =>
    JSON.stringify({
      headline,
      about: "Every weekend I serve 200+ customers on the tills at a garden centre in Leeds.",
      experience_tip: "- Served 200+ customers a shift\n- Trained two new starters, [what this led to]",
      next: "Paste the headline first.",
    });

  it("asks again when a pasted-in section carries a number the profile never gave", async () => {
    /* "Level 3": the profile says "two new starters", so a 2 would be
     * taken as given - the guard knows numbers, not what they are of */
    generateMock
      .mockResolvedValueOnce(draft("Customer service candidate | Tills | Level 3 Business Admin, Leeds"))
      .mockResolvedValueOnce(draft("Customer service candidate | Tills | BTEC Business, Leeds"));
    const out = await post("/api/linkedin-rewrite", { text: CV, target: "" });
    expect(out.kind).toBe("linkedin-rewrite");
    expect(out.rewrite.headline).toContain("BTEC Business");
    expect(generateMock).toHaveBeenCalledTimes(2);
  });
});

describe("the rewrite's paste-ready entry", () => {
  const bullets = "• Served 200+ customers per shift on the tills.\n• Trained two new starters, [what this led to].";

  it("loses a sentence written about the bullets, as two live reads carried", () => {
    const withTalk = "Your Garden Centre entry is already strong. Tighten it into bullets like these:\n" + bullets;
    expect(bulletsWithoutCommentary(withTalk)).toBe(bullets);
  });

  it("keeps a heading that is part of the entry", () => {
    const withHeading = "Weekend Team Member, Garden Centre, Leeds - September 2024 to present\n" + bullets.replace(/•/g, "-");
    expect(bulletsWithoutCommentary(withHeading)).toBe(withHeading);
  });

  it("leaves an entry alone when it starts with a bullet or has none", () => {
    expect(bulletsWithoutCommentary(bullets)).toBe(bullets);
    expect(bulletsWithoutCommentary("Served customers on the tills every weekend.")).toBe("Served customers on the tills every weekend.");
  });

  it("is applied to what the route returns", async () => {
    generateMock.mockResolvedValue(
      JSON.stringify({
        headline: "Customer service candidate | Tills | BTEC Business, Leeds",
        about: "Every weekend I serve 200+ customers on the tills at a garden centre in Leeds.",
        experience_tip: "Here it is tightened into bullets ready to paste:\n- Served 200+ customers a shift\n- Trained two new starters, [what this led to]",
        next: "Paste the headline first.",
      }),
    );
    const out = await post("/api/linkedin-rewrite", { text: CV, target: "" });
    expect(out.rewrite.experience_tip).toBe("- Served 200+ customers a shift\n- Trained two new starters, [what this led to]");
  });
});

describe("cover letter", () => {
  const letter = (claim: string) =>
    JSON.stringify({
      greeting: "Dear [Hiring manager's name],",
      paragraphs: [
        "Helping people is what I enjoy, so the Customer Service Apprentice role is the right next step.",
        claim,
        "[Why this employer.] Thank you for considering my application.",
      ],
      signoff: "Yours sincerely,",
      personalise: ["[Hiring manager's name]"],
      tips: ["Keep it to a single side of A4."],
    });

  it("asks again when the letter states a number from nowhere", async () => {
    generateMock
      .mockResolvedValueOnce(letter("I have served over 500 customers a shift at the garden centre."))
      .mockResolvedValueOnce(letter("I serve over 200 customers a shift at the garden centre."));
    const out = await post("/api/cover-letter", { jd: ADVERT, cv_text: CV, role: "Customer Service Apprentice", company: "Leeds Building Society" });
    expect(out.kind).toBe("cover-letter");
    expect(out.draft.paragraphs[1]).toContain("200");
    expect(generateMock).toHaveBeenCalledTimes(2);
  });

  it("lets the advert's own numbers through, and the tips are advice, not claims", async () => {
    generateMock.mockResolvedValue(letter("I am keen to develop through the Level 2 programme over its 18 months."));
    const out = await post("/api/cover-letter", { jd: ADVERT, cv_text: CV, role: "", company: "" });
    expect(out.kind).toBe("cover-letter");
    expect(generateMock).toHaveBeenCalledTimes(1);
  });
});

describe("mock interview", () => {
  const ANSWER =
    "I am seventeen and I work weekends on the tills at a garden centre in Leeds. Last month I trained two new starters on the till system.";

  it("withholds a refined answer with a number they never said, and keeps the rest", async () => {
    const qs = questionSet("general");
    generateMock.mockResolvedValue(
      JSON.stringify({
        overall: 70,
        verdict: "Solid start, needs results",
        answers: [
          {
            score: 70,
            strength: 'You said "trained two new starters" - a concrete action.',
            improve: "Say what the training led to.",
            impress: "The result of the training.",
            sharper: "I am 17 and work weekends on the tills, serving around 150 customers a shift. Last month I trained two new starters.",
          },
        ],
        next_step: "End every story with its result.",
        encouragement: '"trained two new starters" is the line they will remember.',
      }),
    );
    const out = await post("/api/interview", {
      role: "general",
      answers: [{ question: qs[0], answer: ANSWER, duration_secs: null }],
    });
    expect(out.kind).toBe("interview");
    expect(out.report.answers[0].sharper).toBe("");
    expect(out.report.answers[0].strength).toContain("trained two new starters");
    expect(out.report.answers[0].improve).toBe("Say what the training led to.");
  });
});

/* ------------------------------------------------------------------
 * 3. "found in your document", decided by the document
 * ------------------------------------------------------------------ */

describe("wordStem", () => {
  it.each([
    ["payments", "payment"],
    ["Payment", "payment"],
    ["customers", "customer"],
    ["handled", "handl"],
    ["handling", "handl"],
    ["handle", "handl"],
    ["accurately", "accurat"],
    ["accurate", "accurat"],
    ["enquiries", "enquiry"],
    ["business", "business"],
    ["analysis", "analysis"],
    ["tills", "till"],
    ["learner's", "learner"],
  ])("%s -> %s", (word, stem) => {
    expect(wordStem(word)).toBe(stem);
  });

  it("keeps words apart that are not the same word", () => {
    expect(wordStem("serve")).not.toBe(wordStem("service"));
    expect(wordStem("customer")).not.toBe(wordStem("custom"));
    expect(wordStem("manager")).not.toBe(wordStem("manage"));
  });
});

describe("termIsWorded", () => {
  const stems = stemsIn(CV);
  it("is true when the document uses the term's own words", () => {
    expect(termIsWorded("customer service", stems)).toBe(true);
    expect(termIsWorded("Customer Service skills", stems)).toBe(true);
    expect(termIsWorded("tills", stems)).toBe(true);
  });
  it("is false when the document shows the thing but not the words", () => {
    expect(termIsWorded("cash and card payments", stems)).toBe(false);
    expect(termIsWorded("communication", stems)).toBe(false);
    expect(termIsWorded("attention to detail", stems)).toBe(false);
  });
  it("needs every meaningful word, not just the common one", () => {
    expect(termIsWorded("greet customers", stems)).toBe(false);
  });
  it("matches a term made only of filler on all of it", () => {
    expect(termIsWorded("experience", stemsIn("Two summers of experience"))).toBe(true);
    expect(termIsWorded("experience", stems)).toBe(false);
  });
});

describe("splitKeywords", () => {
  it("puts the document's wording first, whatever the model judged", () => {
    const split = splitKeywords(["cash and card payments"], ["tills", "customer service", "greet customers"], CV);
    expect(split).toEqual({
      matched: ["tills", "customer service"],
      reword: ["cash and card payments"],
      missing: ["greet customers"],
    });
  });
  it("keeps a term once, however many times the model listed it", () => {
    const split = splitKeywords(["Tills", "tills"], ["tills", "admin"], CV);
    expect(split).toEqual({ matched: ["Tills"], reword: [], missing: ["admin"] });
  });
  it("leaves out a term the advert never words - the terms are the advert's", () => {
    /* the live review listed "tills": it is in the CV, not in the advert */
    const split = splitKeywords(["tills", "customer service"], ["team support", "stakeholder management"], CV, ADVERT);
    expect(split).toEqual({ matched: ["customer service"], reword: [], missing: ["team support"] });
  });
});

describe("the Job match tab", () => {
  it("names all three groups and says what the count is of", () => {
    const page = renderToolsPage();
    expect(page).toContain("In your document, in the advert's words");
    expect(page).toContain("You show this, but not in the advert's words");
    expect(page).toContain("Missing from your document");
    expect(page).toContain("say it the way the advert does");
  });
});
