/* Resume Builder — pure logic. The builder page keeps everything in
 * the learner's browser (localStorage); the worker only ever sees the
 * structured sections when the learner asks for a check, assembles
 * them into the canonical plain text, runs the deterministic recruiter
 * checks over it, and forgets it. No model call, nothing stored. */

import { sanitiseLine, sanitiseText } from "./safety";
import type { ChecksResult } from "./cv-checks";

export interface BuilderExperience {
  role: string;
  org: string;
  location: string;
  from: string;
  to: string;
  bullets: string[];
}

export interface BuilderEducation {
  school: string;
  quals: string;
  from: string;
  to: string;
  detail: string;
}

export interface BuilderCv {
  name: string;
  phone: string;
  email: string;
  town: string;
  linkedin: string;
  summary: string;
  experience: BuilderExperience[];
  education: BuilderEducation[];
  skills: string[];
  extras: string[];
}

const LIMITS = {
  line: 90,
  summary: 700,
  bullet: 220,
  bulletsPerEntry: 8,
  entries: 8,
  skills: 20,
  extras: 10,
} as const;

function lineList(raw: unknown, maxItems: number, maxLen: number): string[] {
  return (Array.isArray(raw) ? raw : [])
    .map((s) => sanitiseLine(s, maxLen))
    .filter((s) => s.length > 0)
    .slice(0, maxItems);
}

/** Bound and clean whatever the client sent into a safe BuilderCv. */
export function sanitiseBuilderCv(raw: unknown): BuilderCv {
  const r = (typeof raw === "object" && raw !== null ? raw : {}) as Record<
    string,
    unknown
  >;
  const experience = (Array.isArray(r.experience) ? r.experience : [])
    .slice(0, LIMITS.entries)
    .map((e) => {
      const x = (typeof e === "object" && e !== null ? e : {}) as Record<
        string,
        unknown
      >;
      return {
        role: sanitiseLine(x.role, LIMITS.line),
        org: sanitiseLine(x.org, LIMITS.line),
        location: sanitiseLine(x.location, LIMITS.line),
        from: sanitiseLine(x.from, 20),
        to: sanitiseLine(x.to, 20),
        bullets: lineList(x.bullets, LIMITS.bulletsPerEntry, LIMITS.bullet),
      };
    })
    .filter((e) => e.role || e.org || e.bullets.length > 0);
  const education = (Array.isArray(r.education) ? r.education : [])
    .slice(0, LIMITS.entries)
    .map((e) => {
      const x = (typeof e === "object" && e !== null ? e : {}) as Record<
        string,
        unknown
      >;
      return {
        school: sanitiseLine(x.school, LIMITS.line),
        quals: sanitiseLine(x.quals, 200),
        from: sanitiseLine(x.from, 20),
        to: sanitiseLine(x.to, 20),
        detail: sanitiseText(x.detail, 400),
      };
    })
    .filter((e) => e.school || e.quals);
  return {
    name: sanitiseLine(r.name, LIMITS.line),
    phone: sanitiseLine(r.phone, 30),
    email: sanitiseLine(r.email, 80),
    town: sanitiseLine(r.town, LIMITS.line),
    linkedin: sanitiseLine(r.linkedin, 120),
    summary: sanitiseText(r.summary, LIMITS.summary),
    experience,
    education,
    skills: lineList(r.skills, LIMITS.skills, 40),
    extras: lineList(r.extras, LIMITS.extras, LIMITS.bullet),
  };
}

/** Canonical plain-text CV — the exact text the recruiter checks (and
 * the full AI review, if the learner sends it on) will read. */
