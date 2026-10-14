import Image from "next/image";
import Link from "next/link";
import type { Listen, Playlist } from "@/lib/types";
import { mediaUrl } from "@/lib/media";
import { Rating } from "./bits";
import { SampleMark } from "./SampleMark";

// Muted sleeve colours for records without uploaded artwork.
const TONES = ["#6b2622", "#4f592b", "#2e3a46", "#7a5a2c", "#4a3550", "#2f4a46", "#5a4a3a"];
function tone(seed: string) {
  let h = 0;
  for (const c of seed) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}

export const KIND_LABEL: Record<Listen["kind"], string> = { album: "Album", song: "Song", ep: "EP", live: "Live recording" };

/**
 * A square record sleeve. The record slides out a little when its card is hovered
 * or focused (the motion is switched off under reduced-motion settings).
 */
export function Sleeve({
  title,
  subtitle,
  coverPath,
  seed,
  sizes,
  priority = false,
  disc = true,
}: {
  title: string;
  subtitle?: string | null;
  coverPath: string | null;
  seed: string;
  sizes: string;
  priority?: boolean;
  disc?: boolean;
}) {
  const src = mediaUrl(coverPath);
  return (
    <div className="relative">
      {disc ? (
        <div
          aria-hidden
          className="absolute inset-[4%] rounded-full transition-transform duration-500 ease-[var(--ease)] translate-x-[9%] group-hover:translate-x-[24%] group-focus-visible:translate-x-[24%] motion-reduce:transition-none"
          style={{
            background:
              "radial-gradient(circle, #d8cfbf 0 9%, #1a1714 9.5% 11%, transparent 11.5%), repeating-radial-gradient(circle, #151210 0 1.2px, #24201b 1.6px 3px)",
          }}
        />
      ) : null}
      <div className="relative aspect-square overflow-hidden shadow-[0_1px_0_rgba(0,0,0,0.08)]" style={src ? undefined : { background: tone(seed) }}>
        {src ? (
          <Image src={src} alt="" fill sizes={sizes} priority={priority} className="object-cover" />
        ) : (
          <div className="flex h-full flex-col justify-between p-[9%] text-[#f1e8d8]">
            <span className="serif text-[clamp(1.1rem,2.2vw,1.6rem)] leading-[1.05] italic [text-wrap:balance]">{title}</span>
            {subtitle ? <span className="text-[0.75rem] leading-snug opacity-75">{subtitle}</span> : null}
          </div>
        )}
      </div>
    </div>
  );
}

export function ListenCard({ listen, sizes = "(min-width: 1024px) 22vw, (min-width: 640px) 30vw, 45vw" }: { listen: Listen; sizes?: string }) {
  return (
    <article>
      <Link href={`/listening/${listen.slug}`} className="group block no-underline outline-none" aria-label={`${listen.title}${listen.artist ? ` by ${listen.artist}` : ""}`}>
        <div className="mr-[14%]">
          <Sleeve title={listen.title} subtitle={listen.artist} coverPath={listen.cover_path} seed={listen.slug} sizes={sizes} />
        </div>
        <h3 className="serif mt-3 text-[1.1875rem] leading-snug group-hover:text-accent group-focus-visible:underline">{listen.title}</h3>
      </Link>
      <p className="meta mt-0.5">{[listen.artist, listen.release_year].filter(Boolean).join(", ")}</p>
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Rating value={listen.rating} />
        {listen.kind !== "album" ? <span className="meta">{KIND_LABEL[listen.kind]}</span> : null}
        <SampleMark show={listen.is_placeholder} />
      </div>
    </article>
  );
}

export function PlaylistSleeve({ playlist, items, sizes }: { playlist: Playlist; items: Listen[]; sizes: string }) {
  // Without its own cover, a playlist shows the first four sleeves as a grid.
  if (playlist.cover_path || items.length < 4) {
    return <Sleeve title={playlist.title} coverPath={playlist.cover_path} seed={playlist.slug} sizes={sizes} disc={false} />;
  }
  return (
    <div className="grid aspect-square grid-cols-2">
      {items.slice(0, 4).map((l) => (
        <Sleeve key={l.id} title={l.title} coverPath={l.cover_path} seed={l.slug} sizes="12vw" disc={false} />
      ))}
    </div>
  );
}
