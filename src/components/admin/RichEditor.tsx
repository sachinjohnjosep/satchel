"use client";

import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { useId, useRef, useState } from "react";
import type { RichDoc } from "@/lib/types";
import { mediaUrl } from "@/lib/media";
import { uploadImage } from "./ImageUpload";
import { useFieldError } from "./ui";

// Images keep their storage path in the document; the public site turns it into a URL.
const StoredImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      src: {
        default: null,
        renderHTML: (attrs) => ({ src: mediaUrl(attrs.src as string) ?? "" }),
        parseHTML: (el) => el.getAttribute("src"),
      },
    };
  },
});

function Tool({ onClick, active, label, children, disabled }: { onClick: () => void; active?: boolean; label: string; children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={`min-h-10 min-w-10 px-2 text-[0.9375rem] transition-colors ${active ? "bg-ink text-paper" : "hover:bg-paper-deep"} disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

function Toolbar({ editor, folder }: { editor: Editor; folder: string }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      h2: e.isActive("heading", { level: 2 }),
      h3: e.isActive("heading", { level: 3 }),
      quote: e.isActive("blockquote"),
      ul: e.isActive("bulletList"),
      ol: e.isActive("orderedList"),
      link: e.isActive("link"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const file = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [href, setHref] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pendingImg, setPendingImg] = useState<{ path: string; width: number; height: number; alt: string; caption: string } | null>(null);
  const c = () => editor.chain().focus();

  return (
    <div className="sticky top-0 z-10 border-b border-rule bg-paper">
      <div className="flex flex-wrap items-center gap-0.5 p-1" role="toolbar" aria-label="Formatting">
        <Tool label="Bold" active={s.bold} onClick={() => c().toggleBold().run()}>
          <b>B</b>
        </Tool>
        <Tool label="Italic" active={s.italic} onClick={() => c().toggleItalic().run()}>
          <i className="serif">I</i>
        </Tool>
        <Tool label="Heading" active={s.h2} onClick={() => c().toggleHeading({ level: 2 }).run()}>
          H2
        </Tool>
        <Tool label="Small heading" active={s.h3} onClick={() => c().toggleHeading({ level: 3 }).run()}>
          H3
        </Tool>
        <Tool label="Quote" active={s.quote} onClick={() => c().toggleBlockquote().run()}>
          “ ”
        </Tool>
        <Tool label="Bulleted list" active={s.ul} onClick={() => c().toggleBulletList().run()}>
          • List
        </Tool>
        <Tool label="Numbered list" active={s.ol} onClick={() => c().toggleOrderedList().run()}>
          1. List
        </Tool>
        <Tool
          label={s.link ? "Remove link" : "Add link"}
          active={s.link}
          onClick={() => {
            if (s.link) c().unsetLink().run();
            else {
              setHref("https://");
              setLinkOpen(true);
            }
          }}
        >
          Link
        </Tool>
        <Tool label="Line break (for poems)" onClick={() => c().setHardBreak().run()}>
          ↵
        </Tool>
        <Tool label="Divider" onClick={() => c().setHorizontalRule().run()}>
          ⁂
        </Tool>
        <Tool label="Insert image" onClick={() => file.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "Image"}
        </Tool>
        <span className="mx-1 h-6 w-px bg-rule" aria-hidden />
        <Tool label="Undo" onClick={() => c().undo().run()} disabled={!s.canUndo}>
          Undo
        </Tool>
        <Tool label="Redo" onClick={() => c().redo().run()} disabled={!s.canRedo}>
          Redo
        </Tool>
        <input
          ref={file}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="sr-only"
          tabIndex={-1}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            setUploading(true);
            setMsg(null);
            try {
              const u = await uploadImage(f, folder, true);
              setPendingImg({ ...u, alt: "", caption: "" });
            } catch (err) {
              setMsg((err as Error).message);
            } finally {
              setUploading(false);
            }
          }}
        />
      </div>
      {linkOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-rule p-2">
          <label className="sr-only" htmlFor="link-href">
            Link address
          </label>
          <input
            id="link-href"
            className="input max-w-sm !py-1.5"
            value={href}
            autoFocus
            onChange={(e) => setHref(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget.nextElementSibling as HTMLButtonElement)?.click();
              }
              if (e.key === "Escape") setLinkOpen(false);
            }}
          />
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              const v = href.trim();
              if (/^(https?:\/\/|mailto:|\/)/.test(v)) c().extendMarkRange("link").setLink({ href: v }).run();
              else setMsg("Links must start with https://, mailto: or /.");
              setLinkOpen(false);
            }}
          >
            Apply link
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setLinkOpen(false)}>
            Cancel
          </button>
        </div>
      ) : null}
      {pendingImg ? (
        <div className="grid gap-2 border-t border-rule p-2 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
          <label className="text-[0.8125rem]">
            Describe the image (alt text)
            <input className="input mt-1 !py-1.5" autoFocus value={pendingImg.alt} onChange={(e) => setPendingImg({ ...pendingImg, alt: e.target.value })} />
          </label>
          <label className="text-[0.8125rem]">
            Caption (optional)
            <input className="input mt-1 !py-1.5" value={pendingImg.caption} onChange={(e) => setPendingImg({ ...pendingImg, caption: e.target.value })} />
          </label>
          <button
            type="button"
            className="btn btn-small"
            onClick={() => {
              const p = pendingImg;
              c()
                .setImage({ src: p.path, alt: p.alt.slice(0, 300), title: p.caption.slice(0, 300) || undefined, ...({ width: p.width, height: p.height } as object) })
                .run();
              setPendingImg(null);
            }}
          >
            Insert image
          </button>
          <button type="button" className="btn btn-ghost btn-small" onClick={() => setPendingImg(null)}>
            Cancel
          </button>
        </div>
      ) : null}
      {msg ? (
        <p className="border-t border-rule px-3 py-1.5 text-[0.8125rem] text-dust" role="status">
          {msg}
        </p>
      ) : null}
    </div>
  );
}

/** Rich text editor. Writes the document as JSON into a hidden input called `name`. */
export function RichEditor({ name, label, defaultValue, folder = "inline", hint }: { name: string; label: string; defaultValue: RichDoc | null; folder?: string; hint?: string }) {
  const id = useId();
  const hidden = useRef<HTMLInputElement>(null);
  const error = useFieldError(name);
  const initial = defaultValue ?? { type: "doc", content: [] };
  const [json, setJson] = useState(JSON.stringify(initial));

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, protocols: ["https", "http", "mailto"], HTMLAttributes: { rel: "noopener noreferrer nofollow" } },
        underline: false,
        code: false,
      }),
      StoredImage.configure({ inline: false, allowBase64: false }),
    ],
    content: initial,
    editorProps: {
      attributes: {
        class: "prose-journal !max-w-none min-h-[18rem] px-4 py-5 outline-none md:px-6",
        "aria-labelledby": `${id}-label`,
        "aria-multiline": "true",
        role: "textbox",
      },
    },
    onUpdate: ({ editor: e }) => {
      setJson(JSON.stringify(e.getJSON()));
      // Notify the form that there are unsaved changes.
      hidden.current?.dispatchEvent(new Event("input", { bubbles: true }));
    },
  });

  return (
    <div>
      <p id={`${id}-label`} className="field-label">
        {label}
      </p>
      <div className={`border ${error ? "border-[var(--faded-red)]" : "border-rule"} bg-[color-mix(in_srgb,var(--paper)_70%,white_30%)] focus-within:border-ink`}>
        {editor ? <Toolbar editor={editor} folder={folder} /> : <div className="h-12 border-b border-rule" />}
        <EditorContent editor={editor} />
      </div>
      {error ? <p className="mt-1 text-[0.875rem] text-[var(--faded-red)]">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
      <input ref={hidden} type="hidden" name={name} value={json} />
    </div>
  );
}
