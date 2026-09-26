import { describe, expect, it } from "vitest";
import wranglerSource from "../wrangler.jsonc?raw";
import { supportApps } from "./support/types";

/** `wrangler.jsonc` without its comments. No trailing commas are used there. */
function wranglerConfig(): {
  services: { binding: string; entrypoint?: string; props?: Record<string, unknown> }[];
} {
  const withoutComments = wranglerSource.replace(
    /("(?:[^"\\]|\\.)*")|\/\/[^\n]*|\/\*[\s\S]*?\*\//g,
    (_, s) => s ?? "",
  );
  return JSON.parse(withoutComments);
}

describe("INQUIRY binding", () => {
  const binding = wranglerConfig().services.find((service) => service.binding === "INQUIRY");

  it("reaches the platform's intake door, never the whole of it", () => {
    expect(binding?.entrypoint).toBe("Intake");
    expect(wranglerConfig().services.some((service) => service.entrypoint === "AdminCore")).toBe(
      false,
    );
  });

  it("is granted every app the support form offers, and Remeet for reports", () => {
    const projects = binding?.props?.projects as string[];
    for (const app of supportApps.filter((slug) => slug !== "other")) {
      expect(projects).toContain(app);
    }
    expect(projects).toContain("remeet");
    // "other" is the form's way of saying "no app in particular".
    expect(binding?.props?.allowUnassigned).toBe(true);
  });
});
