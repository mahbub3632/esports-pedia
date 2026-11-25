-- Esports Pedia v2 - starter data. Only facts you gave me: no fake teams, players or numbers.
insert into public.site_settings (key, value) values
 ('site_name','Esports Pedia'),('tagline','Bangladesh Esports Encyclopedia'),('main_game','Free Fire'),
 ('contact_email',''),('facebook_url',''),('youtube_url',''),('discord_url','')
on conflict (key) do nothing;

insert into public.games (slug, name, icon_path, sort_order, is_published)
values ('free-fire','Free Fire','assets/games/free-fire-icon.png',1,true)
on conflict (slug) do nothing;

insert into public.roles (slug, name, sort_order) values
 ('rusher','Rusher',1),('igl','IGL',2),('sniper','Sniper',3),('bomber','Bomber',4)
on conflict (slug) do nothing;

insert into public.rankings (slug, name, role_id, sort_order, is_published)
select 'top-'||r.slug, 'Top '||r.name, r.id, r.sort_order, true from public.roles r
on conflict (slug) do nothing;

delete from public.navigation_items;
insert into public.navigation_items (label, url, sort_order) values
 ('Home','/',1),('Teams','/teams/',2),('Players','/players/',3),('Tournaments','/tournaments/',4),
 ('Transfers','/transfers/',5),('Results','/results/',6),('Statistics','/statistics/',7),('Rankings','/rankings/',8),
 ('Earnings','/earnings/',9),('Organizations','/organizations/',10),('Games','/games/',11),('Media','/media/',12);

delete from public.home_tiles;
insert into public.home_tiles (label, url, image_path, sort_order) values
 ('Teams','/teams/','assets/tiles/teams.png',1),('Players','/players/','assets/tiles/players.png',2),
 ('Tournaments','/tournaments/','assets/tiles/tournaments.png',3),('Transfers','/transfers/','assets/tiles/transfers.png',4),
 ('Results','/results/','assets/tiles/results.png',5),('Rankings','/rankings/','assets/tiles/rankings.png',6),
 ('Earnings','/earnings/','assets/tiles/earnings.png',7),('Organizations','/organizations/','assets/tiles/organizations.png',8),
 ('Games','/games/',null,9);

insert into public.home_sections (key, title, sort_order) values
 ('featured_tournament','Featured Tournament',1),('trending_news','Trending News',2),('featured_teams','Featured Teams',3),
 ('featured_players','Featured Players',4),('latest_transfers','Latest Transfers',5),('upcoming_tournaments','Upcoming Tournaments',6),
 ('recent_results','Recent Results',7),('player_spotlight','Player Spotlight',8),('top_rusher','Top Rusher',9),
 ('top_igl','Top IGL',10),('top_sniper','Top Sniper',11),('top_bomber','Top Bomber',12),
 ('bd_media','Bangladesh Esports Media',13),('latest_updates','Latest Updates',14)
on conflict (key) do nothing;
