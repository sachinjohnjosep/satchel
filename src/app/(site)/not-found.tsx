import Link from "next/link";

export default function NotFound() {
  return (
    <div className="wrap py-24 text-center md:py-36">
      <p className="meta">Page not found</p>
      <h1 className="serif mt-4 text-[clamp(2.5rem,6vw,4.5rem)] leading-tight italic">This page has wandered off.</h1>
      <p className="mx-auto mt-5 max-w-md text-charcoal">
        It may have been moved, renamed, or never existed. Try the{" "}
        <Link href="/" className="underline underline-offset-4">home page</Link> or{" "}
        <Link href="/search" className="underline underline-offset-4">search</Link>.
      </p>
    </div>
  );
}
