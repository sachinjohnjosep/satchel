"use client";

import { useState } from "react";
import { toEmbed } from "@/lib/embeds";

/**
 * Click-to-load music player. Nothing from Spotify, YouTube etc. loads (and no
 * third-party cookies are set) until the visitor presses Play.
 */
export function ListenPlayer({ url, title }: { url: string | null; title: string }) {
  const [loaded, setLoaded] = useState(false);
  const embed = toEmbed(url);
  if (!embed) return null;

  if (embed.kind === "link") {
    return (
      <a href={embed.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost">
        Listen{embed.provider ? ` on ${embed.provider}` : ""}
      </a>
    );
  }

  if (!loaded) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <button type="button" className="btn" onClick={() => setLoaded(true)}>
          Play on {embed.provider}
        </button>
        <p className="meta max-w-xs">Loads {embed.provider}’s player, which may set its own cookies.</p>
      </div>
    );
  }

  return (
    <div className="w-full" style={embed.aspect === "video" ? { aspectRatio: "16 / 9" } : { height: embed.height }}>
      <iframe
        src={embed.src}
        title={`${title} on ${embed.provider}`}
        className="h-full w-full rounded-[2px] border-0"
        loading="lazy"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
