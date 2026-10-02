/* Faults a browser showed in the October 2026 full QA, pinned at the
 * level the unit tests can reach: the HTML, CSS and script each page
 * serves. The visual walks (scripts/vqa-*.mjs) are what found them and
 * what proves the fixes on a real screen; these stop them coming back
 * quietly between walks. */
import { describe, expect, it } from "vitest";

import { renderBuilderPage } from "../src/pages-builder";
import { renderCoverLetterPage } from "../src/pages-cover-letter";
import { renderDemoPage } from "../src/pages-demo";
import { renderInterviewPage } from "../src/pages-interview";
import { renderLibraryPage } from "../src/pages-library";
import { renderLinkedInPage } from "../src/pages-linkedin";
import { renderOutreachPage } from "../src/pages-outreach";
import { renderToolsPage } from "../src/pages";

/** Every rule in a page's stylesheet as [selector, declarations]. Media
 * blocks are flattened: the rules inside one are listed like any other. */
function cssRules(html: string): Array<[string, string]> {
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) ?? ["", ""])[1]!.replace(/\/\*[\s\S]*?\*\//g, "");
  const rules: Array<[string, string]> = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const selector = m[1]!.replace(/^[^{}]*@media[^{]*$/, "").trim();
    rules.push([selector.replace(/\s+/g, " "), m[2]!.trim()]);
  }
  return rules;
}

/** The print stylesheet of a page: everything inside its @media print
 * blocks, comments removed. */
