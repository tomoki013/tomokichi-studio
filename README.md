# tomokichi studio

Tomokichiの小さなアプリをまとめたpnpm + Turborepo monorepoです。

## Public URLs

- Main: `https://tmkch.io`
- Remeet: `https://remeet.tmkch.io`
- Tripory: `https://tripory.tmkch.io`
- Colorvia: `https://colorvia.tmkch.io`
- Yohaku: `https://yohaku.tmkch.io`
- Quiet Solitaire: `https://solitaire.tmkch.io`
- Support API v1: `https://api.tmkch.io/api/v1/support`
- Remeet Invite API v1: `https://api.tmkch.io/remeet/v1/invites`

各ブランドのプライバシーポリシー、利用規約、特定商取引法に基づく表記は、
それぞれ `/privacy`、`/terms`、`/commercial-transactions` で公開します。
サポート窓口は `support@tmkch.io` と共通お問い合わせフォームです。

## Journal

`tmkch.io` is not an app list — it shows what was noticed, what came of it, and
what didn't. Entries live in `apps/main/src/content/journal/<lang>/<slug>.md`
and are plain Markdown:

```markdown
---
title: 何もしない時間まで、有効活用しようとしていた
date: 2026-07-22
category: thought   # daily | living | city | travel | making | thought | experiment
summary: 一覧に出る一〜二行。
products: [yohaku]  # そのプロダクトのページから逆リンクされる
related: [studio-rebuild]
current: false      # トップの「今、考えていること」に出す（各言語1件）
draft: false
---
```

The slug is shared across `ja/` and `en/`, which is what lets the language
switcher stay on the same entry. Short notes and long pieces use the same
collection on purpose — the home page mixes them without the site turning into
a feed. `products` here and `origin` on the product are the two halves of the
Journal ↔ Products cross-link.

## Local development

```bash
pnpm install
pnpm dev
```

各アプリは個別にも起動できます。

```bash
pnpm --filter @tomokichi/main dev     # http://localhost:4321
pnpm --filter @tomokichi/remeet dev   # http://localhost:4322
pnpm --filter @tomokichi/tripory dev  # http://localhost:4323
pnpm --filter @tomokichi/api dev      # http://localhost:8787
```

## SEO

Every site serves its own `robots.txt` and `sitemap.xml`, generated at build
time by the `seoAssets()` integration in each `astro.config.mjs`. The sitemap is
read back out of the built HTML, so it lists exactly the pages that shipped an
indexable canonical — adding a page needs no sitemap edit, and the two cannot
drift apart.

Search and AI-search crawlers (`Googlebot`, `Bingbot`, `OAI-SearchBot`,
`Claude-SearchBot`, `Claude-User`) are allowed explicitly. Model-training
crawlers are a separate decision, kept in one place: `aiTraining` in
`packages/app-site/src/seo.ts`, currently `allow`, which is the policy these
sites have always had. Changing it does not touch anything else.

Structured data lives in `packages/app-site/src/seo.ts`. The studio is one
entity — `https://tmkch.io/#studio` — referenced from every site, and each app
has one `@id` shared between tmkch.io and its brand site. Nothing there may
claim what the page does not: no legal entity, no ratings, and no `offers` for
an app that is not on the App Store yet.

## Support form

The shared support form at `/support` posts to `api.tmkch.io`, which the Remeet
and Colorvia apps also use.

Cloudflare Turnstile sits in front of the **web form only** — the apps have no
browser to solve a challenge in, so requiring a token of them would silently
break support from inside them. It is off until both halves are configured, and
until then the form behaves exactly as it did before:

1. Create a Turnstile widget in the Cloudflare dashboard for `tmkch.io`.
2. Set the site key as the repository variable `PUBLIC_TURNSTILE_SITE_KEY`.
   It is public, baked in at build time; with none set no widget renders and
   the third-party script is not loaded at all.
3. Set the secret with `pnpm -w cf secret put TURNSTILE_SECRET_KEY`. With no
   secret, the API verifies nothing.

The widget uses `interaction-only`, so it stays invisible unless it actually
has something to ask. Turn both on together: a site key without a secret means
a widget that verifies nothing, and a secret without a site key rejects every
real sender.

The widget can be created from the CLI. `wrangler` is a dependency of each app
rather than the workspace root, so `pnpm -w cf` is the way to reach it — it runs
wrangler against the API Worker, which is where every secret here lives:

```bash
pnpm -w cf turnstile widget create "tmkch.io support" --domain tmkch.io --mode managed
```

Run `wrangler login` first: an older token predates the Turnstile scope, and
`pnpm -w cf whoami` names any scope that is missing.

The apps carry a shared key instead, sent as `X-Support-Client`, because they
have no browser to challenge. Without it Turnstile would be decorative —
anything could claim `source: "remeet-ios"` and skip the token. Set it in the
apps first, then here:

```bash
openssl rand -hex 24 | pnpm -w cf secret put SUPPORT_CLIENT_KEY
```

## Cloudflare CLI

`wrangler` is installed per app, not at the workspace root, so a bare
`wrangler` — or `pnpm exec wrangler` from the root — finds nothing. Use:

```bash
pnpm -w cf whoami
```

`-w` reaches the root script, so this works from any app directory as well as
from the root. It runs against `apps/api`, which is the right target for every
secret in this setup and harmless for account-level commands like `turnstile`
and `whoami`. To drive a different Worker, filter it directly:

```bash
pnpm --filter @tomokichi/main exec wrangler versions list
```

## Admin

`admin.tmkch.io` is the shared operations screen for every Studio app —
moderation reports, support conversations, and the app registry. It is three
Workers, and only one of them is on the internet:

- `apps/admin-web` — React + Hono behind Cloudflare Access. Its only binding is
  a Service Binding to Admin Core.
- `apps/admin-core` — D1, R2 and every domain rule. No route, no `workers.dev`.
- `apps/mail-ingress` — receives `support@tmkch.io`, stores the message, and
  forwards it to the address that was already receiving it.

`apps/api` hands Admin a copy of each Remeet report and support-form message
through `src/services/admin-bridge.ts`. That path is additive and best-effort:
with no `ADMIN_CORE` binding, or with Admin Core down, reports and support mail
behave exactly as they did before.

Setup, the deployment order, and the Email Routing switchover are in
[`apps/admin-core/README.md`](apps/admin-core/README.md).

## Checks

```bash
pnpm check
pnpm test
pnpm build
pnpm check:seo
```

## Cloudflare deployment

各アプリは専用のWrangler設定を持つCloudflare Workers Static Assetsとして個別にデプロイできます。

- `apps/main/wrangler.jsonc` → `tomokichi-main`
- `apps/remeet/wrangler.jsonc` → `tomokichi-remeet`
- `apps/tripory/wrangler.jsonc` → `tomokichi-tripory`
- `apps/api/wrangler.jsonc` → `tomokichi-api`

GitHub ActionsのRepository secretsに `CLOUDFLARE_API_TOKEN` と `CLOUDFLARE_ACCOUNT_ID` を設定し、Repository variable `CLOUDFLARE_DEPLOY_ENABLED=true` を設定してください。`main`ブランチに変更をpushすると、変更されたアプリだけがビルド・デプロイされます。Cloudflareの設定前はデプロイjobが自動的にskipされるため、CIを赤くしません。各デプロイworkflowはActionsから手動実行もできます。
