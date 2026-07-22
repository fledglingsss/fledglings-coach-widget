/* /interview — voice mock interview. One question at a time; the
 * learner answers out loud (Web Speech API, transcribed on-device —
 * no audio ever leaves the browser) or types. The transcript set goes
 * to /api/interview for a STAR-style scored report. */

import { esc, pageShell } from "./pages";
import { INTERVIEW_ROLES, ROLE_LABELS, questionSet } from "./lib/interview";

export function renderInterviewPage(): string {
  const roleButtons = INTERVIEW_ROLES.map(
    (r) =>
      `<button type='button' class='rolebtn' data-role='${r}'>${esc(ROLE_LABELS[r])}</button>`,
  ).join("");
  const questionsJson = JSON.stringify(
    Object.fromEntries(INTERVIEW_ROLES.map((r) => [r, questionSet(r)])),
  );

  const body =
    "<main class='wrap'>" +
    "<h2 class='page'>Mock interview with Fledge</h2>" +
    "<p class='sub'>Five real first-job interview questions, answered out loud — because saying it is the skill, " +
    "not writing it. Your voice is turned into text on your own device and never recorded or uploaded; " +
    "Fledge scores the words like a fair interviewer would.</p>" +
    /* stage: role pick */
    "<div class='card' id='s-role'>" +
    "<h3>What kind of role are you practising for?</h3>" +
    `<div class='roles'>${roleButtons}</div></div>` +
    /* stage: interview */
    "<div class='card' id='s-int' hidden>" +
    "<div class='qhead'><span class='qnum' id='qnum'>Question 1 of 5</span>" +
    "<span class='qrole' id='qrole'></span></div>" +
    "<h3 class='qtext' id='qtext'></h3>" +
    "<div class='micwrap'>" +
    "<button type='button' class='mic' id='mic' aria-label='Hold to answer out loud'>" +
    "<svg viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<rect x='9' y='2.5' width='6' height='11' rx='3'/><path d='M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7'/></svg>" +
    "</button>" +
    "<div class='micstate' id='micstate'>Tap to answer out loud</div></div>" +
    "<div class='transcript' id='transcript' aria-live='polite'></div>" +
    "<details class='typefall' id='typefall'><summary>Prefer to type this answer?</summary>" +
    "<textarea id='typed' rows='4' maxlength='2000' placeholder='Type your answer instead…'></textarea></details>" +
    "<div class='btnrow'>" +
    "<button type='button' class='btn' id='next' disabled>Next question</button>" +
    "<button type='button' class='btn ghost' id='redo' hidden>Answer again</button></div>" +
    "</div>" +
    /* stage: analysing */
    "<div class='card centre' id='s-wait' hidden>" +
    "<div class='pulse' aria-hidden='true'><svg viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'/><line x1='16' y1='8' x2='2' y2='22'/><line x1='17.5' y1='15' x2='9' y2='15'/></svg></div>" +
    "<h3 id='waitmsg'>Fledge is scoring your interview…</h3>" +
    "<p class='sub' style='margin:6px 0 0'>Like a fair interviewer, not a harsh one. Usually under half a minute.</p></div>" +
    /* stage: message (limits/crisis/fallback) */
    "<div class='card' id='s-msg' hidden><div class='result' id='msgtext'></div>" +
    "<div class='btnrow'><button type='button' class='btn ghost' id='msgback'>Back</button></div></div>" +
    /* stage: report */
    "<div id='s-rep' hidden>" +
    "<div class='card r-head'>" +
    "<div class='ring2' id='r-ring'><div class='in'><div class='pc' id='r-score'>0</div><div class='lb'>/ 100</div></div></div>" +
    "<div class='r-headtxt'><div class='r-kind'>MOCK INTERVIEW</div>" +
    "<div class='r-verdict' id='r-verdict'></div>" +
    "<div class='r-file' id='r-meta'></div></div></div>" +
    "<div id='r-answers'></div>" +
    "<div class='card nextstep'><div class='ns-label'>PRACTISE THIS FIRST</div><div id='r-next'></div></div>" +
    "<div class='btnrow no-print'>" +
    "<button type='button' class='btn' onclick='window.print()'>Print / save feedback</button>" +
    "<button type='button' class='btn ghost' id='again'>New interview</button></div>" +
    "</div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:18px'>Up to 3 mock interviews a day. Speaking works best in Chrome, " +
    "Edge or Safari — if your browser can't listen, the typing option always works. If anything you say worries Fledge " +
    "about your wellbeing, it will point you to real support instead of scoring.</p>" +
    "</main>" +
    "<script>var FL_QUESTIONS=" + questionsJson + ";</script>" +
    "<script>(function(){" +
    "function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}" +
    "var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');" +
    "var $=function(id){return document.getElementById(id)};" +
    "var role=null,qs=[],idx=0,answers=[],finalText='';" +
    /* hub identity + back link (?e=<b64url email>, ?hub=1) */
    "var params=new URLSearchParams(location.search);var hubEmail='';" +
    "try{var ep=params.get('e');if(ep){hubEmail=decodeURIComponent(atob(ep.replace(/-/g,'+').replace(/_/g,'/')).split('').map(function(c){return '%'+c.charCodeAt(0).toString(16).padStart(2,'0')}).join(''));}}catch(err){}" +
    "if(hubEmail.indexOf('@')===-1)hubEmail='';" +
    "if(params.get('hub')==='1'){var bk=document.createElement('a');" +
    "bk.href='/hub'+(params.get('e')?'?e='+params.get('e'):'');bk.textContent='← Back to your Employability Hub';" +
    "bk.style.cssText='display:inline-block;margin-bottom:14px;color:#13507F;font-weight:600;font-size:13.5px;text-decoration:none;';" +
    "var hh=document.querySelector('h2.page');hh.parentNode.insertBefore(bk,hh);}" +
    "function show(id){['s-role','s-int','s-wait','s-msg','s-rep'].forEach(function(k){$(k).hidden=k!==id});}" +
    /* ---- speech ---- */
    "var SR=window.SpeechRecognition||window.webkitSpeechRecognition;var rec=null,listening=false;" +
    "function stopRec(){if(rec){try{rec.stop()}catch(e){}}listening=false;$('mic').classList.remove('on');}" +
    "function startRec(){if(!SR){$('micstate').textContent='This browser cannot listen — use the typing option below.';$('typefall').open=true;return;}" +
    "rec=new SR();rec.lang='en-GB';rec.continuous=true;rec.interimResults=true;" +
    "var base=finalText;" +
    "rec.onresult=function(e){var interim='';for(var i=e.resultIndex;i<e.results.length;i++){" +
    "if(e.results[i].isFinal){base+=e.results[i][0].transcript+' ';}else{interim+=e.results[i][0].transcript;}}" +
    "finalText=base;renderTranscript(base+interim);};" +
    "rec.onerror=function(e){listening=false;$('mic').classList.remove('on');" +
    "if(e.error==='not-allowed'||e.error==='service-not-allowed'){$('micstate').textContent='Microphone blocked — allow it in your browser, or type your answer below.';$('typefall').open=true;}" +
    "else{$('micstate').textContent='Listening hiccup — tap the mic to carry on, or type below.';}};" +
    "rec.onend=function(){if(listening){try{rec.start()}catch(e){}}};" +
    "try{rec.start();listening=true;$('mic').classList.add('on');$('micstate').textContent='Listening… tap again when you\\u2019ve finished';}catch(e){" +
    "$('micstate').textContent='Could not start listening — type your answer below.';$('typefall').open=true;}}" +
    "function renderTranscript(t){var el=$('transcript');el.textContent=t.trim();" +
    "el.classList.toggle('has',t.trim().length>0);checkReady();}" +
    "function currentAnswer(){var typed=$('typed').value.trim();return (finalText+' '+typed).trim();}" +
    "function checkReady(){$('next').disabled=currentAnswer().length<20;}" +
    "$('mic').addEventListener('click',function(){if(listening){stopRec();$('micstate').textContent='Got it — tap to add more, or go to the next question.';$('redo').hidden=false;}else{startRec();}});" +
    "$('typed').addEventListener('input',checkReady);" +
    "$('redo').addEventListener('click',function(){finalText='';$('typed').value='';renderTranscript('');$('redo').hidden=true;" +
    "$('micstate').textContent='Tap to answer out loud';});" +
    /* ---- flow ---- */
    "document.querySelectorAll('.rolebtn').forEach(function(b){b.addEventListener('click',function(){" +
    "role=b.dataset.role;qs=FL_QUESTIONS[role];idx=0;answers=[];$('qrole').textContent=b.textContent;" +
    "showQuestion();show('s-int');});});" +
    "function showQuestion(){finalText='';$('typed').value='';renderTranscript('');$('redo').hidden=true;" +
    "$('qnum').textContent='Question '+(idx+1)+' of '+qs.length;" +
    "$('qtext').textContent=qs[idx];$('micstate').textContent='Tap to answer out loud';" +
    "$('next').textContent=idx===qs.length-1?'Finish & get my score':'Next question';checkReady();}" +
    "$('next').addEventListener('click',function(){stopRec();" +
    "answers.push({question:qs[idx],answer:currentAnswer().slice(0,2000)});" +
    "if(idx<qs.length-1){idx++;showQuestion();return;}" +
    "submit();});" +
    "$('msgback').addEventListener('click',function(){show('s-int')});" +
    "$('again').addEventListener('click',function(){show('s-role');window.scrollTo({top:0})});" +
    /* ---- submit + report ---- */
    "function band(s){return s>=70?'#1B7A4B':s>=50?'#B96A16':'#D9452B'}" +
    "function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" +
    "function submit(){show('s-wait');" +
    "fetch('/api/interview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({" +
    "learner_id:lid,session_id:sid,role:role,answers:answers,email:hubEmail})})" +
    ".then(function(r){return r.json()}).then(function(d){" +
    "if(d&&d.report){renderReport(d.report);show('s-rep');window.scrollTo({top:0,behavior:'smooth'});return;}" +
    "$('msgtext').textContent=(d&&d.reply)||'Something went wrong — try again in a minute.';show('s-msg');" +
    "}).catch(function(){$('msgtext').textContent='Could not reach Fledge — try again in a minute.';show('s-msg');});}" +
    "function renderReport(r){var col=band(r.overall);" +
    "$('r-score').textContent=r.overall;$('r-score').style.color=col;" +
    "$('r-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(r.overall*3.6)+'deg,#ECE7E6 '+Math.round(r.overall*3.6)+'deg)';" +
    "$('r-verdict').textContent=r.verdict;" +
    "$('r-meta').textContent=$('qrole').textContent+' · '+answers.length+' questions answered out loud';" +
    "var out='';r.answers.forEach(function(a,i){var c=band(a.score);" +
    "out+=\"<div class='card qcard'><div class='qc-head'><span class='qc-n'>Q\"+(i+1)+'</span>'+" +
    "\"<span class='qc-q'>\"+esc2(answers[i].question)+'</span>'+" +
    "\"<span class='qc-s' style='color:\"+c+\"'>\"+a.score+'</span></div>'+" +
    "\"<div class='qc-row good'><b>What worked</b>\"+esc2(a.strength)+'</div>'+" +
    "\"<div class='qc-row'><b>Make it stronger</b>\"+esc2(a.improve)+'</div>'+" +
    "\"<div class='qc-row sharper'><b>Your answer, sharpened</b>\"+esc2(a.sharper)+'</div></div>'});" +
    "$('r-answers').innerHTML=out;$('r-next').textContent=r.next_step;}" +
    "})();</script>";

  const extraCss = `
.roles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;}
.rolebtn{border:1.5px solid var(--hair,#DCD5D2);background:#fff;border-radius:14px;padding:16px 12px;
  font-family:inherit;font-size:14.5px;font-weight:600;color:var(--navy);cursor:pointer;transition:all .12s;}
.rolebtn:hover{border-color:var(--orange);transform:translateY(-2px);box-shadow:0 8px 18px -10px rgba(5,37,60,.35);}
.qhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;}
.qnum{font-size:12px;font-weight:800;letter-spacing:.12em;color:var(--orange);text-transform:uppercase;}
.qrole{font-size:12.5px;font-weight:600;color:var(--blue);background:var(--off);border-radius:999px;padding:4px 12px;}
.qtext{font-size:20px;line-height:1.4;margin-bottom:22px;}
.micwrap{text-align:center;margin:8px 0 14px;}
.mic{width:84px;height:84px;border-radius:50%;border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--mango),var(--orange));display:inline-flex;align-items:center;justify-content:center;}
.mic svg{width:38px;height:38px;}
.mic.on{animation:flMic 1.4s ease-in-out infinite;}
@keyframes flMic{0%,100%{box-shadow:0 0 0 0 rgba(217,69,43,.45)}50%{box-shadow:0 0 0 22px rgba(217,69,43,0)}}
.micstate{font-size:13.5px;color:var(--blue);font-weight:600;margin-top:10px;}
.transcript{min-height:54px;border:1.5px dashed var(--hair,#DCD5D2);border-radius:14px;padding:14px 16px;
  font-size:15px;line-height:1.6;color:#4a5b66;background:#FBFAF9;}
.transcript.has{border-style:solid;background:#fff;color:var(--navy);}
.typefall{margin-top:12px;font-size:13.5px;color:var(--blue);}
.typefall summary{cursor:pointer;font-weight:600;}
.typefall textarea{margin-top:10px;}
.centre{text-align:center;padding:40px 22px;}
.pulse{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--mango),var(--orange));animation:flPulse 1.6s ease-in-out infinite;}
.pulse svg{width:30px;height:30px;}
@keyframes flPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(217,69,43,.35)}
  50%{transform:scale(1.07);box-shadow:0 0 0 16px rgba(217,69,43,0)}}
.r-head{display:flex;align-items:center;gap:22px;flex-wrap:wrap;border-top:6px solid var(--orange);}
.ring2{width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;}
.ring2 .in{width:84px;height:84px;border-radius:50%;background:#fff;display:flex;flex-direction:column;
  align-items:center;justify-content:center;}
.ring2 .pc{font-size:32px;font-weight:800;line-height:1;}
.ring2 .lb{font-size:11px;color:var(--blue);font-weight:600;}
.r-kind{font-size:11.5px;font-weight:700;color:var(--blue);letter-spacing:.08em;}
.r-verdict{font-size:24px;font-weight:700;line-height:1.2;margin:4px 0;}
.r-file{font-size:12.5px;color:#8a97a1;}
.qcard{padding:0;overflow:hidden;}
.qc-head{display:flex;align-items:center;gap:14px;padding:16px 20px;border-bottom:1px solid var(--off);}
.qc-n{font-size:12px;font-weight:800;color:var(--orange);flex:none;}
.qc-q{font-size:14.5px;font-weight:600;flex:1;line-height:1.4;}
.qc-s{font-size:22px;font-weight:800;flex:none;font-variant-numeric:tabular-nums;}
.qc-row{padding:13px 20px;font-size:14px;line-height:1.65;color:#4a5b66;border-bottom:1px solid var(--off);}
.qc-row:last-child{border-bottom:none;}
.qc-row b{display:block;font-size:11.5px;letter-spacing:.09em;text-transform:uppercase;margin-bottom:4px;color:var(--blue);}
.qc-row.good b{color:var(--ok);}
.qc-row.sharper{background:#F4F8F5;}
.qc-row.sharper b{color:var(--ok);}
.nextstep{background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;}
.nextstep .ns-label{font-size:11.5px;font-weight:700;letter-spacing:.1em;color:var(--mango);margin-bottom:6px;}
.nextstep div:last-child{font-size:15.5px;line-height:1.6;font-weight:500;}
`;
  return pageShell({ title: "Fledglings — mock interview", bodyHtml: body, extraCss });
}
