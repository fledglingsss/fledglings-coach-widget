/* Turn a pasted CV back into builder sections.
 *
 * The loop the founder asked for is review → edit → review again. The
 * review reads plain text; the builder edits structured sections; and
 * until now the only way from one to the other was retyping. This is
 * the bridge: a deterministic parse of the headings a UK first-jobber
 * actually uses, good enough that the learner lands in the builder
 * with their own words in the right boxes and fixes the odd line,
 * rather than starting from nothing.
 *
 * It is a heuristic and says so - every section it fills is editable,
 * and anything it cannot place goes into "extras" rather than being
 * dropped. No model call; the text is parsed and forgotten. */

import type { BuilderCv, BuilderEducation, BuilderExperience } from "./builder";
import { sanitiseLine } from "./safety";

type Bucket = "summary" | "experience" | "education" | "skills" | "extras";

/* A heading is one of these AND short - "Experience of tills" is a
 * bullet, "Career History" is a heading. */
const HEADINGS: Array<[Bucket, RegExp]> = [
  ["summary", /^(personal\s+)?(profile|summary|statement|about(\s+me)?|objective)\b/i],
  [
    "experience",
    /^(relevant\s+|work\s+|employment\s+|career\s+)?(experience|employment|history|volunteering|placements?|internships?)\b/i,
  ],
  ["education", /^(education|qualifications|academic)\b/i],
  ["skills", /^(key\s+|core\s+|technical\s+)?skills\b/i],
  [
    "extras",
    /^(achievements?|awards?|interests?|hobbies|references?|certificates?|certifications?|additional|other|languages?)\b/i,
  ],
];

/* Whole month words only - "Shopmart 2024" is an employer and a
 * year, not a March date. */
const MONTH = "\\b(?:jan|feb|mar|apr|may|jun|jul|aug|sept?|oct|nov|dec)[a-z]*\\.?\\s*'?\\d{2,4}";
const DATE = `(?:${MONTH}|\\b\\d{1,2}\\/\\d{2,4}|\\b(?:19|20)\\d{2})`;
const RANGE = new RegExp(`(${DATE})\\s*(?:[-–—]|to)\\s*(present|current|now|ongoing|${DATE})\\b`, "i");

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE = /(?:\+\d{1,3}[\s().-]*)?(?:\(?0\)?[\s().-]*)?\d[\d\s().-]{8,14}\d/;
const LINKEDIN = /linkedin\.com\/in\/[A-Za-z0-9%_-]+/i;
const BULLET = /^[-•*◦▪‣›>]\s*/;
/* A line that opens with a verb is a bullet, never the start of a job:
 * "Served 200+ customers", "Trained two starters", "Responsible for". */
const VERB_START =
  /^(\w+ed|responsible|assisted|helped|served|led|ran|won|built|set\s+up|taught|took|made|kept|gave|dealt|drove|sold|wrote|ran)\b/i;
const SEPARATOR = /\s+(?:at|@)\s+|\s*[,|–—]\s*|\s+-\s+/;

const MAX = { lines: 400, entries: 8, bullets: 8, skills: 20, extras: 10 } as const;

function headingOf(line: string): Bucket | null {
  const t = line.replace(/[:\-–—]+$/, "").trim();
  if (t.split(/\s+/).length > 4) return null;
  for (const [bucket, re] of HEADINGS) if (re.test(t)) return bucket;
  return null;
}

function looksLikeName(line: string): boolean {
  const t = line.trim();
  const words = t.split(/\s+/);
  return (
    words.length >= 2 &&
    words.length <= 5 &&
    /^[A-Za-z][A-Za-z'’.-]*(\s+[A-Za-z][A-Za-z'’.-]*)+$/.test(t) &&
    !EMAIL.test(t)
  );
}

