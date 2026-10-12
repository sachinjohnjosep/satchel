"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

type Opt = { value: string; label: string };

/** A plain GET form: works without JavaScript, and updates instantly with it. */
export function FilmFilters({
  genres,
  decades,
  categories,
  current,
}: {
  genres: string[];
  decades: number[];
  categories: string[];
  current: Record<string, string | undefined>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const apply = (form: HTMLFormElement) => {
    const params = new URLSearchParams();
    new FormData(form).forEach((v, k) => v && params.set(k, String(v)));
    start(() => router.replace(`/cinema${params.size ? `?${params}` : ""}#films`, { scroll: false }));
  };

  const select = (name: string, label: string, options: Opt[], all: string) => (
    <label className="flex flex-col gap-1 text-[0.8125rem] text-screen-dust">
      {label}
      <select
        name={name}
        defaultValue={current[name] ?? ""}
        className="min-h-11 border border-screen-rule bg-transparent px-2 text-[0.9375rem] text-screen-ink [&>option]:bg-screen"
        onChange={(e) => apply(e.currentTarget.form!)}
      >
        <option value="">{all}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );

  return (
    <form method="get" action="/cinema#films" className="flex flex-wrap items-end gap-x-4 gap-y-3" aria-busy={pending}>
      {select("genre", "Genre", genres.map((g) => ({ value: g, label: g })), "Any genre")}
      {select(
        "rating",
        "Rating",
        [5, 4.5, 4, 3, 2].map((r) => ({ value: String(r), label: r === 5 ? "5 only" : `${r} and up` })),
        "Any rating",
      )}
      {select("decade", "Decade", decades.map((d) => ({ value: String(d), label: `${d}s` })), "Any year")}
      {categories.length ? select("category", "Kind", categories.map((c) => ({ value: c, label: c })), "Any kind") : null}
      <label className="flex min-h-11 items-center gap-2 text-[0.9375rem]">
        <input
          type="checkbox"
          name="favourites"
          value="1"
          defaultChecked={Boolean(current.favourites)}
          className="h-4 w-4 accent-[var(--accent)]"
          onChange={(e) => apply(e.currentTarget.form!)}
        />
        Favourites only
      </label>
      <noscript>
        <button className="btn btn-small">Apply</button>
      </noscript>
      {Object.values(current).some(Boolean) ? (
        <Link href="/cinema#films" scroll={false} className="min-h-11 content-center text-[0.9375rem] underline underline-offset-4">
          Clear filters
        </Link>
      ) : null}
    </form>
  );
}
