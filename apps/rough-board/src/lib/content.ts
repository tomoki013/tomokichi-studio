export type Locale = "ja" | "en";
export type Page =
  | "features"
  | "how-to"
  | "screenshots"
  | "faq"
  | "privacy"
  | "terms"
  | "news"
  | "updates";

export const pick = <T>(ja: boolean, pair: [T, T]): T => pair[ja ? 0 : 1];

export const titles: Record<Page, [string, string]> = {
  features: ["機能", "Features"],
  "how-to": ["使い方", "How to use"],
  screenshots: ["スクリーンショット", "Screenshots"],
  faq: ["よくある質問", "FAQ"],
  privacy: ["プライバシーポリシー", "Privacy Policy"],
  terms: ["利用規約", "Terms of Service"],
  news: ["お知らせ", "News"],
  updates: ["アップデート情報", "App updates"],
};

export const descriptions: Record<Page, [string, string]> = {
  features: [
    "フルスクリーンの書く画面、パン・ピンチできるホワイトボード、ノードの接続と分岐など、Rough Boardの主な機能。",
    "Rough Board features: full-screen Write, a pan-and-pinch Board, soft nodes, links, branches, search, and Account.",
  ],
  "how-to": [
    "書いて、ボードに置き、あとでつなぐ。Rough Boardの使い方をステップで案内します。",
    "Write, place thoughts on the board, connect later—step-by-step with Rough Board.",
  ],
  screenshots: [
    "白いキャンバスとやわらかいノードカードのコンセプトボード。",
    "Concept board: a quiet white canvas with soft gray nodes and thin curved edges.",
  ],
  faq: [
    "端末内保存、広告なし、下書き、アーカイブなどRough Boardのよくある質問。",
    "FAQ about on-device storage, no ads, drafts, archive, and more.",
  ],
  privacy: [
    "Rough Boardのプライバシーポリシー。端末内保存、広告なし、下書き、サポート送信について。",
    "Rough Board Privacy Policy: on-device only, no ads, drafts, and support when submitted.",
  ],
  terms: [
    "Rough Boardの利用規約。無料提供、端末内データ、広告なしについて。",
    "Rough Board Terms of Service covering free use, on-device data, and no ads.",
  ],
  news: [
    "Rough Board公式ブランドサイト公開のお知らせ。",
    "Updates from Rough Board, including product notes.",
  ],
  updates: [
    "Rough Boardアプリのバージョンごとの変更内容。",
    "Version-by-version release notes for Rough Board.",
  ],
};

export const languagesJa = "日本語、英語、簡体字中国語、韓国語、スペイン語、フランス語、ドイツ語";
export const languagesEn =
  "Japanese, English, Simplified Chinese, Korean, Spanish, French, and German";

export function featureCards(ja: boolean) {
  return ja
    ? ([
        [
          "✍",
          "フルスクリーンの書く画面",
          "思考のスピードに合わせて、全画面で素早く書き込めます。下書きは自動保存されます。",
        ],
        [
          "◻",
          "静かなホワイトボード",
          "白いキャンバスをパン・ピンチ。ノードをドラッグして配置を整えます。",
        ],
        ["⤷", "リンクと分岐", "リンクモードで考えをつなぎ、ブランチで枝分かれを残せます。"],
        ["⌕", "検索でノードへ", "キーワードで探し、該当ノードをボードの中央に寄せられます。"],
        [
          "☾",
          "スリープとアーカイブ",
          "今は見なくていい考えを眠らせたり、アーカイブへ片付けたりできます。",
        ],
        [
          "◎",
          "アカウント設定",
          "外観、触覚フィードバック、アーカイブ、プライバシーまわりを端末内で調整します。",
        ],
      ] as const)
    : ([
        [
          "✍",
          "Full-screen Write",
          "Capture thoughts at speed on a full-screen canvas. Drafts autosave as you type.",
        ],
        [
          "◻",
          "A quiet Board",
          "Pan and pinch a white canvas. Drag soft nodes until the layout feels right.",
        ],
        [
          "⤷",
          "Links and branches",
          "Connect ideas in link mode, or branch a thought into related paths.",
        ],
        [
          "⌕",
          "Search that centers",
          "Find a node by keyword and bring it into the center of the board.",
        ],
        [
          "☾",
          "Sleep and archive",
          "Put ideas to sleep when they need rest, or archive what you no longer need in view.",
        ],
        [
          "◎",
          "Account settings",
          "Appearance, haptics, archive, and privacy controls—kept on your device.",
        ],
      ] as const);
}

