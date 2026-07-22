/* LearnWorlds Admin API client (worker-side).
 *
 * Auth + endpoint shapes mirror the proven fledglings-insight client:
 *   token:  POST {school}/oauth2/access_token   (form-encoded
 *           client_credentials; ~1h expiry)
 *   API:    {school}/admin/api/v2  with  Authorization: Bearer …
 *           and  Lw-Client: <client_id>
 *
 * Scope here is deliberately tiny and write-minimal: find a user by
 * email, add tags, enrol in an allowlisted course. Every call has a
 * hard timeout. The bearer token is cached in KV (never logged). */

export interface LwEnv {
  RATE_LIMITS: KVNamespace;
  LEARNWORLDS_CLIENT_ID?: string;
  LEARNWORLDS_CLIENT_SECRET?: string;
  LEARNWORLDS_SCHOOL_URL?: string;
}

const TOKEN_KV_KEY = "lw:token:v1";
const TIMEOUT_MS = 10_000;

export function lwConfigured(env: LwEnv): boolean {
  return Boolean(
    env.LEARNWORLDS_CLIENT_ID &&
      env.LEARNWORLDS_CLIENT_SECRET &&
      env.LEARNWORLDS_SCHOOL_URL,
  );
}

/* Normalise the stored school URL: strip trailing slashes and a
 * trailing /admin/api (people copy the URL from the developers page
 * with the path attached — diagnosed live 2026-07-19). */
function schoolUrl(env: LwEnv): string {
  return (env.LEARNWORLDS_SCHOOL_URL || "")
    .replace(/\/+$/, "")
    .replace(/\/admin\/api$/, "");
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function getToken(env: LwEnv): Promise<string> {
  const cached = await env.RATE_LIMITS.get(TOKEN_KV_KEY);
  if (cached) return cached;

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: env.LEARNWORLDS_CLIENT_ID || "",
    client_secret: env.LEARNWORLDS_CLIENT_SECRET || "",
  });
  /* Documented token endpoint: {school}/admin/api/oauth2/access_token */
  const res = await fetchWithTimeout(`${schoolUrl(env)}/admin/api/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`LearnWorlds token request failed: HTTP ${res.status}`);
  }
  /* LearnWorlds wraps the token in a tokenData object; accept the
   * flat OAuth shape too for safety. */
  const payload = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    errors?: unknown;
    tokenData?: { access_token?: string; expires_in?: number };
  };
  const accessToken = payload.tokenData?.access_token ?? payload.access_token;
  const expiresIn = payload.tokenData?.expires_in ?? payload.expires_in ?? 3600;
  if (!accessToken) {
    throw new Error(
      `LearnWorlds token response missing access_token (keys: ${Object.keys(
        payload,
      ).join(",")})`,
    );
  }
  const ttl = Math.max(60, expiresIn - 120);
  await env.RATE_LIMITS.put(TOKEN_KV_KEY, accessToken, { expirationTtl: ttl });
  return accessToken;
}

/* The documented data-API base is {SCHOOLHOMEPAGE}/admin/api (paths
 * then start /v2/...). The school homepage can differ from the stored
 * URL by a www prefix, so resolve the working base once by probing
 * candidates, then cache the winner in KV for a day. */
const BASE_KV_KEY = "lw:base:v1";

function baseCandidates(env: LwEnv): string[] {
  const stored = schoolUrl(env);
  const isWww = /^https:\/\/www\./.test(stored);
  const other = isWww
    ? stored.replace(/^https:\/\/www\./, "https://")
    : stored.replace(/^https:\/\//, "https://www.");
  return [...new Set([stored, other])].map((h) => `${h}/admin/api`);
}

async function resolveBase(env: LwEnv, token: string): Promise<string> {
  const cached = await env.RATE_LIMITS.get(BASE_KV_KEY);
  if (cached) return cached;
  const results: string[] = [];
  for (const base of baseCandidates(env)) {
    const res = await fetchWithTimeout(`${base}/v2/courses?items_per_page=1`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Lw-Client": env.LEARNWORLDS_CLIENT_ID || "",
      },
      redirect: "follow",
    });
    if (res.ok) {
      await env.RATE_LIMITS.put(BASE_KV_KEY, base, { expirationTtl: 86_400 });
      return base;
    }
    const bodyHint = (await res.text()).replace(/\s+/g, " ").slice(0, 120);
    results.push(`${base} -> HTTP ${res.status} ${bodyHint}`);
  }
  throw new Error(`LearnWorlds API base resolution failed: ${results.join(" | ")}`);
}

export async function lwRequest(
  env: LwEnv,
  method: string,
  path: string,
  jsonBody?: unknown,
): Promise<Response> {
  const token = await getToken(env);
  const base = await resolveBase(env, token);
  return fetchWithTimeout(`${base}/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Lw-Client": env.LEARNWORLDS_CLIENT_ID || "",
      ...(jsonBody !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
  });
}

