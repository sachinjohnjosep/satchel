"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";
import { requireAdminAction, NotAuthorized } from "../auth";
import { CONTENT_TAG } from "../supabase/public";
import { readingMinutes } from "../text";
import { SECTIONS, type SectionKey } from "./sections";
import {
  articleSchema,
  collectionSchema,
  fieldErrors,
  filmListSchema,
  filmSchema,
  finalSlug,
  formToObject,
  journalSchema,
  listenSchema,
  playlistSchema,
  photoSchema,
  resolvePublishing,
  settingsSchema,
} from "./schemas";

export type SaveState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fields?: Record<string, string>;
  savedAt?: number;
};

const SCHEMAS = {
  writing: articleSchema,
  photos: photoSchema,
  stories: collectionSchema,
  films: filmSchema,
  lists: filmListSchema,
  listening: listenSchema,
  playlists: playlistSchema,
  journal: journalSchema,
} satisfies Record<SectionKey, z.ZodTypeAny>;

/** Makes every public page pick up the change on its next request. */
function refreshSite() {
  updateTag(CONTENT_TAG);
  revalidatePath("/", "layout");
}

function friendly(e: unknown): SaveState {
  if (e instanceof NotAuthorized) return { error: e.message };
  console.error("[admin] save failed:", e);
  return { error: "Saving failed. Check your connection and try again; your text is still here." };
}

const DONE: Record<string, string> = {
  draft: "Draft saved.",
  publish: "Published.",
  update: "Changes saved.",
  unpublish: "Unpublished. It is now a draft.",
};

export async function saveItem(section: SectionKey, id: string | null, _prev: SaveState, form: FormData): Promise<SaveState> {
  let newId: string | null = null;
  try {
    const { supabase } = await requireAdminAction();
    const cfg = SECTIONS[section];
    const parsed = SCHEMAS[section].safeParse(formToObject(form));
    if (!parsed.success) return { error: "Some fields need attention.", fields: fieldErrors(parsed.error) };
    const { intent, slug: slugInput, published_at: chosenDate, ...data } = parsed.data as Record<string, unknown> & {
      intent: "draft" | "publish" | "update" | "unpublish";
      slug: string;
      published_at: string | null;
    };

    let existing: { status: string; published_at: string | null } | null = null;
    if (id) {
      const { data: row, error } = await supabase.from(cfg.table).select("status, published_at").eq("id", id).maybeSingle();
      if (error) throw error;
      if (!row) return { error: "This item no longer exists. It may have been deleted on another device." };
      existing = row;
    }

    const slugSource = String(data.title ?? data.body ?? "").slice(0, 80);
    const slug = finalSlug(slugInput, slugSource);
    if (!slug) return { error: "Some fields need attention.", fields: { slug: "Use letters, numbers and hyphens for the web address." } };

    const row: Record<string, unknown> = {
      ...data,
      slug,
      ...resolvePublishing(intent, chosenDate, existing),
    };
    if (section === "writing") row.reading_minutes = readingMinutes(row.body as never);
    // Editing a sample item makes it yours: drop the Sample marker.
    row.is_placeholder = false;

    const query = id
      ? supabase.from(cfg.table).update(row).eq("id", id).select("id").single()
      : supabase.from(cfg.table).insert(row).select("id").single();
    const { data: saved, error } = await query;
    if (error) {
      if (error.code === "23505") return { error: "Some fields need attention.", fields: { slug: "Another item already uses this web address. Change it slightly." } };
      if (error.code === "42501") return { error: "You don't have permission to change this. Sign in again." };
      throw error;
    }
    refreshSite();
    if (id) return { ok: true, message: DONE[intent], savedAt: Date.now() };
    newId = saved.id as string;
  } catch (e) {
    return friendly(e);
  }
  redirect(`/admin/${section}/${newId}?saved=1`);
}

export async function deleteItem(section: SectionKey, id: string): Promise<SaveState> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.from(SECTIONS[section].table).delete().eq("id", id);
    if (error) throw error;
    refreshSite();
  } catch (e) {
    return friendly(e);
  }
  redirect(`/admin/${section}?deleted=1`);
}

export async function saveSettings(_prev: SaveState, form: FormData): Promise<SaveState> {
  try {
    const { supabase } = await requireAdminAction();
    const parsed = settingsSchema.safeParse(formToObject(form, ["featured_article_ids", "featured_film_ids"]));
    if (!parsed.success) return { error: "Some fields need attention.", fields: fieldErrors(parsed.error) };
    const { notify_email, ...publicSettings } = parsed.data;
    const [a, b] = await Promise.all([
      supabase.from("site_settings").update(publicSettings).eq("id", 1),
      supabase.from("private_settings").update({ notify_email }).eq("id", 1),
    ]);
    if (a.error) throw a.error;
    if (b.error) throw b.error;
    refreshSite();
    return { ok: true, message: "Settings saved.", savedAt: Date.now() };
  } catch (e) {
    return friendly(e);
  }
}

// ── Notes inbox ─────────────────────────────────────────

export async function updateNote(id: string, change: "read" | "unread" | "archive" | "unarchive"): Promise<SaveState> {
  try {
    const { supabase } = await requireAdminAction();
    const patch =
      change === "read"
        ? { read_at: new Date().toISOString() }
        : change === "unread"
          ? { read_at: null }
          : { archived: change === "archive" };
    const { error } = await supabase.from("messages").update(patch).eq("id", id);
    if (error) throw error;
    revalidatePath("/admin", "layout");
    return { ok: true };
  } catch (e) {
    return friendly(e);
  }
}

export async function deleteNote(id: string): Promise<SaveState> {
  try {
    const { supabase } = await requireAdminAction();
    const { error } = await supabase.from("messages").delete().eq("id", id);
    if (error) throw error;
    revalidatePath("/admin", "layout");
    return { ok: true, message: "Note deleted." };
  } catch (e) {
    return friendly(e);
  }
}
