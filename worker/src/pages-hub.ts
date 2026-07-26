/* Employability Hub — the Hiration-style home for the four
 * employability tools (CV review, LinkedIn Optimizer, Interview
 * Studio, Cover Letter Studio): a career journey stepper, a Career
 * Readiness ring (x/7 tasks done), a job-ready quality score, per-tool
 * cards with latest score + trend, and a guided what-next. Identity
 * comes from the LearnWorlds Liquid email (passed through to every
 * tool so scores land in one history); without it the hub still works
 * per-device. Scores only — no CV text, transcript, letter or answer
 * is ever stored. */

import { esc, pageShell } from "./pages";

interface HubCardDef {
  tool: string;
  emoji: string;
  title: string;
  blurb: string;
  href: string;
  cta: string;
}

const CARDS: HubCardDef[] = [
  {
    tool: "cv",
    emoji: "📄",
    title: "CV review",
    blurb: "Upload your CV for a recruiter-grade scored report — ATS checks, keyword match, honest feedback.",
    href: "/tools",
    cta: "Get scored",
  },
  {
    tool: "linkedin",
    emoji: "💼",
    title: "LinkedIn Optimizer",
    blurb: "Every section scored out of 100 — URL, headline, about, experience — with exactly what to fix.",
    href: "/linkedin",
    cta: "Optimise it",
  },
  {
    tool: "interview",
    emoji: "🎥",
    title: "Interview Studio",
    blurb: "Practise on camera with AI feedback on your answers, pace and presence. Nothing leaves your device.",
    href: "/interview",
    cta: "Practise",
  },
  {
    tool: "cover",
    emoji: "✉️",
    title: "Cover Letter Studio",
    blurb: "A letter that sounds like you, drafted from your real experience — never invented for you.",
    href: "/cover-letter",
    cta: "Create one",
  },
];

const STEPS: Array<{ tool: string; label: string }> = [
  { tool: "cv", label: "CV" },
  { tool: "linkedin", label: "LinkedIn" },
  { tool: "interview", label: "Interview" },
  { tool: "cover", label: "Cover letter" },
];

export function renderHubPage(): string {
  const stepper = STEPS.map(
    (s, i) =>
      (i > 0 ? "<span class='jline' aria-hidden='true'></span>" : "") +
      `<span class='jstep' id='jstep-${s.tool}'><i class='jdot'>${i + 1}</i><b>${esc(s.label)}</b></span>`,
  ).join("");

  const cards = CARDS.map(
    (c) =>
      `<div class='hubcard' id='card-${c.tool}'><div class='hc-top'><span class='hc-emoji'>${c.emoji}</span>` +
      `<span class='hc-flag' id='hc-flag-${c.tool}' hidden>Recommended step</span>` +
      `<span class='hc-score' id='hc-score-${c.tool}'>—</span></div>` +
      `<h3>${esc(c.title)}</h3><p>${esc(c.blurb)}</p>` +
      `<div class='hc-meta' id='hc-meta-${c.tool}'>not tried yet</div>` +
      `<div id='hc-spark-${c.tool}'></div>` +
      `<a class='btn' data-tool='${c.tool}' href='${c.href}'>${esc(c.cta)}</a></div>`,
  ).join("");

  const body =
    "<main class='wrap' style='max-width:1000px'>" +
    /* header row */
    "<div class='hubhead'>" +
    "<div><h2 class='page'>Let's kickstart your career journey</h2>" +
    "<p class='sub' style='margin-bottom:0'>Four tools to walk into a real application ready — build the CV, sharpen " +
    "the profile, practise the interview, write the letter. Only your scores are saved, never your documents.</p></div>" +
    "<div class='crbox' id='crbox'><div class='cr-ring' id='cr-ring'><div class='in'><div class='pc' id='cr-pct'>0</div></div></div>" +
    "<div class='cr-t'><b>Career readiness</b><span id='cr-tasks'>0/7 tasks done</span></div></div>" +
    "</div>" +
    /* journey stepper */
    `<div class='journey card'>${stepper}</div>` +
    /* readiness banner */
    "<div class='ready card' id='ready-card'>" +
    "<div class='ring2' id='ready-ring'><div class='in'><div class='pc' id='ready-score'>–</div><div class='lb'>JOB-READY</div></div></div>" +
    "<div class='ready-txt'><div class='r-kind'>YOUR JOB-READY SCORE</div>" +
    "<div class='r-verdict' id='ready-verdict'>Let's find out where you stand</div>" +
    "<div class='r-file' id='ready-sub'>Quality, not just completion — a blend of your latest CV, LinkedIn and interview scores.</div></div>" +
    "</div>" +
    /* guided next step */
    "<div class='card nextstep' id='next-card' hidden><div class='ns-label'>DO THIS NEXT</div>" +
    "<div id='next-reason'></div>" +
    "<div class='btnrow' style='margin-top:14px'><a class='btn' id='next-btn' href='/tools'>Open</a></div></div>" +
    /* tool cards */
    `<div class='hubgrid'>${cards}</div>` +
    /* tasks checklist */
    "<div class='card' id='tasks-card' hidden><h3>Your seven tasks</h3><ul class='tasklist' id='task-list'></ul></div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:20px'>Scores stay for six months so you can watch them climb. " +
    "Daily limits: 5 reviews, 3 mock interviews, 3 cover letters. If anything you write or say worries Fledge about your " +
    "wellbeing, it points you to real support instead of scoring.</p>" +
    "</main>" +
    "<script>" + HUB_JS + "</script>";

  return pageShell({
    title: "Fledglings — Employability Hub",
    bodyHtml: body,
    extraCss: HUB_CSS,
  });
}