export function assembleCvText(cv: BuilderCv): string {
  const parts: string[] = [];
  if (cv.name) parts.push(cv.name.toUpperCase());
  const contact = [cv.town, cv.phone, cv.email, cv.linkedin]
    .filter(Boolean)
    .join(" · ");
  if (contact) parts.push(contact);
  if (cv.summary) parts.push("\nPERSONAL STATEMENT\n" + cv.summary);
  if (cv.experience.length) {
    const entries = cv.experience.map((e) => {
      const head = [e.role, e.org].filter(Boolean).join(" — ");
      const where = [e.location, [e.from, e.to].filter(Boolean).join(" to ")]
        .filter(Boolean)
        .join(", ");
      return [head, where, ...e.bullets.map((b) => `- ${b}`)]
        .filter(Boolean)
        .join("\n");
    });
    parts.push("\nWORK & VOLUNTEERING\n" + entries.join("\n\n"));
  }
  if (cv.education.length) {
    const entries = cv.education.map((e) => {
      const head = [e.school, [e.from, e.to].filter(Boolean).join(" to ")]
        .filter(Boolean)
        .join(" — ");
      return [head, e.quals, e.detail].filter(Boolean).join("\n");
    });
    parts.push("\nEDUCATION\n" + entries.join("\n\n"));
  }
  if (cv.skills.length) parts.push("\nSKILLS\n" + cv.skills.join(", "));
  if (cv.extras.length) {
    parts.push("\nACHIEVEMENTS & EXTRAS\n" + cv.extras.map((x) => `- ${x}`).join("\n"));
  }
  return parts.join("\n").trim();
}

/** Builder score out of 100 from the deterministic checks: a pass is
 * full marks for its check, a warn is half. Same maths every run. */
export function builderScore(checks: ChecksResult): number {
  if (checks.total === 0) return 0;
  const warns = checks.groups
    .flatMap((g) => g.items)
    .filter((i) => i.status === "warn").length;
  return Math.round(((checks.passed + warns * 0.5) / checks.total) * 100);
}

/* ------------------------------------------------------------------
 * Category review — the recruiter checks re-shaped into the weighted,
 * per-category format of the reference design's review sidebar:
 * Contact Info /5, Reverse Chronology /10, Structure /15, ATS
 * Compatibility /20, Brevity /10, Bullet Analysis /40 — summing to
 * 100 so the total IS the builder score. Deterministic: same CV, same
 * numbers, every single run.
 * ------------------------------------------------------------------ */

export type CategoryState = "good" | "warn" | "bad";

export interface CategoryItem {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  evidence?: string;
}

export interface ReviewCategory {
  id: string;
  label: string;
  score: number;
  max: number;
  state: CategoryState;
  items: CategoryItem[];
}

export interface CategoryReview {
  total: number;
  categories: ReviewCategory[];
}

function checkById(checks: ChecksResult, id: string): CategoryItem | null {
  for (const g of checks.groups) {
    for (const i of g.items) {
      if (i.id === id) return { label: i.label, status: i.status, detail: i.detail, evidence: i.evidence };
    }
  }
  return null;
}

function fractionOf(items: CategoryItem[]): number {
  if (items.length === 0) return 0;
  const points = items.reduce(
    (s, i) => s + (i.status === "pass" ? 1 : i.status === "warn" ? 0.5 : 0),
    0,
  );
  return points / items.length;
}

function stateOf(score: number, max: number): CategoryState {
  const pct = max > 0 ? score / max : 0;
  return pct >= 0.75 ? "good" : pct >= 0.45 ? "warn" : "bad";
}

function firstYear(text: string): number | null {
  const m = /(19|20)\d{2}/.exec(text);
  return m ? parseInt(m[0], 10) : null;
}

/** Reverse chronology from the structured entries: most recent role
 * first. Unparseable dates are a warn, never a fail. */
export function chronologyItem(cv: BuilderCv): CategoryItem {
  const years = cv.experience
    .map((e) => firstYear(e.from) ?? firstYear(e.to))
    .filter((y): y is number => y !== null);
  if (cv.experience.length <= 1) {
    return {
      label: "Reverse chronology (newest first)",
      status: "pass",
      detail: "With a single entry there is nothing out of order — as you add roles, keep the newest at the top.",
    };
  }
  if (years.length < cv.experience.length) {
    return {
      label: "Reverse chronology (newest first)",
      status: "warn",
      detail: "Some entries have no readable year, so the order can't be fully checked — use formats like 'Jun 2025'.",
    };
  }
  const ordered = years.every((y, i) => i === 0 || y <= years[i - 1]!);
  return ordered
    ? {
        label: "Reverse chronology (newest first)",
        status: "pass",
        detail: "Your most recent role leads — exactly the order recruiters expect.",
      }
    : {
        label: "Reverse chronology (newest first)",
        status: "fail",
        detail: "Your roles are not newest-first. Recruiters read the top entry hardest — reorder so the most recent leads.",
      };
}

