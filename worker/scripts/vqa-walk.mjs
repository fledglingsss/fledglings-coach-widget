/* The full learner walk: every screen of the employability suite, at
 * one viewport, driven the way a learner uses it. QA-only.
 *
 *   node scripts/vqa-walk.mjs 1440 1000 desk --model
 *   node scripts/vqa-walk.mjs 375 812 phone
 *   node scripts/vqa-walk.mjs 320 640 narrow
 *
 * --model runs the real thing end to end: a CV is built in the Resume
 * Builder, printed to a PDF by Chrome exactly as a learner's "Download
 * PDF" does, uploaded to the CV review, and scored; likewise a LinkedIn
 * export, a cover letter, generated interview questions and a typed
 * mock interview. Six model calls. What comes back is saved to
 * worker/qa/captured.json, and runs without --model render those same
 * real reports, so the phone and narrow passes cost nothing.
 *
 * Screenshots land in worker/qa/shots/<nn>-<name>-<tag>.png. Read them. */
import fs from "node:fs";
import path from "node:path";
import { BASE, QA_DIR, cliArgs, openSession, readScratch, sleep, writeScratch } from "./vqa-lib.mjs";
import {
  ADVERT, CV_TEXT, FALLBACK_COVER, FALLBACK_INTERVIEW, FALLBACK_LINKEDIN, FALLBACK_REVIEW, FALLBACK_REWRITE,
  INTERVIEW_ANSWERS, LINKEDIN_LINES, TEMPLATE_DETAILS,
} from "./vqa-fixtures.mjs";

