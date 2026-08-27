/**
 * What somebody sees when they tap an invitation on a phone that has no Remeet
 * on it yet.
 *
 * Four things and no more: that they were invited, where to get the app, what
 * to do once they have it, and the code to type if the link is on a different
 * device from the app. Notably absent is anything about the reunion itself —
 * no name, no date, no place — and the CKShare URL, which never reaches a
 * browser at all.
 */
export interface LandingCopy {
  lang: "ja" | "en";
  title: string;
  ogDescription: string;
  heading: string;
  lead: string;
  install: string;
  afterInstall: string;
  steps: [string, string];
  codeLabel: string;
  copy: string;
  copied: string;
  selected: string;
  codeHint: string;
  footnote: string;
  /** "あと24日で会えます。" — appended to the description when known. */
  countdown: (days: number) => string;
}

const JA: LandingCopy = {
  lang: "ja",
  title: "Remeetへの招待",
  ogDescription: "次に会う日まで、一緒にRemeetで待とう。",
  heading: "Remeetへの招待が届いています",
  lead: "会えない日々を、再会の思い出に。ふたりで同じ再会を待つためのアプリです。",
  install: "App Storeで入手",
  afterInstall: "Remeetをインストールしたあとに、",
  steps: [
    "このページをもう一度開く（または届いた招待リンクをもう一度タップする）",
    "別の端末で使うときは、下の招待コードを入力する",
  ],
  codeLabel: "招待コード",
  copy: "コピー",
  copied: "コピーしました",
  selected: "選択しました",
  codeHint: "Remeetをインストールしたあと、「招待を受け取った」で入力してください。",
  footnote:
    "参加すると、再会の予定・やりたいこと・待っている間の記録をふたりで見られるようになります。",
  countdown: (days) => (days === 0 ? "再会は今日です。" : `次に会えるまで、あと${days}日。`),
};

const EN: LandingCopy = {
  lang: "en",
  title: "An invitation to Remeet",
  ogDescription: "Wait for the next time you meet, together, in Remeet.",
  heading: "You have been invited to Remeet",
  lead: "Remeet turns the days apart into the story of a reunion — kept by both of you.",
  install: "Get it on the App Store",
  afterInstall: "Once Remeet is installed,",
  steps: [
    "open this page again (or tap the invitation link you were sent)",
    "or, on another device, enter the invitation code below",
  ],
  codeLabel: "Invitation code",
  copy: "Copy",
  copied: "Copied",
  selected: "Selected",
  codeHint: "Enter it under \u201cI received an invitation\u201d once Remeet is installed.",
  footnote:
    "Joining lets you both see the reunion date, the wishes, and the notes kept while waiting.",
  countdown: (days) =>
    days === 0
      ? "The reunion is today."
      : `${days} ${days === 1 ? "day" : "days"} until they meet.`,
};

export function landingCopy(acceptLanguage: string | null): LandingCopy {
  return acceptLanguage?.toLowerCase().includes("ja") ? JA : EN;
}

export interface LandingOptions {
  copy: LandingCopy;
  appStoreURL: string | null;
  siteURL: string;
  inviteCode: string | null;
  /** The page's own address, for `og:url`. */
  pageURL: string;
  /**
   * Whole days until the reunion, or `null` when the invitation carries none —
   * older invitations, and any minted by a build of the app that did not send
   * one. `null` falls the whole page back to the static preview.
   */
  daysRemaining?: number | null;
}

/**
 * Bumped whenever `scripts/build-invite-preview.mjs` is re-run with different
 * art.
 *
 * The site serves images as `immutable` for a year, and the messaging apps
 * that draw link previews cache them for as long as they like. Without a
 * version in the URL, redrawing the picture would leave every phone and every
 * chat window showing the old one — the filename is stable on purpose, so this
 * is what changes.
 */
const PREVIEW_VERSION = "2";

