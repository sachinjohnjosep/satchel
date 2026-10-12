# Satchel

A personal journal and portfolio for writing, photography, films and short notes, with a private dashboard for publishing from a phone or laptop, and an anonymous “Leave a note” page.

*Satchel* is a working title (a play on Sachin, and the bag you carry notebooks, a camera and ticket stubs in). The film section is **Sachinema**. Both can be renamed in the dashboard.

## Guides

- **[Setting it up](docs/SETUP.md)**: accounts, costs, keys and deployment, step by step
- **[Updating the site](docs/UPDATING.md)**: writing, photos, films, notes and settings from the dashboard
- **[Testing](docs/TESTING.md)**: how the automated tests work and how to run them
- **[Checklist](docs/CHECKLIST.md)**: what’s done, what you still need to configure, known limitations

## How it is built

| Part | Choice |
|---|---|
| Website | Next.js 16 (App Router) + TypeScript, Tailwind CSS 4 |
| Content, sign-in, images | Supabase (Postgres with row-level security, Auth, Storage) |
| Hosting | Vercel |
| Spam protection | Cloudflare Turnstile + honeypot + hashed rate limiting |
| Optional email | Resend |
| Rich text | Tiptap editor, stored as JSON, rendered through an allow-list |

```
src/app/(site)/        public pages: home, writing, photography, cinema, journal, about, search, note
src/app/admin/         dashboard (sign-in, editors, notes inbox, settings, preview, backup)
src/lib/               data loading, validation, auth checks, Supabase clients
src/components/        site and dashboard components
supabase/migrations/   database schema, security rules, storage bucket
supabase/seed.sql      sample content (generated from src/lib/sample.ts)
supabase/tests/        database security checks
e2e/                   browser tests (+ a local Supabase stand-in used only for testing)
tests/                 unit tests
```

### Design

Paper and ink: warm off-white, near-black type, one accent (oxblood by default; olive or faded red in Settings). Newsreader (a high-contrast serif with true italics) for headlines and long reading; Schibsted Grotesk for navigation and small print. Film grain lives in the page background only, so photographs are never overlaid. Sachinema switches to a dark “screening room”. Motion is limited to one settling headline on the home page and responses to your own actions, and it switches off when the device asks for reduced motion. Dark mode follows the device, with a switch in the menu.

### Security in brief

- Every table has row-level security: visitors can only read published items whose date has passed; drafts, notes and the notification email are invisible to them.
- Only accounts listed in `admins` can change anything, checked by the dashboard and again by the database.
- Notes are accepted only through a server action that validates, rate-limits and spam-checks them before storing with the server-only key.
- Stored text is rendered without raw HTML; links are limited to `https:`, `mailto:` and site paths.
- Uploads are limited to JPEG/PNG/WebP/AVIF up to 15 MB, by the browser and by the storage bucket.

## Quick start (local)

```bash
npm install
npm run dev        # preview mode with sample content, no accounts needed
```

Add Supabase keys to `.env.local` (see `.env.example`) to use the dashboard.

| Command | |
|---|---|
| `npm run dev` | local site at http://localhost:3000 |
| `npm run build` | production build |
| `npm test` | unit tests |
| `npm run test:db` | database security checks (needs local Postgres) |
| `npm run test:e2e` | browser tests (see docs/TESTING.md) |
| `npm run seed:generate` | rebuild `supabase/seed.sql` from `src/lib/sample.ts` |
