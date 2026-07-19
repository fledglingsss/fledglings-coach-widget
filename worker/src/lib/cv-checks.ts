/* Deterministic recruiter checks — the Resume Worded model: objective,
 * rule-based checks a screening system or recruiter applies before a
 * human reads a word. Pure functions, no model call, each finding tied
 * to the evidence that triggered it. The AI review runs alongside;
 * these never disagree with themselves between runs. */

export type CheckStatus = "pass" | "warn" | "fail";

export interface Check {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  evidence?: string;
}

export interface CheckGroup {
  key: "impact" | "style" | "structure";
  label: string;
  items: Check[];
}

export interface ChecksResult {
  passed: number;
  total: number;
  groups: CheckGroup[];
}

/* Weak bullet openers that hide what the person actually did. */
const WEAK_OPENERS =
  /^(assisted|helped|worked on|was responsible for|responsible for|involved in|participated in|tasked with|duties included)\b/i;

const CLICHES = [
  "hard-working team player",
  "hardworking team player",
  "think outside the box",
  "go-getter",
  "works well under pressure",
  "work well under pressure",
  "excellent communication skills",
  "team player",
  "self-starter",
  "results-driven",
  "detail-oriented",
  "passionate individual",
  "dynamic individual",
];

const ACTION_VERBS =
  /^(led|built|created|designed|organised|organized|delivered|improved|increased|reduced|launched|ran|managed|taught|trained|raised|won|achieved|volunteered|founded|set up|coordinated|planned|presented|resolved|handled|served|greeted|maintained|supported)\b/i;

function evidence(line: string): string {
  const t = line.trim();
  return t.length > 90 ? t.slice(0, 87) + "…" : t;
}

/** Lines that look like content (bullets/sentences), not headings. */
function contentLines(text: string): string[] {
  return text
    .split(/\n+/)
    .map((l) => l.replace(/^[-•*◦▪‣]\s*/, "").trim())
    .filter((l) => l.length > 25 && /[a-z]/.test(l));
}

