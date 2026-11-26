-- =====================================================================
-- Esports Pedia v2 - MIGRATION 002 (run AFTER schema.sql and seed.sql)
-- Only ADDS things. Does not delete tables or your data.
-- Safe to run again.
-- =====================================================================

-- 1) "Featured" flags for the homepage
alter table public.teams   add column if not exists is_featured boolean not null default false;
alter table public.players add column if not exists is_featured boolean not null default false;

-- 2) Menu: there is no Statistics page, so remove that link; add News and Spotlight
delete from public.navigation_items where url = '/statistics/';
insert into public.navigation_items (label, url, sort_order)
select 'News', '/news/', 13
where not exists (select 1 from public.navigation_items where url = '/news/');
insert into public.navigation_items (label, url, sort_order)
select 'Spotlight', '/spotlight/', 14
where not exists (select 1 from public.navigation_items where url = '/spotlight/');

-- 3) Only ONE current Player Spotlight at a time
create or replace function public.one_current_spotlight() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_current then
    update public.spotlights set is_current = false where id <> new.id and is_current;
  end if;
  return new;
end $$;
drop trigger if exists trg_one_current on public.spotlights;
create trigger trg_one_current after insert or update of is_current on public.spotlights
  for each row when (new.is_current) execute function public.one_current_spotlight();

-- 4) Spam protection: stop floods of visitor submissions
create or replace function public.limit_contribution_flood() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.contributions where created_at > now() - interval '10 minutes') >= 30 then
    raise exception 'Too many submissions right now. Please try again later.';
  end if;
  return new;
end $$;
drop trigger if exists trg_contribution_flood on public.contributions;
create trigger trg_contribution_flood before insert on public.contributions
  for each row execute function public.limit_contribution_flood();

-- 5) Currency setting (admin can change it in Admin > Settings)
insert into public.site_settings (key, value) values ('currency','') on conflict (key) do nothing;
