// Keeps the skill's check script as a test: a later edit that swaps a viaSocket id fails here, not in front of a user.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { spawnSync } from "node:child_process";

test("every viaSocket id in src/ and server/ resolves against the live catalog", async (t) => {
  if (!fs.existsSync("viasocket-check.mjs")) return t.skip("run: curl -fsSL https://flow.viasocket.com/viasocket-check.mjs -o viasocket-check.mjs");
  try { await fetch("https://flow.sokt.io/func/scri12BSufQM?key=gmail", { signal: AbortSignal.timeout(8000) }); }
  catch { return t.skip("viaSocket catalog not reachable from here"); }
  const run = spawnSync(process.execPath, ["viasocket-check.mjs", "src", "server"], { encoding: "utf8", timeout: 90_000 });
  assert.equal(run.status, 0, run.stdout + run.stderr);
});
