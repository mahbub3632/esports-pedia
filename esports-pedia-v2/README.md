# Esports Pedia v2 (Bangladesh Esports Encyclopedia)

Plain HTML / CSS / JavaScript frontend + Supabase (PostgreSQL, Auth, Storage, RLS). Hosting: Netlify (auto-deploy from GitHub). No build step.

## Status: PHASE 1 (foundation)
- `supabase/schema.sql`  all tables, security rules (RLS), transfer trigger, image bucket
- `supabase/seed.sql`    menu, 9 home tiles, Free Fire, roles (no fake teams/players)
- `supabase/make-admin.sql`  marks your user as admin
- `netlify.toml`         clean URLs (/teams/team-alpha -> team.html), security headers, admin not indexed
- `css/tokens.css`       brand colors, fonts, base components
- `js/config.js`, `js/supabase-client.js`   connection (anon key only)
- `setup-check.html`     tests the connection
- `assets/`              logos, 8 tile images, Free Fire icon (reused from the old project)
- `SETUP-BN.md`          step-by-step Bangla setup guide

NOTE: the SQL was written carefully but could not be executed against a real database in the authoring environment. Run it in Supabase and report any error message.

## Roadmap
1. Foundation (this zip)
2. Public site: homepage, Teams list (ranked), Team profile, Players grouped by team, Player profile
3. Admin: login, Team / Player managers, image upload, drag-order, transfers
4. Tournaments, Results, Rankings (Rusher/IGL/Sniper/Bomber), Spotlight, Media, Organizations, Games, Statistics, Earnings
5. Search, Submit an Update + review, Homepage/Navigation/Settings managers, Netlify deploy and replacing the old site

## Security rules
- Visitors read only rows with is_published = true. They cannot write, except a "pending" contribution.
- Only users listed in admin_users can write (checked by is_admin() in every policy).
- Public sign-up must stay OFF. Never put the service_role key in this project.

## Reused from the old project
Logo set, 8 tile images, Free Fire icon, brand colors, page layouts as design reference.
Old data files held only [PLACEHOLDER] values, so no data was imported (nothing verified to keep).
The rejected Bangladesh-map logo is archived in assets/brand/archive-map-logo/.
