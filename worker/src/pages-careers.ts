/* Career quiz - 24 quick questions about what a learner would enjoy,
 * answered with the kinds of work that might suit them and the routes
 * into each (see lib/career-quiz.ts for the content and the scoring).
 *
 * A tester asked for something like the UCAS careers quiz that covers
 * every pathway, not university alone. It is a page and nothing more:
 * the answers are scored in the learner's browser, kept in that browser
 * so the result is still there next time, and never sent to the worker.
 * No AI is involved, so the same answers always give the same result.
 *
 * How it looks: the Fledglings way (pages-kit.ts). Each of the six
 * interests is a hexagon medal, like the badges on the Skills Passport;
 * the quiz is one question at a time with the bird flying along the
 * progress line; the result opens on the learner's three medals.
 */

import { appShell, esc } from "./pages";
import { BIRD_MARK } from "./brand";
import { KIT_CSS, confetti, heroBird, sectionLabel, sloganBand } from "./pages-kit";
import { CAREER_QUIZ_JS, QUIZ_AREAS, QUIZ_ITEMS, careerQuizData, type AreaId } from "./lib/career-quiz";

/** JSON for a script tag: "<" is the one character that could end it. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).split("<").join("\\x3c");
}

const ICON_OPEN =
  "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.9' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>";

export interface AreaArt {
  /** The medal's face: one of the passport's own medal gradients, or a
   * brand colour treated the same way. */
  medal: string;
  /** The icon's colour on that face. */
  ink: string;
  /** The same colour family as a bar. */
  bar: string;
  icon: string;
}

/* One medal for each interest. Six faces from four brand colours and the
 * passport's bronze: no colour here is new to the product. */
export const AREA_ART: Record<AreaId, AreaArt> = {
  /* Hands-on - a spanner, on bronze */
  maker: {
    medal: "radial-gradient(circle at 35% 28%,#F0CBA3,#C77B44 55%,#9A5A2C)",
    ink: "#fff",
    bar: "linear-gradient(90deg,#F3B36B,#C77B44)",
    icon:
      ICON_OPEN +
      "<path d='M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z'/></svg>",
  },
  /* Problem solver - a light bulb, on blue */
  solver: {
    medal: "radial-gradient(circle at 35% 28%,#8DB4D6,#13507F 60%,#0A3452)",
    ink: "#fff",
    bar: "linear-gradient(90deg,#4A7FAC,#13507F)",
    icon:
      ICON_OPEN +
      "<path d='M9.5 18h5M10.5 21h3'/><path d='M12 3a6 6 0 0 0-3.7 10.7c.8.7 1.2 1.4 1.2 2.3h5c0-.9.4-1.6 1.2-2.3A6 6 0 0 0 12 3z'/></svg>",
  },
  /* Creative - a pen nib, on gold */
  creator: {
    medal: "radial-gradient(circle at 35% 28%,#FFE3AE,#ED9249 55%,#D9452B)",
    ink: "#fff",
    bar: "linear-gradient(90deg,#ED9249,#D9452B)",
    icon:
      ICON_OPEN +
      "<path d='M12 19l7-7 3 3-7 7-3-3z'/><path d='M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z'/><path d='M2 2l7.6 7.6'/><circle cx='11' cy='11' r='2'/></svg>",
  },
  /* People person - two people, on pale mango */
  helper: {
    medal: "radial-gradient(circle at 35% 28%,#FFF1DF,#F6C48D 58%,#ED9249)",
    ink: "#05253C",
    bar: "linear-gradient(90deg,#F8CFA0,#ED9249)",
    icon:
      ICON_OPEN +
      "<path d='M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2'/><circle cx='9' cy='7' r='4'/><path d='M23 21v-2a4 4 0 0 0-3-3.87'/><path d='M16 3.13a4 4 0 0 1 0 7.75'/></svg>",
  },
  /* Go-getter - a rocket, on deep orange */
  leader: {
    medal: "radial-gradient(circle at 35% 28%,#F2937A,#D9452B 55%,#9E2F1B)",
    ink: "#fff",
    bar: "linear-gradient(90deg,#D9452B,#9E2F1B)",
    icon:
      ICON_OPEN +
      "<path d='M12 2.5c3 2 4.5 5.2 4.5 8.5v4.5h-9V11c0-3.3 1.5-6.5 4.5-8.5z'/><circle cx='12' cy='9' r='1.6'/>" +
      "<path d='M7.5 12.5l-3 3.2V19l3-1.3M16.5 12.5l3 3.2V19l-3-1.3'/><path d='M10.4 18.5c.3 1.2.8 2.1 1.6 3 .8-.9 1.3-1.8 1.6-3'/></svg>",
  },
  /* Organiser - a ticked clipboard, on the passport's silver. (It was
   * navy, and vanished against the navy the results open on.) */
  organiser: {
    medal: "radial-gradient(circle at 35% 28%,#F4F8FB,#C3CDD8 55%,#97A6B5)",
    ink: "#05253C",
    bar: "linear-gradient(90deg,#C3CDD8,#7C8DA0)",
    icon:
      ICON_OPEN +
      "<path d='M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2'/><rect x='8' y='2' width='8' height='4' rx='1'/><path d='M9 14l2 2 4-4'/></svg>",
  },
};

