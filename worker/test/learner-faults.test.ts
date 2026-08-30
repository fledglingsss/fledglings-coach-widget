/* The faults a learner found, and the ones the same fault class was
 * still causing elsewhere.
 *
 * A tester ran the hub properly and came back with a list. Every item
 * on it was one shape of the same mistake: a rigid pattern deciding
 * something the learner could plainly see was true, and being wrong
 * about it. Being told your CV has no mobile number when it is printed
 * at the top does not read as a bug — it reads as a tool that has not
 * bothered to look.
 *
 * These tests exist because each fix is one regex away from silently
 * reverting. They assert the learner-visible outcome, not the
 * implementation, so a rewrite that keeps the promise still passes. */
import { describe, expect, it } from "vitest";
import { hasPhoneNumber, runCvChecks } from "../src/lib/cv-checks";
import { analyseLinkedInFacts } from "../src/lib/linkedin";

function check(text: string, id: string) {
  const found = runCvChecks(text, "cv")
    .groups.flatMap((g) => g.items)
    .find((c) => c.id === id);
  if (!found) throw new Error(`no check with id "${id}"`);
  return found;
}

const CV = "Work Experience\nTesco\nEducation\nCollege\nSkills\nTills\n";

describe("reported: told they had no mobile number when they did", () => {
  /* The old test was one UK-shaped pattern and missed most real
   * formats, including every international one. */
  const REAL = [
    "+44 7700 900123",
    "07700 900123",
    "07700-900123",
    "(07700) 900123",
    "+44 (0) 7700 900123",
    "+353 86 123 4567",
    "07700900123",
  ];
  for (const number of REAL) {
    it(`finds ${number}`, () => {
      expect(hasPhoneNumber(`Imogen Hart\n${number}\nimogen@example.com`)).toBe(true);
    });
  }

  it("does not mistake dates or postcodes for a phone number", () => {
    expect(hasPhoneNumber("Worked 2019 - 2024 at Tesco, Leeds LS1 4DY")).toBe(false);
  });
});

describe("reported: LinkedIn URL called unreadable when it was fine", () => {
  it("heals a URL the PDF export wrapped mid-slug", () => {
    const facts = analyseLinkedInFacts("Contact\nlinkedin.com/in/imogen-\nhart-1a2b3c\n");
    expect(facts.url.slug).toBe("imogen-hart-1a2b3c");
    expect(facts.url.custom).toBe(true);
  });

  it("heals a space the export left after /in/", () => {
    const facts = analyseLinkedInFacts("Contact\nlinkedin.com/in/ imogen-hart\n");
    expect(facts.url.slug).toBe("imogen-hart");
  });

  it("does not swallow the following section into the slug", () => {
    /* Healing on any whitespace glued the slug to the next heading,
     * which hid the digits that mark an unclaimed URL. */
    const facts = analyseLinkedInFacts("Contact\nlinkedin.com/in/imogen-hart-8a4f21b9\nSummary\nHello");
    expect(facts.url.slug).toBe("imogen-hart-8a4f21b9");
  });

  it("still tells someone their URL is the unclaimed default", () => {
    const facts = analyseLinkedInFacts("Contact\nlinkedin.com/in/imogen-hart-084713926\n");
    expect(facts.url.found).toBe(true);
    expect(facts.url.custom).toBe(false);
  });
});

describe("reported: marked down for dates the PDF export dropped", () => {
  /* "It lowered my score because I didn't put my dates of employment,
   * even though they're on my LinkedIn just not on the pdf." The
   * export drops dates; the roles are still there and still count. */
  it("counts described roles even when the export carries no dates", () => {
    const facts = analyseLinkedInFacts(
      "Experience\nWeekend Team Member\nGarden Centre\n" +
        "Serving customers on tills and restocking shelves every weekend\nEducation\nCollege",
    );
    expect(facts.experienceRanges).toBe(0);
    expect(facts.experienceWords).toBeGreaterThanOrEqual(12);
  });

  it("still zeroes a profile with no experience section at all", () => {
    const facts = analyseLinkedInFacts("Contact\nlinkedin.com/in/a-b\nEducation\nCollege");
    expect(facts.experienceWords).toBe(0);
  });
});

/* ---------- found by asking where else the same class bites ---------- */

describe("same class: sections a learner can see are present", () => {
  const HEADINGS: Array<[string, string]> = [
    ["Career History", "Career History\nTesco\nEducation\nCollege\nSkills\nTills"],
    ["Employment History", "Employment History\nTesco\nEducation\nCollege\nSkills\nTills"],
    ["Relevant Experience", "Relevant Experience\nTesco\nQualifications\nBTEC\nSkills\nTills"],
    ["WORK EXPERIENCE in caps", "WORK EXPERIENCE\nTesco\nEDUCATION\nCollege\nSKILLS\nTills"],
  ];
  for (const [label, text] of HEADINGS) {
    it(`accepts "${label}" as a work section`, () => {
      expect(check(text, "sections").status).toBe("pass");
    });
  }
});

describe("same class: dates a learner can see are present", () => {
  const DATED: Array<[string, string]> = [
    ["full years", "Tesco 2024 - 2025"],
    ["month and short year", "Tesco Sept 24 - present"],
    ["slash format", "Tesco 09/2024 - 06/2025"],
    ["abbreviated month", "Tesco Jan 2024 - Dec 2024"],
  ];
  for (const [label, tail] of DATED) {
    it(`finds dates written as ${label}`, () => {
      expect(check(CV + tail, "dates").status).toBe("pass");
    });
  }

  it("still says so when there are genuinely no dates", () => {
    expect(check(CV + "Tesco, shop floor assistant", "dates").status).toBe("warn");
  });
});

describe("same class: the all-caps check was inert, so everyone passed", () => {
  /* It read a line list filtered to lines containing a lowercase
   * letter, so an all-caps line could never reach it. An unearned
   * green tick is the same dishonesty as an undeserved red cross. */
  it("flags a whole sentence in capitals", () => {
    const text = CV + "I AM A VERY HARDWORKING AND RELIABLE PERSON ALWAYS";
    expect(check(text, "no-shouting").status).toBe("warn");
  });

  it("leaves ordinary capitalised headings alone", () => {
    expect(check("WORK EXPERIENCE\nTesco, Leeds\nEDUCATION\nLeeds City College", "no-shouting").status).toBe(
      "pass",
    );
  });

  it("leaves a name in capitals alone", () => {
    expect(check("IMOGEN HART\nLeeds\nWork Experience\nTesco", "no-shouting").status).toBe("pass");
  });
});

describe("tightened: words that merely start with a month are not dates", () => {
  /* The first fix matched any month stem plus trailing letters, so
   * "Junior 12" and "Marketing 24" counted as dates — the unearned
   * green tick again, from the other side. */
  const NOT_DATES: Array<[string, string]> = [
    ["Junior + number", "Junior 12-a-side football captain"],
    ["Marketing + number", "Marketing 24 campaign project"],
    ["score out of ten", "Rated 24/70 in the regional final"],
  ];
  for (const [label, tail] of NOT_DATES) {
    it(`does not read "${label}" as a date`, () => {
      expect(check(CV + tail, "dates").status).toBe("warn");
    });
  }

  it("still reads real month-year forms as dates", () => {
    for (const tail of ["Tesco Sept 24 - present", "Tesco September 2024", "Tesco Sep. 24 onwards"]) {
      expect(check(CV + tail, "dates").status).toBe("pass");
    }
  });
});