const { width, height, tag, flags } = cliArgs();
const MODEL = flags.includes("--model");
const ONLY = (flags.find((f) => f.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const S = await openSession({ width, height, tag, fakeMedia: true });
const { page, shot, elShot, go, clickSel, clickText, overflowCheck, tapCheck, auditCheck, note } = S;
page.on("dialog", (d) => d.accept().catch(() => {}));

const captured = readScratch("captured.json", {});
const ROUTE_KEYS = {
  "/api/review": "review", "/api/linkedin": "linkedin", "/api/linkedin-rewrite": "rewrite",
  "/api/cover-letter": "cover", "/api/interview": "interview", "/api/interview-questions": "questions",
};
page.on("response", async (r) => {
  const key = ROUTE_KEYS[new URL(r.url()).pathname];
  if (!key || r.request().method() !== "POST") return;
  try {
    const body = await r.json();
    if (body && (body.report || body.draft || body.rewrite || body.questions)) {
      captured[key] = body;
      writeScratch("captured.json", captured);
      console.log(`  captured ${key} from production`);
    } else {
      note("model route gave no result", `${key}: ${JSON.stringify(body).slice(0, 140)}`);
    }
  } catch { /* not json */ }
});

const CV_PDF = path.join(QA_DIR, "cv.pdf");
const LI_PDF = path.join(QA_DIR, "linkedin.pdf");

async function visible(id, timeout = 15000) {
  try {
    await page.waitForFunction((id) => {
      const e = document.getElementById(id);
      return e && !e.hidden && e.getBoundingClientRect().width > 0;
    }, { timeout }, id);
    return true;
  } catch { note("never appeared", `#${id}`); return false; }
}
async function text(id) {
  return page.evaluate((id) => (document.getElementById(id) || {}).textContent || "", id);
}
async function section(name, fn) {
  if (ONLY.length && !ONLY.includes(name)) return;
  console.log(`\n== ${name} ==`);
  try { await fn(); } catch (err) { note(`section ${name} failed`, String(err).slice(0, 220)); }
}
async function stageChecks(label) {
  await overflowCheck("#smain-content", label);
  await auditCheck("#smain-content", label);
  if (S.mobile) await tapCheck("#smain-content", label);
}

/* ------------------------------------------------------------------ hub */
await section("hub", async () => {
  let hubJson = null;
  const grab = async (r) => { if (r.url().endsWith("/api/hub") && !hubJson) { try { hubJson = await r.json(); } catch {} } };
  page.on("response", grab);
  await go("/hub");
  page.off("response", grab);
  console.log("  hub:", JSON.stringify(await page.evaluate(() => ({
    todo: (document.querySelector("#tasks-card h3") || {}).textContent,
    tasks: document.querySelectorAll("#task-list li").length,
    next: (document.getElementById("next-reason") || {}).textContent,
    band: Boolean(document.querySelector(".tplband")),
    cards: document.querySelectorAll(".tcard").length,
  }))));
  await stageChecks("hub");
  await shot("01-hub-new");
  /* The same page for a learner part-way through: real response shape,
   * scores filled in, so the trend lines, bands and Recent strip show. */
  if (hubJson && hubJson.summary) {
    const now = Math.floor(Date.now() / 1000);
    const tool = (h, days) => ({ latest: h[h.length - 1], previous: h[h.length - 2] ?? null, delta: h.length > 1 ? h[h.length - 1] - h[h.length - 2] : null, attempts: h.length, lastAt: now - days * 86400, history: h });
    const s = hubJson.summary;
    s.cv = tool([52, 61, 58, 74], 0);
    s.linkedin = tool([58, 66], 2);
    s.interview = tool([40, 55, 49], 5);
    s.cover = tool([100], 6);
    const done = { "cv-reviewed": 1, "cv-strong": 1, "li-reviewed": 1, "iv-done": 1, "cl-created": 1 };
    s.tasks = s.tasks.map((t) => ({ ...t, done: Boolean(done[t.id]) }));
    s.tasksDone = 5; s.careerReadiness = 71; s.readiness = 64;
    s.next = { tool: "interview", reason: "Your interview score (49) is the one holding your readiness back - one more round." };
    await page.setRequestInterception(true);
    const handler = (req) => {
      if (req.url().endsWith("/api/hub")) req.respond({ status: 200, contentType: "application/json", body: JSON.stringify(hubJson) });
      else req.continue();
    };
    page.on("request", handler);
    await go("/hub");
    await sleep(900);
    await stageChecks("hub active");
    await shot("02-hub-active");
    page.off("request", handler);
    await page.setRequestInterception(false);
  }
});

/* -------------------------------------------------------------- builder */
await section("builder", async () => {
  await go("/builder");
  await stageChecks("builder list");
  await shot("10-builder-list");
  await clickSel("#newcv");
  await visible("s-design");
  await stageChecks("builder designs");
  await shot("11-builder-designs");
  await clickSel(".dselect");
  await visible("s-pick");
  await stageChecks("builder starting point");
  await shot("12-builder-start");
  await clickSel(".startcard[data-starter='retail']");
  await visible("s-build");
  await sleep(900);
  console.log("  starter:", JSON.stringify(await page.evaluate(() => ({
    score: (document.getElementById("b-score") || {}).textContent,
    guard: !document.getElementById("exguard").hidden,
    design: (document.getElementById("cur-design") || {}).textContent,
  }))));
  await stageChecks("builder editor (starter)");
  await shot("13-builder-editor-starter");

  /* a learner's own CV, arriving from the review */
  await page.evaluate((t) => sessionStorage.setItem("fl_reopen_v1", t), CV_TEXT);
  await go("/builder?from=text");
  await visible("s-build");
  await sleep(1200);
  console.log("  imported:", JSON.stringify(await page.evaluate(() => {
    const pick = (b) => { const el = document.querySelector(`[data-b='${b}']`); return el ? el.textContent.trim().slice(0, 34) : null; };
    return { title: document.getElementById("cvtitle").value, name: pick("f:name"), role: pick("xp:0:role"), org: pick("xp:0:org"), bullet: pick("xb:0:0"), school: pick("edn:0:school"), score: document.getElementById("b-score").textContent, guard: !document.getElementById("exguard").hidden };
  })));
  await stageChecks("builder editor (imported)");
  await shot("14-builder-editor-imported");

  /* What "Download PDF" produces. Chrome prints the page with the
   * builder's own print stylesheet - the file a learner then uploads. */
  await page.emulateMediaType("print");
  await page.pdf({ path: CV_PDF, format: "A4", printBackground: true });
  await page.screenshot({ path: path.join(QA_DIR, "shots", `15-builder-print-${tag}.png`), fullPage: true });
  await page.emulateMediaType("screen");
  console.log(`  printed ${Math.round(fs.statSync(CV_PDF).size / 1024)}KB PDF`);

  /* handing the built CV straight to the review */
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2", timeout: 30000 }).catch(() => note("no navigation", "#sendreview")),
    clickSel("#sendreview"),
  ]);
  await sleep(800);
  console.log("  handoff:", page.url().replace(BASE, ""), "|", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll(".card h3")].map((h) => h.textContent).slice(0, 2))));
  await shot("16-tools-from-builder");
});

