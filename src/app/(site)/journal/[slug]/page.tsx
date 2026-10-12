import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getJournal, getJournalEntry } from "@/lib/data";
import { JournalEntryView } from "@/components/site/JournalEntryView";
import { truncate } from "@/lib/text";

export async function generateStaticParams() {
  return (await getJournal()).map((j) => ({ slug: j.slug }));
}

export async function generateMetadata({ params }: PageProps<"/journal/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const j = await getJournalEntry(slug);
  if (!j) return { title: "Not found" };
  return {
    title: j.seo_title || truncate(j.body, 60),
    description: j.seo_description || truncate(j.body, 160),
    alternates: { canonical: `/journal/${j.slug}` },
  };
}

export default async function JournalEntryPage({ params }: PageProps<"/journal/[slug]">) {
  const { slug } = await params;
  const entry = await getJournalEntry(slug);
  if (!entry) notFound();
  const all = await getJournal();
  const i = all.findIndex((j) => j.id === entry.id);
  const newer = all[i - 1];
  const older = all[i + 1];
  return (
    <div className="wrap pt-10 md:pt-16">
      <p className="meta mb-6">
        <Link href="/journal" className="quiet-link">
          Journal
        </Link>
      </p>
      <h1 className="sr-only">Journal entry</h1>
      <JournalEntryView entry={entry} linked={false} large />
      <nav aria-label="More entries" className="flex justify-between gap-4 border-t border-rule pt-4 text-[0.9375rem]">
        {newer ? (
          <Link href={`/journal/${newer.slug}`} rel="prev" className="quiet-link">
            Newer entry
          </Link>
        ) : (
          <span />
        )}
        {older ? (
          <Link href={`/journal/${older.slug}`} rel="next" className="quiet-link">
            Older entry
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </div>
  );
}
