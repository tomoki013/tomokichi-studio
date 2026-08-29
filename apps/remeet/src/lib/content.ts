export type Locale = "ja" | "en";
export type Page =
  | "features"
  | "how-to"
  | "screenshots"
  | "pricing"
  | "faq"
  | "privacy"
  | "terms"
  | "news"
  | "updates";

export const icons: Record<string, string> = {
  countdown: `<circle cx="12" cy="13.5" r="7.5"/><path d="M12 9.5v4l2.4 1.9"/><path d="M9.2 2.8h5.6"/>`,
  album: `<rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4"/><circle cx="8.6" cy="10.2" r="1.5"/><path d="M20.4 15.8l-4.9-4.9L10.2 16"/>`,
  wish: `<path d="M12 19.6s-6.9-4.3-6.9-8.8a3.9 3.9 0 016.9-2.5 3.9 3.9 0 016.9 2.5c0 4.5-6.9 8.8-6.9 8.8z"/>`,
  plans: `<path d="M12 3.4l8 4.4-8 4.4-8-4.4z"/><path d="M4 12.2l8 4.4 8-4.4"/><path d="M4 16.4l8 4.4 8-4.4"/>`,
  widget: `<rect x="3.4" y="3.4" width="7.2" height="7.2" rx="2.1"/><rect x="13.4" y="3.4" width="7.2" height="7.2" rx="2.1"/><rect x="3.4" y="13.4" width="7.2" height="7.2" rx="2.1"/><rect x="13.4" y="13.4" width="7.2" height="7.2" rx="2.1"/>`,
  globe: `<circle cx="12" cy="12" r="8.6"/><path d="M3.4 12h17.2"/><path d="M12 3.4c2.6 2.9 2.6 14.3 0 17.2-2.6-2.9-2.6-14.3 0-17.2z"/>`,
  calendar: `<rect x="3.4" y="5" width="17.2" height="15.6" rx="2.4"/><path d="M3.4 10h17.2"/><path d="M8.2 3.4v3.4M15.8 3.4v3.4"/><path d="M12 13.4v4M10 15.4h4"/>`,
  camera: `<path d="M4.2 8.2h2.9l1.5-2.1h6.8l1.5 2.1h2.9a1.2 1.2 0 011.2 1.2v8.5a1.2 1.2 0 01-1.2 1.2H4.2A1.2 1.2 0 013 17.9V9.4a1.2 1.2 0 011.2-1.2z"/><circle cx="12" cy="13.4" r="3.4"/>`,
  checklist: `<path d="M3.8 7.2l1.9 1.9 2.9-2.9"/><path d="M3.8 16.2l1.9 1.9 2.9-2.9"/><path d="M12.6 8h7.6"/><path d="M12.6 17h7.6"/>`,
  reunion: `<path d="M12 4.4l1.7 4.4 4.4 1.7-4.4 1.7L12 16.6l-1.7-4.4L5.9 10.5l4.4-1.7z"/><path d="M18.2 16.4l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z"/>`,
  mail: `<rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4"/><path d="M3.8 6.6l8.2 5.8 8.2-5.8"/>`,
  bulb: `<path d="M9.6 17.2h4.8"/><path d="M10.2 20h3.6"/><path d="M12 3.2a5.9 5.9 0 00-3.4 10.7c.4.3.5.7.5 1.1h5.8c0-.4.1-.8.5-1.1A5.9 5.9 0 0012 3.2z"/>`,
  export: `<path d="M12 3.8v10"/><path d="M8.4 10.2l3.6 3.6 3.6-3.6"/><path d="M4.4 15.8v3a1.6 1.6 0 001.6 1.6h12a1.6 1.6 0 001.6-1.6v-3"/>`,
  bell: `<path d="M12 3.4a5.4 5.4 0 00-5.4 5.4c0 4.4-1.6 5.8-1.6 5.8h14s-1.6-1.4-1.6-5.8A5.4 5.4 0 0012 3.4z"/><path d="M10.3 18a1.9 1.9 0 003.4 0"/>`,
  map: `<path d="M9 4.4l-5.2 2.1v12.9L9 17.3l6 2.3 5.2-2.1V4.6L15 6.7z"/><path d="M9 4.4v12.9M15 6.7v12.9"/>`,
  phone: `<rect x="7" y="2.8" width="10" height="18.4" rx="2.2"/><path d="M10 18.6h4"/>`,
  shield: `<path d="M12 3.2l7.2 2.8v5.6c0 4.4-2.9 8.4-7.2 9.6-4.3-1.2-7.2-5.2-7.2-9.6V6z"/>`,
  trash: `<path d="M5 7.2h14"/><path d="M9.2 7.2V5.4h5.6v1.8"/><path d="M7.4 7.2l.8 12h7.6l.8-12"/>`,
  edit: `<path d="M4.4 16.4l.8-3.2L15.2 3.2l3.2 3.2L8.2 16.6z"/><path d="M13.4 5l3.2 3.2"/>`,
  lock: `<rect x="5.2" y="10.2" width="13.6" height="10" rx="2"/><path d="M8.2 10.2V7.6a3.8 3.8 0 017.6 0v2.6"/>`,
};

export function pick<T>(ja: boolean, pair: [T, T]): T {
  return pair[ja ? 0 : 1];
}

export const titleMap: Record<Page, [string, string]> = {
  features: ["Remeetの機能", "Remeet features"],
  "how-to": ["使い方", "How to use"],
  screenshots: ["スクリーンショット", "Screenshots"],
  pricing: ["料金", "Pricing"],
  faq: ["よくある質問", "Frequently asked questions"],
  privacy: ["プライバシーポリシー", "Privacy Policy"],
  terms: ["利用規約", "Terms of Service"],
  news: ["ニュース", "News"],
  updates: ["アップデート情報", "App updates"],
};

export const subtitleMap: Partial<Record<Page, [string, string]>> = {
  features: [
    "必要な機能を、シンプルに。\n待つ時間を、そっと支えるために。",
    "The features you need, kept simple —\nquietly supporting the time you wait.",
  ],
  "how-to": [
    "初回設定から日々の使い方まで、\n画面の流れに沿ってご案内します。",
    "From first setup to everyday use,\nfollow the flow of the real app screens.",
  ],
  screenshots: ["美しく、シンプルで、使いやすいデザイン。", "Beautiful, simple, and easy to use."],
  pricing: [
    "ひとりでも、ふたりでも。\n必要なときだけ選べる料金です。",
    "Use it on your own or wait together.\nPay only when you need another shared reunion.",
  ],
  faq: [
    "よくいただくご質問をまとめました。\n解決しないときは、お気軽にご連絡ください。",
    "Answers to the questions we hear most.\nIf something is still unclear, just reach out.",
  ],
  news: [
    "Remeetからのお知らせと、待つ時間についての読みもの。",
    "News from Remeet and notes about the time between reunions.",
  ],
  updates: [
    "バージョンごとの新機能、改善、修正を記録します。",
    "Version-by-version features, improvements, and fixes.",
  ],
};

