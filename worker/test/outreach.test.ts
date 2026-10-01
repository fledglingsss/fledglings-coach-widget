/* Templates and scripts are authored content that learners copy
 * straight into an email to an employer. A broken token, a stray
 * bracket or a doubled full stop is not a cosmetic bug here - it goes
 * out under a sixteen-year-old's name. These tests fill every template
 * with realistic details, using the very code the page ships, and
 * check what comes out is fit to send. */
import { describe, expect, it } from "vitest";

import {
  LINKEDIN_NOTE_LIMIT,
  OUTREACH_FIELDS,
  OUTREACH_FILL_JS,
  OUTREACH_GUIDES,
  OUTREACH_SAFETY,
  OUTREACH_TEMPLATES,
  templateTokens,
} from "../src/lib/outreach";
import type { OutreachTemplate } from "../src/lib/outreach";
import { APP_NAV } from "../src/pages";
import { renderHubPage } from "../src/pages-hub";
import { renderOutreachPage } from "../src/pages-outreach";

interface Part {
  t: "text" | "fill" | "blank";
  v: string;
  f?: string;
}
interface FillApi {
  flOutClean(v: unknown, kind: string): string;
  flOutParts(text: string, values: Record<string, string>, fields: unknown): Part[];
  flOutText(parts: Part[]): string;
  flOutBlanks(parts: Part[]): number;
}

/* The exact source the browser runs - not a re-implementation. */
const fill = new Function(
  OUTREACH_FILL_JS +
    ";return {flOutClean:flOutClean,flOutParts:flOutParts,flOutText:flOutText,flOutBlanks:flOutBlanks};",
)() as FillApi;

const EXAMPLES: Record<string, string> = Object.fromEntries(
  Object.entries(OUTREACH_FIELDS).map(([id, f]) => [id, f.example]),
);

function render(text: string, values: Record<string, string> = EXAMPLES): string {
  return fill.flOutText(fill.flOutParts(text, values, OUTREACH_FIELDS));
}

/** Every piece of text a template can put in front of an employer. */
function allText(t: OutreachTemplate): string[] {
  return [
    t.subject ?? "",
    t.body ?? "",
    ...(t.script ?? []).map((l) => l.x),
    ...(t.branches ?? []).map((b) => b.reply),
  ].filter((s) => s.length > 0);
}

describe("the library covers what the tester asked for", () => {
  it("has emails, phone calls and networking, with real range in each", () => {
    const by = (c: string) => OUTREACH_TEMPLATES.filter((t) => t.channel === c).length;
    expect(by("email")).toBeGreaterThanOrEqual(8);
    expect(by("call")).toBeGreaterThanOrEqual(4);
    expect(by("network")).toBeGreaterThanOrEqual(4);
    expect(OUTREACH_GUIDES.map((g) => g.channel).sort()).toEqual(["call", "email", "network"]);
  });

  it("includes a cold call and a cold email, the two named in the feedback", () => {
    const ids = OUTREACH_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("cold-call");
    expect(ids).toContain("speculative");
  });

  it("gives every template a unique, linkable id", () => {
    const ids = OUTREACH_TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z]+(-[a-z]+)*$/);
  });
});

