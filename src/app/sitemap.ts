import type { MetadataRoute } from "next";
import { getArticles, getCollections, getFilmLists, getFilms, getJournal, getPhotos } from "@/lib/data";
import { siteUrl } from "@/lib/env";

export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [articles, photos, collections, films, lists, journal] = await Promise.all([
    getArticles(),
    getPhotos(),
    getCollections(),
    getFilms(),
    getFilmLists(),
    getJournal(),
  ]);
  const u = (path: string, lastModified?: string) => ({ url: `${siteUrl}${path}`, ...(lastModified ? { lastModified } : {}) });
  return [
    u("/"),
    u("/writing"),
    u("/photography"),
    u("/cinema"),
    u("/journal"),
    u("/about"),
    u("/note"),
    ...articles.map((a) => u(`/writing/${a.slug}`, a.updated_at)),
    ...photos.map((p) => u(`/photography/${p.slug}`, p.updated_at)),
    ...collections.map((c) => u(`/photography/stories/${c.slug}`, c.updated_at)),
    ...films.map((f) => u(`/cinema/${f.slug}`, f.updated_at)),
    ...lists.map((l) => u(`/cinema/lists/${l.slug}`, l.updated_at)),
    ...journal.map((j) => u(`/journal/${j.slug}`, j.updated_at)),
  ];
}
