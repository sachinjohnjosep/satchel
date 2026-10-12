"use client";

import { createContext, useContext, useEffect, useId, useRef, useState, useSyncExternalStore, useTransition, type ReactNode } from "react";

const noopSubscribe = () => () => {};
import type { SaveState } from "@/lib/admin/actions";

// ── Errors ──────────────────────────────────────────────

const Errors = createContext<Record<string, string>>({});
export const useFieldError = (name: string) => useContext(Errors)[name];

// ── Form wrapper ────────────────────────────────────────

/**
 * Submits without resetting the form (so nothing typed is lost on an error),
 * reports the result, and warns before leaving with unsaved changes.
 */
export function AdminForm({
  action,
  children,
  className = "",
  initialMessage,
}: {
  action: (prev: SaveState, form: FormData) => Promise<SaveState>;
  children: ReactNode;
  className?: string;
  initialMessage?: string;
}) {
  const [state, setState] = useState<SaveState>(initialMessage ? { ok: true, message: initialMessage } : {});
  const [pending, start] = useTransition();
  const [dirty, setDirty] = useState(false);
  const banner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  useEffect(() => {
    if (state.error) banner.current?.focus();
  }, [state]);

  return (
    <Errors.Provider value={state.fields ?? {}}>
      <form
        className={className}
        noValidate
        aria-busy={pending}
        onInput={() => setDirty(true)}
        onChange={() => setDirty(true)}
        onSubmit={(e) => {
          e.preventDefault();
          const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
          const data = new FormData(e.currentTarget, submitter);
          start(async () => {
            setDirty(false);
            const result = await action(state, data);
            // A redirect (new item, delete) never returns here.
            if (result) {
              setState(result);
              if (result.error) setDirty(true);
            }
          });
        }}
      >
        <div ref={banner} tabIndex={-1} className="outline-none" aria-live="polite">
          {state.error ? (
            <p role="alert" className="mb-6 border-l-2 border-[var(--faded-red)] bg-paper-deep px-4 py-3 text-[0.9375rem]">
              {state.error}
            </p>
          ) : null}
        </div>
        <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
        <Toast state={state} />
      </form>
    </Errors.Provider>
  );
}

const PendingContext = createContext(false);
export const usePending = () => useContext(PendingContext);

function Toast({ state }: { state: SaveState }) {
  const [visible, setVisible] = useState(false);
  const [lastKey, setLastKey] = useState<number | string | undefined>(undefined);
  const key = state.savedAt ?? state.message;
  if (state.ok && state.message && key !== lastKey) {
    setLastKey(key);
    setVisible(true);
  }
  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => setVisible(false), 3200);
    return () => clearTimeout(t);
  }, [visible, lastKey]);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 md:bottom-8">
      {visible ? (
        <p className="bg-ink px-4 py-2.5 text-[0.9375rem] text-paper shadow-lg" style={{ animation: "settle 0.3s var(--ease) both" }}>
          {state.message}
        </p>
      ) : null}
    </div>
  );
}

// ── Fields ──────────────────────────────────────────────

function Wrap({ id, label, hint, name, children }: { id: string; label: string; hint?: ReactNode; name: string; children: ReactNode }) {
  const error = useFieldError(name);
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-err`} className="mt-1 text-[0.875rem] text-[var(--faded-red)]">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="field-hint">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

type FieldProps = {
  name: string;
  label: string;
  hint?: ReactNode;
  defaultValue?: string | number | null;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

export function TextField({ type = "text", list, inputMode, maxLength, ...p }: FieldProps & { type?: string; list?: string; inputMode?: "numeric" | "decimal" | "text"; maxLength?: number }) {
  const id = useId();
  const error = useFieldError(p.name);
  return (
    <Wrap id={id} label={p.label} hint={p.hint} name={p.name}>
      <input
        id={id}
        name={p.name}
        type={type}
        list={list}
        inputMode={inputMode}
        maxLength={maxLength}
        defaultValue={p.defaultValue ?? ""}
        required={p.required}
        placeholder={p.placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : p.hint ? `${id}-hint` : undefined}
        className={`input ${p.className ?? ""}`}
      />
    </Wrap>
  );
}

export function TextArea({ rows = 4, maxLength, ...p }: FieldProps & { rows?: number; maxLength?: number }) {
  const id = useId();
  const error = useFieldError(p.name);
  const [len, setLen] = useState(String(p.defaultValue ?? "").length);
  return (
    <Wrap
      id={id}
      label={p.label}
      name={p.name}
      hint={
        maxLength ? (
          <>
            {p.hint ? <>{p.hint} </> : null}
            <span className={len > maxLength ? "text-[var(--faded-red)]" : ""}>
              {len} / {maxLength}
            </span>
          </>
        ) : (
          p.hint
        )
      }
    >
      <textarea
        id={id}
        name={p.name}
        rows={rows}
        defaultValue={p.defaultValue ?? ""}
        required={p.required}
        placeholder={p.placeholder}
        onInput={(e) => setLen(e.currentTarget.value.length)}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-err` : `${id}-hint`}
        className={`input resize-y ${p.className ?? ""}`}
      />
    </Wrap>
  );
}

