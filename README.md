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
