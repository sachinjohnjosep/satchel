// Shared content types. These mirror the tables in supabase/migrations.

export type Status = "draft" | "published";

/** Rich text is stored as Tiptap/ProseMirror JSON. */
export type RichNode = {
  type: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: RichNode[];
  text?: string;
};
export type RichDoc = { type: "doc"; content?: RichNode[] };

type Base = {
  id: string;
  slug: string;
  status: Status;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  /** Sample content seeded during development. Shown with a "Sample" marker. */
  is_placeholder: boolean;
  seo_title: string | null;
  seo_description: string | null;
};

export type Article = Base & {
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  body: RichDoc;
  cover_path: string | null;
  cover_alt: string | null;
  category: string | null;
  tags: string[];
  reading_minutes: number;
};

export type Photo = Base & {
  title: string;
  caption: string | null;
  location: string | null;
  image_path: string;
  alt: string;
  width: number;
  height: number;
  category: string | null;
  tags: string[];
  taken_on: string | null;
  collection_id: string | null;
  position: number;
  has_page: boolean;
};

export type Collection = Base & {
  title: string;
  intro: string | null;
  body: RichDoc | null;
  cover_photo_id: string | null;
};

export type Film = Base & {
  title: string;
  release_year: number | null;
  director: string | null;
  poster_path: string | null;
  poster_credit: string | null;
  rating: number | null; // 0–5 in halves
  short_review: string | null;
  body: RichDoc | null;
  genres: string[];
  tags: string[];
  category: string | null; // e.g. "Recommendation", "Rewatch", "Review"
  is_favourite: boolean;
  watched_on: string | null;
};

export type FilmList = Base & {
  title: string;
  description: string | null;
  film_ids: string[];
};

export type ListenKind = "album" | "song" | "ep" | "live";

export type Listen = Base & {
  title: string;
  artist: string | null;
  kind: ListenKind;
  release_year: number | null;
  cover_path: string | null;
  cover_credit: string | null;
  rating: number | null;
  short_note: string | null;
  body: RichDoc | null;
  genres: string[];
  tags: string[];
  is_favourite: boolean;
  /** Spotify, YouTube, Apple Music, SoundCloud or Bandcamp link. */
  listen_url: string | null;
  listened_on: string | null;
};

export type Playlist = Base & {
  title: string;
  description: string | null;
  listen_ids: string[];
  listen_url: string | null;
  cover_path: string | null;
};

export type JournalKind = "thought" | "observation" | "quotation" | "update";

export type JournalEntry = Base & {
  body: string;
  kind: JournalKind;
  quote_source: string | null;
  tags: string[];
};

export type Accent = "oxblood" | "olive" | "faded-red";

export type SiteSettings = {
  site_title: string;
  tagline: string;
  hero_line: string;
  intro: string;
  about_body: RichDoc;
  profile_image_path: string | null;
  profile_image_alt: string | null;
  accent: Accent;
  socials: { label: string; url: string }[];
  featured_photo_id: string | null;
  featured_article_ids: string[];
  featured_film_ids: string[];
  seo_description: string;
  og_image_path: string | null;
  notify_email: string | null;
  updated_at: string;
};

export type Message = {
  id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  archived: boolean;
};
