import { z } from "zod";
import { SLUG_RE, slugify, readingMinutes } from "../text";
import type { RichDoc } from "../types";

// Server-side validation for everything the dashboard saves.
// Forms post FormData; these turn it into clean rows or readable errors.

// Missing fields count as empty, so partial submissions get clear messages.
const str = z.preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string());

const text = (max: number) =>
  z
    .preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string().max(max, `Keep this under ${max} characters.`))
    .transform((s) => (s === "" ? null : s));

const requiredText = (label: string, max: number) =>
  z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z.string().min(1, `${label} is required.`).max(max, `Keep this under ${max} characters.`),
  );

const list = z
  .string()
  .default("")
  .transform((s) =>
    [...new Set(s.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean))].slice(0, 30).map((t) => t.slice(0, 40)),
  );

const titleList = z
  .string()
  .default("")
  .transform((s) => [...new Set(s.split(",").map((t) => t.trim()).filter(Boolean))].slice(0, 12).map((t) => t.slice(0, 40)));

const isoOrNull = z
  .string()
  .default("")
  .transform((s, ctx) => {
    if (!s.trim()) return null;
    const d = new Date(s);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date." });
      return z.NEVER;
    }
    return d.toISOString();
  });

const dateOnly = z
  .string()
  .default("")
  .transform((s, ctx) => {
    if (!s.trim()) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      ctx.addIssue({ code: "custom", message: "Use the date picker." });
      return z.NEVER;
    }
    return s;
  });

const richDoc = z
  .string()
  .default('{"type":"doc","content":[]}')
  .transform((s, ctx): RichDoc => {
    try {
      const v = JSON.parse(s);
      if (v && v.type === "doc" && (v.content === undefined || Array.isArray(v.content))) return v as RichDoc;
    } catch {}
    ctx.addIssue({ code: "custom", message: "The text could not be read. Reload and try again." });
    return z.NEVER;
  })
  .refine((d) => JSON.stringify(d).length < 500_000, "This piece is too long to save in one go.");

const storagePath = z
  .preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string().max(500))
  .transform((s) => (s === "" ? null : s))
  .refine((s) => s === null || /^(\/sample\/[\w.-]+|[\w/.-]+)$/.test(s), "That image path is not valid.");

const bool = z
  .string()
  .optional()
  .transform((v) => v === "on" || v === "true" || v === "1");

const uuidOrNull = z
  .string()
  .default("")
  .transform((s) => (s.trim() === "" ? null : s.trim()))
  .refine((s) => s === null || z.uuid().safeParse(s).success, "Pick an item from the list.");

/** Fields every publishable item shares. */
const common = {
  slug: str,
  intent: z.enum(["draft", "publish", "update", "unpublish"]).default("draft"),
  published_at: isoOrNull,
  seo_title: text(70),
  seo_description: text(200),
};

/** Turns the intent buttons into status and publish date. Pure, so it can be tested. */
export function resolvePublishing(
  intent: "draft" | "publish" | "update" | "unpublish",
  chosenDate: string | null,
  existing: { status: string; published_at: string | null } | null,
  now = new Date(),
): { status: "draft" | "published"; published_at: string | null } {
  if (intent === "unpublish" || intent === "draft") {
    // Keep a chosen date so scheduling a draft later is easy.
    return { status: "draft", published_at: chosenDate ?? (intent === "draft" ? existing?.published_at ?? null : null) };
  }
  if (intent === "update" && existing?.status === "published") {
    return { status: "published", published_at: chosenDate ?? existing.published_at ?? now.toISOString() };
  }
  return { status: "published", published_at: chosenDate ?? now.toISOString() };
}

export function finalSlug(input: string, fallbackFrom: string): string | null {
  const s = slugify(input || fallbackFrom);
  return s && SLUG_RE.test(s) ? s : null;
}

export const articleSchema = z.object({
  ...common,
  title: requiredText("A title", 200),
  subtitle: text(300),
  excerpt: text(600),
  body: richDoc,
  cover_path: storagePath,
  cover_alt: text(300),
  category: text(60),
  tags: list,
});

export const photoSchema = z.object({
  ...common,
  title: requiredText("A title", 200),
  caption: text(1000),
  location: text(120),
  image_path: requiredText("A photograph (upload one first)", 500),
  alt: requiredText("Alt text (a short description for screen readers)", 500),
  width: z.coerce.number().int().positive("Upload a photograph first."),
  height: z.coerce.number().int().positive("Upload a photograph first."),
  category: text(60),
  tags: list,
  taken_on: dateOnly,
  collection_id: uuidOrNull,
  position: z.coerce.number().int().min(0).max(100000).default(0),
});

export const collectionSchema = z.object({
  ...common,
  title: requiredText("A title", 200),
  intro: text(1000),
  body: richDoc,
  cover_photo_id: uuidOrNull,
});

