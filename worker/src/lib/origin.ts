/* Origin allowlist — same pattern as the fledglings-feedback worker.
 * Accept requests only from the Fledglings school (fledglings.co and
 * the legacy fledglings-school.co.uk), LearnWorlds-hosted surfaces,
 * and localhost for development. */

const ALLOWED_HOSTS = [
  /^(.*\.)?fledglings\.co$/,
  /^(.*\.)?fledglings-school\.co\.uk$/,
  /^(.*\.)?learnworlds\.com$/,
  /^(.*\.)?mycourse\.app$/,
  /* The worker's own /preview QA page. */
  /^fledglings-coach\.fledglings\.workers\.dev$/,
  /^localhost(:\d+)?$/,
  /^127\.0\.0\.1(:\d+)?$/,
];

/** Returns true if the Origin (or Referer) header value is allowed. */
export function isOriginAllowed(origin: string): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  return ALLOWED_HOSTS.some((re) => re.test(host));
}

/* The school's own surfaces — where a page is rendered by LearnWorlds
 * for a signed-in learner, so the email in the embed came from the
 * platform rather than from a text box. The worker's own domain and
 * localhost are deliberately NOT school origins: a tool opened
 * standalone must go through the first-claim path. */
const SCHOOL_HOSTS = [
  /^(.*\.)?fledglings\.co$/,
  /^(.*\.)?fledglings-school\.co\.uk$/,
  /^(.*\.)?learnworlds\.com$/,
  /^(.*\.)?mycourse\.app$/,
];

/** True when the request came from a signed-in school page. */
export function isSchoolOrigin(origin: string): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  return SCHOOL_HOSTS.some((re) => re.test(host));
}
