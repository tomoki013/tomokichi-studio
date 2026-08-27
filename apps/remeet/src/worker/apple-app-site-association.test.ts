import { describe, expect, it } from "vitest";

import { appleAppSiteAssociation } from "./apple-app-site-association";

describe("the associated-domains file", () => {
  it("claims the invitation path and nothing else", () => {
    const parsed = JSON.parse(appleAppSiteAssociation("7GU925RQ99.io.tmkch.remeet"));
    const detail = parsed.applinks.details[0];
    expect(detail.appIDs).toEqual(["7GU925RQ99.io.tmkch.remeet"]);
    expect(detail.components).toEqual([{ "/": "/i/*", comment: "Remeet invitation links" }]);
  });
});
