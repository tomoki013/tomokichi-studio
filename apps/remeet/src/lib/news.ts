import type { NewsPost } from "@tomokichi/app-site/NewsFeed.astro";

const newsPostsJa: NewsPost[] = [
  {
    id: "site-launch",
    date: "2026.08.01",
    datetime: "2026-08-01",
    badge: "お知らせ",
    title: "Remeet公式ブランドサイトを公開しました",
    summary:
      "機能、使い方、ウィジェット、料金、FAQ、プライバシーポリシー、利用規約をまとめて掲載しています。",
    body: [
      "Remeetの公式ブランドサイトを公開しました。大切な人との次の再会までのカウントダウンと、待っている間の記録というアプリの位置づけを、公開準備中の段階からそのままお伝えしています。",
      "現時点ではApp Storeへのリンクはありません。配信の準備が整い次第、サイトからもご案内します。",
      "Remeetは独自アカウント不要です。最初の再会は無料で共有でき、2回目以降はShare Passを使って1人のパートナーとiCloud共有できます。詳細は料金・プライバシーポリシー・利用規約をご確認ください。",
    ],
  },
];

const newsPostsEn: NewsPost[] = [
  {
    id: "site-launch",
    date: "2026.08.01",
    datetime: "2026-08-01",
    badge: "Update",
    title: "The official Remeet brand site is now live",
    summary: "Features, how-to, widgets, pricing, FAQ, Privacy Policy, and Terms—in one place.",
    body: [
      "The official Remeet brand site is live. It explains the countdown to a reunion and the on-device records you keep while waiting—while the app is still preparing for release.",
      "There is no App Store link yet. When distribution is ready, we will share it here as well.",
      "Remeet needs no proprietary account. Share your first reunion for free, then use a Share Pass for each additional reunion shared with one partner through iCloud. See Pricing, Privacy, and Terms for details.",
    ],
  },
];

export function getNewsPosts(lang: "ja" | "en"): NewsPost[] {
  return lang === "ja" ? newsPostsJa : newsPostsEn;
}
