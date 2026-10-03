/* Career paths, and getting back to feedback - the two things a tester
 * asked for in October 2026.
 *
 * 1. "It would be good if the CV scanner could identify if your CV is
 *    tailored towards another type of job, and show how your experiences
 *    could relate to other jobs."  The review now says what the CV
 *    points at as written and offers up to three other roles - from a
 *    checked list, each resting on a line the learner wrote.
 *
 * 2. "When I get off the CV builder, I can't access my improvement
 *    points anymore."  The whole report was always saved with the
 *    document; no screen opened it again. These pin the ways back.
 *
 * What is pinned here is the part that must not drift: roles come only
 * from the list, a path without the learner's own words is dropped, no
 * pay or entry rules are stated, and every page that promised "nothing
 * is stored" now says what is actually kept. */
import { beforeEach, describe, expect, it, vi } from "vitest";

import { makeKvMock } from "./helpers/kv-mock";

vi.mock("../src/lib/anthropic", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../src/lib/anthropic")>();
  return { ...actual, moderate: vi.fn(), coach: vi.fn(), generate: vi.fn() };
});

import { app, type Env } from "../src/index";
import { generate } from "../src/lib/anthropic";
import {
  CAREER_PATHS_SHOWN,
  CAREER_ROLES,
  careerPathsBrief,
  careerProfileUrl,
  groundCareer,
  parseDirection,
  parsePaths,
} from "../src/lib/career-paths";
import { parseReviewReport, reviewSystemPrompt } from "../src/lib/review";
import { renderToolsPage } from "../src/pages";
import { renderBuilderPage } from "../src/pages-builder";
import { renderCoverLetterPage } from "../src/pages-cover-letter";
import { renderLibraryPage } from "../src/pages-library";
import { renderLinkedInPage } from "../src/pages-linkedin";

const generateMock = vi.mocked(generate);

const CV = [
  "Imogen Hart",
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
].join("\n");

/* ------------------------------------------------------------------
 * the list
 * ------------------------------------------------------------------ */

describe("the career list", () => {
  it("has a plain description for every role, and no role twice", () => {
    const ids = CAREER_ROLES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const role of CAREER_ROLES) {
      expect(role.id).toMatch(/^[a-z0-9-]+$/);
      expect(role.label.length).toBeGreaterThan(3);
      expect(role.about.length).toBeGreaterThan(20);
      expect(role.about.length).toBeLessThan(120);
      expect(role.about.endsWith(".")).toBe(true);
    }
  });

  it("states no pay, no age rule and no entry requirement - the official profile carries those", () => {
    for (const role of CAREER_ROLES) {
      /* ("paid" alone is allowed: it is what a payroll administrator does) */
      expect(role.about).not.toMatch(/£|\bsalary\b|\ban hour\b|\ba year\b|\bage \d|\b1[68]\b|GCSE|A level|degree|qualification/i);
    }
  });

  it("holds to the founder's copy laws", () => {
    const all = CAREER_ROLES.map((r) => `${r.label} ${r.about}`).join("\n");
    expect(all).not.toContain(String.fromCharCode(0x2014));
    expect(all).not.toMatch(/learn\s*worlds/i);
    /* British spellings */
    expect(all).not.toMatch(/\borganiz|\bcolor\b|\bcenter\b/);
  });

  it("links each role to its official job profile", () => {
    expect(careerProfileUrl("sales-assistant")).toBe(
      "https://nationalcareers.service.gov.uk/job-profiles/sales-assistant",
    );
  });

  it("is given to the model as ids to choose from, with the rules that bind it", () => {
    const brief = careerPathsBrief();
    expect(brief).toContain("customer-service-assistant: Customer service assistant");
    expect(brief).toMatch(/Never state pay, entry requirements/);
    expect(brief).toMatch(/quote it/i);
    expect(reviewSystemPrompt("cv")).toContain(brief);
    /* a LinkedIn review has no career section */
    expect(reviewSystemPrompt("linkedin")).not.toContain("CAREER LIST");
    expect(reviewSystemPrompt("linkedin")).not.toContain('"paths"');
  });
});

/* ------------------------------------------------------------------
 * what the model sends back
 * ------------------------------------------------------------------ */

describe("parsePaths", () => {
  const path = (role_id: string, because = "Your 'tills' line counts here.") => ({ role_id, because, bridge: "Add [what]." });

  it("keeps only roles on the list, and takes the role's facts from the list", () => {
    const paths = parsePaths([path("receptionist"), path("astronaut"), path("barista")]);
    expect(paths.map((p) => p.id)).toEqual(["receptionist", "barista"]);
    expect(paths[0]).toMatchObject({
      role: "Receptionist",
      url: "https://nationalcareers.service.gov.uk/job-profiles/receptionist",
    });
    expect(paths[0]!.about).toMatch(/front desk/);
  });

  it("ignores a role name the model made up for itself", () => {
    const made = [{ role_id: "receptionist", role: "Chief Welcome Officer", about: "Earn £40k", because: "Your 'tills' line.", bridge: null }];
    const [only] = parsePaths(made);
    expect(only!.role).toBe("Receptionist");
    expect(only!.about).not.toMatch(/40k/);
  });

  it("keeps a role once, stops at the number shown, and needs a reason", () => {
    const many = ["receptionist", "receptionist", "barista", "waiter", "chef"].map((id) => path(id));
    expect(parsePaths(many).map((p) => p.id)).toEqual(["receptionist", "barista", "waiter"]);
    expect(parsePaths(many)).toHaveLength(CAREER_PATHS_SHOWN);
    expect(parsePaths([{ role_id: "receptionist" }])).toEqual([]);
    expect(parsePaths("nonsense")).toEqual([]);
  });
});

