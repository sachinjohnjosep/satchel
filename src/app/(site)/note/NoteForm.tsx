"use client";

import Script from "next/script";
import { useActionState, useEffect, useRef, useState } from "react";
import { sendNote, type NoteState } from "./actions";
import { NOTE_MAX } from "@/lib/notes";

declare global {
  interface Window {
    turnstile?: { reset: (el?: string | HTMLElement) => void };
  }
}

export function NoteForm({ initialMessage, turnstileSiteKey }: { initialMessage: string; turnstileSiteKey: string }) {
  const [state, action, pending] = useActionState<NoteState, FormData>(sendNote, { status: "idle" });
  const [text, setText] = useState(initialMessage);
  const [lastDraft, setLastDraft] = useState<string | undefined>(undefined);
  const status = useRef<HTMLParagraphElement>(null);
  const done = useRef<HTMLDivElement>(null);
  const widget = useRef<HTMLDivElement>(null);

  // After an error, keep what the visitor wrote (the form resets on submit).
  if (state.status === "error" && state.draft !== undefined && state.draft !== lastDraft) {
    setLastDraft(state.draft);
    setText(state.draft);
  }

  useEffect(() => {
    if (state.status === "error") {
      status.current?.focus();
      if (widget.current) window.turnstile?.reset(widget.current);
    }
    if (state.status === "sent") done.current?.focus();
  }, [state]);

  if (state.status === "sent") {
    return (
      <div ref={done} tabIndex={-1} className="py-10 text-center outline-none" role="status">
        <p className="serif text-[2rem] leading-tight italic md:text-[2.5rem]">Thank you. Your note is on its way.</p>
        <p className="mt-4 text-charcoal">Only I will read it. There is no reply address, so it stays anonymous.</p>
        <button
          type="button"
          className="btn btn-ghost mt-8"
          onClick={() => window.location.reload()}
        >
          Write another note
        </button>
      </div>
    );
  }

  const count = [...text].length;
  const over = count > NOTE_MAX;
  const invalid = state.status === "error";

  return (
    <form action={action} className="space-y-5" noValidate>
      <div>
        <label htmlFor="message" className="sr-only">
          Your note
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={9}
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-invalid={invalid || over ? true : undefined}
          aria-describedby="note-count note-status"
          placeholder="Write anything."
          className="input serif min-h-[14rem] resize-y !text-[1.3125rem] leading-relaxed"
        />
        <p id="note-count" className={`meta mt-1.5 text-right ${over ? "!text-[var(--faded-red)]" : ""}`} aria-live="polite">
          {count} / {NOTE_MAX}
        </p>
      </div>

      {/* Honeypot: hidden from people and screen readers. */}
      <div aria-hidden className="absolute left-[-9999px] h-px w-px overflow-hidden">
        <label>
          Leave this empty
          <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
        </label>
      </div>

      {turnstileSiteKey ? (
        <>
          <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />
          <div ref={widget} className="cf-turnstile" data-sitekey={turnstileSiteKey} data-theme="auto" data-size="flexible" data-appearance="interaction-only" />
        </>
      ) : null}

      <p
        id="note-status"
        ref={status}
        tabIndex={-1}
        role={invalid ? "alert" : undefined}
        className={`min-h-[1.5rem] text-[0.9375rem] outline-none ${invalid ? "text-[var(--faded-red)]" : "text-dust"}`}
      >
        {invalid ? state.message : ""}
      </p>

      <div className="flex justify-center">
        <button type="submit" className="btn min-w-40" disabled={pending || over}>
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}
