import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import viteConfig from "./vite.config";

/** The React screens, under jsdom, plus the small Worker's pure helpers. */
export default defineConfig({
  plugins: [react()],
  resolve: { alias: viteConfig.resolve?.alias },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.tsx", "src/**/*.test.ts"],
    setupFiles: ["./src/client/test-setup.ts"],
  },
});
