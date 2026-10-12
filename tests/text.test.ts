import { describe, expect, it } from "vitest";
import { plainText, readingMinutes, slugify, SLUG_RE, truncate, ratingLabel } from "@/lib/text";
import { doc, p } from "@/lib/richtext-build";

describe("text helpers", () => {
  it("makes database-safe slugs", () => {
    expect(slugify("On Paying Attention!")).toBe("on-paying-attention");
    expect(slugify("Café & Crème")).toBe("cafe-and-creme");
    expect(slugify("  --  ")).toBe("");
    for (const s of ["Hello World", "Ünïcödé", "a".repeat(200)]) expect(SLUG_RE.test(slugify(s))).toBe(true);
  });
  it("works out reading time with a one-minute minimum", () => {
    expect(readingMinutes(doc(p("short")))).toBe(1);
    expect(readingMinutes("word ".repeat(1100))).toBe(5);
  });
  it("extracts plain text from rich documents", () => {
    expect(plainText(doc(p("one"), p("two")))).toBe("one two");
  });
  it("truncates on a word boundary", () => {
    expect(truncate("the quick brown fox jumps", 12)).toBe("the quick…");
  });
  it("labels ratings for screen readers", () => {
    expect(ratingLabel(4.5)).toBe("4.5 out of 5");
    expect(ratingLabel(5)).toBe("5 out of 5");
    expect(ratingLabel(null)).toBe("Not rated");
  });
});
