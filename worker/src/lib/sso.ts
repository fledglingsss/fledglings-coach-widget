/* Sign in with your school account.
 *
 * LearnWorlds cannot hand a third-party app a signed statement of who
 * is logged in — it has no identity-provider mode, and its only
 * user-token flow wants the learner's school password typed into our
 * page, which is exactly the phishing habit this platform teaches
 * young people to refuse. So the proof rides on something the school
 * DOES attribute reliably: an assessment response.
 *
 * The chain:
 *   1. The hub shows this device a short one-time code.
 *   2. The learner opens the school's "Hub sign-in" course — the
 *      school's own login wall stands in front of it — and submits
 *      the code into its one-question assessment.
 *   3. This worker reads that response server-to-server over the
 *      admin API. The row's email was attributed by the school to
 *      the logged-in session that submitted it; nothing the browser
 *      asserts is trusted anywhere in the loop.
 *   4. The code matches → the email is proven for the device that
 *      asked → a signed identity token is minted, and the binding
 *      record is marked verified.
 *
 * No passwords touched, no addresses typed, nothing to deliver by
 * email. The moving parts are ones already proven live: the course
 * catalogue, course contents, and assessment responses the
 * reflections pipeline has been reading for weeks. */

import {
  getAssessmentResponses,
  getCourseContents,
  listCourses,
  type LwEnv,
} from "./learnworlds";
import { parseResponse } from "./reflections";

/** The course the founder creates once, found by exact title. */
export const SSO_COURSE_TITLE = "hub sign-in";

/** How long a sign-in code lives, and the freshness window a matching
 * response must fall in. The response window is wider than the code
 * TTL only to absorb clock skew between LearnWorlds and here. */
export const SSO_CODE_TTL_SECS = 10 * 60;
export const SSO_RESPONSE_WINDOW_SECS = 15 * 60;

export const SSO_STARTS_PER_DEVICE_PER_DAY = 6;
export const SSO_STARTS_PER_IP_PER_DAY = 24;
export const SSO_CHECKS_PER_CODE = 60;

export interface SsoUnit {
  courseId: string;
  unitId: string;
}

/** KV cache keys. The unit cache is long-lived (the course is created
 * once and never moves); the miss cache is short so switching the
 * feature on is felt within minutes, not half a day. */
const UNIT_KEY = "sso:unit:v1";
const UNIT_TTL_SECS = 12 * 3600;
const UNIT_MISS_KEY = "sso:unit-miss:v1";
const UNIT_MISS_TTL_SECS = 5 * 60;

interface SsoKv {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: { expirationTtl?: number },
  ): Promise<void>;
}

/** Find the sign-in course and its assessment unit, cached. Returns
 * null while the course does not exist yet — the routes translate
 * that into an honest "not switched on" rather than an error. */
export async function resolveSsoUnit(env: LwEnv, kv: SsoKv): Promise<SsoUnit | null> {
  const cached = await kv.get(UNIT_KEY);
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as { courseId?: unknown; unitId?: unknown };
      if (typeof parsed.courseId === "string" && typeof parsed.unitId === "string") {
        return { courseId: parsed.courseId, unitId: parsed.unitId };
      }
    } catch {
      /* fall through to a fresh lookup */
    }
  }
  if ((await kv.get(UNIT_MISS_KEY)) !== null) return null;
  try {
    const courses = await listCourses(env);
    const course = courses.find(
      (course) => course.title.trim().toLowerCase() === SSO_COURSE_TITLE,
    );
    if (!course) {
      await kv.put(UNIT_MISS_KEY, "1", { expirationTtl: UNIT_MISS_TTL_SECS });
      return null;
    }
    const units = await getCourseContents(env, course.id);
    const unit = units.find((unit) => unit.type === "assessmentV2");
    if (!unit) {
      await kv.put(UNIT_MISS_KEY, "1", { expirationTtl: UNIT_MISS_TTL_SECS });
      return null;
    }
    const resolved: SsoUnit = { courseId: course.id, unitId: unit.id };
    await kv.put(UNIT_KEY, JSON.stringify(resolved), { expirationTtl: UNIT_TTL_SECS });
    return resolved;
  } catch {
    /* A flaky catalogue call must not cache a miss for five minutes —
     * just report unavailable for this one request. */
    return null;
  }
}

/** Strip a typed or submitted answer down to the code alphabet, so
 * "abc-234", "ABC 234" and "abc234" all compare equal. */
export function normaliseSsoAnswer(raw: string): string {
  return raw
    .toUpperCase()
    .split("")
    .filter((ch) => "23456789ABCDEFGHJKMNPQRSTUVWXYZ".includes(ch))
    .join("")
    .slice(0, 12);
}

export interface SsoMatch {
  email: string;
  userId: string;
}

/** Find the response that proves this code, if any.
 *
 * Rows come from the school's own attribution of who submitted; the
 * only client-supplied thing compared here is the code, and a stale
 * row cannot replay a sign-in because the window is checked and the
 * code itself is single-use and deleted on success. A row with no
 * timestamp still counts — the live one-time code bounds it. */
export function matchSsoResponse(
  rows: unknown[],
  code: string,
  nowSecs: number,
): SsoMatch | null {
  const wanted = normaliseSsoAnswer(code);
  if (wanted.length < 6) return null;
  for (const raw of rows) {
    const response = parseResponse(raw);
    if (!response || !response.email) continue;
    if (
      response.submittedAt !== null &&
      Math.abs(nowSecs - response.submittedAt) > SSO_RESPONSE_WINDOW_SECS
    ) {
      continue;
    }
    const hit = response.answers.some(
      (answer) => normaliseSsoAnswer(answer.answer) === wanted,
    );
    if (hit) return { email: response.email, userId: response.userId };
  }
  return null;
}

/** Fetch the responses worth scanning: the first page and, when the
 * unit has grown pages, the last one — newest rows live at one end or
 * the other depending on the school's ordering, and this covers both
 * without ever fetching the middle. At most three API calls. */
export async function recentSsoRows(env: LwEnv, unitId: string): Promise<unknown[]> {
  const first = await getAssessmentResponses(env, unitId, 1);
  if (first === null) return [];
  const rows = [...first.rows];
  if (first.totalPages > 1) {
    const last = await getAssessmentResponses(env, unitId, first.totalPages).catch(
      () => null,
    );
    if (last) rows.push(...last.rows);
  }
  return rows;
}
