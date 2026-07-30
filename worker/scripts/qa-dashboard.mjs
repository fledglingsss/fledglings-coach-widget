/* Render /dashboard with a stubbed fetch so every view can be
 * exercised in a browser without LearnWorlds or a portal code.
 * QA-only; never deployed. Usage: npx tsx scripts/qa-dashboard.mjs OUT */
import { writeFileSync } from "node:fs";

const { renderDashboardPage } = await import("../src/pages-dashboard.ts");

const NOW = Math.floor(Date.now() / 1000);
const learner = (name, email, tags, emp, tasksDone, readiness) => ({
  name, email, tags, employability: emp, tasksDone, readiness,
});
const tool = (latest, attempts, daysAgo) => ({
  latest, attempts, lastAt: latest === null && attempts === 0 ? null : NOW - daysAgo * 86400,
});

const STUB = {
  scopedTag: "Swift Learners",
  totalUsers: 50,
  sampleSize: 6,
  kpis: { learners: 6, engaged: 4, avgCv: 64, avgLinkedin: 58, avgInterview: 71, lettersCreated: 2, journeyComplete: 1 },
  learners: [
    learner("Amy Ash", "amy@swift.test", ["Swift Learners"], { cv: tool(82, 3, 1), linkedin: tool(74, 2, 2), interview: tool(88, 2, 1), cover: tool(100, 2, 3) }, 7, 82),
    learner("Ben Brook", "ben@swift.test", ["Swift Learners"], { cv: tool(58, 1, 4), linkedin: tool(null, 0, 0), interview: tool(62, 1, 6), cover: tool(null, 0, 0) }, 3, 60),
    learner("Cara Cole", "cara@swift.test", ["Swift Learners", "Evening"], { cv: tool(41, 2, 9), linkedin: tool(38, 1, 9), interview: tool(null, 0, 0), cover: tool(null, 0, 0) }, 2, 40),
    learner("Dev Dhillon", "dev@swift.test", ["Swift Learners"], { cv: tool(67, 1, 12), linkedin: tool(55, 1, 14), interview: tool(63, 1, 12), cover: tool(null, 0, 0) }, 3, 63),
    learner("Ella Evans", "ella@swift.test", ["Swift Learners", "Evening"], { cv: tool(null, 0, 0), linkedin: tool(null, 0, 0), interview: tool(null, 0, 0), cover: tool(null, 0, 0) }, 0, null),
    learner("Finn Fox", "finn@swift.test", ["Swift Learners"], { cv: tool(null, 0, 0), linkedin: tool(null, 0, 0), interview: tool(null, 0, 0), cover: tool(null, 0, 0) }, 0, null),
  ],
  attention: [
    { name: "Ella Evans", email: "ella@swift.test", readiness: null, tasksDone: 0, issue: "Not started any tool" },
    { name: "Finn Fox", email: "finn@swift.test", readiness: null, tasksDone: 0, issue: "Not started any tool" },
    { name: "Cara Cole", email: "cara@swift.test", readiness: 40, tasksDone: 2, issue: "Low job-ready score" },
  ],
  analytics: {
    activity: Array.from({ length: 12 }, (_, i) => ({ weeksAgo: 11 - i, events: [0, 0, 1, 0, 2, 1, 3, 2, 4, 3, 5, 4][i] })),
    cvBuckets: [0, 0, 1, 2, 1],
    toolTried: { cv: 4, linkedin: 3, interview: 3, cover: 1 },
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