export const pageDescriptions: Partial<Record<Page, [string, string]>> = {
  features: [
    "カウントダウン、ルートイラスト、待っている間の記録、ウィジェットなど、Remeetの主な機能をご紹介します。",
    "Explore Remeet’s countdown, route illustration, waiting memories, widgets, and other core features.",
  ],
  "how-to": [
    "再会予定の作成から記録、ウィジェットまで、Remeetの使い方を画面付きで解説します。",
    "Learn how to create reunions, keep records, and add widgets.",
  ],
  screenshots: [
    "Remeetのホーム、記録、ウィジェットなどの画面イメージです。",
    "Screen previews of Remeet’s home, records, and widgets.",
  ],
  pricing: [
    "Remeetの個人利用と最初の再会の共有は無料。2回目以降の共有に使うShare Passについてご案内します。",
    "Personal use and your first shared reunion are free. Learn about Share Pass for each additional shared reunion.",
  ],
  faq: [
    "アカウント不要、端末内保存、広告、ウィジェット、機種変更など、Remeetのよくある質問。",
    "FAQ about Remeet: no account, on-device storage, ads, widgets, device changes, and more.",
  ],
  privacy: [
    "Remeetのプライバシーポリシー。端末内保存、iCloud共有、Share Pass、広告、外部通信について説明します。",
    "Remeet Privacy Policy covering on-device storage, iCloud sharing, Share Pass, advertising, and external communications.",
  ],
  terms: [
    "Remeetの利用規約。無料利用、iCloud共有、Share Pass、広告、データ管理について定めます。",
    "Remeet Terms of Service covering free use, iCloud sharing, Share Pass, advertising, and data responsibility.",
  ],
  news: [
    "Remeet公式ブランドサイト公開のお知らせ。",
    "Updates from Remeet, including product notes and columns.",
  ],
  updates: [
    "Remeetアプリのバージョンごとの変更内容。",
    "Version-by-version release notes for the Remeet app.",
  ],
};

export function features(ja: boolean) {
  return ja
    ? ([
        [
          "countdown",
          "再会までのカウントダウン",
          "再会の日までを、日数と進捗で見守ります。それぞれの現地時刻と天気も表示します（天気は外部サービスから取得します）。",
        ],
        [
          "map",
          "二つの場所をつなぐルートイラスト",
          "ふたりの場所をつなぐルートイラストで、離れている距離をやさしく表現します。正確な地図やリアルタイムの航路ではありません。",
        ],
        [
          "album",
          "待っている間の記録",
          "写真とメモで、離れている日々を自分の記録として残せます。1件につき写真は1枚です。",
        ],
        [
          "wish",
          "会ったらやりたいことリスト",
          "一緒にしたいことをリストに残せます。共有した再会では、招待したパートナーと一緒に編集できます。1項目につき写真は1枚です。",
        ],
        [
          "plans",
          "複数の再会予定",
          "旅行や帰省など、いくつもの予定を並行して管理し、表示する予定を切り替えられます。",
        ],
        [
          "reunion",
          "再会当日の記録",
          "再会の日に写真と振り返りを残し、予定が変わったときは日時を変更できます。",
        ],
        [
          "album",
          "アルバム",
          "完了した再会をアルバムとして見返せます。同じ相手の再会をまとめることもできます。",
        ],
        [
          "widget",
          "ホーム画面・ロック画面ウィジェット",
          "アプリを開かずに、残りの日数や進捗を確認できます。",
        ],
        [
          "bell",
          "通知",
          "1週間前、前日、当日の朝、再会時刻を個別にオン／オフできます。待ち時間が長い場合の節目や、記念日、共有相手からのリアクションなども、設定に応じて届くことがあります。",
        ],
        [
          "calendar",
          "カレンダーへの追加",
          "設定から、選択中の再会予定を端末のカレンダーへ追加できます。",
        ],
        [
          "globe",
          "6言語に対応",
          "日本語・英語・フランス語・韓国語・スペイン語・中国語で利用できます。",
        ],
        [
          "phone",
          "端末内保存",
          "予定・写真・メモは端末内に保存されます。同じApple AccountのiCloudにサインインしている場合、個人利用の記録も非公開のiCloudへ同期されることがあります。共有を有効にした再会は、指定した1人のパートナーと同期されます。",
        ],
        ["shield", "アカウント登録不要", "登録やログインなしですぐに使い始められます。"],
      ] as const)
    : ([
        [
          "countdown",
          "Reunion countdown",
          "Watch the days and progress until you meet again. Each place shows its local time and weather (weather comes from an external service).",
        ],
        [
          "map",
          "Route illustration between two places",
          "A gentle route illustration connects both places and softens the distance. It is not a live map or real-time flight path.",
        ],
        [
          "album",
          "Memories while apart",
          "Keep photos and notes from the days in between as your own record. One photo per entry.",
        ],
        [
          "wish",
          "Things to do together",
          "List what you want to do when you meet. On a shared reunion, the invited partner can edit it with you. One photo per wish.",
        ],
        [
          "plans",
          "Multiple reunion plans",
          "Trips, visits and more can run side by side. Switch which plan is shown anytime.",
        ],
        [
          "reunion",
          "Reunion-day capture",
          "Save a photo and reflection on the day, or postpone if plans change.",
        ],
        [
          "album",
          "Albums",
          "Revisit completed reunions in albums. You can group reunions with the same person.",
        ],
        [
          "widget",
          "Home and Lock Screen widgets",
          "See days left and progress without opening the app.",
        ],
        [
          "bell",
          "Notifications",
          "Toggle one week before, the day before, the morning of, and at reunion time independently. Longer waits, anniversaries, and partner reactions may also notify you, depending on settings.",
        ],
        [
          "calendar",
          "Add to Calendar",
          "From Settings, add the selected reunion to your device calendar.",
        ],
        [
          "globe",
          "Six languages",
          "Available in Japanese, English, French, Korean, Spanish and Chinese.",
        ],
        [
          "phone",
          "On-device storage",
          "Plans, photos, and notes are stored on your device. If you are signed into iCloud with the same Apple Account, personal records may also sync to your private iCloud database. A shared reunion syncs with the one partner you invite.",
        ],
        ["shield", "No account required", "Start immediately — no sign-up, no login."],
      ] as const);
}

export function steps(ja: boolean) {
  return ja
    ? ([
        ["calendar", "再会予定を作る", "再会の日付と、ふたりがいる場所を設定します。"],
        ["camera", "待っている日々を記録する", "写真やメモで、離れている時間を残します。"],
        ["checklist", "会ったらやりたいことを残す", "再会の日にしたいことを、ひとつずつリストに。"],
        ["reunion", "再会の日を記録してアルバムに残す", "会えた日の写真と振り返りをアルバムへ。"],
      ] as const)
    : ([
        ["calendar", "Create a reunion", "Set the date and where each of you will be."],
        ["camera", "Record the waiting days", "Keep photos and notes from the time apart."],
        ["checklist", "Save things to do", "List what you want to do when you meet."],
        [
          "reunion",
          "Capture the day in an album",
          "Save a photo and reflection from the day you meet.",
        ],
      ] as const);
}

