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
    "<div class='idbtns'><button type='button' class='idlink' id='id-adddevice'>Link another device</button>" +
    "<button type='button' class='idlink' id='id-change'>Use a different email</button></div>" +
    /* the code this device issues for another one */
    "<div class='linkbox' id='lc-box' hidden>" +
    "<b>Type this code on your other device</b>" +
    "<div class='lc-code' id='lc-code'>------</div>" +
    "<span class='id-sub'>On that device open the Hub, choose <b>I already use Fledglings</b> and enter the code. " +
    "It works once and expires in <span id='lc-left'>10:00</span>.</span>" +
    "<div class='id-err' id='lc-err' hidden></div></div></div>" +
    "<div id='id-anon' hidden><b>Keep your scores?</b>" +
    "<span class='id-sub'>Enter the email you use with Fledglings and your progress follows you on any device or page. " +
    "It's only used as the key for your scores — no password, nothing else stored.</span>" +
    "<div class='idrow'><input type='email' id='id-input' maxlength='80' placeholder='you@example.com' aria-label='Your email'>" +
    "<button type='button' class='btn' id='id-save'>Save my progress</button></div>" +
    "<div class='id-err' id='id-err' hidden>That doesn't look like an email — check it and try again.</div>" +
    /* redeem a code issued by a device the learner already uses */
    "<div class='lc-alt'><button type='button' class='idlink' id='lc-show'>I already use Fledglings on another device</button>" +
    "<div id='lc-enter' hidden>" +
    "<span class='id-sub'>On your other device: Hub → <b>Link another device</b>. Type the code it shows here.</span>" +
    "<div class='idrow'><input type='text' id='lc-input' maxlength='12' placeholder='ABC-234' " +
    "autocomplete='off' autocapitalize='characters' spellcheck='false' aria-label='Your link code'>" +
    "<button type='button' class='btn' id='lc-go'>Link this device</button></div>" +
    "<div class='id-err' id='lc-enter-err' hidden></div></div></div></div>" +
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
function stored(st,k){return flStoredId(st,k)}
var lid=stored(localStorage,'fl_coach_learner_v1');
var $=function(id){return document.getElementById(id)};
function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
var viewOnly=flViewOnly();
/* Normally identity comes from the signed token. In a provider view
 * the address rides on the URL and the SERVER authorises the read
 * against their portal session — nothing is stored on this device. */
var email=viewOnly?flEmbedEmail():flResolveEmail();
/* Carry the signed token between surfaces — never a bare address. */
function toolHref(base){if(viewOnly)return base;
var ev=flToken();
return base+(base.indexOf('?')>-1?'&':'?')+(ev?'t='+encodeURIComponent(ev)+'&':'')+'hub=1';}
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
/* Opened inside a LearnWorlds course with ?e=? Exchange that address
 * for a signed token once, then re-render as the linked learner. */
if(!viewOnly&&!email){try{flAdoptEmbedEmail(lid);}catch(e){}}
/* Linking an email asks the worker for a signed token; it can say no
 * (address already in use on another device, or not a Fledglings
 * learner) and the learner gets told plainly what to do instead. */
var ID_REFUSALS={
claimed_elsewhere:"That email is already linked to another device — that's your protection working. Open the Hub on that device, tap “Link another device” and type the code it gives you below.",
cannot_link:"We couldn't link that email — check it's the address you use with Fledglings. You can carry on without linking; your scores still save on this device.",
too_many_devices:"That email is already linked to as many devices as we allow. Ask Fledglings to reset it, or carry on without linking — your scores still save on this device.",
unknown_email:"We can't find that email on Fledglings. Use the address you signed up with, or carry on without linking — your scores still save on this device.",
bad_email:"That doesn't look like an email — check it and try again.",
rate_limited:"That's a lot of linking attempts for one day. Try again tomorrow.",
offline:"Couldn't reach Fledglings just now — check your connection and try again.",
unavailable:"Linking is unavailable right now — your scores still save on this device."};
$('id-save').onclick=function(){var btn=this;
var raw=$('id-input').value;
$('id-err').hidden=true;btn.disabled=true;btn.textContent='Linking…';
flLinkEmail(raw,lid).then(function(r){
if(r.ok){location.reload();return;}
btn.disabled=false;btn.textContent='Save my progress';
$('id-err').textContent=ID_REFUSALS[r.reason]||ID_REFUSALS.unavailable;
$('id-err').hidden=false;
/* Already in use elsewhere? The code path is the way through — open
 * it for them rather than leaving a dead end. */
if(r.reason==='claimed_elsewhere'){$('lc-enter').hidden=false;$('lc-show').hidden=true;
$('lc-input').focus();}});};

