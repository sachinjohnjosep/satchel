"use client";

import Link from "next/link";
import { DateTimeField, DeleteButton, SubmitButton, TextField } from "./ui";
import type { PubState } from "@/lib/admin/sections";
import type { SaveState } from "@/lib/admin/actions";

const STATE_LABEL: Record<PubState, string> = {
  draft: "Draft. Only you can see it.",
  scheduled: "Scheduled. Goes live at the date below.",
  published: "Published. Visible to everyone.",
};

export function StatusDot({ state }: { state: PubState }) {
  const color = state === "published" ? "bg-[var(--olive)]" : state === "scheduled" ? "bg-[#b07a2a]" : "bg-dust";
  return <span className={`inline-block h-2 w-2 shrink-0 rounded-full ${color}`} aria-hidden />;
}

export function PublishBar({
  isNew,
  state,
  publishedAt,
  publicHref,
  previewHref,
  onDelete,
  noun,
}: {
  isNew: boolean;
  state: PubState;
  publishedAt: string | null;
  publicHref: string | null;
  previewHref: string | null;
  onDelete?: () => Promise<SaveState | void>;
  noun: string;
}) {
  const live = state !== "draft";
  return (
    <>
      {/* Status and schedule, in the side column */}
      <section className="space-y-4 border-t border-rule pt-6" aria-labelledby="pub-h">
        <h2 id="pub-h" className="serif text-[1.5rem] italic">
          Publishing
        </h2>
        <p className="flex items-center gap-2 text-[0.9375rem]">
          <StatusDot state={isNew ? "draft" : state} />
          {isNew ? "Not saved yet." : STATE_LABEL[state]}
        </p>
        <DateTimeField
          name="published_at"
          label="Publish date"
          defaultValue={publishedAt}
          hint="Leave empty to publish now. Pick a future date to schedule it; scheduled items appear within about five minutes of that time."
        />
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-[0.9375rem]">
          {previewHref ? (
            <Link href={previewHref} target="_blank" className="underline underline-offset-4">
              Preview
            </Link>
          ) : null}
          {publicHref && state === "published" ? (
            <Link href={publicHref} target="_blank" className="underline underline-offset-4">
              View on site
            </Link>
          ) : null}
        </div>
        {onDelete ? (
          <div className="pt-2">
            <DeleteButton onDelete={onDelete} label={`Delete ${noun}`} />
          </div>
        ) : null}
      </section>

      {/* Actions: a sticky bar on phones, inline on larger screens */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex flex-wrap justify-end gap-3 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur md:static md:z-auto md:mt-8 md:justify-start md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        {live ? (
          <>
            {/* Primary first in the DOM, so pressing Enter saves rather than unpublishes */}
            <SubmitButton intent="update" className="order-2">
              Save changes
            </SubmitButton>
            <SubmitButton intent="unpublish" variant="ghost" className="order-1">
              Unpublish
            </SubmitButton>
          </>
        ) : (
          <>
            {/* Enter saves a draft: never publishes by accident */}
            <SubmitButton intent="draft" variant="ghost" className="order-1">
              Save draft
            </SubmitButton>
            <SubmitButton intent="publish" className="order-2">
              Publish
            </SubmitButton>
          </>
        )}
      </div>
    </>
  );
}

/** Web address and search/sharing fields shared by every kind of content. */
export function AddressFields({ slug, seoTitle, seoDescription, base }: { slug: string; seoTitle: string | null; seoDescription: string | null; base: string }) {
  return (
    <details className="group border-t border-rule pt-6">
      <summary className="serif cursor-pointer list-none text-[1.5rem] italic">
        Web address and sharing <span className="text-[1rem] text-dust not-italic group-open:hidden">(optional)</span>
      </summary>
      <div className="mt-5 space-y-5">
        <TextField name="slug" label="Web address" defaultValue={slug} hint={`${base}your-address. Leave empty to make one from the title.`} />
        <TextField name="seo_title" label="Title for search and sharing" defaultValue={seoTitle} hint="Up to 70 characters. Defaults to the title." maxLength={70} />
        <TextField name="seo_description" label="Description for search and sharing" defaultValue={seoDescription} hint="Up to 200 characters. Defaults to the excerpt." maxLength={200} />
      </div>
    </details>
  );
}
