import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "./LoginForm";
import { getAdmin } from "@/lib/auth";
import { serverClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { signOut } from "./actions";

export const metadata: Metadata = { title: "Sign in", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getAdmin()) redirect("/admin");
  let signedInAs: string | null = null;
  if (isSupabaseConfigured) {
    const { data } = await (await serverClient()).auth.getClaims();
    signedInAs = (data?.claims?.email as string | undefined) ?? (data?.claims?.sub ? "this account" : null);
  }
  return (
    <div className="flex min-h-dvh items-center justify-center px-5 py-16">
      <div className="w-full max-w-sm">
        <h1 className="serif text-[2.75rem] leading-none italic">Dashboard</h1>
        <p className="mt-3 mb-8 text-charcoal">Sign in to write, publish and read your notes.</p>
        {!isSupabaseConfigured ? (
          <p className="border border-dashed border-rule p-4 text-[0.9375rem] text-charcoal">
            The dashboard needs Supabase. Add the keys described in SETUP.md, then reload this page.
          </p>
        ) : signedInAs ? (
          <div className="space-y-4">
            <p className="text-[0.9375rem]">
              You are signed in as {signedInAs}, but this account is not an admin of this site. Add it to the admins table
              (SETUP.md, step 4) or sign out.
            </p>
            <form action={signOut}>
              <button className="btn btn-ghost">Sign out</button>
            </form>
          </div>
        ) : (
          <LoginForm />
        )}
      </div>
    </div>
  );
}
