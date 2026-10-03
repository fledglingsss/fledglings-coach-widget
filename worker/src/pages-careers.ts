/* Career quiz - 24 quick questions about what a learner would enjoy,
 * answered with the kinds of work that might suit them and the routes
 * into each (see lib/career-quiz.ts for the content and the scoring).
 *
 * A tester asked for something like the UCAS careers quiz that covers
 * every pathway, not university alone. It is a page and nothing more:
 * the answers are scored in the learner's browser, kept in that browser
 * so the result is still there next time, and never sent to the worker.
 * No AI is involved, so the same answers always give the same result.
 */

import { appShell } from "./pages";
import { CAREER_QUIZ_JS, QUIZ_ITEMS, careerQuizData } from "./lib/career-quiz";

/** JSON for a script tag: "<" is the one character that could end it. */
function scriptJson(value: unknown): string {
  return JSON.stringify(value).split("<").join("\\x3c");
}

export function renderCareerQuizPage(): string {
  const total = QUIZ_ITEMS.length;
  const body =
    "<main class='wrap' style='max-width:940px'>" +
    "<h2 class='page'>Career quiz</h2>" +
    "<p class='sub'>Not sure what you want to do? Most people are not. Answer " + total + " quick questions about " +
    "what you would enjoy, and see the kinds of work that might suit you and the ways into them. " +
    "There are no right answers, and your answers never leave this browser.</p>" +

    /* ---------- start ---------- */
    "<div class='card cq-startcard' id='cq-start'>" +
    "<div class='cq-startgrid'>" +
    "<div><h3>How it works</h3>" +
    "<ol class='cq-how'>" +
    "<li><b>One thing at a time.</b> You see something people do at work or outside it, and say whether you would enjoy it.</li>" +
    "<li><b>Go with your gut.</b> It is about what you would enjoy, not what you are good at yet. About three minutes.</li>" +
    "<li><b>See where it points.</b> Your strongest interests, real jobs that use them, and every route in: " +
    "apprenticeships, college, university, or straight into work.</li></ol>" +
    "<div class='btnrow'><button type='button' class='btn' id='cq-go'>Start the quiz</button>" +
    "<button type='button' class='btn ghost' id='cq-resume' hidden>See my last results</button></div></div>" +
    "<div class='cq-art' aria-hidden='true'>" +
    "<span style='background:#7A4A1E'>Hands-on</span><span style='background:#13507F'>Problem solver</span>" +
    "<span style='background:#8A2F6B'>Creative</span><span style='background:#1A7649'>People person</span>" +
    "<span style='background:#B93A22'>Go-getter</span><span style='background:#05253C'>Organiser</span></div>" +
    "</div></div>" +

    /* ---------- one question ---------- */
    "<div class='card cq-qcard' id='cq-quiz' hidden>" +
    "<div class='cq-top'><span class='cq-count' id='cq-count'>Question 1 of " + total + "</span>" +
    "<div class='cq-bar' aria-hidden='true'><i id='cq-bar-i'></i></div></div>" +
    "<div class='cq-ask'>Would you enjoy…</div>" +
    "<h3 class='cq-text' id='cq-text' tabindex='-1'></h3>" +
    "<div class='cq-opts' id='cq-opts' role='group' aria-labelledby='cq-text'></div>" +
    "<div class='cq-nav'><button type='button' class='btn ghost' id='cq-back'>← Back</button>" +
    "<span class='cq-hint'><span class='cq-tap'>Tap an answer to move on</span>" +
    "<span class='cq-keys'>Choose an answer, or press 1, 2 or 3</span></span></div>" +
    "</div>" +

    /* ---------- results ---------- */
    "<div id='cq-result' hidden>" +
    "<div class='card' id='cq-none' hidden><h3>Nothing here grabbed you</h3>" +
    "<p class='kw-note'>That is an answer too. Try it again thinking about what you would not mind doing, " +
    "or browse every kind of job on the National Careers Service.</p>" +
    "<div class='btnrow'><button type='button' class='btn' data-again>Take it again</button>" +
    "<a class='btn ghost' target='_blank' rel='noopener' href='https://nationalcareers.service.gov.uk/explore-careers'>" +
    "Explore careers <span aria-hidden='true'>↗</span><span class='sr-only'> (opens in a new tab)</span></a></div></div>" +
    "<div id='cq-some'>" +
    "<div class='card'><h3>What you seem to enjoy</h3>" +
    "<p class='kw-note'>Your strongest interests, from your answers. A starting point for thinking, not a verdict: " +
    "interests shift, and nobody fits one box.</p>" +
    "<div class='cq-areas' id='cq-areas'></div>" +
    "<div class='cq-rest' id='cq-rest'></div></div>" +
    "<div class='card'><h3>Jobs worth a look</h3>" +
    "<p class='kw-note'>Real jobs that draw on those interests. Each one links to its official profile, where you can " +
    "see what the work involves, what it takes to get in, and what it can lead to.</p>" +
    "<div class='cq-roles' id='cq-roles'></div></div>" +
    "<div class='card'><h3>Ways in</h3>" +
    "<p class='kw-note'>There is more than one route into almost every job. These are the main ones in England; " +
    "the official pages link to the services for Scotland, Wales and Northern Ireland.</p>" +
    "<div class='cq-routes' id='cq-routes'></div>" +
    "<div class='cq-guides' id='cq-guides'></div></div>" +
    "<div class='btnrow no-print'>" +
    "<button type='button' class='btn' onclick='window.print()'>Print / save my results</button>" +
    "<button type='button' class='btn ghost' data-again>Take it again</button></div>" +
    "</div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:18px'>Job profiles and route information come from the National " +
    "Careers Service, GOV.UK, T Levels and UCAS. The quiz itself is worked out in this browser, with no AI: " +
    "the same answers always give the same result, and nothing you choose is sent or stored anywhere else.</p>" +
    "</div>" +
    "</main>" +
    "<script>var FL_QUIZ=" + scriptJson(careerQuizData()) + ";" + CAREER_QUIZ_JS + "</script>" +
    "<script>" + CAREERS_JS + "</script>";

  return appShell({
    title: "Fledglings - Career quiz",
    active: "careers",
    bodyHtml: body,
    extraCss: CAREERS_CSS,
  });
}

