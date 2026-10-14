import "server-only";
import { cache } from "react";
import { publicClient } from "./supabase/public";
import {
  sampleArticles,
  sampleCollections,
  sampleFilmLists,
  sampleFilms,
  sampleJournal,
  sampleListens,
  samplePhotos,
  samplePlaylists,
  sampleSettings,
} from "./sample";
import type { Article, Collection, Film, FilmList, JournalEntry, Listen, Photo, Playlist, SiteSettings } from "./types";
import { plainText } from "./text";

// Public read layer. Each loader fetches the published rows of one section
// (row-level security already hides drafts and scheduled posts) and filtering
// happens in memory. For a personal site this stays fast for thousands of entries
// and keeps every page on one simple, cacheable query.
//
// Without Supabase configured, the same loaders return the sample content.

type Table = "articles" | "photos" | "collections" | "films" | "film_lists" | "journal_entries" | "listens" | "playlists";

const byDateDesc = <T extends { published_at: string | null }>(a: T, b: T) =>
  (b.published_at ?? "").localeCompare(a.published_at ?? "");

async function load<T extends { published_at: string | null }>(table: Table, fallback: T[]): Promise<T[]> {
  const db = publicClient();
  if (!db) return [...fallback].filter((r) => r.published_at && r.published_at <= new Date().toISOString()).sort(byDateDesc);
  const { data, error } = await db.from(table).select("*").order("published_at", { ascending: false });
  if (error) {
    // A section whose table hasn't been created yet (e.g. a new section deployed
    // before its SQL was run in Supabase) simply shows as empty.
    if (error.code === "42P01" || error.code === "PGRST205") {
      console.warn(`[data] table ${table} does not exist yet; showing it as empty`);
      return [];
    }
    console.error(`[data] failed to load ${table}: ${error.code ?? ""} ${error.message}`);
    // Never fail a deployment over one read: build with no items and let the
    // pages fill in on their next refresh (within 5 minutes) once the database answers.
    if (process.env.NEXT_PHASE === "phase-production-build") return [];
    throw new Error("Content is temporarily unavailable.");
  }
  return (data ?? []) as T[];
}

export const getSettings = cache(async (): Promise<SiteSettings> => {
  const db = publicClient();
  if (!db) return sampleSettings;
  const { data, error } = await db.from("site_settings").select("*").eq("id", 1).maybeSingle();
  if (error || !data) {
    if (error) console.error("[data] failed to load settings:", error.message);
    return { ...sampleSettings, site_title: "Satchel" };
  }
  return { ...(data as SiteSettings), notify_email: null };
});

export const getArticles = cache(() => load<Article>("articles", sampleArticles));
export const getPhotos = cache(() => load<Photo>("photos", samplePhotos));
export const getCollections = cache(() => load<Collection>("collections", sampleCollections));
export const getFilms = cache(async () =>
  (await load<Film>("films", sampleFilms)).map((f) => ({ ...f, rating: f.rating == null ? null : Number(f.rating) })),
);
export const getFilmLists = cache(() => load<FilmList>("film_lists", sampleFilmLists));
export const getJournal = cache(() => load<JournalEntry>("journal_entries", sampleJournal));
export const getListens = cache(async () =>
  (await load<Listen>("listens", sampleListens)).map((l) => ({ ...l, rating: l.rating == null ? null : Number(l.rating) })),
);
export const getPlaylists = cache(() => load<Playlist>("playlists", samplePlaylists));

// ── Lookups ─────────────────────────────────────────────

export async function getArticle(slug: string) {
  return (await getArticles()).find((a) => a.slug === slug) ?? null;
}
export async function getPhoto(slug: string) {
  return (await getPhotos()).find((p) => p.slug === slug) ?? null;
}
export async function getFilm(slug: string) {
  return (await getFilms()).find((f) => f.slug === slug) ?? null;
}
export async function getJournalEntry(slug: string) {
  return (await getJournal()).find((j) => j.slug === slug) ?? null;
}
export async function getListen(slug: string) {
  return (await getListens()).find((l) => l.slug === slug) ?? null;
}
export async function getPlaylist(slug: string) {
  const playlist = (await getPlaylists()).find((p) => p.slug === slug);
  if (!playlist) return null;
  const listens = await getListens();
  const items = playlist.listen_ids.map((id) => listens.find((l) => l.id === id)).filter((l): l is Listen => Boolean(l));
  return { playlist, items };
}

export async function relatedListens(listen: Listen, limit = 4) {
  const all = (await getListens()).filter((l) => l.id !== listen.id);
  const score = (l: Listen) =>
    l.genres.filter((g) => listen.genres.includes(g)).length + (l.artist && l.artist === listen.artist ? 3 : 0);
  return all
    .map((l) => ({ l, s: score(l) }))
    .sort((x, y) => y.s - x.s || byDateDesc(x.l, y.l))
    .slice(0, limit)
    .map((x) => x.l);
}

export type ListenFilter = { genre?: string; kind?: string; rating?: string; favourites?: string };

