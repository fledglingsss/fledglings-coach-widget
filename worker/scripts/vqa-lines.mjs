/* The lines Fledge writes FOR a learner, printed for a person to read
 * against what the learner gave. QA-only, against production.
 *
 *   node scripts/vqa-lines.mjs            (six model calls)
 *   node scripts/vqa-lines.mjs review     (one tool: review, rewrite, cover, interview, line)
 *
 * The no-fabrication law has a deterministic half (a number the learner
 * never gave is caught in code) and a judgement half (a result, reason
 * or feeling they never gave is the prompt's job). Nothing but a person
 * reading the output can check the second half, and the visual walk
 * does not print it. This does: every example, rewrite, pasted-in
 * section, letter paragraph and refined answer, with the learner's own
 * text above it, so an invention stands out.
 *
 * Each run is a fresh anonymous learner, so it costs the usual daily
 * goes of nobody but itself. */
import { ADVERT, CV_TEXT, INTERVIEW_ANSWERS, LINKEDIN_LINES } from "./vqa-fixtures.mjs";
import { BASE } from "./vqa-lib.mjs";

const only = process.argv[2] || "";
const id = () => Math.random().toString(16).slice(2) + Date.now().toString(16);

async function call(path, body) {
  const started = Date.now();
  const res = await fetch(BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: BASE },
    body: JSON.stringify({ learner_id: id(), session_id: id(), ...body }),
  });
  const json = await res.json();
  console.log(`\n${path}  ${res.status}  ${Date.now() - started}ms  kind=${json.kind}${json.reply ? "  reply=" + json.reply.slice(0, 90) : ""}`);
  return json;
}
const show = (label, text) => console.log(`  [${label}] ${String(text ?? "").replace(/\n/g, "\n          ")}`);
const EM = String.fromCharCode(0x2014);
let emDashes = 0;
const count = (text) => { emDashes += String(text ?? "").split(EM).length - 1; };

console.log("LEARNER'S CV\n  " + CV_TEXT.replace(/\n/g, "\n  "));

if (!only || only === "review") {
  const out = await call("/api/review", { kind: "cv", text: CV_TEXT, target: ADVERT });
  if (out.report) {
    const r = out.report;
    console.log(`  overall=${r.overall}  ${r.verdict}`);
    console.log(`  keywords: matched=${JSON.stringify(r.keywords.matched)} reword=${JSON.stringify(r.keywords.reword)} missing=${JSON.stringify(r.keywords.missing)}`);
    r.improvements.forEach((i, n) => { show(`fix ${n + 1}`, i.title); show("example", i.example === null ? "(withheld or none)" : i.example); count(i.example); });
    if (r.rewrite) { show("rewrite before", r.rewrite.before); show("rewrite after", r.rewrite.after); count(r.rewrite.after); }
    else show("rewrite", "(withheld or none)");
  }
}

if (!only || only === "line") {
  for (const line of ["Responsible for restocking shelves every weekend", "Trained two new starters on the till system"]) {
    const out = await call("/api/improve-line", { line });
    show("line", line);
    show("sharper", out.line);
    count(out.line);
  }
}

if (!only || only === "rewrite") {
  console.log("\nLEARNER'S PROFILE\n  " + LINKEDIN_LINES.join("\n  "));
  const out = await call("/api/linkedin-rewrite", { text: LINKEDIN_LINES.join("\n"), target: "Customer service apprenticeship" });
  if (out.rewrite) {
    show("headline", out.rewrite.headline);
    show("about", out.rewrite.about);
    show("experience", out.rewrite.experience_tip);
    count(JSON.stringify(out.rewrite));
  }
}

if (!only || only === "cover") {
  const out = await call("/api/cover-letter", { jd: ADVERT, cv_text: CV_TEXT, role: "Customer Service Apprentice", company: "Leeds Building Society" });
  if (out.draft) {
    out.draft.paragraphs.forEach((p, n) => { show(`paragraph ${n + 1}`, p); count(p); });
  }
}

if (!only || only === "interview") {
  console.log("\nLEARNER'S ANSWERS\n  " + INTERVIEW_ANSWERS.join("\n  "));
  const out = await call("/api/interview", {
    role: "general",
    /* the first two of "The classic questions", as the worker words them */
    answers: INTERVIEW_ANSWERS.map((answer, i) => ({
      question: [
        "Tell me a bit about yourself and why you applied for this role.",
        "What would you say is your biggest strength? Give me an example of it in action.",
      ][i],
      answer,
      duration_secs: null,
    })),
  });
  if (out.report) {
    out.report.answers.forEach((a, n) => { show(`refined ${n + 1}`, a.sharper || "(withheld)"); count(a.sharper); });
  }
}

console.log(`\nem dashes in everything printed: ${emDashes}`);
