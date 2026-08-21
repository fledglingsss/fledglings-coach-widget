/* /cover-letter — the Cover Letter Studio. The learner pastes the job
 * advert (plus optionally their real CV), and Fledge drafts a letter
 * WITH them under the no-fabrication law: nothing claimed their CV
 * doesn't say, [brackets] for everything only they can write. Three
 * letter designs, editable in place, copy or print — never stored. */

import { appShell } from "./pages";

/* Sample letter rendered inside each design thumbnail — the miniature
 * IS the real template, scaled, so what you pick is what you print. */
const CL_SAMPLE_BODY =
  "<div class='lp-head'><div class='lp-name'>Alex Morgan</div>" +
  "<div class='lp-contact'>alex@example.com · 07000 000000 · Leeds</div></div>" +
  "<div class='lp-date'>14 August 2026</div>" +
  "<div class='lp-body'><p class='lp-greet'>Dear [Hiring manager's name],</p>" +
  "<p>I'd like to be considered for the [role] at [company]. A year of weekend " +
  "volunteering on a busy till has taught me how to stay calm, keep a queue moving " +
  "and make every customer feel dealt with properly.</p>" +
  "<p>At the community shop I served 50+ customers a shift and reorganised the " +
  "donation area, halving sorting time. [One sentence on why this company.]</p>" +
  "<p>I'd love the chance to bring that reliability to your team.</p></div>" +
  "<div class='lp-sign'><div>Yours sincerely,</div><div class='lp-signname'>Alex Morgan</div></div>";

const CL_DESIGNS: Array<{ id: string; label: string; blurb: string }> = [
  { id: "classic", label: "Classic", blurb: "Timeless serif with a centred heading — quietly confident, suits every application." },
  { id: "elegant", label: "Elegant", blurb: "Clean modern lines and plenty of air — leaves a considered impression." },
  { id: "bold", label: "Bold", blurb: "A navy header that makes your name land first. For standing out on purpose." },
];

function clDesignCards(scope: string): string {
  return (
    `<div class='designgrid'>` +
    CL_DESIGNS.map(
      (d) =>
        `<div class='dcard${d.id === "classic" ? " on" : ""}' data-clcard='${d.id}'>` +
        `<div class='dthumb' aria-hidden='true'><div class='dscale'>` +
        `<div class='letterpaper ${d.id}'>${CL_SAMPLE_BODY}</div></div></div>` +
        `<b>${d.label}</b><p>${d.blurb}</p>` +
        `<button type='button' class='btn clsel' data-tpl='${d.id}' data-scope='${scope}'>Select this design</button></div>`,
    ).join("") +
    "</div>"
  );
}

