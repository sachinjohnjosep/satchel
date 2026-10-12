"use client";

import { useSyncExternalStore } from "react";

type Theme = "light" | "dark";

function current(): Theme {
  const set = document.documentElement.dataset.theme;
  if (set === "light" || set === "dark") return set;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", cb);
  };
}

/** Switches between light and dark. The choice is remembered on this device only. */
export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, current, () => null);
  if (!theme) return <span className="inline-block min-h-11 w-[6.5rem]" aria-hidden />;
  const next: Theme = theme === "dark" ? "light" : "dark";
  return (
    <button
      type="button"
      className="quiet-link min-h-11 text-[0.9375rem] text-dust hover:text-ink"
      onClick={() => {
        document.documentElement.dataset.theme = next;
        try {
          localStorage.setItem("theme", next);
        } catch {
          // Storage unavailable (private mode): the choice lasts for this visit.
        }
        listeners.forEach((l) => l());
      }}
    >
      {next === "dark" ? "Dark mode" : "Light mode"}
    </button>
  );
}
