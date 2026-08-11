/* Branded page layer for every non-widget surface the worker serves:
 * /tools, /passport, /portal. One design system, Outfit throughout,
 * mobile-first, print-aware. All dynamic values are escaped by the
 * caller via esc() before reaching a template. */

import { WORDMARK_DARK, WORDMARK_LIGHT } from "./brand";
import type { PassportData } from "./lib/passport";

export function esc(t: string): string {
  return t
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;"); /* templates use single-quoted attributes */
}

const FEATHER =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z"></path>' +
  '<line x1="16" y1="8" x2="2" y2="22"></line><line x1="17.5" y1="15" x2="9" y2="15"></line></svg>';

const BASE_CSS = `
:root{--navy:#05253C;--orange:#D9452B;--mango:#ED9249;--blue:#13507F;--off:#ECE7E6;--ok:#1B7A4B;}
[hidden]{display:none!important;}
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

/* Shared identity layer, included on every tool page.
 *
 * Identity IS a signed token: the worker mints it at /api/identity and
 * every scoring call carries it. Nothing here can assert an email on
 * its own — the address shown in the UI is read out of the token the
 * worker issued, so what the learner sees is what the server honours.
 *
 *   1. Embedded: the LearnWorlds Liquid email arrives as ?e= (b64url)
 *      and is exchanged, once, for a token bound to this device.
 *   2. Standalone: the learner enters their email on /hub and the same
 *      exchange happens (subject to the worker's first-claim rules).
 *   3. Tool-to-tool: the token travels as ?t= so a hub link opened on
 *      the same device keeps its identity even when the iframe's
 *      storage is partitioned.
 * The token is scoped to this browser and expires; the email inside it
 * is only ever a key for score history — no account, no password. */
export const IDENTITY_JS = String.raw`
function flViewOnly(){try{return new URLSearchParams(location.search).get('view')==='1'}catch(e){return false}}
/* Stable per-browser ids, even where storage is blocked (private mode,
 * or a cross-site iframe with partitioned storage). An in-memory
 * fallback keeps the id constant for the life of the page instead of
 * minting a fresh one on every read. */
var FL_IDS={};
function flStoredId(st,k){var v='';
try{v=st.getItem(k)||''}catch(e){}
if(!v)v=FL_IDS[k]||'';
if(!v)v=Math.random().toString(16).slice(2)+Date.now().toString(16);
FL_IDS[k]=v;
try{st.setItem(k,v)}catch(e){}
return v;}
function flLs(k){try{return localStorage.getItem(k)||''}catch(e){return ''}}
function flLsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function flLsDel(k){try{localStorage.removeItem(k)}catch(e){}}
/* Read the claims out of a token WITHOUT trusting them — display only;
 * the signature is what the worker checks on every call. */
function flTokenClaims(tok){try{var dot=String(tok||'').indexOf('.');if(dot<1)return null;
var b=tok.slice(0,dot).replace(/-/g,'+').replace(/_/g,'/');
var json=decodeURIComponent(atob(b).split('').map(function(c){return '%'+c.charCodeAt(0).toString(16).padStart(2,'0')}).join(''));
var cl=JSON.parse(json);
if(!cl||typeof cl.e!=='string'||typeof cl.exp!=='number')return null;
if(cl.exp*1000<=Date.now())return null;
return cl;}catch(e){return null}}
/* The live token for this browser: ?t= (a link from another surface)
 * wins, else whatever is stored. Expired tokens are dropped. */
function flToken(){var tok='';
try{tok=new URLSearchParams(location.search).get('t')||''}catch(e){}
if(tok&&flTokenClaims(tok)){if(!flViewOnly())flLsSet('fl_hub_token_v1',tok);return tok;}
tok=flLs('fl_hub_token_v1');
if(tok&&flTokenClaims(tok))return tok;
if(tok)flLsDel('fl_hub_token_v1');
return '';}
/* The email this device is signed in as — read from the token only. */
function flResolveEmail(){var cl=flTokenClaims(flToken());return cl?String(cl.e||''):'';}
/* Exchange an email for a signed token (the ONLY way to gain an
 * identity). Resolves {ok:true,email} or {ok:false,reason}. */
function flLinkEmail(em,learnerId){em=String(em||'').trim().toLowerCase();
if(em.indexOf('@')===-1||em.length<6||em.length>80)return Promise.resolve({ok:false,reason:'bad_email'});
return fetch('/api/identity',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({learner_id:learnerId,email:em})})
.then(function(r){return r.json()}).then(function(d){
if(d&&d.ok&&d.token){if(!flViewOnly())flLsSet('fl_hub_token_v1',d.token);
/* Storage can be blocked (private mode, or a cross-site iframe with
 * third-party storage partitioned off). Report whether the token
 * actually persisted so callers carry it in the URL instead of
 * re-minting on every load. */
return {ok:true,email:d.email||em,token:d.token,persisted:flLs('fl_hub_token_v1')===d.token};}
return {ok:false,reason:(d&&d.reason)||'unavailable'};})
.catch(function(){return {ok:false,reason:'offline'}});}
/* The raw ?e= address on the URL — a request for identity, never
 * identity itself. Only the embed exchange and the provider's
 * read-only view (authorised by their portal session) read it. */
function flEmbedEmail(){var em='';
try{var p=new URLSearchParams(location.search).get('e');
if(p){em=decodeURIComponent(atob(p.replace(/-/g,'+').replace(/_/g,'/')).split('').map(function(c){return '%'+c.charCodeAt(0).toString(16).padStart(2,'0')}).join(''));}}catch(e){}
em=String(em||'').trim().toLowerCase();
return em.indexOf('@')===-1?'':em;}
/* The Liquid email in an embed is a REQUEST for a token, not proof —
 * exchange it once per browser, then the token does the work. */
function flAdoptEmbedEmail(learnerId){var em=flEmbedEmail();
if(!em||flViewOnly())return Promise.resolve({ok:false});
/* Already this learner — nothing to exchange, so never re-navigate. */
if(flResolveEmail()===em)return Promise.resolve({ok:false});
return flLinkEmail(em,learnerId);}
/* Handing the device to someone else: drop the identity AND the work
 * saved on this browser. /ai-privacy promises exactly this, and a
 * shared Chromebook would otherwise show the next learner the last
 * one's CVs, letters and interview recordings. */
function flClearEmail(){flLsDel('fl_hub_token_v1');flLsDel('fl_hub_email_v1');
['fl_builder_cvs_v1','fl_letters_v1','fl_iv_learn_v1'].forEach(flLsDel);
try{if(window.indexedDB&&indexedDB.deleteDatabase)indexedDB.deleteDatabase('fl_interview_v1');}catch(e){}}
/* Leave the current page as nobody — strips identity from the URL too,
 * or the ?t= we just cleared would sign us straight back in. */
function flSignOutHere(){flClearEmail();
try{var u=new URL(location.href);u.searchParams.delete('t');u.searchParams.delete('e');
location.href=u.pathname+u.search;}catch(e){location.href='/hub';}}
/* One call per tool page: show who we are saving as, and — when the
 * page was opened from a LearnWorlds embed carrying ?e= — exchange
 * that address for a token, then re-render as the signed-in learner.
 *
 * Reloads via ?t= rather than a bare reload: if storage is blocked the
 * URL is the only place identity can live, and a plain reload would
 * mint again on every load (an endless loop on a locked-down device). */
function flIdentityInit(learnerId){flIdentityChip();
try{flAdoptEmbedEmail(learnerId).then(function(res){
if(res&&res.ok)flReloadWithToken(res.token);});}catch(e){}}
function flReloadWithToken(token){try{var u=new URL(location.href);
u.searchParams.delete('e');
if(token)u.searchParams.set('t',token);
location.replace(u.pathname+u.search+u.hash);}catch(e){}}
/* Carry identity between surfaces as the token itself. */
function flEmailParam(){return flToken();}
function flHubLink(){var t=flToken();return '/hub'+(t?'?t='+encodeURIComponent(t):'');}
function flAddHubBackLink(){var bk=document.createElement('a');bk.href=flHubLink();
bk.textContent='← Your Employability Hub';
bk.style.cssText='display:inline-block;margin-bottom:14px;color:#13507F;font-weight:600;font-size:13.5px;text-decoration:none;';
var hh=document.querySelector('h2.page');if(hh)hh.parentNode.insertBefore(bk,hh);}
/* Small "who is this saving as" chip under the page title — the
 * guard against shared-device cross-contamination: the current email
 * is always visible and one tap away from being cleared. */
