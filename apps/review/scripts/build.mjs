import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const appDir = new URL("..", import.meta.url);
const reviewsDir = new URL("../src/reviews/", import.meta.url);
const distDir = new URL("../dist/", import.meta.url);

const requiredStrings = ["app", "appName", "version", "build", "youtubeId", "device", "os"];
const youtubeIdPattern = /^[A-Za-z0-9_-]{6,32}$/;
const routePartPattern = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

async function walkJson(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walkJson(path)));
    if (entry.isFile() && extname(entry.name) === ".json") files.push(path);
  }

  return files;
}

function validateReview(data, source) {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new Error(`${source}: review entry must be an object`);
  }

  for (const key of requiredStrings) {
    if (typeof data[key] !== "string" || data[key].trim() === "") {
      throw new Error(`${source}: ${key} must be a non-empty string`);
    }
  }

  if (typeof data.published !== "boolean") {
    throw new Error(`${source}: published must be a boolean`);
  }

  if (!routePartPattern.test(data.app)) {
    throw new Error(`${source}: app contains unsupported URL characters`);
  }

  if (!routePartPattern.test(data.version)) {
    throw new Error(`${source}: version contains unsupported URL characters`);
  }

  if (!youtubeIdPattern.test(data.youtubeId)) {
    throw new Error(`${source}: youtubeId is not a valid YouTube video ID`);
  }

  if (!Array.isArray(data.features) || data.features.length === 0) {
    throw new Error(`${source}: features must contain at least one item`);
  }

  for (const feature of data.features) {
    if (typeof feature !== "string" || feature.trim() === "") {
      throw new Error(`${source}: every feature must be a non-empty string`);
    }
  }

  for (const optional of ["recordedAt", "notes"]) {
    if (
      data[optional] !== undefined &&
      (typeof data[optional] !== "string" || !data[optional].trim())
    ) {
      throw new Error(`${source}: ${optional} must be a non-empty string when provided`);
    }
  }

  return data;
}