export function featureGroups(ja: boolean) {
  return ja
    ? [
        {
          h: "Write",
          items: [
            "フルスクリーンの書くタブ",
            "下書きの自動保存（UserDefaults）",
            "思考を止めない最小UI",
            "書いた内容をボード上のノードへ",
          ],
        },
        {
          h: "Board",
          items: [
            "白いキャンバスのパン・ピンチ",
            "ノードのドラッグ配置",
            "やわらかいノードカード",
            "細い曲線エッジで接続を表現",
          ],
        },
        {
          h: "Connect",
          items: [
            "リンクモードでノード同士を接続",
            "ブランチで枝分かれを作成",
            "あとから関係を編集",
            "「書いて、置いて、あとでつなぐ」流れ",
          ],
        },
        {
          h: "Find & tidy",
          items: [
            "検索でノードを中央へ",
            "スリープで一時的に隠す",
            "アーカイブで整理",
            "ソフトデリート（誤操作にやさしい削除）",
          ],
        },
        {
          h: "Account",
          items: [
            "外観（ライト／ダークなど）",
            "触覚フィードバック",
            "アーカイブとプライバシー関連設定",
            "コーチマークによる初回案内",
          ],
        },
        {
          h: "Local-first",
          items: [
            "SwiftUI + SwiftData",
            "iOS 17以降",
            "サードパーティ依存なし",
            "広告・課金・iCloud・AIなし（MVP）",
            `7言語：${languagesJa}`,
          ],
        },
      ]
    : [
        {
          h: "Write",
          items: [
            "Full-screen Write tab",
            "Autosaving draft (UserDefaults)",
            "Minimal UI that stays out of the way",
            "Place what you wrote as a board node",
          ],
        },
        {
          h: "Board",
          items: [
            "Pan and pinch on a white canvas",
            "Drag nodes into place",
            "Soft node cards",
            "Thin curved edges between ideas",
          ],
        },
        {
          h: "Connect",
          items: [
            "Link mode to connect nodes",
            "Branch to split a thought",
            "Edit relationships later",
            "Write fast · place · connect later",
          ],
        },
        {
          h: "Find & tidy",
          items: [
            "Search that centers matching nodes",
            "Sleep thoughts you do not need now",
            "Archive for longer-term tidy-up",
            "Soft delete that forgives mistakes",
          ],
        },
        {
          h: "Account",
          items: [
            "Appearance (including light / dark)",
            "Haptics",
            "Archive and privacy-related settings",
            "Coach marks for first-time guidance",
          ],
        },
        {
          h: "Local-first",
          items: [
            "SwiftUI + SwiftData",
            "iOS 17 or later",
            "No third-party dependencies",
            "No ads, StoreKit, iCloud, or AI in the MVP",
            `Seven languages: ${languagesEn}`,
          ],
        },
      ];
}

export function howSteps(ja: boolean) {
  return ja
    ? [
        {
          n: "01",
          t: "素早く書く",
          body: "Writeタブを開き、思いついたことをそのまま入力します。下書きは自動で保存されます。",
        },
        {
          n: "02",
          t: "ボードに置く",
          body: "考えをノードとして白いボードへ置きます。ドラッグで位置を整え、パン・ピンチで全体を眺めます。",
        },
        {
          n: "03",
          t: "あとでつなぐ",
          body: "リンクモードで関係を引き、ブランチで枝分かれを残します。今すぐ完璧な構造にしなくて大丈夫です。",
        },
        {
          n: "04",
          t: "探し、眠らせ、片付ける",
          body: "検索でノードを中央へ。今は不要ならスリープやアーカイブ。誤って消してもソフトデリートが助けます。",
        },
      ]
    : [
        {
          n: "01",
          t: "Write fast",
          body: "Open Write and capture the thought as it arrives. Your draft autosaves while you type.",
        },
        {
          n: "02",
          t: "Place on the Board",
          body: "Drop ideas as soft nodes on the white canvas. Drag to arrange; pan and pinch to explore.",
        },
        {
          n: "03",
          t: "Connect later",
          body: "Use link mode to draw relationships, and branch when a thought splits. Structure can wait.",
        },
        {
          n: "04",
          t: "Find, sleep, tidy",
          body: "Search to center a node. Sleep or archive what you do not need in view. Soft delete forgives mistakes.",
        },
      ];
}

