/* /linkedin — the LinkedIn Optimizer. Hiration-style section-by-
 * section scoring of a "Save to PDF" export: an overall /100 ring, a
 * row of per-section score chips (URL 5, Headline 10, … summing to
 * 100), and a review panel per section with "things you got right"
 * (verbatim-quoted) and "what to improve". The PDF is read in the
 * browser (pdf.js) — the file itself never leaves the device. */

import { appShell, esc } from "./pages";
import { LINKEDIN_SECTIONS } from "./lib/linkedin";

export function renderLinkedInPage(): string {
  const chipRow = LINKEDIN_SECTIONS.map(
    (s) =>
      `<button type='button' class='schip' data-sec='${s.id}' id='chip-${s.id}'>` +
      `<span class='schip-score' id='chip-score-${s.id}'>–/${s.weight}</span>` +
      `<span class='schip-label'>${esc(s.label)}</span><i class='schip-bar' id='chip-bar-${s.id}'></i></button>`,
  ).join("");

  const body =
    "<main class='wrap' style='max-width:900px'>" +
    "<h2 class='page'>LinkedIn Optimizer</h2>" +
    "<p class='sub'>Recruiters look you up — make what they find work for you. Save your profile as a PDF, " +
    "upload it here, and Fledge scores every section like a recruiter would: honestly, and grounded only in " +
    "what you've genuinely done. Your PDF is read in your browser, reviewed, then forgotten.</p>" +
    /* guided upload flow: aim -> get the PDF -> drop it */
    "<div id='u-card'>" +
    "<div class='clsteps' aria-hidden='true'>" +
    "<span class='clstep on' id='lis-1' aria-current='step'><i>1</i>What you're aiming at</span><span class='clsep'></span>" +
    "<span class='clstep' id='lis-2'><i>2</i>Your profile PDF</span><span class='clsep'></span>" +
    "<span class='clstep' id='lis-3'><i>3</i>Your score</span></div>" +
    /* step 1: target */
    "<div class='card' id='list-1'>" +
    "<h3>🎯 What are you aiming at?</h3>" +
    "<p class='kw-note' style='margin-bottom:4px'>Name the role — or paste an advert — and every section gets scored " +
    "against it. You can also skip this.</p>" +
    "<input type='text' id='target' aria-label='Role or advert you are aiming at' maxlength='2500' placeholder='e.g. Customer service apprenticeship at a bank'>" +
    "<div class='btnrow' style='margin-top:14px'>" +
    "<button type='button' class='btn' id='li-n1'>Next: your profile →</button>" +
    "<button type='button' class='btn ghost' id='li-skip'>Skip — just score it</button></div></div>" +
    /* step 2: get + drop the PDF */
    "<div class='card' id='list-2' hidden>" +
    "<h3>💼 Get your profile as a PDF</h3>" +
    "<div class='howto'><b>On LinkedIn:</b> open your profile → tap <b>More</b> (or <b>Resources</b>) → " +
    "<b>Save to PDF</b>. Then drop the file below — it is read on your device and never uploaded.</div>" +
    "<div class='drop' id='drop' tabindex='0' role='button' aria-label='Upload your LinkedIn PDF'>" +
    "<input type='file' id='file' accept='.pdf,application/pdf' hidden>" +
    "<div id='d-idle'><div class='drop-ico' aria-hidden='true'>" +
    "<svg aria-hidden='true' focusable='false' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M12 16V4m0 0l-4 4m4-4l4 4'/><path d='M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'/></svg></div>" +
    "<div class='drop-big'>Drop your LinkedIn PDF here</div>" +
    "<div class='drop-hint'>or click to choose a file · PDF only · max 10&nbsp;MB</div></div>" +
    "<div id='d-err' class='drop-err' role='alert' hidden></div>" +
    "<div class='btnrow' style='margin-top:14px'><button type='button' class='btn ghost' id='li-b2'>← Back</button>" +
    "<span class='hero-note' id='li-aim-note'></span></div></div>" +
    /* closes step 2 then #u-card itself — report/spinner must be
     * siblings of u-card, never children (same blanking bug as /tools). */
    "</div></div>" +
    /* analysing */
    "<div class='card centre' id='a-card' hidden>" +
    "<div class='pulse' aria-hidden='true'><svg aria-hidden='true' focusable='false' viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z'/><line x1='16' y1='8' x2='2' y2='22'/><line x1='17.5' y1='15' x2='9' y2='15'/></svg></div>" +
    "<h3 id='a-msg' aria-live='polite'>Reading your PDF…</h3>" +
    "<p class='sub' style='margin:6px 0 0'>Scoring all eight sections. Usually 15–30 seconds.</p></div>" +
    /* message */
    "<div class='card' id='m-card' hidden><div class='result' id='m-text'></div>" +
    "<div class='btnrow'><button type='button' class='btn ghost' id='m-again'>Back</button></div></div>" +
    /* report */
    "<div id='r-card' hidden>" +
    "<div class='card r-head'>" +
    "<div class='ring2' id='r-ring'><div class='in'><div class='pc' id='r-score'>0</div><div class='lb'>LINKEDIN SCORE</div></div></div>" +
    "<div class='r-headtxt'><div class='r-kind'>LINKEDIN REVIEW</div>" +
    "<div class='r-verdict' id='r-verdict'></div>" +
    "<div class='r-file' id='r-file'></div></div></div>" +
    /* report sections — focused screens, not one long scroll; print
     * shows everything */
    "<div class='rtabs no-print' role='tablist'>" +
    "<button type='button' class='rtab on' data-rp='overview' role='tab'>Overview</button>" +
    "<button type='button' class='rtab' data-rp='sections' role='tab'>Section by section</button>" +
    "<button type='button' class='rtab' data-rp='rewrite' role='tab'>✍️ Rewrite</button>" +
    "</div>" +

    /* ---- overview ---- */
    "<div class='rpanel' id='rp-overview'>" +
    "<div class='card'><h3>Where your points came from</h3><div id='r-secbars'></div></div>" +
    "<div class='card nextstep'><div class='ns-label'>DO THIS FIRST</div><div id='r-next'></div></div>" +
    "<div class='card cheer' id='r-cheercard' hidden><span class='cheer-ico'>🐣</span><span class='cheer-tx' id='r-cheer'></span></div>" +
    "<a class='card journeynext no-print' id='li-journey' href='/interview'><div>" +
    "<div class='ns-label'>NEXT ON YOUR JOURNEY</div>" +
    "<b>Mock interview — practise telling this story out loud</b></div>" +
    "<span class='jn-btn'>Go →</span></a>" +
    "</div>" +

    /* ---- section by section ---- */
    "<div class='rpanel' id='rp-sections' hidden>" +
    `<div class='chiprow' role='tablist' aria-label='Section scores'>${chipRow}</div>` +
    "<div class='secnav no-print'><button type='button' class='secarrow' id='sec-prev' aria-label='Previous section'>←</button>" +
    "<span class='sec-pos' id='sec-pos'></span>" +
    "<button type='button' class='secarrow' id='sec-next' aria-label='Next section'>→</button></div>" +
    "<div id='r-sections'></div>" +
    "</div>" +

    /* ---- rewrite ---- */
    "<div class='rpanel' id='rp-rewrite' hidden>" +
    "<div class='card no-print' id='rw-panel'><h3>✍️ Profile Rewrite</h3>" +
    "<p class='kw-note'>Fledge drafts paste-ready wording for your headline, About section and weakest experience " +
    "entry — built only from what your profile genuinely says, with [brackets] for anything only you can add. " +
    "Uses one of today's reviews.</p>" +
    "<button type='button' class='btn' id='rw-btn'>Generate my rewrite</button>" +
    "<div id='rw-out' hidden>" +
    "<div class='rw-block'><div class='rw-h'>HEADLINE — paste into LinkedIn</div><div class='rw-t' id='rw-headline'></div><button type='button' class='rev-copy' data-copy-rw='rw-headline'>Copy</button></div>" +
    "<div class='rw-block'><div class='rw-h'>ABOUT — paste into LinkedIn</div><div class='rw-t' id='rw-about'></div><button type='button' class='rev-copy' data-copy-rw='rw-about'>Copy</button></div>" +
    "<div class='rw-block'><div class='rw-h'>YOUR WEAKEST EXPERIENCE ENTRY, REWRITTEN</div><div class='rw-t' id='rw-exp'></div><button type='button' class='rev-copy' data-copy-rw='rw-exp'>Copy</button></div>" +
    "<div class='kw-note' id='rw-next'></div></div></div>" +
    "</div>" +
    "<div class='fbrow no-print' id='fbrow'><span>Was this review helpful?</span>" +
    "<button type='button' class='fbbtn' data-fb='1' aria-label='Yes, helpful'>👍</button>" +
    "<button type='button' class='fbbtn' data-fb='0' aria-label='Not helpful'>👎</button></div>" +
    "<div class='btnrow no-print'>" +
    "<button type='button' class='btn' onclick='window.print()'>Print / save feedback</button>" +
    "<button type='button' class='btn ghost' id='r-again'>Review another</button></div>" +
    "</div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:18px'>Up to 5 reviews a day (shared with the CV review). Scores are honest " +
    "and calibrated for someone starting out. If anything in your profile worries Fledge about your wellbeing, it will " +
    "point you to real support instead of reviewing.</p>" +
    "</main>" +
    "<script>(function(){var lastName='';" +
    "function stored(st,k){return flStoredId(st,k)}" +
    "var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');" +
    "var $=function(id){return document.getElementById(id)};" +
    "var qs=new URLSearchParams(location.search);" +
    "var hubEmail=flResolveEmail();flIdentityInit(lid);" +
    /* The journey card must carry identity to the next tool. */
    "(function(){var j=document.getElementById('li-journey'),t=flToken();" +
    "if(j&&t)j.href='/interview?t='+encodeURIComponent(t);})();" +
    "function dots(a,b,c){[['lis-1',a],['lis-2',b],['lis-3',c]].forEach(function(p){" +
    "var e2=$(p[0]);e2.className='clstep'+(p[1]==='on'?' on':p[1]==='done'?' done':'');" +
    "if(p[1]==='on')e2.setAttribute('aria-current','step');else e2.removeAttribute('aria-current');});}" +
    "function show(card){['u-card','a-card','m-card','r-card'].forEach(function(k){$(k).hidden=k!==card});" +
    "if(card==='a-card')dots('done','done','on');" +
    "else if(card==='r-card')dots('done','done','done');" +
    "else if(card==='u-card')dots($('list-2').hidden?'on':'done',$('list-2').hidden?'':'on','');}" +
    "function liGo(n){$('list-1').hidden=n!==1;$('list-2').hidden=n!==2;" +
    "dots(n===1?'on':'done',n===2?'on':'','');" +
    "if(n===2){var t=$('target').value.trim();" +
    "$('li-aim-note').textContent=t?'Scoring against: '+(t.length>60?t.slice(0,57)+'…':t):'No target set — scoring for overall readiness.';}" +
    "window.scrollTo({top:0,behavior:'smooth'});}" +
    "$('li-n1').onclick=function(){liGo(2)};" +
    "$('li-skip').onclick=function(){$('target').value='';liGo(2)};" +
    "$('li-b2').onclick=function(){liGo(1)};" +
    /* pdf.js on demand (same rail as /tools) */
    "var PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';" +
    "var PDFWK='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';" +
    "var pdfReady=null;" +
    "function loadPdf(){if(pdfReady)return pdfReady;" +
    "pdfReady=new Promise(function(res,rej){var s=document.createElement('script');s.src=PDFJS;s.integrity='sha512-q+4liFwdPC/bNdhUpZx6aXDx/h77yEQtn4I1slHydcbZK34nLaR3cAeYSJshoxIOq3mjEf7xJE8YWIUHMn+oCQ==';s.crossOrigin='anonymous';" +
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
    /* upload handling */
    "var drop=$('drop'),fileIn=$('file');" +
    "function dropErr(msg){var e=$('d-err');e.hidden=!msg;e.textContent=msg||'';}" +
    "function handleFile(f){if(!f)return;dropErr('');" +
    "if(!/pdf$/i.test(f.type||'')&&!/\\.pdf$/i.test(f.name)){dropErr('That is not a PDF — use Save to PDF on your LinkedIn profile first.');return;}" +
    "if(f.size>10*1024*1024){dropErr('That PDF is over 10 MB — export a smaller version.');return;}" +
    "lastName=f.name;show('a-card');startMsgs();" +
    "extractPdf(f).then(function(text){" +
    "text=text.replace(/[ \\t]+/g,' ').replace(/\\n{3,}/g,'\\n\\n').trim();" +
    "if(text.length<120){stopMsgs();show('u-card');fileIn.value='';" +
    "dropErr('Fledge could not read enough text from that PDF — make sure it is the Save to PDF export from LinkedIn itself.');return;}" +
    "submit(text);" +
    "}).catch(function(){stopMsgs();show('u-card');fileIn.value='';" +
    "dropErr('Could not read that PDF — try exporting it again from LinkedIn.');});}" +
    "drop.addEventListener('click',function(){fileIn.click()});" +
    "drop.addEventListener('keydown',function(e){if(e.key==='Enter'||e.key===' '){e.preventDefault();fileIn.click()}});" +
    "fileIn.addEventListener('change',function(){handleFile(fileIn.files[0])});" +
    "['dragover','dragenter'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.add('over')})});" +
    "['dragleave','drop'].forEach(function(ev){drop.addEventListener(ev,function(e){e.preventDefault();drop.classList.remove('over')})});" +
    "drop.addEventListener('drop',function(e){var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];handleFile(f)});" +
    /* analysing messages */
    "var MSGS=['Reading your PDF…','Checking your URL and headline…','Scoring your About section…','Weighing up experience and skills…','Writing your feedback…'];" +
    "var msgTimer=null;" +
    "function startMsgs(){var i=0;$('a-msg').textContent=MSGS[0];" +
    "msgTimer=setInterval(function(){i=(i+1)%MSGS.length;$('a-msg').textContent=MSGS[i]},3000);}" +
    "function stopMsgs(){if(msgTimer){clearInterval(msgTimer);msgTimer=null}}" +
    /* submit + report */
    "function band(pct){return pct>=70?'#1A7649':pct>=50?'#9A5812':'#B93A22'}" +
    "function esc2(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}" +
    "var lastLiText='';" +
    "function submit(text){lastLiText=text;" +
    "fetch('/api/linkedin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({" +
    "learner_id:lid,session_id:sid,text:text,target:$('target').value,token:flToken()})})" +
    ".then(function(r){return r.json()}).then(function(d){stopMsgs();fileIn.value='';" +
    "if(d&&d.report){renderReport(d.report);show('r-card');window.scrollTo({top:0,behavior:'smooth'});return;}" +
    "$('m-text').textContent=(d&&d.reply)||'Something went wrong — try again in a minute.';show('m-card');" +
    "}).catch(function(){stopMsgs();fileIn.value='';" +
    "$('m-text').textContent='Could not reach the reviewer — try again in a minute.';show('m-card');});}" +
    /* A fresh review must never show the PREVIOUS profile's rewrite —
     * hide the rewrite panel and reset its button every render. */
    "function rpGo(id){document.querySelectorAll('.rpanel').forEach(function(p){p.hidden=p.id!=='rp-'+id});" +
    "document.querySelectorAll('.rtab').forEach(function(t){t.classList.toggle('on',t.dataset.rp===id);" +
    "t.setAttribute('aria-selected',t.dataset.rp===id?'true':'false');});" +
    "window.scrollTo({top:0,behavior:'smooth'});}" +
    "document.querySelectorAll('.rtab').forEach(function(t){t.onclick=function(){rpGo(t.dataset.rp)}});" +
    "function renderReport(r){var col=band(r.overall);rpGo('overview');" +
    "$('rw-out').hidden=true;$('rw-btn').disabled=false;$('rw-btn').textContent='Generate my rewrite';" +
    "flCountUp($('r-score'),r.overall,'%');$('r-score').style.color=col;" +
    "$('r-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(r.overall*3.6)+'deg,#ECE7E6 '+Math.round(r.overall*3.6)+'deg)';" +
    "$('r-verdict').textContent=r.verdict;" +
    "$('r-file').textContent=lastName+($('target').value?' · aiming at: '+$('target').value:'');" +
    /* Section overview: one bar per section, width = share of its
     * maximum, so weak sections jump out before any reading. */
    "var sb='';r.sections.forEach(function(s,i){var p2=s.weight?Math.round(s.score*100/s.weight):0;var c2=band(p2);" +
    "sb+=\"<div class='secbar' data-sec='\"+s.id+\"'><span class='secbar-l'>\"+esc2(s.label)+\"</span>\"+" +
    "\"<div class='secbar-t'><i style='width:\"+p2+\"%;background:\"+c2+\";animation-delay:.\"+(i*0.07).toFixed(2)+\"s'></i></div>\"+" +
    "\"<b class='secbar-v' style='color:\"+c2+\"'>\"+s.score+\"<i>/\"+s.weight+\"</i></b></div>\";});" +
    "$('r-secbars').innerHTML=sb;" +
    /* overview bars jump into the sections tab at that section */
    "document.querySelectorAll('.secbar').forEach(function(row,idx){row.onclick=function(){" +
    "rpGo('sections');secShow(idx);};});" +
    /* Same marking scheme the score came from, so a learner can see
     * what each section is judged on and what the band above asks for. */
    "var FL_LI_RUBRIC=" + JSON.stringify(
      Object.fromEntries(
        LINKEDIN_SECTIONS.map((d) => [d.id, { measures: d.measures, source: d.source, bands: d.bands }]),
      ),
    ) + ";" +
    "function liLadder(id,pct){var rb=FL_LI_RUBRIC[id];if(!rb)return '';" +
    "var here=null;for(var i=0;i<rb.bands.length;i++){if(pct>=rb.bands[i].min){here=rb.bands[i];break}}" +
    "var rows=rb.bands.slice().reverse().map(function(b){var on=here&&b.min===here.min;" +
    "return \"<div class='rb-row\"+(on?' on':'')+\"'><span class='rb-band' style='\"+(on?'background:'+band(pct)+';color:#fff':'')+\"'>\"+esc2(b.label)+\"</span>\"+" +
    "\"<span class='rb-means'>\"+esc2(b.means)+\"</span>\"+(on?\"<span class='rb-you'>you</span>\":'')+\"</div>\"}).join('');" +
    "return \"<details class='rb'><summary><span>How this section is marked</span></summary>\"+" +
    "\"<p class='rb-m'>\"+esc2(rb.measures)+\"</p>\"+" +
    "(rb.source?\"<p class='rb-src'>\"+esc2(rb.source)+\"</p>\":'')+rows+\"</details>\"}" +
    "var panels='';r.sections.forEach(function(s){" +
    "var pct=s.weight?Math.round(s.score*100/s.weight):0;var c=band(pct);" +
    "var chip=$('chip-score-'+s.id);if(chip){chip.textContent=s.score+'/'+s.weight;chip.style.color=c;}" +
    "var bar=$('chip-bar-'+s.id);if(bar){bar.style.background=c;}" +
    "panels+=\"<div class='card secpanel' id='sec-\"+s.id+\"'>\"+" +
    "\"<div class='sec-head'><h3>\"+esc2(s.label)+\" review</h3>\"+" +
    "\"<span class='sec-score' style='color:\"+c+\"'>\"+s.score+\"<i>/\"+s.weight+'</i></span></div>'+liLadder(s.id,pct);" +
    "if(s.right.length){panels+=\"<div class='sec-h ok'>Things you got right</div><ul class='goods'>\"+" +
    "s.right.map(function(x){return \"<li><span class='tick'>✓</span>\"+esc2(x)+'</li>'}).join('')+'</ul>';}" +
    "if(s.improve.length){panels+=\"<div class='sec-h miss'>What to improve</div>\";" +
    "s.improve.forEach(function(x,i){panels+=\"<div class='fix'><div class='fix-n'>\"+(i+1)+\"</div><div class='fix-d'>\"+esc2(x)+'</div></div>'});}" +
    "if(!s.right.length&&!s.improve.length){panels+=\"<div class='sec-h miss'>Nothing found for this section</div>\";}" +
    "panels+='</div>';});" +
    "$('r-sections').innerHTML=panels;" +
    "document.querySelectorAll('.schip').forEach(function(ch,idx){ch.onclick=function(){secShow(idx)};});" +
    "secShow(0);" +
    "$('r-next').textContent=r.next_step;" +
    "if(r.encouragement){$('r-cheer').textContent=r.encouragement;$('r-cheercard').hidden=false}" +
    "else{$('r-cheercard').hidden=true}}" +
    "document.querySelectorAll('.fbbtn').forEach(function(b){b.onclick=function(){" +
    "fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'}," +
    "body:JSON.stringify({learner_id:lid,tool:'linkedin',helpful:b.dataset.fb==='1'})}).catch(function(){});" +
    "$('fbrow').textContent='Thanks — that helps Fledge improve.';};});" +
    /* section arrows: step through the eight panels */
    /* one section panel at a time — flick with chips or arrows */
    "var secIdx=0;function secShow(i){var panels=document.querySelectorAll('.secpanel');if(!panels.length)return;" +
    "secIdx=Math.max(0,Math.min(panels.length-1,i));" +
    "panels.forEach(function(pnl,j){pnl.hidden=j!==secIdx});" +
    "document.querySelectorAll('.schip').forEach(function(ch,j){ch.classList.toggle('on',j===secIdx)});" +
    "$('sec-pos').textContent=(secIdx+1)+' of '+panels.length;" +
    "$('sec-prev').disabled=secIdx===0;$('sec-next').disabled=secIdx===panels.length-1;}" +
    "$('sec-prev').onclick=function(){secShow(secIdx-1)};$('sec-next').onclick=function(){secShow(secIdx+1)};" +
    /* profile rewrite */
    "$('rw-btn').onclick=function(){if(!lastLiText){alert('Run a review first.');return;}" +
    "$('rw-btn').disabled=true;$('rw-btn').textContent='Writing your rewrite…';" +
    "fetch('/api/linkedin-rewrite',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({" +
    "learner_id:lid,text:lastLiText,target:$('target').value})})" +
    ".then(function(r){return r.json()}).then(function(d){" +
    "$('rw-btn').disabled=false;$('rw-btn').textContent='Generate my rewrite';" +
    "if(!d||!d.rewrite){alert((d&&d.reply)||'Could not rewrite just now — try again in a minute.');return;}" +
    "$('rw-headline').textContent=d.rewrite.headline;$('rw-about').textContent=d.rewrite.about;" +
    "$('rw-exp').textContent=d.rewrite.experience_tip||'';$('rw-next').textContent=d.rewrite.next||'';" +
    "$('rw-out').hidden=false;" +
    "document.querySelectorAll('[data-copy-rw]').forEach(function(b){b.onclick=function(){" +
    "var t=$(b.dataset.copyRw).textContent;" +
    "(navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject())" +
    ".then(function(){b.textContent='Copied ✓';setTimeout(function(){b.textContent='Copy'},1500);}).catch(function(){});};});})" +
    ".catch(function(){$('rw-btn').disabled=false;$('rw-btn').textContent='Generate my rewrite';" +
    "alert('Could not reach Fledge — try again in a minute.');});};" +
    "$('r-again').onclick=function(){show('u-card')};$('m-again').onclick=function(){show('u-card')};" +
    /* QA hook: render a report without a model call. */
    "window.__flLiRender=function(r){renderReport(r);show('r-card');};" +
    "})();</script>";

  const extraCss = `
.clsteps{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.clstep{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#616A71;
  background:#fff;border:1.5px solid var(--line,#E3DDDA);border-radius:999px;padding:7px 14px;}
.clstep i{width:20px;height:20px;border-radius:50%;background:var(--off);color:#616A71;font-style:normal;
  display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;}
.clstep.on{color:var(--navy);border-color:var(--mango);}
.clstep.on i{background:linear-gradient(135deg,#A66633,#B93A22);color:#fff;}
.clstep.done{color:var(--navy);}
.clstep.done i{background:#1A7649;color:#fff;}
.clsep{flex:none;width:22px;border-top:2px dashed #C9C1BD;}
.hero-note{font-size:12.5px;color:#616A71;align-self:center;}
.howto{background:rgba(19,80,127,.06);border-radius:12px;padding:12px 14px;font-size:13.5px;line-height:1.55;margin-bottom:14px;}
.drop{border:2.5px dashed var(--blue);border-radius:18px;padding:34px 20px;text-align:center;cursor:pointer;
  background:rgba(19,80,127,.04);margin-top:16px;transition:border-color .15s,background .15s;}
.drop:hover,.drop.over{border-color:#B93A22;background:rgba(217,69,43,.06);}
.drop:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.drop-ico{width:58px;height:58px;border-radius:50%;margin:0 auto 12px;display:flex;align-items:center;
  justify-content:center;background:linear-gradient(135deg,#A66633,#B93A22);}
.drop-ico svg{width:28px;height:28px;}
.drop-big{font-size:19px;font-weight:700;}
.drop-hint{color:var(--blue);font-size:13px;margin-top:6px;line-height:1.5;}
.drop-err{color:#B93A22;font-weight:600;font-size:13.5px;margin-top:12px;}
.centre{text-align:center;padding:40px 22px;}
.pulse{width:64px;height:64px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;
  background:linear-gradient(135deg,#A66633,#B93A22);animation:flPulse 1.6s ease-in-out infinite;}
.pulse svg{width:30px;height:30px;}
@keyframes flPulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(217,69,43,.35)}
  50%{transform:scale(1.07);box-shadow:0 0 0 16px rgba(217,69,43,0)}}
.r-head{display:flex;align-items:center;gap:22px;flex-wrap:wrap;border-top:6px solid var(--orange);}
.rtabs{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 16px;}
.rtab{border:1.5px solid var(--line,#E3DDDA);background:#fff;border-radius:999px;padding:9px 16px;
  font-family:inherit;font-size:13px;font-weight:700;color:var(--ink,#25394B);cursor:pointer;}
.rtab.on{background:var(--navy,#05253C);border-color:var(--navy,#05253C);color:#fff;}
.rtab:hover:not(.on){border-color:var(--mango,#ED9249);}
@media print{.rpanel{display:block!important;}
.rpanel[hidden]{display:block!important;}}
.secbar{display:grid;grid-template-columns:150px 1fr 62px;gap:12px;align-items:center;padding:7px 0;cursor:pointer;}
.secbar:hover .secbar-l{color:#B93A22;}
.secbar-l{font-size:12.5px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.secbar-t{height:13px;border-radius:999px;background:var(--off,#ECE7E6);overflow:hidden;}
.secbar-t i{display:block;height:100%;border-radius:999px;animation:secgrow .8s cubic-bezier(.2,.7,.3,1) both;}
@keyframes secgrow{from{width:0}}
.secbar-v{font-size:13px;font-weight:800;text-align:right;font-variant-numeric:tabular-nums;}
.secbar-v i{font-style:normal;color:#616A71;font-weight:600;font-size:11px;}
.journeynext{display:flex;align-items:center;gap:16px;text-decoration:none;color:var(--navy);
  border-left:4px solid var(--orange);transition:box-shadow .2s;}
.journeynext:hover{box-shadow:0 4px 14px rgba(5,37,60,.12);}
.journeynext>div{flex:1;}
.journeynext b{font-size:15px;}
.jn-btn{flex:none;background:var(--orange);color:#fff;border-radius:11px;padding:10px 18px;font-weight:800;font-size:14px;}
@media(prefers-reduced-motion:reduce){.secbar-t i{animation:none;}}
.ring2{width:118px;height:118px;border-radius:50%;display:flex;align-items:center;justify-content:center;flex:none;}
.ring2 .in{width:90px;height:90px;border-radius:50%;background:#fff;display:flex;flex-direction:column;
  align-items:center;justify-content:center;}
.ring2 .pc{font-size:27px;font-weight:800;line-height:1;}
.ring2 .lb{font-size:8.5px;color:var(--blue);font-weight:700;letter-spacing:.06em;margin-top:3px;}
.r-kind{font-size:11.5px;font-weight:700;color:var(--blue);letter-spacing:.08em;}
.r-verdict{font-size:24px;font-weight:700;line-height:1.2;margin:4px 0;}
.r-file{font-size:12.5px;color:#616A71;}
.chiprow{display:flex;gap:10px;overflow-x:auto;padding:4px 2px 12px;margin-bottom:8px;-webkit-overflow-scrolling:touch;}
.schip{flex:none;min-width:104px;background:#fff;border:1.5px solid var(--off);border-radius:14px;padding:12px 14px 14px;
  font-family:inherit;cursor:pointer;text-align:left;position:relative;overflow:hidden;transition:transform .12s,box-shadow .12s;}
.schip:hover{transform:translateY(-2px);box-shadow:0 8px 18px -10px rgba(5,37,60,.35);}
.schip:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.schip-score{display:block;font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;color:#B9AFAB;}
.schip-label{display:block;font-size:11.5px;font-weight:600;color:#4a5b66;margin-top:2px;}
.schip-bar{position:absolute;left:0;right:0;bottom:0;height:4px;background:var(--off);display:block;}
.secpanel{scroll-margin-top:64px;}
.secnav{display:flex;align-items:center;gap:12px;justify-content:flex-end;margin-bottom:10px;position:sticky;top:8px;z-index:4;}
.secarrow{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--line,#E3DDDA);background:#fff;font-size:16px;
  cursor:pointer;color:var(--blue);box-shadow:0 2px 8px rgba(5,37,60,.1);}
.secarrow:hover{border-color:#B93A22;color:#B93A22;}
.sec-pos{font-size:12px;font-weight:700;color:var(--mut,#5C6A76);min-width:52px;text-align:center;}
.schip.on{border-color:var(--navy,#05253C);box-shadow:0 0 0 2px rgba(5,37,60,.15);}
@media print{.secpanel[hidden]{display:block!important;}}
.rw-block{border:1.5px solid var(--line,#E3DDDA);border-radius:12px;padding:12px 14px;margin-bottom:10px;position:relative;}
.rw-h{font-size:10.5px;font-weight:800;letter-spacing:.08em;color:var(--blue);margin-bottom:6px;}
.rw-t{font-size:13.5px;line-height:1.6;color:#2A3F52;white-space:pre-wrap;}
.rev-copy{position:absolute;top:10px;right:10px;border:1.5px solid var(--line,#E3DDDA);background:#fff;border-radius:999px;
  padding:4px 12px;font-family:inherit;font-size:11.5px;font-weight:700;color:var(--blue);cursor:pointer;}
.rev-copy:hover{border-color:#B93A22;color:#B93A22;}
.sec-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:4px;}
.sec-head h3{margin-bottom:0;}
.sec-score{font-size:24px;font-weight:800;font-variant-numeric:tabular-nums;}
.sec-score i{font-style:normal;font-size:13px;color:#616A71;font-weight:600;}
.sec-h{font-size:12.5px;font-weight:700;letter-spacing:.04em;margin:14px 0 8px;text-transform:uppercase;}
.sec-h.ok{color:var(--ok);}
.sec-h.miss{color:#9A5812;}
.goods{list-style:none;line-height:1.6;font-size:14px;}
.goods li{margin-bottom:8px;}
.goods .tick{color:var(--ok);font-weight:700;margin-right:8px;}
.fix{display:flex;gap:12px;margin-bottom:10px;}
.fix-n{width:26px;height:26px;border-radius:50%;background:var(--navy);color:#fff;font-weight:700;font-size:12.5px;
  display:flex;align-items:center;justify-content:center;flex:none;margin-top:1px;}
.fix-d{font-size:13.5px;color:#4a5b66;line-height:1.55;padding-top:3px;}
.nextstep{background:#fff;border-left:4px solid var(--orange);color:var(--navy);}
.nextstep .ns-label{font-size:11.5px;font-weight:800;letter-spacing:.1em;color:#B93A22;margin-bottom:6px;}
.nextstep div:last-child{font-size:15.5px;line-height:1.6;font-weight:500;}
`;
  return appShell({
    title: "Fledglings — LinkedIn Optimizer",
    active: "linkedin",
    bodyHtml: body,
    extraCss,
  });
}