/** List all courses (id + title). Used by /lw-check to verify the
 * stored credentials and to build the module -> course-id map. */
export async function listCourses(
  env: LwEnv,
): Promise<Array<{ id: string; title: string }>> {
  const courses: Array<{ id: string; title: string }> = [];
  let page = 1;
  for (;;) {
    const res = await lwRequest(
      env,
      "GET",
      `/courses?page=${page}&items_per_page=50`,
    );
    if (!res.ok) throw new Error(`LearnWorlds course list failed: HTTP ${res.status}`);
    const payload = (await res.json()) as {
      data?: Array<{ id: string; title: string }>;
      meta?: { totalPages?: number; total_pages?: number };
    };
    const items = payload.data ?? [];
    for (const course of items) courses.push({ id: course.id, title: course.title });
    const totalPages = payload.meta?.totalPages ?? payload.meta?.total_pages ?? 1;
    if (page >= totalPages || items.length === 0) break;
    page += 1;
  }
  return courses;
}

/** LearnWorlds returns some text fields HTML-encoded ("Confidence
 * &amp;amp; Resilience") — decode them once at the API boundary so our
 * own output escaping doesn't double-encode. */
export function decodeHtml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&nbsp;/g, " ");
}

export interface LwUser {
  id: string;
  email?: string;
  first_name?: string;
  last_name?: string;
  username?: string;
  created?: number; // Unix seconds (fractional)
  last_login?: number; // Unix seconds (fractional); 0/absent = never
  is_admin?: boolean;
  is_instructor?: boolean;
  is_suspended?: boolean;
  is_reporter?: boolean;
  tags?: string[];
}

/** Find a LearnWorlds user by email. Returns the user id, or null. */
export async function findUserByEmail(
  env: LwEnv,
  email: string,
): Promise<string | null> {
  const user = await getUserByEmail(env, email);
  return user?.id ?? null;
}

/** Full user record by email/id, or null when not found. */
export async function getUserByEmail(
  env: LwEnv,
  email: string,
): Promise<LwUser | null> {
  const res = await lwRequest(env, "GET", `/users/${encodeURIComponent(email)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LearnWorlds user lookup failed: HTTP ${res.status}`);
  const user = (await res.json()) as LwUser;
  if (!user.id) return null;
  return {
    ...user,
    first_name: user.first_name ? decodeHtml(user.first_name) : user.first_name,
    last_name: user.last_name ? decodeHtml(user.last_name) : user.last_name,
    username: user.username ? decodeHtml(user.username) : user.username,
    tags: user.tags?.map(decodeHtml),
  };
}

export interface LwUserCourse {
  title: string;
  progressRate: number | null;
  completed: boolean;
}

/** A user's course enrolments with whatever progress detail the API
 * exposes — parsed defensively because the exact response shape varies
 * across LearnWorlds versions. */
export async function getUserCourses(
  env: LwEnv,
  userId: string,
): Promise<LwUserCourse[]> {
  const out: LwUserCourse[] = [];
  let page = 1;
  for (;;) {
    const res = await lwRequest(
      env,
      "GET",
      `/users/${encodeURIComponent(userId)}/courses?page=${page}&items_per_page=50`,
    );
    if (!res.ok) throw new Error(`LearnWorlds user courses failed: HTTP ${res.status}`);
    const payload = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      meta?: { totalPages?: number; total_pages?: number };
    };
    const items = payload.data ?? [];
    for (const raw of items) {
      const course = (raw.course ?? raw) as Record<string, unknown>;
      const title =
        typeof course.title === "string"
          ? course.title
          : typeof raw.title === "string"
            ? (raw.title as string)
            : "";
      if (!title) continue;
      const rateRaw =
        raw.progress_rate ?? raw.completion_rate ?? course.progress_rate ?? null;
      const progressRate =
        typeof rateRaw === "number" ? Math.max(0, Math.min(100, rateRaw)) : null;
      const status = typeof raw.status === "string" ? raw.status : "";
      out.push({
        title: title.trim(),
        progressRate,
        completed: status === "completed" || (progressRate !== null && progressRate >= 100),
      });
    }
    const totalPages = payload.meta?.totalPages ?? payload.meta?.total_pages ?? 1;
    if (page >= totalPages || items.length === 0) break;
    page += 1;
  }
  return out;
}

