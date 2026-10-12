// Sample content for development and first launch.
// Everything here is marked is_placeholder = true and shows a "Sample" marker on the site.
// It is used (a) to generate supabase/seed.sql and (b) as a read-only preview
// when Supabase is not configured yet. Replace it from the admin dashboard.
import { doc, p, h2, em, quote, stanza, hr } from "./richtext-build";
import { readingMinutes } from "./text";
import type { Article, Collection, Film, FilmList, JournalEntry, Photo, SiteSettings } from "./types";

const day = (n: number) => new Date(Date.UTC(2026, 9, 12) - n * 86400000).toISOString();
const base = (id: string, slug: string, daysAgo: number) => ({
  id,
  slug,
  status: "published" as const,
  published_at: day(daysAgo),
  created_at: day(daysAgo),
  updated_at: day(daysAgo),
  is_placeholder: true,
  seo_title: null,
  seo_description: null,
});

// ── Photographs (abstract placeholder frames in /public/sample) ──
const photoDefs: [string, string, string, number, number, string, string][] = [
  // slug, title, category, w, h, alt, caption
  ["frame-01", "Platform, early light", "Street", 1600, 1067, "Abstract placeholder frame in warm grey tones", "Sample caption. A line about where and when, or nothing at all."],
  ["frame-02", "Window study", "Everyday", 1067, 1600, "Abstract placeholder frame in soft amber tones", "Sample caption."],
  ["frame-03", "Stairwell", "Architecture", 1200, 1500, "Abstract placeholder frame in cool charcoal tones", "Sample caption. Captions sit below the image, never on it."],
  ["frame-04", "Low tide", "Nature", 1800, 1013, "Abstract placeholder frame in muted green-grey tones", "Sample caption."],
  ["frame-05", "Portrait, unposed", "Portraits", 1200, 1600, "Abstract placeholder frame in deep red-brown tones", "Sample caption."],
  ["frame-06", "Crossing", "Street", 1600, 1200, "Abstract placeholder frame in pale stone tones", "Sample caption."],
  ["frame-07", "Station roof", "Travel", 1600, 1067, "Abstract placeholder frame in blue-grey tones", "Sample caption."],
  ["frame-08", "Kitchen, Sunday", "Everyday", 1200, 1200, "Abstract placeholder frame in ochre tones", "Sample caption."],
  ["frame-09", "Courtyard", "Architecture", 1067, 1600, "Abstract placeholder frame in olive tones", "Sample caption."],
];

export const sampleCollectionId = "c0000000-0000-4000-8000-000000000001";

export const samplePhotos: Photo[] = photoDefs.map(([slug, title, category, width, height, alt, caption], i) => ({
  ...base(`a0000000-0000-4000-8000-00000000000${i + 1}`, slug, 2 + i * 3),
  title,
  caption,
  location: i % 3 === 0 ? "Location (optional)" : null,
  image_path: `/sample/${slug}.jpg`,
  alt,
  width,
  height,
  category,
  tags: ["sample"],
  taken_on: null,
  collection_id: i < 4 ? sampleCollectionId : null,
  position: i,
  has_page: true,
}));

export const sampleCollections: Collection[] = [
  {
    ...base(sampleCollectionId, "a-sample-photo-story", 4),
    title: "A sample photo story",
    intro:
      "Collections group photographs into a short sequence with a few lines of text. This one is a placeholder: replace it with a walk, a trip, or a single afternoon.",
    body: null,
    cover_photo_id: samplePhotos[0].id,
  },
];

