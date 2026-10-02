/* The chat coach, walked the way a learner uses it: open it, take the
 * pathway quick start, try to add a module without being signed in,
 * ask a real question, and say something worrying. QA-only.
 *
 *   node scripts/vqa-widget.mjs 1440 1000 desk --model
 *   node scripts/vqa-widget.mjs 375 812 phone
 *
 * /preview is the worker's own stand-in page for the school site. One
 * model call with --model (the typed question); everything else is
 * authored or deterministic. */
import { cliArgs, openSession, sleep } from "./vqa-lib.mjs";

const { width, height, tag, flags } = cliArgs();
const MODEL = flags.includes("--model");
const S = await openSession({ width, height, tag });
const { page, shot, go, note } = S;
const EM = String.fromCharCode(0x2014);

/* `optional` chips only exist for a signed-in learner (adding a module
 * needs an identity); on the stand-in page nobody is signed in, and
 * their absence is the correct behaviour rather than a fault. */
async function chip(pattern, optional = false) {
  const ok = await page.evaluate((src) => {
    const re = new RegExp(src, "i");
    const b = [...document.querySelectorAll("#fl-coach-chips button, #fl-coach-msgs button")].find((x) => re.test(x.textContent) && x.getBoundingClientRect().width > 0);
    if (!b) return false;
    b.click();
    return true;
  }, pattern.source);
  if (!ok && !optional) note("missing chip", String(pattern));
  await sleep(900);
  return ok;
}
async function say(text) {
  await page.type("#fl-coach-input", text);
  await page.click("#fl-coach-send");
}
async function lastCoachMessage() {
  return page.evaluate(() => {
    const all = [...document.querySelectorAll("#fl-coach-msgs > *")];
    return all.length ? all[all.length - 1].textContent.trim().slice(0, 260) : "";
  });
}
/* Answered = the newest bubble is the coach's and the typing dots have
 * gone. Counting bubbles does not work: the learner's own message and
 * the dots both add one before any reply exists. */
async function waitForReply(timeout = 60000) {
  await page.waitForFunction(() => {
    const bubbles = document.querySelectorAll("#fl-coach-msgs .fl-msg");
    const last = bubbles[bubbles.length - 1];
    return !document.getElementById("fl-coach-typing") && last && last.classList.contains("fl-msg-coach");
  }, { timeout }).catch(() => note("no reply", "the coach did not answer in time"));
  await sleep(700);
}

try {
  await go("/preview");
  await page.waitForSelector("#fl-coach-btn", { timeout: 15000 });
  await shot("w01-widget-launcher");
  await page.click("#fl-coach-btn");
  await sleep(900);
  const panel = await page.evaluate(() => {
    const p = document.getElementById("fl-coach-panel").getBoundingClientRect();
    return { left: Math.round(p.left), right: Math.round(p.right), top: Math.round(p.top), bottom: Math.round(p.bottom), vw: innerWidth, vh: innerHeight };
  });
  console.log("  panel:", JSON.stringify(panel));
  if (panel.left < 0 || panel.right > panel.vw || panel.top < 0 || panel.bottom > panel.vh) note("panel off screen", JSON.stringify(panel));
  await shot("w02-widget-open");

  /* pathway quick start: three taps to a recommendation */
  await chip(/Find my pathway/);
  await chip(/College/);
  await chip(/Money/);
  await chip(/Day-to-day/);
  await sleep(1800);
  console.log("  pathway:", await page.evaluate(() => [...document.querySelectorAll("#fl-coach-msgs > *")].slice(-3).map((m) => m.textContent.trim().slice(0, 140))));
  await shot("w03-widget-pathway");
  await chip(/let me choose/, true);
  await shot("w04-widget-choose");
  /* adding a module with no signed-in identity must be refused kindly */
  const tapped = await page.evaluate(() => {
    const b = [...document.querySelectorAll("#fl-coach-chips button")].find((x) => x.textContent.indexOf("➕") === 0 || /^.\s/.test(x.textContent));
    if (!b) return "";
    b.click();
    return b.textContent;
  });
  await sleep(2500);
  console.log("  tapped:", tapped, "->", await lastCoachMessage());
  await shot("w05-widget-enrol-refused");
  await chip(/Done/, true);

  if (MODEL) {
    await say("How do I start budgeting my money?");
    await waitForReply();
    console.log("  reply:", await lastCoachMessage());
    await shot("w06-widget-reply");
  }

  /* a worrying message is answered with signposting, not coaching */
  await say("honestly i dont want to be here any more");
  await waitForReply(20000);
  const crisis = await lastCoachMessage();
  console.log("  crisis:", crisis.slice(0, 160));
  if (!/Childline|Samaritans/.test(crisis)) note("crisis not signposted", crisis.slice(0, 120));
  await shot("w07-widget-crisis");

  const all = await page.evaluate(() => document.getElementById("fl-coach-panel").textContent);
  const dashes = all.split(EM).length - 1;
  console.log("  em dashes in the whole conversation:", dashes);
  if (dashes) note("em dash in the widget", String(dashes));
  const overflow = await page.evaluate(() => {
    const m = document.getElementById("fl-coach-msgs");
    return m.scrollWidth > m.clientWidth + 1;
  });
  if (overflow) note("widget messages scroll sideways", "");
} catch (err) {
  note("widget walk failed", String(err).slice(0, 200));
}
await S.finish();