export interface LwEnrolment {
  courseId: string;
  title: string;
  label: string;
}

/** A user's enrolments (course id, title, curriculum label). The
 * enrolment payload carries NO progress — that lives on the per-course
 * progress endpoint below (verified against production 2026-07-19). */
export async function getEnrolments(
  env: LwEnv,
  userId: string,
): Promise<LwEnrolment[]> {
  const out: LwEnrolment[] = [];
  let page = 1;
  for (;;) {
    const res = await lwRequest(
      env,
      "GET",
      `/users/${encodeURIComponent(userId)}/courses?page=${page}&items_per_page=50`,
    );
    if (!res.ok) throw new Error(`LearnWorlds enrolments failed: HTTP ${res.status}`);
    const payload = (await res.json()) as {
      data?: Array<{ course?: { id?: string; title?: string; label?: string } }>;
      meta?: { totalPages?: number; total_pages?: number };
    };
    const items = payload.data ?? [];
    for (const raw of items) {
      const course = raw.course ?? {};
      if (!course.id || !course.title) continue;
      out.push({
        courseId: course.id,
        title: decodeHtml(course.title.trim()),
        label: decodeHtml((course.label ?? "").trim()),
      });
    }
    const totalPages = payload.meta?.totalPages ?? payload.meta?.total_pages ?? 1;
    if (page >= totalPages || items.length === 0) break;
    page += 1;
  }
  return out;
}

export interface LwProgress {
  status: "not_started" | "in_progress" | "completed";
  progressRate: number;
  scoreRate: number | null;
  timeSeconds: number;
  unitsDone: number;
  unitsTotal: number;
}

/** Per-course progress: {status, progress_rate, average_score_rate,
 * time_on_course, total_units, completed_units, …}. */
export async function getUserProgress(
  env: LwEnv,
  userId: string,
  courseId: string,
): Promise<LwProgress> {
  const res = await lwRequest(
    env,
    "GET",
    `/users/${encodeURIComponent(userId)}/courses/${encodeURIComponent(courseId)}/progress`,
  );
  if (!res.ok) throw new Error(`LearnWorlds progress failed: HTTP ${res.status}`);
  const p = (await res.json()) as {
    status?: string;
    progress_rate?: number;
    average_score_rate?: number;
    time_on_course?: number;
    total_units?: number;
    completed_units?: number;
  };
  const status =
    p.status === "completed"
      ? "completed"
      : p.status === "not_started"
        ? "not_started"
        : "in_progress";
  const progressRate =
    typeof p.progress_rate === "number"
      ? Math.max(0, Math.min(100, p.progress_rate))
      : 0;
  return {
    status: status === "in_progress" && progressRate >= 100 ? "completed" : status,
    progressRate,
    scoreRate:
      typeof p.average_score_rate === "number" && p.average_score_rate > 0
        ? Math.max(0, Math.min(100, p.average_score_rate))
        : null,
    timeSeconds: typeof p.time_on_course === "number" ? Math.max(0, p.time_on_course) : 0,
    unitsDone: typeof p.completed_units === "number" ? Math.max(0, p.completed_units) : 0,
    unitsTotal: typeof p.total_units === "number" ? Math.max(0, p.total_units) : 0,
  };
}

/** Number of school users carrying a tag (for cohort size). */
export async function countUsersByTag(env: LwEnv, tag: string): Promise<number | null> {
  const res = await lwRequest(
    env,
    "GET",
    `/users?tags=${encodeURIComponent(tag)}&items_per_page=1`,
  );
  if (!res.ok) return null;
  const payload = (await res.json()) as {
    meta?: { totalItems?: number; total_items?: number };
  };
  return payload.meta?.totalItems ?? payload.meta?.total_items ?? null;
}

export interface LwUserListPage {
  users: LwUser[];
  totalPages: number;
  totalItems: number | null;
}

/** One page of the school's user list (newest first). */
/** Every user in the school (paged under the hood, capped for
 * Workers subrequest budgets — 5 pages = 500 users). */
export async function listAllUsers(env: LwEnv, maxPages = 5): Promise<LwUser[]> {
  const users: LwUser[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await listUsersPage(env, page);
    users.push(...res.users);
    if (page >= res.totalPages || res.users.length === 0) break;
  }
  return users;
}

