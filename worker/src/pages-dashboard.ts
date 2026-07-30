/* /dashboard — the provider backend dashboard (seat-manager view).
 * Mockup-faithful admin shell: Workbench sidebar, KPI cards, students
 * table with cohort filters, cohort cards, analytics charts, CSV
 * export. Everything renders from /dashboard/data (tag-scoped by the
 * provider's portal code) — scores, attempts and timestamps only;
 * learner documents and recordings never exist server-side. Visual
 * first: numbers count up, bars fill, prose stays minimal. */

import { WORDMARK_LIGHT } from "./brand";
import { esc } from "./pages";

const ICONS: Record<string, string> = {
  home: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M3 10.5 12 3l9 7.5'/><path d='M5 9.5V21h14V9.5'/></svg>",
  students: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><circle cx='9' cy='8' r='3.2'/><path d='M2.8 20a6.2 6.2 0 0 1 12.4 0'/><path d='M15.5 8.5a2.8 2.8 0 1 1 2.2 4.6M16.6 14.6a5.4 5.4 0 0 1 4.6 5.4'/></svg>",
  cohorts: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='m12 4 10 4-10 4L2 8z'/><path d='M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5'/></svg>",
  analytics: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M4 20V10M10 20V4M16 20v-7M21 20H3'/></svg>",
  csv: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3v12m0 0 4-4m-4 4-4-4'/><path d='M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2'/></svg>",
  hub: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M14 5h5v5M19 5l-8 8'/><path d='M19 14v5H5V5h5'/></svg>",
};

