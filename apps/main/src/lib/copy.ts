import { footerAppBrands } from "@tomokichi/app-site/apps";
import { SITE_ORIGINS } from "@tomokichi/app-site/urls";
import type { AppStatus, Locale } from "../data/apps";

type L<T = string> = Record<Locale, T>;

/** Shared navigation + footer + status labels ------------------------------ */

/**
 * The nav follows the studio's own order — what was noticed, what it became,
 * who made it — and ends at the way to reach that person. Privacy and terms
 * stay in the footer: they are read once, not navigated to.
 */
export const nav: { label: L; href: string; match: string }[] = [
  { label: { ja: "記録", en: "Journal" }, href: "/journal", match: "journal" },
  { label: { ja: "つくったもの", en: "Products" }, href: "/products", match: "products" },
  { label: { ja: "私について", en: "About" }, href: "/about", match: "about" },
  { label: { ja: "サポート", en: "Support" }, href: "/support", match: "support" },
];

export interface FooterLink {
  label: L;
  href: string;
  /** External links open in a new tab and skip the locale prefix. */
  external?: boolean;
}

export const footer: {
  tagline: L;
  columns: { title: L; links: FooterLink[] }[];
  copyright: string;
} = {
  tagline: {
    ja: "日常で感じたことを、形にする。",
    en: "Turning what I notice into something.",
  } as L,
  columns: [
    {
      title: { ja: "サイト", en: "Site" } as L,
      links: [
        { label: { ja: "記録", en: "Journal" } as L, href: "/journal" },
        { label: { ja: "つくったもの", en: "Products" } as L, href: "/products" },
        { label: { ja: "私について", en: "About" } as L, href: "/about" },
        { label: { ja: "サポート", en: "Support" } as L, href: "/support" },
      ],
    },
    {
      title: { ja: "つくったもの", en: "Products" } as L,
      links: footerAppBrands.map((app) => ({
        label: { ja: app.name, en: app.name } as L,
        href: app.publicUrl,
        external: true,
      })),
    },
    {
      title: { ja: "規約", en: "Legal" } as L,
      links: [
        { label: { ja: "プライバシー", en: "Privacy" } as L, href: "/privacy" },
        { label: { ja: "利用規約", en: "Terms" } as L, href: "/terms" },
      ],
    },
    {
      title: { ja: "連絡先", en: "Contact" } as L,
      links: [
        {
          label: { ja: "アプリのサポート", en: "App support" } as L,
          href: "/support",
        },
        {
          label: { ja: "仕事のご相談", en: "Work enquiries" } as L,
          href: `${SITE_ORIGINS.personal}/contact`,
          external: true,
        },
      ],
    },
  ],
  copyright: "© 2026 Tomokichi. All rights reserved.",
};

export const statusLabel: Record<AppStatus, L> = {
  released: { ja: "公開中", en: "Available" },
  developing: { ja: "開発中", en: "In development" },
  concept: { ja: "構想中", en: "Concept" },
};

/** The four things kept in mind while making — shared by Home and About. ---- */

export const principles: { title: L; body: L }[] = [
  {
    title: { ja: "丁寧な技術", en: "Careful engineering" },
    body: {
      ja: "見えない部分まで、誠実に。\n長く安心して使えるものに。",
      en: "Honest work, down to the parts no one sees —\nso it stays dependable for a long time.",
    },
  },
  {
    title: { ja: "複雑さを渡さない", en: "No complexity passed on" },
    body: {
      ja: "技術や設定の難しさを、\n使う人に押しつけません。",
      en: "The difficulty of technology and settings\nis never handed to the people who use it.",
    },
  },
  {
    title: { ja: "ちょうどいい密度", en: "The right density" },
    body: {
      ja: "少ないことを正解にせず、\nそのプロダクトに必要な機能と情報量を選びます。",
      en: "Less isn’t automatically better; each product gets\nthe amount of features and information it needs.",
    },
  },
  {
    title: { ja: "小さな遊び心", en: "A little playfulness" },
    body: {
      ja: "主役ではなくても、\nふと気づく楽しさをどこかに残します。",
      en: "Never the main act, but a small moment of delight\nis left somewhere to be found.",
    },
  },
];

