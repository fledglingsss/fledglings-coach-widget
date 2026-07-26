/* /interview — the Interview Studio. Hiration-style video mock
 * interview that stays radically private: camera + microphone run
 * entirely on-device (MediaRecorder blobs never leave the browser),
 * speech is transcribed by the browser's own SpeechRecognition, and
 * only TEXT + timings + face-check tallies reach the worker.
 *
 * Flow: home (pitch / role sets / generate-from-advert) → camera setup
 * check → think-time countdown → record (live captions) → review your
 * recordings (re-record any) → AI report: answer evaluation + speech
 * evaluation (wpm, fillers) + camera presence, blended 80/10/10. */

import { appShell, esc } from "./pages";
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
    "<main class='wrap' style='max-width:940px'>" +
    "<h2 class='page'>Interview Studio</h2>" +
    "<p class='sub'>Practise real interviews out loud, on camera, with honest AI feedback — and total privacy: " +
    "your video and voice never leave your device. Fledge only ever sees your words.</p>" +

    /* ---------- stage: home ---------- */
    "<div id='s-home'>" +
    "<div class='card hero'>" +
    "<span class='hero-tag'>✦ Try this first</span>" +
    "<h3 class='hero-h'>Your pitch doesn't need to be perfect. <em>It just needs to exist.</em></h3>" +
    "<p class='hero-p'>60 seconds. Say who you are and why you care. That's it — Fledge will sharpen it from there.</p>" +
    "<div class='btnrow'><button type='button' class='btn' id='pitchbtn'>Practise your pitch →</button>" +
    "<span class='hero-note'>Takes 2 min. No prep needed.</span></div>" +
    "<div class='trustrow'>" +
    "<span class='trust'>🔒 Video &amp; voice stay on your device</span>" +
    "<span class='trust'>🎯 Scores your words, not your background</span>" +
    "<span class='trust'>🐣 Built for first jobs &amp; apprenticeships</span></div></div>" +
    "<div class='card'><h3>Pick your interview</h3>" +
    "<p class='sub' style='margin-bottom:14px'>Five questions a real interviewer for that kind of role would ask.</p>" +
    `<div class='roles'>${roleButtons}</div></div>` +
    "<div class='card'><h3>Or generate your own from a job advert</h3>" +
    "<p class='sub' style='margin-bottom:10px'>Paste the advert for a job you're actually going for — Fledge writes the " +
    "five questions that interviewer would ask, tailored to it.</p>" +
    "<textarea id='jd' rows='5' maxlength='3000' placeholder='Paste the job advert here…'></textarea>" +
    "<div class='btnrow'><button type='button' class='btn quiet' id='genbtn'>Generate my interview</button>" +
    "<span class='hero-note' id='genstate'>Up to 5 custom interviews a day</span></div></div>" +
    "</div>" +

    /* ---------- stage: camera setup ---------- */
    "<div id='s-setup' hidden>" +
    "<div class='note-a11y'>ℹ️ <b>Accessibility note:</b> the camera checks are optional feedback to help you set up — " +
    "nothing more. If a disability or medical condition affects your posture or movement, ignore them or practise " +
    "without the camera; your answers are what get scored.</div>" +
    "<div class='note-focus'>⚠ <b>Focus on your answers.</b> Camera position helps, but what you say matters far more " +
    "than how you sit.</div>" +
    "<div class='card'>" +
    "<div class='setupgrid'>" +
    "<div class='setupvid'><video id='setup-video' autoplay playsinline muted></video></div>" +
    "<div class='setupchecks'><h3>Camera &amp; mic check</h3><ul class='checks' id='setup-list'>" +
    "<li id='ck-cam'><i>…</i><div><b>Camera</b><span id='ck-cam-d'>Asking for permission…</span></div></li>" +
    "<li id='ck-mic'><i>…</i><div><b>Microphone</b><span id='ck-mic-d'>Asking for permission…</span></div></li>" +
    "<li id='ck-face'><i>…</i><div><b>Face in frame</b><span id='ck-face-d'>Sit facing the camera, roughly centred</span></div></li>" +
    "<li id='ck-light'><i>…</i><div><b>Lighting</b><span id='ck-light-d'>Checking…</span></div></li>" +
    "</ul>" +
    "<div class='btnrow' style='margin-top:16px'>" +
    "<button type='button' class='btn' id='setup-go' disabled>Start the interview</button>" +
    "<button type='button' class='btn ghost' id='setup-novid'>Practise without camera</button></div>" +
    "<div class='hero-note' style='margin-top:10px'>Recordings stay in this browser tab and are gone when you leave.</div>" +
    "</div></div></div></div>" +

    /* ---------- stage: interview ---------- */
    "<div id='s-int' hidden>" +
    "<div class='qhead'><span class='qnum' id='qnum'>Question 1 of 5</span>" +
    "<span class='qrole' id='qrole'></span></div>" +
    "<h3 class='qtext' id='qtext'></h3>" +
    /* video capture area */
    "<div class='card vidcard' id='vidcard'>" +
    "<div class='vidwrap'><video id='live-video' autoplay playsinline muted></video>" +
    "<div class='vover' id='think-over'><div class='think-l'>Think time</div>" +
    "<div class='think-n' id='think-n'>30</div>" +
    "<button type='button' class='btn rec' id='rec-now'>● Start recording</button></div>" +
    "<div class='recbar' id='recbar' hidden><span class='recdot'></span>Recording <b id='rec-t'>0:00</b> / 3:00" +
    "<button type='button' class='btn rec small' id='rec-stop'>■ Stop</button></div></div>" +
    "<div class='captions' id='captions' aria-live='polite'>Your words appear here as you speak…</div></div>" +
    /* voice-only capture area */
    "<div class='card' id='voicecard' hidden>" +
    "<div class='micwrap'>" +
    "<button type='button' class='mic' id='mic' aria-label='Tap to answer out loud'>" +
    "<svg viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<rect x='9' y='2.5' width='6' height='11' rx='3'/><path d='M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7'/></svg>" +
    "</button>" +
    "<div class='micstate' id='micstate'>Tap to answer out loud</div></div>" +
    "<div class='transcript' id='transcript' aria-live='polite'></div></div>" +
    "<details class='typefall' id='typefall'><summary>Prefer to type (or fix the transcript)?</summary>" +
    "<textarea id='typed' rows='4' maxlength='2000' placeholder='Type your answer instead…'></textarea></details>" +
    "<div class='btnrow'>" +
    "<button type='button' class='btn' id='next' disabled>Next question</button>" +
    "<button type='button' class='btn ghost' id='redo' hidden>Answer again</button></div>" +
    "<div class='hero-note' id='int-meta' style='margin-top:10px'></div>" +
    "</div>" +

    /* ---------- stage: review recordings ---------- */
    "<div id='s-review' hidden>" +
    "<div class='card'><h3>Your answers</h3>" +
    "<p class='sub' style='margin-bottom:6px'>Watch anything back and re-record if you want — then send the words to " +
    "Fledge for scoring. The videos themselves never leave your device.</p></div>" +
    "<div id='rev-list'></div>" +
    "<div class='btnrow'><button type='button' class='btn' id='rev-submit'>Get my AI review</button>" +
    "<button type='button' class='btn ghost' id='rev-restart'>Start over</button></div>" +
    "</div>" +

    /* ---------- stage: analysing ---------- */
    "<div class='card centre' id='s-wait' hidden>" +
    "<div class='pulse' aria-hidden='true'><svg viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'/><line x1='16' y1='8' x2='2' y2='22'/><line x1='17.5' y1='15' x2='9' y2='15'/></svg></div>" +
    "<h3 id='waitmsg'>Fledge is scoring your interview…</h3>" +
    "<p class='sub' style='margin:6px 0 0'>Like a fair interviewer, not a harsh one. Usually under half a minute.</p></div>" +

    /* ---------- stage: message ---------- */
    "<div class='card' id='s-msg' hidden><div class='result' id='msgtext'></div>" +
    "<div class='btnrow'><button type='button' class='btn ghost' id='msgback'>Back</button></div></div>" +

    /* ---------- stage: report ---------- */
    "<div id='s-rep' hidden>" +
    "<div class='card r-head'>" +
    "<div class='ring2' id='r-ring'><div class='in'><div class='pc' id='r-score'>0</div><div class='lb'>FINAL SCORE</div></div></div>" +
    "<div class='r-headtxt'><div class='r-kind'>MOCK INTERVIEW · AI REVIEW</div>" +
    "<div class='r-verdict' id='r-verdict'></div>" +
    "<div class='r-file' id='r-meta'></div></div></div>" +
    /* breakdown */
    "<div class='bgrid'>" +
    "<div class='bcard'><div class='b-l'>💬 Answer evaluation</div><div class='b-n' id='b-answer'>–</div><div class='b-s' id='b-answer-s'></div></div>" +
    "<div class='bcard'><div class='b-l'>🔊 Speech evaluation</div><div class='b-n' id='b-speech'>–</div><div class='b-s' id='b-speech-s'></div></div>" +
    "<div class='bcard'><div class='b-l'>🎥 Camera presence</div><div class='b-n' id='b-presence'>–</div><div class='b-s' id='b-presence-s'></div></div>" +
    "</div>" +
    /* speech detail */
    "<div class='card' id='sp-card' hidden><h3>Speech evaluation <span class='badge' id='sp-badge'></span></h3>" +
    "<div class='spgrid'>" +
    "<div class='spbox'><div class='sp-h'>SPEECH RATE</div>" +
    "<div class='bands'><span class='bandc' id='band-slow'>SLOW<i>0–109</i></span><span class='bandc' id='band-good'>GOOD<i>110–159</i></span><span class='bandc' id='band-fast'>FAST<i>160+</i></span></div>" +
    "<div class='sp-big' id='sp-wpm'></div><div class='sp-d' id='sp-wpm-d'></div></div>" +
    "<div class='spbox'><div class='sp-h'>FILLER WORDS</div><div class='sp-big' id='sp-fill'></div><div class='sp-d' id='sp-fill-d'></div></div>" +
    "<div class='spbox'><div class='sp-h'>SPEAKING TIME</div><div class='sp-big' id='sp-time'></div><div class='sp-d'>Across your recorded answers. Aim for 45–90 seconds per answer.</div></div>" +
    "</div></div>" +
    /* presence detail */
    "<div class='card' id='pr-card' hidden><h3>Camera presence <span class='badge' id='pr-badge'></span></h3>" +
    "<div class='note-a11y' style='margin:10px 0'>ℹ️ Feedback only, measured on your device — never used to judge you, " +
    "and safely ignored if a disability or condition affects posture or movement.</div>" +
    "<div class='spgrid'>" +
    "<div class='spbox'><div class='sp-h'>FACE IN FRAME</div><div class='sp-big' id='pr-face'></div><div class='sp-d'>How often your face was visible while answering.</div></div>" +
    "<div class='spbox'><div class='sp-h'>CENTRED</div><div class='sp-big' id='pr-centre'></div><div class='sp-d'>Roughly centred reads as engaged on a video call.</div></div>" +
    "<div class='spbox'><div class='sp-h'>DISTANCE</div><div class='sp-big' id='pr-dist'></div><div class='sp-d'>Not too close, not too far — head and shoulders in shot.</div></div>" +
    "</div></div>" +
    "<div id='r-answers'></div>" +
    "<div class='card nextstep'><div class='ns-label'>PRACTISE THIS FIRST</div><div id='r-next'></div></div>" +
    "<div class='btnrow no-print'>" +
    "<button type='button' class='btn' onclick='window.print()'>Print / save feedback</button>" +
    "<button type='button' class='btn ghost' id='again'>New interview</button></div>" +
    "</div>" +

    "<p class='sub' style='font-size:12.5px;margin-top:18px'>Up to 3 AI-reviewed interviews a day. Recording works best in Chrome or " +
    "Edge; if your browser can't listen or record, the typing option always works. Nothing you record is uploaded or stored — " +
    "only your words are reviewed, and if anything you say worries Fledge about your wellbeing it will point you to real support " +
    "instead of scoring.</p>" +
    "</main>" +
    "<script>var FL_QUESTIONS=" + questionsJson + ";</script>" +
    "<script>" + INTERVIEW_APP_JS + "</script>";

  return appShell({
    title: "Fledglings — Interview Studio",
    active: "interview",
    bodyHtml: body,
    extraCss: INTERVIEW_CSS,
  });
}

