/* Personalised instant demo — the landing page every outreach email
 * links to (#8: reply -> live demo, no call needed). /demo?p=<b64url
 * provider name> greets the provider by name and puts the REAL
 * learner-facing product in front of them: the live coach widget on
 * the page itself, the sample Skills Passport embedded, and the CV
 * review tools one click away. No learner data is reachable from
 * here — the portal is described, never shown, because it contains
 * real records. */

import { esc } from "./pages";
import { BIRD_MARK, WORDMARK_DARK } from "./brand";

const DEMO_CSS = `
:root{--navy:#05253C;--navy2:#0A3452;--orange:#D9452B;--mango:#ED9249;--blue:#13507F;--off:#ECE7E6;--ok:#1A7649;--ink:#22333f;--mut:#7d8a93;--hair:#DCD5D2;}
*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}
body{background:#F6F3F1;color:var(--navy);}
.keyline{height:4px;background:linear-gradient(90deg,var(--orange),var(--mango) 55%,var(--orange));}
.hero{background:linear-gradient(150deg,var(--navy) 0%,var(--navy2) 58%,var(--blue) 135%);color:#fff;
  position:relative;overflow:hidden;}
.hero .bird{position:absolute;right:-40px;top:-40px;height:130%;opacity:.06;}
.hero .bird svg{height:100%;width:auto;}
.hero-in{max-width:1040px;margin:0 auto;padding:30px 28px 54px;position:relative;}
.wordmark svg{height:30px;width:auto;display:block;}
.for{display:inline-block;margin-top:34px;font-size:12px;font-weight:700;letter-spacing:.18em;
  text-transform:uppercase;color:var(--mango);border:1px solid rgba(237,146,73,.45);
  background:rgba(237,146,73,.14);border-radius:999px;padding:6px 16px;}
.hero h1{font-size:38px;font-weight:800;line-height:1.15;margin:16px 0 14px;max-width:18em;}
.hero p{color:#9FB8CC;font-size:16px;line-height:1.65;max-width:38em;}
.hero .try{margin-top:22px;font-size:14px;font-weight:600;color:#fff;display:flex;align-items:center;gap:10px;}
.hero .try .dot{width:10px;height:10px;border-radius:50%;background:var(--ok);box-shadow:0 0 0 4px rgba(27,122,75,.3);}
.wrap{max-width:1040px;margin:0 auto;padding:44px 28px 80px;}
.sect{display:flex;align-items:center;gap:14px;margin:44px 0 8px;}
.sect:first-child{margin-top:0;}
.sect .bd{height:16px;display:flex;}
.sect .bd svg{height:16px;width:auto;}
.sect h2{font-size:13px;font-weight:800;letter-spacing:.17em;text-transform:uppercase;}
.sect::after{content:'';flex:1;height:1px;background:var(--hair);}
.lead{font-size:15px;color:var(--ink);line-height:1.7;max-width:46em;margin-bottom:20px;}
.frame{border:1px solid var(--hair);border-radius:20px;overflow:hidden;background:#fff;
  box-shadow:0 24px 60px -30px rgba(5,37,60,.35);}
.frame iframe{width:100%;height:1400px;border:none;display:block;}
.tools{display:grid;grid-template-columns:1fr 1fr;gap:22px;margin-top:20px;}
@media(max-width:760px){.tools{grid-template-columns:1fr;}.hero h1{font-size:29px;}}
.tool{border:1px solid var(--hair);border-radius:18px;background:#fff;padding:26px;}
.tool h3{font-size:17px;font-weight:700;margin-bottom:8px;}
.tool p{font-size:14px;color:var(--ink);line-height:1.65;margin-bottom:16px;}
.tool a{display:inline-block;background:var(--orange);color:#fff;text-decoration:none;font-weight:600;
  font-size:14px;border-radius:10px;padding:11px 20px;}
.tool a:hover{background:#c23a22;}
.tool a.sec{background:var(--blue);}
.plist{list-style:none;margin-top:14px;}
.plist li{display:flex;gap:11px;align-items:flex-start;font-size:14.5px;line-height:1.6;color:var(--ink);
  padding:7px 0;}
.plist i{width:20px;height:20px;border-radius:50%;background:var(--orange);color:#fff;font-style:normal;
  font-weight:800;font-size:11px;display:inline-flex;align-items:center;justify-content:center;flex:none;margin-top:2px;}
.cta{background:linear-gradient(150deg,var(--navy),var(--blue));border-radius:22px;color:#fff;
  padding:36px;margin-top:48px;display:flex;align-items:center;gap:24px;flex-wrap:wrap;position:relative;overflow:hidden;}
.cta .bird{position:absolute;right:-30px;bottom:-50px;height:120%;opacity:.07;}
.cta .bird svg{height:100%;width:auto;}
.cta h3{font-size:23px;font-weight:800;line-height:1.25;}
.cta p{color:#9FB8CC;font-size:14px;margin-top:6px;max-width:34em;}
.cta a{margin-left:auto;background:var(--orange);color:#fff;text-decoration:none;font-weight:700;
  font-size:15px;border-radius:12px;padding:15px 28px;position:relative;}
.cta a:hover{background:#c23a22;}
.foot{border-top:1px solid var(--hair);color:var(--mut);font-size:12.5px;text-align:center;padding:22px;}
.foot b{color:#B93A22;}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important;}}
`;

