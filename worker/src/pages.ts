/* Branded page layer for every non-widget surface the worker serves:
 * /tools, /passport, /portal. One design system, Outfit throughout,
 * mobile-first, print-aware. All dynamic values are escaped by the
 * caller via esc() before reaching a template. */

import { WORDMARK_DARK } from "./brand";
import type { PassportData } from "./lib/passport";

export function esc(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const FEATHER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>' +
  '<line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>';

const BASE_CSS = `
:root{--navy:#05253C;--orange:#D9452B;--mango:#ED9249;--blue:#13507F;--off:#ECE7E6;--ok:#1B7A4B;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:var(--off);color:var(--navy);min-height:100vh;display:flex;flex-direction:column;}
.brandbar{background:linear-gradient(120deg,var(--navy) 0%,var(--blue) 100%);color:#fff;padding:14px 20px;
  display:flex;align-items:center;gap:12px;}
.brandbar .bmark svg{height:26px;width:auto;display:block;}
.brandbar .tag{font-size:12px;color:#CFE0EE;font-weight:500;border-left:1px solid rgba(255,255,255,.25);
  padding-left:14px;}
.brandbar .right{margin-left:auto;display:flex;gap:10px;align-items:center;}
.wrap{width:100%;max-width:820px;margin:0 auto;padding:26px 18px 60px;flex:1;}
h2.page{font-size:26px;margin-bottom:6px;}
.sub{color:var(--blue);margin-bottom:22px;font-size:14.5px;line-height:1.5;max-width:46em;}
.card{background:#fff;border-radius:18px;padding:22px;margin-bottom:18px;box-shadow:0 2px 10px rgba(5,37,60,.08);}
.card h3{font-size:16px;margin-bottom:10px;}
textarea,input[type=text]{width:100%;border:2px solid var(--off);border-radius:12px;padding:12px 14px;
  font-size:14.5px;font-family:inherit;color:var(--navy);background:#fff;}
textarea{resize:vertical;line-height:1.55;}
textarea:focus,input:focus{outline:none;border-color:var(--blue);}
label{display:block;font-weight:600;font-size:14px;margin:16px 0 6px;}
label .opt{color:var(--blue);font-weight:500;font-size:12.5px;}
.counter{font-size:12px;color:var(--blue);text-align:right;margin-top:4px;}
.btn{background:var(--orange);color:#fff;border:none;border-radius:12px;padding:13px 24px;font-size:15px;
  font-weight:600;cursor:pointer;min-height:46px;transition:background .15s ease,transform .15s ease;}
.btn:hover{background:#c23a22;transform:translateY(-1px);}
.btn:disabled{opacity:.5;cursor:default;transform:none;}
.btn:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.btn.quiet{background:var(--blue);}
.btn.ghost{background:#fff;color:var(--navy);border:1.5px solid var(--off);}
.btnrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;}
.tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;}
.tab{border:1.5px solid var(--mango);background:#fff;color:var(--navy);border-radius:999px;padding:10px 18px;
  font-weight:600;font-size:14px;cursor:pointer;min-height:42px;}
.tab.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.tab:focus-visible{outline:2px solid var(--navy);outline-offset:2px;}
.kpis{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:18px;}
.kpi{background:#fff;border-radius:16px;padding:16px;box-shadow:0 2px 10px rgba(5,37,60,.08);
  border-top:4px solid var(--mango);}
.kpi .n{font-size:26px;font-weight:700;line-height:1.1;}
.kpi .l{font-size:12.5px;color:var(--blue);font-weight:500;margin-top:3px;}
table{width:100%;border-collapse:collapse;font-size:13.5px;}
th{text-align:left;padding:8px 6px;border-bottom:2px solid var(--off);font-size:12.5px;color:var(--blue);}
td{padding:8px 6px;border-bottom:1px solid var(--off);}
td.c,th.c{text-align:center;}
.bar{background:var(--off);border-radius:99px;height:8px;overflow:hidden;min-width:60px;}
.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--orange),var(--mango));border-radius:99px;}
.notice{background:#FFF6F0;border-left:4px solid var(--orange);border-radius:10px;padding:12px 14px;
  font-size:13.5px;line-height:1.5;margin-bottom:18px;}
.result{line-height:1.7;font-size:14.5px;}
.result h4{font-size:15px;margin:16px 0 6px;color:var(--navy);border-bottom:2px solid var(--off);padding-bottom:4px;}
.result h4:first-child{margin-top:0;}
.result p{margin-bottom:8px;white-space:pre-wrap;}
.spin{display:inline-flex;gap:5px;align-items:center;color:var(--blue);font-size:14px;}
.spin span{width:7px;height:7px;border-radius:50%;background:var(--mango);animation:flB 1.2s infinite;}
.spin span:nth-child(2){animation-delay:.15s}.spin span:nth-child(3){animation-delay:.3s}
@keyframes flB{0%,60%,100%{transform:none;opacity:.5}30%{transform:translateY(-5px);opacity:1}}
.footer{padding:14px 20px;text-align:center;font-size:12px;color:var(--blue);}
.badge{display:inline-block;background:var(--off);color:var(--blue);border-radius:99px;padding:3px 10px;
  font-size:11.5px;font-weight:600;}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
@media print{.brandbar .right,.btn,.tabs,form,.footer,.no-print{display:none!important;}
  body{background:#fff;}.card,.kpi{box-shadow:none;border:1px solid #ddd;}}
`;

export function pageShell(opts: {
  title: string;
  bodyHtml: string;
  brandRight?: string;
  extraCss?: string;
}): string {
  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<meta name='robots' content='noindex'>" +
    `<title>${esc(opts.title)}</title>` +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap' rel='stylesheet'>" +
    `<style>${BASE_CSS}${opts.extraCss ?? ""}</style></head><body>` +
    `<header class='brandbar'><span class='bmark'>${WORDMARK_DARK}</span>` +
    "<div class='tag'>Where Growth Takes Flight</div>" +
    `<div class='right'>${opts.brandRight ?? ""}</div></header>` +
    opts.bodyHtml +
    "<div class='footer'>Fledglings · fledglings.co · life skills for 16–24s</div>" +
    "</body></html>"
  );
}

