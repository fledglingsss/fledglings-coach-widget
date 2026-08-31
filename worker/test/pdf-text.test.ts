/* How a PDF becomes text decides what every judgement downstream
 * sees. If the structure is flattened here, a well-organised CV
 * arrives looking like a wall of text and the learner is marked down
 * for formatting they actually got right — so the stitching is pinned
 * by tests rather than trusted. */
import { describe, expect, it } from "vitest";
import { makeAssembler, PDF_TEXT_JS, type PdfTextItem } from "../src/lib/pdf-text";

/* The function under test is built from the exact source the pages
 * are served, so a bundler helper leaking into it fails here first. */
const assemblePageText = makeAssembler();

/** A text run at a baseline, the shape pdf.js hands back — including
 * the x position and advance width, which is how a real word gap is
 * told apart from a run that continues the previous word. Each glyph
 * is treated as 5 units wide. */
const W = 5;
function run(str: string, y: number, x = 0, hasEOL = false): PdfTextItem {
  return { str, hasEOL, transform: [1, 0, 0, 1, x, y], width: str.length * W };
}
/** The x at which a run following `prev` would start with no gap. */
function after(prev: PdfTextItem): number {
  return (prev.transform?.[4] ?? 0) + (prev.width ?? 0);
}

describe("assembling lines from positioned runs", () => {
  it("joins separate words on the same line with a space", () => {
    const a = run("Weekend Team Member,", 700, 0);
    const b = run("Garden Centre", 700, after(a) + 4);
    expect(assemblePageText([a, b])).toBe("Weekend Team Member, Garden Centre");
  });

  it("does not split a word that pdf.js split mid-run", () => {
    /* "Custo" + "mer" must not become "Custo mer". The runs are
     * touching on the page, which is the evidence that they are one
     * word — PDFs split kerned text like this constantly. */
    const a = run("Custo", 700, 0);
    const b = run("mer service", 700, after(a));
    expect(assemblePageText([a, b])).toBe("Customer service");
  });

  it("starts a new line when the baseline drops", () => {
    const text = assemblePageText([run("Work Experience", 700), run("Tesco, Leeds", 686)]);
    expect(text).toBe("Work Experience\nTesco, Leeds");
  });

  it("ignores the baseline jitter of superscripts and inline symbols", () => {
    /* A 2-unit shift is a raised character, not a new line. The old
     * rule broke the line here and turned one bullet into two. */
    const a = run("Served 200", 700, 0);
    const b = run("+", 702, after(a));
    const c = run(" customers a shift", 700, after(b));
    expect(assemblePageText([a, b, c])).toBe("Served 200+ customers a shift");
  });

  it("honours the end-of-line flag even when the baseline has not moved", () => {
    const text = assemblePageText([
      run("Skills", 700, 0, true),
      run("Tills, rotas", 700, 0),
    ]);
    expect(text).toBe("Skills\nTills, rotas");
  });
});

describe("keeping the gaps that separate sections", () => {
  it("emits a blank line where the document left real space", () => {
    /* Normal step 14; the gap before "Education" is 40 — that is the
     * document saying "new section", and flattening it to a single
     * newline is how a structured CV starts reading as a wall. */
    const text = assemblePageText([
      run("Work Experience", 700),
      run("Tesco, Leeds", 686),
      run("Served customers on tills", 672),
      run("Education", 632),
      run("Leeds City College", 618),
    ]);
    expect(text).toBe(
      "Work Experience\nTesco, Leeds\nServed customers on tills\n\nEducation\nLeeds City College",
    );
  });

  it("does not invent paragraph breaks in evenly spaced text", () => {
    const text = assemblePageText([
      run("One", 700),
      run("Two", 686),
      run("Three", 672),
      run("Four", 658),
    ]);
    expect(text).toBe("One\nTwo\nThree\nFour");
  });

  it("keeps bullet characters at the start of their line", () => {
    const b1 = run("•", 700, 0);
    const t1 = run("Trained two new starters", 700, after(b1) + 4);
    const b2 = run("•", 686, 0);
    const t2 = run("Handled cash and card payments", 686, after(b2) + 4);
    expect(assemblePageText([b1, t1, b2, t2])).toBe(
      "• Trained two new starters\n• Handled cash and card payments",
    );
  });
});

describe("degenerate input", () => {
  it("returns an empty string for no items", () => {
    expect(assemblePageText([])).toBe("");
  });

  it("survives items with no text and no transform", () => {
    const text = assemblePageText([
      { str: "Real line", transform: [1, 0, 0, 1, 0, 700] },
      { str: "" },
      {} as PdfTextItem,
    ]);
    expect(text).toBe("Real line");
  });

  it("drops runs that are only whitespace rather than emitting blank lines", () => {
    const text = assemblePageText([run("Skills", 700), run("   ", 686), run("Tills", 672)]);
    expect(text).toBe("Skills\nTills");
  });
});

describe("the source we actually serve", () => {
  it("carries no bundler helpers that only exist inside the worker", () => {
    /* `fn.toString()` on a compiled function returns source wrapped in
     * __name() for stack traces. That helper does not exist on the
     * page, so the served script threw on the first real upload while
     * every unit test passed. */
    expect(PDF_TEXT_JS).not.toContain("__name");
    expect(PDF_TEXT_JS).not.toContain("@__PURE__");
  });

  it("evaluates in a bare scope, as the browser will", () => {
    const fn = makeAssembler();
    expect(typeof fn).toBe("function");
    expect(fn([{ str: "Hello", transform: [1, 0, 0, 1, 0, 700] }])).toBe("Hello");
  });
});
