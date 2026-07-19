/* Fledglings school-wide AI coach — Hono router.
 *
 * Endpoints:
 *   GET  /            — service info
 *   GET  /health      — liveness probe (the widget checks this before
 *                       showing itself; unreachable worker = no widget,
 *                       never a broken one)
 *   GET  /widget.js   — the floating chat widget, served from this
 *                       worker so LearnWorlds only needs a two-line
 *                       custom-code snippet
 *   POST /api/coach   — the layered coach pipeline (below)
 *
 * Pipeline for every coach message, in order:
 *   0. Origin allowlist + body-size cap + strict validation
 *   1. Kill switch (COACH_DISABLED)
 *   2. Rate limits (hashed ids in KV; nothing else is stored)
 *   3. Deterministic crisis heuristic — authored signposting reply,
 *      NO model call; works even in a total model outage
 *   4. Haiku moderation classifier (ALLOW / BLOCK / CRISIS);
 *      classifier failure => authored fallback WITH signposts,
 *      never an unscreened coach reply
 *   5. Sonnet coach reply, then guardReply() output gate
 *
 * Privacy by design: this worker stores NOTHING a learner writes.
 * Conversation history lives in the learner's browser (sessionStorage)
 * and is sent with each request. KV holds only hashed rate-limit
 * counters. Logs carry outcome kinds and latency, never message text. */

import { Hono } from "hono";
import { cors } from "hono/cors";

import { isOriginAllowed } from "./lib/origin";
import { checkAndIncrement, hashLearnerId, limits } from "./lib/rate-limit";
import { crisisHeuristic, guardReply } from "./lib/safety";
import {
  CAPS,
  EMAIL_PATTERN,
  ID_PATTERN,
  validateCoachRequest,
} from "./lib/validate";
import { allPathwayTitles, computePathway, validAnswers } from "./lib/pathway";
import { courseIdFor } from "./lib/course-map";
import {
  enrolUserInCourse,
  findUserByEmail,
  getUserByEmail,
  getUserCourses,
  listCourses,
  listUsersPage,
  lwConfigured,
  type LwUser,
  type LwUserCourse,
} from "./lib/learnworlds";
import {
  REVIEW_CAPS,
  reviewSystemPrompt,
  reviewUserMessage,
  validateReviewRequest,
} from "./lib/review";
import { buildPassport, isPassportData, passportAgeDays } from "./lib/passport";
import { aggregate, csvExport, narrativeSystemPrompt } from "./lib/portal";
import { b64urlDecode, b64urlEncode, signPayload, verifyPayload } from "./lib/sign";
import { generate } from "./lib/anthropic";
import {
  BLOCKED_REPLY,
  BUSY_REPLY,
  CRISIS_REPLY,
  FALLBACK_REPLY,
  LIMIT_REPLY,
  UNAVAILABLE_REPLY,
  cleanApiKey,
  coach,
  moderate,
} from "./lib/anthropic";
import { classifyModelError } from "./lib/model-error";
import widgetSource from "./widget/coach-widget.js.txt";

export interface Env {
  RATE_LIMITS: KVNamespace;
  ANTHROPIC_API_KEY: string;
  COACH_DISABLED: string;
  WORKER_VERSION: string;
  COACH_MODEL: string;
  MODERATION_MODEL: string;
  /* LearnWorlds Admin API (optional — pathway enrolment degrades to
   * links-only recommendations when unset). */
  LEARNWORLDS_CLIENT_ID?: string;
  LEARNWORLDS_CLIENT_SECRET?: string;
  LEARNWORLDS_SCHOOL_URL?: string;
}

/* Max learner-confirmed enrolments per learner per UTC day — a hard
 * cost/abuse cap on the one write path this worker has. */
const ENROLS_PER_DAY = 6;

/* Map a model failure to the learner-facing reply + a loud log line.
 * Billing and auth failures mean the coach is DOWN until the founder
 * acts — the log line is the alarm bell (visible in wrangler tail and
 * Cloudflare observability). */