function pageShell({ title, description, body, canonical }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow, noarchive, nosnippet, noimageindex">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta name="description" content="${escapeHtml(description)}">
  ${canonical ? `<link rel="canonical" href="${escapeHtml(canonical)}">` : ""}
  <title>${escapeHtml(title)}</title>
  <style>${styles}</style>
</head>
<body>
  <div class="site-shell">
    ${body}
    <footer class="site-footer">Tomokichi Studio</footer>
  </div>
</body>
</html>`;
}

function reviewPage(review) {
  const canonical = `https://review.tmkch.io/${encodeURIComponent(review.app)}/${encodeURIComponent(review.version)}/`;
  const watchUrl = `https://youtu.be/${encodeURIComponent(review.youtubeId)}`;
  const embedUrl = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(review.youtubeId)}?rel=0`;
  const metadata = [
    ["Device", review.device],
    ["OS", review.os],
    ["Version", review.version],
    ["Build", review.build],
    ...(review.recordedAt ? [["Recorded", review.recordedAt]] : []),
  ];

  const body = `<main>
    <header class="review-header">
      <p class="eyebrow">App Store Review Material</p>
      <h1>${escapeHtml(review.appName)}</h1>
      <p class="version-line">Version ${escapeHtml(review.version)} · Build ${escapeHtml(review.build)}</p>
      <p class="review-purpose">This page is provided for App Review and contains a physical-device screen recording demonstrating the submitted build.</p>
    </header>

    <section class="section" aria-labelledby="screen-recording-heading">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Screen recording</p>
          <h2 id="screen-recording-heading">Review walkthrough</h2>
        </div>
        <a class="text-link" href="${escapeHtml(watchUrl)}" target="_blank" rel="noreferrer">Open on YouTube ↗</a>
      </div>
      <div class="video-frame">
        <iframe src="${escapeHtml(embedUrl)}" title="${escapeHtml(`${review.appName} App Review walkthrough`)}" loading="eager" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
      </div>
    </section>

    <section class="section" aria-labelledby="environment-heading">
      <p class="eyebrow">Test environment</p>
      <h2 id="environment-heading">Build information</h2>
      <dl class="metadata-grid">
        ${metadata.map(([label, value]) => `<div class="metadata-item"><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}
      </dl>
    </section>

    <section class="section" aria-labelledby="features-heading">
      <p class="eyebrow">Features demonstrated</p>
      <h2 id="features-heading">What the recording covers</h2>
      <ul class="feature-list">${review.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join("")}</ul>
    </section>

    ${review.notes ? `<section class="section" aria-labelledby="notes-heading"><p class="eyebrow">Additional notes</p><h2 id="notes-heading">For the reviewer</h2><p class="notes">${escapeHtml(review.notes)}</p></section>` : ""}
  </main>`;

  return pageShell({
    title: `${review.appName} — App Review ${review.version}`,
    description: `App Store review material for ${review.appName} version ${review.version}.`,
    canonical,
    body,
  });
}

const styles = `:root{color-scheme:light;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#161616;background:#f5f5f3;font-synthesis:none}*{box-sizing:border-box}html,body{margin:0;min-width:320px;min-height:100vh;background:#f5f5f3}a{color:inherit}.site-shell{width:min(100% - 32px,880px);margin:0 auto;padding:72px 0 40px}.review-header{padding-bottom:40px;border-bottom:1px solid #d8d8d4}.eyebrow{margin:0 0 10px;color:#6a6a66;font-size:.74rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase}h1,h2,p{text-wrap:pretty}h1{margin:0;font-size:clamp(2.5rem,7vw,4.5rem);font-weight:650;letter-spacing:-.055em;line-height:.98}h2{margin:0;font-size:clamp(1.35rem,3vw,1.75rem);font-weight:650;letter-spacing:-.025em}.version-line{margin:18px 0 0;color:#4c4c49}.review-purpose{max-width:680px;margin:24px 0 0;color:#555550;line-height:1.7}.section{padding:40px 0;border-bottom:1px solid #d8d8d4}.section-heading{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:20px}.text-link{flex:0 0 auto;color:#3f3f3c;font-size:.9rem;text-underline-offset:3px}.video-frame{position:relative;overflow:hidden;width:100%;aspect-ratio:16/9;border-radius:14px;background:#111}.video-frame iframe{position:absolute;inset:0;width:100%;height:100%;border:0}.metadata-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:1px;overflow:hidden;margin:22px 0 0;padding:1px;border-radius:12px;background:#d8d8d4}.metadata-item{min-width:0;padding:18px;background:#fff}.metadata-item dt{margin-bottom:7px;color:#6a6a66;font-size:.76rem;font-weight:650;letter-spacing:.08em;text-transform:uppercase}.metadata-item dd{margin:0;overflow-wrap:anywhere}.feature-list{display:grid;gap:12px;margin:22px 0 0;padding:0;list-style:none}.feature-list li{position:relative;padding-left:28px;line-height:1.55}.feature-list li:before{position:absolute;top:0;left:2px;content:"✓";font-weight:700}.notes{max-width:700px;margin:18px 0 0;color:#4f4f4b;line-height:1.7;white-space:pre-line}.site-footer{padding-top:28px;color:#777772;font-size:.8rem}.not-found{max-width:620px;padding:18vh 0}.not-found h1{font-size:clamp(2.25rem,7vw,4rem)}.not-found p:last-child{margin:24px 0 0;color:#555550;line-height:1.7}@media(max-width:640px){.site-shell{width:min(100% - 24px,880px);padding-top:42px}.section-heading{display:block}.text-link{display:inline-block;margin-top:12px}.metadata-grid{grid-template-columns:1fr}}`;

await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

const reviewFiles = await walkJson(reviewsDir.pathname);
const publishedByApp = new Map();
const publishedRoutes = new Set();
let publishedCount = 0;

for (const file of reviewFiles.sort()) {
  const source = relative(appDir.pathname, file);
  const data = validateReview(JSON.parse(await readFile(file, "utf8")), source);

  if (!data.published) continue;

  if (publishedByApp.has(data.app)) {
    throw new Error(
      `${source}: only one published review version is allowed per app (already published: ${publishedByApp.get(data.app)})`,
    );
  }

  const routeKey = `${data.app}/${data.version}`;
  if (publishedRoutes.has(routeKey)) {
    throw new Error(`${source}: duplicate published route ${routeKey}`);
  }

  publishedByApp.set(data.app, data.version);
  publishedRoutes.add(routeKey);

  const outputDir = new URL(`./${data.app}/${data.version}/`, distDir);
  await mkdir(outputDir, { recursive: true });
  await writeFile(new URL("index.html", outputDir), reviewPage(data));
  publishedCount += 1;
}

const notFound = pageShell({
  title: "Review material unavailable — Tomokichi Studio",
  description: "This App Store review material is not currently published.",
  body: `<main class="not-found"><p class="eyebrow">Tomokichi Studio</p><h1>Review material unavailable</h1><p>This review page is not currently published. Please use the URL supplied with the active App Store submission.</p></main>`,
});

await writeFile(new URL("404.html", distDir), notFound);
await writeFile(new URL("robots.txt", distDir), "User-agent: *\nDisallow: /\n");
console.log(`Built review.tmkch.io with ${publishedCount} published review page(s).`);
