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
    "<div class='ivtabs' role='tablist'>" +
    "<button type='button' class='ivtab on' id='tab-practice' role='tab'>Practice</button>" +
    "<button type='button' class='ivtab' id='tab-recs' role='tab'>My recordings <span class='ivcount' id='rec-count' hidden></span></button>" +
    "<button type='button' class='ivtab' id='tab-learn' role='tab'>Learning</button></div>" +
    /* learning: prep tracks, module cards, question bank by role */
    "<div id='home-learn' hidden>" +
    "<h3 class='learn-sec'>Preparation tracks</h3>" +
    "<div class='trackrow' id='trackrow'></div>" +
    "<h3 class='learn-sec'>Modules</h3>" +
    "<div class='modgrid' id='learn-list'></div>" +
    "<div id='learn-reader' hidden></div>" +
    "<h3 class='learn-sec'>Practise by role</h3>" +
    "<p class='sub' style='margin-bottom:12px'>Pick a role to see its questions — practise any single one on camera " +
    "with the full AI review.</p>" +
    "<div class='rolegrid' id='qbank-roles'></div>" +
    "<div id='qbank' hidden></div></div>" +
    "<div id='home-recs' hidden>" +
    "<div class='card'><h3>Your practice library</h3>" +
    "<p class='sub' style='margin-bottom:12px'>Every practice saves here the moment you finish — video, answers and " +
    "report — stored only in this browser, never uploaded. No waiting for the AI: rewatch instantly, and the report " +
    "attaches itself when it's ready.</p>" +
    "<div id='recs-list'></div></div></div>" +
    "<div id='home-practice'>" +
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
    "<div class='card'><h3>🚀 Generate your own interview</h3>" +
    "<p class='sub' style='margin-bottom:14px'>Choose how to build your five personalised questions — Fledge writes " +
    "what that interviewer would actually ask.</p>" +
    "<div class='srccard' data-src='jd'>" +
    "<button type='button' class='srchead' aria-expanded='true'><span class='srcico' style='background:#EAF2FA'>📋</span>" +
    "<span class='srctxt'><b>From a job description</b><i>Paste an advert to get questions tailored to that exact role</i></span>" +
    "<span class='srcchev'>▾</span></button>" +
    "<div class='srcbody' id='src-jd'><textarea id='jd' rows='4' maxlength='3000' placeholder='Paste the job advert here…'></textarea></div></div>" +
    "<div class='srccard closed' data-src='cv'>" +
    "<button type='button' class='srchead' aria-expanded='false'><span class='srcico' style='background:#FDF3EC'>📄</span>" +
    "<span class='srctxt'><b>From your CV</b><i>Questions that dig into your genuine experience — great for “walk me through your CV”</i></span>" +
    "<span class='srcchev'>▾</span></button>" +
    "<div class='srcbody' id='src-cv' hidden><textarea id='gen-cv' rows='4' maxlength='9000' placeholder='Paste your CV text here…'></textarea></div></div>" +
    "<div class='srccard closed' data-src='admission'>" +
    "<button type='button' class='srchead' aria-expanded='false'><span class='srcico' style='background:#F0EFFB'>🎓</span>" +
    "<span class='srctxt'><b>Admission interview</b><i>For a course, college or university place — tailored to your programme</i></span>" +
    "<span class='srcchev'>▾</span></button>" +
    "<div class='srcbody' id='src-admission' hidden>" +
    "<input type='text' id='gen-degree' maxlength='120' placeholder='The course or degree, e.g. Business BTEC, Psychology BSc'>" +
    "<textarea id='gen-course' rows='2' maxlength='3000' style='margin-top:10px' placeholder='Course description (optional — sharpens the questions)'></textarea>" +
    "<textarea id='gen-adm-cv' rows='2' maxlength='9000' style='margin-top:10px' placeholder='Your CV or personal statement (optional)'></textarea></div></div>" +
    "<div class='btnrow' style='margin-top:14px'><button type='button' class='btn' id='genbtn'>Generate AI interview</button>" +
    "<span class='hero-note' id='genstate'>Up to 5 custom interviews a day</span></div></div>" +
    "</div>" +
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
    "<div class='ivtabs no-print'>" +
    "<button type='button' class='ivtab on' id='rtab-ai'>AI Review</button>" +
    "<button type='button' class='ivtab' id='rtab-self'>Self Review</button></div>" +
    /* self review — watch yourself back and judge like an interviewer */
    "<div id='rep-self' hidden><div class='card'><h3>Watch yourself back — honestly</h3>" +
    "<p class='sub' style='margin-bottom:14px'>Interviewers say self-awareness is what separates candidates. Replay your " +
    "answers below, then tick what you genuinely did. Saved with this recording, just for you.</p>" +
    "<ul class='selflist' id='selflist'></ul></div></div>" +
    "<div id='rep-ai'>" +
    "<div class='card r-head'>" +
    "<div class='ring2' id='r-ring'><div class='in'><div class='pc' id='r-score'>0</div><div class='lb'>FINAL SCORE</div></div></div>" +
    "<div class='r-headtxt'><div class='r-kind'>MOCK INTERVIEW · AI REVIEW</div>" +
    "<div class='r-verdict' id='r-verdict'></div>" +
    "<div class='r-file' id='r-meta'></div></div></div>" +
    /* report sections — focused screens, print reveals everything */
    "<div class='rtabs no-print' role='tablist'>" +
    "<button type='button' class='rtab on' data-rp='overview' role='tab'>Overview</button>" +
    "<button type='button' class='rtab' data-rp='delivery' role='tab'>Speech &amp; presence</button>" +
    "<button type='button' class='rtab' data-rp='answers' role='tab'>Answer by answer</button>" +
    "</div>" +

    /* ---- overview ---- */
    "<div class='rpanel' id='rp-overview'>" +
    /* breakdown — segmented pill bars like the reference design */
    "<div class='bgrid'>" +
    "<div class='bcard'><div class='b-l'>💬 Answer evaluation</div>" +
    "<div class='seg5' id='b-answer-bar' aria-hidden='true'></div>" +
    "<div class='b-n' id='b-answer'>–</div><div class='b-v' id='b-answer-v'></div><div class='b-s' id='b-answer-s'></div></div>" +
    "<div class='bcard'><div class='b-l'>🔊 Speech evaluation</div>" +
    "<div class='seg5' id='b-speech-bar' aria-hidden='true'></div>" +
    "<div class='b-n' id='b-speech'>–</div><div class='b-v' id='b-speech-v'></div><div class='b-s' id='b-speech-s'></div></div>" +
    "<div class='bcard'><div class='b-l'>🎥 Camera presence</div>" +
    "<div class='seg5' id='b-presence-bar' aria-hidden='true'></div>" +
    "<div class='b-n' id='b-presence'>–</div><div class='b-v' id='b-presence-v'></div><div class='b-s' id='b-presence-s'></div></div>" +
    "</div>" +
    /* answers at a glance — score bar chart */
    "<div class='card' id='qs-card' hidden><h3>Your answers at a glance</h3>" +
    "<div id='qs-chart'></div>" +
    "<p class='kw-note' style='margin:8px 0 0'>Tap a bar to jump to that answer's full breakdown.</p></div>" +
    "<div class='card nextstep'><div class='ns-label'>PRACTISE THIS FIRST</div><div id='r-next'></div></div>" +
    "<div class='card cheer' id='r-cheercard' hidden><span class='cheer-ico'>🐣</span><span class='cheer-tx' id='r-cheer'></span></div>" +
    "</div>" +

    /* ---- speech & presence ---- */
    "<div class='rpanel' id='rp-delivery' hidden>" +
    /* speech detail — gauge, fraction bars and a per-answer time chart */
    "<div class='card' id='sp-card' hidden><h3>Speech evaluation <span class='badge' id='sp-badge'></span></h3>" +
    "<div class='spgrid'>" +
    "<div class='spbox'><div class='sp-h'>SPEECH RATE <b class='sp-frac' id='sp-rate-frac'></b></div>" +
    "<div class='bands'><span class='bandc' id='band-slow'>SLOW<i>0–109</i></span><span class='bandc' id='band-good'>GOOD<i>110–159</i></span><span class='bandc' id='band-fast'>FAST<i>160+</i></span></div>" +
    "<div class='gauge'><div class='gauge-track'></div><div class='gauge-pin' id='sp-pin'><span id='sp-pin-l'></span></div></div>" +
    "<div class='sp-d' id='sp-wpm-d'></div></div>" +
    "<div class='spbox'><div class='sp-h'>FILLER WORDS <b class='sp-frac' id='sp-fill-frac'></b></div>" +
    "<div class='sp-big' id='sp-fill'></div>" +
    "<div class='fillbar'><i id='sp-fill-bar'></i></div>" +
    "<div class='sp-d' id='sp-fill-d'></div></div>" +
    "<div class='spbox'><div class='sp-h'>SPEAKING TIME</div><div class='sp-big' id='sp-time'></div>" +
    "<div class='sp-d'>Total across your answers. The shaded zone below is the 45–90s sweet spot per answer.</div></div>" +
    "</div>" +
    "<div class='sp-h' style='margin:16px 0 8px'>TIME PER ANSWER</div>" +
    "<div id='sp-times'></div></div>" +
    /* presence detail — five measured signals, Hiration-style */
    "<div class='card' id='pr-card' hidden><h3>Camera presence <span class='badge' id='pr-badge'></span></h3>" +
    "<div class='note-a11y' style='margin:10px 0'>ℹ️ <b>Accessibility note:</b> feedback only, measured on your device — " +
    "never used to judge you, and safely ignored if a disability or medical condition affects your posture, movement or " +
    "eye contact.</div>" +
    "<div class='prgrid' id='prgrid'></div></div>" +
    "</div>" +

    /* ---- answer by answer ---- */
    "<div class='rpanel' id='rp-answers' hidden>" +
    /* scoring-in-progress banner */
    "<div class='scoringbar' id='scoringbar' hidden><span class='scoringdot' aria-hidden='true'></span>" +
    "<div><b>Fledge is scoring your interview…</b> Your recordings are already saved in <b>My recordings</b> — " +
    "rewatch them below, or leave and come back; the report attaches when it's ready.</div></div>" +
    "<div id='r-answers'></div>" +
    "</div>" +
    "<div class='fbrow no-print' id='fbrow'><span>Was this review helpful?</span>" +
    "<button type='button' class='fbbtn' data-fb='1' aria-label='Yes, helpful'>👍</button>" +
    "<button type='button' class='fbbtn' data-fb='0' aria-label='Not helpful'>👎</button></div>" +
    "</div>" +
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
var role=null,roleLabel='',qs=[],sig='',sigIat=0,idx=0,answers=[],mode='video';
var reviewReturn=false;
var stream=null,recorder=null,chunks=[],recStartAt=0,recTimer=null,thinkTimer=null;
var finalText='',listening=false,rec=null,voiceStartAt=0,voiceSecs=0;
var presence={frames:0,faceVisible:0,centred:0,goodDistance:0,headStraight:0,lookingAhead:0};
var faceDet=null,mpDetector=null,mpLoading=false,sampleTimer=null;
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