export function renderCoverLetterPage(): string {
  const body =
    "<main class='wrap' style='max-width:940px'>" +
    "<h2 class='page'>Cover Letter Studio</h2>" +
    "<p class='sub'>A cover letter that sounds like you — because it only says what you've genuinely done. " +
    "Fledge drafts it from the advert and your real CV, marks everything you should personalise in " +
    "<span class='ph' style='padding:1px 6px'>brackets</span>, and hands you the pen. Nothing is stored.</p>" +

    /* inputs — a guided three-step flow, one focus per screen */
    "<div id='s-in'>" +
    "<div class='clsteps no-print' aria-hidden='true'>" +
    "<span class='clstep on' id='cls-1' aria-current='step'><i>1</i>Who it's for</span><span class='clsep'></span>" +
    "<span class='clstep' id='cls-2'><i>2</i>The advert</span><span class='clsep'></span>" +
    "<span class='clstep' id='cls-3'><i>3</i>Your experience</span></div>" +
    /* step 1 */
    "<div class='card' id='st-1'>" +
    "<h3>✉️ Who's this letter for?</h3>" +
    "<p class='fieldtip' style='margin-bottom:6px'>Just the basics — the letter takes shape from here.</p>" +
    "<div class='ingrid'>" +
    "<div><label for='cl-role' style='margin-top:8px'>Job title</label>" +
    "<input type='text' id='cl-role' maxlength='80' placeholder='e.g. Retail assistant'></div>" +
    "<div><label for='cl-company' style='margin-top:8px'>Company</label>" +
    "<input type='text' id='cl-company' maxlength='80' placeholder='e.g. Shopmart'></div>" +
    "<div><label for='cl-name' style='margin-top:8px'>Your name <span class='opt'>(for the heading)</span></label>" +
    "<input type='text' id='cl-name' maxlength='60' placeholder='e.g. Sam Taylor'></div>" +
    "</div>" +
    "<div class='btnrow' style='margin-top:14px'><button type='button' class='btn' id='cl-n1'>Next: the advert →</button></div></div>" +
    /* step 2 */
    "<div class='card' id='st-2' hidden>" +
    "<h3>📋 Paste the advert</h3>" +
    "<p class='fieldtip' style='margin-bottom:10px'>The letter answers what the advert actually asks for — paste the " +
    "whole thing, requirements and all.</p>" +
    "<textarea id='cl-jd' rows='7' maxlength='3000' placeholder='Paste the job advert here…'></textarea>" +
    "<div id='cl-err2' class='drop-err' hidden>A few sentences of the advert at least — it is what the letter answers.</div>" +
    "<div class='btnrow' style='margin-top:14px'><button type='button' class='btn ghost' id='cl-b2'>← Back</button>" +
    "<button type='button' class='btn' id='cl-n2'>Next: your experience →</button></div></div>" +
    /* step 3 */
    "<div class='card' id='st-3' hidden>" +
    "<h3>📄 Ground it in your real experience</h3>" +
    "<p class='fieldtip' style='margin-bottom:10px'>Your CV is what keeps the letter honest — Fledge will only claim " +
    "what it actually says. Optional, but it makes the difference.</p>" +
    "<div class='cvrow'>" +
    "<div class='drop mini' id='cl-drop' tabindex='0' role='button' aria-label='Upload your CV PDF'>" +
    "<input type='file' id='cl-file' accept='.pdf,application/pdf' hidden>" +
    "<span id='cl-drop-t'>📄 Drop your CV PDF here or click to choose</span></div>" +
    "<details class='typefall'><summary>Or paste your CV as text</summary>" +
    "<textarea id='cl-cv' rows='5' maxlength='9000' placeholder='Paste your CV text here…'></textarea></details></div>" +
    "<div id='cl-err' class='drop-err' hidden></div>" +
    "<div class='btnrow' style='margin-top:16px'><button type='button' class='btn ghost' id='cl-b3'>← Back</button>" +
    "<button type='button' class='btn' id='cl-go'>✨ Draft my letter</button>" +
    "<span class='hero-note'>Up to 3 drafts a day — each is a starting point, not a finished letter.</span></div>" +
    "</div>" +
    "<div class='card'><h3>Choose a design</h3>" +
    "<p class='fieldtip' style='margin-bottom:12px'>Shown exactly as it prints — change it any time, before or after drafting.</p>" +
    clDesignCards("in") +
    "</div>" +
    "<div class='card' id='letters-card' hidden><h3>My letters</h3>" +
    "<p class='fieldtip' style='margin-bottom:10px'>Saved in this browser only — reopen, tweak and reprint any of them.</p>" +
    "<div id='letters-list'></div></div></div>" +

    /* analysing */
    "<div class='card centre' id='s-wait' hidden>" +
    "<div class='pulse' aria-hidden='true'><svg aria-hidden='true' focusable='false' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'/><line x1='16' y1='8' x2='2' y2='22'/><line x1='17.5' y1='15' x2='9' y2='15'/></svg></div>" +
    "<h3 id='waitmsg'>Drafting your letter…</h3>" +
    "<p class='sub' style='margin:6px 0 0'>Grounded in your real experience only. Usually under half a minute.</p></div>" +

    /* message */
    "<div class='card' id='s-msg' hidden><div class='result' id='msgtext'></div>" +
    "<div class='btnrow'><button type='button' class='btn ghost' id='msgback'>Back</button></div></div>" +

    /* result */
    "<div id='s-out' hidden>" +
    "<details class='card no-print cl-designs'><summary><h3 style='display:inline'>🎨 Switch design</h3>" +
    "<span class='fieldtip' style='display:inline;margin-left:10px'>your words stay exactly as edited</span></summary>" +
    "<div style='margin-top:14px'>" + clDesignCards("out") + "</div></details>" +
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
    /* No score is invented here — the tool drafts, it does not judge.
     * These are the checks that ARE real: deterministic, re-run live
     * as the learner edits, against what a first letter is expected
     * to do. */
    "<div class='card no-print' id='clchk-card'><h3>Send-ready checks <span class='badge' id='clchk-count'></span></h3>" +
    "<div id='clchk-list' role='status'></div>" +
    "<p class='rb-src'>The length band and name-the-employer rule come straight from National Careers Service " +
    "cover-letter guidance — the same advice careers advisers give, checked for you live.</p>" +
    "<p class='kw-note' style='margin:10px 0 0'>One rule this tool never breaks: the letter only uses what you told it. " +
    "Anything it could not know is a <mark class='ph'>[bracket]</mark> for you to fill — nothing is invented on your behalf.</p></div>" +
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
function stored(st,k){return flStoredId(st,k)}
var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');
var $=function(id){return document.getElementById(id)};
var params=new URLSearchParams(location.search);
var hubEmail=flResolveEmail();flIdentityInit(lid);
function show(id){['s-in','s-wait','s-msg','s-out'].forEach(function(k){$(k).hidden=k!==id});}
/* guided steps */
function clGo(n){[1,2,3].forEach(function(i){
$('st-'+i).hidden=i!==n;
var el=$('cls-'+i);el.className='clstep'+(i<n?' done':i===n?' on':'');
if(i===n)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');});
window.scrollTo({top:0,behavior:'smooth'});}
$('cl-n1').onclick=function(){clGo(2)};
$('cl-b2').onclick=function(){clGo(1)};
$('cl-n2').onclick=function(){
if($('cl-jd').value.trim().length<60){$('cl-err2').hidden=false;return;}
$('cl-err2').hidden=true;clGo(3);};
$('cl-b3').onclick=function(){clGo(2)};
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

/* design selection — one choice shared by both galleries, applied to
 * the letter whenever it exists */
var chosenTpl='classic';
function applyClTpl(t){chosenTpl=t;
document.querySelectorAll('[data-clcard]').forEach(function(c){
c.classList.toggle('on',c.dataset.clcard===t);});
if($('paper'))$('paper').className='letterpaper '+t;}
document.querySelectorAll('.clsel').forEach(function(b){b.addEventListener('click',function(){
applyClTpl(b.dataset.tpl);
var det=b.closest('details');if(det)det.open=false;});});

/* highlight [brackets] */
function markPh(text){return esc2(text).replace(/\[([^\]\n]{1,200})\]/g,"<mark class='ph'>[$1]</mark>");}

$('cl-go').addEventListener('click',function(){
var jd=$('cl-jd').value.trim();
if(jd.length<60){clErr('Paste a bit more of the job advert first — step 2 needs a few sentences at least.');clGo(2);return;}
clErr('');show('s-wait');
var pasted=$('cl-cv').value.trim();
fetch('/api/cover-letter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
learner_id:lid,session_id:sid,jd:jd,cv_text:(pasted||cvText).slice(0,9000),
role:$('cl-role').value,company:$('cl-company').value,token:flToken()})})
.then(function(r){return r.json()}).then(function(d){
if(d&&d.draft){renderLetter(d.draft);show('s-out');window.scrollTo({top:0,behavior:'smooth'});return;}
$('msgtext').textContent=(d&&d.reply)||'Something went wrong — try again in a minute.';show('s-msg');})
.catch(function(){$('msgtext').textContent='Could not reach Fledge — try again in a minute.';show('s-msg');});});

