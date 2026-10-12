import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCollection, getCollections, getPhotos } from "@/lib/data";
import { Gallery } from "@/components/site/Gallery";
import { toGalleryItems } from "@/lib/gallery";
import { RichText } from "@/components/RichText";
import { SampleMark } from "@/components/site/SampleMark";
import { mediaUrl } from "@/lib/media";
import { EmptyState } from "@/components/site/bits";

export async function generateStaticParams() {
  return (await getCollections()).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/photography/stories/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getCollection(slug);
  if (!found) return { title: "Not found" };
  const { collection } = found;
  const cover = (await getPhotos()).find((p) => p.id === collection.cover_photo_id);
  const src = cover ? mediaUrl(cover.image_path) : null;
  return {
    title: collection.seo_title || collection.title,
    description: collection.seo_description || collection.intro || undefined,
    alternates: { canonical: `/photography/stories/${collection.slug}` },
    openGraph: src ? { images: [src] } : undefined,
  };
}

export default async function StoryPage({ params }: PageProps<"/photography/stories/[slug]">) {
  const { slug } = await params;
  const found = await getCollection(slug);
  if (!found) notFound();
  const { collection, photos } = found;
  return (
    <div className="wrap pt-10 md:pt-16">
      <header className="mx-auto max-w-3xl pb-12 text-center">
        <p className="meta">Photo story, {photos.length} frames</p>
        <h1 className="serif mt-3 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] [text-wrap:balance]">{collection.title}</h1>
        {collection.intro ? <p className="serif mx-auto mt-5 max-w-xl text-[1.3125rem] leading-snug italic text-charcoal">{collection.intro}</p> : null}
        <SampleMark show={collection.is_placeholder} className="mt-4" />
      </header>
      {collection.body ? <RichText doc={collection.body} className="prose-journal mx-auto mb-14" /> : null}
      {photos.length ? <Gallery items={toGalleryItems(photos)} /> : <EmptyState>No photographs in this story yet.</EmptyState>}
    </div>
  );
}
