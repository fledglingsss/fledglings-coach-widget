/* /builder - the Resume Builder, document-first. The learner types
 * straight onto the styled CV (contenteditable fields on the rendered
 * document - Enter adds a bullet, Backspace on an empty one removes
 * it, every line carries a live quality marker), with the Resume
 * Review sidebar alongside. Six structurally distinct designs -
 * five single-column ATS-safe, one two-column labelled in-person -
 * designs chosen from a gallery of real rendered miniatures.
 * Everything lives in the learner's browser (localStorage, autosave);
 * the worker only sees the sections when a check runs, and forgets
 * them. One tap sends the finished CV into the full AI review. */

import { appShell, esc } from "./pages";
import { CV_STARTERS } from "./lib/builder";

export function renderBuilderPage(): string {
  const starterCards =
    "<button type='button' class='startcard' data-starter=''><b>Blank CV</b>" +
    "<p>Start from nothing - placeholders guide every section.</p>" +
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
    "<main class='wrap' style='max-width:1180px'>" +
    "<h2 class='page'>Resume Builder</h2>" +
    "<p class='sub'>Type straight onto your CV - no forms, no boxes. Pick a design, click any line and write; " +
    "every bullet gets a live quality marker and the review updates as you go. Saved in your browser as you type, " +
    "prints straight to PDF.</p>" +

    /* ---------- my CVs ---------- */
    "<div id='s-list'>" +
    "<div class='card'><div class='listhead'><h3>My CVs</h3>" +
    "<button type='button' class='btn' id='newcv'>+ Create a new CV</button></div>" +
    "<div id='cvlist' class='cvgrid'></div>" +
    "<p class='sub' style='font-size:12.5px;margin:14px 0 0'>Stored only in this browser - nothing is uploaded. " +
    "Clearing your browsing data clears your CVs, so download a PDF when you're happy.</p></div></div>" +

    /* ---------- design gallery (real rendered miniatures) ---------- */
    "<div id='s-design' hidden><div class='card'>" +
    "<div class='listhead'><div><h3 style='margin-bottom:2px'>Choose a design</h3>" +
    "<p class='atsexplain'>Every design here is <b>ATS-safe</b> - that means it reads correctly in the software " +
    "most employers use to scan applications before a person sees them. Software like that gets confused by " +
    "columns, tables and text boxes, so all of these keep to a single flow. Pick whichever you like the look of.</p>" +
    "<p class='fieldtip' style='margin:0'>Six genuinely different layouts, all ATS-safe. " +
    "Change any time - your content never changes with the design.</p></div>" +
    "<button type='button' class='btn ghost' id='designback'>← Back</button></div>" +
    "<div class='designgrid' id='designgrid'></div></div></div>" +

    /* ---------- starter picker ---------- */
    "<div id='s-pick' hidden><div class='card'>" +
    "<div class='listhead'><h3>Choose your starting point</h3>" +
    "<button type='button' class='btn ghost' id='pickback'>← Design</button></div>" +
    "<p class='fieldtip'>An example start shows you the standard - then make every line true about <b>you</b>: " +
    "the example names and numbers are scaffolding to replace, never content to submit.</p>" +
    `<div class='startgrid'>${starterCards}</div></div></div>` +

    /* ---------- builder (document-first) ---------- */
    "<div id='s-build' hidden>" +
    "<div class='card buildbar no-print'>" +
    "<button type='button' class='btn ghost' id='backbtn'>← My CVs</button>" +
    "<input type='text' id='cvtitle' class='titlein' maxlength='40' aria-label='CV name'>" +
    "<span class='savestate' id='savestate'>Saved</span>" +
    "<span class='bb-gap'></span>" +
    "<button type='button' class='bb-score' id='bb-score' hidden>Score <b id='bb-score-n'>0</b> ↓</button>" +
    "<span class='cur-wrap'>🎨 <span class='cur-design' id='cur-design'>Classic</span></span>" +
    "<button type='button' class='btn ghost' id='switchdesign'>Switch design</button>" +
    "<button type='button' class='btn' onclick='window.print()'>Download PDF</button>" +
    "</div>" +
    "<div class='exguard no-print' id='exguard' hidden>⚠️ <b>Example content is still in this CV.</b> Everything marked " +
    "<i>(example)</i> is scaffolding - swap it for your real experience before you download or send this anywhere. " +
    "Employers can tell, and your real story is the one that gets you hired.</div>" +
    "<div class='docgrid'>" +
    /* review + tips rail */
    "<div class='revcol no-print'>" +
    "<div class='card revpanel' id='scorepanel' role='status' hidden>" +
    "<div class='rv-head'><div class='rv-t'>Resume Review</div>" +
    "<button type='button' class='rv-refresh' id='refreshbtn' aria-label='Re-check score' title='Re-check score'>⟳</button></div>" +
    "<div class='rv-scorerow'><span class='rv-score' id='b-score'>0</span><span class='rv-of'>/100</span>" +
    "<div class='rv-bar'><i id='rv-bar-i'></i></div></div>" +
    "<div class='rv-fair'>🛡️ Fair scoring - deterministic rules, the same result every run</div>" +
    "<div class='stale-note' id='stale-note' hidden>✎ Edited since the last check - tap ⟳ for a fresh score.</div>" +
    "<div id='rv-cats'></div>" +
    "<button type='button' class='btn rv-send' id='sendreview'>Send to full AI review →</button>" +
    "</div>" +
    "<div class='card tipscard'><h3>💡 Writing tips</h3><ul class='tipslist'>" +
    "<li><b>Everything counts.</b> Shops, sport, school events, caring for family - real proof beats a payslip.</li>" +
    "<li><b>Lead with a doing word.</b> Served, organised, trained - not “responsible for”.</li>" +
    "<li><b>Add a number.</b> How many, how often, how much - honestly.</li>" +
    "<li><b>Watch the markers.</b> ✓ strong line · ! could be stronger · ✗ weak opener.</li>" +
    "</ul></div>" +
    "</div>" +
    /* the editable document */
    "<div class='doccol'><div class='cvpaper classic' id='paper'></div></div>" +
    "</div></div>" +

    "<p class='sub no-print' style='font-size:12.5px;margin-top:18px'>The builder never invents anything for you - " +
    "and neither should you. Real, small and specific beats impressive and vague, every time.</p>" +
    "</main>" +
    "<script>var FL_STARTERS=" + startersJson + ";</script>" +
    "<script>" + BUILDER_JS + "</script>";

  return appShell({
    title: "Fledglings - Resume Builder",
    active: "builder",
    bodyHtml: body,
    extraCss: BUILDER_CSS,
  });
}

