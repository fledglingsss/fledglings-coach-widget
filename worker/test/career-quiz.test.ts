/* The career quiz: what it asks, how it scores, and that the copy the
 * learner's browser runs is the same scoring that is tested here. */
import { describe, expect, it } from "vitest";

import { CAREER_ROLES } from "../src/lib/career-paths";
import {
  CAREER_OPTION_GUIDES,
  CAREER_QUIZ_JS,
  CAREER_ROUTES,
  ITEMS_PER_AREA,
  QUIZ_ANSWERS,
  QUIZ_AREAS,
  QUIZ_ITEMS,
  ROLE_AREAS,
  ROLES_PER_AREA,
  ROLES_PER_TOP_AREA,
  ROLES_SHOWN,
  TOP_AREAS,
  careerQuizData,
  scoreQuiz,
  type AreaId,
  type QuizResult,
} from "../src/lib/career-quiz";
import { renderCareerQuizPage } from "../src/pages-careers";
import { renderHubPage } from "../src/pages-hub";
import { renderToolsPage } from "../src/pages";

const YES = 2;
const MAYBE = 1;
const NO = 0;

/** Answers that say `value` to every statement in the given areas and
 * "not for me" to the rest. */
function answersFor(areas: Partial<Record<AreaId, number>>): number[] {
  return QUIZ_ITEMS.map((item) => areas[item.area] ?? NO);
}

/** The browser's scorer, run here exactly as the page ships it. */
const browserScore = new Function(
  "answers",
  "D",
  `${CAREER_QUIZ_JS};return flQuizScore(answers,D);`,
) as (answers: number[], data: unknown) => QuizResult;

/** The data as the browser receives it: through JSON, like the page. */
const BROWSER_DATA = JSON.parse(JSON.stringify(careerQuizData())) as unknown;

/** A repeatable spread of answer sheets (no randomness in a test run). */
function sheet(seed: number): number[] {
  let state = seed * 2654435761 + 12345;
  return QUIZ_ITEMS.map(() => {
    state = (state * 1103515245 + 12345) % 2147483648;
    return Math.floor((state / 2147483648) * 3);
  });
}

describe("what the quiz asks", () => {
  it("asks the same number of questions about every kind of interest", () => {
    expect(QUIZ_ITEMS).toHaveLength(QUIZ_AREAS.length * ITEMS_PER_AREA);
    for (const area of QUIZ_AREAS) {
      expect(QUIZ_ITEMS.filter((item) => item.area === area.id)).toHaveLength(ITEMS_PER_AREA);
    }
  });

  it("never asks two questions in a row about the same interest", () => {
    QUIZ_ITEMS.forEach((item, i) => {
      if (i > 0) expect(item.area, `question ${i + 1}`).not.toBe(QUIZ_ITEMS[i - 1]!.area);
    });
  });

  it("asks about things to do, in words that finish the sentence 'Would you enjoy...'", () => {
    for (const item of QUIZ_ITEMS) {
      /* an activity ("Fixing something..."), never a question or a job title */
      expect(item.text, item.text).toMatch(/^[A-Z][a-z]+ing\b/);
      expect(item.text.endsWith("?"), item.text).toBe(false);
      expect(item.text.length, item.text).toBeLessThanOrEqual(70);
    }
    expect(new Set(QUIZ_ITEMS.map((item) => item.text)).size).toBe(QUIZ_ITEMS.length);
  });

  it("offers three answers, worth nothing, one and two", () => {
    expect(QUIZ_ANSWERS.map((answer) => answer.value)).toEqual([0, 1, 2]);
  });
});

describe("where every job sits", () => {
  it("places every job on the checked list in two different interest areas", () => {
    const known = new Set(QUIZ_AREAS.map((area) => area.id));
    for (const role of CAREER_ROLES) {
      const pair = ROLE_AREAS[role.id];
      expect(pair, `${role.id} has no interest areas`).toBeDefined();
      expect(known.has(pair![0]) && known.has(pair![1]), role.id).toBe(true);
      expect(pair![0], `${role.id} names one area twice`).not.toBe(pair![1]);
    }
  });

  it("places no job that is not on the checked list", () => {
    const listed = new Set(CAREER_ROLES.map((role) => role.id));
    for (const id of Object.keys(ROLE_AREAS)) expect(listed.has(id), id).toBe(true);
  });

  it("gives every interest area enough jobs to fill its share of the results", () => {
    for (const area of QUIZ_AREAS) {
      const main = CAREER_ROLES.filter((role) => ROLE_AREAS[role.id]![0] === area.id);
      expect(main.length, area.name).toBeGreaterThanOrEqual(ROLES_PER_AREA);
    }
  });
});

