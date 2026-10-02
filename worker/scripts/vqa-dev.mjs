/* Start the worker locally, run the given walks against it, stop it.
 *
 *   node scripts/vqa-dev.mjs "node scripts/vqa-dashboard.mjs 375 812 phone" "node scripts/vqa-cv-pdf.mjs"
 *
 * Each argument is one command, run in turn with BASE pointing at the
 * local worker. The server lives exactly as long as this script: a dev
 * server left running in the background was killed half-way through a
 * walk more than once, and a walk against a half-dead server reports
 * faults that are not there.
 *
 * QA-only. Local dev has no model key, so walks run here must not use
 * --model; the AI routes are exercised against production instead. */
import { spawn, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = process.env.PORT || "8799";
const BASE = `http://127.0.0.1:${PORT}`;
const commands = process.argv.slice(2);
if (!commands.length) {
  console.log('usage: node scripts/vqa-dev.mjs "<command>" ["<command>" ...]');
  process.exit(2);
}

async function answers() {
  try { return (await fetch(`${BASE}/health`)).ok; } catch { return false; }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Something already on the port would be tested instead of this code. */
if (await answers()) {
  console.log(`something is already answering on ${BASE} - stop it first`);
  process.exit(2);
}

const server = spawn(`npx wrangler dev --port ${PORT} --ip 127.0.0.1`, {
  cwd: root, shell: true, stdio: ["ignore", "pipe", "pipe"],
});
let log = "";
server.stdout.on("data", (d) => { log += d; });
server.stderr.on("data", (d) => { log += d; });

function stop() {
  /* The shell started node, which started the runtime: on Windows only
   * a tree kill reaches all three. */
  if (process.platform === "win32") spawnSync("taskkill", ["/pid", String(server.pid), "/T", "/F"], { stdio: "ignore" });
  else server.kill("SIGTERM");
}

let worst = 0;
try {
  let up = false;
  for (let i = 0; i < 90 && !up && server.exitCode === null; i++) {
    up = await answers();
    if (!up) await sleep(1000);
  }
  if (!up) {
    console.log(`the local worker did not start:\n${log.slice(-1500)}`);
    worst = 1;
  } else {
    for (const command of commands) {
      console.log(`\n$ ${command}`);
      const run = spawnSync(command, { cwd: root, shell: true, stdio: "inherit", env: { ...process.env, BASE } });
      worst = Math.max(worst, run.status ?? 1);
    }
  }
} finally {
  stop();
}
process.exit(worst);