export function howGuides(ja: boolean) {
  return ja
    ? [
        {
          t: "はじめる",
          note: "アカウント登録は不要です。開いたらすぐ書けます。",
          steps: [
            "アプリを起動すると、コーチマークが主な操作を案内します。",
            "Writeタブで思いついた一文を入力してみてください。",
            "下書きは自動保存されるので、途中で閉じても安心です。",
          ],
        },
        {
          t: "ボードに配置する",
          note: "完璧な配置より、まず置くことが大切です。",
          steps: [
            "書いた内容をノードとしてボードへ置きます。",
            "ノードをドラッグして位置を調整します。",
            "二本指でピンチ、一本指でパンしてキャンバスを眺めます。",
          ],
        },
        {
          t: "リンクとブランチ",
          note: "関係づけはあとからで構いません。",
          steps: [
            "リンクモードをオンにし、つなぎたいノード同士を接続します。",
            "枝分かれさせたいときはブランチを作成します。",
            "エッジは細い曲線で、読みやすい空間を保ちます。",
          ],
        },
        {
          t: "検索する",
          note: "ボードが広がっても、キーワードで戻れます。",
          steps: [
            "検索を開き、キーワードを入力します。",
            "一致するノードがボード中央へ寄ります。",
            "見つけたノードから、また書き足したり接続したりできます。",
          ],
        },
        {
          t: "スリープ・アーカイブ・削除",
          note: "消す前に、眠らせる・片付ける選択肢があります。",
          steps: [
            "今は見たくないノードはスリープへ。",
            "長期的に外したいものはアーカイブへ。",
            "削除はソフトデリートなので、誤操作にやさしい設計です。",
          ],
        },
        {
          t: "Accountで整える",
          note: "見た目と触感を、自分の集中に合わせて。",
          steps: [
            "Accountから外観を変更します。",
            "触覚フィードバックのオン／オフを選べます。",
            "アーカイブとプライバシー関連の案内もここから確認できます。",
          ],
        },
      ]
    : [
        {
          t: "Getting started",
          note: "No account required—open the app and write.",
          steps: [
            "Coach marks introduce the main gestures on first launch.",
            "Open the Write tab and type a single thought.",
            "Drafts autosave, so you can leave mid-sentence safely.",
          ],
        },
        {
          t: "Place on the Board",
          note: "Placement first; perfect layout later.",
          steps: [
            "Turn what you wrote into a node on the board.",
            "Drag nodes until the arrangement feels quiet and clear.",
            "Pinch to zoom and pan to wander the white canvas.",
          ],
        },
        {
          t: "Links and branches",
          note: "Relationships can wait until you are ready.",
          steps: [
            "Enter link mode and connect related nodes.",
            "Create a branch when a thought splits into paths.",
            "Edges stay thin and curved so the space stays readable.",
          ],
        },
        {
          t: "Search",
          note: "Even a large board stays findable.",
          steps: [
            "Open search and type a keyword.",
            "Matching nodes move into the center of the board.",
            "From there, write more or draw new links.",
          ],
        },
        {
          t: "Sleep, archive, delete",
          note: "Tidy without harsh permanence.",
          steps: [
            "Sleep nodes you do not want to see right now.",
            "Archive for longer-term cleanup.",
            "Soft delete cushions accidental removal.",
          ],
        },
        {
          t: "Tune Account",
          note: "Match appearance and haptics to how you focus.",
          steps: [
            "Change appearance from Account.",
            "Toggle haptics on or off.",
            "Review archive and privacy-related guidance there too.",
          ],
        },
      ];
}

