/* The adaptive pathway engine — pure and deterministic.
 *
 * Three closed-set answers in (stage, area, focus) -> an ordered list
 * of 2-3 modules from the live Fledglings catalogue, foundations
 * first, with a one-line "why" each. No model in the loop: the same
 * answers always produce the same pathway, and every title is pinned
 * to the catalogue by tests.
 */

export const STAGES = [
  "school",
  "college",
  "apprenticeship",
  "first_job",
  "looking",
] as const;
export type Stage = (typeof STAGES)[number];

export const AREAS = ["money", "work", "confidence", "online"] as const;
export type Area = (typeof AREAS)[number];

export const FOCUSES: Record<Area, readonly string[]> = {
  money: ["day_to_day", "credit_debt", "saving", "independent_living"],
  work: ["get_hired", "do_well", "ai_tools"],
  confidence: ["build", "pressure", "boundaries", "motivation"],
  online: ["scams", "footprint", "toxic_chats", "wellbeing"],
};

export interface PathwayAnswers {
  stage: Stage;
  area: Area;
  focus: string;
}

export interface Recommendation {
  title: string;
  why: string;
}

/* One-line rationale per module (exact catalogue titles). */
const WHY: Record<string, string> = {
  "Money Confidence & Everyday Decisions":
    "builds the calm foundation everything else sits on",
  "Budgeting that Actually Works":
    "tackles day-to-day spending head on",
  "Credit, Borrowing & Your Score":
    "explains credit and borrowing before they bite",
  "Saving, Emergency Funds & Building a Safety Net":
    "gets a safety net started, even on a small wage",
  "Pay, Payslips, and Planning for Tax & NI":
    "makes sense of what you earn and what gets deducted",
  "Smart Spending: Big Purchases, Contracts & Consumer Rights":
    "covers contracts, big buys and your rights",
  "Living Independently — Housing & Household Bills":
    "the essentials of running your own place",
  "First Time Renting & Housing Rights":
    "a 30-minute deep dive on renting your first home",
  "Debt Traps and Payday Loans":
    "a 30-minute deep dive on spotting debt traps early",
  "Introduction to Employability Skills":
    "the foundation for everything work-related",
  "Communication That Builds Trust":
    "the skill employers mention most",
  "Teamwork & Collaboration":
    "how to be someone people want on their team",
  "Problem Solving & Decision Making":
    "thinking on your feet when it matters",
  "Professionalism, Reliability & Time Management":
    "the habits that get you kept on and promoted",
  "Interviews, CVs & Early Career Mindset":
    "the full toolkit for landing the role",
  "Preparing for an Interview":
    "a 30-minute deep dive to get interview-ready",
  "Boosting Confidence before an Interview":
    "a 30-minute confidence boost for the big day",
  "How to Use AI":
    "a 30-minute deep dive on using AI well and safely",
  "AI in the Workplace":
    "what AI means for your job and how to stay sharp",
  "What They Are & How to Build Them":
    "what confidence and resilience actually are",
  "Building Real Confidence (Even When You Feel None)":
    "practical confidence, even on the hard days",
  "Resilience in Practice — Pressure, Setbacks & Bounce-Back Plans":
    "a plan for pressure and setbacks",
  "Communicating Under Pressure: Calm Voice, Clear Steps, Trusted Results":
    "staying clear and calm when it's tense",
  "Grit & Growth — Motivation That Lasts (Goals, Habits, Accountability)":
    "goals and habits that stick",
  "Feedback, Reviews & Continuous Growth":
    "turning feedback into fuel",
  "Assertive Boundaries — Saying No Well & Protecting Your Focus":
    "saying no well and protecting your focus",
  "Managing Stress & Burnout":
    "a 30-minute deep dive on stress and burnout",
  "What is Online Safety":
    "the foundation module for staying safe online",
  "Cybersecurity Fundamentals":
    "passwords, devices and accounts, locked down",
  "Understanding Online Identity & Reputation":
    "your digital footprint and how to shape it",
  "Toxic Online Culture & Group Chats":
    "handling group chats when they turn nasty",
  "Digital Well-being & Time Online":
    "a healthier balance with your screen",
  "Online Scams, Fraud & Money Safety":
    "spotting scams before they cost you",
};