export function filterListens(listens: Listen[], f: ListenFilter) {
  return listens.filter(
    (l) =>
      (!f.genre || l.genres.includes(f.genre)) &&
      (!f.kind || l.kind === f.kind) &&
      (!f.rating || (l.rating ?? 0) >= Number(f.rating)) &&
      (!f.favourites || l.is_favourite),
  );
}

export async function getCollection(slug: string) {
  const collection = (await getCollections()).find((c) => c.slug === slug);
  if (!collection) return null;
  const photos = (await getPhotos())
    .filter((p) => p.collection_id === collection.id)
    .sort((a, b) => a.position - b.position);
  return { collection, photos };
}
export async function getFilmList(slug: string) {
  const list = (await getFilmLists()).find((l) => l.slug === slug);
  if (!list) return null;
  const films = await getFilms();
  const ordered = list.film_ids.map((id) => films.find((f) => f.id === id)).filter((f): f is Film => Boolean(f));
  return { list, films: ordered };
}

// ── Related content ─────────────────────────────────────

/** Articles sharing tags or category, best matches first, then most recent. */
export async function relatedArticles(article: Article, limit = 3) {
  const all = (await getArticles()).filter((a) => a.id !== article.id);
  const score = (a: Article) =>
    a.tags.filter((t) => t !== "sample" && article.tags.includes(t)).length * 2 +
    (a.category && a.category === article.category ? 1 : 0);
  return all
    .map((a) => ({ a, s: score(a) }))
    .sort((x, y) => y.s - x.s || byDateDesc(x.a, y.a))
    .slice(0, limit)
    .map((x) => x.a);
}

export async function relatedFilms(film: Film, limit = 3) {
  const all = (await getFilms()).filter((f) => f.id !== film.id);
  const score = (f: Film) =>
    f.genres.filter((g) => film.genres.includes(g)).length + (f.director && f.director === film.director ? 2 : 0);
  return all
    .map((f) => ({ f, s: score(f) }))
    .sort((x, y) => y.s - x.s || byDateDesc(x.f, y.f))
    .slice(0, limit)
    .map((x) => x.f);
}

// ── Filtering ───────────────────────────────────────────

export const distinct = (values: (string | null | undefined)[]) =>
  [...new Set(values.filter((v): v is string => Boolean(v)))].sort((a, b) => a.localeCompare(b));

export type FilmFilter = { genre?: string; rating?: string; decade?: string; category?: string; favourites?: string };

export function filterFilms(films: Film[], f: FilmFilter) {
  return films.filter(
    (film) =>
      (!f.genre || film.genres.includes(f.genre)) &&
      (!f.rating || (film.rating ?? 0) >= Number(f.rating)) &&
      (!f.decade || (film.release_year != null && Math.floor(film.release_year / 10) * 10 === Number(f.decade))) &&
      (!f.category || film.category === f.category) &&
      (!f.favourites || film.is_favourite),
  );
}

// ── Search ──────────────────────────────────────────────

export type SearchHit = { kind: "Writing" | "Photograph" | "Film" | "Journal" | "Listening"; title: string; href: string; snippet: string; date: string | null };

export async function search(query: string): Promise<SearchHit[]> {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const terms = q.split(/\s+/);
  const matches = (...fields: (string | null | undefined | string[])[]) => {
    const hay = fields.flat().filter(Boolean).join(" ").toLowerCase();
    return terms.every((t) => hay.includes(t));
  };
  const [articles, photos, films, journal, listens] = await Promise.all([getArticles(), getPhotos(), getFilms(), getJournal(), getListens()]);
  const hits: SearchHit[] = [
    ...articles
      .filter((a) => matches(a.title, a.subtitle, a.excerpt, a.category, a.tags, plainText(a.body)))
      .map((a) => ({ kind: "Writing" as const, title: a.title, href: `/writing/${a.slug}`, snippet: a.excerpt ?? a.subtitle ?? "", date: a.published_at })),
    ...photos
      .filter((p) => matches(p.title, p.caption, p.location, p.category, p.tags))
      .map((p) => ({ kind: "Photograph" as const, title: p.title, href: `/photography/${p.slug}`, snippet: p.caption ?? "", date: p.published_at })),
    ...films
      .filter((f) => matches(f.title, f.director, f.genres, f.tags, f.short_review, String(f.release_year ?? "")))
      .map((f) => ({ kind: "Film" as const, title: f.title, href: `/cinema/${f.slug}`, snippet: [f.director, f.release_year].filter(Boolean).join(", "), date: f.published_at })),
    ...listens
      .filter((l) => matches(l.title, l.artist, l.genres, l.tags, l.short_note, String(l.release_year ?? "")))
      .map((l) => ({ kind: "Listening" as const, title: l.title, href: `/listening/${l.slug}`, snippet: [l.artist, l.release_year].filter(Boolean).join(", "), date: l.published_at })),
    ...journal
      .filter((j) => matches(j.body, j.quote_source, j.tags))
      .map((j) => ({ kind: "Journal" as const, title: j.body.slice(0, 80), href: `/journal/${j.slug}`, snippet: j.quote_source ?? "", date: j.published_at })),
  ];
  return hits.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
}
