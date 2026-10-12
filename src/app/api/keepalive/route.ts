import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabasePublishableKey, supabaseUrl } from "@/lib/env";

// Called once a day by Vercel Cron (vercel.json) so a quiet week doesn't let the
// free Supabase project pause. Vercel sends "Authorization: Bearer $CRON_SECRET".
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  if (!isSupabaseConfigured) return NextResponse.json({ ok: false, reason: "not configured" }, { status: 503 });
  const db = createClient(supabaseUrl, supabasePublishableKey, { auth: { persistSession: false } });
  const { error } = await db.from("site_settings").select("id").limit(1);
  return NextResponse.json({ ok: !error }, { status: error ? 502 : 200 });
}