/** One interest as a medal. `earned` gives it the passport's ribbons. */
export function interestMedal(id: AreaId, size: number, earned = false, delay = 0): string {
  const art = AREA_ART[id];
  return (
    `<span class='fk-medwrap${earned ? " earned" : ""}' style='--m:${size}px${delay ? `;animation-delay:${delay.toFixed(2)}s` : ""}'>` +
    `<span class='fk-med' style='background:${art.medal};color:${art.ink}'>${art.icon}</span></span>`
  );
}

const LOCK_ICON =
  ICON_OPEN + "<rect x='5' y='11' width='14' height='9' rx='2'/><path d='M8 11V8a4 4 0 0 1 8 0v3'/></svg>";

export function renderCareerQuizPage(): string {
  const total = QUIZ_ITEMS.length;
  const ids = QUIZ_AREAS.map((area) => area.id);
  /* The six interests as a honeycomb: three medals over three. */
  const comb =
    "<div class='cq-comb' aria-hidden='true'>" +
    `<div class='cq-comb-r'>${ids.slice(0, 3).map((id, i) => interestMedal(id, 84, false, 0.1 + i * 0.08)).join("")}</div>` +
    `<div class='cq-comb-r r2'>${ids.slice(3).map((id, i) => interestMedal(id, 84, false, 0.34 + i * 0.08)).join("")}</div>` +
    "</div>";

  const body =
    "<main class='wrap fk'>" +

    /* ---------- start ---------- */
    "<div id='cq-start'>" +
    "<section class='fk-hero cq-hero'>" + heroBird() +
    "<div class='cq-heroin'><div class='fk-hero-b'>" +
    "<span class='fk-kicker'>Career quiz</span>" +
    "<h2 class='fk-h'>Not sure what you want to <em>do</em>?</h2>" +
    "<p>Most people are not. Tell us what you would enjoy and see the kinds of work that might suit you, " +
    "and every way in: <b>not university alone</b>.</p>" +
    "<div class='fk-hero-cta'><button type='button' class='btn' id='cq-go'>Start the quiz</button>" +
    "<button type='button' class='fk-ghost' id='cq-resume' hidden>See my last results</button></div>" +
    `<div class='fk-quiet'>${LOCK_ICON}<span>Your answers never leave this browser, and no AI is involved.</span></div>` +
    "</div>" + comb + "</div></section>" +
    "<div class='fk-tiles cq-how'>" +
    `<div class='fk-tile t1'><div class='th'>One thing at a time</div><div class='tv'>${total}</div>` +
    "<div class='ts'>quick questions. Each is something people do, in work or out of it. Say whether you would enjoy it.</div></div>" +
    "<div class='fk-tile t3'><div class='th'>Go with your gut</div><div class='tv'>3 <small>minutes</small></div>" +
    "<div class='ts'>It is about what you would enjoy, not what you are good at yet. There are no right answers.</div></div>" +
    "<div class='fk-tile t2'><div class='th'>See where it points</div><div class='tv'>7 <small>ways in</small></div>" +
    "<div class='ts'>Your strongest interests, real jobs that use them, and every route: apprenticeships, college, " +
    "university or straight into work.</div></div>" +
    "</div>" +
    /* What the quiz looks for, named: the same six medals a learner's
     * results are drawn from, so the result is not the first they hear
     * of them. */
    sectionLabel("The six interests it looks for") +
    "<div class='cq-kinds'>" +
    QUIZ_AREAS.map(
      (area, i) =>
        `<div class='cq-kind' style='animation-delay:${(i * 0.05).toFixed(2)}s'>${interestMedal(area.id, 54)}` +
        `<div><b>${esc(area.name)}</b><span>${esc(area.blurb)}</span></div></div>`,
    ).join("") +
    "</div>" +
    sloganBand("Career quiz · worked out in your own browser") +
    "</div>" +

    /* ---------- one question ---------- */
    "<section class='fk-panel cq-stage' id='cq-quiz' hidden>" +
    `<div class='cq-flightrow'><span id='cq-count'>Question 1 of ${total}</span><b id='cq-cheer'>Go with your gut</b></div>` +
    "<div class='cq-fly' aria-hidden='true'><span class='fk-track'><i id='cq-bar-i'></i></span>" +
    `<span class='cq-plane' id='cq-plane'>${BIRD_MARK}</span></div>` +
    "<div class='cq-qwrap' id='cq-qwrap'><span class='cq-num' id='cq-num' aria-hidden='true'>01</span>" +
    "<div class='cq-ask'>Would you enjoy…</div>" +
    "<h3 class='cq-text' id='cq-text' tabindex='-1'></h3></div>" +
    "<div class='cq-opts' id='cq-opts' role='group' aria-labelledby='cq-text'></div>" +
    "<div class='cq-nav'><button type='button' class='btn ghost' id='cq-back'>← Back</button>" +
    "<span class='cq-hint'><span class='cq-tap'>Tap an answer to move on</span>" +
    "<span class='cq-keys'>Choose an answer, or press 1, 2 or 3</span></span></div>" +
    "</section>" +

    /* ---------- results ---------- */
    "<div id='cq-result' hidden>" +
    "<div id='cq-some'>" +
    "<section class='fk-hero cq-rhero'>" + confetti() + heroBird() +
    "<div class='fk-hero-b'><span class='fk-kicker'>Your results</span>" +
    "<h2 class='fk-h' tabindex='-1'>Here is what you seem to <em>enjoy</em></h2>" +
    "<p>A starting point for thinking, not a verdict. Interests shift, and nobody fits one box.</p></div>" +
    "<div class='cq-podium' id='cq-areas'></div>" +
    "<div class='cq-lesser' id='cq-rest'></div>" +
    "</section>" +
    "<section class='fk-panel'><div class='fk-sect'><h3>Jobs worth a look</h3><span class='fk-note' id='cq-jobs-n'></span></div>" +
    "<p class='fk-lead'>Real jobs that draw on those interests. Each one links to its official profile, where you can " +
    "see what the work involves, what it takes to get in, and what it can lead to.</p>" +
    "<div class='cq-jobs' id='cq-roles'></div></section>" +
    "<section class='fk-panel'><div class='fk-sect'><h3>Ways in</h3>" +
    "<span class='fk-note'>more than one route into almost every job</span></div>" +
    "<p class='fk-lead'>These are the main routes in England. The official pages link to the services for Scotland, " +
    "Wales and Northern Ireland.</p>" +
    "<div class='cq-routes' id='cq-routes'></div>" +
    "<div class='cq-guides' id='cq-guides'></div></section>" +
    "<div class='btnrow no-print cq-actions'>" +
    "<button type='button' class='btn' onclick='window.print()'>Print / save my results</button>" +
    "<button type='button' class='btn ghost' data-again>Take it again</button></div>" +
    "</div>" +
    "<section class='fk-panel' id='cq-none' hidden><div class='fk-empty'>" +
    `<span class='eb' aria-hidden='true'>${BIRD_MARK}</span>` +
    "<div><b>Nothing here grabbed you</b>" +
    "<p>That is an answer too. Try it again thinking about what you would not mind doing, " +
    "or browse every kind of job on the National Careers Service.</p>" +
    "<div class='btnrow' style='margin-top:12px'><button type='button' class='btn' data-again>Take it again</button>" +
    "<a class='btn ghost' target='_blank' rel='noopener' href='https://nationalcareers.service.gov.uk/explore-careers'>" +
    "Explore careers <span aria-hidden='true'>↗</span><span class='sr-only'> (opens in a new tab)</span></a></div></div>" +
    "</div></section>" +
    sloganBand("Career quiz · worked out in your own browser") +
    "<p class='fk-small'>Job profiles and route information come from the National " +
    "Careers Service, GOV.UK, T Levels and UCAS. The quiz itself is worked out in this browser, with no AI: " +
    "the same answers always give the same result, and nothing you choose is sent or stored anywhere else.</p>" +
    "</div>" +
    "</main>" +
    "<script>var FL_QUIZ=" + scriptJson(careerQuizData()) + ";" + CAREER_QUIZ_JS + "</script>" +
    "<script>var FL_QUIZ_ART=" + scriptJson(AREA_ART) + ";</script>" +
    "<script>" + CAREERS_JS + "</script>";

  return appShell({
    title: "Fledglings - Career quiz",
    active: "careers",
    bodyHtml: body,
    extraCss: KIT_CSS + CAREERS_CSS,
  });
}