/* ---------------- camera / setup ----------------
 * Face analysis runs entirely ON-DEVICE. Primary: MediaPipe BlazeFace
 * (works in every modern browser; ~230KB model) giving a bounding box
 * plus eye/nose keypoints — enough for framing, head tilt (roll) and
 * an eye-contact proxy (facing the camera). Fallback: the native
 * FaceDetector API (framing only). Nothing is ever uploaded. */
function detectorInit(){
try{if('FaceDetector' in window){faceDet=new window.FaceDetector({fastMode:true,maxDetectedFaces:1});}}catch(e){faceDet=null}
if(mpDetector||mpLoading)return;mpLoading=true;
import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/vision_bundle.mjs')
.then(function(mod){return mod.FilesetResolver.forVisionTasks('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm')
.then(function(files){return mod.FaceDetector.createFromOptions(files,{baseOptions:{modelAssetPath:'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite'},runningMode:'VIDEO'});});})
.then(function(det){mpDetector=det;})
.catch(function(){mpDetector=null;});}
/* One frame -> framing + keypoint facts, or null when no face/detector.
 * kp:true means head/eye signals are genuinely measured. */
function analyseFrame(v){
if(mpDetector&&v.videoWidth){try{
var out=mpDetector.detectForVideo(v,performance.now());
var d=out&&out.detections&&out.detections[0];
if(!d)return {face:false,kp:true};
var bb=d.boundingBox;var cx=(bb.originX+bb.width/2)/v.videoWidth;var hr=bb.height/v.videoHeight;
var k=d.keypoints||[];var res={face:true,kp:false,centred:cx>0.28&&cx<0.72,goodDistance:hr>0.16&&hr<0.8};
if(k.length>=3){var eR=k[0],eL=k[1],nose=k[2];
var roll=Math.atan2((eL.y-eR.y),(eL.x-eR.x))*180/Math.PI;
var mid=(eR.x+eL.x)/2;var span=Math.abs(eL.x-eR.x)||0.001;
res.kp=true;res.headStraight=Math.abs(roll)<=12;
res.lookingAhead=Math.abs(nose.x-mid)/span<=0.28;}
return res;}catch(e){return null}}
if(faceDet&&v.videoWidth){return faceDet.detect(v).then(function(faces){
if(!faces.length)return {face:false,kp:false};
var b=faces[0].boundingBox,cx=(b.x+b.width/2)/v.videoWidth,hr=b.height/v.videoHeight;
return {face:true,kp:false,centred:cx>0.28&&cx<0.72,goodDistance:hr>0.16&&hr<0.8};}).catch(function(){return null});}
return null;}
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
var r=analyseFrame(v);
if(r===null){ckSet('ck-face',null,'Line yourself up in the preview — face checks are still loading.');return;}
Promise.resolve(r).then(function(f){
if(!f){ckSet('ck-face',null,'Line yourself up in the preview — this browser cannot auto-check.');return;}
if(!f.face){ckSet('ck-face',false,'Cannot see a face yet — sit facing the camera.');return;}
var msg;
if(!f.centred)msg='Move toward the centre of the frame';
else if(!f.goodDistance)msg='Adjust your distance — head and shoulders in shot';
else if(f.kp&&f.headStraight===false)msg='Nearly — level your head a touch';
else if(f.kp&&f.lookingAhead===false)msg='Nicely framed — look towards the camera';
else msg=f.kp?'Nicely framed, head level, looking at the camera':'Nicely framed';
ckSet('ck-face',Boolean(f.centred&&f.goodDistance),msg);});}

/* presence sampling while recording — tallies framing plus, when the
 * keypoint detector is live, head straightness + eye contact */
var kpMeasured=false;
function sampleStart(){if(!stream)return;
sampleTimer=setInterval(function(){var v=$('live-video');if(!v.videoWidth)return;
var r=analyseFrame(v);if(r===null)return;
Promise.resolve(r).then(function(f){if(!f)return;
presence.frames++;
if(f.face){presence.faceVisible++;
if(f.centred)presence.centred++;
if(f.goodDistance)presence.goodDistance++;
if(f.kp){kpMeasured=true;
if(f.headStraight)presence.headStraight++;
if(f.lookingAhead)presence.lookingAhead++;}}
});},1200);}
function sampleStop(){if(sampleTimer){clearInterval(sampleTimer);sampleTimer=null}}

/* ---------------- interview flow ---------------- */
function beginInterview(chosenMode){mode=chosenMode;idx=0;answers=[];reviewReturn=false;
presence={frames:0,faceVisible:0,centred:0,goodDistance:0,headStraight:0,lookingAhead:0};
kpMeasured=false;
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
slot.blob=blob;slot.blobUrl=URL.createObjectURL(blob);}}catch(e){}};recorder.stop();}
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
$('again').addEventListener('click',function(){cleanupMedia();revokeAllBlobs();currentSession=null;
show('s-home');refreshRecCount();window.scrollTo({top:0})});
$('rev-restart').addEventListener('click',function(){revokeAllBlobs();
if(mode==='video'&&!stream){openSetup();return;}
beginInterview(mode);});