export function landingPage({
  copy,
  appStoreURL,
  siteURL,
  inviteCode,
  pageURL,
  daysRemaining = null,
}: LandingOptions): string {
  const install = appStoreURL ?? siteURL;
  const origin = siteURL.replace(/\/$/, "");
  const staticPreview = `${origin}/assets/invite-preview.png?v=${PREVIEW_VERSION}`;
  // The per-invitation picture when there is a countdown to draw, and the
  // static one otherwise. Both are 1200×630, so the dimensions below hold
  // either way — messaging apps size the card from those before the image
  // itself has loaded.
  const preview = daysRemaining === null ? staticPreview : `${pageURL.replace(/\/$/, "")}/og.png`;
  const description =
    daysRemaining === null
      ? copy.ogDescription
      : `${copy.countdown(daysRemaining)} ${copy.ogDescription}`;
  return `<!doctype html>
<html lang="${copy.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>${escapeHTML(copy.title)} ♡</title>
<link rel="icon" href="/assets/remeet-favicon.png">
<!--
  The preview a messaging app shows is part of the invitation, so it is Remeet's
  to design — that is half the reason invitations are sent as our own URL. It
  says nothing about who is inviting whom: no name, no date, no place, and
  nothing read out of CloudKit.
-->
<meta property="og:type" content="website">
<meta property="og:url" content="${escapeHTML(pageURL)}">
<meta property="og:title" content="${escapeHTML(copy.heading)} ♡">
<meta property="og:description" content="${escapeHTML(description)}">
<meta property="og:image" content="${escapeHTML(preview)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Remeet">
<meta property="og:site_name" content="Remeet">
<meta property="og:locale" content="${copy.lang === "ja" ? "ja_JP" : "en_US"}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escapeHTML(copy.heading)} ♡">
<meta name="twitter:description" content="${escapeHTML(description)}">
<meta name="twitter:image" content="${escapeHTML(preview)}">
<style>
:root { color-scheme: light; }
body {
  margin: 0; min-height: 100dvh; display: grid; place-items: center;
  padding: 2.5rem 1.5rem;
  background: #fbf0e6; color: #2a1c14;
  font-family: ui-sans-serif, -apple-system, "Hiragino Sans", "Noto Sans JP", system-ui, sans-serif;
  line-height: 1.7;
}
main { max-width: 31rem; width: 100%; text-align: center; }
.card {
  background: #fffaf4; border: 1px solid #f2e0cc; border-radius: 1.75rem;
  padding: 0 0 2rem; overflow: hidden;
  box-shadow: 0 1.5rem 3rem rgba(120, 78, 45, .12);
}
.hero { display: block; width: 100%; height: auto; }
.body { padding: 0 1.75rem; }
h1 { font-size: 1.4rem; font-weight: 600; margin: 1.75rem 0 .75rem; line-height: 1.45; }
p { margin: 0 0 1rem; color: #4a382d; }
.cta {
  display: inline-block; margin: 1.25rem 0 .5rem; padding: .95rem 2.5rem;
  border-radius: 999px; background: linear-gradient(135deg, #f0a35f, #e8894a);
  color: #fff; font-weight: 600; text-decoration: none;
  box-shadow: 0 .6rem 1.4rem rgba(232, 137, 74, .35);
}
.steps { list-style: none; margin: 1.5rem 0 0; padding: 0; text-align: left; }
.steps li {
  display: flex; gap: .75rem; align-items: flex-start;
  padding: .8rem 0; border-top: 1px solid #f2e4d4; color: #4a382d; font-size: .95rem;
}
.steps .n {
  flex: none; width: 1.6rem; height: 1.6rem; border-radius: 50%;
  background: #f7e2cd; color: #a35f2c; font-size: .8rem; font-weight: 700;
  display: grid; place-items: center;
}
.code-section { margin-top: 1.75rem; }
.code-label { font-size: .75rem; letter-spacing: .1em; text-transform: uppercase; color: #8a6a52; margin: 0 0 .5rem; }
.code-box {
  display: flex; align-items: center; justify-content: space-between; gap: .5rem;
  padding: .5rem .5rem .5rem .9rem; border-radius: 1rem;
  background: #fdf1e2; border: 1px dashed #e3b98c;
}
.code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  /* Ten characters and a hyphen, on one line, on the narrowest phone there
     is: a code broken across two lines stops reading as one thing to type. */
  font-size: clamp(1.05rem, 5vw, 1.45rem); letter-spacing: .1em;
  font-weight: 600; color: #2a1c14; white-space: nowrap;
  user-select: all; -webkit-user-select: all;
}
.copy {
  flex: none; border: 0; border-radius: .75rem; cursor: pointer;
  padding: .6rem .95rem; font: inherit; font-size: .82rem; font-weight: 600;
  background: #ffffff; color: #a35f2c; box-shadow: 0 .1rem .4rem rgba(120, 78, 45, .12);
}
.copy:disabled { color: #6f8f5f; cursor: default; }
.hint { font-size: .8rem; color: #8a6a52; margin: .6rem 0 0; }
.footnote { font-size: .82rem; color: #7d6553; margin: 1.5rem 0 0; }
</style>
</head>
<body>
<main>
  <div class="card">
    <img class="hero" src="${escapeHTML(preview)}" width="1200" height="630" alt="Remeet">
    <div class="body">
      <h1>${escapeHTML(copy.heading)}</h1>
      <p>${escapeHTML(copy.lead)}</p>
      <a class="cta" href="${escapeHTML(install)}">${escapeHTML(copy.install)}</a>
      <ol class="steps">
        <li><span class="n">1</span><span>${escapeHTML(copy.steps[0])}</span></li>
        <li><span class="n">2</span><span>${escapeHTML(copy.steps[1])}</span></li>
      </ol>
      ${inviteCode ? codeSection(copy, inviteCode) : ""}
      <p class="footnote">${escapeHTML(copy.footnote)}</p>
    </div>
  </div>
</main>
${inviteCode ? COPY_SCRIPT : ""}
</body>
</html>`;
}