function flIdentityChip(){var em=flResolveEmail();if(!em)return;
var chip=document.createElement('div');
chip.style.cssText='display:inline-flex;gap:8px;align-items:center;margin:-8px 0 16px;font-size:12.5px;color:#68788A;';
var who=document.createElement('span');who.textContent='Saving progress as '+em;
var not=document.createElement('button');not.type='button';not.textContent='Not you?';
not.style.cssText='border:none;background:none;color:#13507F;font-family:inherit;font-size:12.5px;font-weight:700;cursor:pointer;text-decoration:underline;padding:0;';
not.onclick=flSignOutHere;
chip.appendChild(who);chip.appendChild(not);
var hh=document.querySelector('h2.page');
if(hh&&hh.nextElementSibling)hh.parentNode.insertBefore(chip,hh.nextElementSibling.nextElementSibling||null);}`;

/* ------------------------------------------------------------------
 * App shell — the Hiration-style light application chrome used by the
 * employability suite (/hub, /tools, /linkedin, /interview,
 * /cover-letter, /builder): white sidebar navigation, soft grey
 * canvas, blue primary actions. The portal/passport keep the classic
 * pageShell.
 * ------------------------------------------------------------------ */

export const NAV_ICONS: Record<string, string> = {
  home: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M3 10.5 12 3l9 7.5'/><path d='M5 9.5V21h14V9.5'/><path d='M10 21v-6h4v6'/></svg>",
  builder: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M7 3h7l5 5v13H7z'/><path d='M14 3v5h5'/><path d='M10 13h6M10 17h6'/></svg>",
  cv: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M9 11l3 3 8-8'/><path d='M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9'/></svg>",
  cover: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='5' width='18' height='14' rx='2'/><path d='m3 7 9 6 9-6'/></svg>",
  linkedin: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='3' y='3' width='18' height='18' rx='3'/><path d='M8 11v5M8 8v.01M12 16v-5'/><path d='M16 16v-3a2 2 0 0 0-4 0'/></svg>",
  interview: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><rect x='2.5' y='6' width='13' height='12' rx='2.5'/><path d='m15.5 10.5 6-3.5v10l-6-3.5'/></svg>",
  privacy: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><path d='M12 3l8 3v6c0 4.5-3.2 7.6-8 9-4.8-1.4-8-4.5-8-9V6z'/><path d='m9 12 2 2 4-4'/></svg>",
  account: "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'><circle cx='12' cy='8.5' r='3.5'/><path d='M4.5 20a7.5 7.5 0 0 1 15 0'/></svg>",
};

export const APP_NAV: Array<{ id: string; icon: string; label: string; href: string }> = [
  { id: "home", icon: "home", label: "Home", href: "/hub" },
  { id: "builder", icon: "builder", label: "Resume Builder", href: "/builder" },
  { id: "cv", icon: "cv", label: "CV Review", href: "/tools" },
  { id: "cover", icon: "cover", label: "Cover Letter", href: "/cover-letter" },
  { id: "linkedin", icon: "linkedin", label: "LinkedIn Review", href: "/linkedin" },
  { id: "interview", icon: "interview", label: "Interview Practice", href: "/interview" },
];

const APP_CSS = `
:root{--navy:#05253C;--pri:#D9452B;--pri-dark:#B93A22;--pri-soft:#FBEAE6;--orange:#D9452B;--mango:#ED9249;
  --blue:#13507F;--ink:#25394B;--mut:#6A7A88;--line:#E3DDDA;--off:#ECE7E6;--canvas:#F4F1EF;--ok:#1B7A4B;--amber:#B96A16;}
/* The HTML hidden attribute must ALWAYS win, even against components
 * that set their own display (flex overlays, bars, chips). */
[hidden]{display:none!important;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:var(--canvas);color:var(--navy);min-height:100vh;display:flex;}
.snav{width:236px;flex:none;background:#fff;border-right:1px solid var(--line);display:flex;flex-direction:column;
  padding:22px 14px;position:sticky;top:0;height:100vh;}
.snav-logo{padding:2px 10px 6px;}
.snav-logo svg{height:30px;width:auto;display:block;}
.snav-slogan{font-size:10.5px;color:var(--mango);font-weight:600;letter-spacing:.05em;padding:0 10px 18px;}
.snav nav{display:flex;flex-direction:column;gap:4px;}
.sn-link{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;text-decoration:none;
  color:var(--ink);font-size:14.5px;font-weight:500;transition:background .12s;}
.sn-link svg{width:20px;height:20px;flex:none;color:var(--mut);}
.sn-link:hover{background:var(--off);}
.sn-link.on{background:var(--pri-soft);color:var(--pri);font-weight:700;}
.sn-link.on svg{color:var(--pri);}
.snav-foot{margin-top:auto;border-top:1px solid var(--line);padding-top:10px;display:flex;flex-direction:column;gap:4px;}
.smain{flex:1;min-width:0;display:flex;flex-direction:column;}
.wrap{width:100%;max-width:1120px;margin:0 auto;padding:30px 30px 70px;flex:1;}
h2.page{font-size:25px;margin-bottom:6px;letter-spacing:-.01em;}
.sub{color:var(--mut);margin-bottom:22px;font-size:14.5px;line-height:1.55;max-width:52em;}
.card{background:#fff;border-radius:16px;border:1px solid var(--line);padding:22px;margin-bottom:16px;
  box-shadow:0 1px 3px rgba(5,37,60,.05);}
.card h3{font-size:16px;margin-bottom:10px;font-weight:600;}
textarea,input[type=text],input[type=email]{width:100%;border:1.5px solid var(--line);border-radius:12px;padding:12px 14px;
  font-size:14.5px;font-family:inherit;color:var(--navy);background:#fff;}
textarea{resize:vertical;line-height:1.55;}
textarea:focus,input:focus{outline:none;border-color:var(--mango);box-shadow:0 0 0 3px rgba(237,146,73,.2);}
label{display:block;font-weight:600;font-size:14px;margin:16px 0 6px;}
label .opt{color:var(--mut);font-weight:500;font-size:12.5px;}
.counter{font-size:12px;color:var(--mut);text-align:right;margin-top:4px;}
.btn{background:var(--pri);color:#fff;border:none;border-radius:12px;padding:13px 24px;font-size:15px;
  font-weight:600;cursor:pointer;min-height:46px;transition:background .15s ease,transform .15s ease;}
.btn:hover{background:var(--pri-dark);transform:translateY(-1px);}
.btn:disabled{opacity:.5;cursor:default;transform:none;}
.btn:focus-visible{outline:3px solid var(--navy);outline-offset:2px;}
.btn.quiet{background:var(--blue);}
.btn.quiet:hover{background:#0e3c60;}
.btn.ghost{background:#fff;color:var(--navy);border:1.5px solid var(--line);}
.btn.ghost:hover{background:var(--off);}
.btnrow{display:flex;gap:10px;flex-wrap:wrap;margin-top:8px;}
.tabs{display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;}
.tab{border:1.5px solid var(--mango);background:#fff;color:var(--navy);border-radius:999px;padding:10px 18px;
  font-weight:600;font-size:14px;cursor:pointer;min-height:42px;}
.tab.on{background:var(--navy);border-color:var(--navy);color:#fff;}
.tab:focus-visible{outline:2px solid var(--navy);outline-offset:2px;}
.badge{display:inline-block;background:var(--off);color:var(--mut);border-radius:99px;padding:3px 10px;
  font-size:11.5px;font-weight:600;}
.notice{background:#FFF6F0;border-left:4px solid var(--orange);border-radius:10px;padding:12px 14px;
  font-size:13.5px;line-height:1.5;margin-bottom:18px;}
.result{line-height:1.7;font-size:14.5px;}
.result p{margin-bottom:8px;white-space:pre-wrap;}
.footer{padding:14px 20px;text-align:center;font-size:12px;color:var(--mut);}
.cheer{display:flex;gap:14px;align-items:flex-start;background:#F3FBF6;border:1px solid #CBE9D6;}
.cheer-ico{font-size:22px;line-height:1;}
.cheer-tx{font-size:15px;line-height:1.65;font-weight:500;color:#14532D;}
.fbrow{display:flex;gap:10px;align-items:center;font-size:13px;color:var(--mut);margin:2px 0 18px;min-height:38px;}
.fbbtn{border:1.5px solid var(--line);background:#fff;border-radius:999px;width:38px;height:38px;font-size:16px;
  cursor:pointer;display:inline-flex;align-items:center;justify-content:center;}
.fbbtn:hover{border-color:var(--pri);transform:translateY(-1px);}
/* Liveness: every stage that appears rises in; every progress bar
 * fills smoothly. Killed wholesale under prefers-reduced-motion. */
@keyframes flIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
.fl-in{animation:flIn .34s cubic-bezier(.2,.7,.3,1) both;}
.tk-bar i,.rv-bar i,.meter i,.fillbar i,.pr-pctbar i,.dim-tk i,.bar i{transition:width .7s cubic-bezier(.2,.7,.3,1);}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
@media (max-width:880px){
  body{flex-direction:column;}
  .snav{width:100%;height:auto;position:static;flex-direction:column;padding:12px 14px;border-right:none;
    border-bottom:1px solid var(--line);}
  .snav-logo{padding:2px 4px 10px;}
  .snav-logo svg{height:24px;}
  .snav nav{flex-direction:row;overflow-x:auto;gap:6px;-webkit-overflow-scrolling:touch;}
  .sn-link{white-space:nowrap;padding:9px 12px;font-size:13.5px;}
  .snav-foot{display:none;}
  .wrap{padding:22px 16px 60px;}
}
@media print{.snav,.btn,.tabs,.footer,.no-print{display:none!important;}
  body{background:#fff;}.card{box-shadow:none;border:1px solid #ddd;}}
`;

/* Retints applied AFTER page-specific CSS so the legacy warm-palette
 * decorations pick up the app skin without editing every page. */
const APP_OVERRIDES = `
[hidden]{display:none!important;}
.drop-ico,.pulse,.mic{background:linear-gradient(135deg,var(--mango),var(--orange))!important;}
.drop{border-color:var(--blue);background:rgba(19,80,127,.04);}
.drop:hover,.drop.over{border-color:var(--orange);background:rgba(217,69,43,.06);}
.drop.mini{border-color:var(--blue);background:rgba(19,80,127,.04);color:var(--blue);}
.drop.mini:hover,.drop.mini.over{border-color:var(--orange);background:rgba(217,69,43,.06);}
.qnum{color:var(--orange);}
.qrole{background:var(--off);color:var(--blue);}
.rolebtn:hover{border-color:var(--orange);}
.tpl.on{border-color:var(--orange);box-shadow:0 0 0 2px rgba(217,69,43,.18);}
.tpl:hover{border-color:var(--mango);}
.nextstep{background:#fff;border-left:4px solid var(--orange);}
.nextstep .ns-label{color:var(--orange);}
.r-head{border-top-color:var(--orange);}
.ready{border-top-color:var(--orange);}
.hero{border-top-color:var(--orange);}
.step.on{border-color:var(--mango);}
.step.on i{background:linear-gradient(135deg,var(--mango),var(--orange));}
.addbtn{border-color:var(--blue);background:rgba(19,80,127,.04);color:var(--blue);}
.addbtn:hover{border-color:var(--orange);color:var(--orange);}
.trust{background:var(--off);color:var(--blue);}
.hc-flag,.tc-flag{background:linear-gradient(90deg,var(--orange),var(--mango));}
.passport{border-top-color:var(--orange);}
.hero-tag{background:#FBEAE6;color:var(--orange);}
`;

export function appShell(opts: {
  title: string;
  active: string;
  bodyHtml: string;
  extraCss?: string;
}): string {
  const nav = APP_NAV.map(
    (n) =>
      `<a class='sn-link${n.id === opts.active ? " on" : ""}' data-nav href='${n.href}'>` +
      `${NAV_ICONS[n.icon]}<span>${esc(n.label)}</span></a>`,
  ).join("");
  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<meta name='robots' content='noindex'>" +
    `<title>${esc(opts.title)}</title>` +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' rel='stylesheet'>" +
    `<style>${APP_CSS}${opts.extraCss ?? ""}${APP_OVERRIDES}</style></head><body>` +
    "<aside class='snav'>" +
    `<div class='snav-logo'>${WORDMARK_LIGHT}</div>` +
    "<div class='snav-slogan'>Where Growth Takes Flight</div>" +
    `<nav aria-label='Employability tools'>${nav}</nav>` +
    "<div class='snav-foot'>" +
    `<a class='sn-link' data-nav href='/ai-privacy'>${NAV_ICONS.privacy}<span>AI &amp; Privacy</span></a>` +
    `<a class='sn-link' data-nav href='/hub#account'>${NAV_ICONS.account}<span>Account</span></a>` +
    "</div></aside>" +
    "<div class='smain'>" +
    `<script>${IDENTITY_JS}</script>` +
    opts.bodyHtml +
    "<div class='footer'>Fledglings · fledglings.co · life skills for 16–24s</div>" +
    "</div>" +
    "<script>(function(){var ev=flToken();if(ev){var evq=encodeURIComponent(ev);" +
    "document.querySelectorAll('a[data-nav]').forEach(function(a){" +
    "var href=a.getAttribute('href');if(href.indexOf('http')===0)return;" +
    "var hash='';var hi=href.indexOf('#');if(hi>-1){hash=href.slice(hi);href=href.slice(0,hi);}" +
    "a.href=href+(href.indexOf('?')>-1?'&':'?')+'t='+evq+hash;});}" +
    /* Liveness layer: animate anything that becomes visible, and give
     * pages a count-up for their big score reveals. */
    "var reduce=window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;" +
    "if(!reduce&&window.MutationObserver){new MutationObserver(function(muts){" +
    "muts.forEach(function(m){var el=m.target;" +
    "if(m.attributeName==='hidden'&&el.nodeType===1&&!el.hidden){" +
    "el.classList.remove('fl-in');void el.offsetWidth;el.classList.add('fl-in');}});" +
    "}).observe(document.body,{subtree:true,attributes:true,attributeFilter:['hidden']});}" +
    "window.flCountUp=function(el,to,suffix){if(!el)return;suffix=suffix||'';" +
    "to=Math.round(to);if(reduce||!window.requestAnimationFrame){el.textContent=to+suffix;return;}" +
    "var start=performance.now(),dur=650,done=false;" +
    "function tick(now){if(done)return;var p=Math.min(1,(now-start)/dur);p=1-Math.pow(1-p,3);" +
    "el.textContent=Math.round(to*p)+suffix;" +
    "if(p<1)requestAnimationFrame(tick);else done=true;}requestAnimationFrame(tick);" +
    /* Backstop: requestAnimationFrame is paused in a hidden/background
     * tab, so a score landing while the learner is elsewhere would sit
     * at 0. The real number must never wait for an animation. */
    "setTimeout(function(){if(!done){done=true;el.textContent=to+suffix;}},dur+120);};" +
    "})();</script>" +
    "</body></html>"
  );
}

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
    `<script>${IDENTITY_JS}</script>` +
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
    /* tabs */
    "<div class='tabs' role='tablist'>" +
    "<button type='button' role='tab' class='tab on' id='tab-cv' aria-selected='true'>📄 My CV</button>" +
    "<button type='button' role='tab' class='tab' id='tab-li' aria-selected='false'>💼 My LinkedIn</button></div>" +
    /* guided upload flow: aim first, then the PDF */
    "<div id='u-card'>" +
    "<div class='clsteps' aria-hidden='true'>" +
    "<span class='clstep on' id='cvs-1'><i>1</i>What you're aiming at</span><span class='clsep'></span>" +
    "<span class='clstep' id='cvs-2'><i>2</i>Your CV</span><span class='clsep'></span>" +
    "<span class='clstep' id='cvs-3'><i>3</i>Your score</span></div>" +
    /* step 1: target */
    "<div class='card' id='cvst-1'>" +
    "<h3>🎯 What are you aiming at?</h3>" +
    "<p class='kw-note' style='margin-bottom:4px'>Name the role — or paste the whole advert — and the scoring gets " +
    "much sharper: keyword matching, tailoring, the lot. You can also skip this.</p>" +
    "<input type='text' id='target' maxlength='2500' placeholder='e.g. Customer service apprenticeship at a bank'>" +
    "<div class='btnrow' style='margin-top:14px'>" +
    "<button type='button' class='btn' id='cv-n1'>Next: your CV →</button>" +
    "<button type='button' class='btn ghost' id='cv-skip'>Skip — just score it</button></div></div>" +
    /* step 2: upload */
    "<div class='card' id='cvst-2' hidden>" +
    "<h3 id='u-step-title'>📄 Upload your CV</h3>" +
    "<div class='drop' id='drop' tabindex='0' role='button' aria-label='Upload a PDF to review'>" +
    "<input type='file' id='file' accept='.pdf,application/pdf' hidden>" +
    "<div id='d-idle'><div class='drop-ico' aria-hidden='true'>" +
    "<svg viewBox='0 0 24 24' fill='none' stroke='#fff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>" +
    "<path d='M12 16V4m0 0l-4 4m4-4l4 4'/><path d='M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3'/></svg></div>" +
    "<div class='drop-big' id='d-title'>Drop your CV here</div>" +
    "<div class='drop-hint' id='d-hint'>or click to choose a file · PDF only · max 10&nbsp;MB</div></div>" +
    "<div id='d-err' class='drop-err' hidden></div>" +
    "<div class='btnrow' style='margin-top:14px'><button type='button' class='btn ghost' id='cv-b2'>← Back</button>" +
    "<span class='hero-note' id='aim-note'></span></div></div>" +
    /* one close for step 2, one for #u-card itself — the spinner and
     * report MUST be u-card's siblings: show() hides u-card when the
     * report appears, and a child report vanishes with it (the bug
     * that blanked every review result from 2026-07-28 to 08-05). */
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
    /* report sections — one focused screen at a time, never a scroll
     * marathon; print shows everything */
    "<div class='rtabs no-print' role='tablist'>" +
    "<button type='button' class='rtab on' data-rp='overview' role='tab'>Overview</button>" +
    "<button type='button' class='rtab' data-rp='match' id='rtab-match' role='tab'>Job match</button>" +
    "<button type='button' class='rtab' data-rp='checks' role='tab'>Recruiter checks</button>" +
    "<button type='button' class='rtab' data-rp='improve' role='tab'>Feedback &amp; fixes</button>" +
    "</div>" +

    /* ---- overview panel ---- */
    "<div class='rpanel' id='rp-overview'>" +
    "<div class='glance' id='r-glance'></div>" +
    "<div class='ov2'>" +
    "<div class='card'><h3>Your score in context</h3><div id='r-scale'></div><div id='r-compare' class='r-compare'></div></div>" +
    "<div class='card'><h3>The shape of your CV</h3><div id='r-radar'></div>" +
    "<p class='kw-note' style='margin:8px 0 0'>Solid shape = this CV. The dashed line is the interview-ready mark (70) — " +
    "every corner pushed past it is genuinely competitive.</p></div>" +
    "</div>" +
    "<div class='card nextstep'><div class='ns-label'>DO THIS FIRST</div><div id='r-next'></div></div>" +
    "<div class='card cheer' id='r-cheercard' hidden><span class='cheer-ico'>🐣</span><span class='cheer-tx' id='r-cheer'></span></div>" +
    "<a class='card journeynext no-print' id='r-journey' href='/linkedin'><div>" +
    "<div class='ns-label'>NEXT ON YOUR JOURNEY</div>" +
    "<b id='r-journey-t'>LinkedIn review — get your profile to match this CV</b></div>" +
    "<span class='jn-btn'>Go →</span></a>" +
    "</div>" +

    /* ---- job match panel ---- */
    "<div class='rpanel' id='rp-match' hidden>" +
    "<div class='card' id='r-kwcard' hidden><h3>Match against the job advert</h3>" +
    "<div class='kwgauge-wrap'><div id='r-kwgauge'></div>" +
    "<p class='kw-note' style='margin:0'>Screening software compares your wording to the advert's — the flag marks the 75% target. " +
    "Only claim a missing skill if you genuinely have it.</p></div>" +
    "<div class='kw-h'>✓ Found in your document</div><div class='chips' id='r-kwm'></div>" +
    "<div class='kw-h miss'>Missing from your document</div><div class='chips' id='r-kwx'></div></div>" +
    "<div class='card' id='r-kwnone' hidden><p class='kw-note' style='margin:0'>No job advert was given this time — " +
    "add the advert (or role) on the first step and this tab scores your wording against it.</p></div>" +
    "</div>" +

    /* ---- recruiter checks panel ---- */
    "<div class='rpanel' id='rp-checks' hidden>" +
    "<div class='card'><h3>Recruiter checks <span class='badge' id='r-ckcount'></span></h3>" +
    "<p class='kw-note'>Objective, rule-based checks — the things screening software and a skim-reading recruiter " +
    "judge before reading a word properly.</p>" +
    "<div class='ck-seg' id='r-ckseg'></div>" +
    "<div class='chips' id='r-ckpass'></div>" +
    "<div id='r-checks'></div></div>" +
    "</div>" +

    /* ---- feedback & fixes panel: a deck you flick through ---- */
    "<div class='rpanel' id='rp-improve' hidden>" +
    "<div class='qnav no-print' id='fb-nav'>" +
    "<button type='button' class='secarrow' id='fb-prev' aria-label='Previous'>←</button>" +
    "<div class='qchips' id='fb-chips' role='tablist'></div>" +
    "<button type='button' class='secarrow' id='fb-next' aria-label='Next'>→</button></div>" +
    "<div class='card fb-slide' data-fbl='Scores'><h3>Where you scored</h3><div id='r-dims'></div></div>" +
    "<div class='card fb-slide' data-fbl='Working'><h3>What's genuinely working</h3><ul class='goods' id='r-goods'></ul></div>" +
    "<div id='fb-fixwrap'></div>" +
    /* the method — teach the frameworks, not just the verdicts */
    "<div class='card fb-slide' data-fbl='📐 Method' id='r-method'><h3>📐 The method behind strong bullets</h3>" +
    "<p class='kw-note'>Recruiters trust lines that prove something. Two frameworks do the proving — use XYZ for " +
    "CV bullets, STAR when you talk about the same story in an interview.</p>" +
    "<div class='xyz'>" +
    "<div class='xyz-seg x'><b>Accomplished [X]</b><span>the achievement</span><i>“Served 200+ customers per shift”</i></div>" +
    "<span class='xyz-arrow'>→</span>" +
    "<div class='xyz-seg y'><b>measured by [Y]</b><span>the number that proves it</span><i>“queue times under 4 minutes”</i></div>" +
    "<span class='xyz-arrow'>→</span>" +
    "<div class='xyz-seg z'><b>by doing [Z]</b><span>how you actually did it</span><i>“running two tills at peak”</i></div>" +
    "</div>" +
    "<div class='starrow'>" +
    "<span class='star-chip'><b>S</b>ituation<i>where you were</i></span>" +
    "<span class='star-chip'><b>T</b>ask<i>what needed doing</i></span>" +
    "<span class='star-chip'><b>A</b>ction<i>what YOU did</i></span>" +
    "<span class='star-chip'><b>R</b>esult<i>what changed</i></span>" +
    "</div>" +
    "<div class='ck-g' style='margin-top:14px'>Apply it to one bullet now</div>" +
    "<ul class='tasklist method-list'>" +
    "<li><i>1</i>Pick your weakest bullet — usually one starting with “responsible for”.</li>" +
    "<li><i>2</i>Add the number only you know: how many, how often, how fast.</li>" +
    "<li><i>3</i>End with the how — the thing you did that made the number happen.</li></ul>" +
    "</div>" +
    "<div class='card fb-slide' data-fbl='Rewrite' id='r-rwcard' hidden><h3>Example rewrite — your line, upgraded</h3>" +
    "<p class='kw-note'>The pattern above, applied to your own line. Anything in [brackets] is " +
    "yours to fill in — Fledge never invents your numbers.</p>" +
    "<div class='rw before'><div class='rw-tag'>BEFORE</div><div id='r-rwb'></div></div>" +
    "<div class='rw after'><div class='rw-tag'>AFTER</div><div id='r-rwa'></div></div></div>" +
    "</div>" +
    "<div class='fbrow no-print' id='fbrow'><span>Was this review helpful?</span>" +
    "<button type='button' class='fbbtn' data-fb='1' aria-label='Yes, helpful'>👍</button>" +
    "<button type='button' class='fbbtn' data-fb='0' aria-label='Not helpful'>👎</button></div>" +
    "<div class='btnrow no-print'>" +
    "<button type='button' class='btn' onclick='window.print()'>Print / save feedback</button>" +
    "<button type='button' class='btn ghost' id='r-again'>Review another</button></div>" +
    "</div>" +
    "<p class='sub' style='font-size:12.5px;margin-top:18px'>Up to 5 reviews a day. Scores are honest and calibrated for someone starting out — " +
    "if anything in your document worries Fledge about your wellbeing, it will point you to real support instead of reviewing.</p>" +
    "</main>" +
    "<script>(function(){var kind='cv';var lastName='';" +
    "function stored(st,k){return flStoredId(st,k)}" +
    "var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');" +
    "var $=function(id){return document.getElementById(id)};" +
    /* Identity via the shared resolver: works embedded (Liquid ?e=)
     * and standalone (email saved on /hub). */
    "var qs=new URLSearchParams(location.search);" +
    "var hubEmail=flResolveEmail();flIdentityInit(lid);" +
    "var tabCv=$('tab-cv'),tabLi=$('tab-li');" +
    "function dots(a,b,c){[['cvs-1',a],['cvs-2',b],['cvs-3',c]].forEach(function(p){" +
    "$(p[0]).className='clstep'+(p[1]==='on'?' on':p[1]==='done'?' done':'');});}" +
    "function show(card){['u-card','a-card','m-card','r-card'].forEach(function(k){$(k).hidden=k!==card});" +
    "if(card==='a-card')dots('done','done','on');" +
    "else if(card==='r-card')dots('done','done','done');" +
    "else if(card==='u-card')dots($('cvst-2').hidden?'on':'done',$('cvst-2').hidden?'':'on','');}" +
    /* guided steps: aim -> upload */
    "function cvGo(n){$('cvst-1').hidden=n!==1;$('cvst-2').hidden=n!==2;" +
    "dots(n===1?'on':'done',n===2?'on':'','');" +
    "if(n===2){var t=$('target').value.trim();" +
    "$('aim-note').textContent=t?'Scoring against: '+(t.length>60?t.slice(0,57)+'…':t):'No target set — scoring for overall readiness.';}" +
    "window.scrollTo({top:0,behavior:'smooth'});}" +
    "$('cv-n1').onclick=function(){cvGo(2)};" +
    "$('cv-skip').onclick=function(){$('target').value='';cvGo(2)};" +
    "$('cv-b2').onclick=function(){cvGo(1)};" +
    "function setKind(k){kind=k;var cv=k==='cv';" +
    "tabCv.className='tab'+(cv?' on':'');tabCv.setAttribute('aria-selected',String(cv));" +
    "tabLi.className='tab'+(cv?'':' on');tabLi.setAttribute('aria-selected',String(!cv));" +
    "$('d-title').textContent=cv?'Drop your CV here':'Drop your LinkedIn PDF here';" +
    "$('d-hint').innerHTML=cv?'or click to choose a file · PDF only · max 10\\u00a0MB':" +
    "'On LinkedIn: your profile → <b>More</b> → <b>Save to PDF</b> — then upload it here';" +
    "show('u-card');}" +
    /* The LinkedIn tab now lives at the dedicated Optimizer — carry
     * the hub identity across so scores land in one history. */
    "function linkedinUrl(){var ev=flToken();return '/linkedin'+(ev?'?t='+encodeURIComponent(ev):'');}" +
    "tabCv.onclick=function(){setKind('cv')};tabLi.onclick=function(){location.href=linkedinUrl()};" +
    "if(qs.get('tab')==='li'){location.replace(linkedinUrl());}" +
    /* Handoff from the Resume Builder: the built CV's text arrives via
     * sessionStorage — offer to review it without a PDF. */
    "if(qs.get('from')==='builder'){try{var bTxt=sessionStorage.getItem('fl_builder_cv_text')||'';" +
    "if(bTxt.length>=120){var bb=document.createElement('div');bb.className='card';" +
    "bb.innerHTML=\"<h3>Review the CV you just built?</h3><p class='kw-note'>Fledge has the text from your Resume Builder — \"+" +
    "\"no PDF needed. Add a target role above first if you have one.</p>\";" +
    "var bbtn=document.createElement('button');bbtn.type='button';bbtn.className='btn';" +
    "bbtn.textContent='Review my built CV now';" +
    "bbtn.onclick=function(){lastName='Your built CV';show('a-card');startMsgs();submit(bTxt);};" +
    "bb.appendChild(bbtn);var uc=$('u-card');uc.parentNode.insertBefore(bb,uc);}}catch(e){}}" +
    /* ---- pdf.js on demand ---- */
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
    "learner_id:lid,session_id:sid,kind:kind,text:text,target:$('target').value,token:flToken()})})" +
    ".then(function(r){return r.json()}).then(function(d){stopMsgs();fileIn.value='';" +
    "if(d&&d.report){renderReport(d.report,d.checks);show('r-card');window.scrollTo({top:0,behavior:'smooth'});return;}" +
    "$('m-text').textContent=(d&&d.reply)||'Something went wrong — try again in a minute.';show('m-card');" +
    "}).catch(function(){stopMsgs();fileIn.value='';" +
    "$('m-text').textContent='Could not reach the reviewer — try again in a minute.';show('m-card');});}" +
    /* Horizontal gauge: coloured zones, a pin at the score, a flag at
     * the 75% screening target. */
    "function kwGauge(pct){var W=340,H=64,x=function(v){return 8+(W-16)*v/100};" +
    "return \"<svg viewBox='0 0 \"+W+\" \"+H+\"' class='kwg' role='img' aria-label='Keyword match \"+pct+\" percent, target 75'>\"+" +
    "\"<rect x='\"+x(0)+\"' y='34' width='\"+(x(50)-x(0))+\"' height='12' rx='6' fill='#F0C9C0'/>\"+" +
    "\"<rect x='\"+x(50)+\"' y='34' width='\"+(x(75)-x(50))+\"' height='12' fill='#F3D9B6'/>\"+" +
    "\"<rect x='\"+x(75)+\"' y='34' width='\"+(x(100)-x(75))+\"' height='12' rx='6' fill='#BFDCCB'/>\"+" +
    "\"<line x1='\"+x(75)+\"' y1='26' x2='\"+x(75)+\"' y2='52' stroke='#05253C' stroke-width='2' stroke-dasharray='3 2'/>\"+" +
    "\"<text x='\"+x(75)+\"' y='20' text-anchor='middle' font-size='10' font-weight='700' fill='#05253C'>75% target</text>\"+" +
    "\"<circle cx='\"+x(pct)+\"' cy='40' r='9' fill='\"+band(pct)+\"'/>\"+" +
    "\"<text x='\"+x(pct)+\"' y='62' text-anchor='middle' font-size='13' font-weight='800' fill='\"+band(pct)+\"'>\"+pct+\"%</text>\"+" +
    "'</svg>'}" +
    /* feedback deck: flick through scores / strengths / each fix /
     * method / rewrite one screen at a time */
    "var fbIdx=0;" +
    /* content-absent slides (e.g. no rewrite) carry data-absent and
     * never join the deck; the pager owns [hidden] for the rest */
    "function fbSlides(){return Array.prototype.filter.call(document.querySelectorAll('#rp-improve .fb-slide'),function(s){return !s.hasAttribute('data-absent')});}" +
    "function fbShow(i){var s=fbSlides();if(!s.length)return;" +
    "fbIdx=Math.max(0,Math.min(s.length-1,i));" +
    "s.forEach(function(c,j){c.hidden=j!==fbIdx});" +
    "document.querySelectorAll('#fb-chips .qpick').forEach(function(ch,j){ch.classList.toggle('on',j===fbIdx)});" +
    "$('fb-prev').disabled=fbIdx===0;$('fb-next').disabled=fbIdx===s.length-1;}" +
    "function fbInit(){var s=fbSlides();" +
    "$('fb-chips').innerHTML=s.map(function(c){return \"<button type='button' class='qpick' role='tab'>\"+c.dataset.fbl+'</button>'}).join('');" +
    "document.querySelectorAll('#fb-chips .qpick').forEach(function(ch,i){ch.onclick=function(){fbShow(i)}});" +
    "$('fb-prev').onclick=function(){fbShow(fbIdx-1)};$('fb-next').onclick=function(){fbShow(fbIdx+1)};" +
    "fbShow(0);}" +
    /* report section tabs */
    "function rpGo(id){document.querySelectorAll('.rpanel').forEach(function(p){p.hidden=p.id!=='rp-'+id});" +
    "document.querySelectorAll('.rtab').forEach(function(t){t.classList.toggle('on',t.dataset.rp===id);" +
    "t.setAttribute('aria-selected',t.dataset.rp===id?'true':'false');});" +
    "window.scrollTo({top:0,behavior:'smooth'});}" +
    "document.querySelectorAll('.rtab').forEach(function(t){t.onclick=function(){rpGo(t.dataset.rp)}});" +
    /* score-in-context: the honest calibration bands this scoring is
     * built on, with the learner's pin on them */
    "function scaleChart(v){var BANDS=[[0,40,'#D9452B','Rebuild it'],[40,55,'#E07B39','Early draft'],[55,70,'#ED9249','Solid start'],[70,85,'#4E9A6B','Interview-ready'],[85,100,'#1B7A4B','Excellent']];" +
    "var W=360,H=74,x=function(p){return 6+(W-12)*p/100};var s=\"<svg viewBox='0 0 \"+W+\" \"+H+\"' class='kwg' role='img' aria-label='Score \"+v+\" of 100: \"+(BANDS.filter(function(b){return v>=b[0]&&v<=b[1]})[0]||BANDS[4])[3]+\"'>\";" +
    "BANDS.forEach(function(b,i){s+=\"<rect x='\"+x(b[0])+\"' y='30' width='\"+(x(b[1])-x(b[0]))+\"' height='12' \"+(i===0?\"rx='6' \":i===4?\"rx='6' \":'')+\"fill='\"+b[2]+\"' opacity='.42'/>\";" +
    "s+=\"<text x='\"+((x(b[0])+x(b[1]))/2)+\"' y='58' text-anchor='middle' font-size='8.6' font-weight='700' fill='#68788A'>\"+b[3]+\"</text>\";});" +
    "s+=\"<circle cx='\"+x(v)+\"' cy='36' r='9' fill='\"+band(v)+\"'/>\";" +
    "s+=\"<text x='\"+x(v)+\"' y='18' text-anchor='middle' font-size='14' font-weight='800' fill='\"+band(v)+\"'>\"+v+\"</text>\";" +
    "return s+'</svg>'}" +
    /* radar: the CV's shape vs the interview-ready line */
    "function radar(dims){var n=dims.length;if(n<3)return '';" +
    "var CX=140,CY=112,R=74;" +
    "var pt=function(i,v){var a=-Math.PI/2+i*2*Math.PI/n;" +
    "return (CX+Math.cos(a)*R*v/100).toFixed(1)+','+(CY+Math.sin(a)*R*v/100).toFixed(1)};" +
    /* Dimension labels are model text landing in an attribute — escape. */
    "var s=\"<svg viewBox='0 0 280 224' class='radar' role='img' aria-label='\"+esc(dims.map(function(d){return d.label+' '+d.score}).join(', '))+\"'>\";" +
    "[25,50,75,100].forEach(function(g){s+=\"<polygon points='\"+dims.map(function(_,i){return pt(i,g)}).join(' ')+\"' fill='none' stroke='#E3DDDA' stroke-width='1'/>\";});" +
    "dims.forEach(function(_,i){s+=\"<line x1='\"+CX+\"' y1='\"+CY+\"' x2='\"+pt(i,100).split(',')[0]+\"' y2='\"+pt(i,100).split(',')[1]+\"' stroke='#E3DDDA' stroke-width='1'/>\";});" +
    "s+=\"<polygon points='\"+dims.map(function(_,i){return pt(i,70)}).join(' ')+\"' fill='none' stroke='#05253C' stroke-width='1.6' stroke-dasharray='4 3'/>\";" +
    "s+=\"<polygon points='\"+dims.map(function(d,i){return pt(i,d.score)}).join(' ')+\"' fill='rgba(217,69,43,.22)' stroke='#D9452B' stroke-width='2.2' stroke-linejoin='round'/>\";" +
    /* labels: anchor by side so nothing clips at the viewBox edge */
    "dims.forEach(function(d,i){var a=-Math.PI/2+i*2*Math.PI/n;" +
    "var lx=CX+Math.cos(a)*(R+14),ly=CY+Math.sin(a)*(R+14);" +
    "var anch=Math.abs(Math.cos(a))<0.35?'middle':(Math.cos(a)>0?'start':'end');" +
    "if(Math.sin(a)<-0.9)ly-=4;if(Math.sin(a)>0.9)ly+=8;" +
    "s+=\"<text x='\"+lx.toFixed(1)+\"' y='\"+ly.toFixed(1)+\"' text-anchor='\"+anch+\"' font-size='9.6' font-weight='700' fill='#25394B'>\"+esc(d.label.length>16?d.label.slice(0,15)+'…':d.label)+\"</text>\";" +
    "s+=\"<text x='\"+lx.toFixed(1)+\"' y='\"+(ly+11).toFixed(1)+\"' text-anchor='\"+anch+\"' font-size='10' font-weight='800' fill='\"+band(d.score)+\"'>\"+d.score+\"</text>\";});" +
    "return s+'</svg>'}" +
    /* attempt-over-attempt: real history from the hub score store */
    "function loadCompare(){var el=$('r-compare');if(!hubEmail){" +
    "el.innerHTML=\"<span class='dmut2'>Save your email on the Hub and every review compares with your last attempt.</span>\";return;}" +
    "fetch('/api/hub',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({learner_id:lid,token:flToken()})})" +
    ".then(function(x){return x.json()}).then(function(d){" +
    "var t=d&&d.summary&&d.summary[kind==='cv'?'cv':'linkedin'];if(!t||!t.history||t.history.length<2){" +
    "el.innerHTML=\"<span class='dmut2'>First scored attempt — your next review compares here.</span>\";return;}" +
    "var h=t.history,prev=h[h.length-2],cur=h[h.length-1],dl=cur-prev;" +
    "var W=120,Hh=30,n=h.length;var pts=h.map(function(sv,i){return (i*(W-6)/(n-1)+3)+','+(Hh-3-(sv*(Hh-6)/100))}).join(' ');" +
    "el.innerHTML=\"<div class='cmp'><span class='cmp-d' style='color:\"+(dl>=0?'#1B7A4B':'#D9452B')+\"'>\"+(dl>=0?'▲ +':'▼ ')+dl+\"</span>\"+" +
    "\"<span class='cmp-t'>vs your last attempt (\"+prev+\" → \"+cur+\")</span>\"+" +
    "\"<svg viewBox='0 0 \"+W+\" \"+Hh+\"' class='cmp-spark' role='img' aria-label='Score trend across \"+n+\" attempts'>\"+" +
    "\"<polyline points='\"+pts+\"' fill='none' stroke='\"+band(cur)+\"' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/></svg>\"+" +
    "\"<span class='cmp-n'>\"+n+\" attempts</span></div>\";}).catch(function(){el.textContent='';});}" +
    "function renderReport(r,checks){" +
    "var col=band(r.overall);rpGo('overview');" +
    "$('r-scale').innerHTML=scaleChart(r.overall);" +
    "$('r-radar').innerHTML=radar(r.dimensions||[]);" +
    "loadCompare();" +
    /* keyword match (Jobscan model) */
    "var kw=r.keywords||{matched:[],missing:[]};var kwTotal=kw.matched.length+kw.missing.length;" +
    "var pct=null;" +
    "if(kwTotal>0){pct=Math.round(kw.matched.length*100/kwTotal);" +
    "$('r-kwgauge').innerHTML=kwGauge(pct);" +
    "$('r-kwm').innerHTML=kw.matched.map(function(k){return \"<span class='chip ok'>\"+esc(k)+'</span>'}).join('')||\"<span class='kw-none'>none yet</span>\";" +
    "$('r-kwx').innerHTML=kw.missing.map(function(k){return \"<span class='chip miss'>\"+esc(k)+'</span>'}).join('')||\"<span class='kw-none'>nothing important missing</span>\";" +
    "$('r-kwcard').hidden=false;$('r-kwnone').hidden=true}" +
    "else{$('r-kwcard').hidden=true;$('r-kwnone').hidden=false}" +
    /* deterministic recruiter checks — visual summary first: a
     * segmented pass/warn/fail bar, passes as compact chips, prose
     * only where action is needed. */
    "if(checks&&checks.groups){$('r-ckcount').textContent=checks.passed+' of '+checks.total+' passed';" +
    "var all=[];checks.groups.forEach(function(g){g.items.forEach(function(c){c.group=g.label;all.push(c)})});" +
    "var nP=all.filter(function(c){return c.status==='pass'}).length," +
    "nW=all.filter(function(c){return c.status==='warn'}).length,nF=all.length-nP-nW;" +
    "var seg='';[['#1B7A4B',nP,'passed'],['#ED9249',nW,'to tighten'],['#D9452B',nF,'to fix']].forEach(function(s){" +
    "if(s[1]>0)seg+=\"<div class='ck-seg-i' style='flex:\"+s[1]+\";background:\"+s[0]+\"'>\"+s[1]+' '+s[2]+'</div>';});" +
    "$('r-ckseg').innerHTML=seg;" +
    "$('r-ckpass').innerHTML=all.filter(function(c){return c.status==='pass'})" +
    ".map(function(c){return \"<span class='chip ok' title='\"+esc(c.detail)+\"'>✓ \"+esc(c.label)+'</span>'}).join('');" +
    "var ck='';var todo=all.filter(function(c){return c.status!=='pass'});" +
    "if(todo.length)ck+=\"<div class='ck-g'>Worth your attention</div>\";" +
    "todo.forEach(function(c){var ic=c.status==='warn'?'!':'✗';" +
    "ck+=\"<div class='ck \"+c.status+\"'><span class='ck-i'>\"+ic+\"</span><div><div class='ck-l'>\"+esc(c.label)+\"</div>\"+" +
    "\"<div class='ck-d'>\"+esc(c.detail)+'</div>'+" +
    "(c.evidence?\"<div class='ck-e'>“\"+esc(c.evidence)+\"”</div>\":'')+'</div></div>'});" +
    "$('r-checks').innerHTML=ck}" +
    /* rewrite (XYZ/STAR teaching) */
    "if(r.rewrite&&r.rewrite.before){$('r-rwb').textContent=r.rewrite.before;" +
    "$('r-rwa').textContent=r.rewrite.after;$('r-rwcard').removeAttribute('data-absent')}" +
    "else{$('r-rwcard').setAttribute('data-absent','1');$('r-rwcard').hidden=true}" +
    "flCountUp($('r-score'),r.overall);$('r-score').style.color=col;" +
    "$('r-ring').style.background='conic-gradient('+col+' 0deg '+Math.round(r.overall*3.6)+'deg,#ECE7E6 '+Math.round(r.overall*3.6)+'deg)';" +
    "$('r-kind').textContent=(kind==='cv'?'CV REVIEW':'LINKEDIN REVIEW');" +
    "$('r-verdict').textContent=r.verdict;" +
    "$('r-file').textContent=lastName+($('target').value?' · aiming at: '+$('target').value:'');" +
    /* Carry identity onward or the next tool scores anonymously. */
    "function flNextHref(p){var t=flToken();return p+(t?'?t='+encodeURIComponent(t):'');}" +
    "if(kind==='cv'){$('r-journey').href=flNextHref('/linkedin');$('r-journey-t').textContent='LinkedIn review — get your profile to match this CV';}" +
    "else{$('r-journey').href=flNextHref('/interview');$('r-journey-t').textContent='Mock interview — practise saying it out loud';}" +
    "var dims='';r.dimensions.forEach(function(d,i){var c=band(d.score);" +
    "var word=d.score>=70?'Strong':d.score>=50?'Getting there':'Needs work';" +
    "dims+=\"<div class='dim'><div class='dim-r'><span>\"+esc(d.label)+\" <i class='dim-word' style='background:\"+c+\"'>\"+word+\"</i></span><b style='color:\"+c+\"'>\"+d.score+\"</b></div>\"+" +
    "\"<div class='dim-tk'><i style='width:\"+d.score+\"%;background:\"+c+\";animation-delay:.\"+i+\"s'></i></div>\"+" +
    "\"<div class='dim-tip'>\"+esc(d.tip)+\"</div>\"+" +
    "(d.evidence?\"<div class='dim-ev'>“\"+esc(d.evidence)+\"”</div>\":'')+\"</div>\"});" +
    "$('r-dims').innerHTML=dims;" +
    /* at-a-glance: one tap-card per section, so the overview answers
     * 'where do I look first?' without any scrolling */
    "var weakest=r.dimensions.length?r.dimensions.reduce(function(a,b){return b.score<a.score?b:a}):null;" +
    "var glance='';" +
    "if(pct!==null)glance+=\"<button type='button' class='gl' data-rp='match'><b style='color:\"+band(pct)+\"'>\"+pct+\"%</b><span>job advert match</span><i>75% target →</i></button>\";" +
    "if(checks&&checks.groups)glance+=\"<button type='button' class='gl' data-rp='checks'><b style='color:\"+(checks.passed>=checks.total-1?'#1B7A4B':checks.passed>=checks.total-4?'#ED9249':'#D9452B')+\"'>\"+checks.passed+\"/\"+checks.total+\"</b><span>recruiter checks passed</span><i>see the rest →</i></button>\";" +
    "if(weakest)glance+=\"<button type='button' class='gl' data-rp='improve'><b style='color:\"+band(weakest.score)+\"'>\"+esc(weakest.label)+\"</b><span>your weakest area</span><i>fix it →</i></button>\";" +
    "$('r-glance').innerHTML=glance;" +
    "document.querySelectorAll('.gl').forEach(function(g){g.onclick=function(){rpGo(g.dataset.rp)}});" +
    "var goods='';r.strengths.forEach(function(s){goods+=\"<li><span class='tick'>✓</span>\"+esc(s)+'</li>'});" +
    "$('r-goods').innerHTML=goods;" +
    /* each fix is its own slide in the deck */
    "$('fb-fixwrap').innerHTML=r.improvements.map(function(f,i){" +
    "return \"<div class='card fb-slide' data-fbl='Fix \"+(i+1)+\"'><h3>What to improve <span class='badge'>\"+(i+1)+' of '+r.improvements.length+\"</span></h3>\"+" +
    "\"<div class='fix'><div class='fix-n'>\"+(i+1)+\"</div><div><div class='fix-t'>\"+esc(f.title)+\"</div>\"+" +
    "\"<div class='fix-d'>\"+esc(f.detail)+'</div>'+" +
    "(f.example?\"<div class='fix-ex'><b>Try:</b> \"+esc(f.example)+'</div>':'')+'</div></div></div>';}).join('');" +
    "fbInit();" +
    "$('r-next').textContent=r.next_step;" +
    "if(r.encouragement){$('r-cheer').textContent=r.encouragement;$('r-cheercard').hidden=false}" +
    "else{$('r-cheercard').hidden=true}}" +
    "document.querySelectorAll('.fbbtn').forEach(function(b){b.onclick=function(){" +
    "fetch('/api/feedback',{method:'POST',headers:{'Content-Type':'application/json'}," +
    "body:JSON.stringify({learner_id:lid,tool:kind,helpful:b.dataset.fb==='1'})}).catch(function(){});" +
    "$('fbrow').textContent='Thanks — that helps Fledge improve.';};});" +
    /* Escapes QUOTES too: several of these strings land in single-quoted
     * attributes (title=, aria-label=) and the check copy legitimately
     * contains apostrophes — "No 'hard-working team player' filler" —
     * which would otherwise terminate the attribute early. */
    "function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')" +
    ".replace(/\"/g,'&quot;').replace(/'/g,'&#39;')}" +
    "$('r-again').onclick=function(){show('u-card')};$('m-again').onclick=function(){show('u-card')};" +
    /* QA hook: render a report without a model call (closure-scoped
     * renderer, same pattern as the interview page). */
    "window.__flToolsRender=function(r,checks){renderReport(r,checks);show('r-card');};" +
    "})();</script>";

  const extraCss = `
.ov2{display:grid;grid-template-columns:1.25fr 1fr;gap:14px;align-items:stretch;}
@media(max-width:760px){.ov2{grid-template-columns:1fr;}}
.radar{width:230px;max-width:100%;display:block;margin:0 auto;}
.r-compare{margin-top:10px;}
.dmut2{font-size:12.5px;color:#8a97a1;}
.cmp{display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.cmp-d{font-size:19px;font-weight:800;font-variant-numeric:tabular-nums;}
.cmp-t{font-size:12.5px;font-weight:600;color:#25394B;}
.cmp-spark{width:120px;height:30px;flex:none;}
.cmp-n{font-size:11px;font-weight:700;color:#8a97a1;}
.xyz{display:flex;gap:10px;align-items:stretch;flex-wrap:wrap;margin:14px 0;}
.xyz-seg{flex:1;min-width:150px;border-radius:12px;padding:12px 14px;color:#fff;}
.xyz-seg.x{background:#D9452B;}
.xyz-seg.y{background:#ED9249;}
.xyz-seg.z{background:#13507F;}
.xyz-seg b{display:block;font-size:13.5px;}
.xyz-seg span{display:block;font-size:11px;font-weight:700;opacity:.85;margin-top:2px;}
.xyz-seg i{display:block;font-size:11.5px;font-style:italic;margin-top:7px;opacity:.95;line-height:1.4;}
.xyz-arrow{align-self:center;font-size:18px;font-weight:800;color:#8a97a1;}
@media(max-width:640px){.xyz-arrow{display:none;}}
.starrow{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:9px;margin-top:6px;}
.star-chip{border:1.5px solid var(--line,#E3DDDA);border-radius:11px;padding:10px 12px;font-size:12.5px;font-weight:600;}
.star-chip b{color:var(--orange,#D9452B);font-size:15px;}
.star-chip i{display:block;font-style:normal;font-size:11px;color:#8a97a1;margin-top:2px;}
.method-list li{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;line-height:1.55;padding:6px 0;list-style:none;}
.method-list li i{flex:none;width:22px;height:22px;border-radius:50%;background:var(--off,#ECE7E6);color:var(--navy,#05253C);
  font-style:normal;font-weight:800;font-size:11.5px;display:inline-flex;align-items:center;justify-content:center;margin-top:1px;}
.rtabs{display:flex;gap:8px;flex-wrap:wrap;margin:2px 0 16px;}
.rtab{border:1.5px solid var(--line,#E3DDDA);background:#fff;border-radius:999px;padding:9px 16px;
  font-family:inherit;font-size:13px;font-weight:700;color:var(--ink,#25394B);cursor:pointer;}
.rtab.on{background:var(--navy,#05253C);border-color:var(--navy,#05253C);color:#fff;}
.rtab:hover:not(.on){border-color:var(--mango,#ED9249);}
@media print{.rpanel{display:block!important;}
.rpanel[hidden]{display:block!important;}
.fb-slide[hidden]{display:block!important;}}
.qnav{display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;}
.secarrow{width:38px;height:38px;border-radius:50%;border:1.5px solid var(--line,#E3DDDA);background:#fff;
  font-size:16px;font-weight:800;color:var(--navy,#05253C);cursor:pointer;flex:none;}
.secarrow:disabled{opacity:.35;cursor:default;}
.secarrow:hover:not(:disabled){border-color:var(--orange,#D9452B);color:var(--orange,#D9452B);}
.qchips{display:flex;gap:7px;flex-wrap:wrap;flex:1;}
.qpick{display:inline-flex;align-items:center;gap:7px;border:1.5px solid var(--line,#E3DDDA);background:#fff;
  border-radius:999px;padding:8px 13px;font-family:inherit;font-size:12.5px;font-weight:800;color:var(--ink,#25394B);cursor:pointer;}
.qpick.on{border-color:var(--navy,#05253C);background:var(--navy,#05253C);color:#fff;}
.glance{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:12px;margin-bottom:16px;}
.gl{background:#fff;border:1.5px solid var(--line,#E3DDDA);border-radius:14px;padding:15px;text-align:left;
  font-family:inherit;cursor:pointer;transition:box-shadow .2s,border-color .2s;}
.gl:hover{border-color:var(--mango,#ED9249);box-shadow:0 4px 12px rgba(5,37,60,.08);}
.gl b{display:block;font-size:21px;font-weight:800;}
.gl span{display:block;font-size:12px;font-weight:600;color:var(--ink,#25394B);margin-top:3px;}
.gl i{display:block;font-style:normal;font-size:11px;font-weight:700;color:#8a97a1;margin-top:6px;}
.kwgauge-wrap{display:flex;gap:22px;align-items:center;flex-wrap:wrap;margin-bottom:14px;}
.kwg{width:340px;max-width:100%;flex:none;}
.ck-seg{display:flex;gap:3px;border-radius:999px;overflow:hidden;margin-bottom:12px;min-height:26px;}
.ck-seg-i{color:#fff;font-size:11.5px;font-weight:800;display:flex;align-items:center;justify-content:center;
  padding:5px 8px;white-space:nowrap;min-width:52px;}
#r-ckpass{margin-bottom:14px;}
.dim-word{font-style:normal;color:#fff;border-radius:999px;padding:2px 9px;font-size:10.5px;font-weight:800;
  margin-left:7px;vertical-align:2px;}
.dim-ev{font-size:12px;color:#68788A;font-style:italic;border-left:3px solid var(--off,#ECE7E6);
  padding-left:10px;margin-top:6px;line-height:1.5;}
.fix-ex{margin-top:8px;background:#F1F8F3;border:1px solid #CBE3D4;border-radius:9px;padding:9px 12px;
  font-size:13px;line-height:1.55;}
.fix-ex b{color:#1B7A4B;margin-right:4px;}
.journeynext{display:flex;align-items:center;gap:16px;text-decoration:none;color:var(--navy);
  border-left:4px solid var(--orange);transition:box-shadow .2s;}
.journeynext:hover{box-shadow:0 4px 14px rgba(5,37,60,.12);}
.journeynext>div{flex:1;}
.journeynext b{font-size:15px;}
.jn-btn{flex:none;background:var(--orange);color:#fff;border-radius:11px;padding:10px 18px;font-weight:800;font-size:14px;}
.clsteps{display:flex;align-items:center;gap:10px;margin-bottom:16px;flex-wrap:wrap;}
.clstep{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;color:#8a97a1;
  background:#fff;border:1.5px solid var(--line,#E3DDDA);border-radius:999px;padding:7px 14px;}
.clstep i{width:20px;height:20px;border-radius:50%;background:var(--off);color:#8a97a1;font-style:normal;
  display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;}
.clstep.on{color:var(--navy);border-color:var(--mango);}
.clstep.on i{background:linear-gradient(135deg,var(--mango),var(--orange));color:#fff;}
.clstep.done{color:var(--navy);}
.clstep.done i{background:#1B7A4B;color:#fff;}
.clsep{flex:none;width:22px;border-top:2px dashed #C9C1BD;}
.hero-note{font-size:12.5px;color:#8a97a1;align-self:center;}
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
.nextstep{background:#fff;border-left:4px solid var(--orange);color:var(--navy);}
.nextstep .ns-label{font-size:11.5px;font-weight:800;letter-spacing:.1em;color:var(--orange);margin-bottom:6px;}
.nextstep div:last-child{font-size:15.5px;line-height:1.6;font-weight:500;}
`;
  return appShell({
    title: "Fledglings — CV Review",
    active: "cv",
    bodyHtml: body,
    extraCss,
  });
}

/* ------------------------------------------------------------------
 * /ai-privacy — how the AI works, its guardrails, and what is (and
 * is never) stored. Linked from the sidebar; the honesty page most
 * competitors don't have.
 * ------------------------------------------------------------------ */
export function renderAiPrivacyPage(): string {
  const body =
    "<main class='wrap' style='max-width:820px'>" +
    "<h2 class='page'>AI &amp; your privacy</h2>" +
    "<p class='sub'>Straight answers about what the AI in these tools does, the rules it works under, " +
    "and what happens to your stuff. Written for you, not for lawyers.</p>" +
    "<div class='card'><h3>What is stored — and what never is</h3><div class='result'>" +
    "<p><b>Stored:</b> your scores (whole numbers) and when you earned them, kept for six months against " +
    "the email you choose to save, so your progress follows you. That's the entire record.</p>" +
    "<p><b>Never stored:</b> your CV, your LinkedIn profile, your cover letters, your interview answers, " +
    "your video or your voice. PDFs are read inside your own browser. Interview recordings never leave " +
    "your device — the AI only ever sees the words, and forgets them once your feedback is written.</p></div></div>" +
    "<div class='card'><h3>How your progress stays yours</h3><div class='result'>" +
    "<p>When you link your email, this browser is given a signed pass — a bit like a cloakroom ticket. " +
    "It's tied to this browser, it runs out after 30 days, and every time your scores are saved or shown " +
    "the pass is checked. Typing someone else's email somewhere gets nobody anywhere: without a pass " +
    "issued by us, there's no way in.</p>" +
    "<p>Linking a second device? Open the tools once from inside your Fledglings course and that device " +
    "gets its own pass automatically. If an email is already in use, a random browser can't take it over.</p>" +
    "<p>There's still no password, because there's nothing sensitive behind it — the whole record is " +
    "scores and dates. Tap <b>Not you?</b> on any tool to hand the device back.</p></div></div>" +
    "<div class='card'><h3>The no-fabrication law</h3><div class='result'>" +
    "<p>These tools never invent experience, qualifications or numbers for you. Praise must quote your own " +
    "words back to you; anything a document needs that only you can supply appears in [brackets] for you to " +
    "fill in. Employers can tell when a tool wrote someone's story — and you deserve to be hired as yourself.</p></div></div>" +
    "<div class='card'><h3>Honest scoring</h3><div class='result'>" +
    "<p>Scores are calibrated for someone starting out — not inflated to flatter you, not harsh to shock you. " +
    "Delivery metrics (speaking pace, filler words, camera framing) are measured on your device, and anything " +
    "that can't genuinely be measured says <i>not measured</i> instead of pretending.</p></div></div>" +
    "<div class='card'><h3>If something worries us</h3><div class='result'>" +
    "<p>If anything you write or say suggests you're not okay, the tools stop scoring and point you to real " +
    "people who can help: your tutor, Childline (0800 1111, under 19), Samaritans (116 123, any age, any time), " +
    "or text SHOUT to 85258. That routing works even when the AI itself is down.</p></div></div>" +
    "<div class='card'><h3>Limits that keep it fair</h3><div class='result'>" +
    "<p>5 document reviews, 3 mock interviews and 3 cover letter drafts a day — enough to genuinely improve, " +
    "not enough to outsource your judgement. The instant CV checks in the Resume Builder are unlimited for " +
    "practical purposes because no AI is involved.</p></div></div>" +
    "</main>";
  return appShell({
    title: "Fledglings — AI & Privacy",
    active: "privacy",
    bodyHtml: body,
  });
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
