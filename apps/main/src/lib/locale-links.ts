import { type AppSiteLocaleLink, localeMeta } from "@tomokichi/app-site/i18n";
import type { Locale } from "../data/apps";

/**
 * The same page in every language the main site serves, for the shared
 * `LanguageSwitcher`. English lives at `/…`, Japanese at `/ja/…`, so the
 * switch on `/ja/products` lands on `/products`, never on the home page.
 */
export function localeLinks(path: string): AppSiteLocaleLink[] {
  const clean = path === "/" ? "" : path.replace(/\/$/, "");
  const links: Record<Locale, string> = { en: clean || "/", ja: `/ja${clean}` };
  return (["en", "ja"] as const).map((code) => ({ ...localeMeta(code), href: links[code] }));
}
