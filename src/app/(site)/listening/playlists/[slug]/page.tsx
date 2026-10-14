import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlaylist, getPlaylists } from "@/lib/data";
import { Rating } from "@/components/site/bits";
import { SampleMark } from "@/components/site/SampleMark";
import { KIND_LABEL, PlaylistSleeve, Sleeve } from "@/components/site/Sleeve";
import { ListenPlayer } from "@/components/site/ListenPlayer";

export async function generateStaticParams() {
  return (await getPlaylists()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/listening/playlists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getPlaylist(slug);
  if (!found) return { title: "Not found" };
  return {
    title: found.playlist.seo_title || found.playlist.title,
    description: found.playlist.seo_description || found.playlist.description || undefined,
    alternates: { canonical: `/listening/playlists/${slug}` },
  };
}

export default async function PlaylistPage({ params }: PageProps<"/listening/playlists/[slug]">) {
  const { slug } = await params;
  const found = await getPlaylist(slug);
  if (!found) notFound();
  const { playlist, items } = found;

  return (
    <div className="wrap pt-10 md:pt-16">
      <header className="grid gap-8 pb-12 md:grid-cols-12">
        <div className="w-40 md:col-span-3 md:w-full">
          <PlaylistSleeve playlist={playlist} items={items} sizes="(min-width: 768px) 22vw, 160px" />
        </div>
        <div className="md:col-span-8 md:col-start-5">
          <p className="meta">
            <Link href="/listening" className="quiet-link">
              Listening
            </Link>
            , a playlist of {items.length}
          </p>
          <h1 className="serif mt-3 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] italic [text-wrap:balance]">{playlist.title}</h1>
          {playlist.description ? <p className="mt-4 max-w-xl text-[1.125rem] text-charcoal">{playlist.description}</p> : null}
          <SampleMark show={playlist.is_placeholder} className="mt-4" />
          {playlist.listen_url ? (
            <div className="mt-6">
              <ListenPlayer url={playlist.listen_url} title={playlist.title} />
            </div>
          ) : null}
        </div>
      </header>

      {/* A playlist is a real sequence, so it is numbered. */}
      <ol className="border-t border-rule">
        {items.map((l, i) => (
          <li key={l.id} className="grid grid-cols-[2rem_4rem_1fr] items-center gap-4 border-b border-rule py-4 md:grid-cols-[3rem_5rem_1fr_auto] md:gap-8">
            <span className="serif text-[1.5rem] text-dust italic">{i + 1}</span>
            <Link href={`/listening/${l.slug}`} tabIndex={-1} aria-hidden>
              <Sleeve title={l.title} coverPath={l.cover_path} seed={l.slug} sizes="80px" disc={false} />
            </Link>
            <div className="min-w-0">
              <Link href={`/listening/${l.slug}`} className="serif text-[1.375rem] leading-tight no-underline hover:text-accent md:text-[1.75rem]">
                {l.title}
              </Link>
              <p className="meta mt-1">
                {[l.artist, l.release_year, l.kind !== "album" ? KIND_LABEL[l.kind] : null].filter(Boolean).join(", ")}
              </p>
              {l.short_note ? <p className="mt-1 hidden max-w-xl text-[0.9375rem] text-charcoal md:block">{l.short_note}</p> : null}
            </div>
            <Rating value={l.rating} className="col-start-3 md:col-start-auto" />
          </li>
        ))}
      </ol>
    </div>
  );
}
