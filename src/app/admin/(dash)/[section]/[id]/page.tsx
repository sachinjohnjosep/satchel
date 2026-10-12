import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { isSection, pubState, SECTIONS, type SectionKey } from "@/lib/admin/sections";
import { getRow, suggestions } from "@/lib/admin/queries";
import { deleteItem, saveItem } from "@/lib/admin/actions";
import { AdminForm } from "@/components/admin/ui";
import { AddressFields, PublishBar } from "@/components/admin/PublishBar";
import { articleFields, filmFields, journalFields, listFields, photoFields, storyFields } from "./fields";
import type { Article, Collection, Film, FilmList, JournalEntry, Photo } from "@/lib/types";

type AnyRow = { id: string; slug: string; status: string; published_at: string | null; seo_title: string | null; seo_description: string | null; title?: string; body?: unknown };

export async function generateMetadata({ params }: PageProps<"/admin/[section]/[id]">): Promise<Metadata> {
  const { section, id } = await params;
  if (!isSection(section)) return { title: "Not found" };
  return { title: id === "new" ? SECTIONS[section].newLabel : `Edit ${SECTIONS[section].singular}` };
}

const PREVIEWABLE: SectionKey[] = ["writing", "films", "journal", "photos"];

export default async function EditItem({ params, searchParams }: PageProps<"/admin/[section]/[id]">) {
  const { section, id } = await params;
  if (!isSection(section)) notFound();
  const { saved } = await searchParams;
  const { supabase } = await requireAdminPage();
  const cfg = SECTIONS[section];
  const isNew = id === "new";

  let row: AnyRow | null = null;
  if (!isNew) {
    row = await getRow<AnyRow>(supabase, section, id);
    if (!row) notFound();
  }
  const r = (row ?? {}) as Record<string, unknown>;

  let fields: { main: React.ReactNode; side: React.ReactNode };
  switch (section) {
    case "writing":
      fields = articleFields(r as Partial<Article>, await suggestions(supabase, "articles"));
      break;
    case "photos": {
      const { data: collections } = await supabase.from("collections").select("id, title").order("title");
      fields = photoFields(r as Partial<Photo>, await suggestions(supabase, "photos"), collections ?? []);
      break;
    }
    case "stories": {
      const { data: photos } = await supabase.from("photos").select("id, title, collection_id").order("updated_at", { ascending: false }).limit(500);
      fields = storyFields(r as Partial<Collection>, photos ?? []);
      break;
    }
    case "films": {
      const [sugg, { data: g }] = await Promise.all([suggestions(supabase, "films"), supabase.from("films").select("genres").limit(1000)]);
      const genres = [...new Set(["Drama", "Comedy", "Romance", "Thriller", "Documentary", "Animation", "Science fiction", "Horror", ...(g ?? []).flatMap((x: { genres: string[] }) => x.genres)])].sort();
      fields = filmFields(r as Partial<Film>, sugg, genres);
      break;
    }
    case "lists": {
      const { data: films } = await supabase.from("films").select("id, title, release_year").order("title");
      fields = listFields(r as Partial<FilmList>, films ?? []);
      break;
    }
    case "journal": {
      const { data } = await supabase.from("journal_entries").select("tags").limit(1000);
      fields = journalFields(r as Partial<JournalEntry>, { categories: [], tags: [...new Set((data ?? []).flatMap((x: { tags: string[] }) => x.tags))].sort() });
      break;
    }
  }

  const state = row ? pubState(row) : "draft";
  const save = saveItem.bind(null, section, isNew ? null : id);
  const remove = isNew ? undefined : deleteItem.bind(null, section, id);
  const base = cfg.publicPath("").replace(/\/$/, "/");

  return (
    <div>
      <p className="meta mb-2">
        <Link href={`/admin/${section}`} className="quiet-link">
          {cfg.label}
        </Link>
      </p>
      <h1 className="serif mb-8 text-[2.25rem] leading-none italic md:text-[2.75rem]">
        {isNew ? cfg.newLabel : `Edit ${cfg.singular}`}
      </h1>
      <AdminForm action={save} initialMessage={saved ? "Saved." : undefined} className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0 space-y-10">
          {fields.main}
          <AddressFields slug={row?.slug ?? ""} seoTitle={row?.seo_title ?? null} seoDescription={row?.seo_description ?? null} base={base} />
        </div>
        <div className="space-y-10">
          {fields.side}
          <PublishBar
            isNew={isNew}
            state={state}
            publishedAt={row?.published_at ?? null}
            publicHref={row ? cfg.publicPath(row.slug) : null}
            previewHref={row && PREVIEWABLE.includes(section) ? `/admin/preview/${section}/${row.id}` : null}
            onDelete={remove}
            noun={cfg.singular}
          />
        </div>
      </AdminForm>
    </div>
  );
}
