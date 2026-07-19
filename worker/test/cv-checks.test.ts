import { describe, expect, it } from "vitest";

import { runCvChecks } from "../src/lib/cv-checks";

const STRONG_CV = `
Alex Smith
alex.smith@example.com · 07700 900123

Experience
- Led a team of 4 volunteers at the community centre, greeting 50+ visitors a week
- Organised the rota for 12 staff, reducing missed shifts by 30%
- Delivered till service handling £2,000 a day during 2024

Education
GCSEs including English and Maths, finished 2025

Skills
Communication, spreadsheets, customer service
`;

const WEAK_CV = `
I am a hard-working team player and I think outside the box.
Assisted with various tasks and was responsible for helping customers whenever they came in and also I was given other duties by the manager which included lots of different things that I did every single day without fail no matter what happened.
Worked on stuff.
`;

function find(result: ReturnType<typeof runCvChecks>, id: string) {
  const check = result.groups.flatMap((g) => g.items).find((c) => c.id === id);
  if (!check) throw new Error(`check ${id} missing`);
  return check;
}

describe("runCvChecks", () => {
  it("passes a strong CV on the impact and structure checks", () => {
    const r = runCvChecks(STRONG_CV, "cv");
    expect(find(r, "quantified").status).toBe("pass");
    expect(find(r, "weak-openers").status).toBe("pass");
    expect(find(r, "action-verbs").status).toBe("pass");
    expect(find(r, "contact").status).toBe("pass");
    expect(find(r, "sections").status).toBe("pass");
    expect(find(r, "dates").status).toBe("pass");
    expect(find(r, "cliches").status).toBe("pass");
    expect(r.passed).toBeGreaterThanOrEqual(8);
  });

  it("fails a weak CV with evidence attached", () => {
    const r = runCvChecks(WEAK_CV, "cv");
    expect(find(r, "quantified").status).toBe("fail");
    const weak = find(r, "weak-openers");
    expect(weak.status).not.toBe("pass");
    expect(weak.evidence).toContain("Assisted");
    expect(find(r, "cliches").status).toBe("fail");
    expect(find(r, "pronouns").status).not.toBe("pass");
    expect(find(r, "bullet-length").status).not.toBe("pass");
    expect(find(r, "contact").status).toBe("fail");
  });

  it("treats first person as fine on LinkedIn and skips contact check", () => {
    const r = runCvChecks(WEAK_CV, "linkedin");
    expect(find(r, "pronouns").status).toBe("pass");
    expect(r.groups.flatMap((g) => g.items).some((c) => c.id === "contact")).toBe(false);
  });

  it("counts totals consistently", () => {
    const r = runCvChecks(STRONG_CV, "cv");
    expect(r.total).toBe(r.groups.flatMap((g) => g.items).length);
    expect(r.passed).toBeLessThanOrEqual(r.total);
  });
});
