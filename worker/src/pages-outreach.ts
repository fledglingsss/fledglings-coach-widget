/* /templates - Templates and scripts: emails, phone calls and
 * networking messages for the moments between the CV and the first
 * day. See lib/outreach.ts for the content and why it is authored
 * rather than generated.
 *
 * Two stages on one page. The list: three channels, a short guide for
 * each, the situations as cards, and the safety notes. The workbench:
 * the learner's details on one side and the message or script on the
 * other, filling in as they type, with what is still missing marked.
 *
 * Nothing on this page calls the worker. What a learner types is kept
 * in sessionStorage so it survives a reload and carries from one
 * template to the next, and is gone when the tab closes - on a shared
 * school computer the next person must not find a name and phone
 * number waiting in the boxes. */

import { appShell, esc } from "./pages";
import {
  OUTREACH_FIELDS,
  OUTREACH_FILL_JS,
  OUTREACH_GUIDES,
  OUTREACH_SAFETY,
  OUTREACH_TEMPLATES,
} from "./lib/outreach";

export function renderOutreachPage(): string {
  /* "<" is escaped so no authored sentence can ever close the script
   * element it travels in. */
  const data = JSON.stringify({
    fields: OUTREACH_FIELDS,
    templates: OUTREACH_TEMPLATES,
    guides: OUTREACH_GUIDES,
  }).replace(/</g, "\\u003c");

  const chips = OUTREACH_GUIDES.map((g, i) => {
    const count = OUTREACH_TEMPLATES.filter((t) => t.channel === g.channel).length;
    return (
      `<button type='button' class='ochip${i === 0 ? " on" : ""}' role='tab' ` +
      `aria-selected='${i === 0 ? "true" : "false"}' aria-controls='o-grid' data-ch='${g.channel}'>` +
      `<i aria-hidden='true'>${g.icon}</i>${esc(g.label)}<span>${count}</span></button>`
    );
  }).join("");

  const safety =
    "<div class='card osafe'>" +
    `<h3><i aria-hidden='true'>🛡️</i>${esc(OUTREACH_SAFETY.title)}</h3>` +
    `<p class='osafe-lead'>${esc(OUTREACH_SAFETY.lead)}</p><ul>` +
    OUTREACH_SAFETY.points.map((p) => `<li>${esc(p)}</li>`).join("") +
    "</ul>" +
    `<p class='osafe-rep'>${esc(OUTREACH_SAFETY.report.text)}</p>` +
    `<a class='osafe-link' href='${esc(OUTREACH_SAFETY.report.href)}' target='_blank' rel='noopener noreferrer'>` +
    `${esc(OUTREACH_SAFETY.report.label)}<span aria-hidden='true'>↗</span>` +
    "<span class='sr-only'> (opens in a new tab)</span></a></div>";

  const body =
    "<main class='wrap' style='max-width:1040px'>" +
    "<h2 class='page'>Templates and scripts</h2>" +
    "<p class='sub'>The words for the moments between your CV and your first day: emails, phone calls and " +
    "networking messages. Pick a situation, add your details, and make it yours.</p>" +

    /* ---------- stage: the list ---------- */
    /* A heading at the very top of the stage: the shell moves focus to
     * the first heading of whatever was just revealed, and without this
     * one "back to all templates" would land on the safety notes at the
     * bottom of the page. */
    "<div id='o-list'><h3 class='sr-only'>Choose a template</h3>" +
    `<div class='ochips' role='tablist' aria-label='Kind of template'>${chips}</div>` +
    "<details class='oguide' id='o-guide'><summary><span id='og-title'></span>" +
    "<span class='og-s' id='og-count'></span></summary>" +
    "<div class='og-in'><p class='og-lead' id='og-lead'></p><ol class='og-rules' id='og-rules'></ol></div></details>" +
    "<div class='ogrid' id='o-grid'></div>" +
    safety +
    "<p class='onote'>What you type here stays in this browser tab. It is never sent to Fledglings, and it is " +
    "cleared when you close the tab. No AI is involved on this page: these are shapes that work, and the facts " +
    "are yours.</p>" +
    "</div>" +

    /* ---------- stage: the workbench ---------- */
    "<div id='o-work' hidden>" +
    "<button type='button' class='oback' id='o-back'>← All templates</button>" +
    "<div class='owhead'><span class='oc-kind' id='ow-kind'></span>" +
    "<h3 id='ow-title'></h3><p id='ow-when'></p></div>" +
    "<div class='owgrid'>" +
    "<div class='owcol'>" +
    "<div class='card ow-details'><h3>Your details</h3>" +
    "<p class='ow-priv'>Fill in what you know. Anything you leave out stays marked, so you can finish it later.</p>" +
    "<div id='ow-fields'></div>" +
    "<button type='button' class='oclear' id='ow-clear'>Clear my details</button></div>" +
    "<div class='card otips'><h3>Make it land</h3><ul id='ow-tips'></ul>" +
    "<a class='olink' id='ow-link' href='#' hidden></a></div>" +
    "</div>" +
    "<div class='owcol'>" +
    "<div class='card opreview'>" +
    "<div class='opv-bar'><span class='opv-dot'></span><span class='opv-dot'></span><span class='opv-dot'></span>" +
    "<b id='opv-title'>New message</b></div>" +
    "<div class='opv-row' id='opv-subrow'><span class='opv-l'>Subject</span>" +
    "<span class='opv-subject' id='opv-subject'></span>" +
    "<button type='button' class='ocopy' id='opv-copysub'>Copy</button></div>" +
    "<div id='opv-doc'></div>" +
    "<div class='opv-foot'><span class='opv-status' id='opv-status' role='status'></span>" +
    "<div class='btnrow'><button type='button' class='btn' id='opv-copy'>Copy message</button>" +
    "<a class='btn ghost' id='opv-mail' target='_blank' rel='noopener' href='#'>Open in my email app</a></div>" +
    "</div></div>" +
    "</div>" +
    "</div>" +
    "</div>" +
    "</main>" +
    "<script>var FL_OUT=" + data + ";</script>" +
    "<script>" + OUTREACH_FILL_JS + "</script>" +
    "<script>" + OUTREACH_APP_JS + "</script>";

  return appShell({
    title: "Fledglings - Templates and scripts",
    active: "templates",
    bodyHtml: body,
    extraCss: OUTREACH_CSS,
  });
}