/* ---------------- role selection / question sources ---------------- */
document.querySelectorAll('.rolebtn').forEach(function(b){b.addEventListener('click',function(){
role=b.dataset.role;roleLabel=b.textContent;qs=FL_QUESTIONS[role];sig='';toSetup();});});
$('pitchbtn').addEventListener('click',function(){
role='general';roleLabel='Your 60-second pitch';qs=[FL_QUESTIONS['general'][0]];sig='';toSetup();});
/* three generation sources as expandable icon cards */
var genSrc='jd';
document.querySelectorAll('.srccard').forEach(function(card){
card.querySelector('.srchead').onclick=function(){
genSrc=card.dataset.src;
document.querySelectorAll('.srccard').forEach(function(x){
var on=x.dataset.src===genSrc;
x.classList.toggle('closed',!on);
x.querySelector('.srchead').setAttribute('aria-expanded',String(on));
x.querySelector('.srcbody').hidden=!on;});};});
$('genbtn').addEventListener('click',function(){
var payload={learner_id:lid,mode:genSrc};
if(genSrc==='jd'){payload.jd=$('jd').value.trim();
if(payload.jd.length<60){$('genstate').textContent='Paste a bit more of the advert (a few sentences at least).';return;}}
else if(genSrc==='cv'){payload.cv_text=$('gen-cv').value.trim();
if(payload.cv_text.length<120){$('genstate').textContent='Paste a bit more of your CV first.';return;}}
else{payload.degree=$('gen-degree').value.trim();payload.jd=$('gen-course').value.trim();payload.cv_text=$('gen-adm-cv').value.trim();
if(payload.degree.length<2){$('genstate').textContent='Name the course or degree first.';return;}}
$('genbtn').disabled=true;$('genstate').textContent='Writing your five questions…';
fetch('/api/interview-questions',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify(payload)})
.then(function(r){return r.json()}).then(function(d){$('genbtn').disabled=false;
if(d&&d.questions){role='custom';roleLabel=d.role_label||'Your chosen role';qs=d.questions;sig=d.sig||'';sigIat=d.iat||0;
$('genstate').textContent='Ready — '+roleLabel;toSetup();return;}
$('genstate').textContent=(d&&d.reply)||'Could not generate — try again in a minute.';})
.catch(function(){$('genbtn').disabled=false;$('genstate').textContent='Could not reach Fledge — try again in a minute.';});});
function toSetup(){if(navigator.mediaDevices&&navigator.mediaDevices.getUserMedia&&window.MediaRecorder){openSetup();}
else{beginInterview('voice');}}
$('setup-go').addEventListener('click',function(){beginInterview('video')});
$('setup-novid').addEventListener('click',function(){
/* Release the WHOLE stream — leaving the audio track open keeps the
 * browser's mic-in-use light on for the entire voice practice. */
if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null;}
beginInterview('voice');});

/* ---------------- review ---------------- */
function renderReview(){var out='';
answers.forEach(function(a,i){out+="<div class='card revcard'><div class='qc-head'><span class='qc-n'>Q"+(i+1)+"</span>"+
"<span class='qc-q'>"+esc2(a.question)+"</span>"+
"<button type='button' class='rev-redo' data-i='"+i+"'>Re-record</button></div>";
if(a.blobUrl){out+="<video class='rev-vid' src='"+a.blobUrl+"' controls playsinline></video>";}
out+="<div class='rev-tx'>"+(a.answer?esc2(a.answer):"<i>No words captured — re-record or type this answer.</i>")+"</div></div>";});
$('rev-list').innerHTML=out;
/* Scope to the review list — .rev-redo is reused as a button style by
 * the library and question bank, and a document-wide bind would hijack
 * those buttons with stale re-record handlers. */
$('rev-list').querySelectorAll('.rev-redo').forEach(function(b){b.addEventListener('click',function(){
idx=parseInt(b.dataset.i,10);reviewReturn=true;showQuestion();show('s-int');window.scrollTo({top:0});});});}
$('rev-submit').addEventListener('click',function(){
var short=answers.findIndex(function(a){return !a||a.answer.length<20});
if(short!==-1){idx=short;reviewReturn=true;showQuestion();show('s-int');
$('int-meta').textContent='This answer needs at least a sentence or two — speak it or type it, then finish.';return;}
submit();});

/* ---------------- practice library (IndexedDB, on-device only) ---------------- */
function idb(){return new Promise(function(res,rej){var q=indexedDB.open('fl_interview_v1',1);
q.onupgradeneeded=function(){q.result.createObjectStore('sessions',{keyPath:'id'})};
q.onsuccess=function(){res(q.result)};q.onerror=function(){rej(q.error)};});}
function idbPut(s){return idb().then(function(db){return new Promise(function(res,rej){
var t=db.transaction('sessions','readwrite');t.objectStore('sessions').put(s);
t.oncomplete=res;t.onerror=function(){rej(t.error)};});}).catch(function(){});}
function idbAll(){return idb().then(function(db){return new Promise(function(res){
var g=db.transaction('sessions','readonly').objectStore('sessions').getAll();
g.onsuccess=function(){res(g.result||[])};g.onerror=function(){res([])};});}).catch(function(){return []});}
function idbDel(id){return idb().then(function(db){return new Promise(function(res){
var t=db.transaction('sessions','readwrite');t.objectStore('sessions')['delete'](id);
t.oncomplete=res;t.onerror=res;});}).catch(function(){});}
var currentSession=null;
function saveSession(status,report){
var s=currentSession||{id:Math.random().toString(16).slice(2)+Date.now().toString(16)};
s.at=Date.now();s.roleLabel=roleLabel;s.mode=mode;s.status=status;
s.answers=answers.map(function(a){return {question:a.question,answer:a.answer,duration_secs:a.duration_secs}});
s.videos=answers.map(function(a){return a.blob||null});
if(report)s.report=report;
currentSession=s;idbPut(s).then(refreshRecCount);return s;}
function refreshRecCount(){idbAll().then(function(all){var c=$('rec-count');
if(!c)return;c.hidden=all.length===0;c.textContent=String(all.length);});}
function fmtDate(t){try{return new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+' '+new Date(t).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}catch(e){return ''}}
function renderRecordings(){idbAll().then(function(all){
all.sort(function(a,b){return b.at-a.at});
var out='';
if(!all.length)out="<div class='hero-note'>Nothing here yet — finish a practice and it appears instantly.</div>";
all.forEach(function(s){var score=s.report?s.report.overall:null;
out+="<div class='reclib'><div class='reclib-main'><b>"+esc2(s.roleLabel||'Practice interview')+"</b>"+
"<span>"+esc2(fmtDate(s.at))+" · "+s.answers.length+" question"+(s.answers.length===1?'':'s')+
(s.status==='scoring'?" · <i class='rl-tag'>report pending</i>":s.status==='unscored'?" · <i class='rl-tag'>recording only</i>":"")+"</span></div>"+
(score!==null?"<span class='reclib-score' style='color:"+band(score)+"'>"+score+"</span>":"<span class='reclib-score dim'>—</span>")+
"<button type='button' class='rev-redo' data-open-rec='"+s.id+"'>Open</button>"+
"<button type='button' class='rev-redo' data-del-rec='"+s.id+"'>Delete</button></div>";});
$('recs-list').innerHTML=out;
document.querySelectorAll('[data-open-rec]').forEach(function(b){b.onclick=function(){openRecording(b.dataset.openRec)}});
document.querySelectorAll('[data-del-rec]').forEach(function(b){b.onclick=function(){
if(!confirm('Delete this practice and its recordings? This cannot be undone.'))return;
idbDel(b.dataset.delRec).then(function(){renderRecordings();refreshRecCount();});}});});}
function openRecording(id){idbAll().then(function(all){
var s=all.find(function(x){return x.id===id});if(!s)return;
/* Release the previous session's object URLs before minting new ones
 * — repeatedly opening recordings must not pin blobs in memory. */
revokeAllBlobs();
currentSession=s;roleLabel=s.roleLabel||'Practice interview';mode=s.mode||'video';
answers=s.answers.map(function(a,i){var blob=s.videos&&s.videos[i];
return {question:a.question,answer:a.answer,duration_secs:a.duration_secs,
blob:blob||null,blobUrl:blob?URL.createObjectURL(blob):''};});
if(s.report){renderReport(s.report);show('s-rep');}
else{renderPendingReport(s.status==='scoring');show('s-rep');}
window.scrollTo({top:0});});}

