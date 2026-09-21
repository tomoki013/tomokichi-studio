/**
 * Draws the site's share images — `public/assets/og.png` (English) and
 * `public/assets/og-ja.png` (Japanese) — from the current Home capture in
 * `src/assets/screens/`, so the picture beside a shared link shows the app as
 * it is now rather than an illustration of how it once looked.
 *
 * Run `node scripts/build-og.mjs` after re-importing screenshots. The PNGs are
 * committed: every crawler asks for them, and they never differ per request.
 *
 * Text is set in the system fonts that librsvg finds through fontconfig, so
 * this is meant to be run on the Mac the screenshots come from.
 */
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const copy = {
  en: {
    tagline: ["Make the wait", "part of your story."],
    line: "Count down to the reunion. Keep the days apart. Free to start.",
    file: "og.png",
  },
  ja: {
    tagline: ["再会までの時間を、", "特別な思い出に。"],
    line: "再会までをカウントダウン。待つ日々を記録。基本機能は無料。",
    file: "og-ja.png",
  },
};

const W = 1200;
const H = 630;
// The phone: a 990x2151 capture scaled so its top ~1.55 screens' worth sits
// inside the card, cropped by the canvas bottom like a device on a desk.
const phone = { x: 760, y: 54, w: 360, radius: 54 };
const screen = { w: phone.w - 2 * 14, radius: 42 };

const serif = "'Hiragino Mincho ProN', 'Yu Mincho', Georgia, serif";
const sans = "'Hiragino Sans', 'Helvetica Neue', Arial, sans-serif";

const escapeXml = (text) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;");

for (const [lang, c] of Object.entries(copy)) {
  const shot = await sharp(join(root, "src/assets/screens", `${lang}-home.webp`))
    .resize({ width: screen.w })
    .png()
    .toBuffer();
  // Only the part that lands inside the canvas is kept; the rest would fall
  // off the bottom edge anyway, and sharp refuses to composite past it.
  const screenH = H - (phone.y + 14);

  // Rounded-corner mask for the screenshot.
  const mask = Buffer.from(
    `<svg width="${screen.w}" height="${screenH}"><rect width="${screen.w}" height="${screenH}" rx="${screen.radius}" fill="#fff"/></svg>`,
  );
  const rounded = await sharp(shot)
    .extract({ left: 0, top: 0, width: screen.w, height: screenH })
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();

  const background = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#e9f1f8"/>
        <stop offset="55%" stop-color="#f8f2ea"/>
        <stop offset="100%" stop-color="#fbe6d3"/>
      </linearGradient>
      <radialGradient id="glow" cx="78%" cy="20%" r="45%">
        <stop offset="0%" stop-color="#ffd9b8" stop-opacity="0.75"/>
        <stop offset="100%" stop-color="#ffd9b8" stop-opacity="0"/>
      </radialGradient>
      <filter id="shadow" x="-20%" y="-10%" width="140%" height="130%">
        <feDropShadow dx="0" dy="26" stdDeviation="22" flood-color="#3a3028" flood-opacity="0.28"/>
      </filter>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#sky)"/>
    <rect width="${W}" height="${H}" fill="url(#glow)"/>
    <!-- the app's own motif: two places and the way between them -->
    <path d="M80 560 C 260 400, 520 400, 700 560" fill="none" stroke="#c98a58" stroke-opacity="0.35" stroke-width="4" stroke-linecap="round" stroke-dasharray="2 18"/>
    <g fill="#f6f9fc" stroke="#d1854f" stroke-width="5">
      <circle cx="80" cy="560" r="11"/>
      <circle cx="700" cy="560" r="11"/>
    </g>
    <!-- device shell -->
    <rect x="${phone.x}" y="${phone.y}" width="${phone.w}" height="${H}" rx="${phone.radius}" fill="#1f1d1c" filter="url(#shadow)"/>
    <rect x="${phone.x + 4}" y="${phone.y + 4}" width="${phone.w - 8}" height="${H}" rx="${phone.radius - 4}" fill="#3b3836"/>
    <text x="84" y="150" font-family="${serif}" font-size="72" fill="#2b2622" letter-spacing="1">Remeet</text>
    <text x="86" y="250" font-family="${serif}" font-size="${lang === "ja" ? 40 : 44}" fill="#3f3833">${escapeXml(c.tagline[0])}</text>
    <text x="86" y="${lang === "ja" ? 310 : 312}" font-family="${serif}" font-size="${lang === "ja" ? 40 : 44}" fill="#3f3833">${escapeXml(c.tagline[1])}</text>
    <text x="86" y="392" font-family="${sans}" font-size="${lang === "ja" ? 19 : 21}" fill="#6a625b">${escapeXml(c.line)}</text>
    <text x="86" y="470" font-family="${sans}" font-size="16" font-weight="700" fill="#b8895a" letter-spacing="3">iPHONE · iOS 26</text>
  </svg>`;

  await sharp(Buffer.from(background))
    .composite([{ input: rounded, left: phone.x + 14, top: phone.y + 14 }])
    .png({ compressionLevel: 9 })
    .toFile(join(root, "public/assets", c.file));
  console.log(`wrote public/assets/${c.file}`);
}
