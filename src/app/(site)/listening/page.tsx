import type { Metadata } from "next";
import Link from "next/link";
import { distinct, filterListens, getListens, getPlaylists, type ListenFilter } from "@/lib/data";
import { EmptyState, FilterLinks } from "@/components/site/bits";
import { KIND_LABEL, ListenCard, PlaylistSleeve } from "@/components/site/Sleeve";
import { SampleMark } from "@/components/site/SampleMark";
import type { Listen } from "@/lib/types";

export const metadata: Metadata = {
  title: "Listening",
  description: "Albums and songs on repeat, with a few words on each, and playlists.",
  alternates: { canonical: "/listening" },
};

const pick = (v: string | string[] | undefined) => (typeof v === "string" && v ? v : undefined);

export default async function ListeningIndex({ searchParams }: PageProps<"/listening">) {
  const sp = await searchParams;
  const filter: ListenFilter = { genre: pick(sp.genre), kind: pick(sp.kind) };
  const [listens, playlists] = await Promise.all([getListens(), getPlaylists()]);
  const shown = filterListens(listens, filter);
  const favourites = listens.filter((l) => l.is_favourite);
  const filtering = Boolean(filter.genre || filter.kind);
  const genres = distinct(listens.flatMap((l) => l.genres));
  const kinds = (Object.keys(KIND_LABEL) as Listen["kind"][]).filter((k) => listens.some((l) => l.kind === k));
  const href = (next: ListenFilter) => {
    const q = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]);
    return `/listening${q.size ? `?${q}` : ""}#all`;
  };

  return (
    <div className="wrap pt-10 md:pt-16">
      <header className="grid gap-6 pb-12 md:grid-cols-12">
        <h1
          className="serif text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em] md:col-span-7"
          style={{ fontVariationSettings: '"opsz" 72' }}
        >
          Listening
        </h1>
        <p className="serif self-end text-[1.25rem] leading-snug italic text-charcoal md:col-span-5">
          Records and songs on repeat, a few words on each, and the playlists they end up in.
        </p>
      </header>

      {favourites.length && !filtering ? (
        <section aria-labelledby="repeat-h" className="border-t border-rule pt-6 pb-16">
          <h2 id="repeat-h" className="serif mb-8 text-[1.75rem] italic">
            On repeat
          </h2>
          <ul className="-mx-[var(--gutter)] flex snap-x scroll-px-[var(--gutter)] gap-6 overflow-x-auto px-[var(--gutter)] pb-4 md:mx-0 md:grid md:grid-cols-4 md:overflow-visible md:px-0 lg:grid-cols-5">
            {favourites.map((l) => (
              <li key={l.id} className="w-[44vw] shrink-0 snap-start sm:w-[30vw] md:w-auto">
                <ListenCard listen={l} sizes="(min-width: 1024px) 18vw, (min-width: 768px) 22vw, 44vw" />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {playlists.length && !filtering ? (
        <section aria-labelledby="playlists-h" className="border-t border-rule pt-6 pb-16">
          <h2 id="playlists-h" className="serif mb-6 text-[1.75rem] italic">
            Playlists
          </h2>
          <ul className="grid gap-x-10 gap-y-8 md:grid-cols-2">
            {playlists.map((p) => {
              const items = p.listen_ids.map((id) => listens.find((l) => l.id === id)).filter((l): l is Listen => Boolean(l));
              return (
                <li key={p.id} className="grid grid-cols-[6rem_1fr] items-start gap-5 sm:grid-cols-[8rem_1fr]">
                  <Link href={`/listening/playlists/${p.slug}`} tabIndex={-1} aria-hidden>
                    <PlaylistSleeve playlist={p} items={items} sizes="128px" />
                  </Link>
                  <div>
                    <Link href={`/listening/playlists/${p.slug}`} className="serif text-[1.5rem] leading-tight no-underline hover:text-accent">
                      {p.title}
                    </Link>
                    <p className="meta mt-1 flex flex-wrap items-center gap-2">
                      {items.length} {items.length === 1 ? "record" : "records"}
                      <SampleMark show={p.is_placeholder} />
                    </p>
                    {p.description ? <p className="mt-2 line-clamp-3 max-w-md text-[0.9375rem] text-charcoal">{p.description}</p> : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="all" className="border-t border-rule pt-6">
        <div className="mb-8 space-y-3">
          <h2 id="all" className="serif text-[1.75rem] italic">
            {filtering ? `${shown.length} ${shown.length === 1 ? "record" : "records"}` : "Everything"}
          </h2>
          {kinds.length > 1 ? (
            <FilterLinks
              label="Filter by kind"
              active={filter.kind ?? null}
              options={[{ value: null, label: "All kinds" }, ...kinds.map((k) => ({ value: k, label: `${KIND_LABEL[k]}s` }))]}
              hrefFor={(v) => href({ ...filter, kind: v ?? undefined })}
            />
          ) : null}
          {genres.length > 1 ? (
            <FilterLinks
              label="Filter by genre"
              active={filter.genre ?? null}
              options={[{ value: null, label: "Every genre" }, ...genres.map((g) => ({ value: g, label: g }))]}
              hrefFor={(v) => href({ ...filter, genre: v ?? undefined })}
            />
          ) : null}
        </div>
        {shown.length ? (
          <ul className="grid grid-cols-2 gap-x-5 gap-y-12 sm:grid-cols-3 md:gap-x-8 lg:grid-cols-4 xl:grid-cols-5">
            {shown.map((l) => (
              <li key={l.id}>
                <ListenCard listen={l} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>{listens.length ? "Nothing matches these filters." : "Nothing on the turntable yet."}</EmptyState>
        )}
      </section>
    </div>
  );
}
