import Image from "next/image";
import Link from "next/link";
import type { Article, Film, Photo } from "@/lib/types";
import { mediaUrl } from "@/lib/media";
import { formatDate, ratingLabel } from "@/lib/text";
import { SampleMark } from "./SampleMark";

/** A photograph, shown exactly as uploaded: no overlays, no cropping unless asked. */
export function Frame({
  photo,
  sizes,
  priority = false,
  className = "",
  crop,
}: {
  photo: Pick<Photo, "image_path" | "alt" | "width" | "height">;
  sizes: string;
  priority?: boolean;
  className?: string;
  /** Optional aspect ratio for layouts that need equal heights, e.g. "4/5". */
  crop?: string;
}) {
  const src = mediaUrl(photo.image_path);
  if (!src) return null;
  return (
    <div className={`relative overflow-hidden bg-paper-deep ${className}`} style={crop ? { aspectRatio: crop } : undefined}>
      <Image
        src={src}
        alt={photo.alt}
        width={photo.width}
        height={photo.height}
        sizes={sizes}
        priority={priority}
        className={crop ? "h-full w-full object-cover" : "block h-auto w-full"}
      />
    </div>
  );
}

/** Ratings drawn as five short strokes. */
export function Rating({ value, className = "" }: { value: number | null; className?: string }) {
  if (value == null) return null;
  return (
    <span className={`inline-flex items-center gap-[3px] ${className}`} role="img" aria-label={ratingLabel(value)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = value >= i ? 1 : value >= i - 0.5 ? 0.5 : 0;
        return (
          <span key={i} className="relative block h-[3px] w-4" aria-hidden>
            <span className="absolute inset-0 bg-current opacity-20" />
            {fill ? <span className="absolute inset-y-0 left-0 bg-accent" style={{ width: `${fill * 100}%` }} /> : null}
          </span>
        );
      })}
    </span>
  );
}

// Deterministic, muted colours for typographic title cards when a film has no poster.
const CARD_TONES = ["#3d2a24", "#2f3527", "#2b2f36", "#3a3127", "#352433", "#273331"];
function tone(slug: string) {
  let h = 0;
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return CARD_TONES[h % CARD_TONES.length];
}

/** Poster if one was uploaded with permission; otherwise a typographic title card. */
export function Poster({ film, sizes, priority = false }: { film: Film; sizes: string; priority?: boolean }) {
  const src = mediaUrl(film.poster_path);
  if (src) {
    return (
      <div className="relative aspect-[2/3] overflow-hidden bg-paper-deep">
        <Image src={src} alt={`Poster for ${film.title}`} fill sizes={sizes} priority={priority} className="object-cover" />
      </div>
    );
  }
  return (
    <div
      className="relative flex aspect-[2/3] flex-col justify-between p-[9%] text-[#efe5d2]"
      style={{ background: tone(film.slug) }}
      aria-hidden
    >
      <span className="text-[0.6875rem] opacity-70">{film.release_year}</span>
      <span className="serif text-[clamp(1.15rem,2.4vw,1.75rem)] leading-[1.05] italic [text-wrap:balance]">{film.title}</span>
      <span className="text-[0.6875rem] leading-snug opacity-70">{film.director}</span>
    </div>
  );
}

export function FilmCard({ film, sizes = "(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw" }: { film: Film; sizes?: string }) {
  return (
    <article className="group">
      <Link href={`/cinema/${film.slug}`} className="block no-underline">
        <div className="transition-transform duration-500 ease-[var(--ease)] group-hover:-translate-y-1">
          <Poster film={film} sizes={sizes} />
        </div>
        <h3 className="serif mt-3 text-[1.1875rem] leading-snug">
          <span className="quiet-link">{film.title}</span>
        </h3>
      </Link>
      <p className="meta mt-0.5">
        {[film.release_year, film.director].filter(Boolean).join(", ")}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Rating value={film.rating} />
        {film.is_favourite ? <span className="meta">Favourite</span> : null}
        <SampleMark show={film.is_placeholder} />
      </div>
    </article>
  );
}

/** One line in a list of writing: date in the margin, title, subtitle. */
export function ArticleRow({ article, compact = false }: { article: Article; compact?: boolean }) {
  return (
    <article className={`grid gap-x-8 gap-y-1 border-t border-rule py-6 ${compact ? "" : "md:grid-cols-12"}`}>
      <p className={`meta ${compact ? "" : "md:col-span-3 md:pt-2"}`}>
        <time dateTime={article.published_at ?? undefined}>{formatDate(article.published_at)}</time>
        {article.category ? <span className="block">{article.category}</span> : null}
      </p>
      <div className={compact ? "" : "md:col-span-9"}>
        <h3 className={`serif leading-tight [text-wrap:balance] ${compact ? "text-[1.625rem]" : "text-[1.75rem] md:text-[2.125rem]"}`}>
          <Link href={`/writing/${article.slug}`} className="quiet-link">
            {article.title}
          </Link>
        </h3>
        {article.subtitle || article.excerpt ? (
          <p className="serif mt-1.5 max-w-2xl text-[1.1875rem] italic text-charcoal">{article.subtitle ?? article.excerpt}</p>
        ) : null}
        <p className="meta mt-2 flex flex-wrap items-center gap-3">
          <span>{article.reading_minutes} min read</span>
          <SampleMark show={article.is_placeholder} />
        </p>
      </div>
    </article>
  );
}

/** Section heading used on the home page: the name, and a way into the section. */
export function SectionHead({ title, href, linkLabel, id }: { title: string; href?: string; linkLabel?: string; id?: string }) {
  return (
    <div className="mb-8 flex items-baseline justify-between gap-4">
      <h2 id={id} className="serif text-[2.25rem] leading-none italic md:text-[3rem]">
        {title}
      </h2>
      {href ? (
        <Link href={href} className="quiet-link shrink-0 text-[0.9375rem]">
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}

/** Text links used as filters. Works without JavaScript. */
export function FilterLinks({
  label,
  options,
  active,
  hrefFor,
}: {
  label: string;
  options: { value: string | null; label: string }[];
  active: string | null;
  hrefFor: (value: string | null) => string;
}) {
  return (
    <nav aria-label={label} className="flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem]">
      {options.map((o) => {
        const current = (o.value ?? null) === (active ?? null);
        return (
          <Link
            key={o.label}
            href={hrefFor(o.value)}
            scroll={false}
            aria-current={current ? "true" : undefined}
            className={current ? "underline decoration-accent decoration-2 underline-offset-[0.3em]" : "quiet-link text-charcoal"}
          >
            {o.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="serif border-t border-rule py-16 text-center text-[1.375rem] italic text-dust">{children}</p>;
}
