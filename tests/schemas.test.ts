import { describe, expect, it } from "vitest";
import { articleSchema, filmSchema, finalSlug, formToObject, resolvePublishing, settingsSchema } from "@/lib/admin/schemas";

const now = new Date("2026-10-12T12:00:00Z");

describe("publishing rules", () => {
  it("publishing with no date goes live now", () => {
    expect(resolvePublishing("publish", null, null, now)).toEqual({ status: "published", published_at: now.toISOString() });
  });
  it("publishing with a future date schedules it", () => {
    const later = "2026-12-01T09:00:00.000Z";
    expect(resolvePublishing("publish", later, null, now)).toEqual({ status: "published", published_at: later });
  });
  it("saving changes keeps the original publish date", () => {
    const orig = "2026-01-01T00:00:00.000Z";
    expect(resolvePublishing("update", null, { status: "published", published_at: orig }, now).published_at).toBe(orig);
  });
  it("unpublishing makes it a draft", () => {
    expect(resolvePublishing("unpublish", null, { status: "published", published_at: "2026-01-01T00:00:00.000Z" }, now).status).toBe("draft");
  });
  it("a draft stays a draft", () => {
    expect(resolvePublishing("draft", null, null, now)).toEqual({ status: "draft", published_at: null });
  });
});

describe("form validation", () => {
  const fd = (o: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(o)) f.append(k, v);
    return formToObject(f);
  };
  it("requires a title and reports it by field", () => {
    const r = articleSchema.safeParse(fd({ title: " ", intent: "draft" }));
    expect(r.success).toBe(false);
    expect(r.error!.issues[0].path[0]).toBe("title");
  });
  it("normalises tags", () => {
    const r = articleSchema.parse(fd({ title: "x", tags: "Berlin, berlin ,  , Film" }));
    expect(r.tags).toEqual(["berlin", "film"]);
  });
  it("rejects malformed rich text", () => {
    expect(articleSchema.safeParse(fd({ title: "x", body: "<script>" })).success).toBe(false);
  });
  it("only allows half-step ratings and real years", () => {
    expect(filmSchema.safeParse(fd({ title: "x", rating: "4.5" })).success).toBe(true);
    expect(filmSchema.safeParse(fd({ title: "x", rating: "4.3" })).success).toBe(false);
    expect(filmSchema.safeParse(fd({ title: "x", release_year: "19845" })).success).toBe(false);
  });
  it("only allows https or mailto social links", () => {
    expect(settingsSchema.safeParse(fd({ site_title: "S", socials: "Insta | https://instagram.com/x" })).success).toBe(true);
    expect(settingsSchema.safeParse(fd({ site_title: "S", socials: "Bad | javascript:alert(1)" })).success).toBe(false);
  });
  it("builds a slug from the title when none is given", () => {
    expect(finalSlug("", "My First Essay")).toBe("my-first-essay");
    expect(finalSlug("", "!!!")).toBeNull();
  });
});
