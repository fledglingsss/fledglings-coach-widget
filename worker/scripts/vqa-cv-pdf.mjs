/* Does a CV made in the Resume Builder survive being read back?
 *
 *   BASE=http://127.0.0.1:8799 node scripts/vqa-cv-pdf.mjs
 *
 * The builder calls every design "ATS-safe". This is the check that the
 * claim is true: for each of the six designs it opens a real CV, prints
 * it with Chrome exactly as "Download PDF" does, reads the PDF back with
 * the same pdf.js + line assembler the CV review uses, and asserts on
 * the TEXT a parser would get:
 *
 *   - every heading arrives as words ("EDUCATION", not "E D U C A T I O N")
 *   - the lines come out in reading order, each section's content under
 *     its own heading
 *   - a section with nothing in it prints no heading at all
 *   - no editor furniture rides along (the sparkle button, placeholders,
 *     "+ Add a role")
 *   - the contact line carries no stray separators
 *
 * QA-only. Two CVs are used: a full one, and a sparse one with the
 * statement, achievements and town left empty - the sparse one is what
 * a learner half-way through actually downloads. */
import fs from "node:fs";
import path from "node:path";
import { QA_DIR, SHOTS, openSession, sleep } from "./vqa-lib.mjs";

const DESIGNS = ["classic", "executive", "modern", "accent", "sidebar", "compact"];

const FULL = {
  name: "Imogen Hart", phone: "07700 900123", email: "imogen@example.com", town: "Leeds", linkedin: "linkedin.com/in/imogen-hart",
  summary: "Business student with a year of weekend retail work, looking for a customer service apprenticeship.",
  experience: [
    { role: "Weekend Team Member", org: "Garden Centre", location: "Leeds", from: "Sept 2024", to: "Present", bullets: "Served 200+ customers a shift on tills and the plant desk\nTrained two new starters on the till system" },
    { role: "Volunteer", org: "Community Shop", location: "", from: "Jan 2024", to: "Aug 2024", bullets: "Sorted donations every Saturday morning" },
  ],
  education: [{ school: "Leeds City College", quals: "BTEC Business", from: "Sept 2023", to: "Present", detail: "Student representative" }],
  skills: "Tills, Rotas, Spreadsheets", extras: "First aid certificate\nEmployee of the month, March 2025",
};
const SPARSE = {
  name: "Imogen Hart", phone: "07700 900123", email: "imogen@example.com", town: "", linkedin: "",
  summary: "",
  experience: [{ role: "Weekend Team Member", org: "Garden Centre", location: "", from: "Sept 2024", to: "Present", bullets: "Served 200+ customers a shift on tills and the plant desk\n" }],
  education: [{ school: "Leeds City College", quals: "BTEC Business", from: "", to: "", detail: "" }],
  skills: "Tills, Rotas, Spreadsheets", extras: "",
};

/* What must be read, in this order, for each CV. */
const EXPECT = {
  full: [
    "Imogen Hart", "07700 900123", "PERSONAL STATEMENT", "Business student", "WORK & VOLUNTEERING", "Weekend Team Member",
    "Served 200+ customers", "Trained two new starters", "Volunteer", "Sorted donations", "EDUCATION", "Leeds City College",
    "BTEC Business", "SKILLS", "Tills", "ACHIEVEMENTS", "First aid certificate", "REFERENCES", "References are available on request",
  ],
  sparse: [
    "Imogen Hart", "07700 900123", "WORK & VOLUNTEERING", "Weekend Team Member", "Served 200+ customers", "EDUCATION",
    "Leeds City College", "BTEC Business", "SKILLS", "Tills", "REFERENCES", "References are available on request",
  ],
};
const FORBIDDEN = {
  full: [/✨/, /\+ ?Add/i, /remove (role|this section)/i, /Location \(optional\)/],
  sparse: [/✨/, /\+ ?Add/i, /remove (role|this section)/i, /PERSONAL STATEMENT/i, /ACHIEVEMENTS/i, /Two or three lines/i, /Town/],
};

