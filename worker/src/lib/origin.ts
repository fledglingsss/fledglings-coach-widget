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

/* THIS school's own surfaces — where a page is rendered by LearnWorlds
 * for a signed-in learner. Deliberately NOT the LearnWorlds/mycourse
 * vendor apexes: anyone can create a free school at
 * attacker.learnworlds.com, and a page there would otherwise count as
 * ours. The tenant subdomain is taken from LEARNWORLDS_SCHOOL_URL, so
 * only the configured school matches. The worker's own domain and
 * localhost are not school origins either — a tool opened standalone
 * must go through the first-claim path. */
const SCHOOL_HOSTS = [
  /^(.*\.)?fledglings\.co$/,
  /^(.*\.)?fledglings-school\.co\.uk$/,
];

/**
 * True when the request came from a page on this school.
 *
 * NOTE ON STRENGTH: `Origin`/`Referer` are enforced by browsers but a
 * non-browser client can send whatever it likes, so this is a
 * deterrence layer, not an authorisation boundary — see
 * docs/IDENTITY.md. It exists to stop a page on someone else's site
 * (including another LearnWorlds tenant) counting as ours.
 */
export function isSchoolOrigin(origin: string, schoolUrl?: string): boolean {
  if (!origin) return false;
  let host: string;
  try {
    host = new URL(origin).host.toLowerCase();
  } catch {
    return false;
  }
  if (SCHOOL_HOSTS.some((re) => re.test(host))) return true;
  /* The configured LearnWorlds tenant only — never the vendor apex. */
  if (schoolUrl) {
    try {
      const tenant = new URL(schoolUrl).host.toLowerCase();
      if (tenant && host === tenant) return true;
    } catch {
      /* an unparseable school URL simply matches nothing */
    }
  }
  return false;
}
