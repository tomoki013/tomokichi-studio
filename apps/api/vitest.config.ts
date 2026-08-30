import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

/**
 * A stand-in for Admin Core.
 *
 * `wrangler.jsonc` binds `ADMIN_CORE` to `tomokichi-admin-core`, and workerd
 * refuses to start at all when a Service Binding names a Worker that is not
 * defined — so without something here every test in this Worker fails before a
 * single assertion runs.
 *
 * The stub answers nothing: the entrypoint has no methods, so an RPC call to it
 * rejects. That is deliberate. `src/services/admin-bridge.ts` is best-effort by
 * design — a Remeet report must still reach the operator by mail, and the phone
 * must still get its 201, when Admin is down or mid-deploy. Running the suite
 * against an unavailable Admin keeps that guarantee under test rather than
 * assuming it.
 */
const adminCoreStub = {
  name: "tomokichi-admin-core",
  compatibilityDate: "2026-07-23",
  modules: true,
  script: [
    'import { WorkerEntrypoint } from "cloudflare:workers";',
    "export class AdminCore extends WorkerEntrypoint {}",
    "export default {",
    '  fetch: () => new Response("admin core unavailable", { status: 503 }),',
    "};",
  ].join("\n"),
};

export default defineConfig({
  plugins: [
    cloudflareTest({
      wrangler: {
        configPath: "./wrangler.jsonc",
      },
      miniflare: {
        workers: [adminCoreStub],
      },
    }),
  ],
  test: {
    include: ["src/**/*.test.ts"],
  },
});
