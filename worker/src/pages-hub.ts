/* Employability Hub — one destination for the three employability
 * tools (CV review, LinkedIn review, mock interview), Hiration-style:
 * a job-ready score, per-tool cards with latest score + trend, and a
 * guided what-next. Identity comes from the LearnWorlds Liquid email
 * (passed to the tools so their scores land in the same history);
 * without it the hub still works per-device. Scores only — no CV
 * text, transcript or answer is ever stored. */

import { esc, pageShell } from "./pages";

export function renderHubPage(): string {
  const body =
    "<main class='wrap' style='max-width:960px'>" +
    "<h2 class='page'>Your Employability Hub</h2>" +
    "<p class='sub'>Three tools, one goal: walking into a real application ready. Your scores are saved " +
    "(just the numbers — never your documents or answers) so you can watch them climb.</p>" +
    /* readiness banner */
    "<div class='ready card' id='ready-card'>" +
    "<div class='ring2' id='ready-ring'><div class='in'><div class='pc' id='ready-score'>–</div><div class='lb'>JOB-READY</div></div></div>" +
    "<div class='ready-txt'><div class='r-kind'>YOUR JOB-READY SCORE</div>" +
    "<div class='r-verdict' id='ready-verdict'>Let's find out where you stand</div>" +
    "<div class='r-file' id='ready-sub'>It builds from your CV, LinkedIn and interview scores — start any tool below.</div></div>" +
    "</div>" +
    /* guided next step */
    "<div class='card nextstep' id='next-card' hidden><div class='ns-label'>DO THIS NEXT</div>" +
    "<div id='next-reason'></div>" +
    "<div class='btnrow' style='margin-top:14px'><a class='btn' id='next-btn' href='/tools'>Open</a></div></div>" +
    /* tool cards */
    "<div class='hubgrid'>" +
    hubCard("cv", "📄", "CV review", "Upload your CV as a PDF for a recruiter-grade scored report — ATS checks, keyword match, honest feedback.", "/tools") +
    hubCard("linkedin", "💼", "LinkedIn review", "Save your profile to PDF and get it scored — headline, about section and starter habits.", "/tools?tab=li") +
    hubCard("interview", "🎤", "Interview practice", "Answer five real first-job questions out loud and get scored like a fair interviewer.", "/interview") +
    "</div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:20px'>Scores stay for six months so you can see your progress. " +
    "Daily limits: 5 reviews and 3 mock interviews. If anything you write or say worries Fledge about your wellbeing, " +
    "it points you to real support instead of scoring.</p>" +
    "</main>" +
    "<script>(function(){" +
    "function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}" +
    "var lid=stored(localStorage,'fl_coach_learner_v1');" +
    "var $=function(id){return document.getElementById(id)};" +
    /* Liquid email arrives via ?e= (b64url) from the embed snippet */
    "var email='';try{var p=new URLSearchParams(location.search).get('e');" +
    "if(p){email=decodeURIComponent(atob(p.replace(/-/g,'+').replace(/_/g,'/')).split('').map(function(c){return '%'+c.charCodeAt(0).toString(16).padStart(2,'0')}).join(''));}}catch(err){}" +
    "if(email.indexOf('@')===-1)email='';" +
    /* pass identity through to the tools so scores land in one history */
    "var eq=email?('e='+new URLSearchParams(location.search).get('e')):'';" +
    "document.querySelectorAll('a[data-tool],#next-btn').forEach(function(a){" +
    "if(eq)a.href+=(a.href.indexOf('?')>-1?'&':'?')+eq+'&hub=1';else a.href+=(a.href.indexOf('?')>-1?'&':'?')+'hub=1';});" +
    "function band(s){return s>=70?'#1B7A4B':s>=50?'#B96A16':'#D9452B'}" +
    "function spark(hist){if(hist.length<2)return '';var w=90,h=26,max=100;" +
    "var pts=hist.map(function(v,i){return (i*(w/(hist.length-1))).toFixed(1)+','+(h-2-(v/max)*(h-4)).toFixed(1)}).join(' ');" +
    "return \"<svg viewBox='0 0 \"+w+\" \"+h+\"' class='spark'><polyline points='\"+pts+\"' fill='none' stroke='#13507F' stroke-width='2' stroke-linejoin='round' stroke-linecap='round'/></svg>\";}" +
    "function ago(at){if(!at)return '';var d=Math.floor((Date.now()/1000-at)/86400);" +
    "return d===0?'today':d===1?'yesterday':d+' days ago';}" +
    "fetch('/api/hub',{method:'POST',headers:{'Content-Type':'application/json'}," +
    "body:JSON.stringify({learner_id:lid,email:email})})" +
    ".then(function(r){return r.json()}).then(function(d){" +
    "if(!d||!d.ok||!d.summary)return;var s=d.summary;" +
    "['cv','linkedin','interview'].forEach(function(t){var ts=s[t];" +
    "var scoreEl=$('hc-score-'+t),metaEl=$('hc-meta-'+t);" +
    "if(ts.latest===null){scoreEl.textContent='—';metaEl.textContent='not tried yet';return;}" +
    "scoreEl.textContent=ts.latest;scoreEl.style.color=band(ts.latest);" +
    "var delta=ts.delta===null?'':(ts.delta>=0?' ▲'+ts.delta:' ▼'+Math.abs(ts.delta));" +
    "metaEl.innerHTML=esc2(ts.attempts+' attempt'+(ts.attempts===1?'':'s')+' · last '+ago(ts.lastAt))+" +
    "(delta?\"<b style='color:\"+(ts.delta>=0?'#1B7A4B':'#D9452B')+\"'>\"+delta+'</b>':'');" +
    "$('hc-spark-'+t).innerHTML=spark(ts.history);});" +
    "if(s.readiness!==null){var col=band(s.readiness);" +
    "$('ready-score').textContent=s.readiness;$('ready-score').style.color=col;" +
    "$('ready-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(s.readiness*3.6)+'deg,#ECE7E6 '+Math.round(s.readiness*3.6)+'deg)';" +
    "$('ready-verdict').textContent=s.readiness>=70?'Looking genuinely job-ready':s.readiness>=50?'Solid base — keep sharpening':'Early days — every attempt counts';" +
    "$('ready-sub').textContent='Blend of your latest CV, LinkedIn and interview scores.';}" +
    "var nc=$('next-card');nc.hidden=false;$('next-reason').textContent=s.next.reason;" +
    "var target=s.next.tool==='interview'?'/interview':s.next.tool==='linkedin'?'/tools?tab=li':'/tools';" +
    "$('next-btn').href=target+(eq?'?'+eq+'&hub=1':'?hub=1');" +
    "$('next-btn').textContent=s.next.tool==='interview'?'Practise now':'Review now';" +
    "}).catch(function(){});" +
    "function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" +
    "})();</script>";

  const extraCss = `
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
.hubgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;}
@media(max-width:760px){.hubgrid{grid-template-columns:1fr;}}
.hubcard{background:#fff;border-radius:18px;padding:22px;box-shadow:0 2px 10px rgba(5,37,60,.08);
  display:flex;flex-direction:column;transition:transform .15s,box-shadow .15s;}
.hubcard:hover{transform:translateY(-3px);box-shadow:0 12px 26px -12px rgba(5,37,60,.35);}
.hc-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.hc-emoji{font-size:26px;}
.hc-score{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;color:#B9AFAB;}
.hubcard h3{font-size:16.5px;font-weight:700;margin-bottom:6px;}
.hubcard p{font-size:13px;color:#4a5b66;line-height:1.55;flex:1;}
.hc-meta{font-size:12px;color:#8a97a1;margin:10px 0 4px;min-height:16px;}
.hc-meta b{margin-left:6px;}
.spark{width:90px;height:26px;display:block;margin-bottom:10px;}
.hubcard a.btn{text-align:center;text-decoration:none;display:block;}
.nextstep{background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;}
.nextstep .ns-label{font-size:11.5px;font-weight:700;letter-spacing:.1em;color:var(--mango);margin-bottom:6px;}
.nextstep div:nth-child(2){font-size:15.5px;line-height:1.6;font-weight:500;}
.nextstep a.btn{text-decoration:none;}
`;
  return pageShell({ title: "Fledglings — Employability Hub", bodyHtml: body, extraCss });
}

function hubCard(
  tool: string,
  emoji: string,
  title: string,
  blurb: string,
  href: string,
): string {
  return (
    `<div class='hubcard'><div class='hc-top'><span class='hc-emoji'>${emoji}</span>` +
    `<span class='hc-score' id='hc-score-${tool}'>—</span></div>` +
    `<h3>${esc(title)}</h3><p>${esc(blurb)}</p>` +
    `<div class='hc-meta' id='hc-meta-${tool}'>not tried yet</div>` +
    `<div id='hc-spark-${tool}'></div>` +
    `<a class='btn' data-tool='${tool}' href='${href}'>${tool === "interview" ? "Practise" : "Get scored"}</a></div>`
  );
}
