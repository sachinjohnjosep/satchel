-- Row-level security checks. Run with scripts/test-db.sh against a throwaway database.
-- Every check raises an exception on failure, so the script stops at the first problem.
\set ON_ERROR_STOP on

-- Fixtures (as superuser)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'stranger@example.test');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000000a');

insert into public.articles (slug, title, status, published_at) values
  ('published-one', 'Published', 'published', now() - interval '1 day'),
  ('draft-one', 'Draft', 'draft', null),
  ('scheduled-one', 'Scheduled', 'published', now() + interval '3 days');
insert into public.messages (body) values ('a private note');
update public.private_settings set notify_email = 'me@example.test';

create or replace function pg_temp.expect(cond boolean, label text) returns void language plpgsql as $$
begin
  if not cond then raise exception 'FAIL: %', label; end if;
  raise notice 'ok  %', label;
end $$;

-- ── Anonymous visitor ──────────────────────────────────────
set role anon;
select set_config('request.jwt.claim.sub', '', false);

select pg_temp.expect((select count(*) from public.articles) = 1, 'anon sees only published, past-dated articles');
select pg_temp.expect(not exists (select 1 from public.articles where slug = 'draft-one'), 'anon cannot see drafts');
select pg_temp.expect(not exists (select 1 from public.articles where slug = 'scheduled-one'), 'anon cannot see scheduled posts early');
select pg_temp.expect((select count(*) from public.site_settings) = 1, 'anon can read public site settings');

do $$ begin
  perform 1 from public.messages;
  raise exception 'FAIL: anon could select messages';
exception when insufficient_privilege then raise notice 'ok  anon cannot read notes';
end $$;

do $$ begin
  insert into public.messages (body) values ('direct insert');
  raise exception 'FAIL: anon could insert a note directly';
exception when insufficient_privilege then raise notice 'ok  anon cannot insert notes directly (must use the server endpoint)';
end $$;

do $$ begin
  perform 1 from public.private_settings;
  raise exception 'FAIL: anon could read private settings';
exception when insufficient_privilege then raise notice 'ok  anon cannot read the notification email';
end $$;

do $$ begin
  insert into public.articles (slug, title) values ('x', 'x');
  raise exception 'FAIL: anon could insert an article';
exception when insufficient_privilege then raise notice 'ok  anon cannot write content';
end $$;

do $$ begin
  perform public.hit_rate_limit('k', 5, 60);
  raise exception 'FAIL: anon could call the rate limiter';
exception when insufficient_privilege then raise notice 'ok  anon cannot call the rate limiter';
end $$;

-- ── Signed in, but not an admin ────────────────────────────
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);

select pg_temp.expect((select count(*) from public.articles) = 1, 'non-admin sees only published articles');
select pg_temp.expect((select count(*) from public.messages) = 0, 'non-admin cannot read notes');
select pg_temp.expect((select count(*) from public.private_settings) = 0, 'non-admin cannot read private settings');

do $$ begin
  insert into public.articles (slug, title) values ('sneaky', 'Sneaky');
  raise exception 'FAIL: non-admin could insert an article';
exception when insufficient_privilege then raise notice 'ok  non-admin insert is blocked by RLS';
end $$;

update public.articles set title = 'hijacked' where slug = 'published-one';
select pg_temp.expect((select title from public.articles where slug = 'published-one') = 'Published', 'non-admin update changes nothing');
delete from public.articles;
select pg_temp.expect((select count(*) from public.articles) = 1, 'non-admin delete removes nothing');
update public.site_settings set site_title = 'hijacked';

-- ── Admin ──────────────────────────────────────────────────
reset role;
select pg_temp.expect((select site_title from public.site_settings) = 'Satchel', 'non-admin could not change site settings');
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

select pg_temp.expect((select count(*) from public.articles) = 3, 'admin sees drafts and scheduled posts');
select pg_temp.expect((select count(*) from public.messages) = 1, 'admin can read notes');
select pg_temp.expect((select notify_email from public.private_settings) = 'me@example.test', 'admin can read private settings');
insert into public.articles (slug, title) values ('admin-new', 'New');
update public.messages set archived = true;
select pg_temp.expect((select archived from public.messages limit 1), 'admin can archive notes');
delete from public.messages;
select pg_temp.expect((select count(*) from public.messages) = 0, 'admin can delete notes');
update public.site_settings set site_title = 'Renamed';
select pg_temp.expect((select site_title from public.site_settings) = 'Renamed', 'admin can update settings');

do $$ begin
  insert into public.articles (slug, title) values ('Bad Slug!', 'x');
  raise exception 'FAIL: invalid slug accepted';
exception when check_violation then raise notice 'ok  slugs are validated';
end $$;

do $$ begin
  insert into public.films (slug, title, rating) values ('bad-rating', 'x', 4.3);
  raise exception 'FAIL: rating 4.3 accepted';
exception when check_violation then raise notice 'ok  ratings must be in half steps';
end $$;

-- ── Server (secret key) ────────────────────────────────────
reset role;
set role service_role;
insert into public.messages (body) values ('via server');
select pg_temp.expect(public.hit_rate_limit('abc', 2, 600), 'rate limit allows 1st hit');
select pg_temp.expect(public.hit_rate_limit('abc', 2, 600), 'rate limit allows 2nd hit');
select pg_temp.expect(not public.hit_rate_limit('abc', 2, 600), 'rate limit blocks 3rd hit');
select pg_temp.expect(public.hit_rate_limit('other', 2, 600), 'rate limit is per key');

do $$ begin
  insert into public.messages (body) values (repeat('x', 2001));
  raise exception 'FAIL: oversized note accepted';
exception when check_violation then raise notice 'ok  database rejects notes over 2000 characters';
end $$;

reset role;
\echo 'All RLS checks passed.'
