/* Leaderboard - the cohort boards, inside the hub.
 *
 * A tester suggested leaderboards by cohort, read from the platform's
 * tags, for when more schools join. The two boards already existed (the
 * monthly cohort race and each cohort's own board on the Skills
 * Passport); this page is the way to them from the hub, for the learner
 * who is signed in. /api/leaderboard decides what a device may see: the
 * race is cohort names and totals, and a cohort's own board goes only to
 * a learner in that cohort.
 *
 * Both boards count modules completed. Nothing from the CV, interview
 * or cover letter tools is ranked, here or anywhere.
 *
 * How it looks: the Learner Games page's navy opening, the Skills
 * Passport's tinted figures and its medal rows (pages-kit.ts), so the
 * board a learner meets here is recognisably the one on their passport.
 */

import { appShell } from "./pages";
import { BIRD_MARK } from "./brand";
import { KIT_CSS, heroBird, sloganBand } from "./pages-kit";

const TILE_OPEN =
  "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>";
const ICON_COHORT =
  TILE_OPEN + "<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/>" +
  "<path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg>";
const ICON_TROPHY = TILE_OPEN + "<path d='M6 4h12v4a6 6 0 0 1-12 0z'/><path d='M9 15h6M8 20h8M12 15v5'/></svg>";
const ICON_PLACE = TILE_OPEN + "<path d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'/><path d='M4 22v-7'/></svg>";
const ICON_BOOK = TILE_OPEN + "<path d='M4 5h16v13H4z'/><path d='M4 9h16M9 5v13'/></svg>";

export function renderLeaderboardPage(): string {
  const body =
    "<main class='wrap fk'>" +
    "<section class='fk-hero'>" + heroBird() +
    "<div class='lbd-heroin'><div class='fk-hero-b'>" +
    "<span class='fk-kicker'>The Learner Games</span>" +
    "<h2 class='fk-h'>Cohort against <em>cohort</em></h2>" +
    "<p>One month. Every module you finish scores a point for your cohort. " +
    "Bragging rights only, but the bragging is excellent.</p></div>" +
    "<div class='lbd-cal' id='lbd-cal' hidden><span>This month</span><b id='lbd-month'></b></div>" +
    "</div></section>" +

    /* ---------- where the learner stands ---------- */
    "<div class='fk-tiles' id='lbd-tiles' hidden>" +
    `<div class='fk-tile t1'><div class='th'>${ICON_COHORT}<span>Your cohort</span></div>` +
    "<div class='tv words' id='lbd-t-cohort'></div><div class='ts' id='lbd-t-cohort-s'></div></div>" +
    `<div class='fk-tile t2'><div class='th'>${ICON_TROPHY}<span>Cohort position</span></div>` +
    "<div class='tv' id='lbd-t-pos'></div><div class='ts' id='lbd-t-pos-s'></div></div>" +
    `<div class='fk-tile t3'><div class='th'>${ICON_PLACE}<span>Your place</span></div>` +
    "<div class='tv' id='lbd-t-place'></div><div class='ts' id='lbd-t-place-s'></div></div>" +
    `<div class='fk-tile t4'><div class='th'>${ICON_BOOK}<span>Your modules</span></div>` +
    "<div class='tv' id='lbd-t-mods'></div><div class='ts'>completed so far</div></div>" +
    "</div>" +

    /* ---------- the cohort race ---------- */
    "<section class='fk-panel' aria-labelledby='lbd-race-h'>" +
    "<div class='fk-sect'><h3 id='lbd-race-h'>This month's race</h3><span class='fk-note' id='lbd-race-n'></span></div>" +
    "<div id='lbd-race'><p class='fk-wait'>Loading the race…</p></div>" +
    "<p class='lbd-note' id='lbd-race-note' hidden></p>" +
    "</section>" +

    /* ---------- the learner's own cohort ---------- */
    "<section class='fk-panel' aria-labelledby='lbd-board-h'>" +
    "<div class='fk-sect'><h3 id='lbd-board-h'>Your cohort</h3><span class='fk-note' id='lbd-cohort' hidden></span></div>" +
    "<div id='lbd-board'><p class='fk-wait'>Loading your cohort…</p></div>" +
    "<p class='lbd-note' id='lbd-board-note' hidden></p>" +
    "</section>" +

    /* ---------- the way up ---------- */
    "<div class='fk-cta' id='lbd-climb' hidden>" +
    "<div class='fk-cta-b'><span class='fk-cta-k'>CLIMB THE BOARD</span>" +
    "<b id='lbd-next-title'></b><span id='lbd-next-sub'></span></div>" +
    "<a class='btn' id='lbd-next-btn' href='#' target='_top'>Continue →</a></div>" +

    sloganBand("The Learner Games · scored by modules completed") +
    "<p class='fk-small'>How this works: the race counts modules completed by each cohort " +
    "this calendar month and shows cohort names and totals only. Your cohort's board counts every module each person has " +
    "completed and is shown only to people in that cohort, with the name your school already knows you by. " +
    "Your CV, interview and cover letter scores are never ranked or shown to anyone here.</p>" +
    "</main>" +
    "<script>var FL_BIRD=" + JSON.stringify(BIRD_MARK).split("<").join("\\x3c") + ";</script>" +
    "<script>" + LEADERBOARD_JS + "</script>";

  return appShell({
    title: "Fledglings - Leaderboard",
    active: "leaderboard",
    bodyHtml: body,
    extraCss: KIT_CSS + LEADERBOARD_CSS,
  });
}