/* ------------------------------------------------------------------
 * /tools — CV & LinkedIn review
 * ------------------------------------------------------------------ */
export function renderToolsPage(): string {
  const body =
    "<main class='wrap'>" +
    "<h2 class='page'>CV &amp; LinkedIn review</h2>" +
    "<p class='sub'>Upload your PDF and Fledge scores it like a recruiter would — honestly, and grounded only in what " +
    "you've genuinely done. It never invents experience for you, because employers can tell. Your PDF is read in your " +
    "browser, reviewed, then forgotten — nothing is stored.</p>" +
    /* step indicator */
    "<div class='steps' aria-hidden='true'>" +
    "<span class='step on'><i>1</i>Upload your PDF</span><span class='step-arr'>→</span>" +
    "<span class='step'><i>2</i>Fledge reads it</span><span class='step-arr'>→</span>" +
    "<span class='step'><i>3</i>Get your score</span></div>" +
    /* tabs */
    "<div class='tabs' role='tablist'>" +
    "<button type='button' role='tab' class='tab on' id='tab-cv' aria-selected='true'>📄 My CV</button>" +
    "<button type='button' role='tab' class='tab' id='tab-li' aria-selected='false'>💼 My LinkedIn</button></div>" +
    /* upload card */
    "<div class='card' id='u-card'>" +
    "<label for='target' style='margin-top:0'>Target role or job advert <span class='opt'>(optional — makes the scoring much sharper)</span></label>" +
    "<input type='text' id='target' maxlength='2500' placeholder='e.g. Customer service apprenticeship at a bank'>" +
    "<div class='drop' id='drop' tabindex='0' role='button' aria-label='Upload a PDF to review'>" +
    "<input type='file' id='file' accept='.pdf,application/pdf' hidden>" +
    "<div id='d-idle'><div class='drop-ico' aria-hidden='true'>" +
    "<svg viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M12 16V4m0 0l-4 4m4-4l4 4'/><path d='M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'/></svg></div>" +
    "<div class='drop-big' id='d-title'>Drop your CV here</div>" +
    "<div class='drop-hint' id='d-hint'>or click to choose a file · PDF only · max 10&nbsp;MB</div></div>" +
    "<div id='d-err' class='drop-err' hidden></div>" +
    "</div></div>" +
    /* analysing card */
    "<div class='card centre' id='a-card' hidden>" +
    "<div class='pulse' aria-hidden='true'><svg viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'/><line x1='16' y1='8' x2='2' y2='22'/><line x1='17.5' y1='15' x2='9' y2='15'/></svg></div>" +
    "<h3 id='a-msg' aria-live='polite'>Reading your PDF…</h3>" +
    "<p class='sub' style='margin:6px 0 0'>Usually 15–30 seconds. Fledge is being thorough, not slow.</p></div>" +
    /* plain message card (limits, crisis, fallback) */
    "<div class='card' id='m-card' hidden><div class='result' id='m-text'></div>" +
    "<div class='btnrow'><button type='button' class='btn ghost' id='m-again'>Back</button></div></div>" +
    /* report */
    "<div id='r-card' hidden>" +
    "<div class='card r-head'>" +
    "<div class='ring2' id='r-ring'><div class='in'><div class='pc' id='r-score'>0</div><div class='lb'>/ 100</div></div></div>" +
    "<div class='r-headtxt'><div class='r-kind' id='r-kind'>CV REVIEW</div>" +
    "<div class='r-verdict' id='r-verdict'></div>" +
    "<div class='r-file' id='r-file'></div></div></div>" +
    "<div class='card' id='r-kwcard' hidden><h3>Match against the job advert <span class='badge' id='r-kwpct'></span></h3>" +
    "<p class='kw-note'>Screening software compares your wording to the advert's — aim for 75%+ matched. " +
    "Only claim a missing skill if you genuinely have it.</p>" +
    "<div class='kw-h'>✓ Found in your document</div><div class='chips' id='r-kwm'></div>" +
    "<div class='kw-h miss'>Missing from your document</div><div class='chips' id='r-kwx'></div></div>" +
    "<div class='card'><h3>Recruiter checks <span class='badge' id='r-ckcount'></span></h3>" +
    "<p class='kw-note'>Objective, rule-based checks — the things screening software and a skim-reading recruiter " +
    "judge before reading a word properly.</p><div id='r-checks'></div></div>" +
    "<div class='card'><h3>Where you scored</h3><div id='r-dims'></div></div>" +
    "<div class='card'><h3>What's genuinely working</h3><ul class='goods' id='r-goods'></ul></div>" +
    "<div class='card'><h3>What to improve</h3><div id='r-fixes'></div></div>" +
    "<div class='card' id='r-rwcard' hidden><h3>Example rewrite — your line, upgraded</h3>" +
    "<p class='kw-note'>The pattern: what you achieved, measured how, by doing what. Anything in [brackets] is " +
    "yours to fill in — Fledge never invents your numbers.</p>" +
    "<div class='rw before'><div class='rw-tag'>BEFORE</div><div id='r-rwb'></div></div>" +
    "<div class='rw after'><div class='rw-tag'>AFTER</div><div id='r-rwa'></div></div></div>" +
    "<div class='card nextstep'><div class='ns-label'>DO THIS FIRST</div><div id='r-next'></div></div>" +
    "<div class='btnrow no-print'>" +
    "<button type='button' class='btn' onclick='window.print()'>Print / save feedback</button>" +
    "<button type='button' class='btn ghost' id='r-again'>Review another</button></div>" +
    "</div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:18px'>Up to 5 reviews a day. Scores are honest and calibrated for someone starting out — " +
    "if anything in your document worries Fledge about your wellbeing, it will point you to real support instead of reviewing.</p>" +
    "</main>" +
    "<script>(function(){var kind='cv';var lastName='';" +
    "function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}" +
    "var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');" +
    "var $=function(id){return document.getElementById(id)};" +
    "var tabCv=$('tab-cv'),tabLi=$('tab-li');" +
    "function show(card){['u-card','a-card','m-card','r-card'].forEach(function(k){$(k).hidden=k!==card});" +
    "document.querySelectorAll('.steps .step').forEach(function(s,i){" +
    "s.className='step'+((card==='u-card'&&i===0)||(card==='a-card'&&i===1)||(card==='r-card'&&i===2)?' on':'')});}" +
    "function setKind(k){kind=k;var cv=k==='cv';" +
    "tabCv.className='tab'+(cv?' on':'');tabCv.setAttribute('aria-selected',String(cv));" +
    "tabLi.className='tab'+(cv?'':' on');tabLi.setAttribute('aria-selected',String(!cv));" +
    "$('d-title').textContent=cv?'Drop your CV here':'Drop your LinkedIn PDF here';" +
    "$('d-hint').innerHTML=cv?'or click to choose a file · PDF only · max 10\\u00a0MB':" +
    "'On LinkedIn: your profile → <b>More</b> → <b>Save to PDF</b> — then upload it here';" +
    "show('u-card');}" +
    "tabCv.onclick=function(){setKind('cv')};tabLi.onclick=function(){setKind('linkedin')};" +
    /* ---- pdf.js on demand ---- */
    "var PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';" +
    "var PDFWK='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';" +
    "var pdfReady=null;" +
    "function loadPdf(){if(pdfReady)return pdfReady;" +
    "pdfReady=new Promise(function(res,rej){var s=document.createElement('script');s.src=PDFJS;" +
    "s.onload=function(){try{window.pdfjsLib.GlobalWorkerOptions.workerSrc=PDFWK;res(window.pdfjsLib)}catch(e){rej(e)}};" +
    "s.onerror=function(){pdfReady=null;rej(new Error('load failed'))};document.head.appendChild(s)});return pdfReady;}" +
    "function extractPdf(file){return loadPdf().then(function(lib){" +
    "return file.arrayBuffer().then(function(buf){return lib.getDocument({data:buf}).promise})" +
    ".then(function(doc){var chain=Promise.resolve('');var total=Math.min(doc.numPages,12);" +
    "for(var p=1;p<=total;p++){(function(pn){chain=chain.then(function(acc){" +
    "return doc.getPage(pn).then(function(pg){return pg.getTextContent()}).then(function(tc){" +
    "var line='',out=[],lastY=null;" +
    "tc.items.forEach(function(it){if(!it.str)return;" +
    "if(lastY!==null&&Math.abs(it.transform[5]-lastY)>2){out.push(line);line=''}" +
    "line+=(line&&it.str.charAt(0)!==' '?' ':'')+it.str;lastY=it.transform[5]});" +
    "out.push(line);return acc+out.join('\\n')+'\\n\\n'})})})(p)}return chain})})}" +
    /* ---- upload handling ---- */
    "var drop=$('drop'),fileIn=$('file');" +
    "function dropErr(msg){var e=$('d-err');e.hidden=!msg;e.textContent=msg||'';}" +
    "function handleFile(f){if(!f)return;dropErr('');" +
    "if(!/pdf$/i.test(f.type||'')&&!/\\.pdf$/i.test(f.name)){dropErr('That is not a PDF — export or save your document as PDF first.');return;}" +
    "if(f.size>10*1024*1024){dropErr('That PDF is over 10 MB — export a smaller version.');return;}" +
    "lastName=f.name;show('a-card');startMsgs();" +
    "extractPdf(f).then(function(text){" +
    "text=text.replace(/[ \\t]+/g,' ').replace(/\\n{3,}/g,'\\n\\n').trim();" +
    "if(text.length<120){stopMsgs();show('u-card');fileIn.value='';" +
    "dropErr('Fledge could not read enough text from that PDF — it may be a scan or image-based export. Try re-exporting it as a text PDF.');return;}" +
    "submit(text);" +
    "}).catch(function(){stopMsgs();show('u-card');fileIn.value='';" +
    "dropErr('Could not read that PDF — try re-exporting it and uploading again.');});}" +
    "drop.addEventListener('click',function(){fileIn.click()});" +
    "drop.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fileIn.click()}});" +
    "fileIn.addEventListener('change',function(){handleFile(fileIn.files[0])});" +
    "['dragover','dragenter'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('over')})});" +
    "['dragleave','drop'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('over')})});" +
    "drop.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];handleFile(f)});" +
    /* ---- analysing messages ---- */
    "var MSGS=['Reading your PDF…','Checking impact and clarity…','Scoring ATS readiness…','Writing your feedback…'];" +
    "var msgTimer=null;" +
    "function startMsgs(){var i=0;$('a-msg').textContent=MSGS[0];" +
    "msgTimer=setInterval(function(){i=(i+1)%MSGS.length;$('a-msg').textContent=MSGS[i]},3000);}" +
    "function stopMsgs(){if(msgTimer){clearInterval(msgTimer);msgTimer=null}}" +
    /* ---- submit + report ---- */
    "function band(s){return s>=70?'#1B7A4B':s>=50?'#B96A16':'#D9452B'}" +
    "function submit(text){" +
    "fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({" +
    "learner_id:lid,session_id:sid,kind:kind,text:text,target:$('target').value})})" +
    ".then(function(r){return r.json()}).then(function(d){stopMsgs();fileIn.value='';" +
    "if(d&&d.report){renderReport(d.report,d.checks);show('r-card');window.scrollTo({top:0,behavior:'smooth'});return;}" +
    "$('m-text').textContent=(d&&d.reply)||'Something went wrong — try again in a minute.';show('m-card');" +
    "}).catch(function(){stopMsgs();fileIn.value='';" +
    "$('m-text').textContent='Could not reach the reviewer — try again in a minute.';show('m-card');});}" +
    "function renderReport(r,checks){" +
    "var col=band(r.overall);" +
    /* keyword match (Jobscan model) */
    "var kw=r.keywords||{matched:[],missing:[]};var kwTotal=kw.matched.length+kw.missing.length;" +
    "if(kwTotal>0){var pct=Math.round(kw.matched.length*100/kwTotal);" +
    "$('r-kwpct').textContent=pct+'% match';$('r-kwpct').style.background=band(pct);$('r-kwpct').style.color='#fff';" +
    "$('r-kwm').innerHTML=kw.matched.map(function(k){return \"<span class='chip ok'>\"+esc(k)+'</span>'}).join('')||\"<span class='kw-none'>none yet</span>\";" +
    "$('r-kwx').innerHTML=kw.missing.map(function(k){return \"<span class='chip miss'>\"+esc(k)+'</span>'}).join('')||\"<span class='kw-none'>nothing important missing</span>\";" +
    "$('r-kwcard').hidden=false}else{$('r-kwcard').hidden=true}" +
    /* deterministic recruiter checks (Resume Worded model) */
    "if(checks&&checks.groups){$('r-ckcount').textContent=checks.passed+' of '+checks.total+' passed';" +
    "var ck='';checks.groups.forEach(function(g){ck+=\"<div class='ck-g'>\"+esc(g.label)+'</div>';" +
    "g.items.forEach(function(c){var ic=c.status==='pass'?'✓':c.status==='warn'?'!':'✗';" +
    "ck+=\"<div class='ck \"+c.status+\"'><span class='ck-i'>\"+ic+\"</span><div><div class='ck-l'>\"+esc(c.label)+\"</div>\"+" +
    "\"<div class='ck-d'>\"+esc(c.detail)+'</div>'+" +
    "(c.evidence?\"<div class='ck-e'>“\"+esc(c.evidence)+\"”</div>\":'')+'</div></div>'})});" +
    "$('r-checks').innerHTML=ck}" +
    /* rewrite (XYZ/STAR teaching) */
    "if(r.rewrite&&r.rewrite.before){$('r-rwb').textContent=r.rewrite.before;" +
    "$('r-rwa').textContent=r.rewrite.after;$('r-rwcard').hidden=false}else{$('r-rwcard').hidden=true}" +
    "$('r-score').textContent=r.overall;$('r-score').style.color=col;" +
    "$('r-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(r.overall*3.6)+'deg,#ECE7E6 '+Math.round(r.overall*3.6)+'deg)';" +
    "$('r-kind').textContent=(kind==='cv'?'CV REVIEW':'LINKEDIN REVIEW');" +
    "$('r-verdict').textContent=r.verdict;" +
    "$('r-file').textContent=lastName+($('target').value?' · aiming at: '+$('target').value:'');" +
    "var dims='';r.dimensions.forEach(function(d,i){var c=band(d.score);" +
    "dims+=\"<div class='dim'><div class='dim-r'><span>\"+esc(d.label)+\"</span><b style='color:\"+c+\"'>\"+d.score+\"</b></div>\"+" +
    "\"<div class='dim-tk'><i style='width:\"+d.score+\"%;background:\"+c+\";animation-delay:.\"+i+\"s'></i></div>\"+" +
    "\"<div class='dim-tip'>\"+esc(d.tip)+\"</div></div>\"});" +
    "$('r-dims').innerHTML=dims;" +
    "var goods='';r.strengths.forEach(function(s){goods+=\"<li><span class='tick'>✓</span>\"+esc(s)+'</li>'});" +
    "$('r-goods').innerHTML=goods;" +
    "var fixes='';r.improvements.forEach(function(f,i){" +
    "fixes+=\"<div class='fix'><div class='fix-n'>\"+(i+1)+\"</div><div><div class='fix-t'>\"+esc(f.title)+\"</div>\"+" +
    "\"<div class='fix-d'>\"+esc(f.detail)+'</div></div></div>'});" +
    "$('r-fixes').innerHTML=fixes;" +
    "$('r-next').textContent=r.next_step;}" +
    "function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" +
    "$('r-again').onclick=function(){show('u-card')};$('m-again').onclick=function(){show('u-card')};" +
    "})();</script>";

  const extraCss = `
.steps{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:18px;}
.step{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#8a97a1;
  background:#fff;border-radius:999px;padding:7px 14px;border:1.5px solid var(--off);}
.step i{width:20px;height:20px;border-radius:50%;background:var(--off);color:#8a97a1;font-style:normal;
  display:inline-flex;align-items:center;justify-content:center;font-size:11px;}
.step.on{color:var(--navy);border-color:var(--mango);}
.step.on i{background:linear-gradient(135deg,var(--mango),var(--orange));color:#fff;}
.step-arr{color:#b9c2c9;font-weight:700;}
.drop{border:2.5px dashed var(--blue);border-radius:18px;padding:34px 20px;text-align:center;cursor:pointer;
  background:rgba(19,80,127,.04);margin-top:16px;transition:border-color .15s,background .15s;}
.drop:hover,.drop.over{border-color:var(--orange);background:rgba(217,69,43,.06);}
.drop:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.drop-ico{width:58px;height:58px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;
  justify-content:center;background:linear-gradient(135deg,var(--mango),var(--orange));}
.drop-ico svg{width:28px;height:28px;}
.drop-big{font-size:19px;font-weight:700;}
.drop-hint{color:var(--blue);font-size:13px;margin-top:6px;line-height:1.5;}
.drop-err{color:var(--orange);font-weight:600;font-size:13.5px;margin-top:12px;}
.centre{text-align:center;padding:40px 22px;}
.pulse{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,var(--mango),var(--orange));animation:flPulse 1.6s ease-in-out infinite;}
.pulse svg{width:30px;height:30px;}
@keyframes flPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(217,69,43,.35)}
  50%{transform:scale(1.07);box-shadow:0 0 0 16px rgba(217,69,43,0)}}
.r-head{display:flex;align-items:center;gap:22px;flex-wrap:wrap;border-top:6px solid var(--orange);}
.ring2{width:110px;height:110px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;}
.ring2 .in{width:84px;height:84px;border-radius:50%;background:#fff;display:flex;flex-direction:column;
  align-items:center;justify-content:center;}
.ring2 .pc{font-size:32px;font-weight:800;line-height:1;}
.ring2 .lb{font-size:11px;color:var(--blue);font-weight:600;}
.r-kind{font-size:11.5px;font-weight:700;color:var(--blue);letter-spacing:.08em;}
.r-verdict{font-size:24px;font-weight:700;line-height:1.2;margin:4px 0;}
.r-file{font-size:12.5px;color:#8a97a1;}
.dim{margin-bottom:16px;}
.dim:last-child{margin-bottom:0;}
.dim-r{display:flex;justify-content:space-between;font-size:14.5px;font-weight:600;margin-bottom:6px;}
.dim-tk{height:10px;border-radius:999px;background:var(--off);overflow:hidden;}
.dim-tk i{display:block;height:100%;border-radius:999px;transform-origin:left;animation:flFill .9s both;}
@keyframes flFill{from{transform:scaleX(0)}to{transform:scaleX(1)}}
.dim-tip{font-size:13px;color:var(--blue);margin-top:5px;line-height:1.5;}
.goods{list-style:none;line-height:1.65;font-size:14.5px;}
.goods li{margin-bottom:10px;padding-left:2px;}
.goods .tick{color:var(--ok);font-weight:700;margin-right:8px;}
.fix{display:flex;gap:14px;margin-bottom:14px;}
.fix:last-child{margin-bottom:0;}
.fix-n{width:28px;height:28px;border-radius:50%;background:var(--navy);color:#fff;font-weight:700;font-size:13px;
  display:flex;align-items:center;justify-content:center;flex:none;margin-top:2px;}
.fix-t{font-weight:700;font-size:14.5px;}
.fix-d{font-size:13.5px;color:#4a5b66;line-height:1.55;margin-top:2px;}
.kw-note{font-size:13px;color:var(--blue);line-height:1.55;margin-bottom:14px;}
.kw-h{font-size:12.5px;font-weight:700;color:var(--ok);margin:12px 0 8px;letter-spacing:.03em;}
.kw-h.miss{color:var(--orange);}
.chips{display:flex;flex-wrap:wrap;gap:8px;}
.chip{border-radius:999px;padding:6px 14px;font-size:13px;font-weight:600;}
.chip.ok{background:#E7F3EC;color:var(--ok);border:1.5px solid #BBDECB;}
.chip.miss{background:#fff;color:var(--orange);border:1.5px dashed var(--orange);}
.kw-none{font-size:13px;color:#8a97a1;font-style:italic;}
.ck-g{font-size:12px;font-weight:700;color:var(--blue);text-transform:uppercase;letter-spacing:.07em;
  margin:16px 0 8px;border-bottom:2px solid var(--off);padding-bottom:4px;}
.ck-g:first-child{margin-top:0;}
.ck{display:flex;gap:12px;padding:9px 0;}
.ck-i{width:24px;height:24px;border-radius:50%;font-weight:800;font-size:13px;flex:none;
  display:flex;align-items:center;justify-content:center;margin-top:1px;}
.ck.pass .ck-i{background:#E7F3EC;color:var(--ok);}
.ck.warn .ck-i{background:#FBF0E2;color:#B96A16;}
.ck.fail .ck-i{background:#FCE9E5;color:var(--orange);}
.ck-l{font-weight:700;font-size:14px;}
.ck-d{font-size:13px;color:#4a5b66;line-height:1.5;margin-top:2px;}
.ck-e{font-size:12.5px;color:#8a97a1;font-style:italic;margin-top:4px;border-left:3px solid var(--off);padding-left:10px;}
.rw{border-radius:14px;padding:14px 16px;margin-bottom:10px;font-size:14px;line-height:1.6;}
.rw.before{background:var(--off);color:#5c6b75;}
.rw.after{background:#E7F3EC;border:1.5px solid #BBDECB;}
.rw-tag{font-size:10.5px;font-weight:800;letter-spacing:.1em;margin-bottom:4px;}
.rw.before .rw-tag{color:#8a97a1;}
.rw.after .rw-tag{color:var(--ok);}
.nextstep{background:linear-gradient(120deg,var(--navy),var(--blue));color:#fff;}
.nextstep .ns-label{font-size:11.5px;font-weight:700;letter-spacing:.1em;color:var(--mango);margin-bottom:6px;}
.nextstep div:last-child{font-size:15.5px;line-height:1.6;font-weight:500;}
`;
  return pageShell({ title: "Fledglings — CV & LinkedIn review", bodyHtml: body, extraCss });
}

