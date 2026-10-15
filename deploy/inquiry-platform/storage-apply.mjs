#!/usr/bin/env node
// Each reviewed file is imported atomically, including its migration marker.
// File import avoids D1's 100KB inline-query limit for prepare migrations.
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// biome-ignore lint/suspicious/noUndeclaredEnvVars: direct operator script, never a cached Turbo task.
const checkout = process.env.INQUIRY_PLATFORM_CHECKOUT;
if (!checkout) throw new Error("Set INQUIRY_PLATFORM_CHECKOUT to the verified release checkout");
const [action, phase] = process.argv.slice(2);
const phases = {
  preflight: [20, 20],
  prepare: [21, 27],
  copy: [28, 34],
  cutover: [35, 41],
  seal: [42, 42],
};
if (action !== "verify" && (action !== "apply" || !phases[phase]))
  throw new Error("Usage: storage-apply.mjs verify | apply <preflight|prepare|copy|cutover|seal>");
const cwd = resolve(checkout, "apps/api");
const config = "wrangler.deployment.jsonc";
copyFileSync(join(here, "api.jsonc"), join(cwd, config));
function wrangler(args) {
  const result = spawnSync(
    "pnpm",
    [
      "exec",
      "wrangler",
      "d1",
      "execute",
      "DB",
      "--remote",
      "--config",
      config,
      "--json",
      ...(args[0] === "--command" ? [`--command=${args[1]}`] : args),
    ],
    { cwd, encoding: "utf8", maxBuffer: 8_000_000 },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr);
    throw new Error(`Wrangler failed (${result.status}): ${args[0]}`);
  }
  // Wrangler's file-import spinner can precede --json output.
  const start = result.stdout.search(/^\[\s*[\r\n]/m);
  if (start < 0) throw new Error("Wrangler returned no JSON result");
  return JSON.parse(result.stdout.slice(start));
}
const history = wrangler(["--command", "SELECT name FROM d1_migrations"]);
const applied = new Set(history.flatMap((r) => r.results).map((r) => r.name));
if (!applied.has("0019_sealed_storage_fences.sql"))
  throw new Error("Apply base migrations through 0019 first");
if (action === "verify") {
  const plan = JSON.parse(readFileSync(join(here, "storage-plan.json"), "utf8"));
  const report = [];
  for (const project of plan.projects) {
    const result = wrangler([
      "--command",
      readFileSync(join(here, "storage-checks", `${project.slug}.sql`), "utf8"),
    ]);
    const rows = result.flatMap((r) => r.results);
    if (
      rows.length !== 17 ||
      rows.some((r) => r.mismatches !== 0 || r.source_count !== r.destination_count)
    )
      throw new Error(`Full-column mismatch: ${project.slug}`);
    report.push({ project: project.slug, rows });
    console.log(
      JSON.stringify({
        project: project.slug,
        verifiedTables: rows.length,
        rows: rows.reduce((n, r) => n + r.destination_count, 0),
        mismatches: 0,
      }),
    );
  }
  // biome-ignore lint/suspicious/noUndeclaredEnvVars: private verification destination for this direct script.
  const output = process.env.STORAGE_VERIFICATION_OUTPUT;
  if (output) writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
} else {
  const [min, max] = phases[phase];
  const files = readdirSync(join(here, "storage-migrations"))
    .filter(
      (f) =>
        /^\d{4}_.*\.sql$/.test(f) && Number(f.slice(0, 4)) >= min && Number(f.slice(0, 4)) <= max,
    )
    .sort();
  if (files.length !== max - min + 1) throw new Error("Incomplete migration phase");
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`Already applied: ${file}`);
      continue;
    }
    const sql = readFileSync(join(here, "storage-migrations", file), "utf8");
    const path = join(mkdtempSync(join(tmpdir(), "inquiry-storage-")), file);
    writeFileSync(path, `${sql}\nINSERT INTO d1_migrations(name) VALUES('${file}');\n`, {
      mode: 0o600,
    });
    const result = wrangler(["--file", path]);
    if (!result.every((r) => r.success)) throw new Error(`Failed migration: ${file}`);
    console.log(JSON.stringify({ applied: file, meta: result.map((r) => r.meta) }));
  }
}
