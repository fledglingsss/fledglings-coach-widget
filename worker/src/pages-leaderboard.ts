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
 */

import { appShell } from "./pages";

export function renderLeaderboardPage(): string {
  const body =
    "<main class='wrap' style='max-width:940px'>" +
    "<h2 class='page'>Leaderboard</h2>" +
    "<p class='sub'>Every module you finish scores for your cohort. See how this month's race is going, " +
    "and where you sit among the people you learn with.</p>" +

    /* ---------- the cohort race ---------- */
    "<section class='card lbd-race' aria-labelledby='lbd-race-h'>" +
    "<div class='lbd-hero'><div><span class='lbd-kicker'>THE LEARNER GAMES</span>" +
    "<h3 id='lbd-race-h'>Cohort against cohort</h3>" +
    "<p>One month, every completed module scores a point. Bragging rights only.</p></div>" +
    "<span class='lbd-month' id='lbd-month'></span></div>" +
    "<div class='lbd-rows' id='lbd-race'><p class='lbd-wait'>Loading the race…</p></div>" +
    "<p class='lbd-note' id='lbd-race-note' hidden></p>" +
    "</section>" +

    /* ---------- the learner's own cohort ---------- */
    "<section class='card' aria-labelledby='lbd-board-h'>" +
    "<div class='lbd-bhead'><h3 id='lbd-board-h'>Your cohort</h3>" +
    "<span class='lbd-cohort' id='lbd-cohort' hidden></span></div>" +
    "<div id='lbd-board'><p class='lbd-wait'>Loading your cohort…</p></div>" +
    "<p class='lbd-note' id='lbd-board-note' hidden></p>" +
    "</section>" +

    /* ---------- the way up ---------- */
    "<div class='card lbd-climb' id='lbd-climb' hidden>" +
    "<div class='lbd-climb-b'><span class='lbd-kicker'>CLIMB THE BOARD</span>" +
    "<b id='lbd-next-title'></b>" +
    "<span id='lbd-next-sub'></span></div>" +
    "<a class='btn' id='lbd-next-btn' href='#' target='_top'>Continue →</a></div>" +

    "<p class='sub' style='font-size:12.5px;margin-top:8px'>How this works: the race counts modules completed by each cohort " +
    "this calendar month and shows cohort names and totals only. Your cohort's board counts every module each person has " +
    "completed and is shown only to people in that cohort, with the name your school already knows you by. " +
    "Your CV, interview and cover letter scores are never ranked or shown to anyone here.</p>" +
    "</main>" +
    "<script>" + LEADERBOARD_JS + "</script>";

  return appShell({
    title: "Fledglings - Leaderboard",
    active: "leaderboard",
    bodyHtml: body,
    extraCss: LEADERBOARD_CSS,
  });
}