/**
 * The code, and a button that saves retyping it.
 *
 * `user-select: all` on the code itself is the fallback that matters: the
 * clipboard API needs a secure context and a permissive browser, and somebody
 * holding an invitation should never be stuck because neither was true.
 */
function codeSection(copy: LandingCopy, inviteCode: string): string {
  return `<div class="code-section">
        <p class="code-label">${escapeHTML(copy.codeLabel)}</p>
        <div class="code-box">
          <span class="code" id="code">${escapeHTML(inviteCode)}</span>
          <button class="copy" id="copy" type="button"
                  data-done="${escapeHTML(copy.copied)}"
                  data-selected="${escapeHTML(copy.selected)}">${escapeHTML(copy.copy)}</button>
        </div>
        <p class="hint">${escapeHTML(copy.codeHint)}</p>
      </div>`;
}

/**
 * Deliberately tiny, and the only script on the page.
 *
 * Three attempts, in decreasing order of how modern they are, because the
 * clipboard API needs a secure context and a browser willing to grant it and
 * neither is the person's problem: write it, then select-and-copy, then just
 * select it. Every path ends with the button saying which one happened, so a
 * tap never looks like nothing.
 */
const COPY_SCRIPT = `<script>
(function () {
  var button = document.getElementById("copy");
  var code = document.getElementById("code");
  if (!button || !code) return;
  var label = button.textContent;

  function flash(text) {
    button.textContent = text;
    button.disabled = true;
    setTimeout(function () {
      button.textContent = label;
      button.disabled = false;
    }, 2000);
  }

  function select() {
    var range = document.createRange();
    range.selectNodeContents(code);
    var selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    var copied = false;
    try {
      copied = document.execCommand("copy");
    } catch (error) {
      copied = false;
    }
    flash(copied ? button.dataset.done : button.dataset.selected);
  }

  button.addEventListener("click", function () {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(code.textContent.trim()).then(function () {
        flash(button.dataset.done);
      }, select);
    } else {
      select();
    }
  });
})();
</script>`;

function escapeHTML(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