export function faqs(ja: boolean) {
  return ja
    ? ([
        [
          "base",
          "Rough Boardはどんなアプリですか？",
          "ざっくりした思考を素早く書き、白いボードに置き、あとからつなぐためのローカルファーストなiPhoneアプリです。",
        ],
        ["base", "無料で使えますか？", "はい。MVPでは無料で、広告やアプリ内課金はありません。"],
        ["base", "アカウントは必要ですか？", "いいえ。登録やログインなしですぐに使えます。"],
        ["base", "対応環境は？", "iPhone・iOS 17以降です。SwiftUI + SwiftDataで作られています。"],
        ["base", "対応言語は？", `${languagesJa}に対応しています。`],
        [
          "write",
          "下書きはどこに保存されますか？",
          "書きかけの下書きは端末内のUserDefaultsに自動保存されます。",
        ],
        [
          "write",
          "オフラインで使えますか？",
          "はい。主要な機能は端末内で完結し、ネットワークは不要です。",
        ],
        [
          "board",
          "ボードでは何ができますか？",
          "パン・ピンチ、ノードのドラッグ、リンクモード、ブランチ、検索による中央寄せなどができます。",
        ],
        [
          "board",
          "スリープとアーカイブの違いは？",
          "スリープは今は見なくてよい考えを一時的に休ませ、アーカイブはボードから長く片付けたいものを整理するための機能です。",
        ],
        [
          "data",
          "データはどこに保存されますか？",
          "ボード上のノードや接続などのデータは端末内（SwiftData）に保存されます。下書きはUserDefaultsです。",
        ],
        [
          "data",
          "iCloud同期はありますか？",
          "MVPではiCloud同期はありません。データは端末内のみです。",
        ],
        [
          "data",
          "広告やトラッキングはありますか？",
          "ありません。広告SDK、StoreKit、解析SDKは使用しません。",
        ],
        ["data", "AI機能はありますか？", "MVPにはAI機能はありません。"],
        [
          "data",
          "サポートに連絡すると何が送られますか？",
          "共通サポートフォームを明示的に送信したときだけ、入力した内容と技術情報が送られます。ボード上の思考は自動添付されません。",
        ],
        [
          "data",
          "すべてのデータを削除できますか？",
          "アプリを削除すると端末内データは消えます。ソフトデリートやアーカイブで個別の整理もできます。",
        ],
      ] as const)
    : ([
        [
          "base",
          "What is Rough Board?",
          "A local-first iPhone app for rough thoughts: write fast, place ideas on a white board, and connect them later.",
        ],
        ["base", "Is it free?", "Yes. The MVP is free, with no ads and no in-app purchases."],
        ["base", "Do I need an account?", "No. There is no sign-up or login."],
        [
          "base",
          "What devices are supported?",
          "iPhone on iOS 17 or later. Built with SwiftUI and SwiftData.",
        ],
        ["base", "Which languages are supported?", `${languagesEn}.`],
        [
          "write",
          "Where is the draft saved?",
          "In-progress drafts autosave to UserDefaults on your device.",
        ],
        [
          "write",
          "Does it work offline?",
          "Yes. Core features run entirely on device and need no network.",
        ],
        [
          "board",
          "What can I do on the Board?",
          "Pan and pinch, drag nodes, use link mode, branch, and center nodes via search.",
        ],
        [
          "board",
          "Sleep vs archive?",
          "Sleep rests thoughts you do not want to see now; archive tidies items for longer-term cleanup.",
        ],
        [
          "data",
          "Where is data stored?",
          "Board nodes and links live on device in SwiftData. Drafts use UserDefaults.",
        ],
        ["data", "Is there iCloud sync?", "Not in the MVP. Everything stays on the device."],
        [
          "data",
          "Are there ads or tracking?",
          "No. There is no ads SDK, StoreKit, or analytics SDK.",
        ],
        ["data", "Is there AI?", "Not in the MVP."],
        [
          "data",
          "What is sent when I contact support?",
          "Only when you explicitly submit the shared support form. Board thoughts are never attached automatically.",
        ],
        [
          "data",
          "Can I delete everything?",
          "Uninstalling removes on-device data. Soft delete and archive help with everyday tidy-up.",
        ],
      ] as const);
}

export const faqCats = {
  ja: [
    ["all", "すべて"],
    ["base", "基本"],
    ["write", "書く・使う"],
    ["board", "ボード"],
    ["data", "データ・プライバシー"],
  ] as [string, string][],
  en: [
    ["all", "All"],
    ["base", "Basics"],
    ["write", "Writing & use"],
    ["board", "Board"],
    ["data", "Data & privacy"],
  ] as [string, string][],
};

