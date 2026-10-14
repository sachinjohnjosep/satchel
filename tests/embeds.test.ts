import { describe, expect, it } from "vitest";
import { toEmbed, providerName } from "@/lib/embeds";

describe("music links become safe players", () => {
  it("Spotify albums, tracks and playlists", () => {
    expect(toEmbed("https://open.spotify.com/album/1ATL5GLyefJaxhQzSPVrLX?si=abc")).toEqual({
      kind: "player", provider: "Spotify", src: "https://open.spotify.com/embed/album/1ATL5GLyefJaxhQzSPVrLX", height: 352,
    });
    expect(toEmbed("https://open.spotify.com/intl-de/track/4uLU6hMCjMI75M1A2tKUQC")).toMatchObject({
      src: "https://open.spotify.com/embed/track/4uLU6hMCjMI75M1A2tKUQC", height: 152,
    });
    expect(toEmbed("https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M")).toMatchObject({ kind: "player", height: 352 });
  });

  it("YouTube videos and playlists use the no-cookie domain", () => {
    for (const u of ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?t=10", "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=x"]) {
      expect(toEmbed(u)).toMatchObject({ kind: "player", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ", aspect: "video" });
    }
    expect(toEmbed("https://www.youtube.com/playlist?list=PLabc_123")).toMatchObject({ src: "https://www.youtube-nocookie.com/embed/videoseries?list=PLabc_123" });
  });

  it("Apple Music and SoundCloud", () => {
    expect(toEmbed("https://music.apple.com/de/album/blonde/1146195596")).toMatchObject({ src: "https://embed.music.apple.com/de/album/blonde/1146195596", height: 450 });
    expect(toEmbed("https://music.apple.com/de/album/blonde/1146195596?i=1146195707")).toMatchObject({ height: 175 });
    const sc = toEmbed("https://soundcloud.com/artist/track-name");
    expect(sc).toMatchObject({ kind: "player", provider: "SoundCloud", height: 166 });
    expect((sc as { src: string }).src).toContain(encodeURIComponent("https://soundcloud.com/artist/track-name"));
  });

  it("Bandcamp and unknown sites become plain links", () => {
    expect(toEmbed("https://artist.bandcamp.com/album/x")).toEqual({ kind: "link", provider: "Bandcamp", href: "https://artist.bandcamp.com/album/x" });
    expect(toEmbed("https://example.com/song")).toEqual({ kind: "link", provider: null, href: "https://example.com/song" });
  });

  it("refuses unsafe or malformed input", () => {
    expect(toEmbed("javascript:alert(1)")).toBeNull();
    expect(toEmbed("http://open.spotify.com/album/abc")).toBeNull();
    expect(toEmbed("not a url")).toBeNull();
    expect(toEmbed("https://open.spotify.com/album/abc\"><script>")).toMatchObject({ kind: "link" });
    expect(toEmbed("https://www.youtube.com/watch?v=<script>")).toMatchObject({ kind: "link" });
  });

  it("names providers", () => {
    expect(providerName("https://open.spotify.com/album/x")).toBe("Spotify");
    expect(providerName("https://evil-spotify.com/x")).toBeNull();
  });
});
