/* The provider dashboard, walked view by view. QA-only.
 *
 *   BASE=http://127.0.0.1:8799 node scripts/vqa-dashboard.mjs 1440 1000 desk
 *   BASE=http://127.0.0.1:8799 node scripts/vqa-dashboard.mjs 375 812 phone
 *
 * The dashboard is behind a provider's access code and shows real
 * learner records, so it cannot be walked on production: there is no
 * code to type that is ours to type, and no screenshot of it that would
 * be safe to keep. This serves the REAL page from the worker and
 * answers each of its data requests from made-up records
 * (vqa-dashboard-fixtures.mjs) - nothing is signed in to, and no learner
 * data is fetched. What is tested is everything the page does with the
 * data: every view, chart, filter, table, empty state and phone layout.
 * What is NOT tested here is the data pipeline behind those endpoints;
 * that is the unit suite's job (test/dashboard.test.ts).
 *
 * Shots: worker/qa/shots/d<nn>-<name>-<tag>.png */
import { cliArgs, openSession, sleep } from "./vqa-lib.mjs";
import {
  FEED, INSPECT_LINK, MODULE_HEALTH, NARRATIVE, REFLECTIONS_BUILDING, REFLECTIONS_GATED, REFLECTIONS_READY,
  SCAN_READY, dashboardData, learnerInsight, learnerReflections,
} from "./vqa-dashboard-fixtures.mjs";

const { width, height, tag } = cliArgs();
const S = await openSession({ width, height, tag });
const { page, shot, go, clickSel, overflowCheck, tapCheck, auditCheck, note } = S;

/* What each endpoint answers this run. Changed between sections to
 * reach the states a single dataset cannot show at once. */
const world = { signedIn: true, hq: false, reflections: REFLECTIONS_READY, scan: SCAN_READY };
const unexpected = new Set();

await page.setRequestInterception(true);
page.on("request", (req) => {
  const url = new URL(req.url());
  const path = url.pathname;
  const json = (body, status = 200) => req.respond({ status, contentType: "application/json", body: JSON.stringify(body) });
  if (!path.startsWith("/dashboard/") && !path.startsWith("/portal/")) return req.continue();
  if (!world.signedIn) return json({ error: "unauthorised" }, 401);
  if (path === "/dashboard/data") return json(dashboardData({ hq: world.hq }));
  if (path === "/dashboard/refresh") return json({ ok: true });
  if (path === "/dashboard/learner-reflections") return json(learnerReflections(url.searchParams.get("email")));
  if (path === "/dashboard/learner-insight") return json(learnerInsight(url.searchParams.get("email")));
  if (path === "/portal/reflections") return json({ ...world.reflections, scoped: world.hq ? null : world.reflections.scoped });
  if (path === "/portal/reflections/ack") return json({ ok: true });
  if (path === "/portal/reflection-scan") return json(world.scan);
  if (path === "/portal/feed") return json(FEED);
  if (path === "/portal/module-health") return json(MODULE_HEALTH);
  if (path === "/portal/narrative") return json(NARRATIVE);
  if (path === "/portal/inspect-link") return json(INSPECT_LINK);
  unexpected.add(path);
  return json({ error: "not stubbed" }, 404);
});

async function checks(label) {
  await overflowCheck("#dmain-content", label);
  await auditCheck("body", label);
  if (S.mobile) await tapCheck("body", label);
}
async function view(id) {
  await clickSel(`.dn[data-view='${id}']`);
  await sleep(900);
}
async function chipByText(scope, pattern) {
  const ok = await page.evaluate((scope, src) => {
    const re = new RegExp(src, "i");
    const b = [...document.querySelectorAll(`${scope} .chip`)].find((x) => re.test(x.textContent));
    if (!b) return false;
    b.click();
    return true;
  }, scope, pattern.source);
  if (!ok) note("missing chip", `${scope} ${pattern}`);
  await sleep(700);
}

