-- Satchel: initial schema, row-level security and storage.
-- Run in the Supabase SQL editor (or `supabase db push`). Safe to read top to bottom.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────
-- Admins: only users listed here can write content or read notes.
-- ─────────────────────────────────────────────────────────────
create table public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;
-- No policies: the table is invisible to the public and to signed-in users.
-- is_admin() reads it with definer rights.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- Shared columns are repeated per table so each can evolve on its own.

-- ─────────────────────────────────────────────────────────────
-- Writing
-- ─────────────────────────────────────────────────────────────
create table public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  subtitle text check (char_length(subtitle) <= 300),
  excerpt text check (char_length(excerpt) <= 600),
  body jsonb not null default '{"type":"doc","content":[]}',
  cover_path text,
  cover_alt text,
  category text,
  tags text[] not null default '{}',
  reading_minutes int not null default 1,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Photography
-- ─────────────────────────────────────────────────────────────
create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  intro text,
  body jsonb,
  cover_photo_id uuid,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.photos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  caption text,
  location text,
  image_path text not null,
  alt text not null default '',
  width int not null check (width > 0),
  height int not null check (height > 0),
  category text,
  tags text[] not null default '{}',
  taken_on date,
  collection_id uuid references public.collections (id) on delete set null,
  position int not null default 0,
  has_page boolean not null default true,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.collections
  add constraint collections_cover_fk foreign key (cover_photo_id)
  references public.photos (id) on delete set null;

-- ─────────────────────────────────────────────────────────────
-- Cinema
-- ─────────────────────────────────────────────────────────────
create table public.films (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  release_year int check (release_year between 1870 and 2200),
  director text,
  poster_path text,
  poster_credit text,
  rating numeric(2, 1) check (rating >= 0 and rating <= 5 and (rating * 2) = floor(rating * 2)),
  short_review text check (char_length(short_review) <= 600),
  body jsonb,
  genres text[] not null default '{}',
  tags text[] not null default '{}',
  category text,
  is_favourite boolean not null default false,
  watched_on date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.film_lists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  film_ids uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Journal
-- ─────────────────────────────────────────────────────────────
create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  body text not null check (char_length(body) between 1 and 5000),
  kind text not null default 'thought' check (kind in ('thought', 'observation', 'quotation', 'update')),
  quote_source text,
  tags text[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Site settings (single row, id = 1)
-- ─────────────────────────────────────────────────────────────
create table public.site_settings (
  id int primary key default 1 check (id = 1),
  site_title text not null default 'Satchel',
  tagline text not null default '',
  hero_line text not null default '',
  intro text not null default '',
  about_body jsonb not null default '{"type":"doc","content":[]}',
  profile_image_path text,
  profile_image_alt text,
  accent text not null default 'oxblood' check (accent in ('oxblood', 'olive', 'faded-red')),
  socials jsonb not null default '[]',
  featured_photo_id uuid references public.photos (id) on delete set null,
  featured_article_ids uuid[] not null default '{}',
  featured_film_ids uuid[] not null default '{}',
  seo_description text not null default '',
  og_image_path text,
  updated_at timestamptz not null default now()
);

-- Private settings live apart so the notification address is never public.
create table public.private_settings (
  id int primary key default 1 check (id = 1),
  notify_email text,
  updated_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────
-- Anonymous notes. No name, email or IP is stored.
-- ─────────────────────────────────────────────────────────────
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  archived boolean not null default false
);

-- Rate limiting: keyed by a salted, daily-rotating hash (never a raw IP).
create table public.rate_limits (
  key_hash text not null,
  window_start timestamptz not null,
  hits int not null default 1,
  primary key (key_hash, window_start)
);
alter table public.rate_limits enable row level security;
-- No policies: only the server (secret key) touches this, via the function below.

create or replace function public.hit_rate_limit(p_key text, p_limit int, p_window_seconds int)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits int;
begin
  -- housekeeping: hashes are useless after a day, so drop them
  delete from public.rate_limits where window_start < now() - interval '1 day';

  insert into public.rate_limits (key_hash, window_start, hits)
  values (p_key, v_window, 1)
  on conflict (key_hash, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;

  return v_hits <= p_limit;
end $$;
revoke all on function public.hit_rate_limit(text, int, int) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;

-- ─────────────────────────────────────────────────────────────
-- Triggers
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['articles','collections','photos','films','film_lists','journal_entries','site_settings','private_settings']
  loop
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
  end loop;
end $$;

-- ─────────────────────────────────────────────────────────────
-- Row-level security
-- Public: read published rows whose publish date has passed.
-- Admins: everything. Nobody else: nothing.
-- ─────────────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['articles','collections','photos','films','film_lists','journal_entries']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format($p$create policy "public reads published" on public.%I
      for select to anon, authenticated
      using (status = 'published' and published_at is not null and published_at <= now())$p$, t);
    execute format($p$create policy "admins read all" on public.%I
      for select to authenticated using ((select public.is_admin()))$p$, t);
    execute format($p$create policy "admins insert" on public.%I
      for insert to authenticated with check ((select public.is_admin()))$p$, t);
    execute format($p$create policy "admins update" on public.%I
      for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()))$p$, t);
    execute format($p$create policy "admins delete" on public.%I
      for delete to authenticated using ((select public.is_admin()))$p$, t);
  end loop;
end $$;

alter table public.site_settings enable row level security;
create policy "anyone reads settings" on public.site_settings for select to anon, authenticated using (true);
create policy "admins update settings" on public.site_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.private_settings enable row level security;
create policy "admins read private settings" on public.private_settings for select to authenticated using ((select public.is_admin()));
create policy "admins update private settings" on public.private_settings for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

alter table public.messages enable row level security;
-- No insert policy for anon: notes arrive only through the server endpoint,
-- which validates, rate-limits and checks spam before inserting with the secret key.
create policy "admins read notes" on public.messages for select to authenticated using ((select public.is_admin()));
create policy "admins update notes" on public.messages for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "admins delete notes" on public.messages for delete to authenticated using ((select public.is_admin()));

-- Belt and braces: take table privileges away from anon where it never needs them.
revoke insert, update, delete on all tables in schema public from anon;
revoke all on public.messages, public.private_settings, public.rate_limits, public.admins from anon;

-- Helpful indexes for public listings
create index articles_pub_idx on public.articles (status, published_at desc);
create index photos_pub_idx on public.photos (status, published_at desc);
create index photos_collection_idx on public.photos (collection_id, position);
create index films_pub_idx on public.films (status, published_at desc);
create index journal_pub_idx on public.journal_entries (status, published_at desc);
create index messages_created_idx on public.messages (archived, created_at desc);

insert into public.site_settings (id) values (1) on conflict do nothing;
insert into public.private_settings (id) values (1) on conflict do nothing;
