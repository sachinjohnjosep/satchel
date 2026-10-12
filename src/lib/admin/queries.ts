import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SECTIONS, type SectionKey } from "./sections";

/** Columns shown in dashboard lists (keeps rich text bodies out of list queries). */
export const LIST_COLUMNS: Record<SectionKey, string> = {
  writing: "id, slug, title, category, status, published_at, updated_at, is_placeholder",
  photos: "id, slug, title, image_path, category, status, published_at, updated_at, is_placeholder, width, height",
  stories: "id, slug, title, status, published_at, updated_at, is_placeholder",
  films: "id, slug, title, release_year, rating, status, published_at, updated_at, is_placeholder",
  lists: "id, slug, title, status, published_at, updated_at, is_placeholder",
  journal: "id, slug, body, kind, status, published_at, updated_at, is_placeholder",
};

export type ListRow = {
  id: string;
  slug: string;
  title?: string;
  body?: string;
  category?: string | null;
  status: string;
  published_at: string | null;
  updated_at: string;
  is_placeholder: boolean;
  image_path?: string;
  release_year?: number | null;
  rating?: number | null;
  kind?: string;
};

export async function listRows(db: SupabaseClient, section: SectionKey, q?: string): Promise<ListRow[]> {
  let query = db.from(SECTIONS[section].table).select(LIST_COLUMNS[section]).order("updated_at", { ascending: false }).limit(500);
  q = q?.replace(/[%_\\]/g, "\\$&").slice(0, 100);
  if (q) query = section === "journal" ? query.ilike("body", `%${q}%`) : query.ilike("title", `%${q}%`);
  const { data, error } = await query;
  if (error) throw new Error("Could not load content.");
  return (data ?? []) as unknown as ListRow[];
}

export async function getRow<T>(db: SupabaseClient, section: SectionKey, id: string): Promise<T | null> {
  const { data, error } = await db.from(SECTIONS[section].table).select("*").eq("id", id).maybeSingle();
  if (error) return null;
  return data as T | null;
}

/** Existing categories and tags, offered as suggestions while typing. */
export async function suggestions(db: SupabaseClient, table: string) {
  const { data } = await db.from(table).select("category, tags").limit(1000);
  const rows = (data ?? []) as { category: string | null; tags: string[] }[];
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => Boolean(x)))].sort();
  return { categories: uniq(rows.map((r) => r.category)), tags: uniq(rows.flatMap((r) => r.tags ?? [])) };
}
