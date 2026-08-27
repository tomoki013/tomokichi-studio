/**
 * Subsets the two fonts the invitation OG image is drawn with, and records
 * exactly which characters they ended up covering.
 *
 * The Worker has no system fonts: resvg draws no glyph it has not been handed
 * the bytes for. A full Japanese font is 5–7 MB, which is most of a Worker's
 * size budget, so the subset is curated (`og-charset.mjs`) and the renderer
 * checks `coverage.json` before drawing a place name — a label with a character
 * outside the subset is dropped, not rendered as a row of tofu.
 *
 *   node scripts/build-og-fonts.mjs
 *
 * The outputs are committed. Re-run after editing the charset, and bump
 * OG_VERSION in src/worker/invite/og.ts so caches let the new picture through.
 *
 * Both fonts are Noto (SIL Open Font License 1.1) — see public/licenses/.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import subsetFont from "subset-font";

import { SANS_CHARS, SERIF_CHARS } from "./og-charset.mjs";

// Pinned URLs rather than "latest": a font that silently changes metrics
// between builds moves every label in the picture.
const SOURCES = {
  serif:
    "https://fonts.gstatic.com/s/notoserifjp/v33/xn71YHs72GKoTvER4Gn3b5eMRtWGkp6o7MjQ2bzvPebA.ttf",
  sans: "https://fonts.gstatic.com/s/notosansjp/v56/-F6jfjtqLzI2JPCgQBnw7HFyzSD-AsregP8VFM8k75s.ttf",
};

const OUT = "src/worker/invite/fonts";

async function source(name) {
  const cached = `${OUT}/.${name}-source.ttf`;
  try {
    return await readFile(cached);
  } catch {
    // Google Fonts serves TrueType rather than WOFF2 to an old user agent,
    // and resvg reads TrueType only.
    const response = await fetch(SOURCES[name], { headers: { "User-Agent": "Mozilla/4.0" } });
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    await writeFile(cached, bytes);
    return bytes;
  }
}

await mkdir(OUT, { recursive: true });

const built = {};
for (const [name, chars] of [
  ["serif", SERIF_CHARS],
  ["sans", SANS_CHARS],
]) {
  const subset = await subsetFont(await source(name), chars, { targetFormat: "truetype" });
  await writeFile(`${OUT}/${name}.bin`, subset);
  built[name] = { chars, bytes: subset.length };
  console.log(`${name}.bin  ${(subset.length / 1024).toFixed(1)} KB  (${[...chars].length} chars)`);
}

// Sorted codepoints, so the Worker's check is a lookup rather than a rescan of
// the charset source — and so a diff on this file shows what changed.
await writeFile(
  `${OUT}/coverage.json`,
  `${JSON.stringify({ sans: [...new Set([...built.sans.chars])].sort().join("") }, null, 2)}\n`,
);
console.log("coverage.json written");