/* ---------------- submit + report ---------------- */
function cleanupMedia(){sampleStop();stopSR();clearThink();
if(recTimer){clearInterval(recTimer);recTimer=null}
if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null;}}
function rpGo(id){document.querySelectorAll('.rpanel').forEach(function(p){p.hidden=p.id!=='rp-'+id});
document.querySelectorAll('.rtab').forEach(function(t){t.classList.toggle('on',t.dataset.rp===id);
t.setAttribute('aria-selected',t.dataset.rp===id?'true':'false');});
window.scrollTo({top:0,behavior:'smooth'});}
document.querySelectorAll('.rtab').forEach(function(t){t.onclick=function(){rpGo(t.dataset.rp)}});
function repShowScoring(on){['scoringbar'].forEach(function(k){$(k).hidden=!on});
/* while scoring, the recordings (answers section) are the show */
if(on)rpGo('answers');}
function renderPendingReport(scoring){
/* Recordings-first view: watchable instantly, report joins later.
 * Reset EVERY piece of report chrome a previously viewed scored
 * recording may have painted — ring, bars, verdict words, chart. */
$('r-score').textContent='–';$('r-score').style.color='';
$('r-ring').style.background='#ECE7E6';
$('r-verdict').textContent=scoring?'Being scored…':'Your recording';
$('r-meta').textContent=roleLabel+' · '+answers.length+' question'+(answers.length===1?'':'s');
$('b-answer').textContent='–';$('b-speech').textContent='–';$('b-presence').textContent='–';
$('b-answer-s').textContent=$('b-speech-s').textContent=$('b-presence-s').textContent=scoring?'On its way':'Not available for this one';
['b-answer-bar','b-speech-bar','b-presence-bar'].forEach(function(id){var el=$(id);if(el)el.innerHTML='';});
['b-answer-v','b-speech-v','b-presence-v'].forEach(function(id){var el=$(id);if(el)el.textContent='';});
var qsCard=$('qs-card');if(qsCard)qsCard.hidden=true;
$('sp-card').hidden=true;$('pr-card').hidden=true;$('r-cheercard').hidden=true;
repShowScoring(Boolean(scoring));
var out='';answers.forEach(function(a,i){
out+="<div class='card qcard'><div class='qc-head'><span class='qc-n'>Q"+(i+1)+"</span>"+
"<span class='qc-q'>"+esc2(a.question)+"</span></div>";
if(a.blobUrl)out+="<video class='rev-vid inrep' src='"+a.blobUrl+"' controls playsinline></video>";
out+="<div class='qc-row'><b>Your answer</b>"+esc2(a.answer||'(no words captured)')+"</div></div>";});
$('r-answers').innerHTML=out;$('r-next').textContent='';}
function submit(){
/* Save FIRST (no waiting on the AI), then score in the background
 * while the learner rewatches their answers. */
saveSession('scoring',null);
cleanupMedia();
renderPendingReport(true);show('s-rep');window.scrollTo({top:0,behavior:'smooth'});
var payload={learner_id:lid,session_id:sid,role:role,role_label:roleLabel,email:hubEmail,
answers:answers.map(function(a){return {question:a.question,answer:a.answer,duration_secs:a.duration_secs}})};
if(role==='custom'){payload.questions=qs;payload.sig=sig;payload.iat=sigIat;}
if(presence.frames>=3){var pr={frames:presence.frames,faceVisible:presence.faceVisible,
centred:presence.centred,goodDistance:presence.goodDistance};
if(kpMeasured){pr.headStraight=presence.headStraight;pr.lookingAhead=presence.lookingAhead;}
payload.presence=pr;}
fetch('/api/interview',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
.then(function(r){return r.json()}).then(function(d){
if(d&&d.report){saveSession('done',d.report);repShowScoring(false);renderReport(d.report);return;}
saveSession('unscored',null);repShowScoring(false);
$('r-verdict').textContent='Recording saved — scoring unavailable';
$('r-meta').textContent=(d&&d.reply)||'Fledge could not score this one — your recording is safe in My recordings.';})
.catch(function(){saveSession('unscored',null);repShowScoring(false);
$('r-verdict').textContent='Recording saved — scoring unavailable';
$('r-meta').textContent='Could not reach Fledge — your recording is safe in My recordings.';});}
function scoreLabel(s){return s>=85?'Excellent':s>=70?'Strong':s>=50?'Getting there':s>=35?'Early days':'Needs work'}
function tenLabel(s){return s>=8?'Excellent':s>=6?'Good':s>=4?'Getting there':'Needs work'}
/* Five-segment pill bar (the reference design's metric bars). */
function seg5(filled,col){var h='';for(var i=0;i<5;i++){
h+="<i"+(i<filled?" style='background:"+col+"'":"")+"></i>";}return h;}
/* SVG bar chart of per-answer scores; bars link to the detail cards. */
function qScoreChart(list){var n=list.length;if(!n)return '';
var W=Math.max(300,n*72),H=150,base=120,maxH=100;
var s="<svg viewBox='0 0 "+W+" "+H+"' class='qschart' role='img' aria-label='Score per answer'>";
s+="<line x1='0' y1='"+base+"' x2='"+W+"' y2='"+base+"' stroke='#E3DDDA' stroke-width='2'/>";
[25,50,75,100].forEach(function(g){var y=base-(g/100)*maxH;
s+="<line x1='0' y1='"+y+"' x2='"+W+"' y2='"+y+"' stroke='#F0EBE8' stroke-width='1'/>";});
list.forEach(function(a,i){var c=band(a.score);var bw=34;var x=i*(W/n)+(W/n-bw)/2;
var h=Math.max(3,(a.score/100)*maxH);var y=base-h;
s+="<a href='#qrep-"+i+"' data-qjump='"+i+"'><rect x='"+x+"' y='"+y+"' width='"+bw+"' height='"+h+"' rx='6' fill='"+c+"'/>"+
"<text x='"+(x+bw/2)+"' y='"+(y-7)+"' text-anchor='middle' font-size='13' font-weight='800' fill='"+c+"'>"+a.score+"</text>"+
"<text x='"+(x+bw/2)+"' y='"+(base+18)+"' text-anchor='middle' font-size='11' font-weight='600' fill='#6A7A88'>Q"+(i+1)+"</text></a>";});
return s+"</svg>";}
/* Horizontal duration bars with the 45-90s sweet spot shaded. */
function timeChart(ans){var MAXS=180;var out="<div class='tchart'>";
out+="<div class='tc-row tc-scale'><span class='tc-l'></span><div class='tc-track'>"+
"<div class='tc-sweet'></div><span class='tc-mark' style='left:25%'>45s</span><span class='tc-mark' style='left:50%'>90s</span><span class='tc-mark' style='left:100%'>3m</span></div><span class='tc-v'></span></div>";
ans.forEach(function(a,i){var d=a.duration_secs;
var pct=d?Math.min(100,(d/MAXS)*100):0;
var col=d===null?'#C9C1BD':(d>=45&&d<=90)?'#1B7A4B':(d>=25&&d<=130)?'#ED9249':'#D9452B';
out+="<div class='tc-row'><span class='tc-l'>Q"+(i+1)+"</span><div class='tc-track'><div class='tc-sweet'></div>"+
(d?"<i class='tc-bar' style='width:"+pct+"%;background:"+col+"'></i>":"")+
"</div><span class='tc-v'>"+(d?fmt(d):'typed')+"</span></div>";});
return out+"</div>";}
var PR_ICONS={face:'👤',centre:'🎯',dist:'↔️',head:'📐',eye:'👁️'};
function prStat(label,icon,metric,unavailableNote){
/* a metric without a usable pct is an unavailable metric — never
 * print 'undefined%' at a learner */
if(metric&&(typeof metric.pct!=='number'||!isFinite(metric.pct)))metric=null;
if(metric===null)return "<div class='prstat na'><div class='prring'><em>"+icon+"</em></div><b>"+esc2(label)+"</b><span>"+esc2(unavailableNote||'Not measured')+"</span></div>";
var cls=metric.band==='great'?'good':metric.band==='okay'?'mid':'bad';
var word=metric.band==='great'?'Excellent':metric.band==='okay'?'Getting there':'Needs work';
return "<div class='prstat'><div class='prring "+cls+"'><em>"+icon+"</em></div>"+
"<b>"+esc2(label)+"</b><span class='pr-word "+cls+"'>"+word+"</span>"+
"<div class='pr-pctbar'><i style='width:"+metric.pct+"%'></i></div><span class='pr-pct'>"+metric.pct+"% of your answer time</span></div>";}
function renderReport(r){repShowScoring(false);rpGo('overview');var col=band(r.overall);
flCountUp($('r-score'),r.overall);$('r-score').style.color=col;
$('r-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(r.overall*3.6)+'deg,#ECE7E6 '+Math.round(r.overall*3.6)+'deg)';
$('r-verdict').textContent=r.verdict;
$('r-meta').textContent=roleLabel+' · '+answers.length+' question'+(answers.length===1?'':'s')+(mode==='video'?' · on camera':'');
var bd=r.breakdown||{};
var apct=bd.answerMax?Math.round(bd.answer*100/bd.answerMax):0;
$('b-answer').textContent=(bd.answer!=null?bd.answer:'–')+' / '+(bd.answerMax||80);
$('b-answer-bar').innerHTML=seg5(Math.round(apct/20),band(apct));
$('b-answer-v').textContent=scoreLabel(apct);$('b-answer-v').style.color=band(apct);
$('b-answer-s').textContent='What you said, scored like a fair interviewer';
if(r.speech){$('b-speech').textContent=r.speech.score+' / 10';
$('b-speech-bar').innerHTML=seg5(Math.round(r.speech.score/2),band(r.speech.score*10));
$('b-speech-v').textContent=tenLabel(r.speech.score);$('b-speech-v').style.color=band(r.speech.score*10);
$('b-speech-s').textContent='Pace and filler words, measured from your answers';}
else{$('b-speech').textContent='—';$('b-speech-bar').innerHTML=seg5(0,'');$('b-speech-v').textContent='';
$('b-speech-s').textContent='Not measured (no timed spoken answers)';}
if(r.presence){$('b-presence').textContent=r.presence.score+' / 10';
$('b-presence-bar').innerHTML=seg5(Math.round(r.presence.score/2),band(r.presence.score*10));
$('b-presence-v').textContent=tenLabel(r.presence.score);$('b-presence-v').style.color=band(r.presence.score*10);
$('b-presence-s').textContent='Framing, head position and eye contact — measured on your device';}
else{$('b-presence').textContent='—';$('b-presence-bar').innerHTML=seg5(0,'');$('b-presence-v').textContent='';
$('b-presence-s').textContent='Not measured (no camera, or face checks unavailable)';}
/* scores at a glance */
if(r.answers&&r.answers.length){$('qs-card').hidden=false;
$('qs-chart').innerHTML=qScoreChart(r.answers);
document.querySelectorAll('#qs-chart [data-qjump]').forEach(function(a){a.onclick=function(ev){
ev.preventDefault();rpGo('answers');var t=$('qrep-'+a.dataset.qjump);
if(t)setTimeout(function(){t.scrollIntoView({behavior:'smooth',block:'start'})},80);};});}
else{$('qs-card').hidden=true;}
if(r.speech){$('sp-card').hidden=false;$('sp-badge').textContent=r.speech.score+' / 10';
/* every subfield guarded — a partial payload must never print
 * 'undefined' or 'NaN' at a learner */
var ps=typeof r.speech.paceScore==='number'?r.speech.paceScore:null;
var fs=typeof r.speech.fillerScore==='number'?r.speech.fillerScore:null;
['slow','good','fast'].forEach(function(bnd){$('band-'+bnd).className='bandc'+(r.speech.paceBand===bnd?' on '+bnd:'');});
$('sp-rate-frac').textContent=ps===null?'':ps+'/5';
var wpmOk=typeof r.speech.wpm==='number'&&isFinite(r.speech.wpm);
var gp=wpmOk?Math.max(2,Math.min(98,(r.speech.wpm/250)*100)):50;
$('sp-pin').style.left=gp+'%';$('sp-pin-l').textContent=wpmOk?r.speech.wpm+' wpm':'';
$('sp-wpm-d').textContent=r.speech.paceBand==='good'?'A natural, confident pace.':r.speech.paceBand==='slow'?'On the slow side — practising out loud builds pace without rushing.':r.speech.paceBand==='fast'?'Quick — a breath between points gives your answers room to land.':'';
$('sp-fill-frac').textContent=fs===null?'':fs+'/5';
$('sp-fill').textContent=typeof r.speech.fillerCount==='number'?r.speech.fillerCount+(r.speech.fillerCount===1?' word':' words'):'—';
$('sp-fill-bar').style.width=(fs===null?0:fs*20)+'%';
$('sp-fill-bar').style.background=fs===null?'#E3DDDA':band(fs*20);
$('sp-fill-d').textContent=r.speech.fillerCount===0?'Clean answers — no crutch words caught.':typeof r.speech.fillerCount==='number'?'Caught in your transcript (um, basically, sort of…). A short pause beats a filler.':'';
$('sp-time').textContent=(typeof r.speech.totalSecs==='number'&&isFinite(r.speech.totalSecs))?fmt(r.speech.totalSecs):'—';
$('sp-times').innerHTML=timeChart(answers);}else{$('sp-card').hidden=true;}
if(r.presence){$('pr-card').hidden=false;$('pr-badge').textContent=r.presence.score+' / 10';
var m=r.presence.metrics||{};
var noKp='Not measured on this browser';
$('prgrid').innerHTML=
prStat('Face in frame',PR_ICONS.face,m.faceVisible||{pct:r.presence.faceVisiblePct,band:'okay'},'')+
prStat('Centre of screen',PR_ICONS.centre,m.centred||{pct:r.presence.centredPct,band:'okay'},'')+
prStat('Distance',PR_ICONS.dist,m.distance||{pct:r.presence.goodDistancePct,band:'okay'},'')+
prStat('Straight head',PR_ICONS.head,m.headStraight||null,noKp)+
prStat('Eye contact',PR_ICONS.eye,m.eyeContact||null,noKp);}
else{$('pr-card').hidden=true;}
/* Per-question: Hiration-style assessment (left) + guidance (right) */
var out='';r.answers.forEach(function(a,i){var c=band(a.score);
out+="<div class='card qrep' id='qrep-"+i+"'><div class='qc-head'><span class='qc-n'>Q"+(i+1)+"</span>"+
"<span class='qc-q'>"+esc2(answers[i]?answers[i].question:'')+"</span>"+
"<span class='qchip' style='background:"+c+"'>"+a.score+" · "+scoreLabel(a.score)+"</span></div>";
if(answers[i]&&answers[i].blobUrl){out+="<video class='rev-vid inrep' src='"+answers[i].blobUrl+"' controls playsinline></video>";}
out+="<div class='qcols'>"+
"<div class='qcol'><div class='qcol-t'>ANSWER ASSESSMENT</div>"+
"<div class='meter'><i style='width:"+a.score+"%;background:"+c+"'></i></div>"+
"<div class='meter-l' style='color:"+c+"'>"+scoreLabel(a.score)+"</div>"+
"<div class='panel pgood'><b>What went well</b>"+esc2(a.strength)+"</div>"+
"<div class='panel pbad'><b>What needs improvement</b>"+esc2(a.improve)+"</div></div>"+
"<div class='qcol'><div class='qcol-t'>ANSWER GUIDANCE</div>"+
(a.impress?"<div class='panel pinfo'><b>What would have impressed the interviewer</b>"+esc2(a.impress)+"</div>":"")+
(a.sharper?"<div class='panel prefined'><b>Refined answer: putting it all together</b>"+esc2(a.sharper)+"</div>":"")+"</div>"+
"</div></div>";});
$('r-answers').innerHTML=out;$('r-next').textContent=r.next_step;
if(r.encouragement){$('r-cheer').textContent=r.encouragement;$('r-cheercard').hidden=false}
else{$('r-cheercard').hidden=true}
if(stream){stream.getTracks().forEach(function(t){t.stop()});stream=null;}}
/* ---------------- learning: prep tracks + question bank ---------------- */
var LEARN=[
{id:'rounds',track:'fast',title:'How interviews actually work',mins:3,
body:'Most first-job hiring runs in rounds: a short phone or video screen (are you real, keen and available?), then a face-to-face or panel (can you do the job and fit the team?), sometimes a task or trial shift. Each round checks something different — so match your energy to it.',
moves:['Phone screen: stand up, smile, have your dates and travel plan ready','Face-to-face: three prepared stories beat twenty memorised answers','Trial shift: ask what good looks like, then visibly do it']},
{id:'star',track:'fast',title:'The STAR shape',mins:4,
body:'Almost every behavioural question wants the same shape: the Situation you were in, the Task in front of you, the Action YOU took, and the Result. Most people stop at action — the result is where the interviewer decides.',
moves:['One sentence of situation — resist the backstory','Say "I", not "we" — your part is the answer','End with what changed: a number, a thank-you, a habit that stuck']},
{id:'prep',track:'fast',title:'Prepare like a pro',mins:4,
body:'Preparation is mostly knowing three things cold: what the company actually does (their website, one recent thing about them), what the advert asks for (reread it the night before), and which three real stories of yours prove you fit it.',
moves:['Reread the advert and underline the three things they repeat','Pick three stories from work, school or volunteering that map to them','Plan the journey and arrive ten minutes early — reliability is the first test']},
{id:'ask',track:'fast',title:'Questions to ask them',mins:3,
body:'"Any questions for us?" is not a formality — it is your last impression. Asking nothing reads as not caring; asking about pay first reads as only caring about that.',
moves:['"What does a really good first three months look like in this role?"','"What do people who love working here say they love?"','"What would my first week actually look like?"','Save pay and holidays for after the offer']},
{id:'unknown',track:'comp',title:'When you do not know the answer',mins:3,
body:'Every interviewer asks something you cannot answer. What they are watching is what you do next — bluffing fails, freezing fails, honest thinking wins.',
moves:['Say what you DO know that is nearby','"I have not done that yet — here is how I would find out"','Ask a clarifying question; thinking aloud is allowed']},
{id:'video',track:'comp',title:'Video interview craft',mins:3,
body:'Video interviews are won on setup and eye contact. The camera is the interviewer: look at it when you speak, not at your own face.',
moves:['Camera at eye level, window in front of you not behind','Notes are fine — three bullet words, not a script to read','Close every other tab; log in ten minutes early','If tech fails, stay calm and phone them — handling it well IS the test']},
{id:'logistics',track:'comp',title:'The straight-answer questions',mins:3,
body:'Availability, notice, pay expectations, references — these have right answers: prompt, honest, unembellished ones. Fumbling logistics undoes a good interview.',
moves:['Know your true availability before you walk in','Pay: "What is the range for this role?" is a fine answer early on','Have two referees who know they might be called']},
{id:'after',track:'comp',title:'After the interview',mins:3,
body:'The candidates who follow up stand out — and the ones who treat a no as information come back stronger. Every interview is practice for the one that says yes.',
moves:['Same-day short thank-you email — two sentences, name something you discussed','Write down the questions you were asked while fresh','If it is a no, ask for one piece of feedback — then practise exactly that here']}];
var LEARN_KEY='fl_iv_learn_v1';
function learnRead(){try{return JSON.parse(localStorage.getItem(LEARN_KEY)||'[]')}catch(e){return []}}
function learnMark(id){var r=learnRead();if(r.indexOf(id)===-1){r.push(id);
try{localStorage.setItem(LEARN_KEY,JSON.stringify(r))}catch(e){}}renderTracks();}
var MOD_ICONS={rounds:'🎬',star:'⭐',prep:'🗺️',ask:'💬',unknown:'🧭',video:'🎥',logistics:'📅',after:'📮'};
var ROLE_ICONS={'customer-service':'🎧',retail:'🛍️',trades:'🛠️','office-admin':'🗂️',care:'🤝',hospitality:'☕',general:'🐣'};
var ROLE_LABELS_JS={'customer-service':'Customer service',retail:'Retail','office-admin':'Office & admin',
trades:'Trades & construction',care:'Care',hospitality:'Hospitality',general:'Any first job'};
function readPct(list){var r=learnRead();
var done=list.filter(function(m){return r.indexOf(m.id)>-1}).length;
return Math.round(done*100/list.length);}
function firstUnread(list){var r=learnRead();
var m=list.find(function(x){return r.indexOf(x.id)===-1});return m?m.id:list[0].id;}
function renderTracks(){
var fast=LEARN.filter(function(m){return m.track==='fast'});
function tk(icon,name,list){var p=readPct(list);
return "<div class='trackcard'><span class='tk-ico'>"+icon+"</span>"+
"<div class='tk-main'><b>"+name+" · "+p+"%</b>"+
"<span>"+list.length+" modules · "+list.reduce(function(s,m){return s+m.mins},0)+" min total</span>"+
"<div class='tk-bar'><i style='width:"+p+"%'></i></div></div>"+
"<button type='button' class='btn tk-go' data-track-start='"+firstUnread(list)+"'>"+(p===0?'Start →':p===100?'Revisit →':'Continue →')+"</button></div>";}
$('trackrow').innerHTML=tk('🚀','Fast Track',fast)+tk('📚','Comprehensive',LEARN);
document.querySelectorAll('[data-track-start]').forEach(function(b){b.onclick=function(){openModule(b.dataset.trackStart)};});}
function openModule(id){var m=LEARN.find(function(x){return x.id===id});if(!m)return;
learnMark(m.id);
var idx=LEARN.indexOf(m);
$('learn-list').hidden=true;$('learn-reader').hidden=false;
$('learn-reader').innerHTML="<div class='card reader'>"+
"<div class='reader-top'><span class='mod-ico big'>"+(MOD_ICONS[m.id]||'📘')+"</span>"+
"<div><span class='modtag'>"+(m.track==='fast'?'Fast Track':'Comprehensive')+" · "+m.mins+" min</span>"+
"<h3 style='margin:4px 0 0'>"+esc2(m.title)+"</h3></div></div>"+
"<p class='reader-body'>"+esc2(m.body)+"</p>"+
"<div class='reader-h'>THE MOVES</div><ul class='reader-moves'>"+
m.moves.map(function(v){return "<li><span class='tick'>✓</span>"+esc2(v)+"</li>"}).join('')+"</ul>"+
"<div class='btnrow' style='margin-top:16px'>"+
"<button type='button' class='btn ghost' id='reader-back'>← All modules</button>"+
(idx<LEARN.length-1?"<button type='button' class='btn' id='reader-next'>Next: "+esc2(LEARN[idx+1].title)+" →</button>":"")+
"</div></div>";
$('reader-back').onclick=function(){$('learn-reader').hidden=true;$('learn-list').hidden=false;renderLearn();};
var nx=$('reader-next');if(nx)nx.onclick=function(){openModule(LEARN[idx+1].id)};
window.scrollTo({top:0,behavior:'smooth'});}
function renderLearn(){renderTracks();var r=learnRead();
$('learn-list').innerHTML=LEARN.map(function(m){
var read=r.indexOf(m.id)>-1;
return "<button type='button' class='modcard' data-mod='"+m.id+"'>"+
"<span class='mod-ico'>"+(MOD_ICONS[m.id]||'📘')+"</span>"+
"<span class='modtag'>"+(m.track==='fast'?'Fast Track':'Comprehensive')+"</span>"+
"<b>"+esc2(m.title)+"</b><p>"+esc2(m.body.split('.')[0])+".</p>"+
"<span class='mod-foot'>"+(read?"<i class='mod-done'>✓ Read</i>":"▶ "+m.mins+" min read")+"<i class='mod-arr'>›</i></span></button>";}).join('');
document.querySelectorAll('.modcard').forEach(function(b){b.onclick=function(){openModule(b.dataset.mod)};});
/* question bank: role cards first, drill into questions */
$('qbank-roles').innerHTML=Object.keys(FL_QUESTIONS).map(function(rk){
return "<button type='button' class='rolecard' data-qbrole='"+rk+"'>"+
"<span class='mod-ico'>"+(ROLE_ICONS[rk]||'💼')+"</span>"+
"<b>"+esc2(ROLE_LABELS_JS[rk]||rk)+"</b>"+
"<span class='rolecount'>❓ "+FL_QUESTIONS[rk].length+" questions</span></button>";}).join('');
document.querySelectorAll('[data-qbrole]').forEach(function(b){b.onclick=function(){
var rk=b.dataset.qbrole;
$('qbank').hidden=false;
$('qbank').innerHTML="<div class='card'><div class='listhead2'><h3>"+
(ROLE_ICONS[rk]||'')+" "+esc2(ROLE_LABELS_JS[rk]||rk)+" questions</h3>"+
"<button type='button' class='rev-redo' id='qb-close'>Close</button></div>"+
FL_QUESTIONS[rk].map(function(q,qi){
return "<div class='qb-q'><span class='qb-n'>Q"+(qi+1)+"</span><span>"+esc2(q)+"</span>"+
"<button type='button' class='btn qb-go' data-pr-role='"+rk+"' data-pr-idx='"+qi+"'>Practise</button></div>";}).join('')+"</div>";
$('qbank').scrollIntoView({behavior:'smooth',block:'start'});
$('qb-close').onclick=function(){$('qbank').hidden=true};
document.querySelectorAll('[data-pr-role]').forEach(function(pb){pb.onclick=function(){
var rk2=pb.dataset.prRole;var q=FL_QUESTIONS[rk2][+pb.dataset.prIdx];if(!q)return;
role=rk2;roleLabel='Single question · '+(ROLE_LABELS_JS[rk2]||rk2);qs=[q];sig='';toSetup();};});};});}

/* ---------------- self review ---------------- */
var SELF_ITEMS=['I actually answered the question that was asked','I used a real example, not a vague claim',
'My answer had a shape: situation → what I did → result','I said "I", not just "we"',
'I sounded like myself, not a script','I looked at the camera more than at myself',
'I would hire the person in that recording'];
function renderSelf(){var s=(currentSession&&currentSession.self)||[];
$('selflist').innerHTML=SELF_ITEMS.map(function(t,i){
return "<li><label><input type='checkbox' data-self='"+i+"'"+(s[i]?" checked":"")+"> "+esc2(t)+"</label></li>"}).join('');
document.querySelectorAll('[data-self]').forEach(function(cb){cb.onchange=function(){
if(!currentSession)return;currentSession.self=currentSession.self||[];
currentSession.self[+cb.dataset.self]=cb.checked;idbPut(currentSession);};});}
$('rtab-ai').onclick=function(){$('rtab-ai').className='ivtab on';$('rtab-self').className='ivtab';
$('rep-ai').hidden=false;$('rep-self').hidden=true;};
$('rtab-self').onclick=function(){$('rtab-self').className='ivtab on';$('rtab-ai').className='ivtab';
renderSelf();$('rep-self').hidden=false;$('rep-ai').hidden=true;};

/* ---------------- home tabs ---------------- */
function showTab(which){
$('tab-practice').className='ivtab'+(which==='practice'?' on':'');
$('tab-recs').className='ivtab'+(which==='recs'?' on':'');
$('tab-learn').className='ivtab'+(which==='learn'?' on':'');
$('home-practice').hidden=which!=='practice';
$('home-recs').hidden=which!=='recs';
$('home-learn').hidden=which!=='learn';
if(which==='recs')renderRecordings();
if(which==='learn')renderLearn();}
$('tab-practice').onclick=function(){showTab('practice')};
$('tab-recs').onclick=function(){showTab('recs')};
$('tab-learn').onclick=function(){showTab('learn')};
refreshRecCount();
/* QA hook: lets automated tests render a report without a model call.
 * Operates only on this page's own DOM — no data leaves the device. */
window.__flRenderReport=function(rep,ans){if(ans)answers=ans;renderReport(rep);show('s-rep');};
document.querySelectorAll('.fbbtn').forEach(function(b){b.onclick=function(){
fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,tool:'interview',helpful:b.dataset.fb==='1'})}).catch(function(){});
$('fbrow').textContent='Thanks — that helps Fledge improve.';};});
})();`;

const INTERVIEW_CSS = `
.ivtabs{display:flex;gap:8px;margin-bottom:18px;}
.ivtab{border:1.5px solid var(--line);background:#fff;color:var(--ink);border-radius:999px;padding:10px 20px;
  font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;min-height:42px;display:inline-flex;align-items:center;gap:8px;}
