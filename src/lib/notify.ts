import "server-only";
import { secretClient } from "./supabase/secret";

/**
 * Sends a short private email when a note arrives, if Resend is configured.
 * Failures are logged without the note's content and never affect the visitor.
 */
export async function notifyNewNote(body: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.NOTIFY_FROM; // e.g. "Satchel <notes@yourdomain.com>"
  if (!apiKey || !from) return;

  let to = process.env.NOTIFY_EMAIL ?? null;
  const db = secretClient();
  if (db) {
    const { data } = await db.from("private_settings").select("notify_email").eq("id", 1).maybeSingle();
    if (data?.notify_email) to = data.notify_email;
  }
  if (!to) return;

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  const preview = body.length > 600 ? body.slice(0, 600) + "…" : body;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: [to],
        subject: "A new note on your site",
        // Plain text only: nothing in the note can be rendered as HTML.
        text: `Someone left you a note:\n\n${preview}\n\nRead it in your inbox: ${site}/admin/notes\n`,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error(`[notify] Resend responded ${res.status}`);
  } catch (e) {
    console.error("[notify] email failed:", (e as Error).name);
  }
}
