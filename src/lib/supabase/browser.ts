"use client";
import { createBrowserClient } from "@supabase/ssr";
import { supabasePublishableKey, supabaseUrl } from "../env";

/** Browser client for the admin dashboard (sign-in and image uploads). */
export function browserClient() {
  return createBrowserClient(supabaseUrl, supabasePublishableKey);
}
