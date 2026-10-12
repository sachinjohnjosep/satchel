"use client";

export default function SiteError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="wrap py-24 text-center md:py-36">
      <p className="meta">Something went wrong</p>
      <h1 className="serif mt-4 text-[clamp(2.25rem,5vw,3.75rem)] leading-tight italic">This page could not be loaded.</h1>
      <p className="mx-auto mt-5 max-w-md text-charcoal">The content store did not respond. Try again in a moment.</p>
      <button type="button" onClick={reset} className="btn mt-8">
        Try again
      </button>
    </div>
  );
}
