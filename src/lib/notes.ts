// Pure validation for anonymous notes. No I/O here, so it is easy to test.

export const NOTE_MAX = 2000;
/** Development/preview-only starting value for the message field. Never a real note. */
export const NOTE_SAMPLE_VALUE = "gcng";

export type NoteInput = { message: unknown; website: unknown };
export type NoteCheck = { ok: true; body: string } | { ok: false; reason: "empty" | "too_long" | "spam" | "sample" };

/** Removes control characters (keeping line breaks and tabs) and trims. */
export function cleanNote(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F​-‏‪-‮⁦-⁩]/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

export function checkNote(input: NoteInput, opts: { production: boolean }): NoteCheck {
  // The "website" field is hidden from people; bots tend to fill it in.
  if (typeof input.website === "string" && input.website.trim() !== "") return { ok: false, reason: "spam" };
  if (typeof input.message !== "string") return { ok: false, reason: "empty" };
  const body = cleanNote(input.message);
  if (!body) return { ok: false, reason: "empty" };
  if ([...body].length > NOTE_MAX) return { ok: false, reason: "too_long" };
  if (!opts.production && body === NOTE_SAMPLE_VALUE) return { ok: false, reason: "sample" };
  return { ok: true, body };
}

export const NOTE_ERRORS: Record<string, string> = {
  empty: "Write something before sending.",
  too_long: `Notes can be up to ${NOTE_MAX} characters. Shorten it a little and send again.`,
  sample: "That is the sample text used for previews. Replace it with your own note.",
  spam: "This note could not be sent. Reload the page and try again.",
  captcha: "The spam check did not complete. Wait a moment for it to finish, then send again.",
  rate: "Too many notes from this connection in a short time. Try again in about ten minutes.",
  unavailable: "Notes cannot be received right now. Please try again later.",
};

/** Salted, daily-rotating SHA-256 of the client address. The address itself is never stored. */
export async function rateKey(ip: string, salt: string, now = new Date()): Promise<string> {
  const day = now.toISOString().slice(0, 10);
  const data = new TextEncoder().encode(`${salt}|${day}|${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(digest).toString("hex");
}