/* The client app. One template literal, no backticks inside. */
const OUTREACH_APP_JS = String.raw`(function(){
var $=function(id){return document.getElementById(id)};
function esc(t){return String(t==null?'':t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
.replace(/"/g,'&quot;').replace(/'/g,'&#39;');}
var F=FL_OUT.fields,T=FL_OUT.templates,G=FL_OUT.guides;
/* The learner's details live in this tab only (see the page header). */
var KEY='fl_outreach_v1',values={};
try{values=JSON.parse(sessionStorage.getItem(KEY)||'{}')||{};}catch(e){values={};}
function save(){try{sessionStorage.setItem(KEY,JSON.stringify(values))}catch(e){}}
/* Opened from a course embed carrying an address? Exchange it for a
 * signed pass once, so the sidebar links carry the learner's identity
 * on to the tools that do save progress. Nothing here needs it. */
try{flAdoptEmbedEmail(flStoredId(localStorage,'fl_coach_learner_v1'));}catch(e){}
var channel='email',current=null;
function byId(id){for(var i=0;i<T.length;i++){if(T[i].id===id)return T[i];}return null;}
function kindLabel(t){if(t.script)return t.channel==='call'?'Phone script':'What to say';
if(t.limit)return 'LinkedIn note';
return t.channel==='email'?'Email':'Message';}
function copyLabel(t){return t.script?'Copy script':t.limit?'Copy note':'Copy message';}
/* A link to another tool keeps the learner signed in on the way. */
function withToken(href){var tok=flToken();if(!tok)return href;
var hi=href.indexOf('#');var hash=hi>-1?href.slice(hi):'';var base=hi>-1?href.slice(0,hi):href;
return base+(base.indexOf('?')>-1?'&':'?')+'t='+encodeURIComponent(tok)+hash;}

/* ---------------- the list ---------------- */
function renderList(){
document.querySelectorAll('.ochip').forEach(function(c){var on=c.getAttribute('data-ch')===channel;
c.classList.toggle('on',on);c.setAttribute('aria-selected',on?'true':'false');});
var g=null;G.forEach(function(x){if(x.channel===channel)g=x;});
if(g){$('og-title').textContent=g.title;$('og-count').textContent=g.rules.length+' habits';
$('og-lead').textContent=g.lead;
$('og-rules').innerHTML=g.rules.map(function(r){return '<li><b>'+esc(r.h)+'</b>'+esc(r.d)+'</li>'}).join('');}
$('o-grid').innerHTML=T.filter(function(t){return t.channel===channel}).map(function(t){
return "<button type='button' class='ocard' data-open='"+esc(t.id)+"'>"+
"<span class='oc-top'><span class='oc-kind'>"+esc(kindLabel(t))+"</span>"+
"<span class='oc-n'>"+t.fields.length+(t.fields.length===1?' detail':' details')+" to add</span></span>"+
"<b>"+esc(t.title)+"</b><span class='oc-when'>"+esc(t.when)+"</span>"+
"<span class='oc-go'>"+(t.script?'Open the script':'Use this template')+"</span></button>";}).join('');
$('o-grid').querySelectorAll('[data-open]').forEach(function(b){b.addEventListener('click',function(){
location.hash=b.getAttribute('data-open');});});}
document.querySelectorAll('.ochip').forEach(function(c){c.addEventListener('click',function(){
channel=c.getAttribute('data-ch');renderList();});});

/* ---------------- the workbench ---------------- */
function fieldHtml(id){var f=F[id];if(!f)return '';
var roomy=f.kind==='sentence'||f.max>100;
var common=" id='of-"+id+"' data-f='"+id+"' maxlength='"+f.max+"' placeholder='"+esc('e.g. '+f.example)+"'";
return "<label for='of-"+id+"'>"+esc(f.label)+"</label>"+
(roomy?"<textarea rows='2'"+common+">"+esc(values[id]||'')+"</textarea>"
:"<input type='"+(id==='yourPhone'?'tel':'text')+"'"+common+" value='"+esc(values[id]||'')+"' autocomplete='"+
(id==='yourName'?'name':id==='yourPhone'?'tel':'off')+"'>")+
(f.hint?"<span class='ohint'>"+esc(f.hint)+"</span>":"");}
function fill(text){return flOutParts(text,values,F);}
function partsHtml(parts){return parts.map(function(p){
return p.t==='blank'?"<span class='ob'>"+esc(p.v)+"</span>"
:p.t==='fill'?"<span class='of'>"+esc(p.v)+"</span>":esc(p.v);}).join('');}
/* The plain words, exactly as they will be pasted or read out. */
var plain={subject:'',body:''};
function renderPreview(){var t=current;if(!t)return;
var all=[],doc='';plain={subject:'',body:''};
if(t.body){
if(t.subject){var sp=fill(t.subject);all=all.concat(sp);
$('opv-subject').innerHTML=partsHtml(sp);plain.subject=flOutText(sp);}
var bp=fill(t.body);all=all.concat(bp);plain.body=flOutText(bp);
doc="<div class='opv-body'>"+partsHtml(bp)+"</div>";
}else{
var lines=[];doc="<div class='osc'>";
t.script.forEach(function(l){var p=fill(l.x);all=all.concat(p);var s=flOutText(p);
if(l.k==='say'){doc+="<div class='osc-line say'><span class='osc-who'>You say</span><p>"+partsHtml(p)+"</p></div>";lines.push(s);}
else{doc+="<div class='osc-line note'><p>"+partsHtml(p)+"</p></div>";lines.push('('+s+')');}});
doc+="</div>";
if(t.branches&&t.branches.length){doc+="<div class='osc-brh'>If it goes differently</div>";
t.branches.forEach(function(b){var p=fill(b.reply);all=all.concat(p);
doc+="<div class='osc-b'><div class='osc-cue'>"+esc(b.cue)+"</div>"+
"<div class='osc-reply'><span class='osc-who'>You say</span><p>"+partsHtml(p)+"</p></div></div>";
lines.push(b.cue+'\n'+flOutText(p));});}
plain.body=lines.join('\n\n');}
$('opv-doc').innerHTML=doc;
/* what is still missing, and - for a LinkedIn note - whether it fits */
var n=flOutBlanks(all),msg,cls;
if(t.limit&&plain.body.length>t.limit){cls='over';
msg=plain.body.length+' / '+t.limit+' characters. Too long for LinkedIn: trim '+(plain.body.length-t.limit)+'.';}
else if(n>0){cls='todo';msg=n+(n===1?' detail':' details')+' still to add'+
(t.limit?' · '+plain.body.length+' / '+t.limit+' characters':'');}
else{cls='ok';msg=(t.script?'Ready. Read it out loud once before you ring or go.':'Ready. Read it through once, then send it.')+
(t.limit?' '+plain.body.length+' / '+t.limit+' characters.':'');}
var st=$('opv-status');
if(st.textContent!==msg)st.textContent=msg;
st.className='opv-status '+cls;
if(t.subject){$('opv-mail').setAttribute('href','mailto:?subject='+encodeURIComponent(plain.subject)+
'&body='+encodeURIComponent(plain.body.replace(/\n/g,'\r\n')));}}
function openTemplate(t){current=t;channel=t.channel;
$('ow-kind').textContent=kindLabel(t);$('ow-title').textContent=t.title;$('ow-when').textContent=t.when;
$('ow-fields').innerHTML=t.fields.map(fieldHtml).join('');
$('ow-fields').querySelectorAll('[data-f]').forEach(function(el){el.addEventListener('input',function(){
values[el.getAttribute('data-f')]=el.value;save();renderPreview();});});
$('ow-tips').innerHTML=t.tips.map(function(x){return '<li><span>'+esc(x)+'</span></li>'}).join('');
var lk=$('ow-link');
if(t.link){lk.hidden=false;lk.textContent=t.link.label;
lk.setAttribute('href',t.link.href.charAt(0)==='#'?t.link.href:withToken(t.link.href));}
else{lk.hidden=true;}
$('opv-title').textContent=t.script?(t.channel==='call'?'Your call':'In person'):(t.limit?'Connection note':'New message');
$('opv-subrow').hidden=!t.subject;$('opv-mail').hidden=!t.subject;
$('opv-copy').textContent=copyLabel(t);$('opv-copysub').textContent='Copy';
renderPreview();
$('o-list').hidden=true;$('o-work').hidden=false;window.scrollTo(0,0);}

/* ---------------- copy ---------------- */
function copyText(text,btn,label){
function done(){btn.textContent='Copied ✓';setTimeout(function(){btn.textContent=label},1600);}
function byHand(){btn.textContent='Select the text and copy it';setTimeout(function(){btn.textContent=label},2600);}
function legacy(){try{var ta=document.createElement('textarea');ta.value=text;ta.setAttribute('readonly','');
ta.style.cssText='position:fixed;left:-9999px;top:0;';document.body.appendChild(ta);ta.select();
var ok=document.execCommand('copy');document.body.removeChild(ta);if(ok)done();else byHand();}catch(e){byHand();}}
if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(done,legacy);}
else{legacy();}}
$('opv-copy').addEventListener('click',function(){if(!current)return;
copyText(plain.body,$('opv-copy'),copyLabel(current));});
$('opv-copysub').addEventListener('click',function(){copyText(plain.subject,$('opv-copysub'),'Copy');});
$('ow-clear').addEventListener('click',function(){values={};save();if(current)openTemplate(current);});

/* ---------------- routing: /templates#template-id ---------------- */
function route(){var id=(location.hash||'').replace(/^#/,'');var t=id?byId(id):null;
if(t){openTemplate(t);return;}
current=null;$('o-work').hidden=true;$('o-list').hidden=false;renderList();}
window.addEventListener('hashchange',route);
$('o-back').addEventListener('click',function(){
try{history.pushState(null,'',location.pathname+location.search);}catch(e){location.hash='';}
route();window.scrollTo(0,0);});
/* On a wide screen the guide starts open; on a phone it would push
 * every template below the fold, so it starts as one tappable line. */
try{if(window.matchMedia&&matchMedia('(min-width:881px)').matches)$('o-guide').open=true;}catch(e){}
route();
/* QA hook: open a template with given details, for visual checks. */
window.__flOutOpen=function(id,vals){if(vals){values=vals;save();}var t=byId(id);if(t)openTemplate(t);};
})();`;