describe("every template is well formed", () => {
  for (const t of OUTREACH_TEMPLATES) {
    describe(t.id, () => {
      it("is either a message or a script, never both or neither", () => {
        expect(Boolean(t.body) !== Boolean(t.script)).toBe(true);
        if (t.script) expect(t.script.some((l) => l.k === "say")).toBe(true);
      });

      it("an email always has a subject line", () => {
        if (t.channel === "email") expect(t.subject, "emails need a subject").toBeTruthy();
      });

      it("declares exactly the details it uses", () => {
        const used = templateTokens(t).sort();
        const declared = [...t.fields].sort();
        expect(used).toEqual(declared);
        for (const id of t.fields) expect(OUTREACH_FIELDS).toHaveProperty(id);
      });

      it("explains when to use it and how to make it land", () => {
        expect(t.when.length).toBeGreaterThan(20);
        expect(t.tips.length).toBeGreaterThanOrEqual(2);
        expect(t.tips.length).toBeLessThanOrEqual(4);
      });

      it("never puts its own punctuation after a whole-sentence detail", () => {
        const sentenceFields = Object.entries(OUTREACH_FIELDS)
          .filter(([, f]) => f.kind === "sentence")
          .map(([id]) => id);
        for (const text of allText(t)) {
          for (const id of sentenceFields) {
            expect(text).not.toMatch(new RegExp(`\\{${id}\\}[.,;:!?]`));
          }
        }
      });

      it("reads cleanly once the learner's details are in", () => {
        for (const text of allText(t)) {
          const out = render(text);
          expect(out, "unfilled token").not.toMatch(/\{[a-zA-Z]+\}/);
          expect(out, "blank left with every detail given").not.toContain("[");
          expect(out, "doubled punctuation").not.toMatch(/\.\.|,,|\s,|\s\.|,\.|\?\./);
          expect(out, "doubled space").not.toMatch(/[^\n] {2,}/);
        }
      });

      it("points somewhere real", () => {
        if (!t.link) return;
        if (t.link.href.startsWith("#")) {
          expect(OUTREACH_TEMPLATES.map((x) => x.id)).toContain(t.link.href.slice(1));
        } else {
          expect(["/interview", "/cover-letter", "/linkedin", "/tools", "/builder"]).toContain(t.link.href);
        }
      });
    });
  }
});

describe("fit to send", () => {
  it("keeps every email within the 150 words its own guide asks for", () => {
    for (const t of OUTREACH_TEMPLATES.filter((x) => x.body && x.subject)) {
      const words = render(t.body!).split(/\s+/).filter(Boolean).length;
      expect(words, `${t.id} is ${words} words`).toBeLessThanOrEqual(150);
    }
  });

  it("keeps the LinkedIn note inside LinkedIn's limit", () => {
    const note = OUTREACH_TEMPLATES.find((t) => t.id === "linkedin-connect")!;
    expect(note.limit).toBe(LINKEDIN_NOTE_LIMIT);
    expect(render(note.body!).length).toBeLessThanOrEqual(LINKEDIN_NOTE_LIMIT);
  });

  it("contains no em or en dashes, anywhere a learner will read", () => {
    const everything = JSON.stringify([OUTREACH_TEMPLATES, OUTREACH_GUIDES, OUTREACH_SAFETY, OUTREACH_FIELDS]);
    expect(everything).not.toMatch(/[–—]/);
  });

  it("never names the platform supplier", () => {
    const everything = JSON.stringify([OUTREACH_TEMPLATES, OUTREACH_GUIDES, OUTREACH_SAFETY, OUTREACH_FIELDS]);
    expect(everything).not.toMatch(/learn\s*_?-?worlds/i);
  });
});

