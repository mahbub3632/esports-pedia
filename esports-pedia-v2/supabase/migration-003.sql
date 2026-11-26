-- =====================================================================
-- Esports Pedia v2 - MIGRATION 003: bring the Statistics menu link back
-- Run in Supabase SQL Editor. Only ADDS/RE-ENABLES one menu item.
-- Safe to run again. Does not touch any other data.
-- =====================================================================
insert into public.navigation_items (label, url, sort_order, is_published)
select 'Statistics', '/statistics/', 7, true
where not exists (select 1 from public.navigation_items where url = '/statistics/');

update public.navigation_items set is_published = true where url = '/statistics/';
