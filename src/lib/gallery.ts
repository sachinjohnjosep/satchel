import { mediaUrl } from "./media";
import type { Photo } from "./types";
import type { GalleryItem } from "@/components/site/Gallery";

export function toGalleryItems(photos: Photo[]): GalleryItem[] {
  return photos.flatMap((p) => {
    const src = mediaUrl(p.image_path);
    return src
      ? [{ id: p.id, slug: p.slug, src, alt: p.alt, title: p.title, caption: p.caption, location: p.location, width: p.width, height: p.height, isSample: p.is_placeholder }]
      : [];
  });
}
