/* Employability Hub — the Hiration-style home of the suite, matching
 * the founder's reference design: light app shell with sidebar, a
 * "kickstart your career journey" header with a Career Readiness ring
 * (x/7 tasks), an icon journey stepper with dashed connectors, four
 * tool cards with icon circles + status bands + a Recommended Step
 * flag, and a Recent activity strip. Identity comes from the
 * LearnWorlds Liquid email when embedded or the saved email when
 * standalone; only integer scores are ever stored. */

import { appShell, esc, NAV_ICONS } from "./pages";

interface HubCardDef {
  tool: string;
  icon: string;
  title: string;
  href: string;
  cta: string;
}

const CARDS: HubCardDef[] = [
  { tool: "cv", icon: "cv", title: "Get your CV scored like a recruiter would", href: "/tools", cta: "Review my CV" },
  { tool: "linkedin", icon: "linkedin", title: "Optimise your LinkedIn to impress recruiters", href: "/linkedin", cta: "Review LinkedIn" },
  { tool: "interview", icon: "interview", title: "Practise interviews with real-time feedback", href: "/interview", cta: "Take interview" },
  { tool: "cover", icon: "cover", title: "Create a cover letter based on a job advert", href: "/cover-letter", cta: "Create cover letter" },
];

/* Journey steps with their task counts (from the seven-task model). */
const STEPS: Array<{ tool: string; icon: string; label: string; tasks: number }> = [
  { tool: "cv", icon: "cv", label: "CV", tasks: 2 },
  { tool: "linkedin", icon: "linkedin", label: "LinkedIn", tasks: 2 },
  { tool: "interview", icon: "interview", label: "Interview", tasks: 2 },
  { tool: "cover", icon: "cover", label: "Cover Letter", tasks: 1 },
];

export function renderHubPage(): string {
  const stepper = STEPS.map(
    (s, i) =>
      (i > 0 ? "<span class='jline' aria-hidden='true'></span>" : "") +
      `<span class='jstep' id='jstep-${s.tool}'>` +
      `<span class='jicon' id='jicon-${s.tool}'>${NAV_ICONS[s.icon]}</span>` +
      `<span class='jlabel'><b>${esc(s.label)}</b> <i>(${s.tasks} task${s.tasks === 1 ? "" : "s"})</i></span></span>`,
  ).join("");

  const cards = CARDS.map(
    (c) =>
      `<div class='tcard' id='card-${c.tool}'>` +
      `<span class='tc-flag' id='hc-flag-${c.tool}' hidden>Recommended Step</span>` +
      `<div class='tc-head'><span class='tc-icon'>${NAV_ICONS[c.icon]}</span></div>` +
      `<div class='tc-band' id='tc-band-${c.tool}' hidden></div>` +
      `<div class='tc-body'><h3>${esc(c.title)}</h3>` +
      `<div class='tc-meta' id='hc-meta-${c.tool}'></div>` +
      `<a class='btn ghost tc-btn' data-tool='${c.tool}' id='hc-btn-${c.tool}' href='${c.href}'>${esc(c.cta)}</a>` +
      "</div></div>",
  ).join("");

  const body =
    "<main class='wrap'>" +
    /* header row */
    "<div class='hubhead'>" +
    "<div><h2 class='page' id='hub-hi'>Let's kickstart your career journey</h2>" +
    "<p class='sub' style='margin-bottom:0'>We've got your back — with tools to help you build a strong CV, " +
    "prep for interviews, and stand out confidently.</p></div>" +
    "<div class='statrow'>" +
    "<div class='crbox'><div class='cr-t'><b>Career Readiness (%)</b><span id='cr-tasks'>0/7 tasks done</span></div>" +
    "<div class='cr-ring' id='cr-ring'><div class='in'><div class='pc' id='cr-pct'>0</div></div></div></div>" +
    "<div class='crbox' id='jr-box' hidden><div class='cr-t'><b>Job-ready score</b><span>quality of your latest scores</span></div>" +
    "<div class='cr-ring' id='jr-ring'><div class='in'><div class='pc' id='jr-pct'>–</div></div></div></div>" +
    "<div class='crbox' id='lr-box' hidden><div class='cr-t'><b>Your learning</b><span id='lr-sub'>modules completed</span></div>" +
    "<div class='cr-ring' id='lr-ring'><div class='in'><div class='pc' id='lr-pct'>0</div></div></div></div>" +
    "</div></div>" +
    /* journey stepper */
    `<div class='journey'>${stepper}</div>` +
    /* continue-learning band — the learning side of the same journey */
    "<div class='card learnband' id='learn-card' hidden>" +
    "<div class='lb-body'><span class='lb-label'>CONTINUE YOUR LEARNING</span>" +
    "<b id='learn-title'></b><div class='lb-bar'><i id='learn-bar'></i></div></div>" +
    "<a class='btn' id='learn-btn' href='#' target='_top'>Continue →</a></div>" +
    /* tool cards */
    `<div class='hubgrid'>${cards}</div>` +
    /* guided next step */
    "<div class='card nextstep' id='next-card' hidden><div class='ns-label'>DO THIS NEXT</div>" +
    "<div id='next-reason'></div>" +
    "<div class='btnrow' style='margin-top:14px'><a class='btn' id='next-btn' href='/tools'>Open</a></div></div>" +
    /* recent activity */
    "<h3 class='sec-title' id='recent-title' hidden>Recent</h3>" +
    "<div class='recentgrid' id='recent-list'></div>" +
    /* tasks checklist */
    "<div class='card' id='tasks-card' hidden><h3>Your seven tasks</h3><ul class='tasklist' id='task-list'></ul></div>" +
    /* identity */
    "<div class='card idcard' id='account'>" +
    "<div id='id-known' hidden>💾 <b>Progress saving as <span id='id-email'></span></b>" +
    "<span class='id-sub'>Your scores follow this email — here, standalone, and inside your Fledglings courses.</span>" +
    "<button type='button' class='idlink' id='id-change'>Use a different email</button></div>" +
    "<div id='id-anon' hidden><b>Keep your scores?</b>" +
    "<span class='id-sub'>Enter the email you use with Fledglings and your progress follows you on any device or page. " +
    "It's only used as the key for your scores — no password, nothing else stored.</span>" +
    "<div class='idrow'><input type='email' id='id-input' maxlength='80' placeholder='you@example.com' aria-label='Your email'>" +
    "<button type='button' class='btn' id='id-save'>Save my progress</button></div>" +
    "<div class='id-err' id='id-err' hidden>That doesn't look like an email — check it and try again.</div></div>" +
    "</div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:8px'>Scores stay for six months so you can watch them climb. " +
    "Daily limits: 5 reviews, 3 mock interviews, 3 cover letters. If anything you write or say worries Fledge about your " +
    "wellbeing, it points you to real support instead of scoring.</p>" +
    "</main>" +
    "<script>" + HUB_JS + "</script>";

  return appShell({
    title: "Fledglings — Employability Hub",
    active: "home",
    bodyHtml: body,
    extraCss: HUB_CSS,
  });
}

