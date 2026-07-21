/* Provider portal — a quality-director's dashboard. Design brief:
 * open it and know in five seconds who needs contacting today; every
 * figure carries a plain-English caption a tutor can read without
 * analytics training; one accent discipline (orange = needs action,
 * green = good, blue = information). Structured as a panel grid — a
 * slim navy masthead, one KPI band, then purposeful panels on a 12-col
 * grid. Tag-scoped codes are filtered server-side before anything
 * renders. */

import { esc } from "./pages";
import { BIRD_MARK, WORDMARK_DARK } from "./brand";
import portalAppSource from "./portal/portal-app.js.txt";

const PORTAL_CSS = `
:root{--navy:#05253C;--navy2:#0A3452;--orange:#D9452B;--mango:#ED9249;--blue:#13507F;--off:#ECE7E6;
  --ok:#1B7A4B;--ink:#22333f;--mut:#7d8a93;--hair:#E6E0DB;--paper:#F4F1EE;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:var(--paper);color:var(--navy);min-height:100vh;}
b,strong{font-weight:700;}
.keyline{height:4px;background:linear-gradient(90deg,var(--orange),var(--mango) 55%,var(--orange));}
/* ---------- masthead (slim) ---------- */
.mast{background:linear-gradient(150deg,var(--navy) 0%,var(--navy2) 58%,var(--blue) 135%);color:#fff;
  position:relative;overflow:hidden;padding-bottom:56px;}
.mast-bird{position:absolute;right:-30px;top:-50px;height:170%;opacity:.05;pointer-events:none;}
.mast-bird svg{height:100%;width:auto;}
.mast-in{max-width:1200px;margin:0 auto;padding:0 26px;position:relative;}
.mast-top{display:flex;align-items:center;gap:16px;padding:20px 0 6px;flex-wrap:wrap;}
.wordmark svg{height:27px;width:auto;display:block;}
.portal-tag{font-size:10.5px;font-weight:700;letter-spacing:.2em;color:var(--mango);text-transform:uppercase;
  border-left:1px solid rgba(255,255,255,.25);padding-left:15px;line-height:1.35;}
.mast-right{margin-left:auto;display:flex;align-items:center;gap:11px;flex-wrap:wrap;}
.provider{font-size:14px;font-weight:600;}
.scopechip{font-size:10.5px;font-weight:700;letter-spacing:.06em;background:rgba(237,146,73,.16);color:var(--mango);
  border:1px solid rgba(237,146,73,.45);border-radius:999px;padding:4px 12px;text-transform:uppercase;}
#cohort-sel{background:rgba(255,255,255,.08);color:#fff;border:1px solid rgba(255,255,255,.25);border-radius:9px;
  padding:8px 11px;font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;}
#cohort-sel option{color:var(--navy);}
.signout{color:#9FB8CC;font-size:12.5px;font-weight:600;text-decoration:none;border:1px solid rgba(255,255,255,.2);
  border-radius:9px;padding:8px 13px;}
.signout:hover{color:#fff;border-color:rgba(255,255,255,.5);}
.mast-meta{color:#7E9CB5;font-size:12px;padding-bottom:4px;}
/* ---------- KPI band (overlaps the masthead) ---------- */
.shellwrap{max-width:1200px;margin:0 auto;padding:0 26px;}
.kpiband{display:flex;background:#fff;border:1px solid var(--hair);border-radius:18px;margin-top:-44px;
  position:relative;z-index:5;box-shadow:0 14px 34px -18px rgba(5,37,60,.28);overflow:hidden;flex-wrap:wrap;}
.kpi{flex:1 1 0;min-width:150px;padding:20px 24px 18px;border-left:1px solid var(--hair);}
.kpi:first-child{border-left:none;}
.kpi .k{font-size:10.5px;font-weight:800;letter-spacing:.13em;text-transform:uppercase;color:var(--mut);}
.kpi .v{font-size:34px;font-weight:800;line-height:1.1;margin-top:6px;letter-spacing:-.01em;font-variant-numeric:tabular-nums;}
.kpi .v small{font-size:15px;font-weight:700;color:var(--mut);margin-left:4px;}
.kpi .c{font-size:11.5px;color:var(--mut);margin-top:4px;line-height:1.4;min-height:16px;}
.kpi .c b{color:var(--mango);font-weight:700;}
.kpi.attn{background:#FFF6F1;border-left:1px solid var(--hair);box-shadow:inset 3px 0 0 var(--orange);}
.kpi.attn .v{color:var(--orange);}
.kpi.attn .k{color:#B0563F;}
@media(max-width:900px){.kpi{min-width:33%;}}
/* ---------- tab rail ---------- */
.rail{max-width:1200px;margin:18px auto 0;padding:0 26px;display:flex;gap:8px;overflow-x:auto;}
.ltab{border:1px solid transparent;background:none;font-family:inherit;font-size:14px;font-weight:600;color:var(--mut);
  padding:10px 16px;cursor:pointer;border-radius:999px;white-space:nowrap;display:inline-flex;align-items:center;gap:8px;}
.ltab:hover{color:var(--navy);background:#fff;border-color:var(--hair);}
.ltab.on{color:#fff;background:var(--navy);border-color:var(--navy);}
.ltab .cnt{background:var(--orange);color:#fff;border-radius:999px;font-size:11px;font-weight:700;padding:1px 8px;}
/* ---------- content + panel system ---------- */
.content{max-width:1200px;margin:0 auto;padding:20px 26px 70px;}
.lview{display:none;}.lview.on{display:block;}
.grid12{display:grid;grid-template-columns:repeat(12,1fr);gap:20px;align-items:start;}
.s7{grid-column:span 7;}.s5{grid-column:span 5;}.s12{grid-column:span 12;}
@media(max-width:900px){.s7,.s5{grid-column:span 12;}}
.panel{background:#fff;border:1px solid var(--hair);border-radius:16px;box-shadow:0 1px 2px rgba(5,37,60,.04);}
.ph{display:flex;align-items:flex-start;gap:12px;padding:16px 20px 13px;border-bottom:1px solid #F1ECE8;}
.ph .t{font-size:15px;font-weight:700;}
.ph .c{font-size:12px;color:var(--mut);margin-top:2px;line-height:1.4;}
.ph .right{margin-left:auto;display:flex;align-items:center;gap:10px;flex:none;}
.ph .chip{font-size:11.5px;font-weight:700;border-radius:999px;padding:4px 11px;background:var(--off);color:var(--blue);}
.ph .chip.warn{background:#FCE9E5;color:var(--orange);}
.pb{padding:16px 20px 18px;}
.plink{display:block;text-align:center;padding:11px;border-top:1px solid #F1ECE8;font-size:13px;font-weight:600;
  color:var(--blue);text-decoration:none;cursor:pointer;background:none;border-left:none;border-right:none;border-bottom:none;
  width:100%;font-family:inherit;border-radius:0 0 16px 16px;}
.plink:hover{background:#FAF7F5;color:var(--navy);}
.muted{color:var(--mut);font-size:13px;}
/* ---------- action list (who needs you today) ---------- */
.arow{display:grid;grid-template-columns:38px minmax(120px,1.1fr) 1.6fr auto auto;gap:13px;align-items:center;
  padding:11px 0;border-bottom:1px solid #F1ECE8;}
.arow:last-child{border-bottom:none;}
.wava{width:36px;height:36px;border-radius:11px;display:flex;align-items:center;justify-content:center;
  color:#fff;font-weight:700;font-size:13px;background:linear-gradient(135deg,var(--mango),var(--orange));flex:none;}
.cool .wava,.wava.cool{background:linear-gradient(135deg,#4A7FAC,var(--blue));}
.aname{font-size:14px;font-weight:700;line-height:1.25;}
.aname em{display:block;font-style:normal;font-size:11.5px;color:var(--mut);font-weight:500;}
.areason{font-size:12.5px;color:var(--ink);line-height:1.45;}
.wdays{font-size:11.5px;font-weight:700;color:var(--blue);background:rgba(19,80,127,.08);border-radius:999px;
  padding:4px 10px;font-variant-numeric:tabular-nums;white-space:nowrap;}
.wdays.hot{color:var(--orange);background:rgba(217,69,43,.09);}
.abtn2{border:1px solid var(--hair);background:#fff;color:var(--blue);border-radius:999px;padding:7px 13px;
  font-family:inherit;font-size:12px;font-weight:600;cursor:pointer;white-space:nowrap;}
.abtn2:hover{border-color:var(--blue);}
.aok{padding:26px 0;text-align:center;color:var(--ok);font-weight:600;font-size:14px;}
/* ---------- live feed ---------- */
.livedot{width:8px;height:8px;border-radius:50%;background:#C4BAB6;flex:none;}
.livedot.on{background:var(--ok);animation:flLive 2s ease-in-out infinite;}
@keyframes flLive{0%,100%{box-shadow:0 0 0 0 rgba(27,122,75,.35)}50%{box-shadow:0 0 0 6px rgba(27,122,75,0)}}
.ferow{display:flex;gap:11px;align-items:flex-start;padding:9px 0;border-bottom:1px solid #F1ECE8;}
.ferow:last-child{border-bottom:none;}
.fico{width:24px;height:24px;border-radius:50%;flex:none;display:flex;align-items:center;justify-content:center;
  font-size:11px;font-weight:800;margin-top:1px;}
.ferow.completion .fico{background:#E7F3EC;color:var(--ok);}
.ferow.joined .fico{background:#E8F1F8;color:var(--blue);}
.ferow.lead .fico{background:#FBF0E2;color:#B96A16;}
.fetxt{font-size:13px;line-height:1.45;color:var(--ink);}
.fetxt b{font-weight:700;color:var(--navy);}
.fetime{font-size:11px;color:var(--mut);margin-top:1px;}
.feempty{padding:14px 0;font-size:12.5px;color:var(--mut);line-height:1.6;}
/* ---------- trend ---------- */
.trend svg{width:100%;height:auto;display:block;}
.tnote{font-size:11.5px;color:var(--mut);margin-top:8px;}
/* ---------- cohort pulse ---------- */
.pulse{height:12px;border-radius:999px;overflow:hidden;display:flex;background:var(--off);gap:2px;margin-bottom:14px;}
.pulse i{display:block;height:100%;}
.plr{display:grid;grid-template-columns:12px minmax(90px,auto) 1fr auto;gap:10px;align-items:center;
  padding:7px 0;border-bottom:1px solid #F1ECE8;font-size:12.5px;}
.plr:last-child{border-bottom:none;}
.plr i{width:10px;height:10px;border-radius:3px;display:inline-block;}
.plr .n{font-weight:700;font-size:13px;}
.plr .d{color:var(--mut);font-size:11.5px;line-height:1.35;}
.plr .v{font-weight:800;font-size:14px;font-variant-numeric:tabular-nums;text-align:right;}
/* ---------- last seen ---------- */
.rrow{display:grid;grid-template-columns:104px 1fr 30px;gap:12px;align-items:center;padding:6px 0;}
.rl{font-size:12.5px;font-weight:600;color:var(--ink);}
.rb{height:12px;border-radius:999px;background:var(--off);overflow:hidden;}
.rb i{display:block;height:100%;border-radius:999px;}
.rn{font-size:12.5px;font-weight:700;text-align:right;font-variant-numeric:tabular-nums;}
/* ---------- modules mini (single-line rows) ---------- */
.mmr{display:grid;grid-template-columns:26px 1fr 110px 44px;gap:12px;align-items:center;
  padding:10px 0;border-bottom:1px solid #F1ECE8;}
.mmr:last-child{border-bottom:none;}
.mmr .rk{font-size:12px;font-weight:700;color:var(--mut);font-variant-numeric:tabular-nums;}
.mmr .ti{font-size:13.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.mmr .ti em{font-style:normal;color:var(--mut);font-weight:500;font-size:11.5px;margin-left:6px;}
.mbar{height:6px;border-radius:999px;background:var(--off);overflow:hidden;display:block;}
.mbar i{display:block;height:100%;background:linear-gradient(90deg,var(--mango),var(--orange));border-radius:999px;}
.mmr .pc{font-size:13px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;}
/* ---------- early warning ledger ---------- */
.fchips{display:flex;gap:8px;flex-wrap:wrap;padding:14px 20px 4px;}
.fchip{border:1px solid var(--hair);background:#fff;border-radius:999px;padding:8px 14px;font-family:inherit;
  font-size:12.5px;font-weight:600;color:var(--ink);cursor:pointer;display:inline-flex;align-items:center;gap:7px;}
.fchip i{width:8px;height:8px;border-radius:50%;display:inline-block;}
.fchip b{font-weight:800;}
.fchip.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.wgroup{display:flex;align-items:center;gap:9px;font-size:11px;font-weight:800;letter-spacing:.13em;
  text-transform:uppercase;color:var(--mut);margin:18px 0 2px;}
.wgroup i{width:8px;height:8px;border-radius:50%;display:inline-block;}
.wgroup::after{content:'';flex:1;height:1px;background:#F1ECE8;}
.wrow{display:grid;grid-template-columns:38px minmax(140px,1.2fr) 1.8fr auto 14px;gap:13px;align-items:center;
  padding:11px 2px;border-bottom:1px solid #F1ECE8;cursor:pointer;}
.wrow:hover{background:#FAF7F5;}
.wrow.open{background:#FAF7F5;border-bottom-color:transparent;}
.wname{font-size:14px;font-weight:700;}
.wname em{display:block;font-style:normal;font-size:11.5px;color:var(--mut);font-weight:500;}
.wreason{font-size:13px;color:var(--ink);line-height:1.45;}
.wchev{color:#C4BAB6;font-size:17px;font-weight:600;transition:transform .15s;}
.wrow.open .wchev{transform:rotate(90deg);}
.wdetail{display:none;padding:2px 2px 16px 53px;border-bottom:1px solid #F1ECE8;}
.wdetail.on{display:block;}
.wdetail ul{margin:6px 0 10px 18px;font-size:13px;color:var(--ink);line-height:1.6;}
.wdetail blockquote{border-left:3px solid var(--mango);padding:11px 16px;background:#FBF9F8;font-size:13px;
  line-height:1.65;color:var(--ink);border-radius:0 10px 10px 0;margin:8px 0 12px;max-width:56em;}
.copybtn{border:none;background:var(--orange);color:#fff;border-radius:999px;padding:8px 18px;
  font-family:inherit;font-size:12.5px;font-weight:600;cursor:pointer;}
.copybtn:hover{background:#c23a22;}
.copied{color:var(--ok);font-size:12px;font-weight:700;margin-left:10px;}
.empty{padding:30px 0;text-align:center;color:var(--ok);font-weight:600;font-size:14px;}
.fineprint{font-size:12px;color:var(--mut);line-height:1.6;margin-top:18px;max-width:64em;}
/* ---------- tables ---------- */
table{width:100%;border-collapse:collapse;font-size:13px;}
th{text-align:left;padding:9px 8px;border-bottom:2px solid #F1ECE8;font-size:10.5px;color:var(--mut);
  text-transform:uppercase;letter-spacing:.09em;}
td{padding:10px 8px;border-bottom:1px solid #F1ECE8;}
tr:last-child td{border-bottom:none;}
th.num,td.num{text-align:right;font-variant-numeric:tabular-nums;}
td.barcell .mbar{margin:0;}
/* ---------- reflections ---------- */
.notice{border:1px solid var(--hair);border-left:4px solid var(--mango);background:#fff;border-radius:12px;
  padding:16px 20px;font-size:13.5px;line-height:1.6;max-width:60em;margin-bottom:20px;}
.notice b{display:block;margin-bottom:5px;font-size:14.5px;}
.notice .ask{background:#FBF9F8;border:1px dashed var(--hair);border-radius:10px;padding:11px 14px;margin:11px 0;
  font-size:12.5px;color:var(--ink);line-height:1.6;}
.sgrow{border:1px solid rgba(217,69,43,.25);border-left:4px solid var(--orange);background:#FFFBFA;border-radius:12px;
  padding:14px 18px;margin-bottom:12px;max-width:64em;}
.sgrow .who{font-weight:800;font-size:14px;}
.sgrow .whr{font-size:12px;color:var(--mut);margin:3px 0 8px;}
.sgrow .q{font-size:12.5px;font-weight:600;color:var(--blue);margin-bottom:4px;}
.sgrow blockquote{font-size:13.5px;line-height:1.65;color:var(--ink);background:#fff;border-radius:9px;
  padding:11px 14px;border:1px solid rgba(217,69,43,.14);}
.sgok{padding:22px 0;color:var(--ok);font-weight:600;font-size:13.5px;}
.shrow{display:grid;grid-template-columns:minmax(150px,1.2fr) 2.6fr auto;gap:16px;align-items:center;
  padding:12px 0;border-bottom:1px solid #F1ECE8;}
.shrow:last-child{border-bottom:none;}
.shname{font-size:13.5px;font-weight:600;}
.shname em{display:block;font-style:normal;font-size:11.5px;color:var(--mut);font-weight:500;margin-top:2px;}
.dtrack{position:relative;height:28px;}
.dtrack .rail2{position:absolute;top:12px;left:0;right:0;height:4px;border-radius:999px;background:var(--off);}
.dtrack .fill{position:absolute;top:12px;height:4px;border-radius:999px;background:linear-gradient(90deg,var(--mango),var(--ok));}
.dtrack .fill.down{background:linear-gradient(90deg,var(--orange),var(--mango));}
.dtrack .dot{position:absolute;top:7px;width:13px;height:13px;border-radius:50%;border:2.5px solid #fff;
  box-shadow:0 0 0 1.5px var(--hair);}
.dtrack .dot.pre{background:#B9AFAB;}
.dtrack .dot.post{background:var(--ok);}
.dtrack .dot.post.down{background:var(--orange);}
.dtrack .lab{position:absolute;top:-7px;font-size:10px;font-weight:700;color:var(--mut);transform:translateX(-50%);}
.spill{font-weight:800;border-radius:999px;padding:4px 12px;font-size:12.5px;white-space:nowrap;font-variant-numeric:tabular-nums;}
.spill.up{background:#E7F3EC;color:var(--ok);}
.spill.down{background:#FCE9E5;color:var(--orange);}
.spill.na{background:var(--off);color:var(--mut);}
.cvhead{display:grid;grid-template-columns:minmax(150px,1.3fr) 1fr 1fr;gap:14px;padding:6px 0;
  font-size:10.5px;font-weight:800;letter-spacing:.11em;text-transform:uppercase;color:var(--mut);
  border-bottom:2px solid #F1ECE8;}
.cvrow{display:grid;grid-template-columns:minmax(150px,1.3fr) 1fr 1fr;gap:14px;align-items:center;
  padding:9px 0;border-bottom:1px solid #F1ECE8;font-size:12.5px;}
.cvrow:last-child{border-bottom:none;}
.cvrow .m{font-weight:600;}
.cvu{display:inline-flex;align-items:center;gap:7px;color:var(--ink);}
.cvu i{font-style:normal;font-weight:800;font-size:11px;width:17px;height:17px;border-radius:50%;flex:none;
  display:inline-flex;align-items:center;justify-content:center;}
.cvu.ok i{background:#E7F3EC;color:var(--ok);}
.cvu.miss{color:var(--mut);}
.cvu.miss i{background:var(--off);color:var(--mut);}
/* ---------- evidence ---------- */
.narr{font-size:14.5px;line-height:1.85;color:var(--ink);white-space:pre-wrap;max-width:60em;
  border-left:3px solid var(--mango);padding-left:20px;}
.actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
.abtn{border:none;background:var(--orange);color:#fff;border-radius:10px;padding:12px 22px;font-family:inherit;
  font-size:13.5px;font-weight:600;cursor:pointer;text-decoration:none;display:inline-block;}
.abtn:hover{background:#c23a22;}
.abtn.sec{background:var(--blue);}
.abtn.ghost{background:#fff;color:var(--navy);border:1px solid var(--hair);}
.err{background:#FFF2EE;border-left:4px solid var(--orange);border-radius:0 10px 10px 0;padding:13px 16px;
  font-size:13px;margin-bottom:18px;}
.foot{border-top:1px solid var(--hair);color:var(--mut);font-size:12px;text-align:center;padding:20px;margin-top:30px;}
.foot b{color:var(--orange);font-weight:700;}
body:not(.loaded) .content{opacity:.45;transition:opacity .2s;}
body.loaded .content{opacity:1;}
/* login */
.login{max-width:980px;margin:52px auto;padding:0;display:grid;grid-template-columns:1.1fr 1fr;
  border-radius:24px;overflow:hidden;box-shadow:0 30px 70px -30px rgba(5,37,60,.4);}
.loginwrap{padding:0 24px;}
@media(max-width:800px){.login{grid-template-columns:1fr;margin:24px auto;}}
.login-l{background:linear-gradient(150deg,var(--navy) 0%,var(--navy2) 58%,var(--blue) 135%);color:#fff;
  padding:42px 40px;position:relative;overflow:hidden;}
.login-l .wordmark svg{height:30px;}
.login-l h2{font-size:29px;font-weight:800;line-height:1.2;margin:28px 0 13px;}
.login-l p{color:#9FB8CC;font-size:14px;line-height:1.65;max-width:26em;}
.ticks{margin-top:24px;display:flex;flex-direction:column;gap:12px;position:relative;}
.tick{display:flex;align-items:center;gap:11px;font-size:13.5px;font-weight:600;}
.tick i{width:21px;height:21px;border-radius:50%;background:var(--orange);color:#fff;display:inline-flex;
  align-items:center;justify-content:center;font-style:normal;font-size:11px;font-weight:800;flex:none;}
.login-l .bird{position:absolute;right:-46px;bottom:-70px;height:70%;opacity:.08;}
.login-l .bird svg{height:100%;width:auto;}
.login-r{background:#fff;padding:42px 40px;display:flex;flex-direction:column;justify-content:center;}
.login-r h3{font-size:18px;font-weight:700;margin-bottom:16px;}
.login-r label{display:block;font-weight:600;font-size:13.5px;margin-bottom:8px;}
.login-r input{width:100%;border:1.5px solid var(--hair);border-radius:12px;padding:14px 16px;font-size:15px;
  font-family:inherit;color:var(--navy);margin-bottom:16px;}
.login-r input:focus{outline:none;border-color:var(--blue);}
/* ---------- mobile (QA pass 2026-07-22: rows must stack, not squash) ---------- */
@media(max-width:700px){
  .kpi{flex:1 1 50%;min-width:50%;padding:14px 16px 12px;border-top:1px solid var(--hair);}
  .kpi:nth-child(-n+2){border-top:none;}
  .kpi:nth-child(odd){border-left:none;}
  .kpi .v{font-size:25px;}
  .kpi.attn{flex-basis:100%;min-width:100%;}
  .arow{grid-template-columns:38px minmax(0,1fr) auto auto;
    grid-template-areas:"av nm dy bt" "rs rs rs rs";row-gap:7px;gap:8px;}
  .arow .aname{min-width:0;}
  .arow .aname em{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
  .arow .abtn2{padding:7px 10px;}
  .arow .wava{grid-area:av;}
  .arow .aname{grid-area:nm;}
  .arow .wdays{grid-area:dy;align-self:center;}
  .arow .abtn2{grid-area:bt;}
  .arow .areason{grid-area:rs;}
  .wrow{grid-template-columns:38px 1fr auto 14px;
    grid-template-areas:"av nm dy ch" "rs rs rs rs";row-gap:6px;}
  .wrow .wava{grid-area:av;}
  .wrow .wname{grid-area:nm;}
  .wrow .wdays{grid-area:dy;align-self:center;}
  .wrow .wchev{grid-area:ch;align-self:center;}
  .wrow .wreason{grid-area:rs;}
  .wdetail{padding-left:8px;}
  .abtn2{min-height:38px;}
  .fchip{min-height:38px;}
  .signout,#cohort-sel{min-height:38px;}
  .cvhead{display:none;}
  .cvrow{grid-template-columns:1fr;gap:5px;padding:12px 0;}
  .cvrow .m{font-size:13.5px;}
  .shrow{grid-template-columns:1fr;gap:8px;}
  .shrow .spill{justify-self:start;}
  .mmr{grid-template-columns:22px 1fr 44px;}
  .mmr .mbar{display:none;}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
@media print{.rail,.signout,#cohort-sel,.actions,.fchips,.foot,.keyline,.plink,.abtn2{display:none!important;}
  .lview{display:block!important;}body{background:#fff;}.panel{box-shadow:none;break-inside:avoid;}
  .mast{background:var(--navy)!important;-webkit-print-color-adjust:exact;}}
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
    "<div class='loginwrap'><div class='login'>" +
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
      "Contact Fledglings if you need one.</p></form></div></div></div>",
  );
}

/** A panel with a header (title + plain-English caption + optional
 * right-side content) and a body. */
function panel(opts: {
  span: string;
  title: string;
  caption: string;
  right?: string;
  body: string;
  footer?: string;
  bodyPad?: boolean;
}): string {
  return (
    `<section class='panel ${opts.span}'>` +
    `<div class='ph'><div><div class='t'>${opts.title}</div>` +
    `<div class='c'>${opts.caption}</div></div>` +
    (opts.right ? `<div class='right'>${opts.right}</div>` : "") +
    "</div>" +
    (opts.bodyPad === false ? opts.body : `<div class='pb'>${opts.body}</div>`) +
    (opts.footer ?? "") +
    "</section>"
  );
}

export function renderPortalDashboard(label: string, tag: string | null): string {
  const body =
    /* slim masthead */
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
    "</div></header>" +
    /* KPI band */
    "<div class='shellwrap'><div class='kpiband'>" +
    "<div class='kpi'><div class='k'>Learners</div><div class='v' id='lg-total'>–</div>" +
    "<div class='c'>on the platform" + (tag ? " in your cohort" : "") + "</div></div>" +
    "<div class='kpi'><div class='k'>Active this week</div>" +
    "<div class='v'><span id='lg-active'>–</span><small id='lg-activepct'></small></div>" +
    "<div class='c'>logged in within 7 days <b id='lg-delta'></b></div></div>" +
    "<div class='kpi'><div class='k'>Ever logged in</div><div class='v' id='lg-activation'>–</div>" +
    "<div class='c'>have used their account at least once</div></div>" +
    "<div class='kpi'><div class='k'>Typical last visit</div><div class='v' id='lg-median'>–</div>" +
    "<div class='c'>median days since a learner was last on</div></div>" +
    "<div class='kpi attn'><div class='k'>Need attention</div><div class='v' id='lg-attn'>–</div>" +
    "<div class='c'>going quiet — see Early warning</div></div>" +
    "</div></div>" +
    /* tab rail */
    "<nav class='rail' role='tablist'>" +
    "<button class='ltab on' data-v='overview' role='tab' aria-selected='true'>Today</button>" +
    "<button class='ltab' data-v='warning' role='tab' aria-selected='false'>Early warning <span class='cnt' id='t-warnn' hidden></span></button>" +
    "<button class='ltab' data-v='modules' role='tab' aria-selected='false'>Modules</button>" +
    "<button class='ltab' data-v='reflect' role='tab' aria-selected='false'>Reflections <span class='cnt' id='t-flagn' hidden></span></button>" +
    "<button class='ltab' data-v='evidence' role='tab' aria-selected='false'>Evidence pack</button>" +
    "</nav>" +
    "<main class='content'>" +
    "<div class='err' id='p-err' hidden></div>" +
    /* ---- TODAY ---- */
    "<div class='lview on' id='lv-overview'><div class='grid12'>" +
    panel({
      span: "s7",
      title: "Who needs you today",
      caption: "your most urgent learners, with a ready-to-send nudge each",
      right: "<span class='chip warn' id='action-count' hidden></span>",
      body: "<div id='action-list'></div>",
      footer:
        "<button class='plink' id='action-all' type='button'>See everyone in Early warning →</button>",
    }) +
    panel({
      span: "s5",
      title: "Live activity",
      caption: "straight from LearnWorlds, as it happens",
      right: "<span class='livedot' id='livedot'></span><span class='muted' id='live-hint' style='font-size:11.5px'></span>",
      body: "<div id='feed-list'></div>",
    }) +
    panel({
      span: "s7",
      title: "Engagement trend",
      caption: "share of learners active in the previous 7 days, from nightly snapshots",
      body: "<div class='trend'><svg id='trend-svg' viewBox='0 0 560 150' preserveAspectRatio='xMidYMid meet'></svg>" +
        "<div class='tnote' id='trend-note'></div></div>",
    }) +
    panel({
      span: "s5",
      title: "Cohort pulse",
      caption: "every learner, sorted into plain-English engagement tiers",
      body: "<div class='pulse' id='pulse-bar'></div><div id='pulse-legend'></div>",
    }) +
    panel({
      span: "s7",
      title: "Most-used modules",
      caption: "from a recent sample of learner accounts" + (tag ? " in your cohort" : ""),
      body: "<span id='mods-note' hidden></span><div id='mods-mini'></div>",
      footer: "<button class='plink' id='mods-all' type='button'>Full module table →</button>",
    }) +
    panel({
      span: "s5",
      title: "Last seen",
      caption: "how recently each learner was on the platform",
      body: "<div id='recency'></div>",
    }) +
    "</div></div>" +
    /* ---- EARLY WARNING ---- */
    "<div class='lview' id='lv-warning'><div class='grid12'>" +
    panel({
      span: "s12",
      title: "Early warning",
      caption: "click a learner for the full picture and a ready-to-send nudge · nudges encourage, never guilt-trip",
      body: "<div class='fchips' id='warn-chips'></div><div class='pb' style='padding-top:4px'><div id='warn-list'></div></div>",
      bodyPad: false,
    }) +
    "</div>" +
    "<p class='fineprint'><b>The tiers:</b> Needs contact = 21+ days quiet, or never logged in after two weeks · Drifting = 10–20 days · " +
    "Early wobble = 8–9 days quiet, a never-logged-in account past its first week, or a month on the platform without finishing a module · new joiners get a week's grace. " +
    "This view is for pastoral and safeguarding staff — treat it with the same care as any learner record.</p>" +
    "<div class='actions' style='margin-top:14px'><button class='abtn ghost' onclick='window.print()'>Print early-warning digest</button></div>" +
    "</div>" +
    /* ---- MODULES ---- */
    "<div class='lview' id='lv-modules'><div class='grid12'>" +
    panel({
      span: "s12",
      title: "Module engagement",
      caption: "every module, from a recent sample of learner accounts",
      body: "<div id='mods-table' style='overflow-x:auto'></div>",
    }) +
    "</div></div>" +
    /* ---- REFLECTIONS ---- */
    "<div class='lview' id='lv-reflect'>" +
    "<div id='reflect-state'></div>" +
    "<div class='grid12'>" +
    "<div class='s12' id='reflect-body' hidden><div class='grid12'>" +
    panel({
      span: "s12",
      title: "Safeguarding flags",
      caption: "crisis language detected in reflection answers — machine-flagged, not a judgement; a flag means read it and decide, fast",
      body: "<div id='sg-list'></div>",
    }) +
    panel({
      span: "s12",
      title: "Confidence shift",
      caption: "learners' own before-and-after self-ratings per module — personal development evidence in their words",
      right: "<span class='muted' id='reflect-meta' style='font-size:11.5px'></span>",
      body: "<div id='shift-list'></div>",
    }) +
    "</div></div>" +
    "<div class='s12' id='coverage-sect' hidden>" +
    panel({
      span: "s12",
      title: "Reflection unit matching",
      caption: "the exact pre/post units identified in each module — a dash means the unit needs renaming in LearnWorlds to be picked up",
      body: "<div id='coverage-list'></div>",
    }) +
    "</div></div></div>" +
    /* ---- EVIDENCE ---- */
    "<div class='lview' id='lv-evidence'><div class='grid12'>" +
    panel({
      span: "s12",
      title: "Evidence narrative",
      caption: "drafted for your SAR / personal development reporting — honest about what the data can and cannot claim",
      body: "<div class='narr' id='narrative'></div>" +
        "<div class='actions' style='margin-top:20px'>" +
        "<button class='abtn' id='copy-narr'>Copy narrative</button><span class='copied' id='copied-narr' hidden>Copied ✓</span>" +
        "<a class='abtn sec' href='/portal/export.csv'>Download learner CSV</a>" +
        "<button class='abtn ghost' onclick='window.print()'>Print / save as PDF</button></div>",
    }) +
    "</div>" +
    "<p class='fineprint'>Figures describe engagement with Fledglings life-skills modules; sampled figures are labelled as such. " +
    "They evidence provision, participation and active monitoring — not attributed outcomes. The CSV lists your learners " +
    "with module counts, days since last login and attention level" +
    (tag ? ", limited to your cohort" : "") +
    ".</p></div>" +
    "</main>" +
    `<script>${portalAppSource}</script>`;

  return portalShell(`Fledglings Portal — ${label}`, body);
}