function printCss(html: string): string {
  const css = (html.match(/<style>([\s\S]*?)<\/style>/) ?? ["", ""])[1]!.replace(/\/\*[\s\S]*?\*\//g, "");
  let out = "";
  let from = 0;
  for (;;) {
    const at = css.indexOf("@media print", from);
    if (at === -1) break;
    let depth = 0;
    let i = css.indexOf("{", at);
    const start = i + 1;
    for (; i < css.length; i++) {
      if (css[i] === "{") depth++;
      else if (css[i] === "}" && --depth === 0) break;
    }
    out += css.slice(start, i) + "\n";
    from = i + 1;
  }
  return out;
}

describe("Resume Builder: what the label 'ATS-safe' depends on", () => {
  const html = renderBuilderPage();
  const rules = cssRules(html);
  const print = printCss(html);

  it("tracks no CV heading wide enough for a parser to read it letter by letter", () => {
    /* A reader calls a gap of about a tenth of an em a space. The
     * Classic design's .22em printed "EDUCATION" as nine words. */
    const tracked = rules
      .filter(([sel]) => /h4/.test(sel) && /cp-sec|cvpaper/.test(sel))
      .map(([sel, body]) => [sel, body.match(/letter-spacing:\s*(-?[\d.]+)em/)] as const)
      .filter(([, hit]) => hit !== null);
    expect(tracked.length).toBeGreaterThan(0);
    for (const [sel, hit] of tracked) {
      expect(Number(hit![1]), `${sel} is tracked at ${hit![1]}em`).toBeLessThanOrEqual(0.05);
    }
  });

  it("positions nothing on the CV paper, so the PDF's text is stored in reading order", () => {
    /* A positioned box is painted after everything that is not, and a
     * PDF stores text in paint order: with the entries positioned, all
     * six designs wrote every heading first and the jobs last. */
    const positioned = rules.filter(
      ([sel, body]) => /\.cp-(?!mono)|\.cvpaper/.test(sel) && /position:\s*(relative|absolute)/.test(body),
    );
    expect(positioned.map(([sel]) => sel)).toEqual([]);
  });

  it("prints none of the editor's furniture", () => {
    for (const control of [".mk", ".ctl", ".addline", ".ilb"]) {
      expect(print, `${control} must be hidden on paper`).toMatch(
        new RegExp(`${control.replace(".", "\\.")}[^{}]*\\{display:none!important`),
      );
    }
  });

  it("prints nothing that has no words in it", () => {
    expect(print).toMatch(/\.cvpaper \.is-empty\{display:none!important/);
    /* and the script keeps that class in step with the document */
    expect(html).toContain("function markEmpties()");
    expect(html).toMatch(/addEventListener\('input',function\(ev\)\{[^}]*markEmpties\(\)/);
  });

  it("prints a bullet point with a bullet", () => {
    expect(print).toMatch(/\.sec-work li::before\{content:'•'/);
  });

  it("prints no focus or hover highlight on a line", () => {
    expect(print).toMatch(/\[contenteditable\]\{background:none!important;box-shadow:none!important/);
  });

  it("prints the two-column designs as a single flow, with page padding", () => {
    expect(print).toMatch(/\.cvpaper\.sidebar\{padding:8mm 6mm!important/);
    expect(print).toMatch(/\.cvpaper\.sidebar \.cp-cols\{display:block!important/);
    expect(print).toMatch(/\.cvpaper\.compact \.cp-sec:not\(\.is-empty\)\{display:block!important/);
  });

  it("tells the learner which designs re-flow when downloaded, and no longer claims they all print as shown", () => {
    expect(html).not.toMatch(/shown exactly as they print/);
    const notes = [...html.matchAll(/\{id:'(\w+)',label:'[^']+',ats:true,blurb:'[^']*',\s*note:'/g)].map((m) => m[1]);
    expect(notes.sort()).toEqual(["compact", "modern", "sidebar"]);
  });

  it("draws the Monogram's initials as a picture on paper, so the first line a parser reads is the name", () => {
    expect(print).toMatch(/\.cp-mono\.has-pic \.mono-t\{display:none!important/);
    expect(html).toContain("function monoPicture()");
  });

  it("styles the dates in a role row, not the job title beside them", () => {
    const selectors = rules.map(([sel]) => sel);
    expect(selectors).toContain(".cp-row>span");
    expect(selectors).not.toContain(".cp-row span");
  });

  it("applies the Classic serif to the words, not just the sheet they sit on", () => {
    const classic = rules.find(([sel]) => sel.includes(".cvpaper.classic :not(button)"));
    expect(classic?.[1]).toMatch(/Georgia/);
  });
});

describe("Resume Builder: what is typed is what is saved", () => {
  const html = renderBuilderPage();
  /* The shipped function, lifted out of the page and run as it is. */
  const source = html.slice(html.indexOf("var NBSP="), html.indexOf("function writeBind("));
  const fieldText = new Function(`${source}; return fieldText;`)() as (
    el: { innerText: string },
    multi: boolean,
  ) => string;

  it("keeps two achievements typed on two lines as two lines", () => {
    /* The prompt says "one per line". Read with textContent they were
     * saved as "First aid certificateEmployee of the month". */
    expect(fieldText({ innerText: "First aid certificate\nEmployee of the month\n" }, true)).toBe(
      "First aid certificate\nEmployee of the month",
    );
  });

  it("joins a pasted line break in a one-line field with a space, never nothing", () => {
    expect(fieldText({ innerText: "Weekend Team\nMember" }, false)).toBe("Weekend Team Member");
  });

  it("turns the non-breaking space a browser leaves after a typed space into an ordinary one", () => {
    const nbsp = String.fromCharCode(160);
    expect(fieldText({ innerText: `Served customers${nbsp}` }, false)).toBe("Served customers ");
    expect(fieldText({ innerText: `Tills,${nbsp}rotas` }, true)).toBe("Tills, rotas");
  });

  it("reads the words with innerText, which sees a line break as one", () => {
    expect(source).toContain("el.innerText");
  });
});

describe("Resume Builder on a phone", () => {
  const rules = cssRules(renderBuilderPage());
  const css = (renderBuilderPage().match(/<style>([\s\S]*?)<\/style>/) ?? ["", ""])[1]!;

  it("does not pin the toolbar over the CV", () => {
    /* It was sticky at every width: 268px of an 812px screen, for good. */
    const phone = css.slice(css.indexOf("@media(max-width:700px){\n  .buildbar"));
    expect(phone.slice(0, 200)).toMatch(/\.buildbar\{position:static/);
  });

  it("puts the CV before the review, and keeps the score one tap away", () => {
    expect(rules.some(([sel, body]) => sel === ".doccol" && /order:-1/.test(body))).toBe(true);
    expect(renderBuilderPage()).toContain("id='bb-score'");
  });
});

describe("upload steps: Back is not inside the drop zone", () => {
  /* The whole zone is one "choose a file" button. With Back inside it,
   * pressing Back went back AND opened the file picker. */
  for (const [name, render, back] of [
    ["CV review", renderToolsPage, "cv-b2"],
    ["LinkedIn", renderLinkedInPage, "li-b2"],
  ] as const) {
    it(`${name}: the zone has closed before the Back button`, () => {
      const html = render();
      /* from inside the zone's opening tag to the row that holds Back */
      const row = html.lastIndexOf("<div", html.indexOf(`id='${back}'`));
      const zone = html.slice(html.indexOf("id='drop'"), row);
      /* one more close than open: the zone's own closing tag */
      const opens = (zone.match(/<div/g) ?? []).length;
      const closes = (zone.match(/<\/div>/g) ?? []).length;
      expect(closes - opens, `${name}: Back is still inside the drop zone`).toBe(1);
    });
  }

  it("the builder hand-off points at the box that is actually below it", () => {
    const html = renderToolsPage();
    expect(html).toContain("Add a target role in the box below first");
    expect(html).not.toContain("Add a target role above first");
  });
});

describe("shared pieces are styled wherever they are used", () => {
  /* .kw-note and .ns-label were defined in the CV review's stylesheet
   * and used on three other pages, where they fell back to body text. */
  for (const [name, render] of [
    ["tools", renderToolsPage],
    ["linkedin", renderLinkedInPage],
    ["interview", renderInterviewPage],
    ["cover-letter", renderCoverLetterPage],
  ] as const) {
    it(`${name} has a rule for every shared class it uses`, () => {
      const html = render();
      const selectors = cssRules(html).map(([sel]) => sel);
      for (const cls of ["kw-note", "ns-label"]) {
        if (!html.includes(`class='${cls}`) && !html.includes(` ${cls}'`)) continue;
        expect(selectors.some((sel) => sel.split(",").some((s) => s.trim() === `.${cls}`)), `${name}: .${cls}`).toBe(true);
      }
    });
  }

  it("the cover letter's Classic design is serif on the words too", () => {
    const rule = cssRules(renderCoverLetterPage()).find(([sel]) => sel.includes(".letterpaper.classic *"));
    expect(rule?.[1]).toMatch(/Georgia/);
  });
});

describe("every field a learner types into has a name a screen reader can say", () => {
  for (const [name, render] of [
    ["tools", renderToolsPage],
    ["linkedin", renderLinkedInPage],
    ["interview", renderInterviewPage],
    ["cover-letter", renderCoverLetterPage],
  ] as const) {
    it(name, () => {
      const html = render();
      const fields = [...html.matchAll(/<(textarea|input)\b([^>]*)>/g)].filter(
        ([, tag, attrs]) => tag === "textarea" || /type='(text|email|tel)'/.test(attrs!),
      );
      expect(fields.length).toBeGreaterThan(0);
      for (const [whole, , attrs] of fields) {
        const id = (attrs!.match(/\bid='([^']+)'/) ?? [])[1];
        const labelled = /aria-label='/.test(attrs!) || (id !== undefined && html.includes(`<label for='${id}'`));
        expect(labelled, `${name}: ${whole.slice(0, 60)}`).toBe(true);
      }
    });
  }
});

describe("Interview Studio", () => {
  const html = renderInterviewPage();

  it("has something to say on the Speech and presence tab when nothing was measured", () => {
    /* Typed answers have no pace and no camera. Both cards stayed
     * hidden and the tab opened onto an empty page. */
    expect(html).toContain("id='dl-none'");
    expect(html).toContain("nothing was marked down for it");
    expect(html).toMatch(/deliveryNone\(!r\.speech&&!r\.presence/);
  });

  it("says how many questions were answered in plain order", () => {
    expect(html).toContain("' questions answered'");
    expect(html).not.toContain("' answered of '");
  });

  it("gives a small phone a frame the countdown fits in, and a recording bar that stays on one line", () => {
    const css = (html.match(/<style>([\s\S]*?)<\/style>/) ?? ["", ""])[1]!;
    const small = css.slice(css.indexOf("@media(max-width:480px){\n  .vidwrap video"));
    expect(small.slice(0, 400)).toMatch(/aspect-ratio:4\/3/);
    expect(small.slice(0, 700)).toMatch(/\.rec-w\{display:none/);
    expect(cssRules(html).find(([sel]) => sel === ".recbar")?.[1]).toMatch(/white-space:nowrap/);
  });
});

describe("the demo page", () => {
  const html = renderDemoPage(null);

  it("keeps each staff feature's label and sentence together as one run of text", () => {
    /* Loose in a flex row they were separate columns: on a phone the
     * bold label stacked a word per line beside a strip of text. */
    const items = [...html.matchAll(/<li><i>[^<]*<\/i>([\s\S]*?)<\/li>/g)].map((m) => m[1]!);
    expect(items.length).toBe(5);
    for (const item of items) expect(item).toMatch(/^<span><b>[^<]+<\/b> - [^<]+<\/span>$/);
  });
});

describe("My work", () => {
  const html = renderLibraryPage();

  it("shows no ring at all for a document that is never scored", () => {
    expect(html).not.toContain("lib-noscore");
  });

  it("writes scores on colours they can be read against", () => {
    /* white on #F59E0B is 2.1 to 1 */
    expect(html).not.toContain("#F59E0B");
  });
});

describe("Templates and scripts", () => {
  it("grows a text box with what is typed in it", () => {
    const html = renderOutreachPage();
    expect(html).toContain("function fit(el)");
    expect(html).toMatch(/querySelectorAll\('textarea'\)\.forEach\(fit\)/);
  });
});