export function newsPosts(ja: boolean) {
  return ja
    ? [
        {
          id: "site-launch",
          date: "2026.08.08",
          datetime: "2026-08-08",
          badge: "お知らせ",
          title: "Rough Board公式ブランドサイトを公開しました",
          summary:
            "書いて、置いて、あとでつなぐ。ローカルファーストな思考ボードの考え方をまとめています。",
          body: [
            "Rough Boardの公式ブランドサイトを公開しました。フルスクリーンの書く画面、白いボード、リンクと分岐、検索、スリープ／アーカイブなど、MVPで目指している体験をページに整理しています。",
            "現時点ではApp Storeへのリンクはありません。配信の準備が整い次第、サイトからもご案内します。",
            "データは端末内に保存し、広告・課金・iCloud・AIはMVPに含めていません。詳細はプライバシーポリシーと利用規約をご確認ください。",
          ],
        },
        {
          id: "column-space",
          date: "2026.08.08",
          datetime: "2026-08-08",
          badge: "コラム",
          badgeTone: "column" as const,
          title: "完璧なノートより、静かな余白を",
          summary: "Rough Boardは、整ったノートではなく、思考が置ける空間をつくります。",
          body: [
            "きれいに分類することより、まず捕まえること。Rough Boardは、ざっくりした考えを白いキャンバスに置き、関係はあとから結べるように設計しています。",
            "やわらかいノードと細い曲線は、視線を奪わず、書き足す余白を残すための選択です。",
          ],
        },
        {
          id: "prep-note",
          date: "2026.08.08",
          datetime: "2026-08-08",
          badge: "準備中",
          badgeTone: "note" as const,
          title: "App Store公開に向けて",
          summary: "iPhone・iOS 17以降向け。現在公開準備中です。",
          body: [
            "Rough Boardは現在App Store公開準備中です。対応環境や価格の最終表示は、公開時のApp Store上の記載が正しいものとします。",
          ],
        },
      ]
    : [
        {
          id: "site-launch",
          date: "2026.08.08",
          datetime: "2026-08-08",
          badge: "Update",
          title: "The official Rough Board brand site is now live",
          summary:
            "Write fast. Place thoughts. Connect later—local-first thinking, explained in one place.",
          body: [
            "The official Rough Board brand site is live. It covers the full-screen Write tab, the white Board, links and branches, search, sleep/archive, and the rest of the MVP.",
            "There is no App Store link yet. When distribution is ready, we will share it here as well.",
            "Data stays on device. The MVP has no ads, purchases, iCloud, or AI. See the Privacy Policy and Terms for details.",
          ],
        },
        {
          id: "column-space",
          date: "2026.08.08",
          datetime: "2026-08-08",
          badge: "Column",
          badgeTone: "column" as const,
          title: "Space first, structure later",
          summary: "Rough Board is a quiet canvas for rough thoughts—not a perfect notebook.",
          body: [
            "Capture before you categorize. Rough Board lets you drop half-formed ideas onto a white canvas and connect them when you are ready.",
            "Soft nodes and thin curves are deliberate: they stay quiet so your ink—and your next thought—can take the lead.",
          ],
        },
        {
          id: "prep-note",
          date: "2026.08.08",
          datetime: "2026-08-08",
          badge: "Coming soon",
          badgeTone: "note" as const,
          title: "Preparing for the App Store",
          summary: "Designed for iPhone on iOS 17+.",
          body: [
            "Rough Board is being prepared for the App Store. The listing will be the source of truth for requirements and pricing when it ships.",
          ],
        },
      ];
}

