/* Made-up provider data for the dashboard walk (scripts/vqa-dashboard.mjs).
 *
 * Every name, address and answer here is invented. The dashboard's real
 * endpoints return real learner records, which have no business in a
 * screenshot folder, so the walk answers each endpoint from this file
 * instead - shaped exactly as the page reads them (the shapes are taken
 * from the page's own script, pages-dashboard.ts).
 *
 * The cast is built to exercise every state the page can draw: three
 * cohorts of different sizes, every engagement tier, a learner who has
 * never logged in, one with no modules at all, long names and module
 * titles that have to wrap, a wellbeing flag that is open and one that
 * has been checked in. */

const NOW = Math.floor(Date.now() / 1000);
const DAY = 86400;

const MODULES = [
  "Budgeting That Actually Works",
  "Money Confidence & Everyday Decisions",
  "Online Scams, Fraud & Money Safety",
  "Interviews, CVs & Early-Career Mindset",
  "Building Real Confidence",
  "Handling Change & Uncertainty",
  "Cybersecurity Fundamentals",
  "Pay, Payslips, and Planning for Tax & NI",
];

/** progress: one number per module, 0-100; minutes follow from it */
function learner(name, email, tags, tier, daysSinceLogin, progress, nudge = null) {
  const modules = progress.map((p, i) => ({ t: MODULES[i], p, done: p === 100, mins: Math.round(p * 0.42) }));
  return {
    name, email, tags,
    learning: {
      enrolled: modules.length,
      completed: modules.filter((m) => m.done).length,
      inProgress: modules.filter((m) => !m.done && m.p > 0).length,
      minutes: modules.reduce((s, m) => s + m.mins, 0),
      modules,
    },
    engagement: { tier, daysSinceLogin, nudge },
  };
}

const LEARNERS = [
  learner("Amy Ash", "amy@swift.test", ["Swift Learners", "Day release"], "ok", 0, [100, 100, 100, 100, 100, 62, 0, 0]),
  learner("Ben Brook", "ben@swift.test", ["Swift Learners", "Day release"], "watch", 6, [100, 100, 100, 40, 0, 0, 0, 0], "Hi Ben - you were flying through Budgeting last week; ten minutes finishes the next one."),
  learner("Cara Cole", "cara@swift.test", ["Swift Learners", "Evening"], "medium", 12, [100, 100, 35, 0, 0, 0, 0, 0], "Hi Cara - one more short session keeps your streak going."),
  learner("Dev Dhillon", "dev@swift.test", ["Swift Learners", "Day release"], "ok", 4, [100, 100, 100, 0, 0, 0, 0, 0]),
  learner("Ella Evans", "ella@swift.test", ["Swift Learners", "Evening"], "high", null, [0, 0, 0, 0, 0, 0, 0, 0], "Hi Ella - your Fledglings place is ready and waiting; the first module takes 15 minutes."),
  learner("Finn Fox", "finn@swift.test", ["Swift Learners", "Day release"], "high", 24, [40, 0, 0, 0, 0, 0, 0, 0], "Hi Finn - Budgeting is sitting at 40% for you; one short push finishes it."),
  learner("Gurpreet Kaur-Sandhu", "gurpreet.kaur-sandhu@swift.test", ["Swift Learners", "Evening"], "ok", 1, [100, 100, 100, 100, 80, 0, 0, 0]),
  learner("Hattie Holloway", "hattie@swift.test", ["Swift Learners", "Supported internship"], "new", 2, [20, 0, 0, 0, 0, 0, 0, 0]),
  learner("Idris Okonkwo", "idris@swift.test", ["Swift Learners", "Supported internship"], "new", 1, [0, 0, 0, 0, 0, 0, 0, 0]),
  learner("Jasmine Li", "jasmine@swift.test", ["Swift Learners", "Day release"], "ok", 2, [100, 100, 100, 100, 100, 100, 100, 45]),
  learner("Kofi Mensah", "kofi@swift.test", ["Swift Learners", "Evening"], "watch", 9, [100, 60, 0, 0, 0, 0, 0, 0]),
  learner("Leah Novak", "leah@swift.test", ["Swift Learners", "Day release"], "ok", 3, [100, 100, 50, 0, 0, 0, 0, 0]),
  learner("Mohammed Rahman", "mohammed@swift.test", ["Swift Learners", "Supported internship"], "ok", 5, [100, 0, 0, 0, 0, 0, 0, 0]),
  learner("Niamh O'Sullivan", "niamh@swift.test", ["Swift Learners", "Evening"], "medium", 15, [0, 0, 0, 0, 0, 0, 0, 0]),
];

