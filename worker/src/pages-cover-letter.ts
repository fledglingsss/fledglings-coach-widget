/* /cover-letter — the Cover Letter Studio. The learner pastes the job
 * advert (plus optionally their real CV), and Fledge drafts a letter
 * WITH them under the no-fabrication law: nothing claimed their CV
 * doesn't say, [brackets] for everything only they can write. Three
 * letter designs, editable in place, copy or print — never stored. */

import { appShell } from "./pages";

export function renderCoverLetterPage(): string {
  const body =
    "<main class='wrap' style='max-width:940px'>" +
    "<h2 class='page'>Cover Letter Studio</h2>" +
    "<p class='sub'>A cover letter that sounds like you — because it only says what you've genuinely done. " +
    "Fledge drafts it from the advert and your real CV, marks everything you should personalise in " +
    "<span class='ph' style='padding:1px 6px'>brackets</span>, and hands you the pen. Nothing is stored.</p>" +

    /* inputs */
    "<div id='s-in'>" +
    "<div class='card'>" +
    "<div class='ingrid'>" +
    "<div><label for='cl-role' style='margin-top:0'>Job title</label>" +
    "<input type='text' id='cl-role' maxlength='80' placeholder='e.g. Retail assistant'></div>" +
    "<div><label for='cl-company' style='margin-top:0'>Company</label>" +
    "<input type='text' id='cl-company' maxlength='80' placeholder='e.g. Shopmart'></div>" +
    "<div><label for='cl-name' style='margin-top:0'>Your name <span class='opt'>(for the letter heading)</span></label>" +
    "<input type='text' id='cl-name' maxlength='60' placeholder='e.g. Sam Taylor'></div>" +
    "</div>" +
    "<label for='cl-jd'>The job advert <span class='opt'>(paste it — the letter answers what it actually asks for)</span></label>" +
    "<textarea id='cl-jd' rows='6' maxlength='3000' placeholder='Paste the job advert here…'></textarea>" +
    "<label>Your CV <span class='opt'>(optional but recommended — it's what keeps the letter honest)</span></label>" +
    "<div class='cvrow'>" +
    "<div class='drop mini' id='cl-drop' tabindex='0' role='button' aria-label='Upload your CV PDF'>" +
    "<input type='file' id='cl-file' accept='.pdf,application/pdf' hidden>" +
    "<span id='cl-drop-t'>📄 Drop your CV PDF here or click to choose</span></div>" +
    "<details class='typefall'><summary>Or paste your CV as text</summary>" +
    "<textarea id='cl-cv' rows='5' maxlength='9000' placeholder='Paste your CV text here…'></textarea></details></div>" +
    "<div id='cl-err' class='drop-err' hidden></div>" +
    "<div class='btnrow' style='margin-top:16px'><button type='button' class='btn' id='cl-go'>Draft my letter</button>" +
    "<span class='hero-note'>Up to 3 drafts a day — each one is a starting point, not a finished letter.</span></div>" +
    "</div></div>" +

    /* analysing */
    "<div class='card centre' id='s-wait' hidden>" +
    "<div class='pulse' aria-hidden='true'><svg viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'/><line x1='16' y1='8' x2='2' y2='22'/><line x1='17.5' y1='15' x2='9' y2='15'/></svg></div>" +
    "<h3 id='waitmsg'>Drafting your letter…</h3>" +
    "<p class='sub' style='margin:6px 0 0'>Grounded in your real experience only. Usually under half a minute.</p></div>" +

    /* message */
    "<div class='card' id='s-msg' hidden><div class='result' id='msgtext'></div>" +
    "<div class='btnrow'><button type='button' class='btn ghost' id='msgback'>Back</button></div></div>" +

    /* result */
    "<div id='s-out' hidden>" +
    "<div class='card no-print'><h3>Choose a design</h3>" +
    "<div class='tplrow'>" +
    "<button type='button' class='tpl on' data-tpl='classic'>Classic<i>Timeless serif, quietly confident</i></button>" +
    "<button type='button' class='tpl' data-tpl='elegant'>Elegant<i>Clean modern, plenty of air</i></button>" +
    "<button type='button' class='tpl' data-tpl='bold'>Bold<i>Navy header, makes a mark</i></button>" +
    "</div></div>" +
    "<div class='letterpaper classic' id='paper'>" +
    "<div class='lp-head'><div class='lp-name' id='lp-name'>[Your name]</div>" +
    "<div class='lp-contact'>[your email] · [your phone] · [your town]</div></div>" +
    "<div class='lp-date' id='lp-date'></div>" +
    "<div class='lp-body' id='lp-body' contenteditable='true' spellcheck='true'></div>" +
    "<div class='lp-sign'><div id='lp-signoff'></div><div class='lp-signname' id='lp-signname'>[Your name]</div></div>" +
    "</div>" +
    "<p class='edit-hint no-print'>✏️ The letter is editable — click any paragraph and make it yours. " +
    "Everything in <span class='ph' style='padding:1px 6px'>orange brackets</span> needs your words before you send it.</p>" +
    "<div class='card no-print' id='pers-card'><h3>Make it yours before sending</h3><ul class='goods' id='pers-list'></ul></div>" +
    "<div class='card no-print' id='tips-card'><h3>Tips from Fledge</h3><ul class='goods' id='tips-list'></ul></div>" +
    "<div class='fbrow no-print' id='fbrow'><span>Was this draft helpful?</span>" +
    "<button type='button' class='fbbtn' data-fb='1' aria-label='Yes, helpful'>👍</button>" +
    "<button type='button' class='fbbtn' data-fb='0' aria-label='Not helpful'>👎</button></div>" +
    "<div class='btnrow no-print'>" +
    "<button type='button' class='btn' id='copybtn'>Copy letter text</button>" +
    "<button type='button' class='btn quiet' onclick='window.print()'>Print / save as PDF</button>" +
    "<button type='button' class='btn ghost' id='againbtn'>Start again</button></div>" +
    "</div>" +

    "<p class='sub no-print' style='font-size:12.5px;margin-top:18px'>Fledge never invents experience for you — employers can tell, " +
    "and you deserve to be hired as yourself. If anything you write worries Fledge about your wellbeing, it will point you to " +
    "real support instead of drafting.</p>" +
    "</main>" +
    "<script>" + COVER_LETTER_JS + "</script>";

  return appShell({
    title: "Fledglings — Cover Letter Studio",
    active: "cover",
    bodyHtml: body,
    extraCss: COVER_LETTER_CSS,
  });
}

