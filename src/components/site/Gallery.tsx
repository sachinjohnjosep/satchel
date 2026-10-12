"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

export type GalleryItem = {
  id: string;
  slug: string;
  src: string;
  alt: string;
  title: string;
  caption: string | null;
  location: string | null;
  width: number;
  height: number;
  isSample: boolean;
};

/**
 * Masonry grid of photographs with a full-screen viewer.
 * Each thumbnail is a real link to the photo's page, so everything works without
 * JavaScript; with it, a plain click opens the viewer instead.
 */
export function Gallery({ items, numbered = false }: { items: GalleryItem[]; numbered?: boolean }) {
  const [index, setIndex] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const touchX = useRef<number | null>(null);

  const open = (i: number, el: HTMLElement) => {
    opener.current = el;
    setIndex(i);
  };
  const close = useCallback(() => setIndex(null), []);
  const step = useCallback(
    (d: number) => setIndex((i) => (i == null ? i : (i + d + items.length) % items.length)),
    [items.length],
  );

  useEffect(() => {
    const d = dialog.current;
    if (!d) return;
    if (index != null && !d.open) d.showModal();
    if (index == null && d.open) {
      d.close();
      opener.current?.focus();
    }
  }, [index]);

  useEffect(() => {
    if (index == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [index, step]);

  const current = index != null ? items[index] : null;

  return (
    <>
      <ul className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>li]:mb-8">
        {items.map((item, i) => (
          <li key={item.id} className="break-inside-avoid">
            <Link
              href={`/photography/${item.slug}`}
              className="group block no-underline"
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                open(i, e.currentTarget);
              }}
            >
              <div className="overflow-hidden bg-paper-deep">
                <Image
                  src={item.src}
                  alt={item.alt}
                  width={item.width}
                  height={item.height}
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="block h-auto w-full transition-[filter] duration-500 group-hover:brightness-[1.04]"
                />
              </div>
              <p className="mt-2 flex items-baseline gap-3 text-[0.875rem]">
                {numbered ? <span className="text-dust [font-variant-numeric:tabular-nums]">{String(i + 1).padStart(2, "0")}</span> : null}
                <span className="serif text-[1.0625rem] italic group-hover:text-accent">{item.title}</span>
                {item.isSample ? <span className="sample-mark ml-auto">Sample</span> : null}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialog}
        aria-label={current ? `${current.title}, photograph ${index! + 1} of ${items.length}` : "Photograph viewer"}
        onClose={close}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
        onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
        onTouchEnd={(e) => {
          if (touchX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchX.current;
          if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
          touchX.current = null;
        }}
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-[#0f0d0b] p-0 text-[#ece2cf] backdrop:bg-black/90"
      >
        {current ? (
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between gap-4 px-4 py-3 text-[0.875rem] md:px-8">
              <span className="text-[#a89d8a]">
                {index! + 1} of {items.length}
              </span>
              <button type="button" onClick={close} className="min-h-11 px-2" autoFocus>
                Close
              </button>
            </div>
            <div className="relative min-h-0 flex-1" onClick={(e) => e.target === e.currentTarget && close()}>
              <Image
                key={current.id}
                src={current.src}
                alt={current.alt}
                fill
                sizes="100vw"
                className="object-contain px-2 md:px-20"
                style={{ animation: "settle 0.4s var(--ease) both" }}
              />
              {items.length > 1 ? (
                <>
                  <button type="button" onClick={() => step(-1)} className="absolute inset-y-0 left-0 hidden w-20 items-center justify-center text-[0.875rem] text-[#a89d8a] hover:text-white md:flex" aria-label="Previous photograph">
                    Prev
                  </button>
                  <button type="button" onClick={() => step(1)} className="absolute inset-y-0 right-0 hidden w-20 items-center justify-center text-[0.875rem] text-[#a89d8a] hover:text-white md:flex" aria-label="Next photograph">
                    Next
                  </button>
                </>
              ) : null}
            </div>
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 px-4 py-4 md:px-8">
              <div>
                <p className="serif text-[1.25rem] italic">{current.title}</p>
                {current.caption || current.location ? (
                  <p className="text-[0.875rem] text-[#a89d8a]">{[current.caption, current.location].filter(Boolean).join(" ")}</p>
                ) : null}
              </div>
              <div className="flex gap-5 text-[0.875rem]">
                <button type="button" onClick={() => step(-1)} className="min-h-11 md:hidden">
                  Previous
                </button>
                <button type="button" onClick={() => step(1)} className="min-h-11 md:hidden">
                  Next
                </button>
                <Link href={`/photography/${current.slug}`} className="min-h-11 content-center underline underline-offset-4">
                  Photo page
                </Link>
              </div>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