.ivtab.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.ivcount{background:var(--orange);color:#fff;border-radius:999px;min-width:20px;height:20px;font-size:11px;
  display:inline-flex;align-items:center;justify-content:center;padding:0 6px;}
.ivtab.on .ivcount{background:var(--mango);}
/* generate chooser — expandable icon cards */
.srccard{border:1.5px solid var(--line);border-radius:14px;margin-bottom:10px;overflow:hidden;background:#fff;
  transition:border-color .12s,box-shadow .12s;}
.srccard:not(.closed){border-color:var(--orange);box-shadow:0 0 0 2px rgba(217,69,43,.12);}
.srchead{display:flex;align-items:center;gap:14px;width:100%;padding:14px 16px;border:none;background:#fff;
  font-family:inherit;cursor:pointer;text-align:left;}
.srcico{width:44px;height:44px;border-radius:12px;font-size:20px;flex:none;display:inline-flex;align-items:center;justify-content:center;}
.srctxt{flex:1;min-width:0;}
.srctxt b{display:block;font-size:14.5px;color:var(--navy);}
.srctxt i{font-style:normal;font-size:12px;color:var(--mut);line-height:1.4;}
.srcchev{color:var(--mut);font-size:13px;transition:transform .15s;}
.srccard:not(.closed) .srcchev{transform:rotate(180deg);}
.srcbody{padding:0 16px 14px;}
/* learning */
.learn-sec{font-size:17px;margin:4px 0 12px;}
.learn-sec:not(:first-child){margin-top:22px;}
.trackrow{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:680px){.trackrow{grid-template-columns:1fr;}}
.trackcard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 18px;display:flex;
  align-items:center;gap:14px;box-shadow:0 1px 3px rgba(5,37,60,.05);}
