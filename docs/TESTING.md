# Testing

There are three layers. All of them passed on the version in this repository.

| Layer | Command | What it covers | Count |
|---|---|---|---|
| Unit | `npm test` | note validation, rate-limit hashing, slugs, reading time, publishing rules, form validation, safe rich-text rendering, music-link parsing | 34 |
| Database | `npm run test:db` | row-level security for visitors, signed-in non-admins and admins; constraints; the rate limiter | 35 checks |
| Browser | `npm run test:e2e` | navigation, SEO tags, 404s, filters, search, lightbox, dark mode, sign-in, the full draft → publish → edit → unpublish → schedule → delete cycle, image upload (and metadata removal), settings, the notes form and inbox, rate limiting, honeypot, direct-API permission checks, backup, Listening (filters, click-to-load player, records and playlists), phone layouts and publishing from a phone | 36 |

## Database checks

Need a local PostgreSQL 15+ server. The script creates a throwaway database, loads the schema with a minimal stand-in for Supabase’s roles, runs `supabase/tests/rls.test.sql`, and drops it.

```bash
PGHOST=localhost PGUSER=postgres npm run test:db
```

## Browser tests

The browser tests need the site running against a database with an admin user. To run them without a Supabase project (or Docker), the repo includes **`e2e/supabase-shim.mjs`**, a small local stand-in for the parts of Supabase the site uses (REST, Auth, Storage). It executes every query in real Postgres under the same role and user claim that Supabase would, so the **real row-level security policies** are what get tested. It is test-only and never deployed.

```bash
export PGHOST=localhost PGUSER=postgres
scripts/e2e-env.sh                 # creates database satchel_e2e with sample content and test users
scripts/e2e-services.sh start      # starts the stand-in on :54321 and `next dev` on :3000 (writes .env.local!; logs in /tmp/satchel-e2e-run)
npx playwright install chromium    # once
npm run test:e2e
scripts/e2e-services.sh stop
```

To test the production build instead: `NEXT_PUBLIC_PREVIEW=1 npx next build`, then `scripts/e2e-services.sh start prod`. (`NEXT_PUBLIC_PREVIEW=1` makes it behave like a Vercel preview, where the note form starts with the sample text `gcng`.)

> `e2e-services.sh` overwrites `.env.local` with test values. Keep your real keys elsewhere (e.g. `.env.production.local`) if you run this locally.

### What the stand-in does *not* prove

Differences between the stand-in and real Supabase are possible, so after deploying, do the short manual check below once.

## After the first deployment: a 10-minute manual check

1. Visit the site signed out: sample content appears, `/admin` sends you to sign-in.
2. Sign in, write a draft, open the public URL in a private window: it should be a 404. Publish: it appears, also on the home page.
3. Upload a photo from your phone and publish it.
4. Leave a note on `/note` from a private window (the Turnstile check should run invisibly); it should arrive in Notes, and by email if configured.
5. In a private window, open `https://<project>.supabase.co/rest/v1/messages?select=*&apikey=<publishable key>`: it must **not** return your notes (expect an error or `[]`).
