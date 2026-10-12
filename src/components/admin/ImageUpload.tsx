"use client";

import { useId, useRef, useState } from "react";
import { browserClient } from "@/lib/supabase/browser";
import { ALLOWED_IMAGE_TYPES, MAX_IMAGE_BYTES, MEDIA_BUCKET, mediaUrl } from "@/lib/media";
import { useFieldError } from "./ui";

type Uploaded = { path: string; width: number; height: number };

const MAX_EDGE = 4096; // keeps re-encoding within phone browser canvas limits

async function dimensions(file: Blob): Promise<{ width: number; height: number }> {
  const bmp = await createImageBitmap(file);
  const d = { width: bmp.width, height: bmp.height };
  bmp.close();
  return d;
}

/** Re-encodes through a canvas, which drops EXIF/GPS metadata. Applies orientation. */
async function stripMetadata(file: File): Promise<{ blob: Blob; width: number; height: number; type: string }> {
  const bmp = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_EDGE / Math.max(bmp.width, bmp.height));
  const width = Math.round(bmp.width * scale);
  const height = Math.round(bmp.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.drawImage(bmp, 0, 0, width, height);
  bmp.close();
  const type = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("encode"))), type, 0.92));
  return { blob, width, height, type };
}

export async function uploadImage(file: File, folder: string, strip: boolean): Promise<Uploaded> {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Use a JPEG, PNG, WebP or AVIF image. On iPhone, choose “Most Compatible” in camera settings or export as JPEG.");
  }
  if (file.size > MAX_IMAGE_BYTES) throw new Error("Images can be up to 15 MB. Export a smaller version and try again.");

  let blob: Blob = file;
  let type = file.type;
  let size: { width: number; height: number };
  if (strip && (file.type === "image/jpeg" || file.type === "image/png" || file.type === "image/webp")) {
    const out = await stripMetadata(file);
    blob = out.blob;
    type = out.type;
    size = { width: out.width, height: out.height };
  } else {
    size = await dimensions(file);
  }
  const ext = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" }[type] ?? "jpg";
  const now = new Date();
  const path = `${folder}/${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;

  const { error } = await browserClient().storage.from(MEDIA_BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    if (/row-level security|unauthori/i.test(error.message)) throw new Error("Upload was refused. Your session may have ended; sign in again.");
    throw new Error("Upload failed. Check your connection and try again.");
  }
  return { path, ...size };
}

/**
 * Picks, checks and uploads one image, then fills hidden inputs:
 * `name` (storage path) and optionally `${name}`'s width/height fields.
 */
export function ImageUpload({
  name,
  label,
  folder,
  defaultPath,
  sizeFields,
  hint,
  onUploaded,
  allowRemove = true,
}: {
  name: string;
  label: string;
  folder: string;
  defaultPath?: string | null;
  sizeFields?: { width: string; height: string; defaultWidth?: number; defaultHeight?: number };
  hint?: string;
  onUploaded?: (u: Uploaded, file: File) => void;
  allowRemove?: boolean;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(defaultPath ?? "");
  const [size, setSize] = useState({ w: sizeFields?.defaultWidth ?? 0, h: sizeFields?.defaultHeight ?? 0 });
  const [preview, setPreview] = useState<string | null>(mediaUrl(defaultPath));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [strip, setStrip] = useState(true);
  const fieldError = useFieldError(name);

  async function onFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setBusy(true);
    const local = URL.createObjectURL(file);
    setPreview(local);
    try {
      const u = await uploadImage(file, folder, strip);
      setPath(u.path);
      setSize({ w: u.width, h: u.height });
      onUploaded?.(u, file);
      // Let the surrounding form know something changed.
      input.current?.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {
      setError((e as Error).message);
      setPreview(mediaUrl(path));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div>
      <p className="field-label" id={`${id}-label`}>
        {label}
      </p>
      <div
        className={`relative flex min-h-40 items-center justify-center overflow-hidden border border-dashed ${fieldError || error ? "border-[var(--faded-red)]" : "border-rule"} bg-paper-deep/50`}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          onFile(e.dataTransfer.files[0]);
        }}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className={`max-h-80 w-auto object-contain ${busy ? "opacity-50" : ""}`} />
        ) : (
          <p className="p-6 text-center text-[0.9375rem] text-dust">No image yet. Choose one, or drop it here.</p>
        )}
        {busy ? <p className="absolute inset-x-0 bottom-0 bg-ink/80 py-2 text-center text-[0.875rem] text-paper" role="status">Uploading…</p> : null}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label htmlFor={id} className="btn btn-ghost btn-small cursor-pointer">
          {path ? "Replace image" : "Choose image"}
        </label>
        <input
          ref={input}
          id={id}
          type="file"
          accept={ALLOWED_IMAGE_TYPES.join(",")}
          className="sr-only"
          aria-labelledby={`${id}-label`}
          onChange={(e) => onFile(e.target.files?.[0])}
          disabled={busy}
        />
        {path && allowRemove ? (
          <button
            type="button"
            className="btn btn-ghost btn-small"
            onClick={() => {
              setPath("");
              setPreview(null);
              input.current?.dispatchEvent(new Event("change", { bubbles: true }));
            }}
          >
            Remove
          </button>
        ) : null}
        <label className="flex items-center gap-2 text-[0.875rem]">
          <input type="checkbox" checked={strip} onChange={(e) => setStrip(e.target.checked)} className="h-4 w-4 accent-[var(--ink)]" />
          Remove location and camera data
        </label>
      </div>
      {error || fieldError ? (
        <p role="alert" className="mt-2 text-[0.875rem] text-[var(--faded-red)]">
          {error ?? fieldError}
        </p>
      ) : (
        <p className="field-hint">
          {hint ?? "JPEG, PNG, WebP or AVIF, up to 15 MB."} Removing metadata re-saves the image (very large images are resized to 4096 px); untick it to upload the original file untouched.
        </p>
      )}
      <input type="hidden" name={name} value={path} />
      {sizeFields ? (
        <>
          <input type="hidden" name={sizeFields.width} value={size.w || ""} />
          <input type="hidden" name={sizeFields.height} value={size.h || ""} />
        </>
      ) : null}
    </div>
  );
}
