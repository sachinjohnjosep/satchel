import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "../env";

export const CONTENT_TAG = "content";
export const REVALIDATE_SECONDS = 300;

let client: SupabaseClient | null = null;

/**
 * Cookie-less client for public pages. It only ever sees what row-level security
 * allows anonymous visitors to see, so pages built with it can be cached safely.
 */
export function publicClient(): SupabaseClient | null {
  if (!isSupabaseConfigured) return null;
  client ??= createClient(supabaseUrl, supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      // Cache public reads in Next's data cache. Publishing calls updateTag(CONTENT_TAG)
      // so edits show on the next request; scheduled posts appear within REVALIDATE seconds.
      fetch: (input, init) =>
        fetch(input, { ...init, next: { tags: [CONTENT_TAG], revalidate: REVALIDATE_SECONDS } }),
    },
  });
  return client;
}