/** Contact completeness from the structured fields. */
export function contactItems(cv: BuilderCv): CategoryItem[] {
  const field = (ok: boolean, label: string, detail: string): CategoryItem => ({
    label,
    status: ok ? "pass" : "fail",
    detail,
  });
  return [
    field(cv.name.length > 1, "Name", cv.name ? "Present." : "Add your full name — it is the headline of the page."),
    field(
      /@/.test(cv.email),
      "Email address",
      /@/.test(cv.email) ? "Present." : "Add an email — a sensible one, not a joke address from Year 8.",
    ),
    field(
      cv.phone.replace(/\D/g, "").length >= 10,
      "Phone number",
      cv.phone ? "Present." : "Add a phone number — many recruiters call first.",
    ),
    field(cv.town.length > 1, "Town / city", cv.town ? "Present." : "Add your town — local roles filter by it."),
  ];
}

/** Section structure from the structured fields. */
export function structureItems(cv: BuilderCv): CategoryItem[] {
  const has = (ok: boolean, label: string, missing: string): CategoryItem => ({
    label,
    status: ok ? "pass" : "fail",
    detail: ok ? "Present." : missing,
  });
  return [
    has(cv.summary.length >= 40, "Personal statement", "Two or three lines about who you are and where you're heading."),
    has(
      cv.experience.some((e) => e.bullets.length > 0),
      "Work & volunteering with bullet points",
      "At least one entry with bullets — school events and volunteering count.",
    ),
    has(cv.education.length > 0, "Education", "Add your school or college with your qualifications."),
    has(cv.skills.length >= 3, "Skills (3 or more)", "List at least three specific skills."),
  ];
}

/** The full category review over structured data + text checks. */
export function buildCategoryReview(cv: BuilderCv, checks: ChecksResult): CategoryReview {
  const pick = (ids: string[]): CategoryItem[] =>
    ids.map((id) => checkById(checks, id)).filter((i): i is CategoryItem => i !== null);

  const defs: Array<{ id: string; label: string; max: number; items: CategoryItem[] }> = [
    { id: "contact", label: "Contact info", max: 5, items: contactItems(cv) },
    { id: "chronology", label: "Reverse chronology", max: 10, items: [chronologyItem(cv)] },
    { id: "structure", label: "Structure", max: 15, items: structureItems(cv) },
    { id: "ats", label: "ATS compatibility", max: 20, items: pick(["sections", "dates", "no-shouting", "cliches"]) },
    { id: "brevity", label: "Brevity", max: 10, items: pick(["length", "bullet-length"]) },
    {
      id: "bullets",
      label: "Bullet analysis",
      max: 40,
      items: pick(["quantified", "action-verbs", "weak-openers", "passive-voice", "pronouns"]),
    },
  ];

  const categories = defs.map((d) => {
    const score = Math.round(fractionOf(d.items) * d.max);
    return { id: d.id, label: d.label, score, max: d.max, state: stateOf(score, d.max), items: d.items };
  });
  return {
    total: categories.reduce((s, c) => s + c.score, 0),
    categories,
  };
}

/* ------------------------------------------------------------------
 * ATS-ready starters — pick one, then make every line true about YOU.
 *
 * These are teaching scaffolds, not content to submit: every employer
 * and school name carries the EXAMPLE_MARKER, and the builder shows a
 * warning until all example content has been replaced. The bullets
 * demonstrate the standard the recruiter checks reward — action verb
 * first, a number that proves scale, under ~30 words — so the learner
 * starts from a CV that scores well and learns the pattern by
 * replacing it with their own truth. No-fabrication law upheld: the
 * scaffold teaches the shape; the learner supplies the facts.
 * ------------------------------------------------------------------ */