describe("how the quiz scores", () => {
  it("shows hands-on jobs first to someone who only said yes to hands-on things", () => {
    const result = scoreQuiz(answersFor({ maker: YES }));
    expect(result.top).toEqual(["maker"]);
    expect(result.areas[0]).toEqual({ id: "maker", score: ITEMS_PER_AREA * 2, pct: 100 });
    expect(result.roles.length).toBeGreaterThan(0);
    /* the strongest matches are jobs whose main draw is hands-on work */
    for (const role of result.roles.slice(0, ROLES_PER_AREA)) {
      expect(ROLE_AREAS[role.id]![0], role.id).toBe("maker");
    }
  });

  it("names no interest and suggests no job when nothing appealed", () => {
    const result = scoreQuiz(answersFor({}));
    expect(result.top).toEqual([]);
    expect(result.roles).toEqual([]);
  });

  it("names at most three interests, strongest first, and never one that scored nothing", () => {
    const result = scoreQuiz(answersFor({ helper: YES, creator: MAYBE }));
    expect(result.top).toEqual(["helper", "creator"]);
    const everything = scoreQuiz(QUIZ_ITEMS.map(() => YES));
    expect(everything.top).toHaveLength(TOP_AREAS);
  });

  it("puts the interest with more outright yeses first when two score the same", () => {
    /* Organiser: two yeses (4 points). Hands-on: four maybes (4 points).
     * Hands-on comes first in the fixed order, so only the yes count
     * can put Organiser ahead of it. */
    let organiserSeen = 0;
    const answers = QUIZ_ITEMS.map((item) => {
      if (item.area === "maker") return MAYBE;
      if (item.area === "organiser") return organiserSeen++ < 2 ? YES : NO;
      return NO;
    });
    const result = scoreQuiz(answers);
    expect(result.areas[0]!.score).toBe(result.areas[1]!.score);
    expect(result.top).toEqual(["organiser", "maker"]);
  });

  it("keeps the results broad: a fixed number of jobs, and no one interest crowding out the rest", () => {
    const result = scoreQuiz(QUIZ_ITEMS.map(() => YES));
    expect(result.roles).toHaveLength(ROLES_SHOWN);
    const perArea = new Map<string, number>();
    for (const role of result.roles) {
      const main = ROLE_AREAS[role.id]![0];
      perArea.set(main, (perArea.get(main) ?? 0) + 1);
    }
    for (const [area, count] of perArea) expect(count, area).toBeLessThanOrEqual(ROLES_PER_AREA);
    expect(new Set(result.roles.map((role) => role.id)).size).toBe(result.roles.length);
  });

  it("gives each of the learner's named interests at least two of the jobs shown", () => {
    /* A strong creative streak used to fill the list with creative and
     * sales jobs and leave one problem-solving job for someone whose
     * second interest was problem solving. */
    const sheets = [
      answersFor({ creator: YES, solver: MAYBE, leader: MAYBE }),
      answersFor({ helper: YES, organiser: YES, maker: MAYBE }),
      ...Array.from({ length: 40 }, (_, seed) => sheet(seed + 100)),
    ];
    for (const answers of sheets) {
      const result = scoreQuiz(answers);
      for (const area of result.top) {
        const mine = result.roles.filter((role) => ROLE_AREAS[role.id]![0] === area);
        expect(mine.length, `${area} in ${JSON.stringify(answers)}`).toBeGreaterThanOrEqual(ROLES_PER_TOP_AREA);
      }
      expect(result.roles.length).toBeLessThanOrEqual(ROLES_SHOWN);
    }
  });

  it("orders jobs best match first, and scores a match out of 100", () => {
    const result = scoreQuiz(answersFor({ leader: YES, helper: MAYBE, organiser: MAYBE }));
    result.roles.forEach((role, i) => {
      expect(role.match).toBeGreaterThan(0);
      expect(role.match).toBeLessThanOrEqual(100);
      if (i > 0) expect(role.match).toBeLessThanOrEqual(result.roles[i - 1]!.match);
    });
  });

  it("counts a missing or made-up answer as no answer, never as a yes", () => {
    const odd = [YES, 7, -1, Number.NaN, 2.5] as number[];
    const result = scoreQuiz(odd);
    expect(result.areas.reduce((sum, area) => sum + area.score, 0)).toBe(YES);
  });
});

