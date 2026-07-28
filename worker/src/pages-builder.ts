/* /builder — the Resume Builder. Everything lives in the learner's
 * browser (localStorage): multiple CVs, autosave, a live preview in
 * two print-ready designs, and an instant deterministic "recruiter
 * check" score (no model, no upload — the worker assembles the text,
 * checks it, forgets it). One tap sends the finished CV into the full
 * AI review at /tools. */

import { appShell, esc } from "./pages";
import { CV_STARTERS } from "./lib/builder";

export function renderBuilderPage(): string {
  const starterCards =
    "<button type='button' class='startcard' data-starter=''><b>Blank CV</b>" +
    "<p>Start from nothing — just the guided sections and tips.</p>" +
    "<span class='startgo'>Start blank →</span></button>" +
    CV_STARTERS.map(
      (s) =>
        `<button type='button' class='startcard' data-starter='${s.id}'>` +
        `<span class='tagats'>ATS-ready example</span><b>${esc(s.label)}</b>` +
        `<p>${esc(s.blurb)}</p><span class='startgo'>Use this →</span></button>`,
    ).join("");
  const startersJson = JSON.stringify(
    Object.fromEntries(CV_STARTERS.map((s) => [s.id, { label: s.label, data: s.data }])),
  );
  const body =
    "<main class='wrap' style='max-width:1080px'>" +
    "<h2 class='page'>Resume Builder</h2>" +
    "<p class='sub'>Build a clean, ATS-safe CV from what you've genuinely done — school, volunteering, weekend " +
    "work all count. It saves in your browser as you type, scores itself instantly, and prints straight to PDF.</p>" +

    /* ---------- my CVs ---------- */
    "<div id='s-list'>" +
    "<div class='card'><div class='listhead'><h3>My CVs</h3>" +
    "<button type='button' class='btn' id='newcv'>+ Create a new CV</button></div>" +
    "<div id='cvlist' class='cvgrid'></div>" +
    "<p class='sub' style='font-size:12.5px;margin:14px 0 0'>Stored only in this browser — nothing is uploaded. " +
    "Clearing your browsing data clears your CVs, so download a PDF when you're happy.</p></div></div>" +

    /* ---------- starter picker ---------- */
    "<div id='s-pick' hidden><div class='card'>" +
    "<div class='listhead'><h3>Start from an ATS-ready example</h3>" +
    "<button type='button' class='btn ghost' id='pickback'>← My CVs</button></div>" +
    "<p class='fieldtip'>Pick the track closest to you — it opens a complete example CV that already passes the " +
    "recruiter checks, so you can see the standard. Then make every line true about <b>you</b>: the example names " +
    "and numbers are scaffolding to replace, never content to submit.</p>" +
    `<div class='startgrid'>${starterCards}</div></div></div>` +

    /* ---------- builder ---------- */
    "<div id='s-build' hidden>" +
    "<div class='exguard no-print' id='exguard' hidden>⚠️ <b>Example content is still in this CV.</b> Everything marked " +
    "<i>(example)</i> is scaffolding — swap it for your real experience before you download or send this anywhere. " +
    "Employers can tell, and your real story is the one that gets you hired.</div>" +
    "<div class='card buildbar no-print'>" +
    "<button type='button' class='btn ghost' id='backbtn'>← My CVs</button>" +
    "<input type='text' id='cvtitle' class='titlein' maxlength='40' aria-label='CV name'>" +
    "<span class='savestate' id='savestate'>Saved</span>" +
    "<span style='flex:1'></span>" +
    "<div class='tplmini'><button type='button' class='tplbtn on' data-tpl='classic'>Classic</button>" +
    "<button type='button' class='tplbtn' data-tpl='accent'>Accent</button></div>" +
    "<button type='button' class='btn quiet' id='checkbtn'>Check my CV</button>" +
    "<button type='button' class='btn' onclick='window.print()'>Download PDF</button>" +
    "</div>" +
    /* score panel */
    "<div class='card scorepanel no-print' id='scorepanel' hidden>" +
    "<div class='sp-head'><div class='ring2 small' id='b-ring'><div class='in'><div class='pc' id='b-score'>0</div><div class='lb'>CHECKS</div></div></div>" +
    "<div><h3 style='margin-bottom:4px'>Recruiter checks <span class='badge' id='b-count'></span></h3>" +
    "<p class='kw-note' style='margin:0'>Objective, rule-based — the things screening software judges before a human " +
    "reads a word. For the full AI review, send it to the CV review when you're done.</p></div>" +
    "<button type='button' class='btn' id='sendreview'>Send to full AI review →</button></div>" +
    "<div class='stale-note' id='stale-note' hidden>✎ You've edited since this check — run <b>Check my CV</b> again " +
    "for a fresh score before sending it on.</div>" +
    "<div id='b-checks'></div></div>" +
    /* form + preview */
    "<div class='buildgrid'>" +
    "<div class='formcol no-print'>" +
    "<div class='card'><h3>About you</h3>" +
    "<div class='fgrid'>" +
    "<div><label style='margin-top:0'>Full name</label><input type='text' data-f='name' maxlength='90'></div>" +
    "<div><label style='margin-top:0'>Town / city</label><input type='text' data-f='town' maxlength='90'></div>" +
    "<div><label>Phone</label><input type='text' data-f='phone' maxlength='30'></div>" +
    "<div><label>Email</label><input type='text' data-f='email' maxlength='80'></div>" +
    "<div style='grid-column:1/-1'><label>LinkedIn URL <span class='opt'>(optional)</span></label>" +
    "<input type='text' data-f='linkedin' maxlength='120' placeholder='linkedin.com/in/yourname'></div></div></div>" +
    "<div class='card'><h3>Personal statement</h3>" +
    "<p class='fieldtip'>Two or three lines: what you're doing now, what you're aiming for, and one thing that " +
    "proves you're serious. No clichés — say something only you could say.</p>" +
    "<textarea data-f='summary' rows='4' maxlength='700'></textarea></div>" +
    "<div class='card'><h3>Work &amp; volunteering</h3>" +
    "<p class='fieldtip'>Paid or not, it all counts: shops, sport, school events, caring for family. " +
    "One line per bullet — start with a doing word and add a number where you honestly can.</p>" +
    "<div id='exp-list'></div>" +
    "<button type='button' class='addbtn' id='addexp'>+ Add a role</button></div>" +
    "<div class='card'><h3>Education</h3><div id='edu-list'></div>" +
    "<button type='button' class='addbtn' id='addedu'>+ Add education</button></div>" +
    "<div class='card'><h3>Skills</h3>" +
    "<p class='fieldtip'>Comma-separated, specific beats generic: “till operation” beats “teamwork”.</p>" +
    "<textarea data-f='skills' rows='2' maxlength='600' placeholder='e.g. Till operation, Rota planning, Canva'></textarea></div>" +
    "<div class='card'><h3>Achievements &amp; extras</h3>" +
    "<p class='fieldtip'>One per line: awards, certificates, positions of responsibility, languages.</p>" +
    "<textarea data-f='extras' rows='3' maxlength='1200' placeholder='e.g. Duke of Edinburgh Bronze award'></textarea></div>" +
    "</div>" +
    /* live preview */
    "<div class='prevcol'><div class='cvpaper classic' id='paper'></div></div>" +
    "</div></div>" +

    "<p class='sub no-print' style='font-size:12.5px;margin-top:18px'>The builder never invents anything for you — " +
    "and neither should you. Real, small and specific beats impressive and vague, every time.</p>" +
    "</main>" +
    "<script>var FL_STARTERS=" + startersJson + ";</script>" +
    "<script>" + BUILDER_JS + "</script>";

  return appShell({
    title: "Fledglings — Resume Builder",
    active: "builder",
    bodyHtml: body,
    extraCss: BUILDER_CSS,
  });
}