/* ---------------------------------------------------------------- tools */
await section("tools", async () => {
  await go("/tools");
  await stageChecks("tools step 1");
  await shot("20-tools-aim");
  await page.type("#target", ADVERT);
  await clickSel("#cv-n1");
  await visible("cvst-2");
  await stageChecks("tools step 2");
  await shot("21-tools-upload");

  if (!S.mobile) {
    /* the wrong kind of file must be turned away in words */
    const wrong = path.join(QA_DIR, "not-a-pdf.txt");
    fs.writeFileSync(wrong, "this is not a pdf");
    await (await page.$("#file")).uploadFile(wrong);
    await sleep(600);
    console.log("  wrong file:", JSON.stringify(await text("d-err")));
  }

  if (MODEL && fs.existsSync(CV_PDF)) {
    await (await page.$("#file")).uploadFile(CV_PDF);
    await visible("a-card", 8000);
    await shot("22-tools-analysing");
    await page.waitForFunction(() => !document.getElementById("r-card").hidden || !document.getElementById("m-card").hidden || !document.getElementById("d-err").hidden, { timeout: 150000 });
    if (await page.evaluate(() => !document.getElementById("r-card").hidden)) console.log("  real review:", await text("r-score"), "|", await text("r-verdict"), "|", await text("r-file"));
    else note("review did not produce a report", (await text("m-text")).slice(0, 160) || (await text("d-err")).slice(0, 160));
  } else {
    const f = captured.review || FALLBACK_REVIEW;
    await page.evaluate((r, c) => window.__flToolsRender(r, c), f.report, f.checks);
  }
  await sleep(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await stageChecks("tools report overview");
  await shot("23-tools-report-overview");
  for (const [n, rp] of [["24-tools-report-match", "match"], ["25-tools-report-checks", "checks"], ["26-tools-report-fixes", "improve"]]) {
    await clickSel(`.rtab[data-rp='${rp}']`);
    await stageChecks(`tools report ${rp}`);
    await shot(n);
  }
  console.log("  report:", JSON.stringify(await page.evaluate(() => ({
    lineNotes: document.querySelectorAll("#r-lines .lnote").length,
    builderBtnShown: !document.getElementById("r-builder").hidden,
    emDashes: document.getElementById("r-card").textContent.split(String.fromCharCode(0x2014)).length - 1,
  }))));
  /* the LinkedIn tab of the same page */
  await go("/tools");
  await clickSel("#tab-li");
  await shot("27-tools-linkedin-tab");
});

/* ------------------------------------------------------------- linkedin */
await section("linkedin", async () => {
  await go("/linkedin");
  await stageChecks("linkedin step 1");
  await shot("30-linkedin-aim");
  await page.type("#target", "Customer service apprenticeship");
  await clickSel("#li-n1");
  await visible("list-2");
  await stageChecks("linkedin step 2");
  await shot("31-linkedin-upload");

  if (MODEL) {
    /* a stand-in for LinkedIn's "Save to PDF": the same lines, printed */
    const p2 = await S.browser.newPage();
    await p2.setContent("<body style='font:13px Arial;line-height:1.5'>" + LINKEDIN_LINES.map((l) => `<p style='margin:2px 0'>${l}</p>`).join("") + "</body>");
    await p2.pdf({ path: LI_PDF, format: "A4" });
    await p2.close();
    await (await page.$("#file")).uploadFile(LI_PDF);
    await page.waitForFunction(() => !document.getElementById("r-card").hidden || !document.getElementById("m-card").hidden || !document.getElementById("d-err").hidden, { timeout: 150000 });
    if (await page.evaluate(() => !document.getElementById("r-card").hidden)) console.log("  real linkedin review:", await text("r-score"), "|", await text("r-verdict"));
    else note("linkedin review did not produce a report", (await text("m-text")).slice(0, 160) || (await text("d-err")).slice(0, 160));
  } else {
    await page.evaluate((r) => window.__flLiRender(r), (captured.linkedin || FALLBACK_LINKEDIN).report);
  }
  await sleep(900);
  await page.evaluate(() => window.scrollTo(0, 0));
  await stageChecks("linkedin overview");
  await shot("32-linkedin-overview");
  await clickSel(".rtab[data-rp='sections']");
  await stageChecks("linkedin sections");
  await shot("33-linkedin-sections");
  await clickSel("#sec-next");
  await clickSel("#sec-next");
  await elShot("#rp-sections", "34-linkedin-section-3");
  await clickSel(".rtab[data-rp='rewrite']");
  if (MODEL) {
    await clickSel("#rw-btn");
    await page.waitForFunction(() => !document.getElementById("rw-out").hidden || /Generate my rewrite/.test(document.getElementById("rw-btn").textContent), { timeout: 90000 }).catch(() => {});
    if (!(await page.evaluate(() => !document.getElementById("rw-out").hidden))) note("rewrite did not appear", await text("rw-btn"));
  } else {
    await page.evaluate((rw) => {
      const $ = (id) => document.getElementById(id);
      $("rw-headline").textContent = rw.headline; $("rw-about").textContent = rw.about;
      [["rw-headline", 220], ["rw-about", 2600]].forEach((p) => { const n = $(p[0]).textContent.length; $(p[0] + "-n").textContent = n + " / " + p[1] + " characters"; });
      $("rw-exp").textContent = rw.experience_tip; $("rw-next").textContent = rw.next; $("rw-out").hidden = false;
    }, (captured.rewrite || FALLBACK_REWRITE).rewrite);
  }
  console.log("  rewrite counts:", await text("rw-headline-n"), "|", await text("rw-about-n"));
  await stageChecks("linkedin rewrite");
  await shot("35-linkedin-rewrite");
});

/* --------------------------------------------------------- cover letter */
await section("cover", async () => {
  await go("/cover-letter");
  await stageChecks("cover step 1");
  await shot("40-cover-step1");
  await page.type("#cl-role", "Customer Service Apprentice");
  await page.type("#cl-company", "Leeds Building Society");
  await page.type("#cl-name", "Imogen Hart");
  await clickSel("#cl-n1");
  await page.type("#cl-jd", ADVERT);
  await stageChecks("cover step 2");
  await shot("41-cover-step2");
  await clickSel("#cl-n2");
  await page.evaluate(() => { const d = document.querySelector(".typefall"); if (d) d.open = true; });
  await page.type("#cl-cv", CV_TEXT);
  await stageChecks("cover step 3");
  await shot("42-cover-step3");
  if (MODEL) {
    await clickSel("#cl-go");
    await page.waitForFunction(() => !document.getElementById("s-out").hidden || !document.getElementById("s-msg").hidden, { timeout: 150000 });
    if (!(await page.evaluate(() => !document.getElementById("s-out").hidden))) note("cover letter did not draft", (await text("msgtext")).slice(0, 160));
  } else {
    await page.evaluate((d) => window.__flClRender(d), (captured.cover || FALLBACK_COVER).draft);
  }
  await sleep(1000);
  await page.evaluate(() => window.scrollTo(0, 0));
  console.log("  letter:", JSON.stringify(await page.evaluate(() => ({
    name: (document.getElementById("lp-name") || {}).textContent,
    contact: (document.getElementById("lp-contact") || {}).textContent,
    paragraphs: document.querySelectorAll("#lp-body p").length,
    checklist: (document.getElementById("clchk-count") || {}).textContent,
    emDashes: document.getElementById("s-out").textContent.split(String.fromCharCode(0x2014)).length - 1,
  }))));
  await stageChecks("cover draft");
  await shot("43-cover-draft");
  if (!S.mobile) {
    await page.emulateMediaType("print");
    await page.screenshot({ path: path.join(QA_DIR, "shots", `44-cover-print-${tag}.png`), fullPage: true });
    await page.emulateMediaType("screen");
  }
});

/* ------------------------------------------------------------ interview */
await section("interview", async () => {
  await go("/interview");
  await stageChecks("interview home");
  await shot("50-interview-home");
  await clickSel(".pkseg-b[data-pk='sector']");
  await stageChecks("interview by kind of work");
  await shot("51-interview-sectors");

  /* on camera, with Chrome's stand-in camera and microphone */
  await clickSel(".pkseg-b[data-pk='type']");
  await clickSel(".rolebtn[data-role='apprenticeship']");
  if (await visible("s-setup")) {
    await page.waitForFunction(() => !document.getElementById("setup-go").disabled, { timeout: 15000 }).catch(() => note("camera never became ready", "setup-go stayed disabled"));
    await sleep(3200);
    console.log("  setup checks:", JSON.stringify(await page.evaluate(() => [...document.querySelectorAll("#setup-list li")].map((li) => li.className + ":" + li.querySelector("span").textContent.slice(0, 44)))));
    await stageChecks("interview setup");
    await shot("52-interview-setup");
    await clickSel("#setup-go");
    await visible("s-int");
    await shot("53-interview-think");
    await clickSel("#rec-now");
    await sleep(4200);
    await shot("54-interview-recording");
    await clickSel("#rec-stop");
    await page.evaluate(() => { document.getElementById("typefall").open = true; });
    await page.type("#typed", INTERVIEW_ANSWERS[0]);
    await clickSel("#finishearly");
    await sleep(900);
    console.log("  recorded answer has video:", await page.evaluate(() => Boolean(document.querySelector("#rev-list video"))));
    await stageChecks("interview review (camera)");
    await shot("55-interview-review-video");
  }

  /* typed, no camera: answer two, skip one, finish early */
  await go("/interview");
  await clickSel(".rolebtn[data-role='general']");
  await visible("s-setup");
  await clickSel("#setup-novid");
  await visible("s-int");
  await stageChecks("interview question");
  await shot("56-interview-question");
  for (const answer of INTERVIEW_ANSWERS) {
    await page.evaluate(() => { document.getElementById("typefall").open = true; });
    await page.type("#typed", answer);
    await clickSel("#next");
  }
  await clickSel("#skipq");
  await clickSel("#finishearly");
  await sleep(900);
  console.log("  review:", await text("rev-count"));
  await stageChecks("interview review");
  await shot("57-interview-review");

  if (MODEL) {
    await clickSel("#rev-submit");
    await visible("s-rep");
    await page.waitForFunction(() => { const v = document.getElementById("r-verdict").textContent; return v.length > 3 && !/Being scored/.test(v); }, { timeout: 150000 }).catch(() => note("interview report never arrived", ""));
  } else {
    const rep = (captured.interview || FALLBACK_INTERVIEW).report;
    const qs = await page.evaluate(() => window.FL_QUESTIONS.general);
    await page.evaluate((rep, ans) => window.__flRenderReport(rep, ans), rep, INTERVIEW_ANSWERS.map((a, i) => ({ question: qs[i], answer: a, duration_secs: null })));
  }
  await sleep(1300);
  await page.evaluate(() => window.scrollTo(0, 0));
  console.log("  report:", await text("r-score"), "|", await text("r-verdict"), "|", await text("r-meta"));
  await stageChecks("interview report overview");
  await shot("58-interview-report-overview");
  await clickSel(".rtab[data-rp='delivery']");
  await shot("59-interview-report-delivery");
  await clickSel(".rtab[data-rp='answers']");
  await stageChecks("interview report answers");
  await shot("60-interview-report-answers");
  await clickSel("#rtab-self");
  await shot("61-interview-self-review");

  /* my recordings, and the learning tab */
  await go("/interview");
  await clickSel("#tab-recs");
  await sleep(700);
  console.log("  recordings saved:", await page.evaluate(() => document.querySelectorAll("#recs-list .reclib").length));
  await stageChecks("interview recordings");
  await shot("62-interview-recordings");
  await clickSel("#tab-learn");
  await sleep(600);
  await stageChecks("interview learning");
  await shot("63-interview-learning");
  await clickSel("[data-mod='star']");
  await elShot("#learn-reader", "64-interview-module-star");
  await clickSel("#reader-back");
  await clickSel("[data-qbrole='phone-screen']");
  await elShot("#qbank", "65-interview-bank-set");

  if (MODEL) {
    /* five questions written from a real advert, then the first one */
    await go("/interview");
    await page.type("#jd", ADVERT);
    await clickSel("#genbtn");
    if (await visible("s-setup", 60000)) {
      await clickSel("#setup-novid");
      await visible("s-int");
      console.log("  generated:", await text("qrole"), "|", await text("qtext"));
      await shot("66-interview-generated-q1");
    } else note("question generation did not start an interview", await text("genstate"));
  }
});

/* ------------------------------------------------------------ templates */
await section("templates", async () => {
  await go("/templates");
  await stageChecks("templates emails");
  await shot("70-templates-emails");
  await clickSel(".ochip[data-ch='call']");
  await stageChecks("templates calls");
  await shot("71-templates-calls");
  await clickSel(".ochip[data-ch='network']");
  await stageChecks("templates networking");
  await shot("72-templates-networking");
  await clickSel(".ochip[data-ch='email']");
  await clickSel(".ocard[data-open='speculative']");
  await sleep(600);
  await stageChecks("templates workbench blank");
  await shot("73-templates-blank");
  await page.type("#of-theirName", "Ms Khan");
  await page.evaluate((d) => window.__flOutOpen("speculative", d), TEMPLATE_DETAILS);
  console.log("  filled:", await text("opv-status"), "|", await text("opv-subject"));
  await stageChecks("templates workbench filled");
  await shot("74-templates-filled");
  await clickSel("#opv-copy");
  console.log("  copy:", await text("opv-copy"));
  await page.evaluate((d) => window.__flOutOpen("cold-call", d), TEMPLATE_DETAILS);
  await stageChecks("templates call script");
  await shot("75-templates-call-script");
  await page.evaluate((d) => window.__flOutOpen("linkedin-connect", d), TEMPLATE_DETAILS);
  console.log("  note:", await text("opv-status"));
  await elShot(".opreview", "76-templates-linkedin-note");
  await clickSel("#o-back");
  console.log("  back to list:", await page.evaluate(() => !document.getElementById("o-list").hidden && window.scrollY === 0));
});

/* -------------------------------------------------------------- library */
await section("library", async () => {
  await go("/library");
  await shot("80-library-empty");
  const f = captured.review || FALLBACK_REVIEW;
  await page.evaluate(async (r, t) => {
    await window.flLibSave("cv", "My CV - bank apprenticeship", t, r, r.overall);
    await window.flLibSave("cover", "Cover letter - Leeds Building Society", "Dear Ms Prior,\n\nI am applying for the Customer Service Apprentice role...", { next_step: "Name the shift you covered." }, null);
    await window.flLibSave("linkedin", "LinkedIn profile", "Weekend team member | BTEC Business student", { next_step: "Expand the About section." }, 52);
  }, f.report, CV_TEXT);
  await go("/library");
  await sleep(700);
  console.log("  library cards:", await page.evaluate(() => document.querySelectorAll(".lib-card").length));
  await stageChecks("library");
  await shot("81-library");
  await clickSel("[data-toggle]");
  await elShot(".lib-card", "82-library-read-all");
  await clickSel(".lib-f[data-k='cover']");
  await shot("83-library-filter-cover");
  await clickSel(".lib-f[data-k='all']");
  await clickSel("[data-del]");
  await sleep(600);
  console.log("  after delete:", await page.evaluate(() => document.querySelectorAll(".lib-card").length));
});

/* ---------------------------------------------- the pages around the hub */
await section("other", async () => {
  await go("/ai-privacy");
  await stageChecks("ai-privacy");
  await shot("90-ai-privacy");
  /* These four stand outside the app shell, so the checks read the
   * whole body rather than the shell's main column. */
  for (const [route, name] of [["/skills-passport", "91-skills-passport"], ["/passport/sample", "92-passport-sample"], ["/challenge", "93-challenge"], ["/demo", "94-demo"]]) {
    await go(route);
    await overflowCheck("body", name);
    await auditCheck("body", name);
    if (S.mobile) await tapCheck("body", name);
    await shot(name);
  }
  /* the sidebar on a phone: the page you are on must be in view */
  if (S.mobile) {
    await go("/templates");
    const on = await page.evaluate(() => { const a = document.querySelector(".sn-link.on"); const r = a.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth }; });
    if (on.left < 0 || on.right > on.vw) note("active nav item off screen", JSON.stringify(on));
    console.log("  active nav item:", JSON.stringify(on));
  }
});

await S.finish();
