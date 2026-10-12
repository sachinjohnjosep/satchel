"use server";

import { headers } from "next/headers";
import { after } from "next/server";
import { checkNote, NOTE_ERRORS, rateKey } from "@/lib/notes";
import { secretClient } from "@/lib/supabase/secret";
import { isProduction } from "@/lib/env";
import { notifyNewNote } from "@/lib/notify";

export type NoteState = { status: "idle" | "sent" | "error"; message?: string; draft?: string };

const RATE_LIMIT = 5; // notes
const RATE_WINDOW = 600; // seconds

async function verifyTurnstile(token: FormDataEntryValue | null, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return !isProduction; // allowed only outside production when not configured
  if (typeof token !== "string" || !token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, ...(ip ? { remoteip: ip } : {}) }),
      signal: AbortSignal.timeout(6000),
    });
    const data = (await res.json()) as { success?: boolean };
    return data.success === true;
  } catch {
    return false;
  }
}

export async function sendNote(_prev: NoteState, form: FormData): Promise<NoteState> {
  const raw = form.get("message");
  const draft = typeof raw === "string" ? raw.slice(0, 2500) : "";
  const fail = (key: keyof typeof NOTE_ERRORS): NoteState => ({ status: "error", message: NOTE_ERRORS[key], draft });

  const check = checkNote({ message: raw, website: form.get("website") }, { production: isProduction });
  if (!check.ok) return fail(check.reason);

  const db = secretClient();
  if (!db) return fail("unavailable");

  const h = await headers();
  // Used only in memory for the spam check and to build a one-way hash for rate limiting.
  const ip = (h.get("x-forwarded-for")?.split(",")[0] ?? h.get("x-real-ip") ?? "").trim();

  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip))) return fail("captcha");

  const salt = process.env.RATE_LIMIT_SALT ?? process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const { data: allowed, error: rlError } = await db.rpc("hit_rate_limit", {
    p_key: await rateKey(ip || "unknown", salt),
    p_limit: RATE_LIMIT,
    p_window_seconds: RATE_WINDOW,
  });
  if (rlError) {
    console.error("[note] rate limit check failed:", rlError.code);
    return fail("unavailable");
  }
  if (!allowed) return fail("rate");

  const { error } = await db.from("messages").insert({ body: check.body });
  if (error) {
    console.error("[note] insert failed:", error.code);
    return fail("unavailable");
  }

  after(() => notifyNewNote(check.body));
  return { status: "sent" };
}