/* ---- local letter library (browser only, never uploaded) ---- */
var LKEY='fl_letters_v1';
function lettersAll(){try{var d=JSON.parse(localStorage.getItem(LKEY)||'{}');return Array.isArray(d.letters)?d.letters:[]}catch(e){return []}}
function lettersSave(list){try{localStorage.setItem(LKEY,JSON.stringify({letters:list.slice(0,20)}))}catch(e){}}
function saveLetter(draft){var list=lettersAll();
list.unshift({id:Math.random().toString(16).slice(2),at:Date.now(),
role:$('cl-role').value.trim(),company:$('cl-company').value.trim(),
name:$('cl-name').value.trim(),tpl:chosenTpl,draft:draft});
lettersSave(list);renderLetterList();}
function renderLetterList(){var list=lettersAll();
$('letters-card').hidden=list.length===0;
$('letters-list').innerHTML=list.map(function(l){
return "<div class='letteritem'><div class='li-main'><b>"+esc2([l.role,l.company].filter(Boolean).join(' · ')||'Cover letter')+"</b>"+
"<span>"+new Date(l.at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+"</span></div>"+
"<button type='button' class='btn' data-openl='"+l.id+"'>Open</button>"+
"<button type='button' class='btn ghost' data-dell='"+l.id+"'>Delete</button></div>"}).join('');
document.querySelectorAll('[data-openl]').forEach(function(b){b.onclick=function(){
var l=lettersAll().find(function(x){return x.id===b.dataset.openl});if(!l)return;
$('cl-role').value=l.role||'';$('cl-company').value=l.company||'';$('cl-name').value=l.name||'';
applyClTpl(l.tpl||'classic');renderLetter(l.draft,true);show('s-out');window.scrollTo({top:0});};});
document.querySelectorAll('[data-dell]').forEach(function(b){b.onclick=function(){
if(!confirm('Delete this letter?'))return;
lettersSave(lettersAll().filter(function(x){return x.id!==b.dataset.dell}));renderLetterList();};});}
renderLetterList();

function clWordCount(){return ($('lp-body').innerText||'').trim().split(/\s+/).filter(Boolean).length}
function clChecks(){
var body=($('lp-body').innerText||'');var low=body.toLowerCase();
var role=$('cl-role').value.trim().toLowerCase(),co=$('cl-company').value.trim().toLowerCase();
var named=(role&&low.indexOf(role)>-1)||(co&&low.indexOf(co)>-1);
var words=clWordCount();
var lenOk=words>=120&&words<=350;
var lenNote=words<120?words+' words — a first letter usually needs 120+ to land an example':
words>350?words+' words — over ~350 stops getting read; trim to your strongest example':
words+' words — right length for a skim-read';
var ph=(body.match(/\[[^\]\n]{1,200}\]/g)||[]).length;
var rows=[
{ok:named,label:'Named for the job',note:named?'Mentions '+esc2((role&&low.indexOf(role)>-1)?$('cl-role').value.trim():$('cl-company').value.trim()):'Neither the role nor the company you gave appears — add one so it cannot read as sent-to-everyone'},
{ok:lenOk,label:'Right length',note:lenNote},
{ok:ph===0,label:'Placeholders filled',note:ph===0?'Nothing left to fill in':ph+' [bracket]'+(ph===1?'':'s')+' still to replace with your own detail'}];
var done=rows.filter(function(r){return r.ok}).length;
$('clchk-count').textContent=done+' of '+rows.length;
$('clchk-list').innerHTML=rows.map(function(r){
return "<div class='clchk"+(r.ok?' ok':'')+"'><span class='clchk-i'>"+(r.ok?'✓':'✎')+"</span>"+
"<div><b>"+r.label+"</b><span class='clchk-n'>"+r.note+"</span></div></div>"}).join('');}
function renderLetter(d,skipSave){
var name=$('cl-name').value.trim()||'[Your name]';
$('lp-name').textContent=name;$('lp-signname').textContent=name;
$('lp-date').textContent=new Date().toLocaleDateString('en-GB',{day:'numeric',month:'long',year:'numeric'});
var html="<p class='lp-greet'>"+markPh(d.greeting)+"</p>";
d.paragraphs.forEach(function(p){html+="<p>"+markPh(p)+"</p>"});
$('lp-body').innerHTML=html;
$('lp-signoff').textContent=d.signoff;
$('pers-card').hidden=d.personalise.length===0;
$('pers-list').innerHTML=d.personalise.map(function(x){return "<li><span class='tick' style='color:#B93A22'>✎</span>"+markPh(x)+"</li>"}).join('');
$('tips-card').hidden=d.tips.length===0;
$('tips-list').innerHTML=d.tips.map(function(x){return "<li><span class='tick'>✓</span>"+esc2(x)+"</li>"}).join('');
clChecks();
if(!skipSave)saveLetter(d);}
$('lp-body').addEventListener('input',function(){clChecks()});