const year = (min: number) =>
  z
    .string()
    .default("")
    .transform((s, ctx) => {
      if (!s.trim()) return null;
      const n = Number(s);
      if (!Number.isInteger(n) || n < min || n > 2200) {
        ctx.addIssue({ code: "custom", message: "Enter a four-digit year." });
        return z.NEVER;
      }
      return n;
    });

const rating = z
  .string()
  .default("")
  .transform((s, ctx) => {
    if (!s.trim()) return null;
    const n = Number(s);
    if (Number.isNaN(n) || n < 0 || n > 5 || (n * 2) % 1 !== 0) {
      ctx.addIssue({ code: "custom", message: "Ratings go from 0 to 5 in half steps." });
      return z.NEVER;
    }
    return n;
  });

/** Optional https link to a music service (or anywhere): the player is built from it. */
const musicLink = z
  .preprocess((v) => (typeof v === "string" ? v.trim() : ""), z.string().max(500))
  .transform((s) => (s === "" ? null : s))
  .refine((s) => s === null || /^https:\/\/[^\s]+$/.test(s), "Paste the full link, starting with https://");

const idCsv = z
  .string()
  .default("")
  .transform((s) => s.split(",").map((x) => x.trim()).filter((x) => z.uuid().safeParse(x).success));

export const filmSchema = z.object({
  ...common,
  title: requiredText("The film's title", 200),
  release_year: year(1870),
  director: text(200),
  poster_path: storagePath,
  poster_credit: text(200),
  rating,
  short_review: text(600),
  body: richDoc,
  genres: titleList,
  tags: list,
  category: text(60),
  is_favourite: bool,
  watched_on: dateOnly,
});

export const filmListSchema = z.object({
  ...common,
  title: requiredText("A title", 200),
  description: text(1000),
  film_ids: z
    .string()
    .default("")
    .transform((s) => s.split(",").map((x) => x.trim()).filter((x) => z.uuid().safeParse(x).success)),
});

export const listenSchema = z.object({
  ...common,
  title: requiredText("The title", 200),
  artist: text(200),
  kind: z.enum(["album", "song", "ep", "live"]).default("album"),
  release_year: year(1800),
  cover_path: storagePath,
  cover_credit: text(200),
  rating,
  short_note: text(600),
  body: richDoc,
  genres: titleList,
  tags: list,
  is_favourite: bool,
  listen_url: musicLink,
  listened_on: dateOnly,
});

export const playlistSchema = z.object({
  ...common,
  title: requiredText("A title", 200),
  description: text(1000),
  listen_ids: idCsv,
  listen_url: musicLink,
  cover_path: storagePath,
});

export const journalSchema = z.object({
  ...common,
  body: requiredText("The entry", 5000),
  kind: z.enum(["thought", "observation", "quotation", "update"]).default("thought"),
  quote_source: text(300),
  tags: list,
});

const socials = z
  .string()
  .default("")
  .transform((s, ctx) => {
    const out: { label: string; url: string }[] = [];
    for (const [i, line] of s.split("\n").entries()) {
      if (!line.trim()) continue;
      const [label, url] = line.split("|").map((x) => x?.trim());
      if (!label || !url || !/^https:\/\/|^mailto:/.test(url)) {
        ctx.addIssue({ code: "custom", message: `Line ${i + 1}: use “Label | https://…”.` });
        return z.NEVER;
      }
      out.push({ label: label.slice(0, 40), url: url.slice(0, 300) });
    }
    return out.slice(0, 12);
  });

const idList = z
  .array(z.string())
  .default([])
  .transform((ids) => ids.filter((x) => z.uuid().safeParse(x).success).slice(0, 12));

export const settingsSchema = z.object({
  site_title: requiredText("The site title", 60),
  tagline: str.pipe(z.string().max(160)),
  hero_line: str.pipe(z.string().max(200)),
  intro: str.pipe(z.string().max(1200)),
  about_body: richDoc,
  profile_image_path: storagePath,
  profile_image_alt: text(300),
  accent: z.enum(["oxblood", "olive", "faded-red"]).default("oxblood"),
  socials,
  featured_photo_id: uuidOrNull,
  featured_article_ids: idList,
  featured_film_ids: idList,
  seo_description: str.pipe(z.string().max(200)),
  og_image_path: storagePath,
  notify_email: str
    .pipe(z.string().max(320))
    .transform((s) => (s === "" ? null : s))
    .refine((s) => s === null || z.email().safeParse(s).success, "Enter a valid email address."),
});

/** FormData to a plain object; repeated keys (checkbox groups) become arrays. */
export function formToObject(form: FormData, arrays: string[] = []): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of new Set(form.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const values = form.getAll(key).filter((v): v is string => typeof v === "string");
    out[key] = arrays.includes(key) ? values : values[values.length - 1];
  }
  for (const a of arrays) out[a] ??= [];
  return out;
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const k = String(issue.path[0] ?? "form");
    out[k] ??= issue.message;
  }
  return out;
}

export { readingMinutes };