const S = await openSession({ width: 1280, height: 900, tag: "cvpdf" });
const { page, go, note } = S;

async function readPdf(file) {
  const b64 = fs.readFileSync(file).toString("base64");
  return page.evaluate(async (b64) => {
    if (!window.pdfjsLib) {
      await new Promise((res, rej) => {
        const s = document.createElement("script");
        s.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
        s.onload = res; s.onerror = rej; document.head.appendChild(s);
      });
      window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    }
    const bin = atob(b64); const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    const doc = await window.pdfjsLib.getDocument({ data: buf }).promise;
    let text = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const tc = await (await doc.getPage(p)).getTextContent();
      text += window.flAssemblePageText(tc.items) + "\n\n";
    }
    /* The first page as a picture too - the PDF itself, not the screen's
     * idea of it - so the printed look can be checked by eye. */
    const first = await doc.getPage(1);
    const viewport = first.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width; canvas.height = viewport.height;
    await first.render({ canvasContext: canvas.getContext("2d"), viewport }).promise;
    return { text: text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim(), pages: doc.numPages, png: canvas.toDataURL("image/png").split(",")[1] };
  }, b64);
}

let failures = 0;
for (const [label, cv] of [["full", FULL], ["sparse", SPARSE]]) {
  for (const design of DESIGNS) {
    await go("/builder");
    await page.evaluate((cv, design) => {
      localStorage.setItem("fl_builder_cvs_v1", JSON.stringify({ cvs: [{ id: "qa1", title: "QA", updated: Date.now(), tpl: design, data: cv }] }));
    }, cv, design);
    await go("/builder");
    await page.click("[data-open='qa1']");
    await sleep(900);
    await page.emulateMediaType("print");
    const file = path.join(QA_DIR, `cv-${label}-${design}.pdf`);
    await page.pdf({ path: file, format: "A4", printBackground: true });
    await page.emulateMediaType("screen");
    const { text, pages, png } = await readPdf(file);
    fs.writeFileSync(file.replace(/\.pdf$/, ".txt"), text);
    fs.writeFileSync(path.join(SHOTS, `cvpdf-${label}-${design}.png`), Buffer.from(png, "base64"));
    const upper = text.toUpperCase();
    const problems = [];
    let at = 0;
    for (const want of EXPECT[label]) {
      const found = upper.indexOf(want.toUpperCase(), at);
      if (found === -1) {
        problems.push(upper.includes(want.toUpperCase()) ? `out of order: "${want}"` : `missing: "${want}"`);
      } else at = found + want.length;
    }
    for (const bad of FORBIDDEN[label]) if (bad.test(text)) problems.push(`should not print: ${bad}`);
    if (/(^|\n)\s*·/.test(text) || /·\s*(\n|$)/.test(text) || /·\s*·/.test(text)) problems.push("stray separator in the contact line");
    if (/\b(?:[A-Z] ){4,}[A-Z]\b/.test(text)) problems.push("a heading is read letter by letter");
    if (!text.startsWith("Imogen Hart")) problems.push(`the first words are not the name: "${text.slice(0, 24)}"`);
    if (!/(^|\n)• ?Served 200\+ customers/.test(text)) problems.push("a bullet point prints without its bullet");
    if (!text.includes("Tills, Rotas, Spreadsheets")) problems.push("skills are not comma-separated");
    if (pages !== 1) problems.push(`${pages} pages`);
    console.log(`${problems.length ? "FAIL" : "ok  "} ${label.padEnd(6)} ${design.padEnd(9)} ${problems.join("; ")}`);
    if (problems.length) { failures++; console.log(text.split("\n").map((l) => "      | " + l).join("\n")); note(`cv pdf ${label}/${design}`, problems.join("; ")); }
  }
}
console.log(failures ? `\n${failures} of ${DESIGNS.length * 2} printed CVs do not read back cleanly` : `\nall ${DESIGNS.length * 2} printed CVs read back cleanly`);
await S.finish();