$('copybtn').addEventListener('click',function(){
var parts=[$('lp-name').textContent,'',$('lp-date').textContent,'',$('lp-body').innerText.trim(),'',
$('lp-signoff').textContent,$('lp-signname').textContent];
var text=parts.join('\n').replace(/\n{3,}/g,'\n\n');
(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(text):Promise.reject())
.then(function(){$('copybtn').textContent='Copied ✓';setTimeout(function(){$('copybtn').textContent='Copy letter text'},1600);})
.catch(function(){$('copybtn').textContent='Select and copy manually';});});
$('againbtn').addEventListener('click',function(){show('s-in');clGo(1);window.scrollTo({top:0})});
$('msgback').addEventListener('click',function(){show('s-in')});
document.querySelectorAll('.fbbtn').forEach(function(b){b.onclick=function(){
fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,tool:'cover',helpful:b.dataset.fb==='1'})}).catch(function(){});
$('fbrow').textContent='Thanks — that helps Fledge improve.';};});
/* QA hook: render a drafted letter without a model call. */
window.__flClRender=function(d){renderLetter(d,true);show('s-out');};
})();`;

const COVER_LETTER_CSS = `
.ingrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;}
@media(max-width:760px){.ingrid{grid-template-columns:1fr;}}
.cvrow{margin-top:4px;}
.drop.mini{border:2px dashed var(--blue);border-radius:12px;padding:16px;text-align:center;cursor:pointer;
  background:rgba(19,80,127,.04);font-size:13.5px;font-weight:600;color:var(--blue);transition:border-color .15s;}
