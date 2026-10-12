import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { supabaseUrl } from "../env";

let client: SupabaseClient | null = null;

/**
 * Privileged client using the secret (service role) key. It bypasses row-level
 * security, so it is used in exactly one place: storing anonymous notes after the
 * server has validated, rate-limited and spam-checked them. Never import it in
 * client components; the "server-only" import makes that a build error.
 */
export function secretClient(): SupabaseClient | null {
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !key) return null;
  client ??= createClient(supabaseUrl, key, { auth: { persistSession: false, autoRefreshToken: false } });
  return client;
}
