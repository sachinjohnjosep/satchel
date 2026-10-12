import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFilm, getFilms, relatedFilms } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/text";
import { FilmCard, Poster, Rating } from "@/components/site/bits";
import { RichText } from "@/components/RichText";
import { SampleMark } from "@/components/site/SampleMark";
import { ShareLink } from "@/components/site/ShareLink";

export async function generateStaticParams() {
  return (await getFilms()).map((f) => ({ slug: f.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cinema/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFilm(slug);
  if (!f) return { title: "Not found" };
  const poster = mediaUrl(f.poster_path);
  const t = `${f.title}${f.release_year ? ` (${f.release_year})` : ""}`;
  return {
    title: f.seo_title || t,
    description: f.seo_description || f.short_review || `Notes on ${t}`,
    alternates: { canonical: `/cinema/${f.slug}` },
    openGraph: { title: t, type: "article", ...(poster ? { images: [poster] } : {}) },
  };
}

export default async function FilmPage({ params }: PageProps<"/cinema/[slug]">) {
  const { slug } = await params;
  const film = await getFilm(slug);
  if (!film) notFound();
  const related = await relatedFilms(film);

  return (
    <div className="screening -mt-px pb-24">
      <article className="wrap pt-10 md:pt-16">
        <div className="grid gap-10 md:grid-cols-12 md:gap-12">
          <div className="mx-auto w-2/3 max-w-xs md:col-span-4 md:w-full md:max-w-none">
            <Poster film={film} sizes="(min-width: 768px) 30vw, 66vw" priority />
            {film.poster_credit ? <p className="meta mt-2">{film.poster_credit}</p> : null}
          </div>
          <div className="md:col-span-8 md:pt-4">
            <p className="meta flex flex-wrap items-center gap-x-3 gap-y-1">
              {film.category ? <span>{film.category}</span> : null}
              {film.is_favourite ? <span>Favourite</span> : null}
              <SampleMark show={film.is_placeholder} />
            </p>
            <h1
              className="serif mt-3 text-[clamp(2.5rem,6vw,5rem)] leading-[0.98] italic tracking-[-0.02em] [text-wrap:balance]"
              style={{ fontVariationSettings: '"opsz" 72' }}
            >
              {film.title}
            </h1>
            <p className="mt-3 text-[1.125rem] text-screen-dust">
              {[film.release_year, film.director ? `directed by ${film.director}` : null].filter(Boolean).join(", ")}
            </p>
            <div className="mt-6 flex items-center gap-4">
              <Rating value={film.rating} className="scale-125 origin-left" />
            </div>
            {film.short_review ? (
              <p className="serif mt-8 max-w-[32rem] text-[1.5rem] leading-snug [text-wrap:pretty]">{film.short_review}</p>
            ) : null}
            <dl className="meta mt-8 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
              {film.genres.length ? (
                <>
                  <dt>Genre</dt>
                  <dd className="flex flex-wrap gap-x-2">
                    {film.genres.map((g) => (
                      <Link key={g} href={`/cinema?genre=${encodeURIComponent(g)}#films`} className="quiet-link text-screen-ink">
                        {g}
                      </Link>
                    ))}
                  </dd>
                </>
              ) : null}
              {film.watched_on ? (
                <>
                  <dt>Watched</dt>
                  <dd className="text-screen-ink">{formatDate(film.watched_on)}</dd>
                </>
              ) : null}
              {film.tags.length ? (
                <>
                  <dt>Tags</dt>
                  <dd className="text-screen-ink">{film.tags.map((t) => `#${t}`).join(" ")}</dd>
                </>
              ) : null}
            </dl>
          </div>
        </div>

        {film.body?.content?.length ? (
          <div className="mt-16 border-t border-screen-rule pt-12">
            <RichText doc={film.body} className="prose-journal mx-auto" />
          </div>
        ) : null}

        <div className="mx-auto mt-12 flex max-w-[var(--measure)] justify-end">
          <ShareLink title={film.title} />
        </div>

        {related.length ? (
          <aside className="mt-16 border-t border-screen-rule pt-6" aria-labelledby="more-h">
            <h2 id="more-h" className="serif mb-8 text-[1.75rem] italic">
              If you liked this
            </h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-3 md:gap-x-8">
              {related.map((f) => (
                <li key={f.id}>
                  <FilmCard film={f} />
                </li>
              ))}
            </ul>
          </aside>
        ) : null}
      </article>
    </div>
  );
}
