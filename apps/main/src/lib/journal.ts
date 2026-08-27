import { type CollectionEntry, getCollection } from "astro:content";
import type { Locale } from "../data/apps";

export type JournalEntry = CollectionEntry<"journal">;
export type JournalCategory = JournalEntry["data"]["category"];

/** Entry ids are `<lang>/<slug>`; the slug is shared across locales. */
export const entrySlug = (entry: JournalEntry) => entry.id.split("/").slice(1).join("/");

export const entryHref = (entry: JournalEntry, lang: Locale) =>
  `${lang === "ja" ? "/ja" : ""}/journal/${entrySlug(entry)}`;

const published = (entry: JournalEntry) => import.meta.env.DEV || !entry.data.draft;

/** Newest first. */
export async function journalEntries(lang: Locale): Promise<JournalEntry[]> {
  const entries = await getCollection(
    "journal",
    (entry) => entry.id.startsWith(`${lang}/`) && published(entry),
  );
  return entries.sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

/**
 * The one entry that gets the large "what I'm thinking about now" slot.
 * Falls back to the newest entry so the home page is never empty.
 */
export async function currentEntry(lang: Locale): Promise<JournalEntry | undefined> {
  const entries = await journalEntries(lang);
  return entries.find((entry) => entry.data.current) ?? entries[0];
}

/** Recent entries for the home page, excluding whatever is already featured. */
export async function recentEntries(lang: Locale, limit = 3): Promise<JournalEntry[]> {
  const entries = await journalEntries(lang);
  const current = await currentEntry(lang);
  return entries.filter((entry) => entry.id !== current?.id).slice(0, limit);
}

/** Entries that led to, or are about, a given product. */
export async function entriesForProduct(lang: Locale, slug: string): Promise<JournalEntry[]> {
  const entries = await journalEntries(lang);
  return entries.filter((entry) => entry.data.products.includes(slug));
}

/**
 * The locales an entry is actually published in.
 *
 * The slug is shared, but a translation is not guaranteed to exist — and
 * hreflang pointing at an entry that was never written would send search
 * engines to a 404.
 */
export async function entryLocales(slug: string): Promise<Locale[]> {
  const entries = await getCollection("journal", published);
  return (["en", "ja"] as Locale[]).filter((lang) =>
    entries.some((entry) => entry.id === `${lang}/${slug}`),
  );
}

export async function relatedEntries(entry: JournalEntry, lang: Locale): Promise<JournalEntry[]> {
  if (entry.data.related.length === 0) return [];
  const entries = await journalEntries(lang);
  return entry.data.related
    .map((slug) => entries.find((candidate) => entrySlug(candidate) === slug))
    .filter((candidate): candidate is JournalEntry => Boolean(candidate));
}

export const categoryLabels: Record<JournalCategory, Record<Locale, string>> = {
  daily: { ja: "日常", en: "Daily" },
  living: { ja: "暮らし", en: "Living" },
  city: { ja: "街", en: "City" },
  travel: { ja: "旅", en: "Travel" },
  making: { ja: "制作", en: "Making" },
  thought: { ja: "考えたこと", en: "Thoughts" },
  experiment: { ja: "実験", en: "Experiments" },
};

export function formatDate(date: Date, lang: Locale): string {
  return new Intl.DateTimeFormat(lang === "ja" ? "ja-JP" : "en-GB", {
    year: "numeric",
    month: lang === "ja" ? "long" : "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}
