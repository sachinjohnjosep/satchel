"use client";

import { useEffect, useState } from "react";

/** Appears after scrolling well down a long page. */
export function BackToTop() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > window.innerHeight * 1.5);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      onClick={() => {
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        document.getElementById("main")?.focus({ preventScroll: true });
      }}
      className={`fixed right-4 bottom-4 z-40 min-h-11 border border-rule bg-paper px-4 text-[0.875rem] transition-opacity duration-300 md:right-8 md:bottom-8 ${
        show ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
    >
      Back to top
    </button>
  );
}