const HUB_JS = String.raw`(function(){
function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}
var lid=stored(localStorage,'fl_coach_learner_v1');
var $=function(id){return document.getElementById(id)};
function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
/* Liquid email arrives via ?e= (b64url) from the embed snippet */
var email='';try{var p=new URLSearchParams(location.search).get('e');
if(p){email=decodeURIComponent(atob(p.replace(/-/g,'+').replace(/_/g,'/')).split('').map(function(c){return '%'+c.charCodeAt(0).toString(16).padStart(2,'0')}).join(''));}}catch(err){}
if(email.indexOf('@')===-1)email='';
var eq=email?('e='+new URLSearchParams(location.search).get('e')):'';
function toolHref(base){return base+(base.indexOf('?')>-1?'&':'?')+(eq?eq+'&':'')+'hub=1';}
document.querySelectorAll('a[data-tool]').forEach(function(a){a.href=toolHref(a.getAttribute('href'));});
function band(s){return s>=70?'#1B7A4B':s>=50?'#B96A16':'#D9452B'}
function spark(hist){if(hist.length<2)return '';var w=90,h=26,max=100;
var pts=hist.map(function(v,i){return (i*(w/(hist.length-1))).toFixed(1)+','+(h-2-(v/max)*(h-4)).toFixed(1)}).join(' ');
return "<svg viewBox='0 0 "+w+" "+h+"' class='spark'><polyline points='"+pts+"' fill='none' stroke='#13507F' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/></svg>";}
function ago(at){if(!at)return '';var d=Math.floor((Date.now()/1000-at)/86400);
return d===0?'today':d===1?'yesterday':d+' days ago';}
var HREFS={cv:'/tools',linkedin:'/linkedin',interview:'/interview',cover:'/cover-letter'};
fetch('/api/hub',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,email:email})})
.then(function(r){return r.json()}).then(function(d){
if(!d||!d.ok||!d.summary)return;var s=d.summary;
/* tool cards */
['cv','linkedin','interview','cover'].forEach(function(t){var ts=s[t];
var scoreEl=$('hc-score-'+t),metaEl=$('hc-meta-'+t);
if(ts.latest===null){scoreEl.textContent='—';metaEl.textContent='not tried yet';return;}
if(t==='cover'){scoreEl.textContent='✓';scoreEl.style.color='#1B7A4B';
metaEl.textContent=ts.attempts+' letter'+(ts.attempts===1?'':'s')+' created · last '+ago(ts.lastAt);return;}
scoreEl.textContent=ts.latest;scoreEl.style.color=band(ts.latest);
var delta=ts.delta===null?'':(ts.delta>=0?' ▲'+ts.delta:' ▼'+Math.abs(ts.delta));
metaEl.innerHTML=esc2(ts.attempts+' attempt'+(ts.attempts===1?'':'s')+' · last '+ago(ts.lastAt))+
(delta?"<b style='color:"+(ts.delta>=0?'#1B7A4B':'#D9452B')+"'>"+delta+'</b>':'');
$('hc-spark-'+t).innerHTML=spark(ts.history);});
/* journey stepper: done = tried; current = the recommended tool */
['cv','linkedin','interview','cover'].forEach(function(t){
var el=$('jstep-'+t);if(!el)return;
if(s[t].latest!==null){el.classList.add('done');el.querySelector('.jdot').textContent='✓';}
if(s.next&&s.next.tool===t){el.classList.add('now');}});
/* career readiness ring (tasks) */
if(typeof s.careerReadiness==='number'){
$('cr-pct').textContent=s.careerReadiness;
var cc=band(Math.max(s.careerReadiness,1));
$('cr-ring').style.background='conic-gradient('+cc+' 0deg '+Math.round(s.careerReadiness*3.6)+'deg,#ECE7E6 '+Math.round(s.careerReadiness*3.6)+'deg)';
$('cr-tasks').textContent=s.tasksDone+'/'+s.tasks.length+' tasks done';}
/* tasks checklist */
if(s.tasks&&s.tasks.length){$('tasks-card').hidden=false;
$('task-list').innerHTML=s.tasks.map(function(t){
return "<li class='"+(t.done?'done':'')+"'><i>"+(t.done?'✓':'○')+"</i>"+esc2(t.label)+"</li>"}).join('');}
/* job-ready quality blend */
if(s.readiness!==null){var col=band(s.readiness);
$('ready-score').textContent=s.readiness;$('ready-score').style.color=col;
$('ready-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(s.readiness*3.6)+'deg,#ECE7E6 '+Math.round(s.readiness*3.6)+'deg)';
$('ready-verdict').textContent=s.readiness>=70?'Looking genuinely job-ready':s.readiness>=50?'Solid base — keep sharpening':'Early days — every attempt counts';}
/* next step */
var nc=$('next-card');nc.hidden=false;$('next-reason').textContent=s.next.reason;
$('next-btn').href=toolHref(HREFS[s.next.tool]||'/tools');
$('next-btn').textContent=s.next.tool==='interview'?'Practise now':s.next.tool==='cover'?'Create it now':'Review now';
var flag=$('hc-flag-'+s.next.tool);if(flag)flag.hidden=false;
var card=$('card-'+s.next.tool);if(card)card.classList.add('rec');
}).catch(function(){});
})();`;

