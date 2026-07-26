import { describe, expect, it } from "vitest";

import { assembleCvText, builderScore, sanitiseBuilderCv } from "../src/lib/builder";
import { runCvChecks } from "../src/lib/cv-checks";

const RAW = {
  name: "Sam  Taylor",
  phone: "07123 456789",
  email: "sam@example.com",
  town: "Birmingham",
  linkedin: "linkedin.com/in/samtaylor",
  summary: "Sixth-form student aiming for a retail apprenticeship.",
  experience: [
    {
      role: "Volunteer",
      org: "Oxfam",
      location: "Birmingham",
      from: "Jun 2025",
      to: "Present",
      bullets: [
        "Served 40+ customers per shift on the till",
        "Organised the stockroom, cutting restock time by half",
        "",
      ],
    },
  ],
  education: [
    {
      school: "King Edward VI College",
      quals: "A-levels: Business, Maths, English",
      from: "2024",
      to: "2026",
      detail: "Predicted BBB",
    },
  ],
  skills: ["Till operation", "Customer service", ""],
  extras: ["Duke of Edinburgh Bronze award"],
};

describe("sanitiseBuilderCv", () => {
  it("cleans, collapses whitespace and drops empty items", () => {
    const cv = sanitiseBuilderCv(RAW);
    expect(cv.name).toBe("Sam Taylor");
    expect(cv.experience).toHaveLength(1);
    expect(cv.experience[0]!.bullets).toHaveLength(2);
    expect(cv.skills).toEqual(["Till operation", "Customer service"]);
  });

  it("survives junk input", () => {
    const cv = sanitiseBuilderCv(null);
    expect(cv.experience).toEqual([]);
    expect(assembleCvText(cv)).toBe("");
  });

  it("caps runaway arrays", () => {
    const cv = sanitiseBuilderCv({
      skills: Array.from({ length: 100 }, (_, i) => `skill ${i}`),
      experience: Array.from({ length: 50 }, () => ({ role: "R", org: "O", bullets: [] })),
    });
    expect(cv.skills).toHaveLength(20);
    expect(cv.experience).toHaveLength(8);
  });
});

describe("assembleCvText", () => {
  it("produces headed plain text the recruiter checks can read", () => {
    const text = assembleCvText(sanitiseBuilderCv(RAW));
    expect(text).toContain("SAM TAYLOR");
    expect(text).toContain("PERSONAL STATEMENT");
    expect(text).toContain("WORK & VOLUNTEERING");
    expect(text).toContain("Volunteer — Oxfam");
    expect(text).toContain("- Served 40+ customers per shift on the till");
    expect(text).toContain("EDUCATION");
    expect(text).toContain("SKILLS");
    expect(text).toContain("ACHIEVEMENTS & EXTRAS");
    /* And the checks engine accepts it. */
    const checks = runCvChecks(text, "cv");
    expect(checks.total).toBeGreaterThan(5);
  });
});

describe("builderScore", () => {
  it("scores passes full and warns half, deterministically", () => {
    const checks = runCvChecks(assembleCvText(sanitiseBuilderCv(RAW)), "cv");
    const score = builderScore(checks);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
    expect(builderScore(checks)).toBe(score); // same maths every run
  });
});
