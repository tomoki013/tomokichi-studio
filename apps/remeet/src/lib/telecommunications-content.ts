import type { TelecomSection } from "@tomokichi/app-site/telecommunications";

/** The short description shown directly below the Article 16 disclosure. */
export const remeetTelecommunicationsSummary: [string, string] = [
  "Remeetは、Apple iCloud / CloudKitを利用し、特定の利用者間で予定、写真、記録、メッセージ、リアクション等を共有・同期します。",
  "Remeet uses Apple iCloud and CloudKit to share and synchronise plans, photos, records, messages and reactions between specific users.",
];

/**
 * Remeet-specific important-matters copy. The shared component owns the
 * structure; this file owns the claims about this app and its links.
 */
export const remeetTelecommunicationsSections: TelecomSection[] = [
  {
    heading: ["このページについて", "About this disclosure"],
    body: [
      "本ページは、電気通信事業法第16条に基づく届出に関する事業者情報と、Remeetの通信機能の概要を掲載しています。最新の内容はこのWebサイト版を正本とし、アプリ内の控えはオフライン時の参照用です。",
      "This page publishes the operator information for the Article 16 notification and an overview of Remeet's communications. This website is the authoritative copy; the in-app version is only an offline reference.",
    ],
    links: [
      {
        label: ["電気通信事業法（e-Gov）", "Telecommunications Business Act (e-Gov)"],
        href: [
          "https://laws.e-gov.go.jp/law/359AC0000000086",
          "https://laws.e-gov.go.jp/law/359AC0000000086",
        ],
      },
      { label: ["利用規約", "Terms of Service"], href: ["/ja/terms", "/terms"] },
      { label: ["プライバシーポリシー", "Privacy Policy"], href: ["/ja/privacy", "/privacy"] },
      {
        label: ["特定商取引法に基づく表記", "Commercial Transactions"],
        href: ["/ja/commercial-transactions", "/commercial-transactions"],
      },
    ],
  },
  {
    heading: ["サービスの内容", "Service"],
    body: [
      "Remeetは、再会までの予定や待っている間の記録を管理するiPhoneアプリです。共有を有効にした再会では、予定、写真、記録、メッセージ、リアクション等が、招待を承認した1人のパートナーとの間でApple iCloud / CloudKitを通じて共有・同期されます。Remeet自体は電話番号、SIM、音声通話または移動体通信回線を提供しません。",
      "Remeet is an iPhone app for managing reunion plans and records from the time spent apart. When sharing is enabled, plans, photos, records, messages and reactions are shared and synchronised through Apple iCloud / CloudKit with the one partner who accepts the invitation. Remeet itself does not provide phone numbers, SIM cards, voice calls or mobile network access.",
    ],
  },
  {
    heading: ["利用条件・料金", "Conditions and charges"],
    body: [
      "独自アカウントの登録は不要です。個人利用と最初の共有は無料です。追加の共有にはShare Pass（1枚500円・消費型）をApp Storeのアプリ内課金で購入できます。インターネット接続に必要な通信料は利用者の負担です。",
      "No proprietary account is required. Personal use and the first shared reunion are free. Additional sharing can use a Share Pass (¥500 per consumable pass) purchased through the App Store in-app purchase. You are responsible for internet access and data charges.",
    ],
    links: [
      { label: ["料金の詳細", "Pricing details"], href: ["/ja/pricing", "/pricing"] },
      {
        label: ["販売条件", "Purchase terms"],
        href: ["/ja/commercial-transactions", "/commercial-transactions"],
      },
    ],
  },
  {
    heading: ["通信の秘密・利用者情報", "Communications secrecy and user information"],
    body: [
      "通常利用では、再会の予定・写真・記録等は端末とApple iCloud / CloudKitの間で扱われ、運営者はこれらを収集・閲覧する独自サーバーを保有していません。共有相手からの通報を利用者が送信した場合など、例外的に運営者が受領する情報があります。取扱いの詳細はプライバシーポリシーに記載しています。",
      "During ordinary use, reunion plans, photos and records are handled between the device and Apple iCloud / CloudKit. The operator does not run a proprietary server that collects or views them. The operator may receive information in specific cases, such as when a user submits a report about a partner's content. The Privacy Policy explains the handling in detail.",
    ],
    links: [
      {
        label: ["プライバシーポリシーを読む", "Read the Privacy Policy"],
        href: ["/ja/privacy", "/privacy"],
      },
    ],
  },
  {
    heading: ["外部サービスと送信情報", "External services and transmitted information"],
    body: [
      "共有データとShare Pass台帳はApple iCloud / CloudKitへ、購入の検証と同期情報はApple StoreKitへ送信されます。天気の取得では保存地点の緯度経度をOpen-Meteoへ、地名検索・ジオコーディングでは検索語または座標をAppleへ送信します。広告・同意管理ではGoogle Mobile Ads SDKおよびUMPが技術情報等を送信する場合があります。問い合わせ内容はフォームを送信したときだけ、通報対象の本文・画像は通報したときだけ運営者へ送信されます。",
      "Shared data and the Share Pass ledger are sent to Apple iCloud / CloudKit; purchase verification and synchronisation use Apple StoreKit. Weather lookups send saved coordinates to Open-Meteo, while place search and geocoding send search terms or coordinates to Apple. Google Mobile Ads and UMP may send technical information for ads and consent. Support information is sent only when you submit the form, and reported text or images are sent only when you submit a report.",
    ],
    links: [
      {
        label: ["送信情報の詳細（プライバシーポリシー）", "Transmission details (Privacy Policy)"],
        href: ["/ja/privacy", "/privacy"],
      },
    ],
  },
];