function modelFailure(where: string, err: unknown) {
  const kind = classifyModelError(err);
  const detail = err as { status?: number; message?: string };
  if (kind === "billing") {
    console.error(
      `[coach] SERVICE DOWN - ANTHROPIC CREDITS EXHAUSTED (${where}): top up at console.anthropic.com`,
      detail.status ?? "",
      detail.message ?? "",
    );
    return { reply: UNAVAILABLE_REPLY, kind: "unavailable" };
  }
  if (kind === "auth") {
    console.error(
      `[coach] SERVICE DOWN - API KEY REJECTED (${where}): check/rotate ANTHROPIC_API_KEY`,
      detail.status ?? "",
      detail.message ?? "",
    );
    return { reply: UNAVAILABLE_REPLY, kind: "unavailable" };
  }
  if (kind === "busy") {
    console.error(`[coach] upstream busy (${where}):`, detail.status ?? "", detail.message ?? "");
    return { reply: BUSY_REPLY, kind: "busy" };
  }
  console.error(`[coach] ${where} failed:`, detail.status ?? "", detail.message ?? String(err));
  return { reply: FALLBACK_REPLY, kind: "fallback" };
}

const app = new Hono<{ Bindings: Env }>();

app.use(
  "*",
  cors({
    origin: (origin) => (origin && isOriginAllowed(origin) ? origin : null),
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type"],
    maxAge: 600,
    credentials: false,
  }),
);

/* Origin allowlist on the API — runs after CORS so preflights still
 * get a CORS response. */
app.use("/api/*", async (c, next) => {
  const origin = c.req.header("Origin") || c.req.header("Referer") || "";
  if (!origin || !isOriginAllowed(origin)) {
    return c.json({ error: "origin_forbidden" }, 403);
  }
  return next();
});

app.get("/", (c) =>
  c.json({
    service: "fledglings-coach",
    status: "ok",
    docs: "POST /api/coach; widget at GET /widget.js",
  }),
);

app.get("/health", (c) => {
  /* Surfaces missing configuration loudly at deploy time instead of
   * silently serving fallbacks forever. Never exposes secrets. */
  return c.json({
    ok: true,
    version: c.env.WORKER_VERSION || "dev",
    coach_disabled: (c.env.COACH_DISABLED || "false").toLowerCase() === "true",
    api_key_configured: Boolean(c.env.ANTHROPIC_API_KEY),
    /* True only when the stored secret actually contains an sk-ant-…
     * token — catches empty/whitespace/mangled pastes loudly. */
    api_key_looks_valid: cleanApiKey(c.env.ANTHROPIC_API_KEY || "").startsWith(
      "sk-ant-",
    ),
    learnworlds_configured: lwConfigured(c.env),
  });
});

/* Internal QA page — a stand-in Fledglings page hosting the live
 * widget, so design and behaviour can be checked without touching
 * LearnWorlds. Same rate limits and safeguarding as production. */
app.get("/preview", (c) =>
  c.html(
    "<!doctype html><html><head><meta charset='utf-8'>" +
      "<meta name='viewport' content='width=device-width,initial-scale=1'>" +
      "<meta name='robots' content='noindex'><title>Fledge widget preview</title>" +
      "<style>body{font-family:Arial,sans-serif;background:#ECE7E6;margin:0;padding:48px;}" +
      "h1{color:#05253C;}p{color:#13507F;max-width:32em;}</style></head>" +
      "<body><h1>Fledglings page stand-in</h1>" +
      "<p>Internal QA page. The Fledge button should appear bottom-right, " +
      "fully live against the production coach.</p>" +
      "<script>window.FLEDGLINGS_COACH={endpoint:location.origin,learnerName:'Preview Tester'," +
      "learnerEmail:new URLSearchParams(location.search).get('email')||''};</script>" +
      "<script src='/widget.js' defer></script></body></html>",
  ),
);

/* Ops probe: verifies the stored LearnWorlds credentials by listing
 * courses (titles + ids — already public on the school site; no
 * secrets, no learner data). */
