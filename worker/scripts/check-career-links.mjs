/* Does every role in the career list still have its official profile?
 *
 *   node scripts/check-career-links.mjs
 *
 * src/lib/career-paths.ts links each role to its National Careers
 * Service job profile. That site answers a missing profile with a
 * normal 200 and a "Page not found" title, so a status check proves
 * nothing: this reads the title of each page and compares it with the
 * role's label. Run it when the list changes, or if a learner reports a
 * dead link. One polite request at a time; about half a minute. */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "..", "src", "lib", "career-paths.ts"), "utf8");
const roles = [...source.matchAll(/\{ id: "([a-z0-9-]+)", label: "([^"]+)"/g)].map((m) => ({ id: m[1], label: m[2] }));
if (roles.length < 20) {
  console.log(`only ${roles.length} roles found - has the list changed shape?`);
  process.exit(2);
}

const BASE = "https://nationalcareers.service.gov.uk/job-profiles/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
/* The site's own title for a role may differ from the plain label used
 * here ("Data analyst-statistician" for "Data analyst"): a shared first
 * word is enough to know it is the right page. */
const firstWord = (text) => text.toLowerCase().split(/[^a-z]+/).filter(Boolean)[0] || "";

let bad = 0;
for (const role of roles) {
  let verdict = "";
  try {
    const res = await fetch(BASE + role.id, { headers: { "User-Agent": "Mozilla/5.0 (Fledglings link check)" } });
    const html = res.ok ? await res.text() : "";
    const title = ((html.match(/<title>([^<]*)<\/title>/i) || [])[1] || "").split("|")[0].trim();
    if (!res.ok) verdict = `HTTP ${res.status}`;
    else if (/^404\b|not found/i.test(title) || !title) verdict = "page not found";
    else if (firstWord(title) !== firstWord(role.label)) verdict = `title is "${title}"`;
  } catch (err) {
    verdict = String(err).slice(0, 80);
  }
  if (verdict) { bad++; console.log(`!!  ${role.id}  (${role.label}): ${verdict}`); }
  await sleep(200);
}
console.log(bad ? `\n${bad} of ${roles.length} need attention` : `all ${roles.length} profiles found`);
process.exit(bad ? 1 : 0);
