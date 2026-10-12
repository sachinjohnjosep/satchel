import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getArticle, getArticles, getSettings, relatedArticles } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { formatDate } from "@/lib/text";
import { RichText } from "@/components/RichText";
import { SampleMark } from "@/components/site/SampleMark";
import { ShareLink } from "@/components/site/ShareLink";
import { siteUrl } from "@/lib/env";

export async function generateStaticParams() {
  return (await getArticles()).map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: PageProps<"/writing/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticle(slug);
  if (!a) return { title: "Not found" };
  const image = mediaUrl(a.cover_path);
  return {
    title: a.seo_title || a.title,
    description: a.seo_description || a.excerpt || a.subtitle || undefined,
    alternates: { canonical: `/writing/${a.slug}` },
    openGraph: {
      type: "article",
      title: a.seo_title || a.title,
      description: a.seo_description || a.excerpt || undefined,
      publishedTime: a.published_at ?? undefined,
      modifiedTime: a.updated_at,
      ...(image ? { images: [{ url: image, alt: a.cover_alt ?? "" }] } : {}),
    },
  };
}

export default async function ArticlePage({ params }: PageProps<"/writing/[slug]">) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) notFound();
  const [related, settings] = await Promise.all([relatedArticles(article), getSettings()]);
  const cover = mediaUrl(article.cover_path);
  const isPoem = article.category?.toLowerCase().startsWith("poe");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    datePublished: article.published_at,
    dateModified: article.updated_at,
    author: { "@type": "Person", name: settings.site_title },
    url: `${siteUrl}/writing/${article.slug}`,
    ...(cover ? { image: cover.startsWith("/") ? `${siteUrl}${cover}` : cover } : {}),
  };

  return (
    <article className="pt-10 md:pt-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <header className="wrap">
        <div className="mx-auto max-w-[52rem] text-center">
          <p className="meta flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
            {article.category ? (
              <Link href={`/writing?category=${encodeURIComponent(article.category)}`} className="quiet-link">
                {article.category}
              </Link>
            ) : null}
            <time dateTime={article.published_at ?? undefined}>{formatDate(article.published_at)}</time>
            <span>{article.reading_minutes} min read</span>
            <SampleMark show={article.is_placeholder} />
          </p>
          <h1
            className="serif mt-5 text-[clamp(2.4rem,6vw,4.5rem)] leading-[1.02] font-[360] tracking-[-0.02em] [text-wrap:balance]"
            style={{ fontVariationSettings: '"opsz" 60' }}
          >
            {article.title}
          </h1>
          {article.subtitle ? (
            <p className="serif mx-auto mt-5 max-w-xl text-[1.375rem] leading-snug italic text-charcoal [text-wrap:balance]">
              {article.subtitle}
            </p>
          ) : null}
        </div>
      </header>

      {cover ? (
        <figure className="wrap mt-10 md:mt-14">
          <div className="relative mx-auto aspect-[16/9] max-w-[68rem] overflow-hidden bg-paper-deep">
            <Image src={cover} alt={article.cover_alt ?? ""} fill priority sizes="(min-width: 1100px) 1088px, 100vw" className="object-cover" />
          </div>
        </figure>
      ) : (
        <div className="wrap" aria-hidden>
          <div className="mx-auto mt-10 h-px w-16 bg-accent" />
        </div>
      )}

      <div className="wrap mt-10 md:mt-16">
        <RichText
          doc={article.body}
          className={`prose-journal mx-auto ${isPoem ? "" : "drop-cap"}`}
        />
        <footer className="mx-auto mt-14 flex max-w-[var(--measure)] flex-wrap items-center justify-between gap-4 border-t border-rule pt-5">
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[0.875rem] text-dust" aria-label="Tags">
            {article.tags.map((t) => (
              <li key={t}>
                <Link href={`/writing?tag=${encodeURIComponent(t)}`} className="quiet-link">
                  #{t}
                </Link>
              </li>
            ))}
          </ul>
          <ShareLink title={article.title} />
        </footer>
      </div>

      {related.length ? (
        <aside className="wrap mt-24" aria-labelledby="related-h">
          <h2 id="related-h" className="serif mb-6 text-[1.75rem] italic">
            Read next
          </h2>
          <ul className="grid gap-x-10 md:grid-cols-3">
            {related.map((r) => (
              <li key={r.id} className="border-t border-rule pt-4 pb-6">
                <p className="meta">{r.category}</p>
                <Link href={`/writing/${r.slug}`} className="serif mt-1 block text-[1.5rem] leading-tight no-underline hover:text-accent">
                  {r.title}
                </Link>
                {r.excerpt ? <p className="mt-2 text-[0.9375rem] text-charcoal">{r.excerpt}</p> : null}
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
