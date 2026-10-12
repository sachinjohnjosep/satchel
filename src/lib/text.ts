import type { RichDoc, RichNode } from "./types";

/** Collects all text from a rich document, with spaces between blocks. */
export function plainText(node: RichDoc | RichNode | null | undefined): string {
  if (!node) return "";
  if ("text" in node && typeof node.text === "string") return node.text;
  return (node.content ?? []).map((c) => plainText(c)).join(" ").replace(/\s+/g, " ").trim();
}

export function wordCount(text: string): number {
  const t = text.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Reading time at ~220 words per minute, never less than one minute. */
export function readingMinutes(body: RichDoc | string | null | undefined): number {
  const text = typeof body === "string" ? body : plainText(body);
  return Math.max(1, Math.round(wordCount(text) / 220));
}

/** Lowercase, ASCII, hyphen-separated slug. Matches the database check constraint. */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

const dateFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Europe/Berlin" });
const shortFmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "Europe/Berlin" });

export function formatDate(iso: string | null | undefined): string {
  return iso ? dateFmt.format(new Date(iso)) : "";
}
export function formatShortDate(iso: string | null | undefined): string {
  return iso ? shortFmt.format(new Date(iso)) : "";
}

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd() + "…";
}

/** Half-star ratings rendered as filled and empty marks, plus a readable label. */
export function ratingLabel(rating: number | null): string {
  if (rating == null) return "Not rated";
  return `${rating % 1 ? rating.toFixed(1) : rating.toFixed(0)} out of 5`;
}
