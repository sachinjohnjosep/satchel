import { NextResponse } from "next/server";
import { getAdmin } from "@/lib/auth";

// Admin-only download of everything in the database as one JSON file:
// a simple backup you can keep alongside your photographs.
export const dynamic = "force-dynamic";

const TABLES = ["site_settings", "articles", "photos", "collections", "films", "film_lists", "journal_entries", "messages"] as const;

export async function GET() {
  const admin = await getAdmin();
  if (!admin) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), format: "satchel-backup-1" };
  for (const t of TABLES) {
    const { data, error } = await admin.supabase.from(t).select("*").limit(10000);
    if (error) return NextResponse.json({ error: `Could not export ${t}.` }, { status: 500 });
    out[t] = data;
  }
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(out, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="satchel-backup-${day}.json"`,
      "Cache-Control": "private, no-store",
    },
  });
}
