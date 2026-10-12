import Link from "next/link";
import type { Metadata } from "next";
import { distinct, getArticles } from "@/lib/data";
import { ArticleRow, EmptyState, FilterLinks } from "@/components/site/bits";

export const metadata: Metadata = {
  title: "Writing",
  description: "Essays, reflections, poems, short stories and observations.",
  alternates: { canonical: "/writing" },
};

export default async function WritingIndex({ searchParams }: PageProps<"/writing">) {
  const { category, tag } = await searchParams;
  const active = typeof category === "string" ? category : null;
  const activeTag = typeof tag === "string" ? tag : null;
  const all = await getArticles();
  const categories = distinct(all.map((a) => a.category));
  const shown = all.filter((a) => (!active || a.category === active) && (!activeTag || a.tags.includes(activeTag)));

  return (
    <div className="wrap pt-10 md:pt-16">
      <header className="grid gap-6 pb-10 md:grid-cols-12">
        <h1 className="serif text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em] md:col-span-7">Writing</h1>
        <p className="serif self-end text-[1.25rem] leading-snug italic text-charcoal md:col-span-5">
          Essays, reflections, poems, short stories and things noticed along the way.
        </p>
      </header>

      {categories.length > 1 ? (
        <div className="mb-6">
          <FilterLinks
            label="Filter by category"
            active={active}
            options={[{ value: null, label: "Everything" }, ...categories.map((c) => ({ value: c, label: c }))]}
            hrefFor={(v) => (v ? `/writing?category=${encodeURIComponent(v)}` : "/writing")}
          />
        </div>
      ) : null}
      {activeTag ? (
        <p className="meta mb-4">
          Tagged “{activeTag}”. <Link href="/writing" className="underline">Show everything</Link>
        </p>
      ) : null}

      {shown.length ? (
        <div className="border-b border-rule">
          {shown.map((a) => (
            <ArticleRow key={a.id} article={a} />
          ))}
        </div>
      ) : (
        <EmptyState>{all.length ? "Nothing in this category yet." : "No writing published yet."}</EmptyState>
      )}
    </div>
  );
}