export function privacySections(ja: boolean): [string, string][] {
  return ja
    ? [
        [
          "1. はじめに",
          "本ポリシーは、Tomokichi（以下「運営者」）が提供するiOSアプリケーション「Rough Board」（以下「本アプリ」）および公式ブランドサイト（以下あわせて「本サービス」）における利用者情報の取扱いを定めるものです。公式Webサイトに掲載する内容を正本とし、本アプリ内からはWebサイトを参照する場合があります。",
        ],
        [
          "2. 運営者情報",
          "運営者：Tomokichi（個人開発者）\nお問い合わせ：https://tmkch.io の共通サポートフォーム（アプリ選択：Rough Board）\nメール：support@tmkch.io",
        ],
        [
          "3. 適用範囲",
          "本ポリシーは、本アプリの利用および公式ブランドサイトの閲覧に適用されます。",
        ],
        [
          "4. 基本方針",
          "本アプリはアカウント登録を必要としません。思考ノード、接続、設定などのデータは原則として利用者の端末内にのみ保存されます。運営者は、通常のアプリ利用だけではこれらの内容を閲覧できるサーバーを運用していません。\n\n本アプリは広告を表示しません。広告SDK、解析SDK、StoreKit、iCloud同期、AI機能はMVPに含まれません。お問い合わせフォームを明示的に送信した場合に限り、利用者が入力した情報と技術情報を送信します。",
        ],
        [
          "5. 端末内に保存する情報",
          "本アプリは、次の情報を端末内に保存します。\n\n・ボード上のノード（思考テキスト）および配置\n・ノード間のリンク・ブランチなどの関係\n・スリープ、アーカイブ、ソフトデリートに関する状態\n・書きかけの下書き（UserDefaults）\n・外観、触覚フィードバックなどの設定\n・コーチマーク等の初回案内の完了状態\n・その他、アプリの動作に必要なローカル設定\n\nボードデータはSwiftDataにより端末内に保存されます。下書きはUserDefaultsに保存されます。",
        ],
        [
          "6. 外部への送信",
          "本アプリの通常利用において、思考内容やボードデータを運営者サーバーへ送信することはありません。iCloudや第三者クラウドへの自動同期も行いません。\n\n共通サポートフォームを明示的に送信した場合に限り、次の情報がサポートAPIおよびメール配信事業者へ送信されることがあります。\n\n・問い合わせID、送信元、対象アプリ\n・カテゴリ、名前、メールアドレス、本文\n・アプリバージョン、OS情報、ロケール、送信日時など技術情報\n・不正利用防止に必要な情報\n\nボード上の思考や下書きは自動添付されません。",
        ],
        [
          "7. 広告・トラッキング",
          "本アプリは広告を表示しません。Google Mobile Ads等の広告SDK、Firebase Analytics等の解析SDK、App Tracking Transparencyプロンプトは使用しません。",
        ],
        [
          "8. 外部サービス",
          "本サービスは、提供に必要な範囲で次を利用することがあります。\n\n・Cloudflare Workers（お問い合わせAPI）\n・Resend（お問い合わせメール配送）\n・Apple（システム機能）\n・公式Webサイトの配信基盤\n\nサポートフォーム未送信時には、これらへ利用者の思考データを送りません。",
        ],
        [
          "9. 第三者提供",
          "運営者は、法令に基づく場合を除き、利用者の個人情報を不当に第三者へ提供しません。外部サービスへの委託処理は、本ポリシーに記載したサービス提供に必要な範囲で行われます。",
        ],
        [
          "10. 保存期間と削除",
          "端末内の記録は、利用者が削除するまで保存されます。ソフトデリート、アーカイブ、アプリの削除などにより整理・消去できます。本アプリをアンインストールすると端末内データは削除され、運営者が復旧することはできません。サポート情報は対応、法令、セキュリティ、不正防止に必要な期間保存します。",
        ],
        [
          "11. 安全管理措置",
          "運営者は、取り扱う情報について合理的な安全管理措置を講じます。端末内の情報は、iOSの標準的なセキュリティ機構のもとで保護されます。",
        ],
        [
          "12. 未成年者",
          "未成年の方が本アプリを利用する場合は、保護者の同意を得たうえでご利用ください。",
        ],
        [
          "13. ポリシーの変更",
          "法令または機能の変更に応じて本ポリシーを改定することがあります。重要な変更がある場合は、最終更新日を更新し、公式サイトまたはアプリ内で周知します。",
        ],
        [
          "14. お問い合わせ先",
          "本ポリシーに関するお問い合わせは、共通サポートフォーム、または support@tmkch.io までご連絡ください。",
        ],
      ]
    : [
        [
          "1. Introduction",
          "This policy explains how Tomokichi (the “Operator”) handles user information for the iOS app “Rough Board” (the “App”) and the official brand website (together, the “Service”). The website is authoritative; the App may refer to it.",
        ],
        [
          "2. Operator",
          "Operator: Tomokichi (individual developer)\nContact: the shared support form at https://tmkch.io (select Rough Board)\nEmail: support@tmkch.io",
        ],
        [
          "3. Scope",
          "This policy applies to use of the App and browsing of the official brand website.",
        ],
        [
          "4. Basic policy",
          "The App does not require an account. Thought nodes, connections, and settings are stored on your device in principle. The Operator does not run a server that can view those contents from ordinary use alone.\n\nThe App shows no ads. The MVP does not include an ads SDK, analytics SDK, StoreKit, iCloud sync, or AI features. Support details are sent only when you explicitly submit a support form.",
        ],
        [
          "5. Information stored on your device",
          "The App stores:\n\n・Board nodes (thought text) and layout\n・Links, branches, and other relationships between nodes\n・Sleep, archive, and soft-delete state\n・In-progress drafts (UserDefaults)\n・Appearance, haptics, and related settings\n・Coach-mark completion state\n・Other local settings needed for the App\n\nBoard data is stored on device with SwiftData. Drafts are stored in UserDefaults.",
        ],
        [
          "6. Outbound transmission",
          "In ordinary use, the App does not send thought content or board data to Operator servers. There is no automatic iCloud or third-party cloud sync.\n\nOnly when you explicitly submit the shared support form may the following be sent to the support API and email provider:\n\n・Enquiry id, source, target app\n・Category, name, email, message\n・Technical details such as app version, OS info, locale, and submission time\n・Details needed to prevent abuse\n\nBoard thoughts and drafts are never attached automatically.",
        ],
        [
          "7. Advertising and tracking",
          "The App shows no ads. It does not use advertising SDKs (such as Google Mobile Ads), analytics SDKs (such as Firebase Analytics), or an App Tracking Transparency prompt.",
        ],
        [
          "8. Service providers",
          "Where needed, the Service may use:\n\n・Cloudflare Workers (support API)\n・Resend (support email)\n・Apple system frameworks\n・Website hosting\n\nUntil you submit a support form, these providers do not receive your thought data.",
        ],
        [
          "9. Disclosure",
          "Except where required by law, the Operator does not improperly disclose personal information. Processing by providers is limited to what the Service needs.",
        ],
        [
          "10. Retention and deletion",
          "On-device records remain until you delete them. Soft delete, archive, and uninstalling the App help you clear data. Uninstalling removes on-device data; the Operator cannot restore it. Support information is kept as needed for response, law, security, and abuse prevention.",
        ],
        [
          "11. Security",
          "The Operator takes reasonable security measures. On-device data is protected by standard iOS mechanisms.",
        ],
        [
          "12. Minors",
          "If a minor uses the App, please do so with a parent or guardian’s consent.",
        ],
        [
          "13. Changes",
          "This policy may change with law or product updates. Material changes update the last-updated date and may be announced on the site or in the App.",
        ],
        ["14. Contact", "Questions: the shared support form, or support@tmkch.io."],
      ];
}