export const principlesHeading: L = { ja: "つくるときに考えていること", en: "What I keep in mind" };

/** Home page ---------------------------------------------------------------- */

export const home = {
  metaTitle: {
    ja: "Tomokichi — 日常で感じたことを、形にする。",
    en: "Tomokichi — Turning what I notice into something.",
  } as L,
  hero: {
    eyebrow: {
      ja: "旅と、暮らしと、その途中で気づいたこと",
      en: "Travel, living, and what turns up along the way",
    } as L,
    heading: {
      ja: "日常で感じたことを、\n形にする。",
      en: "Turning what I notice\ninto something.",
    } as L,
    body: {
      ja: "旅先で立ち止まったこと、暮らしの中で引っかかったこと。\nそこから、アプリやWebサイト、小さな企画をつくる個人スタジオです。\n\nはじめからアプリを作るのではなく、まず歩いて、見て、書き留める。\nそこで見つけた問いに向き合い、必要な形を考える。\nアプリは、そのための手段の一つです。",
      en: "A one-person studio making apps, websites and small projects\nout of what stops me on a trip, and what snags in ordinary days.\n\nAn app is never the starting point. I walk, look, write it down,\nsit with the question I find there, and then work out what form\nit needs. An app is one of those forms.",
    } as L,
    cta: { ja: "最近の記録を見る", en: "Read the journal" } as L,
    ctaSub: { ja: "つくったものを見る", en: "See what came of it" } as L,
  },
  /** Small counters under the hero copy, filled from real content. */
  facts: {
    based: { ja: "拠点", en: "Based in" } as L,
    released: { ja: "公開中のアプリ", en: "Apps released" } as L,
    notes: { ja: "記録", en: "Journal entries" } as L,
  },
  currentHeading: { ja: "今、考えていること", en: "What I’m thinking about now" } as L,
  journalHeading: { ja: "日々の記録", en: "Recent notes" } as L,
  journalAll: { ja: "記録をすべて見る", en: "Read all notes" } as L,
  appsHeading: { ja: "日常から生まれたもの", en: "What came out of it" } as L,
  appsAvailableHeading: { ja: "公開中", en: "Available now" } as L,
  appsMakingHeading: { ja: "いまつくっているもの", en: "Currently making" } as L,
  appsAll: { ja: "すべて見る", en: "View all" } as L,
  about: {
    heading: { ja: "作っている人", en: "The person making these" } as L,
    body: {
      ja: "Tomokichiという名前で、日常の中で感じたことを記録し、\nアプリやWebサイト、小さな企画として形にしています。\n\n旅や街、暮らし、人との関係。\n自分自身が体験したことから始め、\nその問いに合った形を一つずつ考えています。",
      en: "Under the name Tomokichi, I write down what I notice\nin daily life and shape it into apps, websites and\nsmall projects.\n\nTravel, cities, living, the people around me.\nEach one starts from something I went through myself,\nand takes whatever form that question needs.",
    } as L,
    link: { ja: "私について", en: "About me" } as L,
  },
  prefooter: {
    heading: { ja: "つくったものを見る", en: "See what I’m making" } as L,
    body: {
      ja: "公開中のものから、\nまだ構想の途中にあるものまで。",
      en: "From what’s already out\nto what’s still taking shape.",
    } as L,
  },
};

/** Journal ------------------------------------------------------------------ */

export const journal = {
  metaTitle: { ja: "記録 — Tomokichi", en: "Journal — Tomokichi" } as L,
  metaDescription: {
    ja: "日常で感じたこと、制作につながる問い、小さな実験の記録。",
    en: "Things noticed in daily life, the questions behind what I make, and small experiments.",
  } as L,
  hero: {
    heading: { ja: "記録", en: "Journal" } as L,
    body: {
      ja: "日常で感じたこと、そこから考えたこと、\n小さく試したことを書いています。\n\nすべてが何かの形になるわけではありません。\n作らなかったものも、ここに残しています。",
      en: "Things noticed in ordinary life, what I made of them,\nand what I tried in a small way.\n\nNot all of it turns into something.\nWhat I decided not to build stays here too.",
    } as L,
  },
  empty: { ja: "まだ記録がありません。", en: "No entries yet." } as L,
  readMore: { ja: "続きを読む", en: "Read on" } as L,
  back: { ja: "記録の一覧へ", en: "Back to the journal" } as L,
  /** Shown on an entry, pointing at what it led to. */
  bornFrom: { ja: "この記録から生まれたもの", en: "What came of this" } as L,
  alsoRead: { ja: "あわせて読む", en: "Read next" } as L,
  /** Shown on a product, pointing back at the records behind it. */
  behindProduct: { ja: "このプロダクトが生まれるまで", en: "How this came about" } as L,
};

