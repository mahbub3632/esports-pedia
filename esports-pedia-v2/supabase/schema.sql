-- =====================================================================
-- Esports Pedia v2 - PHASE 1 - Database schema (Supabase PostgreSQL)
-- Run this ONCE in Supabase: SQL Editor > New query > paste > Run.
-- Safe to run again (uses IF NOT EXISTS / DROP POLICY IF EXISTS).
-- =====================================================================

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;

-- ---------- admin ----------
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid())
$$;

-- ---------- settings / navigation / homepage ----------
create table if not exists public.site_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  parent_id uuid references public.navigation_items(id) on delete cascade,
  sort_order int not null default 0,
  is_published boolean not null default true
);

create table if not exists public.home_tiles (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  image_path text,
  sort_order int not null default 0,
  is_published boolean not null default true
);

create table if not exists public.home_sections (
  key text primary key,
  title text not null,
  sort_order int not null default 0,
  is_published boolean not null default true
);

-- ---------- core content ----------
create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  icon_path text,
  cover_path text,
  description text,
  sort_order int not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  sort_order int not null default 0,
  is_published boolean not null default true
);

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  logo_path text,
  country text not null default 'Bangladesh',
  description text,
  founded_on date,
  website text, facebook text, youtube text, instagram text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  short_name text,
  logo_path text,
  country text not null default 'Bangladesh',
  region text,
  game_id uuid references public.games(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  status text not null default 'active' check (status in ('active','inactive','disbanded')),
  founded_on date,
  description text,
  manual_rank int,
  total_earnings numeric(14,2) not null default 0,
  website text, facebook text, youtube text, instagram text, discord text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teams_rank_idx on public.teams (manual_rank);

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ingame_name text not null,
  full_name text,
  photo_path text,
  nationality text not null default 'Bangladesh',
  role_id uuid references public.roles(id) on delete set null,
  date_of_birth date,
  career_start date,
  status text not null default 'active' check (status in ('active','free_agent','retired','inactive')),
  current_team_id uuid references public.teams(id) on delete set null,  -- NULL = Free Agent
  team_sort_order int not null default 0,                               -- order inside the team
  bio text,
  total_earnings numeric(14,2) not null default 0,
  facebook text, youtube text, instagram text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists players_team_idx on public.players (current_team_id, team_sort_order);

create table if not exists public.transfers (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  from_team_id uuid references public.teams(id) on delete set null,
  to_team_id uuid references public.teams(id) on delete set null,
  transfer_date date not null,
  type text not null check (type in ('joined','left','loan','retired','returned','free_agent')),
  status text not null default 'official' check (status in ('official','unconfirmed')),
  source_url text,
  description text,
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists transfers_player_idx on public.transfers (player_id, transfer_date desc);

-- Keeps players.current_team_id in sync with the NEWEST published transfer.
-- Transfer history is never deleted.
create or replace function public.apply_transfer() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.is_published and not exists (
    select 1 from public.transfers t
    where t.player_id = new.player_id and t.is_published and t.id <> new.id
      and (t.transfer_date > new.transfer_date
           or (t.transfer_date = new.transfer_date and t.created_at > new.created_at))
  ) then
    update public.players set
      current_team_id = case when new.type in ('joined','loan','returned') then new.to_team_id else null end,
      status = case new.type when 'retired' then 'retired'
                             when 'left' then 'free_agent'
                             when 'free_agent' then 'free_agent'
                             else 'active' end
    where id = new.player_id;
  end if;
  return new;
end $$;
drop trigger if exists trg_apply_transfer on public.transfers;
create trigger trg_apply_transfer after insert or update on public.transfers
  for each row execute function public.apply_transfer();

create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  game_id uuid references public.games(id) on delete set null,
  organizer text,
  logo_path text,
  start_date date,
  end_date date,
  location text,
  format text,
  prize_pool numeric(14,2),
  status text not null default 'upcoming' check (status in ('upcoming','ongoing','completed')),
  description text,
  stream_url text,
  mvp_player_id uuid references public.players(id) on delete set null,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tournament_teams (
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  seed int,
  placement int,
  prize_won numeric(14,2),
  primary key (tournament_id, team_id)
);

create table if not exists public.matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  stage text,
  title text not null,
  starts_at timestamptz,
  status text not null default 'scheduled' check (status in ('scheduled','live','finished')),
  stream_url text,
  is_published boolean not null default false
);

create table if not exists public.results (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  match_id uuid references public.matches(id) on delete set null,
  team_id uuid not null references public.teams(id) on delete cascade,
  stage text,
  match_date date,
  placement int,
  kills int not null default 0,
  placement_points int not null default 0,
  total_points int not null default 0,
  notes text,
  is_published boolean not null default false
);
create index if not exists results_tournament_idx on public.results (tournament_id, match_date);

create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  team_id uuid references public.teams(id) on delete cascade,
  player_id uuid references public.players(id) on delete cascade,
  tournament_id uuid references public.tournaments(id) on delete set null,
  title text not null,
  placement text,
  achieved_on date,
  prize numeric(14,2),
  is_published boolean not null default false,
  check (team_id is not null or player_id is not null)
);