// ── Writing ──
const essayBody = doc(
  p("This is sample text, written to show how a longer essay sits on the page. Replace it with your own writing from the dashboard."),
  p(
    "There is a particular kind of attention that only arrives when nothing is asking for it. A street you have walked a hundred times turns out to have a bakery with a blue door. The light on a tram window does something it has always done, and you notice it for the first time. None of this is new. What is new is that you were there to see it.",
  ),
  p(
    "Writing, at its best, is a way of keeping that attention. It slows a moment down long enough to look at it from more than one side. A sentence is a small frame, the way a photograph is a small frame: it decides what is in and what is left out, and that decision is most of the work.",
  ),
  h2("On leaving things out"),
  p(
    "The hardest part of any draft is not the adding. It is the cutting. Every paragraph wants to explain itself, and most of them should not be allowed to. ",
    em("Trust the reader"),
    " is advice that sounds generous and feels, in practice, like stepping off a ledge.",
  ),
  quote(p("A pull quote or a borrowed line can sit here, set apart from the text around it.")),
  p(
    "So this space is for the things worth keeping: essays that take their time, short pieces that do not, and the occasional poem that refuses to be anything else.",
  ),
  hr(),
  p(em("Sample essay. Replace or delete it in the dashboard under Writing.")),
);

const poemBody = doc(
  stanza("Sample poem, first stanza,", "a line that turns at the end", "and lands somewhere quieter."),
  stanza("Line breaks are kept exactly", "as you type them,", "with space between stanzas."),
  p(em("Placeholder. Replace with your own poem.")),
);

const observationBody = doc(
  p(
    "Sample observation. Shorter pieces work here too: a page or two about a conversation overheard, a habit of a city, a thing that keeps happening on the way home.",
  ),
  p(
    "The layout stays the same as for a long essay, so nothing feels like a lesser format. Reading time is worked out from the text automatically.",
  ),
);

const storyBody = doc(
  p("Sample short story opening. Fiction is labelled by its category so no one mistakes it for a diary entry."),
  p(
    "The last train had already gone when she reached the platform, and the departure board kept showing it anyway, as if out of politeness. She sat on the bench under it and read the list of stations twice, the way you reread a letter from someone who has moved away.",
  ),
  p(em("Placeholder. Replace with your own story.")),
);

function article(
  id: string,
  slug: string,
  daysAgo: number,
  a: Pick<Article, "title" | "subtitle" | "excerpt" | "body" | "category" | "tags" | "cover_path" | "cover_alt">,
): Article {
  return { ...base(id, slug, daysAgo), ...a, reading_minutes: readingMinutes(a.body) };
}

export const sampleArticles: Article[] = [
  article("b0000000-0000-4000-8000-000000000001", "on-paying-attention", 1, {
    title: "On paying attention",
    subtitle: "A sample essay about noticing, and about leaving things out",
    excerpt: "There is a particular kind of attention that only arrives when nothing is asking for it.",
    body: essayBody,
    category: "Essay",
    tags: ["sample", "attention", "writing"],
    cover_path: "/sample/frame-06.jpg",
    cover_alt: "Abstract placeholder frame in pale stone tones",
  }),
  article("b0000000-0000-4000-8000-000000000002", "sample-poem", 6, {
    title: "Sample poem",
    subtitle: null,
    excerpt: "Line breaks are kept exactly as you type them.",
    body: poemBody,
    category: "Poetry",
    tags: ["sample"],
    cover_path: null,
    cover_alt: null,
  }),
  article("b0000000-0000-4000-8000-000000000003", "a-sample-observation", 11, {
    title: "A sample observation",
    subtitle: "Short pieces get the same careful layout",
    excerpt: "Shorter pieces work here too: a page or two about a habit of a city.",
    body: observationBody,
    category: "Observation",
    tags: ["sample", "city"],
    cover_path: "/sample/frame-07.jpg",
    cover_alt: "Abstract placeholder frame in blue-grey tones",
  }),
  article("b0000000-0000-4000-8000-000000000004", "the-last-train", 17, {
    title: "The last train",
    subtitle: "Sample short story",
    excerpt: "The last train had already gone when she reached the platform.",
    body: storyBody,
    category: "Short story",
    tags: ["sample", "fiction"],
    cover_path: null,
    cover_alt: null,
  }),
];

