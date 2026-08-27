import type { NewsPost } from "@tomokichi/app-site/NewsFeed.astro";

const newsPostsJa: NewsPost[] = [
  {
    id: "version-1",
    date: "2026.07.24",
    datetime: "2026-07-24",
    badge: "お知らせ",
    title: "Tripory公式ブランドサイトを公開しました",
    summary:
      "旅のタイムライン・写真・メモを中心に、Triporyの世界観を紹介するサイトを公開しました。",
    body: [
      "Triporyは現在App Store公開準備中です。旅そのものを記憶として残す体験を、サイトでも先に触れられるようにしました。",
      "記録は端末内に保存され、アカウント登録は必要ありません。",
    ],
  },
];

const newsPostsEn: NewsPost[] = [
  {
    id: "version-1",
    date: "2026.07.24",
    datetime: "2026-07-24",
    badge: "Update",
    title: "The official Tripory brand site is live",
    summary: "A site focused on journeys — timeline, photos and notes — not just a map.",
    body: [
      "Tripory is preparing for the App Store. This site shares the product’s world while the listing is still on its way.",
      "Records stay on your device and no account is required.",
    ],
  },
];

export function getNewsPosts(lang: "ja" | "en"): NewsPost[] {
  return lang === "ja" ? newsPostsJa : newsPostsEn;
}
