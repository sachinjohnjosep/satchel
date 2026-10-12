import Link from "next/link";
import type { SiteSettings } from "@/lib/types";
import { NAV } from "@/lib/nav";
import { safeHref } from "@/lib/media";

export function Footer({ settings }: { settings: SiteSettings }) {
  const year = new Date().getFullYear();
  const socials = settings.socials.filter((s) => safeHref(s.url));
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="wrap grid gap-10 py-12 md:grid-cols-12">
        <div className="md:col-span-5">
          <p className="serif text-[2.25rem] leading-none italic">{settings.site_title}</p>
          {settings.tagline ? <p className="mt-3 max-w-xs text-charcoal">{settings.tagline}</p> : null}
        </div>
        <nav aria-label="Footer" className="md:col-span-3">
          <ul className="space-y-1.5">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} className="quiet-link">
                  {n.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/note" className="quiet-link">
                Leave a note
              </Link>
            </li>
          </ul>
        </nav>
        <div className="md:col-span-4">
          {socials.length ? (
            <ul className="space-y-1.5">
              {socials.map((s) => (
                <li key={s.url}>
                  <a href={safeHref(s.url)!} className="quiet-link" rel="me noopener noreferrer" target="_blank">
                    {s.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <p className="meta mt-8">
            © {year} {settings.site_title}. Words and photographs are my own unless noted.
          </p>
        </div>
      </div>
    </footer>
  );
}
