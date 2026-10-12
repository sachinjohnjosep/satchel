import type { Metadata } from "next";
import Link from "next/link";
import { distinct, filterFilms, getFilmLists, getFilms, type FilmFilter } from "@/lib/data";
import { EmptyState, FilmCard } from "@/components/site/bits";
import { FilmFilters } from "@/components/site/FilmFilters";
import { SampleMark } from "@/components/site/SampleMark";

export const metadata: Metadata = {
  title: "Sachinema",
  description: "A film journal: recommendations, reviews, ratings and favourite films.",
  alternates: { canonical: "/cinema" },
};

const pick = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function CinemaIndex({ searchParams }: PageProps<"/cinema">) {
  const sp = await searchParams;
  const filter: FilmFilter = {
    genre: pick(sp.genre),
    rating: pick(sp.rating),
    decade: pick(sp.decade),
    category: pick(sp.category),
    favourites: pick(sp.favourites),
  };
  const [films, lists] = await Promise.all([getFilms(), getFilmLists()]);
  const shown = filterFilms(films, filter);
  const favourites = films.filter((f) => f.is_favourite);
  const filtering = Object.values(filter).some(Boolean);
  const decades = [...new Set(films.map((f) => (f.release_year ? Math.floor(f.release_year / 10) * 10 : null)).filter((d): d is number => d != null))].sort((a, b) => b - a);

  return (
    <div className="screening -mt-px pb-24">
      <div className="wrap pt-10 md:pt-16">
        <header className="grid gap-6 pb-12 md:grid-cols-12">
          <h1
            className="serif text-[clamp(3rem,9vw,7rem)] leading-[0.92] italic tracking-[-0.02em] md:col-span-8"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            Sachinema
          </h1>
          <p className="self-end text-screen-dust md:col-span-4">
            A film journal. Recommendations, the occasional long review, and the films I keep returning to.
          </p>
        </header>

        {favourites.length && !filtering ? (
          <section aria-labelledby="fav-h" className="border-t border-screen-rule pt-6 pb-16">
            <h2 id="fav-h" className="serif mb-8 text-[1.75rem] italic">
              Favourites
            </h2>
            {/* A letterboxed strip that scrolls sideways on small screens */}
            <ul className="-mx-[var(--gutter)] flex snap-x scroll-px-[var(--gutter)] gap-5 overflow-x-auto px-[var(--gutter)] pb-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-6">
              {favourites.map((f) => (
                <li key={f.id} className="w-[42vw] shrink-0 snap-start sm:w-[28vw] md:w-auto">
                  <FilmCard film={f} sizes="(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 42vw" />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {lists.length && !filtering ? (
          <section aria-labelledby="lists-h" className="border-t border-screen-rule pt-6 pb-16">
            <h2 id="lists-h" className="serif mb-6 text-[1.75rem] italic">
              Lists
            </h2>
            <ul className="grid gap-x-10 gap-y-6 md:grid-cols-2">
              {lists.map((l) => (
                <li key={l.id}>
                  <Link href={`/cinema/lists/${l.slug}`} className="serif text-[1.625rem] leading-tight no-underline hover:text-accent">
                    {l.title}
                  </Link>
                  <p className="meta mt-1">
                    {l.film_ids.length} film{l.film_ids.length === 1 ? "" : "s"} <SampleMark show={l.is_placeholder} className="ml-2" />
                  </p>
                  {l.description ? <p className="mt-2 max-w-md text-[0.9375rem] text-screen-dust">{l.description}</p> : null}
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <section aria-labelledby="films" className="border-t border-screen-rule pt-6">
          <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
            <h2 id="films" className="serif text-[1.75rem] italic">
              {filtering ? `${shown.length} film${shown.length === 1 ? "" : "s"}` : "Every film"}
            </h2>
            <FilmFilters
              genres={distinct(films.flatMap((f) => f.genres))}
              decades={decades}
              categories={distinct(films.map((f) => f.category))}
              current={filter as Record<string, string | undefined>}
            />
          </div>
          {shown.length ? (
            <ul className="grid grid-cols-2 gap-x-4 gap-y-12 sm:grid-cols-3 md:gap-x-8 lg:grid-cols-4 xl:grid-cols-5">
              {shown.map((f) => (
                <li key={f.id}>
                  <FilmCard film={f} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState>{films.length ? "No films match these filters." : "No films published yet."}</EmptyState>
          )}
        </section>
      </div>
    </div>
  );
}
