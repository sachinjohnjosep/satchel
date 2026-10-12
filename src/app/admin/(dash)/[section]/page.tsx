import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/auth";
import { isSection, pubState, SECTIONS } from "@/lib/admin/sections";
import { listRows } from "@/lib/admin/queries";
import { mediaUrl } from "@/lib/media";
import { formatDate, truncate } from "@/lib/text";
import { StatusDot } from "@/components/admin/PublishBar";

export async function generateMetadata({ params }: PageProps<"/admin/[section]">): Promise<Metadata> {
  const { section } = await params;
  return { title: isSection(section) ? SECTIONS[section].label : "Not found" };
}

const FILTERS = [
  { value: "", label: "All" },
  { value: "draft", label: "Drafts" },
  { value: "scheduled", label: "Scheduled" },
  { value: "published", label: "Published" },
];

export default async function SectionList({ params, searchParams }: PageProps<"/admin/[section]">) {
  const { section } = await params;
  if (!isSection(section)) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  const show = typeof sp.show === "string" ? sp.show : "";
  const { supabase } = await requireAdminPage();
  const cfg = SECTIONS[section];
  const rows = (await listRows(supabase, section, q)).filter((r) => !show || pubState(r) === show);

  return (
    <div>
      {sp.deleted ? (
        <p role="status" className="mb-6 border-l-2 border-[var(--olive)] bg-paper-deep px-4 py-2 text-[0.9375rem]">
          Deleted.
        </p>
      ) : null}
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h1 className="serif text-[2.5rem] leading-none italic md:text-[3rem]">{cfg.label}</h1>
        <Link href={`/admin/${section}/new`} className="btn">
          {cfg.newLabel}
        </Link>
      </div>

      <form className="mt-8 flex flex-wrap items-center gap-3" role="search">
        <label htmlFor="q" className="sr-only">
          Search {cfg.label.toLowerCase()}
        </label>
        <input id="q" name="q" type="search" defaultValue={q} placeholder={section === "journal" ? "Search entries" : "Search titles"} className="input max-w-xs" />
        {show ? <input type="hidden" name="show" value={show} /> : null}
        <button className="btn btn-ghost btn-small">Search</button>
        <nav aria-label="Filter by status" className="flex gap-1 text-[0.875rem]">
          {FILTERS.map((f) => (
            <Link
              key={f.value}
              href={`/admin/${section}${f.value || q ? `?${new URLSearchParams({ ...(f.value ? { show: f.value } : {}), ...(q ? { q } : {}) })}` : ""}`}
              aria-current={show === f.value ? "true" : undefined}
              className="px-2.5 py-1.5 no-underline hover:bg-paper-deep aria-[current=true]:bg-paper-deep aria-[current=true]:font-semibold"
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </form>

      {rows.length ? (
        <ul className="mt-6 border-b border-rule">
          {rows.map((r) => {
            const state = pubState(r);
            const thumb = section === "photos" ? mediaUrl(r.image_path) : null;
            const title = r.title ?? truncate(r.body ?? "", 90);
            return (
              <li key={r.id} className="border-t border-rule">
                <Link href={`/admin/${section}/${r.id}`} className="flex min-h-16 items-center gap-4 py-3 no-underline hover:bg-paper-deep/60">
                  {thumb ? (
                    <span className="relative block h-14 w-14 shrink-0 overflow-hidden bg-paper-deep">
                      <Image src={thumb} alt="" fill sizes="56px" className="object-cover" />
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[1.0625rem]">{title}</span>
                    <span className="meta flex flex-wrap items-center gap-x-3">
                      <span className="inline-flex items-center gap-1.5">
                        <StatusDot state={state} />
                        {state === "draft" ? "Draft" : state === "scheduled" ? `Scheduled for ${formatDate(r.published_at)}` : `Published ${formatDate(r.published_at)}`}
                      </span>
                      {r.category ? <span>{r.category}</span> : null}
                      {r.kind ? <span className="capitalize">{r.kind}</span> : null}
                      {r.release_year ? <span>{r.release_year}</span> : null}
                      {r.is_placeholder ? <span className="sample-mark">Sample</span> : null}
                    </span>
                  </span>
                  <span className="meta hidden shrink-0 sm:block">Edited {formatDate(r.updated_at)}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-10 border border-dashed border-rule p-10 text-center">
          <p className="serif text-[1.375rem] italic">{q || show ? "Nothing matches." : `No ${cfg.label.toLowerCase()} yet.`}</p>
          {!q && !show ? (
            <Link href={`/admin/${section}/new`} className="btn mt-5">
              {cfg.newLabel}
            </Link>
          ) : null}
        </div>
      )}
    </div>
  );
}