const BUILDER_JS = String.raw`(function(){
function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}
var lid=stored(localStorage,'fl_coach_learner_v1');
var $=function(id){return document.getElementById(id)};
/* Escapes quotes too — builder values are interpolated into HTML
 * attributes, not just text nodes. */
function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
var params=new URLSearchParams(location.search);
flResolveEmail();flIdentityChip();

/* ---------------- storage ---------------- */
var KEY='fl_builder_cvs_v1';
function loadAll(){try{var d=JSON.parse(localStorage.getItem(KEY)||'{}');return Array.isArray(d.cvs)?d.cvs:[]}catch(e){return []}}
function saveAll(cvs){try{localStorage.setItem(KEY,JSON.stringify({cvs:cvs}))}catch(e){}}
function blankCv(){return {name:'',phone:'',email:'',town:'',linkedin:'',summary:'',
experience:[blankExp()],education:[blankEdu()],skills:'',extras:''}}
function blankExp(){return {role:'',org:'',location:'',from:'',to:'',bullets:''}}
function blankEdu(){return {school:'',quals:'',from:'',to:'',detail:''}}
var cvs=loadAll(),current=null,saveTimer=null;

/* ---------------- my CVs list ---------------- */
function renderList(){var out='';
if(!cvs.length){out="<div class='cvempty'>No CVs yet — create your first one. It takes about ten minutes.</div>";}
cvs.forEach(function(c){out+="<div class='cvitem'><div class='cvi-name'>"+esc2(c.title||'Untitled CV')+"</div>"+
"<div class='cvi-meta'>Updated "+new Date(c.updated).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+"</div>"+
"<div class='cvi-btns'><button type='button' class='btn' data-open='"+c.id+"'>Open</button>"+
"<button type='button' class='btn ghost' data-copy='"+c.id+"'>Duplicate</button>"+
"<button type='button' class='btn ghost' data-del='"+c.id+"'>Delete</button></div></div>";});
$('cvlist').innerHTML=out;
document.querySelectorAll('[data-open]').forEach(function(b){b.onclick=function(){openCv(b.dataset.open)}});
document.querySelectorAll('[data-copy]').forEach(function(b){b.onclick=function(){
var src=cvs.find(function(c){return c.id===b.dataset.copy});if(!src)return;
var copy=JSON.parse(JSON.stringify(src));copy.id=Math.random().toString(16).slice(2);
copy.title=(src.title||'Untitled CV')+' (copy)';copy.updated=Date.now();cvs.unshift(copy);saveAll(cvs);renderList();}});
document.querySelectorAll('[data-del]').forEach(function(b){b.onclick=function(){
if(!confirm('Delete this CV? This cannot be undone.'))return;
cvs=cvs.filter(function(c){return c.id!==b.dataset.del});saveAll(cvs);renderList();}});}
/* Create flow: pick an ATS-ready starter (or blank) first. */
$('newcv').onclick=function(){$('s-list').hidden=true;$('s-pick').hidden=false;window.scrollTo({top:0});};
$('pickback').onclick=function(){$('s-pick').hidden=true;$('s-list').hidden=false;};
/* A starter seed (arrays) becomes the form model (textarea strings). */
function seedToModel(seed){var d=blankCv();
d.summary=seed.summary||'';
d.experience=(seed.experience||[]).map(function(e){return {role:e.role||'',org:e.org||'',location:e.location||'',
from:e.from||'',to:e.to||'',bullets:(e.bullets||[]).join('\n')};});
if(!d.experience.length)d.experience=[blankExp()];
d.education=(seed.education||[]).map(function(e){return {school:e.school||'',quals:e.quals||'',
from:e.from||'',to:e.to||'',detail:e.detail||''};});
if(!d.education.length)d.education=[blankEdu()];
d.skills=(seed.skills||[]).join(', ');
d.extras=(seed.extras||[]).join('\n');
return d;}
document.querySelectorAll('.startcard').forEach(function(b){b.onclick=function(){
var sid=b.dataset.starter;var title='My CV';var data;
if(sid&&FL_STARTERS[sid]){title=FL_STARTERS[sid].label+' CV';data=seedToModel(FL_STARTERS[sid].data);}
else{data=blankCv();}
var c={id:Math.random().toString(16).slice(2),title:title,updated:Date.now(),data:data};
cvs.unshift(c);saveAll(cvs);openCv(c.id);};});
function openCv(id){current=cvs.find(function(c){return c.id===id});if(!current)return;
$('cvtitle').value=current.title||'My CV';
$('s-list').hidden=true;$('s-pick').hidden=true;$('s-build').hidden=false;
bindStatics();renderEntries();renderPreview();$('scorepanel').hidden=true;window.scrollTo({top:0});}
$('backbtn').onclick=function(){$('s-build').hidden=true;$('s-list').hidden=false;renderList();};

/* ---------------- form binding ---------------- */
function markSaved(state){$('savestate').textContent=state;}
function scheduleSave(){markSaved('Saving…');if(saveTimer)clearTimeout(saveTimer);
/* Any edit invalidates the last check — the score shown and the text
 * queued for the full review must never silently go stale. */
lastText='';if(!$('scorepanel').hidden)$('stale-note').hidden=false;
saveTimer=setTimeout(function(){current.updated=Date.now();saveAll(cvs);markSaved('Saved')},500);}
function bindStatics(){document.querySelectorAll('[data-f]').forEach(function(el){
el.value=current.data[el.dataset.f]||'';
el.oninput=function(){current.data[el.dataset.f]=el.value;renderPreview();scheduleSave();};});
$('cvtitle').oninput=function(){current.title=$('cvtitle').value;scheduleSave();};}
function entryHtml(kind,i,e){
if(kind==='exp'){return "<div class='entry'><div class='e-head'>Role "+(i+1)+
"<button type='button' class='e-del' data-delexp='"+i+"'>remove</button></div>"+
"<div class='fgrid'>"+
"<div><label style='margin-top:0'>Job / role title</label><input type='text' data-exp='"+i+"' data-k='role' value=\""+esc2(e.role)+"\" maxlength='90'></div>"+
"<div><label style='margin-top:0'>Organisation</label><input type='text' data-exp='"+i+"' data-k='org' value=\""+esc2(e.org)+"\" maxlength='90'></div>"+
"<div><label>Location</label><input type='text' data-exp='"+i+"' data-k='location' value=\""+esc2(e.location)+"\" maxlength='90'></div>"+
"<div class='dr'><div><label>From</label><input type='text' data-exp='"+i+"' data-k='from' value=\""+esc2(e.from)+"\" maxlength='20' placeholder='Jun 2025'></div>"+
"<div><label>To</label><input type='text' data-exp='"+i+"' data-k='to' value=\""+esc2(e.to)+"\" maxlength='20' placeholder='Present'></div></div></div>"+
"<label>What you did — one bullet per line</label>"+
"<textarea data-exp='"+i+"' data-k='bullets' rows='3' maxlength='1800' placeholder='Served 40+ customers per shift on the till'>"+esc2(e.bullets)+"</textarea></div>";}
return "<div class='entry'><div class='e-head'>Education "+(i+1)+
"<button type='button' class='e-del' data-deledu='"+i+"'>remove</button></div>"+
"<div class='fgrid'>"+
"<div><label style='margin-top:0'>School / college</label><input type='text' data-edu='"+i+"' data-k='school' value=\""+esc2(e.school)+"\" maxlength='90'></div>"+
"<div class='dr'><div><label style='margin-top:0'>From</label><input type='text' data-edu='"+i+"' data-k='from' value=\""+esc2(e.from)+"\" maxlength='20'></div>"+
"<div><label style='margin-top:0'>To</label><input type='text' data-edu='"+i+"' data-k='to' value=\""+esc2(e.to)+"\" maxlength='20'></div></div></div>"+
"<label>Qualifications</label><input type='text' data-edu='"+i+"' data-k='quals' value=\""+esc2(e.quals)+"\" maxlength='200' placeholder='GCSEs: English (6), Maths (5)…'>"+
"<label>Anything notable <span class='opt'>(optional)</span></label>"+
"<input type='text' data-edu='"+i+"' data-k='detail' value=\""+esc2(e.detail)+"\" maxlength='200' placeholder='e.g. Prefect, football team captain'></div>";}
function renderEntries(){
$('exp-list').innerHTML=current.data.experience.map(function(e,i){return entryHtml('exp',i,e)}).join('');
$('edu-list').innerHTML=current.data.education.map(function(e,i){return entryHtml('edu',i,e)}).join('');
document.querySelectorAll('[data-exp]').forEach(function(el){el.oninput=function(){
current.data.experience[parseInt(el.dataset.exp,10)][el.dataset.k]=el.value;renderPreview();scheduleSave();};});
document.querySelectorAll('[data-edu]').forEach(function(el){el.oninput=function(){
current.data.education[parseInt(el.dataset.edu,10)][el.dataset.k]=el.value;renderPreview();scheduleSave();};});
document.querySelectorAll('[data-delexp]').forEach(function(b){b.onclick=function(){
current.data.experience.splice(parseInt(b.dataset.delexp,10),1);renderEntries();renderPreview();scheduleSave();};});
document.querySelectorAll('[data-deledu]').forEach(function(b){b.onclick=function(){
current.data.education.splice(parseInt(b.dataset.deledu,10),1);renderEntries();renderPreview();scheduleSave();};});}
$('addexp').onclick=function(){if(current.data.experience.length>=8)return;
current.data.experience.push(blankExp());renderEntries();scheduleSave();};
$('addedu').onclick=function(){if(current.data.education.length>=8)return;
current.data.education.push(blankEdu());renderEntries();scheduleSave();};

/* ---------------- structured payload ---------------- */
function lines(t){return String(t||'').split('\n').map(function(l){return l.trim()}).filter(Boolean)}
function payload(){var d=current.data;
return {name:d.name,phone:d.phone,email:d.email,town:d.town,linkedin:d.linkedin,summary:d.summary,
experience:d.experience.map(function(e){return {role:e.role,org:e.org,location:e.location,from:e.from,to:e.to,bullets:lines(e.bullets)}}),
education:d.education.map(function(e){return {school:e.school,quals:e.quals,from:e.from,to:e.to,detail:e.detail}}),
skills:String(d.skills||'').split(',').map(function(s){return s.trim()}).filter(Boolean),
extras:lines(d.extras)};}

/* ---------------- live preview ---------------- */
function renderPreview(){var d=payload();var h='';
h+="<div class='cp-head'><div class='cp-name'>"+(esc2(d.name)||'Your Name')+"</div>";
var contact=[d.town,d.phone,d.email,d.linkedin].filter(Boolean).map(esc2).join(' · ');
h+="<div class='cp-contact'>"+(contact||'town · phone · email')+"</div></div>";
if(d.summary)h+="<div class='cp-sec'><h4>Personal statement</h4><p>"+esc2(d.summary)+"</p></div>";
if(d.experience.some(function(e){return e.role||e.org||e.bullets.length})){
h+="<div class='cp-sec'><h4>Work &amp; volunteering</h4>";
d.experience.forEach(function(e){if(!(e.role||e.org||e.bullets.length))return;
h+="<div class='cp-entry'><div class='cp-row'><b>"+esc2([e.role,e.org].filter(Boolean).join(' — '))+"</b>"+
"<span>"+esc2([e.from,e.to].filter(Boolean).join(' – '))+"</span></div>";
if(e.location)h+="<div class='cp-loc'>"+esc2(e.location)+"</div>";
if(e.bullets.length)h+="<ul>"+e.bullets.map(function(b){return "<li>"+esc2(b)+"</li>"}).join('')+"</ul>";
h+="</div>";});h+="</div>";}
if(d.education.some(function(e){return e.school||e.quals})){
h+="<div class='cp-sec'><h4>Education</h4>";
d.education.forEach(function(e){if(!(e.school||e.quals))return;
h+="<div class='cp-entry'><div class='cp-row'><b>"+esc2(e.school)+"</b><span>"+esc2([e.from,e.to].filter(Boolean).join(' – '))+"</span></div>"+
(e.quals?"<div>"+esc2(e.quals)+"</div>":"")+(e.detail?"<div class='cp-loc'>"+esc2(e.detail)+"</div>":"")+"</div>";});h+="</div>";}
if(d.skills.length)h+="<div class='cp-sec'><h4>Skills</h4><p>"+d.skills.map(esc2).join(' · ')+"</p></div>";
if(d.extras.length)h+="<div class='cp-sec'><h4>Achievements &amp; extras</h4><ul>"+d.extras.map(function(x){return "<li>"+esc2(x)+"</li>"}).join('')+"</ul></div>";
$('paper').innerHTML=h;
/* The replace-me guard: visible while any example scaffolding remains. */
$('exguard').hidden=JSON.stringify(d).toLowerCase().indexOf('example')===-1;}
document.querySelectorAll('.tplbtn').forEach(function(b){b.onclick=function(){
document.querySelectorAll('.tplbtn').forEach(function(x){x.classList.remove('on')});b.classList.add('on');
$('paper').className='cvpaper '+b.dataset.tpl;};});

/* ---------------- checks ---------------- */
var lastText='';
$('checkbtn').onclick=function(){$('checkbtn').disabled=true;$('checkbtn').textContent='Checking…';
fetch('/api/builder-check',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,cv:payload()})})
.then(function(r){return r.json()}).then(function(d){
$('checkbtn').disabled=false;$('checkbtn').textContent='Check my CV';
if(!d||!d.checks){alert((d&&d.reply)||'Could not check just now — try again in a minute.');return;}
lastText=d.text||'';$('stale-note').hidden=true;
var col=d.score>=70?'#1B7A4B':d.score>=50?'#B96A16':'#D9452B';
$('b-score').textContent=d.score;$('b-score').style.color=col;
$('b-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(d.score*3.6)+'deg,#ECE7E6 '+Math.round(d.score*3.6)+'deg)';
$('b-count').textContent=d.checks.passed+' of '+d.checks.total+' passed';
var ck='';d.checks.groups.forEach(function(g){ck+="<div class='ck-g'>"+esc2(g.label)+"</div>";
g.items.forEach(function(c){var ic=c.status==='pass'?'✓':c.status==='warn'?'!':'✗';
ck+="<div class='ck "+c.status+"'><span class='ck-i'>"+ic+"</span><div><div class='ck-l'>"+esc2(c.label)+"</div>"+
"<div class='ck-d'>"+esc2(c.detail)+"</div>"+
(c.evidence?"<div class='ck-e'>“"+esc2(c.evidence)+"”</div>":"")+"</div></div>"});});
$('b-checks').innerHTML=ck;$('scorepanel').hidden=false;
$('scorepanel').scrollIntoView({behavior:'smooth',block:'start'});})
.catch(function(){$('checkbtn').disabled=false;$('checkbtn').textContent='Check my CV';
alert('Could not reach the checker — try again in a minute.');});};
$('sendreview').onclick=function(){
if(!lastText){alert('Run "Check my CV" first (or again after edits) — the review reads that exact text.');return;}
try{sessionStorage.setItem('fl_builder_cv_text',lastText)}catch(e){}
var q=['from=builder'];var ev=flEmailParam();if(ev)q.push('e='+ev);
location.href='/tools?'+q.join('&');};

renderList();
})();`;

