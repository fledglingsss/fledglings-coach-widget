/* The Learner Games — a monthly cohort-vs-cohort completions race,
 * scored live by the completion webhooks. Aggregate-only (cohort
 * names + counts, never learners), so it is safe to embed anywhere
 * logged-in learners can see it. */

import { esc } from "./pages";
import { BIRD_MARK, WORDMARK_DARK } from "./brand";

export interface ChallengeRow {
  cohort: string;
  count: number;
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:#ECE7E6;color:#05253C;-webkit-font-smoothing:antialiased;}
.page{padding:34px 18px;display:flex;justify-content:center;}
.shell{width:100%;max-width:920px;border-radius:26px;overflow:hidden;background:#fff;position:relative;
  box-shadow:0 30px 70px -30px rgba(5,37,60,.45);border:1px solid rgba(5,37,60,.07);}
.hero{background:linear-gradient(150deg,#05253C 0%,#0A3452 58%,#13507F 135%);color:#fff;
  padding:30px 34px 34px;position:relative;overflow:hidden;}
.hero .bird{position:absolute;right:-30px;top:-40px;height:150%;opacity:.07;}
.hero .bird svg{height:100%;width:auto;}
.wordmark svg{height:24px;width:auto;display:block;}
.hero h1{font-size:33px;font-weight:800;margin-top:20px;line-height:1.15;}
.hero h1 em{font-style:normal;color:#ED9249;}
.hero p{color:#9FB8CC;font-size:14.5px;margin-top:8px;max-width:36em;line-height:1.6;}
.month{display:inline-block;margin-top:14px;font-size:12px;font-weight:800;letter-spacing:.16em;
  text-transform:uppercase;color:#ED9249;border:1px solid rgba(237,146,73,.45);
  background:rgba(237,146,73,.14);border-radius:999px;padding:6px 16px;}
.race{padding:30px 34px 34px;}
.crow{display:grid;grid-template-columns:44px 1fr auto;gap:16px;align-items:center;padding:13px 0;}
.cpos{width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:15px;color:#fff;background:#05253C;}
.crow:nth-child(1) .cpos{background:radial-gradient(circle at 35% 28%,#FFE3AE,#ED9249 55%,#D9452B);}
.crow:nth-child(2) .cpos{background:radial-gradient(circle at 35% 28%,#F4F8FB,#C3CDD8 55%,#97A6B5);color:#05253C;}
.crow:nth-child(3) .cpos{background:radial-gradient(circle at 35% 28%,#F0CBA3,#C77B44 55%,#9A5A2C);}
.cbarwrap{min-width:0;}
.cname{font-size:15.5px;font-weight:700;margin-bottom:7px;}
.ctrack{height:22px;border-radius:999px;background:#ECE7E6;overflow:hidden;}
.ctrack i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ED9249,#D9452B);
  min-width:22px;animation:grow 1s ease both;}
@keyframes grow{from{width:0!important}}
.ccount{font-size:26px;font-weight:800;font-variant-numeric:tabular-nums;}
.ccount small{font-size:12px;color:#7d8a93;font-weight:600;display:block;text-align:right;}
.empty{padding:26px 0;color:#7d8a93;font-size:14.5px;line-height:1.7;}
.foot{border-top:1px solid #ECE7E6;padding:16px 34px;font-size:12px;color:#7d8a93;line-height:1.6;}
.foot b{color:#B93A22;}
@media(max-width:600px){.hero{padding:22px 20px 26px;}.race{padding:22px 20px;}.hero h1{font-size:25px;}
  .crow{grid-template-columns:36px 1fr auto;gap:10px;}.cpos{width:34px;height:34px;font-size:13px;}}
@media (prefers-reduced-motion:reduce){*{animation:none!important;}}
`;

export function renderChallengePage(monthLabel: string, rows: ChallengeRow[]): string {
  const maxCount = Math.max(1, ...rows.map((r) => r.count));
  const rowsHtml = rows
    .map(
      (r, i) =>
        `<div class='crow'><span class='cpos'>${i + 1}</span>` +
        `<span class='cbarwrap'><span class='cname'>${esc(r.cohort)}</span>` +
        `<span class='ctrack'><i style='width:${Math.round((r.count / maxCount) * 100)}%'></i></span></span>` +
        `<span class='ccount'>${r.count}<small>completions</small></span></div>`,
    )
    .join("");
  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<meta name='robots' content='noindex'>" +
    `<title>The Learner Games — ${esc(monthLabel)}</title>` +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' rel='stylesheet'>" +
    `<style>${CSS}</style></head><body>` +
    "<div class='page'><div class='shell'>" +
    "<div class='hero'>" +
    `<div class='bird'>${BIRD_MARK}</div>` +
    `<span class='wordmark'>${WORDMARK_DARK}</span>` +
    "<h1>The Learner <em>Games</em></h1>" +
    "<p>Cohort against cohort, one month, every completed module scores. Bragging rights only — " +
    "but the bragging is excellent.</p>" +
    `<span class='month'>${esc(monthLabel)}</span></div>` +
    "<div class='race'>" +
    (rowsHtml ||
      "<div class='empty'>The starting gun has fired — the first module completed this month puts " +
      "a cohort on the board. It updates live.</div>") +
    "</div>" +
    "<div class='foot'>Scores count completed modules per cohort this calendar month, updated the moment " +
    "they happen. <b>Where Growth Takes Flight</b></div>" +
    "</div></div></body></html>"
  );
}
