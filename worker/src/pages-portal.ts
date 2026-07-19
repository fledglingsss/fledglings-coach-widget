/* Provider portal — its own shell and design language, deliberately
 * NOT the card-grid look of the learner surfaces. An editorial data
 * ledger: dark masthead with an inline stat strip, underline tabs,
 * hairline-ruled sections and row-based lists. All dynamic values are
 * escaped; learner-level detail only ever renders behind an access
 * code, and tag-scoped codes are filtered server-side. */

import { esc } from "./pages";
import portalAppSource from "./portal/portal-app.js.txt";

const FEATHER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>' +
  '<line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>';

const PORTAL_CSS = `
:root{--navy:#05253C;--navy2:#0A3452;--orange:#D9452B;--mango:#ED9249;--blue:#13507F;--off:#ECE7E6;--ok:#1B7A4B;--ink:#22333f;--mut:#7d8a93;--hair:#DCD5D2;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:#F4F1F0;color:var(--navy);min-height:100vh;}
b,strong{font-weight:700;}
/* ---------- masthead ---------- */
.mast{background:linear-gradient(150deg,var(--navy) 0%,var(--navy2) 55%,var(--blue) 130%);color:#fff;}
.mast-in{max-width:1140px;margin:0 auto;padding:0 26px;}
.mast-top{display:flex;align-items:center;gap:14px;padding:18px 0 14px;flex-wrap:wrap;}
.roundel{width:40px;height:40px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--mango),var(--orange));}
.roundel svg{width:21px;height:21px;}
.mast-id .t1{font-size:15px;font-weight:700;letter-spacing:.02em;}
.mast-id .t2{font-size:11px;color:#9FB8CC;font-weight:600;letter-spacing:.14em;text-transform:uppercase;}
.mast-right{margin-left:auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.provider{font-size:14px;font-weight:600;}
.scopechip{font-size:11px;font-weight:700;letter-spacing:.06em;background:rgba(237,146,73,.18);color:var(--mango);
  border:1px solid rgba(237,146,73,.45);border-radius:999px;padding:4px 12px;text-transform:uppercase;}
#cohort-sel{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:9px;
  padding:8px 12px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;}
#cohort-sel option{color:var(--navy);}
.signout{color:#9FB8CC;font-size:13px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,.2);
  border-radius:9px;padding:8px 14px;}
.signout:hover{color:#fff;border-color:rgba(255,255,255,.5);}
.mast-meta{color:#7E9CB5;font-size:12px;padding-bottom:14px;}
/* the ledger strip */
.ledger{display:flex;border-top:1px solid rgba(255,255,255,.14);padding:18px 0 22px;flex-wrap:wrap;}
.lg{padding:0 30px;border-left:1px solid rgba(255,255,255,.14);min-width:130px;}
.lg:first-child{padding-left:0;border-left:none;}
.lg .v{font-size:38px;font-weight:800;line-height:1.05;letter-spacing:-.01em;}
.lg .v small{font-size:16px;font-weight:700;color:#9FB8CC;margin-left:4px;}
.lg .k{font-size:10.5px;font-weight:700;letter-spacing:.14em;color:#7E9CB5;text-transform:uppercase;margin-top:5px;}
.lg .d{font-size:11px;color:var(--mango);font-weight:600;margin-top:2px;min-height:14px;}
.lg.warn .v{color:#FF8A70;}
@media(max-width:820px){.lg{padding:0 18px;min-width:104px;}.lg .v{font-size:28px;}}
/* ---------- tab rail ---------- */
.rail{background:#fff;border-bottom:1px solid var(--hair);position:sticky;top:0;z-index:20;}
.rail-in{max-width:1140px;margin:0 auto;padding:0 26px;display:flex;gap:6px;overflow-x:auto;}
.ltab{border:none;background:none;font-family:inherit;font-size:14px;font-weight:600;color:var(--mut);
  padding:15px 16px 13px;cursor:pointer;border-bottom:2.5px solid transparent;white-space:nowrap;
  display:inline-flex;align-items:center;gap:8px;}
.ltab:hover{color:var(--navy);}
.ltab.on{color:var(--navy);border-bottom-color:var(--orange);}
.ltab .cnt{background:var(--orange);color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:2px 8px;}
/* ---------- content ---------- */
.content{max-width:1140px;margin:0 auto;padding:30px 26px 70px;}
.lview{display:none;}.lview.on{display:block;}
.sect{display:flex;align-items:center;gap:16px;margin:34px 0 18px;}
.sect:first-child{margin-top:0;}
.sect h3{font-size:12.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:var(--navy);white-space:nowrap;}
.sect::after{content:'';flex:1;height:1px;background:var(--hair);}
.sect .hint{font-size:12px;color:var(--mut);white-space:nowrap;}
.muted{color:var(--mut);font-size:13.5px;}
/* pulse bar */
.pulse{height:20px;border-radius:999px;overflow:hidden;display:flex;background:var(--hair);}
.pulse i{display:block;height:100%;}
.pulse-legend{display:flex;gap:20px;flex-wrap:wrap;margin-top:12px;font-size:13px;color:var(--ink);}
.pl{display:inline-flex;align-items:center;gap:7px;}
.pl i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.pl b{font-weight:700;}
/* trend + recency grid */
.duo{display:grid;grid-template-columns:3fr 2fr;gap:44px;align-items:start;}
@media(max-width:860px){.duo{grid-template-columns:1fr;gap:24px;}}
.trend svg{width:100%;height:auto;display:block;}
.tnote{font-size:12px;color:var(--mut);margin-top:8px;}
.rrow{display:grid;grid-template-columns:120px 1fr 34px;gap:12px;align-items:center;padding:7px 0;}
.rl{font-size:13px;font-weight:600;color:var(--ink);}
.rb{height:12px;border-radius:999px;background:var(--hair);overflow:hidden;}
.rb i{display:block;height:100%;border-radius:999px;}
.rn{font-size:13px;text-align:right;}
/* module ledger rows */
.mrow{display:grid;grid-template-columns:44px 1fr 52px;grid-template-rows:auto auto;gap:2px 16px;
  padding:13px 0;border-bottom:1px solid var(--hair);align-items:center;}
.mrow:last-child{border-bottom:none;}
.mrank{grid-row:1/3;font-size:22px;font-weight:300;color:#B9AFAB;font-variant-numeric:tabular-nums;}
.mtitle{font-size:14.5px;font-weight:600;}
.mtitle em{display:block;font-style:normal;font-size:12px;color:var(--mut);font-weight:500;margin-top:1px;}
.mpct{grid-row:1/3;font-size:15px;font-weight:700;text-align:right;color:var(--blue);}
.mbar{grid-column:2/3;height:5px;border-radius:999px;background:var(--hair);overflow:hidden;display:block;margin-top:5px;}
.mbar i{display:block;height:100%;background:linear-gradient(90deg,var(--mango),var(--orange));border-radius:999px;}
/* early-warning ledger */
.fchips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:6px;}
.fchip{border:1px solid var(--hair);background:#fff;border-radius:999px;padding:8px 15px;font-family:inherit;
  font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:7px;}
.fchip i{width:9px;height:9px;border-radius:50%;display:inline-block;}
.fchip b{font-weight:700;}
.fchip.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.wgroup{display:flex;align-items:center;gap:9px;font-size:11.5px;font-weight:800;letter-spacing:.13em;
  text-transform:uppercase;color:var(--mut);margin:22px 0 4px;}
.wgroup i{width:9px;height:9px;border-radius:50%;display:inline-block;}
.wrow{display:grid;grid-template-columns:10px minmax(150px,1.3fr) 2fr auto 16px;gap:14px;align-items:center;
  padding:13px 2px;border-bottom:1px solid var(--hair);cursor:pointer;}
.wrow:hover{background:rgba(19,80,127,.04);}
.wrow.open{background:rgba(19,80,127,.05);border-bottom-color:transparent;}
.wdot{width:9px;height:9px;border-radius:50%;}
.wname{font-size:14.5px;font-weight:700;}
.wname em{display:block;font-style:normal;font-size:12px;color:var(--mut);font-weight:500;}
.wreason{font-size:13px;color:var(--ink);}
.wdays{font-size:12px;font-weight:700;color:var(--blue);background:rgba(19,80,127,.08);border-radius:999px;
  padding:4px 11px;font-variant-numeric:tabular-nums;}
.wdays.hot{color:var(--orange);background:rgba(217,69,43,.09);}
.wchev{color:#B9AFAB;font-size:18px;font-weight:600;}
.wdetail{display:none;padding:2px 2px 18px 24px;border-bottom:1px solid var(--hair);}
.wdetail.on{display:block;}
.wdetail ul{margin:6px 0 10px 18px;font-size:13px;color:var(--ink);line-height:1.6;}
.wdetail blockquote{border-left:3px solid var(--mango);padding:10px 16px;background:#fff;font-size:13.5px;
  line-height:1.65;color:var(--ink);border-radius:0 10px 10px 0;margin:8px 0 12px;max-width:56em;}
.copybtn{border:1.5px solid var(--blue);background:#fff;color:var(--blue);border-radius:999px;padding:8px 18px;
  font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;}
.copybtn:hover{background:var(--blue);color:#fff;}
.copied{color:var(--ok);font-size:12.5px;font-weight:700;margin-left:10px;}
.empty{padding:34px 0;text-align:center;color:var(--ok);font-weight:600;font-size:14.5px;}
.fineprint{font-size:12.5px;color:var(--mut);line-height:1.6;margin-top:26px;max-width:64em;}
/* full modules table */
table{width:100%;border-collapse:collapse;font-size:13.5px;}
th{text-align:left;padding:9px 8px;border-bottom:2px solid var(--hair);font-size:11.5px;color:var(--mut);
  text-transform:uppercase;letter-spacing:.08em;}
td{padding:11px 8px;border-bottom:1px solid var(--hair);}
th.num,td.num{text-align:right;font-variant-numeric:tabular-nums;}
td.barcell .mbar{margin-top:0;}
/* evidence */
.narr{font-size:15.5px;line-height:1.85;color:var(--ink);border-left:3px solid var(--mango);
  padding:4px 0 4px 24px;max-width:62em;white-space:pre-wrap;}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:22px;align-items:center;}
.abtn{border:none;background:var(--orange);color:#fff;border-radius:10px;padding:12px 22px;font-family:inherit;
  font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;}
.abtn:hover{background:#c23a22;}
.abtn.sec{background:var(--blue);}
.abtn.ghost{background:#fff;color:var(--navy);border:1.5px solid var(--hair);}
.err{background:#FFF2EE;border-left:4px solid var(--orange);border-radius:0 10px 10px 0;padding:14px 16px;
  font-size:13.5px;margin-bottom:20px;}
.foot{border-top:1px solid var(--hair);color:var(--mut);font-size:12px;text-align:center;padding:18px;}
body:not(.loaded) .content{opacity:.45;transition:opacity .2s;}
body.loaded .content{opacity:1;}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
@media print{.rail,.signout,#cohort-sel,.actions,.fchips,.foot{display:none!important;}
  .lview{display:block!important;}body{background:#fff;}.mast{background:var(--navy)!important;-webkit-print-color-adjust:exact;}}
`;

