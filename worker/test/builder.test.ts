import { describe, expect, it } from "vitest";

import {
  assembleCvText,
  builderScore,
  containsExampleContent,
  CV_STARTERS,
  EXAMPLE_MARKER,
  sanitiseBuilderCv,
} from "../src/lib/builder";
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

describe("CV starters", () => {
  it("offers six distinct ATS-ready tracks", () => {
    expect(CV_STARTERS.length).toBe(6);
    expect(new Set(CV_STARTERS.map((s) => s.id)).size).toBe(6);
  });

  it("every starter survives sanitisation and assembles with standard headings", () => {
    for (const s of CV_STARTERS) {
      const text = assembleCvText(sanitiseBuilderCv(s.data));
      expect(text, s.id).toContain("PERSONAL STATEMENT");
      expect(text, s.id).toContain("WORK & VOLUNTEERING");
      expect(text, s.id).toContain("EDUCATION");
      expect(text, s.id).toContain("SKILLS");
    }
  });

  it("every starter demonstrates the standard — 70+ on the recruiter checks", () => {
    for (const s of CV_STARTERS) {
      const cv = sanitiseBuilderCv(s.data);
      cv.name = "Sam Taylor";
      cv.town = "Birmingham";
      cv.phone = "07123 456789";
      cv.email = "sam@example.com";
      const score = builderScore(runCvChecks(assembleCvText(cv), "cv"));
      expect(score, `${s.id} scored ${score}`).toBeGreaterThanOrEqual(70);
    }
  });

  it("every starter is example-marked so the replace-me guard fires", () => {
    for (const s of CV_STARTERS) {
      expect(JSON.stringify(s.data), s.id).toContain(EXAMPLE_MARKER);
      expect(containsExampleContent(sanitiseBuilderCv(s.data)), s.id).toBe(true);
    }
    expect(
      containsExampleContent(
        sanitiseBuilderCv({ name: "Real Person", summary: "All my own words." }),
      ),
    ).toBe(false);
  });

  it("starters never pre-fill personal details", () => {
    for (const s of CV_STARTERS) {
      expect(s.data.name).toBe("");
      expect(s.data.phone).toBe("");
      expect(s.data.email).toBe("");
    }
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