const CAREERS_JS = String.raw`(function(){
var D=FL_QUIZ,KEY='fl_career_quiz_v1';
var $=function(id){return document.getElementById(id)};
function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
.replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
/* No "Saving progress as..." chip here: nothing on this page is saved
 * against the learner. Only the embed's sign-in exchange runs, so the
 * links out of the page carry who they are. */
try{flAdoptEmbedEmail(flStoredId(localStorage,'fl_coach_learner_v1'));}catch(e){}
var answers=[],idx=0;
/* The result is kept in this browser so it is still here next time. It
 * goes nowhere else: there is no request on this page to send it with.
 * It is kept under whoever is signed in, like My Work, so a shared
 * classroom machine never shows one learner's result to the next. */
function owner(){return flResolveEmail()||'device'}
function saved(){try{var s=JSON.parse(localStorage.getItem(KEY)||'null');
return s&&s.o===owner()&&Array.isArray(s.a)&&s.a.length===D.items.length?s:null}catch(e){return null}}
function save(res){try{localStorage.setItem(KEY,JSON.stringify({o:owner(),a:answers,at:Math.floor(Date.now()/1000),
top:res.top.map(function(id){return areaById(id).name})}))}catch(e){}}
function areaById(id){return D.areas.filter(function(a){return a.id===id})[0]}
function roleById(id){return D.roles.filter(function(r){return r.id===id})[0]}
function show(id){['cq-start','cq-quiz','cq-result'].forEach(function(k){$(k).hidden=k!==id});
window.scrollTo({top:0});}

/* ---------- the questions ---------- */
function renderQ(){var it=D.items[idx];
$('cq-count').textContent='Question '+(idx+1)+' of '+D.items.length;
$('cq-bar-i').style.width=Math.round(idx*100/D.items.length)+'%';
$('cq-text').textContent=it.text+'?';
$('cq-opts').innerHTML=D.answers.map(function(a){var on=answers[idx]===a.value;
return "<button type='button' class='cq-opt"+(on?' on':'')+"' data-v='"+a.value+"' aria-pressed='"+on+"'>"+esc(a.label)+"</button>"}).join('');
$('cq-back').disabled=idx===0;
document.querySelectorAll('.cq-opt').forEach(function(b){b.onclick=function(){choose(parseInt(b.dataset.v,10))}});}
function choose(v){answers[idx]=v;
if(idx<D.items.length-1){idx++;renderQ();
/* the heading is what changed: say so to a screen reader, and keep the
 * keyboard on the question rather than back at the top of the page */
try{$('cq-text').focus()}catch(e){}}
else finish();}
function start(){answers=[];idx=0;renderQ();show('cq-quiz');}
function finish(){var res=flQuizScore(answers,D);save(res);renderResult(res);show('cq-result');}

/* ---------- the results ---------- */
function aimHref(label){var t=flToken();
return '/tools?aim='+encodeURIComponent(label)+(t?'&t='+encodeURIComponent(t):'');}
function renderResult(res){
var none=res.top.length===0;$('cq-none').hidden=!none;$('cq-some').hidden=none;if(none)return;
$('cq-areas').innerHTML=res.top.map(function(id,i){var A=areaById(id);
var a=res.areas.filter(function(x){return x.id===id})[0];
return "<div class='cq-area' style='border-top-color:"+A.colour+"'><span class='cq-rank' style='background:"+A.colour+"'>"+(i+1)+"</span>"+
"<b>"+esc(A.name)+"</b><p>"+esc(A.blurb)+"</p>"+
"<div class='cq-track' role='img' aria-label='"+a.pct+" out of 100'><i style='width:"+a.pct+"%;background:"+A.colour+"'></i></div></div>"}).join('');
var rest=res.areas.filter(function(a){return res.top.indexOf(a.id)===-1});
$('cq-rest').innerHTML=rest.length?"<span class='cq-rest-l'>Less like you, for now</span>"+rest.map(function(a){var A=areaById(a.id);
return "<span class='cq-mini'><b>"+esc(A.name)+"</b><span class='cq-track' role='img' aria-label='"+a.pct+" out of 100'><i style='width:"+a.pct+"%;background:"+A.colour+"'></i></span></span>"}).join(''):'';
$('cq-roles').innerHTML=res.roles.map(function(r){var R=roleById(r.id);if(!R)return '';
var chips=R.areas.map(function(id){var A=areaById(id);
return "<span class='cq-chip' style='background:"+A.colour+"'>"+esc(A.name)+"</span>"}).join('');
var fit=r.match>=70?'Strong match':r.match>=45?'Good match':'Worth a look';
return "<article class='cq-role'><div class='cq-role-h'><h4>"+esc(R.label)+"</h4><span class='cq-match'>"+fit+"</span></div>"+
"<p>"+esc(R.about)+"</p><div class='cq-chips'>"+chips+"</div>"+
"<div class='cq-links'><a class='cq-link' target='_blank' rel='noopener' href='"+esc(R.url)+"'>See what this job involves "+
"<span aria-hidden='true'>↗</span><span class='sr-only'> (National Careers Service, opens in a new tab)</span></a>"+
"<a class='cq-link alt' href='"+esc(aimHref(R.label))+"'>Aim my CV review at this →</a></div></article>"}).join('');
$('cq-routes').innerHTML=D.routes.map(function(rt){
return "<a class='cq-route' target='_blank' rel='noopener' href='"+esc(rt.url)+"'><b>"+esc(rt.name)+"</b>"+
"<span>"+esc(rt.about)+"</span><i>"+esc(rt.source)+" <span aria-hidden='true'>↗</span><span class='sr-only'> (opens in a new tab)</span></i></a>"}).join('');
$('cq-guides').innerHTML="<span class='cq-rest-l'>Official guides to your options</span>"+D.guides.map(function(g){
return "<a class='cq-link' target='_blank' rel='noopener' href='"+esc(g.url)+"'>"+esc(g.label)+" <span aria-hidden='true'>↗</span>"+
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
$('cq-back').onclick=function(){if(idx>0){idx--;renderQ();try{$('cq-text').focus()}catch(e){}}};
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

const CAREERS_CSS = `
a.btn{text-decoration:none;display:inline-flex;align-items:center;gap:6px;}
.cq-startgrid{display:grid;grid-template-columns:1fr 250px;gap:26px;align-items:center;}
.cq-how{margin:10px 0 18px 18px;display:grid;gap:10px;font-size:14.5px;line-height:1.55;color:var(--ink);}
.cq-how b{color:var(--navy);}
.cq-art{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.cq-art span{color:#fff;font-weight:700;font-size:13px;border-radius:12px;padding:16px 10px;text-align:center;}
.cq-art span:nth-child(odd){transform:rotate(-2deg);}
.cq-art span:nth-child(even){transform:rotate(1.5deg);}
@media(max-width:760px){.cq-startgrid{grid-template-columns:1fr;}.cq-art{grid-template-columns:repeat(3,1fr);}
  .cq-art span{padding:11px 6px;font-size:12px;transform:none!important;}}
.cq-qcard{padding:26px 28px 22px;}
.cq-top{display:flex;align-items:center;gap:14px;margin-bottom:22px;}
.cq-count{font-size:12.5px;font-weight:700;color:var(--mut);white-space:nowrap;}
.cq-bar{flex:1;height:8px;border-radius:999px;background:var(--off);overflow:hidden;}
.cq-bar i{display:block;height:100%;border-radius:999px;background:var(--pri-btn);width:0;transition:width .3s ease;}
.cq-ask{font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#B93A22;margin-bottom:6px;}
/* ".card h3" in the shared sheet would shrink the question to a card
 * heading; it is the one thing on this screen, so it is set large. */
.card h3.cq-text{font-size:27px;line-height:1.3;font-weight:700;color:var(--navy);margin-bottom:24px;min-height:2.6em;
  max-width:24em;text-wrap:balance;}
.cq-text:focus{outline:none;}
.cq-opts{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;}
.cq-opt{font-family:inherit;font-size:15.5px;font-weight:700;color:var(--navy);background:#fff;cursor:pointer;
  border:2px solid var(--line);border-radius:14px;padding:18px 12px;min-height:64px;transition:border-color .12s,background .12s,transform .12s;}
.cq-opt:hover{border-color:var(--mango);transform:translateY(-2px);}
.cq-opt:focus-visible{outline:3px solid var(--navy);outline-offset:2px;border-radius:14px;}
.cq-route:focus-visible,.cq-role .cq-link:focus-visible{border-radius:14px;}
/* the number keys are offered only where there is a keyboard to press */
.cq-hint .cq-keys{display:none;}
@media (hover:hover) and (pointer:fine){.cq-hint .cq-keys{display:inline;}.cq-hint .cq-tap{display:none;}}
.cq-opt.on{border-color:var(--navy);background:var(--navy);color:#fff;}
.cq-nav{display:flex;align-items:center;gap:14px;margin-top:20px;}
.cq-hint{font-size:12.5px;color:var(--mut);}
@media(max-width:560px){.cq-qcard{padding:20px 18px 18px;}.card h3.cq-text{font-size:21px;min-height:3.9em;margin-bottom:18px;}
  .cq-opts{grid-template-columns:1fr;gap:10px;}.cq-opt{min-height:56px;padding:14px 12px;}}
/* results */
.cq-areas{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;}
.cq-area{position:relative;border:1.5px solid var(--line);border-top:5px solid var(--navy);border-radius:14px;padding:16px 16px 14px;background:#FCFBFA;}
.cq-rank{position:absolute;top:12px;right:12px;width:28px;height:28px;border-radius:50%;color:#fff;font-weight:800;
  font-size:13px;display:flex;align-items:center;justify-content:center;}
.cq-area b{display:block;font-size:18px;color:var(--navy);padding-right:36px;}
.cq-area p{font-size:13.5px;line-height:1.5;color:#4E5B66;margin:4px 0 12px;}
.cq-track{display:block;height:8px;border-radius:999px;background:var(--off);overflow:hidden;}
.cq-track i{display:block;height:100%;border-radius:999px;}
.cq-rest{display:flex;flex-wrap:wrap;align-items:center;gap:10px 18px;margin-top:16px;padding-top:14px;border-top:1px dashed var(--line);}
.cq-rest-l{flex:1 1 100%;font-size:11.5px;font-weight:800;letter-spacing:.07em;text-transform:uppercase;color:#5C6A76;}
.cq-mini{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--ink);}
.cq-mini b{font-weight:600;}
.cq-mini .cq-track{width:70px;}
.cq-roles{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;}
.cq-role{border:1.5px solid var(--line);border-radius:14px;padding:16px;background:#fff;display:flex;flex-direction:column;}
.cq-role-h{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.cq-role h4{font-size:16.5px;color:var(--navy);margin:0;}
.cq-match{flex:none;font-size:11px;font-weight:800;color:#13507F;background:#EAF2F8;border-radius:999px;padding:4px 10px;white-space:nowrap;}
.cq-role p{font-size:13.5px;line-height:1.5;color:#4E5B66;margin:6px 0 10px;flex:1;}
.cq-chips{display:flex;flex-wrap:wrap;gap:6px;}
.cq-chip{color:#fff;font-size:11.5px;font-weight:700;border-radius:999px;padding:4px 10px;}
.cq-links{display:flex;flex-wrap:wrap;justify-content:space-between;gap:0 16px;margin-top:10px;
  border-top:1px dashed var(--line);padding-top:2px;}
.cq-link{display:inline-flex;align-items:center;gap:6px;min-height:44px;font-size:13.5px;font-weight:800;color:#B93A22;text-decoration:none;}
.cq-link.alt{color:#13507F;}
.cq-link:hover{text-decoration:underline;}
.cq-routes{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px;}
.cq-route{display:flex;flex-direction:column;gap:5px;border:1.5px solid var(--line);border-radius:14px;padding:15px 16px;
  text-decoration:none;color:var(--ink);background:#FCFBFA;transition:border-color .12s,transform .12s;}
.cq-route:hover{border-color:#B93A22;transform:translateY(-2px);}
.cq-route b{font-size:15.5px;color:var(--navy);}
.cq-route span{font-size:13.5px;line-height:1.5;color:#4E5B66;}
.cq-route i{font-style:normal;font-size:12.5px;font-weight:800;color:#B93A22;margin-top:auto;padding-top:6px;}
/* seven routes: the seventh takes the full last row instead of sitting alone in a corner */
.cq-route:last-child:nth-child(odd){grid-column:1 / -1;}
.cq-guides{display:flex;flex-wrap:wrap;gap:0 22px;margin-top:14px;padding-top:12px;border-top:1px dashed var(--line);}
@media print{#cq-start,#cq-quiz{display:none!important;}.cq-role,.cq-route,.cq-area{break-inside:avoid;}}
`;
