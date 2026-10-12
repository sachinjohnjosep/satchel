import type { Metadata } from "next";
import Link from "next/link";
import { distinct, getCollections, getPhotos } from "@/lib/data";
import { EmptyState, FilterLinks, Frame } from "@/components/site/bits";
import { Gallery } from "@/components/site/Gallery";
import { toGalleryItems } from "@/lib/gallery";
import { SampleMark } from "@/components/site/SampleMark";

export const metadata: Metadata = {
  title: "Photography",
  description: "Street, portraits, travel, architecture, nature and everyday moments.",
  alternates: { canonical: "/photography" },
};

export default async function PhotographyIndex({ searchParams }: PageProps<"/photography">) {
  const { category, tag } = await searchParams;
  const active = typeof category === "string" ? category : null;
  const activeTag = typeof tag === "string" ? tag : null;
  const [photos, collections] = await Promise.all([getPhotos(), getCollections()]);
  const categories = distinct(photos.map((p) => p.category));
  const shown = photos.filter((p) => (!active || p.category === active) && (!activeTag || p.tags.includes(activeTag)));

  return (
    <div className="wrap pt-10 md:pt-16">
      <header className="grid gap-6 pb-10 md:grid-cols-12">
        <h1 className="serif text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em] md:col-span-8">Photography</h1>
        <p className="self-end text-charcoal md:col-span-4">
          {photos.length} photograph{photos.length === 1 ? "" : "s"}
          {collections.length ? `, ${collections.length} ${collections.length === 1 ? "story" : "stories"}` : ""}. Select a frame to see it full screen.
        </p>
      </header>

      {collections.length && !active && !activeTag ? (
        <section aria-labelledby="stories-h" className="mb-16">
          <h2 id="stories-h" className="serif mb-5 text-[1.75rem] italic">
            Photo stories
          </h2>
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((c) => {
              const cover = photos.find((p) => p.id === c.cover_photo_id) ?? photos.find((p) => p.collection_id === c.id);
              return (
                <li key={c.id}>
                  <Link href={`/photography/stories/${c.slug}`} className="group block no-underline">
                    {cover ? <Frame photo={cover} sizes="(min-width: 1024px) 33vw, 50vw" crop="3/2" /> : null}
                    <p className="serif mt-3 text-[1.5rem] leading-tight group-hover:text-accent">{c.title}</p>
                  </Link>
                  {c.intro ? <p className="mt-1 line-clamp-2 text-[0.9375rem] text-charcoal">{c.intro}</p> : null}
                  <SampleMark show={c.is_placeholder} className="mt-2" />
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {categories.length > 1 ? (
        <div className="mb-8 border-t border-rule pt-5">
          <FilterLinks
            label="Filter by category"
            active={active}
            options={[{ value: null, label: "All photographs" }, ...categories.map((c) => ({ value: c, label: c }))]}
            hrefFor={(v) => (v ? `/photography?category=${encodeURIComponent(v)}` : "/photography")}
          />
        </div>
      ) : null}

      {shown.length ? <Gallery items={toGalleryItems(shown)} /> : <EmptyState>{photos.length ? "No photographs in this category yet." : "No photographs published yet."}</EmptyState>}
    </div>
  );
}