/** Decode + sanitise the provider name from the p= query param. */
export function demoProviderName(p: string | undefined): string | null {
  if (!p) return null;
  try {
    const b64 = p.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = decodeURIComponent(
      Array.from(atob(b64))
        .map((ch) => "%" + ch.charCodeAt(0).toString(16).padStart(2, "0"))
        .join(""),
    );
    const clean = decoded.replace(/[<>&"'\\\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length < 2 || clean.length > 80) return null;
    return clean;
  } catch {
    return null;
  }
}

export function renderDemoPage(provider: string | null): string {
  const who = provider ?? "your team";
  const heroTitle = provider
    ? `A working demo, built for ${esc(provider)}.`
    : "A working demo of Fledglings.";
  return (
    "<!doctype html><html lang='en-GB'><head><meta charset='utf-8'>" +
    "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
    "<meta name='robots' content='noindex'>" +
    `<title>Fledglings demo — ${esc(who)}</title>` +
    `<meta property='og:title' content='Your Fledglings demo'>` +
    "<meta property='og:description' content='Life-skills modules, an AI coach with real guardrails, and Ofsted-ready personal development evidence — live, right now.'>" +
    "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
    "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap' rel='stylesheet'>" +
    `<style>${DEMO_CSS}</style></head><body>` +
    "<div class='keyline'></div>" +
    /* hero */
    "<header class='hero'>" +
    `<div class='bird'>${BIRD_MARK}</div>` +
    "<div class='hero-in'>" +
    `<span class='wordmark'>${WORDMARK_DARK}</span>` +
    `<span class='for'>Built for ${esc(who)}</span>` +
    `<h1>${heroTitle}</h1>` +
    "<p>This isn't a slide deck — everything below is the live platform your learners would use: " +
    "interactive life-skills modules, an AI coach with serious safeguarding guardrails, and the " +
    "evidence machinery your self-assessment report has been missing.</p>" +
    "<div class='try'><span class='dot'></span>The coach in the corner of this page is live — ask it something.</div>" +
    "</div></header>" +
    "<main class='wrap'>" +
    /* passport demo */
    "<div class='sect'><span class='bd'>" + BIRD_MARK + "</span><h2>What your learners see</h2></div>" +
    "<p class='lead'>Every learner gets a live Skills Passport — score, streak, badges, cohort leaderboard — " +
    "built automatically from their module activity. This one is sample data; scroll it, click the tabs.</p>" +
    "<div class='frame'><iframe src='/skills-passport?demo=1' title='Sample Skills Passport' loading='lazy'></iframe></div>" +
    /* tools */
    "<div class='sect'><span class='bd'>" + BIRD_MARK + "</span><h2>Try the employability tools</h2></div>" +
    "<div class='tools'>" +
    "<div class='tool'><h3>CV &amp; LinkedIn review</h3>" +
    "<p>Learners upload a PDF and get a recruiter-grade scored report — ATS checks, keyword match against a " +
    "real job advert, and honest feedback that never invents experience for them.</p>" +
    "<a href='/tools'>Open the live tool ↗</a></div>" +
    "<div class='tool'><h3>Readiness Passport</h3>" +
    "<p>A shareable, verifiable record of the life-skills modules a learner has completed — the artefact " +
    "they attach to applications, and you attach to reviews.</p>" +
    "<a class='sec' href='/passport/sample'>See a sample ↗</a></div>" +
    "</div>" +
    /* provider side */
    "<div class='sect'><span class='bd'>" + BIRD_MARK + "</span><h2>What your staff see</h2></div>" +
    "<p class='lead'>The provider portal is where Fledglings earns its keep with Ofsted — we don't show it " +
    "here because it holds real learner records, but yours would include:</p>" +
    "<ul class='plist'>" +
    "<li><i>✓</i><b>Live engagement figures</b>&nbsp;— cohort pulse, trend, and who was last seen when, scoped to your learners only.</li>" +
    "<li><i>✓</i><b>Early-warning view</b>&nbsp;— learners going quiet, tiered by urgency, each with a ready-to-send encouraging nudge.</li>" +
    "<li><i>✓</i><b>Pre/post reflection shift</b>&nbsp;— learners' own before-and-after confidence ratings per module: personal development evidence in their own words.</li>" +
    "<li><i>✓</i><b>Safeguarding flags</b>&nbsp;— reflection answers screened for crisis language, surfaced to your safeguarding lead the same day.</li>" +
    "<li><i>✓</i><b>An evidence narrative</b>&nbsp;— drafted for your SAR, honest about what the data can and cannot claim.</li>" +
    "</ul>" +
    /* cta */
    "<div class='cta'>" +
    `<div class='bird'>${BIRD_MARK}</div>` +
    `<div><h3>Fifteen minutes, ${esc(who)}.</h3>` +
    "<p>Reply to the email that brought you here, or drop us a line — we'll set up a portal " +
    "scoped to your cohort so you can see it with your own learners.</p></div>" +
    "<a href='mailto:owais@fledglings.co?subject=Fledglings%20demo'>Talk to Fledglings</a>" +
    "</div>" +
    "</main>" +
    "<div class='foot'>Fledglings · fledglings.co · <b>Where Growth Takes Flight</b></div>" +
    /* the live coach widget, on this very page */
    "<script>window.FLEDGLINGS_COACH={endpoint:location.origin,learnerName:'there'};</script>" +
    "<script src='/widget.js' defer></script>" +
    "</body></html>"
  );
}