.tk-ico{width:48px;height:48px;border-radius:50%;background:#FDF3EC;font-size:22px;flex:none;
  display:inline-flex;align-items:center;justify-content:center;}
.tk-main{flex:1;min-width:0;}
.tk-main b{display:block;font-size:14.5px;}
.tk-main span{font-size:11.5px;color:var(--mut);}
.tk-bar{height:7px;border-radius:999px;background:var(--off);overflow:hidden;margin-top:7px;}
.tk-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--mango),var(--orange));border-radius:999px;}
.tk-go{padding:10px 16px;min-height:40px;font-size:13px;flex:none;}
.modgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;}
.modcard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:18px;text-align:left;
  font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:8px;
  box-shadow:0 1px 3px rgba(5,37,60,.05);transition:transform .12s,box-shadow .12s,border-color .12s;}
.modcard:hover{transform:translateY(-3px);border-color:var(--mango);box-shadow:0 12px 26px -14px rgba(5,37,60,.28);}
.mod-ico{width:46px;height:46px;border-radius:50%;background:#EAF2FA;font-size:20px;
  display:inline-flex;align-items:center;justify-content:center;}
.mod-ico.big{width:56px;height:56px;font-size:24px;flex:none;}
.modtag{align-self:flex-start;background:var(--off);color:var(--blue);border-radius:999px;padding:3px 10px;
  font-size:10.5px;font-weight:700;}
