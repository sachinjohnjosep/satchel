import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { RichText } from "@/components/RichText";
import type { RichDoc } from "@/lib/types";

const render = (d: RichDoc) => renderToStaticMarkup(<RichText doc={d} />);

describe("rich text rendering is safe", () => {
  it("escapes text", () => {
    const html = render({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "<script>alert(1)</script>" }] }] });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
  it("drops unknown node types", () => {
    const html = render({ type: "doc", content: [{ type: "iframe", attrs: { src: "https://evil" } }, { type: "paragraph", content: [{ type: "text", text: "ok" }] }] });
    expect(html).not.toContain("iframe");
    expect(html).toContain("ok");
  });
  it("removes javascript: and data: links but keeps the text", () => {
    for (const href of ["javascript:alert(1)", " JaVaScRiPt:alert(1)", "data:text/html,x", "//evil.example"]) {
      const html = render({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "click", marks: [{ type: "link", attrs: { href } }] }] }] });
      expect(html).not.toContain("href");
      expect(html).toContain("click");
    }
  });
  it("keeps safe links and marks external ones", () => {
    const html = render({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "x", marks: [{ type: "link", attrs: { href: "https://example.com" } }] }] }] });
    expect(html).toContain('href="https://example.com"');
    expect(html).toContain("noopener");
  });
});