/** About page --------------------------------------------------------------- */

export const about = {
  metaTitle: { ja: "私について — Tomokichi", en: "About — Tomokichi" } as L,
  metaDescription: {
    ja: "日常で感じたことから、アプリやWebサイト、小さな企画をつくる個人スタジオです。",
    en: "A one-person studio making apps, websites and small projects out of what it notices in daily life.",
  } as L,
  hero: {
    heading: {
      ja: "日常で感じたことを、\n形にする。",
      en: "Turning what I notice\ninto something.",
    } as L,
    body: {
      ja: "Tomokichi Studioは、暮らしや旅、人との関わりの中で\n感じたことから、アプリやWebサイト、小さな企画をつくる個人スタジオです。\n\nアプリを作ること自体が目的ではありません。\nまず日常を観察し、そこで見つけた問いに向き合い、\n必要な形を考える。その手段の一つがアプリです。",
      en: "Tomokichi Studio is a one-person studio that makes\napps, websites and small projects out of what it notices\nin living, travelling and being around people.\n\nMaking apps is not the point. I watch ordinary life first,\nsit with the question I find there, and work out what form\nit needs. An app is one of those forms.",
    } as L,
  },
  concept: {
    heading: { ja: "このスタジオについて", en: "About this studio" } as L,
    items: [
      {
        title: { ja: "日常から始める", en: "Start from daily life" } as L,
        body: {
          ja: "違和感、不便、願い、寂しさ、好奇心。\n出発点は、いつも自分が体験したことです。",
          en: "Something off, something awkward, a wish, a loneliness,\na curiosity. It always starts from something I lived through.",
        } as L,
      },
      {
        title: { ja: "アプリを目的にしない", en: "An app is not the goal" } as L,
        body: {
          ja: "アプリ、Web、文章、企画。\n問いに合う形を選ぶだけで、形の方は決めていません。",
          en: "An app, a website, a piece of writing, a plan.\nI choose whatever fits the question; the form is not decided in advance.",
        } as L,
      },
      {
        title: { ja: "過程も残す", en: "Keep the process" } as L,
        body: {
          ja: "完成したものだけでなく、\nその手前で考えていたことも記録に残しています。",
          en: "Not only what got finished, but what I was thinking\nbefore it did, stays in the journal.",
        } as L,
      },
    ],
  },
  maker: {
    heading: { ja: "作っている人", en: "The person making these" } as L,
    body: {
      ja: "Tomokichiという名前で、日常の中で感じたことを記録し、\nアプリやWebサイト、小さな企画として形にしています。\n\n旅や街、暮らし、人との関係。\n自分自身が体験したことから始め、\nその問いに合った形を一つずつ考えています。\n\nつくるものによって、静かな画面にも、\n機能の詰まった画面にもなります。\n共通しているのは、使う人に複雑さを渡さないことです。",
      en: "Under the name Tomokichi, I write down what I notice in\ndaily life and shape it into apps, websites and small projects.\n\nTravel, cities, living, the people around me.\nEach one starts from something I went through myself,\nand takes whatever form that question needs.\n\nDepending on what I’m making, the screen becomes quiet,\nor dense with features. What stays constant is not handing\ncomplexity to the people who use it.",
    } as L,
    location: "Kyoto / Tokyo",
    linksLabel: {
      website: { ja: "Website", en: "Website" } as L,
      github: { ja: "GitHub", en: "GitHub" } as L,
      contact: { ja: "Contact", en: "Contact" } as L,
    },
  },
  now: {
    heading: { ja: "今のTomokichiについて", en: "Tomokichi, right now" } as L,
    body: {
      ja: "表現は、そのときの空気や技術に合わせて\n変わっていくものだと考えています。\n\n人間らしさや静けさを強く出す時期もあれば、\nもっと機能的で密度の高い形が\n似合うこともあります。\n\nそれでも変わらないのは、\n丁寧な技術、細やかな気配り、\nそして使う人に余計な複雑さを渡さないことです。\n\n遊び心も、主役でなくても、\nどこかに残していきます。",
      en: "How things are expressed changes\nwith the mood and technology of the time.\n\nSome periods lean into warmth and quiet;\nother times a more functional, denser form\nsuits better.\n\nWhat doesn’t change is careful engineering,\nquiet attention, and never handing extra\ncomplexity to the people who use it.\n\nPlayfulness, too — never the lead — is\nkept somewhere along the way.",
    } as L,
    caption: {
      ja: "旅先の高台で。ここで気になったことが、あとで形になります。",
      en: "On a hillside somewhere. What catches my attention here turns into something later.",
    } as L,
  },
  making: {
    heading: { ja: "つくったもの", en: "What I’ve made" } as L,
    all: { ja: "すべて見る", en: "See all" } as L,
  },
  bottom: {
    apps: {
      heading: { ja: "つくったものを見る", en: "See what I’ve made" } as L,
      body: {
        ja: "公開中のものから、\nまだ構想の途中にあるものまで。",
        en: "From what’s already out\nto what’s still taking shape.",
      } as L,
    },
    support: {
      heading: { ja: "サポートを見る", en: "Get support" } as L,
      body: {
        ja: "アプリについてのよくある質問や、\nお問い合わせはこちら。",
        en: "Common questions about the apps\nand how to get in touch.",
      } as L,
    },
  },
};

