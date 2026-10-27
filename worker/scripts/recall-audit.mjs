/* Recall audit: runs the LIVE gate (imported from the real source,
 * never a re-implementation) and the old ungated screen over every
 * answer in a reflections export, printing what the gate drops so a
 * human can read each one. Usage: node scripts/recall-audit.mjs <csv> */
import fs from "fs";
import { reflectionDisclosureHeuristic, safeguardingHeuristic } from "../src/lib/safety.ts";

const t = fs.readFileSync(process.argv[2], "utf8");
function parse(txt) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) {
      if (c === '"') { if (txt[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (cell !== "" || row.length) { row.push(cell); rows.push(row); row = []; cell = ""; }
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}
const data = parse(t).slice(1).filter((r) => (r[7] || "").length >= 12 && r[7] !== "(left blank)");
let oldHits = 0, newHits = 0;
const dropped = [], kept = [];
for (const r of data) {
  const a = r[7];
  const o = safeguardingHeuristic(a);
  const n = reflectionDisclosureHeuristic(a);
  if (o) oldHits++;
  if (n) { newHits++; kept.push(r); }
  if (o && !n) dropped.push(r);
}
console.log("prose answers:", data.length, "| old layer flags:", oldHits, "| new gate flags:", newHits, "| dropped by gate:", dropped.length);
console.log("\n=== DROPPED (read each - any genuine disclosure here is a recall bug) ===");
for (const r of dropped) console.log("-", r[2].slice(0, 28), "|", JSON.stringify(r[7].slice(0, 160)));
console.log("\n=== KEPT ===");
for (const r of kept) console.log("+", r[2].slice(0, 28), "|", JSON.stringify(r[7].slice(0, 160)));
