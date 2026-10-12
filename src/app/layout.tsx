import type { Metadata, Viewport } from "next";
import "@fontsource-variable/newsreader/opsz.css";
import "@fontsource-variable/newsreader/opsz-italic.css";
import "@fontsource-variable/schibsted-grotesk";
import "./globals.css";
import { getSettings } from "@/lib/data";
import { siteUrl } from "@/lib/env";
import { mediaUrl } from "@/lib/media";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  const og = mediaUrl(s.og_image_path);
  return {
    metadataBase: new URL(siteUrl),
    title: { default: s.site_title, template: `%s | ${s.site_title}` },
    description: s.seo_description || s.tagline,
    alternates: { canonical: "/" },
    openGraph: { siteName: s.site_title, type: "website", ...(og ? { images: [og] } : {}) },
    twitter: { card: og ? "summary_large_image" : "summary" },
  };
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f0e9db" },
    { media: "(prefers-color-scheme: dark)", color: "#1b1814" },
  ],
};

// Applies the saved light/dark choice before first paint, so there is no flash.
const themeScript = `try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  return (
    <html lang="en" data-accent={settings.accent} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