app.get("/lw-check", async (c) => {
  if (!lwConfigured(c.env)) {
    return c.json({ configured: false, ok: false });
  }
  try {
    const courses = await listCourses(c.env);
    return c.json({ configured: true, ok: true, count: courses.length, courses });
  } catch (err) {
    return c.json({
      configured: true,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
});

app.get("/widget.js", (c) =>
  c.body(widgetSource, 200, {
    "Content-Type": "application/javascript; charset=utf-8",
    /* Short cache so widget fixes roll out quickly without a
     * LearnWorlds snippet change. */
    "Cache-Control": "public, max-age=300",
    "X-Content-Type-Options": "nosniff",
  }),
);

app.post("/api/coach", async (c) => {
  const startedAt = Date.now();

  /* -- 0. Parse + validate ------------------------------------------ */
  const contentLength = Number(c.req.header("Content-Length") || "0");
  if (contentLength > CAPS.maxBodyBytes) {
    return c.json({ error: "body_too_large" }, 413);
  }

  let parsedBody: unknown;
  try {
    const raw = await c.req.text();
    if (raw.length > CAPS.maxBodyBytes) {
      return c.json({ error: "body_too_large" }, 413);
    }
    parsedBody = JSON.parse(raw);
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const validated = validateCoachRequest(parsedBody);
  if (!validated.ok) {
    return c.json({ error: "invalid_request", detail: validated.error }, 400);
  }
  const req = validated.request;
  const latest = req.history[req.history.length - 1].content;

  const done = (kind: string, payload: Record<string, unknown>) => {
    console.log(
      `[coach] kind=${kind} ms=${Date.now() - startedAt} turns=${req.history.length}`,
    );
    return c.json(payload);
  };

  /* -- 1. Kill switch ------------------------------------------------ */
  if ((c.env.COACH_DISABLED || "false").toLowerCase() === "true") {
    return done("disabled", { reply: FALLBACK_REPLY, kind: "fallback" });
  }

  /* -- 2. Rate limits (before any model call) ------------------------ */
  const learnerHash = await hashLearnerId(req.learnerId);
  const rate = await checkAndIncrement(
    c.env.RATE_LIMITS,
    learnerHash,
    req.sessionId,
  );
  if (!rate.allowed) {
    return done("limit", {
      reply: LIMIT_REPLY,
      kind: "limit",
      reason: rate.reason,
      limits,
    });
  }

  /* -- 3. Deterministic crisis screen (no model needed) -------------- */
  if (crisisHeuristic(latest)) {
    return done("crisis_heuristic", { reply: CRISIS_REPLY, kind: "crisis" });
  }

  /* -- 4. Model moderation pre-pass ---------------------------------- */
  try {
    const verdict = await moderate(
      c.env.ANTHROPIC_API_KEY,
      c.env.MODERATION_MODEL || "claude-haiku-4-5",
      latest,
    );
    if (verdict === "CRISIS") {
      return done("crisis_model", { reply: CRISIS_REPLY, kind: "crisis" });
    }
    if (verdict === "BLOCK") {
      return done("blocked", { reply: BLOCKED_REPLY, kind: "blocked" });
    }
  } catch (err) {
    return done("moderation_error", modelFailure("moderation", err));
  }

  /* -- 5. Coach reply + output gate ---------------------------------- */
  try {
    const rawReply = await coach(
      c.env.ANTHROPIC_API_KEY,
      c.env.COACH_MODEL || "claude-sonnet-4-6",
      req.history,
      { learnerName: req.learnerName, page: req.page },
    );
    const reply = guardReply(rawReply);
    if (reply === null) {
      console.error("[coach] reply failed output gate");
      return done("reply_gated", { reply: FALLBACK_REPLY, kind: "fallback" });
    }
    return done("coach", {
      reply,
      kind: "coach",
      remaining_day: rate.remainingDay,
    });
  } catch (err) {
    return done("coach_error", modelFailure("coach", err));
  }
});

interface PathwayBody {
  learner_id?: unknown;
  session_id?: unknown;
  stage?: unknown;
  area?: unknown;
  focus?: unknown;
}

/* Recommendations ONLY. This route never writes anything anywhere —
 * enrolment happens solely via POST /api/enrol, one module at a time,
 * after the learner confirms that module by name. */
app.post("/api/pathway", async (c) => {
  let body: PathwayBody;
  try {
    body = await c.req.json<PathwayBody>();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const answers = validAnswers(body);
  if (!answers) return c.json({ error: "invalid_answers" }, 400);

  const recommendations = computePathway(answers);
  console.log(
    `[coach] kind=pathway area=${answers.area} stage=${answers.stage} focus=${answers.focus}`,
  );
  return c.json({
    recommendations,
    /* Widget offers the add-to-dashboard step only when a confirmed
     * enrolment could actually succeed. */
    can_enrol: lwConfigured(c.env),
  });
});

interface EnrolBody {
  learner_id?: unknown;
  session_id?: unknown;
  email?: unknown;
  title?: unknown;
}

/* One module, explicitly confirmed by the learner in the widget.
 * No tagging, no batch writes, allowlisted titles only. */
app.post("/api/enrol", async (c) => {
  let body: EnrolBody;
  try {
    body = await c.req.json<EnrolBody>();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }

  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const title = typeof body.title === "string" ? body.title : "";

  /* The title must be one the pathway engine can actually emit. */
  if (!allPathwayTitles().includes(title)) {
    return c.json({ error: "unknown_title" }, 400);
  }

  const respond = (ok: boolean, reason?: string) => {
    console.log(`[coach] kind=enrol ok=${String(ok)} outcome=${reason ?? "enrolled"}`);
    return c.json({ ok, title, reason });
  };

  if (!lwConfigured(c.env)) return respond(false, "not_configured");
  if (!EMAIL_PATTERN.test(email)) return respond(false, "no_email");

  const courseId = courseIdFor(title);
  if (!courseId) return respond(false, "not_mapped");

  const learnerHash = await hashLearnerId(learnerId);
  const capKey = `enrol:day:${learnerHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await c.env.RATE_LIMITS.get(capKey)) || "0", 10) || 0;
  if (used >= ENROLS_PER_DAY) return respond(false, "daily_cap");

  try {
    const userId = await findUserByEmail(c.env, email);
    if (!userId) return respond(false, "account_not_found");

    const result = await enrolUserInCourse(
      c.env,
      userId,
      courseId,
      "Learner-confirmed via Fledge pathway finder",
    );
    if (!result.ok) {
      console.error(`[coach] enrol failed: HTTP ${result.status} for course ${courseId}`);
      return respond(false, "enrol_failed");
    }
    await c.env.RATE_LIMITS.put(capKey, String(used + 1), { expirationTtl: 86_400 });
    return respond(true);
  } catch (err) {
    console.error("[coach] enrol error:", String(err));
    return respond(false, "service_error");
  }
});

/* ==================================================================
 * #3 — AI employability tools (ATS CV review, LinkedIn review)
 * ================================================================== */

const REVIEW_MAX_TOKENS = 700;

app.post("/api/review", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const validated = validateReviewRequest(body);
  if ("error" in validated) {
    return c.json({ error: "invalid_review", detail: validated.error }, 400);
  }

  if ((c.env.COACH_DISABLED || "false").toLowerCase() === "true") {
    return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
  }

  /* Safeguarding first: a CV or profile can carry a disclosure. */
  if (crisisHeuristic(validated.text) || crisisHeuristic(validated.target)) {
    console.log("[coach] kind=review outcome=crisis");
    return c.json({ reply: CRISIS_REPLY, kind: "crisis" });
  }

  /* Own daily budget — reviews are heavier than chat turns. */
  const learnerHash = await hashLearnerId(learnerId);
  const capKey = `rv:day:${learnerHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await c.env.RATE_LIMITS.get(capKey)) || "0", 10) || 0;
  if (used >= REVIEW_CAPS.perDay) {
    return c.json({
      reply:
        "You've used today's reviews — nicely thorough! They top back up tomorrow. " +
        "Work the feedback you've already got in the meantime.",
      kind: "limit",
    });
  }

  try {
    const raw = await generate(
      c.env.ANTHROPIC_API_KEY,
      c.env.COACH_MODEL || "claude-sonnet-4-6",
      reviewSystemPrompt(validated.kind),
      reviewUserMessage(validated),
      REVIEW_MAX_TOKENS,
    );
    const reply = guardReply(raw.slice(0, 4000)) ?? null;
    if (reply === null) {
      console.error("[coach] review reply failed output gate");
      return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
    }
    await c.env.RATE_LIMITS.put(capKey, String(used + 1), { expirationTtl: 86_400 });
    console.log(`[coach] kind=review tool=${validated.kind} outcome=ok`);
    return c.json({ reply, kind: "review" });
  } catch (err) {
    return c.json(modelFailure("review", err));
  }
});

/* Shared page chrome for the standalone tool/passport pages. */
const PAGE_HEAD =
  "<meta charset='utf-8'><meta name='viewport' content='width=device-width,initial-scale=1'>" +
  "<meta name='robots' content='noindex'>" +
  "<link rel='preconnect' href='https://fonts.googleapis.com'>" +
  "<link href='https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap' rel='stylesheet'>" +
  "<style>:root{--navy:#05253C;--orange:#D9452B;--mango:#ED9249;--blue:#13507F;--off:#ECE7E6;}" +
  "*{box-sizing:border-box;margin:0;padding:0;font-family:'Outfit',Arial,sans-serif;}" +
  "body{background:var(--off);color:var(--navy);padding:24px;}" +
  ".wrap{max-width:760px;margin:0 auto;}" +
  "h1{font-size:24px;margin-bottom:4px;}.sub{color:var(--blue);margin-bottom:20px;font-size:14.5px;}" +
  "textarea,input[type=text]{width:100%;border:2px solid #fff;border-radius:12px;padding:12px;font-size:14.5px;" +
  "font-family:inherit;color:var(--navy);}textarea:focus,input:focus{outline:none;border-color:var(--blue);}" +
  "label{display:block;font-weight:600;font-size:14px;margin:14px 0 6px;}" +
  "button{background:var(--orange);color:#fff;border:none;border-radius:12px;padding:13px 22px;font-size:15px;" +
  "font-weight:600;cursor:pointer;margin-top:16px;min-height:46px;}button:disabled{opacity:.5;}" +
  ".card{background:#fff;border-radius:16px;padding:20px;margin-top:20px;box-shadow:0 2px 8px rgba(5,37,60,.08);" +
  "line-height:1.65;font-size:14.5px;white-space:pre-wrap;}" +
  ".tabs{display:flex;gap:8px;margin-bottom:18px;}" +
  ".tab{border:1.5px solid var(--mango);background:#fff;color:var(--navy);border-radius:999px;padding:9px 16px;" +
  "font-weight:600;font-size:13.5px;cursor:pointer;margin-top:0;}" +
  ".tab.on{background:var(--navy);border-color:var(--navy);color:#fff;}" +
  "@media print{button,.tabs,form{display:none!important;}body{background:#fff;}}</style>";

const FRAME_HEADERS = {
  "Content-Security-Policy":
    "frame-ancestors 'self' https://*.fledglings.co https://fledglings.co " +
    "https://*.learnworlds.com https://*.mycourse.app https://*.fledglings-school.co.uk",
};

app.get("/tools", (c) =>
  c.html(
    `<!doctype html><html><head>${PAGE_HEAD}<title>Fledglings — CV & LinkedIn review</title></head><body><div class='wrap'>` +
      "<h1>CV & LinkedIn review</h1>" +
      "<p class='sub'>Honest feedback from Fledge — grounded in what you've genuinely done. Nothing invented, ever.</p>" +
      "<div class='tabs'><button type='button' class='tab on' id='tab-cv'>CV review</button>" +
      "<button type='button' class='tab' id='tab-li'>LinkedIn review</button></div>" +
      "<form id='f'>" +
      "<label id='text-label' for='text'>Paste your CV text</label>" +
      "<textarea id='text' rows='12' maxlength='9000' required></textarea>" +
      "<label for='target'>Target role or job advert (optional, recommended)</label>" +
      "<textarea id='target' rows='4' maxlength='2500'></textarea>" +
      "<button id='go' type='submit'>Review it</button></form>" +
      "<div class='card' id='out' hidden></div>" +
      "<script>(function(){var kind='cv';" +
      "function stored(st,k){try{var v=st.getItem(k);if(!v){v=Math.random().toString(16).slice(2)+Date.now().toString(16);st.setItem(k,v)}return v}catch(e){return 'anon'+Date.now()}}" +
      "var lid=stored(localStorage,'fl_coach_learner_v1'),sid=stored(sessionStorage,'fl_coach_session_v1');" +
      "var tabCv=document.getElementById('tab-cv'),tabLi=document.getElementById('tab-li'),lbl=document.getElementById('text-label');" +
      "function setKind(k){kind=k;tabCv.className='tab'+(k==='cv'?' on':'');tabLi.className='tab'+(k==='linkedin'?' on':'');" +
      "lbl.textContent=k==='cv'?'Paste your CV text':'Paste your LinkedIn headline, about section and experience';}" +
      "tabCv.onclick=function(){setKind('cv')};tabLi.onclick=function(){setKind('linkedin')};" +
      "document.getElementById('f').onsubmit=function(e){e.preventDefault();" +
      "var go=document.getElementById('go'),out=document.getElementById('out');" +
      "go.disabled=true;go.textContent='Fledge is reading\\u2026';out.hidden=true;" +
      "fetch('/api/review',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({" +
      "learner_id:lid,session_id:sid,kind:kind,text:document.getElementById('text').value,target:document.getElementById('target').value})})" +
      ".then(function(r){return r.json()}).then(function(d){go.disabled=false;go.textContent='Review it';" +
      "out.hidden=false;out.innerHTML='';var t=(d.reply||d.error||'Something went wrong \\u2014 try again.');" +
      "var parts=String(t).split(/\\*\\*(.+?)\\*\\*/g);for(var i=0;i<parts.length;i++){if(!parts[i])continue;" +
      "if(i%2===1){var b=document.createElement('strong');b.textContent=parts[i];out.appendChild(b);}else{out.appendChild(document.createTextNode(parts[i]));}}})" +
      ".catch(function(){go.disabled=false;go.textContent='Review it';out.hidden=false;out.textContent='Could not reach the reviewer \\u2014 try again in a minute.';});};" +
      "})();</script></div></body></html>",
    200,
    FRAME_HEADERS,
  ),
);

/* ==================================================================
 * #4 — Readiness Passport
 * ================================================================== */

const PASSPORTS_PER_DAY = 3;

app.post("/api/passport", async (c) => {
  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "invalid_json" }, 400);
  }
  const learnerId = typeof body.learner_id === "string" ? body.learner_id : "";
  const sessionId = typeof body.session_id === "string" ? body.session_id : "";
  if (!ID_PATTERN.test(learnerId) || !ID_PATTERN.test(sessionId)) {
    return c.json({ error: "invalid_request" }, 400);
  }
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

  if (!lwConfigured(c.env)) return c.json({ ok: false, reason: "not_configured" });
  if (!EMAIL_PATTERN.test(email)) return c.json({ ok: false, reason: "no_email" });

  const learnerHash = await hashLearnerId(learnerId);
  const capKey = `pp:day:${learnerHash}:${new Date().toISOString().slice(0, 10)}`;
  const used = parseInt((await c.env.RATE_LIMITS.get(capKey)) || "0", 10) || 0;
  if (used >= PASSPORTS_PER_DAY) return c.json({ ok: false, reason: "daily_cap" });

  try {
    const user = await getUserByEmail(c.env, email);
    if (!user) return c.json({ ok: false, reason: "account_not_found" });
    const courses = await getUserCourses(c.env, user.id);
    const data = buildPassport(user, courses, new Date());
    const payload = b64urlEncode(JSON.stringify(data));
    const sig = await signPayload(c.env.LEARNWORLDS_CLIENT_SECRET || "", payload);
    await c.env.RATE_LIMITS.put(capKey, String(used + 1), { expirationTtl: 86_400 });
    console.log(`[coach] kind=passport outcome=ok completed=${data.completed.length}`);
    return c.json({
      ok: true,
      url: `/passport?d=${payload}&s=${sig}`,
      completed: data.completed.length,
      in_progress: data.inProgress.length,
    });
  } catch (err) {
    console.error("[coach] passport error:", String(err));
    return c.json({ ok: false, reason: "service_error" });
  }
});

app.get("/passport", async (c) => {
  const d = c.req.query("d") || "";
  const s = c.req.query("s") || "";
  const decoded = b64urlDecode(d);
  const valid =
    decoded !== null &&
    (await verifyPayload(c.env.LEARNWORLDS_CLIENT_SECRET || "", d, s));
  let data: unknown = null;
  try {
    data = valid && decoded ? JSON.parse(decoded) : null;
  } catch {
    data = null;
  }
  if (!isPassportData(data) || passportAgeDays(data, new Date()) > 7) {
    return c.html(
      `<!doctype html><html><head>${PAGE_HEAD}<title>Passport link expired</title></head><body><div class='wrap'>` +
        "<h1>This passport link has expired</h1><p class='sub'>Ask Fledge for a fresh one — open the coach and tap “My passport”.</p></div></body></html>",
      200,
      FRAME_HEADERS,
    );
  }
  const esc = (t: string) =>
    t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const completedRows = data.completed.map((t) => `<li>✅ ${esc(t)}</li>`).join("");
  const progressRows = data.inProgress
    .map(
      (m) =>
        `<li>⏳ ${esc(m.title)}${m.pct !== null ? ` <span style='color:var(--blue)'>(${m.pct}%)</span>` : ""}</li>`,
    )
    .join("");
  return c.html(
    `<!doctype html><html><head>${PAGE_HEAD}<title>Fledglings Readiness Passport</title></head><body><div class='wrap'>` +
      "<div class='card' style='border-top:6px solid var(--orange);'>" +
      "<h1 style='margin-bottom:2px;'>Readiness Passport</h1>" +
      `<p class='sub'>${esc(data.firstName)} · Fledglings learner${data.sinceYear ? ` since ${esc(data.sinceYear)}` : ""} · issued ${esc(data.issuedAt)}</p>` +
      `<p style='margin-bottom:14px;'><strong>${data.completed.length}</strong> module${data.completed.length === 1 ? "" : "s"} completed · ` +
      `<strong>${data.inProgress.length}</strong> in progress · <strong>${data.totalEnrolled}</strong> enrolled</p>` +
      (completedRows
        ? `<p style='font-weight:600;margin-bottom:6px;'>Completed</p><ul style='list-style:none;line-height:1.9;margin-bottom:14px;'>${completedRows}</ul>`
        : "") +
      (progressRows
        ? `<p style='font-weight:600;margin-bottom:6px;'>In progress</p><ul style='list-style:none;line-height:1.9;'>${progressRows}</ul>`
        : "") +
      "<p class='sub' style='margin-top:18px;'>This passport records modules practised and completed on the Fledglings life-skills platform (fledglings.co). It describes learning activity, not an assessment of the person.</p>" +
      "<button onclick='window.print()'>Print / save as PDF</button></div></div></body></html>",
    200,
    FRAME_HEADERS,
  );
});

/* ==================================================================
 * #5 — Provider evidence portal (access-code gated)
 * ================================================================== */

const PORTAL_SAMPLE_SIZE = 30;
const PORTAL_CACHE_TTL = 6 * 3600;
const PORTAL_COOKIE = "fl_portal";

async function portalCodeLabel(c: { env: Env }, code: string): Promise<string | null> {
  if (!/^[A-Za-z0-9-]{8,40}$/.test(code)) return null;
  const raw = await c.env.RATE_LIMITS.get(`portal:code:${code}`);
  if (!raw) return null;
  try {
    return (JSON.parse(raw) as { label?: string }).label ?? "Provider";
  } catch {
    return "Provider";
  }
}

async function portalSession(c: {
  env: Env;
  req: { header: (n: string) => string | undefined };
}): Promise<string | null> {
  const cookies = c.req.header("Cookie") || "";
  const match = cookies.match(new RegExp(`${PORTAL_COOKIE}=([^;]+)`));
  if (!match) return null;
  const [code, sig] = match[1].split(".");
  if (!code || !sig) return null;
  const okSig = await verifyPayload(
    c.env.LEARNWORLDS_CLIENT_SECRET || "",
    `portal:${code}`,
    sig,
  );
  if (!okSig) return null;
  return portalCodeLabel(c, code);
}

async function portalSample(env: Env): Promise<{
  totalUsers: number | null;
  sample: Array<{ user: LwUser; courses: LwUserCourse[] }>;
}> {
  const page = await listUsersPage(env, 1);
  const learners = page.users.filter((u) => u.email).slice(0, PORTAL_SAMPLE_SIZE);
  const sample: Array<{ user: LwUser; courses: LwUserCourse[] }> = [];
  for (const user of learners) {
    try {
      sample.push({ user, courses: await getUserCourses(env, user.id) });
    } catch {
      /* One failed learner never sinks the report. */
    }
  }
  return { totalUsers: page.totalItems, sample };
}

app.get("/portal", async (c) => {
  const label = await portalSession(c);
  if (!label) {
    return c.html(
      `<!doctype html><html><head>${PAGE_HEAD}<title>Fledglings — provider portal</title></head><body><div class='wrap'>` +
        "<h1>Provider evidence portal</h1><p class='sub'>Enter your access code. Codes are issued by Fledglings.</p>" +
        "<form method='POST' action='/portal/login'><label for='code'>Access code</label>" +
        "<input type='text' id='code' name='code' autocomplete='off' required>" +
        "<button type='submit'>Open portal</button></form></div></body></html>",
    );
  }
  return c.html(
    `<!doctype html><html><head>${PAGE_HEAD}<title>Fledglings — evidence dashboard</title></head><body><div class='wrap'>` +
      `<h1>Evidence dashboard</h1><p class='sub'>${label} · aggregate view · figures from a recent sample of learner accounts</p>` +
      "<div class='card' id='kpis'>Loading live figures…</div>" +
      "<div class='card' id='narrative' hidden></div>" +
      "<div class='card' id='table' hidden></div>" +
      "<button onclick='window.print()'>Print / save as PDF</button> " +
      "<button onclick=\"location.href='/portal/export.csv'\" style='background:var(--blue);'>Download learner CSV</button>" +
      "<script>fetch('/portal/data').then(function(r){return r.json()}).then(function(d){" +
      "if(d.error){document.getElementById('kpis').textContent='Could not load data: '+d.error;return;}" +
      "var s=d.stats;document.getElementById('kpis').innerHTML='<strong>'+ (s.totalUsers!==null?s.totalUsers:'—') +'</strong> registered learners · sample of <strong>'+s.sampleSize+'</strong>: <strong>'+s.activeInSample+'</strong> active · avg <strong>'+s.avgModulesPerLearner+'</strong> modules each';" +
      "var n=document.getElementById('narrative');n.hidden=false;n.textContent=d.narrative||'';" +
      "var t=document.getElementById('table');t.hidden=false;var html='<p style=\\'font-weight:600;margin-bottom:8px;\\'>Module engagement (sample)</p><table style=\\'width:100%;border-collapse:collapse;font-size:13.5px;\\'><tr><th style=\\'text-align:left;padding:6px 4px;border-bottom:2px solid var(--off);\\'>Module</th><th style=\\'padding:6px 4px;border-bottom:2px solid var(--off);\\'>Enrolled</th><th style=\\'padding:6px 4px;border-bottom:2px solid var(--off);\\'>Completed</th><th style=\\'padding:6px 4px;border-bottom:2px solid var(--off);\\'>Rate</th></tr>';" +
      "for(var i=0;i<s.courseStats.length;i++){var r=s.courseStats[i];html+='<tr><td style=\\'padding:6px 4px;border-bottom:1px solid var(--off);\\'>'+r.title.replace(/</g,'&lt;')+'</td><td style=\\'text-align:center;\\'>'+r.enrolled+'</td><td style=\\'text-align:center;\\'>'+r.completed+'</td><td style=\\'text-align:center;\\'>'+r.completionRate+'%</td></tr>';}" +
      "t.innerHTML=html+'</table>';}).catch(function(){document.getElementById('kpis').textContent='Could not load data.';});</script>" +
      "</div></body></html>",
  );
});

app.post("/portal/login", async (c) => {
  const form = await c.req.parseBody();
  const code = typeof form.code === "string" ? form.code.trim() : "";
  const label = await portalCodeLabel(c, code);
  if (!label) {
    return c.html(
      `<!doctype html><html><head>${PAGE_HEAD}<title>Fledglings — provider portal</title></head><body><div class='wrap'>` +
        "<h1>That code didn't work</h1><p class='sub'>Check it and <a href='/portal'>try again</a>, or contact Fledglings for access.</p></div></body></html>",
      401,
    );
  }
  const sig = await signPayload(c.env.LEARNWORLDS_CLIENT_SECRET || "", `portal:${code}`);
  c.header(
    "Set-Cookie",
    `${PORTAL_COOKIE}=${code}.${sig}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=28800`,
  );
  return c.redirect("/portal");
});

app.get("/portal/data", async (c) => {
  const label = await portalSession(c);
  if (!label) return c.json({ error: "unauthorised" }, 401);
  if (!lwConfigured(c.env)) return c.json({ error: "learnworlds_not_configured" });

  const cached = await c.env.RATE_LIMITS.get("portal:data:v1");
  if (cached) return c.json(JSON.parse(cached));

  try {
    const { totalUsers, sample } = await portalSample(c.env);
    const stats = aggregate(totalUsers, sample, new Date());
    let narrative = "";
    try {
      narrative = await generate(
        c.env.ANTHROPIC_API_KEY,
        c.env.COACH_MODEL || "claude-sonnet-4-6",
        narrativeSystemPrompt(),
        JSON.stringify(stats),
        400,
      );
    } catch (err) {
      console.error("[coach] portal narrative failed:", String(err));
      narrative =
        "Narrative unavailable just now — the figures above are live from the platform.";
    }
    const payload = { stats, narrative };
    await c.env.RATE_LIMITS.put("portal:data:v1", JSON.stringify(payload), {
      expirationTtl: PORTAL_CACHE_TTL,
    });
    return c.json(payload);
  } catch (err) {
    console.error("[coach] portal data error:", String(err));
    return c.json({ error: "service_error" });
  }
});

app.get("/portal/export.csv", async (c) => {
  const label = await portalSession(c);
  if (!label) return c.json({ error: "unauthorised" }, 401);
  if (!lwConfigured(c.env)) return c.json({ error: "learnworlds_not_configured" });
  try {
    const { sample } = await portalSample(c.env);
    return c.body(csvExport(sample), 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=fledglings-learners.csv",
    });
  } catch (err) {
    console.error("[coach] portal csv error:", String(err));
    return c.json({ error: "service_error" });
  }
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

app.onError((err, c) => {
  console.error("[coach] unhandled error:", err);
  /* Learner-facing never-break promise: the API path degrades to the
   * authored fallback rather than a bare 500. */
  if (c.req.path.startsWith("/api/")) {
    return c.json({ reply: FALLBACK_REPLY, kind: "fallback" });
  }
  return c.json({ error: "internal_error" }, 500);
});

export default app;