.drop.mini:hover,.drop.mini.over{border-color:#B93A22;background:rgba(217,69,43,.06);}
.drop.mini:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.drop-err{color:#B93A22;font-weight:600;font-size:13.5px;margin-top:10px;}
.typefall{margin-top:10px;font-size:13.5px;color:var(--blue);}
.typefall summary{cursor:pointer;font-weight:600;}
.typefall textarea{margin-top:10px;}
.hero-note{font-size:12.5px;color:#616A71;align-self:center;}
.centre{text-align:center;padding:40px 22px;}
.pulse{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#A66633,#B93A22);animation:flPulse 1.6s ease-in-out infinite;}
.pulse svg{width:30px;height:30px;}
@keyframes flPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(217,69,43,.35)}
  50%{transform:scale(1.07);box-shadow:0 0 0 16px rgba(217,69,43,0)}}
.fieldtip{font-size:12.5px;color:var(--blue);line-height:1.5;}
.clsteps{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.clstep{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#616A71;
  background:#fff;border:1.5px solid var(--line,#E3DDDA);border-radius:999px;padding:7px 14px;}
.clstep i{width:20px;height:20px;border-radius:50%;background:var(--off,#ECE7E6);color:#616A71;font-style:normal;
  display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;}
.clstep.on{color:var(--navy);border-color:var(--mango);}
.clstep.on i{background:linear-gradient(135deg,#A66633,#B93A22);color:#fff;}
.clstep.done{color:var(--navy);}
.clstep.done i{background:#1A7649;color:#fff;}
.clsep{flex:none;width:22px;border-top:2px dashed #C9C1BD;}
.designgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;}
.dcard{display:flex;flex-direction:column;gap:7px;border:1.5px solid var(--line,#E3DDDA);border-radius:16px;padding:13px;
  background:#fff;transition:transform .12s,border-color .12s,box-shadow .12s;}
.dcard:hover{transform:translateY(-3px);border-color:#B93A22;box-shadow:0 14px 30px -14px rgba(5,37,60,.3);}
.dcard.on{border-color:#B93A22;box-shadow:0 0 0 2px rgba(217,69,43,.18);}
.dcard b{font-size:14.5px;}
.dcard p{font-size:12px;color:#616A71;line-height:1.5;flex:1;margin:0;}
.dthumb{width:100%;height:280px;overflow:hidden;border:1px solid var(--line,#E3DDDA);border-radius:10px;background:#fff;position:relative;}
.dscale{width:700px;transform:scale(.31);transform-origin:top left;}
.dthumb .letterpaper{box-shadow:none;border-radius:0;width:700px;margin:0;padding:44px 50px;pointer-events:none;}
.dthumb .letterpaper.bold{padding-top:0;}
.dthumb::after{content:'';position:absolute;inset:0;}
.clsel{padding:10px 16px;min-height:40px;font-size:13px;}
.cl-designs summary{cursor:pointer;list-style:none;}
.cl-designs summary::-webkit-details-marker{display:none;}
.letteritem{display:flex;align-items:center;gap:12px;border:1.5px solid var(--line,#E3DDDA);border-radius:14px;
  padding:12px 16px;margin-bottom:10px;}
.li-main{flex:1;min-width:0;}
.li-main b{display:block;font-size:14px;}
.li-main span{font-size:12px;color:#616A71;}
.letteritem .btn{padding:8px 14px;min-height:36px;font-size:13px;}
.ph{background:#FCEBD9;color:#9F5B13;border-radius:4px;padding:0 3px;font-weight:600;}
.clchk{display:flex;gap:10px;align-items:flex-start;padding:9px 10px;border-radius:10px;font-size:13px;}
.clchk+.clchk{margin-top:4px;}
.clchk.ok{background:#F1F7F3;}
.clchk-i{flex:none;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;
  font-size:12px;font-weight:800;background:#FCEBD9;color:#9F5B13;}
.clchk.ok .clchk-i{background:#1A7649;color:#fff;}
.clchk b{display:block;font-size:13px;color:var(--navy);}
.clchk-n{font-size:12.5px;color:var(--mut);line-height:1.5;}
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
