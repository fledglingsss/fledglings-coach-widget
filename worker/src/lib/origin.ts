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

/* NOTE: there is deliberately no "is this a school page?" helper any
 * more. Identity once used it to let a second device link itself, but
 * it rested on an `Origin` header that a non-browser client can simply
 * assert. Device link codes replaced it — see docs/IDENTITY.md. */