export type Guide = {
  icon: string;
  title: string;
  /** The real app screen this step happens on. */
  screen?: "home" | "memories" | "wishes" | "album" | "settings";
  /** Illustration, for the widget steps that cannot be captured in-app. */
  image?: string;
  imageAlt?: string;
  steps: string[];
  note?: string;
};

export function guides(ja: boolean): Guide[] {
  return ja
    ? [
        {
          icon: "phone",
          title: "初回設定",
          screen: "home",
          steps: [
            "アプリを開くと、はじめに世界観の紹介が表示されます。",
            "続いて、最初の再会予定（名前・場所・日付）を入力します。",
            "保存するとホーム画面へ進み、カウントダウンが始まります。",
          ],
          note: "アカウント登録やログインは必要ありません。",
        },
        {
          icon: "calendar",
          title: "再会予定の作成",
          screen: "home",
          steps: [
            "ホーム上部の予定名をタップします。",
            "「新しい再会をつくる」を選びます。",
            "相手の名前、場所、再会日時を入力して保存します。",
          ],
        },
        {
          icon: "edit",
          title: "再会予定の編集",
          screen: "home",
          steps: [
            "ホームの編集ボタンを開きます。",
            "日付・時刻・場所・名前などを変更します。",
            "保存すると、通知とウィジェットにも反映されます。",
          ],
        },
        {
          icon: "camera",
          title: "待っている間の記録",
          screen: "memories",
          steps: [
            "ホームから「写真やメモを追加」を開きます。",
            "写真を選び、メモを添えて保存します。",
            "1件につき写真は1枚です。あとから編集・削除できます。",
          ],
        },
        {
          icon: "checklist",
          title: "会ったらやりたいことの追加",
          screen: "wishes",
          steps: [
            "ホームから「やりたいことを追加」を開きます。",
            "タイトル、メモ、写真を追加して保存します。",
            "再会の日には、叶えた項目を選んで記録に残せます。",
          ],
        },
        {
          icon: "reunion",
          title: "再会当日の記録",
          screen: "album",
          steps: [
            "再会時刻になると、再会画面へ切り替わります。",
            "写真と振り返りを残して完了します。",
            "予定が変わった場合は、日時を変更して延期できます。",
          ],
        },
        {
          icon: "album",
          title: "アルバムの確認",
          screen: "album",
          steps: [
            "下部の「アルバム」タブを開きます。",
            "完了した再会を選ぶと、写真と振り返りを見返せます。",
            "同じ相手の再会をひとつのアルバムにまとめることもできます。",
          ],
        },
        {
          icon: "widget",
          title: "ホーム画面ウィジェットの追加",
          image: "/assets/feature-widget.png",
          imageAlt: "ホーム画面に置かれたRemeetウィジェット",
          steps: [
            "ホーム画面の空いている部分を長押しします。",
            "「編集」から「ウィジェットを追加」を選びます。",
            "Remeetを検索して、好きなサイズを配置してください。",
          ],
        },
        {
          icon: "lock",
          title: "ロック画面ウィジェットの追加",
          image: "/assets/widget-showcase.png",
          imageAlt: "ロック画面向けRemeetウィジェット",
          steps: [
            "ロック画面を長押ししてカスタマイズを開きます。",
            "ウィジェット領域をタップし、Remeetを選びます。",
            "インライン・円形・長方形など、好きなスタイルを配置します。",
          ],
        },
        {
          icon: "bell",
          title: "通知設定",
          screen: "settings",
          steps: [
            "下部の「設定」タブを開きます。",
            "「通知」を開きます。",
            "1週間前・前日・当日の朝・再会時刻を、それぞれオン／オフできます。",
          ],
          note: "通知の許可は、最初の再会を保存したあとに求められます。",
        },
        {
          icon: "calendar",
          title: "カレンダーへの追加",
          screen: "settings",
          steps: [
            "「設定」を開きます。",
            "「カレンダー」をタップします。",
            "確認のあと、選択中の再会予定を端末のカレンダーへ追加できます。",
          ],
        },
        {
          icon: "globe",
          title: "表示言語の変更",
          screen: "settings",
          steps: [
            "iOSの「設定」アプリを開きます。",
            "「Remeet」を選びます。",
            "「言語」から表示言語を変更します。",
          ],
        },
        {
          icon: "trash",
          title: "すべてのデータの削除",
          screen: "settings",
          steps: [
            "「設定」を開き、いちばん下の「すべてのデータを削除」を選びます。",
            "何が消えて何が残るかを読み、赤いボタンを押します。",
            "共有中の再会は先に共有が終了され、そのあと端末内のRemeetデータが削除されます。",
          ],
          note: "削除後は元に戻せません。共有していた相手からも見えなくなります。購入したShare Passとブロックの設定は残ります。大切な写真が写真アプリにも残っていることを確認してください。",
        },
      ]
    : [
        {
          icon: "phone",
          title: "First setup",
          screen: "home",
          steps: [
            "Open the app to see a short introduction.",
            "Create your first reunion with names, places and a date.",
            "After you save, Home opens and the countdown begins.",
          ],
          note: "No account or sign-in is required.",
        },
        {
          icon: "calendar",
          title: "Create a reunion",
          screen: "home",
          steps: [
            "Tap the plan name at the top of Home.",
            "Choose “Create a new reunion”.",
            "Enter names, places and the reunion date, then save.",
          ],
        },
        {
          icon: "edit",
          title: "Edit a reunion",
          screen: "home",
          steps: [
            "Open the edit control on Home.",
            "Change the date, time, places or names.",
            "Saving also updates notifications and widgets.",
          ],
        },
        {
          icon: "camera",
          title: "Memories while apart",
          screen: "memories",
          steps: [
            "From Home, open “Add photo or note”.",
            "Choose a photo, add a note, and save.",
            "One photo per entry. You can edit or delete later.",
          ],
        },
        {
          icon: "checklist",
          title: "Add things to do",
          screen: "wishes",
          steps: [
            "From Home, open “Add something to do”.",
            "Add a title, optional note and photo, then save.",
            "On reunion day you can mark wishes as completed.",
          ],
        },
        {
          icon: "reunion",
          title: "Capture reunion day",
          screen: "album",
          steps: [
            "When reunion time arrives, the reunion screen opens.",
            "Save a photo and reflection to finish.",
            "If plans change, you can postpone the date and time.",
          ],
        },
        {
          icon: "album",
          title: "Browse albums",
          screen: "album",
          steps: [
            "Open the “Album” tab.",
            "Select a completed reunion to revisit its photo and reflection.",
            "You can group reunions with the same person into one album.",
          ],
        },
        {
          icon: "widget",
          title: "Add a Home Screen widget",
          image: "/assets/feature-widget.png",
          imageAlt: "Remeet widgets on the Home Screen",
          steps: [
            "Touch and hold an empty area of the Home Screen.",
            "Choose Edit, then Add Widget.",
            "Search for Remeet and place the size you like.",
          ],
        },
        {
          icon: "lock",
          title: "Add a Lock Screen widget",
          image: "/assets/widget-showcase.png",
          imageAlt: "Remeet Lock Screen widget styles",
          steps: [
            "Touch and hold the Lock Screen to customize it.",
            "Tap a widget area and choose Remeet.",
            "Place an inline, circular or rectangular style.",
          ],
        },
        {
          icon: "bell",
          title: "Notification settings",
          screen: "settings",
          steps: [
            "Open the Settings tab.",
            "Open Notifications.",
            "Toggle one week before, the day before, the morning of, and at reunion time independently.",
          ],
          note: "Permission is requested after you save your first reunion.",
        },
        {
          icon: "calendar",
          title: "Add to Calendar",
          screen: "settings",
          steps: [
            "Open Settings.",
            "Tap Calendar.",
            "After confirmation, the selected reunion is added to your device calendar.",
          ],
        },
        {
          icon: "globe",
          title: "Change the language",
          screen: "settings",
          steps: [
            "Open the iOS Settings app.",
            "Select Remeet.",
            "Change the language under Language.",
          ],
        },
        {
          icon: "trash",
          title: "Delete all data",
          screen: "settings",
          steps: [
            "Open Settings and choose Delete all data at the bottom.",
            "Read what goes and what stays, then press the red button.",
            "Shared reunions are unshared first, then Remeet data on this device is removed.",
          ],
          note: "This cannot be undone. A partner you shared with loses access too. Purchased Share Passes and your block list are kept. Make sure important photos also live in the Photos app.",
        },
      ];
}

