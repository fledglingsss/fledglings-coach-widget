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

async function getToken(env: LwEnv): Promise<string> {
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

async function lwRequest(
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

/** Find a LearnWorlds user by email. Returns the user id, or null. */
export async function findUserByEmail(
  env: LwEnv,
  email: string,
): Promise<string | null> {
  const res = await lwRequest(env, "GET", `/users/${encodeURIComponent(email)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`LearnWorlds user lookup failed: HTTP ${res.status}`);
  const user = (await res.json()) as { id?: string };
  return user.id ?? null;
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
