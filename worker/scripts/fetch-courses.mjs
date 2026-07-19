/* Fetch the school's course list from the LearnWorlds Admin API and
 * write config/courses.generated.json (titles + ids — no secrets).
 *
 * Reads LEARNWORLDS_CLIENT_ID / LEARNWORLDS_CLIENT_SECRET /
 * LEARNWORLDS_SCHOOL_URL from the environment. Normally run via
 * set-lw-keys.ps1, which sets them for the session only. */

import { mkdirSync, writeFileSync } from "node:fs";

const { LEARNWORLDS_CLIENT_ID, LEARNWORLDS_CLIENT_SECRET, LEARNWORLDS_SCHOOL_URL } =
  process.env;

if (!LEARNWORLDS_CLIENT_ID || !LEARNWORLDS_CLIENT_SECRET || !LEARNWORLDS_SCHOOL_URL) {
  console.error("Missing LEARNWORLDS_* environment variables.");
  process.exit(1);
}
const school = LEARNWORLDS_SCHOOL_URL.replace(/\/+$/, "");

const tokenRes = await fetch(`${school}/oauth2/access_token`, {
  method: "POST",
  headers: { "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    grant_type: "client_credentials",
    client_id: LEARNWORLDS_CLIENT_ID,
    client_secret: LEARNWORLDS_CLIENT_SECRET,
  }).toString(),
});
if (!tokenRes.ok) {
  console.error(`Token request failed: HTTP ${tokenRes.status} — check the three values.`);
  process.exit(1);
}
const { access_token } = await tokenRes.json();
console.log("Authenticated with LearnWorlds OK.");

const courses = [];
let page = 1;
for (;;) {
  const res = await fetch(`${school}/admin/api/v2/courses?page=${page}&items_per_page=50`, {
    headers: { Authorization: `Bearer ${access_token}`, "Lw-Client": LEARNWORLDS_CLIENT_ID },
  });
  if (!res.ok) {
    console.error(`Course list failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const payload = await res.json();
  const items = payload.data ?? payload.courses ?? [];
  for (const course of items) {
    courses.push({ id: course.id, title: course.title });
  }
  const totalPages = payload.meta?.totalPages ?? payload.meta?.total_pages ?? 1;
  if (page >= totalPages || items.length === 0) break;
  page += 1;
}

mkdirSync("config", { recursive: true });
writeFileSync("config/courses.generated.json", JSON.stringify(courses, null, 2));
console.log(`Wrote ${courses.length} courses to config/courses.generated.json`);
for (const c of courses.slice(0, 40)) console.log(`  ${c.id}  ${c.title}`);