export async function listUsersPage(
  env: LwEnv,
  page: number,
): Promise<LwUserListPage> {
  const res = await lwRequest(env, "GET", `/users?page=${page}&items_per_page=100`);
  if (!res.ok) throw new Error(`LearnWorlds user list failed: HTTP ${res.status}`);
  const payload = (await res.json()) as {
    data?: LwUser[];
    meta?: {
      totalPages?: number;
      total_pages?: number;
      totalItems?: number;
      total_items?: number;
    };
  };
  return {
    users: payload.data ?? [],
    totalPages: payload.meta?.totalPages ?? payload.meta?.total_pages ?? 1,
    totalItems: payload.meta?.totalItems ?? payload.meta?.total_items ?? null,
  };
}

/* NOTE: deliberately NO tagging function here. Founder decision
 * 2026-07-19: learners are never tagged, and the only write this
 * worker may ever perform is a single-course enrolment that the
 * learner explicitly confirmed by name in the widget. */

/** Enrol a user in a course (free enrolment). */
export async function enrolUserInCourse(
  env: LwEnv,
  userId: string,
  courseId: string,
  justification: string,
): Promise<{ ok: boolean; status: number }> {
  const res = await lwRequest(
    env,
    "POST",
    `/users/${encodeURIComponent(userId)}/enrollment`,
    {
      productId: courseId,
      productType: "course",
      justification,
      price: 0,
      send_enrollment_email: false,
    },
  );
  return { ok: res.ok, status: res.status };
}

/* ---------------- course contents + assessment responses ---------------- */

export interface LwCourseUnit {
  id: string;
  title: string;
  type: string;
}

/** All units of a course (flattened across sections). */
export async function getCourseContents(
  env: LwEnv,
  courseId: string,
): Promise<LwCourseUnit[]> {
  const res = await lwRequest(
    env,
    "GET",
    `/courses/${encodeURIComponent(courseId)}/contents`,
  );
  if (!res.ok) throw new Error(`LearnWorlds contents failed: HTTP ${res.status}`);
  const payload = (await res.json()) as {
    sections?: Array<{ learningUnits?: Array<Record<string, unknown>>; units?: Array<Record<string, unknown>> }>;
  };
  const units: LwCourseUnit[] = [];
  for (const section of payload.sections ?? []) {
    for (const u of section.learningUnits ?? section.units ?? []) {
      if (typeof u.id === "string" && typeof u.type === "string") {
        units.push({
          id: u.id,
          title: decodeHtml(String(u.title ?? u.name ?? "").trim()),
          type: u.type,
        });
      }
    }
  }
  return units;
}

/** One page of responses for an assessment unit. Returns null when the
 * Assessments API is not enabled on this school's plan (404). */
