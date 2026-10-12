"use client";

import { useState } from "react";

type F = { id: string; title: string; release_year: number | null };

/** Choose films for a list and put them in order. */
export function FilmPicker({ name, films, defaultIds }: { name: string; films: F[]; defaultIds: string[] }) {
  const [ids, setIds] = useState(defaultIds.filter((id) => films.some((f) => f.id === id)));
  const [adding, setAdding] = useState("");
  const byId = new Map(films.map((f) => [f.id, f]));
  const available = films.filter((f) => !ids.includes(f.id));
  const move = (i: number, d: number) =>
    setIds((xs) => {
      const next = [...xs];
      const j = i + d;
      if (j < 0 || j >= next.length) return xs;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const label = (f: F) => `${f.title}${f.release_year ? ` (${f.release_year})` : ""}`;

  return (
    <fieldset>
      <legend className="field-label">Films in this list</legend>
      {ids.length ? (
        <ol className="border-b border-rule">
          {ids.map((id, i) => (
            <li key={id} className="flex items-center gap-2 border-t border-rule py-2">
              <span className="w-6 text-right text-dust">{i + 1}</span>
              <span className="flex-1">{byId.get(id) ? label(byId.get(id)!) : "Unknown film"}</span>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => move(i, -1)} disabled={i === 0} aria-label={`Move ${byId.get(id)?.title} up`}>
                Up
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => move(i, 1)} disabled={i === ids.length - 1} aria-label={`Move ${byId.get(id)?.title} down`}>
                Down
              </button>
              <button type="button" className="btn btn-ghost btn-small" onClick={() => setIds((xs) => xs.filter((x) => x !== id))} aria-label={`Remove ${byId.get(id)?.title}`}>
                Remove
              </button>
            </li>
          ))}
        </ol>
      ) : (
        <p className="field-hint">No films yet. Add some below.</p>
      )}
      {available.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <label htmlFor="add-film" className="sr-only">
            Film to add
          </label>
          <select id="add-film" className="input max-w-sm" value={adding} onChange={(e) => setAdding(e.target.value)}>
            <option value="">Choose a film…</option>
            {available.map((f) => (
              <option key={f.id} value={f.id}>
                {label(f)}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-ghost"
            disabled={!adding}
            onClick={() => {
              setIds((xs) => [...xs, adding]);
              setAdding("");
            }}
          >
            Add to list
          </button>
        </div>
      ) : films.length === 0 ? (
        <p className="field-hint mt-2">Add some films first, then come back to build a list.</p>
      ) : null}
      <input type="hidden" name={name} value={ids.join(",")} />
    </fieldset>
  );
}