function portalShell(title: string, bodyHtml: string): string {
  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<meta name='robots' content='noindex'>" +
    `<title>${esc(title)}</title>` +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap' rel='stylesheet'>" +
    `<style>${PORTAL_CSS}</style></head><body>` +
    bodyHtml +
    "<div class='foot'>Fledglings · fledglings.co · Where Growth Takes Flight</div>" +
    "</body></html>"
  );
}

export function renderPortalLogin(error?: string): string {
  return portalShell(
    "Fledglings — Provider Portal",
    "<div class='mast'><div class='mast-in'>" +
      "<div class='mast-top'>" +
      `<span class='roundel'>${FEATHER}</span>` +
      "<div class='mast-id'><div class='t1'>Fledglings</div><div class='t2'>Provider Portal</div></div>" +
      "</div>" +
      "<div style='padding:26px 0 46px;max-width:34em'>" +
      "<div style='font-size:30px;font-weight:800;line-height:1.15'>Your learners, your evidence,<br>and who needs a nudge today.</div>" +
      "<div style='color:#9FB8CC;font-size:14.5px;line-height:1.6;margin-top:12px'>Live engagement figures, an " +
      "early-warning view of learners going quiet, and an evidence narrative ready for your SAR — scoped to your cohort.</div>" +
      "</div></div></div>" +
      "<div class='content' style='max-width:520px'>" +
      (error ? `<div class='err'>${esc(error)}</div>` : "") +
      "<form method='POST' action='/portal/login'>" +
      "<div class='sect'><h3>Sign in</h3></div>" +
      "<label for='code' style='display:block;font-weight:600;font-size:14px;margin-bottom:8px'>Access code</label>" +
      "<input type='text' id='code' name='code' autocomplete='off' required placeholder='Issued by Fledglings' " +
      "style='width:100%;border:1.5px solid var(--hair);border-radius:12px;padding:14px 16px;font-size:15px;font-family:inherit'>" +
      "<div class='actions'><button class='abtn' type='submit'>Open portal</button></div>" +
      "<p class='fineprint'>Codes are issued to named provider staff and can be scoped to a single cohort. " +
      "Contact Fledglings if you need one.</p></form></div>",
  );
}

