# Esports Pedia v2 – Bangladesh Esports Encyclopedia

Plain HTML / CSS / JavaScript frontend + Supabase (PostgreSQL, Auth, Storage, Row Level Security). Hosting: Netlify (auto-deploy from GitHub). No build step.

GitHub repository: `mahbub3632/esports-pedia`. Start with **SETUP-BN.md** (Bangla, step by step).

## What is inside
| Path | What |
|---|---|
| `index.html` + folders `statistics/ teams/ players/ tournaments/ transfers/ results/ rankings/ earnings/ organizations/ games/ spotlight/ media/ news/ search/ submit/` | public list pages |
| `team.html player.html tournament.html organization.html game.html ranking.html article.html` | profile pages (served at `/teams/<slug>` etc. by Netlify rewrites in `netlify.toml`) |
| `admin/index.html`, `js/admin.js`, `css/admin.css` | private admin dashboard (Supabase Auth, admin-only) |
| `js/app.js`, `js/pages-a.js`, `js/pages-b.js` | public site code (layout, helpers, pages) |
| `js/config.js` | **paste your Supabase URL + anon key here** (never the service_role key) |
| `supabase/schema.sql`, `seed.sql`, `migration-002.sql`, `migration-003.sql`, `make-admin.sql` | database, security rules, starter data, admin setup |
| `netlify.toml`, `robots.txt` | Netlify rewrites + security headers, crawler rules |
| `assets/` | logo set, homepage tile images, Free Fire icon (reused from the old project) |
| `setup-check.html` | connection test page (can be deleted later) |

## Public features
Homepage (admin-controlled sections + 9 tiles), ranked Teams list, Team profile (roster, former players, achievements, tournament results, match history, transfers, info box, contents), Players grouped by current team + Free Agents, Player profile, Tournaments (ongoing/upcoming/completed + detail with participants, schedule, standings, results, MVP), Transfers, Results (tournament + date filter), Statistics (real totals: teams, players, tournaments, matches, kills + breakdowns, counted from published data only), Rankings (Top Rusher / IGL / Sniper / Bomber + any role you add), Earnings, Organizations, Games, Player Spotlight, Bangladesh Esports Media, News, Search, Submit an Update (pending review, honeypot + 1-minute throttle + database flood limit). Empty states are shown when there is no data; no demo data is shipped.

## Admin features
Login (Supabase Auth, no public sign-up), Dashboard counts, Add/Edit/Delete/Publish/Unpublish/Search for Teams, Players, Organizations, Games, Roles, Tournaments, Match schedule, Results, Achievements, Transfers, Rankings, News, Spotlight, Media outlets, Homepage sections/tiles, Navigation, Settings (website name, tagline, description, logo, favicon stored in Supabase Storage `branding/`, contact + social links; the public site updates automatically); drag-and-drop Player Order; Tournament Teams; Ranking Entries; Earnings editor; image upload / replace / delete with preview; Media Library; Contribution review.

## Security model
- Visitors can read only rows with `is_published = true`; they cannot write, except a `pending` contribution.
- Writes require `is_admin()` (user listed in `admin_users`) – enforced in every RLS policy and in Storage policies.
- Frontend uses only the anon key. All data is HTML-escaped before display; external links accept only http(s).
- `/admin/*` has `noindex` and `no-store` headers.

## Testing status (honest)
Tested in a headless browser against a **simulated** Supabase (107 checks: all public pages, filters, search, submit, mobile no-horizontal-scroll at 375px, admin login/non-admin block, CRUD, image upload/replace/delete, publish toggle, player order, tournament teams, ranking entries, earnings, contributions, media library). NOT tested against a real Supabase project, real PostgreSQL (the SQL is untested) or a real Netlify deploy – none were reachable from the authoring environment.