/** "IMOGEN HART" becomes "Imogen Hart"; mixed case is left alone. */
function tidyName(raw: string): string {
  if (raw !== raw.toUpperCase()) return raw;
  return raw
    .toLowerCase()
    .replace(/(^|[\s'-])([a-z])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}

function splitRange(line: string): { rest: string; from: string; to: string } {
  const m = RANGE.exec(line);
  if (!m) return { rest: line.trim(), from: "", to: "" };
  const rest = (line.slice(0, m.index) + " " + line.slice(m.index + m[0].length))
    .replace(/[\s,|–—-]+$/g, "")
    .replace(/^[\s,|–—-]+/g, "")
    .trim();
  return { rest, from: m[1]!.trim(), to: m[2]!.trim() };
}

/** "Weekend Team Member, Garden Centre" → role + org. */
function splitRoleOrg(rest: string): { role: string; org: string } {
  const parts = rest.split(SEPARATOR).map((p) => p.trim()).filter(Boolean);
  if (parts.length >= 2) return { role: parts[0]!, org: parts.slice(1).join(", ") };
  return { role: rest.trim(), org: "" };
}

/** Does this line open a new job or course, rather than describe one?
 * It carries dates, or it names two things with a separator and does
 * not read as a bullet; and with nothing open yet, any short line
 * will do. */
function opensEntry(raw: string, line: string, nothingOpen: boolean): boolean {
  if (BULLET.test(raw)) return false;
  if (line.split(/\s+/).length > 12) return false;
  if (VERB_START.test(line)) return false;
  if (RANGE.test(line)) return true;
  if (SEPARATOR.test(line)) return true;
  return nothingOpen;
}

export function textToSeed(text: string): BuilderCv {
  const seed: BuilderCv = {
    name: "",
    phone: "",
    email: "",
    town: "",
    linkedin: "",
    summary: "",
    experience: [],
    education: [],
    skills: [],
    extras: [],
  };
  const lines = text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.trim())
    .slice(0, MAX.lines);

  /* Contact details can sit anywhere near the top. */
  const head = lines.slice(0, 8).join(" \n ");
  seed.email = (EMAIL.exec(head) ?? [""])[0];
  seed.linkedin = (LINKEDIN.exec(head) ?? [""])[0];
  const phone = (PHONE.exec(head.replace(EMAIL, "")) ?? [""])[0].replace(/\s+/g, " ").trim();
  seed.phone = phone.replace(/\D/g, "").length >= 10 ? phone : "";

  let bucket: Bucket | null = null;
  let exp: BuilderExperience | null = null;
  let edu: BuilderEducation | null = null;
  const summary: string[] = [];

  for (const raw of lines) {
    if (!raw) continue;
    if (!seed.name && looksLikeName(raw) && !PHONE.test(raw)) {
      seed.name = tidyName(raw);
      continue;
    }
    const isContactLine =
      EMAIL.test(raw) || LINKEDIN.test(raw) || (PHONE.test(raw) && raw.length < 60 && !/[a-z]{4,}\s[a-z]{4,}/i.test(raw));
    if (isContactLine) continue;
    const h = headingOf(raw);
    if (h) {
      bucket = h;
      exp = null;
      edu = null;
      continue;
    }
    const line = raw.replace(BULLET, "").trim();
    if (!line) continue;
    const sr = splitRange(line);
    const dateOnlyLine = sr.from !== "" && sr.rest === "";

    switch (bucket) {
      case "summary":
        summary.push(line);
        break;
      case "experience": {
        if (exp && dateOnlyLine && !exp.from) {
          exp.from = sr.from;
          exp.to = sr.to;
        } else if (opensEntry(raw, line, exp === null) && seed.experience.length < MAX.entries) {
          const { role, org } = splitRoleOrg(sr.rest);
          exp = {
            role: sanitiseLine(role, 90),
            org: sanitiseLine(org, 90),
            location: "",
            from: sr.from,
            to: sr.to,
            bullets: [],
          };
          seed.experience.push(exp);
        } else if (exp) {
          if (exp.bullets.length < MAX.bullets) exp.bullets.push(sanitiseLine(line, 220));
        } else if (seed.extras.length < MAX.extras) {
          seed.extras.push(sanitiseLine(line, 90));
        }
        break;
      }
      case "education": {
        if (edu && dateOnlyLine && !edu.from) {
          edu.from = sr.from;
          edu.to = sr.to;
        } else if (opensEntry(raw, line, edu === null) && seed.education.length < MAX.entries) {
          const { role: school, org: quals } = splitRoleOrg(sr.rest);
          edu = {
            school: sanitiseLine(school, 90),
            quals: sanitiseLine(quals, 90),
            from: sr.from,
            to: sr.to,
            detail: "",
          };
          seed.education.push(edu);
        } else if (edu) {
          if (!edu.quals) edu.quals = sanitiseLine(line, 90);
          else edu.detail = sanitiseLine((edu.detail ? edu.detail + " " : "") + line, 220);
        }
        break;
      }
      case "skills":
        for (const s of line.split(/\s*[,|•·;]\s*/)) {
          const skill = sanitiseLine(s, 60);
          if (skill && seed.skills.length < MAX.skills) seed.skills.push(skill);
        }
        break;
      case "extras":
        if (seed.extras.length < MAX.extras) seed.extras.push(sanitiseLine(line, 90));
        break;
      default:
        /* Text before any heading: a profile paragraph, most often. */
        if (line.length > 40) summary.push(line);
        else if (seed.extras.length < MAX.extras) seed.extras.push(sanitiseLine(line, 90));
    }
  }
  seed.summary = sanitiseLine(summary.join(" "), 700);
  return seed;
}