const OUTREACH_CSS = `
/* channel switch */
.ochips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
.ochip{border:1.5px solid var(--line);background:#fff;color:var(--ink);border-radius:999px;padding:10px 16px;
  min-height:44px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;
  display:inline-flex;align-items:center;gap:8px;}
.ochip i{font-style:normal;}
.ochip span{background:var(--off);color:var(--mut);border-radius:999px;min-width:22px;height:22px;padding:0 7px;
  font-size:11.5px;font-weight:800;display:inline-flex;align-items:center;justify-content:center;}
.ochip.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.ochip.on span{background:var(--mango);color:#05253C;}
/* the guide for the chosen channel */
.oguide{background:#fff;border:1px solid var(--line);border-left:4px solid var(--blue);border-radius:16px;
  margin-bottom:16px;box-shadow:0 1px 3px rgba(5,37,60,.05);}
/* No wrapping: on a narrow phone the arrow dropped to a line of its
 * own. A long title wraps inside itself instead, and the count and the
 * arrow keep their places. */
.oguide summary{display:flex;align-items:center;gap:10px;padding:16px 20px;cursor:pointer;
  list-style:none;font-weight:700;font-size:15.5px;line-height:1.3;min-height:44px;color:var(--navy);}
.oguide summary::-webkit-details-marker{display:none;}
.oguide summary #og-title{min-width:0;}
.oguide summary::after{content:'▾';margin-left:auto;flex:none;color:var(--mut);transition:transform .18s;}
.oguide[open] summary::after{transform:rotate(180deg);}
.og-s{flex:none;font-size:11.5px;font-weight:700;color:var(--blue);background:#EAF2FA;border-radius:999px;padding:3px 10px;}
.og-in{padding:0 20px 18px;}
.og-lead{font-size:13.5px;color:var(--mut);line-height:1.55;margin-bottom:12px;max-width:62ch;}
.og-rules{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(260px,100%),1fr));
  gap:10px;counter-reset:og;}
.og-rules li{counter-increment:og;background:#F7F4F2;border-radius:12px;padding:12px 14px 12px 48px;
  position:relative;font-size:13px;line-height:1.5;color:#3d4c59;}
.og-rules li::before{content:counter(og);position:absolute;left:13px;top:12px;width:24px;height:24px;
  border-radius:50%;background:var(--navy);color:#fff;font-size:12px;font-weight:800;
  display:flex;align-items:center;justify-content:center;}
.og-rules b{display:block;color:var(--navy);font-size:13.5px;margin-bottom:2px;}
/* the situations */
.ogrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(280px,100%),1fr));gap:14px;margin-bottom:18px;}
.ocard{background:#fff;border:1px solid var(--line);border-radius:16px;padding:16px 18px;text-align:left;
  font-family:inherit;cursor:pointer;display:flex;flex-direction:column;gap:8px;color:var(--navy);
  box-shadow:0 1px 3px rgba(5,37,60,.05);transition:transform .12s,box-shadow .12s,border-color .12s;}
.ocard:hover{transform:translateY(-3px);border-color:var(--mango);box-shadow:0 12px 26px -14px rgba(5,37,60,.28);}
.oc-top{display:flex;align-items:center;justify-content:space-between;gap:8px;}
.oc-kind{display:inline-block;font-size:10.5px;font-weight:800;letter-spacing:.06em;text-transform:uppercase;
  color:var(--blue);background:#EAF2FA;border-radius:6px;padding:5px 8px;}
.oc-n{font-size:11.5px;color:var(--mut);}
.ocard b{font-size:15px;line-height:1.35;}
.oc-when{font-size:12.5px;color:var(--mut);line-height:1.5;flex:1;}
.oc-go{font-size:12.5px;font-weight:700;color:#B93A22;}
.oc-go::after{content:' →';white-space:pre;}
/* safety */
.osafe{border-left:4px solid var(--ok);}
.osafe h3{display:flex;align-items:center;gap:8px;}
.osafe h3 i{font-style:normal;}
.osafe-lead{font-size:13.5px;color:var(--mut);line-height:1.55;max-width:62ch;}
.osafe ul{list-style:none;display:grid;grid-template-columns:repeat(auto-fill,minmax(min(300px,100%),1fr));
  gap:8px 22px;margin:12px 0;}
.osafe li{position:relative;padding-left:20px;font-size:13.5px;line-height:1.55;color:#3d4c59;}
.osafe li::before{content:'';position:absolute;left:3px;top:8px;width:7px;height:7px;border-radius:50%;background:var(--ok);}
.osafe-rep{font-size:13.5px;color:var(--ink);line-height:1.55;}
/* its own line and a full-height target: this is the one link on the
 * page a worried learner must be able to hit first time */
.osafe-link{display:inline-flex;align-items:center;gap:6px;min-height:44px;color:var(--blue);font-weight:700;font-size:13.5px;}
.onote{font-size:12.5px;color:var(--mut);line-height:1.6;max-width:66ch;margin-top:6px;}
/* workbench */
.oback{border:none;background:none;color:var(--blue);font-family:inherit;font-size:13.5px;font-weight:700;
  cursor:pointer;padding:0;min-height:44px;display:inline-flex;align-items:center;}
.oback:hover{color:#B93A22;}
.owhead{margin:2px 0 16px;}
.owhead h3{font-size:21px;line-height:1.3;margin:10px 0 4px;}
.owhead p{font-size:14px;color:var(--mut);line-height:1.55;max-width:62ch;}
.owgrid{display:grid;grid-template-columns:minmax(0,5fr) minmax(0,7fr);gap:16px;align-items:start;margin-bottom:16px;}
.owcol{display:flex;flex-direction:column;gap:16px;min-width:0;}
.owgrid .card{margin-bottom:0;}
/* One column on a phone, and in the order a learner works: their
 * details, then the message those details just produced, then the
 * advice. Left in source order the message sat below the tips, a
 * full screen away from the boxes that were filling it in. */
@media(max-width:900px){.owgrid{display:flex;flex-direction:column;}
  .owcol{display:contents;}
  .ow-details{order:1;}.opreview{order:2;}.otips{order:3;}}
.ow-priv{font-size:12.5px;color:var(--mut);line-height:1.5;margin:-4px 0 12px;}
#ow-fields label{margin:13px 0 5px;font-size:13px;}
#ow-fields label:first-child{margin-top:0;}
#ow-fields input,#ow-fields textarea{width:100%;border:1.5px solid var(--line);border-radius:12px;padding:11px 13px;
  font-size:14.5px;font-family:inherit;color:var(--navy);background:#fff;}
.ohint{display:block;font-size:12px;color:var(--mut);margin-top:4px;line-height:1.4;}
.oclear{border:none;background:none;color:var(--blue);font-family:inherit;font-size:12.5px;font-weight:700;
  cursor:pointer;text-decoration:underline;padding:0;margin-top:12px;min-height:44px;display:inline-flex;align-items:center;}
.otips ul{list-style:none;}
.otips li{display:flex;gap:10px;padding:8px 0;font-size:13.5px;line-height:1.55;color:#3d4c59;
  border-bottom:1px solid var(--off);}
.otips li:last-child{border-bottom:none;}
.otips li::before{content:'✓';color:#1A7649;font-weight:800;flex:none;}
.olink{display:inline-flex;align-items:center;min-height:44px;margin-top:6px;font-size:13.5px;font-weight:700;
  color:#B93A22;text-decoration:none;}
.olink::after{content:' →';white-space:pre;}
.olink:hover{text-decoration:underline;}
/* the message, dressed as the thing it will become */
.opreview{padding:0;overflow:hidden;}
@media(min-width:901px){.opreview{position:sticky;top:16px;}}
.opv-bar{display:flex;align-items:center;gap:6px;background:var(--navy);color:#fff;padding:11px 16px;font-size:12.5px;}
.opv-dot{width:9px;height:9px;border-radius:50%;background:rgba(255,255,255,.35);}
.opv-bar b{margin-left:8px;font-weight:700;}
.opv-row{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-bottom:1px solid var(--off);font-size:14px;}
.opv-l{flex:none;font-size:11px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--mut);
  padding-top:3px;}
.opv-subject{flex:1;min-width:0;font-weight:700;line-height:1.45;overflow-wrap:anywhere;color:var(--navy);}
.opv-body{padding:18px 16px;font-size:14.5px;line-height:1.7;white-space:pre-wrap;color:#2A3F52;overflow-wrap:anywhere;}
/* still to add / already yours */
.ob{background:#FDEBD8;color:#7A430B;border-radius:5px;padding:1px 3px;font-weight:600;
  -webkit-box-decoration-break:clone;box-decoration-break:clone;}
.of{color:var(--navy);font-weight:600;border-bottom:1.5px dotted #C9B8A8;}
.opv-foot{border-top:1px solid var(--off);padding:14px 16px;background:#FCFBFA;}
.opv-foot a.btn{text-decoration:none;display:inline-flex;align-items:center;justify-content:center;}
.opv-status{display:block;font-size:13px;font-weight:700;margin-bottom:10px;line-height:1.45;}
.opv-status.todo{color:#9A5812;}
.opv-status.ok{color:#1A7649;}
.opv-status.over{color:#B93A22;}
.ocopy{flex:none;border:1.5px solid var(--line);background:#fff;border-radius:999px;padding:8px 16px;min-height:44px;
  font-family:inherit;font-size:12.5px;font-weight:700;color:var(--blue);cursor:pointer;}
.ocopy:hover{border-color:#B93A22;color:#B93A22;}
/* a script reads as a conversation */
.osc{padding:16px;display:flex;flex-direction:column;gap:10px;}
.osc-line.say{background:#F1F6FB;border:1px solid #D5E3F0;border-radius:14px 14px 14px 4px;padding:11px 14px;
  align-self:flex-start;max-width:94%;}
.osc-who{display:block;font-size:10.5px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;
  color:var(--blue);margin-bottom:3px;}
.osc-line p,.osc-reply p{font-size:14.5px;line-height:1.6;color:#2A3F52;margin:0;overflow-wrap:anywhere;}
.osc-line.note{padding:0 4px;}
.osc-line.note p{font-size:13px;color:var(--mut);font-style:italic;}
.osc-brh{font-size:11px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#9A5812;margin:4px 16px 8px;}
.osc-b{margin:0 16px 10px;border:1px solid var(--line);border-radius:12px;overflow:hidden;}
.osc-cue{background:#FFF7EE;padding:9px 13px;font-size:13px;font-weight:700;color:#7A430B;line-height:1.45;}
.osc-reply{padding:10px 13px;}
@media(max-width:560px){
  .opv-foot .btn{flex:1 1 100%;}
  .owhead h3{font-size:19px;}
}
`;
