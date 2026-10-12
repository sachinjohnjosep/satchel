import type { Metadata } from "next";
import { getJournal } from "@/lib/data";
import { EmptyState, FilterLinks } from "@/components/site/bits";
import { JournalEntryView } from "@/components/site/JournalEntryView";

export const metadata: Metadata = {
  title: "Journal",
  description: "Short thoughts, observations, quotations and updates.",
  alternates: { canonical: "/journal" },
};

const KINDS = [
  { value: null, label: "Everything" },
  { value: "thought", label: "Thoughts" },
  { value: "observation", label: "Observations" },
  { value: "quotation", label: "Quotations" },
  { value: "update", label: "Updates" },
];

export default async function JournalIndex({ searchParams }: PageProps<"/journal">) {
  const { kind } = await searchParams;
  const active = typeof kind === "string" ? kind : null;
  const all = await getJournal();
  const shown = active ? all.filter((j) => j.kind === active) : all;
  const kindsPresent = KINDS.filter((k) => !k.value || all.some((j) => j.kind === k.value));

  return (
    <div className="wrap pt-10 md:pt-16">
      <header className="grid gap-6 pb-10 md:grid-cols-12">
        <h1 className="serif text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em] md:col-span-7">Journal</h1>
        <p className="serif self-end text-[1.25rem] leading-snug italic text-charcoal md:col-span-5">
          Notes too short for an essay and too good to lose.
        </p>
      </header>
      {kindsPresent.length > 2 ? (
        <div className="mb-6">
          <FilterLinks label="Filter by kind" active={active} options={kindsPresent} hrefFor={(v) => (v ? `/journal?kind=${v}` : "/journal")} />
        </div>
      ) : null}
      {shown.length ? (
        <div className="border-b border-rule">
          {shown.map((j) => (
            <JournalEntryView key={j.id} entry={j} />
          ))}
        </div>
      ) : (
        <EmptyState>No journal entries yet.</EmptyState>
      )}
    </div>
  );
}