function tagCounts(rows) {
  const counts = new Map();
  rows.forEach((r) => r.tags.forEach((t) => counts.set(t, (counts.get(t) || 0) + 1)));
  return [...counts].map(([tag, count]) => ({ tag, count }));
}

function moduleRollup(rows) {
  return MODULES.map((title, i) => {
    const enrolled = rows.length;
    const completed = rows.filter((r) => r.learning.modules[i].done).length;
    return { title, enrolled, completed, pct: Math.round((completed * 100) / enrolled) };
  }).filter((c) => c.completed > 0 || c.title === MODULES[0]);
}

export function dashboardData({ hq = false } = {}) {
  return {
    scopedTag: hq ? null : "Swift Learners",
    totalUsers: hq ? LEARNERS.length : 240,
    sampleSize: LEARNERS.length,
    tags: tagCounts(LEARNERS),
    learners: LEARNERS,
    attention: [],
    analytics: {
      courses: moduleRollup(LEARNERS),
      curriculum: [
        { area: "Financial Literacy", enrolled: 42, completed: 27, pct: 64 },
        { area: "Employability Skills", enrolled: 14, completed: 4, pct: 29 },
        { area: "Confidence & Resilience", enrolled: 28, completed: 5, pct: 18 },
        { area: "Staying Safe Online", enrolled: 14, completed: 1, pct: 7 },
      ],
    },
  };
}

