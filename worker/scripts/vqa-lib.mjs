/* Shared helpers for the headless visual walks (scripts/vqa-*.mjs).
 *
 * QA-only; never deployed. These scripts open the real pages in the
 * local Chrome, drive them the way a learner does, and write PNGs to
 * worker/qa/shots/ for a person (or Claude) to actually LOOK at - a
 * layout fault is invisible to a DOM assertion.
 *
 * Why this lives in the repo: the first harness lived in a temp folder
 * and was deleted by the operating system's clean-up between sessions.
 * worker/qa/ is git-ignored scratch (screenshots, captured reports and
 * puppeteer-core); the scripts themselves are kept here.
 *
 * One-time setup:   cd worker/qa && npm i puppeteer-core
 * Against local dev: BASE=http://127.0.0.1:8799 node scripts/vqa-walk.mjs 375 812 phone
 */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const QA_DIR = path.join(here, "..", "qa");
export const SHOTS = path.join(QA_DIR, "shots");
fs.mkdirSync(SHOTS, { recursive: true });

/* puppeteer-core is resolved from the ignored scratch folder so the
 * deployable worker's package.json stays free of QA tooling. */
const require = createRequire(path.join(QA_DIR, "package.json"));
const puppeteer = require("puppeteer-core");

export const BASE = process.env.BASE || "https://fledglings-coach.fledglings.workers.dev";
export const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Read "<width> <height> <tag> [--flags]" from the command line. */
export function cliArgs() {
  const [w, h, tag, ...flags] = process.argv.slice(2);
  return { width: Number(w) || 1440, height: Number(h) || 1000, tag: tag || "desk", flags };
}

/**
 * Open a browser at one viewport and return the page with helpers
 * bound to it. Every problem the run meets (console errors, failed
 * requests, a page that scrolls sideways, an element spilling out of
 * its container, a tap target under 40px) is collected in `problems`
 * and printed by `finish()`, so a clean run says so in one line.
 */