export function runCvChecks(text: string, kind: "cv" | "linkedin"): ChecksResult {
  const lower = text.toLowerCase();
  const lines = contentLines(text);
  const words = text.split(/\s+/).filter(Boolean).length;

  /* ---------- impact ---------- */
  const impact: Check[] = [];

  const quantified = lines.filter((l) => /(\d|%|£)/.test(l)).length;
  const quantRatio = lines.length > 0 ? quantified / lines.length : 0;
  impact.push({
    id: "quantified",
    label: "Numbers that prove impact",
    status: quantRatio >= 0.3 ? "pass" : quantRatio > 0.1 ? "warn" : "fail",
    detail:
      quantRatio >= 0.3
        ? `${quantified} of your ${lines.length} lines carry a number, % or £ — recruiters trust measurable claims.`
        : "Very few lines carry a number, % or £. Even small ones count: how many customers, how often, how long.",
  });

  const weakLines = lines.filter((l) => WEAK_OPENERS.test(l));
  impact.push({
    id: "weak-openers",
    label: "Strong openers (not 'assisted' / 'responsible for')",
    status: weakLines.length === 0 ? "pass" : weakLines.length <= 2 ? "warn" : "fail",
    detail:
      weakLines.length === 0
        ? "No weak openers — your lines lead with what you actually did."
        : `${weakLines.length} line${weakLines.length === 1 ? "" : "s"} open with a weak verb that hides what you did.`,
    evidence: weakLines.length > 0 ? evidence(weakLines[0]!) : undefined,
  });

  const actionLines = lines.filter((l) => ACTION_VERBS.test(l)).length;
  const actionRatio = lines.length > 0 ? actionLines / lines.length : 0;
  impact.push({
    id: "action-verbs",
    label: "Action verbs lead your lines",
    status: actionRatio >= 0.4 ? "pass" : actionRatio >= 0.2 ? "warn" : "fail",
    detail:
      actionRatio >= 0.4
        ? "Most lines start with a doing word — that reads like achievement, not description."
        : "Start more lines with a doing word (organised, delivered, greeted, trained) rather than a description.",
  });

  const passive = lines.filter((l) => /\b(was|were|been)\s+\w+ed\b/i.test(l));
  impact.push({
    id: "passive-voice",
    label: "Active, not passive voice",
    status: passive.length === 0 ? "pass" : passive.length <= 2 ? "warn" : "fail",
    detail:
      passive.length === 0
        ? "No passive constructions — you own your achievements."
        : `${passive.length} line${passive.length === 1 ? "" : "s"} use passive voice ("was given", "were asked") — flip them to what YOU did.`,
    evidence: passive.length > 0 ? evidence(passive[0]!) : undefined,
  });

  /* ---------- brevity & style ---------- */
  const style: Check[] = [];

  const lengthStatus: CheckStatus =
    kind === "cv"
      ? words >= 200 && words <= 700
        ? "pass"
        : words > 700 && words <= 1000
          ? "warn"
          : words < 120
            ? "fail"
            : "warn"
      : words >= 120
        ? "pass"
        : "warn";
  style.push({
    id: "length",
    label: kind === "cv" ? "Right length (one page)" : "Enough substance",
    status: lengthStatus,
    detail:
      kind === "cv"
        ? `${words} words. For a 16–24 CV, 200–700 words (one page) is the sweet spot — recruiters spend under 30 seconds on a first read.`
        : `${words} words across your profile. Thin profiles read as inactive — a few full sentences per section is enough.`,
  });

  const longLines = lines.filter((l) => l.split(/\s+/).length > 32);
  style.push({
    id: "bullet-length",
    label: "Punchy lines (under ~30 words)",
    status: longLines.length === 0 ? "pass" : longLines.length <= 2 ? "warn" : "fail",
    detail:
      longLines.length === 0
        ? "Every line is scannable in one glance."
        : `${longLines.length} line${longLines.length === 1 ? " runs" : "s run"} past 30 words — split them; recruiters skim, they don't read.`,
    evidence: longLines.length > 0 ? evidence(longLines[0]!) : undefined,
  });

  const pronounCount = (lower.match(/\b(i|me|my)\b/g) || []).length;
  style.push({
    id: "pronouns",
    label: kind === "cv" ? "No 'I/me/my' (CV convention)" : "First person is fine here",
    status:
      kind === "linkedin"
        ? "pass"
        : pronounCount === 0
          ? "pass"
          : pronounCount <= 4
            ? "warn"
            : "fail",
    detail:
      kind === "linkedin"
        ? "LinkedIn is written in first person — 'I' is right at home in your About section."
        : pronounCount === 0
          ? "No personal pronouns — standard CV convention held."
          : `'I/me/my' appears ${pronounCount} times — CVs drop pronouns: "Organised the rota", not "I organised the rota".`,
  });

  const foundCliches = CLICHES.filter((c) => lower.includes(c));
  style.push({
    id: "cliches",
    label: "No empty clichés",
    status: foundCliches.length === 0 ? "pass" : foundCliches.length === 1 ? "warn" : "fail",
    detail:
      foundCliches.length === 0
        ? "No 'hard-working team player' filler — every claim can carry evidence instead."
        : `Found: ${foundCliches
            .slice(0, 3)
            .map((c) => `"${c}"`)
            .join(", ")}. Recruiters skip these — swap each for a specific example.`,
  });

  /* ---------- structure & ATS ---------- */
  const structure: Check[] = [];

  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.]+/.test(text);
  const hasPhone = /(\+44|\b0)\d[\d\s]{8,12}\b/.test(text);
  if (kind === "cv") {
    structure.push({
      id: "contact",
      label: "Contact details present",
      status: hasEmail && hasPhone ? "pass" : hasEmail || hasPhone ? "warn" : "fail",
      detail:
        hasEmail && hasPhone
          ? "Email and phone number found — recruiters can reach you."
          : hasEmail
            ? "Email found but no phone number — add one; many recruiters call first."
            : hasPhone
              ? "Phone found but no email address — add a sensible one."
              : "No email or phone detected — without contact details nothing else matters.",
    });
  }

  const sectionWords: Array<[string, RegExp]> =
    kind === "cv"
      ? [
          ["experience or work", /\b(experience|employment|work history|volunteering)\b/i],
          ["education", /\b(education|qualifications|school|college)\b/i],
          ["skills", /\bskills\b/i],
        ]
      : [
          ["headline or summary", /\b(headline|summary|about)\b/i],
          ["experience", /\b(experience|volunteering)\b/i],
          ["education", /\b(education|school|college)\b/i],
        ];
  const missingSections = sectionWords.filter(([, re]) => !re.test(text)).map(([n]) => n);
  structure.push({
    id: "sections",
    label: "Standard sections ATS can find",
    status:
      missingSections.length === 0 ? "pass" : missingSections.length === 1 ? "warn" : "fail",
    detail:
      missingSections.length === 0
        ? "Experience, education and skills all present under recognisable headings."
        : `Could not find: ${missingSections.join(", ")}. Screening software looks for standard headings — use them exactly.`,
  });

  const hasDates = /\b(20\d{2}|19\d{2})\b/.test(text);
  structure.push({
    id: "dates",
    label: "Dates on your history",
    status: hasDates ? "pass" : "warn",
    detail: hasDates
      ? "Years found against your history — recruiters can follow your timeline."
      : "No years detected — add dates to experience and education; gaps are fine, mysteries are not.",
  });

  const capsLines = lines.filter(
    (l) => l.length > 12 && l === l.toUpperCase() && /[A-Z]{4,}/.test(l),
  );
  structure.push({
    id: "no-shouting",
    label: "No all-caps blocks",
    status: capsLines.length === 0 ? "pass" : "warn",
    detail:
      capsLines.length === 0
        ? "No shouting — clean, professional casing throughout."
        : "Whole lines in CAPITALS read as shouting and can confuse screening software — use normal casing with bold headings.",
    evidence: capsLines.length > 0 ? evidence(capsLines[0]!) : undefined,
  });

  const groups: CheckGroup[] = [
    { key: "impact", label: "Impact", items: impact },
    { key: "style", label: "Brevity & style", items: style },
    { key: "structure", label: "Structure & ATS", items: structure },
  ];
  const all = groups.flatMap((g) => g.items);
  return {
    passed: all.filter((c) => c.status === "pass").length,
    total: all.length,
    groups,
  };
}
