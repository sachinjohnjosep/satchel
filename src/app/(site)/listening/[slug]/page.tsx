import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getListen, getListens, relatedListens } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/text";
import { Rating } from "@/components/site/bits";
import { RichText } from "@/components/RichText";
import { SampleMark } from "@/components/site/SampleMark";
import { ShareLink } from "@/components/site/ShareLink";
import { KIND_LABEL, ListenCard, Sleeve } from "@/components/site/Sleeve";
import { ListenPlayer } from "@/components/site/ListenPlayer";

export async function generateStaticParams() {
  return (await getListens()).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/listening/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const l = await getListen(slug);
  if (!l) return { title: "Not found" };
  const cover = mediaUrl(l.cover_path);
  const t = `${l.title}${l.artist ? ` by ${l.artist}` : ""}`;
  return {
    title: l.seo_title || t,
    description: l.seo_description || l.short_note || `Notes on ${t}`,
    alternates: { canonical: `/listening/${l.slug}` },
    openGraph: { title: t, type: "article", ...(cover ? { images: [cover] } : {}) },
  };
}

export default async function ListenPage({ params }: PageProps<"/listening/[slug]">) {
  const { slug } = await params;
  const listen = await getListen(slug);
  if (!listen) notFound();
  const related = await relatedListens(listen);

  return (
    <article className="wrap pt-10 pb-8 md:pt-16">
      <div className="grid gap-10 md:grid-cols-12 md:gap-12">
        <div className="group mx-auto w-3/4 max-w-sm md:col-span-5 md:w-full md:max-w-none">
          <div className="mr-[14%]">
            <Sleeve title={listen.title} subtitle={listen.artist} coverPath={listen.cover_path} seed={listen.slug} sizes="(min-width: 768px) 36vw, 70vw" priority />
          </div>
          {listen.cover_credit ? <p className="meta mt-2">{listen.cover_credit}</p> : null}
        </div>
        <div className="md:col-span-7 md:pt-2">
          <p className="meta flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{KIND_LABEL[listen.kind]}</span>
            {listen.is_favourite ? <span>On repeat</span> : null}
            <SampleMark show={listen.is_placeholder} />
          </p>
          <h1
            className="serif mt-3 text-[clamp(2.5rem,6vw,4.75rem)] leading-[0.98] tracking-[-0.02em] [text-wrap:balance]"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            {listen.title}
          </h1>
          <p className="mt-3 text-[1.125rem] text-charcoal">{[listen.artist, listen.release_year].filter(Boolean).join(", ")}</p>
          <Rating value={listen.rating} className="mt-6 origin-left scale-125" />
          {listen.short_note ? <p className="serif mt-8 max-w-[32rem] text-[1.5rem] leading-snug [text-wrap:pretty]">{listen.short_note}</p> : null}

          <div className="mt-8">
            <ListenPlayer url={listen.listen_url} title={listen.title} />
          </div>

          <dl className="meta mt-8 grid max-w-md grid-cols-[auto_1fr] gap-x-6 gap-y-1.5">
            {listen.genres.length ? (
              <>
                <dt>Genre</dt>
                <dd className="flex flex-wrap gap-x-2">
                  {listen.genres.map((g) => (
                    <Link key={g} href={`/listening?genre=${encodeURIComponent(g)}#all`} className="quiet-link text-charcoal">
                      {g}
                    </Link>
                  ))}
                </dd>
              </>
            ) : null}
            {listen.listened_on ? (
              <>
                <dt>First heard</dt>
                <dd className="text-charcoal">{formatDate(listen.listened_on)}</dd>
              </>
            ) : null}
          </dl>
        </div>
      </div>

      {listen.body?.content?.length ? (
        <div className="mt-16 border-t border-rule pt-12">
          <RichText doc={listen.body} className="prose-journal mx-auto" />
        </div>
      ) : null}

      <div className="mx-auto mt-12 flex max-w-[var(--measure)] justify-end">
        <ShareLink title={listen.title} />
      </div>

      {related.length ? (
        <aside className="mt-16 border-t border-rule pt-6" aria-labelledby="more-h">
          <h2 id="more-h" className="serif mb-8 text-[1.75rem] italic">
            Played alongside
          </h2>
          <ul className="grid grid-cols-2 gap-x-5 gap-y-10 sm:grid-cols-4 md:gap-x-8">
            {related.map((l) => (
              <li key={l.id}>
                <ListenCard listen={l} />
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