const LEADERBOARD_JS = String.raw`(function(){
var $=function(id){return document.getElementById(id)};
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
.replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
var lid=flStoredId(localStorage,'fl_coach_learner_v1');
try{flAdoptEmbedEmail(lid);}catch(e){}
function people(n){return n===1?'1 person':n+' people'}
function hubHref(hash){var t=flToken();return '/hub'+(t?'?t='+encodeURIComponent(t):'')+(hash||'');}

function raceHtml(rows){var max=1;rows.forEach(function(r){if(r.count>max)max=r.count});
return rows.map(function(r,i){
return "<div class='lbd-row"+(r.mine?' mine':'')+"'><span class='lbd-pos'>"+(i+1)+"</span>"+
"<span class='lbd-mid'><span class='lbd-name'>"+esc(r.cohort)+(r.mine?" <i class='lbd-you'>Your cohort</i>":'')+"</span>"+
"<span class='lbd-track' aria-hidden='true'><i style='width:"+Math.max(4,Math.round(r.count*100/max))+"%'></i></span></span>"+
"<span class='lbd-count'>"+r.count+"<small>"+(r.count===1?'module':'modules')+"</small></span></div>"}).join('');}

function boardHtml(rows,myColour){
return rows.map(function(r,i){
/* the learner's own row sits apart from the top five when they are
 * further down: the gap says "and then, lower, you" */
var gap=r.isMe&&i>0&&r.rank>rows[i-1].rank+1?"<div class='lbd-gap' aria-hidden='true'>⋮</div>":'';
var colour=r.isMe&&myColour?myColour:flAvatarColour(r.name);
return gap+"<div class='lbd-row person"+(r.isMe?' mine':'')+"'><span class='lbd-pos'>"+r.rank+"</span>"+
"<span class='lbd-av' aria-hidden='true' style='background:"+colour+"'>"+esc(flInitialsOf(r.name))+"</span>"+
"<span class='lbd-mid'><span class='lbd-name'>"+esc(r.name)+(r.isMe?" <i class='lbd-you'>You</i>":'')+"</span></span>"+
"<span class='lbd-count'>"+r.completed+"<small>"+(r.completed===1?'module':'modules')+"</small></span></div>"}).join('');}

function emptyBoard(title,text,cta){
return "<div class='lbd-empty'><b>"+esc(title)+"</b><p>"+esc(text)+"</p>"+(cta||'')+"</div>";}

function render(d){
$('lbd-month').textContent=d.month||'';
var race=d.race||[];
$('lbd-race').innerHTML=race.length?raceHtml(race):
"<p class='lbd-wait'>The starting gun has fired. The first module completed this month puts a cohort on the board.</p>";
var raced=race.some(function(r){return r.mine});
if(d.cohort&&race.length&&!raced){$('lbd-race-note').hidden=false;
$('lbd-race-note').textContent=d.cohort+' has not scored yet this month. The next module one of you finishes puts it on the board.';}

var board=d.board||[];
if(!d.signedIn){
$('lbd-board').innerHTML=emptyBoard('Sign in to see your cohort',
'Your cohort comes from your school account, so the board appears once this device knows who you are.',
"<a class='btn' href='"+esc(hubHref('#account'))+"'>Sign in</a>");return;}
if(!d.cohort){
$('lbd-board').innerHTML=emptyBoard('You are not in a cohort yet',
'Cohorts are set up by your school or training provider. Once you are added to one, its board appears here. The race above is open to everyone.','');return;}
$('lbd-cohort').hidden=false;$('lbd-cohort').textContent=d.cohort;
if(!board.length){
$('lbd-board').innerHTML=emptyBoard('Nobody is on this board yet',
'It fills up as people in '+d.cohort+' open it. Your own modules are still being counted, so look again in a little while.','');return;}
$('lbd-board').innerHTML="<div class='lbd-rows'>"+boardHtml(board,flAvatarColour(flResolveEmail()))+"</div>";
var note=$('lbd-board-note');note.hidden=false;
note.textContent=d.onBoard>5?'Showing the top five of '+people(d.onBoard)+' on the board, and your own place.'
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
$('lbd-race').innerHTML="<p class='lbd-wait'>The leaderboard could not load just now. Try again in a minute.</p>";
$('lbd-board').innerHTML='';}

fetch('/api/leaderboard',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:lid,token:flToken()})})
.then(function(r){return r.json()}).then(function(d){if(!d||!d.ok){unavailable();return;}render(d);})
.catch(unavailable);
/* QA hook: draw the page from a given answer, without the network. */
window.__flBoardShow=render;
})();`;