/** Products page ------------------------------------------------------------ */

export const appsPage = {
  metaTitle: { ja: "つくったもの。 — Tomokichi", en: "What I’ve made — Tomokichi" } as L,
  metaDescription: {
    ja: "日常で感じたことから生まれた、アプリと小さな企画。公開中と開発中を分けて、それぞれの世界観を探索できます。",
    en: "Apps and small projects born from daily life — explore available releases and work in progress, each with its own world.",
  } as L,
  hero: {
    heading: { ja: "つくったもの。", en: "What I’ve made." } as L,
    body: {
      ja: "どれも、日常の中で気になったことから始まっています。\n\n公開済みのものと、いま手がけているものを分けて並べています。\n雰囲気の違いごと、ブランドサイトへ進めます。",
      en: "Every one of these started from something\nthat caught my attention in ordinary life.\n\nAvailable apps and work in progress are kept apart\nso you can explore each world, then open its brand site.",
    } as L,
  },
  sections: {
    available: { ja: "公開中", en: "Available now" } as L,
    developing: { ja: "開発中", en: "In development" } as L,
    concept: { ja: "構想中", en: "Concept" } as L,
  },
  filters: [
    { key: "all", label: { ja: "すべて", en: "All" } as L },
    { key: "released", label: { ja: "公開中", en: "Available" } as L },
    { key: "developing", label: { ja: "開発中", en: "In development" } as L },
    { key: "concept", label: { ja: "構想中", en: "Concept" } as L },
  ],
  soon: { ja: "準備中", en: "Coming soon" } as L,
  visit: { ja: "ブランドサイトを見る", en: "Visit the brand site" } as L,
  origin: { ja: "はじまり", en: "Where it started" } as L,
  emptySection: { ja: "まだありません。", en: "Nothing here yet." } as L,
  spec: {
    highlights: { ja: "できること", en: "What it does" } as L,
    pricing: { ja: "料金", en: "Price" } as L,
    requirements: { ja: "対応", en: "Requires" } as L,
    privacy: { ja: "データ", en: "Data" } as L,
    languages: { ja: "言語", en: "Languages" } as L,
  },
  bottom: {
    heading: { ja: "アプリについて困ったときは", en: "If you need help with an app" } as L,
    body: {
      ja: "使い方や不具合、\n各アプリについての連絡は\nサポートページから受け付けています。",
      en: "How-to, bugs, and anything about each app\nare handled from the support page.",
    } as L,
    cta: { ja: "サポートを見る", en: "Get support" } as L,
  },
};