export function faqs(ja: boolean) {
  return ja
    ? ([
        [
          "start",
          "Remeetはどんなアプリですか？",
          "大切な人と再会する日までをカウントダウンし、その間の写真や気持ち、会ったらやりたいことを自分の端末に残すアプリです。カップルだけでなく、帰省、留学、家族や友人との再会にも使えます。",
        ],
        [
          "start",
          "アカウント登録は必要ですか？",
          "必要ありません。登録やログインなしですぐに使えます。",
        ],
        [
          "start",
          "無料で利用できますか？",
          "はい。個人利用の基本機能と最初の再会の共有は無料です。一部画面には広告が表示されます。2回目以降の再会を共有する場合は、1つの再会に1枚のShare Pass（¥500）が必要です。サブスクリプションではありません。",
        ],
        [
          "start",
          "対応している端末とiOSは？",
          "iPhone・iOS 26以降に対応しています。現在のバージョンはiPhone向けで、iPadに最適化されたレイアウトは今後対応予定です。",
        ],
        [
          "start",
          "遠距離カップル以外でも利用できますか？",
          "はい。帰省、留学、家族や友人との再会、旅行やイベントの待ち時間など、大切な人と次に会う日を楽しみに待つ用途全般で使えます。",
        ],
        [
          "feature",
          "二人の端末でデータを共有できますか？",
          "できます。最初の再会は無料で1人のパートナーと共有できます。2回目以降は1つの再会につきShare Passを1枚使い、AppleのiCloud経由で予定・記録・やりたいことを同期します。",
        ],
        [
          "feature",
          "ウィジェットはどこで使えますか？",
          "ホーム画面とロック画面の両方に対応しています。サイズに応じて、日数・進捗・経路・最近の記録・やりたいことなどを表示します。",
        ],
        [
          "feature",
          "再会予定は複数作れますか？",
          "作れます。ホーム上部の予定名から新しい再会を追加し、表示する予定を切り替えられます。",
        ],
        [
          "feature",
          "通知のタイミングを変更できますか？",
          "1週間前、前日、当日の朝、再会時刻を、設定の「通知」からそれぞれ個別にオン・オフできます。待ち時間が長い場合の節目や、記念日、共有相手からのリアクションなども、設定に応じて届くことがあります。",
        ],
        [
          "feature",
          "写真は何枚保存できますか？",
          "現在のバージョンでは、やりたいこと、待っている間の記録、再会記録にそれぞれ1枚の写真を保存できます。",
        ],
        [
          "feature",
          "地図は実際の地図ですか？",
          "いいえ。ホームのルートは、二地点をつなぐ装飾用のイラストです。正確な地図タイルやリアルタイムの航路ではありません。地名の検索にはAppleのジオコーディングを使います。",
        ],
        [
          "feature",
          "広告は表示されますか？",
          "はい。個人利用ではホームや、件数が増えたやりたいこと・記録の一覧など、一部の画面にネイティブ広告が表示されます。Share Passを使って共有した再会では、参加者双方に広告を表示しません。",
        ],
        [
          "data",
          "データはどこに保存されますか？",
          "予定・写真・メモは端末内に保存されます。同じApple AccountのiCloudにサインインしている場合、個人利用の記録もAppleのiCloud（非公開データベース）へ同期されることがあります。共有を有効にした再会の内容と、初回無料共有の利用状態・Share Pass台帳もiCloud / CloudKitに保存されます。運営者は記録内容を収集する独自サーバーを保有していません。",
        ],
        [
          "data",
          "機種変更時にデータを引き継げますか？",
          "同じApple AccountでiCloudを利用している場合、個人利用の記録が新しい端末へ同期されることがあります。共有中の再会は、双方がiCloudを利用できることが前提です。\n\n招待リンクは新しい端末へは引き継がれません。",
        ],
        [
          "data",
          "アプリを削除するとデータはどうなりますか？",
          "端末内に保存されたRemeetのデータは削除され、運営者が復旧することはできません。大切な写真は写真アプリにも残しておいてください。",
        ],
        [
          "data",
          "運営者は写真や記録を見ることができますか？",
          "通常のアプリ利用だけでは、運営者が再会予定・写真・メモなどの記録内容を閲覧することはできません。問い合わせフォームを送信したときのみ、入力した内容と技術情報が送られます。",
        ],
        [
          "data",
          "すべてのデータを削除できますか？",
          "はい。「設定」のいちばん下にある「すべてのデータを削除」から削除できます。共有中の再会は先に共有が終了され、相手からも見えなくなります。削除後は元に戻せません。購入したShare Passとブロックの設定は残ります。",
        ],
        [
          "other",
          "オフラインでも利用できますか？",
          "記録の閲覧や編集はオフラインでも利用できます。ただし次の場合は通信が必要になることがあります。天気情報、地名検索、現在地の地名変換、広告取得、最新の法務文書表示、問い合わせ送信。",
        ],
        [
          "other",
          "表示言語を変更できますか？",
          "はい。iOSの設定アプリからRemeetの言語を変更できます。日本語・英語・フランス語・韓国語・スペイン語・中国語に対応しています。",
        ],
        [
          "other",
          "問い合わせ時に何が送信されますか？",
          "フォームを明示的に送信した場合のみ、名前（任意）、メールアドレス、カテゴリ、本文、アプリバージョン、ビルド番号、iOSバージョン、表示言語、問い合わせ識別子、送信日時などが送られることがあります。写真や再会予定の内容は自動送信されません。",
        ],
        [
          "other",
          "広告に関する同意を変更できますか？",
          "はい。地域によって表示される同意画面や、iOSのトラッキング許可から変更できます。許可しなくてもアプリの基本機能は利用でき、広告は表示されることがありますが、他社アプリやWebサイトをまたいだ情報を使ったパーソナライズは行われません。",
        ],
      ] as const)
    : ([
        [
          "start",
          "What is Remeet?",
          "An app that counts down to the day you meet someone important again, and keeps photos, thoughts and things you want to do on your own device. It works for couples, family visits, study abroad, friends and more.",
        ],
        ["start", "Do I need an account?", "No. You can start immediately — no sign-up, no login."],
        [
          "start",
          "Is it free?",
          "Yes. Personal use and your first shared reunion are free. Ads may appear on some screens. Each additional shared reunion uses one ¥500 Share Pass. There is no subscription.",
        ],
        [
          "start",
          "Which devices and iOS versions are supported?",
          "Requires an iPhone running iOS 26 or later. The current version is designed for iPhone; an iPad-optimized layout is planned later.",
        ],
        [
          "start",
          "Can I use it if I’m not in a long-distance relationship?",
          "Yes. Homecomings, study abroad, family or friends, trips and events — anything where you’re waiting to meet someone important.",
        ],
        [
          "feature",
          "Can two phones share the same data?",
          "Yes. Share your first reunion with one partner for free. Each additional shared reunion uses one Share Pass and syncs plans, records and wishes through Apple iCloud.",
        ],
        [
          "feature",
          "Where do widgets work?",
          "Both the Home Screen and Lock Screen. Depending on size, they can show days left, progress, the route, recent records and wishes.",
        ],
        [
          "feature",
          "Can I create multiple reunions?",
          "Yes. From the plan name on Home you can add another reunion and switch which one is shown.",
        ],
        [
          "feature",
          "Can I change notification timing?",
          "You can independently toggle one week before, the day before, the morning of, and at reunion time in Settings → Notifications. Longer waits, anniversaries, and partner reactions may also notify you, depending on settings.",
        ],
        [
          "feature",
          "How many photos can I save?",
          "In the current version, wishes, waiting memories and completed reunions each store one photo.",
        ],
        [
          "feature",
          "Is the map a real map?",
          "No. The home route is a decorative illustration between two points, not live map tiles or a real-time flight path. Place search uses Apple geocoding.",
        ],
        [
          "feature",
          "Are there ads?",
          "Yes. Native ads may appear during personal use on Home and longer wish or memory lists. A reunion shared with a Share Pass is ad-free for both participants.",
        ],
        [
          "data",
          "Where is my data stored?",
          "Plans, photos and notes are stored on this device. If you are signed into iCloud with the same Apple Account, personal records may also sync to your private iCloud database. Shared reunion content, first-free-sharing state and the Share Pass ledger also use Apple iCloud / CloudKit. The operator does not run a proprietary server that collects your records.",
        ],
        [
          "data",
          "Can I move data when I change phones?",
          "If you use iCloud with the same Apple Account, personal records may appear on a new device. A shared reunion still needs iCloud on both phones.\n\nInvite links do not transfer to a new phone.",
        ],
        [
          "data",
          "What happens if I delete the app?",
          "Remeet data on the device is deleted and the operator cannot recover it. Keep important photos in the Photos app too.",
        ],
        [
          "data",
          "Can the operator see my photos and records?",
          "During normal use, the operator cannot view your reunion plans, photos or notes. Only when you submit the support form are your typed answers and technical details sent.",
        ],
        [
          "data",
          "Can I delete all data?",
          "Yes — Delete all data at the bottom of Settings. Shared reunions are unshared first, so a partner loses access too. This cannot be undone. Purchased Share Passes and your block list are kept.",
        ],
        [
          "other",
          "Can I use it offline?",
          "Viewing and editing records works offline. Network access may still be needed for weather, place search, reverse geocoding, ad loading, the latest legal documents, and support submissions.",
        ],
        [
          "other",
          "Can I change the display language?",
          "Yes, from the iOS Settings app under Remeet. Supported languages: Japanese, English, French, Korean, Spanish and Chinese.",
        ],
        [
          "other",
          "What is sent with a support enquiry?",
          "Only when you submit the form: optional name, email, category, message, app version, build number, iOS version, display language, enquiry id, submission time and related details. Photos and reunion content are not attached automatically.",
        ],
        [
          "other",
          "Can I change advertising consent?",
          "Yes, through regional consent prompts and iOS tracking permission. You can use every feature without allowing tracking. Ads may still appear, but they will not use cross-app or cross-website data for personalization without permission.",
        ],
      ] as const);
}

