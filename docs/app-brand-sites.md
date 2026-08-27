# App brand site conventions

This document defines the shared structure for Tomokichi app landing pages.

## Shared shell

- Use `@tomokichi/app-site/AppSiteShell.astro`.
- English is served from `/`; Japanese is served from `/ja`.
- Keep the app logo at the left, primary product navigation in the centre, and
  locale plus App Store actions at the right.
- The header remains sticky. After 96px of scrolling it contracts into a compact
  brand pill; hover or keyboard focus expands it so navigation remains available.
- Mobile keeps a full-width compact header and an accessible menu button.
- Use the standard four footer columns: Product, Support, Legal, and Operator
  (運営者情報). Operator links should point to the main site, other apps, and
  support—not a bare “Tomokichi” brand column.
- Contact links open the shared Tomokichi support form with the app query parameter.

### App-specific theming

The shared components own structure and behaviour, but app styles may override
their presentation. Prefer the public custom properties so overrides remain
stable when the shared markup changes:

```css
:root {
  --app-site-ink: #18343a;
  --app-site-accent: #55a7a7;
  --app-site-page-background: #fbfdfc;
  --app-site-header-foreground: #18343a;
  --app-site-header-background: rgb(255 255 255 / 82%);
  --app-site-header-compact-background: rgb(255 255 255 / 90%);
  --app-site-store-background: #fff;
  --app-site-footer-background: #17383d;
  --app-site-footer-foreground: #fff;
  --app-site-footer-link: #c5d4d5;
  --app-site-hero-muted: #667b7e;
  --app-site-notice-background: rgb(255 255 255 / 72%);
}
```

Header borders and shadows, logo shadows, mobile menu colours, footer text
colours, and news-bar hover colours also have matching
`--app-site-*` properties in `app-site-shell.css`. Direct selectors such as
`.app-site-header` and `.app-site-footer` may be overridden when an app needs a
layout variation that cannot be expressed by the theme properties. Scope those
rules through the app's `pageClass` (for example,
`.my-app-page .app-site-header`) so the app override wins regardless of CSS
import order.

## Landing-page hero

- The first viewport must communicate the app, not generic website chrome.
- Include the primary statement, supporting copy, App Store CTA, and a real or
  representative product visual.
- Include a centred `Scroll` affordance with a subtle animated track.
- Include a dated news bar at the bottom of the hero linking to the app’s updates page.
- Render both elements with `@tomokichi/app-site/AppHeroChrome.astro`.
- Leave enough bottom clearance so the scroll affordance and news bar never overlap.

## Required pages

- Privacy Policy, Terms of Service, and the Commercial Transactions disclosure
  (`/commercial-transactions`) must contain product-specific, internally
  consistent content and effective dates.
- Contact must lead to the working shared support form with the correct app selected.
- Customer-support email is `support@tmkch.io`; the form remains the primary route.
- Features, usage, screenshots, FAQ, and updates may be mock content until product
  details are final, but links and responsive layouts must work.

## Product screenshots

Any image that claims to show the app must be a real capture, not a render.

Each app repo owns its capture pipeline — an `AppStoreScreenshotTests` UI test
that drives the iOS Simulator (iPhone 17 Pro Max, 1320x2868) through every
localization and writes the same PNGs submitted to App Store Connect. Two rules
hold there:

- Navigation goes through accessibility identifiers, never translated button
  labels, so one run covers every language.
- Demo data comes from the app's own String Catalog and is entirely fictional.
  No real person, place, or message belongs in a screenshot, and the fixture
  must re-seed on each launch or the first language's data leaks into the rest.

Bring them into a site with:

```sh
node scripts/import-app-screenshots.mjs <slug> <capture-dir> --only ja,en
```

The main site's Apps page gathers screens from every app into one folder, so it
adds a per-app prefix and keeps what earlier runs imported:

```sh
node scripts/import-app-screenshots.mjs main <capture-dir> --only ja,en --prefix <app> --keep
```

Its `AppItem.detail` carries what the app concretely is — highlights, price,
minimum OS, where data lives, languages. Every one of those has to be checkable
against the app or its brand site; an app with nothing verified yet simply has
no `detail`, and one without captures has no `screen`, so nothing on that page
claims to be a screenshot when it isn't.

That downsamples to WebP in `src/assets/screens/`, where Astro resizes per
breakpoint. Render them through the app's local `AppScreen.astro`, which wraps
`@tomokichi/app-site/PhoneFrame.astro` — the shared iPhone 17 Pro frame. Do not
size the bitmap inside a frame from page CSS; the frame owns its geometry, and
a stray `height` or `object-fit` rule on a descendant `img` will distort it.

## SEO and structured data

The shared shell already emits the canonical link, hreflang set, Open Graph and
Twitter tags, and the robots meta. A page gets those right by telling the shell
where it lives, not by writing tags:

- `page` drives the nav highlight. `routePath` drives the canonical URL. They
  are the same for a normal page and differ for a detail route — a news article
  is `page="news" routePath={`news/${post.id}`}`. Getting this wrong makes every
  article canonicalise to the listing, which quietly removes them from search.
- Pages that exist for people but not for search — 404 in particular — pass
  `noindex`. The shell then drops the canonical and hreflang too.
- `robots.txt` and `sitemap.xml` are generated by the `seoAssets()` integration
  in `astro.config.mjs`. The sitemap is read back out of the built HTML, so a
  page is listed exactly when it shipped an indexable self-canonical. There is
  no list to keep up to date, and no way for the two to disagree.
- Canonical URLs carry a trailing slash, because that is the form Cloudflare
  answers with 200.

Structured data comes from `@tomokichi/app-site/seo`:

- `appApplicationGraph()` builds the `SoftwareApplication` plus the studio's
  `Organization`, using the `@id`s that tmkch.io also uses. Both sites therefore
  describe one app and one studio, not two of each.
- `offers` and `downloadUrl` appear only when `appStoreUrl` is passed. An app
  that is not on the store must not have structured data saying it is available,
  whatever the page's "coming soon" wording.
- Never add `aggregateRating` or `review`. There is no rating to report, and an
  invented one is a fabricated claim about a real product.

Every page should also say in ordinary HTML text what the app *is* — one plain
sentence, near the top, naming it. A tagline alone reads well and tells a search
engine or an assistant nothing.

## Quality

- Support English and Japanese on every route.
- Preserve keyboard navigation, reduced-motion behaviour, and mobile layouts.
- Run the app check and production build before handoff.
- Run `pnpm check:seo` after building; it validates the metadata, sitemap and
  robots.txt of every built site.

## Creating a new app site

Run the scaffold command from the workspace root:

```sh
pnpm create:app-site <slug> "<Brand name>"
```

The command chooses the next free local port, creates the bilingual Astro site,
installs the shared shell and hero chrome, adds the standard navigation and
footer structure, creates the required routes, registers the app in the shared
support/footer registry, and updates the lockfile. Registered sites use
`https://<slug>.tmkch.io` as their public URL and keep the corresponding
`workers.dev` deployment URL alongside it. Pass `--port <port>` to choose a port
or `--no-install` to skip the lockfile update.

The same generator is available as `mise run create-app-site -- <slug> "<Brand name>"`.
