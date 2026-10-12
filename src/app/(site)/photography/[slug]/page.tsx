import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCollections, getPhoto, getPhotos } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/text";
import { SampleMark } from "@/components/site/SampleMark";
import { ShareLink } from "@/components/site/ShareLink";

export async function generateStaticParams() {
  return (await getPhotos()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/photography/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPhoto(slug);
  if (!p) return { title: "Not found" };
  const src = mediaUrl(p.image_path);
  return {
    title: p.seo_title || p.title,
    description: p.seo_description || p.caption || p.alt,
    alternates: { canonical: `/photography/${p.slug}` },
    openGraph: { title: p.title, ...(src ? { images: [{ url: src, width: p.width, height: p.height, alt: p.alt }] } : {}) },
  };
}

export default async function PhotoPage({ params }: PageProps<"/photography/[slug]">) {
  const { slug } = await params;
  const photo = await getPhoto(slug);
  if (!photo) notFound();
  const [all, collections] = await Promise.all([getPhotos(), getCollections()]);
  const src = mediaUrl(photo.image_path);
  if (!src) notFound();
  const i = all.findIndex((p) => p.id === photo.id);
  const prev = all[i - 1];
  const next = all[i + 1];
  const collection = collections.find((c) => c.id === photo.collection_id);
  const portrait = photo.height > photo.width;

  return (
    <article className="wrap pt-6 md:pt-10">
      <figure>
        <div className="mx-auto" style={{ maxWidth: portrait ? `min(100%, calc(82vh * ${photo.width / photo.height}))` : "100%" }}>
          <Image
            src={src}
            alt={photo.alt}
            width={photo.width}
            height={photo.height}
            priority
            sizes={portrait ? "(min-width: 768px) 60vw, 100vw" : "(min-width: 1320px) 1240px, 100vw"}
            className="block h-auto w-full bg-paper-deep"
          />
        </div>
        <figcaption className="mx-auto mt-6 grid max-w-5xl gap-6 md:grid-cols-12">
          <div className="md:col-span-7">
            <h1 className="serif text-[2.25rem] leading-tight italic md:text-[2.75rem]">{photo.title}</h1>
            {photo.caption ? <p className="mt-3 max-w-xl text-charcoal">{photo.caption}</p> : null}
            <SampleMark show={photo.is_placeholder} className="mt-3" />
          </div>
          <dl className="meta grid grid-cols-[auto_1fr] gap-x-6 gap-y-1.5 self-start md:col-span-5 md:pt-3">
            {photo.location ? (
              <>
                <dt>Place</dt>
                <dd className="text-charcoal">{photo.location}</dd>
              </>
            ) : null}
            {photo.taken_on ? (
              <>
                <dt>Taken</dt>
                <dd className="text-charcoal">{formatDate(photo.taken_on)}</dd>
              </>
            ) : null}
            {photo.category ? (
              <>
                <dt>Category</dt>
                <dd>
                  <Link href={`/photography?category=${encodeURIComponent(photo.category)}`} className="quiet-link text-charcoal">
                    {photo.category}
                  </Link>
                </dd>
              </>
            ) : null}
            {collection ? (
              <>
                <dt>Story</dt>
                <dd>
                  <Link href={`/photography/stories/${collection.slug}`} className="quiet-link text-charcoal">
                    {collection.title}
                  </Link>
                </dd>
              </>
            ) : null}
            {photo.tags.length ? (
              <>
                <dt>Tags</dt>
                <dd className="flex flex-wrap gap-x-2">
                  {photo.tags.map((t) => (
                    <Link key={t} href={`/photography?tag=${encodeURIComponent(t)}`} className="quiet-link text-charcoal">
                      #{t}
                    </Link>
                  ))}
                </dd>
              </>
            ) : null}
          </dl>
        </figcaption>
      </figure>

      <nav aria-label="More photographs" className="mx-auto mt-14 flex max-w-5xl items-center justify-between gap-4 border-t border-rule pt-4 text-[0.9375rem]">
        {prev ? (
          <Link href={`/photography/${prev.slug}`} className="quiet-link" rel="prev">
            Newer: <span className="serif italic">{prev.title}</span>
          </Link>
        ) : (
          <span />
        )}
        <ShareLink title={photo.title} />
        {next ? (
          <Link href={`/photography/${next.slug}`} className="quiet-link text-right" rel="next">
            Older: <span className="serif italic">{next.title}</span>
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
