/* Exports are opened in Excel on a provider's machine, and every
 * learner-authored field goes into them. A cell that starts a formula
 * is the one way a reflection answer could act on the reader's
 * computer, so the guard is pinned here. */
import { describe, expect, it } from "vitest";

import { csvField } from "../src/index";

describe("csvField", () => {
  it("neutralises every character that starts a spreadsheet formula", () => {
    for (const attack of [
      '=HYPERLINK("http://evil.test","click")',
      "+1+1",
      "-1+1",
      "@SUM(A1)",
      "\tcmd",
    ]) {
      const out = csvField(attack);
      expect(out.startsWith("\"'")).toBe(true);
      /* The text survives intact — it is quarantined, not censored. */
      expect(out).toContain(attack.replace(/"/g, '""'));
    }
  });

  it("leaves ordinary learner text alone", () => {
    expect(csvField("more real life budgeting examples")).toBe(
      '"more real life budgeting examples"',
    );
  });

  it("escapes embedded quotes so the row cannot be broken open", () => {
    expect(csvField('she said "brilliant"')).toBe('"she said ""brilliant"""');
  });

  it("keeps a comma or newline safely inside one cell", () => {
    expect(csvField("clear, practical\nand useful")).toBe('"clear, practical\nand useful"');
  });

  it("renders empty and missing values as an empty cell", () => {
    expect(csvField(null)).toBe('""');
    expect(csvField(undefined)).toBe('""');
    expect(csvField("")).toBe('""');
  });

  it("does not mistake a minus inside text for a formula", () => {
    expect(csvField("well-structured")).toBe('"well-structured"');
  });
});
