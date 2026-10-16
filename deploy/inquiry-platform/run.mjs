#!/usr/bin/env node
// Runs inquiry-platform's own deploy script against Tomokichi's configuration
// in this directory.
//
//   node deploy/inquiry-platform/run.mjs check
//   node deploy/inquiry-platform/run.mjs migrate
//   node deploy/inquiry-platform/run.mjs seed [--dry-run]
//   node deploy/inquiry-platform/run.mjs deploy <api|gateway|mail-ingress|all> [--dry-run]
//
// Without an override the Workers follow apps/api's SDK tag. release.json
// may pin a compatible Worker patch and must record its exact compatible SDK.
// Review that pin together with any SDK upgrade. The selected release is
// cloned into .cache/inquiry-platform/<tag> once and reused.
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../..");
const REMOTE = "https://github.com/tomoki013/inquiry-platform.git";

const pkg = JSON.parse(readFileSync(join(repo, "apps/api/package.json"), "utf8"));
const spec = pkg.dependencies?.["@inquiry-platform/sdk"] ?? "";
const sdkTag = /#([^&]+)/.exec(spec)?.[1];
// A compatible Worker security patch can be pinned independently without
// rebuilding unrelated sites or changing their SDK dependency graph.
const releasePath = join(here, "release.json");
const release = existsSync(releasePath) ? JSON.parse(readFileSync(releasePath, "utf8")) : null;
if (release && (release.compatibleSdk !== sdkTag || !/^v\d+\.\d+\.\d+$/.test(release.tag))) {
  console.error("The platform release pin does not match the current SDK; review release.json together with the SDK upgrade.");
  process.exit(1);
}
const tag = release?.tag ?? sdkTag;
if (!sdkTag || !tag) {
  console.error(`Cannot read a release tag from @inquiry-platform/sdk ("${spec}") in apps/api.`);
  process.exit(1);
}

function run(cwd, bin, args) {
  const result = spawnSync(bin, args, { cwd, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// An explicit local checkout is useful for offline storage SQL generation and
// staging rehearsals before a release is published.
// biome-ignore lint/suspicious/noUndeclaredEnvVars: direct operator script, never a cached Turbo task.
const localCheckout = process.env.INQUIRY_PLATFORM_CHECKOUT;
const checkout = localCheckout
  ? resolve(localCheckout)
  : join(repo, ".cache/inquiry-platform", tag);
if (!existsSync(join(checkout, "package.json"))) {
  console.log(`Fetching inquiry-platform ${tag}`);
  run(repo, "git", ["clone", "--quiet", "--depth", "1", "--branch", tag, REMOTE, checkout]);
  run(checkout, "pnpm", ["install", "--frozen-lockfile"]);
}

console.error(`inquiry-platform ${tag} (${checkout})`);
run(checkout, "node", ["scripts/deploy.mjs", here, ...process.argv.slice(2)]);
