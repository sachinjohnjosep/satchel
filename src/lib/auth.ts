import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { serverClient } from "./supabase/server";
import { isSupabaseConfigured } from "./env";

export class NotAuthorized extends Error {}

/**
 * Confirms the visitor is signed in AND listed in the admins table.
 * Call at the top of every admin page and server action.
 */
export const getAdmin = cache(async () => {
  if (!isSupabaseConfigured) return null;
  const supabase = await serverClient();
  const { data } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (!sub) return null;
  const { data: isAdmin, error } = await supabase.rpc("is_admin");
  if (error || !isAdmin) return null;
  return { supabase, userId: sub as string, email: (data.claims.email as string | undefined) ?? null };
});

export async function requireAdminPage() {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function requireAdminAction() {
  const admin = await getAdmin();
  if (!admin) throw new NotAuthorized("Your session has ended. Sign in again.");
  return admin;
}
