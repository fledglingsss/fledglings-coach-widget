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
  reflect: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M21 12a8 8 0 0 1-8 8H4l2.5-2.7A8 8 0 1 1 21 12z'/><path d='M9 10h6M9 13.5h4'/></svg>",
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
    nav("reflections", "reflect", "Reflections") +
    nav("analytics", "analytics", "Analytics") +
    "<div class='dsec'>Administration</div>" +
    `<a class='dn' href='/dashboard/export.csv'>${ICONS.csv}<span>Download CSV</span></a>` +
    `<a class='dn' href='/portal' target='_blank' rel='noopener'>${ICONS.analytics}<span>Engagement portal</span></a>` +
    `<a class='dn' href='/hub' target='_blank' rel='noopener'>${ICONS.hub}<span>Student view</span></a>` +
    "<div class='dfoot'><span class='dscope' id='dscope'>…</span>" +
    "<a href='/portal/logout' class='dout'>Sign out</a></div>" +
    "</aside>" +

    "<div class='dmain'>" +
    "<header class='dhead'><div><h1 id='dh-title'>Home</h1>" +
    "<p id='dh-sub'>Outcomes, progress and attention — at a glance</p></div>" +
    "<div class='dheadr'><span class='dperiod' id='dperiod'>Recent sample</span>" +
    `<a class='dbtn' href='/hub' target='_blank' rel='noopener'>${ICONS.hub} View as Student</a></div></header>` +

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
    kpi("k-modules", "🎓", "Modules completed", "across your learners") +
    kpi("k-engaged", "⚡", "Using career tools", "tried at least one") +
    kpi("k-avgcv", "📄", "Avg CV score", "latest per learner") +
    "</div>" +
    "<div class='dcard'><h3>Learner pipeline <span class='dmut' style='font-weight:500'>from enrolment to job-ready — learning and career progress in one picture</span></h3>" +
    "<div id='funnel'></div></div>" +
    "<div class='dsplit'>" +
    "<div class='dcard'><h3>Quick actions</h3><div class='qacts'>" +
    "<button type='button' class='dbtn ghost' data-view='students'>👥 Students</button>" +
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
    "<div class='dstats' id='s-stats'></div>" +
    "<div class='dbar'><input type='text' id='s-search' placeholder='🔍 Search students…'>" +
    "<div class='chips' id='s-chips'></div>" +
    "<a class='dbtn ghost' href='/dashboard/export.csv'>⬇ CSV</a></div>" +
    "<div class='dcard'><div class='dtablewrap'><table class='dtable'>" +
    "<thead><tr><th>Student</th><th>Cohort</th><th>Modules</th><th>CV</th><th>LinkedIn</th><th>Interview</th><th>Letters</th><th>Journey</th><th>Job-ready</th></tr></thead>" +
    "<tbody id='s-body'></tbody></table>" +
    "<div class='dempty' id='s-empty' hidden>No learners match.</div></div></div>" +
    "<div class='dcard' id='drill' hidden></div>" +
    "</section>" +

    /* ---------- cohorts ---------- */
    "<section class='dview' id='v-cohorts' hidden>" +
    "<div class='dbar'><a class='dbtn ghost' href='/dashboard/cohorts.csv'>⬇ Cohort rollup CSV</a></div>" +
    "<div class='cogrid' id='co-grid'></div>" +
    "<div class='dempty' id='co-empty' hidden>No cohort tags found on these learners yet — add a cohort tag to learners and they appear here.</div></section>" +

    /* ---------- reflections ---------- */
    "<section class='dview' id='v-reflections' hidden>" +
    "<div class='dcard' id='rf-loading'><div class='dempty'>Loading reflections…</div></div>" +
    /* plan-gated state */
    "<div class='dcard rf-gate' id='rf-gate' hidden><h3 id='rf-gate-title'>Reflection insights are on their way</h3>" +
    "<p class='rf-p' id='rf-gate-body'>Learners already answer a written self-reflection before and after every module. " +
    "Reading those answers into this dashboard is being switched on — check back soon.</p>" +
    /* Whole-school codes see the actionable supplier ask; scoped
     * provider codes never see vendor plumbing. */
    "<div id='rf-gate-hq' hidden>" +
    "<textarea class='rf-ask' id='rf-ask' readonly rows='4'></textarea>" +
    "<button type='button' class='dbtn sm' id='rf-copy'>Copy message for platform support</button>" +
    "</div>" +
    "<p class='dmut' id='rf-coverage-note'></p></div>" +
    /* building state */
    "<div class='dcard' id='rf-building' hidden><h3>Reading reflections…</h3>" +
    "<p class='rf-p' id='rf-progress'></p><div class='msb wide'><b id='rf-progress-bar' style='background:#13507F'></b></div></div>" +
    /* ready: stats + charts + raw */
    "<div id='rf-ready' hidden>" +
    "<div class='kpigrid'>" +
    kpi("rf-pre", "📝", "Reflected before", "learners who answered a pre-module reflection") +
    kpi("rf-post", "🏁", "Reflected after", "learners who answered a post-module reflection") +
    kpi("rf-raw", "💬", "Answers on record", "raw question-and-answer pairs") +
    "</div>" +
    "<div class='dcard rf-flags' id='rf-flags-card' hidden><h3>⚠ Wellbeing flags <span class='dtag warn' id='rf-flags-count'></span></h3>" +
    "<p class='rf-p'>Answers whose wording matched the same crisis patterns that guard the coach. Read them yourself — this is a prompt to check in, not a verdict.</p>" +
    "<div id='rf-flags'></div></div>" +
    "<div class='dcard'><h3>Confidence shift by module <span class='dmut' style='font-weight:500'>bar = after · ▏marker = before · grey only = awaiting after-module answers</span></h3>" +
    "<div id='rf-shifts'></div></div>" +
    "<div class='dcard'><h3>Latest answers, verbatim</h3>" +
    "<div class='dbar'><a class='dbtn ghost' href='/dashboard/reflections.csv'>⬇ Download raw reflections (CSV)</a></div>" +
    "<div class='dtablewrap'><table class='dtable'><thead><tr><th>Student</th><th>Module</th><th>When</th><th>Question</th><th>Answer</th></tr></thead>" +
    "<tbody id='rf-recent'></tbody></table>" +
    "<div class='dempty' id='rf-recent-empty' hidden>No answers read yet.</div></div></div>" +
    "</div></section>" +

    /* ---------- analytics ---------- */
    "<section class='dview' id='v-analytics' hidden>" +
    "<div class='dbar'><span class='dbarlabel'>Cohort filter</span><div class='chips' id='a-chips'></div></div>" +
    "<div class='dcard'><div class='cardhead'><h3>Learning — every module <span class='dtag' id='lc-note' hidden>all cohorts</span></h3>" +
    "<a class='dbtn ghost sm' href='/dashboard/modules.csv'>⬇ Module CSV</a></div>" +
    "<div class='modscroll'><div id='ch-courses'></div></div></div>" +
    "<div class='dcard'><h3>Curriculum impact <span class='dtag' id='cu-note' hidden>all cohorts</span></h3><div id='ch-curriculum'></div></div>" +
    "<div class='dsplit even'>" +
    "<div class='dcard'><h3>Engagement mix</h3><div id='ch-tiers'></div></div>" +
    "<div class='dcard'><h3>Career tool adoption</h3><div id='ch-adopt'></div></div>" +
    "</div>" +
    "<div class='dcard'><h3>CV score distribution</h3><div id='ch-dist'></div></div>" +
    "<div class='dcard'><h3>Career tool activity — last 12 weeks</h3><div id='ch-activity'></div></div>" +
    "<div class='dcard'><h3>Average job-ready score by cohort</h3><div id='ch-cohorts'></div></div>" +
    "</section>" +

    "<p class='dnote'>Scores, attempts and timestamps only — learner documents, letters and recordings are never stored. " +
    "Self-reflections are read straight from learners&#39; own course records. Coverage: <span id='dsample'></span>.</p>" +
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
function b64u(s){try{return btoa(unescape(encodeURIComponent(s))).replace(/[+]/g,'-').replace(/[/]/g,'_').replace(/=+$/,'')}catch(e){return ''}}
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
cohorts:['Cohorts','Groups by cohort tag'],
reflections:['Self-Reflections','What learners say before and after each module — in their own words'],
analytics:['Analytics','Adoption, scores and activity — visual first']};
function go(v){view=v;
document.querySelectorAll('.dn[data-view]').forEach(function(b){b.classList.toggle('on',b.dataset.view===v)});
document.querySelectorAll('.dview').forEach(function(s){s.hidden=true});
var sec=$('v-'+v);sec.hidden=false;
if(!reduce){sec.classList.remove('din');void sec.offsetWidth;sec.classList.add('din');}
$('dh-title').textContent=TITLES[v][0];$('dh-sub').textContent=TITLES[v][1];
if(v==='students')renderStudents();
if(v==='cohorts')renderCohorts();
if(v==='reflections')loadReflections();
if(v==='analytics')renderAnalytics();}
document.querySelectorAll('[data-view]').forEach(function(b){b.addEventListener('click',function(){go(b.dataset.view)})});
/* ---------- charts (inline SVG) ---------- */
function hbar(rows,max){var out="<div class='hbars'>";
rows.forEach(function(r){var pct=max?Math.round(r.v*100/max):0;
out+="<div class='hb'><span class='hb-l' title='"+esc2(r.l)+"'>"+esc2(r.l)+"</span>"+
"<div class='hb-t' role='img' aria-label='"+esc2(r.l)+": "+esc2(r.r!==undefined?r.r:r.v)+"'><i style='width:"+pct+"%;background:"+(r.c||'#13507F')+"'></i></div>"+
"<span class='hb-v' aria-hidden='true'>"+esc2(r.r!==undefined?r.r:r.v)+"</span></div>";});
return out+"</div>";}
function colChart(vals,labels,color){var n=vals.length;if(!n)return '';
var W=Math.max(300,n*34),H=140,base=112,maxH=92;var max=Math.max.apply(null,vals.concat([1]));
var desc=labels.map(function(l,i){return l+': '+vals[i]}).join(', ');
var s="<svg viewBox='0 0 "+W+" "+H+"' class='colchart' role='img' aria-label='"+esc2(desc)+"'>";
s+="<line x1='0' y1='"+base+"' x2='"+W+"' y2='"+base+"' stroke='#E3DDDA' stroke-width='2'/>";
vals.forEach(function(v,i){var bw=20;var x=i*(W/n)+(W/n-bw)/2;
var c=Array.isArray(color)?(color[i]||'#13507F'):(color||'#13507F');
/* zero draws no bar — a phantom sliver implies data that is not there */
if(v>0){var h=Math.max(3,(v/max)*maxH);var y=base-h;
s+="<rect x='"+x+"' y='"+y+"' width='"+bw+"' height='"+h+"' rx='4' fill='"+c+"'/>";
s+="<text x='"+(x+bw/2)+"' y='"+(y-5)+"' text-anchor='middle' font-size='10' font-weight='700' fill='#68788A'>"+v+"</text>";}
else{s+="<text x='"+(x+bw/2)+"' y='"+(base-6)+"' text-anchor='middle' font-size='10' fill='#B9AFAB'>0</text>";}
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
countUp($('k-learners'),k.learners);$('k-learners-bar').parentElement.style.display='none';
var enrolled=DATA.learners.reduce(function(s,r){return s+r.learning.enrolled},0);
countUp($('k-modules'),k.modulesCompleted);
$('k-modules-bar').style.width=(enrolled?Math.round(k.modulesCompleted*100/enrolled):0)+'%';
$('k-modules-bar').style.background='#1B7A4B';
countUp($('k-engaged'),k.engaged);
$('k-engaged-bar').style.width=(k.learners?Math.round(k.engaged*100/k.learners):0)+'%';
if(k.avgCv!==null){countUp($('k-avgcv'),k.avgCv);$('k-avgcv-bar').style.width=k.avgCv+'%';
$('k-avgcv-bar').style.background=band(k.avgCv);}
else{$('k-avgcv').textContent='—';
$('k-avgcv').nextElementSibling.nextElementSibling.textContent='no CV reviews yet';
$('k-avgcv-bar').parentElement.style.display='none';}
/* The pipeline: both systems, one picture. Width = share of scope. */
var fu=DATA.funnel||[];var scopeN=(fu[0]&&fu[0].n)||1;
$('funnel').innerHTML=fu.map(function(st,i){
var pct=Math.round(st.n*100/Math.max(1,scopeN));
var c=i===0?'#05253C':i<4?'#13507F':i===4?'#ED9249':'#1B7A4B';
return "<div class='fu-row'><span class='fu-l'>"+esc2(st.stage)+"</span>"+
"<div class='fu-t' role='img' aria-label='"+esc2(st.stage)+": "+st.n+" learners ("+pct+"%)'><i style='width:"+pct+"%;background:"+c+"'></i></div>"+
"<span class='fu-v' aria-hidden='true'>"+st.n+"<i>"+pct+"%</i></span></div>";}).join('');
var att=DATA.attention||[];$('att-count').textContent=att.length+' flagged';
$('att-empty').hidden=att.length>0;
$('att-body').innerHTML=att.map(function(a){
return "<tr><td><b>"+esc2(a.name)+"</b><br><span class='dmut'>"+esc2(a.email)+"</span></td>"+
"<td><span class='dtag warn'>"+esc2(a.issue||'')+"</span></td>"+
"<td><span style='color:"+(a.readiness===null?'#B9AFAB':band(a.readiness))+";font-weight:800'>"+(a.readiness===null?'—':a.readiness)+"</span></td>"+
"<td>"+a.tasksDone+"/7</td>"+
"<td><button type='button' class='dlink' data-drill='"+esc2(a.email)+"'>View →</button></td></tr>";}).join('');
wireDrills();}
function chips(el,onPick){var tags=DATA.tags||[];
el.innerHTML="<button type='button' class='chip"+(cohortFilter?'':' on')+"' data-chip=''>All in scope</button>"+
tags.map(function(t){return "<button type='button' class='chip"+(cohortFilter===t.tag?' on':'')+"' data-chip='"+esc2(t.tag)+"'>"+esc2(t.tag)+" <i>"+t.count+"</i></button>"}).join('');
el.querySelectorAll('[data-chip]').forEach(function(b){b.onclick=function(){
cohortFilter=b.dataset.chip||null;onPick();};});}
function renderStudents(){chips($('s-chips'),renderStudents);
var rows=scoped();$('s-empty').hidden=rows.length>0;
var usingTools=rows.filter(function(r){return r.readiness!==null}).length;
var neverIn=rows.filter(function(r){return r.engagement.tier==='high'&&r.engagement.daysSinceLogin===null}).length;
var modsDone=rows.reduce(function(s,r){return s+r.learning.completed},0);
$('s-stats').innerHTML="<span>👥 Students <b>"+rows.length+"</b></span>"+
"<span>🎓 Modules completed <b>"+modsDone+"</b></span>"+
"<span>⚡ Using career tools <b>"+usingTools+"</b></span>"+
"<span>🕐 Never logged in <b>"+neverIn+"</b></span>";
$('s-body').innerHTML=rows.map(function(r){var e=r.employability;var lg=r.learning;
var modPct=lg.enrolled?Math.round(lg.completed*100/lg.enrolled):0;
return "<tr data-drill='"+esc2(r.email)+"' class='rowlink'><td><b>"+esc2(r.name)+"</b><br><span class='dmut'>"+esc2(r.email)+"</span></td>"+
"<td>"+r.tags.slice(0,2).map(function(t){return "<span class='dtag'>"+esc2(t)+"</span>"}).join(' ')+"</td>"+
"<td><span class='ms'>"+lg.completed+"/"+lg.enrolled+"</span><i class='msb'><b style='width:"+modPct+"%;background:#1B7A4B'></b></i></td>"+
"<td>"+miniScore(e.cv.latest)+"</td><td>"+miniScore(e.linkedin.latest)+"</td><td>"+miniScore(e.interview.latest)+"</td>"+
"<td>"+e.cover.attempts+"</td><td>"+r.tasksDone+"/7</td>"+
"<td>"+miniScore(r.readiness)+"</td></tr>";}).join('');
wireDrills();}
function wireDrills(){document.querySelectorAll('[data-drill]').forEach(function(el){
el.onclick=function(){var r=DATA.learners.find(function(x){return x.email===el.dataset.drill});
if(!r)return;go('students');drill(r);};});}
function drill(r){var e=r.employability;var d=$('drill');var lg=r.learning;var en=r.engagement;
/* Tiny score-trend sparkline: every attempt, first to latest. */
function spark(h){if(!h||h.length<2)return '';
var W=68,H=22,n=h.length;
var pts=h.map(function(s,i){return (i*(W-4)/(n-1)+2)+','+(H-2-(s*(H-4)/100))}).join(' ');
return "<svg class='dr-spark' viewBox='0 0 "+W+" "+H+"' role='img' aria-label='Score trend across "+n+" attempts'>"+
"<polyline points='"+pts+"' fill='none' stroke='"+band(h[h.length-1])+"' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>";}
function toolRow(label,t,isCount){return "<div class='dr-tool'><span class='dr-l'>"+label+"</span>"+
(isCount?"<span class='ms'>"+t.attempts+" created</span>":miniScore(t.latest)+spark(t.history))+
"<span class='dmut'>"+t.attempts+" attempt"+(t.attempts===1?'':'s')+(t.lastAt?" · last "+new Date(t.lastAt*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'')+"</span></div>";}
var modPct=lg.enrolled?Math.round(lg.completed*100/lg.enrolled):0;
var tierChip=en.tier?("<span class='dtag "+(en.tier==='high'?'warn':'')+"'>"+
({high:'Needs a nudge',medium:'Cooling off',watch:'Watch',ok:'Engaged',new:'New starter'}[en.tier]||en.tier)+"</span>"):'';
var loginNote=en.daysSinceLogin===null?(en.tier?'Never logged in':''):
en.daysSinceLogin===0?'Active today':en.daysSinceLogin+' day'+(en.daysSinceLogin===1?'':'s')+' since login';
var mailHref="mailto:"+encodeURIComponent(r.email)+"?subject="+encodeURIComponent('Your Fledglings journey')+
(en.nudge?"&body="+encodeURIComponent(en.nudge):"");
d.innerHTML="<div class='dr-head'><div><b>"+esc2(r.name)+"</b><br><span class='dmut'>"+esc2(r.email)+"</span> "+
r.tags.map(function(t){return "<span class='dtag'>"+esc2(t)+"</span>"}).join(' ')+" "+tierChip+"</div>"+
"<span class='dr-ready' style='color:"+(r.readiness===null?'#B9AFAB':band(r.readiness))+"'>"+(r.readiness===null?'—':r.readiness)+"<i>job-ready</i></span>"+
"<button type='button' class='dlink' id='drill-close'>✕</button></div>"+
"<div class='dr-learn'><span class='dr-l'>Learning modules</span>"+
"<span class='ms'>"+lg.completed+"/"+lg.enrolled+" completed</span>"+
"<i class='msb wide'><b style='width:"+modPct+"%;background:#1B7A4B'></b></i>"+
"<span class='dmut'>"+lg.inProgress+" in progress"+(loginNote?' · '+esc2(loginNote):'')+"</span>"+
((lg.modules&&lg.modules.length)?"<div class='dr-mods'>"+lg.modules.map(function(m){
return "<div class='dr-mod'><span class='dr-mt"+(m.done?' done':'')+"' title='"+esc2(m.t)+"'>"+
(m.done?'✓ ':'')+esc2(m.t)+"</span>"+
"<i class='msb'><b style='width:"+m.p+"%;background:"+(m.done?'#1B7A4B':m.p>0?'#13507F':'#D8D2CE')+"'></b></i>"+
"<span class='dr-mp'>"+m.p+"%</span></div>";}).join('')+"</div>":'')+
"</div>"+
"<div class='dr-tools'>"+toolRow('CV review',e.cv)+toolRow('LinkedIn',e.linkedin)+
toolRow('Interview',e.interview)+toolRow('Cover letters',e.cover,true)+"</div>"+
"<div class='dr-journey'>Career journey: <b>"+r.tasksDone+"/7</b> tasks"+
"<i class='msb wide'><b style='width:"+Math.round(r.tasksDone*100/7)+"%;background:#13507F'></b></i></div>"+
"<div class='dr-acts'>"+
"<a class='dbtn ghost sm' href='/hub?e="+b64u(r.email)+"&view=1' target='_blank' rel='noopener'>Open their hub view</a>"+
"<a class='dbtn ghost sm' href='"+mailHref+"'>✉ Email"+(en.nudge?' (nudge prefilled)':'')+"</a>"+
"</div>";
d.hidden=false;$('drill-close').onclick=function(){d.hidden=true};
d.scrollIntoView({behavior:'smooth',block:'nearest'});}
function renderCohorts(){var tags=DATA.tags||[];
$('co-empty').hidden=tags.length>0;
$('co-grid').innerHTML=tags.map(function(t){
var members=DATA.learners.filter(function(r){return r.tags.indexOf(t.tag)>-1});
var scored=members.filter(function(r){return r.readiness!==null});
var avg=scored.length?Math.round(scored.reduce(function(s,r){return s+r.readiness},0)/scored.length):null;
var done=members.filter(function(r){return r.tasksDone===7}).length;
var mc=members.reduce(function(s,r){return s+r.learning.completed},0);
var me=members.reduce(function(s,r){return s+r.learning.enrolled},0);
var mp=me?Math.round(mc*100/me):0;
return "<div class='dcard cocard'><div class='co-t'>"+esc2(t.tag)+"</div>"+
"<div class='co-n'>"+members.length+"</div><div class='kpi-s'>learners</div>"+
"<div class='co-row'><span>Modules completed</span><b>"+mc+"/"+me+"</b></div>"+
"<i class='msb wide'><b style='width:"+mp+"%;background:#1B7A4B'></b></i>"+
"<div class='co-row'><span>Avg job-ready</span><b style='color:"+(avg===null?'#8a97a1':band(avg))+"'>"+(avg===null?'—':avg)+"</b></div>"+
"<div class='co-row'><span>Career journey done</span><b>"+done+"</b></div>"+
"<button type='button' class='dbtn ghost co-view' data-cohort='"+esc2(t.tag)+"'>View students →</button></div>";}).join('');
document.querySelectorAll('[data-cohort]').forEach(function(b){b.onclick=function(){
cohortFilter=b.dataset.cohort;go('students');};});}
/* ---------- reflections (lazy) ---------- */
var REF=null,refLoading=false;
function loadReflections(){if(REF){renderReflections();return;}
if(refLoading)return;refLoading=true;
fetch('/portal/reflections').then(function(r){return r.json()}).then(function(d){
refLoading=false;if(d&&!d.error){REF=d;renderReflections();
/* the sweep builds incrementally — poll while building */
if(d.status==='building'&&d.responsesEnabled!==false){setTimeout(function(){REF=null;loadReflections()},4000);}}
else{$('rf-loading').innerHTML="<div class='dempty'>Could not load reflections — refresh to retry.</div>";}})
.catch(function(){refLoading=false;
$('rf-loading').innerHTML="<div class='dempty'>Could not reach the reflections service.</div>";});}
function renderReflections(){var d=REF;if(!d)return;
$('rf-loading').hidden=true;
var gated=d.responsesEnabled===false;
$('rf-gate').hidden=!gated;
$('rf-building').hidden=gated||d.status!=='building';
$('rf-ready').hidden=gated||d.status==='building';
if(gated){var hq=d.scoped===null;
$('rf-gate-hq').hidden=!hq;
if(hq){$('rf-gate-title').textContent='One switch left to flip';
$('rf-gate-body').textContent='Every module already collects a written self-reflection before and after. Reading the answers needs one switch at the platform supplier — send them the message below and this page fills itself in, nothing to rebuild.';
$('rf-ask').value=d.reason||'';
$('rf-copy').onclick=function(){var ta=$('rf-ask');ta.select();
try{navigator.clipboard.writeText(ta.value);}catch(e){document.execCommand('copy');}
$('rf-copy').textContent='Copied ✓';setTimeout(function(){$('rf-copy').textContent='Copy message for platform support'},1600);};}
var cov=(d.coverage||[]).filter(function(cv){return cv.preTitle||cv.postTitle}).length;
$('rf-coverage-note').textContent=cov?cov+' modules already have their reflection questions matched and waiting.':'';
return;}
if(d.status==='building'){var p=d.progress||{done:0,total:1};
$('rf-progress').textContent='Swept '+p.done+' of '+p.total+' modules so far — this page updates itself.';
$('rf-progress-bar').style.width=Math.round(p.done*100/Math.max(1,p.total))+'%';return;}
/* Bars only where a real ratio exists — a full bar under a raw count
 * fakes a target. */
countUp($('rf-pre'),d.preCount||0);$('rf-pre-bar').parentElement.style.display='none';
countUp($('rf-post'),d.postCount||0);
$('rf-post-bar').style.width=(d.preCount?Math.round((d.postCount||0)*100/d.preCount):0)+'%';
countUp($('rf-raw'),d.rawCount||0);$('rf-raw-bar').parentElement.style.display='none';
var flags=(d.flags||[]).slice().sort(function(a,b){return (a.acked?1:0)-(b.acked?1:0)});
var open=flags.filter(function(f){return !f.acked}).length;
$('rf-flags-card').hidden=flags.length===0;
$('rf-flags-count').textContent=open?open+' to review':'all checked in';
$('rf-flags').innerHTML=flags.map(function(f,i){
var inRows=DATA&&DATA.learners.some(function(r){return r.email===f.email});
return "<div class='rf-flag"+(f.acked?' acked':'')+"' id='rff-"+i+"'><b>"+esc2(f.email)+"</b> · "+esc2(f.courseTitle)+
"<div class='rf-q'>"+esc2(f.question)+"</div><div class='rf-a'>“"+esc2(f.answer)+"”</div>"+
"<div class='rf-acts'>"+
(inRows?"<button type='button' class='dlink' data-drill='"+esc2(f.email)+"'>View student →</button>":
"<a class='dlink' href='mailto:"+encodeURIComponent(f.email)+"'>Email student</a>")+
(f.acked?"<span class='rf-done'>✓ Checked in</span>":
"<button type='button' class='dlink' data-ack='"+esc2(f.key||'')+"' data-i='"+i+"'>Mark checked-in</button>")+
"</div></div>";}).join('');
document.querySelectorAll('[data-ack]').forEach(function(b){b.onclick=function(){
b.disabled=true;
fetch('/portal/reflections/ack',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({key:b.dataset.ack})}).then(function(r){return r.json()}).then(function(res){
if(res&&res.ok){var f=(REF.flags||[]).filter(function(x){return x.key===b.dataset.ack})[0];
if(f)f.acked=true;renderReflections();}else{b.disabled=false;}})
.catch(function(){b.disabled=false;});};});
wireDrills();
var shifts=(d.shifts||[]).filter(function(s){return s.preAvgPct!==null||s.postAvgPct!==null});
$('rf-shifts').innerHTML=shifts.length?shifts.map(function(s){
var pre=s.preAvgPct===null?0:s.preAvgPct,post=s.postAvgPct===null?0:s.postAvgPct;
var up=s.shift!==null&&s.shift>=0;
return "<div class='sh-row'><span class='sh-l' title='"+esc2(s.courseTitle)+"'>"+esc2(s.courseTitle)+"</span>"+
"<div class='sh-t'><i class='sh-pre' style='width:"+pre+"%'></i>"+
"<i class='sh-post' style='width:"+post+"%"+(s.shift!==null&&s.shift<0?";background:#B96A16":"")+"'></i>"+
(s.preAvgPct===null?'':"<b class='sh-mark' style='left:"+pre+"%'></b>")+"</div>"+
"<span class='sh-v'>"+(s.preAvgPct===null?'—':s.preAvgPct+'%')+" → "+(s.postAvgPct===null?'—':s.postAvgPct+'%')+
(s.shift===null?'':" <b class='"+(up?'up':'down')+"'>"+(up?'+':'')+s.shift+"</b>")+"</span>"+
"<span class='dmut'>"+s.preCount+" before · "+s.postCount+" after</span></div>";}).join('')
:"<div class='dempty'>No scored reflections read yet.</div>";
var recent=d.recent||[];
$('rf-recent-empty').hidden=recent.length>0;
$('rf-recent').innerHTML=recent.map(function(r){
return "<tr><td class='dmut'>"+esc2(r.email)+"</td><td>"+esc2(r.courseTitle)+"</td>"+
"<td class='dmut'>"+(r.submittedAt?new Date(r.submittedAt*1000).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'—')+"</td>"+
"<td class='rf-q'>"+esc2(r.question)+"</td><td class='rf-a'>"+esc2(r.answer)+"</td></tr>";}).join('');}
function renderAnalytics(){chips($('a-chips'),renderAnalytics);
var rows=scoped();
var TIER_ORDER=[['ok','Engaged','#1B7A4B'],['new','New starters','#13507F'],['watch','Watch list','#ED9249'],['medium','Cooling off','#B96A16'],['high','Needs contact','#D9452B']];
var tiers=TIER_ORDER.map(function(t){
return {l:t[1],v:rows.filter(function(r){return r.engagement.tier===t[0]}).length,c:t[2]};})
.filter(function(x){return x.v>0});
var untiered=rows.filter(function(r){return !r.engagement.tier}).length;
if(untiered)tiers.push({l:'Not assessed',v:untiered,c:'#B9AFAB'});
$('ch-tiers').innerHTML=tiers.length?hbar(tiers,rows.length||1):"<div class='dempty'>No learners in this filter.</div>";
/* Learning charts come from the server rollup over the whole scope —
 * flag that honestly when a cohort chip narrows the other charts. */
$('lc-note').hidden=!cohortFilter;$('cu-note').hidden=!cohortFilter;
var courses=(DATA.analytics&&DATA.analytics.courses)||[];
$('ch-courses').innerHTML=courses.length?hbar(courses.map(function(cs){
return {l:cs.title,v:cs.pct,r:cs.completed+'/'+cs.enrolled,c:'#1B7A4B'};}),100)
:"<div class='dempty'>No module enrolments in this scope yet.</div>";
var cur=(DATA.analytics&&DATA.analytics.curriculum)||[];
$('ch-curriculum').innerHTML=cur.length?hbar(cur.map(function(a){
return {l:a.area,v:a.pct,r:a.pct+'%',c:'#13507F'};}),100)
:"<div class='dempty'>No curriculum data yet.</div>";
function tried(t){return rows.filter(function(r){return r.employability[t].latest!==null||( t==='cover'&&r.employability[t].attempts>0)})}
var anyTool=['cv','linkedin','interview','cover'].some(function(t){return tried(t).length>0});
var SHARE_HINT="<div class='dempty'>No career-tool use in this cohort yet — learners reach the tools from "+
"<b>fledglings.co</b> or you can send them the hub link directly: <b>fledglings-coach.fledglings.workers.dev/hub</b></div>";
/* Categorical bars stay one neutral hue — red is reserved for bad
 * states so it always means the same thing. */
$('ch-adopt').innerHTML=anyTool?hbar([
{l:'CV review',v:tried('cv').length},
{l:'LinkedIn',v:tried('linkedin').length},
{l:'Interview',v:tried('interview').length},
{l:'Cover letter',v:tried('cover').length}],rows.length||1):SHARE_HINT;
var buckets=[0,0,0,0,0];
tried('cv').forEach(function(r){buckets[Math.min(4,Math.floor((r.employability.cv.latest||0)/20))]++});
/* Score buckets ARE quality bands — colour them so red only ever
 * appears under genuinely low scores. */
$('ch-dist').innerHTML=tried('cv').length?colChart(buckets,['0-19','20-39','40-59','60-79','80+'],
['#D9452B','#B96A16','#ED9249','#13507F','#1B7A4B'])
:"<div class='dempty'>Scores appear here after the first CV reviews.</div>";
var act=(DATA.analytics&&DATA.analytics.activity)||[];
var anyAct=act.some(function(a){return a.events>0});
$('ch-activity').innerHTML=anyAct?colChart(act.map(function(a){return a.events}),
act.map(function(a){return a.weeksAgo===0?'now':a.weeksAgo+'w'}),'#13507F')
:"<div class='dempty'>Activity shows here once learners start using the career tools.</div>";
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
$('dsample').textContent=(d.totalUsers!==null&&d.sampleSize>=d.totalUsers)?
'all '+d.totalUsers+' accounts covered, refreshed automatically every hour':
d.sampleSize+' of '+(d.totalUsers===null?'all':d.totalUsers)+' accounts sampled';
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
.dheadr{display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.dheadr .dbtn svg{width:17px;height:17px;}
.dbarlabel{font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);}
@keyframes din{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.din{animation:din .3s cubic-bezier(.2,.7,.3,1) both;}
.dcard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:16px;
  box-shadow:0 1px 3px rgba(5,37,60,.05);}
.dcard h3{font-size:15px;margin-bottom:12px;}
.kpigrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;margin-bottom:16px;}
.kpi{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;position:relative;
  box-shadow:0 1px 3px rgba(5,37,60,.05);}
.kpi-ico{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;
  border-radius:11px;background:#FBEAE6;font-size:18px;}
.kpi-n{font-size:32px;font-weight:800;font-variant-numeric:tabular-nums;margin-top:6px;line-height:1;}
.kpi-l{font-size:13.5px;font-weight:700;margin-top:6px;}
.kpi-s{font-size:11.5px;color:var(--mut);}
.kpi-bar{height:6px;border-radius:999px;background:var(--off);overflow:hidden;margin-top:10px;}
.kpi-bar i{display:block;height:100%;border-radius:999px;background:var(--blue);width:0;transition:width .7s cubic-bezier(.2,.7,.3,1);}
.dsplit{display:grid;grid-template-columns:280px 1fr;gap:16px;align-items:start;}
.dsplit.even{grid-template-columns:1fr 1fr;}
@media(max-width:900px){.dsplit,.dsplit.even{grid-template-columns:1fr;}}
#ch-courses .hb-l,#ch-curriculum .hb-l{width:200px;}
@media(max-width:700px){#ch-courses .hb-l,#ch-curriculum .hb-l{width:120px;}}
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
.dtag.warn{background:#FBEAE6;color:var(--orange);white-space:nowrap;}
.dlink{border:none;background:none;color:var(--blue);font-family:inherit;font-size:12.5px;font-weight:700;
  cursor:pointer;text-decoration:underline;}
.dempty{color:var(--mut);font-size:13.5px;padding:16px 4px;}
.cardhead{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap;}
.modscroll{max-height:330px;overflow-y:auto;padding-right:6px;}
.fu-row{display:grid;grid-template-columns:200px 1fr 92px;gap:12px;align-items:center;padding:7px 0;}
.fu-l{font-size:12.5px;font-weight:600;}
.fu-t{height:16px;border-radius:999px;background:var(--off);overflow:hidden;}
.fu-t i{display:block;height:100%;border-radius:999px;transition:width .7s cubic-bezier(.2,.7,.3,1);}
.fu-v{font-size:13px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;}
.fu-v i{font-style:normal;color:var(--mut);font-weight:600;font-size:11px;margin-left:5px;}
@media(max-width:760px){.fu-row{grid-template-columns:1fr 80px;}
.fu-t{grid-column:1/-1;}}
.dstats{display:flex;gap:22px;flex-wrap:wrap;font-size:12.5px;color:var(--mut);margin-bottom:14px;
  padding-bottom:12px;border-bottom:1px solid var(--line);}
.dstats b{color:var(--navy);font-weight:800;font-variant-numeric:tabular-nums;}
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
.hb-l{width:130px;font-size:12px;font-weight:600;color:var(--ink);flex:none;white-space:nowrap;
  overflow:hidden;text-overflow:ellipsis;}
.hb-t{flex:1;height:12px;border-radius:999px;background:var(--off);overflow:hidden;}
.hb-t i{display:block;height:100%;border-radius:999px;transition:width .7s cubic-bezier(.2,.7,.3,1);}
.hb-v{min-width:44px;font-size:12px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;flex:none;}
.colchart{width:100%;max-width:560px;display:block;}
.dr-head{display:flex;gap:14px;align-items:flex-start;}
.dr-head>div:first-child{flex:1;}
.dr-ready{font-size:26px;font-weight:800;text-align:right;}
.dr-ready i{display:block;font-style:normal;font-size:10px;color:var(--mut);font-weight:700;}
.dr-learn{border:1.5px solid #CBE3D4;background:#F3FAF6;border-radius:12px;padding:12px;margin-top:14px;}
.dr-learn .dmut{display:block;margin-top:5px;}
.dr-mods{margin-top:12px;display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:7px 18px;}
.dr-mod{display:grid;grid-template-columns:1fr 56px 34px;gap:8px;align-items:center;}
.dr-mt{font-size:11.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.dr-mt.done{color:#1B7A4B;}
.dr-mp{font-size:11px;font-weight:700;color:var(--mut);text-align:right;font-variant-numeric:tabular-nums;}
.dr-acts{display:flex;gap:9px;flex-wrap:wrap;margin-top:14px;}
.dbtn.sm{padding:8px 13px;font-size:12.5px;}
.dr-tools{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin:16px 0 12px;}
.dr-tool{border:1.5px solid var(--line);border-radius:12px;padding:12px;}
.dr-spark{display:inline-block;vertical-align:middle;margin-left:10px;width:68px;height:22px;}
.dr-l{display:block;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;color:var(--blue);margin-bottom:6px;}
.dr-tool .dmut{display:block;margin-top:5px;}
.dr-journey{font-size:13px;color:var(--ink);}
.rf-gate{max-width:560px;border-left:4px solid var(--mango);}
.rf-p{font-size:13.5px;color:var(--ink);line-height:1.55;margin-bottom:12px;}
.rf-ask{width:100%;border:1.5px solid var(--line);border-radius:11px;padding:12px;font-family:inherit;
  font-size:12.5px;color:var(--ink);background:#FBFAF9;resize:vertical;margin-bottom:10px;}
.rf-flags{border-left:4px solid var(--orange);}
.rf-flag{border:1.5px solid #F3C9C0;background:#FDF6F4;border-radius:12px;padding:12px;margin-bottom:9px;font-size:13px;}
.rf-flag.acked{border-color:var(--line);background:#FBFAF9;opacity:.75;}
.rf-acts{display:flex;gap:16px;align-items:center;margin-top:9px;}
.rf-done{font-size:12px;font-weight:700;color:var(--ok);}
.rf-q{font-size:12px;color:var(--mut);margin-top:5px;}
.rf-a{font-size:13px;margin-top:3px;line-height:1.5;}
.sh-row{display:grid;grid-template-columns:170px 1fr 150px 110px;gap:12px;align-items:center;padding:8px 0;
  border-bottom:1px solid var(--off);}
.sh-row:last-child{border-bottom:none;}
.sh-l{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.sh-t{position:relative;height:14px;border-radius:999px;background:var(--off);overflow:hidden;}
.sh-t i{position:absolute;left:0;top:0;height:100%;border-radius:999px;display:block;transition:width .7s cubic-bezier(.2,.7,.3,1);}
.sh-pre{background:#B9C8D6;}
.sh-post{background:#1B7A4B;opacity:.85;}
.sh-mark{position:absolute;top:-2px;bottom:-2px;width:3px;margin-left:-1px;border-radius:2px;
  background:var(--navy);display:block;}
.sh-v{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap;}
.sh-v b.up{color:#1B7A4B;}
.sh-v b.down{color:var(--orange);}
@media(max-width:760px){.sh-row{grid-template-columns:1fr 90px;grid-auto-flow:dense;}
.sh-t{grid-column:1/-1;}
/* On a phone the answers ARE the content — stack each response as a
 * card instead of pushing Question/Answer off-screen. */
#v-reflections thead{display:none;}
#rf-recent tr{display:block;border-bottom:1px solid var(--off);padding:10px 0;}
#rf-recent td{display:block;padding:2px 0;border:none;}
#rf-recent td.rf-q{margin-top:4px;}
/* Attention table stacks as cards too — five columns cannot share
 * 390px without crushing the issue chips. */
#att-table thead{display:none;}
#att-body tr{display:block;border-bottom:1px solid var(--off);padding:10px 0;}
#att-body td{display:block;padding:2px 0;border:none;}}
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
