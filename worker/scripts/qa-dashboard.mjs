/* Render /dashboard with a stubbed fetch so every view can be
 * exercised in a browser without LearnWorlds or a portal code.
 * QA-only; never deployed. Usage: npx tsx scripts/qa-dashboard.mjs OUT */
import { writeFileSync } from "node:fs";

const { renderDashboardPage } = await import("../src/pages-dashboard.ts");

const NOW = Math.floor(Date.now() / 1000);
const learner = (name, email, tags, emp, tasksDone, readiness, learning, engagement) => ({
  name, email, tags, employability: emp, tasksDone, readiness,
  learning: learning ?? { enrolled: 0, completed: 0, inProgress: 0 },
  engagement: engagement ?? { tier: null, daysSinceLogin: null, nudge: null },
});
const tool = (latest, attempts, daysAgo) => ({
  latest, attempts, lastAt: latest === null && attempts === 0 ? null : NOW - daysAgo * 86400,
});

const STUB = {
  scopedTag: "Swift Learners",
  totalUsers: 50,
  sampleSize: 6,
  kpis: { learners: 6, engaged: 4, avgCv: 64, avgLinkedin: 58, avgInterview: 71, lettersCreated: 2, journeyComplete: 1, modulesCompleted: 14 },
  funnel: [
    { stage: "In your scope", n: 6 },
    { stage: "Logged in to LearnWorlds", n: 5 },
    { stage: "Learning modules", n: 5 },
    { stage: "Completed a module", n: 4 },
    { stage: "Using career tools", n: 4 },
    { stage: "Job-ready (70+)", n: 1 },
  ],
  learners: [
    learner("Amy Ash", "amy@swift.test", ["Swift Learners"], { cv: tool(82, 3, 1), linkedin: tool(74, 2, 2), interview: tool(88, 2, 1), cover: tool(100, 2, 3) }, 7, 82,
      { enrolled: 8, completed: 6, inProgress: 1, modules: [
        { t: "Handling Change & Uncertainty", p: 62, done: false },
        { t: "AI in the Workplace", p: 0, done: false },
        { t: "Budgeting That Actually Works", p: 100, done: true },
        { t: "Building Real Confidence", p: 100, done: true },
        { t: "Cybersecurity Fundamentals", p: 100, done: true },
        { t: "Interview Confidence", p: 100, done: true },
      ] }, { tier: "ok", daysSinceLogin: 1, nudge: null }),
    learner("Ben Brook", "ben@swift.test", ["Swift Learners"], { cv: tool(58, 1, 4), linkedin: tool(null, 0, 0), interview: tool(62, 1, 6), cover: tool(null, 0, 0) }, 3, 60,
      { enrolled: 8, completed: 3, inProgress: 2 }, { tier: "watch", daysSinceLogin: 6, nudge: "Hi Ben — you were flying through Budgeting last week; ten minutes finishes it." }),
    learner("Cara Cole", "cara@swift.test", ["Swift Learners", "Evening"], { cv: tool(41, 2, 9), linkedin: tool(38, 1, 9), interview: tool(null, 0, 0), cover: tool(null, 0, 0) }, 2, 40,
      { enrolled: 8, completed: 2, inProgress: 1 }, { tier: "medium", daysSinceLogin: 12, nudge: "Hi Cara — your CV score jumped last time; one more session keeps it moving." }),
    learner("Dev Dhillon", "dev@swift.test", ["Swift Learners"], { cv: tool(67, 1, 12), linkedin: tool(55, 1, 14), interview: tool(63, 1, 12), cover: tool(null, 0, 0) }, 3, 63,
      { enrolled: 8, completed: 3, inProgress: 0 }, { tier: "ok", daysSinceLogin: 4, nudge: null }),
    learner("Ella Evans", "ella@swift.test", ["Swift Learners", "Evening"], { cv: tool(null, 0, 0), linkedin: tool(null, 0, 0), interview: tool(null, 0, 0), cover: tool(null, 0, 0) }, 0, null,
      { enrolled: 8, completed: 0, inProgress: 0 }, { tier: "high", daysSinceLogin: null, nudge: "Hi Ella — your Fledglings place is ready and waiting; the first module takes 15 minutes." }),
    learner("Finn Fox", "finn@swift.test", ["Swift Learners"], { cv: tool(null, 0, 0), linkedin: tool(null, 0, 0), interview: tool(null, 0, 0), cover: tool(null, 0, 0) }, 0, null,
      { enrolled: 8, completed: 0, inProgress: 1 }, { tier: "high", daysSinceLogin: 24, nudge: "Hi Finn — Cybersecurity is sitting at 40% for you; one short push finishes it." }),
  ],
  attention: [
    { name: "Ella Evans", email: "ella@swift.test", readiness: null, tasksDone: 0, issue: "Never logged in" },
    { name: "Finn Fox", email: "finn@swift.test", readiness: null, tasksDone: 0, issue: "24 days since login" },
    { name: "Cara Cole", email: "cara@swift.test", readiness: 40, tasksDone: 2, issue: "Low job-ready score" },
  ],
  analytics: {
    activity: Array.from({ length: 12 }, (_, i) => ({ weeksAgo: 11 - i, events: [0, 0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4][i] })),
    cvBuckets: [0, 0, 1, 2, 1],
    toolTried: { cv: 4, linkedin: 3, interview: 3, cover: 1 },
    courses: [
      { title: "Budgeting That Actually Works", enrolled: 6, completed: 4, pct: 67 },
      { title: "Cybersecurity Fundamentals", enrolled: 6, completed: 3, pct: 50 },
      { title: "AI in the Workplace", enrolled: 5, completed: 2, pct: 40 },
      { title: "Interview Confidence", enrolled: 4, completed: 3, pct: 75 },
    ],
    curriculum: [
      { area: "Financial Literacy", enrolled: 12, completed: 7, pct: 58 },
      { area: "Employability Skills", enrolled: 10, completed: 5, pct: 50 },
      { area: "Staying Safe Online", enrolled: 6, completed: 3, pct: 50 },
    ],
  },
  tags: [
    { tag: "Swift Learners", count: 6 },
    { tag: "Evening", count: 2 },
  ],
};

