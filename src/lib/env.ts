// Central place for environment configuration.
// NEXT_PUBLIC_* values are safe in the browser. Everything else is server-only.

/** Project URL, e.g. https://abc.supabase.co. A pasted REST endpoint (…/rest/v1/) or trailing slash is tolerated. */
export function normaliseSupabaseUrl(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/(rest|auth|storage)\/v1$/i, "")
    .replace(/\/+$/, "");
}

export const supabaseUrl = normaliseSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL);
/** Publishable key (sb_publishable_…) or the legacy anon key. Safe for the browser. */
export const supabasePublishableKey =
  (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim();

/** True once Supabase is connected. Without it the site shows read-only sample content. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabasePublishableKey);

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

export const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

/** Build target: "production" hides development-only conveniences. */
export const isProduction = process.env.VERCEL_ENV
  ? process.env.VERCEL_ENV === "production"
  : process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_PREVIEW !== "1";