describe("parseDirection", () => {
  it("reads a direction, and treats a missing or odd on_target as not known", () => {
    expect(parseDirection({ reads_as: "Retail and customer service", fit: "It points at shop work.", evidence: "Tills", on_target: "yes" })).toEqual({
      reads_as: "Retail and customer service",
      fit: "It points at shop work.",
      evidence: "Tills",
      on_target: null,
    });
    expect(parseDirection({ reads_as: "Retail" })).toBeNull();
    expect(parseDirection(null)).toBeNull();
  });
});

describe("groundCareer", () => {
  const paths = parsePaths([
    { role_id: "receptionist", because: "'Served 200+ customers a shift on tills and the plant desk' is front-desk work.", bridge: "Add [calls you take]." },
    { role_id: "barista", because: "You clearly love coffee and people.", bridge: null },
    { role_id: "stock-control-assistant", because: "'Responsible for restocking shelves every weekend' across 40 product lines.", bridge: null },
  ]);

  it("keeps a path that quotes the learner, and drops one that does not", () => {
    const out = groundCareer(null, paths, CV, "");
    expect(out.paths.map((p) => p.id)).toEqual(["receptionist"]);
    expect(out.dropped).toBe(2);
  });

  it("drops a path whose reason states a number the learner never gave", () => {
    const out = groundCareer(null, paths, CV, "");
    expect(out.paths.some((p) => p.id === "stock-control-assistant")).toBe(false);
  });

  it("shows the direction's evidence only in the learner's own words", () => {
    const direction = parseDirection({
      reads_as: "Retail and customer service",
      fit: "It points at shop work.",
      evidence: "served 200+ customers a shift on tills and the plant desk",
      on_target: true,
    });
    const own = groundCareer(direction, [], CV, "Customer service apprentice").direction!;
    expect(own.evidence).toBe("Served 200+ customers a shift on tills and the plant desk");
    const invented = groundCareer({ ...direction!, evidence: "Managed a team of twelve" }, [], CV, "x").direction!;
    expect(invented.evidence).toBeNull();
  });

  it("cannot be on target when no target was given", () => {
    const direction = parseDirection({ reads_as: "Retail", fit: "It points at shop work.", on_target: true });
    expect(groundCareer(direction, [], CV, "").direction!.on_target).toBeNull();
    expect(groundCareer(direction, [], CV, "Retail assistant").direction!.on_target).toBe(true);
  });
});

/* ------------------------------------------------------------------
 * the route, with only the model mocked
 * ------------------------------------------------------------------ */

const REVIEW = {
  overall: 58,
  verdict: "Real promise, thinly presented",
  dimensions: [
    { label: "Impact", score: 55, tip: "Add what the till line achieved.", evidence: "Served 200+ customers a shift" },
    { label: "ATS readiness", score: 62, tip: "Use the advert's words.", evidence: "Tills, rotas" },
    { label: "Clarity & structure", score: 60, tip: "The BTEC entry has no detail.", evidence: "BTEC Business" },
    { label: "Tailoring", score: 55, tip: "Point one bullet at the advert.", evidence: "Served 200+ customers" },
  ],
  strengths: ["'Served 200+ customers a shift' proves scale."],
  improvements: [{ title: "Lead with a verb", detail: "'Responsible for' hides what you did.", example: "Restocked shelves every weekend, [what this led to]." }],
  keywords: { matched: [], missing: [] },
  direction: {
    reads_as: "Retail and customer service",
    evidence: "Served 200+ customers a shift on tills and the plant desk",
    on_target: true,
    fit: "It points squarely at customer-facing shop work.",
  },
  paths: [
    { role_id: "receptionist", because: "'Served 200+ customers a shift on tills and the plant desk' is front-desk work under another name.", bridge: "Add [the phone or email queries you handle]." },
    { role_id: "horticultural-worker", because: "Working 'on tills and the plant desk' means you already know a garden centre from the inside.", bridge: "Add [the plants or stock you look after]." },
    { role_id: "teaching-assistant", because: "You would be brilliant with children.", bridge: null },
  ],
  next_step: "Lead every bullet with what you did.",
  encouragement: "'trained two new starters' is a genuine standout.",
};

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