const LEADERBOARD_JS = String.raw`(function(){
var $=function(id){return document.getElementById(id)};
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
.replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
var lid=flStoredId(localStorage,'fl_coach_learner_v1');
try{flAdoptEmbedEmail(lid);}catch(e){}
function people(n){return n===1?'1 person':n+' people'}
function mods(n){return n===1?'module':'modules'}
function hubHref(hash){var t=flToken();return '/hub'+(t?'?t='+encodeURIComponent(t):'')+(hash||'');}
function fig(main,of){return "<span class='fig'>"+main+(of?" <small>/ "+of+"</small>":'')+"</span>";}

function raceHtml(rows){var max=1;rows.forEach(function(r){if(r.count>max)max=r.count});
return "<div class='lbd-race'>"+rows.map(function(r,i){
return "<div class='lbd-rrow"+(r.mine?' me':'')+"'><span class='fk-pos"+(i<3?' p'+(i+1):'')+"'>"+(i+1)+"</span>"+
"<span class='lbd-rn'><b>"+esc(r.cohort)+(r.mine?"<i class='fk-tag'>Your cohort</i>":'')+"</b>"+
"<span class='fk-track' aria-hidden='true'><i style='width:"+Math.max(4,Math.round(r.count*100/max))+"%;animation-delay:"+(i*0.08).toFixed(2)+"s'></i></span></span>"+
"<span class='lbd-ct'>"+r.count+"<small>"+mods(r.count)+"</small></span></div>"}).join('')+"</div>";}

function boardHtml(rows){
return "<div class='fk-rows'>"+rows.map(function(r,i){
/* the learner's own row sits apart from the top five when they are
 * further down: the dots say "and then, lower, you" */
var gap=r.isMe&&i>0&&r.rank>rows[i-1].rank+1?"<div class='lbd-gap' aria-hidden='true'><i></i><i></i><i></i></div>":'';
return gap+"<div class='fk-row"+(r.isMe?' me':'')+"' style='animation-delay:"+(i*0.05).toFixed(2)+"s'>"+
"<span class='fk-pos"+(r.rank<=3?' p'+r.rank:'')+"'>"+r.rank+"</span>"+
(r.isMe?"<span class='fk-av' aria-hidden='true'>"+esc(flInitialsOf(r.name))+"</span>":'')+
"<span class='rn'>"+esc(r.name)+(r.isMe?"<i class='fk-tag'>You</i>":'')+"</span>"+
"<span class='rd'>"+r.completed+' '+mods(r.completed)+"</span></div>"}).join('')+"</div>";}

function empty(title,text,cta){
return "<div class='fk-empty'><span class='eb' aria-hidden='true'>"+FL_BIRD+"</span><div><b>"+esc(title)+"</b><p>"+esc(text)+"</p></div>"+(cta||'')+"</div>";}

function render(d){
if(d.month){$('lbd-cal').hidden=false;$('lbd-month').textContent=d.month;}
var race=d.race||[],board=d.board||[];
$('lbd-race-n').textContent=race.length?(race.length===1?'1 cohort':race.length+' cohorts')+' on the board':'';
$('lbd-race').innerHTML=race.length?raceHtml(race):
empty('The starting gun has fired','The first module completed this month puts a cohort on the board. It could be yours.','');
var minePos=-1;race.forEach(function(r,i){if(r.mine)minePos=i});
var note=$('lbd-race-note');note.hidden=true;
if(d.cohort&&race.length&&minePos===-1){note.hidden=false;
note.textContent=d.cohort+' has not scored yet this month. The next module one of you finishes puts it on the board.';}

var tiles=$('lbd-tiles');tiles.hidden=true;
$('lbd-cohort').hidden=true;$('lbd-board-note').hidden=true;$('lbd-climb').hidden=true;
if(!d.signedIn){
$('lbd-board').innerHTML=empty('Sign in to see where you sit',
'Your cohort comes from your school account, so its board appears once this device knows who you are.',
"<a class='btn' href='"+esc(hubHref('#account'))+"'>Sign in</a>");return;}
if(!d.cohort){
$('lbd-board').innerHTML=empty('You are not in a cohort yet',
'Cohorts are set up by your school or training provider. Once you are added to one, its board appears here. The race above is open to everyone.','');return;}
$('lbd-cohort').hidden=false;$('lbd-cohort').textContent=d.cohort;
/* where the learner stands, as four figures */
var me=board.filter(function(r){return r.isMe})[0]||null;
tiles.hidden=false;
$('lbd-t-cohort').textContent=d.cohort;
$('lbd-t-cohort-s').textContent=d.onBoard?people(d.onBoard)+' on its board':'nobody on its board yet';
$('lbd-t-pos').innerHTML=minePos>-1?fig('#'+(minePos+1),race.length):fig('–','');
$('lbd-t-pos-s').textContent=minePos>-1?'in this month\'s race':'not scored yet this month';
$('lbd-t-place').innerHTML=me?fig('#'+me.rank,d.onBoard):fig('–','');
$('lbd-t-place-s').textContent=me?'in your cohort':'still being counted';
$('lbd-t-mods').innerHTML=me?fig(String(me.completed),''):fig('–','');
if(!board.length){
$('lbd-board').innerHTML=empty('Nobody is on this board yet',
'It fills up as people in '+d.cohort+' open it. Your own modules are still being counted, so look again in a little while.','');return;}
$('lbd-board').innerHTML=boardHtml(board);
var bn=$('lbd-board-note');bn.hidden=false;
bn.textContent=d.onBoard>5?'Showing the top five of '+people(d.onBoard)+' on the board, and your own place.'
:d.onBoard===1?'You are the first one here. The board fills up as the rest of your cohort open it.'
:people(d.onBoard)+' on the board so far. It fills up as the rest of your cohort open it.';
/* the one thing that moves someone up the board */
fetch('/api/next-step',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,token:flToken()})})
.then(function(r){return r.json()}).then(function(ns){
if(!ns||!ns.ok||!ns.url)return;
$('lbd-climb').hidden=false;$('lbd-next-title').textContent=ns.title;
$('lbd-next-sub').textContent=ns.percent>0?'You are '+ns.percent+'% through. Finishing it scores for you and for '+d.cohort+'.'
:'Your next module. Finishing it scores for you and for '+d.cohort+'.';
$('lbd-next-btn').href=ns.url;}).catch(function(){});}

function unavailable(){
$('lbd-race').innerHTML=empty('The leaderboard could not load just now','Give it a minute and try again.','');
$('lbd-board').innerHTML='';}

fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,token:flToken()})})
.then(function(r){return r.json()}).then(function(d){if(!d||!d.ok){unavailable();return;}render(d);})
.catch(unavailable);
/* QA hook: draw the page from a given answer, without the network. */
window.__flBoardShow=render;
})();`;

