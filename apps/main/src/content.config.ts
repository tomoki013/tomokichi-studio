import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

/**
 * Journal — the record the studio starts from.
 *
 * Entries are filed per locale as `journal/<lang>/<slug>.md`. The slug is
 * shared across locales so the language switcher can stay on the same entry.
 *
 * A short note and a long piece are the same kind of thing here: `body` can be
 * two sentences or twenty paragraphs. Keeping one collection is what lets the
 * home page mix them without the site turning into a blog feed.
 */
const journal = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/journal" }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    /** Deliberately few. Resist adding more until the writing needs it. */
    category: z.enum(["daily", "living", "city", "travel", "making", "thought", "experiment"]),
    /** One or two lines, used in listings and as the meta description. */
    summary: z.string(),
    /**
     * Set only when an entry is genuinely revised after publication. It is
     * what `dateModified` reports, and what the entry shows above the text —
     * so an unedited entry must not have one.
     */
    updated: z.coerce.date().optional(),
    /** App slugs this entry led to, or is about. */
    products: z.array(z.string()).default([]),
    /** Other journal slugs worth reading next. */
    related: z.array(z.string()).default([]),
    /** At most one per locale: what gets the large "right now" slot at home. */
    current: z.boolean().default(false),
    draft: z.boolean().default(false),
  }),
});

export const collections = { journal };
