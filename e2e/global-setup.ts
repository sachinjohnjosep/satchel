import { execSync } from "node:child_process";

// Clears notes and rate-limit counters so runs are repeatable.
export default function globalSetup() {
  const db = process.env.E2E_DB ?? "satchel_e2e";
  const env = { ...process.env, PGHOST: process.env.PGHOST ?? "/tmp", PGPORT: process.env.PGPORT ?? "54329", PGUSER: process.env.PGUSER ?? "postgres" };
  execSync(`psql -q -d ${db} -c "truncate public.messages, public.rate_limits; delete from public.articles where title like 'E2E %'; delete from public.photos where title like 'E2E %'; delete from public.journal_entries where body like 'E2E %'; delete from public.listens where title like 'E2E %'; delete from public.playlists where title like 'E2E %';"`, { env, stdio: "inherit" });
}