describe("the copy the learner's browser runs", () => {
  it("gives the same result as the tested scorer for every kind of answer sheet", () => {
    const sheets = [
      answersFor({}),
      QUIZ_ITEMS.map(() => YES),
      QUIZ_ITEMS.map(() => MAYBE),
      answersFor({ maker: YES }),
      answersFor({ solver: YES, organiser: MAYBE }),
      answersFor({ creator: MAYBE, leader: YES, helper: YES }),
      [YES, 7, -1, 2.5] as number[],
      ...Array.from({ length: 60 }, (_, seed) => sheet(seed + 1)),
    ];
    for (const answers of sheets) {
      expect(browserScore(answers, BROWSER_DATA), JSON.stringify(answers)).toEqual(scoreQuiz(answers));
    }
  });
});

describe("the ways in", () => {
  const OFFICIAL = [
    "www.gov.uk",
    "www.tlevels.gov.uk",
    "nationalcareers.service.gov.uk",
    "www.ucas.com",
    "www.skillsforcareers.education.gov.uk",
  ];

  it("links every route and guide to an official page", () => {
    for (const link of [...CAREER_ROUTES, ...CAREER_OPTION_GUIDES]) {
      const url = new URL(link.url);
      expect(url.protocol, link.url).toBe("https:");
      expect(OFFICIAL, link.url).toContain(url.hostname);
    }
  });

  it("covers every kind of route, not university alone", () => {
    expect(CAREER_ROUTES.map((route) => route.id)).toEqual([
      "apprenticeship",
      "t-level",
      "college",
      "university",
      "job",
      "volunteering",
      "supported-internship",
    ]);
  });

  it("states no pay or grades of its own: the official pages carry those and keep them current", () => {
    for (const route of CAREER_ROUTES) {
      expect(route.about, route.id).not.toMatch(/£|\bgrades?\b|\bUCAS points\b|per (hour|year|week)|minimum wage/i);
    }
  });
});

describe("the quiz page", () => {
  const html = renderCareerQuizPage();
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]!);
  const pageScript = scripts.find((src) => src.includes("cq-start")) ?? "";

  it("sends the answers nowhere: the page's own script makes no request at all", () => {
    expect(pageScript.length).toBeGreaterThan(200);
    expect(pageScript).not.toMatch(/\bfetch\(|XMLHttpRequest|sendBeacon|new Image\(/);
  });

  it("keeps a result under whoever is signed in, so a shared machine never shows the last learner's", () => {
    expect(pageScript).toContain("s.o===owner()");
    expect(pageScript).toContain("o:owner()");
  });

  it("ships the quiz data in a form that cannot end its own script tag", () => {
    const dataScript = scripts.find((src) => src.startsWith("var FL_QUIZ=")) ?? "";
    const literal = dataScript.slice("var FL_QUIZ=".length, dataScript.indexOf(";function flQuizScore"));
    expect(literal.length).toBeGreaterThan(1000);
    expect(literal).not.toContain("<");
    /* and it is the same data, once the browser reads it */
    expect(new Function(`return ${literal}`)()).toEqual(BROWSER_DATA);
  });

  it("says, on the page, that no AI is involved and nothing is sent", () => {
    expect(html).toContain("with no AI");
    /* said before the first question, where the decision to answer is made */
    const opening = html.slice(html.indexOf("id='cq-start'"), html.indexOf("id='cq-quiz'"));
    expect(opening).toContain("Your answers never leave this browser, and no AI is involved.");
  });

  it("takes a job from the results to the CV review as the thing to aim at", () => {
    expect(pageScript).toContain("'/tools?aim='+encodeURIComponent(label)");
    const tools = renderToolsPage();
    expect(tools).toContain("qs.get('aim')");
    expect(tools).toContain("id='aim-from'");
  });

  it("is one tap from the hub's home page", () => {
    const hub = renderHubPage();
    expect(hub).toContain("id='quiz-card' href='/careers'");
    expect(hub).toContain(`${QUIZ_ITEMS.length} quick questions`);
  });
});
