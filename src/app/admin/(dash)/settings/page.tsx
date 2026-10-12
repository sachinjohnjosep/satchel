import type { Metadata } from "next";
import { requireAdminPage } from "@/lib/auth";
import { saveSettings } from "@/lib/admin/actions";
import { AdminForm, Panel, SelectField, SubmitButton, TextArea, TextField } from "@/components/admin/ui";
import { ImageUpload } from "@/components/admin/ImageUpload";
import { RichEditor } from "@/components/admin/RichEditor";
import type { SiteSettings } from "@/lib/types";

export const metadata: Metadata = { title: "Settings" };

function CheckList({ name, legend, items, selected, hint }: { name: string; legend: string; items: { id: string; label: string }[]; selected: string[]; hint: string }) {
  return (
    <fieldset>
      <legend className="field-label">{legend}</legend>
      <p className="field-hint -mt-1 mb-2">{hint}</p>
      <div className="max-h-64 overflow-y-auto border border-rule p-2">
        {items.length ? (
          items.map((i) => (
            <label key={i.id} className="flex min-h-10 cursor-pointer items-center gap-3 px-1">
              <input type="checkbox" name={name} value={i.id} defaultChecked={selected.includes(i.id)} className="h-4 w-4 accent-[var(--ink)]" />
              <span className="text-[0.9375rem]">{i.label}</span>
            </label>
          ))
        ) : (
          <p className="field-hint p-2">Nothing published yet.</p>
        )}
      </div>
    </fieldset>
  );
}

export default async function SettingsPage() {
  const { supabase } = await requireAdminPage();
  const [{ data: s }, { data: priv }, { data: photos }, { data: articles }, { data: films }] = await Promise.all([
    supabase.from("site_settings").select("*").eq("id", 1).single(),
    supabase.from("private_settings").select("notify_email").eq("id", 1).maybeSingle(),
    supabase.from("photos").select("id, title").eq("status", "published").order("published_at", { ascending: false }).limit(200),
    supabase.from("articles").select("id, title").eq("status", "published").order("published_at", { ascending: false }).limit(200),
    supabase.from("films").select("id, title, release_year").eq("status", "published").order("title").limit(500),
  ]);
  const settings = (s ?? {}) as SiteSettings;
  const emailReady = Boolean(process.env.RESEND_API_KEY && process.env.NOTIFY_FROM);

  return (
    <div className="max-w-3xl">
      <h1 className="serif mb-8 text-[2.5rem] leading-none italic md:text-[3rem]">Settings</h1>
      <AdminForm action={saveSettings} className="space-y-12">
        <Panel title="Identity">
          <TextField name="site_title" label="Site title" defaultValue={settings.site_title} required />
          <TextField name="tagline" label="Tagline" defaultValue={settings.tagline} hint="Shown in the footer." maxLength={160} />
          <TextArea name="hero_line" label="Home page headline" defaultValue={settings.hero_line} rows={2} maxLength={200} hint="The large opening line on the home page." />
          <SelectField
            name="accent"
            label="Accent colour"
            defaultValue={settings.accent}
            options={[
              { value: "oxblood", label: "Oxblood" },
              { value: "olive", label: "Olive" },
              { value: "faded-red", label: "Faded red" },
            ]}
          />
        </Panel>

        <Panel title="About you">
          <TextArea name="intro" label="Introduction" defaultValue={settings.intro} rows={4} maxLength={1200} hint="Shown on the home page and at the top of About." />
          <RichEditor name="about_body" label="About page" defaultValue={settings.about_body} folder="about" />
          <ImageUpload name="profile_image_path" label="Profile photo" folder="about" defaultPath={settings.profile_image_path} />
          <TextField name="profile_image_alt" label="Describe the profile photo" defaultValue={settings.profile_image_alt} />
          <TextArea
            name="socials"
            label="Social links"
            defaultValue={(settings.socials ?? []).map((x) => `${x.label} | ${x.url}`).join("\n")}
            rows={4}
            hint="One per line, as Label | https://… For example: Instagram | https://instagram.com/yourname"
          />
        </Panel>

        <Panel title="Home page" description="Pinned items show first. Anything not pinned is filled with the most recent.">
          <SelectField
            name="featured_photo_id"
            label="Featured photograph"
            defaultValue={settings.featured_photo_id ?? ""}
            options={[{ value: "", label: "Most recent photograph" }, ...(photos ?? []).map((p) => ({ value: p.id, label: p.title }))]}
          />
          <CheckList name="featured_article_ids" legend="Pinned writing" hint="The first one is shown large." selected={settings.featured_article_ids ?? []} items={(articles ?? []).map((a) => ({ id: a.id, label: a.title }))} />
          <CheckList
            name="featured_film_ids"
            legend="Pinned films"
            hint="Up to four are shown."
            selected={settings.featured_film_ids ?? []}
            items={(films ?? []).map((f) => ({ id: f.id, label: `${f.title}${f.release_year ? ` (${f.release_year})` : ""}` }))}
          />
        </Panel>

        <Panel title="Search and sharing">
          <TextArea name="seo_description" label="Site description" defaultValue={settings.seo_description} rows={2} maxLength={200} hint="Used by search engines and when the site is shared." />
          <ImageUpload name="og_image_path" label="Default sharing image" folder="site" defaultPath={settings.og_image_path} hint="Shown when a page without its own image is shared. 1200 × 630 works best." />
        </Panel>

        <Panel title="Note notifications" description="Get a short email when someone leaves a note. Notes always arrive in your inbox here either way.">
          <TextField name="notify_email" type="email" label="Send notifications to" defaultValue={priv?.notify_email ?? ""} hint="Private. Never shown on the site. Leave empty for no emails." />
          {!emailReady ? (
            <p className="border-l-2 border-[#b07a2a] bg-paper-deep px-4 py-2 text-[0.875rem]">
              Email sending is not set up yet. Add RESEND_API_KEY and NOTIFY_FROM to the hosting environment (SETUP.md, step 7).
            </p>
          ) : null}
        </Panel>

        <div className="sticky bottom-0 z-30 -mx-4 border-t border-rule bg-paper/95 px-4 py-3 backdrop-blur md:static md:mx-0 md:border-0 md:bg-transparent md:p-0">
          <SubmitButton>Save settings</SubmitButton>
        </div>
      </AdminForm>
    </div>
  );
}