const LEADERBOARD_CSS = `
.lbd-race{padding:0;overflow:hidden;}
.lbd-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;
  background:linear-gradient(150deg,#05253C 0%,#0A3452 58%,#13507F 135%);color:#fff;padding:24px 26px;}
.lbd-kicker{display:block;font-size:11px;font-weight:800;letter-spacing:.14em;color:#ED9249;margin-bottom:6px;}
.lbd-hero h3{font-size:24px;font-weight:800;margin:0 0 4px;color:#fff;}
.lbd-hero p{font-size:14px;color:#C9D9E6;line-height:1.5;max-width:34em;}
.lbd-month{font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#FFD9B5;
  border:1px solid rgba(237,146,73,.5);background:rgba(237,146,73,.16);border-radius:999px;padding:7px 16px;white-space:nowrap;}
.lbd-month:empty{display:none;}
.lbd-race .lbd-rows{padding:10px 26px 14px;}
.lbd-race .lbd-note{padding:0 26px 20px;margin:0;}
.lbd-wait{color:var(--mut);font-size:14.5px;line-height:1.6;padding:14px 0;}
.lbd-row{display:grid;grid-template-columns:40px 1fr auto;gap:14px;align-items:center;padding:12px 10px;border-radius:14px;}
.lbd-row.person{grid-template-columns:40px 40px 1fr auto;gap:12px;}
.lbd-row.mine{background:#FFF6F0;box-shadow:inset 0 0 0 1.5px #F3C9A6;}
.lbd-pos{width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
  font-weight:800;font-size:14.5px;color:#fff;background:#05253C;}
/* gold, silver, bronze for the first three places, as on the Games page */
.lbd-rows .lbd-row:nth-child(1) .lbd-pos{background:radial-gradient(circle at 35% 28%,#FFE3AE,#ED9249 55%,#D9452B);color:#3A1A08;}
.lbd-rows .lbd-row:nth-child(2) .lbd-pos{background:radial-gradient(circle at 35% 28%,#F4F8FB,#C3CDD8 55%,#97A6B5);color:#05253C;}
.lbd-rows .lbd-row:nth-child(3) .lbd-pos{background:radial-gradient(circle at 35% 28%,#F0CBA3,#C77B44 55%,#9A5A2C);color:#2E1606;}
.lbd-av{width:40px;height:40px;border-radius:50%;color:#fff;font-weight:700;font-size:14px;letter-spacing:.02em;
  display:flex;align-items:center;justify-content:center;}
.lbd-mid{min-width:0;display:flex;flex-direction:column;gap:7px;}
.lbd-name{font-size:15.5px;font-weight:700;color:var(--navy);overflow-wrap:anywhere;}
.lbd-you{font-style:normal;font-size:11px;font-weight:800;color:#8C2B18;background:#FBE1D6;border-radius:999px;
  padding:3px 9px;margin-left:6px;white-space:nowrap;vertical-align:2px;}
.lbd-track{display:block;height:14px;border-radius:999px;background:var(--off);overflow:hidden;}
.lbd-track i{display:block;height:100%;border-radius:999px;background:linear-gradient(90deg,#ED9249,#D9452B);
  transition:width .7s cubic-bezier(.2,.7,.3,1);}
.lbd-count{font-size:22px;font-weight:800;color:var(--navy);text-align:right;font-variant-numeric:tabular-nums;line-height:1.05;}
.lbd-count small{display:block;font-size:11.5px;font-weight:600;color:var(--mut);}
.lbd-gap{text-align:left;padding:0 0 0 22px;color:var(--mut);font-size:16px;line-height:1;}
.lbd-bhead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-bottom:6px;}
.lbd-bhead h3{margin:0;font-size:18px;}
.lbd-cohort{font-size:12.5px;font-weight:700;color:#13507F;background:#EAF2F8;border-radius:999px;padding:5px 12px;}
.lbd-note{font-size:13px;color:var(--mut);line-height:1.55;margin-top:10px;}
.lbd-empty{padding:8px 0 4px;}
.lbd-empty b{display:block;font-size:16px;color:var(--navy);margin-bottom:4px;}
.lbd-empty p{font-size:14px;color:#4E5B66;line-height:1.6;max-width:46em;margin-bottom:12px;}
.lbd-empty .btn{display:inline-block;text-decoration:none;}
.lbd-climb{display:flex;align-items:center;gap:18px;border-left:4px solid var(--mango);}
.lbd-climb-b{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
.lbd-climb .lbd-kicker{color:var(--amber);margin-bottom:0;}
.lbd-climb b{font-size:16px;color:var(--navy);overflow-wrap:anywhere;}
.lbd-climb span{font-size:13.5px;color:#4E5B66;line-height:1.5;}
.lbd-climb .btn{flex:none;text-decoration:none;}
@media(max-width:560px){
  .lbd-hero{padding:20px 18px;}.lbd-hero h3{font-size:21px;}
  .lbd-race .lbd-rows{padding:8px 12px 12px;}.lbd-race .lbd-note{padding:0 18px 18px;}
  .lbd-row{grid-template-columns:34px 1fr auto;gap:10px;padding:11px 8px;}
  .lbd-row.person{grid-template-columns:34px 36px 1fr auto;gap:9px;}
  .lbd-pos{width:32px;height:32px;font-size:13px;}.lbd-av{width:36px;height:36px;font-size:13px;}
  .lbd-count{font-size:19px;}
  .lbd-climb{flex-direction:column;align-items:stretch;}.lbd-climb .btn{text-align:center;}
}
`;