try {
  /* ---- signed out: the access-code gate ---- */
  world.signedIn = false;
  await go("/dashboard");
  await checks("sign in");
  await shot("d01-signin");
  await go("/dashboard?login=failed");
  await shot("d02-signin-failed");
  /* signed out, the page is only the way in */
  const exposed = await page.evaluate(() =>
    [...document.querySelectorAll(".dn, #dh-refresh, .dout")].filter((e) => e.getBoundingClientRect().width > 0).length);
  if (exposed) note("signed-out page still shows workbench controls", String(exposed));
  /* the 401 behind that screen is the gate working, not a fault */
  for (let i = S.problems.length - 1; i >= 0; i--) if (/401/.test(S.problems[i])) S.problems.splice(i, 1);

  /* ---- a provider scoped to one cohort tag ---- */
  world.signedIn = true;
  await go("/dashboard");
  await sleep(1200);
  console.log("  home:", JSON.stringify(await page.evaluate(() => ({
    learners: document.getElementById("k-learners").textContent,
    modules: document.getElementById("k-modules").textContent,
    reflect: document.getElementById("k-reflect").textContent,
    flagged: document.getElementById("att-count").textContent,
    feed: document.querySelectorAll("#feed-list .feedrow").length,
    scope: document.getElementById("dscope").textContent,
  }))));
  await checks("home");
  await shot("d03-home");
  await chipByText("#g-chips", /Evening/);
  await checks("home, one cohort");
  await shot("d04-home-cohort");
  await chipByText("#g-chips", /All in scope/);

  await view("students");
  await checks("students");
  await shot("d05-students");
  await chipByText("#s-chips", /Watch list/);
  await shot("d06-students-watch");
  await chipByText("#s-chips", /Inactive/);
  await shot("d07-students-inactive");
  await chipByText("#s-chips", /All students/);
  await page.type("#s-search", "zzz");
  await sleep(500);
  await shot("d08-students-no-match");
  await page.evaluate(() => { const i = document.getElementById("s-search"); i.value = ""; i.dispatchEvent(new Event("input")); });

  /* a learner's profile: one with a read of their answers, one flagged, one too new */
  for (const [email, name] of [["amy@swift.test", "d09-profile-full"], ["cara@swift.test", "d10-profile-flagged"], ["idris@swift.test", "d11-profile-new"], ["dev@swift.test", "d11b-profile-nothing-picked"]]) {
    await view("students");
    const opened = await page.evaluate((email) => {
      const el = [...document.querySelectorAll("[data-drill]")].find((x) => x.dataset.drill === email && x.getBoundingClientRect().width > 0);
      if (!el) return false;
      el.click();
      return true;
    }, email);
    if (!opened) { note("could not open profile", email); continue; }
    await sleep(1300);
    await checks(`profile ${email}`);
    await shot(name);
  }

  await view("cohorts");
  await checks("cohorts");
  await shot("d12-cohorts");

  await view("reflections");
  await sleep(1200);
  await checks("reflections wellbeing");
  await shot("d13-reflections-wellbeing");
  for (const [pattern, name] of [[/Confidence shifts/, "d14-reflections-shifts"], [/In their words/, "d15-reflections-words"], [/What they asked for/, "d16-reflections-asks"], [/Latest answers/, "d17-reflections-answers"]]) {
    await chipByText("#rf-deck-chips", pattern);
    await checks(`reflections ${pattern.source}`);
    await shot(name);
  }

  await view("analytics");
  await sleep(1000);
  await checks("analytics cohorts");
  await shot("d18-analytics-cohorts");
  await chipByText("#a-secs", /Engagement/);
  await checks("analytics engagement");
  await shot("d19-analytics-engagement");
  await chipByText("#a-secs", /Learning/);
  await checks("analytics learning");
  await shot("d20-analytics-learning");

  await view("evidence");
  await sleep(900);
  await clickSel("#ev-link-make");
  await sleep(600);
  await checks("evidence");
  await shot("d21-evidence");

  /* ---- reflections in its other two states ---- */
  world.reflections = REFLECTIONS_BUILDING;
  await go("/dashboard");
  await view("reflections");
  await sleep(900);
  await shot("d22-reflections-building");
  world.reflections = REFLECTIONS_GATED;
  await go("/dashboard");
  await view("reflections");
  await sleep(900);
  console.log("  gated, scoped provider sees supplier ask:", await page.evaluate(() => !document.getElementById("rf-gate-hq").hidden));
  await shot("d23-reflections-gated");

  /* ---- whole-school (HQ) code: the views that differ ---- */
  world.hq = true;
  await go("/dashboard");
  await view("reflections");
  await sleep(900);
  await shot("d24-hq-reflections-gated");
  world.reflections = REFLECTIONS_READY;
  await go("/dashboard");
  await sleep(900);
  await shot("d25-hq-home");
  await view("analytics");
  await chipByText("#a-secs", /Learning/);
  await sleep(900);
  await checks("hq analytics learning");
  await shot("d26-hq-analytics-stalls");

  /* nothing the page asked for went unanswered */
  if (unexpected.size) note("endpoint the walk does not stub", [...unexpected].join(", "));
  /* the founder's two laws, on a surface providers read */
  const text = await page.evaluate(() => document.body.innerText);
  if (text.includes(String.fromCharCode(0x2014))) note("em dash on the dashboard", "");
  if (/learn\s*worlds/i.test(text)) note("supplier named on the dashboard", "");
} catch (err) {
  note("dashboard walk failed", String(err).slice(0, 240));
}
await S.finish();
