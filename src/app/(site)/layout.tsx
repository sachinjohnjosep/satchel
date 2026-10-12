import { ViewTransition } from "react";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { BackToTop } from "@/components/site/BackToTop";
import { getSettings } from "@/lib/data";
import { isSupabaseConfigured } from "@/lib/env";

// Public pages are cached and refreshed at least every 5 minutes;
// publishing from the dashboard refreshes them immediately.
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      {!isSupabaseConfigured ? (
        <p className="bg-ink px-4 py-2 text-center text-[0.8125rem] text-paper">
          Preview mode: showing sample content. Connect Supabase to publish your own.
        </p>
      ) : null}
      <Header title={settings.site_title} />
      <ViewTransition>
        <main id="main" tabIndex={-1} className="outline-none">
          {children}
        </main>
      </ViewTransition>
      <Footer settings={settings} />
      <BackToTop />
    </>
  );
}