const COVER_LETTER_JS = String.raw`(function(){
function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}
var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');
var $=function(id){return document.getElementById(id)};
var params=new URLSearchParams(location.search);
var hubEmail=flResolveEmail();flIdentityChip();
function show(id){['s-in','s-wait','s-msg','s-out'].forEach(function(k){$(k).hidden=k!==id});}
function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}

/* CV PDF extraction (same on-device rail as the review tools) */
var cvText='';
var PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
var PDFWK='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
var pdfReady=null;
function loadPdf(){if(pdfReady)return pdfReady;
pdfReady=new Promise(function(res,rej){var s=document.createElement('script');s.src=PDFJS;s.integrity='sha512-q+4liFwdPC/bNdhUpZx6aXDx/h77yEQtn4I1slHydcbZK34nLaR3cAeYSJshoxIOq3mjEf7xJE8YWIUHMn+oCQ==';s.crossOrigin='anonymous';
s.onload=function(){try{window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFWK;res(window.pdfjsLib)}catch(e){rej(e)}};
s.onerror=function(){pdfReady=null;rej(new Error('load failed'))};document.head.appendChild(s)});return pdfReady;}
function extractPdf(file){return loadPdf().then(function(lib){
return file.arrayBuffer().then(function(buf){return lib.getDocument({data:buf}).promise})
.then(function(doc){var chain=Promise.resolve('');var total=Math.min(doc.numPages,12);
for(var p=1;p<=total;p++){(function(pn){chain=chain.then(function(acc){
return doc.getPage(pn).then(function(pg){return pg.getTextContent()}).then(function(tc){
var line='',out=[],lastY=null;
tc.items.forEach(function(it){if(!it.str)return;
if(lastY!==null&&Math.abs(it.transform[5]-lastY)>2){out.push(line);line=''}
line+=(line&&it.str.charAt(0)!==' '?' ':'')+it.str;lastY=it.transform[5]});
out.push(line);return acc+out.join('\n')+'\n\n'})})})(p)}return chain})})}
var drop=$('cl-drop'),fileIn=$('cl-file');
function clErr(msg){var e=$('cl-err');e.hidden=!msg;e.textContent=msg||'';}
function handleFile(f){if(!f)return;clErr('');
if(!/pdf$/i.test(f.type||'')&&!/\.pdf$/i.test(f.name)){clErr('That is not a PDF — export your CV as PDF first, or paste it as text.');return;}
if(f.size>10*1024*1024){clErr('That PDF is over 10 MB — export a smaller version.');return;}
$('cl-drop-t').textContent='Reading '+f.name+'…';
extractPdf(f).then(function(text){text=text.replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim();
if(text.length<80){$('cl-drop-t').textContent='📄 Drop your CV PDF here or click to choose';
clErr('Could not read enough text from that PDF — paste your CV as text instead.');return;}
cvText=text.slice(0,9000);$('cl-drop-t').textContent='✓ '+f.name+' read — Fledge will only use what it says';})
.catch(function(){$('cl-drop-t').textContent='📄 Drop your CV PDF here or click to choose';
clErr('Could not read that PDF — paste your CV as text instead.');});}
drop.addEventListener('click',function(){fileIn.click()});
drop.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fileIn.click()}});
fileIn.addEventListener('change',function(){handleFile(fileIn.files[0])});
['dragover','dragenter'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('over')})});
['dragleave','drop'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('over')})});
drop.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];handleFile(f)});

/* templates */
document.querySelectorAll('.tpl').forEach(function(b){b.addEventListener('click',function(){
document.querySelectorAll('.tpl').forEach(function(x){x.classList.remove('on')});b.classList.add('on');
$('paper').className='letterpaper '+b.dataset.tpl;});});

/* highlight [brackets] */
function markPh(text){return esc2(text).replace(/\[([^\]\n]{1,80})\]/g,"<mark class='ph'>[$1]</mark>");}

$('cl-go').addEventListener('click',function(){
var jd=$('cl-jd').value.trim();
if(jd.length<60){clErr('Paste a bit more of the job advert — a few sentences at least.');return;}
clErr('');show('s-wait');
var pasted=$('cl-cv').value.trim();
fetch('/api/cover-letter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
learner_id:lid,session_id:sid,jd:jd,cv_text:(pasted||cvText).slice(0,9000),
role:$('cl-role').value,company:$('cl-company').value,email:hubEmail})})
.then(function(r){return r.json()}).then(function(d){
if(d&&d.draft){renderLetter(d.draft);show('s-out');window.scrollTo({top:0,behavior:'smooth'});return;}
$('msgtext').textContent=(d&&d.reply)||'Something went wrong — try again in a minute.';show('s-msg');})
.catch(function(){$('msgtext').textContent='Could not reach Fledge — try again in a minute.';show('s-msg');});});

function renderLetter(d){
var name=$('cl-name').value.trim()||'[Your name]';
$('lp-name').textContent=name;$('lp-signname').textContent=name;
$('lp-date').textContent=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
var html="<p class='lp-greet'>"+markPh(d.greeting)+"</p>";
d.paragraphs.forEach(function(p){html+="<p>"+markPh(p)+"</p>"});
$('lp-body').innerHTML=html;
$('lp-signoff').textContent=d.signoff;
$('pers-card').hidden=d.personalise.length===0;
$('pers-list').innerHTML=d.personalise.map(function(x){return "<li><span class='tick' style='color:#D9452B'>✎</span>"+markPh(x)+"</li>"}).join('');
$('tips-card').hidden=d.tips.length===0;
$('tips-list').innerHTML=d.tips.map(function(x){return "<li><span class='tick'>✓</span>"+esc2(x)+"</li>"}).join('');}

$('copybtn').addEventListener('click',function(){
var parts=[$('lp-name').textContent,'',$('lp-date').textContent,'',$('lp-body').innerText.trim(),'',
$('lp-signoff').textContent,$('lp-signname').textContent];
var text=parts.join('\n').replace(/\n{3,}/g,'\n\n');
(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(text):Promise.reject())
.then(function(){$('copybtn').textContent='Copied ✓';setTimeout(function(){$('copybtn').textContent='Copy letter text'},1600);})
.catch(function(){$('copybtn').textContent='Select and copy manually';});});
$('againbtn').addEventListener('click',function(){show('s-in');window.scrollTo({top:0})});
$('msgback').addEventListener('click',function(){show('s-in')});
document.querySelectorAll('.fbbtn').forEach(function(b){b.onclick=function(){
fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,tool:'cover',helpful:b.dataset.fb==='1'})}).catch(function(){});
$('fbrow').textContent='Thanks — that helps Fledge improve.';};});
})();`;