/* ------------------------------------------------------------------
 * /passport — Readiness Passport (certificate-grade, grouped)
 * ------------------------------------------------------------------ */
export function renderPassportPage(
  data: PassportData,
  groups: Array<{ group: string; completed: string[]; inProgress: Array<{ title: string; pct: number | null }> }>,
  sample: boolean,
): string {
  const groupHtml = groups
    .map((g) => {
      if (g.completed.length === 0 && g.inProgress.length === 0) return "";
      const done = g.completed
        .map((t) => `<li><span class='tick'>✓</span>${esc(t)}</li>`)
        .join("");
      const prog = g.inProgress
        .map(
          (m) =>
            `<li><span class='dot'>›</span>${esc(m.title)}${
              m.pct !== null ? ` <span class='pct'>${m.pct}%</span>` : ""
            }</li>`,
        )
        .join("");
      return (
        `<section class='pgroup'><h4>${esc(g.group)}</h4><ul>` +
        done +
        prog +
        "</ul></section>"
      );
    })
    .join("");

  const extraCss = `
.passport{border-top:8px solid var(--orange);position:relative;overflow:hidden;}
.passport .watermark{position:absolute;top:40%;left:50%;transform:translate(-50%,-50%) rotate(-24deg);
  font-size:80px;font-weight:700;color:rgba(217,69,43,.08);pointer-events:none;white-space:nowrap;}
.pname{font-size:30px;font-weight:700;margin-bottom:2px;}
.pmeta{color:var(--blue);font-size:13.5px;margin-bottom:18px;}
.pstats{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:22px;}
.pstat{background:var(--off);border-radius:14px;padding:12px 18px;text-align:center;min-width:110px;}
.pstat .n{font-size:24px;font-weight:700;}
.pstat .l{font-size:12px;color:var(--blue);font-weight:600;}
.pgroup{margin-bottom:16px;}
.pgroup h4{font-size:14px;color:var(--blue);text-transform:uppercase;letter-spacing:.06em;margin-bottom:8px;
  border-bottom:2px solid var(--off);padding-bottom:4px;}
.pgroup ul{list-style:none;line-height:2;}
.tick{color:var(--ok);font-weight:700;margin-right:8px;}
.dot{color:var(--mango);font-weight:700;margin-right:8px;}
.pct{color:var(--blue);font-size:12.5px;}
.pfoot{color:var(--blue);font-size:12.5px;line-height:1.6;margin-top:20px;border-top:1px solid var(--off);padding-top:12px;}
`;
  const body =
    "<main class='wrap'>" +
    "<div class='card passport'>" +
    (sample ? "<div class='watermark'>SAMPLE</div>" : "") +
    "<span class='badge'>READINESS PASSPORT</span>" +
    `<p class='pname'>${esc(data.firstName)}</p>` +
    `<p class='pmeta'>Fledglings learner${data.sinceYear ? ` since ${esc(data.sinceYear)}` : ""} · issued ${esc(data.issuedAt)}</p>` +
    "<div class='pstats'>" +
    `<div class='pstat'><div class='n'>${data.completed.length}</div><div class='l'>COMPLETED</div></div>` +
    `<div class='pstat'><div class='n'>${data.inProgress.length}</div><div class='l'>IN PROGRESS</div></div>` +
    `<div class='pstat'><div class='n'>${data.totalEnrolled}</div><div class='l'>ENROLLED</div></div>` +
    "</div>" +
    groupHtml +
    "<p class='pfoot'>This passport records life-skills modules practised and completed on the Fledglings platform " +
    "(fledglings.co) across financial literacy, employability, confidence &amp; resilience and online safety. " +
    "It is a record of learning activity, not an assessment of the person. " +
    "Link integrity is cryptographically verified; passports expire after 7 days and can be re-issued by the learner at any time.</p>" +
    "<div class='btnrow no-print'><button class='btn' onclick='window.print()'>Print / save as PDF</button></div>" +
    "</div></main>";
  return pageShell({
    title: `Fledglings Readiness Passport — ${data.firstName}`,
    bodyHtml: body,
    extraCss,
  });
}

export function renderPassportExpired(): string {
  return pageShell({
    title: "Passport link expired",
    bodyHtml:
      "<main class='wrap'><div class='card'><h3>This passport link has expired</h3>" +
      "<p class='sub' style='margin:8px 0 0;'>Passport links last 7 days. Open the Fledge coach on fledglings.co and tap " +
      "<strong>My passport 📜</strong> for a fresh one.</p></div></main>",
  });
}
