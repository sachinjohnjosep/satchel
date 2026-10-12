# Setting up Satchel

This takes about 45 minutes the first time. You need four free accounts; a fifth (Resend) is optional.

| Service | What it does here | Cost |
|---|---|---|
| **GitHub** | Holds the code. Vercel deploys from it. | Free (you have it) |
| **Supabase** | Database, sign-in for the dashboard, image storage | Free plan |
| **Vercel** | Hosts the website with HTTPS | Free Hobby plan (personal, non-commercial use) |
| **Cloudflare Turnstile** | Spam check on “Leave a note” | Free |
| **Resend** (optional) | Emails you when a note arrives | Free plan |
| Domain (later) | Your own address instead of `*.vercel.app` | About €10–15 a year |

**Free-plan limits worth knowing** (check the providers’ pricing pages, these change): Supabase gives 500 MB of database and 1 GB of file storage, and **pauses a free project after a week with no activity**. A daily keep-alive job is included (step 6) to reduce that risk; if the project ever pauses, open it in Supabase and click **Restore**. 1 GB is roughly 300–500 photographs at the sizes the uploader produces. Resend’s free plan allows 3,000 emails a month (100 a day).

---

## 1. Create the Supabase project

1. Sign up at [supabase.com](https://supabase.com) and click **New project**.
2. Name it `satchel`, choose a strong database password (store it in your password manager), and pick the region **Central EU (Frankfurt)**.
3. Wait for it to finish setting up.

## 2. Create the database

In the Supabase dashboard, open **SQL Editor → New query**. Run these three files from the repository, **in this order**, by pasting each one in and clicking **Run**:

1. `supabase/migrations/20261012000000_init.sql`: tables and security rules
2. `supabase/migrations/20261012000100_storage.sql`: the image bucket and its rules
3. `supabase/seed.sql`: sample content, clearly marked “Sample” (optional, but useful for seeing how everything looks)

Each should finish with “Success. No rows returned.”

## 3. Lock down sign-ups

Only you should be able to sign in.

1. **Authentication → Sign In / Providers** (under “Configuration”): turn **off** “Allow new users to sign up”. Keep the Email provider enabled.
2. **Authentication → Users → Add user → Create new user**: enter your email and a long password, and tick **Auto Confirm User**.

## 4. Make yourself the admin

Back in **SQL Editor**, run (with your email):

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'you@example.com';
```

It should say “1 row affected”. Being signed in is not enough on its own: the database only accepts changes from accounts in this list.

## 5. Get the keys

**Project Settings → API Keys**:

- **Publishable key** (`sb_publishable_…`) → `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Safe to be public.
- **Secret key** (`sb_secret_…`) → `SUPABASE_SECRET_KEY`. **Never share this or put it in client code.** It is only used on the server to store notes.

Older projects show “anon” and “service_role” keys under *Legacy API keys*; those work too.

**Project Settings → Data API**: the **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`.

## 6. Deploy on Vercel

1. Sign up at [vercel.com](https://vercel.com) with your GitHub account.
2. **Add New → Project**, import `sachinjohnjosep/satchel`. Vercel detects Next.js; leave the build settings alone.
3. Before clicking Deploy, open **Environment Variables** and add (see `.env.example` for the full list):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | from step 5 |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | from step 5 |
   | `SUPABASE_SECRET_KEY` | from step 5 |
   | `NEXT_PUBLIC_SITE_URL` | `https://satchel.vercel.app` for now (your real address once known) |
   | `RATE_LIMIT_SALT` | any long random string |
   | `CRON_SECRET` | any long random string (enables the daily keep-alive) |

   For a random string, a password manager’s generator is fine, or run `openssl rand -hex 32`.
4. Click **Deploy**. When it finishes, open the site; you should see the sample content.
5. Go to `/admin`, sign in with the account from step 3.

> Changing an environment variable later? Vercel only applies it to new deployments: **Deployments → ⋯ → Redeploy**.

## 7. Turn on the note spam check (Cloudflare Turnstile)

In production, notes are **refused until this is set up**, so spam can’t get in by default.

1. Sign up at [dash.cloudflare.com](https://dash.cloudflare.com), open **Turnstile → Add widget**.
2. Name it `satchel`, add your site’s hostname (e.g. `satchel.vercel.app`; add your own domain later), widget mode **Managed**.
3. Copy the **Site key** → `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and the **Secret key** → `TURNSTILE_SECRET_KEY` in Vercel. Redeploy.
4. Leave a test note on `/note`; it should appear in **Dashboard → Notes**.

## 8. Optional: email when a note arrives (Resend)

1. Sign up at [resend.com](https://resend.com) and create an **API key** (permission: “Sending access”).
2. In Vercel add `RESEND_API_KEY`, and `NOTIFY_FROM` = `Satchel <onboarding@resend.dev>`. Redeploy.
3. In **Dashboard → Settings → Note notifications**, enter the address to notify and save.

Until you verify your own domain in Resend, its shared `onboarding@resend.dev` sender can only deliver to the email address you signed up to Resend with, so use that address in step 3. Once you have a domain, verify it in Resend and change `NOTIFY_FROM` to e.g. `Satchel <notes@yourdomain.com>`.

The email contains the note’s text (up to 600 characters) and a link to your inbox. If you’d rather not have note contents pass through your email provider, leave this step out and check the dashboard instead.

## 9. When you choose a domain

1. Vercel → Project → **Settings → Domains → Add**, follow the DNS instructions.
2. Update `NEXT_PUBLIC_SITE_URL` to the new address and redeploy.
3. Add the domain to the Turnstile widget’s hostnames.
4. Change the site title, headline and colour in **Dashboard → Settings**: no code needed.

---

## Running it on your own computer (optional)

You need [Node.js 22](https://nodejs.org).

```bash
git clone https://github.com/sachinjohnjosep/satchel.git
cd satchel
npm install
cp .env.example .env.local   # fill in the Supabase values
npm run dev                  # http://localhost:3000
```

Without any Supabase values, the site runs in **preview mode** with the built-in sample content (read-only, dashboard disabled), which is handy for design work.

## What gets stored, and where

- **Content and settings:** the Supabase database (Frankfurt). Keep your own copy: **Dashboard → Settings → Download a backup** saves everything (including notes) as one file. Do it every month or so. Paid Supabase plans add automatic daily backups.
- **Images:** the Supabase `media` bucket. Uploads are re-saved without location/camera data unless you untick that option.
- **Notes:** only the text and a timestamp. No name, email or IP address. Rate limiting stores a salted one-way hash of the connection, deleted after a day.
- **Notification email address:** a separate private table that visitors can never read.
- **Hosting logs:** Vercel keeps short-lived request logs (including IP addresses) like any host. The note page says so.