/* ---- device link codes ---- */
var lcTimer=null;
function lcCountdown(until){if(lcTimer)clearInterval(lcTimer);
function tick(){var left=Math.max(0,Math.round(until-Date.now()/1000));
var m=Math.floor(left/60),s=left%60;
$('lc-left').textContent=m+':'+(s<10?'0':'')+s;
if(left<=0){clearInterval(lcTimer);lcTimer=null;
$('lc-code').textContent='------';
$('lc-err').textContent='That code has expired — tap “Link another device” for a fresh one.';
$('lc-err').hidden=false;}}
tick();lcTimer=setInterval(tick,1000);}
$('id-adddevice').onclick=function(){var btn=this;
btn.disabled=true;btn.textContent='Getting a code…';$('lc-err').hidden=true;
fetch('/api/identity/link-code',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,token:flToken()})})
.then(function(r){return r.json()}).then(function(d){
btn.disabled=false;btn.textContent='Link another device';
if(d&&d.ok&&d.code){$('lc-box').hidden=false;
$('lc-code').textContent=d.display||d.code;
lcCountdown(d.expires_at);return;}
$('lc-box').hidden=false;$('lc-code').textContent='------';
$('lc-err').textContent=(d&&d.reason==='rate_limited')
?'That is a lot of codes for one day — try again tomorrow.'
:'Could not get a code just now — try again in a minute.';
$('lc-err').hidden=false;})
.catch(function(){btn.disabled=false;btn.textContent='Link another device';
$('lc-box').hidden=false;$('lc-err').textContent='Could not reach Fledglings — check your connection.';
$('lc-err').hidden=false;});};
$('lc-show').onclick=function(){$('lc-enter').hidden=false;this.hidden=true;$('lc-input').focus();};
var LC_REFUSALS={
bad_code:"That code didn't work — check it, or get a fresh one on your other device (they last ten minutes and work once).",
too_many_devices:"That email is already linked to as many devices as we allow. Ask Fledglings to reset it.",
rate_limited:"Too many tries for one day — have another go tomorrow.",
offline:"Couldn't reach Fledglings just now — check your connection and try again."};
$('lc-go').onclick=function(){var btn=this;
$('lc-enter-err').hidden=true;btn.disabled=true;btn.textContent='Linking…';
fetch('/api/identity',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,code:$('lc-input').value})})
.then(function(r){return r.json()}).then(function(d){
if(d&&d.ok&&d.token){try{localStorage.setItem('fl_hub_token_v1',d.token)}catch(e){}
location.replace('/hub?t='+encodeURIComponent(d.token));return;}
btn.disabled=false;btn.textContent='Link this device';
$('lc-enter-err').textContent=LC_REFUSALS[d&&d.reason]||LC_REFUSALS.bad_code;
$('lc-enter-err').hidden=false;})
.catch(function(){btn.disabled=false;btn.textContent='Link this device';
$('lc-enter-err').textContent=LC_REFUSALS.offline;$('lc-enter-err').hidden=false;});};
$('lc-input').addEventListener('keydown',function(e){if(e.key==='Enter')$('lc-go').click();});
$('id-input').addEventListener('keydown',function(e){if(e.key==='Enter')$('id-save').click();});
/* Must strip ?t= as well — a plain reload would re-adopt the token
 * sitting in the URL and sign the same learner straight back in. */
