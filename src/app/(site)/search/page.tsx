import type { Metadata } from "next";
import Link from "next/link";
import { search } from "@/lib/data";
import { formatDate } from "@/lib/text";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false },
};

export default async function SearchPage({ searchParams }: PageProps<"/search">) {
  const { q } = await searchParams;
  const query = typeof q === "string" ? q.slice(0, 100) : "";
  const hits = query ? await search(query) : [];
  return (
    <div className="wrap pt-10 md:pt-16">
      <h1 className="serif text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em]">Search</h1>
      <form action="/search" method="get" role="search" className="mt-8 flex max-w-2xl gap-3">
        <label htmlFor="q" className="sr-only">
          Search writing, photographs, films and journal
        </label>
        <input
          id="q"
          name="q"
          type="search"
          defaultValue={query}
          placeholder="Search writing, photographs, films…"
          className="input serif !text-[1.25rem]"
          autoComplete="off"
          maxLength={100}
        />
        <button className="btn">Search</button>
      </form>

      {query ? (
        <section aria-live="polite" className="mt-12 max-w-4xl">
          <p className="meta mb-4">
            {hits.length ? `${hits.length} result${hits.length === 1 ? "" : "s"} for “${query}”` : `Nothing found for “${query}”. Try a shorter word or a different spelling.`}
          </p>
          <ul>
            {hits.map((h) => (
              <li key={h.href} className="grid gap-x-8 border-t border-rule py-5 md:grid-cols-12">
                <p className="meta md:col-span-3">
                  {h.kind}
                  <span className="block">{formatDate(h.date)}</span>
                </p>
                <div className="md:col-span-9">
                  <Link href={h.href} className="serif text-[1.5rem] leading-tight no-underline hover:text-accent">
                    {h.title}
                  </Link>
                  {h.snippet ? <p className="mt-1 text-charcoal">{h.snippet}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
