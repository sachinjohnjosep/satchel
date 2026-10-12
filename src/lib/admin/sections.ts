// The dashboard's content sections. Adding a new kind of content starts here.

export type SectionKey = "writing" | "photos" | "stories" | "films" | "lists" | "journal";

export const SECTIONS: Record<
  SectionKey,
  { table: string; label: string; singular: string; publicPath: (slug: string) => string; newLabel: string }
> = {
  writing: { table: "articles", label: "Writing", singular: "piece", publicPath: (s) => `/writing/${s}`, newLabel: "New piece" },
  photos: { table: "photos", label: "Photographs", singular: "photograph", publicPath: (s) => `/photography/${s}`, newLabel: "Add photograph" },
  stories: { table: "collections", label: "Photo stories", singular: "story", publicPath: (s) => `/photography/stories/${s}`, newLabel: "New story" },
  films: { table: "films", label: "Films", singular: "film", publicPath: (s) => `/cinema/${s}`, newLabel: "Add film" },
  lists: { table: "film_lists", label: "Film lists", singular: "list", publicPath: (s) => `/cinema/lists/${s}`, newLabel: "New list" },
  journal: { table: "journal_entries", label: "Journal", singular: "entry", publicPath: (s) => `/journal/${s}`, newLabel: "New entry" },
};

export const isSection = (s: string): s is SectionKey => s in SECTIONS;

export type PubState = "draft" | "scheduled" | "published";
export function pubState(row: { status: string; published_at: string | null }, now = Date.now()): PubState {
  if (row.status !== "published") return "draft";
  if (row.published_at && new Date(row.published_at).getTime() > now) return "scheduled";
  return "published";
}