export function renderDashboardPage(): string {
  const nav = (id: string, icon: string, label: string) =>
    `<button type='button' class='dn${id === "home" ? " on" : ""}' data-view='${id}'>${ICONS[icon]}<span>${esc(label)}</span></button>`;

  const body =
    "<aside class='dside'>" +
    `<div class='dlogo'>${WORDMARK_LIGHT}</div>` +
    "<div class='dsec'>Workbench</div>" +
    nav("home", "home", "Home") +
    nav("students", "students", "Students") +
    nav("cohorts", "cohorts", "Cohorts") +
    nav("analytics", "analytics", "Analytics") +
    "<div class='dsec'>Administration</div>" +
    `<a class='dn' href='/dashboard/export.csv'>${ICONS.csv}<span>Download CSV</span></a>` +
    `<a class='dn' href='/hub' target='_blank' rel='noopener'>${ICONS.hub}<span>View as student</span></a>` +
    "<div class='dfoot'><span class='dscope' id='dscope'>…</span>" +
    "<a href='/portal/logout' class='dout'>Sign out</a></div>" +
    "</aside>" +

    "<div class='dmain'>" +
    "<header class='dhead'><div><h1 id='dh-title'>Home</h1>" +
    "<p id='dh-sub'>Outcomes, progress and attention — at a glance</p></div>" +
    "<span class='dperiod' id='dperiod'>Recent sample</span></header>" +

    /* ---------- login (shown on 401) ---------- */
    "<section class='dview' id='v-login' hidden><div class='dcard dlogin'>" +
    "<h2>Provider access</h2><p>Enter your Fledglings access code — your code decides which learners you see.</p>" +
    "<p class='derr' id='login-err' hidden>That code didn&#39;t work — check it and try again.</p>" +
    "<form method='POST' action='/portal/login'><input type='hidden' name='next' value='/dashboard'>" +
    "<input type='password' name='code' placeholder='Access code' autocomplete='off' required>" +
    "<button type='submit' class='dbtn'>Open dashboard</button></form></div></section>" +

    /* ---------- home ---------- */
    "<section class='dview' id='v-home'>" +
    "<div class='kpigrid'>" +
    kpi("k-learners", "👥", "Learners", "in your scope") +
    kpi("k-engaged", "⚡", "Engaged", "tried at least one tool") +
    kpi("k-avgcv", "📄", "Avg CV score", "latest per learner") +
    kpi("k-journey", "🏁", "Journey complete", "all 7 tasks done") +
    "</div>" +
    "<div class='dsplit'>" +
    "<div class='dcard'><h3>Quick actions</h3><div class='qacts'>" +
    "<button type='button' class='dbtn' data-view='students'>👥 Students</button>" +
    "<button type='button' class='dbtn ghost' data-view='analytics'>📊 Analytics</button>" +
    "<a class='dbtn ghost' href='/dashboard/export.csv'>⬇ Download CSV</a>" +
    "</div></div>" +
    "<div class='dcard'><h3>Students needing attention <span class='dtag' id='att-count'></span></h3>" +
    "<div class='dtablewrap'><table class='dtable' id='att-table'>" +
    "<thead><tr><th>Student</th><th>Issue</th><th>Job-ready</th><th>Journey</th><th></th></tr></thead>" +
    "<tbody id='att-body'></tbody></table>" +
    "<div class='dempty' id='att-empty' hidden>🎉 No one flagged — scores and journeys look healthy.</div></div></div>" +
    "</div></section>" +

    /* ---------- students ---------- */
    "<section class='dview' id='v-students' hidden>" +
    "<div class='dbar'><input type='text' id='s-search' placeholder='🔍 Search students…'>" +
    "<div class='chips' id='s-chips'></div>" +
    "<a class='dbtn ghost' href='/dashboard/export.csv'>⬇ CSV</a></div>" +
    "<div class='dcard'><div class='dtablewrap'><table class='dtable'>" +
    "<thead><tr><th>Student</th><th>Cohort</th><th>CV</th><th>LinkedIn</th><th>Interview</th><th>Letters</th><th>Journey</th><th>Job-ready</th></tr></thead>" +
    "<tbody id='s-body'></tbody></table>" +
    "<div class='dempty' id='s-empty' hidden>No learners match.</div></div></div>" +
    "<div class='dcard' id='drill' hidden></div>" +
    "</section>" +

    /* ---------- cohorts ---------- */
    "<section class='dview' id='v-cohorts' hidden><div class='cogrid' id='co-grid'></div>" +
    "<div class='dempty' id='co-empty' hidden>No cohort tags found on these learners yet — tag learners in LearnWorlds and they appear here.</div></section>" +

    /* ---------- analytics ---------- */
    "<section class='dview' id='v-analytics' hidden>" +
    "<div class='dbar'><div class='chips' id='a-chips'></div></div>" +
    "<div class='dsplit'>" +
    "<div class='dcard'><h3>Tool adoption</h3><div id='ch-adopt'></div></div>" +
    "<div class='dcard'><h3>CV score distribution</h3><div id='ch-dist'></div></div>" +
    "</div>" +
    "<div class='dcard'><h3>Activity — last 12 weeks</h3><div id='ch-activity'></div></div>" +
    "<div class='dcard'><h3>Average job-ready score by cohort</h3><div id='ch-cohorts'></div></div>" +
    "</section>" +

    "<p class='dnote'>Scores, attempts and timestamps only — learner documents, letters and recordings are never stored. " +
    "Sample-based: <span id='dsample'></span>.</p>" +
    "</div>" +
    "<script>" + DASH_JS + "</script>";

  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<meta name='robots' content='noindex'><title>Fledglings — Provider Dashboard</title>" +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' rel='stylesheet'>" +
    `<style>${DASH_CSS}</style></head><body>` +
    body +
    "</body></html>"
  );
}

function kpi(id: string, ico: string, label: string, sub: string): string {
  return (
    `<div class='kpi'><span class='kpi-ico'>${ico}</span>` +
    `<div class='kpi-n' id='${id}'>–</div>` +
    `<div class='kpi-l'>${esc(label)}</div><div class='kpi-s'>${esc(sub)}</div>` +
    `<div class='kpi-bar'><i id='${id}-bar'></i></div></div>`
  );
}