const BUILDER_CSS = `
.listhead{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap;}
.listhead h3{margin-bottom:0;}
.cvgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;}
.cvempty{color:#8a97a1;font-size:14px;padding:18px 0;}
.cvitem{border:1.5px solid var(--off);border-radius:14px;padding:16px;}
.cvi-name{font-weight:700;font-size:15px;}
.cvi-meta{font-size:12px;color:#8a97a1;margin:4px 0 12px;}
.cvi-btns{display:flex;gap:8px;flex-wrap:wrap;}
.cvi-btns .btn{padding:8px 14px;min-height:36px;font-size:13px;}
.buildbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;position:sticky;top:8px;z-index:5;}
.titlein{max-width:200px;border:2px solid transparent;font-weight:700;font-size:15.5px;padding:8px 10px;}
.titlein:hover{border-color:var(--off);}
.savestate{font-size:12px;color:#8a97a1;}
.tplmini{display:flex;gap:6px;}
.tplbtn{border:1.5px solid var(--off);background:#fff;border-radius:999px;padding:8px 14px;font-family:inherit;
  font-size:12.5px;font-weight:700;color:var(--navy);cursor:pointer;}
.tplbtn.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.buildgrid{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start;}
@media(max-width:900px){.buildgrid{grid-template-columns:1fr;}}
.prevcol{position:sticky;top:86px;}
@media(max-width:900px){.prevcol{position:static;}}
.fgrid{display:grid;grid-template-columns:1fr 1fr;gap:0 14px;}
@media(max-width:560px){.fgrid{grid-template-columns:1fr;}}
.fgrid .dr{display:grid;grid-template-columns:1fr 1fr;gap:0 10px;}
.fieldtip{font-size:12.5px;color:var(--blue);line-height:1.5;margin-bottom:10px;}
.entry{border:1.5px solid var(--off);border-radius:14px;padding:14px 16px 16px;margin-bottom:12px;}
.e-head{display:flex;justify-content:space-between;align-items:center;font-size:12px;font-weight:800;
  letter-spacing:.08em;color:var(--blue);text-transform:uppercase;margin-bottom:8px;}
.e-del{border:none;background:none;color:#8a97a1;font-family:inherit;font-size:12px;font-weight:600;
  cursor:pointer;text-decoration:underline;}
.e-del:hover{color:var(--orange);}
.addbtn{border:2px dashed var(--blue);background:rgba(19,80,127,.04);border-radius:12px;padding:11px 18px;width:100%;
  font-family:inherit;font-size:13.5px;font-weight:700;color:var(--blue);cursor:pointer;}
.addbtn:hover{border-color:var(--orange);color:var(--orange);}
.scorepanel .sp-head{display:flex;gap:18px;align-items:center;flex-wrap:wrap;margin-bottom:6px;}
.scorepanel .sp-head>div:nth-child(2){flex:1;min-width:220px;}
.ring2{width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;}
.ring2.small{width:86px;height:86px;}
.ring2 .in{width:84px;height:84px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ring2.small .in{width:64px;height:64px;}
.ring2 .pc{font-size:26px;font-weight:800;line-height:1;}
.ring2.small .pc{font-size:21px;}
.ring2 .lb{font-size:8.5px;color:var(--blue);font-weight:700;letter-spacing:.06em;margin-top:2px;}
.kw-note{font-size:13px;color:var(--blue);line-height:1.55;}
.stale-note{background:#FBF0E2;border:1.5px solid #EAD3AE;border-radius:10px;padding:10px 14px;
  font-size:13px;color:#8a5b16;margin:10px 0 4px;}
.startgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;}
.startcard{position:relative;border:1.5px solid var(--line);border-radius:14px;padding:16px;background:#fff;
  font-family:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:6px;
  transition:transform .12s,border-color .12s,box-shadow .12s;}
.startcard:hover{transform:translateY(-2px);border-color:var(--orange);box-shadow:0 10px 22px -12px rgba(5,37,60,.3);}
.startcard:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.startcard b{font-size:14.5px;color:var(--navy);}
.startcard p{font-size:12.5px;color:var(--mut);line-height:1.5;flex:1;margin:0;}
.tagats{align-self:flex-start;background:#EFF7F1;color:#1B7A4B;border:1px solid #CBE3D3;border-radius:999px;
  padding:3px 10px;font-size:10.5px;font-weight:800;letter-spacing:.03em;}
.startgo{color:var(--orange);font-weight:700;font-size:12.5px;}
.exguard{background:#FCEFEC;border:1.5px solid #F0CFC7;border-radius:12px;padding:12px 16px;
  font-size:13px;line-height:1.55;color:#7a2f1f;margin-bottom:12px;}
.exguard i{font-style:normal;font-weight:700;}
.ck-g{font-size:12px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.07em;
  margin:16px 0 8px;border-bottom:2px solid var(--off);padding-bottom:4px;}
.ck{display:flex;gap:12px;padding:9px 0;}
.ck-i{width:24px;height:24px;border-radius:50%;font-weight:800;font-size:13px;flex:none;
  display:flex;align-items:center;justify-content:center;margin-top:1px;}
.ck.pass .ck-i{background:#E7F3EC;color:var(--ok);}
.ck.warn .ck-i{background:#FBF0E2;color:#B96A16;}
.ck.fail .ck-i{background:#FCE9E5;color:var(--orange);}
.ck-l{font-weight:700;font-size:14px;}
.ck-d{font-size:13px;color:#4a5b66;line-height:1.5;margin-top:2px;}
.ck-e{font-size:12.5px;color:#8a97a1;font-style:italic;margin-top:4px;border-left:3px solid var(--off);padding-left:10px;}
/* ------- CV paper ------- */
.cvpaper{background:#fff;border-radius:6px;box-shadow:0 6px 28px -10px rgba(5,37,60,.25);
  padding:38px 42px;line-height:1.55;color:#1c2b36;min-height:420px;font-size:13px;}
@media(max-width:900px){.cvpaper{padding:26px 22px;}}
.cp-head{margin-bottom:16px;}
.cp-name{font-size:24px;font-weight:700;}
.cp-contact{font-size:11.5px;color:#5c6b75;margin-top:3px;}
.cp-sec{margin-bottom:14px;}
.cp-sec h4{font-size:12px;letter-spacing:.09em;text-transform:uppercase;border-bottom:1.5px solid #1c2b36;
  padding-bottom:3px;margin-bottom:8px;}
.cp-entry{margin-bottom:10px;}
.cp-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;}
.cp-row span{color:#5c6b75;font-size:11.5px;white-space:nowrap;}
.cp-loc{font-size:11.5px;color:#5c6b75;}
.cp-sec ul{margin:4px 0 0 18px;}
.cp-sec li{margin-bottom:3px;}
/* Classic: serif headings; Accent: mango rule + Outfit */
.cvpaper.classic{font-family:Georgia,'Times New Roman',serif;}
.cvpaper.classic .cp-name{letter-spacing:.01em;}
.cvpaper.accent .cp-head{border-left:5px solid var(--mango);padding-left:14px;}
.cvpaper.accent .cp-sec h4{border-bottom-color:var(--mango);color:var(--blue);}
@media print{
  body{background:#fff!important;}
  .brandbar,.footer,h2.page,.sub,.no-print,.formcol{display:none!important;}
  .wrap{padding:0;max-width:none;}
  .buildgrid{display:block;}
  .cvpaper{box-shadow:none;border-radius:0;padding:8mm 4mm;min-height:0;}
}
`;