export const LEADERBOARD_CSS = `
.lbd-heroin{position:relative;display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;}
/* this month, as a page from a calendar */
.lbd-cal{flex:none;text-align:center;border-radius:18px;overflow:hidden;background:rgba(255,255,255,.1);
  border:1px solid rgba(255,255,255,.2);min-width:148px;}
.lbd-cal span{display:block;font-size:10.5px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;
  color:#05253C;background:#ED9249;padding:6px 14px;}
.lbd-cal b{display:block;font-size:19px;font-weight:700;color:#fff;padding:12px 16px 14px;}
.fk-tile .fig{white-space:nowrap;}
/* ---- the race ---- */
.lbd-race{display:flex;flex-direction:column;gap:4px;}
.lbd-rrow{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:16px;align-items:center;padding:12px 12px;border-radius:16px;
  animation:fk-rise .45s both;}
.lbd-rrow.me{background:linear-gradient(180deg,#fff,#FFF7EE);box-shadow:inset 0 0 0 2px #ED9249;}
.lbd-rn{display:flex;flex-direction:column;gap:8px;min-width:0;}
.lbd-rn b{font-size:16px;font-weight:700;color:#05253C;overflow-wrap:anywhere;}
.lbd-rrow .fk-track{height:18px;}
.lbd-ct{font-size:27px;font-weight:800;color:#05253C;text-align:right;line-height:1;font-variant-numeric:tabular-nums;}
.lbd-ct small{display:block;font-size:11.5px;font-weight:600;color:#5C6A76;margin-top:4px;}
.lbd-note{font-size:13px;color:#5C6A76;line-height:1.55;margin-top:12px;}
.lbd-gap{display:flex;justify-content:center;gap:5px;padding:2px 0;}
.lbd-gap i{width:5px;height:5px;border-radius:50%;background:#C9BFB9;}
@media(max-width:640px){
  .lbd-cal{min-width:0;display:flex;align-items:stretch;}
  .lbd-cal span{display:flex;align-items:center;padding:8px 12px;}.lbd-cal b{font-size:15px;padding:8px 14px;}
  .lbd-rrow{grid-template-columns:32px minmax(0,1fr) auto;gap:11px;padding:11px 8px;}
  .lbd-rrow .fk-pos,.fk-row .fk-pos{width:32px;height:32px;font-size:13px;}
  .lbd-rrow .fk-track{height:14px;}.lbd-ct{font-size:22px;}
  .fk-row .rd{font-size:12.5px;}
}
`;
