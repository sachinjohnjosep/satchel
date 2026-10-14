import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { isSection } from "@/lib/admin/sections";
import { getRow } from "@/lib/admin/queries";
import { mediaUrl } from "@/lib/media";
import { formatDate, readingMinutes } from "@/lib/text";
import { RichText } from "@/components/RichText";
import { Poster, Rating } from "@/components/site/bits";
import { JournalEntryView } from "@/components/site/JournalEntryView";
import type { Article, Film, JournalEntry, Listen, Photo } from "@/lib/types";
import { Sleeve } from "@/components/site/Sleeve";
import { ListenPlayer } from "@/components/site/ListenPlayer";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

/** Shows a draft the way it will look, to the signed-in admin only. */
export default async function Preview({ params }: PageProps<"/admin/preview/[section]/[id]">) {
  const { section, id } = await params;
  if (!isSection(section)) notFound();
  const { supabase } = await requireAdminPage();
  const row = await getRow<Record<string, unknown>>(supabase, section, id);
  if (!row) notFound();

  let content: React.ReactNode = null;
  if (section === "writing") {
    const a = row as unknown as Article;
    const cover = mediaUrl(a.cover_path);
    content = (
      <article className="pt-10">
        <header className="wrap mx-auto max-w-[52rem] text-center">
          <p className="meta">{[a.category, formatDate(a.published_at) || "Not published", `${readingMinutes(a.body)} min read`].filter(Boolean).join(", ")}</p>
          <h1 className="serif mt-5 text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.02] [text-wrap:balance]">{a.title}</h1>
          {a.subtitle ? <p className="serif mt-5 text-[1.375rem] italic text-charcoal">{a.subtitle}</p> : null}
        </header>
        {cover ? (
          <div className="wrap mt-10">
            <div className="relative mx-auto aspect-[16/9] max-w-[68rem] overflow-hidden bg-paper-deep">
              <Image src={cover} alt={a.cover_alt ?? ""} fill sizes="100vw" className="object-cover" />
            </div>
          </div>
        ) : null}
        <div className="wrap mt-12">
          <RichText doc={a.body} className="prose-journal drop-cap mx-auto" />
        </div>
      </article>
    );
  } else if (section === "films") {
    const f = row as unknown as Film;
    content = (
      <div className="screening py-12">
        <div className="wrap grid gap-10 md:grid-cols-12">
          <div className="mx-auto w-2/3 md:col-span-4 md:w-full">
            <Poster film={f} sizes="30vw" />
          </div>
          <div className="md:col-span-8">
            <h1 className="serif text-[clamp(2.5rem,6vw,5rem)] leading-none italic">{f.title}</h1>
            <p className="mt-3 text-screen-dust">{[f.release_year, f.director].filter(Boolean).join(", ")}</p>
            <Rating value={f.rating} className="mt-6" />
            {f.short_review ? <p className="serif mt-8 text-[1.5rem] leading-snug">{f.short_review}</p> : null}
          </div>
        </div>
        {f.body ? <RichText doc={f.body} className="prose-journal mx-auto mt-14 px-5" /> : null}
      </div>
    );
  } else if (section === "journal") {
    content = (
      <div className="wrap pt-10">
        <JournalEntryView entry={row as unknown as JournalEntry} linked={false} large />
      </div>
    );
  } else if (section === "listening") {
    const l = row as unknown as Listen;
    content = (
      <div className="wrap py-12">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="group mx-auto w-2/3 md:col-span-5 md:w-full">
            <div className="mr-[14%]">
              <Sleeve title={l.title} subtitle={l.artist} coverPath={l.cover_path} seed={l.slug} sizes="40vw" />
            </div>
          </div>
          <div className="md:col-span-7">
            <h1 className="serif text-[clamp(2.5rem,6vw,4.5rem)] leading-none">{l.title}</h1>
            <p className="mt-3 text-charcoal">{[l.artist, l.release_year].filter(Boolean).join(", ")}</p>
            <Rating value={l.rating == null ? null : Number(l.rating)} className="mt-6" />
            {l.short_note ? <p className="serif mt-8 text-[1.5rem] leading-snug">{l.short_note}</p> : null}
            <div className="mt-8">
              <ListenPlayer url={l.listen_url} title={l.title} />
            </div>
          </div>
        </div>
        {l.body ? <RichText doc={l.body} className="prose-journal mx-auto mt-14" /> : null}
      </div>
    );
  } else if (section === "photos") {
    const p = row as unknown as Photo;
    const src = mediaUrl(p.image_path);
    content = (
      <div className="wrap pt-8">
        {src ? <Image src={src} alt={p.alt} width={p.width} height={p.height} sizes="100vw" className="mx-auto block h-auto max-h-[82vh] w-auto" /> : null}
        <h1 className="serif mt-6 text-[2.5rem] italic">{p.title}</h1>
        {p.caption ? <p className="mt-2 text-charcoal">{p.caption}</p> : null}
      </div>
    );
  } else {
    notFound();
  }

  return (
    <div className="min-h-dvh pb-24">
      <p className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-4 bg-ink px-4 py-2 text-center text-[0.875rem] text-paper">
        Preview. {row.status === "published" ? "This is live." : "Not visible to visitors."}
        <Link href={`/admin/${section}/${id}`} className="underline underline-offset-4">
          Back to editing
        </Link>
      </p>
      {content}
    </div>
  );
}
