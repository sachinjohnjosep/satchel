// Tiny builders for Tiptap JSON, used by sample content and tests.
import type { RichDoc, RichNode } from "./types";

type Inline = string | RichNode;
const inline = (parts: Inline[]): RichNode[] =>
  parts.map((p) => (typeof p === "string" ? { type: "text", text: p } : p));

export const doc = (...content: RichNode[]): RichDoc => ({ type: "doc", content });
export const p = (...parts: Inline[]): RichNode => ({ type: "paragraph", content: inline(parts) });
export const h2 = (text: string): RichNode => ({ type: "heading", attrs: { level: 2 }, content: inline([text]) });
export const h3 = (text: string): RichNode => ({ type: "heading", attrs: { level: 3 }, content: inline([text]) });
export const em = (text: string): RichNode => ({ type: "text", text, marks: [{ type: "italic" }] });
export const strong = (text: string): RichNode => ({ type: "text", text, marks: [{ type: "bold" }] });
export const link = (text: string, href: string): RichNode => ({
  type: "text",
  text,
  marks: [{ type: "link", attrs: { href } }],
});
export const quote = (...paras: RichNode[]): RichNode => ({ type: "blockquote", content: paras });
export const hr = (): RichNode => ({ type: "horizontalRule" });
/** A poem stanza: lines separated by hard breaks. */
export const stanza = (...lines: string[]): RichNode => ({
  type: "paragraph",
  content: lines.flatMap((l, i) =>
    i === 0 ? [{ type: "text", text: l }] : [{ type: "hardBreak" }, { type: "text", text: l }],
  ),
});
export const ul = (...items: string[]): RichNode => ({
  type: "bulletList",
  content: items.map((t) => ({ type: "listItem", content: [p(t)] })),
});