export async function getAssessmentResponses(
  env: LwEnv,
  unitId: string,
  page: number,
): Promise<{ rows: unknown[]; totalPages: number } | null> {
  const res = await lwRequest(
    env,
    "GET",
    `/assessments/${encodeURIComponent(unitId)}/responses?page=${page}&items_per_page=100`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LearnWorlds assessment responses failed: HTTP ${res.status}`);
  const payload = (await res.json()) as {
    data?: unknown[];
    meta?: { totalPages?: number; total_pages?: number };
  };
  return {
    rows: payload.data ?? [],
    totalPages: payload.meta?.totalPages ?? payload.meta?.total_pages ?? 1,
  };
}

/* ---------------- accurate per-user progress (one call) ---------------- */

/** Per-course progress from GET /v2/users/{id}/progress — the ONLY
 * user-level endpoint that carries real completion data (the
 * enrolments payload has none; that gap made every portal completion
 * read as zero until 2026-07-21). One paginated call covers every
 * course the user touches. */
export interface LwCourseProgress {
  courseId: string;
  status: "not_started" | "in_progress" | "completed";
  progressRate: number;
  scoreRate: number | null;
  timeSeconds: number;
  unitsDone: number | null;
  unitsTotal: number | null;
}

export async function getUserProgressAll(
  env: LwEnv,
  userId: string,
): Promise<LwCourseProgress[]> {
  const out: LwCourseProgress[] = [];
  let page = 1;
  for (;;) {
    const res = await lwRequest(
      env,
      "GET",
      `/users/${encodeURIComponent(userId)}/progress?page=${page}&items_per_page=100`,
    );
    /* A learner with zero course activity gets a 404 here, not an
     * empty list — that's "no progress", not an error (QA 2026-07-22:
     * this silently dropped a high-risk learner from the CSV). */
    if (res.status === 404) return out;
    if (!res.ok) throw new Error(`LearnWorlds user progress failed: HTTP ${res.status}`);
    const payload = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      meta?: { totalPages?: number; total_pages?: number };
    };
    const items = payload.data ?? [];
    for (const raw of items) {
      const courseId = typeof raw.course_id === "string" ? raw.course_id : "";
      if (!courseId) continue;
      const status =
        raw.status === "completed"
          ? "completed"
          : raw.status === "not_started"
            ? "not_started"
            : "in_progress";
      out.push({
        courseId,
        status,
        progressRate:
          typeof raw.progress_rate === "number"
            ? Math.max(0, Math.min(100, Math.round(raw.progress_rate)))
            : 0,
        scoreRate:
          typeof raw.average_score_rate === "number" ? raw.average_score_rate : null,
        timeSeconds: typeof raw.time_on_course === "number" ? raw.time_on_course : 0,
        unitsDone: typeof raw.completed_units === "number" ? raw.completed_units : null,
        unitsTotal: typeof raw.total_units === "number" ? raw.total_units : null,
      });
    }
    const totalPages = payload.meta?.totalPages ?? payload.meta?.total_pages ?? 1;
    if (page >= totalPages || items.length === 0) break;
    page += 1;
  }
  return out;
}

/** Course id -> title map (decoded), KV-cached for 6h so samples cost
 * one extra call at most. */
export async function courseTitleMap(env: LwEnv): Promise<Map<string, string>> {
  const KEY = "lw:titles:v1";
  const cached = await env.RATE_LIMITS.get(KEY);
  if (cached) return new Map(Object.entries(JSON.parse(cached) as Record<string, string>));
  const courses = await listCourses(env);
  const obj: Record<string, string> = {};
  for (const c of courses) obj[c.id] = decodeHtml(c.title.trim());
  await env.RATE_LIMITS.put(KEY, JSON.stringify(obj), { expirationTtl: 6 * 3600 });
  return new Map(Object.entries(obj));
}

/** Accurate replacement for the legacy getUserCourses: real progress
 * joined to titles. */
export async function accurateUserCourses(
  env: LwEnv,
  userId: string,
  titles: Map<string, string>,
): Promise<LwUserCourse[]> {
  const rows = await getUserProgressAll(env, userId);
  /* Rows whose course id isn't in the (6h-cached) catalogue are
   * dropped: a raw id would leak into provider tables/nudges AND
   * dodge the EXCLUDED_TITLES filter (QA 2026-07-22). */
  return rows
    .filter((r) => titles.has(r.courseId))
    .map((r) => ({
      title: titles.get(r.courseId)!,
      progressRate: r.progressRate,
      completed: r.status === "completed",
    }));
}

/** Per-unit analytics (school-wide). Returns null on 404 (unit with
 * no analytics yet). */
export async function getUnitAnalytics(
  env: LwEnv,
  courseId: string,
  unitId: string,
): Promise<{ viewers: number; completed: number; avgTimeSecs: number } | null> {
  const res = await lwRequest(
    env,
    "GET",
    `/courses/${encodeURIComponent(courseId)}/units/${encodeURIComponent(unitId)}/analytics`,
  );
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LearnWorlds unit analytics failed: HTTP ${res.status}`);
  const payload = (await res.json()) as Record<string, unknown>;
  return {
    viewers: typeof payload.viewers === "number" ? payload.viewers : 0,
    completed:
      typeof payload.users_completed === "number" ? payload.users_completed : 0,
    avgTimeSecs:
      typeof payload.avg_study_time === "number" ? payload.avg_study_time : 0,
  };
}

/** Create a user (cohort onboarding). Tags are set AT CREATION — this
 * never re-tags existing learners (founder law: no tag writes on
 * existing accounts). send_registration_email is always explicit. */
export async function createUser(
  env: LwEnv,
  input: {
    email: string;
    username: string;
    tags: string[];
    sendRegistrationEmail: boolean;
  },
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  const res = await lwRequest(env, "POST", "/users", {
    email: input.email,
    username: input.username,
    tags: input.tags,
    send_registration_email: input.sendRegistrationEmail,
  });
  if (res.ok) {
    const payload = (await res.json()) as { id?: string; data?: { id?: string } };
    const id = payload.id ?? payload.data?.id ?? "";
    return id ? { ok: true, id } : { ok: false, reason: "no_id_in_response" };
  }
  const body = (await res.text()).slice(0, 160);
  return { ok: false, reason: `HTTP ${res.status} ${body}` };
}