/** Support / legal ---------------------------------------------------------- */

export const support = {
  metaTitle: { ja: "お問い合わせ — Tomokichi", en: "Support — Tomokichi" } as L,
  heading: { ja: "お問い合わせ", en: "Support" } as L,
  body: {
    ja: "Tomokichiのアプリに関する不具合、ご質問、ご意見は、共通のお問い合わせフォームからお送りください。",
    en: "Send questions, bug reports, or feedback about Tomokichi apps through the shared support form.",
  } as L,
  personal: {
    ja: "お仕事のご相談や個人へのお問い合わせは、tomokichi.dev/contact からお願いします。",
    en: "For work enquiries or personal contact, please use tomokichi.dev/contact.",
  } as L,
  appsCta: { ja: "アプリ一覧を見る", en: "View all apps" } as L,
};

/**
 * The two site-level documents. Each app's own policy lives on its brand site;
 * these cover tmkch.io itself and the shared support form it hosts, so every
 * statement here has to be checkable against `apps/api` and `support-form.ts`.
 */
export interface LegalSection {
  title: L;
  /** Paragraphs, rendered in order. */
  body: L<string[]>;
  /** Optional bulleted detail shown after the paragraphs. */
  list?: L<string[]>;
}

export interface LegalDoc {
  metaTitle: L;
  metaDescription: L;
  eyebrow: string;
  heading: L;
  intro: L;
  effective: L;
  updated: L;
  effectiveLabel: L;
  updatedLabel: L;
  sections: LegalSection[];
  contact: { heading: L; body: L; cta: L };
}

const LEGAL_EFFECTIVE: L = { ja: "2026年7月26日", en: "July 26, 2026" };
const LEGAL_UPDATED: L = { ja: "2026年8月14日", en: "August 14, 2026" };
const LEGAL_DATE_LABELS = {
  effective: { ja: "制定日", en: "Effective" } as L,
  updated: { ja: "最終更新日", en: "Last updated" } as L,
};

const legalContact = {
  heading: { ja: "この内容についてのお問い合わせ", en: "Questions about this document" } as L,
  body: {
    ja: "本ポリシーおよび個人情報の開示・訂正・利用停止のご請求は、お問い合わせフォームまたは support@tmkch.io までご連絡ください。",
    en: "For anything in this document, or to request disclosure, correction, or deletion of your information, use the support form or email support@tmkch.io.",
  } as L,
  cta: { ja: "お問い合わせフォームへ", en: "Go to the support form" } as L,
};