const HUB_CSS = `
.hubhead{display:flex;gap:22px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;margin-bottom:18px;}
.hubhead>div:first-child{flex:1;min-width:260px;}
.crbox{display:flex;align-items:center;gap:12px;background:#fff;border-radius:16px;padding:12px 18px;
  box-shadow:0 2px 10px rgba(5,37,60,.08);}
.cr-ring{width:62px;height:62px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;
  background:conic-gradient(#ECE7E6 0deg,#ECE7E6 360deg);}
.cr-ring .in{width:46px;height:46px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;}
.cr-ring .pc{font-size:16px;font-weight:800;}
.cr-t b{display:block;font-size:13.5px;}
.cr-t span{font-size:12px;color:#8a97a1;}
.journey{display:flex;align-items:center;gap:0;padding:18px 22px;overflow-x:auto;}
.jstep{display:flex;align-items:center;gap:8px;flex:none;}
.jstep .jdot{width:28px;height:28px;border-radius:50%;background:#fff;border:2px solid #C9C1BD;color:#8a97a1;
  font-style:normal;font-weight:800;font-size:12.5px;display:inline-flex;align-items:center;justify-content:center;flex:none;}
.jstep b{font-size:13px;color:#8a97a1;font-weight:600;white-space:nowrap;}
.jstep.done .jdot{background:#1B7A4B;border-color:#1B7A4B;color:#fff;}
.jstep.done b{color:var(--navy);}
.jstep.now .jdot{border-color:var(--orange);color:var(--orange);box-shadow:0 0 0 4px rgba(217,69,43,.15);}
.jstep.now b{color:var(--orange);}
.jstep.now.done .jdot{background:#1B7A4B;border-color:#1B7A4B;color:#fff;}
.jline{flex:1;min-width:26px;height:0;border-top:2px dashed #C9C1BD;margin:0 10px;}
.ready{display:flex;align-items:center;gap:22px;flex-wrap:wrap;border-top:6px solid var(--orange);}
.ring2{width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;
  background:conic-gradient(#ECE7E6 0deg,#ECE7E6 360deg);}
.ring2 .in{width:84px;height:84px;border-radius:50%;background:#fff;display:flex;flex-direction:column;
  align-items:center;justify-content:center;}
.ring2 .pc{font-size:30px;font-weight:800;line-height:1;}
.ring2 .lb{font-size:10px;color:var(--blue);font-weight:700;letter-spacing:.06em;}
.r-kind{font-size:11.5px;font-weight:700;color:var(--blue);letter-spacing:.08em;}
.r-verdict{font-size:23px;font-weight:700;line-height:1.2;margin:4px 0;}
.r-file{font-size:13px;color:#8a97a1;line-height:1.5;}
.hubgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;}
@media(max-width:960px){.hubgrid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.hubgrid{grid-template-columns:1fr;}}
.hubcard{background:#fff;border-radius:18px;padding:20px;box-shadow:0 2px 10px rgba(5,37,60,.08);
  display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s;position:relative;}
.hubcard:hover{transform:translateY(-3px);box-shadow:0 12px 26px -12px rgba(5,37,60,.35);}
.hubcard.rec{outline:2px solid var(--orange);outline-offset:-2px;}
.hc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;gap:8px;}
.hc-emoji{font-size:24px;}
.hc-flag{background:linear-gradient(90deg,#D9452B,#B03A80);color:#fff;border-radius:999px;padding:3px 10px;
  font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;white-space:nowrap;}
.hc-score{font-size:28px;font-weight:800;font-variant-numeric:tabular-nums;color:#B9AFAB;}
.hubcard h3{font-size:15.5px;font-weight:700;margin-bottom:6px;}
.hubcard p{font-size:12.5px;color:#4a5b66;line-height:1.55;flex:1;}
.hc-meta{font-size:11.5px;color:#8a97a1;margin:10px 0 4px;min-height:15px;}
.hc-meta b{margin-left:6px;}
.spark{width:90px;height:26px;display:block;margin-bottom:10px;}
.hubcard a.btn{text-align:center;text-decoration:none;display:block;padding:11px 18px;min-height:42px;font-size:14px;}
.tasklist{list-style:none;columns:2;column-gap:28px;}
@media(max-width:640px){.tasklist{columns:1;}}
.tasklist li{display:flex;gap:10px;align-items:flex-start;padding:7px 0;font-size:13.5px;color:#4a5b66;break-inside:avoid;}
.tasklist li i{width:22px;height:22px;border-radius:50%;background:var(--off);color:#8a97a1;font-style:normal;font-weight:800;
  font-size:12px;display:inline-flex;align-items:center;justify-content:center;flex:none;}
.tasklist li.done{color:var(--navy);}
.tasklist li.done i{background:#E7F3EC;color:#1B7A4B;}
.nextstep{background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;}
.nextstep .ns-label{font-size:11.5px;font-weight:700;letter-spacing:.1em;color:var(--mango);margin-bottom:6px;}
.nextstep div:nth-child(2){font-size:15.5px;line-height:1.6;font-weight:500;}
.nextstep a.btn{text-decoration:none;}
`;
