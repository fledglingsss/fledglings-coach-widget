/* The bridge from a reviewed CV back into the builder. A learner
 * should land with their own words in the right boxes — name, contact
 * details, each job with its dates and bullets, their course, their
 * skills — and fix the odd line, not start from nothing. */
import { describe, expect, it } from "vitest";

import { textToSeed } from "../src/lib/cv-import";

const IMOGEN =
  "IMOGEN HART\n07700 900123 | imogen@example.com | linkedin.com/in/imogen-hart-1a2b\n\n" +
  "Career History\nWeekend Team Member, Garden Centre - Sept 24 - present\n" +
  "Served 200+ customers a shift on tills and the plant desk\n" +
  "Responsible for restocking shelves every weekend\n" +
  "Trained two new starters on the till system\n\n" +
  "Education\nLeeds City College - BTEC Business, Sept 23 - present\n\n" +
  "Skills\nTills, rotas, spreadsheets, customer service";

describe("a pasted CV lands in the builder's boxes", () => {
  const seed = textToSeed(IMOGEN);

  it("reads the name and tidies capitals", () => {
    expect(seed.name).toBe("Imogen Hart");
  });

  it("lifts the contact details from the header line", () => {
    expect(seed.email).toBe("imogen@example.com");
    expect(seed.phone).toBe("07700 900123");
    expect(seed.linkedin).toBe("linkedin.com/in/imogen-hart-1a2b");
  });

  it("splits each job into role, employer, dates and bullets", () => {
    expect(seed.experience).toHaveLength(1);
    const job = seed.experience[0]!;
    expect(job.role).toBe("Weekend Team Member");
    expect(job.org).toBe("Garden Centre");
    expect(job.from).toBe("Sept 24");
    expect(job.to.toLowerCase()).toBe("present");
    expect(job.bullets).toEqual([
      "Served 200+ customers a shift on tills and the plant desk",
      "Responsible for restocking shelves every weekend",
      "Trained two new starters on the till system",
    ]);
  });

  it("reads the course and its dates", () => {
    expect(seed.education).toHaveLength(1);
    const ed = seed.education[0]!;
    expect(ed.school).toBe("Leeds City College");
    expect(ed.quals).toBe("BTEC Business");
    expect(ed.from).toBe("Sept 23");
  });

  it("splits skills on commas", () => {
    expect(seed.skills).toEqual(["Tills", "rotas", "spreadsheets", "customer service"]);
  });
});

describe("it copes with the shapes learners actually paste", () => {
  it("takes a profile paragraph before any heading as the summary", () => {
    const seed = textToSeed(
      "Sam Taylor\nsam@example.com\n\nA reliable college student with weekend retail experience, looking for a customer service apprenticeship.\n\nWork Experience\nSales Assistant at Shopmart 2024 - 2025\n- Greeted customers\n",
    );
    expect(seed.summary).toMatch(/reliable college student/);
    expect(seed.experience[0]!.role).toBe("Sales Assistant");
    expect(seed.experience[0]!.org).toBe("Shopmart");
    expect(seed.experience[0]!.from).toBe("2024");
    expect(seed.experience[0]!.bullets).toEqual(["Greeted customers"]);
  });

  it("puts dates on the line after the role where they were written that way", () => {
    const seed = textToSeed(
      "Alex Morgan\n\nEmployment\nVolunteer — Community Shop\nJan 2025 – Present\n• Sorted donations\n• Served on the till\n",
    );
    const job = seed.experience[0]!;
    expect(job.role).toBe("Volunteer");
    expect(job.org).toBe("Community Shop");
    expect(job.from).toBe("Jan 2025");
    expect(job.bullets).toHaveLength(2);
  });

  it("does not mistake a bullet that begins with a heading word for a heading", () => {
    const seed = textToSeed("Jo Bloggs\n\nSkills\nExperience of tills and card payments, teamwork\n");
    expect(seed.skills.length).toBeGreaterThanOrEqual(2);
    expect(seed.experience).toHaveLength(0);
  });

  it("keeps everything it cannot place rather than dropping it", () => {
    const seed = textToSeed("Jo Bloggs\n\nAchievements\nEmployee of the month\nReferences\nAvailable on request\n");
    expect(seed.extras).toEqual(["Employee of the month", "Available on request"]);
  });

  it("never throws on rubbish and stays bounded", () => {
    expect(() => textToSeed("")).not.toThrow();
    const huge = Array.from({ length: 2000 }, (_, i) => `line ${i} with some words in it that go on`).join("\n");
    const seed = textToSeed("Experience\n" + huge);
    expect(seed.experience.length).toBeLessThanOrEqual(8);
  });
});
