/* "My work" — the learner's own library of everything they have had
 * reviewed, with the feedback it earned.
 *
 * The gap this closes: a learner wrote a CV, got a report full of
 * specific advice, closed the tab, and had nothing. Coming back meant
 * pasting the whole thing again from wherever the original lived, and
 * the advice was gone. Practice you cannot return to is not practice.
 *
 * Everything here is read from the learner's own browser (see the
 * flLib* helpers in pages.ts) — the documents were never sent anywhere
 * to be stored, and this page does not change that. The trade-off is
 * stated on the page rather than hidden: clear your browser data and
 * this empties.
 */

import { appShell } from "./pages";

const LIBRARY_CSS = `
.lib-lead{color:var(--mut);font-size:14.5px;max-width:62ch;margin:-4px 0 20px;}
.lib-filters{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;}
.lib-f{font:600 13px/1 inherit;padding:12px 16px;min-height:44px;border-radius:99px;cursor:pointer;
  border:1px solid var(--line);background:#fff;color:var(--ink);}
.lib-f.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.lib-grid{display:grid;gap:14px;}
.lib-card{background:#fff;border:1px solid var(--line);border-radius:14px;padding:0;overflow:hidden;}
.lib-top{display:flex;align-items:flex-start;gap:12px;padding:16px 18px 12px;}
.lib-kind{font:700 10.5px/1 inherit;letter-spacing:.1em;text-transform:uppercase;
  padding:6px 9px;border-radius:6px;background:var(--off);color:var(--blue);white-space:nowrap;}
.lib-h{flex:1;min-width:0;}
.lib-t{font-weight:700;font-size:15.5px;color:var(--ink);word-break:break-word;}
.lib-when{font-size:12.5px;color:var(--mut);margin-top:2px;}
.lib-score{display:flex;flex-direction:column;align-items:center;justify-content:center;
  width:52px;height:52px;border-radius:50%;color:#fff;font-weight:800;font-size:17px;flex:none;}
.lib-score span{font-size:8.5px;font-weight:700;letter-spacing:.06em;opacity:.9;}
.lib-noscore{width:52px;height:52px;border-radius:50%;border:2px dashed var(--line);flex:none;}
.lib-body{padding:0 18px 14px;}
.lib-snip{font-size:13px;line-height:1.6;color:var(--mut);white-space:pre-wrap;
  max-height:78px;overflow:hidden;position:relative;}
.lib-fix{margin:12px 0 0;padding:12px 14px;border-radius:10px;background:#FFF6F3;
  border:1px solid #F3D9D1;font-size:13.3px;line-height:1.6;color:#6B3A2E;}
.lib-fix b{display:block;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;
  color:#B93A22;margin-bottom:4px;}
.lib-acts{display:flex;flex-wrap:wrap;gap:8px;padding:12px 18px;border-top:1px solid var(--line);
  background:#FCFBFA;}
.lib-btn{font:700 13px/1 inherit;padding:11px 15px;min-height:44px;border-radius:9px;cursor:pointer;
  border:1px solid var(--pri-btn);background:var(--pri-btn);color:#fff;display:inline-flex;
  align-items:center;text-decoration:none;}
.lib-btn.ghost{background:#fff;color:var(--ink);border-color:var(--line);}
.lib-btn.danger{background:#fff;color:#9A2D18;border-color:#E9CFC8;margin-left:auto;}
.lib-empty{background:#fff;border:1px dashed var(--line);border-radius:14px;padding:30px 22px;text-align:center;}
.lib-empty h3{margin:0 0 6px;font-size:17px;}
.lib-empty p{color:var(--mut);font-size:14px;margin:0 auto 16px;max-width:46ch;}
.lib-note{margin-top:22px;font-size:12.5px;color:var(--mut);line-height:1.6;max-width:62ch;}
.lib-full{white-space:pre-wrap;font-size:13.5px;line-height:1.7;color:var(--ink);
  background:#FCFBFA;border:1px solid var(--line);border-radius:10px;padding:14px 16px;margin-top:10px;}
@media(max-width:560px){
  .lib-top{flex-wrap:wrap;}
  .lib-acts .lib-btn{flex:1 1 auto;justify-content:center;}
  .lib-acts .lib-btn.danger{margin-left:0;}
}
`;

export function renderLibraryPage(): string {
  const body =
    "<main class='wrap'>" +
    "<h2 class='page'>My work</h2>" +
    "<p class='lib-lead'>Everything you have had reviewed, kept with the feedback it earned. " +
    "Open anything to read the advice again, or send it straight back into the tool to edit " +
    "the words rather than starting over.</p>" +
    "<div class='lib-filters' id='lib-filters' role='group' aria-label='Filter by type'>" +
    "<button type='button' class='lib-f on' data-k='all'>Everything</button>" +
    "<button type='button' class='lib-f' data-k='cv'>CVs</button>" +
    "<button type='button' class='lib-f' data-k='cover'>Cover letters</button>" +
    "<button type='button' class='lib-f' data-k='linkedin'>LinkedIn</button>" +
    "</div>" +
    "<div class='lib-grid' id='lib-grid'></div>" +
    "<p class='lib-note' id='lib-note'></p>" +
    "</main>" +
    "<script>" + LIBRARY_JS + "</script>";

  return appShell({
    title: "Fledglings — My work",
    active: "library",
    bodyHtml: body,
    extraCss: LIBRARY_CSS,
  });
}

