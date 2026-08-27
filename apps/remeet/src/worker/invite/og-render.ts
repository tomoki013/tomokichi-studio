/**
 * Everything the drawing in `og.ts` deliberately does not know about: the font
 * bytes, and the rasterizer.
 *
 * Split out so `og.ts` stays a pure function from an invitation to a string of
 * SVG — which is what lets `og.test.ts` check what the picture says without
 * booting wasm, and what lets `scripts/preview-og.mjs` render the variants to
 * look at.
 */
// Data modules, declared in wrangler.jsonc. Committed by
// `scripts/build-og-fonts.mjs`; see it for why the Japanese face is a subset.
// Each `@ts-expect-error` sits directly above the import it covers, so import
// sorting cannot separate them.
import coverage from "./fonts/coverage.json";
// @ts-expect-error - data module
import sansFont from "./fonts/sans.bin";
// @ts-expect-error - data module
import serifFont from "./fonts/serif.bin";
import { inviteOGSVG, type OGCopy, type OGReunion } from "./og";
import { renderPNG } from "./raster";

const WIDTH = 1200;

export async function inviteOGImage(reunion: OGReunion, copy: OGCopy): Promise<Uint8Array> {
  return renderPNG(inviteOGSVG(reunion, copy, coverage.sans), {
    fonts: [serifFont as ArrayBuffer, sansFont as ArrayBuffer],
    width: WIDTH,
  });
}