const HUB_JS = String.raw`(function(){
function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}
var lid=stored(localStorage,'fl_coach_learner_v1');
var $=function(id){return document.getElementById(id)};
function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
var email=flResolveEmail();
var viewOnly=flViewOnly();
function toolHref(base){if(viewOnly)return base;
var ev=flEmailParam();
return base+(base.indexOf('?')>-1?'&':'?')+(ev?'e='+ev+'&':'')+'hub=1';}
document.querySelectorAll('a[data-tool]').forEach(function(a){a.href=toolHref(a.getAttribute('href'));});
/* identity card */
function renderIdentity(){if(viewOnly){
/* Hide, never destroy — later code binds handlers to these nodes. */
$('id-known').hidden=true;$('id-anon').hidden=true;
var b=document.createElement('div');
b.innerHTML="<b>👁 Provider view</b><span class='id-sub'>You are looking at the journey for "+esc2(email)+" — nothing here saves to your device.</span>";
$('account').appendChild(b);
return;}
var known=email.length>0;
$('id-known').hidden=!known;$('id-anon').hidden=known;
if(known)$('id-email').textContent=email;}
renderIdentity();
$('id-save').onclick=function(){var em=flSaveEmail($('id-input').value);
if(!em){$('id-err').hidden=false;return;}
location.reload();};
$('id-input').addEventListener('keydown',function(e){if(e.key==='Enter')$('id-save').click();});
$('id-change').onclick=function(){flClearEmail();location.reload();};
function band(s){return s>=70?'#1B9E5A':s>=50?'#F59E0B':'#D9452B'}
function ago(at){if(!at)return '';var d=Math.floor((Date.now()/1000-at)/86400);
return d<=0?'today':d===1?'yesterday':d+' days ago';}
var LABELS={cv:'CV review',linkedin:'LinkedIn review',interview:'Mock interview',cover:'Cover letter'};
var HREFS={cv:'/tools',linkedin:'/linkedin',interview:'/interview',cover:'/cover-letter'};
/* Tasks per tool (mirrors the server's seven-task model). */
var TOOL_TASKS={cv:['cv-reviewed','cv-strong'],linkedin:['li-reviewed','li-strong'],interview:['iv-done','iv-strong'],cover:['cl-created']};
fetch('/api/hub',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,email:email})})
.then(function(r){return r.json()}).then(function(d){
if(!d||!d.ok||!d.summary)return;var s=d.summary;
if(d.name)$('hub-hi').textContent="Let's kickstart your career journey, "+d.name;
/* learning ring + continue-learning band (only when the account is known) */
if(d.learning&&d.learning.enrolled>0){var L=d.learning;
var lp=Math.round(L.completed*100/L.enrolled);
$('lr-box').hidden=false;$('lr-sub').textContent=L.completed+'/'+L.enrolled+' modules completed';
flCountUp($('lr-pct'),lp);
var lc=lp>=70?'#1B7A4B':'#13507F';$('lr-pct').style.color=lc;
$('lr-ring').style.background='conic-gradient('+lc+' 0deg '+Math.round(lp*3.6)+'deg,#E7EAF0 '+Math.round(lp*3.6)+'deg)';
if(email&&L.completed<L.enrolled){
fetch('/api/next-step',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,email:email})})
.then(function(r){return r.json()}).then(function(ns){
if(!ns||!ns.ok||!ns.url)return;
$('learn-card').hidden=false;$('learn-title').textContent=ns.title;
$('learn-bar').style.width=(ns.percent||0)+'%';
$('learn-btn').href=ns.url;}).catch(function(){});}}
var taskState={};(s.tasks||[]).forEach(function(t){taskState[t.id]=t.done});
/* tool cards: status band + meta + stepper state */
['cv','linkedin','interview','cover'].forEach(function(t){var ts=s[t];
var ids=TOOL_TASKS[t];var done=ids.filter(function(id){return taskState[id]}).length;
var bandEl=$('tc-band-'+t);
if(done===ids.length&&done>0){bandEl.hidden=false;bandEl.className='tc-band full';bandEl.textContent='✓ Completed';}
else if(done>0){bandEl.hidden=false;bandEl.className='tc-band part';bandEl.textContent=done+'/'+ids.length+' tasks completed';}
var metaEl=$('hc-meta-'+t);
if(ts.latest===null){metaEl.textContent='';}
else if(t==='cover'){metaEl.textContent=ts.attempts+' letter'+(ts.attempts===1?'':'s')+' created · last '+ago(ts.lastAt);}
else{var delta=ts.delta===null?'':(ts.delta>=0?' ▲'+ts.delta:' ▼'+Math.abs(ts.delta));
metaEl.innerHTML="Latest score <b style='color:"+band(ts.latest)+"'>"+ts.latest+"</b>"+
(delta?"<b style='color:"+(ts.delta>=0?'#1B9E5A':'#D9452B')+"'>"+delta+"</b>":"")+
" · "+esc2(ts.attempts+' attempt'+(ts.attempts===1?'':'s'));}
var st=$('jstep-'+t);if(st){if(ts.latest!==null)st.classList.add('done');
if(s.next&&s.next.tool===t)st.classList.add('now');}});
/* career readiness + job-ready rings */
if(typeof s.careerReadiness==='number'){
flCountUp($('cr-pct'),s.careerReadiness);
var cc=s.careerReadiness>=70?'#1B7A4B':'#D9452B';
$('cr-ring').style.background='conic-gradient('+cc+' 0deg '+Math.round(s.careerReadiness*3.6)+'deg,#E7EAF0 '+Math.round(s.careerReadiness*3.6)+'deg)';
$('cr-tasks').textContent=s.tasksDone+'/'+s.tasks.length+' tasks done';}
if(s.readiness!==null){$('jr-box').hidden=false;var jc=band(s.readiness);
flCountUp($('jr-pct'),s.readiness);$('jr-pct').style.color=jc;
$('jr-ring').style.background='conic-gradient('+jc+' 0deg '+Math.round(s.readiness*3.6)+'deg,#E7EAF0 '+Math.round(s.readiness*3.6)+'deg)';}
/* tasks checklist */
if(s.tasks&&s.tasks.length){$('tasks-card').hidden=false;
$('task-list').innerHTML=s.tasks.map(function(t){
return "<li class='"+(t.done?'done':'')+"'><i>"+(t.done?'✓':'○')+"</i>"+esc2(t.label)+"</li>"}).join('');}
/* recent activity across all tools */
var rows=[];['cv','linkedin','interview','cover'].forEach(function(t){var ts=s[t];
if(ts.latest!==null)rows.push({t:t,score:ts.latest,at:ts.lastAt||0});});
rows.sort(function(a,b){return b.at-a.at});
if(rows.length){$('recent-title').hidden=false;
$('recent-list').innerHTML=rows.map(function(r){
return "<a class='recard' href='"+toolHref(HREFS[r.t])+"'><span class='re-l'>"+esc2(LABELS[r.t])+"</span>"+
"<span class='re-s' style='color:"+(r.t==='cover'?'#1B9E5A':band(r.score))+"'>"+(r.t==='cover'?'✓ created':r.score)+"</span>"+
"<span class='re-a'>"+esc2(ago(r.at))+"</span></a>"}).join('');}
/* next step */
var nc=$('next-card');nc.hidden=false;$('next-reason').textContent=s.next.reason;
$('next-btn').href=toolHref(HREFS[s.next.tool]||'/tools');
$('next-btn').textContent=s.next.tool==='interview'?'Practise now':s.next.tool==='cover'?'Create it now':'Review now';
var flag=$('hc-flag-'+s.next.tool);if(flag)flag.hidden=false;
var card=$('card-'+s.next.tool);if(card)card.classList.add('rec');
var btn=$('hc-btn-'+s.next.tool);if(btn)btn.className='btn tc-btn';
}).catch(function(){});
})();`;