const DASH_JS = String.raw`(function(){
var $=function(id){return document.getElementById(id)};
function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
/* liveness: rise-in on view swaps + count-up numbers */
var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;
function countUp(el,to,suffix){suffix=suffix||'';to=Math.round(to);
if(reduce||!window.requestAnimationFrame){el.textContent=to+suffix;return;}
var start=performance.now(),dur=600;
(function tick(now){var p=Math.min(1,(now-start)/dur);p=1-Math.pow(1-p,3);
el.textContent=Math.round(to*p)+suffix;if(p<1)requestAnimationFrame(tick);})(start);}
function band(s){return s>=70?'#1B7A4B':s>=50?'#B96A16':'#D9452B'}
var DATA=null,view='home',cohortFilter=null,search='';
/* ---------- navigation ---------- */
var TITLES={home:['Home','Outcomes, progress and attention — at a glance'],
students:['Students','Every learner in your scope with their employability record'],
cohorts:['Cohorts','Groups by LearnWorlds tag'],
analytics:['Analytics','Adoption, scores and activity — visual first']};
function go(v){view=v;
document.querySelectorAll('.dn[data-view]').forEach(function(b){b.classList.toggle('on',b.dataset.view===v)});
document.querySelectorAll('.dview').forEach(function(s){s.hidden=true});
var sec=$('v-'+v);sec.hidden=false;
if(!reduce){sec.classList.remove('din');void sec.offsetWidth;sec.classList.add('din');}
$('dh-title').textContent=TITLES[v][0];$('dh-sub').textContent=TITLES[v][1];
if(v==='students')renderStudents();
if(v==='cohorts')renderCohorts();
if(v==='analytics')renderAnalytics();}
document.querySelectorAll('[data-view]').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.view)})});
/* ---------- charts (inline SVG) ---------- */
function hbar(rows,max){var out="<div class='hbars'>";
rows.forEach(function(r){var pct=max?Math.round(r.v*100/max):0;
out+="<div class='hb'><span class='hb-l'>"+esc2(r.l)+"</span>"+
"<div class='hb-t'><i style='width:"+pct+"%;background:"+(r.c||'#13507F')+"'></i></div>"+
"<span class='hb-v'>"+r.v+"</span></div>";});
return out+"</div>";}
function colChart(vals,labels,color){var n=vals.length;if(!n)return '';
var W=Math.max(300,n*34),H=140,base=112,maxH=92;var max=Math.max.apply(null,vals.concat([1]));
var s="<svg viewBox='0 0 "+W+" "+H+"' class='colchart' role='img'>";
s+="<line x1='0' y1='"+base+"' x2='"+W+"' y2='"+base+"' stroke='#E3DDDA' stroke-width='2'/>";
vals.forEach(function(v,i){var bw=20;var x=i*(W/n)+(W/n-bw)/2;
var h=Math.max(2,(v/max)*maxH);var y=base-h;
s+="<rect x='"+x+"' y='"+y+"' width='"+bw+"' height='"+h+"' rx='4' fill='"+(color||'#13507F')+"'/>";
if(v>0)s+="<text x='"+(x+bw/2)+"' y='"+(y-5)+"' text-anchor='middle' font-size='10' font-weight='700' fill='#68788A'>"+v+"</text>";
s+="<text x='"+(x+bw/2)+"' y='"+(base+16)+"' text-anchor='middle' font-size='9' fill='#8a97a1'>"+esc2(labels[i]||'')+"</text>";});
return s+"</svg>";}
function miniScore(v){if(v===null||v===undefined)return "<span class='ms none'>—</span>";
return "<span class='ms' style='color:"+band(v)+"'>"+v+"</span><i class='msb'><b style='width:"+v+"%;background:"+band(v)+"'></b></i>";}
/* ---------- renders ---------- */
function scoped(){var rows=DATA.learners;
if(cohortFilter)rows=rows.filter(function(r){return r.tags.indexOf(cohortFilter)>-1});
if(search){var q=search.toLowerCase();
rows=rows.filter(function(r){return (r.name+' '+r.email).toLowerCase().indexOf(q)>-1});}
return rows;}
function renderHome(){var k=DATA.kpis;
countUp($('k-learners'),k.learners);$('k-learners-bar').style.width='100%';
countUp($('k-engaged'),k.engaged);
$('k-engaged-bar').style.width=(k.learners?Math.round(k.engaged*100/k.learners):0)+'%';
if(k.avgCv!==null){countUp($('k-avgcv'),k.avgCv);$('k-avgcv-bar').style.width=k.avgCv+'%';
$('k-avgcv-bar').style.background=band(k.avgCv);}else{$('k-avgcv').textContent='—';}
countUp($('k-journey'),k.journeyComplete);
$('k-journey-bar').style.width=(k.learners?Math.round(k.journeyComplete*100/k.learners):0)+'%';
var att=DATA.attention||[];$('att-count').textContent=att.length+' flagged';
$('att-empty').hidden=att.length>0;
$('att-body').innerHTML=att.map(function(a){
return "<tr><td><b>"+esc2(a.name)+"</b><br><span class='dmut'>"+esc2(a.email)+"</span></td>"+
"<td><span class='dtag warn'>"+esc2(a.issue||'')+"</span></td>"+
"<td><span style='color:"+band(a.readiness||0)+";font-weight:800'>"+(a.readiness===null?'—':a.readiness)+"</span></td>"+
"<td>"+a.tasksDone+"/7</td>"+
"<td><button type='button' class='dlink' data-drill='"+esc2(a.email)+"'>View →</button></td></tr>";}).join('');
wireDrills();}
function chips(el,onPick){var tags=DATA.tags||[];
el.innerHTML="<button type='button' class='chip"+(cohortFilter?'':' on')+"' data-chip=''>All</button>"+
tags.map(function(t){return "<button type='button' class='chip"+(cohortFilter===t.tag?' on':'')+"' data-chip='"+esc2(t.tag)+"'>"+esc2(t.tag)+" <i>"+t.count+"</i></button>"}).join('');
el.querySelectorAll('[data-chip]').forEach(function(b){b.onclick=function(){
cohortFilter=b.dataset.chip||null;onPick();};});}
function renderStudents(){chips($('s-chips'),renderStudents);
var rows=scoped();$('s-empty').hidden=rows.length>0;
$('s-body').innerHTML=rows.map(function(r){var e=r.employability;
return "<tr data-drill='"+esc2(r.email)+"' class='rowlink'><td><b>"+esc2(r.name)+"</b><br><span class='dmut'>"+esc2(r.email)+"</span></td>"+
"<td>"+r.tags.slice(0,2).map(function(t){return "<span class='dtag'>"+esc2(t)+"</span>"}).join(' ')+"</td>"+
"<td>"+miniScore(e.cv.latest)+"</td><td>"+miniScore(e.linkedin.latest)+"</td><td>"+miniScore(e.interview.latest)+"</td>"+
"<td>"+e.cover.attempts+"</td><td>"+r.tasksDone+"/7</td>"+
"<td>"+miniScore(r.readiness)+"</td></tr>";}).join('');
wireDrills();}
function wireDrills(){document.querySelectorAll('[data-drill]').forEach(function(el){
el.onclick=function(){var r=DATA.learners.find(function(x){return x.email===el.dataset.drill});
if(!r)return;go('students');drill(r);};});}
function drill(r){var e=r.employability;var d=$('drill');
function toolRow(label,t,isCount){return "<div class='dr-tool'><span class='dr-l'>"+label+"</span>"+
(isCount?"<span class='ms'>"+t.attempts+" created</span>":miniScore(t.latest))+
"<span class='dmut'>"+t.attempts+" attempt"+(t.attempts===1?'':'s')+(t.lastAt?" · last "+new Date(t.lastAt*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'')+"</span></div>";}
d.innerHTML="<div class='dr-head'><div><b>"+esc2(r.name)+"</b><br><span class='dmut'>"+esc2(r.email)+"</span> "+
r.tags.map(function(t){return "<span class='dtag'>"+esc2(t)+"</span>"}).join(' ')+"</div>"+
"<span class='dr-ready' style='color:"+band(r.readiness||0)+"'>"+(r.readiness===null?'—':r.readiness)+"<i>job-ready</i></span>"+
"<button type='button' class='dlink' id='drill-close'>✕</button></div>"+
"<div class='dr-tools'>"+toolRow('CV review',e.cv)+toolRow('LinkedIn',e.linkedin)+
toolRow('Interview',e.interview)+toolRow('Cover letters',e.cover,true)+"</div>"+
"<div class='dr-journey'>Journey: <b>"+r.tasksDone+"/7</b> tasks"+
"<i class='msb wide'><b style='width:"+Math.round(r.tasksDone*100/7)+"%;background:#13507F'></b></i></div>";
d.hidden=false;$('drill-close').onclick=function(){d.hidden=true};
d.scrollIntoView({behavior:'smooth',block:'nearest'});}
function renderCohorts(){var tags=DATA.tags||[];
$('co-empty').hidden=tags.length>0;
$('co-grid').innerHTML=tags.map(function(t){
var members=DATA.learners.filter(function(r){return r.tags.indexOf(t.tag)>-1});
var scored=members.filter(function(r){return r.readiness!==null});
var avg=scored.length?Math.round(scored.reduce(function(s,r){return s+r.readiness},0)/scored.length):null;
var done=members.filter(function(r){return r.tasksDone===7}).length;
return "<div class='dcard cocard'><div class='co-t'>"+esc2(t.tag)+"</div>"+
"<div class='co-n'>"+members.length+"</div><div class='kpi-s'>learners</div>"+
"<div class='co-row'><span>Avg job-ready</span><b style='color:"+(avg===null?'#8a97a1':band(avg))+"'>"+(avg===null?'—':avg)+"</b></div>"+
"<div class='co-row'><span>Journey complete</span><b>"+done+"</b></div>"+
"<button type='button' class='dbtn ghost co-view' data-cohort='"+esc2(t.tag)+"'>View students →</button></div>";}).join('');
document.querySelectorAll('[data-cohort]').forEach(function(b){b.onclick=function(){
cohortFilter=b.dataset.cohort;go('students');};});}
function renderAnalytics(){chips($('a-chips'),renderAnalytics);
var rows=scoped();
function tried(t){return rows.filter(function(r){return r.employability[t].latest!==null||( t==='cover'&&r.employability[t].attempts>0)})}
$('ch-adopt').innerHTML=hbar([
{l:'CV review',v:tried('cv').length,c:'#D9452B'},
{l:'LinkedIn',v:tried('linkedin').length,c:'#13507F'},
{l:'Interview',v:tried('interview').length,c:'#ED9249'},
{l:'Cover letter',v:tried('cover').length,c:'#05253C'}],rows.length||1);
var buckets=[0,0,0,0,0];
tried('cv').forEach(function(r){buckets[Math.min(4,Math.floor((r.employability.cv.latest||0)/20))]++});
$('ch-dist').innerHTML=colChart(buckets,['0-19','20-39','40-59','60-79','80+'],'#D9452B');
var act=(DATA.analytics&&DATA.analytics.activity)||[];
$('ch-activity').innerHTML=colChart(act.map(function(a){return a.events}),
act.map(function(a){return a.weeksAgo===0?'now':a.weeksAgo+'w'}),'#13507F');
var perTag=(DATA.tags||[]).map(function(t){
var m=DATA.learners.filter(function(r){return r.tags.indexOf(t.tag)>-1&&r.readiness!==null});
return {l:t.tag,v:m.length?Math.round(m.reduce(function(s,r){return s+r.readiness},0)/m.length):0,c:'#ED9249'};})
.filter(function(x){return x.v>0}).sort(function(a,b){return b.v-a.v}).slice(0,8);
$('ch-cohorts').innerHTML=perTag.length?hbar(perTag,100):"<div class='dempty'>No scored learners in any cohort yet.</div>";}
$('s-search').addEventListener('input',function(){search=this.value;renderStudents();});
/* ---------- boot ---------- */
fetch('/dashboard/data').then(function(r){
if(r.status===401){document.querySelectorAll('.dview').forEach(function(s){s.hidden=true});
$('v-login').hidden=false;$('dh-title').textContent='Sign in';$('dh-sub').textContent='Provider access';
if(location.search.indexOf('login=failed')>-1)$('login-err').hidden=false;
return null;}
return r.json();}).then(function(d){
if(!d)return;
if(d.error){$('dh-sub').textContent='Could not load data — '+d.error;return;}
/* attention list comes precomputed; keep a fallback */
d.attention=d.attention||[];DATA=d;
$('dscope').textContent=d.scopedTag?('Scope: '+d.scopedTag):'Whole school';
$('dsample').textContent=d.sampleSize+' of '+(d.totalUsers===null?'all':d.totalUsers)+' accounts sampled';
$('dperiod').textContent=(d.scopedTag?d.scopedTag+' · ':'')+d.sampleSize+' learners';
renderHome();})
.catch(function(){$('dh-sub').textContent='Could not reach the dashboard service — refresh to retry.';});
})();`;

