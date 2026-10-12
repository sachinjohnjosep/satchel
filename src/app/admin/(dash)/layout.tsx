import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { AdminNav } from "@/components/admin/AdminNav";
import { signOut } from "../login/actions";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s | Dashboard" },
  robots: { index: false, follow: false },
};

export default async function DashLayout({ children }: { children: React.ReactNode }) {
  const { supabase, email } = await requireAdminPage();
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .eq("archived", false);

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <aside className="border-b border-rule md:sticky md:top-0 md:h-dvh md:border-r md:border-b-0">
        <div className="flex items-baseline justify-between px-4 pt-4 md:block md:px-6 md:pt-8">
          <Link href="/admin" className="serif text-[1.5rem] italic no-underline">
            Dashboard
          </Link>
          <Link href="/" target="_blank" className="text-[0.875rem] underline underline-offset-4 md:mt-1 md:block">
            Open the site
          </Link>
        </div>
        <AdminNav unread={count ?? 0} />
        <div className="hidden px-6 pt-6 md:block">
          <p className="meta break-all">{email}</p>
          <form action={signOut}>
            <button className="mt-2 text-[0.875rem] underline underline-offset-4">Sign out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 px-4 pt-6 pb-32 md:px-10 md:pt-10 md:pb-16">{children}</div>
    </div>
  );
}