const HUB_CSS = `
.learnband{display:flex;align-items:center;gap:18px;border-left:4px solid #13507F;margin-bottom:18px;}
.lb-body{flex:1;min-width:0;}
.lb-label{display:block;font-size:10.5px;font-weight:800;letter-spacing:.1em;color:#13507F;margin-bottom:3px;}
.learnband b{font-size:15px;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.lb-bar{height:7px;border-radius:999px;background:#ECE7E6;overflow:hidden;margin-top:8px;}
.lb-bar i{display:block;height:100%;border-radius:999px;background:#13507F;width:0;transition:width .7s cubic-bezier(.2,.7,.3,1);}
.learnband .btn{flex:none;}
@media(max-width:560px){.learnband{flex-direction:column;align-items:stretch;}}
.hubhead{display:flex;gap:22px;align-items:flex-start;justify-content:space-between;flex-wrap:wrap;margin-bottom:24px;}
.hubhead>div:first-child{flex:1;min-width:260px;}
.statrow{display:flex;gap:12px;flex-wrap:wrap;}
.crbox{display:flex;align-items:center;gap:14px;background:#fff;border-radius:14px;padding:12px 16px;
  border:1px solid var(--line);box-shadow:0 1px 3px rgba(14,36,56,.04);}
.cr-t b{display:block;font-size:13.5px;}
.cr-t span{font-size:11.5px;color:var(--mut);}
.cr-ring{width:56px;height:56px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;
  background:conic-gradient(#E7EAF0 0deg,#E7EAF0 360deg);}
.cr-ring .in{width:42px;height:42px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;}
.cr-ring .pc{font-size:15px;font-weight:800;}
.journey{display:flex;align-items:flex-start;padding:26px 10px 30px;overflow-x:auto;margin-bottom:8px;}
.jstep{display:flex;flex-direction:column;align-items:center;gap:9px;flex:none;min-width:96px;}
.jicon{width:48px;height:48px;border-radius:50%;background:#fff;border:1.5px solid #C9D0DB;color:var(--mut);
  display:flex;align-items:center;justify-content:center;}
.jicon svg{width:21px;height:21px;}
.jlabel{font-size:13px;color:var(--mut);text-align:center;white-space:nowrap;}
.jlabel b{color:var(--ink);font-weight:600;}
.jlabel i{font-style:normal;font-size:11.5px;}
.jstep.done .jicon{background:var(--navy);border-color:var(--navy);color:#fff;}
.jstep.done .jlabel b{color:var(--navy);font-weight:700;}
.jstep.now .jicon{border-color:var(--pri);color:var(--pri);box-shadow:0 0 0 4px rgba(61,92,245,.14);}
.jstep.now .jlabel b{color:var(--pri);font-weight:700;}
.jstep.now.done .jicon{background:var(--navy);border-color:var(--navy);color:#fff;}
.jline{flex:1;min-width:34px;border-top:2px dashed #C9D0DB;margin:24px 8px 0;}
.hubgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px;}
@media(max-width:1080px){.hubgrid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.hubgrid{grid-template-columns:1fr;}}
.tcard{background:#fff;border-radius:16px;border:1px solid var(--line);box-shadow:0 1px 3px rgba(14,36,56,.04);
  display:flex;flex-direction:column;position:relative;overflow:hidden;transition:transform .15s,box-shadow .15s;}
.tcard:hover{transform:translateY(-3px);box-shadow:0 12px 26px -14px rgba(14,36,56,.28);}
.tcard.rec{outline:2px solid var(--pri);outline-offset:-2px;}
.tc-flag{position:absolute;top:0;left:0;background:linear-gradient(90deg,#D9452B,#ED9249);color:#fff;
  border-radius:0 0 10px 0;padding:5px 12px;font-size:10.5px;font-weight:800;letter-spacing:.03em;z-index:2;}
.tc-head{background:linear-gradient(180deg,#FDF3EC 0%,#FFF9F4 100%);display:flex;align-items:center;justify-content:center;
  padding:30px 0 26px;}
.tc-icon{width:74px;height:74px;border-radius:50%;background:#fff;box-shadow:0 4px 14px rgba(14,36,56,.10);
  display:flex;align-items:center;justify-content:center;color:var(--pri);}
.tc-icon svg{width:30px;height:30px;}
.tc-band{text-align:center;font-size:12.5px;font-weight:700;padding:7px 10px;color:#fff;}
.tc-band.part{background:var(--amber);}
.tc-band.full{background:var(--ok);}
.tc-body{padding:18px;display:flex;flex-direction:column;flex:1;}
.tc-body h3{font-size:15px;font-weight:600;line-height:1.4;text-align:center;margin-bottom:8px;flex:1;}
.tc-meta{font-size:12px;color:var(--mut);text-align:center;min-height:16px;margin-bottom:12px;}
.tc-meta b{margin-left:4px;}
.tc-btn{text-align:center;text-decoration:none;display:block;padding:12px 16px;min-height:44px;font-size:14px;}
.sec-title{font-size:19px;margin:26px 0 12px;}
.recentgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-bottom:16px;}
.recard{display:flex;align-items:center;gap:10px;background:#fff;border:1px solid var(--line);border-radius:14px;
  padding:14px 16px;text-decoration:none;color:var(--ink);font-size:13.5px;transition:border-color .12s;}
.recard:hover{border-color:var(--pri);}
.re-l{font-weight:600;flex:1;}
.re-s{font-weight:800;font-size:15px;}
.re-a{color:var(--mut);font-size:11.5px;}
.tasklist{list-style:none;columns:2;column-gap:28px;}
@media(max-width:640px){.tasklist{columns:1;}}
.tasklist li{display:flex;gap:10px;align-items:flex-start;padding:7px 0;font-size:13.5px;color:var(--mut);break-inside:avoid;}
.tasklist li i{width:22px;height:22px;border-radius:50%;background:var(--off);color:var(--mut);font-style:normal;font-weight:800;
  font-size:12px;display:inline-flex;align-items:center;justify-content:center;flex:none;}
.tasklist li.done{color:var(--navy);}
.tasklist li.done i{background:#E3F4EA;color:var(--ok);}
.nextstep{background:#fff;border-left:4px solid var(--orange);color:var(--navy);}
.nextstep .ns-label{font-size:11.5px;font-weight:700;letter-spacing:.1em;margin-bottom:6px;}
.nextstep div:nth-child(2){font-size:15.5px;line-height:1.6;font-weight:500;}
.nextstep a.btn{text-decoration:none;background:#fff;color:var(--pri);}
.idcard{font-size:14px;line-height:1.6;color:var(--mut);padding:16px 22px;}
.idcard b{color:var(--navy);}
.id-sub{display:block;font-size:12.5px;color:var(--mut);margin-top:2px;}
.idlink{border:none;background:none;color:var(--pri);font-family:inherit;font-size:12.5px;font-weight:700;
  cursor:pointer;text-decoration:underline;padding:0;margin-top:6px;}
.idrow{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;}
.idrow input{flex:1;min-width:220px;}
.id-err{color:var(--orange);font-weight:600;font-size:12.5px;margin-top:8px;}
`;
