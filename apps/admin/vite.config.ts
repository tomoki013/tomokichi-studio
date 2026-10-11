import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      // `@inquiry-platform/core` imports the SDK, which this workspace supplies
      // as apps/admin's own dependency (see the override in pnpm-workspace.yaml).
      "@inquiry-platform/sdk": fileURLToPath(
        new URL("./node_modules/@inquiry-platform/sdk/src/index.ts", import.meta.url),
      ),
    },
  },
  build: {
    // What `wrangler deploy` uploads as static assets.
    outDir: "dist",
    emptyOutDir: true,
  },
  server: {
    port: 4330,
    proxy: {
      // Local development talks to a locally running inquiry-platform gateway.
      "/api": "http://127.0.0.1:8790",
    },
  },
});