/* The client app. Kept as one template literal (no backticks or ${}
 * inside) so quotes stay readable. */
const INTERVIEW_APP_JS = String.raw`(function(){
function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}
var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');
var $=function(id){return document.getElementById(id)};
var STAGES=['s-home','s-setup','s-int','s-review','s-wait','s-msg','s-rep'];
function show(id){STAGES.forEach(function(k){$(k).hidden=k!==id});}

/* identity chip via the shared resolver (embedded or standalone) */
var params=new URLSearchParams(location.search);
var hubEmail=flResolveEmail();flIdentityChip();

/* ---------------- state ---------------- */
var role=null,roleLabel='',qs=[],sig='',idx=0,answers=[],mode='video';
var reviewReturn=false;
var stream=null,recorder=null,chunks=[],recStartAt=0,recTimer=null,thinkTimer=null;
var finalText='',listening=false,rec=null,voiceStartAt=0,voiceSecs=0;
var presence={frames:0,faceVisible:0,centred:0,goodDistance:0},faceDet=null,sampleTimer=null;
var THINK_SECS=30,MAX_ANSWER_SECS=180;

function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function band(s){return s>=70?'#1B7A4B':s>=50?'#B96A16':'#D9452B'}
function fmt(s){return Math.floor(s/60)+':'+('0'+Math.floor(s%60)).slice(-2)}

/* ---------------- speech recognition ---------------- */
var SR=window.SpeechRecognition||window.webkitSpeechRecognition;
function startSR(onFail){if(!SR){if(onFail)onFail();return;}
rec=new SR();rec.lang='en-GB';rec.continuous=true;rec.interimResults=true;
var base=finalText;
rec.onresult=function(e){var interim='';for(var i=e.resultIndex;i<e.results.length;i++){
if(e.results[i].isFinal){base+=e.results[i][0].transcript+' ';}else{interim+=e.results[i][0].transcript;}}
finalText=base;renderTranscript(base+interim);};
rec.onerror=function(e){if(e.error==='not-allowed'||e.error==='service-not-allowed'){listening=false;if(onFail)onFail();}};
rec.onend=function(){if(listening){try{rec.start()}catch(e){}}};
try{rec.start();listening=true;}catch(e){if(onFail)onFail();}}
function stopSR(){listening=false;if(rec){try{rec.stop()}catch(e){}}}
function renderTranscript(t){t=t.trim();
if(mode==='video'){var c=$('captions');c.textContent=t||'Your words appear here as you speak…';c.classList.toggle('has',t.length>0);}
else{var el=$('transcript');el.textContent=t;el.classList.toggle('has',t.length>0);}
checkReady();}
function currentAnswer(){return (finalText+' '+$('typed').value.trim()).trim();}
function checkReady(){$('next').disabled=currentAnswer().length<20;}

/* ---------------- camera / setup ---------------- */
function detectorInit(){try{if('FaceDetector' in window){faceDet=new window.FaceDetector({fastMode:true,maxDetectedFaces:1});}}catch(e){faceDet=null}}
function ckSet(id,ok,text){var li=$(id);li.querySelector('i').textContent=ok===true?'✓':ok===false?'✗':'…';
li.className=ok===true?'ok':ok===false?'bad':'';li.querySelector('span').textContent=text;}
var setupTimer=null;
function openSetup(){show('s-setup');detectorInit();
/* Re-entry safe: stop any previous stream so the camera indicator
 * never stays lit on an orphaned track. */
if(stream){try{stream.getTracks().forEach(function(t){t.stop()})}catch(e){}stream=null;}
navigator.mediaDevices.getUserMedia({video:{width:960,height:540},audio:true}).then(function(s){
stream=s;$('setup-video').srcObject=s;$('setup-go').disabled=false;
var vt=s.getVideoTracks()[0],at=s.getAudioTracks()[0];
ckSet('ck-cam',true,vt&&vt.label?vt.label:'Connected');
ckSet('ck-mic',true,at&&at.label?at.label:'Connected');
setTimeout(checkFrame,900);
if(!setupTimer)setupTimer=setInterval(function(){if(!$('s-setup').hidden)checkFrame()},2500);
}).catch(function(){
ckSet('ck-cam',false,'Blocked or unavailable — allow camera access, or practise without it.');
ckSet('ck-mic',false,'Blocked or unavailable.');
ckSet('ck-face',false,'Needs the camera.');ckSet('ck-light',false,'Needs the camera.');});}
function checkFrame(){var v=$('setup-video');if(!v.videoWidth)return;
var cv=document.createElement('canvas');cv.width=120;cv.height=68;
var ctx=cv.getContext('2d');ctx.drawImage(v,0,0,120,68);
try{var d=ctx.getImageData(0,0,120,68).data,sum=0;
for(var i=0;i<d.length;i+=16){sum+=(d[i]+d[i+1]+d[i+2])/3}
var avg=sum/(d.length/16);
ckSet('ck-light',avg>40,avg>40?'Looks fine':'Quite dark — face a window or lamp if you can.');}catch(e){}
if(faceDet){faceDet.detect(v).then(function(faces){
if(!faces.length){ckSet('ck-face',false,'Cannot see a face yet — sit facing the camera.');return;}
var b=faces[0].boundingBox,cx=(b.x+b.width/2)/v.videoWidth,hr=b.height/v.videoHeight;
var centred=cx>0.3&&cx<0.7,sized=hr>0.18&&hr<0.75;
ckSet('ck-face',centred&&sized,centred?(sized?'Nicely framed':'Adjust your distance — head and shoulders in shot'):'Move toward the centre of the frame');
}).catch(function(){ckSet('ck-face',null,'Line yourself up in the preview — this browser cannot auto-check.')});}
else{ckSet('ck-face',null,'Line yourself up in the preview — this browser cannot auto-check.');}}

/* presence sampling while recording */
function sampleStart(){if(!faceDet||!stream)return;
sampleTimer=setInterval(function(){var v=$('live-video');if(!v.videoWidth)return;
faceDet.detect(v).then(function(faces){presence.frames++;
if(faces.length){presence.faceVisible++;
var b=faces[0].boundingBox,cx=(b.x+b.width/2)/v.videoWidth,hr=b.height/v.videoHeight;
if(cx>0.3&&cx<0.7)presence.centred++;
if(hr>0.18&&hr<0.75)presence.goodDistance++;}}).catch(function(){});},1500);}
function sampleStop(){if(sampleTimer){clearInterval(sampleTimer);sampleTimer=null}}

/* ---------------- interview flow ---------------- */
function beginInterview(chosenMode){mode=chosenMode;idx=0;answers=[];reviewReturn=false;
presence={frames:0,faceVisible:0,centred:0,goodDistance:0};
$('qrole').textContent=roleLabel;showQuestion();show('s-int');}
function showQuestion(){finalText='';$('typed').value='';$('redo').hidden=true;renderTranscript('');
$('qnum').textContent='Question '+(idx+1)+' of '+qs.length;
$('qtext').textContent=qs[idx];
$('int-meta').textContent='Think time: '+THINK_SECS+'s · Max answer: 3 min · Re-record any answer before submitting';
$('next').textContent=idx===qs.length-1?'Finish — review my answers':'Next question';
$('vidcard').hidden=mode!=='video';$('voicecard').hidden=mode==='video';
checkReady();
if(mode==='video'){$('live-video').srcObject=stream;startThink();}
else{$('micstate').textContent='Tap to answer out loud';}}
function clearThink(){if(thinkTimer){clearInterval(thinkTimer);thinkTimer=null}}
function startThink(){clearThink();$('think-over').hidden=false;$('recbar').hidden=true;
var left=THINK_SECS;$('think-n').textContent=left;
/* The interval clears ITSELF via its own id — a stale tick can never
 * kill a newer countdown or restart recording. */
var id=setInterval(function(){left--;$('think-n').textContent=left;
if(left<=0){clearInterval(id);if(thinkTimer===id)thinkTimer=null;startRecording();}},1000);
thinkTimer=id;}
$('rec-now').addEventListener('click',function(){clearThink();startRecording();});
function pickMime(){var t=['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm','video/mp4'];
for(var i=0;i<t.length;i++){if(window.MediaRecorder&&MediaRecorder.isTypeSupported&&MediaRecorder.isTypeSupported(t[i]))return t[i];}return '';}
function startRecording(){$('think-over').hidden=true;$('recbar').hidden=false;
finalText='';renderTranscript('');chunks=[];
try{var mt=pickMime();recorder=new MediaRecorder(stream,mt?{mimeType:mt,videoBitsPerSecond:1000000}:undefined);
recorder.ondataavailable=function(e){if(e.data&&e.data.size)chunks.push(e.data)};
recorder.start(1000);}catch(e){recorder=null}
recStartAt=Date.now();sampleStart();
startSR(function(){$('captions').textContent='This browser cannot transcribe speech — type what you said below.';$('typefall').open=true;});
recTimer=setInterval(function(){var s=(Date.now()-recStartAt)/1000;$('rec-t').textContent=fmt(s);
if(s>=MAX_ANSWER_SECS)stopRecording();},250);}
function stopRecording(){if(recTimer){clearInterval(recTimer);recTimer=null}
sampleStop();stopSR();
var secs=Math.round((Date.now()-recStartAt)/1000);
/* Write duration synchronously; the blob URL lands by mutation when
 * the recorder's async onstop fires — nothing can clobber the answer. */
var prev=answers[idx]||{};
answers[idx]={question:qs[idx],answer:prev.answer||'',duration_secs:Math.max(1,secs),blobUrl:prev.blobUrl||''};
var slot=answers[idx];
if(recorder&&recorder.state!=='inactive'){recorder.onstop=function(){
try{var blob=new Blob(chunks,{type:recorder.mimeType||'video/webm'});
if(blob.size){if(slot.blobUrl){try{URL.revokeObjectURL(slot.blobUrl)}catch(e){}}
slot.blobUrl=URL.createObjectURL(blob);}}catch(e){}};recorder.stop();}
$('recbar').hidden=true;$('redo').hidden=false;checkReady();}
$('rec-stop').addEventListener('click',stopRecording);

/* voice-only capture */
$('mic').addEventListener('click',function(){
if(listening){stopSR();voiceSecs+=Math.round((Date.now()-voiceStartAt)/1000);
$('mic').classList.remove('on');$('micstate').textContent='Got it — tap to add more, or move on.';$('redo').hidden=false;}
else{voiceStartAt=Date.now();
startSR(function(){$('micstate').textContent='This browser cannot listen — use the typing option below.';$('typefall').open=true;});
if(listening){$('mic').classList.add('on');$('micstate').textContent='Listening… tap again when you have finished';}}});
$('redo').addEventListener('click',function(){
/* Kill any live listening session FIRST — its closure still holds the
 * old transcript and would resurrect it on the next result. */
stopSR();$('mic').classList.remove('on');
finalText='';$('typed').value='';renderTranscript('');$('redo').hidden=true;voiceSecs=0;
if(mode==='video'){if(answers[idx]&&answers[idx].blobUrl){try{URL.revokeObjectURL(answers[idx].blobUrl)}catch(e){}}
answers[idx]=null;startThink();}
else{$('micstate').textContent='Tap to answer out loud';}});
$('typed').addEventListener('input',checkReady);

$('next').addEventListener('click',function(){clearThink();
if(mode==='video'){if(recTimer)stopRecording();}else{if(listening){stopSR();voiceSecs+=Math.round((Date.now()-voiceStartAt)/1000);$('mic').classList.remove('on');}}
var a=answers[idx]||(answers[idx]={question:qs[idx],answer:'',duration_secs:null,blobUrl:''});
a.question=qs[idx];a.answer=currentAnswer().slice(0,2000);
if(mode!=='video')a.duration_secs=voiceSecs>=1?voiceSecs:null;
voiceSecs=0;
var finish=function(){renderReview();show('s-review');window.scrollTo({top:0});};
if(reviewReturn){reviewReturn=false;setTimeout(finish,250);return;}
if(idx<qs.length-1){idx++;showQuestion();return;}
/* Small delay lets the recorder's onstop deliver the final blob
 * before the review renders its playback. */
setTimeout(finish,250);});
function revokeAllBlobs(){answers.forEach(function(a){if(a&&a.blobUrl){try{URL.revokeObjectURL(a.blobUrl)}catch(e){}}});}
$('msgback').addEventListener('click',function(){cleanupMedia();show('s-home')});
$('again').addEventListener('click',function(){cleanupMedia();revokeAllBlobs();show('s-home');window.scrollTo({top:0})});
$('rev-restart').addEventListener('click',function(){revokeAllBlobs();
if(mode==='video'&&!stream){openSetup();return;}
beginInterview(mode);});

/* ---------------- role selection / question sources ---------------- */
document.querySelectorAll('.rolebtn').forEach(function(b){b.addEventListener('click',function(){
role=b.dataset.role;roleLabel=b.textContent;qs=FL_QUESTIONS[role];sig='';toSetup();});});
$('pitchbtn').addEventListener('click',function(){
role='general';roleLabel='Your 60-second pitch';qs=[FL_QUESTIONS['general'][0]];sig='';toSetup();});
$('genbtn').addEventListener('click',function(){
var jd=$('jd').value.trim();if(jd.length<60){$('genstate').textContent='Paste a bit more of the advert (a few sentences at least).';return;}
$('genbtn').disabled=true;$('genstate').textContent='Writing your five questions…';
fetch('/api/interview-questions',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,jd:jd})})
.then(function(r){return r.json()}).then(function(d){$('genbtn').disabled=false;
if(d&&d.questions){role='custom';roleLabel=d.role_label||'Your chosen role';qs=d.questions;sig=d.sig||'';
$('genstate').textContent='Ready — '+roleLabel;toSetup();return;}
$('genstate').textContent=(d&&d.reply)||'Could not generate — try again in a minute.';})
.catch(function(){$('genbtn').disabled=false;$('genstate').textContent='Could not reach Fledge — try again in a minute.';});});
function toSetup(){if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder){openSetup();}
else{beginInterview('voice');}}
$('setup-go').addEventListener('click',function(){beginInterview('video')});
$('setup-novid').addEventListener('click',function(){
if(stream){stream.getVideoTracks().forEach(function(t){t.stop()});}
beginInterview('voice');});

/* ---------------- review ---------------- */
function renderReview(){var out='';
answers.forEach(function(a,i){out+="<div class='card revcard'><div class='qc-head'><span class='qc-n'>Q"+(i+1)+"</span>"+
"<span class='qc-q'>"+esc2(a.question)+"</span>"+
"<button type='button' class='rev-redo' data-i='"+i+"'>Re-record</button></div>";
if(a.blobUrl){out+="<video class='rev-vid' src='"+a.blobUrl+"' controls playsinline></video>";}
out+="<div class='rev-tx'>"+(a.answer?esc2(a.answer):"<i>No words captured — re-record or type this answer.</i>")+"</div></div>";});
$('rev-list').innerHTML=out;
document.querySelectorAll('.rev-redo').forEach(function(b){b.addEventListener('click',function(){
idx=parseInt(b.dataset.i,10);reviewReturn=true;showQuestion();show('s-int');window.scrollTo({top:0});});});}
$('rev-submit').addEventListener('click',function(){
var short=answers.findIndex(function(a){return !a||a.answer.length<20});
if(short!==-1){idx=short;reviewReturn=true;showQuestion();show('s-int');
$('int-meta').textContent='This answer needs at least a sentence or two — speak it or type it, then finish.';return;}
submit();});

/* ---------------- submit + report ---------------- */
function cleanupMedia(){sampleStop();stopSR();clearThink();
if(recTimer){clearInterval(recTimer);recTimer=null}
if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null;}}
function submit(){show('s-wait');
var payload={learner_id:lid,session_id:sid,role:role,role_label:roleLabel,email:hubEmail,
answers:answers.map(function(a){return {question:a.question,answer:a.answer,duration_secs:a.duration_secs}})};
if(role==='custom'){payload.questions=qs;payload.sig=sig;}
if(presence.frames>=3)payload.presence=presence;
fetch('/api/interview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
.then(function(r){return r.json()}).then(function(d){
if(d&&d.report){renderReport(d.report);show('s-rep');window.scrollTo({top:0,behavior:'smooth'});return;}
$('msgtext').textContent=(d&&d.reply)||'Something went wrong — try again in a minute.';show('s-msg');})
.catch(function(){$('msgtext').textContent='Could not reach Fledge — try again in a minute.';show('s-msg');});}
function renderReport(r){var col=band(r.overall);
$('r-score').textContent=r.overall;$('r-score').style.color=col;
$('r-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(r.overall*3.6)+'deg,#ECE7E6 '+Math.round(r.overall*3.6)+'deg)';
$('r-verdict').textContent=r.verdict;
$('r-meta').textContent=roleLabel+' · '+answers.length+' question'+(answers.length===1?'':'s')+(mode==='video'?' · on camera':'');
var bd=r.breakdown||{};
$('b-answer').textContent=(bd.answer!=null?bd.answer:'–')+' / '+(bd.answerMax||80);
$('b-answer-s').textContent='What you said, scored like a fair interviewer';
if(r.speech){$('b-speech').textContent=r.speech.score+' / 10';$('b-speech-s').textContent='Pace and filler words, measured from your answers';}
else{$('b-speech').textContent='—';$('b-speech-s').textContent='Not measured (no timed spoken answers)';}
if(r.presence){$('b-presence').textContent=r.presence.score+' / 10';$('b-presence-s').textContent='Framing only — measured on your device';}
else{$('b-presence').textContent='—';$('b-presence-s').textContent='Not measured (no camera, or browser cannot check)';}
if(r.speech){$('sp-card').hidden=false;$('sp-badge').textContent=r.speech.score+' / 10';
['slow','good','fast'].forEach(function(bnd){$('band-'+bnd).className='bandc'+(r.speech.paceBand===bnd?' on '+bnd:'');});
$('sp-wpm').textContent=r.speech.wpm+' wpm';
$('sp-wpm-d').textContent=r.speech.paceBand==='good'?'A natural, confident pace.':r.speech.paceBand==='slow'?'On the slow side — practising out loud builds pace without rushing.':'Quick — a breath between points gives your answers room to land.';
$('sp-fill').textContent=r.speech.fillerCount+(r.speech.fillerCount===1?' word':' words');
$('sp-fill-d').textContent=r.speech.fillerCount===0?'Clean answers — no crutch words caught.':'Caught in your transcript (um, basically, sort of…). A short pause beats a filler.';
$('sp-time').textContent=fmt(r.speech.totalSecs);}else{$('sp-card').hidden=true;}
if(r.presence){$('pr-card').hidden=false;$('pr-badge').textContent=r.presence.score+' / 10';
$('pr-face').textContent=r.presence.faceVisiblePct+'%';
$('pr-centre').textContent=r.presence.centredPct+'%';
$('pr-dist').textContent=r.presence.goodDistancePct+'%';}else{$('pr-card').hidden=true;}
var out='';r.answers.forEach(function(a,i){var c=band(a.score);
out+="<div class='card qcard'><div class='qc-head'><span class='qc-n'>Q"+(i+1)+"</span>"+
"<span class='qc-q'>"+esc2(answers[i].question)+"</span>"+
"<span class='qc-s' style='color:"+c+"'>"+a.score+"</span></div>";
if(answers[i].blobUrl){out+="<video class='rev-vid inrep' src='"+answers[i].blobUrl+"' controls playsinline></video>";}
out+="<div class='qc-row good'><b>What worked</b>"+esc2(a.strength)+"</div>"+
"<div class='qc-row'><b>Make it stronger</b>"+esc2(a.improve)+"</div>"+
"<div class='qc-row sharper'><b>Your answer, sharpened</b>"+esc2(a.sharper)+"</div></div>";});
$('r-answers').innerHTML=out;$('r-next').textContent=r.next_step;
if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null;}}
})();`;

