"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/notes", label: "Notes" },
  { href: "/admin/writing", label: "Writing" },
  { href: "/admin/photos", label: "Photographs" },
  { href: "/admin/stories", label: "Photo stories" },
  { href: "/admin/films", label: "Films" },
  { href: "/admin/lists", label: "Film lists" },
  { href: "/admin/listening", label: "Listening" },
  { href: "/admin/playlists", label: "Playlists" },
  { href: "/admin/journal", label: "Journal" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminNav({ unread }: { unread: number }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(href + "/"));
  return (
    <nav aria-label="Dashboard">
      {/* Phones: one scrollable row. Larger screens: a column. */}
      <ul className="flex gap-1 overflow-x-auto px-3 py-3 md:flex-col md:gap-0 md:px-3 md:pt-8">
        {ITEMS.map((item) => (
          <li key={item.href} className="shrink-0">
            <Link
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              className="flex min-h-10 items-center justify-between gap-3 px-3 text-[0.9375rem] no-underline hover:bg-paper-deep aria-[current=page]:bg-ink aria-[current=page]:text-paper"
            >
              {item.label}
              {item.href === "/admin/notes" && unread > 0 ? (
                <span className="min-w-6 rounded-full bg-accent px-1.5 text-center text-[0.75rem] leading-5 text-paper" aria-label={`${unread} unread`}>
                  {unread}
                </span>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