export const legal: { privacy: LegalDoc; terms: LegalDoc } = {
  privacy: {
    metaTitle: { ja: "プライバシーポリシー — Tomokichi", en: "Privacy Policy — Tomokichi" },
    metaDescription: {
      ja: "tmkch.ioで取得する情報、その利用目的、委託先、保存期間、開示請求の方法について。",
      en: "What tmkch.io collects, why, who processes it, how long it is kept, and how to request disclosure.",
    },
    eyebrow: "PRIVACY POLICY",
    heading: { ja: "プライバシーポリシー", en: "Privacy Policy" },
    intro: {
      ja: "Tomokichi（以下「当方」）が運営する tmkch.io における個人情報の取り扱いについて定めます。各アプリ固有の取り扱いは、それぞれのブランドサイトに掲載するプライバシーポリシーが優先します。",
      en: "This policy covers how Tomokichi (“we”) handles personal information on tmkch.io. Where an individual app has its own policy on its brand site, that policy takes precedence for the app itself.",
    },
    effective: LEGAL_EFFECTIVE,
    updated: LEGAL_UPDATED,
    effectiveLabel: LEGAL_DATE_LABELS.effective,
    updatedLabel: LEGAL_DATE_LABELS.updated,
    sections: [
      {
        title: { ja: "適用範囲", en: "Scope" },
        body: {
          ja: [
            "本ポリシーは、tmkch.io およびそのサブドメインで提供する当方のWebサイトと、共通のお問い合わせフォーム（api.tmkch.io で受け付けます）に適用されます。",
            "各アプリの内部で取り扱うデータについては、当該アプリのブランドサイトに掲載するプライバシーポリシーをご確認ください。",
          ],
          en: [
            "This policy applies to our websites on tmkch.io and its subdomains, and to the shared support form handled at api.tmkch.io.",
            "For data handled inside an individual app, see that app's own privacy policy on its brand site.",
          ],
        },
      },
      {
        title: { ja: "取得する情報", en: "What we collect" },
        body: {
          ja: [
            "サイトを閲覧しているだけでは、当方が個人情報を取得することはありません。お問い合わせフォームを送信した場合に限り、次の情報を取得します。",
          ],
          en: [
            "Simply browsing the site does not give us any personal information. We collect the following only when you submit the support form.",
          ],
        },
        list: {
          ja: [
            "お名前（任意項目です。未入力でも送信できます）",
            "返信先メールアドレス",
            "お問い合わせ内容",
            "対象アプリ、お問い合わせの種類、表示言語",
            "ランダムに生成される受付ID、および送信日時",
            "レート制限のためにブラウザのローカルストレージへ保存される、ランダムな端末識別子",
          ],
          en: [
            "Your name (optional — the form can be sent without it)",
            "A reply-to email address",
            "Your message",
            "The selected app, enquiry type, and display language",
            "A randomly generated reference ID and the submission time",
            "A random device identifier kept in your browser's local storage for rate limiting",
          ],
        },
      },
      {
        title: { ja: "利用目的", en: "How we use it" },
        body: {
          ja: [
            "取得した情報は、お問い合わせへの回答、不具合の調査と修正、アプリおよび本サイトの改善、いたずら送信や大量送信の防止のために利用します。これ以外の目的では利用しません。",
            "広告配信や、第三者へのプロファイリング目的での提供は行いません。",
          ],
          en: [
            "We use it to reply, to investigate and fix problems, to improve the apps and this site, and to prevent abuse or bulk submissions. We do not use it for anything else.",
            "We do not run advertising on it, and we do not share it with third parties for profiling.",
          ],
        },
      },
      {
        title: { ja: "外部サービスの利用", en: "Processors we rely on" },
        body: {
          ja: [
            "お問い合わせの受付と配送のため、次のサービスを利用しています。各社における取り扱いは、それぞれのプライバシーポリシーに従います。",
          ],
          en: [
            "We use the following services to receive and deliver support enquiries. Each processes information under its own privacy policy.",
          ],
        },
        list: {
          ja: [
            "Cloudflare, Inc.（Workers・レート制限。サイトとお問い合わせAPIの実行基盤）",
            "Resend（お問い合わせ内容のメール配送）",
          ],
          en: [
            "Cloudflare, Inc. (Workers and rate limiting — the runtime for this site and the support API)",
            "Resend (email delivery of your enquiry)",
          ],
        },
      },
      {
        title: { ja: "保存期間", en: "How long we keep it" },
        body: {
          ja: [
            "お問い合わせは専用のデータベースには保存せず、メールとして受信します。受信したメールは、対応の記録および再発防止のため、原則として受信から3年間保管し、その後削除します。",
            "レート制限のために保存される端末識別子は、ブラウザのローカルストレージを消去することでいつでも削除できます。",
          ],
          en: [
            "Enquiries are not written to a dedicated database; they arrive as email. We keep those messages for up to three years so we can follow up and avoid repeating a problem, then delete them.",
            "The device identifier used for rate limiting can be removed at any time by clearing your browser's local storage.",
          ],
        },
      },
      {
        title: { ja: "Cookieとアクセス解析", en: "Cookies and analytics" },
        body: {
          ja: [
            "本サイトは、閲覧者を追跡するためのCookieを設定しません。アクセス解析ツールや広告タグも設置していません。",
            "お問い合わせフォームでは、前述の端末識別子をブラウザのローカルストレージに保存します。これはCookieではなく、送信回数の制限のみに使われます。",
          ],
          en: [
            "This site sets no tracking cookies, and carries no analytics or advertising tags.",
            "The support form stores the device identifier described above in your browser's local storage. It is not a cookie, and it is used only to limit how often the form can be sent.",
          ],
        },
      },
      {
        title: { ja: "開示・訂正・削除のご請求", en: "Disclosure, correction, and deletion" },
        body: {
          ja: [
            "ご本人からの求めにより、当方が保有する個人情報の開示、訂正、追加、削除、利用停止に応じます。お問い合わせフォームまたは support@tmkch.io までご連絡ください。ご本人であることを確認できる範囲で、遅滞なく対応します。",
          ],
          en: [
            "On request, we will disclose, correct, add to, delete, or stop using the personal information we hold about you. Contact us through the support form or at support@tmkch.io; we respond without undue delay once we can confirm the request comes from you.",
          ],
        },
      },
      {
        title: { ja: "未成年の方の利用", en: "Use by minors" },
        body: {
          ja: [
            "未成年の方がお問い合わせフォームを利用する場合は、保護者の方の同意を得たうえでご利用ください。",
          ],
          en: [
            "If you are a minor, please get consent from a parent or guardian before using the support form.",
          ],
        },
      },
      {
        title: { ja: "本ポリシーの変更", en: "Changes to this policy" },
        body: {
          ja: [
            "法令の変更や運用の見直しに応じて、本ポリシーを改定することがあります。重要な変更を行う場合は、本ページに変更内容と最終更新日を掲載します。",
          ],
          en: [
            "We may revise this policy as the law or our practices change. Material changes are published on this page along with an updated date.",
          ],
        },
      },
      {
        title: { ja: "事業者情報", en: "Who we are" },
        body: {
          ja: [
            "Tomokichi（運営責任者：髙木 友喜）／ 東京都豊島区千早2丁目6-11 ／ support@tmkch.io",
          ],
          en: [
            "Tomokichi (responsible operator: Yuki Takagi) — 2-6-11 Chihaya, Toshima-ku, Tokyo 171-0044, Japan — support@tmkch.io",
          ],
        },
      },
    ],
    contact: legalContact,
  },
  terms: {
    metaTitle: { ja: "利用規約 — Tomokichi", en: "Terms of Service — Tomokichi" },
    metaDescription: {
      ja: "tmkch.ioの利用条件、禁止事項、免責事項、準拠法について。",
      en: "The conditions for using tmkch.io, what is not allowed, disclaimers, and governing law.",
    },
    eyebrow: "TERMS OF SERVICE",
    heading: { ja: "利用規約", en: "Terms of Service" },
    intro: {
      ja: "本規約は、Tomokichi（以下「当方」）が運営する tmkch.io の利用条件を定めるものです。本サイトをご利用いただいた時点で、本規約に同意したものとみなします。各アプリの利用条件は、それぞれのブランドサイトに掲載する利用規約が優先します。",
      en: "These terms govern use of tmkch.io, operated by Tomokichi (“we”). Using the site means you accept them. Where an individual app has its own terms on its brand site, those terms take precedence for the app itself.",
    },
    effective: LEGAL_EFFECTIVE,
    updated: LEGAL_UPDATED,
    effectiveLabel: LEGAL_DATE_LABELS.effective,
    updatedLabel: LEGAL_DATE_LABELS.updated,
    sections: [
      {
        title: { ja: "本サイトの位置づけ", en: "What this site is" },
        body: {
          ja: [
            "tmkch.io は、当方が日常の中で感じたことの記録と、そこから生まれたアプリやWebサイト、小さな企画を紹介するためのサイトです。あわせて、各アプリ共通のお問い合わせ窓口を提供します。",
            "本サイトそのものの閲覧に費用はかかりません。アプリの購入や課金は、App Store 上での取引となります。",
          ],
          en: [
            "tmkch.io exists to publish what we notice in daily life and to introduce the apps, sites, and small projects that come out of it. It also hosts the shared support form for every app.",
            "Reading the site costs nothing. Buying an app or making a purchase inside one is a transaction on the App Store.",
          ],
        },
      },
      {
        title: { ja: "知的財産権", en: "Intellectual property" },
        body: {
          ja: [
            "本サイトに掲載する文章、画像、スクリーンショット、ロゴ、デザインその他の著作物の権利は、当方または正当な権利者に帰属します。",
            "引用の範囲を超えた転載、改変、再配布を行う場合は、事前にご連絡ください。",
          ],
          en: [
            "Text, images, screenshots, logos, designs, and other works on this site belong to us or to their rightful owners.",
            "Please contact us before reproducing, modifying, or redistributing anything beyond ordinary quotation.",
          ],
        },
      },
      {
        title: { ja: "禁止事項", en: "What is not allowed" },
        body: {
          ja: ["本サイトの利用にあたり、次の行為はご遠慮ください。"],
          en: ["When using this site, please do not:"],
        },
        list: {
          ja: [
            "法令または公序良俗に反する行為",
            "当方または第三者の権利や利益を侵害する行為",
            "本サイトやお問い合わせAPIの運営を妨害する行為（過度な自動アクセス、大量送信を含みます）",
            "虚偽の情報を用いてお問い合わせを送信する行為",
            "本サイトの内容を、当方が提供しているかのように装って再配布する行為",
          ],
          en: [
            "Break the law or act against public order",
            "Infringe our rights or those of anyone else",
            "Interfere with the site or the support API, including heavy automated access or bulk submissions",
            "Submit enquiries using false information",
            "Redistribute the site's content in a way that suggests we published it",
          ],
        },
      },
      {
        title: { ja: "お問い合わせフォームの利用", en: "Using the support form" },
        body: {
          ja: [
            "お問い合わせフォームは、当方のアプリに関する質問、不具合の報告、ご意見のためにご利用ください。回答は原則としてメールでお送りし、通常3営業日以内を目安としますが、回答時期や回答自体をお約束するものではありません。",
            "いたずら送信や大量送信を防ぐため、一定時間内の送信回数を制限しています。送信内容の取り扱いはプライバシーポリシーに従います。",
          ],
          en: [
            "The support form is for questions, bug reports, and feedback about our apps. We reply by email, usually within three business days, but we cannot guarantee a reply or a specific timeframe.",
            "To prevent abuse, the number of submissions within a period is limited. What you send is handled according to the Privacy Policy.",
          ],
        },
      },
      {
        title: { ja: "免責事項", en: "Disclaimers" },
        body: {
          ja: [
            "本サイトの内容は、掲載時点の情報に基づきます。正確性や最新性には努めますが、内容を保証するものではありません。",
            "本サイトの利用、または利用できなかったことにより生じた損害について、当方の故意または重大な過失による場合を除き、責任を負いかねます。",
            "本サイトは予告なく内容の変更、公開の停止、提供の終了を行うことがあります。",
          ],
          en: [
            "The content reflects what was accurate when it was published. We aim to keep it correct and current, but we do not warrant it.",
            "Except in cases of our intent or gross negligence, we are not liable for damages arising from use of this site or from being unable to use it.",
            "We may change, suspend, or discontinue the site without prior notice.",
          ],
        },
      },
      {
        title: { ja: "外部サイトへのリンク", en: "Links to other sites" },
        body: {
          ja: [
            "本サイトは、App Store や各ブランドサイト、GitHub などの外部サイトへリンクすることがあります。リンク先の内容について当方は責任を負いません。",
          ],
          en: [
            "We link out to the App Store, our brand sites, GitHub, and elsewhere. We are not responsible for what those sites contain.",
          ],
        },
      },
      {
        title: { ja: "本規約の変更", en: "Changes to these terms" },
        body: {
          ja: [
            "当方は、必要と判断した場合に本規約を変更することがあります。変更後の規約は、本ページに掲載した時点から効力を生じます。",
          ],
          en: [
            "We may change these terms when we judge it necessary. A revised version takes effect when it is published on this page.",
          ],
        },
      },
      {
        title: { ja: "準拠法と管轄裁判所", en: "Governing law and jurisdiction" },
        body: {
          ja: [
            "本規約は日本法に準拠します。本サイトに関して紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
          ],
          en: [
            "These terms are governed by the laws of Japan. Any dispute relating to this site is subject to the exclusive jurisdiction of the Tokyo District Court as the court of first instance.",
          ],
        },
      },
    ],
    contact: {
      heading: { ja: "本規約についてのお問い合わせ", en: "Questions about these terms" },
      body: {
        ja: "本規約についてのご質問は、お問い合わせフォームまたは support@tmkch.io までご連絡ください。",
        en: "For anything about these terms, use the support form or email support@tmkch.io.",
      },
      cta: legalContact.cta,
    },
  },
};