const INTERVIEW_CSS = `
.hero{border-top:6px solid var(--orange);}
.hero-tag{display:inline-block;background:#FCE9F3;color:#B03A80;border-radius:999px;padding:5px 14px;font-size:12px;font-weight:700;margin-bottom:10px;}
.hero-h{font-size:24px;line-height:1.25;margin-bottom:8px;}
.hero-h em{color:var(--blue);font-style:normal;}
.hero-p{font-size:14.5px;color:#4a5b66;line-height:1.6;margin-bottom:14px;max-width:44em;}
.hero-note{font-size:12.5px;color:#8a97a1;align-self:center;}
.trustrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px;}
.trust{background:var(--off);border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:600;color:var(--blue);}
.roles{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;}
.rolebtn{border:1.5px solid #DCD5D2;background:#fff;border-radius:14px;padding:16px 12px;
  font-family:inherit;font-size:14.5px;font-weight:600;color:var(--navy);cursor:pointer;transition:all .12s;}
.rolebtn:hover{border-color:var(--orange);transform:translateY(-2px);box-shadow:0 8px 18px -10px rgba(5,37,60,.35);}
.note-a11y{background:#EAF2FA;border:1.5px solid #C4D9EC;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:12px;}
.note-focus{background:#FCE9E5;border:1.5px solid #F2C4BA;border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.55;margin-bottom:12px;}
.setupgrid{display:grid;grid-template-columns:1.2fr 1fr;gap:22px;align-items:start;}
@media(max-width:760px){.setupgrid{grid-template-columns:1fr;}}
.setupvid video{width:100%;border-radius:14px;background:#0b1620;transform:scaleX(-1);aspect-ratio:16/9;object-fit:cover;}
.checks{list-style:none;}
.checks li{display:flex;gap:12px;padding:9px 0;font-size:13.5px;align-items:flex-start;}
.checks li i{width:24px;height:24px;border-radius:50%;font-style:normal;font-weight:800;font-size:13px;flex:none;
  display:flex;align-items:center;justify-content:center;background:var(--off);color:#8a97a1;margin-top:1px;}
.checks li.ok i{background:#E7F3EC;color:var(--ok);}
.checks li.bad i{background:#FCE9E5;color:var(--orange);}
.checks li b{display:block;font-size:13.5px;}
.checks li span{color:#4a5b66;font-size:12.5px;line-height:1.45;display:block;}
.qhead{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px;}
.qnum{font-size:12px;font-weight:800;letter-spacing:.12em;color:var(--orange);text-transform:uppercase;}
.qrole{font-size:12.5px;font-weight:600;color:var(--blue);background:var(--off);border-radius:999px;padding:4px 12px;}
.qtext{font-size:20px;line-height:1.4;margin-bottom:16px;}
.vidcard{padding:14px;}
.vidwrap{position:relative;border-radius:14px;overflow:hidden;background:#0b1620;}
.vidwrap video{width:100%;display:block;transform:scaleX(-1);aspect-ratio:16/9;object-fit:cover;}
.vover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
  background:rgba(5,22,38,.55);color:#fff;gap:6px;}
.think-l{font-size:13px;font-weight:600;letter-spacing:.08em;text-transform:uppercase;color:#CFE0EE;}
.think-n{font-size:64px;font-weight:800;line-height:1;}
.btn.rec{background:#D9452B;border-radius:999px;margin-top:10px;}
.btn.rec.small{min-height:34px;padding:6px 16px;font-size:13.5px;margin:0 0 0 14px;}
.recbar{position:absolute;left:12px;right:12px;bottom:12px;background:rgba(5,22,38,.78);color:#fff;border-radius:999px;
  padding:8px 16px;display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;}
.recdot{width:10px;height:10px;border-radius:50%;background:#FF5A48;animation:flDot 1.1s infinite;}
@keyframes flDot{0%,100%{opacity:1}50%{opacity:.25}}
.captions{min-height:44px;border:1.5px dashed #DCD5D2;border-radius:12px;padding:11px 14px;margin-top:12px;
  font-size:14.5px;line-height:1.55;color:#8a97a1;background:#FBFAF9;}
.captions.has{border-style:solid;background:#fff;color:var(--navy);}
.micwrap{text-align:center;margin:8px 0 14px;}
.mic{width:84px;height:84px;border-radius:50%;border:none;cursor:pointer;
  background:linear-gradient(135deg,var(--mango),var(--orange));display:inline-flex;align-items:center;justify-content:center;}
.mic svg{width:38px;height:38px;}
.mic.on{animation:flMic 1.4s ease-in-out infinite;}
@keyframes flMic{0%,100%{box-shadow:0 0 0 0 rgba(217,69,43,.45)}50%{box-shadow:0 0 0 22px rgba(217,69,43,0)}}
.micstate{font-size:13.5px;color:var(--blue);font-weight:600;margin-top:10px;}
.transcript{min-height:54px;border:1.5px dashed #DCD5D2;border-radius:14px;padding:14px 16px;
  font-size:15px;line-height:1.6;color:#4a5b66;background:#FBFAF9;}
.transcript.has{border-style:solid;background:#fff;color:var(--navy);}
.typefall{margin-top:12px;font-size:13.5px;color:var(--blue);}
.typefall summary{cursor:pointer;font-weight:600;}
.typefall textarea{margin-top:10px;}
.revcard{padding:0;overflow:hidden;}
.rev-vid{width:100%;max-height:320px;background:#0b1620;display:block;}
.rev-vid.inrep{max-height:260px;}
.rev-tx{padding:13px 20px;font-size:13.5px;color:#4a5b66;line-height:1.6;}
.rev-redo{margin-left:auto;border:1.5px solid var(--off);background:#fff;border-radius:999px;padding:6px 14px;
  font-family:inherit;font-size:12.5px;font-weight:700;color:var(--blue);cursor:pointer;flex:none;}
.rev-redo:hover{border-color:var(--orange);color:var(--orange);}
.centre{text-align:center;padding:40px 22px;}
.pulse{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--mango),var(--orange));animation:flPulse 1.6s ease-in-out infinite;}
.pulse svg{width:30px;height:30px;}
@keyframes flPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(217,69,43,.35)}
  50%{transform:scale(1.07);box-shadow:0 0 0 16px rgba(217,69,43,0)}}
.r-head{display:flex;align-items:center;gap:22px;flex-wrap:wrap;border-top:6px solid var(--orange);}
.ring2{width:118px;height:118px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;}
.ring2 .in{width:90px;height:90px;border-radius:50%;background:#fff;display:flex;flex-direction:column;
  align-items:center;justify-content:center;}
.ring2 .pc{font-size:30px;font-weight:800;line-height:1;}
.ring2 .lb{font-size:8.5px;color:var(--blue);font-weight:700;letter-spacing:.06em;margin-top:3px;}
.r-kind{font-size:11.5px;font-weight:700;color:var(--blue);letter-spacing:.08em;}
.r-verdict{font-size:24px;font-weight:700;line-height:1.2;margin:4px 0;}
.r-file{font-size:12.5px;color:#8a97a1;}
.bgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:18px;}
@media(max-width:700px){.bgrid{grid-template-columns:1fr;}}
.bcard{background:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 2px 10px rgba(5,37,60,.08);border-top:4px solid var(--mango);}
.b-l{font-size:12.5px;font-weight:700;color:var(--blue);letter-spacing:.03em;}
.b-n{font-size:26px;font-weight:800;margin:6px 0 2px;font-variant-numeric:tabular-nums;}
.b-s{font-size:12px;color:#8a97a1;line-height:1.45;}
.spgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;}
@media(max-width:700px){.spgrid{grid-template-columns:1fr;}}
.spbox{border:1.5px solid var(--off);border-radius:14px;padding:14px 16px;}
.sp-h{font-size:11px;font-weight:800;letter-spacing:.09em;color:var(--blue);margin-bottom:10px;}
.sp-big{font-size:24px;font-weight:800;margin:8px 0 6px;}
.sp-d{font-size:12.5px;color:#4a5b66;line-height:1.5;}
.bands{display:flex;gap:6px;}
.bandc{flex:1;text-align:center;border-radius:10px;padding:7px 4px;font-size:11px;font-weight:800;background:var(--off);color:#8a97a1;}
.bandc i{display:block;font-style:normal;font-weight:600;font-size:10px;margin-top:2px;}
.bandc.on{color:#fff;}
.bandc.on.slow,.bandc.on.fast{background:#D9452B;}
.bandc.on.good{background:#1B7A4B;}
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
@media print{.rev-vid,video{display:none!important;}}
`;
