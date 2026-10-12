import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import type { Message } from "@/lib/types";
import { NoteCard } from "@/components/admin/NoteCard";

export const metadata: Metadata = { title: "Notes" };

export default async function NotesInbox({ searchParams }: PageProps<"/admin/notes">) {
  const { view } = await searchParams;
  const archived = view === "archived";
  const { supabase } = await requireAdminPage();
  const { data, error } = await supabase
    .from("messages")
    .select("id, body, created_at, read_at, archived")
    .eq("archived", archived)
    .order("created_at", { ascending: false })
    .limit(300);
  const notes = (data ?? []) as Message[];
  const unread = notes.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-3xl">
      <h1 className="serif text-[2.5rem] leading-none italic md:text-[3rem]">Notes</h1>
      <p className="mt-3 text-charcoal">
        Anonymous notes left on the site. Only you can see them. {!archived && unread ? `${unread} unread.` : ""}
      </p>
      <nav aria-label="Notes view" className="mt-6 flex gap-1 text-[0.9375rem]">
        {[
          { href: "/admin/notes", label: "Inbox", current: !archived },
          { href: "/admin/notes?view=archived", label: "Archived", current: archived },
        ].map((t) => (
          <Link key={t.href} href={t.href} aria-current={t.current ? "page" : undefined} className="px-3 py-1.5 no-underline hover:bg-paper-deep aria-[current=page]:bg-ink aria-[current=page]:text-paper">
            {t.label}
          </Link>
        ))}
      </nav>
      {error ? (
        <p role="alert" className="mt-8 text-[var(--faded-red)]">
          Notes could not be loaded. Reload the page to try again.
        </p>
      ) : notes.length ? (
        <ul className="mt-6 space-y-4">
          {notes.map((n) => (
            <li key={n.id}>
              <NoteCard note={n} />
            </li>
          ))}
        </ul>
      ) : (
        <p className="serif mt-10 border border-dashed border-rule p-10 text-center text-[1.375rem] italic text-dust">
          {archived ? "No archived notes." : "No notes yet. They will appear here when someone writes."}
        </p>
      )}
    </div>
  );
}
