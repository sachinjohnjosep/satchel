import type { Metadata } from "next";
import { NoteForm } from "./NoteForm";
import { isProduction, isSupabaseConfigured, turnstileSiteKey } from "@/lib/env";
import { NOTE_SAMPLE_VALUE } from "@/lib/notes";

export const metadata: Metadata = {
  title: "Leave a note",
  description: "A little space for something you want to say.",
  alternates: { canonical: "/note" },
};

export default function NotePage() {
  // Development and preview builds start the field with sample text so the layout
  // can be checked; production starts empty. Nothing is ever sent automatically.
  const initial = isProduction ? "" : NOTE_SAMPLE_VALUE;
  return (
    <div className="wrap pt-14 md:pt-24">
      <div className="mx-auto max-w-[36rem]">
        <header className="text-center">
          <h1 className="serif text-[clamp(2.75rem,7vw,4.75rem)] leading-none italic tracking-[-0.02em]">Leave a note</h1>
          <p className="serif mt-5 text-[1.375rem] text-charcoal">A little space for something you want to say.</p>
        </header>

        <div className="mt-12">
          {isSupabaseConfigured ? (
            <NoteForm initialMessage={initial} turnstileSiteKey={turnstileSiteKey} />
          ) : (
            <p className="border border-dashed border-rule p-6 text-center text-charcoal">
              Notes open once the site is connected to its database. This is a preview.
            </p>
          )}
        </div>

        <section aria-labelledby="privacy-h" className="mt-14 border-t border-rule pt-5 text-[0.875rem] leading-relaxed text-dust">
          <h2 id="privacy-h" className="mb-2 font-semibold text-charcoal">
            What happens to your note
          </h2>
          <p>
            Your note is stored privately and only I can read it. I don’t ask for your name or email and I don’t store your IP
            address. To stop spam, a one-way scrambled version of your connection is kept for at most a day, and Cloudflare
            Turnstile checks that you’re not a bot. Like any website, the hosting provider keeps short-lived server logs.
            Notes are kept until I delete them.
          </p>
        </section>
      </div>
    </div>
  );
}