export const REFLECTIONS_READY = {
  status: "ready",
  responsesEnabled: true,
  reason: null,
  progress: { done: 33, total: 33 },
  coverage: [],
  scoped: "Swift Learners",
  preCount: 31,
  postCount: 19,
  rawCount: 214,
  shifts: [
    { courseId: "c1", courseTitle: "Budgeting That Actually Works", preCount: 11, postCount: 9, preAvgPct: 42, postAvgPct: 74, shift: 32 },
    { courseId: "c2", courseTitle: "Money Confidence & Everyday Decisions", preCount: 9, postCount: 6, preAvgPct: 55, postAvgPct: 81, shift: 26 },
    { courseId: "c3", courseTitle: "Online Scams, Fraud & Money Safety", preCount: 6, postCount: 3, preAvgPct: 60, postAvgPct: 57, shift: -3 },
    { courseId: "c4", courseTitle: "Interviews, CVs & Early-Career Mindset", preCount: 5, postCount: 0, preAvgPct: 48, postAvgPct: null, shift: null },
  ],
  flags: [
    { email: "cara@swift.test", courseTitle: "Building Real Confidence", unitTitle: "Post Completion Feedback", question: "How are you feeling after this module?", answer: "honestly some days I do not want to be here any more", submittedAt: NOW - 2 * DAY, matched: "crisis-language", cohort: "Evening", key: "cara|1", acked: false },
    { email: "dev@swift.test", courseTitle: "Handling Change & Uncertainty", unitTitle: "Post Completion Feedback", question: "Anything else you want to tell us?", answer: "was struggling a lot but talked to my tutor, feeling better", submittedAt: NOW - 9 * DAY, matched: "crisis-language", cohort: "Day release", key: "dev|1", acked: true },
  ],
  recent: [
    { email: "amy@swift.test", courseTitle: "Budgeting That Actually Works", kind: "post", submittedAt: NOW - DAY, question: "What is one thing you will do differently?", answer: "Actually check my balance before the weekend instead of after." },
    { email: "ben@swift.test", courseTitle: "Interviews, CVs & Early-Career Mindset", kind: "pre", submittedAt: NOW - 2 * DAY, question: "How confident do you feel about interviews?", answer: "3" },
    { email: "gurpreet.kaur-sandhu@swift.test", courseTitle: "Money Confidence & Everyday Decisions", kind: "post", submittedAt: NOW - 2 * DAY, question: "What surprised you?", answer: "How much I spend on small things without noticing. I wrote it all down for a week and it was nearly forty pounds on drinks and snacks at college, which is most of what I earn on a Saturday." },
    { email: "dev@swift.test", courseTitle: "Budgeting That Actually Works", kind: "pre", submittedAt: NOW - 3 * DAY, question: "What worries you most about money?", answer: "Running out before the end of the month and having to ask my mum." },
    { email: "jasmine@swift.test", courseTitle: "Cybersecurity Fundamentals", kind: "post", submittedAt: NOW - 4 * DAY, question: "What will you change?", answer: "Different passwords for everything and I turned on the two step thing for my email." },
  ],
  insights: {
    descriptors: [
      { word: "useful", count: 14, forms: ["useful", "usefull"] },
      { word: "clear", count: 9, forms: ["clear"] },
      { word: "interesting", count: 8, forms: ["interesting", "intresting"] },
      { word: "long", count: 4, forms: ["long"] },
      { word: "confusing", count: 2, forms: ["confusing"] },
    ],
    /* the labels the worker really sends (lib/reflection-insights.ts) */
    experience: [
      { label: "Felt safe, respected and not judged", pct: 88, responses: 19 },
      { label: "Felt practical and relevant to real life", pct: 78, responses: 19 },
      { label: "Ready to use it in real life or work", pct: 61, responses: 17 },
      { label: "Knowledge improved because of the module", pct: 44, responses: 17 },
    ],
    requests: [
      { text: "More examples about wages when you are on an apprenticeship, not a full time job.", courseTitle: "Pay, Payslips, and Planning for Tax & NI", submittedAt: NOW - 2 * DAY },
      { text: "A shorter version I can do on the bus.", courseTitle: "Budgeting That Actually Works", submittedAt: NOW - 5 * DAY },
      { text: "Something about what to do if you already owe money.", courseTitle: "Money Confidence & Everyday Decisions", submittedAt: NOW - 6 * DAY },
    ],
    requestsTotal: 11,
  },
};

export const REFLECTIONS_BUILDING = { ...REFLECTIONS_READY, status: "building", progress: { done: 12, total: 33 } };

export const REFLECTIONS_GATED = {
  status: "ready", responsesEnabled: false, scoped: "Swift Learners",
  reason: "Please enable the assessment responses endpoints for our school so learner reflections can be read.",
  progress: { done: 33, total: 33 },
  coverage: Array.from({ length: 28 }, (_, i) => ({ courseId: "c" + i, courseTitle: "Module " + i, preTitle: "Initial Self - Reflection", postTitle: "Post Completion Feedback", otherTitles: [] })),
  shifts: [], flags: [], preCount: 0, postCount: 0, recent: [], rawCount: 0,
};

export const SCAN_READY = {
  ok: true, status: "ready", reader: 2, scanned: 96, batches: 2, ranAt: new Date((NOW - 3 * DAY) * 1000).toISOString(),
  safeguarding: [
    { email: "niamh@swift.test", module: "Money Confidence & Everyday Decisions", quote: "we dont really have food in the house at the end of the month so budgeting is not the problem", why: "Describes going without food. Worth a private, practical conversation about support.", severity: "concern" },
    { email: "kofi@swift.test", module: "Building Real Confidence", quote: "i just keep quiet in the workshop because the others laugh", why: "Possible bullying at placement. A check-in would tell you more.", severity: "monitor" },
    /* flagged, but the wording could not be matched to what they typed */
    { email: "finn@swift.test", module: "Handling Change & Uncertainty", quote: "", unquoted: true, why: "Mentions trouble at home in passing. Worth asking how things are.", severity: "monitor" },
  ],
  adjustments: [
    { email: "hattie@swift.test", module: "Budgeting That Actually Works", quote: "the videos go too fast for me to read the words", why: "May benefit from transcripts or slower pacing.", severity: null },
  ],
  positives: [
    { email: "amy@swift.test", module: "Budgeting That Actually Works", quote: "Actually check my balance before the weekend instead of after.", why: "A specific habit change in their own words. Worth naming back to them.", severity: null },
    { email: "jasmine@swift.test", module: "Cybersecurity Fundamentals", quote: "I turned on the two step thing for my email", why: "Acted on the module the same week.", severity: null },
  ],
};

