import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getFilmList, getFilmLists } from "@/lib/data";
import { Poster, Rating } from "@/components/site/bits";
import { SampleMark } from "@/components/site/SampleMark";

export async function generateStaticParams() {
  return (await getFilmLists()).map((l) => ({ slug: l.slug }));
}

export async function generateMetadata({ params }: PageProps<"/cinema/lists/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const found = await getFilmList(slug);
  if (!found) return { title: "Not found" };
  return {
    title: found.list.seo_title || found.list.title,
    description: found.list.seo_description || found.list.description || undefined,
    alternates: { canonical: `/cinema/lists/${slug}` },
  };
}

export default async function FilmListPage({ params }: PageProps<"/cinema/lists/[slug]">) {
  const { slug } = await params;
  const found = await getFilmList(slug);
  if (!found) notFound();
  const { list, films } = found;
  return (
    <div className="screening -mt-px pb-24">
      <div className="wrap pt-10 md:pt-16">
        <header className="max-w-3xl pb-12">
          <p className="meta">
            <Link href="/cinema" className="quiet-link">
              Sachinema
            </Link>
            , a list of {films.length}
          </p>
          <h1 className="serif mt-3 text-[clamp(2.5rem,6vw,4.5rem)] leading-[1.02] italic [text-wrap:balance]">{list.title}</h1>
          {list.description ? <p className="mt-4 max-w-xl text-[1.125rem] text-screen-dust">{list.description}</p> : null}
          <SampleMark show={list.is_placeholder} className="mt-4" />
        </header>
        {/* Lists are a real sequence, so they are numbered. */}
        <ol className="border-t border-screen-rule">
          {films.map((f, i) => (
            <li key={f.id} className="grid grid-cols-[3rem_5rem_1fr] items-center gap-4 border-b border-screen-rule py-5 md:grid-cols-[4rem_6rem_1fr_auto] md:gap-8">
              <span className="serif text-[1.75rem] text-screen-dust italic">{i + 1}</span>
              <Link href={`/cinema/${f.slug}`} tabIndex={-1} aria-hidden>
                <Poster film={f} sizes="96px" />
              </Link>
              <div>
                <Link href={`/cinema/${f.slug}`} className="serif text-[1.5rem] leading-tight no-underline hover:text-accent md:text-[1.875rem]">
                  {f.title}
                </Link>
                <p className="meta mt-1">{[f.release_year, f.director].filter(Boolean).join(", ")}</p>
                {f.short_review ? <p className="mt-2 hidden max-w-xl text-[0.9375rem] text-screen-dust md:block">{f.short_review}</p> : null}
              </div>
              <Rating value={f.rating} className="col-start-3 md:col-start-auto" />
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