const BUILDER_JS = String.raw`(function(){
function stored(st,k){return flStoredId(st,k)}
var lid=stored(localStorage,'fl_coach_learner_v1');
var $=function(id){return document.getElementById(id)};
function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
var params=new URLSearchParams(location.search);
flIdentityInit(lid);

/* ---------------- storage ---------------- */
var KEY='fl_builder_cvs_v1';
function loadAll(){try{var d=JSON.parse(localStorage.getItem(KEY)||'{}');return Array.isArray(d.cvs)?d.cvs:[]}catch(e){return []}}
function saveAll(cvs){try{localStorage.setItem(KEY,JSON.stringify({cvs:cvs}));return true}catch(e){return false}}
function blankCv(){return {name:'',phone:'',email:'',town:'',linkedin:'',summary:'',
experience:[blankExp()],education:[blankEdu()],skills:'',extras:''}}
function blankExp(){return {role:'',org:'',location:'',from:'',to:'',bullets:''}}
function blankEdu(){return {school:'',quals:'',from:'',to:'',detail:''}}
var cvs=loadAll(),current=null,saveTimer=null,lastText='';

/* ---------------- my CVs list ---------------- */
function renderList(){var out='';
if(!cvs.length){out="<div class='cvempty'>No CVs yet - create your first one. It takes about ten minutes.</div>";}
cvs.forEach(function(c){out+="<div class='cvitem'><div class='cvi-name'>"+esc2(c.title||'Untitled CV')+"</div>"+
"<div class='cvi-meta'>"+esc2(designName(c.tpl||'classic'))+" · updated "+new Date(c.updated).toLocaleDateString('en-GB',{day:'numeric',month:'short'})+"</div>"+
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

/* ---------------- designs ---------------- */
/* ats:true = single-column flow that parses cleanly through screening
 * software. The Sidebar is the one true two-column layout, which many
 * parsers read out of order - the gallery says so instead of letting a
 * learner find out from a silent rejection. */
var DESIGNS=[
{id:'classic',label:'Classic',ats:true,blurb:'Traditional and safe. Your name centred at the top, classic lettering. Works for anything - pick this if you are unsure.'},
{id:'executive',label:'Executive',ats:true,blurb:'A navy banner across the top with your name and contact details inside it. Looks confident.'},
{id:'modern',label:'Modern',ats:true,blurb:'Modern and colourful. Big name, a stripe of colour, and your skills shown as small rounded tags.',
note:'Skills show as tags while you edit, and as a comma-separated line when you download - the form a parser reads best.'},
{id:'accent',label:'Monogram',ats:true,blurb:'Your initials in a circle beside a line of colour down the edge. Personal, still smart.'},
{id:'sidebar',label:'Sidebar',ats:true,blurb:'A coloured panel down one side holds your contact details and skills, with your history beside it.',
note:'Two columns on screen, one column when you download it - so a parser still reads your CV in the right order.'},
{id:'compact',label:'Ledger',ats:true,blurb:'Compact. Headings sit in a left-hand column so more fits on one page.',
note:'Headings sit beside each section on screen and above it when you download - so a parser reads every heading on its own line.'}];
var DESIGN_SAMPLE={name:'Alex Morgan',phone:'07000 000000',email:'alex@example.com',town:'Leeds',linkedin:'',
summary:'College student aiming for a first role, bringing a year of weekend volunteering and a habit of turning up early.',
experience:[{role:'Volunteer',org:'Community Shop',location:'Leeds',from:'Jun 2025',to:'Present',
bullets:['Served 50+ customers per shift on the till','Organised donations, halving sorting time']}],
education:[{school:'City College',quals:'GCSEs: English (6), Maths (5) - 8 subjects',from:'2021',to:'2026',detail:''}],
skills:['Till operation','Teamwork','Punctuality'],extras:['First aid basics course']};
var designMode='create',pendingTpl='classic';
function designName(id){var d=DESIGNS.find(function(x){return x.id===id});return d?d.label:'Classic';}
function renderDesignGallery(){var h='';
DESIGNS.forEach(function(d){
h+="<div class='dcard'><div class='dthumb' aria-hidden='true'><div class='dscale'>"+
"<div class='cvpaper "+d.id+"'>"+docHtml(DESIGN_SAMPLE,false)+"</div></div></div>"+
"<b>"+esc2(d.label)+" <span class='atsbadge ok' title='Reads correctly in the software employers use to scan applications'>ATS-safe</span>"+"</b><p>"+esc2(d.blurb)+
(d.note?" <span class='atsnote'>"+esc2(d.note)+"</span>":'')+"</p>"+
"<button type='button' class='btn dselect' data-design='"+d.id+"'>Select this design</button></div>";});
$('designgrid').innerHTML=h;
document.querySelectorAll('.dselect').forEach(function(b){b.onclick=function(){
var id=b.dataset.design;
if(designMode==='create'){pendingTpl=id;$('s-design').hidden=true;$('s-pick').hidden=false;window.scrollTo({top:0});}
else{applyTpl(id);if(current){current.tpl=id;scheduleSaveQuiet();}
$('s-design').hidden=true;$('s-build').hidden=false;window.scrollTo({top:0});}};});}
$('designback').onclick=function(){$('s-design').hidden=true;
if(designMode==='create'){$('s-list').hidden=false;}else{$('s-build').hidden=false;}};
$('switchdesign').onclick=function(){designMode='switch';renderDesignGallery();
$('s-build').hidden=true;$('s-design').hidden=false;window.scrollTo({top:0});};
function applyTpl(t){$('paper').className='cvpaper '+t;$('cur-design').textContent=designName(t);}

/* ---------------- create flow ---------------- */
$('newcv').onclick=function(){designMode='create';renderDesignGallery();
$('s-list').hidden=true;$('s-design').hidden=false;window.scrollTo({top:0});};
$('pickback').onclick=function(){$('s-pick').hidden=true;$('s-design').hidden=false;};
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
var c={id:Math.random().toString(16).slice(2),title:title,updated:Date.now(),tpl:pendingTpl,data:data};
cvs.unshift(c);saveAll(cvs);openCv(c.id);};});
/* Arriving from a review or the library with the words already in
 * hand (?from=text): parse them into sections on the worker - no
 * model, nothing kept - and open the editor on the result. Deferred a
 * tick so every var this script sets up is in place first. */
setTimeout(function(){if(!/[?&]from=text\b/.test(location.search))return;
var txt='';try{txt=flLibTakeHandoff()||''}catch(e){}
if(!txt||txt.length<40)return;
fetch('/api/builder-import',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,text:txt})})
.then(function(r){return r.json()}).then(function(d){if(!d||!d.seed)return;
var data=seedToModel(d.seed);
data.name=d.seed.name||'';data.phone=d.seed.phone||'';data.email=d.seed.email||'';data.linkedin=d.seed.linkedin||'';
var c={id:Math.random().toString(16).slice(2),title:'From my CV review',updated:Date.now(),tpl:pendingTpl,data:data};
cvs.unshift(c);saveAll(cvs);openCv(c.id);
try{history.replaceState(null,'',location.pathname)}catch(e){}}).catch(function(){});},0);
function openCv(id){current=cvs.find(function(c){return c.id===id});if(!current)return;
$('cvtitle').value=current.title||'My CV';
$('s-list').hidden=true;$('s-pick').hidden=true;$('s-design').hidden=true;$('s-build').hidden=false;
applyTpl(current.tpl||'classic');
renderDoc();$('scorepanel').hidden=true;$('bb-score').hidden=true;runCheck(true);window.scrollTo({top:0});}
$('backbtn').onclick=function(){$('s-build').hidden=true;$('s-list').hidden=false;renderList();};
$('cvtitle').oninput=function(){if(current){current.title=$('cvtitle').value;scheduleSaveQuiet();}};

/* ---------------- saving ---------------- */
function markSaved(state){$('savestate').textContent=state;}
var checkTimer=null;
function scheduleSave(){markSaved('Saving…');if(saveTimer)clearTimeout(saveTimer);
lastText='';if(!$('scorepanel').hidden)$('stale-note').hidden=false;
saveTimer=setTimeout(function(){current.updated=Date.now();
markSaved(saveAll(cvs)?'Saved':'⚠ Couldn’t save in this browser - download a PDF so you don’t lose it')},500);
/* Hiration-style: the review re-scores itself shortly after you stop
 * typing - deterministic and free, so no button-hunting needed. */
if(checkTimer)clearTimeout(checkTimer);
checkTimer=setTimeout(function(){runCheck(true)},2500);}
function scheduleSaveQuiet(){markSaved('Saving…');if(saveTimer)clearTimeout(saveTimer);
saveTimer=setTimeout(function(){current.updated=Date.now();
markSaved(saveAll(cvs)?'Saved':'⚠ Couldn’t save in this browser - download a PDF so you don’t lose it')},400);}

/* ---------------- structured payload ---------------- */
function lines(t){return String(t||'').split('\n').map(function(l){return l.trim()}).filter(Boolean)}
function payload(){var d=current.data;
return {name:d.name,phone:d.phone,email:d.email,town:d.town,linkedin:d.linkedin,summary:d.summary,
experience:d.experience.map(function(e){return {role:e.role,org:e.org,location:e.location,from:e.from,to:e.to,bullets:lines(e.bullets)}}),
education:d.education.map(function(e){return {school:e.school,quals:e.quals,from:e.from,to:e.to,detail:e.detail}}),
skills:String(d.skills||'').split(',').map(function(s){return s.trim()}).filter(Boolean),
extras:lines(d.extras)};}

/* ---------------- per-bullet quality marks ---------------- */
var MK_WEAK=/^(assisted|helped|worked on|was responsible for|responsible for|involved in|participated in|tasked with|duties included)\b/i;
var MK_ACTION=/^(led|built|created|designed|organised|organized|delivered|improved|increased|reduced|launched|ran|managed|taught|trained|raised|won|achieved|volunteered|founded|set up|coordinated|planned|presented|resolved|handled|served|greeted|maintained|supported|picked|packed|prepared|scanned|reported)\b/i;
function bulletMark(b){b=b.trim();
if(!b)return {c:'mk-off',i:'·',t:'Write the line first'};
var words=b.split(/\s+/).filter(Boolean).length;
if(MK_WEAK.test(b))return {c:'mk-bad',i:'✗',t:'Weak opener - lead with what YOU did'};
if(words>30)return {c:'mk-warn',i:'!',t:'Long - aim under 30 words'};
if(!MK_ACTION.test(b))return {c:'mk-warn',i:'!',t:'Start with a doing word'};
if(!/(\d|%|£)/.test(b))return {c:'mk-warn',i:'!',t:'Add a number that proves scale'};
return {c:'mk-ok',i:'✓',t:'Strong line'};}

/* ---------------- the document ----------------
 * One generator serves the editable document, the read-only gallery
 * miniatures and (via payload) the checks - so what you see is always
 * what gets scored and printed. Editable fields carry data-b paths;
 * structural controls (add/remove) are contenteditable=false islands. */
function ed(bind,cls,ph,val,tag){tag=tag||'span';
return "<"+tag+" class='"+cls+"' contenteditable='true' spellcheck='true' role='textbox' aria-label='"+esc2(ph)+"' data-b='"+bind+"' data-ph='"+esc2(ph)+"'>"+esc2(val||'')+"</"+tag+">";}
function docHtml(d,editable){
var E=editable;var h='';
var initials=((d.name||'').trim().split(/\s+/).map(function(w){return w.charAt(0)}).join('').slice(0,2).toUpperCase())||'??';
h+="<div class='cp-head'><span class='cp-mono' aria-hidden='true'><span class='mono-t'>"+esc2(initials)+"</span></span><div class='cp-headmain'>";
h+=E?ed('f:name','cp-name','Your Name',d.name,'div'):"<div class='cp-name'>"+(esc2(d.name)||'Your Name')+"</div>";
h+="<div class='cp-contact'>";
if(E){h+=ed('f:town','cpc','Town','' +d.town)+"<b>·</b>"+ed('f:phone','cpc','Phone',d.phone)+"<b>·</b>"+
ed('f:email','cpc','Email',d.email)+"<b>·</b>"+ed('f:linkedin','cpc','LinkedIn (optional)',d.linkedin);}
else{var contact=[d.town,d.phone,d.email,d.linkedin].filter(Boolean).map(esc2).join(' · ');
h+=contact||'town · phone · email';}
h+="</div></div></div>";
h+="<div class='cp-cols'><div class='cp-main'>";
/* personal statement */
if(E||d.summary){h+="<div class='cp-sec sec-summary'><h4>Personal statement</h4>"+
(E?ed('f:summary','cp-sum','Two or three lines: what you are doing now, what you are aiming for, and one thing that proves you are serious.',d.summary,'p'):"<p>"+esc2(d.summary)+"</p>")+"</div>";}
/* work */
var exps=E?d.experience:d.experience.filter(function(e){return e.role||e.org||(e.bullets&&e.bullets.length)});
if(E||exps.length){h+="<div class='cp-sec sec-work'><h4>Work &amp; volunteering</h4>";
exps.forEach(function(e,i){
var bl=E?String(e.bullets||'').split('\n'):(e.bullets||[]);
if(E&&bl.length===0)bl=[''];
h+="<div class='cp-entry' data-entry='"+i+"'><div class='cp-row'><b>"+
(E?ed('xp:'+i+':role','cpe','Job or role title',e.role)+"<i class='cp-dash'>-</i>"+ed('xp:'+i+':org','cpe','Organisation',e.org)
:esc2([e.role,e.org].filter(Boolean).join(' - ')))+"</b><span>"+
(E?ed('xp:'+i+':from','cpe','From',e.from)+"<i class='cp-dash'>–</i>"+ed('xp:'+i+':to','cpe','To',e.to)
:esc2([e.from,e.to].filter(Boolean).join(' – ')))+"</span></div>";
if(E||e.location)h+="<div class='cp-loc'>"+(E?ed('xp:'+i+':location','cpe','Location (optional)',e.location):esc2(e.location))+"</div>";
h+="<ul>";
bl.forEach(function(b,j){var m=bulletMark(b);
h+="<li><span class='mk "+m.c+"' title='"+esc2(m.t)+"' contenteditable='false'>"+m.i+"</span>"+
(E?ed('xb:'+i+':'+j,'bl','What you did - start with a doing word, add a number',b):"<span class='bl'>"+esc2(b)+"</span>")+
(E?"<button type='button' class='ilb' contenteditable='false' data-il='"+i+":"+j+"' title='Improve this line with AI - uses only what it already says'>✨</button>":"")+
"</li>";});
h+="</ul>";
if(E)h+="<div class='ctl' contenteditable='false'><button type='button' class='ctlbtn' data-addbullet='"+i+"'>+ point</button>"+
"<button type='button' class='ctlbtn' data-delentry='"+i+"'>remove role</button></div>";
h+="</div>";});
if(E)h+="<button type='button' class='addline' contenteditable='false' id='addrole'>+ Add a role</button>";
h+="</div>";}
/* education */
var edus=E?d.education:d.education.filter(function(e){return e.school||e.quals});
if(E||edus.length){h+="<div class='cp-sec sec-edu'><h4>Education</h4>";
edus.forEach(function(e,i){
h+="<div class='cp-entry' data-eentry='"+i+"'><div class='cp-row'><b>"+
(E?ed('edn:'+i+':school','cpe','School or college',e.school):esc2(e.school))+"</b><span>"+
(E?ed('edn:'+i+':from','cpe','From',e.from)+"<i class='cp-dash'>–</i>"+ed('edn:'+i+':to','cpe','To',e.to)
:esc2([e.from,e.to].filter(Boolean).join(' – ')))+"</span></div>"+
"<div>"+(E?ed('edn:'+i+':quals','cpe','Qualifications, e.g. GCSEs: English (6), Maths (5)',e.quals):esc2(e.quals))+"</div>"+
((E||e.detail)?"<div class='cp-loc'>"+(E?ed('edn:'+i+':detail','cpe','Anything notable (optional)',e.detail):esc2(e.detail))+"</div>":"");
if(E)h+="<div class='ctl' contenteditable='false'><button type='button' class='ctlbtn' data-deledu='"+i+"'>remove</button></div>";
h+="</div>";});
if(E)h+="<button type='button' class='addline' contenteditable='false' id='addedu'>+ Add education</button>";
h+="</div>";}
h+="</div><div class='cp-side'>";
/* skills */
var skills=E?null:d.skills;
if(E){h+="<div class='cp-sec sec-skills'><h4>Skills</h4>"+
ed('f:skills','cp-skilledit','Comma-separated, specific: Till operation, Rota planning…',d.skills,'p')+
"<div class='cp-chips' id='skill-chips'></div></div>";}
/* Both shapes are rendered and the design picks one: a list for most,
 * tags for Modern. With only the list here, Modern - which hides the
 * list - showed a Skills heading with nothing under it in the gallery. */
else if(skills&&skills.length){h+="<div class='cp-sec sec-skills'><h4>Skills</h4><ul class='cp-skills'>"+
skills.map(function(s){return "<li>"+esc2(s)+"</li>"}).join('')+"</ul>"+
"<div class='cp-chips'>"+skills.map(function(s){return "<span>"+esc2(s)+"</span>"}).join('')+"</div></div>";}
/* extras */
if(E){h+="<div class='cp-sec sec-extras'><h4>Achievements</h4>"+
ed('f:extras','cp-extraedit','One per line: awards, certificates, positions of responsibility',d.extras,'p')+"</div>";}
else if(d.extras&&d.extras.length){h+="<div class='cp-sec sec-extras'><h4>Achievements</h4><ul>"+
d.extras.map(function(x){return "<li>"+esc2(x)+"</li>"}).join('')+"</ul></div>";}
/* References. The National Careers Service lists it as a CV section
 * and is explicit that you do not print someone else's contact
 * details - you say they are available on request. Printed for every
 * CV, not editable, because there is exactly one correct wording and
 * a learner guessing at it is how a referee's phone number ends up on
 * a document handed to strangers. */
if(!d.hideRefs){
h+="<div class='cp-sec sec-refs'><h4>References</h4>"+
"<p class='cp-refs'>References are available on request.</p>"+
(E?"<div class='ctl' contenteditable='false'><button type='button' class='ctlbtn' data-refs='off'>remove this section</button></div>":"")+
"</div>";}
else if(E){h+="<div class='cp-sec sec-refs refs-off'><div class='ctl' contenteditable='false'>"+
"<button type='button' class='ctlbtn' data-refs='on'>+ add References back</button></div></div>";}
h+="</div></div>";
return h;}

/* skills chips shadow the comma line so chip designs stay live */
function renderSkillChips(){var el=$('skill-chips');if(!el)return;
var sk=String(current.data.skills||'').split(',').map(function(s){return s.trim()}).filter(Boolean);
el.innerHTML=sk.map(function(s){return "<span>"+esc2(s)+"</span>"}).join('');}

/* ---- what prints is what has words in it ----
 * The print stylesheet hides anything carrying is-empty. Kept in step
 * with the document on every render and keystroke, so the PDF never
 * shows a heading over nothing, a bullet with no line, "Sept 2024 -"
 * with no end date, or a contact line that opens on a separator because
 * the town was left out. */
function blank(el){return String(el.textContent||'').replace(/\s+/g,'')===''}
function anyWords(scope){return Array.prototype.some.call(scope.querySelectorAll('[data-b]'),function(el){return !blank(el)})}
function markEmpties(){var paper=$('paper');if(!paper)return;
paper.querySelectorAll('[data-b]').forEach(function(el){el.classList.toggle('is-empty',blank(el))});
paper.querySelectorAll('.cp-sec li').forEach(function(li){li.classList.toggle('is-empty',!anyWords(li))});
paper.querySelectorAll('.cp-entry').forEach(function(en){en.classList.toggle('is-empty',!anyWords(en))});
paper.querySelectorAll('.cp-sec').forEach(function(sec){
if(sec.classList.contains('sec-refs'))return;
sec.classList.toggle('is-empty',!anyWords(sec));});
/* a dash joins two things: with either side missing it goes */
paper.querySelectorAll('.cp-dash').forEach(function(d){var a=d.previousElementSibling,b=d.nextElementSibling;
d.classList.toggle('is-empty',!a||!b||blank(a)||blank(b));});
/* contact line: a dot only between two details that are both there */
var seen=false,dot=null;
Array.prototype.forEach.call(paper.querySelectorAll('.cp-contact>*'),function(ch){
if(ch.tagName==='B'){dot=ch;return;}
var has=!blank(ch);
if(dot){dot.classList.toggle('is-empty',!(has&&seen));dot=null;}
if(has)seen=true;});
monoPicture();}
/* The Monogram's initials, drawn as a picture for the printed page. As
 * live text they are the first words in the file, and a parser that
 * takes the first line for the candidate's name gets "IH". The screen
 * keeps the text; the print stylesheet swaps it for this picture. */
var monoFor='';
function monoPicture(){var mono=$('paper').querySelector('.cp-mono');if(!mono)return;
var t=mono.querySelector('.mono-t');var ini=t?t.textContent:'';
if(!ini||getComputedStyle(mono).display==='none'){mono.classList.remove('has-pic');return;}
if(monoFor===ini&&mono.classList.contains('has-pic'))return;
try{var px=208,cv=document.createElement('canvas');cv.width=cv.height=px;var x=cv.getContext('2d');
var g=x.createLinearGradient(0,0,px,px);g.addColorStop(0,'#A66633');g.addColorStop(1,'#B93A22');
x.fillStyle=g;x.beginPath();x.arc(px/2,px/2,px/2,0,Math.PI*2);x.fill();
x.fillStyle='#fff';x.font="800 72px Outfit,Arial,sans-serif";x.textAlign='center';x.textBaseline='middle';
x.fillText(ini,px/2,px/2+4);
mono.style.setProperty('--mono-pic','url('+cv.toDataURL('image/png')+')');
mono.classList.add('has-pic');monoFor=ini;}catch(e){mono.classList.remove('has-pic');}}
/* Redrawn once the typeface has arrived and again just before printing,
 * so the picture is never left in a fallback face. */
function refreshForPrint(){monoFor='';if(current)markEmpties();}
window.addEventListener('beforeprint',refreshForPrint);
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(refreshForPrint);
function renderDoc(){$('paper').innerHTML=docHtml(current.data,true);renderSkillChips();updateGuard();markEmpties();
$('paper').querySelectorAll('[data-addbullet]').forEach(function(b){b.onclick=function(){
var i=+b.dataset.addbullet;var e=current.data.experience[i];
e.bullets=(e.bullets?e.bullets+'\n':'');renderDoc();focusBind('xb:'+i+':'+(String(e.bullets).split('\n').length-1));scheduleSave();};});
$('paper').querySelectorAll('[data-refs]').forEach(function(b){b.onclick=function(){
current.data.hideRefs=b.dataset.refs==='off';renderDoc();scheduleSave();};});
$('paper').querySelectorAll('[data-delentry]').forEach(function(b){b.onclick=function(){
current.data.experience.splice(+b.dataset.delentry,1);
if(!current.data.experience.length)current.data.experience=[blankExp()];
renderDoc();scheduleSave();};});
$('paper').querySelectorAll('[data-deledu]').forEach(function(b){b.onclick=function(){
current.data.education.splice(+b.dataset.deledu,1);
if(!current.data.education.length)current.data.education=[blankEdu()];
renderDoc();scheduleSave();};});
$('paper').querySelectorAll('[data-il]').forEach(function(b){b.onclick=function(){
var p=b.dataset.il.split(':');var e=current.data.experience[+p[0]];
var bl=String(e.bullets||'').split('\n');var line=(bl[+p[1]]||'').trim();
if(line.length<8){alert('Write the line first - the improver sharpens your words, it never invents them.');return;}
b.disabled=true;b.textContent='…';
fetch('/api/improve-line',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,line:line})})
.then(function(r){return r.json()}).then(function(d){b.disabled=false;b.textContent='✨';
if(!d||!d.line){alert((d&&d.reply)||'Could not improve that line just now.');return;}
/* Only apply if the bullet is untouched since the request went out -
 * never clobber keystrokes typed while the improver was thinking. */
var freshBl=String(e.bullets||'').split('\n');
if((freshBl[+p[1]]||'').trim()!==line){return;}
freshBl[+p[1]]=d.line;e.bullets=freshBl.join('\n');renderDoc();scheduleSave();})
.catch(function(){b.disabled=false;b.textContent='✨';});};});
var ar=$('addrole');if(ar)ar.onclick=function(){current.data.experience.push(blankExp());renderDoc();
focusBind('xp:'+(current.data.experience.length-1)+':role');scheduleSave();};
var ae=$('addedu');if(ae)ae.onclick=function(){current.data.education.push(blankEdu());renderDoc();
focusBind('edn:'+(current.data.education.length-1)+':school');scheduleSave();};}
function focusBind(b){var el=$('paper').querySelector("[data-b='"+b+"']");if(el){el.focus();
try{var r=document.createRange();r.selectNodeContents(el);r.collapse(false);
var s=window.getSelection();s.removeAllRanges();s.addRange(r);}catch(e){}}}
/* The scaffolding marker is "(example" - "imogen@example.com" or "set an
 * example for new starters" is the learner's own content, not ours. */
function updateGuard(){$('exguard').hidden=JSON.stringify(current.data).toLowerCase().indexOf('(example')===-1;}

/* ---- inline editing: write-through without re-render (caret-safe) ---- */
/* The words in a field as the learner sees them. Pressing Enter makes
 * the browser insert a <div> or <br>, and textContent reads straight
 * through those: two achievements typed on two lines - which is what
 * the prompt asks for - were saved as "First aid certificateEmployee of
 * the month". innerText reads a line break as a line break. A typed
 * trailing space also arrives as a non-breaking one, which has no place
 * in the text a parser receives. */
var NBSP=new RegExp(String.fromCharCode(160),'g');
function fieldText(el,multi){var t=String(el.innerText||'').replace(/\r/g,'').replace(NBSP,' ');
return multi?t.replace(/\n{3,}/g,'\n\n').replace(/\n+$/,''):t.replace(/\s*\n\s*/g,' ');}
function writeBind(el){var b=(el.dataset.b||'').split(':');
/* A cleared line keeps a stray <br>, so it never counts as empty again:
 * the grey prompt does not come back and the blank line prints. */
if(el.firstChild&&blank(el))el.textContent='';
var v=fieldText(el,false);
if(b[0]==='f'){current.data[b[1]]=b[1]==='summary'||b[1]==='extras'?fieldText(el,true):v;
if(b[1]==='skills')renderSkillChips();
if(b[1]==='name'){var mono=$('paper').querySelector('.cp-mono .mono-t');
if(mono){var ini=v.trim().split(/\s+/).map(function(w){return w.charAt(0)}).join('').slice(0,2).toUpperCase();
mono.textContent=ini||'??';}}}
else if(b[0]==='xp'){current.data.experience[+b[1]][b[2]]=v;}
else if(b[0]==='edn'){current.data.education[+b[1]][b[2]]=v;}
else if(b[0]==='xb'){var e=current.data.experience[+b[1]];var bl=String(e.bullets||'').split('\n');
bl[+b[2]]=v;e.bullets=bl.join('\n');
var mk=el.parentElement.querySelector('.mk');if(mk){var m=bulletMark(v);
mk.className='mk '+m.c;mk.textContent=m.i;mk.title=m.t;}}}
$('paper').addEventListener('input',function(ev){var el=ev.target.closest?ev.target.closest('[data-b]'):null;
if(!el||!current)return;writeBind(el);updateGuard();markEmpties();scheduleSave();});
/* Enter in a bullet = new bullet; Backspace on an empty one removes it */
$('paper').addEventListener('keydown',function(ev){var el=ev.target.closest?ev.target.closest('[data-b]'):null;
if(!el)return;var b=(el.dataset.b||'').split(':');
if(b[0]==='xb'){
if(ev.key==='Enter'){ev.preventDefault();var e=current.data.experience[+b[1]];
var bl=String(e.bullets||'').split('\n');bl.splice(+b[2]+1,0,'');e.bullets=bl.join('\n');
renderDoc();focusBind('xb:'+b[1]+':'+(+b[2]+1));scheduleSave();}
else if(ev.key==='Backspace'&&el.textContent.trim()===''){var e2=current.data.experience[+b[1]];
var bl2=String(e2.bullets||'').split('\n');
if(bl2.length>1){ev.preventDefault();bl2.splice(+b[2],1);e2.bullets=bl2.join('\n');
renderDoc();focusBind('xb:'+b[1]+':'+Math.max(0,+b[2]-1));scheduleSave();}}}
else if(ev.key==='Enter'&&b[1]!=='summary'&&b[1]!=='extras'){ev.preventDefault();el.blur();}});
/* paste as plain text */
$('paper').addEventListener('paste',function(ev){var el=ev.target.closest?ev.target.closest('[data-b]'):null;
if(!el)return;ev.preventDefault();
var t=(ev.clipboardData||window.clipboardData).getData('text').replace(/\r/g,'');
document.execCommand('insertText',false,t);});

/* ---------------- the review sidebar ---------------- */
function stateIcon(st){return st==='good'?'✓':st==='warn'?'!':'✗'}
function renderReview(rv){
var col=rv.total>=70?'#1A7649':rv.total>=50?'#9A5812':'#B93A22';
flCountUp($('b-score'),rv.total);$('b-score').style.color=col;
$('rv-bar-i').style.width=rv.total+'%';$('rv-bar-i').style.background=col;
/* the phone's way to the review, which sits below the CV there */
$('bb-score-n').textContent=rv.total;$('bb-score-n').style.color=col;$('bb-score').hidden=false;
var h='';rv.categories.forEach(function(c,i){
h+="<div class='rvcat'><button type='button' class='rvcat-h' data-cat='"+i+"' aria-expanded='false'>"+
"<span class='rvc-ic "+c.state+"'>"+stateIcon(c.state)+"</span>"+
"<span class='rvc-l'>"+esc2(c.label)+"</span>"+
"<span class='rvc-s'>"+c.score+"/"+c.max+"</span><span class='rvc-ch'>▾</span></button>"+
"<div class='rvcat-b' id='rvb-"+i+"' hidden>";
c.items.forEach(function(it){var ic=it.status==='pass'?'✓':it.status==='warn'?'!':'✗';
h+="<div class='ck "+it.status+"'><span class='ck-i'>"+ic+"</span><div><div class='ck-l'>"+esc2(it.label)+"</div>"+
"<div class='ck-d'>"+esc2(it.detail)+"</div>"+
(it.evidence?"<div class='ck-e'>“"+esc2(it.evidence)+"”</div>":"")+"</div></div>";});
h+="</div></div>";});
$('rv-cats').innerHTML=h;
document.querySelectorAll('.rvcat-h').forEach(function(b){b.onclick=function(){
var body=$('rvb-'+b.dataset.cat);var open=body.hidden;
body.hidden=!open;b.setAttribute('aria-expanded',String(open));
b.parentElement.classList.toggle('open',open);};});}
function runCheck(auto){
fetch('/api/builder-check',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,cv:payload()})})
.then(function(r){return r.json()}).then(function(d){
if(!d||!d.review){if(!auto)alert((d&&d.reply)||'Add a bit more content first, then check again.');return;}
lastText=d.text||'';$('stale-note').hidden=true;
renderReview(d.review);$('scorepanel').hidden=false;})
.catch(function(){if(!auto)alert('Could not reach the checker - try again in a minute.');});}
$('refreshbtn').onclick=function(){runCheck(false)};
$('bb-score').onclick=function(){$('scorepanel').scrollIntoView({behavior:'smooth',block:'start'})};
$('sendreview').onclick=function(){
if(!lastText){alert('Tap ⟳ for a fresh check first - the review reads that exact text.');return;}
try{sessionStorage.setItem('fl_builder_cv_text',lastText)}catch(e){}
/* The identity is a TOKEN - it must ride as t=, never as the e=
 * embed-email param (which /tools decodes with atob and would drop). */
var q=['from=builder'];var ev=flToken();if(ev)q.push('t='+encodeURIComponent(ev));
location.href='/tools?'+q.join('&');};

renderList();
})();`;