const CAREERS_JS = String.raw`(function(){
var D=FL_QUIZ,ART=FL_QUIZ_ART,KEY='fl_career_quiz_v1';
var $=function(id){return document.getElementById(id)};
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
.replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
/* No "Saving progress as..." chip here: nothing on this page is saved
 * against the learner. Only the embed's sign-in exchange runs, so the
 * links out of the page carry who they are. */
try{flAdoptEmbedEmail(flStoredId(localStorage,'fl_coach_learner_v1'));}catch(e){}
var answers=[],idx=0,busy=false;
/* The result is kept in this browser so it is still here next time. It
 * goes nowhere else: there is no request on this page to send it with.
 * It is kept under whoever is signed in, like My Work, so a shared
 * classroom machine never shows one learner's result to the next. */
function owner(){return flResolveEmail()||'device'}
function saved(){try{var s=JSON.parse(localStorage.getItem(KEY)||'null');
return s&&s.o===owner()&&Array.isArray(s.a)&&s.a.length===D.items.length?s:null}catch(e){return null}}
function save(res){try{localStorage.setItem(KEY,JSON.stringify({o:owner(),a:answers,at:Math.floor(Date.now()/1000),
top:res.top.map(function(id){return areaById(id).name}),ids:res.top}))}catch(e){}}
function areaById(id){return D.areas.filter(function(a){return a.id===id})[0]}
function roleById(id){return D.roles.filter(function(r){return r.id===id})[0]}
function show(id){['cq-start','cq-quiz','cq-result'].forEach(function(k){$(k).hidden=k!==id});
window.scrollTo({top:0});}
/* One interest as a medal - the same markup the page's opening draws. */
function medal(id,size,earned){var A=ART[id];
return "<span class='fk-medwrap"+(earned?' earned':'')+"' style='--m:"+size+"px'><span class='fk-med' style='background:"+
A.medal+";color:"+A.ink+"'>"+A.icon+"</span></span>";}

/* ---------- the questions ---------- */
var SVG="<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round' aria-hidden='true'>";
var GLYPH={0:SVG+"<path d='M7 7l10 10M17 7L7 17'/></svg>",
1:SVG+"<path d='M4 13c2-3.4 4-3.4 6 0s4 3.4 6 0 2.7-2.6 4-1.2'/></svg>",
2:SVG+"<path d='M5 12.5l4.5 4.5L19 7.5'/></svg>"};
var CHEER=['Go with your gut','Nice. Keep going','Over halfway','Nearly there'];
function renderQ(){var it=D.items[idx],n=D.items.length;
$('cq-count').textContent='Question '+(idx+1)+' of '+n;
$('cq-cheer').textContent=CHEER[Math.min(3,Math.floor(idx*4/n))];
var pct=Math.round(idx*100/n);
$('cq-bar-i').style.width=pct+'%';$('cq-plane').style.left=pct+'%';
$('cq-num').textContent=(idx<9?'0':'')+(idx+1);
$('cq-text').textContent=it.text+'?';
$('cq-opts').innerHTML=D.answers.map(function(a,i){var on=answers[idx]===a.value;
return "<button type='button' class='cq-opt o"+a.value+(on?' on':'')+"' data-v='"+a.value+"' aria-pressed='"+on+"'>"+
"<span class='cq-glyph' aria-hidden='true'>"+GLYPH[a.value]+"</span><span class='cq-ol'>"+esc(a.label)+"</span>"+
"<kbd aria-hidden='true'>"+(i+1)+"</kbd></button>"}).join('');
$('cq-back').disabled=idx===0;
/* the question comes in fresh each time */
var w=$('cq-qwrap');w.classList.remove('cq-in');void w.offsetWidth;w.classList.add('cq-in');
document.querySelectorAll('.cq-opt').forEach(function(b){b.onclick=function(){choose(parseInt(b.dataset.v,10))}});}
/* The answer shows as pressed for a moment, then the next question
 * arrives. A second tap in that moment is not a second answer. */
function choose(v){if(busy)return;busy=true;answers[idx]=v;
document.querySelectorAll('.cq-opt').forEach(function(b){var on=parseInt(b.dataset.v,10)===v;
b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
setTimeout(function(){busy=false;
if(idx<D.items.length-1){idx++;renderQ();
/* the heading is what changed: say so to a screen reader, and keep the
 * keyboard on the question rather than back at the top of the page */
try{$('cq-text').focus()}catch(e){}}
else finish();},130);}
function start(){answers=[];idx=0;busy=false;renderQ();show('cq-quiz');}
function finish(){var res=flQuizScore(answers,D);save(res);renderResult(res);show('cq-result');}

/* ---------- the results ---------- */
function aimHref(label){var t=flToken();
return '/tools?aim='+encodeURIComponent(label)+(t?'&t='+encodeURIComponent(t):'');}
var RANK=['Your strongest','Second','Third'];
var FIT={3:'Strong match',2:'Good match',1:'Worth a look'};
var TINT=['t1','t3','t2','t4'];
function bar(pct,fill){return "<span class='fk-track' role='img' aria-label='"+pct+" out of 100'><i style='width:"+pct+"%"+
(fill?';background:'+fill:'')+"'></i></span>";}
function renderResult(res){
var none=res.top.length===0;$('cq-none').hidden=!none;$('cq-some').hidden=none;if(none)return;
$('cq-areas').innerHTML=res.top.map(function(id,i){var A=areaById(id);
var a=res.areas.filter(function(x){return x.id===id})[0];
return "<div class='cq-pod'>"+medal(id,i===0?92:78,true)+"<span class='pr'>"+RANK[i]+"</span><b>"+esc(A.name)+"</b>"+
"<p>"+esc(A.blurb)+"</p>"+bar(a.pct,'')+"</div>"}).join('');
var rest=res.areas.filter(function(a){return res.top.indexOf(a.id)===-1});
$('cq-rest').hidden=!rest.length;
$('cq-rest').innerHTML="<span class='ll'>Less like you, for now</span>"+rest.map(function(a){
return "<span class='cq-less'>"+medal(a.id,28,false)+"<span>"+esc(areaById(a.id).name)+"</span>"+bar(a.pct,'')+"</span>"}).join('');
$('cq-jobs-n').textContent=res.roles.length+' that draw on your interests';
$('cq-roles').innerHTML=res.roles.map(function(r,i){var R=roleById(r.id);if(!R)return '';
var fit=r.match>=70?3:r.match>=45?2:1;
var tags=R.areas.map(function(id){return "<span class='cq-tag'>"+medal(id,24,false)+esc(areaById(id).name)+"</span>"}).join('');
return "<article class='cq-job' style='animation-delay:"+(i*0.05).toFixed(2)+"s'><div class='cq-job-h'><h4>"+esc(R.label)+"</h4>"+
"<span class='cq-fit f"+fit+"'>"+FIT[fit]+"</span></div><p>"+esc(R.about)+"</p><div class='cq-tags'>"+tags+"</div>"+
"<div class='cq-job-f'><a class='cq-more' target='_blank' rel='noopener' href='"+esc(R.url)+"'>See what this job involves "+
"<span aria-hidden='true'>↗</span><span class='sr-only'> (National Careers Service, opens in a new tab)</span></a>"+
"<a class='cq-aim' href='"+esc(aimHref(R.label))+"'>Aim my CV at this →</a></div></article>"}).join('');
$('cq-routes').innerHTML=D.routes.map(function(rt,i){
return "<a class='fk-tile "+TINT[i%4]+" cq-route' target='_blank' rel='noopener' href='"+esc(rt.url)+"'>"+
"<span class='tv words'>"+esc(rt.name)+"</span><span class='ts'>"+esc(rt.about)+"</span>"+
"<span class='cq-src'>"+esc(rt.source)+" <span aria-hidden='true'>↗</span><span class='sr-only'> (opens in a new tab)</span></span></a>"}).join('');
$('cq-guides').innerHTML="<span class='ll'>Official guides to your options</span>"+D.guides.map(function(g){
return "<a class='cq-guide' target='_blank' rel='noopener' href='"+esc(g.url)+"'>"+esc(g.label)+" <span aria-hidden='true'>↗</span>"+
"<span class='sr-only'> (opens in a new tab)</span></a>"}).join('');}

/* ---------- wiring ---------- */
/* 1, 2 and 3 answer the question on a keyboard, in the order the
 * buttons are in. Never while typing somewhere, or with a modifier. */
document.addEventListener('keydown',function(e){
if($('cq-quiz').hidden||e.ctrlKey||e.metaKey||e.altKey)return;
var tag=(e.target&&e.target.tagName)||'';if(tag==='INPUT'||tag==='TEXTAREA'||tag==='SELECT')return;
var n=['1','2','3'].indexOf(e.key);if(n===-1||!D.answers[n])return;
e.preventDefault();choose(D.answers[n].value);});
$('cq-go').onclick=start;
$('cq-back').onclick=function(){if(idx>0&&!busy){idx--;renderQ();try{$('cq-text').focus()}catch(e){}}};
document.querySelectorAll('[data-again]').forEach(function(b){b.onclick=start});
var last=saved();
if(last){var rb=$('cq-resume');rb.hidden=false;
rb.textContent='See my last results ('+flAgo(last.at)+')';
rb.onclick=function(){answers=last.a.slice();renderResult(flQuizScore(answers,D));show('cq-result');};
$('cq-go').textContent='Take it again';
/* arriving from the hub's "see your matches" link */
if(location.hash==='#results')rb.onclick();}
/* QA hook: answer the quiz from a list and show the result. */
window.__flQuizShow=function(list){answers=list.slice();finish();};
})();`;

