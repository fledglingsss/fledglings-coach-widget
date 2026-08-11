import { describe, expect, it } from "vitest";

import { extractQuotes, isGrounded, keepGrounded } from "../src/lib/verbatim";

const CV =
  "Served around 60 customers each lunchtime on the till. " +
  "Organised the stockroom so restocking took half the time. " +
  "A-levels: Business, Maths, English. I don't give up easily.";

describe("extractQuotes", () => {
  it("finds double, smart and single quoted spans", () => {
    expect(extractQuotes('You wrote "on the till" nicely.')).toContain("on the till");
    expect(extractQuotes("You wrote “the stockroom” well.")).toContain("the stockroom");
    expect(extractQuotes("Your line 'half the time' is strong.")).toContain(
      "half the time",
    );
  });

  it("does NOT treat an apostrophe inside a word as a quote", () => {
    /* "don't" and "learner's" must not read as opening quotations. */
    expect(extractQuotes("You don't waffle and the learner's tone is warm.")).toEqual(
      [],
    );
  });

  it("ignores quote marks around a trivial fragment", () => {
    expect(extractQuotes('The word "I" appears a lot.')).toEqual([]);
  });

  it("returns nothing for unquoted praise", () => {
    expect(extractQuotes("This is a strong, well-structured CV.")).toEqual([]);
  });
});

describe("isGrounded", () => {
  it("passes praise that quotes the learner verbatim", () => {
    expect(
      isGrounded('You lead with "Served around 60 customers" — great.', CV),
    ).toBe(true);
  });

  it("passes across case, curly quotes and punctuation noise", () => {
    expect(
      isGrounded('“served around 60 customers each lunchtime on the till.”', CV),
    ).toBe(true);
  });

  it("REJECTS praise with no quote at all", () => {
    expect(isGrounded("The pipe separator keeps your headline clean.", CV)).toBe(false);
  });

  it("REJECTS a quote the learner never wrote (fabrication)", () => {
    expect(
      isGrounded('Impressive: "managed a team of twelve at Tesco".', CV),
    ).toBe(false);
  });

  it("matches a genuine single-quoted span from the CV", () => {
    expect(isGrounded("Your phrase 'half the time' shows efficiency.", CV)).toBe(true);
  });

  it("fails closed on empty praise or empty sources", () => {
    expect(isGrounded("", CV)).toBe(false);
    expect(isGrounded('"on the till"')).toBe(false);
    expect(isGrounded('"on the till"', "")).toBe(false);
  });
});

describe("keepGrounded", () => {
  it("keeps grounded praise and counts what it drops", () => {
    const items = [
      'You quantify impact: "Served around 60 customers".',
      "Your headline is punchy and scannable.", // no quote → dropped
      'Genuine training experience: "Organised the stockroom".',
      'Fabricated: "led a department of 30".', // invented → dropped
    ];
    const { kept, dropped } = keepGrounded(items, CV);
    expect(kept).toHaveLength(2);
    expect(dropped).toBe(2);
    expect(kept[0]).toContain("60 customers");
  });

  it("can drop everything, and reports it", () => {
    const { kept, dropped } = keepGrounded(
      ["Nice work.", "Very professional."],
      CV,
    );
    expect(kept).toEqual([]);
    expect(dropped).toBe(2);
  });
});