const RSTUB_READY = {
  status: "ready",
  responsesEnabled: true,
  reason: null,
  progress: { done: 33, total: 33 },
  coverage: [],
  shifts: [
    { courseId: "c1", courseTitle: "Budgeting That Actually Works", preCount: 5, postCount: 4, preAvgPct: 42, postAvgPct: 74, shift: 32 },
    { courseId: "c2", courseTitle: "Interview Confidence", preCount: 4, postCount: 3, preAvgPct: 55, postAvgPct: 81, shift: 26 },
    { courseId: "c3", courseTitle: "Cybersecurity Fundamentals", preCount: 3, postCount: 2, preAvgPct: 60, postAvgPct: 58, shift: -2 },
    { courseId: "c4", courseTitle: "AI in the Workplace", preCount: 2, postCount: 0, preAvgPct: 48, postAvgPct: null, shift: null },
  ],
  flags: [
    { email: "cara@swift.test", courseTitle: "Building Real Confidence", unitTitle: "Post Completion Feedback", question: "How are you feeling after this module?", answer: "honestly some days I do not want to be here any more", submittedAt: NOW - 2 * 86400, matched: "crisis-language", cohort: "Swift Learners", key: "cara@swift.test|Post Completion Feedback|" + (NOW - 2 * 86400), acked: false },
    { email: "dev@swift.test", courseTitle: "Handling Change", unitTitle: "Post Completion Feedback", question: "Anything else?", answer: "was struggling a lot but talked to my tutor, feeling better", submittedAt: NOW - 9 * 86400, matched: "crisis-language", cohort: "Swift Learners", key: "dev@swift.test|Post Completion Feedback|" + (NOW - 9 * 86400), acked: true },
  ],
  preCount: 14,
  postCount: 9,
  recent: [
    { email: "amy@swift.test", courseTitle: "Budgeting That Actually Works", unitTitle: "Post Completion Feedback", kind: "post", submittedAt: NOW - 86400, question: "What is one thing you will do differently?", answer: "Actually check my balance before the weekend instead of after." },
    { email: "ben@swift.test", courseTitle: "Interview Confidence", unitTitle: "Initial Self - Reflection", kind: "pre", submittedAt: NOW - 2 * 86400, question: "How confident do you feel about interviews?", answer: "3" },
    { email: "dev@swift.test", courseTitle: "Budgeting That Actually Works", unitTitle: "Initial Self - Reflection", kind: "pre", submittedAt: NOW - 3 * 86400, question: "What worries you most about money?", answer: "Running out before the end of the month and having to ask my mum." },
  ],
  rawCount: 87,
  scoped: "Swift Learners",
  builtAt: new Date(NOW * 1000).toISOString(),
};

const RSTUB_GATED = {
  status: "ready",
  responsesEnabled: false,
  reason: "Hi LearnWorlds — please enable the Assessments & Forms API endpoints for our school so we can read learner assessment responses. Thanks!",
  progress: { done: 33, total: 33 },
  coverage: Array.from({ length: 28 }, (_, i) => ({ courseId: "c" + i, courseTitle: "Module " + i, preTitle: "Initial Self - Reflection", postTitle: "Post Completion Feedback", otherTitles: [] })),
  shifts: [], flags: [], preCount: 0, postCount: 0, recent: [], rawCount: 0,
  scoped: "Swift Learners", builtAt: new Date(NOW * 1000).toISOString(),
};

const stubScript =
  "<script>var __STUB=" + JSON.stringify(STUB) +
  ";var __RREADY=" + JSON.stringify(RSTUB_READY) +
  ";var __RGATED=" + JSON.stringify(RSTUB_GATED) +
  ";window.fetch=function(url){var u=String(url);" +
  "var body=u.indexOf('/portal/reflections')>-1?(location.search.indexOf('gated=1')>-1?__RGATED:__RREADY):__STUB;" +
  "if(body===__RGATED&&location.search.indexOf('hq=1')>-1)body=Object.assign({},__RGATED,{scoped:null});" +
  "return Promise.resolve({status:200,json:function(){return Promise.resolve(body)}})};</script>";

const html = renderDashboardPage().replace("<body>", "<body>" + stubScript);
writeFileSync(process.argv[2] || "qa-dashboard.html", html);
console.log("written", process.argv[2] || "qa-dashboard.html");