export async function openSession({ width, height, tag, fakeMedia = false }) {
  const args = ["--no-sandbox", "--hide-scrollbars"];
  if (fakeMedia) args.push("--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream");
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args });
  const page = await browser.newPage();
  const mobile = width < 700;
  await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: mobile, hasTouch: mobile });
  const problems = [];
  const note = (kind, detail) => { problems.push(`${kind}: ${detail}`); console.log(`  !! ${kind}: ${detail}`); };

  page.on("pageerror", (e) => note("pageerror", String(e).slice(0, 180)));
  page.on("console", (m) => {
    if (m.type() !== "error") return;
    const text = m.text();
    /* MediaPipe logs its start-up line at error level. */
    if (/XNNPACK delegate|Created TensorFlow Lite/.test(text)) return;
    note("console.error", text.slice(0, 180));
  });
  page.on("response", (r) => {
    if (r.status() >= 400) note(`http ${r.status()}`, r.url().slice(0, 140));
  });

  const sideScroll = () =>
    page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);

  async function shot(name) {
    await sleep(700); /* every stage rises in over a third of a second */
    await page.screenshot({ path: path.join(SHOTS, `${name}-${tag}.png`), fullPage: true });
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    if (await sideScroll()) note("sidescroll", name);
    console.log(`ok  ${name}  (${h}px)`);
  }

  async function elShot(selector, name) {
    await sleep(500);
    const el = await page.$(selector);
    if (!el) { note("missing", `${selector} for ${name}`); return; }
    try {
      await el.evaluate((e) => e.scrollIntoView({ block: "start" }));
      await sleep(250);
      await el.screenshot({ path: path.join(SHOTS, `${name}-${tag}.png`) });
      console.log(`ok  ${name}  (element)`);
    } catch (err) {
      note("elshot", `${name}: ${String(err).slice(0, 100)}`);
    }
  }

  async function go(route) {
    await page.goto(BASE + route, { waitUntil: "networkidle2", timeout: 60000 });
    await sleep(700);
  }

  /** Click by selector, the way a tap does (pointer events included). */
  async function clickSel(selector) {
    const ok = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      el.click();
      return true;
    }, selector);
    if (!ok) note("missing", selector);
    await sleep(500);
    return ok;
  }

  /** Click the first element of `selector` whose text matches. */
  async function clickText(selector, pattern) {
    const ok = await page.evaluate((sel, src) => {
      const re = new RegExp(src, "i");
      const el = [...document.querySelectorAll(sel)].find((b) => re.test(b.textContent) && b.getBoundingClientRect().width > 0);
      if (!el) return false;
      el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
      el.click();
      return true;
    }, selector, pattern.source);
    if (!ok) note("missing", `${selector} matching ${pattern}`);
    await sleep(600);
    return ok;
  }

  /** Anything inside `selector` that sticks out past its right edge. */
  async function overflowCheck(selector, label) {
    const worst = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return "absent";
      const limit = root.getBoundingClientRect().right;
      let found = null;
      root.querySelectorAll("*").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.right <= limit + 1) return;
        /* a deliberate horizontal scroller is not an overflow */
        let p = el.parentElement, scroller = false;
        while (p && p !== root) {
          const ox = getComputedStyle(p).overflowX;
          if (ox === "auto" || ox === "scroll" || ox === "hidden") { scroller = true; break; }
          p = p.parentElement;
        }
        if (scroller) return;
        if (!found || r.right > found.right) found = { right: Math.round(r.right), el: el.tagName + "." + String(el.className).split(" ")[0], limit: Math.round(limit) };
      });
      return found;
    }, selector);
    if (worst === "absent") note("missing", `${selector} for overflow check`);
    else if (worst) note("overflow", `${label || selector}: ${JSON.stringify(worst)}`);
  }

  /** Interactive elements shorter than a thumb needs. Links inside a
   * sentence are exempt, as WCAG 2.5.8 exempts them. */
  async function tapCheck(selector, label) {
    const small = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      const out = new Set();
      root.querySelectorAll("button,a,summary,input:not([type=hidden]),textarea,select,[role=button]").forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0 || r.height >= 40) return;
        const cs = getComputedStyle(el);
        if (el.tagName === "A" && cs.display === "inline") return;
        if (el.type === "checkbox" || el.type === "radio") return;
        out.add(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0] || el.id}:${Math.round(r.height)}px`);
      });
      return [...out];
    }, selector);
    if (small && small.length) note("tap<40", `${label || selector}: ${small.slice(0, 8).join(", ")}`);
  }

  /* Classes that appear on the page but that no stylesheet mentions.
   * Most are harmless hooks for a script; the ones that are not are a
   * component borrowed from another page without its CSS, which renders
   * as bare text and looks fine to every DOM assertion. Collected across
   * the whole run and listed once at the end for a person to read. */
  const unstyled = new Map();

  /** Structural faults a screenshot does not show: a control inside
   * another control, a control with no name, a field with no label. */
  async function auditCheck(selector, label) {
    const found = await page.evaluate((sel) => {
      const root = document.querySelector(sel);
      if (!root) return null;
      const styled = new Set();
      const collect = (rules) => {
        for (const rule of rules) {
          if (rule.cssRules && rule.cssRules.length) collect(rule.cssRules);
          const text = rule.selectorText;
          if (!text) continue;
          const re = /\.([A-Za-z_][\w-]*)/g;
          let m;
          while ((m = re.exec(text))) styled.add(m[1]);
        }
      };
      for (const sheet of document.styleSheets) { try { collect(sheet.cssRules); } catch { /* cross-origin sheet */ } }
      const shown = (el) => { const r = el.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const bare = new Set();
      root.querySelectorAll("[class]").forEach((el) => {
        if (!shown(el)) return;
        el.classList.forEach((c) => { if (!styled.has(c)) bare.add(c); });
      });
      const interactive = "a[href],button,input:not([type=hidden]),select,textarea,summary,[role=button],[role=tab],[role=link],[tabindex]:not([tabindex='-1'])";
      const describe = (el) => `${el.tagName.toLowerCase()}${el.id ? "#" + el.id : ""}${el.classList[0] ? "." + el.classList[0] : ""}`;
      const nested = [];
      root.querySelectorAll(interactive).forEach((el) => {
        if (!shown(el)) return;
        const outer = el.parentElement && el.parentElement.closest(interactive);
        /* a label wrapping its own field is the one legitimate nesting */
        if (outer && outer.tagName !== "LABEL") nested.push(`${describe(el)} inside ${describe(outer)}`);
      });
      const nameOf = (el) => {
        const labelled = (el.getAttribute("aria-labelledby") || "").split(/\s+/).map((id) => (document.getElementById(id) || {}).textContent || "").join(" ");
        return (el.getAttribute("aria-label") || labelled || el.textContent || el.getAttribute("title") || el.value || "").trim();
      };
      const unnamed = [];
      root.querySelectorAll("button,a[href],[role=button],[role=tab]").forEach((el) => {
        if (shown(el) && !nameOf(el)) unnamed.push(describe(el));
      });
      const unlabelled = [];
      root.querySelectorAll("input:not([type=hidden]):not([type=file]),textarea,select").forEach((el) => {
        if (!shown(el)) return;
        const byFor = el.id && root.querySelector(`label[for='${el.id}']`);
        const named = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby") || byFor || el.closest("label");
        if (!named) unlabelled.push(describe(el));
      });
      return { bare: [...bare], nested: [...new Set(nested)], unnamed: [...new Set(unnamed)], unlabelled: [...new Set(unlabelled)] };
    }, selector);
    if (!found) return;
    found.bare.forEach((c) => { if (!unstyled.has(c)) unstyled.set(c, label || selector); });
    if (found.nested.length) note("control inside a control", `${label}: ${found.nested.slice(0, 4).join("; ")}`);
    if (found.unnamed.length) note("control with no name", `${label}: ${found.unnamed.slice(0, 6).join(", ")}`);
    if (found.unlabelled.length) note("field with no label", `${label}: ${found.unlabelled.slice(0, 6).join(", ")}`);
  }

  async function finish() {
    await browser.close();
    const unique = [...new Set(problems)];
    if (unstyled.size) {
      console.log(`\n${unstyled.size} class(es) no stylesheet mentions (first seen at):`);
      [...unstyled].sort().forEach(([c, where]) => console.log(`  .${c}  (${where})`));
    }
    console.log(unique.length ? `\n${unique.length} problem(s):\n  - ${unique.join("\n  - ")}` : "\nclean: no problems recorded");
    return unique;
  }

  return { browser, page, tag, width, height, mobile, problems, note, shot, elShot, go, clickSel, clickText, overflowCheck, tapCheck, auditCheck, sideScroll, finish };
}

/** Load a JSON file from the scratch folder, or a default. */
export function readScratch(name, fallback = null) {
  try { return JSON.parse(fs.readFileSync(path.join(QA_DIR, name), "utf8")); } catch { return fallback; }
}
export function writeScratch(name, value) {
  fs.writeFileSync(path.join(QA_DIR, name), JSON.stringify(value, null, 1));
}
