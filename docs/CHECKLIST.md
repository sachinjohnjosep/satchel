# Checklist

## Built and tested

**Pages**
- [x] Home: headline, introduction, featured photograph, writing, recent photographs, films, journal, note invitation, footer. Updates automatically when you publish.
- [x] Writing: list with category filter and tags; article pages with subtitle, cover, category, tags, date, reading time, related pieces, share button, structured data
- [x] Photography: uneven grid, full-screen viewer (keyboard and swipe), individual photo pages, categories, tags, places, photo stories
- [x] Sachinema: favourites, curated lists, filters by genre, rating, decade, kind and favourites; film pages with rating, short and long review; title cards when there is no poster
- [x] Listening: albums and songs with ratings and notes, On repeat row, playlists, filters by kind and genre, click-to-load players for Spotify, YouTube, Apple Music and SoundCloud
- [x] Journal: short entries (thought, observation, quotation, update) with their own pages
- [x] About: introduction, rich text, profile photo, social links, all editable
- [x] Leave a note: single field, Send button, privacy explanation, confirmation; no name or email
- [x] Search across all sections; 404 page; loading and error states; back-to-top; dark mode; mobile menu

**Dashboard**
- [x] Password sign-in; admin allow-list; non-admins refused; signed-out visitors redirected
- [x] Create, edit, preview, publish, unpublish, schedule and delete for writing, photographs, photo stories, films, film lists, records, playlists and journal entries
- [x] Rich text editor with headings, quotes, lists, links, line breaks for poems, dividers and images (with alt text and captions)
- [x] Image uploads from phone or laptop, with type/size checks and removal of location data
- [x] Categories and tags with suggestions; web address and search/sharing fields per item
- [x] Home page featured content, site title, headline, intro, About page, profile photo, accent colour, social links, sharing image
- [x] Notes inbox: unread count, mark read/unread, archive, delete
- [x] Overview: counts, recently edited, scheduled and drafts, sample-content reminder
- [x] Backup download
- [x] Works on phones (sticky save bar, no sideways scrolling)

**Security and privacy**
- [x] Row-level security on every table, tested for visitors, non-admins and admins
- [x] Notes: server-side validation, 2,000-character limit (also enforced by the database), honeypot, Turnstile (required in production), rate limit of 5 per 10 minutes per connection using a salted daily-rotating hash, no IP stored
- [x] Secret key used only on the server, in one place; build fails if it is imported into browser code
- [x] Rich text rendered through an allow-list; scripts in notes or content are shown as text
- [x] Upload limits enforced by the browser and the storage bucket
- [x] Security headers; dashboard excluded from search engines; preview deployments not indexed
- [x] `gcng` sample value only in development and preview builds; never sent automatically, and refused if sent

**Search engines and performance**
- [x] Unique titles, descriptions, canonical URLs and sharing tags on every page; sitemap; robots.txt
- [x] Images served in modern formats at the right size, lazy-loaded below the fold
- [x] Pages pre-rendered and refreshed on publish (and every 5 minutes)
- [x] No tracking or analytics scripts

## You still need to do

- [ ] Create the Supabase project, run the three SQL files, create your user and add it to `admins` (SETUP.md 1–5)
- [ ] Deploy on Vercel with the environment variables (SETUP.md 6)
- [ ] Set up Turnstile, otherwise notes are refused in production (SETUP.md 7)
- [ ] Optional: Resend for note emails (SETUP.md 8)
- [ ] Do the 10-minute manual check after deploying (TESTING.md)
- [ ] Replace the sample content and write your own About page
- [ ] Choose a domain and final name (SETUP.md 9)

## Known limitations

- **Tested against a local stand-in, not real Supabase.** Docker wasn’t available while building this, so the dashboard and note tests ran against a small local imitation of Supabase that uses the real database rules. The real service could differ in small ways; the manual check in TESTING.md covers this.
- **Email notifications are not tested.** They need your Resend account. Failures are logged and never affect the visitor.
- **Turnstile is not tested end to end.** It needs real Cloudflare keys. The server refuses notes without a valid token in production.
- **Free Supabase projects pause after a week without activity.** A daily keep-alive is included (needs `CRON_SECRET`), but if the site ever shows “This page could not be loaded”, open Supabase and click Restore.
- **Single author.** One admin account is the intended setup (more can be added to `admins`). There is no revision history: saving replaces the previous version, so use Preview, and download backups.
- **Deleting an item does not delete its uploaded images** from storage (so a photo used elsewhere can’t break). Unused files can be removed in Supabase → Storage.
- **Search** matches words in titles and text; it is not fuzzy and doesn’t rank by relevance.
- **Scheduled posts** go live within about five minutes of their time, not to the second.
- **No comments, likes or visitor accounts**, as requested.
