/* Provider portal — branded data ledger. Uses the REAL Fledglings
 * wordmark (white-text variant on the navy masthead, per brand
 * guidelines: icon stays Orange everywhere) and the bird mark as a
 * watermark. Deliberately not a card grid: an editorial ledger with
 * hairline rules, a masthead stat strip and row-based lists.
 * Tag-scoped codes are filtered server-side before anything renders. */

import { esc } from "./pages";
import { BIRD_MARK, WORDMARK_DARK } from "./brand";
import portalAppSource from "./portal/portal-app.js.txt";

const PORTAL_CSS = `
:root{--navy:#05253C;--navy2:#0A3452;--orange:#D9452B;--mango:#ED9249;--blue:#13507F;--off:#ECE7E6;--ok:#1B7A4B;--ink:#22333f;--mut:#7d8a93;--hair:#DCD5D2;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:#F6F3F1;color:var(--navy);min-height:100vh;}
b,strong{font-weight:700;}
.keyline{height:4px;background:linear-gradient(90deg,var(--orange),var(--mango) 55%,var(--orange));}
/* ---------- masthead ---------- */
.mast{background:linear-gradient(150deg,var(--navy) 0%,var(--navy2) 58%,var(--blue) 135%);color:#fff;position:relative;overflow:hidden;}
.mast-bird{position:absolute;right:-40px;top:-60px;height:150%;opacity:.06;pointer-events:none;}
.mast-bird svg{height:100%;width:auto;}
.mast-in{max-width:1160px;margin:0 auto;padding:0 28px;position:relative;}
.mast-top{display:flex;align-items:center;gap:18px;padding:24px 0 10px;flex-wrap:wrap;}
.wordmark svg{height:30px;width:auto;display:block;}
.portal-tag{font-size:11px;font-weight:700;letter-spacing:.22em;color:var(--mango);text-transform:uppercase;
  border-left:1px solid rgba(255,255,255,.25);padding-left:18px;line-height:1.3;align-self:center;}
.mast-right{margin-left:auto;display:flex;align-items:center;gap:12px;flex-wrap:wrap;}
.provider{font-size:14.5px;font-weight:600;}
.scopechip{font-size:11px;font-weight:700;letter-spacing:.06em;background:rgba(237,146,73,.16);color:var(--mango);
  border:1px solid rgba(237,146,73,.45);border-radius:999px;padding:5px 13px;text-transform:uppercase;}
#cohort-sel{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:10px;
  padding:9px 12px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;}
#cohort-sel option{color:var(--navy);}
.signout{color:#9FB8CC;font-size:13px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,.2);
  border-radius:10px;padding:9px 15px;}
.signout:hover{color:#fff;border-color:rgba(255,255,255,.5);}
.mast-meta{color:#7E9CB5;font-size:12.5px;padding:2px 0 20px;}
/* stat ledger strip */
.ledger{display:flex;border-top:1px solid rgba(255,255,255,.14);padding:22px 0 26px;flex-wrap:wrap;row-gap:20px;}
.lg{padding:0 34px;border-left:1px solid rgba(255,255,255,.14);min-width:150px;}
.lg:first-child{padding-left:0;border-left:none;}
.lg .k{font-size:10.5px;font-weight:700;letter-spacing:.16em;color:#7E9CB5;text-transform:uppercase;}
.lg .v{font-size:44px;font-weight:800;line-height:1.08;letter-spacing:-.015em;margin-top:6px;font-variant-numeric:tabular-nums;}
.lg .v small{font-size:17px;font-weight:700;color:#9FB8CC;margin-left:5px;}
.lg .d{font-size:11.5px;color:var(--mango);font-weight:600;margin-top:4px;min-height:15px;}
.lg.warn .v{color:#FF8A70;}
.lg.warn .k::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--orange);margin-right:7px;vertical-align:1px;}
@media(max-width:860px){.lg{padding:0 20px;min-width:112px;}.lg .v{font-size:30px;}}
/* ---------- tab rail ---------- */
.rail{background:#fff;border-bottom:1px solid var(--hair);position:sticky;top:0;z-index:20;box-shadow:0 1px 0 rgba(5,37,60,.03);}
.rail-in{max-width:1160px;margin:0 auto;padding:0 28px;display:flex;gap:10px;overflow-x:auto;}
.ltab{border:none;background:none;font-family:inherit;font-size:14.5px;font-weight:600;color:var(--mut);
  padding:17px 16px 14px;cursor:pointer;border-bottom:3px solid transparent;white-space:nowrap;
  display:inline-flex;align-items:center;gap:8px;}
.ltab:hover{color:var(--navy);}
.ltab.on{color:var(--navy);border-bottom-color:var(--orange);}
.ltab .cnt{background:var(--orange);color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:2px 8px;}
/* ---------- content ---------- */
.content{max-width:1160px;margin:0 auto;padding:36px 28px 80px;}
.lview{display:none;}.lview.on{display:block;}
.sect{display:flex;align-items:center;gap:14px;margin:40px 0 20px;}
.sect:first-child{margin-top:0;}
.sect .bd{height:16px;flex:none;display:flex;}
.sect .bd svg{height:16px;width:auto;}
.sect h3{font-size:13px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;color:var(--navy);white-space:nowrap;}
.sect::after{content:'';flex:1;height:1px;background:var(--hair);}
.sect .hint{font-size:12.5px;color:var(--mut);white-space:nowrap;}
.muted{color:var(--mut);font-size:13.5px;}
/* pulse bar */
.pulse{height:26px;border-radius:999px;overflow:hidden;display:flex;background:var(--hair);gap:2px;}
.pulse i{display:block;height:100%;}
.pulse-legend{display:flex;gap:10px;flex-wrap:wrap;margin-top:14px;}
.pl{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1px solid var(--hair);border-radius:999px;
  padding:7px 15px;font-size:13px;font-weight:600;color:var(--ink);}
.pl i{width:10px;height:10px;border-radius:50%;display:inline-block;}
.pl b{font-weight:800;}
/* trend + recency grid */
.duo{display:grid;grid-template-columns:3fr 2fr;gap:48px;align-items:start;}
@media(max-width:880px){.duo{grid-template-columns:1fr;gap:26px;}}
.trend svg{width:100%;height:auto;display:block;}
.tnote{font-size:12.5px;color:var(--mut);margin-top:10px;}
.rrow{display:grid;grid-template-columns:118px 1fr 36px;gap:14px;align-items:center;padding:8px 0;}
.rl{font-size:13.5px;font-weight:600;color:var(--ink);}
.rb{height:14px;border-radius:999px;background:var(--hair);overflow:hidden;}
.rb i{display:block;height:100%;border-radius:999px;}
.rn{font-size:13.5px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums;}
/* module ledger rows */
.mrow{display:grid;grid-template-columns:52px 1fr 58px;grid-template-rows:auto auto;gap:2px 18px;
  padding:15px 0;border-bottom:1px solid var(--hair);align-items:center;}
.mrow:last-child{border-bottom:none;}
.mrank{grid-row:1/3;font-size:26px;font-weight:300;color:var(--mango);font-variant-numeric:tabular-nums;}
.mtitle{font-size:15px;font-weight:600;}
.mtitle em{display:block;font-style:normal;font-size:12.5px;color:var(--mut);font-weight:500;margin-top:2px;}
.mpct{grid-row:1/3;font-size:16px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;}
.mbar{grid-column:2/3;height:6px;border-radius:999px;background:var(--hair);overflow:hidden;display:block;margin-top:6px;}
.mbar i{display:block;height:100%;background:linear-gradient(90deg,var(--mango),var(--orange));border-radius:999px;}
/* early-warning ledger */
.fchips{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px;}
.fchip{border:1px solid var(--hair);background:#fff;border-radius:999px;padding:9px 16px;font-family:inherit;
  font-size:13px;font-weight:600;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:8px;}
.fchip i{width:9px;height:9px;border-radius:50%;display:inline-block;}
.fchip b{font-weight:800;}
.fchip.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.wgroup{display:flex;align-items:center;gap:10px;font-size:11.5px;font-weight:800;letter-spacing:.15em;
  text-transform:uppercase;color:var(--mut);margin:26px 0 4px;}
.wgroup i{width:9px;height:9px;border-radius:50%;display:inline-block;}
.wgroup::after{content:'';flex:1;height:1px;background:var(--hair);}
.wrow{display:grid;grid-template-columns:40px minmax(150px,1.25fr) 2fr auto 16px;gap:16px;align-items:center;
  padding:13px 4px;border-bottom:1px solid var(--hair);cursor:pointer;}
.wrow:hover{background:rgba(19,80,127,.045);}
.wrow.open{background:rgba(19,80,127,.055);border-bottom-color:transparent;}
.wava{width:38px;height:38px;border-radius:12px;display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:700;font-size:14px;background:linear-gradient(135deg,var(--mango),var(--orange));flex:none;}
.wrow.cool .wava{background:linear-gradient(135deg,#4A7FAC,var(--blue));}
.wname{font-size:14.5px;font-weight:700;}
.wname em{display:block;font-style:normal;font-size:12px;color:var(--mut);font-weight:500;}
.wreason{font-size:13.5px;color:var(--ink);}
.wdays{font-size:12px;font-weight:700;color:var(--blue);background:rgba(19,80,127,.08);border-radius:999px;
  padding:5px 12px;font-variant-numeric:tabular-nums;white-space:nowrap;}
.wdays.hot{color:var(--orange);background:rgba(217,69,43,.09);}
.wchev{color:#C4BAB6;font-size:19px;font-weight:600;transition:transform .15s;}
.wrow.open .wchev{transform:rotate(90deg);}
.wdetail{display:none;padding:4px 4px 20px 60px;border-bottom:1px solid var(--hair);}
.wdetail.on{display:block;}
.wdetail ul{margin:6px 0 10px 18px;font-size:13.5px;color:var(--ink);line-height:1.65;}
.wdetail blockquote{border-left:3px solid var(--mango);padding:12px 18px;background:#fff;font-size:13.5px;
  line-height:1.7;color:var(--ink);border-radius:0 12px 12px 0;margin:10px 0 14px;max-width:56em;
  box-shadow:0 1px 4px rgba(5,37,60,.05);}
.copybtn{border:none;background:var(--orange);color:#fff;border-radius:999px;padding:9px 20px;
  font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;}
.copybtn:hover{background:#c23a22;}
.copied{color:var(--ok);font-size:12.5px;font-weight:700;margin-left:10px;}
.empty{padding:38px 0;text-align:center;color:var(--ok);font-weight:600;font-size:14.5px;}
.fineprint{font-size:12.5px;color:var(--mut);line-height:1.65;margin-top:28px;max-width:64em;}
/* full modules table */
table{width:100%;border-collapse:collapse;font-size:13.5px;}
th{text-align:left;padding:10px 8px;border-bottom:2px solid var(--hair);font-size:11.5px;color:var(--mut);
  text-transform:uppercase;letter-spacing:.09em;}
td{padding:12px 8px;border-bottom:1px solid var(--hair);}
th.num,td.num{text-align:right;font-variant-numeric:tabular-nums;}
td.barcell .mbar{margin-top:0;}
/* evidence */
.narr{font-size:16px;line-height:1.9;color:var(--ink);border-left:3px solid var(--mango);
  padding:6px 0 6px 26px;max-width:62em;white-space:pre-wrap;}
.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:24px;align-items:center;}
.abtn{border:none;background:var(--orange);color:#fff;border-radius:11px;padding:13px 24px;font-family:inherit;
  font-size:14px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;}
.abtn:hover{background:#c23a22;}
.abtn.sec{background:var(--blue);}
.abtn.ghost{background:#fff;color:var(--navy);border:1.5px solid var(--hair);}
.err{background:#FFF2EE;border-left:4px solid var(--orange);border-radius:0 10px 10px 0;padding:14px 16px;
  font-size:13.5px;margin-bottom:20px;}
/* reflections */
.notice{border-left:4px solid var(--mango);background:#FFF9F2;border-radius:0 12px 12px 0;padding:18px 20px;
  font-size:14px;line-height:1.65;max-width:60em;}
.notice b{display:block;margin-bottom:6px;font-size:15px;}
.notice .ask{background:#fff;border:1px dashed var(--hair);border-radius:10px;padding:12px 14px;margin:12px 0;
  font-size:13px;color:var(--ink);line-height:1.6;}
.sgrow{border-left:3px solid var(--orange);background:#FFF6F2;border-radius:0 14px 14px 0;padding:16px 20px;
  margin-bottom:14px;max-width:64em;}
.sgrow .who{font-weight:800;font-size:14.5px;}
.sgrow .whr{font-size:12.5px;color:var(--mut);margin:3px 0 10px;}
.sgrow .q{font-size:13px;font-weight:600;color:var(--blue);margin-bottom:5px;}
.sgrow blockquote{font-size:14px;line-height:1.7;color:var(--ink);background:#fff;border-radius:10px;
  padding:12px 16px;border:1px solid rgba(217,69,43,.18);}
.sgok{padding:30px 0;color:var(--ok);font-weight:600;font-size:14.5px;}
.shrow{display:grid;grid-template-columns:minmax(160px,1.3fr) 3fr auto;gap:18px;align-items:center;
  padding:14px 0;border-bottom:1px solid var(--hair);}
.shrow:last-child{border-bottom:none;}
.shname{font-size:14.5px;font-weight:600;}
.shname em{display:block;font-style:normal;font-size:12px;color:var(--mut);font-weight:500;margin-top:2px;}
.dtrack{position:relative;height:30px;}
.dtrack .rail2{position:absolute;top:13px;left:0;right:0;height:4px;border-radius:999px;background:var(--hair);}
.dtrack .fill{position:absolute;top:13px;height:4px;border-radius:999px;background:linear-gradient(90deg,var(--mango),var(--ok));}
.dtrack .fill.down{background:linear-gradient(90deg,var(--orange),var(--mango));}
.dtrack .dot{position:absolute;top:8px;width:14px;height:14px;border-radius:50%;border:2.5px solid #fff;
  box-shadow:0 0 0 1.5px var(--hair);}
.dtrack .dot.pre{background:#B9AFAB;}
.dtrack .dot.post{background:var(--ok);}
.dtrack .dot.post.down{background:var(--orange);}
.dtrack .lab{position:absolute;top:-6px;font-size:10.5px;font-weight:700;color:var(--mut);transform:translateX(-50%);}
.spill{font-weight:800;border-radius:999px;padding:5px 13px;font-size:13px;white-space:nowrap;font-variant-numeric:tabular-nums;}
.spill.up{background:#E7F3EC;color:var(--ok);}
.spill.down{background:#FCE9E5;color:var(--orange);}
.spill.na{background:var(--off);color:var(--mut);}
.cvrow{display:grid;grid-template-columns:minmax(160px,1.4fr) 1fr 1fr;gap:16px;align-items:center;
  padding:10px 2px;border-bottom:1px solid var(--hair);font-size:13.5px;}
.cvrow:last-child{border-bottom:none;}
.cvrow .m{font-weight:600;}
.cvu{display:inline-flex;align-items:center;gap:7px;color:var(--ink);}
.cvu i{font-style:normal;font-weight:800;font-size:12px;width:18px;height:18px;border-radius:50%;flex:none;
  display:inline-flex;align-items:center;justify-content:center;}
.cvu.ok i{background:#E7F3EC;color:var(--ok);}
.cvu.miss{color:var(--mut);}
.cvu.miss i{background:var(--off);color:var(--mut);}
.cvhead{display:grid;grid-template-columns:minmax(160px,1.4fr) 1fr 1fr;gap:16px;padding:6px 2px;
  font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);
  border-bottom:2px solid var(--hair);}
/* live activity */
.livedot{width:9px;height:9px;border-radius:50%;background:#B9AFAB;flex:none;}
.livedot.on{background:var(--ok);animation:flLive 2s ease-in-out infinite;}
@keyframes flLive{0%,100%{box-shadow:0 0 0 0 rgba(27,122,75,.35)}50%{box-shadow:0 0 0 7px rgba(27,122,75,0)}}
.ferow{display:flex;gap:12px;align-items:flex-start;padding:10px 2px;border-bottom:1px solid var(--hair);}
.ferow:last-child{border-bottom:none;}
.fico{width:26px;height:26px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:800;margin-top:1px;}
.ferow.completion .fico{background:#E7F3EC;color:var(--ok);}
.ferow.joined .fico{background:#E8F1F8;color:var(--blue);}
.ferow.lead .fico{background:#FBF0E2;color:#B96A16;}
.fetxt{font-size:13.5px;line-height:1.5;color:var(--ink);}
.fetxt b{font-weight:700;color:var(--navy);}
.fetime{font-size:11.5px;color:var(--mut);margin-top:1px;}
.feempty{padding:16px 0;font-size:13px;color:var(--mut);line-height:1.6;}
.foot{border-top:1px solid var(--hair);color:var(--mut);font-size:12.5px;text-align:center;padding:22px;}
.foot b{color:var(--orange);font-weight:700;}
body:not(.loaded) .content{opacity:.45;transition:opacity .2s;}
body.loaded .content{opacity:1;}
/* login */
.login{max-width:1000px;margin:52px auto;padding:0 24px;display:grid;grid-template-columns:1.1fr 1fr;
  border-radius:26px;overflow:hidden;box-shadow:0 30px 70px -30px rgba(5,37,60,.4);}
@media(max-width:800px){.login{grid-template-columns:1fr;margin:24px auto;}}
.login-l{background:linear-gradient(150deg,var(--navy) 0%,var(--navy2) 58%,var(--blue) 135%);color:#fff;
  padding:44px 42px;position:relative;overflow:hidden;}
.login-l .wordmark svg{height:32px;}
.login-l h2{font-size:31px;font-weight:800;line-height:1.18;margin:30px 0 14px;}
.login-l p{color:#9FB8CC;font-size:14.5px;line-height:1.65;max-width:26em;}
.ticks{margin-top:26px;display:flex;flex-direction:column;gap:13px;position:relative;}
.tick{display:flex;align-items:center;gap:12px;font-size:14px;font-weight:600;}
.tick i{width:22px;height:22px;border-radius:50%;background:var(--orange);color:#fff;display:inline-flex;
  align-items:center;justify-content:center;font-style:normal;font-size:12px;font-weight:800;flex:none;}
.login-l .bird{position:absolute;right:-46px;bottom:-70px;height:70%;opacity:.08;}
.login-l .bird svg{height:100%;width:auto;}
.login-r{background:#fff;padding:44px 42px;display:flex;flex-direction:column;justify-content:center;}
.login-r h3{font-size:19px;font-weight:700;margin-bottom:18px;}
.login-r label{display:block;font-weight:600;font-size:14px;margin-bottom:8px;}
.login-r input{width:100%;border:1.5px solid var(--hair);border-radius:12px;padding:15px 16px;font-size:15px;
  font-family:inherit;color:var(--navy);}
.login-r input:focus{outline:none;border-color:var(--blue);}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
@media print{.rail,.signout,#cohort-sel,.actions,.fchips,.foot,.keyline{display:none!important;}
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
    "<div class='keyline'></div>" +
    bodyHtml +
    "<div class='foot'>Fledglings · fledglings.co · <b>Where Growth Takes Flight</b></div>" +
    "</body></html>"
  );
}

export function renderPortalLogin(error?: string): string {
  return portalShell(
    "Fledglings — Provider Portal",
    "<div class='login'>" +
      "<div class='login-l'>" +
      `<span class='wordmark'>${WORDMARK_DARK}</span>` +
      "<h2>Your learners, your evidence, and who needs a nudge today.</h2>" +
      "<p>The provider view of the Fledglings life-skills platform — live figures, early warnings and Ofsted-ready evidence, scoped to your cohort.</p>" +
      "<div class='ticks'>" +
      "<div class='tick'><i>✓</i>Live engagement and completion figures</div>" +
      "<div class='tick'><i>✓</i>Early-warning view with ready-to-send nudges</div>" +
      "<div class='tick'><i>✓</i>Evidence narrative drafted for your SAR</div></div>" +
      `<div class='bird'>${BIRD_MARK}</div></div>` +
      "<div class='login-r'>" +
      (error ? `<div class='err'>${esc(error)}</div>` : "") +
      "<form method='POST' action='/portal/login'>" +
      "<h3>Sign in</h3>" +
      "<label for='code'>Access code</label>" +
      "<input type='text' id='code' name='code' autocomplete='off' required placeholder='Issued by Fledglings'>" +
      "<div class='actions'><button class='abtn' type='submit'>Open portal</button></div>" +
      "<p class='fineprint'>Codes are issued to named provider staff and can be scoped to a single cohort. " +
      "Contact Fledglings if you need one.</p></form></div></div>",
  );
}

function sectionHead(title: string, hint?: string): string {
  return (
    `<div class='sect'><span class='bd'>${BIRD_MARK}</span><h3>${esc(title)}</h3>` +
    (hint ? `<span class='hint'>${esc(hint)}</span>` : "") +
    "</div>"
  );
}

export function renderPortalDashboard(label: string, tag: string | null): string {
  const body =
    /* masthead + ledger */
    "<header class='mast'>" +
    `<div class='mast-bird'>${BIRD_MARK}</div>` +
    "<div class='mast-in'>" +
    "<div class='mast-top'>" +
    `<span class='wordmark'>${WORDMARK_DARK}</span>` +
    "<span class='portal-tag'>Provider<br>Portal</span>" +
    "<div class='mast-right'>" +
    `<span class='provider'>${esc(label)}</span>` +
    (tag ? `<span class='scopechip'>${esc(tag)}</span>` : "") +
    "<select id='cohort-sel' aria-label='Filter by cohort' hidden></select>" +
    "<a class='signout' href='/portal/logout'>Sign out</a></div></div>" +
    "<div class='mast-meta' id='p-meta'>Loading live figures…</div>" +
    "<div class='ledger'>" +
    "<div class='lg'><div class='k'>Learners</div><div class='v' id='lg-total'>–</div><div class='d'></div></div>" +
    "<div class='lg'><div class='k'>Active last 7 days</div><div class='v'><span id='lg-active'>–</span><small id='lg-activepct'></small></div>" +
    "<div class='d' id='lg-delta'></div></div>" +
    "<div class='lg'><div class='k'>Ever logged in</div><div class='v' id='lg-activation'>–</div><div class='d'></div></div>" +
    "<div class='lg'><div class='k'>Median recency</div><div class='v' id='lg-median'>–</div><div class='d'></div></div>" +
    "<div class='lg warn'><div class='k'>Need attention</div><div class='v' id='lg-attn'>–</div><div class='d'></div></div>" +
    "</div></div></header>" +
    /* tab rail */
    "<nav class='rail'><div class='rail-in' role='tablist'>" +
    "<button class='ltab on' data-v='overview' role='tab' aria-selected='true'>Overview</button>" +
    "<button class='ltab' data-v='warning' role='tab' aria-selected='false'>Early warning <span class='cnt' id='t-warnn' hidden></span></button>" +
    "<button class='ltab' data-v='modules' role='tab' aria-selected='false'>Modules</button>" +
    "<button class='ltab' data-v='reflect' role='tab' aria-selected='false'>Reflections <span class='cnt' id='t-flagn' hidden></span></button>" +
    "<button class='ltab' data-v='evidence' role='tab' aria-selected='false'>Evidence pack</button>" +
    "</div></nav>" +
    "<main class='content'>" +
    "<div class='err' id='p-err' hidden></div>" +
    /* overview */
    "<div class='lview on' id='lv-overview'>" +
    sectionHead("Cohort pulse", "every learner, tiered by engagement signal") +
    "<div class='pulse' id='pulse-bar'></div><div class='pulse-legend' id='pulse-legend'></div>" +
    "<div class='duo' style='margin-top:40px'>" +
    "<div class='trend'>" +
    sectionHead("Engagement trend") +
    "<svg id='trend-svg' viewBox='0 0 560 150' preserveAspectRatio='xMidYMid meet'></svg>" +
    "<div class='tnote' id='trend-note'></div></div>" +
    "<div>" +
    sectionHead("Last seen") +
    "<div id='recency'></div></div>" +
    "</div>" +
    "<div class='duo' style='margin-top:40px'>" +
    "<div>" +
    sectionHead("Most-used modules", "from a recent sample") +
    "<span class='hint muted' id='mods-note' hidden>module figures are whole-school</span>" +
    "<div id='mods-mini'></div></div>" +
    "<div>" +
    "<div class='sect'><span class='livedot' id='livedot'></span><h3>Live activity</h3>" +
    "<span class='hint' id='live-hint'></span></div>" +
    "<div id='feed-list'></div></div>" +
    "</div>" +
    "</div>" +
    /* early warning */
    "<div class='lview' id='lv-warning'>" +
    sectionHead("Early warning", "click a learner for detail and a ready-to-send nudge") +
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
    sectionHead("Module engagement", "from a recent sample of learner accounts") +
    "<div id='mods-table' style='overflow-x:auto'></div>" +
    "</div>" +
    /* reflections */
    "<div class='lview' id='lv-reflect'>" +
    "<div id='reflect-state'></div>" +
    "<div id='coverage-sect' hidden>" +
    sectionHead("Reflection unit matching", "the exact pre/post units identified in each module") +
    "<div id='coverage-list'></div>" +
    "<p class='fineprint'>A dash means no assessment unit in that module matched the pre/post naming — " +
    "rename the unit in LearnWorlds (e.g. to “Initial Self - Reflection” / “Post Completion Feedback”) and it will be picked up on the next sweep.</p></div>" +
    "<div id='reflect-body' hidden>" +
    sectionHead("Safeguarding flags", "crisis language detected in reflection answers") +
    "<p class='fineprint' style='margin:0 0 16px'>Machine-flagged, not a judgement — the same 33-pattern screen that guards the Fledge coach, " +
    "run over free-text reflection answers. Follow your safeguarding policy: a flag means <b>read it and decide</b>, fast.</p>" +
    "<div id='sg-list'></div>" +
    sectionHead("Confidence shift", "self-rated, before vs after each module") +
    "<div class='muted' id='reflect-meta' style='margin-bottom:14px'></div>" +
    "<div id='shift-list'></div>" +
    "<p class='fineprint'>Shift compares average self-ratings in each module's initial reflection against its post-completion feedback. " +
    "Module aggregates are whole-school; flag and completion counts respect your cohort scope. " +
    "This is powerful Ofsted personal-development evidence: learners saying, in their own assessment, that they've grown.</p>" +
    "</div></div>" +
    /* evidence */
    "<div class='lview' id='lv-evidence'>" +
    sectionHead("Evidence narrative", "draft for your SAR / personal development reporting") +
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