describe("filling in, as the browser does it", () => {
  const speculative = OUTREACH_TEMPLATES.find((t) => t.id === "speculative")!;

  it("marks what is missing in brackets and counts each detail once", () => {
    const parts = fill.flOutParts(speculative.body!, {}, OUTREACH_FIELDS);
    const text = fill.flOutText(parts);
    expect(text).toContain("Dear [Their name],");
    expect(text).toContain("[Your phone number]");
    /* yourName appears once in the body; every declared detail is one blank */
    expect(fill.flOutBlanks(parts)).toBe(new Set(templateTokens({ ...speculative, subject: "" })).size);
  });

  it("counts a detail used twice as one thing to add", () => {
    const voicemail = OUTREACH_TEMPLATES.find((t) => t.id === "voicemail")!;
    const line = voicemail.script!.find((l) => l.x.includes("That's"))!;
    expect(fill.flOutBlanks(fill.flOutParts(line.x, {}, OUTREACH_FIELDS))).toBe(1);
  });

  it("fits a phrase into the sentence around it", () => {
    /* typed with a capital and a full stop, as people do */
    expect(render("I'm {yourStatus}, and", { yourStatus: "A Year 12 student." })).toBe(
      "I'm a Year 12 student, and",
    );
    expect(render("I'm free {availability}.", { availability: "At weekends." })).toBe("I'm free at weekends.");
    expect(render("for {theirHelp}.", { theirHelp: "Talking me through it" })).toBe("for talking me through it.");
  });

  it("never lower-cases a name, a day or a place", () => {
    expect(render("on {appliedDate},", { appliedDate: "Monday 3 March" })).toBe("on Monday 3 March,");
    expect(render("I'm {yourStatus}.", { yourStatus: "Reading College student" })).toBe(
      "I'm Reading College student.",
    );
    expect(render("Unfortunately {reason}, so", { reason: "I have an exam" })).toBe(
      "Unfortunately I have an exam, so",
    );
    expect(render("Dear {theirName},", { theirName: "Ms Khan" })).toBe("Dear Ms Khan,");
  });

  it("starts a sentence with a capital, whatever was typed", () => {
    expect(render("Hello.\n\n{proof}, and I'd", { proof: "i run the tuck shop" })).toBe(
      "Hello.\n\nI run the tuck shop, and I'd",
    );
  });

  it("turns a whole-sentence detail into a whole sentence", () => {
    expect(fill.flOutClean("my tutor suggested I get in touch", "sentence")).toBe(
      "My tutor suggested I get in touch.",
    );
    expect(fill.flOutClean("Is that all right?", "sentence")).toBe("Is that all right?");
    expect(render("{mutual} I'm here", { mutual: "  my tutor   suggested it  " })).toBe(
      "My tutor suggested it. I'm here",
    );
  });

  it("treats a detail that is only spaces as not given", () => {
    expect(render("Dear {theirName},", { theirName: "   " })).toBe("Dear [Their name],");
  });
});

describe("safety notes", () => {
  it("say never to pay, and where to report a scam", () => {
    const text = JSON.stringify(OUTREACH_SAFETY);
    expect(text).toMatch(/Never pay/);
    expect(OUTREACH_SAFETY.report.href).toBe("https://www.jobsaware.co.uk/report");
    expect(OUTREACH_SAFETY.points.length).toBeGreaterThanOrEqual(5);
  });
});

describe("the page and the ways in to it", () => {
  const html = renderOutreachPage();

  it("ships every template to the browser intact", () => {
    const m = /var FL_OUT=(.*?);<\/script>/s.exec(html);
    expect(m).not.toBeNull();
    const data = JSON.parse(m![1]!) as { templates: unknown[]; fields: Record<string, unknown> };
    expect(data.templates.length).toBe(OUTREACH_TEMPLATES.length);
    expect(Object.keys(data.fields).sort()).toEqual(Object.keys(OUTREACH_FIELDS).sort());
  });

  it("says plainly that nothing typed there is sent anywhere", () => {
    expect(html).toContain("never sent to Fledglings");
    /* and the page has no way to send it: no fetch, no form */
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((x) => x[1]!);
    const app = scripts[scripts.length - 1]!;
    expect(app).not.toMatch(/fetch\(|XMLHttpRequest|sendBeacon/);
    expect(html).not.toMatch(/<form/i);
  });

  it("is in the sidebar and on the hub", () => {
    expect(APP_NAV.map((n) => n.href)).toContain("/templates");
    const hub = renderHubPage();
    expect(hub).toContain("href='/templates'");
    expect(hub).toContain(`${OUTREACH_TEMPLATES.length} real`);
  });
});

describe("hub wording (tester feedback)", () => {
  const hub = renderHubPage();
  it("calls the checklist a to-do list, not an order", () => {
    expect(hub).toContain("Your to-do list");
    expect(hub).not.toMatch(/Your seven tasks/i);
    expect(hub).toContain("in any order");
  });
});