export function SelectField({ options, ...p }: FieldProps & { options: { value: string; label: string }[] }) {
  const id = useId();
  return (
    <Wrap id={id} label={p.label} hint={p.hint} name={p.name}>
      <select id={id} name={p.name} defaultValue={String(p.defaultValue ?? "")} className="input">
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Wrap>
  );
}

export function Checkbox({ name, label, defaultChecked, hint }: { name: string; label: string; defaultChecked?: boolean; hint?: string }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-1 h-5 w-5 shrink-0 accent-[var(--ink)]" />
      <span>
        <span className="block text-[0.9375rem] font-[550]">{label}</span>
        {hint ? <span className="field-hint block">{hint}</span> : null}
      </span>
    </label>
  );
}

/** Comma-separated values with suggestions from what is already in use. */
export function TagsField({ suggestions, ...p }: FieldProps & { suggestions: string[] }) {
  const listId = useId();
  return (
    <>
      <TextField {...p} list={suggestions.length ? listId : undefined} />
      {suggestions.length ? (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      ) : null}
    </>
  );
}

/** A local date-time picker that submits an exact ISO timestamp. */
export function DateTimeField({ name, label, defaultValue, hint }: { name: string; label: string; defaultValue: string | null; hint?: string }) {
  const id = useId();
  const toLocal = (iso: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };
  // Local time is only known in the browser, so the field fills in after hydration.
  const inBrowser = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const [edited, setEdited] = useState<string | null>(null);
  const [iso, setIso] = useState(defaultValue ?? "");
  const local = edited ?? (inBrowser ? toLocal(defaultValue) : null);
  return (
    <Wrap id={id} label={label} hint={hint} name={name}>
      <input
        id={id}
        type="datetime-local"
        className="input"
        value={local ?? ""}
        disabled={local === null}
        onChange={(e) => {
          setEdited(e.target.value);
          setIso(e.target.value ? new Date(e.target.value).toISOString() : "");
        }}
      />
      <input type="hidden" name={name} value={iso} />
    </Wrap>
  );
}

// ── Layout helpers ──────────────────────────────────────

export function Panel({ title, children, description }: { title?: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-5 border-t border-rule pt-6">
      {title ? (
        <div>
          <h2 className="serif text-[1.5rem] italic">{title}</h2>
          {description ? <p className="field-hint">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function SubmitButton({ intent, children, variant = "primary", className = "" }: { intent?: string; children: ReactNode; variant?: "primary" | "ghost" | "danger"; className?: string }) {
  const pending = usePending();
  return (
    <button
      type="submit"
      name={intent ? "intent" : undefined}
      value={intent}
      disabled={pending}
      className={`btn ${variant === "ghost" ? "btn-ghost" : variant === "danger" ? "btn-danger" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

/** Two-step delete without browser dialogs. */
export function DeleteButton({ onDelete, label = "Delete" }: { onDelete: () => Promise<SaveState | void>; label?: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  if (!confirming)
    return (
      <button type="button" className="btn btn-danger btn-small" onClick={() => setConfirming(true)}>
        {label}
      </button>
    );
  return (
    <div className="flex flex-wrap items-center gap-3" role="group" aria-label="Confirm delete">
      <span className="text-[0.875rem]">This can’t be undone.</span>
      <button
        type="button"
        className="btn btn-danger btn-small"
        disabled={pending}
        autoFocus
        onClick={() =>
          start(async () => {
            const r = await onDelete();
            if (r && r.error) setError(r.error);
          })
        }
      >
        {pending ? "Deleting…" : `Yes, ${label.toLowerCase()}`}
      </button>
      <button type="button" className="btn btn-ghost btn-small" onClick={() => setConfirming(false)}>
        Keep it
      </button>
      {error ? <p className="w-full text-[0.875rem] text-[var(--faded-red)]">{error}</p> : null}
    </div>
  );
}
