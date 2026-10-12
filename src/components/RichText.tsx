import Image from "next/image";
import type { ReactNode } from "react";
import { mediaUrl, safeHref } from "@/lib/media";
import type { RichDoc, RichNode } from "@/lib/types";

// Renders stored rich text through an allow-list of node types. Anything unknown
// is dropped, text is escaped by React, and links/images are restricted to safe URLs.
// No HTML string is ever injected, so stored content cannot run scripts.

function marks(node: RichNode, children: ReactNode, key: string): ReactNode {
  return (node.marks ?? []).reduce<ReactNode>((acc, mark, i) => {
    const k = `${key}-m${i}`;
    switch (mark.type) {
      case "bold":
        return <strong key={k}>{acc}</strong>;
      case "italic":
        return <em key={k}>{acc}</em>;
      case "strike":
        return <s key={k}>{acc}</s>;
      case "code":
        return <code key={k}>{acc}</code>;
      case "link": {
        const href = safeHref(mark.attrs?.href);
        if (!href) return acc;
        const external = /^https?:/i.test(href);
        return (
          <a key={k} href={href} {...(external ? { rel: "noopener noreferrer nofollow", target: "_blank" } : {})}>
            {acc}
          </a>
        );
      }
      default:
        return acc;
    }
  }, children);
}

function render(node: RichNode, key: string): ReactNode {
  const kids = () => (node.content ?? []).map((c, i) => render(c, `${key}-${i}`));
  switch (node.type) {
    case "text":
      return marks(node, node.text ?? "", key);
    case "paragraph":
      return <p key={key}>{kids()}</p>;
    case "heading": {
      const level = node.attrs?.level === 3 ? 3 : 2;
      return level === 2 ? <h2 key={key}>{kids()}</h2> : <h3 key={key}>{kids()}</h3>;
    }
    case "blockquote":
      return <blockquote key={key}>{kids()}</blockquote>;
    case "bulletList":
      return <ul key={key}>{kids()}</ul>;
    case "orderedList":
      return <ol key={key}>{kids()}</ol>;
    case "listItem":
      return <li key={key}>{kids()}</li>;
    case "hardBreak":
      return <br key={key} />;
    case "horizontalRule":
      return <hr key={key} />;
    case "codeBlock":
      return (
        <pre key={key}>
          <code>{kids()}</code>
        </pre>
      );
    case "image": {
      const src = mediaUrl(typeof node.attrs?.src === "string" ? node.attrs.src : null);
      if (!src) return null;
      const alt = typeof node.attrs?.alt === "string" ? node.attrs.alt : "";
      const w = Number(node.attrs?.width) || 1600;
      const h = Number(node.attrs?.height) || 1067;
      const caption = typeof node.attrs?.title === "string" ? node.attrs.title : "";
      return (
        <figure key={key} className="rich-figure">
          <Image src={src} alt={alt} width={w} height={h} sizes="(min-width: 900px) 760px, 100vw" />
          {caption ? <figcaption>{caption}</figcaption> : null}
        </figure>
      );
    }
    default:
      return null;
  }
}

export function RichText({ doc, className }: { doc: RichDoc | null | undefined; className?: string }) {
  if (!doc?.content?.length) return null;
  return <div className={className ?? "prose-journal"}>{doc.content.map((n, i) => render(n, `n${i}`))}</div>;
}