/* Foundation module per area, prepended for school/college learners. */
const FOUNDATION: Record<Area, string> = {
  money: "Money Confidence & Everyday Decisions",
  work: "Introduction to Employability Skills",
  confidence: "What They Are & How to Build Them",
  online: "What is Online Safety",
};

function baseTitles(answers: PathwayAnswers): string[] {
  const { stage, area, focus } = answers;
  if (area === "money") {
    if (focus === "day_to_day") {
      const t = ["Money Confidence & Everyday Decisions", "Budgeting that Actually Works"];
      if (stage === "apprenticeship" || stage === "first_job") {
        t.push("Pay, Payslips, and Planning for Tax & NI");
      }
      return t;
    }
    if (focus === "credit_debt") {
      return [
        "Money Confidence & Everyday Decisions",
        "Credit, Borrowing & Your Score",
        "Debt Traps and Payday Loans",
      ];
    }
    if (focus === "saving") {
      return [
        "Budgeting that Actually Works",
        "Saving, Emergency Funds & Building a Safety Net",
      ];
    }
    /* independent_living */
    return [
      "Living Independently — Housing & Household Bills",
      "Smart Spending: Big Purchases, Contracts & Consumer Rights",
      "First Time Renting & Housing Rights",
    ];
  }

  if (area === "work") {
    if (focus === "get_hired") {
      if (stage === "looking" || stage === "first_job") {
        return [
          "Interviews, CVs & Early Career Mindset",
          "Preparing for an Interview",
          "Boosting Confidence before an Interview",
        ];
      }
      return [
        "Introduction to Employability Skills",
        "Interviews, CVs & Early Career Mindset",
        "Preparing for an Interview",
      ];
    }
    if (focus === "do_well") {
      return [
        "Communication That Builds Trust",
        "Professionalism, Reliability & Time Management",
        "Teamwork & Collaboration",
      ];
    }
    /* ai_tools */
    return ["How to Use AI", "AI in the Workplace", "Problem Solving & Decision Making"];
  }

  if (area === "confidence") {
    if (focus === "build") {
      return [
        "What They Are & How to Build Them",
        "Building Real Confidence (Even When You Feel None)",
      ];
    }
    if (focus === "pressure") {
      return [
        "Resilience in Practice — Pressure, Setbacks & Bounce-Back Plans",
        "Communicating Under Pressure: Calm Voice, Clear Steps, Trusted Results",
        "Managing Stress & Burnout",
      ];
    }
    if (focus === "boundaries") {
      return [
        "What They Are & How to Build Them",
        "Assertive Boundaries — Saying No Well & Protecting Your Focus",
      ];
    }
    /* motivation */
    return [
      "Grit & Growth — Motivation That Lasts (Goals, Habits, Accountability)",
      "Feedback, Reviews & Continuous Growth",
    ];
  }

  /* online */
  if (answers.focus === "scams") {
    return ["Online Scams, Fraud & Money Safety", "Cybersecurity Fundamentals"];
  }
  if (answers.focus === "footprint") {
    return ["What is Online Safety", "Understanding Online Identity & Reputation"];
  }
  if (answers.focus === "toxic_chats") {
    return ["What is Online Safety", "Toxic Online Culture & Group Chats"];
  }
  /* wellbeing */
  return ["What is Online Safety", "Digital Well-being & Time Online"];
}

export function validAnswers(v: {
  stage?: unknown;
  area?: unknown;
  focus?: unknown;
}): PathwayAnswers | null {
  const stage = v.stage as Stage;
  const area = v.area as Area;
  const focus = v.focus as string;
  if (!STAGES.includes(stage)) return null;
  if (!AREAS.includes(area)) return null;
  if (typeof focus !== "string" || !FOCUSES[area].includes(focus)) return null;
  return { stage, area, focus };
}

/** Compute the ordered pathway. Always 2-3 modules, foundations first. */
export function computePathway(answers: PathwayAnswers): Recommendation[] {
  let titles = baseTitles(answers);

  /* School and college learners get the area foundation first. */
  if (
    (answers.stage === "school" || answers.stage === "college") &&
    !titles.includes(FOUNDATION[answers.area])
  ) {
    titles = [FOUNDATION[answers.area], ...titles];
  }

  return titles.slice(0, 3).map((title) => ({
    title,
    why: WHY[title] ?? "a strong fit for what you told me",
  }));
}

/** Every title the engine can ever emit (for tests + course mapping). */
export function allPathwayTitles(): string[] {
  return Object.keys(WHY);
}