-- ---------- rankings / spotlight / media / news ----------
create table if not exists public.rankings (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  role_id uuid references public.roles(id) on delete set null,
  description text,
  calculation_note text,
  sort_order int not null default 0,
  is_published boolean not null default false
);

create table if not exists public.ranking_entries (
  ranking_id uuid not null references public.rankings(id) on delete cascade,
  player_id uuid not null references public.players(id) on delete cascade,
  rank int not null,
  matches int,
  kills int,
  points numeric(10,2),
  metrics jsonb not null default '{}'::jsonb,
  updated_on date not null default current_date,
  primary key (ranking_id, player_id)
);

create table if not exists public.spotlights (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references public.players(id) on delete cascade,
  headline text,
  description text,
  recent_performance text,
  spotlight_date date not null default current_date,
  is_current boolean not null default false,
  is_published boolean not null default false
);

create table if not exists public.media_outlets (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  logo_path text,
  description text,
  website text, facebook text, youtube text, instagram text,
  other_links jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  summary text,
  body text,
  cover_path text,
  published_at timestamptz,
  is_trending boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- visitor submissions (always pending until admin approves) ----------
create table if not exists public.contributions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('team','player','transfer','tournament','result_correction','other')),
  title text not null check (char_length(title) between 3 and 150),
  message text not null check (char_length(message) between 10 and 3000),
  source_url text check (source_url is null or char_length(source_url) <= 500),
  submitter_name text check (submitter_name is null or char_length(submitter_name) <= 100),
  submitter_contact text check (submitter_contact is null or char_length(submitter_contact) <= 150),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  admin_note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['games','organizations','teams','players','tournaments','media_outlets','articles','site_settings'] loop
    execute format('drop trigger if exists trg_updated_at on public.%I', t);
    execute format('create trigger trg_updated_at before update on public.%I for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- =====================================================================
-- SECURITY (Row Level Security)
--   Visitors: READ published rows only. Never write, except sending a
--             pending contribution.
--   Admin   : full access (only users listed in admin_users).
-- =====================================================================
do $$
declare t text;
begin
  foreach t in array array['navigation_items','home_tiles','home_sections','games','roles','organizations','teams','players',
                           'transfers','tournaments','matches','results','achievements','rankings','spotlights','media_outlets','articles'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists public_read on public.%I', t);
    execute format('create policy public_read on public.%I for select using (is_published)', t);
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;

  foreach t in array array['site_settings','tournament_teams','ranking_entries'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists public_read on public.%I', t);
    execute format('create policy public_read on public.%I for select using (true)', t);
    execute format('drop policy if exists admin_all on public.%I', t);
    execute format('create policy admin_all on public.%I for all using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

alter table public.admin_users enable row level security;
drop policy if exists own_row on public.admin_users;
create policy own_row on public.admin_users for select using (user_id = auth.uid());

alter table public.contributions enable row level security;
drop policy if exists visitor_insert on public.contributions;
create policy visitor_insert on public.contributions for insert to anon, authenticated
  with check (status = 'pending' and admin_note is null and reviewed_at is null);
drop policy if exists admin_all on public.contributions;
create policy admin_all on public.contributions for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Storage bucket for images ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 5242880, array['image/png','image/jpeg','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/png','image/jpeg','image/webp'];

drop policy if exists "media public read" on storage.objects;
create policy "media public read" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "media admin insert" on storage.objects;
create policy "media admin insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin update" on storage.objects;
create policy "media admin update" on storage.objects for update to authenticated
  using (bucket_id = 'media' and public.is_admin()) with check (bucket_id = 'media' and public.is_admin());
drop policy if exists "media admin delete" on storage.objects;
create policy "media admin delete" on storage.objects for delete to authenticated
  using (bucket_id = 'media' and public.is_admin());