.modcard b{font-size:14.5px;color:var(--navy);line-height:1.35;}
.modcard p{font-size:12px;color:var(--mut);line-height:1.5;flex:1;margin:0;}
.mod-foot{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:700;color:var(--blue);}
.mod-done{font-style:normal;color:#1B7A4B;}
.mod-arr{font-style:normal;font-size:16px;color:var(--mut);}
.reader-top{display:flex;gap:14px;align-items:center;margin-bottom:12px;}
.reader-body{font-size:14.5px;line-height:1.7;color:#3d4c59;max-width:60ch;}
.reader-h{font-size:11px;font-weight:800;letter-spacing:.1em;color:var(--blue);margin:16px 0 8px;}
.reader-moves{list-style:none;}
.reader-moves li{display:flex;gap:10px;padding:8px 12px;background:#F7F4F2;border-radius:10px;margin-bottom:7px;
  font-size:13.5px;line-height:1.55;color:#3d4c59;}
.reader-moves .tick{color:#1B7A4B;font-weight:800;}
.rolegrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:12px;}
.rolecard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px;text-align:left;
  font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:8px;
  box-shadow:0 1px 3px rgba(5,37,60,.05);transition:transform .12s,border-color .12s;}
.rolecard:hover{transform:translateY(-2px);border-color:var(--orange);}
.rolecard b{font-size:13.5px;color:var(--navy);}
.rolecount{font-size:11.5px;color:var(--mut);}
.listhead2{display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;}
.listhead2 h3{margin:0;}
.qb-q{display:flex;align-items:center;gap:12px;padding:10px 0;font-size:13.5px;color:#3d4c59;border-bottom:1px solid var(--off);}
.qb-q:last-child{border-bottom:none;}
.qb-n{font-size:11px;font-weight:800;color:var(--orange);flex:none;}
.qb-q span{flex:1;line-height:1.5;}
.qb-go{padding:8px 16px;min-height:36px;font-size:12.5px;flex:none;}
/* self review — toggle cards */
.selflist{list-style:none;}
.selflist li{margin-bottom:8px;}
.selflist label{display:flex;align-items:center;gap:12px;border:1.5px solid var(--line);border-radius:12px;
  padding:13px 16px;font-size:14px;cursor:pointer;background:#fff;transition:border-color .12s,background .12s;}
.selflist label:hover{border-color:var(--mango);}
.selflist input{width:19px;height:19px;accent-color:#1B7A4B;flex:none;}
.selflist input:checked+span{}
.selflist li:has(input:checked) label{border-color:#CBE3D3;background:#F5FBF7;}
.reclib{display:flex;align-items:center;gap:12px;border:1.5px solid var(--line);border-radius:14px;padding:13px 16px;margin-bottom:10px;}
.reclib-main{flex:1;min-width:0;}
.reclib-main b{display:block;font-size:14px;}
.reclib-main span{font-size:12px;color:var(--mut);}
.rl-tag{font-style:normal;color:var(--mango);font-weight:700;}
.reclib-score{font-size:20px;font-weight:800;font-variant-numeric:tabular-nums;flex:none;}
.reclib-score.dim{color:#B9AFAB;}
.scoringbar{display:flex;gap:12px;align-items:center;background:#FDF3EC;border:1.5px solid #F2D8BF;border-radius:14px;
  padding:13px 16px;font-size:13.5px;line-height:1.55;margin-bottom:14px;}
.scoringdot{width:12px;height:12px;border-radius:50%;background:var(--orange);flex:none;animation:flDot 1.1s infinite;}
.prgrid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;}
.prstat{border:1.5px solid var(--line);border-radius:14px;padding:16px 12px;text-align:center;}
.prstat b{display:block;font-size:12.5px;margin-top:10px;}
.prstat span{font-size:11.5px;color:var(--mut);}
.prring{width:64px;height:64px;border-radius:50%;margin:0 auto;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:14px;border:4px solid var(--line);color:var(--mut);}
.prring.good{border-color:#1B7A4B;color:#1B7A4B;}
.prring.mid{border-color:var(--mango);color:#B96A16;}
.prring.bad{border-color:var(--orange);color:var(--orange);}
.prstat.na{opacity:.65;}
.seg5{display:flex;gap:5px;margin:9px 0 7px;}
.seg5 i{flex:1;height:8px;border-radius:999px;background:var(--off);display:block;}
.b-v{font-size:12.5px;font-weight:800;margin:1px 0 2px;}
.qschart{width:100%;max-width:520px;display:block;}
.qschart a{cursor:pointer;}
.gauge{position:relative;height:34px;margin-top:10px;}
.gauge-track{position:absolute;left:0;right:0;top:14px;height:8px;border-radius:999px;
  background:linear-gradient(90deg,#E9B9AF 0%,#E9B9AF 42%,#9CC9AE 44%,#9CC9AE 62%,#E9B9AF 66%,#E9B9AF 100%);}
.gauge-pin{position:absolute;top:0;transform:translateX(-50%);text-align:center;}
.gauge-pin::after{content:'';display:block;width:4px;height:22px;background:var(--navy);border-radius:2px;margin:2px auto 0;}
.gauge-pin span{font-size:11px;font-weight:800;color:var(--navy);white-space:nowrap;}
.sp-frac{float:right;font-weight:800;color:var(--navy);font-size:12px;}
.fillbar{height:9px;border-radius:999px;background:var(--off);overflow:hidden;margin:9px 0;}
.fillbar i{display:block;height:100%;border-radius:999px;}
.tchart{display:flex;flex-direction:column;gap:7px;}
.tc-row{display:flex;align-items:center;gap:10px;}
.tc-l{width:26px;font-size:11.5px;font-weight:800;color:var(--mut);flex:none;}
.tc-track{flex:1;position:relative;height:14px;background:var(--off);border-radius:999px;overflow:visible;}
.tc-sweet{position:absolute;left:25%;width:25%;top:0;bottom:0;background:rgba(27,122,75,.16);border-radius:4px;}
.tc-bar{position:absolute;left:0;top:2.5px;height:9px;border-radius:999px;display:block;}
.tc-v{width:44px;font-size:11.5px;font-weight:700;color:var(--mut);flex:none;text-align:right;}
.tc-scale .tc-track{background:none;height:14px;}
.tc-mark{position:absolute;top:-2px;transform:translateX(-100%);font-size:10px;color:var(--mut);font-weight:600;}
.pr-word{font-weight:800;font-size:12px;}
.pr-word.good{color:#1B7A4B;}.pr-word.mid{color:#B96A16;}.pr-word.bad{color:var(--orange);}
.pr-pctbar{height:6px;border-radius:999px;background:var(--off);overflow:hidden;margin:8px 8px 4px;}
.pr-pctbar i{display:block;height:100%;background:var(--navy);border-radius:999px;}
.pr-pct{font-size:10.5px;color:var(--mut);}
.prring em{font-style:normal;font-size:22px;}
.qrep{padding:0;overflow:hidden;}
.qchip{flex:none;color:#fff;border-radius:999px;padding:5px 13px;font-size:12px;font-weight:800;white-space:nowrap;}
.qcols{display:grid;grid-template-columns:1fr 1fr;gap:0;}
@media(max-width:820px){.qcols{grid-template-columns:1fr;}}
.qcol{padding:16px 18px;}
.qcol:first-child{border-right:1px solid var(--off);}
@media(max-width:820px){.qcol:first-child{border-right:none;border-bottom:1px solid var(--off);}}
.qcol-t{font-size:10.5px;font-weight:800;letter-spacing:.12em;color:var(--mut);margin-bottom:10px;}
.meter{height:9px;border-radius:999px;background:var(--off);overflow:hidden;}
.meter i{display:block;height:100%;border-radius:999px;}
.meter-l{font-size:15px;font-weight:800;margin:7px 0 12px;}
.panel{border-radius:12px;padding:12px 14px;font-size:13px;line-height:1.6;color:#3d4c59;margin-bottom:10px;}
.panel:last-child{margin-bottom:0;}
.panel b{display:block;font-size:11px;letter-spacing:.06em;text-transform:uppercase;margin-bottom:5px;}
.panel.pgood{background:#EFF7F1;border:1px solid #CBE3D3;}
.panel.pgood b{color:#1B7A4B;}
.panel.pbad{background:#FCEFEC;border:1px solid #F0CFC7;}
.panel.pbad b{color:var(--orange);}
.panel.pinfo{background:#EFF4F9;border:1px solid #CFDEEC;}
.panel.pinfo b{color:var(--blue);}
.panel.prefined{background:#FDF6EE;border:1px solid #F0DFC8;}
.panel.prefined b{color:#B96A16;}
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
.rtabs{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 16px;}
.rtab{border:1.5px solid var(--line,#E3DDDA);background:#fff;border-radius:999px;padding:9px 16px;
  font-family:inherit;font-size:13px;font-weight:700;color:var(--ink,#25394B);cursor:pointer;}
.rtab.on{background:var(--navy,#05253C);border-color:var(--navy,#05253C);color:#fff;}
.rtab:hover:not(.on){border-color:var(--mango,#ED9249);}
@media print{.rpanel{display:block!important;}
.rpanel[hidden]{display:block!important;}}
.nextstep{background:#fff;border-left:4px solid var(--orange);color:var(--navy);}
.nextstep .ns-label{font-size:11.5px;font-weight:800;letter-spacing:.1em;color:var(--orange);margin-bottom:6px;}
.nextstep div:last-child{font-size:15.5px;line-height:1.6;font-weight:500;}
@media print{.rev-vid,video{display:none!important;}}
`;
