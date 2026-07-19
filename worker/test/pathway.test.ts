import { describe, expect, it } from "vitest";

import {
  AREAS,
  FOCUSES,
  STAGES,
  allPathwayTitles,
  computePathway,
  validAnswers,
  type Area,
  type Stage,
} from "../src/lib/pathway";
import { COURSE_MAP } from "../src/lib/course-map";

/* The catalogue as scraped from fledglings.co/module-breakdowns. */
const CATALOGUE = new Set([
  "What is Online Safety",
  "Cybersecurity Fundamentals",
  "Understanding Online Identity & Reputation",
  "Toxic Online Culture & Group Chats",
  "Digital Well-being & Time Online",
  "Online Scams, Fraud & Money Safety",
  "What They Are & How to Build Them",
  "Building Real Confidence (Even When You Feel None)",
  "Resilience in Practice — Pressure, Setbacks & Bounce-Back Plans",
  "Communicating Under Pressure: Calm Voice, Clear Steps, Trusted Results",
  "Grit & Growth — Motivation That Lasts (Goals, Habits, Accountability)",
  "Handling Change & Uncertainty — Adaptability You Can Trust",
  "Assertive Boundaries — Saying No Well & Protecting Your Focus",
  "Feedback, Reviews & Continuous Growth",
  "Money Confidence & Everyday Decisions",
  "Budgeting that Actually Works",
  "Credit, Borrowing & Your Score",
  "Saving, Emergency Funds & Building a Safety Net",
  "Pay, Payslips, and Planning for Tax & NI",
  "Smart Spending: Big Purchases, Contracts & Consumer Rights",
  "Living Independently — Housing & Household Bills",
  "Introduction to Employability Skills",
  "Communication That Builds Trust",
  "Teamwork & Collaboration",
  "Problem Solving & Decision Making",
  "Professionalism, Reliability & Time Management",
  "Interviews, CVs & Early Career Mindset",
  "Debt Traps and Payday Loans",
  "Preparing for an Interview",
  "First Time Renting & Housing Rights",
  "Managing Nerves",
  "AI in the Workplace",
  "Managing Stress & Burnout",
  "Boosting Confidence before an Interview",
  "How to Use AI",
  "What is Safeguarding",
]);

function everyCombination(): Array<{ stage: Stage; area: Area; focus: string }> {
  const combos: Array<{ stage: Stage; area: Area; focus: string }> = [];
  for (const stage of STAGES) {
    for (const area of AREAS) {
      for (const focus of FOCUSES[area]) {
        combos.push({ stage, area, focus });
      }
    }
  }
  return combos;
}

describe("computePathway", () => {
  it("every combination yields 2-3 modules, all real catalogue titles, no duplicates", () => {
    for (const combo of everyCombination()) {
      const recs = computePathway(combo);
      expect(recs.length, JSON.stringify(combo)).toBeGreaterThanOrEqual(2);
      expect(recs.length, JSON.stringify(combo)).toBeLessThanOrEqual(3);
      const titles = recs.map((r) => r.title);
      expect(new Set(titles).size).toBe(titles.length);
      for (const rec of recs) {
        expect(CATALOGUE.has(rec.title), `${rec.title} (${JSON.stringify(combo)})`).toBe(true);
        expect(rec.why.length).toBeGreaterThan(10);
      }
    }
  });

  it("is deterministic", () => {
    const a = computePathway({ stage: "college", area: "money", focus: "saving" });
    const b = computePathway({ stage: "college", area: "money", focus: "saving" });
    expect(a).toEqual(b);
  });

  it("school and college learners get the area foundation first", () => {
    const recs = computePathway({ stage: "school", area: "online", focus: "scams" });
    expect(recs[0].title).toBe("What is Online Safety");
    const conf = computePathway({ stage: "college", area: "confidence", focus: "motivation" });
    expect(conf[0].title).toBe("What They Are & How to Build Them");
  });

  it("apprentices worried about day-to-day money get the payslip module", () => {
    const recs = computePathway({
      stage: "apprenticeship",
      area: "money",
      focus: "day_to_day",
    });
    expect(recs.map((r) => r.title)).toContain(
      "Pay, Payslips, and Planning for Tax & NI",
    );
  });

  it("job hunters get the interview-focused stack", () => {
    const recs = computePathway({ stage: "looking", area: "work", focus: "get_hired" });
    expect(recs.map((r) => r.title)).toEqual([
      "Interviews, CVs & Early Career Mindset",
      "Preparing for an Interview",
      "Boosting Confidence before an Interview",
    ]);
  });
});

describe("validAnswers", () => {
  it("accepts every real combination", () => {
    for (const combo of everyCombination()) {
      expect(validAnswers(combo)).toEqual(combo);
    }
  });

  it("rejects anything outside the closed sets", () => {
    expect(validAnswers({ stage: "uni", area: "money", focus: "day_to_day" })).toBeNull();
    expect(validAnswers({ stage: "school", area: "crypto", focus: "day_to_day" })).toBeNull();
    expect(validAnswers({ stage: "school", area: "money", focus: "yolo" })).toBeNull();
    /* focus must belong to ITS area, not another one */
    expect(validAnswers({ stage: "school", area: "money", focus: "scams" })).toBeNull();
    expect(validAnswers({})).toBeNull();
  });
});

describe("course map", () => {
  it("covers exactly the titles the pathway engine can emit", () => {
    const emittable = new Set(allPathwayTitles());
    for (const key of Object.keys(COURSE_MAP)) {
      expect(emittable.has(key), `course-map key not emittable: ${key}`).toBe(true);
    }
    for (const title of emittable) {
      expect(title in COURSE_MAP, `missing from course-map: ${title}`).toBe(true);
    }
  });
});