export function termsSections(ja: boolean): [string, string][] {
  return ja
    ? [
        [
          "第1条（適用）",
          "本規約は、運営者（Tomokichi）が提供するiOSアプリ「Rough Board」および公式ブランドサイト（あわせて「本サービス」）の利用条件を定めます。利用者は、本アプリをダウンロードまたは本サービスを利用した時点で本規約に同意したものとみなされます。",
        ],
        [
          "第2条（サービス内容）",
          "Rough Boardは、思考の素早い入力、白いボードへの配置、ノードの接続と分岐、検索、スリープ／アーカイブ、ソフトデリート、外観や触覚などの端末内設定、コーチマークによる案内などの機能を提供します。アカウント登録は不要です。MVPでは広告、アプリ内課金、iCloud同期、AI機能は提供しません。",
        ],
        [
          "第3条（利用料金）",
          "本アプリは無料で提供されます。広告は表示されません。通信に必要な費用は利用者の負担とします。将来、有料機能を提供する場合は、購入画面またはApp Storeの商品ページに税込価格を表示します。",
        ],
        [
          "第4条（利用者の責任）",
          "利用者は、自己の責任において本サービスを利用します。入力した思考内容のバックアップや管理も利用者の責任に属します。",
        ],
        [
          "第5条（禁止事項）",
          "法令違反、不正アクセス、運営妨害、違法な複製・再配布、サポートフォームの荒らし、その他運営者が不適切と合理的に判断する行為を禁止します。",
        ],
        [
          "第6条（知的財産権）",
          "本サービスに含まれるプログラム、デザイン、文章、画像等の権利は運営者または正当な権利者に帰属します。利用者が作成した思考・ノード内容の権利は利用者に帰属します。",
        ],
        [
          "第7条（データの管理）",
          "データは原則として端末内に保存され、iCloud等による自動同期はありません。アプリ削除、端末故障、紛失等によりデータが失われる場合があり、運営者は復旧できません。必要に応じて、利用者自身で内容を控えてください。",
        ],
        [
          "第8条（外部サービス）",
          "お問い合わせにはサポートAPIおよびメール配信事業者を利用します。各サービスの取扱いは各事業者の方針およびプライバシーポリシーに従います。",
        ],
        [
          "第9条（保証の否認・責任制限）",
          "本サービスは現状有姿で提供されます。運営者の故意または重過失および強行法規の範囲を除き、法令で認められる範囲で責任を限定します。",
        ],
        [
          "第10条（変更・中断・終了）",
          "運営者は、OS対応、法令、保守、セキュリティ等の理由により、本サービスを変更・中断・終了することがあります。",
        ],
        [
          "第11条（規約変更）",
          "本規約は変更されることがあります。変更後の規約は、本アプリまたは公式サイトに掲載された時点から効力を生じます。",
        ],
        [
          "第12条（準拠法・管轄）",
          "本規約は日本法に準拠します。消費者契約法その他の強行法規に別段の定めがある場合を除き、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
        ],
        [
          "第13条（お問い合わせ）",
          "本規約に関するお問い合わせは、共通サポートフォーム、または support@tmkch.io までご連絡ください。",
        ],
      ]
    : [
        [
          "Article 1 — Application",
          "These Terms govern the iOS app “Rough Board” and the official brand website (together, the “Service”) provided by Tomokichi. By downloading the App or using the Service, you agree to these Terms.",
        ],
        [
          "Article 2 — The Service",
          "Rough Board provides fast thought capture, placement on a white board, links and branches between nodes, search, sleep/archive, soft delete, on-device appearance and haptics settings, and coach marks. No account is required. The MVP does not include ads, in-app purchases, iCloud sync, or AI features.",
        ],
        [
          "Article 3 — Fees",
          "The App is free. No ads are shown. You are responsible for data charges. If paid products are introduced later, tax-inclusive prices will be shown on the purchase screen or App Store product page.",
        ],
        [
          "Article 4 — User responsibility",
          "You use the Service at your own responsibility, including managing and backing up the thoughts you enter.",
        ],
        [
          "Article 5 — Prohibited conduct",
          "You must not break the law, gain unauthorized access, disrupt the Service, unlawfully copy the App, abuse support, or engage in other conduct the Operator reasonably finds inappropriate.",
        ],
        [
          "Article 6 — Intellectual property",
          "Rights in the Service’s programs, design, text and images belong to the Operator or rights holders. Rights in thoughts and nodes you create belong to you.",
        ],
        [
          "Article 7 — Data management",
          "Data is stored on your device in principle; there is no automatic iCloud sync. Data may be lost if you uninstall, lose or damage the device; the Operator cannot restore it. Keep your own copies when needed.",
        ],
        [
          "Article 8 — Third parties",
          "Support uses a support API and email provider. Each provider processes information under its own policies and the Privacy Policy.",
        ],
        [
          "Article 9 — Disclaimer and liability",
          "The Service is provided “as is.” Except for willful misconduct, gross negligence or mandatory law, liability is limited to the extent permitted by law.",
        ],
        [
          "Article 10 — Changes, suspension, termination",
          "The Operator may change, suspend or end the Service for OS support, law, maintenance, security or similar reasons.",
        ],
        [
          "Article 11 — Changes to these Terms",
          "These Terms may be revised. Revised Terms take effect when posted in the App or on the website.",
        ],
        [
          "Article 12 — Governing law and jurisdiction",
          "Japanese law applies. Unless mandatory consumer law provides otherwise, the Tokyo District Court has exclusive first-instance jurisdiction.",
        ],
        ["Article 13 — Contact", "The shared support form, or support@tmkch.io."],
      ];
}
