// Turns a music link into an embeddable player address.
// Only these providers are allowed; anything else becomes a plain "Listen" link.
// Pure function: no network, easy to test.

export type Provider = "Spotify" | "YouTube" | "Apple Music" | "SoundCloud" | "Bandcamp";

export type Embed =
  | { kind: "player"; provider: Provider; src: string; height: number; aspect?: "video" }
  | { kind: "link"; provider: Provider | null; href: string };

const ID = /^[A-Za-z0-9_-]+$/;

export function providerName(url: string | null | undefined): Provider | null {
  if (!url) return null;
  try {
    const h = new URL(url).hostname.replace(/^www\./, "");
    if (h === "open.spotify.com") return "Spotify";
    if (h === "youtube.com" || h === "m.youtube.com" || h === "music.youtube.com" || h === "youtu.be") return "YouTube";
    if (h === "music.apple.com") return "Apple Music";
    if (h === "soundcloud.com" || h === "on.soundcloud.com") return "SoundCloud";
    if (h.endsWith(".bandcamp.com") || h === "bandcamp.com") return "Bandcamp";
  } catch {}
  return null;
}

export function toEmbed(raw: string | null | undefined): Embed | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;
  const provider = providerName(url.href);
  const link: Embed = { kind: "link", provider, href: url.href };
  const parts = url.pathname.split("/").filter(Boolean);

  switch (provider) {
    case "Spotify": {
      // /album/ID, /track/ID, /playlist/ID, optionally prefixed by /intl-de/
      const p = parts[0]?.startsWith("intl-") ? parts.slice(1) : parts;
      const [type, id] = p;
      if (!["album", "track", "playlist", "episode", "artist"].includes(type) || !id || !ID.test(id)) return link;
      return { kind: "player", provider, src: `https://open.spotify.com/embed/${type}/${id}`, height: type === "track" || type === "episode" ? 152 : 352 };
    }
    case "YouTube": {
      const list = url.searchParams.get("list");
      let id: string | null = null;
      if (url.hostname === "youtu.be") id = parts[0] ?? null;
      else if (parts[0] === "watch") id = url.searchParams.get("v");
      else if (parts[0] === "embed" || parts[0] === "shorts" || parts[0] === "live") id = parts[1] ?? null;
      if (id && ID.test(id)) return { kind: "player", provider, src: `https://www.youtube-nocookie.com/embed/${id}`, height: 0, aspect: "video" };
      if (list && ID.test(list)) return { kind: "player", provider, src: `https://www.youtube-nocookie.com/embed/videoseries?list=${list}`, height: 0, aspect: "video" };
      return link;
    }
    case "Apple Music": {
      // /{country}/(album|playlist|song)/{name}/{id}[?i=trackId]
      if (parts.length < 3 || !/^[a-z]{2}$/.test(parts[0]) || !["album", "playlist", "song"].includes(parts[1])) return link;
      const track = url.searchParams.get("i");
      const path = parts.map(encodeURIComponent).join("/");
      const isSong = parts[1] === "song" || (track && /^\d+$/.test(track));
      return {
        kind: "player",
        provider,
        src: `https://embed.music.apple.com/${path}${track && /^\d+$/.test(track) ? `?i=${track}` : ""}`,
        height: isSong ? 175 : 450,
      };
    }
    case "SoundCloud": {
      if (url.hostname !== "soundcloud.com" || parts.length < 2) return link;
      const clean = `https://soundcloud.com/${parts.map(encodeURIComponent).join("/")}`;
      return {
        kind: "player",
        provider,
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(clean)}&color=%236b2622&visual=false&show_comments=false`,
        height: parts[1] === "sets" ? 450 : 166,
      };
    }
    default:
      // Bandcamp players need an internal ID that isn't in the page address.
      return link;
  }
}