// ── Cinema (real film facts; ratings and reviews are placeholders) ──
const filmDefs: [string, string, number, string, string[], number, boolean, string][] = [
  ["paris-texas", "Paris, Texas", 1984, "Wim Wenders", ["Drama"], 5, true, "Recommendation"],
  ["in-the-mood-for-love", "In the Mood for Love", 2000, "Wong Kar-wai", ["Drama", "Romance"], 5, true, "Recommendation"],
  ["kumbalangi-nights", "Kumbalangi Nights", 2019, "Madhu C. Narayanan", ["Drama", "Comedy"], 4.5, false, "Recommendation"],
  ["columbus", "Columbus", 2017, "Kogonada", ["Drama"], 4, false, "Review"],
  ["perfect-days", "Perfect Days", 2023, "Wim Wenders", ["Drama"], 4.5, true, "Review"],
  ["aftersun", "Aftersun", 2022, "Charlotte Wells", ["Drama"], 4, false, "Rewatch"],
];

export const sampleFilms: Film[] = filmDefs.map(([slug, title, year, director, genres, rating, fav, category], i) => ({
  ...base(`d0000000-0000-4000-8000-00000000000${i + 1}`, slug, 3 + i * 4),
  title,
  release_year: year,
  director,
  poster_path: null,
  poster_credit: null,
  rating,
  short_review: "Sample review. A few lines on why this film stayed with you go here.",
  body:
    i === 0
      ? doc(
          p("Sample long-form reflection. Longer writing about a film appears below the short review, in the same reading layout as essays."),
          p("Replace this with your own thoughts, or leave the long review empty and keep just the short one."),
        )
      : null,
  genres,
  tags: ["sample"],
  category,
  is_favourite: fav,
  watched_on: null,
}));

export const sampleFilmLists: FilmList[] = [
  {
    ...base("e0000000-0000-4000-8000-000000000001", "quiet-films", 5),
    title: "Quiet films (sample list)",
    description: "Curated lists collect films around a mood or idea. Placeholder: rename it and choose your own films.",
    film_ids: [sampleFilms[0].id, sampleFilms[3].id, sampleFilms[4].id],
  },
];

// ── Journal ──
export const sampleJournal: JournalEntry[] = [
  {
    ...base("f0000000-0000-4000-8000-000000000001", "note-on-short-entries", 0),
    body: "Sample thought. Journal entries are short and need no title or cover image. One or two sentences is plenty.",
    kind: "thought",
    quote_source: null,
    tags: ["sample"],
  },
  {
    ...base("f0000000-0000-4000-8000-000000000002", "cultivate-our-garden", 2),
    body: "We must cultivate our garden.",
    kind: "quotation",
    quote_source: "Voltaire, Candide (1759)",
    tags: ["sample", "quotation"],
  },
  {
    ...base("f0000000-0000-4000-8000-000000000003", "sample-observation-note", 5),
    body: "Sample observation. Something small you saw today, written down before it disappears.",
    kind: "observation",
    quote_source: null,
    tags: ["sample"],
  },
  {
    ...base("f0000000-0000-4000-8000-000000000004", "sample-update", 9),
    body: "Sample update. Use these for news about the site or what you are working on.",
    kind: "update",
    quote_source: null,
    tags: ["sample"],
  },
];

export const sampleSettings: SiteSettings = {
  site_title: "Satchel",
  tagline: "Words, frames and films, carried around.",
  hero_line: "Things I carry: sentences, frames, and the films that stayed with me.",
  intro:
    "Sample introduction. Replace this with a few lines about who you are and what you make. It appears on the home page and can be edited in Settings.",
  about_body: doc(
    p("Sample About page. Everything here can be edited from the dashboard under Settings."),
    h2("Creative interests"),
    p("Placeholder. What you make, what you keep returning to, what you are curious about."),
    h2("Photography"),
    p("Placeholder. What you photograph, what you shoot with, what draws your eye."),
    h2("On writing"),
    p("Placeholder. Why you write, and what you hope a reader takes away."),
  ),
  profile_image_path: null,
  profile_image_alt: null,
  accent: "oxblood",
  socials: [{ label: "GitHub", url: "https://github.com/sachinjohnjosep" }],
  featured_photo_id: samplePhotos[3].id,
  featured_article_ids: [sampleArticles[0].id],
  featured_film_ids: [],
  seo_description: "A personal journal of writing, photography and film.",
  og_image_path: null,
  notify_email: null,
  updated_at: day(0),
};