export function privacySections(ja: boolean): [string, string][] {
  return ja
    ? [
        [
          "1. はじめに",
          "本ポリシーは、運営者（Tomokichi）が提供するiOSアプリケーション「Remeet」および本ウェブサイト（以下あわせて「本サービス」）における、利用者情報の取扱いについて定めるものです。本ウェブサイトに掲載する内容を正本とし、本アプリ内からは本ウェブサイトを参照します。オフライン時にはアプリ内の参照用コピーが表示される場合があります。",
        ],
        [
          "2. 運営者情報",
          "本サービスは、運営者（Tomokichi）が個人で開発・運営しています。お問い合わせは support@tmkch.io または共通お問い合わせフォームからご連絡ください。",
        ],
        [
          "3. 適用範囲",
          "本ポリシーは、本アプリの利用および本ウェブサイトの閲覧に関して適用されます。",
        ],
        [
          "4. 基本方針",
          "本アプリは独自のアカウント登録を必要としません。再会の予定、写真、メモ等は端末内に保存されます。同じApple AccountのiCloudにサインインしている場合、個人利用の記録もAppleのiCloud（非公開データベース）へ同期されることがあります。共有を有効にした再会は、AppleのiCloudおよびCloudKitを通じて指定された1人のパートナーと同期されます。運営者は記録内容を収集・閲覧する独自サーバーを保有していません。本アプリは広告表示のためGoogle Mobile Ads SDKを使用しますが、アプリ内記録を広告配信事業者へ送信しません。",
        ],
        [
          "5. 端末内に保存する情報",
          "本アプリは、利用者が入力または選択した次の情報を、端末内のデータベース（Core Data）およびApp Group領域に保存します。同じApple AccountのiCloudにサインインしている場合、個人利用の記録も非公開のiCloudへ同期されることがあります。共有を有効にした再会では、対象となる情報を指定したパートナーと共有します。\n\n・再会予定の名称、離れ始めた日時、再会日時、メモ\n・自分・相手・待ち合わせ場所の地名、緯度経度、タイムゾーン\n・「会ったらやりたいこと」の項目と完了状態\n・待っている間の記録および再会記録の写真、日付、メモ、感想、5段階評価\n・共有状態、Share Passの購入Transaction ID、未使用・予約・使用済みの状態および対象再会ID\n・通知のオン／オフなどのアプリ設定\n\n端末内の一部情報は、ウィジェット表示のため同一開発者のApp Group内でも共有されます。",
        ],
        [
          "6. 外部サービスへ送信される情報",
          "本アプリが外部と通信を行うのは、次の場合です。\n\n(1) iCloud共有とShare Pass台帳：共有を有効にした再会の予定、写真、メモ等、および初回無料共有の利用状態とShare Pass台帳をAppleのiCloud / CloudKitへ送信します。共有内容は、招待を承認した1人のパートナーからも閲覧・編集できます。\n\n(2) App内課金：Share Passの購入、Transactionの検証および購入情報の同期のためAppleのStoreKitと通信します。\n\n(3) Open-Meteo：天気取得のため、登録地点の緯度経度を open-meteo.com へ送信します。氏名や写真等は送信しません。\n\n(4) Appleの地名検索・ジオコーディング：入力した検索語または取得した座標をAppleの機能へ送信します。\n\n(5) 広告配信と同意管理：Google Mobile Ads SDKおよびUser Messaging Platformが、IPアドレス、端末・広告識別子、技術情報、同意状況等を送信する場合があります。記録内容は送信しません。\n\n(6) 法務文書：最新版を表示するため本ウェブサイトへ通信します。\n\n(7) 問い合わせ：フォームを明示的に送信した場合に限り、入力内容、アプリ・OS情報、表示言語、送信日時、問い合わせ識別子等をサポートAPIおよびメール配信事業者へ送信します。記録内容は自動送信しません。",
        ],
        [
          "7. 端末機能へのアクセス",
          "本アプリは次の機能を、利用者の許可を得たうえで使用します。許可はiOSの「設定」から変更できます。\n\n・カメラ：待っている間および再会の写真を撮影するため\n・写真ライブラリ：利用者が選択した写真を読み込むため\n・位置情報：「現在地を使う」を押したときだけ、地名とタイムゾーンへ変換するため。継続的な追跡は行いません\n・カレンダー：利用者が操作した場合に再会予定を書き込むため。既存の予定は読み取りません\n・通知：端末上で再会のリマインダーを表示するため\n・トラッキング：許可された場合に限り、他社アプリやWebサイトをまたいだ情報をパーソナライズ広告等に使用するため。許可しなくても本アプリの全機能を利用できます",
        ],
        [
          "8. 広告配信",
          "本アプリは広告表示のためGoogle Mobile Ads SDKおよび同意管理のためのUser Messaging Platform（UMP）を使用します。\n\n・広告配信、効果測定、不正利用防止等の目的で、IPアドレス、端末情報、広告識別子、アプリ操作・診断情報、同意状況等がGoogleおよび広告配信パートナーにより処理される場合があります\n・広告識別子の利用は、利用者の許可および地域の同意状況に従います\n・同意状況に応じて、パーソナライズ広告または非パーソナライズ広告が表示される場合があります\n・App Tracking Transparency（ATT）を拒否しても、アプリの基本機能は制限されません\n・同意やトラッキングの設定は、表示される同意画面およびiOSの設定から変更できる場合があります\n\n再会予定、写真、メモ等のアプリ内記録内容は広告配信事業者へ送信しません。Googleが取得する情報の詳細は、Googleのプライバシーポリシーおよび広告に関する公式説明をあわせてご確認ください。",
        ],
        [
          "9. 外部サービス・第三者提供",
          "運営者は、利用者のアプリ内記録を販売または貸与しません。本ポリシーに記載した範囲で、Apple（iCloud / CloudKit、StoreKit、ジオコーディング等）、Google（広告配信・同意管理）、Open-Meteo（天気）、Cloudflare Workers（問い合わせAPI）、Resend（問い合わせメール配送）を利用します。法令に基づく場合を除き、無関係な第三者へ提供しません。",
        ],
        [
          "10. 保存期間と削除",
          "端末内およびiCloudの情報は、利用者が削除するまで保存されます。個々の記録は各画面から、すべてのデータは「設定 → すべてのデータを削除」から削除できます。共有中の再会を削除すると共有参加者からも閲覧できなくなります。アンインストールすると端末内情報は削除されますが、iCloud上の共有状態やShare Pass台帳は再インストール後の同期に必要な範囲で残る場合があります。",
        ],
        [
          "11. 安全管理措置",
          "本アプリは独自アカウントを必要とせず、パスワードを取り扱いません。端末内情報はiOSの標準的なセキュリティ機構で、共有データはAppleのiCloud / CloudKitの仕組みで保護されます。",
        ],
        [
          "12. 通報時に取得する情報",
          "本アプリの共有機能で作成された内容（本文・写真）は、通常、運営者へ送信されません。端末とiCloudのあいだでのみやり取りされます。\n\n利用者が共有相手のコンテンツについて「通報する」を実行した場合に限り、確認のため次の情報を運営者が受領します。\n\n・通報対象コンテンツの本文\n・通報対象コンテンツに添付された画像\n・通報の理由および利用者が任意で入力した説明\n・通報ID、コンテンツID、再会ID、投稿者および通報者の端末識別子\n・アプリのバージョン、ビルド番号、OSバージョン、言語設定\n\n利用目的は、不適切な利用への対応、安全の確保およびお問い合わせ対応です。\n\n通報に添付された画像は、確認のため非公開のストレージ（Cloudflare R2）に保存し、原則として30日以内に自動的に削除します。\n\n通報の記録およびその他の関連情報は、不正利用への対応、安全の確保、紛争への対応その他必要な目的のため、必要な期間保存する場合があります。",
        ],
        [
          "13. 未成年者の利用",
          "未成年の方が本アプリを利用する場合は、保護者の同意を得たうえでご利用ください。",
        ],
        [
          "14. ポリシーの変更",
          "法令の改正または本アプリの機能変更に伴い、本ポリシーを変更する場合があります。重要な変更を行う場合は、本アプリ内または本ウェブサイトにて周知します。変更後の内容は、掲載された時点から適用されます。",
        ],
        [
          "15. お問い合わせ",
          "本ポリシーおよび個人情報の取扱いに関するお問い合わせは、Tomokichi共通お問い合わせフォームまたは support@tmkch.io からお送りください。フォームを送信しない限り、問い合わせ情報は送信されません。",
        ],
      ]
    : [
        [
          "1. Introduction",
          "This policy explains how the operator (Tomokichi) handles user information for the iOS app “Remeet” and this website (together, the “Service”). This website is the authoritative version; the app refers back to it. When offline, a bundled reference copy may be shown in the app.",
        ],
        [
          "2. Operator",
          "The Service is developed and operated by an individual, Tomokichi. Contact support@tmkch.io or the shared support form.",
        ],
        ["3. Scope", "This policy applies to use of the app and browsing of this website."],
        [
          "4. Basic policy",
          "The app does not require a proprietary account. Reunion plans, photos, and notes are stored on your device. If you are signed into iCloud with the same Apple Account, personal records may also sync to your private iCloud database. A shared reunion syncs with the one partner you invite through Apple iCloud and CloudKit. The operator does not run a proprietary server that collects or views those records. Google Mobile Ads is used for advertising, but your in-app records are not sent to advertising partners.",
        ],
        [
          "5. Information stored on your device",
          "The app stores the following in an on-device database (Core Data) and an App Group container. If you are signed into iCloud with the same Apple Account, personal records may also sync to your private iCloud database. For a shared reunion, the relevant information is shared with the invited partner:\n\n・Reunion plan names, dates, and notes\n・Place names, coordinates, and time zones\n・Wish-list items and completion state\n・Photos, dates, notes, impressions, and ratings\n・Sharing state, Share Pass transaction ID, pass state, and reunion ID\n・App settings such as notification preferences\n\nSome on-device information is shared within the developer’s App Group for widgets.",
        ],
        [
          "6. Information sent externally",
          "The app communicates externally in these cases:\n\n(1) iCloud sharing and the Share Pass ledger: shared reunion content, first-free-sharing state, and the Share Pass ledger are sent to Apple iCloud / CloudKit. The partner who accepts your invitation can view and edit that reunion.\n\n(2) In-app purchase: Apple StoreKit is used to buy and verify Share Pass transactions and synchronize purchase information.\n\n(3) Weather: saved coordinates are sent to Open-Meteo; names are not sent.\n\n(4) Place search / geocoding: search terms or coordinates are sent to Apple.\n\n(5) Ads and consent: Google Mobile Ads and User Messaging Platform may send IP address, device or advertising identifiers, technical information, and consent status. Reunion content is not sent.\n\n(6) Legal documents: the latest copy is loaded from this website.\n\n(7) Support: only when you submit the form, your entries and related app, OS, language, time, and enquiry identifiers are sent to the support API and email provider. Records are not attached automatically.",
        ],
        [
          "7. Device permissions",
          "With your permission, the app uses:\n\n・Camera — photos of waiting days and reunions\n・Photo library — photos you choose\n・Location — only when you tap “Use current location”, to resolve a place name and time zone; never continuous tracking\n・Calendar — write a reunion when you choose; existing events are not read\n・Notifications — reunion reminders on device\n・Tracking — only if allowed, for personalized ads using cross-app / cross-website data. Every feature remains available without tracking permission.",
        ],
        [
          "8. Advertising",
          "The app uses the Google Mobile Ads SDK and the User Messaging Platform (UMP) for consent.\n\n・Information such as IP address, device details, advertising identifiers, ad interaction / diagnostics and consent status may be processed by Google and advertising partners for delivery, measurement and fraud prevention\n・Use of advertising identifiers follows your permission and regional consent\n・Personalized or non-personalized ads may be shown depending on consent\n・Refusing App Tracking Transparency (ATT) does not limit core app features\n・You may be able to change consent via the consent form and iOS Settings\n\nIn-app records such as plans, photos and notes are not sent to advertising partners. See Google’s privacy policy and ads documentation for more detail about Google’s processing.",
        ],
        [
          "9. Service providers and disclosure",
          "The operator does not sell or lend your in-app records. The Service uses Apple (iCloud / CloudKit, StoreKit, and system features), Google (ads and consent), Open-Meteo (weather), Cloudflare Workers (support API), and Resend (support email). Information is not otherwise disclosed to unrelated third parties except where required by law.",
        ],
        [
          "10. Retention and deletion",
          "On-device and iCloud information is kept until you delete it. Delete individual records on their screens, or all data from Settings → Delete all data. Deleting a shared reunion also removes access for its participant. Uninstalling removes on-device data, but sharing state and the Share Pass ledger in iCloud may remain as needed for synchronization after reinstalling.",
        ],
        [
          "11. Security",
          "The app has no proprietary account and does not handle passwords. On-device data is protected by iOS security mechanisms; shared data is protected through Apple iCloud / CloudKit.",
        ],
        [
          "12. Information obtained from reports",
          "Content created through sharing (text and photos) is not sent to the operator during ordinary use. It stays between the device and iCloud.\n\nOnly when you tap Report on a partner’s content does the operator receive, for review:\n\n・The reported text\n・Any image attached to that content\n・The reason and an optional explanation you type\n・Report id, content id, reunion id, and device identifiers for the author and the reporter\n・App version, build number, OS version, and language\n\nThe purpose is responding to misuse, keeping people safe, and handling support.\n\nReported images are stored in private storage (Cloudflare R2) for review and are deleted automatically within 30 days in principle.\n\nReport records and related information may be kept as needed for misuse response, safety, disputes, and similar purposes.",
        ],
        [
          "13. Minors",
          "If a minor uses the app, please do so with a parent or guardian’s consent.",
        ],
        [
          "14. Changes",
          "This policy may change with law or product updates. Material changes will be announced in the app or on this website and take effect when published.",
        ],
        [
          "15. Contact",
          "Questions about this policy: shared Tomokichi support form or support@tmkch.io. Support information is not sent unless you submit the form.",
        ],
      ];
}

