"use client";

import { useState } from "react";

/** Uses the phone's share sheet where available, otherwise copies the link. */
export function ShareLink({ title }: { title: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  return (
    <button
      type="button"
      className="quiet-link min-h-11 text-[0.9375rem]"
      onClick={async () => {
        const url = window.location.href;
        try {
          if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          setState("copied");
        } catch (e) {
          if ((e as Error).name !== "AbortError") setState("failed");
        }
        setTimeout(() => setState("idle"), 2500);
      }}
    >
      <span aria-live="polite">{state === "copied" ? "Link copied" : state === "failed" ? "Copy failed. Use the address bar." : "Share this"}</span>
    </button>
  );
}
