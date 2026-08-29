import { OPERATOR } from "./operator";

/**
 * The 電気通信事業法 第16条 notification behind the apps that carry user-to-user
 * communication, stated once for every surface that has to show it.
 *
 * Kept beside `OPERATOR` rather than inside it because this is a different
 * fact about the same person: 特定商取引法 asks who is selling, and the
 * Telecommunications Business Act asks who filed the notification and where.
 *
 * TODO: 総務省から電気通信事業届出番号が通知されたら `notificationNumber` を
 * その番号に差し替える。アプリ側の同じ値は Remeet リポジトリの
 * `Remeet/Features/Settings/TelecommunicationsView.swift` にある
 * `LegalInformation.telecommunicationsBusinessNotificationNumber`。
 * どちらも1か所を変えれば表示は切り替わり、「通知待ち」の表示は自動的に消える。
 */
export const TELECOM = {
  /** The natural person named on the notification — the same one as OPERATOR.responsible. */
  operator: OPERATOR.responsible,
  /**
   * The number the Ministry issues after the notification is processed.
   * `null` while it has not arrived: a placeholder or a made-up number would
   * be a claim we cannot support, so the page says 通知待ち instead.
   */
  notificationNumber: null as string | null,
  /** The bureau the notification was filed with. */
  authority: ["関東総合通信局", "Kanto Bureau of Telecommunications"] as [string, string],
  /** Support mailbox, shared with every other legal page. */
  email: OPERATOR.email,
} as const;

export type TelecomLocale = "ja" | "en";

const i = (lang: TelecomLocale) => (lang === "ja" ? 0 : 1);

/**
 * The number as people should read it, or the pending wording when there is
 * no number yet. A blank string counts as no number: a bare label with an
 * empty value beside it reads as a bug, not as "not issued yet".
 */
export function notificationNumberText(number: string | null | undefined, pending: string): string {
  const trimmed = number?.trim();
  return trimmed ? trimmed : pending;
}

/** The wording used when the notification has been filed but not yet numbered. */
export function pendingLabel(lang: TelecomLocale): string {
  // 「申請中」ではない: the notification is already filed, and only the number
  // is outstanding.
  return lang === "ja" ? "通知待ち" : "Awaiting notification";
}

export type TelecomRow = { term: string; body: string; kind?: "contact" };

/** The rows of the disclosure, in the order the page shows them. */
export function telecommunicationsRows(lang: TelecomLocale, appName: string): TelecomRow[] {
  const index = i(lang);
  const number = notificationNumberText(TELECOM.notificationNumber, pendingLabel(lang));
  return lang === "ja"
    ? [
        { term: "サービス名", body: appName },
        { term: "届出事業者", body: TELECOM.operator[index] },
        { term: "電気通信事業届出番号", body: number },
        { term: "管轄総合通信局", body: TELECOM.authority[index] },
        { term: "お問い合わせ", body: TELECOM.email, kind: "contact" },
      ]
    : [
        { term: "Service", body: appName },
        // Deliberately not "registered carrier": what was filed is a
        // notification (届出), which is not a registration (登録).
        { term: "Business operator (notification filed)", body: TELECOM.operator[index] },
        { term: "Telecommunications business notification number", body: number },
        { term: "Bureau", body: TELECOM.authority[index] },
        { term: "Contact", body: TELECOM.email, kind: "contact" },
      ];
}