const DASH_CSS = `
:root{--navy:#05253C;--orange:#D9452B;--mango:#ED9249;--blue:#13507F;--off:#ECE7E6;--canvas:#F4F1EF;
  --ink:#25394B;--mut:#6A7A88;--line:#E3DDDA;--ok:#1B7A4B;}
[hidden]{display:none!important;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:var(--canvas);color:var(--navy);min-height:100vh;display:flex;}
.dside{width:230px;flex:none;background:#fff;border-right:1px solid var(--line);padding:20px 12px;
  display:flex;flex-direction:column;gap:2px;position:sticky;top:0;height:100vh;}
.dlogo svg{height:28px;width:auto;display:block;margin:0 10px 18px;}
.dsec{font-size:10.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--mut);
  padding:12px 10px 6px;}
.dn{display:flex;align-items:center;gap:11px;padding:10px 12px;border-radius:11px;border:none;background:none;
  font-family:inherit;font-size:14px;font-weight:500;color:var(--ink);cursor:pointer;text-decoration:none;text-align:left;}
.dn svg{width:19px;height:19px;color:var(--mut);flex:none;}
.dn:hover{background:var(--off);}
.dn.on{background:#FBEAE6;color:var(--orange);font-weight:700;}
.dn.on svg{color:var(--orange);}
.dfoot{margin-top:auto;border-top:1px solid var(--line);padding-top:12px;display:flex;flex-direction:column;gap:6px;}
.dscope{font-size:12px;font-weight:700;color:var(--blue);padding:0 10px;}
.dout{font-size:12px;color:var(--mut);text-decoration:underline;padding:0 10px;}
.dmain{flex:1;min-width:0;padding:26px 30px 60px;max-width:1180px;}
.dhead{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:22px;flex-wrap:wrap;}
.dhead h1{font-size:24px;letter-spacing:-.01em;}
.dhead p{font-size:13.5px;color:var(--mut);margin-top:3px;}
.dperiod{background:#fff;border:1px solid var(--line);border-radius:999px;padding:8px 16px;font-size:12.5px;
  font-weight:700;color:var(--blue);}
@keyframes din{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.din{animation:din .3s cubic-bezier(.2,.7,.3,1) both;}
.dcard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:16px;
  box-shadow:0 1px 3px rgba(5,37,60,.05);}
.dcard h3{font-size:15px;margin-bottom:12px;}
.kpigrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:16px;}
.kpi{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;position:relative;
  box-shadow:0 1px 3px rgba(5,37,60,.05);}
.kpi-ico{font-size:20px;}
.kpi-n{font-size:32px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:6px;line-height:1;}
.kpi-l{font-size:13.5px;font-weight:700;margin-top:6px;}
.kpi-s{font-size:11.5px;color:var(--mut);}
.kpi-bar{height:6px;border-radius:999px;background:var(--off);overflow:hidden;margin-top:10px;}
.kpi-bar i{display:block;height:100%;border-radius:999px;background:var(--blue);width:0;transition:width .7s cubic-bezier(.2,.7,.3,1);}
.dsplit{display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start;}
@media(max-width:900px){.dsplit{grid-template-columns:1fr;}}
.qacts{display:flex;flex-direction:column;gap:9px;}
.dbtn{display:inline-flex;align-items:center;justify-content:center;gap:8px;background:var(--orange);color:#fff;
  border:none;border-radius:11px;padding:11px 18px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;
  text-decoration:none;}
.dbtn:hover{background:#B93A22;}
.dbtn.ghost{background:#fff;color:var(--navy);border:1.5px solid var(--line);}
.dbtn.ghost:hover{border-color:var(--orange);color:var(--orange);}
.dtablewrap{overflow-x:auto;}
.dtable{width:100%;border-collapse:collapse;font-size:13px;}
.dtable th{text-align:left;padding:9px 10px;border-bottom:2px solid var(--off);font-size:11px;color:var(--mut);
  letter-spacing:.06em;text-transform:uppercase;white-space:nowrap;}
.dtable td{padding:11px 10px;border-bottom:1px solid var(--off);vertical-align:middle;}
.rowlink{cursor:pointer;}
.rowlink:hover td{background:#FBFAF9;}
.dmut{color:var(--mut);font-size:11.5px;}
.dtag{display:inline-block;background:var(--off);color:var(--blue);border-radius:999px;padding:2px 9px;
  font-size:10.5px;font-weight:700;}
.dtag.warn{background:#FBEAE6;color:var(--orange);}
.dlink{border:none;background:none;color:var(--blue);font-family:inherit;font-size:12.5px;font-weight:700;
  cursor:pointer;text-decoration:underline;}
.dempty{color:var(--mut);font-size:13.5px;padding:16px 4px;}
.dbar{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:14px;}
.dbar input{flex:1;min-width:200px;border:1.5px solid var(--line);border-radius:11px;padding:10px 14px;
  font-family:inherit;font-size:13.5px;background:#fff;}
.dbar input:focus{outline:none;border-color:var(--mango);}
.chips{display:flex;gap:7px;flex-wrap:wrap;}
.chip{border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:7px 13px;font-family:inherit;
  font-size:12px;font-weight:700;color:var(--ink);cursor:pointer;}
.chip i{font-style:normal;color:var(--mut);font-weight:600;}
.chip.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.chip.on i{color:#CFE0EE;}
.ms{font-weight:800;font-variant-numeric:tabular-nums;}
.ms.none{color:#B9AFAB;}
.msb{display:block;width:56px;height:5px;border-radius:999px;background:var(--off);overflow:hidden;margin-top:3px;}
.msb.wide{width:100%;margin-top:6px;}
.msb b{display:block;height:100%;border-radius:999px;}
.cogrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.cocard{margin-bottom:0;}
.co-t{font-size:13px;font-weight:800;color:var(--blue);}
.co-n{font-size:30px;font-weight:800;margin-top:4px;}
.co-row{display:flex;justify-content:space-between;font-size:12.5px;color:var(--mut);margin-top:8px;}
.co-view{width:100%;margin-top:12px;padding:9px;font-size:12.5px;}
.hbars{display:flex;flex-direction:column;gap:9px;}
.hb{display:flex;align-items:center;gap:10px;}
.hb-l{width:92px;font-size:12px;font-weight:600;color:var(--ink);flex:none;}
.hb-t{flex:1;height:12px;border-radius:999px;background:var(--off);overflow:hidden;}
.hb-t i{display:block;height:100%;border-radius:999px;transition:width .7s cubic-bezier(.2,.7,.3,1);}
.hb-v{width:30px;font-size:12px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;}
.colchart{width:100%;max-width:560px;display:block;}
.dr-head{display:flex;gap:14px;align-items:flex-start;}
.dr-head>div:first-child{flex:1;}
.dr-ready{font-size:26px;font-weight:800;text-align:right;}
.dr-ready i{display:block;font-style:normal;font-size:10px;color:var(--mut);font-weight:700;}
.dr-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:16px 0 12px;}
.dr-tool{border:1.5px solid var(--line);border-radius:12px;padding:12px;}
.dr-l{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--blue);margin-bottom:6px;}
.dr-tool .dmut{display:block;margin-top:5px;}
.dr-journey{font-size:13px;color:var(--ink);}
.dlogin{max-width:420px;}
.dlogin p{font-size:13.5px;color:var(--mut);margin:6px 0 14px;}
.derr{color:var(--orange)!important;font-weight:700;}
.dlogin input{width:100%;border:1.5px solid var(--line);border-radius:11px;padding:12px 14px;font-family:inherit;
  font-size:14px;margin-bottom:12px;}
.dnote{font-size:11.5px;color:var(--mut);margin-top:6px;line-height:1.5;}
@media(max-width:820px){.dside{width:74px;padding:16px 8px;}
.dn span,.dsec,.dscope,.dout,.dlogo{display:none;}
.dn{justify-content:center;}
.dmain{padding:18px 14px 50px;}}
`;
