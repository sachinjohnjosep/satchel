import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getSettings } from "@/lib/data";
import { mediaUrl, safeHref } from "@/lib/media";
import { RichText } from "@/components/RichText";
import { SampleMark } from "@/components/site/SampleMark";

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSettings();
  return { title: "About", description: s.intro.slice(0, 160), alternates: { canonical: "/about" } };
}

export default async function About() {
  const s = await getSettings();
  const portrait = mediaUrl(s.profile_image_path);
  const socials = s.socials.filter((x) => safeHref(x.url));
  const isSample = s.intro.startsWith("Sample");
  return (
    <div className="wrap pt-10 md:pt-16">
      <div className="grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <h1 className="serif text-[clamp(3rem,8vw,6rem)] leading-[0.95] tracking-[-0.02em]">About</h1>
          {portrait ? (
            <div className="relative mt-8 aspect-[4/5] max-w-sm overflow-hidden bg-paper-deep">
              <Image src={portrait} alt={s.profile_image_alt ?? ""} fill sizes="(min-width: 768px) 30vw, 90vw" className="object-cover" priority />
            </div>
          ) : (
            <div className="mt-8 flex aspect-[4/5] max-w-sm items-end border border-dashed border-rule p-4">
              <p className="meta">Profile photo goes here. Add one in Settings.</p>
            </div>
          )}
          {socials.length ? (
            <ul className="mt-8 space-y-1.5">
              {socials.map((x) => (
                <li key={x.url}>
                  <a href={safeHref(x.url)!} rel="me noopener noreferrer" target="_blank" className="quiet-link">
                    {x.label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <div className="md:col-span-7 md:col-start-6 md:pt-6">
          <p className="serif text-[1.625rem] leading-snug [text-wrap:pretty] md:text-[2rem]">{s.intro}</p>
          {isSample ? <SampleMark show className="mt-4" /> : null}
          <RichText doc={s.about_body} className="prose-journal mt-10" />
          <p className="mt-12 border-t border-rule pt-5 text-charcoal">
            Want to say something?{" "}
            <Link href="/note" className="underline decoration-accent underline-offset-4 hover:text-accent">
              Leave an anonymous note
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
