-- Explicit table permissions for the website's keys.
-- Some Supabase projects no longer grant these automatically. Row-level security
-- (in the init migration) still decides WHICH rows each role can see or change;
-- these grants only allow the roles to use the tables at all. Safe to run more than once.

grant usage on schema public to anon, authenticated, service_role;

-- Public content: visitors may read (RLS limits this to published rows); the admin may write.
grant select on public.articles, public.photos, public.collections, public.films,
  public.film_lists, public.journal_entries, public.site_settings to anon, authenticated;
grant insert, update, delete on public.articles, public.photos, public.collections, public.films,
  public.film_lists, public.journal_entries to authenticated;
grant update on public.site_settings to authenticated;

-- Private tables: never visitors. The admin reads/updates via RLS policies.
grant select, update on public.private_settings to authenticated;
grant select, update, delete on public.messages to authenticated;

-- The server (secret key) stores notes and runs the rate limiter.
grant select, insert, update, delete on all tables in schema public to service_role;
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.hit_rate_limit(text, int, int) to service_role;
