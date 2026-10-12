import Link from "next/link";
import { requireAdminPage } from "@/lib/auth";
import { pubState, SECTIONS, type SectionKey } from "@/lib/admin/sections";
import { formatDate, truncate } from "@/lib/text";
import { StatusDot } from "@/components/admin/PublishBar";

type Row = { id: string; title?: string; body?: string; status: string; published_at: string | null; updated_at: string; is_placeholder: boolean };

export default async function Overview() {
  const { supabase } = await requireAdminPage();
  const keys = Object.keys(SECTIONS) as SectionKey[];
  const [results, unread] = await Promise.all([
    Promise.all(
      keys.map(async (k) => {
        const cols = k === "journal" ? "id, body, status, published_at, updated_at, is_placeholder" : "id, title, status, published_at, updated_at, is_placeholder";
        const { data } = await supabase.from(SECTIONS[k].table).select(cols).order("updated_at", { ascending: false }).limit(500);
        return [k, (data ?? []) as unknown as Row[]] as const;
      }),
    ),
    supabase.from("messages").select("id", { count: "exact", head: true }).is("read_at", null).eq("archived", false),
  ]);

  const all = results.flatMap(([k, rows]) => rows.map((r) => ({ ...r, section: k })));
  const recent = [...all].sort((a, b) => b.updated_at.localeCompare(a.updated_at)).slice(0, 8);
  const drafts = all.filter((r) => pubState(r) === "draft");
  const scheduled = all.filter((r) => pubState(r) === "scheduled").sort((a, b) => (a.published_at ?? "").localeCompare(b.published_at ?? ""));
  const samples = all.filter((r) => r.is_placeholder).length;
  const name = (r: Row) => r.title ?? truncate(r.body ?? "", 70);

  return (
    <div className="max-w-5xl">
      <h1 className="serif text-[2.5rem] leading-none italic md:text-[3rem]">Overview</h1>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/writing/new" className="btn">New piece</Link>
        <Link href="/admin/photos/new" className="btn btn-ghost">Add photograph</Link>
        <Link href="/admin/films/new" className="btn btn-ghost">Add film</Link>
        <Link href="/admin/journal/new" className="btn btn-ghost">New journal entry</Link>
      </div>

      {(unread.count ?? 0) > 0 ? (
        <Link href="/admin/notes" className="mt-8 block border border-ink p-5 no-underline hover:bg-paper-deep">
          <span className="serif text-[1.5rem] italic">
            {unread.count} new note{unread.count === 1 ? "" : "s"}
          </span>
          <span className="ml-3 underline underline-offset-4">Read</span>
        </Link>
      ) : null}

      {samples ? (
        <p className="mt-8 border-l-2 border-[#b07a2a] bg-paper-deep px-4 py-3 text-[0.9375rem]">
          {samples} sample item{samples === 1 ? " is" : "s are"} still on the site. Edit them to make them yours, or delete them. They are
          marked “Sample” in every list.
        </p>
      ) : null}

      <dl className="mt-10 grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-3 lg:grid-cols-6">
        {results.map(([k, rows]) => (
          <div key={k} className="bg-paper p-4">
            <dt className="meta">{SECTIONS[k].label}</dt>
            <dd className="serif mt-1 text-[2rem] leading-none">
              <Link href={`/admin/${k}`} className="no-underline hover:text-accent">
                {rows.filter((r) => pubState(r) === "published").length}
              </Link>
            </dd>
            <dd className="meta mt-1">{rows.filter((r) => pubState(r) !== "published").length} not live</dd>
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-2 [&>section]:min-w-0">
        <section aria-labelledby="recent-h">
          <h2 id="recent-h" className="serif mb-3 text-[1.5rem] italic">Recently edited</h2>
          <List rows={recent} name={name} />
        </section>
        <section aria-labelledby="queue-h">
          <h2 id="queue-h" className="serif mb-3 text-[1.5rem] italic">Scheduled and drafts</h2>
          {scheduled.length + drafts.length ? <List rows={[...scheduled, ...drafts].slice(0, 10)} name={name} /> : <p className="text-dust">Nothing waiting.</p>}
        </section>
      </div>
    </div>
  );
}

function List({ rows, name }: { rows: (Row & { section: SectionKey })[]; name: (r: Row) => string }) {
  return (
    <ul className="border-b border-rule">
      {rows.map((r) => {
        const s = pubState(r);
        return (
          <li key={r.id} className="border-t border-rule">
            <Link href={`/admin/${r.section}/${r.id}`} className="flex items-center gap-3 py-2.5 no-underline hover:bg-paper-deep/60">
              <StatusDot state={s} />
              <span className="min-w-0 flex-1 truncate">{name(r)}</span>
              <span className="meta shrink-0">
                {SECTIONS[r.section].label}
                {s === "scheduled" ? `, ${formatDate(r.published_at)}` : ""}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