export function termsSections(ja: boolean): [string, string][] {
  return ja
    ? [
        [
          "第1条（適用）",
          "本規約は、運営者（Tomokichi）が提供するiOSアプリケーション「Remeet」（以下「本アプリ」）および本ウェブサイト（あわせて「本サービス」）の利用条件を定めるものです。本ウェブサイトに掲載する内容を正本とし、本アプリ内からは本ウェブサイトを参照します。利用者は、本アプリをダウンロードまたは本サービスを利用した時点で、本規約に同意したものとみなされます。",
        ],
        [
          "第2条（本サービスの内容）",
          "本アプリは、大切な人との再会予定、会ったらやりたいこと、写真やメモ、再会の記録を作成・保存・閲覧する機能と、利用者が選んだ1人のパートナーと再会単位でこれらをiCloud共有する機能を提供します。共有への参加にはApple AccountおよびiCloudを利用できる環境が必要です。",
        ],
        [
          "第3条（利用料金、Share Passおよび広告）",
          "本アプリの個人利用と最初の再会の共有は無料です。一部の画面には広告が表示されます。2回目以降の再会を共有するには、App内課金で提供する消費型商品「Share Pass」（1枚¥500）を1枚使用します。Share Passに有効期限はなく、1枚につき1つの再会を1人のパートナーと共有できます。Share Passを適用した再会では参加者双方に広告を表示しません。購入処理、価格表示、返金その他の取扱いにはAppleの条件が適用されます。通信費は利用者の負担とします。",
        ],
        [
          "第4条（利用者の責任）",
          "利用者は、自己の責任において本サービスを利用するものとし、入力する情報について必要な権利を有していることを保証します。第三者が写り込んだ写真等を保存する場合は、当該第三者の権利に配慮するものとします。",
        ],
        [
          "第5条（禁止事項）",
          "利用者は、本サービスの利用にあたり、次の行為をしてはなりません。\n\n1. 法令または公序良俗に違反する行為\n2. 運営者または第三者の権利、財産、名誉、プライバシーを侵害する行為\n3. 性的・わいせつな内容、暴力的・危険な内容を共有する行為\n4. 共有相手に対する嫌がらせ、脅迫その他の迷惑行為\n5. 相手の同意なくセンシティブな写真その他の情報を共有する行為\n6. 本アプリの複製、改変、逆コンパイル、逆アセンブルその他のリバースエンジニアリング\n7. 本サービスの運営を妨害し、または不正にアクセスする行為\n8. その他、運営者が不適切と合理的に判断する行為",
        ],
        [
          "第5条の2（通報および運営者の対応）",
          "利用者は、共有相手から前条に違反すると思われる内容が送られた場合、当該コンテンツの画面から運営者へ通報できます。\n\n通報が送信された場合、運営者は確認のため、通報対象のコンテンツの本文および添付画像のコピーを受領します。通報がない限り、運営者が共有中のコンテンツを取得することはありません。\n\n運営者は、通報の内容を確認し、必要かつ相当と判断する場合には、注意喚起その他の対応を行うことがあります。ただし、個別の通報について特定の対応を行うことをお約束するものではありません。",
        ],
        [
          "第6条（知的財産権）",
          "本サービスおよびこれに含まれるプログラム、デザイン、文章、画像等に関する著作権その他の知的財産権は、運営者または正当な権利者に帰属します。利用者が本アプリ内で作成・保存した記録の権利は、利用者に帰属します。",
        ],
        [
          "第7条（データの管理）",
          "データは端末内に保存されます。同じApple AccountのiCloudにサインインしている場合、個人利用の記録も非公開のiCloudへ同期されることがあります。共有を有効にした再会のデータ、初回無料共有の利用状態およびShare Pass台帳はiCloudにも保存されます。共有参加者は共有された再会の内容を閲覧・編集できます。端末、iCloudまたは通信の障害等によるデータ消失について、運営者は責任を負いません。",
        ],
        [
          "第8条（保証の否認・免責事項）",
          "運営者は、本サービスが利用者の特定の目的に適合すること、期待する機能・正確性・有用性を有すること、および不具合が生じないことを保証しません。本アプリが表示する天気情報および地名情報は外部サービスから取得したものであり、その正確性・完全性を保証しません。通知の配信時刻はOSの状態により前後する場合があります。運営者は、本サービスの利用によって利用者に生じた損害について、運営者の故意または重過失による場合を除き、責任を負いません。消費者契約法その他の強行法規により運営者の免責が認められない場合、運営者の責任は法令上認められる範囲に限定されます。",
        ],
        [
          "第9条（本サービスの変更・中断・終了）",
          "運営者は、事前の通知なく本サービスの内容を変更し、または提供を中断・終了することがあります。重要な変更については、本アプリ内または本ウェブサイトにて周知するよう努めます。",
        ],
        [
          "第10条（本規約の変更）",
          "運営者は、必要と判断した場合、本規約を変更することがあります。変更後の規約は、本アプリ内または本ウェブサイトに掲載された時点から効力を生じます。変更後に本サービスを継続して利用した場合、変更に同意したものとみなされます。",
        ],
        [
          "第11条（準拠法および管轄裁判所）",
          "本規約の解釈および適用は日本法に準拠します。本サービスに関して運営者と利用者との間で紛争が生じた場合は、東京地方裁判所を第一審の専属的合意管轄裁判所とします。",
        ],
        [
          "第12条（お問い合わせ）",
          "本規約に関するお問い合わせは、Tomokichi共通お問い合わせフォームまたは support@tmkch.io からお送りください。",
        ],
      ]
    : [
        [
          "Article 1 — Application",
          "These Terms set out the conditions for using the iOS application “Remeet” (the “App”) and this website (together, the “Service”), provided by the operator (Tomokichi). This website is the authoritative version; the App refers back to it. You are deemed to have agreed once you download the App or otherwise use the Service.",
        ],
        [
          "Article 2 — The Service",
          "The App lets you create and keep reunion plans, things to do together, photos, notes, and reunion records, and share one reunion at a time with one partner through iCloud. Joining a shared reunion requires an Apple Account and access to iCloud.",
        ],
        [
          "Article 3 — Fees, Share Pass, and advertising",
          "Personal use and the first shared reunion are free. Ads may appear on some screens. Each additional shared reunion uses one consumable Share Pass (¥500). A pass has no expiry and shares one reunion with one partner. A reunion using a Share Pass is ad-free for both participants. Apple’s terms govern purchase, price, and refunds. You are responsible for data charges.",
        ],
        [
          "Article 4 — User responsibility",
          "You are responsible for your own use of the Service and warrant that you hold any rights needed for the information you enter. When saving photos that include third parties, please respect their rights.",
        ],
        [
          "Article 5 — Prohibited conduct",
          "You must not:\n\n1. Violate any law or public order and morals\n2. Infringe the rights, property, reputation or privacy of the operator or any third party\n3. Share sexual, obscene, violent or dangerous content\n4. Harass, threaten or otherwise bother a sharing partner\n5. Share sensitive photos or other information without the other person’s consent\n6. Copy, modify, decompile, disassemble or otherwise reverse-engineer the App\n7. Interfere with the operation of, or gain unauthorised access to, the Service\n8. Engage in any other conduct the operator reasonably considers inappropriate",
        ],
        [
          "Article 5-2 — Reports and operator response",
          "If a sharing partner sends content that appears to violate the previous article, you can report it from that content’s screen.\n\nWhen a report is sent, the operator receives a copy of the reported text and any attached image for review. The operator does not obtain shared content unless a report is made.\n\nThe operator may review the report and, where necessary and proportionate, take steps such as a warning. A particular response is not promised for every report.",
        ],
        [
          "Article 6 — Intellectual property",
          "Copyright and other IP in the Service and its programs, design, text and images belong to the operator or relevant rights holders. Rights to records you create in the App belong to you.",
        ],
        [
          "Article 7 — Data management",
          "Data is stored on your device. If you are signed into iCloud with the same Apple Account, personal records may also sync to your private iCloud database. Shared reunion data, first-free-sharing state, and the Share Pass ledger also use iCloud. A participant can view and edit a shared reunion. The operator is not responsible for loss caused by device, iCloud, or network failure.",
        ],
        [
          "Article 8 — Disclaimer",
          "The operator does not warrant fitness for a particular purpose, expected functionality, accuracy or usefulness, or freedom from defects. Weather and place-name information come from external services and are not guaranteed. Notification timing may vary with OS conditions. Except for willful misconduct or gross negligence, the operator is not liable for damages arising from use of the Service. Where mandatory law such as the Consumer Contract Act does not allow this disclaimer, liability is limited to the extent permitted by law.",
        ],
        [
          "Article 9 — Changes, suspension and termination",
          "The operator may change, suspend or discontinue the Service without prior notice, and will endeavor to announce material changes in the App or on this website.",
        ],
        [
          "Article 10 — Changes to these Terms",
          "The operator may revise these Terms when necessary. Revised Terms take effect once posted in the App or on this website. Continued use constitutes acceptance.",
        ],
        [
          "Article 11 — Governing law and jurisdiction",
          "These Terms are governed by the laws of Japan. Disputes shall be subject to the exclusive jurisdiction of the Tokyo District Court as court of first instance.",
        ],
        [
          "Article 12 — Contact",
          "Questions about these Terms: shared Tomokichi support form or support@tmkch.io.",
        ],
      ];
}
