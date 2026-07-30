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
  learners: [
    learner("Amy Ash", "amy@swift.test", ["Swift Learners"], { cv: tool(82, 3, 1), linkedin: tool(74, 2, 2), interview: tool(88, 2, 1), cover: tool(100, 2, 3) }, 7, 82,
      { enrolled: 8, completed: 6, inProgress: 1 }, { tier: "ok", daysSinceLogin: 1, nudge: null }),
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

const stubScript =
  "<script>var __STUB=" + JSON.stringify(STUB) +
  ";window.fetch=function(){return Promise.resolve({status:200,json:function(){return Promise.resolve(__STUB)}})};</script>";

const html = renderDashboardPage().replace("<body>", "<body>" + stubScript);
writeFileSync(process.argv[2] || "qa-dashboard.html", html);
console.log("written", process.argv[2] || "qa-dashboard.html");
