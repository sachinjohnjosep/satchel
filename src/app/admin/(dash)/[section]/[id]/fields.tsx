import type { ReactNode } from "react";
import { Checkbox, Panel, SelectField, TagsField, TextArea, TextField } from "@/components/admin/ui";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RichEditor } from "@/components/admin/RichEditor";
import { FilmPicker } from "@/components/admin/FilmPicker";
import type { Article, Collection, Film, FilmList, JournalEntry, Photo } from "@/lib/types";

// The fields for each kind of content. `main` goes in the wide column, `side` beside it.

type Sugg = { categories: string[]; tags: string[] };
type Out = { main: ReactNode; side: ReactNode };

export function articleFields(a: Partial<Article>, s: Sugg): Out {
  return {
    main: (
      <div className="space-y-6">
        <TextField name="title" label="Title" defaultValue={a.title} required className="!font-serif !text-[1.5rem]" />
        <TextField name="subtitle" label="Subtitle" defaultValue={a.subtitle} hint="Optional. Shown under the title." />
        <RichEditor name="body" label="Text" defaultValue={a.body ?? null} folder="writing" hint="For poems, use ↵ for a line break and Enter for a new stanza." />
        <TextArea name="excerpt" label="Excerpt" defaultValue={a.excerpt} rows={3} maxLength={600} hint="One or two sentences shown in lists and on the home page." />
      </div>
    ),
    side: (
      <>
        <Panel title="Organise">
          <TagsField name="category" label="Category" defaultValue={a.category} suggestions={[...new Set(["Essay", "Poetry", "Short story", "Reflection", "Observation", ...s.categories])]} hint="For example Essay, Poetry, Short story." />
          <TagsField name="tags" label="Tags" defaultValue={a.tags?.join(", ")} suggestions={s.tags} hint="Separate with commas." />
        </Panel>
        <Panel title="Cover image">
          <ImageUpload name="cover_path" label="Cover" folder="covers" defaultPath={a.cover_path} />
          <TextField name="cover_alt" label="Describe the cover" defaultValue={a.cover_alt} hint="For screen readers. Leave empty if it is purely decorative." />
        </Panel>
      </>
    ),
  };
}

export function photoFields(p: Partial<Photo>, s: Sugg, collections: Pick<Collection, "id" | "title">[]): Out {
  return {
    main: (
      <div className="space-y-6">
        <ImageUpload
          name="image_path"
          label="Photograph"
          folder="photos"
          defaultPath={p.image_path}
          sizeFields={{ width: "width", height: "height", defaultWidth: p.width, defaultHeight: p.height }}
          allowRemove={false}
          hint="Shown exactly as uploaded, with no overlays."
        />
        <TextField name="title" label="Title" defaultValue={p.title} required className="!font-serif !text-[1.375rem]" />
        <TextArea name="alt" label="Describe the photograph" defaultValue={p.alt} rows={2} maxLength={500} hint="What is in the picture, for people using screen readers." />
        <TextArea name="caption" label="Caption" defaultValue={p.caption} rows={3} maxLength={1000} hint="Optional. Shown below the photograph." />
        <div className="grid gap-6 sm:grid-cols-2">
          <TextField name="location" label="Place" defaultValue={p.location} hint="Optional, e.g. Kreuzberg, Berlin." />
          <TextField name="taken_on" type="date" label="Date taken" defaultValue={p.taken_on} />
        </div>
      </div>
    ),
    side: (
      <Panel title="Organise">
        <TagsField name="category" label="Category" defaultValue={p.category} suggestions={[...new Set(["Street", "Portraits", "Travel", "Architecture", "Nature", "Everyday", ...s.categories])]} />
        <TagsField name="tags" label="Tags" defaultValue={p.tags?.join(", ")} suggestions={s.tags} hint="Separate with commas." />
        <SelectField
          name="collection_id"
          label="Photo story"
          defaultValue={p.collection_id ?? ""}
          options={[{ value: "", label: "Not part of a story" }, ...collections.map((c) => ({ value: c.id, label: c.title }))]}
        />
        <TextField name="position" type="number" inputMode="numeric" label="Order in story" defaultValue={p.position ?? 0} hint="Lower numbers come first." />
      </Panel>
    ),
  };
}