export const CAREERS_CSS = `
a.btn{text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
/* ---- the opening: words on the left, the six interests as a honeycomb ---- */
.cq-heroin{position:relative;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:30px;align-items:center;}
.cq-comb{flex:none;padding-right:6px;}
.cq-comb-r{display:flex;gap:3px;}
.cq-comb-r.r2{margin:-20px 0 0 43px;}
.cq-comb .fk-medwrap{animation:fk-pop .6s both;filter:drop-shadow(0 10px 14px rgba(3,23,38,.45));}
.cq-how{grid-template-columns:repeat(3,1fr);}
.cq-how .tv small{font-size:16px;}
.cq-kinds{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:22px;}
.cq-kind{display:flex;align-items:center;gap:14px;background:#fff;border-radius:18px;padding:14px 16px;
  border:1px solid rgba(5,37,60,.07);box-shadow:0 14px 30px -26px rgba(5,37,60,.55);animation:fk-rise .5s both;}
.cq-kind b{display:block;font-size:15.5px;font-weight:700;color:#05253C;}
.cq-kind div span{display:block;font-size:13px;line-height:1.45;color:#4E5B66;margin-top:2px;}
@media(max-width:900px){.cq-kinds{grid-template-columns:repeat(2,minmax(0,1fr));}}
@media(max-width:560px){.cq-kinds{grid-template-columns:1fr;}}
@media(max-width:860px){.cq-heroin{grid-template-columns:1fr;}
  .cq-comb .fk-medwrap{--m:58px!important;}.cq-comb-r.r2{margin:-14px 0 0 30px;}}
@media(max-width:760px){.cq-how{grid-template-columns:1fr;}}
/* ---- one question ---- */
.cq-stage{position:relative;overflow:hidden;padding:26px 30px 24px;}
.cq-flightrow{display:flex;justify-content:space-between;align-items:baseline;gap:12px;font-size:12.5px;font-weight:700;color:#5C6A76;}
.cq-flightrow b{color:#B93A22;font-weight:700;}
.cq-fly{position:relative;margin:20px 6px 34px;}
.cq-fly .fk-track{height:8px;}
.cq-fly .fk-track i{width:0;animation:none;transition:width .35s cubic-bezier(.2,.7,.3,1);}
/* the bird flies the progress line */
.cq-plane{position:absolute;top:-19px;left:0;height:32px;margin-left:-6px;transform:rotate(62deg);transform-origin:50% 60%;
  transition:left .35s cubic-bezier(.2,.7,.3,1);filter:drop-shadow(0 3px 4px rgba(5,37,60,.25));}
.cq-plane svg{height:100%;width:auto;display:block;}
.cq-qwrap{position:relative;}
.cq-qwrap.cq-in{animation:fk-rise .28s cubic-bezier(.2,.7,.3,1) both;}
.cq-num{position:absolute;right:10px;top:-34px;font-size:168px;font-weight:800;line-height:1;letter-spacing:-.05em;color:#F4EEEA;
  pointer-events:none;user-select:none;}
.cq-ask{position:relative;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#B93A22;margin-bottom:8px;}
.fk-panel h3.cq-text{position:relative;font-size:31px;line-height:1.22;font-weight:700;color:#05253C;margin:0 0 26px;min-height:2.5em;
  max-width:20em;text-wrap:balance;}
.cq-text:focus{outline:none;}
.cq-opts{position:relative;display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.cq-opt{position:relative;display:flex;flex-direction:column;align-items:flex-start;gap:14px;text-align:left;font-family:inherit;
  cursor:pointer;border:2px solid transparent;border-radius:18px;padding:16px 16px 18px;min-height:118px;
  transition:transform .12s ease,box-shadow .12s ease,border-color .12s ease,background .12s ease;}
.cq-opt.o0{background:#E6EBEF;}.cq-opt.o1{background:#FBF0E2;}.cq-opt.o2{background:#FCEBE4;}
.cq-glyph{width:40px;height:40px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 4px 10px -6px rgba(5,37,60,.5);}
.cq-glyph svg{width:20px;height:20px;}
.cq-opt.o0 .cq-glyph{color:#05253C;}.cq-opt.o1 .cq-glyph{color:#9A5812;}.cq-opt.o2 .cq-glyph{color:#B93A22;}
.cq-ol{font-size:17px;font-weight:700;color:#05253C;line-height:1.25;}
.cq-opt kbd{position:absolute;top:12px;right:12px;font-family:inherit;font-size:11px;font-weight:700;color:#5C6A76;
  border:1px solid rgba(5,37,60,.2);border-radius:6px;padding:2px 7px;background:rgba(255,255,255,.7);}
.cq-opt:hover{transform:translateY(-3px);box-shadow:0 16px 28px -18px rgba(5,37,60,.55);}
.cq-opt.o0:hover{border-color:#05253C;}.cq-opt.o1:hover{border-color:#ED9249;}.cq-opt.o2:hover{border-color:#D9452B;}
.cq-opt:focus-visible{outline:3px solid #05253C;outline-offset:2px;border-radius:18px;}
.cq-opt.on{background:#05253C;border-color:#05253C;}
.cq-opt.on .cq-ol{color:#fff;}
.cq-opt.on .cq-glyph{background:#ED9249;color:#05253C;}
.cq-opt.on kbd{color:#CFE0EE;border-color:rgba(255,255,255,.3);background:rgba(255,255,255,.08);}
.cq-nav{position:relative;display:flex;align-items:center;gap:14px;margin-top:20px;}
.cq-nav .btn{white-space:nowrap;flex:none;}
.cq-hint{font-size:12.5px;color:#5C6A76;}
/* the number keys are offered only where there is a keyboard to press */
.cq-hint .cq-keys,.cq-opt kbd{display:none;}
@media (hover:hover) and (pointer:fine){.cq-hint .cq-keys{display:inline;}.cq-hint .cq-tap{display:none;}.cq-opt kbd{display:block;}}
@media(max-width:640px){.cq-stage{padding:20px 18px 18px;}.cq-num{font-size:110px;top:-18px;}
  .fk-panel h3.cq-text{font-size:23px;min-height:3.7em;margin-bottom:18px;}
  .cq-opts{grid-template-columns:1fr;gap:10px;}
  .cq-opt{flex-direction:row;align-items:center;min-height:64px;padding:12px 14px;gap:12px;}}
/* ---- results: the three medals, on navy ---- */
.cq-podium{position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px;margin-top:26px;}
.cq-pod{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.16);border-radius:20px;padding:20px 20px 22px;
  display:flex;flex-direction:column;align-items:flex-start;gap:9px;animation:fk-pop .55s both;}
.cq-pod:nth-child(2){animation-delay:.14s}.cq-pod:nth-child(3){animation-delay:.28s}
.cq-pod .pr{font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#ED9249;margin-top:4px;}
.cq-pod b{font-size:22px;font-weight:700;color:#fff;line-height:1.15;}
.cq-pod p{font-size:14px;line-height:1.5;color:#B9CFE0;margin:0 0 6px;}
.cq-pod .fk-track{width:100%;height:9px;background:rgba(255,255,255,.16);margin-top:auto;}
.cq-lesser{position:relative;display:flex;flex-wrap:wrap;gap:10px 24px;align-items:center;margin-top:20px;padding-top:16px;
  border-top:1px solid rgba(255,255,255,.14);}
.cq-lesser .ll{flex:1 1 100%;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#9FB8CC;}
.cq-less{display:inline-flex;align-items:center;gap:9px;font-size:13.5px;font-weight:600;color:#DCE8F1;}
.cq-less .fk-track{width:60px;height:7px;background:rgba(255,255,255,.16);}
.cq-less .fk-med svg,.cq-tag .fk-med svg{display:none;}
/* ---- jobs ---- */
.cq-jobs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;}
.cq-job{display:flex;flex-direction:column;border:1px solid rgba(5,37,60,.09);border-radius:18px;padding:18px 18px 12px;
  background:linear-gradient(180deg,#fff,#FBF7F4);transition:transform .15s ease,box-shadow .15s ease;animation:fk-pop .5s both;}
.cq-job:hover{transform:translateY(-4px);box-shadow:0 16px 28px -18px rgba(5,37,60,.5);}
.cq-job-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.cq-job h4{font-size:17.5px;font-weight:700;color:#05253C;margin:0;line-height:1.25;}
.cq-fit{flex:none;font-size:11px;font-weight:800;letter-spacing:.02em;border-radius:999px;padding:5px 11px;white-space:nowrap;}
.cq-fit.f3{background:#B93A22;color:#fff;}.cq-fit.f2{background:#E8F1F8;color:#13507F;}.cq-fit.f1{background:#ECE7E6;color:#4E5B66;}
.cq-job p{font-size:14px;line-height:1.5;color:#4E5B66;margin:7px 0 12px;flex:1;}
.cq-tags{display:flex;flex-wrap:wrap;gap:6px 16px;}
.cq-tag{display:inline-flex;align-items:center;gap:7px;font-size:12.5px;font-weight:600;color:#25394B;}
.cq-job-f{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:4px 14px;margin-top:12px;padding-top:6px;
  border-top:1px dashed rgba(5,37,60,.16);}
.cq-more{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:13.5px;font-weight:700;color:#B93A22;text-decoration:none;}
.cq-more:hover{text-decoration:underline;}
.cq-aim{display:inline-flex;align-items:center;min-height:40px;font-size:13px;font-weight:700;color:#05253C;text-decoration:none;
  border:1.5px solid rgba(5,37,60,.22);border-radius:999px;padding:7px 15px;background:#fff;transition:background .12s,color .12s,border-color .12s;}
.cq-aim:hover{background:#05253C;border-color:#05253C;color:#fff;}
.cq-more:focus-visible,.cq-aim:focus-visible{border-radius:999px;}
/* ---- ways in ---- */
.cq-routes{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px;}
a.cq-route{display:flex;flex-direction:column;text-decoration:none;transition:transform .15s ease,box-shadow .15s ease;}
a.cq-route:hover{transform:translateY(-4px);box-shadow:0 16px 28px -18px rgba(5,37,60,.5);}
a.cq-route:focus-visible{border-radius:20px;}
.cq-route .tv,.cq-route .ts{display:block;}
.cq-route .tv.words{margin-top:0;font-size:19px;}
.cq-route .ts{flex:1;margin-top:7px;font-size:13.5px;line-height:1.5;color:#3F4C57;}
.cq-src{display:inline-flex;align-self:flex-start;align-items:center;gap:5px;margin-top:14px;font-size:12px;font-weight:800;
  color:#05253C;background:#fff;border-radius:999px;padding:5px 12px;}
/* seven routes: the seventh takes the whole last row */
.cq-route:last-child:nth-child(3n+1){grid-column:1 / -1;}
.cq-guides{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:20px;padding-top:16px;border-top:1px dashed rgba(5,37,60,.16);}
.cq-guides .ll{flex:1 1 100%;font-size:11px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#5C6A76;}
.cq-guide{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:13.5px;font-weight:700;color:#05253C;text-decoration:none;
  background:#ECE7E6;border-radius:999px;padding:8px 16px;transition:background .12s,color .12s;}
.cq-guide:hover{background:#05253C;color:#fff;}
.cq-guide:focus-visible{border-radius:999px;}
.cq-actions{margin:2px 0 18px;}
@media(max-width:760px){.cq-jobs{grid-template-columns:1fr;}.cq-routes{grid-template-columns:1fr;}
  .cq-aim{min-height:44px;}}
@media print{#cq-start,#cq-quiz{display:none!important;}.cq-job,.cq-route,.cq-pod{break-inside:avoid;animation:none;}
  .fk,.fk *{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important;}}
`;
