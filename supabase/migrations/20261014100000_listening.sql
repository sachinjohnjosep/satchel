set client_min_messages = warning;
-- Listening: albums and songs, and playlists of them.
-- Same rules as every other section: visitors read published rows whose date has
-- passed; only admins write. Safe to run once on an existing database.

create table if not exists public.listens (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  artist text check (char_length(artist) <= 200),
  kind text not null default 'album' check (kind in ('album', 'song', 'ep', 'live')),
  release_year int check (release_year between 1800 and 2200),
  cover_path text,
  cover_credit text,
  rating numeric(2, 1) check (rating >= 0 and rating <= 5 and (rating * 2) = floor(rating * 2)),
  short_note text check (char_length(short_note) <= 600),
  body jsonb,
  genres text[] not null default '{}',
  tags text[] not null default '{}',
  is_favourite boolean not null default false,
  listen_url text check (listen_url is null or listen_url ~ '^https://'),
  listened_on date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlists (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (char_length(title) between 1 and 200),
  description text,
  listen_ids uuid[] not null default '{}',
  listen_url text check (listen_url is null or listen_url ~ '^https://'),
  cover_path text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  published_at timestamptz,
  seo_title text,
  seo_description text,
  is_placeholder boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listens_pub_idx on public.listens (status, published_at desc);
create index if not exists playlists_pub_idx on public.playlists (status, published_at desc);

do $$
declare t text;
begin
  foreach t in array array['listens', 'playlists']
  loop
    execute format('drop trigger if exists %I_touch on public.%I', t, t);
    execute format('create trigger %I_touch before update on public.%I for each row execute function public.touch_updated_at()', t, t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "public reads published" on public.%I', t);
    execute format($p$create policy "public reads published" on public.%I
      for select to anon, authenticated
      using (status = 'published' and published_at is not null and published_at <= now())$p$, t);
    execute format('drop policy if exists "admins read all" on public.%I', t);
    execute format($p$create policy "admins read all" on public.%I for select to authenticated using ((select public.is_admin()))$p$, t);
    execute format('drop policy if exists "admins insert" on public.%I', t);
    execute format($p$create policy "admins insert" on public.%I for insert to authenticated with check ((select public.is_admin()))$p$, t);
    execute format('drop policy if exists "admins update" on public.%I', t);
    execute format($p$create policy "admins update" on public.%I for update to authenticated
      using ((select public.is_admin())) with check ((select public.is_admin()))$p$, t);
    execute format('drop policy if exists "admins delete" on public.%I', t);
    execute format($p$create policy "admins delete" on public.%I for delete to authenticated using ((select public.is_admin()))$p$, t);

    -- Explicit permissions (some projects don't grant these automatically).
    execute format('revoke insert, update, delete on public.%I from anon', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
    execute format('grant select, insert, update, delete on public.%I to service_role', t);
  end loop;
end $$;
