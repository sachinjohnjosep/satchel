import { describe, expect, it } from "vitest";
import { checkNote, cleanNote, NOTE_MAX, NOTE_SAMPLE_VALUE, rateKey } from "@/lib/notes";

describe("anonymous note validation", () => {
  const prod = { production: true };
  it("accepts a normal note and trims it", () => {
    expect(checkNote({ message: "  hello there \n", website: "" }, prod)).toEqual({ ok: true, body: "hello there" });
  });
  it("rejects empty and whitespace-only notes", () => {
    expect(checkNote({ message: "   ", website: "" }, prod)).toEqual({ ok: false, reason: "empty" });
    expect(checkNote({ message: undefined, website: "" }, prod)).toEqual({ ok: false, reason: "empty" });
    expect(checkNote({ message: 42, website: "" }, prod)).toEqual({ ok: false, reason: "empty" });
  });
  it("enforces the length limit by characters, not bytes", () => {
    expect(checkNote({ message: "é".repeat(NOTE_MAX), website: "" }, prod).ok).toBe(true);
    expect(checkNote({ message: "x".repeat(NOTE_MAX + 1), website: "" }, prod)).toEqual({ ok: false, reason: "too_long" });
  });
  it("treats a filled honeypot as spam", () => {
    expect(checkNote({ message: "hi", website: "http://spam" }, prod)).toEqual({ ok: false, reason: "spam" });
  });
  it("never accepts the preview sample value outside production", () => {
    expect(checkNote({ message: NOTE_SAMPLE_VALUE, website: "" }, { production: false })).toEqual({ ok: false, reason: "sample" });
  });
  it("strips control and bidi-override characters but keeps line breaks", () => {
    expect(cleanNote("a\u0000b‮c\r\nd")).toBe("abc\nd");
    expect(cleanNote("a\n\n\n\n\n\nb")).toBe("a\n\n\nb");
  });
  it("rate-limit keys are one-way, salted and rotate daily", async () => {
    const day1 = new Date("2026-10-12T10:00:00Z");
    const day2 = new Date("2026-10-13T10:00:00Z");
    const a = await rateKey("203.0.113.9", "salt", day1);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(a).not.toContain("203.0.113.9");
    expect(await rateKey("203.0.113.9", "salt", day1)).toBe(a);
    expect(await rateKey("203.0.113.9", "salt", day2)).not.toBe(a);
    expect(await rateKey("203.0.113.9", "other", day1)).not.toBe(a);
  });
});
