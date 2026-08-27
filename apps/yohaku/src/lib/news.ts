import type { NewsPost } from "@tomokichi/app-site/NewsFeed.astro";

const newsPostsJa: NewsPost[] = [
  {
    id: "released",
    date: "2026.08.17",
    datetime: "2026-08-17",
    badge: "お知らせ",
    title: "Yohakuを、App Storeでリリースしました",
    summary: "予定のあいだに余白を置くYohakuが、本日よりApp Storeでダウンロードいただけます。",
    body: [
      "Yohakuを本日App Storeでリリースしました。何もしない時間に名前と開始・終了時刻を与え、今日・週・月の3つの画面でその積み重ねを静かに振り返るためのアプリです。",
      "基本機能はすべて無料です。無料版には控えめなバナー広告が表示される場合がありますが、買い切り¥400の「広告を永久に削除」で非表示にできます。サブスクリプションではありません。",
      "余白の記録は端末内に保存され、アカウント登録は不要です。iPhone・iOS 17以降に対応し、18言語で利用できます。",
    ],
  },
  {
    id: "site-launch",
    date: "2026.08.01",
    datetime: "2026-08-01",
    badge: "お知らせ",
    title: "Yohaku公式ブランドサイトを公開しました",
    summary: "Yohakuの考え方から使い方、料金、サポートまでを、ひとつの場所にまとめました。",
    body: [
      "Yohakuの公式ブランドサイトを公開しました。アプリが生まれた背景、Today・Week・Monthでできること、日々の使い方を、実際の画面と一緒に紹介しています。",
      "Yohakuは、予定を増やすためのアプリではありません。何もしない時間や、ひと息つく時間を先に置いておくための小さな道具です。",
    ],
  },
];

const newsPostsEn: NewsPost[] = [
  {
    id: "released",
    date: "2026.08.17",
    datetime: "2026-08-17",
    badge: "Update",
    title: "Yohaku is now available on the App Store",
    summary:
      "Yohaku, for leaving room between your plans, is available to download starting today.",
    body: [
      "Yohaku is live on the App Store today. It gives unplanned time a name, a start and an end, then lets you look back on that rhythm across Today, Week and Month.",
      "Every core feature is free. The free version may show unobtrusive banner ads; a one-time ¥400 “Remove ads permanently” purchase removes them. It is not a subscription.",
      "Spaces stay on your device — no account required. Requires an iPhone on iOS 17 or later, and is available in 18 languages.",
    ],
  },
  {
    id: "site-launch",
    date: "2026.08.01",
    datetime: "2026-08-01",
    badge: "Update",
    title: "The official Yohaku site is now live",
    summary:
      "The idea, the app, practical guides, pricing and support—now together in one quiet place.",
    body: [
      "The official Yohaku site is now live. It introduces why the app exists and what Today, Week and Month do, with real screens and practical guidance.",
      "Yohaku is not another way to add plans. It is a small tool for leaving time to do nothing, or simply to breathe.",
    ],
  },
];

export function getNewsPosts(lang: "ja" | "en"): NewsPost[] {
  return lang === "ja" ? newsPostsJa : newsPostsEn;
}
