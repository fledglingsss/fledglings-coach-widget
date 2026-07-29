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
import { renderAiPrivacyPage, renderToolsPage } from "../src/pages";

const PAGES: Array<[string, () => string]> = [
  ["hub", renderHubPage],
  ["interview", renderInterviewPage],
  ["linkedin", renderLinkedInPage],
  ["cover-letter", renderCoverLetterPage],
  ["builder", renderBuilderPage],
  ["tools", renderToolsPage],
  ["ai-privacy", renderAiPrivacyPage],
];

function inlineScripts(html: string): string[] {
  const out: string[] = [];
  const re = /<script>([\s\S]*?)<\/script>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) out.push(m[1]!);
  return out;
}

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
