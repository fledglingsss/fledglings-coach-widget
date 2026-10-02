/* Contact sheets for the phone-width walks. QA-only.
 *
 *   node scripts/vqa-sheet.mjs phone
 *   node scripts/vqa-sheet.mjs narrow 50 66      (only shots numbered 50-66)
 *
 * A phone page is 375px wide and several thousand tall. Looked at whole
 * it is shrunk until the words cannot be read, which defeats the point
 * of looking. This cuts every screenshot of one walk into columns and
 * lays them side by side at full size, so a tall page reads left to
 * right like a newspaper and nothing has to be squinted at.
 *
 * Sheets land in worker/qa/sheets/<tag>-NN.png, each under 2000px a
 * side. The label over a column is the shot it came from and which
 * slice of it this is. */
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { CHROME, QA_DIR, SHOTS } from "./vqa-lib.mjs";

const require = createRequire(path.join(QA_DIR, "package.json"));
const puppeteer = require("puppeteer-core");

const tag = process.argv[2] || "phone";
const from = Number(process.argv[3]) || 0;
const to = Number(process.argv[4]) || 999;
/* --prefix=d picks one walk's shots by the letter its names start with
 * (d = dashboard, w = widget); without it, the numbered learner walk. */
const prefix = (process.argv.find((a) => a.startsWith("--prefix=")) || "").slice(9);
const SHEETS = path.join(QA_DIR, "sheets");
fs.mkdirSync(SHEETS, { recursive: true });

const COLUMN_HEIGHT = 1880;
const LABEL_HEIGHT = 22;
const GAP = 8;
const MAX_SHEET_WIDTH = 1990;
/* Slices overlap a little so a line cut in half at the bottom of one
 * column is whole at the top of the next. */
const OVERLAP = 40;

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file) {
  const head = Buffer.alloc(24);
  const fd = fs.openSync(file, "r");
  fs.readSync(fd, head, 0, 24, 0);
  fs.closeSync(fd);
  return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

const suffix = `-${tag}.png`;
const shots = fs.readdirSync(SHOTS)
  .filter((f) => f.endsWith(suffix))
  .filter((f) => {
    if (prefix) return f.startsWith(prefix) && !/^\d/.test(f);
    const n = parseInt(f, 10);
    return !Number.isNaN(n) && n >= from && n <= to;
  })
  .sort();
const sheetName = prefix ? `${tag}-${prefix}` : tag;
if (!shots.length) { console.log(`no shots for "${tag}"`); process.exit(1); }

const columns = [];
for (const f of shots) {
  const file = path.join(SHOTS, f);
  const { width, height } = pngSize(file);
  const step = COLUMN_HEIGHT - OVERLAP;
  const count = height <= COLUMN_HEIGHT ? 1 : Math.ceil((height - OVERLAP) / step);
  for (let i = 0; i < count; i++) {
    columns.push({ url: pathToFileURL(file).href, width, top: i * step, shown: Math.min(COLUMN_HEIGHT, height - i * step), label: `${f.slice(0, -suffix.length)}${count > 1 ? ` ${i + 1}/${count}` : ""}` });
  }
}

/* Pack columns onto sheets, left to right. */
const sheets = [];
let current = { cols: [], width: 0 };
for (const col of columns) {
  const need = col.width + GAP;
  if (current.cols.length && current.width + need > MAX_SHEET_WIDTH) { sheets.push(current); current = { cols: [], width: 0 }; }
  current.cols.push({ ...col, left: current.width });
  current.width += need;
}
if (current.cols.length) sheets.push(current);

/* Clear the last run's sheets for this tag so a shorter run leaves no
 * stale pages behind to be read by mistake. */
fs.readdirSync(SHEETS)
  .filter((f) => new RegExp(`^${sheetName}-\\d+\\.png$`).test(f))
  .forEach((f) => fs.unlinkSync(path.join(SHEETS, f)));

const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--no-sandbox", "--allow-file-access-from-files"] });
const page = await browser.newPage();
for (let s = 0; s < sheets.length; s++) {
  const sheet = sheets[s];
  const html = "<!doctype html><meta charset='utf-8'><body style='margin:0;background:#2b2f36;font:12px/1 Arial,sans-serif'>" +
    sheet.cols.map((c) =>
      `<div style='position:absolute;left:${c.left}px;top:0;width:${c.width}px'>` +
      `<div style='height:${LABEL_HEIGHT}px;line-height:${LABEL_HEIGHT}px;color:#fff;padding-left:4px;white-space:nowrap;overflow:hidden'>${c.label}</div>` +
      `<div style='width:${c.width}px;height:${c.shown}px;background:url("${c.url}") 0 -${c.top}px no-repeat'></div></div>`).join("") +
    "</body>";
  const htmlFile = path.join(SHEETS, `_sheet.html`);
  fs.writeFileSync(htmlFile, html);
  await page.setViewport({ width: sheet.width, height: COLUMN_HEIGHT + LABEL_HEIGHT, deviceScaleFactor: 1 });
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: "load" });
  const name = `${sheetName}-${String(s + 1).padStart(2, "0")}.png`;
  await page.screenshot({ path: path.join(SHEETS, name) });
  console.log(`${name}  ${sheet.cols.map((c) => c.label).join(" | ")}`);
}
fs.unlinkSync(path.join(SHEETS, "_sheet.html"));
await browser.close();
