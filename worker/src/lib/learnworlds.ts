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

function schoolUrl(env: LwEnv): string {
  return (env.LEARNWORLDS_SCHOOL_URL || "").replace(/\/+$/, "");
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
  const res = await fetchWithTimeout(`${schoolUrl(env)}/oauth2/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    throw new Error(`LearnWorlds token request failed: HTTP ${res.status}`);
  }
  const payload = (await res.json()) as { access_token?: string; expires_in?: number };
  if (!payload.access_token) {
    throw new Error("LearnWorlds token response missing access_token");
  }
  const ttl = Math.max(60, (payload.expires_in ?? 3600) - 120);
  await env.RATE_LIMITS.put(TOKEN_KV_KEY, payload.access_token, {
    expirationTtl: ttl,
  });
  return payload.access_token;
}

async function lwRequest(
  env: LwEnv,
  method: string,
  path: string,
  jsonBody?: unknown,
): Promise<Response> {
  const token = await getToken(env);
  return fetchWithTimeout(`${schoolUrl(env)}/admin/api/v2${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Lw-Client": env.LEARNWORLDS_CLIENT_ID || "",
      ...(jsonBody !== undefined ? { "Content-Type": "application/json" } : {}),
    },
    body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
  });
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

/** Add tags to a user. Non-fatal by design — callers may ignore errors. */
export async function addUserTags(
  env: LwEnv,
  userId: string,
  tags: string[],
): Promise<boolean> {
  const res = await lwRequest(env, "PUT", `/users/${encodeURIComponent(userId)}/tags`, {
    tags,
  });
  return res.ok;
}

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
