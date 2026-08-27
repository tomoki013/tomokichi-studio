/**
 * Draws `public/assets/invite-preview.png` — the picture a messaging app shows
 * beside a Remeet invitation, and the hero of the invitation page itself.
 *
 * Run `node scripts/build-invite-preview.mjs` after changing it. The PNG is
 * committed: every link preview asks for it, and it never differs.
 *
 * It borrows the app's own idiom — two places, an arc between them, something
 * crossing it — but carries **no** place names, no dates and no countdown. A
 * link preview is drawn by somebody else's software, on somebody else's
 * screen, and often in a group chat the invitation was never meant for. What
 * belongs to the two people stays in the app.
 */
import sharp from "sharp";

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#bcd9ee"/>
      <stop offset="30%" stop-color="#f3dcc6"/>
      <stop offset="60%" stop-color="#f9cfa4"/>
      <stop offset="100%" stop-color="#f2ac74"/>
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="100%" r="58%">
      <stop offset="0%" stop-color="#fffaf0" stop-opacity="0.95"/>
      <stop offset="55%" stop-color="#ffeccf" stop-opacity="0.3"/>
      <stop offset="100%" stop-color="#ffeccf" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="sea" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#e59d64"/>
      <stop offset="100%" stop-color="#8f5439"/>
    </linearGradient>
    <linearGradient id="reflection" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#fff3dc" stop-opacity="0.7"/>
      <stop offset="100%" stop-color="#fff3dc" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect width="1200" height="630" fill="url(#sky)"/>
  <ellipse cx="600" cy="546" rx="580" ry="300" fill="url(#glow)"/>

  <g fill="#ffffff" opacity="0.4">
    <ellipse cx="214" cy="118" rx="112" ry="22"/>
    <ellipse cx="276" cy="142" rx="138" ry="17"/>
    <ellipse cx="972" cy="96" rx="120" ry="21"/>
    <ellipse cx="922" cy="120" rx="82" ry="14"/>
  </g>

  <!--
    The two ends of a reunion and the way between them — the same shape the
    app draws on Home, with the names left off. Which two places they are is
    exactly the part that does not belong in a chat window.
  -->
  <path d="M292 452 C 452 300, 748 300, 908 452"
        fill="none" stroke="#b7743f" stroke-opacity="0.5"
        stroke-width="5" stroke-linecap="round" stroke-dasharray="2 22"/>

  <g fill="#f2f7fb" stroke="#c8794a" stroke-width="6">
    <circle cx="292" cy="452" r="15"/>
    <circle cx="908" cy="452" r="15"/>
  </g>

  <g transform="translate(600 337) rotate(90)" fill="#5c3a24">
    <path d="M0 -30 L8 -8 L30 2 L30 10 L8 6 L4 24 L14 30 L14 34 L0 30 L-14 34
             L-14 30 L-4 24 L-8 6 L-30 10 L-30 2 L-8 -8 Z"/>
  </g>

  <!-- The wordmark sits left of centre so the ♡ can follow it without the
       pair drifting off axis. -->
  <text x="560" y="216" text-anchor="middle"
        font-family="Georgia, 'Times New Roman', serif" font-size="112" fill="#2f2016" letter-spacing="5">Remeet</text>
  <text x="782" y="206" font-family="Georgia, serif" font-size="52" fill="#dd7f42">&#9825;</text>

  <circle cx="600" cy="546" r="52" fill="#fff6e4"/>
  <rect x="0" y="546" width="1200" height="84" fill="url(#sea)"/>
  <path d="M528 546 L672 546 L644 630 L556 630 Z" fill="url(#reflection)"/>
  <rect x="0" y="544" width="1200" height="3" fill="#fff3dc" opacity="0.5"/>
</svg>`;

await sharp(Buffer.from(svg))
  .png({ compressionLevel: 9 })
  .toFile("public/assets/invite-preview.png");
console.log("public/assets/invite-preview.png");