const BUILDER_CSS = `
.listhead{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:14px;flex-wrap:wrap;}
.listhead h3{margin-bottom:0;}
.cvgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:14px;}
.cvempty{color:var(--mut);font-size:14px;padding:18px 0;}
.cvitem{border:1.5px solid var(--line);border-radius:14px;padding:16px;}
.cvi-name{font-weight:700;font-size:15px;}
.cvi-meta{font-size:12px;color:var(--mut);margin:4px 0 12px;}
.cvi-btns{display:flex;gap:8px;flex-wrap:wrap;}
.cvi-btns .btn{padding:8px 14px;min-height:36px;font-size:13px;}
.fieldtip{font-size:12.5px;color:var(--blue);line-height:1.5;}
.buildbar{display:flex;align-items:center;gap:12px;flex-wrap:wrap;position:sticky;top:8px;z-index:5;}
.bb-gap{flex:1;}
.titlein{max-width:190px;border:2px solid transparent;font-weight:700;font-size:15.5px;padding:8px 10px;}
.titlein:hover{border-color:var(--off);}
.savestate{font-size:12px;color:var(--mut);}
.cur-wrap{font-size:13px;}
.cur-design{font-weight:800;color:#B93A22;}
/* ---- starter picker ---- */
.startgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;}
.startcard{position:relative;border:1.5px solid var(--line);border-radius:14px;padding:16px;background:#fff;
  font-family:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;gap:6px;
  transition:transform .12s,border-color .12s,box-shadow .12s;}
.startcard:hover{transform:translateY(-2px);border-color:#B93A22;box-shadow:0 10px 22px -12px rgba(5,37,60,.3);}
.startcard:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.startcard b{font-size:14.5px;color:var(--navy);}
.startcard p{font-size:12.5px;color:var(--mut);line-height:1.5;flex:1;margin:0;}
.tagats{align-self:flex-start;background:#EFF7F1;color:#1A7649;border:1px solid #CBE3D3;border-radius:999px;
  padding:3px 10px;font-size:10.5px;font-weight:800;letter-spacing:.03em;}
.startgo{color:#B93A22;font-weight:700;font-size:12.5px;}
.exguard{background:#FCEFEC;border:1.5px solid #F0CFC7;border-radius:12px;padding:12px 16px;
  font-size:13px;line-height:1.55;color:#7a2f1f;margin-bottom:12px;}
.exguard i{font-style:normal;font-weight:700;}
/* ---- design gallery ---- */
.designgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px;}
.dcard{display:flex;flex-direction:column;gap:7px;border:1.5px solid var(--line);border-radius:16px;padding:14px;
  background:#fff;transition:transform .12s,border-color .12s,box-shadow .12s;}
.dcard:hover{transform:translateY(-3px);border-color:#B93A22;box-shadow:0 14px 30px -14px rgba(5,37,60,.3);}
.dcard b{font-size:15px;}
.dcard p{font-size:12px;color:var(--mut);line-height:1.5;flex:1;margin:0;}
.dthumb{width:100%;height:300px;overflow:hidden;border:1px solid var(--line);border-radius:10px;background:#fff;position:relative;}
.dscale{width:720px;transform:scale(.315);transform-origin:top left;}
.dthumb .cvpaper{box-shadow:none;border:none;border-radius:0;min-height:0;width:720px;padding:38px 42px;pointer-events:none;}
.dthumb .mk{display:none!important;}
/* A bullet point prints as one. While editing, the quality marker
 * stands where the bullet would be; in the gallery and on paper the
 * marker is hidden, and the line was left with nothing in front of it. */
.dthumb .sec-work li::before{content:'•';flex:none;}
.dthumb::after{content:'';position:absolute;inset:0;}
.dselect{padding:10px 16px;min-height:40px;font-size:13.5px;}
.atsexplain{font-size:13px;color:var(--ink);line-height:1.6;margin:6px 0 0;max-width:70ch;}
.atsbadge{font-size:10px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;border-radius:999px;
  padding:3px 8px;background:#FCEBD9;color:#9A5812;vertical-align:2px;}
.atsbadge.ok{background:#E8F2EC;color:#1A7649;}
.atsnote{display:block;margin-top:5px;font-size:11.5px;color:#9A5812;line-height:1.5;}
/* ---- builder layout: review rail + document ---- */
.docgrid{display:grid;grid-template-columns:330px 1fr;gap:18px;align-items:start;}
@media(max-width:980px){.docgrid{grid-template-columns:1fr;}}
.revcol{position:sticky;top:86px;max-height:calc(100vh - 100px);overflow-y:auto;}
@media(max-width:980px){.revcol{position:static;max-height:none;}}
.tipscard h3{font-size:14.5px;}
.tipslist{list-style:none;font-size:12.5px;color:var(--mut);line-height:1.55;}
.tipslist li{margin-bottom:8px;padding-left:2px;}
.tipslist b{color:var(--navy);}
/* ---- review sidebar ---- */
.revpanel{padding:16px 18px;}
.rv-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;}
.rv-t{font-size:14.5px;font-weight:700;}
.rv-refresh{border:1.5px solid var(--line);background:#fff;border-radius:10px;width:34px;height:34px;font-size:16px;
  cursor:pointer;color:var(--blue);}
.rv-refresh:hover{border-color:#B93A22;color:#B93A22;}
.rv-scorerow{display:flex;align-items:center;gap:10px;margin:4px 0 8px;}
.rv-score{font-size:30px;font-weight:800;font-variant-numeric:tabular-nums;line-height:1;}
.rv-of{font-size:14px;color:var(--mut);font-weight:700;}
.rv-bar{flex:1;height:9px;border-radius:999px;background:var(--off);overflow:hidden;}
.rv-bar i{display:block;height:100%;border-radius:999px;width:0;}
.rv-fair{font-size:11.5px;color:var(--blue);background:rgba(19,80,127,.06);border-radius:999px;
  padding:5px 12px;display:inline-block;margin-bottom:10px;}
.stale-note{background:#FBF0E2;border:1.5px solid #EAD3AE;border-radius:10px;padding:10px 14px;
  font-size:13px;color:#8a5b16;margin:0 0 10px;}
.rvcat{border:1.5px solid var(--line);border-radius:12px;margin-bottom:8px;overflow:hidden;}
.rvcat.open{border-color:#C9C1BD;}
.rvcat-h{display:flex;align-items:center;gap:10px;width:100%;padding:11px 12px;border:none;background:#fff;
  font-family:inherit;cursor:pointer;text-align:left;}
.rvcat-h:hover{background:#FBFAF9;}
.rvc-ic{width:22px;height:22px;border-radius:50%;font-weight:800;font-size:12px;flex:none;
  display:inline-flex;align-items:center;justify-content:center;}
.rvc-ic.good{background:#E3F4EA;color:#1A7649;}
.rvc-ic.warn{background:#FBF0E2;color:#9A5812;}
.rvc-ic.bad{background:#FCE9E5;color:#B93A22;}
.rvc-l{flex:1;font-size:13.5px;font-weight:600;}
.rvc-s{font-size:13px;font-weight:800;font-variant-numeric:tabular-nums;color:var(--ink);}
.rvc-ch{color:var(--mut);font-size:11px;transition:transform .15s;}
.rvcat.open .rvc-ch{transform:rotate(180deg);}
.rvcat-b{padding:4px 12px 10px;border-top:1px solid var(--off);}
.rv-send{width:100%;margin-top:6px;}
.ck{display:flex;gap:12px;padding:9px 0;}
.ck-i{width:24px;height:24px;border-radius:50%;font-weight:800;font-size:13px;flex:none;
  display:flex;align-items:center;justify-content:center;margin-top:1px;}
.ck.pass .ck-i{background:#E3F4EA;color:var(--ok);}
.ck.warn .ck-i{background:#FBF0E2;color:#9A5812;}
.ck.fail .ck-i{background:#FCE9E5;color:#B93A22;}
.ck-l{font-weight:700;font-size:14px;}
.ck-d{font-size:13px;color:#4a5b66;line-height:1.5;margin-top:2px;}
.ck-e{font-size:12.5px;color:#616A71;font-style:italic;margin-top:4px;border-left:3px solid var(--off);padding-left:10px;}
/* ==================================================================
 * THE DOCUMENT - editable, and six structurally distinct designs
 * ================================================================== */
.cvpaper{background:#fff;border-radius:6px;box-shadow:0 6px 28px -10px rgba(5,37,60,.25);
  padding:38px 42px;line-height:1.55;color:#1c2b36;min-height:520px;font-size:13px;}
@media(max-width:900px){.cvpaper{padding:26px 22px;}}
[contenteditable]{outline:none;border-radius:3px;transition:background .12s,box-shadow .12s;min-width:12px;display:inline-block;}
[contenteditable]:hover{background:rgba(237,146,73,.10);}
[contenteditable]:focus{background:#FFF9F2;box-shadow:0 0 0 2px rgba(237,146,73,.45);}
[contenteditable]:empty::before{content:attr(data-ph);color:#A9B2BB;font-style:italic;font-weight:400;}
.cp-sum,.cp-extraedit,.cp-skilledit{display:block;white-space:pre-wrap;}
.cp-dash{font-style:normal;color:#616A71;margin:0 4px;}
.cp-head{margin-bottom:16px;display:flex;gap:16px;align-items:center;}
.cp-headmain{flex:1;min-width:0;}
.cp-mono{display:none;width:52px;height:52px;border-radius:50%;flex:none;align-items:center;justify-content:center;
  font-weight:800;font-size:18px;background:linear-gradient(135deg,#A66633,#B93A22);color:#fff;}
.cp-name{font-size:24px;font-weight:700;}
.cp-contact{font-size:11.5px;color:#5c6b75;margin-top:3px;}
.cp-contact b{font-weight:400;color:#B9AFAB;margin:0 5px;}
.cp-sec{margin-bottom:14px;}
.cp-refs{font-size:12.5px;margin:0;}
/* TWO RULES THE "ATS-SAFE" LABEL DEPENDS ON.
 *
 * 1. Headings are tracked no wider than .05em. A PDF stores a tracked
 *    heading as separately placed letters, and a reader that sees a gap
 *    of a tenth of an em between two letters calls it a space: the
 *    Classic design's .22em came back as "E D U C A T I O N", which no
 *    screening software recognises as a section.
 * 2. Nothing on the paper is positioned. A browser paints positioned
 *    boxes after everything else, and a PDF's text is stored in paint
 *    order - so with the entries positioned, every heading was written
 *    out first and the jobs under them last. The decorations below are
 *    ordinary in-flow boxes for that reason.
 *
 * scripts/vqa-cv-pdf.mjs prints all six designs and reads them back. */
.cp-sec h4{font-size:12px;letter-spacing:.05em;text-transform:uppercase;border-bottom:1.5px solid #1c2b36;
  padding-bottom:3px;margin-bottom:8px;}
.cp-entry{margin-bottom:10px;}
.cp-row{display:flex;justify-content:space-between;gap:12px;font-size:13px;align-items:baseline;flex-wrap:wrap;}
/* The dates only. Written as ".cp-row span" this also caught the job
 * title and employer - which are spans while they are editable - so on
 * the CV a learner actually prints, their job titles came out small
 * and grey, the same as the dates beside them. */
.cp-row>span{color:#5c6b75;font-size:11.5px;white-space:nowrap;}
.cp-loc{font-size:11.5px;color:#5c6b75;}
.cp-sec ul{margin:4px 0 0 2px;list-style:none;}
.cp-sec li{margin-bottom:4px;display:flex;gap:8px;align-items:baseline;}
.cp-sec li .bl{flex:1;}
.cp-skills{margin:0!important;}
.cp-chips{display:none;flex-wrap:wrap;gap:6px;margin-top:8px;}
.cp-chips span{border:1px solid #C9C1BD;border-radius:999px;padding:3px 10px;font-size:11px;font-weight:600;}
.mk{font-weight:800;font-size:10px;width:16px;height:16px;border-radius:50%;flex:none;
  display:inline-flex;align-items:center;justify-content:center;position:relative;top:1px;}
.mk-ok{background:#E3F4EA;color:#1A7649;}
.mk-warn{background:#FBF0E2;color:#9A5812;}
.mk-bad{background:#FCE9E5;color:#B93A22;}
.mk-off{background:#F0EBE8;color:#B9AFAB;}
.ilb{border:none;background:none;font-size:12px;cursor:pointer;opacity:0;transition:opacity .12s;padding:0 2px;flex:none;}
li:hover .ilb,li:focus-within .ilb{opacity:1;}
@media(hover:none){.ilb{opacity:1;}}
.ilb:disabled{cursor:default;}
.ctl{display:flex;gap:8px;margin-top:2px;opacity:0;transition:opacity .12s;}
.cp-entry:hover .ctl,.cp-entry:focus-within .ctl{opacity:1;}
@media(hover:none){.ctl{opacity:1;}}
.ctlbtn{border:none;background:none;color:#616A71;font-family:'Outfit',Arial,sans-serif;font-size:11px;font-weight:700;
  cursor:pointer;text-decoration:underline;padding:2px 0;}
.ctlbtn:hover{color:#B93A22;}
.addline{display:block;width:100%;border:1.5px dashed #C9C1BD;background:none;border-radius:10px;padding:8px;
  font-family:'Outfit',Arial,sans-serif;font-size:12px;font-weight:700;color:#616A71;cursor:pointer;margin-top:4px;}
.addline:hover{border-color:#B93A22;color:#B93A22;}
.cp-cols{display:block;}
/* ---- 1 · CLASSIC - centred serif masthead, double rules ---- */
/* Named on the children too. The app shell sets its typeface on every
 * element, which beats anything a parent tries to hand down - so with
 * the serif set on the paper alone, Classic never once rendered in it. */
.cvpaper.classic,.cvpaper.classic :not(button){font-family:Georgia,'Times New Roman',serif;}
.cvpaper.classic .cp-head{display:block;text-align:center;border-bottom:3px double #1c2b36;padding-bottom:12px;}
.cvpaper.classic .cp-name{letter-spacing:.02em;font-size:26px;}
.cvpaper.classic .cp-sec h4{border-bottom:none;text-align:center;font-size:11.5px;}
.cvpaper.classic .cp-sec h4::after{content:'';display:block;width:44px;height:1px;background:#1c2b36;margin:5px auto 0;}
/* ---- 2 · EXECUTIVE - navy masthead, tabbed headings ---- */
.cvpaper.executive{padding-top:0;overflow:hidden;}
.cvpaper.executive .cp-head{background:#05253C;color:#fff;margin:0 -42px 20px;padding:28px 42px 22px;}
@media(max-width:900px){.cvpaper.executive .cp-head{margin:0 -22px 16px;padding:20px 22px;}}
.cvpaper.executive .cp-name{font-size:27px;}
.cvpaper.executive .cp-contact{color:#CFE0EE;}
.cvpaper.executive .cp-contact b{color:#5A7A94;}
.cvpaper.executive .cp-sec h4{border-bottom:none;background:#05253C;color:#fff;display:inline-block;
  padding:3px 12px;border-radius:3px;font-size:10.5px;}
.cvpaper.executive .cp-entry{border-left:2px solid #ECE7E6;padding-left:12px;}
/* ---- 3 · MODERN - energy bar, chip skills ---- */
.cvpaper.modern .cp-name{font-size:31px;letter-spacing:-.02em;}
.cvpaper.modern .cp-head{padding-bottom:14px;border-bottom:5px solid #05253C;
  border-image:linear-gradient(90deg,#D9452B 0 30%,#ED9249 30% 55%,#05253C 55% 100%) 1;}
.cvpaper.modern .cp-sec h4{border-bottom:none;padding-bottom:0;color:#05253C;}
.cvpaper.modern .cp-sec h4::after{content:'';display:block;width:34px;height:3.5px;margin-top:4px;
  background:#D9452B;border-radius:2px;}
.cvpaper.modern .cp-chips{display:flex;}
.cvpaper.modern .cp-skills{display:none;}
.cvpaper.modern .cp-skilledit{font-size:11px;color:#616A71;}
/* ---- 4 · MONOGRAM - medallion + warm spine ---- */
.cvpaper.accent{border-left:8px solid;border-image:linear-gradient(180deg,#ED9249,#D9452B) 1;}
.cvpaper.accent .cp-mono{display:flex;}
.cvpaper.accent .cp-sec h4{border-bottom:1px solid #E3DDDA;color:#13507F;}
.cvpaper.accent .cp-sec h4::before{content:'';display:inline-block;width:7px;height:7px;border-radius:50%;
  background:#ED9249;margin-right:7px;vertical-align:1px;}
/* ---- 5 · SIDEBAR - navy panel column ---- */
.cvpaper.sidebar{padding:0;overflow:hidden;}
.cvpaper.sidebar .cp-head{padding:30px 34px 6px;margin-bottom:0;}
.cvpaper.sidebar .cp-cols{display:flex;align-items:stretch;}
.cvpaper.sidebar .cp-main{flex:1;min-width:0;padding:10px 34px 34px;}
.cvpaper.sidebar .cp-side{width:32%;flex:none;background:#05253C;color:#E8EEF4;padding:18px 18px 26px;}
.cvpaper.sidebar .cp-side .cp-sec h4{color:#ED9249;border-bottom-color:#1B3A54;}
.cvpaper.sidebar .cp-side [contenteditable]:hover{background:rgba(237,146,73,.18);}
.cvpaper.sidebar .cp-side [contenteditable]:focus{background:#0B3252;box-shadow:0 0 0 2px rgba(237,146,73,.6);color:#fff;}
.cvpaper.sidebar .cp-side [contenteditable]:empty::before{color:#7A93A8;}
@media(max-width:640px){.cvpaper.sidebar .cp-cols{display:block;}
.cvpaper.sidebar .cp-side{width:auto;}}
/* ---- 6 · LEDGER - label-column headings, hairlines ---- */
.cvpaper.compact{font-size:11.5px;padding:30px 34px;line-height:1.5;}
.cvpaper.compact .cp-name{font-size:21px;}
.cvpaper.compact .cp-sec{display:grid;grid-template-columns:110px 1fr;gap:4px 16px;
  border-top:1px solid #E3DDDA;padding-top:10px;margin-bottom:10px;}
.cvpaper.compact .cp-sec h4{border-bottom:none;font-size:10px;color:#616A71;
  margin-bottom:0;padding-top:2px;grid-column:1;}
.cvpaper.compact .cp-sec>*:not(h4){grid-column:2;}
@media(max-width:560px){.cvpaper.compact .cp-sec{grid-template-columns:1fr;}
.cvpaper.compact .cp-sec>*:not(h4){grid-column:1;}}
@media print{
  body{background:#fff!important;}
  /* Keep the design's colour in the PDF. Without this the browser
   * strips backgrounds and the Executive masthead prints as white,
   * taking its white name text with it. */
  .cvpaper,.cvpaper *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}
  .snav,.footer,h2.page,.sub,.no-print,.revcol{display:none!important;}
  .wrap{padding:0;max-width:none;}
  .docgrid{display:block;}
  .cvpaper{box-shadow:none;border-radius:0;padding:8mm 6mm;min-height:0;}
  /* The Sidebar design is two columns on screen and one on paper.
   * Screening software reads a PDF's columns out of order, so the
   * artefact that reaches an employer has to be a single flow - this
   * is what makes every design in the gallery genuinely ATS-safe
   * rather than one of them carrying a warning. Must stay inside this
   * block, which is last in the sheet: an earlier @media print loses
   * to the plain two-column rules that follow it. */
  /* ...and it needs the page padding every other design has. The
   * screen rule zeroes it for the full-height panel, which on paper
   * put every line hard against the left edge with the name indented
   * above it, and clipped the dates on the right. */
  .cvpaper.sidebar{padding:8mm 6mm!important;}
  .cvpaper.sidebar .cp-head{padding:0 0 6px!important;margin-bottom:10px!important;}
  .cvpaper.sidebar .cp-cols{display:block!important;}
  .cvpaper.sidebar .cp-side{width:auto!important;background:#fff!important;color:#1c2b36!important;padding:0 0 10px!important;}
  .cvpaper.sidebar .cp-side h4{color:#1c2b36!important;border-bottom-color:#1c2b36!important;}
  .cvpaper.sidebar .cp-main{padding:0!important;}
  /* Editor furniture never reaches the page. The sparkle button was
   * missing from this list: invisible on a desktop, where it only shows
   * on hover, but its text was still in the file a parser reads - and on
   * a phone, where it is always shown, it printed after every bullet. */
  .mk,.ctl,.addline,.ilb{display:none!important;}
  .refs-off{display:none!important;}
  [contenteditable]:empty{display:none;}
  .cvpaper .sec-work li::before{content:'•';flex:none;}
  /* Printing with the keyboard leaves the caret in a line, and the
   * mouse resting on another: neither highlight belongs on paper. */
  .cvpaper [contenteditable]{background:none!important;box-shadow:none!important;}
  /* Only what has words in it prints. markEmpties() keeps the class in
   * step with the document: an unfilled section loses its heading, an
   * untouched role or bullet takes no space, and a separator with
   * nothing on one side of it goes too. */
  .cvpaper .is-empty{display:none!important;}
  /* Modern shows skills as tags while you edit. Tags print as words
   * with nothing between them - "Till operation Card handling Stock
   * rotation" - and no parser can tell where one skill ends. On paper
   * it is the comma-separated line, at full size. */
  .cvpaper.modern .cp-chips{display:none!important;}
  .cvpaper.modern .cp-skilledit{font-size:inherit!important;color:inherit!important;}
  /* The Monogram's initials are drawn as a picture on paper (see
   * monoPicture), so a parser's first line is the name, not "IH". */
  .cp-mono.has-pic .mono-t{display:none!important;}
  .cp-mono.has-pic{background:var(--mono-pic) center/cover no-repeat!important;}
  /* Ledger keeps its headings in a left-hand column on screen. On
   * paper that is two columns, and a heading that shares a line with
   * the first row of its section ("EDUCATION Leeds City College") is
   * not a heading to a parser - so it prints as one flow, heading
   * above section, the same way the Sidebar does. */
  .cvpaper.compact .cp-sec:not(.is-empty){display:block!important;}
  .cvpaper.compact .cp-sec h4{margin-bottom:5px!important;}
}
/* On a phone the CV comes first. The review rail used to sit above it,
 * so "type straight onto your CV" opened on a screen and a half of
 * scores before the CV appeared - and the bar, which is sticky, held the
 * top third of the screen for good. The score stays one tap away. */
.bb-score{display:none;}
@media(max-width:980px){
  .doccol{order:-1;}
  .bb-score{display:inline-flex;align-items:center;gap:6px;border:1.5px solid var(--line);background:#fff;
    border-radius:999px;padding:8px 14px;min-height:40px;font-family:inherit;font-size:13px;font-weight:800;
    color:var(--navy);cursor:pointer;}
  .bb-score b{font-size:15px;}
}
@media(max-width:700px){
  .buildbar{position:static;gap:8px 10px;padding:14px;}
  .bb-gap{display:none;}
  .buildbar .btn{padding:10px 14px;min-height:44px;font-size:13.5px;}
  .titlein{flex:1 1 150px;max-width:none;min-width:0;}
  .cur-wrap{display:none;}
}
/* A thumb needs more than the 16px a mouse is happy with. */
@media(hover:none),(max-width:700px){
  .ilb{min-width:40px;min-height:40px;font-size:15px;margin:-10px -8px -10px 0;display:inline-flex;
    align-items:center;justify-content:center;}
  .ctl{gap:4px 14px;flex-wrap:wrap;}
  .ctlbtn{min-height:40px;padding:10px 6px 10px 0;font-size:12.5px;}
  .addline{min-height:44px;font-size:13px;}
  .rv-refresh{width:44px;height:44px;}
  .rvcat-h{min-height:48px;}
}
`;