async function review(target: string) {
  const id = "c".repeat(32);
  const res = await app.request(
    new Request("http://coach.test/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://www.fledglings.co" },
      body: JSON.stringify({ learner_id: id, session_id: id, kind: "cv", text: CV, target }),
    }),
    undefined,
    makeEnv(),
  );
  return (await res.json()) as Record<string, any>;
}

beforeEach(() => {
  generateMock.mockReset();
});

describe("a CV review's career section", () => {
  it("returns the paths that rest on the learner's own lines, with the list's facts", async () => {
    generateMock.mockResolvedValue(JSON.stringify(REVIEW));
    const out = await review("Customer service apprentice");
    expect(out.kind).toBe("review");
    expect(out.report.paths.map((p: { id: string }) => p.id)).toEqual(["receptionist", "horticultural-worker"]);
    expect(out.report.paths[1]).toMatchObject({
      role: "Horticultural worker",
      url: "https://nationalcareers.service.gov.uk/job-profiles/horticultural-worker",
    });
    expect(out.report.direction).toMatchObject({ reads_as: "Retail and customer service", on_target: true });
  });

  it("says nothing about being on target when the learner named no target", async () => {
    generateMock.mockResolvedValue(JSON.stringify(REVIEW));
    const out = await review("");
    expect(out.report.direction.on_target).toBeNull();
  });

  it("is still a review when the model leaves the section out", async () => {
    const { direction: _direction, paths: _paths, ...plain } = REVIEW;
    generateMock.mockResolvedValue(JSON.stringify(plain));
    const out = await review("");
    expect(out.kind).toBe("review");
    expect(out.report.paths).toEqual([]);
    expect(out.report.direction).toBeNull();
  });

  it("gives a LinkedIn review no career section", () => {
    const parsed = parseReviewReport(JSON.stringify(REVIEW), "linkedin");
    expect(parsed).not.toBeNull();
    expect(parsed).not.toBe("crisis");
    if (parsed && parsed !== "crisis") {
      expect(parsed.paths).toEqual([]);
      expect(parsed.direction).toBeNull();
    }
  });
});

/* ------------------------------------------------------------------
 * the pages
 * ------------------------------------------------------------------ */

describe("the Career paths tab", () => {
  const page = renderToolsPage();
  it("is on the CV review, hidden until a report has one", () => {
    expect(page).toContain("id='rtab-paths' role='tab' hidden>Career paths");
    expect(page).toContain("Where this CV points");
    expect(page).toContain("Other doors your experience could open");
  });
  it("calls them possibilities, credits the source, and opens profiles in a new tab safely", () => {
    expect(page).toContain("possibilities, not promises");
    expect(page).toContain("National Careers Service");
    expect(page).toContain("target='_blank' rel='noopener'");
    /* the address is rebuilt from the role id, never taken from a saved report */
    expect(page).toContain("job-profiles/\"+encodeURIComponent(p.id)");
  });
});

describe("getting back to feedback", () => {
  it("the CV review opens a saved review and offers the last one", () => {
    const page = renderToolsPage();
    expect(page).toContain("qs.get('open')");
    expect(page).toContain("YOUR LAST REVIEW");
    expect(page).toContain("Open my feedback");
    expect(page).toContain("nothing was scored again");
    /* the checks ride with the saved report so it opens as it was */
    expect(page).toContain("keep._checks=d.checks||null");
  });

  it("the LinkedIn review does the same", () => {
    const page = renderLinkedInPage();
    expect(page).toContain("qs.get('open')");
    expect(page).toContain("YOUR LAST REVIEW");
    expect(page).toContain("flLibLatest('linkedin')");
  });

  it("My work opens the whole feedback, not just the next fix", () => {
    const page = renderLibraryPage();
    expect(page).toContain("Open the feedback");
    expect(page).toContain("?open=");
    expect(page).toContain("Score it again");
    expect(page).toContain("flLibHandoffRef(row.id)");
  });

  it("the builder keeps the review's fixes beside the CV, and can be sent back to", () => {
    const page = renderBuilderPage();
    expect(page).toContain("Fixes from your AI review");
    expect(page).toContain("id='revfix' hidden");
    expect(page).toContain("params.get('cv')");
    expect(page).toContain("fl_builder_cv_id");
    expect(page).toContain("Open the full review");
    /* on a phone the list sits below the CV, so the bar links to it */
    expect(page).toContain("id='bb-fixes' hidden");
  });

  it("a CV sent from the builder goes back to that CV, not to a second copy", () => {
    const page = renderToolsPage();
    expect(page).toContain("Back to my CV in the builder");
    expect(page).toContain("/builder?cv=");
    expect(page).toContain("flBuilderAttachReview(builderCvId");
  });
});

describe("no page still says nothing is stored", () => {
  it.each([
    ["CV review", renderToolsPage()],
    ["LinkedIn review", renderLinkedInPage()],
    ["cover letter", renderCoverLetterPage()],
  ])("%s says what is kept", (_name, page) => {
    expect(page).not.toMatch(/nothing is stored/i);
    expect(page).not.toMatch(/then forgotten/i);
    expect(page).toMatch(/kept in My work/);
  });
});