const LIBRARY_JS = String.raw`(function(){
var $=function(id){return document.getElementById(id)};
function esc(t){return String(t==null?'':t)
.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
flIdentityChip();
var KINDS={cv:{label:'CV',href:'/tools'},cover:{label:'Cover letter',href:'/cover-letter'},
linkedin:{label:'LinkedIn',href:'/linkedin'}};
var filter='all',rows=[];
function band(s){return s>=70?'#1B9E5A':s>=50?'#F59E0B':'#B93A22'}
function ago(at){var d=Math.floor((Date.now()/1000-at)/86400);
if(d<=0){var h=Math.floor((Date.now()/1000-at)/3600);
return h<=0?'just now':h===1?'an hour ago':h+' hours ago';}
return d===1?'yesterday':d<7?d+' days ago':d<30?Math.round(d/7)+' weeks ago':Math.round(d/30)+' months ago';}
/* The single most useful thing to see again is the top fix — the
 * reason the score is what it is. */
function topFix(r){if(!r||!r.report)return '';
var rep=r.report;
if(rep.next_step)return String(rep.next_step);
if(rep.improvements&&rep.improvements.length){var i=rep.improvements[0];
return (i.title?i.title+' — ':'')+(i.detail||'');}
return '';}
function card(r){var k=KINDS[r.kind]||{label:r.kind,href:'/hub'};
var sc=typeof r.score==='number'?r.score:null;
var fix=topFix(r);
return "<article class='lib-card' data-id='"+esc(r.id)+"'>"+
"<div class='lib-top'>"+
"<span class='lib-kind'>"+esc(k.label)+"</span>"+
"<span class='lib-h'><span class='lib-t'>"+esc(r.title||k.label)+"</span>"+
"<span class='lib-when'>Reviewed "+esc(ago(r.at))+"</span></span>"+
(sc===null?"<span class='lib-noscore' title='Not scored'></span>"
:"<span class='lib-score' style='background:"+band(sc)+"'>"+sc+"<span>/100</span></span>")+
"</div>"+
"<div class='lib-body'><div class='lib-snip'>"+esc(String(r.text||'').slice(0,320))+"</div>"+
(fix?"<div class='lib-fix'><b>Your next fix</b>"+esc(fix)+"</div>":"")+
"<div class='lib-full' id='full-"+esc(r.id)+"' hidden></div></div>"+
"<div class='lib-acts'>"+
"<a class='lib-btn' href='"+k.href+"' data-open='"+esc(r.id)+"'>Edit this in the tool</a>"+
"<button type='button' class='lib-btn ghost' data-toggle='"+esc(r.id)+"'>Read it all</button>"+
"<button type='button' class='lib-btn danger' data-del='"+esc(r.id)+"'>Delete</button>"+
"</div></article>";}
function render(){
var list=rows.filter(function(r){return filter==='all'||r.kind===filter});
if(!list.length){
$('lib-grid').innerHTML="<div class='lib-empty'><h3>"+
(rows.length?"Nothing here yet in this type":"Your work will collect here")+"</h3>"+
"<p>"+(rows.length
?"Try another filter, or review something new."
:"Every CV, cover letter and profile you have reviewed gets saved here automatically, with its feedback — so you can come back and improve it.")+
"</p><a class='lib-btn' href='/tools'>Review a CV</a></div>";return;}
$('lib-grid').innerHTML=list.map(card).join('');
$('lib-grid').querySelectorAll('[data-toggle]').forEach(function(b){b.addEventListener('click',function(){
var id=b.getAttribute('data-toggle');var box=$('full-'+id);var row=rows.filter(function(r){return r.id===id})[0];
if(!box||!row)return;
if(!box.hidden){box.hidden=true;b.textContent='Read it all';return;}
/* A document saved on another device has no words here yet — fetch
 * them on demand rather than pulling every body into the list. */
b.disabled=true;b.textContent='Opening…';
flLibText(row).then(function(txt){b.disabled=false;
if(!txt){b.textContent='Read it all';
box.textContent='Could not load this one just now — check your connection and try again.';
box.hidden=false;return;}
row.text=txt;box.textContent=txt;box.hidden=false;b.textContent='Hide';});});});
/* Reopening needs the words in hand before the browser follows the
 * link, so a remote document is fetched first and then navigated. */
$('lib-grid').querySelectorAll('[data-open]').forEach(function(a){a.addEventListener('click',function(e){
var id=a.getAttribute('data-open');var row=rows.filter(function(r){return r.id===id})[0];
if(!row)return;
if(row.text){flLibHandoff(row.text);return;}
e.preventDefault();a.textContent='Opening…';
flLibText(row).then(function(txt){
if(txt)flLibHandoff(txt);
location.href=a.getAttribute('href');});});});
$('lib-grid').querySelectorAll('[data-del]').forEach(function(b){b.addEventListener('click',function(){
var id=b.getAttribute('data-del');
if(!window.confirm('Delete this from your library? The feedback goes with it.'))return;
flLibRemove(id).then(function(){rows=rows.filter(function(r){return r.id!==id});render();note();});});});}
function note(){if(!rows.length){$('lib-note').textContent='';return;}
$('lib-note').textContent=flResolveEmail()
?'Signed in, so your work follows you — open the hub on your phone or a school computer and it is all here. Delete something and it goes from every device.'
:'Saved in this browser only. Sign in on the hub and your work follows you to any device — otherwise clearing your browser data clears this.';}
document.querySelectorAll('.lib-f').forEach(function(b){b.addEventListener('click',function(){
document.querySelectorAll('.lib-f').forEach(function(o){o.classList.toggle('on',o===b)});
filter=b.getAttribute('data-k');render();});});
flLibList().then(function(list){rows=list||[];render();note();})
.catch(function(){rows=[];render();note();});
})();`;
