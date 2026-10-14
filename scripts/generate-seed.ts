// Writes supabase/seed.sql from src/lib/sample.ts so the database and the
// offline preview always show the same sample content. Run: npm run seed:generate
import { writeFileSync } from "node:fs";
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
} from "../src/lib/sample";

const lit = (v: unknown): string => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'";
    return `array[${v.map((x) => lit(x)).join(", ")}]`;
  }
  if (typeof v === "object") return `${lit(JSON.stringify(v))}::jsonb`;
  return `'${String(v).replace(/'/g, "''")}'`;
};

function insert(table: string, rows: Record<string, unknown>[], cast: Record<string, string> = {}): string {
  if (!rows.length) return "";
  const cols = Object.keys(rows[0]).filter((c) => !["created_at", "updated_at"].includes(c));
  const values = rows
    .map((r) => `  (${cols.map((c) => (cast[c] && Array.isArray(r[c]) && (r[c] as unknown[]).length ? `${lit(r[c])}::${cast[c]}` : lit(r[c]))).join(", ")})`)
    .join(",\n");
  return `insert into public.${table} (${cols.join(", ")}) values\n${values}\non conflict (id) do nothing;\n\n`;
}

const collectionsWithoutCover = sampleCollections.map((c) => ({ ...c, cover_photo_id: null }));
const { notify_email: _ignored, updated_at: _u, ...publicSettings } = sampleSettings;

let sql = `-- Sample content, generated from src/lib/sample.ts. Every row is marked is_placeholder.
-- Delete these from the dashboard (or run: delete from <table> where is_placeholder;) when you add your own.
-- Sample images live in /public/sample and are served by the site itself.

`;
sql += insert("collections", collectionsWithoutCover);
sql += insert("photos", samplePhotos);
sql += sampleCollections
  .map((c) => `update public.collections set cover_photo_id = ${lit(c.cover_photo_id)} where id = ${lit(c.id)};\n`)
  .join("");
sql += "\n";
sql += insert("articles", sampleArticles);
sql += insert("films", sampleFilms);
sql += insert("film_lists", sampleFilmLists, { film_ids: "uuid[]" });
sql += insert("journal_entries", sampleJournal);
const listeningSql = insert("listens", sampleListens) + insert("playlists", samplePlaylists, { listen_ids: "uuid[]" });
sql += listeningSql;

const set = Object.entries(publicSettings)
  .map(([k, v]) => {
    if (k === "socials") return `  socials = ${lit(JSON.stringify(v))}::jsonb`;
    const cast = k === "featured_article_ids" || k === "featured_film_ids" ? "::uuid[]" : "";
    return `  ${k} = ${lit(v)}${Array.isArray(v) && v.length ? cast : ""}`;
  })
  .join(",\n");
sql += `update public.site_settings set\n${set}\nwhere id = 1;\n`;

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), sql);
writeFileSync(
  new URL("../supabase/seed-listening.sql", import.meta.url),
  `-- Sample albums and a playlist for the Listening section (marked is_placeholder).\n-- Only needed if you set up the site before Listening existed.\n\n${listeningSql}`,
);
console.log("wrote supabase/seed.sql");
