"use client";

import { useState, useTransition } from "react";
import type { Message } from "@/lib/types";
import { deleteNote, updateNote } from "@/lib/admin/actions";
import { DeleteButton } from "./ui";

const fmt = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" });

/** One anonymous note. The text is rendered as plain text, never as HTML. */
export function NoteCard({ note }: { note: Message }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const unread = !note.read_at;
  const act = (change: Parameters<typeof updateNote>[1]) =>
    start(async () => {
      const r = await updateNote(note.id, change);
      setError(r.error ?? null);
    });

  return (
    <article className={`border p-5 ${unread ? "border-ink" : "border-rule"} ${pending ? "opacity-60" : ""}`} aria-label={unread ? "Unread note" : "Note"}>
      <p className="meta flex items-center gap-2">
        {unread ? <span className="h-2 w-2 rounded-full bg-accent" aria-hidden /> : null}
        <time dateTime={note.created_at} suppressHydrationWarning>
          {fmt.format(new Date(note.created_at))}
        </time>
        {unread ? <span>Unread</span> : null}
      </p>
      <p className="serif mt-3 text-[1.25rem] leading-relaxed break-words whitespace-pre-wrap">{note.body}</p>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-ghost btn-small" disabled={pending} onClick={() => act(unread ? "read" : "unread")}>
          {unread ? "Mark as read" : "Mark as unread"}
        </button>
        <button type="button" className="btn btn-ghost btn-small" disabled={pending} onClick={() => act(note.archived ? "unarchive" : "archive")}>
          {note.archived ? "Move to inbox" : "Archive"}
        </button>
        <DeleteButton label="Delete" onDelete={() => deleteNote(note.id)} />
      </div>
      {error ? <p role="alert" className="mt-2 text-[0.875rem] text-[var(--faded-red)]">{error}</p> : null}
    </article>
  );
}
