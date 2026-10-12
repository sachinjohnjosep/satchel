import Link from "next/link";
import { getArticles, getFilms, getJournal, getPhotos, getSettings } from "@/lib/data";
import { formatDate, formatShortDate } from "@/lib/text";
import { ArticleRow, FilmCard, Frame, SectionHead } from "@/components/site/bits";
import { SampleMark } from "@/components/site/SampleMark";
import { mediaUrl } from "@/lib/media";
import Image from "next/image";

export default async function Home() {
  const [settings, articles, photos, films, journal] = await Promise.all([
    getSettings(),
    getArticles(),
    getPhotos(),
    getFilms(),
    getJournal(),
  ]);

  // Featured items come from Settings; anything missing falls back to the most recent.
  const featuredPhoto = photos.find((p) => p.id === settings.featured_photo_id) ?? photos[0];
  const pinned = settings.featured_article_ids
    .map((id) => articles.find((a) => a.id === id))
    .filter((a): a is NonNullable<typeof a> => Boolean(a));
  const writing = [...pinned, ...articles.filter((a) => !pinned.includes(a))].slice(0, 3);
  const [lead, ...moreWriting] = writing;
  const recentPhotos = photos.filter((p) => p.id !== featuredPhoto?.id).slice(0, 4);
  const pinnedFilms = settings.featured_film_ids
    .map((id) => films.find((f) => f.id === id))
    .filter((f): f is NonNullable<typeof f> => Boolean(f));
  const filmPicks = [...pinnedFilms, ...films.filter((f) => !pinnedFilms.includes(f))].slice(0, 4);
  const notes = journal.slice(0, 3);
  const leadCover = lead ? mediaUrl(lead.cover_path) : null;

  return (
    <>
      {/* Opening: the hero line is the loudest thing on the site. */}
      <section className="wrap pt-10 pb-12 md:pt-20 md:pb-20" aria-labelledby="hero">
        <div className="settle-in grid gap-y-8 md:grid-cols-12 md:gap-x-10">
          <h1
            id="hero"
            className="serif text-[clamp(2.6rem,7.4vw,6.75rem)] leading-[0.98] font-[340] tracking-[-0.025em] [text-wrap:balance] md:col-span-11"
            style={{ fontVariationSettings: '"opsz" 72' }}
          >
            {settings.hero_line || settings.site_title}
          </h1>
          <div className="md:col-span-5 md:col-start-7 lg:col-span-4 lg:col-start-8">
            <p className="text-[1.0625rem] leading-relaxed text-charcoal">{settings.intro}</p>
            <p className="mt-4 flex flex-wrap items-center gap-4 text-[0.9375rem]">
              <Link href="/about" className="quiet-link">
                More about me
              </Link>
              {settings.intro.startsWith("Sample") ? <SampleMark show /> : null}
            </p>
          </div>
        </div>
      </section>

      {featuredPhoto ? (
        <section aria-label="Featured photograph" className="wrap">
          <Link href={`/photography/${featuredPhoto.slug}`} className="block">
            <Frame photo={featuredPhoto} sizes="(min-width: 1320px) 1240px, 100vw" priority crop="16/9" className="max-md:!aspect-[4/3]" />
          </Link>
          <p className="meta mt-3 flex flex-wrap justify-end gap-x-3 text-right">
            <span className="serif text-[0.9375rem] italic text-charcoal">{featuredPhoto.title}</span>
            {featuredPhoto.location ? <span>{featuredPhoto.location}</span> : null}
            <SampleMark show={featuredPhoto.is_placeholder} />
          </p>
        </section>
      ) : null}

      {lead ? (
        <section className="wrap mt-24 md:mt-32" aria-labelledby="writing-h">
          <SectionHead id="writing-h" title="Writing" href="/writing" linkLabel="All writing" />
          <div className="grid gap-x-10 gap-y-10 md:grid-cols-12">
            <article className="md:col-span-7">
              <Link href={`/writing/${lead.slug}`} className="group block no-underline">
                {leadCover ? (
                  <div className="relative mb-6 aspect-[3/2] overflow-hidden bg-paper-deep">
                    <Image src={leadCover} alt={lead.cover_alt ?? ""} fill sizes="(min-width: 768px) 55vw, 100vw" className="object-cover" />
                  </div>
                ) : null}
                <h3 className="serif text-[2.25rem] leading-[1.05] tracking-[-0.01em] md:text-[3.25rem] [text-wrap:balance]">
                  <span className="quiet-link">{lead.title}</span>
                </h3>
              </Link>
              {lead.excerpt ? <p className="serif mt-4 max-w-xl text-[1.3125rem] leading-snug italic text-charcoal">{lead.excerpt}</p> : null}
              <p className="meta mt-4 flex flex-wrap items-center gap-3">
                <time dateTime={lead.published_at ?? undefined}>{formatDate(lead.published_at)}</time>
                <span>{lead.reading_minutes} min read</span>
                <SampleMark show={lead.is_placeholder} />
              </p>
            </article>
            <div className="md:col-span-5 md:pt-2">
              {moreWriting.map((a) => (
                <ArticleRow key={a.id} article={a} compact />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {recentPhotos.length ? (
        <section className="wrap mt-24 md:mt-32" aria-labelledby="photos-h">
          <SectionHead id="photos-h" title="Recent photographs" href="/photography" linkLabel="All photographs" />
          {/* An uneven strip: one wide frame, one tall, two stacked. */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:grid-rows-[repeat(2,15rem)] md:gap-4 lg:grid-rows-[repeat(2,19rem)]">
            {recentPhotos.map((p, i) => {
              const src = mediaUrl(p.image_path);
              if (!src) return null;
              return (
                <Link
                  key={p.id}
                  href={`/photography/${p.slug}`}
                  aria-label={p.title}
                  className={`relative block overflow-hidden bg-paper-deep ${
                    [
                      "col-span-2 aspect-[4/3] md:col-span-6 md:row-span-2 md:aspect-auto",
                      "aspect-[3/4] md:col-span-3 md:row-span-2 md:aspect-auto",
                      "aspect-square md:col-span-3 md:aspect-auto",
                      "col-span-2 aspect-[3/2] md:col-span-3 md:aspect-auto",
                    ][i]
                  }`}
                >
                  <Image src={src} alt={p.alt} fill sizes={i === 0 ? "(min-width: 768px) 50vw, 100vw" : "(min-width: 768px) 25vw, 50vw"} className="object-cover" />
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      {filmPicks.length ? (
        <section className="screening mt-24 py-16 md:mt-32 md:py-24" aria-labelledby="films-h">
          <div className="wrap">
            <SectionHead id="films-h" title="Sachinema" href="/cinema" linkLabel="All films" />
            <p className="-mt-4 mb-10 max-w-md text-screen-dust">Films I recommend, with ratings and a few words on each.</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4 md:gap-x-8">
              {filmPicks.map((f) => (
                <FilmCard key={f.id} film={f} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {notes.length ? (
        <section className="wrap mt-24 md:mt-32" aria-labelledby="journal-h">
          <SectionHead id="journal-h" title="From the journal" href="/journal" linkLabel="The whole journal" />
          <ol className="grid gap-x-10 md:grid-cols-3">
            {notes.map((j) => (
              <li key={j.id} className="border-t border-rule pt-4 pb-8">
                <Link href={`/journal/${j.slug}`} className="meta quiet-link">
                  <time dateTime={j.published_at ?? undefined}>{formatShortDate(j.published_at)}</time>
                </Link>
                <p className={`serif mt-3 text-[1.3125rem] leading-snug ${j.kind === "quotation" ? "italic" : ""}`}>
                  {j.kind === "quotation" ? `“${j.body}”` : j.body}
                </p>
                {j.quote_source ? <p className="meta mt-2">{j.quote_source}</p> : null}
                <SampleMark show={j.is_placeholder} className="mt-3" />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <section className="wrap mt-20 md:mt-28" aria-label="Leave a note">
        <div className="border-t border-rule pt-12 text-center">
          <p className="serif text-[1.75rem] leading-tight italic md:text-[2.25rem]">Something you want to say?</p>
          <p className="mt-3 text-charcoal">
            <Link href="/note" className="underline decoration-accent underline-offset-4 hover:text-accent">
              Leave an anonymous note
            </Link>
            . No name needed.
          </p>
        </div>
      </section>
    </>
  );
}