export const FEED = {
  feed: [
    { kind: "completion", name: "Jasmine Li", email: "jasmine@swift.test", detail: "Cybersecurity Fundamentals", at: NOW - 3600 },
    { kind: "completion", name: "Amy Ash", email: "amy@swift.test", detail: "Building Real Confidence", at: NOW - 7200 },
    { kind: "joined", name: "Idris Okonkwo", email: "idris@swift.test", detail: "", at: NOW - DAY },
    { kind: "completion", name: "Gurpreet Kaur-Sandhu", email: "gurpreet.kaur-sandhu@swift.test", detail: "Interviews, CVs & Early-Career Mindset", at: NOW - 2 * DAY },
  ],
};

export const MODULE_HEALTH = {
  status: "ready",
  reports: [
    { title: "Budgeting That Actually Works", retention: 71, stallUnit: "Your first budget" },
    { title: "Money Confidence & Everyday Decisions", retention: 58, stallUnit: "Needs and wants" },
    { title: "Interviews, CVs & Early-Career Mindset", retention: 33, stallUnit: "Initial Self - Reflection" },
    { title: "Online Scams, Fraud & Money Safety", retention: 24, stallUnit: "Spot the scam" },
  ],
};

export const NARRATIVE = {
  narrative:
    "Across the Swift Learners cohort, 14 learners are enrolled on eight life-skills modules. Twelve have logged in and eleven have begun at least one module; 27 modules have been completed in total, with the Financial Literacy strand furthest ahead at 64% completion.\n\n" +
    "Learners' own before-and-after ratings show the clearest movement on budgeting, where average confidence rose from 42% to 74% across nine paired responses. Online safety shows no measurable shift yet on three paired responses, which is too few to draw a conclusion from.\n\n" +
    "These figures describe participation and self-reported confidence. They do not measure changes in behaviour outside the platform, and the smaller cohorts should be read with caution.",
};

export const INSPECT_LINK = { url: "/inspect?d=sample&s=sample" };

export function learnerReflections(email) {
  if (email === "cara@swift.test") {
    return { ok: true, count: 9, flags: [{ courseTitle: "Building Real Confidence", question: "How are you feeling after this module?", answer: "honestly some days I do not want to be here any more" }] };
  }
  return { ok: true, count: { "amy@swift.test": 22, "dev@swift.test": 6 }[email] ?? 2, flags: [] };
}

export function learnerInsight(email) {
  if (email === "amy@swift.test") {
    return {
      ok: true, status: "ready", count: 22,
      summary: "Amy's answers move from general worry about money towards specific habits she has started. She writes more, and more concretely, in the later modules.",
      highlights: [
        { kind: "positive", module: "Budgeting That Actually Works", quote: "Actually check my balance before the weekend instead of after.", note: "A concrete habit in her own words." },
        { kind: "concern", module: "Handling Change & Uncertainty", quote: "I do not really know what I am doing after this course ends", note: "Uncertain about next steps. A progression conversation would help." },
      ],
    };
  }
  if (email === "cara@swift.test") {
    return {
      ok: true, status: "ready", reader: 2, count: 9,
      summary: "Cara's early answers are engaged and specific; the most recent one is worrying and should be followed up in person.",
      highlights: [{ kind: "concern", module: "Building Real Confidence", quote: "", unquoted: true, note: "The latest answer sounds low. Worth a conversation in person." }],
    };
  }
  /* a learner with answers on record and nothing picked out */
  if (email === "dev@swift.test") return { ok: true, status: "ready", reader: 2, count: 6, summary: "Dev writes briefly and practically about each module.", highlights: [] };
  return { ok: true, status: "too_few", count: 2 };
}
