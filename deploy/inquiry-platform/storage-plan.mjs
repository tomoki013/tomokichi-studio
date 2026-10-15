#!/usr/bin/env node
// Offline SQL only: never runs Wrangler, migrations or deployments.
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const [phase, slug, table, limit] = process.argv.slice(2);
const plan = JSON.parse(readFileSync(resolve(here, "storage-plan.json"), "utf8"));
const project = plan.projects.find((entry) => entry.slug === slug);
if (!project || !["prepare", "copy", "verify", "cutover", "tables"].includes(phase))
  throw new Error(
    "Usage: storage-plan.mjs <prepare|copy|verify|cutover|tables> <registered slug> [table] [batch-size]",
  );
const result = spawnSync(
  process.execPath,
  [
    resolve(here, "run.mjs"),
    "storage",
    phase,
    project.slug,
    project.prefix,
    ...(table ? [table] : []),
    ...(limit ? [limit] : []),
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