$('id-change').onclick=flSignOutHere;
function band(s){return s>=70?'#1B9E5A':s>=50?'#F59E0B':'#B93A22'}
function ago(at){if(!at)return '';var d=Math.floor((Date.now()/1000-at)/86400);
return d<=0?'today':d===1?'yesterday':d+' days ago';}
var LABELS={cv:'CV review',linkedin:'LinkedIn review',interview:'Mock interview',cover:'Cover letter'};
var HREFS={cv:'/tools',linkedin:'/linkedin',interview:'/interview',cover:'/cover-letter'};
/* Tasks per tool (mirrors the server's seven-task model). */
var TOOL_TASKS={cv:['cv-reviewed','cv-strong'],linkedin:['li-reviewed','li-strong'],interview:['iv-done','iv-strong'],cover:['cl-created']};
var hubReq={learner_id:lid,token:flToken()};
if(viewOnly&&email)hubReq={learner_id:lid,view_email:email};
fetch('/api/hub',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify(hubReq)})
.then(function(r){return r.json()}).then(function(d){
if(!d||!d.ok||!d.summary)return;var s=d.summary;
if(d.name)$('hub-hi').textContent="Let's kickstart your career journey, "+d.name;
/* learning ring + continue-learning band (only when the account is known) */
if(d.learning&&d.learning.enrolled>0){var L=d.learning;
var lp=Math.round(L.completed*100/L.enrolled);
$('lr-box').hidden=false;$('lr-sub').textContent=L.completed+'/'+L.enrolled+' modules completed';
flCountUp($('lr-pct'),lp);
var lc=lp>=70?'#1A7649':'#13507F';$('lr-pct').style.color=lc;
$('lr-ring').style.background='conic-gradient('+lc+' 0deg '+Math.round(lp*3.6)+'deg,#E7EAF0 '+Math.round(lp*3.6)+'deg)';
if(email&&L.completed<L.enrolled){
fetch('/api/next-step',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,token:flToken()})})
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
(delta?"<b style='color:"+(ts.delta>=0?'#1B9E5A':'#B93A22')+"'>"+delta+"</b>":"")+
" · "+esc2(ts.attempts+' attempt'+(ts.attempts===1?'':'s'));}
var st=$('jstep-'+t);if(st){if(ts.latest!==null)st.classList.add('done');
if(s.next&&s.next.tool===t)st.classList.add('now');}});
/* career readiness + job-ready rings */
if(typeof s.careerReadiness==='number'){
flCountUp($('cr-pct'),s.careerReadiness);
var cc=s.careerReadiness>=70?'#1A7649':'#B93A22';
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
.jstep.now .jicon{border-color:#B93A22;color:#B93A22;box-shadow:0 0 0 4px rgba(61,92,245,.14);}
.jstep.now .jlabel b{color:#B93A22;font-weight:700;}
.jstep.now.done .jicon{background:var(--navy);border-color:var(--navy);color:#fff;}
.jline{flex:1;min-width:34px;border-top:2px dashed #C9D0DB;margin:24px 8px 0;}
.hubgrid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:18px;}
@media(max-width:1080px){.hubgrid{grid-template-columns:repeat(2,1fr);}}
@media(max-width:560px){.hubgrid{grid-template-columns:1fr;}}
.tcard{background:#fff;border-radius:16px;border:1px solid var(--line);box-shadow:0 1px 3px rgba(14,36,56,.04);
  display:flex;flex-direction:column;position:relative;overflow:hidden;transition:transform .15s,box-shadow .15s;}
.tcard:hover{transform:translateY(-3px);box-shadow:0 12px 26px -14px rgba(14,36,56,.28);}
.tcard.rec{outline:2px solid var(--pri);outline-offset:-2px;}
.tc-flag{position:absolute;top:0;left:0;background:linear-gradient(90deg,#B93A22,#A66633);color:#fff;
  border-radius:0 0 10px 0;padding:5px 12px;font-size:10.5px;font-weight:800;letter-spacing:.03em;z-index:2;}
.tc-head{background:linear-gradient(180deg,#FDF3EC 0%,#FFF9F4 100%);display:flex;align-items:center;justify-content:center;
  padding:30px 0 26px;}
.tc-icon{width:74px;height:74px;border-radius:50%;background:#fff;box-shadow:0 4px 14px rgba(14,36,56,.10);
  display:flex;align-items:center;justify-content:center;color:#B93A22;}
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
.recard:hover{border-color:#B93A22;}
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
.nextstep a.btn{text-decoration:none;background:#fff;color:#B93A22;}
.idcard{font-size:14px;line-height:1.6;color:var(--mut);padding:16px 22px;}
.idcard b{color:var(--navy);}
.id-sub{display:block;font-size:12.5px;color:var(--mut);margin-top:2px;}
.idlink{border:none;background:none;color:#B93A22;font-family:inherit;font-size:12.5px;font-weight:700;
  cursor:pointer;text-decoration:underline;padding:0;margin-top:6px;}
.idrow{display:flex;gap:10px;margin-top:10px;flex-wrap:wrap;}
.idrow input{flex:1;min-width:220px;}
.id-err{color:#B93A22;font-weight:600;font-size:12.5px;margin-top:8px;}
.idbtns{display:flex;gap:18px;flex-wrap:wrap;}
/* device link code — meant to be read off one screen and typed on another */
.linkbox{margin-top:14px;padding:14px 16px;border:1.5px dashed var(--pri);border-radius:14px;
  background:rgba(19,80,127,.04);}
.lc-code{font-size:34px;font-weight:800;letter-spacing:.16em;color:var(--navy);margin:8px 0 6px;
  font-variant-numeric:tabular-nums;user-select:all;}
.lc-alt{margin-top:14px;border-top:1px solid var(--off);padding-top:12px;}
#lc-input{text-transform:uppercase;letter-spacing:.14em;font-weight:700;}
`;
