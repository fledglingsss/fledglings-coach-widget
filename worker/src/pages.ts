/* Branded page layer for every non-widget surface the worker serves:
 * /tools, /passport, /portal. One design system, Outfit throughout,
 * mobile-first, print-aware. All dynamic values are escaped by the
 * caller via esc() before reaching a template. */

import type { PassportData } from "./lib/passport";
import type { PortalStats } from "./lib/portal";

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
.brandbar .fmark{width:38px;height:38px;border-radius:50%;flex:none;display:flex;align-items:center;
  justify-content:center;background:linear-gradient(135deg,var(--orange),var(--mango));}
.brandbar .fmark svg{width:20px;height:20px;}
.brandbar h1{font-size:17px;font-weight:600;letter-spacing:.2px;}
.brandbar .tag{font-size:12px;color:#CFE0EE;font-weight:500;}
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
    `<header class='brandbar'><span class='fmark'>${FEATHER}</span>` +
    "<div><h1>Fledglings</h1><div class='tag'>Where Growth Takes Flight</div></div>" +
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
    "<p class='sub'>Honest, specific feedback from Fledge — grounded only in what you've genuinely done. " +
    "It will never invent experience for you, because employers can tell. Your text is reviewed and then forgotten: nothing you paste is stored.</p>" +
    "<div class='tabs' role='tablist'>" +
    "<button type='button' role='tab' class='tab on' id='tab-cv' aria-selected='true'>📄 CV review</button>" +
    "<button type='button' role='tab' class='tab' id='tab-li' aria-selected='false'>💼 LinkedIn review</button></div>" +
    "<form id='f' class='card'>" +
    "<h3 id='form-title'>Review my CV</h3>" +
    "<label id='text-label' for='text'>Paste your CV text</label>" +
    "<textarea id='text' rows='12' maxlength='9000' required " +
    "placeholder='Copy everything from your CV document and paste it here…'></textarea>" +
    "<div class='counter'><span id='tc'>0</span>/9,000</div>" +
    "<label for='target'>Target role or job advert <span class='opt'>(optional — makes the feedback much sharper)</span></label>" +
    "<textarea id='target' rows='4' maxlength='2500' placeholder='e.g. Customer service apprenticeship at a bank — or paste the whole job advert'></textarea>" +
    "<div class='btnrow'><button id='go' class='btn' type='submit'>Review it</button>" +
    "<span class='spin' id='sp' hidden><span></span><span></span><span></span>&nbsp;Fledge is reading…</span></div>" +
    "</form>" +
    "<div class='card' id='out' hidden><div class='result' id='res'></div>" +
    "<div class='btnrow no-print'><button class='btn ghost' type='button' onclick='window.print()'>Print / save feedback</button></div></div>" +
    "<p class='sub' style='font-size:12.5px;'>Up to 5 reviews a day. If anything in your text worries Fledge about your wellbeing, " +
    "it will point you to real support instead of reviewing.</p>" +
    "</main>" +
    "<script>(function(){var kind='cv';" +
    "function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}" +
    "var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');" +
    "var tabCv=document.getElementById('tab-cv'),tabLi=document.getElementById('tab-li');" +
    "var lbl=document.getElementById('text-label'),ttl=document.getElementById('form-title'),ta=document.getElementById('text');" +
    "ta.addEventListener('input',function(){document.getElementById('tc').textContent=ta.value.length;});" +
    "function setKind(k){kind=k;var cv=k==='cv';" +
    "tabCv.className='tab'+(cv?' on':'');tabCv.setAttribute('aria-selected',String(cv));" +
    "tabLi.className='tab'+(cv?'':' on');tabLi.setAttribute('aria-selected',String(!cv));" +
    "ttl.textContent=cv?'Review my CV':'Review my LinkedIn profile';" +
    "lbl.textContent=cv?'Paste your CV text':'Paste your LinkedIn headline, about section and experience';" +
    "ta.placeholder=cv?'Copy everything from your CV document and paste it here…':'Copy your headline, about section and experience entries here…';}" +
    "tabCv.onclick=function(){setKind('cv')};tabLi.onclick=function(){setKind('linkedin')};" +
    "var HEADINGS=[\"What's working\",'What to add','Make it ATS-friendly','One next step','Headline & about','Profile habits'];" +
    "function render(el,t){el.innerHTML='';var blocks=String(t).split(/\\*\\*(.+?)\\*\\*/g);var p=null;" +
    "function para(){if(!p){p=document.createElement('p');el.appendChild(p);}return p;}" +
    "for(var i=0;i<blocks.length;i++){if(!blocks[i])continue;" +
    "if(i%2===1){if(HEADINGS.indexOf(blocks[i].trim())!==-1){var h=document.createElement('h4');h.textContent=blocks[i].trim();el.appendChild(h);p=null;}" +
    "else{var b=document.createElement('strong');b.textContent=blocks[i];para().appendChild(b);}}" +
    "else{var txt=blocks[i].replace(/^\\s+/,'');if(p){p.appendChild(document.createTextNode(blocks[i]));}else if(txt){para().appendChild(document.createTextNode(txt));}}" +
    "if(i%2===0&&/\\n\\s*\\n/.test(blocks[i]))p=null;}}" +
    "document.getElementById('f').onsubmit=function(e){e.preventDefault();" +
    "var go=document.getElementById('go'),sp=document.getElementById('sp'),out=document.getElementById('out');" +
    "if(ta.value.trim().length<120){alert('Paste a bit more text first — at least a few sentences.');return;}" +
    "go.disabled=true;sp.hidden=false;out.hidden=true;" +
    "fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({" +
    "learner_id:lid,session_id:sid,kind:kind,text:ta.value,target:document.getElementById('target').value})})" +
    ".then(function(r){return r.json()}).then(function(d){go.disabled=false;sp.hidden=true;out.hidden=false;" +
    "render(document.getElementById('res'),d.reply||'Something went wrong — try again in a minute.');})" +
    ".catch(function(){go.disabled=false;sp.hidden=true;out.hidden=false;" +
    "document.getElementById('res').textContent='Could not reach the reviewer — try again in a minute.';});};" +
    "})();</script>";
  return pageShell({ title: "Fledglings — CV & LinkedIn review", bodyHtml: body });
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

/* ------------------------------------------------------------------
 * /portal — provider evidence portal
 * ------------------------------------------------------------------ */
export function renderPortalLogin(error?: string): string {
  return pageShell({
    title: "Fledglings — provider portal",
    bodyHtml:
      "<main class='wrap'>" +
      "<h2 class='page'>Provider evidence portal</h2>" +
      "<p class='sub'>Live engagement figures and an evidence narrative for your self-assessment and personal development reporting. " +
      "Access codes are issued by Fledglings — contact us if you need one.</p>" +
      (error ? `<div class='notice'>${esc(error)}</div>` : "") +
      "<form method='POST' action='/portal/login' class='card'>" +
      "<h3>Sign in</h3><label for='code'>Access code</label>" +
      "<input type='text' id='code' name='code' autocomplete='off' required>" +
      "<div class='btnrow'><button class='btn' type='submit'>Open portal</button></div></form></main>",
  });
}

export function renderPortalDashboard(label: string): string {
  const body =
    "<main class='wrap'>" +
    `<h2 class='page'>Evidence dashboard</h2>` +
    `<p class='sub'>${esc(label)} · aggregate view · figures are drawn from a recent sample of learner accounts and refresh every few hours.</p>` +
    "<div class='kpis' id='kpis'>" +
    "<div class='kpi'><div class='n' id='k-total'>…</div><div class='l'>REGISTERED LEARNERS</div></div>" +
    "<div class='kpi'><div class='n' id='k-sample'>…</div><div class='l'>IN THIS SAMPLE</div></div>" +
    "<div class='kpi'><div class='n' id='k-active'>…</div><div class='l'>ACTIVE IN SAMPLE</div></div>" +
    "<div class='kpi'><div class='n' id='k-avg'>…</div><div class='l'>AVG MODULES EACH</div></div></div>" +
    "<div class='card' id='ncard' hidden><h3>Evidence narrative <span class='badge'>draft for your SAR</span></h3>" +
    "<div class='result' id='narrative' style='white-space:pre-wrap;'></div>" +
    "<div class='btnrow no-print'><button class='btn ghost' type='button' id='copy'>Copy narrative</button></div></div>" +
    "<div class='card' id='tcard' hidden><h3>Module engagement (sample)</h3><div id='table' style='overflow-x:auto;'></div></div>" +
    "<div class='notice' id='err' hidden></div>" +
    "<div class='btnrow no-print'>" +
    "<button class='btn' onclick='window.print()'>Print / save as PDF</button>" +
    "<button class='btn quiet' onclick=\"location.href='/portal/export.csv'\">Download learner CSV</button>" +
    "<button class='btn ghost' onclick=\"location.href='/portal/logout'\">Sign out</button></div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:14px;'>Figures describe engagement with Fledglings life-skills modules and are stated from a sample — " +
    "they evidence provision and participation, not attributed outcomes. The CSV lists your learners' module counts.</p>" +
    "</main>" +
    "<script>(function(){" +
    "fetch('/portal/data').then(function(r){return r.json()}).then(function(d){" +
    "if(d.error){var e=document.getElementById('err');e.hidden=false;e.textContent='Could not load data: '+d.error;return;}" +
    "var s=d.stats;" +
    "document.getElementById('k-total').textContent=s.totalUsers!==null?s.totalUsers:'—';" +
    "document.getElementById('k-sample').textContent=s.sampleSize;" +
    "document.getElementById('k-active').textContent=s.activeInSample;" +
    "document.getElementById('k-avg').textContent=s.avgModulesPerLearner;" +
    "var n=document.getElementById('ncard');n.hidden=false;document.getElementById('narrative').textContent=d.narrative||'';" +
    "document.getElementById('copy').onclick=function(){navigator.clipboard.writeText(d.narrative||'').then(function(){" +
    "document.getElementById('copy').textContent='Copied ✓';});};" +
    "var rows='';for(var i=0;i<s.courseStats.length;i++){var r=s.courseStats[i];" +
    "rows+='<tr><td>'+r.title.replace(/&/g,'&amp;').replace(/</g,'&lt;')+'</td><td class=c>'+r.enrolled+'</td><td class=c>'+r.completed+'</td>'" +
    "+'<td class=c style=\"min-width:90px;\"><div class=bar><i style=\"width:'+r.completionRate+'%\"></i></div>'+r.completionRate+'%</td></tr>';}" +
    "var t=document.getElementById('tcard');t.hidden=false;" +
    "document.getElementById('table').innerHTML='<table><tr><th>Module</th><th class=c>Enrolled</th><th class=c>Completed</th><th class=c>Completion</th></tr>'+rows+'</table>';" +
    "}).catch(function(){var e=document.getElementById('err');e.hidden=false;e.textContent='Could not load data — refresh to retry.';});" +
    "})();</script>";
  return pageShell({
    title: "Fledglings — evidence dashboard",
    bodyHtml: body,
    brandRight: `<span class='badge' style='background:rgba(255,255,255,.15);color:#fff;'>${esc(label)}</span>`,
  });
}