const COVER_LETTER_CSS = `
.ingrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
@media(max-width:760px){.ingrid{grid-template-columns:1fr;}}
.cvrow{margin-top:4px;}
.drop.mini{border:2px dashed var(--blue);border-radius:12px;padding:16px;text-align:center;cursor:pointer;
  background:rgba(19,80,127,.04);font-size:13.5px;font-weight:600;color:var(--blue);transition:border-color .15s;}
.drop.mini:hover,.drop.mini.over{border-color:var(--orange);background:rgba(217,69,43,.06);}
.drop.mini:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.drop-err{color:var(--orange);font-weight:600;font-size:13.5px;margin-top:10px;}
.typefall{margin-top:10px;font-size:13.5px;color:var(--blue);}
.typefall summary{cursor:pointer;font-weight:600;}
.typefall textarea{margin-top:10px;}
.hero-note{font-size:12.5px;color:#8a97a1;align-self:center;}
.centre{text-align:center;padding:40px 22px;}
.pulse{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--mango),var(--orange));animation:flPulse 1.6s ease-in-out infinite;}
.pulse svg{width:30px;height:30px;}
@keyframes flPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(217,69,43,.35)}
  50%{transform:scale(1.07);box-shadow:0 0 0 16px rgba(217,69,43,0)}}
.tplrow{display:grid;grid-template-columns:repeat(3,1fr);gap:10px;}
@media(max-width:700px){.tplrow{grid-template-columns:1fr;}}
.tpl{border:1.5px solid var(--off);background:#fff;border-radius:14px;padding:14px;text-align:left;cursor:pointer;
  font-family:inherit;font-size:14.5px;font-weight:700;color:var(--navy);transition:all .12s;}
.tpl i{display:block;font-style:normal;font-weight:500;font-size:12px;color:#8a97a1;margin-top:3px;}
.tpl:hover{border-color:var(--mango);}
.tpl.on{border-color:var(--orange);box-shadow:0 0 0 2px rgba(217,69,43,.18);}
.ph{background:#FCEBD9;color:#B96A16;border-radius:4px;padding:0 3px;font-weight:600;}
.edit-hint{font-size:13px;color:var(--blue);margin:-6px 0 16px;line-height:1.5;}
.goods{list-style:none;line-height:1.65;font-size:14px;}
.goods li{margin-bottom:8px;}
.goods .tick{color:var(--ok);font-weight:700;margin-right:8px;}
/* ------- the letter itself ------- */
.letterpaper{background:#fff;border-radius:6px;box-shadow:0 6px 28px -10px rgba(5,37,60,.25);
  padding:52px 58px;margin-bottom:18px;line-height:1.7;color:#1c2b36;}
@media(max-width:700px){.letterpaper{padding:30px 22px;}}
.lp-head{margin-bottom:22px;}
.lp-name{font-size:26px;font-weight:700;}
.lp-contact{font-size:12.5px;color:#5c6b75;margin-top:4px;}
.lp-date{font-size:13.5px;margin-bottom:20px;}
.lp-body p{margin-bottom:14px;font-size:14.5px;}
.lp-body:focus-visible{outline:2px dashed var(--mango);outline-offset:8px;}
.lp-greet{font-weight:500;}
.lp-sign{margin-top:26px;font-size:14.5px;}
.lp-signname{font-weight:700;margin-top:34px;}
/* Classic — serif, centred head, rule */
.letterpaper.classic{font-family:Georgia,'Times New Roman',serif;}
.letterpaper.classic .lp-head{text-align:center;border-bottom:1.5px solid #1c2b36;padding-bottom:16px;}
.letterpaper.classic .lp-name{letter-spacing:.02em;}
/* Elegant — Outfit, left, thin accent rule */
.letterpaper.elegant .lp-head{border-left:4px solid var(--mango);padding-left:16px;}
.letterpaper.elegant .lp-name{font-weight:600;letter-spacing:.01em;}
/* Bold — navy banner head */
.letterpaper.bold{padding-top:0;overflow:hidden;}
.letterpaper.bold .lp-head{background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;
  margin:0 -58px 24px;padding:30px 58px 22px;}
@media(max-width:700px){.letterpaper.bold .lp-head{margin:0 -22px 20px;padding:22px;}}
.letterpaper.bold .lp-contact{color:#CFE0EE;}
@media print{
  body{background:#fff!important;}
  .brandbar,.footer,h2.page,.sub,.edit-hint,.no-print{display:none!important;}
  .wrap{padding:0;max-width:none;}
  .letterpaper{box-shadow:none;border-radius:0;padding:10mm 6mm;}
  .ph{background:none;color:inherit;}
}
`;
