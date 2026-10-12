"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ThemeToggle } from "./ThemeToggle";
import { NAV } from "@/lib/nav";


export function Header({ title }: { title: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const onCinema = pathname.startsWith("/cinema");

  // Close the menu when the route changes, and on Escape.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <header className={onCinema ? "screening" : undefined}>
      <div className="wrap flex items-baseline justify-between gap-6 pt-6 pb-5 md:pt-8">
        <Link href="/" className="serif text-[1.75rem] leading-none italic tracking-[-0.01em] no-underline" aria-label={`${title}, home`}>
          {title}
        </Link>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-baseline gap-7 text-[0.9375rem]">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={isActive(item.href) ? "page" : undefined}
                  className="quiet-link aria-[current=page]:bg-[length:100%_1px]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/search" aria-current={isActive("/search") ? "page" : undefined} className="quiet-link aria-[current=page]:bg-[length:100%_1px]">
                Search
              </Link>
            </li>
            <li>
              <Link href="/note" className="serif text-[1.0625rem] italic text-accent no-underline hover:underline">
                Leave a note
              </Link>
            </li>
            <li>
              <ThemeToggle />
            </li>
          </ul>
        </nav>

        <button
          ref={menuButton}
          type="button"
          className="lg:hidden -mr-2 min-h-11 min-w-11 px-2 text-[0.9375rem]"
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Close" : "Menu"}
        </button>
      </div>

      {open ? (
        <div
          id="mobile-menu"
          className="fixed inset-0 top-[4.75rem] z-50 overflow-y-auto bg-paper lg:hidden"
          style={{ animation: "settle 0.35s var(--ease) both" }}
        >
          <nav aria-label="Main" className="wrap pt-6 pb-16">
            <ul className="space-y-1">
              {[{ href: "/", label: "Home" }, ...NAV, { href: "/search", label: "Search" }].map((item) => (
                <li key={item.href} className="border-b border-rule">
                  <Link
                    href={item.href}
                    aria-current={(item.href === "/" ? pathname === "/" : isActive(item.href)) ? "page" : undefined}
                    className="serif block py-3 text-[2rem] leading-tight no-underline aria-[current=page]:italic aria-[current=page]:text-accent"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <p className="mt-8">
              <Link href="/note" className="serif text-[1.5rem] italic text-accent">
                Leave a note
              </Link>
            </p>
            <div className="mt-8">
              <ThemeToggle />
            </div>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
