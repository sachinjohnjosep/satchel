import Link from "next/link";
import type { JournalEntry } from "@/lib/types";
import { formatDate } from "@/lib/text";
import { SampleMark } from "./SampleMark";

const KIND_LABEL: Record<JournalEntry["kind"], string> = {
  thought: "Thought",
  observation: "Observation",
  quotation: "Quotation",
  update: "Update",
};

/** A notebook line: the date sits in the margin, the entry in the column. */
export function JournalEntryView({ entry, linked = true, large = false }: { entry: JournalEntry; linked?: boolean; large?: boolean }) {
  const date = <time dateTime={entry.published_at ?? undefined}>{formatDate(entry.published_at)}</time>;
  const paragraphs = entry.body.split(/\n{2,}/);
  return (
    <article className="grid gap-x-10 gap-y-2 border-t border-rule py-8 md:grid-cols-12">
      <p className="meta md:col-span-3 md:pt-1.5">
        {linked ? (
          <Link href={`/journal/${entry.slug}`} className="quiet-link">
            {date}
          </Link>
        ) : (
          date
        )}
        <span className="block">{KIND_LABEL[entry.kind]}</span>
      </p>
      <div className="md:col-span-8">
        {entry.kind === "quotation" ? (
          <blockquote>
            <p className={`serif italic leading-snug [text-wrap:pretty] ${large ? "text-[2rem] md:text-[2.5rem]" : "text-[1.625rem]"}`}>
              “{entry.body}”
            </p>
            {entry.quote_source ? <footer className="meta mt-3">{entry.quote_source}</footer> : null}
          </blockquote>
        ) : (
          <div className={`serif space-y-3 leading-snug [text-wrap:pretty] ${large ? "text-[1.75rem] md:text-[2.125rem]" : "text-[1.375rem]"}`}>
            {paragraphs.map((para, i) => (
              <p key={i} className="whitespace-pre-line">
                {para}
              </p>
            ))}
          </div>
        )}
        <SampleMark show={entry.is_placeholder} className="mt-3" />
      </div>
    </article>
  );
}