export function storyFields(c: Partial<Collection>, photos: Pick<Photo, "id" | "title" | "collection_id">[]): Out {
  const own = photos.filter((p) => c.id && p.collection_id === c.id);
  return {
    main: (
      <div className="space-y-6">
        <TextField name="title" label="Title" defaultValue={c.title} required className="!font-serif !text-[1.5rem]" />
        <TextArea name="intro" label="Introduction" defaultValue={c.intro} rows={3} maxLength={1000} hint="A few lines shown above the photographs." />
        <RichEditor name="body" label="Longer text (optional)" defaultValue={c.body ?? null} folder="stories" />
        <p className="field-hint">
          To add photographs to this story, open a photograph and choose this story under “Photo story”. {own.length ? `It has ${own.length} so far.` : ""}
        </p>
      </div>
    ),
    side: (
      <Panel title="Cover">
        <SelectField
          name="cover_photo_id"
          label="Cover photograph"
          defaultValue={c.cover_photo_id ?? ""}
          options={[{ value: "", label: "First photograph in the story" }, ...(own.length ? own : photos).map((p) => ({ value: p.id, label: p.title }))]}
        />
      </Panel>
    ),
  };
}

export function filmFields(f: Partial<Film>, s: Sugg, genres: string[]): Out {
  return {
    main: (
      <div className="space-y-6">
        <TextField name="title" label="Film title" defaultValue={f.title} required className="!font-serif !text-[1.5rem]" />
        <div className="grid gap-6 sm:grid-cols-[8rem_1fr]">
          <TextField name="release_year" label="Year" inputMode="numeric" defaultValue={f.release_year} maxLength={4} />
          <TextField name="director" label="Director" defaultValue={f.director} />
        </div>
        <SelectField
          name="rating"
          label="My rating"
          defaultValue={f.rating == null ? "" : String(f.rating)}
          options={[{ value: "", label: "Not rated" }, ...[5, 4.5, 4, 3.5, 3, 2.5, 2, 1.5, 1, 0.5, 0].map((r) => ({ value: String(r), label: `${r} out of 5` }))]}
        />
        <TextArea name="short_review" label="Short review" defaultValue={f.short_review} rows={3} maxLength={600} hint="A few lines shown on the film card and at the top of its page." />
        <RichEditor name="body" label="Longer reflection (optional)" defaultValue={f.body ?? null} folder="films" />
      </div>
    ),
    side: (
      <>
        <Panel title="Organise">
          <TagsField name="genres" label="Genres" defaultValue={f.genres?.join(", ")} suggestions={genres} hint="Separate with commas, e.g. Drama, Romance." />
          <TagsField name="category" label="Kind of entry" defaultValue={f.category} suggestions={[...new Set(["Recommendation", "Review", "Rewatch", ...s.categories])]} />
          <TagsField name="tags" label="Tags" defaultValue={f.tags?.join(", ")} suggestions={s.tags} />
          <TextField name="watched_on" type="date" label="Watched on" defaultValue={f.watched_on} />
          <Checkbox name="is_favourite" label="One of my favourites" defaultChecked={f.is_favourite} hint="Shown in the Favourites row." />
        </Panel>
        <Panel title="Poster" description="Only upload a poster or still you have permission to use (for example from the distributor's press kit, or TMDB with credit). Without one, a typographic title card is shown.">
          <ImageUpload name="poster_path" label="Poster" folder="posters" defaultPath={f.poster_path} />
          <TextField name="poster_credit" label="Image credit" defaultValue={f.poster_credit} hint="E.g. “Poster courtesy of …”." />
        </Panel>
      </>
    ),
  };
}

export function listFields(l: Partial<FilmList>, films: Pick<Film, "id" | "title" | "release_year">[]): Out {
  return {
    main: (
      <div className="space-y-6">
        <TextField name="title" label="Title" defaultValue={l.title} required className="!font-serif !text-[1.5rem]" />
        <TextArea name="description" label="Description" defaultValue={l.description} rows={3} maxLength={1000} />
        <FilmPicker name="film_ids" films={films} defaultIds={l.film_ids ?? []} />
      </div>
    ),
    side: null,
  };
}

export function journalFields(j: Partial<JournalEntry>, s: Sugg): Out {
  return {
    main: (
      <div className="space-y-6">
        <TextArea name="body" label="Entry" defaultValue={j.body} rows={7} maxLength={5000} required className="!font-serif !text-[1.375rem] leading-snug" hint="Plain text. A blank line starts a new paragraph." />
        <TextField name="quote_source" label="Source (for quotations)" defaultValue={j.quote_source} hint="E.g. author, book, year." />
      </div>
    ),
    side: (
      <Panel title="Organise">
        <SelectField
          name="kind"
          label="Kind"
          defaultValue={j.kind ?? "thought"}
          options={[
            { value: "thought", label: "Thought" },
            { value: "observation", label: "Observation" },
            { value: "quotation", label: "Quotation" },
            { value: "update", label: "Update" },
          ]}
        />
        <TagsField name="tags" label="Tags" defaultValue={j.tags?.join(", ")} suggestions={s.tags} />
      </Panel>
    ),
  };
}
