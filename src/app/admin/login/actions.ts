"use server";

import { redirect } from "next/navigation";
import { serverClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export type LoginState = { error?: string; email?: string };

export async function signIn(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().slice(0, 320);
  const password = String(form.get("password") ?? "");
  if (!isSupabaseConfigured) return { error: "Connect Supabase first (see SETUP.md).", email };
  if (!email || !password) return { error: "Enter your email and password.", email };
  const supabase = await serverClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    // Same message for wrong email or password, so accounts can't be probed.
    return { error: "That email and password don't match. Check both and try again.", email };
  }
  redirect("/admin");
}

export async function signOut() {
  if (isSupabaseConfigured) {
    const supabase = await serverClient();
    await supabase.auth.signOut();
  }
  redirect("/admin/login");
}
