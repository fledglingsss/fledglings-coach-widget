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
