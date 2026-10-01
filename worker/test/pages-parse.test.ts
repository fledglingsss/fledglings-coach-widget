/* Every page ships hand-built JavaScript inside template strings — a
 * single stray token silently kills the whole page (it has happened
 * twice: an apostrophe in a quoted string, and a mangled regex patch).
 * This guard renders every page and PARSES every inline script, so a
 * syntax error fails CI instead of shipping. */
import { describe, expect, it } from "vitest";

import { renderHubPage } from "../src/pages-hub";
import { renderInterviewPage } from "../src/pages-interview";
import { renderLinkedInPage } from "../src/pages-linkedin";
import { renderCoverLetterPage } from "../src/pages-cover-letter";
import { renderBuilderPage } from "../src/pages-builder";
import { renderLibraryPage } from "../src/pages-library";
import { renderOutreachPage } from "../src/pages-outreach";
import { renderAiPrivacyPage, renderToolsPage } from "../src/pages";
import { renderDashboardPage } from "../src/pages-dashboard";
import { renderInspectBuilding, renderInspectExpired, renderInspectPage } from "../src/pages-inspect";

const SAMPLE_INSPECT = {
  label: "Sample Provider",
  tag: "Sample Cohort",
  expires: "27 September 2026",
  generatedAt: "20 September 2026",
  kpis: { learners: 10, activeWeek: 6, modulesCompleted: 4, avgMinutes: 75, reflectionAnswers: 40 },
  curriculum: [{ area: "Financial Literacy", enrolled: 10, completed: 4, pct: 40 }],
  modules: [{ title: "Sample Module", enrolled: 10, done: 4, going: 3, idle: 3 }],
  shifts: [{ courseTitle: "Sample Module", preAvgPct: 50, postAvgPct: 78, shift: 28, preCount: 8, postCount: 6 }],
  narrative: "A sample narrative.",
};

const PAGES: Array<[string, () => string]> = [
  ["dashboard", renderDashboardPage],
  ["hub", renderHubPage],
  ["interview", renderInterviewPage],
  ["linkedin", renderLinkedInPage],
  ["cover-letter", renderCoverLetterPage],
  ["builder", renderBuilderPage],
  ["tools", renderToolsPage],
  ["ai-privacy", renderAiPrivacyPage],
  ["library", renderLibraryPage],
  ["templates", renderOutreachPage],
];

/* Script-free pages: covered by the white-label guard below, exempt
 * from the inline-JavaScript checks. */
const STATIC_PAGES: Array<[string, () => string]> = [
  ["inspect", () => renderInspectPage(SAMPLE_INSPECT)],
  ["inspect-building", renderInspectBuilding],
  ["inspect-expired", renderInspectExpired],
];

function inlineScripts(html: string): string[] {
  const out: string[] = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]!);
  return out;
}

describe("upload pages: the report is never swallowed by the upload wrapper", () => {
  /* An unclosed #u-card nests the spinner/report inside it — and
   * show() hides u-card when the report appears, blanking every
   * review result (shipped 2026-07-28 → 08-05). Structural guard:
   * div opens/closes balance between u-card and a-card. */
  for (const [name, render] of [
    ["tools", renderToolsPage],
    ["linkedin", renderLinkedInPage],
  ] as const) {
    it(`${name} closes #u-card before the analysing card`, () => {
      const html = render();
      const seg = html.slice(html.indexOf("id='u-card'"), html.indexOf("id='a-card'"));
      const opens = (seg.match(/<div/g) ?? []).length;
      const closes = (seg.match(/<\/div>/g) ?? []).length;
      expect(closes, `${name}: unbalanced divs — report will vanish on submit`).toBe(opens);
    });
  }
});

describe("every page's inline JavaScript parses", () => {
  for (const [name, render] of PAGES) {
    it(`${name} scripts are syntactically valid`, () => {
      const scripts = inlineScripts(render());
      expect(scripts.length, `${name} should ship scripts`).toBeGreaterThan(0);
      for (const [i, src] of scripts.entries()) {
        expect(() => new Function(src), `${name} script #${i}`).not.toThrow();
      }
    });
  }
});

/* A page that reloads itself on a falsy-but-truthy result loops for
 * ever. This shipped once: flAdoptEmbedEmail started resolving an
 * object, the hub still tested it as a boolean, and every unlinked
 * visitor to /hub reloaded endlessly. Identity navigation now lives
 * inside flAdoptEmbedEmail — no page may re-implement it. */
describe("no page can loop on identity adoption", () => {
  for (const [name, render] of PAGES) {
    it(`${name} never branches on the adoption result`, () => {
      const html = render();
      const calls = [...html.matchAll(/flAdoptEmbedEmail\([^)]*\)([^;]{0,120})/g)];
      for (const [, tail] of calls) {
        expect(tail, `${name}: adoption result must not be branched on`).not.toMatch(
          /\.then/,
        );
      }
      /* And nothing may reload straight after asking for identity. */
      expect(html, `${name}: unconditional reload after adoption`).not.toMatch(
        /flAdoptEmbedEmail[\s\S]{0,160}?location\.reload\(\)/,
      );
    });
  }
});

describe("every icon a page asks for is one the worker serves", () => {
  /* Each page once linked /favicon.svg, which the worker stopped
   * serving when the icon became a PNG. Every page load then logged a
   * 404 in the console, and a browser that prefers SVG icons had
   * nothing to show. Only /favicon.png and /favicon.ico exist. */
  for (const [name, render] of PAGES.concat(STATIC_PAGES)) {
    it(`${name} links only icons that exist`, () => {
      const icons = [...render().matchAll(/<link rel='icon'[^>]*href='([^']+)'/g)].map((m) => m[1]!);
      for (const href of icons) {
        expect(["/favicon.png", "/favicon.ico"], `${name}: ${href}`).toContain(href.split("?")[0]);
      }
    });
  }
});

describe("white-label: no vendor name in any served page", () => {
  /* Founder law: nothing provider- or learner-facing may name the
   * platform supplier — including view-source (comments in inline
   * scripts ship to the browser too). Regressed once via a code
   * comment in shared page JS (2026-08-29); this pins it. */
  for (const [name, render] of PAGES.concat(STATIC_PAGES)) {
    it(`${name} never mentions the supplier`, () => {
      expect(render()).not.toMatch(/learn\s*_?-?worlds/i);
    });
  }
});
