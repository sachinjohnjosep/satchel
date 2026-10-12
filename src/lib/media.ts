import { supabaseUrl } from "./env";

export const MEDIA_BUCKET = "media";

/** Turns a stored image path into a URL. Paths starting with "/" are files bundled with the site. */
export function mediaUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith("/")) return path;
  if (/^https:\/\//.test(path)) return path;
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${MEDIA_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Only these URL schemes may appear in links inside rich text. */
export function safeHref(href: unknown): string | null {
  if (typeof href !== "string") return null;
  const h = href.trim();
  if (/^(https?:|mailto:)/i.test(h)) return h;
  if (h.startsWith("/") && !h.startsWith("//")) return h;
  if (h.startsWith("#")) return h;
  return null;
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