export function renderPortalDashboard(label: string, tag: string | null): string {
  const body =
    /* masthead + ledger */
    "<header class='mast'><div class='mast-in'>" +
    "<div class='mast-top'>" +
    `<span class='roundel'>${FEATHER}</span>` +
    "<div class='mast-id'><div class='t1'>Fledglings</div><div class='t2'>Provider Portal</div></div>" +
    "<div class='mast-right'>" +
    `<span class='provider'>${esc(label)}</span>` +
    (tag ? `<span class='scopechip'>${esc(tag)}</span>` : "") +
    "<select id='cohort-sel' aria-label='Filter by cohort' hidden></select>" +
    "<a class='signout' href='/portal/logout'>Sign out</a></div></div>" +
    "<div class='mast-meta' id='p-meta'>Loading live figures…</div>" +
    "<div class='ledger'>" +
    "<div class='lg'><div class='v' id='lg-total'>–</div><div class='k'>Learners</div><div class='d'></div></div>" +
    "<div class='lg'><div class='v'><span id='lg-active'>–</span><small id='lg-activepct'></small></div>" +
    "<div class='k'>Active last 7 days</div><div class='d' id='lg-delta'></div></div>" +
    "<div class='lg'><div class='v' id='lg-activation'>–</div><div class='k'>Ever logged in</div><div class='d'></div></div>" +
    "<div class='lg'><div class='v' id='lg-median'>–</div><div class='k'>Median recency</div><div class='d'></div></div>" +
    "<div class='lg warn'><div class='v' id='lg-attn'>–</div><div class='k'>Need attention</div><div class='d'></div></div>" +
    "</div></div></header>" +
    /* tab rail */
    "<nav class='rail'><div class='rail-in' role='tablist'>" +
    "<button class='ltab on' data-v='overview' role='tab' aria-selected='true'>Overview</button>" +
    "<button class='ltab' data-v='warning' role='tab' aria-selected='false'>Early warning <span class='cnt' id='t-warnn' hidden></span></button>" +
    "<button class='ltab' data-v='modules' role='tab' aria-selected='false'>Modules</button>" +
    "<button class='ltab' data-v='evidence' role='tab' aria-selected='false'>Evidence pack</button>" +
    "</div></nav>" +
    "<main class='content'>" +
    "<div class='err' id='p-err' hidden></div>" +
    /* overview */
    "<div class='lview on' id='lv-overview'>" +
    "<div class='sect'><h3>Cohort pulse</h3><span class='hint'>every learner, tiered by engagement signal</span></div>" +
    "<div class='pulse' id='pulse-bar'></div><div class='pulse-legend' id='pulse-legend'></div>" +
    "<div class='duo' style='margin-top:34px'>" +
    "<div class='trend'><div class='sect'><h3>Engagement trend</h3></div>" +
    "<svg id='trend-svg' viewBox='0 0 560 150' preserveAspectRatio='xMidYMid meet'></svg>" +
    "<div class='tnote' id='trend-note'></div></div>" +
    "<div><div class='sect'><h3>Last seen</h3></div><div id='recency'></div></div>" +
    "</div>" +
    "<div class='sect'><h3>Most-used modules</h3><span class='hint' id='mods-note' hidden>module figures are whole-school</span></div>" +
    "<div id='mods-mini'></div>" +
    "</div>" +
    /* early warning */
    "<div class='lview' id='lv-warning'>" +
    "<div class='sect'><h3>Early warning</h3><span class='hint'>click a learner for detail and a ready-to-send nudge</span></div>" +
    "<div class='fchips' id='warn-chips'></div>" +
    "<div id='warn-list'></div>" +
    "<p class='fineprint'>Tiers: <b>Needs contact</b> = 21+ days silent or never logged in · <b>Drifting</b> = 10–20 days · " +
    "<b>Early wobble</b> = 5–9 days, or logging in without finishing anything · new joiners get a week's grace. " +
    "Nudges are written to encourage, never to guilt-trip — send them through your own channel. " +
    "This view is for pastoral/safeguarding staff; treat it with the same care as any learner record.</p>" +
    "<div class='actions'><button class='abtn ghost' onclick='window.print()'>Print early-warning digest</button></div>" +
    "</div>" +
    /* modules */
    "<div class='lview' id='lv-modules'>" +
    "<div class='sect'><h3>Module engagement</h3><span class='hint'>from a recent sample of learner accounts</span></div>" +
    "<div id='mods-table' style='overflow-x:auto'></div>" +
    "</div>" +
    /* evidence */
    "<div class='lview' id='lv-evidence'>" +
    "<div class='sect'><h3>Evidence narrative</h3><span class='hint'>draft for your SAR / personal development reporting</span></div>" +
    "<div class='narr' id='narrative'></div>" +
    "<div class='actions'>" +
    "<button class='abtn' id='copy-narr'>Copy narrative</button><span class='copied' id='copied-narr' hidden>Copied ✓</span>" +
    "<a class='abtn sec' href='/portal/export.csv'>Download learner CSV</a>" +
    "<button class='abtn ghost' onclick='window.print()'>Print / save as PDF</button></div>" +
    "<p class='fineprint'>Figures describe engagement with Fledglings life-skills modules; sampled figures are labelled as such. " +
    "They evidence provision, participation and active monitoring — not attributed outcomes. The CSV lists your learners " +
    "with module counts, days since last login and attention level" +
    (tag ? ", limited to your cohort" : "") +
    ".</p></div>" +
    "</main>" +
    `<script>${portalAppSource}</script>`;

  return portalShell(`Fledglings Portal — ${label}`, body);
}