export const EXAMPLE_MARKER = "(example)";

export interface CvStarter {
  id: string;
  label: string;
  blurb: string;
  data: BuilderCv;
}

const EDU_EXAMPLE: BuilderEducation = {
  school: `Your school or college ${EXAMPLE_MARKER}`,
  quals: "GCSEs: English (6), Maths (5) — 8 subjects",
  from: "2021",
  to: "2026",
  detail: "Add anything notable: prefect, sports team, attendance award",
};

export const CV_STARTERS: CvStarter[] = [
  {
    id: "retail",
    label: "Retail & customer service",
    blurb: "Tills, shop floor, weekend jobs — shows customer impact with numbers.",
    data: {
      name: "",
      phone: "",
      email: "",
      town: "",
      linkedin: "",
      summary:
        "Customer-focused [college student / school leaver] with [1 year] serving customers in a busy shop, aiming for [the role you want]. Known for staying calm at peak times and turning complaints into thank-yous.",
      experience: [
        {
          role: "Sales Assistant",
          org: `Highstreet Store ${EXAMPLE_MARKER}`,
          location: "Your town",
          from: "Jun 2025",
          to: "Present",
          bullets: [
            "Served 60+ customers per shift on the till, keeping queue waits under 4 minutes at peak",
            "Resolved 5-10 customer queries a day, escalating only 1 in 10 to a manager",
            "Organised weekly deliveries of 30+ boxes, keeping the stockroom audit-ready",
          ],
        },
      ],
      education: [EDU_EXAMPLE],
      skills: ["Till operation", "Card & cash handling", "Stock rotation", "Complaint handling"],
      extras: ["Won employee of the month after 8 weeks (example — replace with yours)"],
    },
  },
  {
    id: "warehouse",
    label: "Warehouse & logistics",
    blurb: "Picking, packing, safety — the practical language adverts scan for.",
    data: {
      name: "",
      phone: "",
      email: "",
      town: "",
      linkedin: "",
      summary:
        "Reliable [school leaver / college student] aiming for a warehouse operative role. Comfortable with physical, fast-paced work and following safety procedures exactly — [add one real proof, e.g. never missed a shift].",
      experience: [
        {
          role: "Picker / General Assistant",
          org: `Local Depot ${EXAMPLE_MARKER}`,
          location: "Your town",
          from: "Mar 2025",
          to: "Present",
          bullets: [
            "Picked and packed 150+ items per shift, scanning each against the order sheet with 99% accuracy",
            "Maintained clear walkways and safe stacking across a 20-aisle floor, following manual handling training",
            "Delivered every timed dispatch target for 6 months straight",
          ],
        },
      ],
      education: [EDU_EXAMPLE],
      skills: ["Picking & packing", "Manual handling awareness", "Scanner operation", "Timed targets"],
      extras: ["Completed a manual handling awareness course (example — replace with yours)"],
    },
  },
  {
    id: "office",
    label: "Office & admin",
    blurb: "Organisation, accuracy and systems — for admin apprenticeships.",
    data: {
      name: "",
      phone: "",
      email: "",
      town: "",
      linkedin: "",
      summary:
        "Organised [college student] aiming for a business administration apprenticeship. Strong on accuracy and follow-through — [add one real proof, e.g. ran the sign-up sheet for a whole term].",
      experience: [
        {
          role: "Office Assistant (work experience)",
          org: `Local Company ${EXAMPLE_MARKER}`,
          location: "Your town",
          from: "Jul 2025",
          to: "Aug 2025",
          bullets: [
            "Organised 200+ customer records into a consistent spreadsheet format, fixing 40 duplicates",
            "Handled 15-20 incoming calls a day, taking messages and routing them to the right person",
            "Created a shared filing checklist adopted by the whole 6-person office",
          ],
        },
      ],
      education: [EDU_EXAMPLE],
      skills: ["Microsoft Word & Excel", "Data entry", "Telephone manner", "Diary management"],
      extras: ["Ran the ticketing spreadsheet for the school show (example — replace with yours)"],
    },
  },
  {
    id: "hospitality",
    label: "Hospitality",
    blurb: "Cafés, kitchens, front of house — pace and service under pressure.",
    data: {
      name: "",
      phone: "",
      email: "",
      town: "",
      linkedin: "",
      summary:
        "Energetic [school leaver] aiming for a hospitality role. Thrives in busy services and keeps standards up when it's slammed — [add one real proof, e.g. worked every Saturday for a year].",
      experience: [
        {
          role: "Front of House / Team Member",
          org: `Riverside Café ${EXAMPLE_MARKER}`,
          location: "Your town",
          from: "Sep 2025",
          to: "Present",
          bullets: [
            "Served 40+ covers per service, taking orders accurately and clearing within 3 minutes of guests leaving",
            "Prepared 25+ hot drinks an hour at peak while keeping the counter spotless",
            "Trained 2 new starters on the till and food hygiene basics",
          ],
        },
      ],
      education: [EDU_EXAMPLE],
      skills: ["Food hygiene basics", "Till & card payments", "Table service", "Allergen awareness"],
      extras: ["Level 2 Food Hygiene certificate (example — replace with yours)"],
    },
  },
  {
    id: "care",
    label: "Care & support",
    blurb: "Patience, reliability and safeguarding awareness, evidenced properly.",
    data: {
      name: "",
      phone: "",
      email: "",
      town: "",
      linkedin: "",
      summary:
        "Patient and dependable [college student] aiming for a care assistant role. Experienced in supporting people who need extra time and attention — [add one real proof, e.g. helps care for a family member].",
      experience: [
        {
          role: "Volunteer Befriender",
          org: `Community Centre ${EXAMPLE_MARKER}`,
          location: "Your town",
          from: "Jan 2025",
          to: "Present",
          bullets: [
            "Supported 6 older visitors each week with conversation, games and refreshments over 40+ sessions",
            "Planned a weekly quiz that doubled regular attendance from 8 to 16 people",
            "Reported wellbeing concerns promptly to the session leader, following safeguarding guidance",
          ],
        },
      ],
      education: [EDU_EXAMPLE],
      skills: ["Active listening", "Safeguarding awareness", "Reliability", "Basic first aid"],
      extras: ["St John Ambulance first aid course (example — replace with yours)"],
    },
  },
  {
    id: "first-cv",
    label: "My first CV (no work history)",
    blurb: "School, volunteering and projects count — proof without a payslip.",
    data: {
      name: "",
      phone: "",
      email: "",
      town: "",
      linkedin: "",
      summary:
        "[Year 11 / college] student writing a first CV, aiming for [a part-time job / an apprenticeship in …]. No paid work yet — plenty of proof: [pick your best example from below].",
      experience: [
        {
          role: "Volunteer",
          org: `School Summer Fair ${EXAMPLE_MARKER}`,
          location: "Your school",
          from: "Jul 2025",
          to: "Jul 2025",
          bullets: [
            "Ran a stall serving 100+ visitors across the day, handling cash and keeping a float balanced to the penny",
            "Set up and packed down the pitch with a team of 4, finishing 20 minutes ahead of schedule",
          ],
        },
        {
          role: "Team Captain",
          org: `Local Football Club ${EXAMPLE_MARKER}`,
          location: "Your town",
          from: "Sep 2024",
          to: "Present",
          bullets: [
            "Organised weekly training for a squad of 14, planning drills and chasing availability",
            "Led the side to 3rd place from 9th the season before",
          ],
        },
      ],
      education: [EDU_EXAMPLE],
      skills: ["Teamwork", "Cash handling", "Punctuality", "Organising people"],
      extras: ["Duke of Edinburgh Bronze award (example — replace with yours)"],
    },
  },
];

/** True while any example-scaffold content is still in the CV. */
export function containsExampleContent(cv: BuilderCv): boolean {
  return JSON.stringify(cv).toLowerCase().includes("example");
}
