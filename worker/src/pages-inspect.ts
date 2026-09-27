/* /inspect - the read-only evidence snapshot behind a signed 7-day
 * link. Aggregate-only by design: no learner names, emails or
 * per-learner rows ever render here; an inspector sees reach,
 * engagement, module progress, confidence shifts and the written
 * narrative, nothing else. Standalone page, dashboard styling. */

export interface InspectModule {
  title: string;
  enrolled: number;
  done: number;
  going: number;
  idle: number;
}

export interface InspectShift {
  courseTitle: string;
  preAvgPct: number | null;
  postAvgPct: number | null;
  shift: number | null;
  preCount: number;
  postCount: number;
}

export interface InspectData {
  label: string;
  tag: string | null;
  expires: string;
  generatedAt: string;
  kpis: {
    learners: number;
    activeWeek: number;
    modulesCompleted: number;
    avgMinutes: number;
    reflectionAnswers: number;
  };
  curriculum: Array<{ area: string; enrolled: number; completed: number; pct: number }>;
  modules: InspectModule[];
  shifts: InspectShift[];
  narrative: string;
}

function esc(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function fmtMins(m: number): string {
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function kpi(value: string, label: string, sub: string): string {
  return (
    `<div class='kpi'><div class='kpi-n'>${value}</div>` +
    `<div class='kpi-l'>${esc(label)}</div><div class='kpi-s'>${esc(sub)}</div></div>`
  );
}

function shell(title: string, inner: string): string {
  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'><link rel='icon' type='image/png' href='/favicon.png?v=2'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    `<meta name='robots' content='noindex'><title>${esc(title)}</title>` +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' rel='stylesheet'>" +
    `<style>${INSPECT_CSS}</style></head><body>` +
    inner +
    "</body></html>"
  );
}

export function renderInspectPage(d: InspectData): string {
  const pct = (n: number, of: number): number => (of ? Math.round((n * 100) / of) : 0);

  const shiftRows = d.shifts
    .map((s) => {
      const pre = s.preAvgPct ?? 0;
      const post = s.postAvgPct ?? 0;
      const up = s.shift !== null && s.shift >= 0;
      return (
        `<div class='sh'><span class='sh-l' title='${esc(s.courseTitle)}'>${esc(s.courseTitle)}</span>` +
        `<div class='sh-t'><i class='sh-post' style='width:${post}%${up ? "" : ";background:#9A5812"}'></i>` +
        (s.preAvgPct === null ? "" : `<b class='sh-mark' style='left:${pre}%'></b>`) +
        "</div>" +
        `<span class='sh-v'>${s.preAvgPct === null ? "-" : `${s.preAvgPct}%`} &rarr; ${s.postAvgPct === null ? "-" : `${s.postAvgPct}%`}` +
        (s.shift === null ? "" : ` <b class='${up ? "up" : "down"}'>${up ? "+" : ""}${s.shift}</b>`) +
        `</span><span class='mut'>${s.preCount} before &middot; ${s.postCount} after</span></div>`
      );
    })
    .join("");

  const moduleRows = d.modules
    .map((m) => {
      const total = Math.max(m.enrolled, m.done + m.going + m.idle, 1);
      const seg = (n: number, colour: string): string =>
        n ? `<i style='width:${((n * 100) / total).toFixed(1)}%;background:${colour}'></i>` : "";
      return (
        `<div class='stk'><span class='stk-l' title='${esc(m.title)}'>${esc(m.title)}</span>` +
        `<div class='stk-t'>${seg(m.done, "#1B7A4B")}${seg(m.going, "#13507F")}${seg(m.idle, "#E3DDDA")}</div>` +
        `<span class='stk-v'><b style='color:#1B7A4B'>${m.done}</b> finished &middot; <b style='color:#13507F'>${m.going}</b> part-way &middot; ${m.idle} not started</span></div>`
      );
    })
    .join("");

  const curricRows = d.curriculum
    .map(
      (c) =>
        `<div class='cur'><span class='cur-l'>${esc(c.area)}</span>` +
        `<div class='cur-t'><i style='width:${c.pct}%'></i></div>` +
        `<span class='cur-v'>${c.pct}% <span class='mut'>(${c.completed} of ${c.enrolled})</span></span></div>`,
    )
    .join("");

  const inner =
    "<header class='mast'><div>" +
    "<span class='brand'>Fledglings</span><span class='snap'>Evidence snapshot</span></div>" +
    `<div class='mast-r'><b>${esc(d.label)}</b>` +
    (d.tag ? `<span class='chip'>${esc(d.tag)}</span>` : "") +
    "</div></header>" +
    `<p class='meta'>Read-only snapshot for inspection purposes &middot; generated ${esc(d.generatedAt)} &middot; link expires ${esc(d.expires)} &middot; contains no learner-identifiable data</p>` +

    "<div class='kpis'>" +
    kpi(String(d.kpis.learners), "Learners", "on the platform") +
    kpi(`${d.kpis.activeWeek}<small>(${pct(d.kpis.activeWeek, d.kpis.learners)}%)</small>`, "Active this week", "logged in within 7 days") +
    kpi(String(d.kpis.modulesCompleted), "Modules completed", "across all learners") +
    kpi(esc(fmtMins(d.kpis.avgMinutes)), "Study time per learner", "average so far") +
    kpi(String(d.kpis.reflectionAnswers), "Reflection answers", "written in their own words") +
    "</div>" +

    (d.shifts.length
      ? "<section class='card'><h2>Confidence shift by module</h2>" +
        "<p class='sub'>Learners rate their own confidence before and after each module. Bar = after; the notch marks before.</p>" +
        shiftRows +
        "</section>"
      : "") +

    "<section class='card'><h2>Module by module</h2>" +
    "<p class='sub'>Where every learner sits on each live module.</p>" +
    (moduleRows || "<p class='mut'>No module enrolments yet.</p>") +
    "</section>" +

    (d.curriculum.length
      ? "<section class='card'><h2>Curriculum impact</h2>" +
        "<p class='sub'>Completion across the Fledglings learning areas.</p>" +
        curricRows +
        "</section>"
      : "") +

    "<section class='card'><h2>Evidence narrative</h2>" +
    "<p class='sub'>Drafted from the aggregate figures above; honest about what the data can and cannot claim.</p>" +
    `<div class='narr'>${esc(d.narrative)}</div>` +
    "</section>" +

    "<p class='fine'>Figures describe engagement with Fledglings life-skills modules and learners' own self-reflections. " +
    "They evidence provision, participation and active monitoring, not attributed outcomes. " +
    "Individual learner records are available to the provider through their access-controlled dashboard.</p>";

  return shell(`Fledglings evidence snapshot - ${d.label}`, inner);
}

export function renderInspectBuilding(): string {
  return shell(
    "Fledglings - preparing snapshot",
    "<div class='card centre'><h2>Preparing this evidence snapshot&hellip;</h2>" +
      "<p class='sub'>The figures are being gathered from the platform; this can take a few seconds the first time. " +
      "The link itself is valid.</p>" +
      "<button class='btn' onclick='location.reload()'>Refresh</button></div>",
  );
}

export function renderInspectExpired(): string {
  return shell(
    "Fledglings - link expired",
    "<div class='card centre'><h2>This evidence link has expired</h2>" +
      "<p class='sub'>Inspector links last 7 days. Ask the provider to generate a fresh one from their Fledglings " +
      "dashboard; it takes one click.</p></div>",
  );
}

const INSPECT_CSS = `
:root{--navy:#05253C;--orange:#D9452B;--ink:#25394B;--mut:#6A7A88;--line:#E3DDDA;--ok:#1B7A4B;--blue:#13507F;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:#F4F1EF;color:var(--ink);padding:28px;max-width:960px;margin:0 auto;}
.mast{display:flex;justify-content:space-between;align-items:center;gap:14px;flex-wrap:wrap;}
.brand{font-size:24px;font-weight:800;color:var(--orange);}
.snap{margin-left:12px;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--mut);}
.mast-r{display:flex;align-items:center;gap:10px;font-size:16px;color:var(--navy);}
.chip{background:#ECE7E6;color:var(--blue);border-radius:999px;padding:3px 12px;font-size:12.5px;font-weight:700;}
.meta{color:var(--mut);font-size:12.5px;margin:8px 0 20px;}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:18px;}
.kpi{background:#fff;border:1px solid var(--line);border-radius:14px;padding:16px;}
.kpi-n{font-size:28px;font-weight:800;color:var(--navy);}
.kpi-n small{font-size:14px;color:var(--mut);margin-left:6px;font-weight:600;}
.kpi-l{font-size:13.5px;font-weight:700;margin-top:2px;}
.kpi-s{font-size:11.5px;color:var(--mut);}
.card{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:16px;}
.card h2{font-size:16.5px;color:var(--navy);}
.sub{font-size:12.5px;color:var(--mut);margin:4px 0 14px;}
.mut{color:var(--mut);}
.sh{display:grid;grid-template-columns:230px 1fr 140px 130px;gap:10px;align-items:center;margin-bottom:10px;font-size:13px;}
.sh-l{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sh-t{position:relative;height:14px;background:#ECE7E6;border-radius:999px;overflow:visible;}
.sh-post{display:block;height:100%;border-radius:999px;background:var(--ok);}
.sh-mark{position:absolute;top:-3px;width:3px;height:20px;background:var(--navy);border-radius:2px;}
.sh-v{font-weight:700;white-space:nowrap;}
.sh-v .up{color:var(--ok);}
.sh-v .down{color:#9A5812;}
.stk{display:grid;grid-template-columns:230px 1fr 250px;gap:10px;align-items:center;margin-bottom:10px;font-size:13px;}
.stk-l{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.stk-t{display:flex;height:14px;border-radius:999px;overflow:hidden;background:#ECE7E6;}
.stk-t i{display:block;height:100%;}
.stk-v{font-size:12px;color:var(--mut);white-space:nowrap;}
.cur{display:grid;grid-template-columns:180px 1fr 150px;gap:10px;align-items:center;margin-bottom:10px;font-size:13px;}
.cur-l{font-weight:600;}
.cur-t{height:14px;background:#ECE7E6;border-radius:999px;overflow:hidden;}
.cur-t i{display:block;height:100%;background:var(--blue);border-radius:999px;}
.cur-v{font-weight:700;}
.narr{background:#FAF8F7;border:1px solid var(--line);border-left:3px solid var(--orange);border-radius:12px;
  padding:14px 16px;font-size:14px;line-height:1.65;white-space:pre-line;}
.fine{font-size:11px;color:var(--mut);line-height:1.6;margin-top:4px;}
.centre{text-align:center;max-width:520px;margin:60px auto;padding:34px;}
.centre h2{margin-bottom:10px;}
.btn{margin-top:14px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:9px 16px;
  font-size:14px;font-weight:600;cursor:pointer;}
@media(max-width:700px){.sh,.stk,.cur{grid-template-columns:1fr;gap:4px;}body{padding:14px;}}
@media print{body{background:#fff;padding:0;}.card,.kpi{border:1px solid #ccc;box-shadow:none;}}
`;
