/* Read a `wrangler tail --format json` capture and print one line per
 * request: when, which route, and what the worker logged. QA-only.
 *
 *   npx wrangler tail --format json > qa/tail.log     (leave running)
 *   node scripts/qa-tail-read.mjs qa/tail.log [route substring]
 *
 * The capture is a stream of pretty-printed JSON objects, not a JSON
 * array, so it is split by tracking brace depth outside strings. */
import fs from "node:fs";

const file = process.argv[2] || "qa/tail.log";
const only = process.argv[3] || "";
const text = fs.readFileSync(file, "utf8");

const events = [];
let depth = 0, start = -1, inString = false, escaped = false;
for (let i = 0; i < text.length; i++) {
  const ch = text[i];
  if (inString) {
    if (escaped) escaped = false;
    else if (ch === "\\") escaped = true;
    else if (ch === '"') inString = false;
    continue;
  }
  if (ch === '"') { inString = true; continue; }
  if (ch === "{") { if (depth === 0) start = i; depth++; }
  else if (ch === "}") {
    depth--;
    if (depth === 0 && start >= 0) {
      try { events.push(JSON.parse(text.slice(start, i + 1))); } catch { /* partial object at the end */ }
      start = -1;
    }
  }
}

console.log(`${events.length} request(s) captured`);
for (const e of events) {
  const url = e.event?.request?.url ?? "";
  const route = url.replace(/^https?:\/\/[^/]+/, "");
  if (only && !route.includes(only)) continue;
  const logs = (e.logs ?? []).map((l) => `${l.level}: ${l.message.join(" ")}`).join(" | ");
  const errors = (e.exceptions ?? []).map((x) => `EXCEPTION ${x.name}: ${x.message}`).join(" | ");
  console.log(`${new Date(e.eventTimestamp).toISOString().slice(11, 19)}  ${e.outcome.padEnd(8)} ${route.slice(0, 44).padEnd(44)} ${(logs + " " + errors).trim().slice(0, 220)}`);
}
