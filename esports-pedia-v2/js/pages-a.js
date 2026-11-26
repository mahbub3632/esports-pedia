/* Esports Pedia v2 - public pages, part A: Home, Teams, Team, Players, Player */
(function () {
  var EP = window.EP, esc = EP.esc, P = EP.P, L = EP.L;
  async function base() {
    var r = await Promise.all([
      EP.q('teams', { order: [['manual_rank'], ['total_earnings', false], ['name']] }),
      EP.q('players', { order: [['team_sort_order'], ['ingame_name']] }),
      EP.q('games'), EP.q('organizations'), EP.q('roles', { order: [['sort_order']] })]);
    return { teams: r[0], players: r[1], games: r[2], orgs: r[3], roles: r[4], T: EP.by(r[0]), Pl: EP.by(r[1]), G: EP.by(r[2]), O: EP.by(r[3]), R: EP.by(r[4]) };
  }
  EP.base = base;
  function roster(B, id) { return B.players.filter(function (p) { return p.current_team_id === id; }).sort(function (a, b) { return a.team_sort_order - b.team_sort_order; }); }
  function notFound(what) { return EP.panel('Not found', EP.empty('This ' + what + ' was not found, or it has not been published yet.')); }
  function nameList(B, id) { var l = roster(B, id); return l.length ? '<div class="chips">' + l.map(function (p) { return '<a href="' + L.player(p.slug) + '">' + esc(p.ingame_name) + '</a>'; }).join('') + '</div>' : '<span class="muted">—</span>'; }
  function shortText(t, n) { t = String(t || ''); return t.length > n ? t.slice(0, n).trim() + '…' : t; }
  var TYPE = { joined: 'Joined', left: 'Left', loan: 'Loan', retired: 'Retired', returned: 'Returned', free_agent: 'Free Agent' };
  EP.TYPE = TYPE;

  /* ---------------- HOME ---------------- */
  P.home = async function () {
    var B = await base();
    var r = await Promise.all([EP.q('home_tiles', { order: [['sort_order']] }), EP.q('home_sections', { order: [['sort_order']] }),
      EP.q('transfers', { order: [['transfer_date', false]], limit: 8 }), EP.q('tournaments', { order: [['start_date', false]] }),
      EP.q('results', { order: [['match_date', false]], limit: 10 }), EP.q('rankings'), EP.q('ranking_entries', { order: [['rank']] }),
      EP.q('spotlights', { eq: { is_current: true }, limit: 1 }), EP.q('media_outlets', { limit: 6 }), EP.q('articles', { order: [['published_at', false]], limit: 12 })]);
    var tiles = r[0], secs = r[1], trs = r[2], tours = r[3], res = r[4], rks = r[5], ents = r[6], spot = r[7][0], media = r[8], arts = r[9];
    var S = {};
    S.featured_tournament = function () {
      var t = tours.filter(function (x) { return x.is_featured; })[0] || tours.filter(function (x) { return x.status === 'ongoing'; })[0] || tours[0];
      if (!t) return EP.panel('Featured Tournament', EP.empty('No tournament has been published yet.'));
      return EP.panel('Featured Tournament', '<div class="body"><div class="title">' + EP.img(t.logo_path, t.name, 'thumb lg') + '<div><p>' + EP.status(t.status) + ' ' + (B.G[t.game_id] ? '<span class="badge">' + esc(B.G[t.game_id].name) + '</span>' : '') + '</p><h1 style="font-size:24px"><a href="' + L.tournament(t.slug) + '">' + esc(t.name) + '</a></h1><p>' + EP.date(t.start_date) + ' – ' + EP.date(t.end_date) + (t.location ? ' · ' + esc(t.location) : '') + (t.prize_pool != null ? ' · Prize pool ' + EP.money(t.prize_pool) : '') + '</p></div></div><div class="prose" style="margin-top:10px">' + (t.description ? '<p>' + esc(shortText(t.description, 220)) + '</p>' : '') + '</div></div>');
    };
    var news = function (key, title, list) {
      return function () { return EP.panel(title, list.length ? '<div class="cards">' + list.slice(0, 4).map(function (a) { return '<a class="card" href="' + L.news(a.slug) + '">' + (a.cover_path ? EP.img(a.cover_path, a.title, 'thumb lg') : '') + '<h3>' + esc(a.title) + '</h3><p>' + esc(shortText(a.summary, 90)) + '</p></a>'; }).join('') + '</div>' : EP.empty()); };
    };
    S.trending_news = news('t', 'Trending News', arts.filter(function (a) { return a.is_trending; }));
    S.latest_updates = news('l', 'Latest Updates', arts);
    S.featured_teams = function () {
      var l = B.teams.filter(function (t) { return t.is_featured; }); if (!l.length) l = B.teams.slice(0, 4);
      return EP.panel('Featured Teams', l.length ? '<div class="cards">' + l.slice(0, 6).map(function (t) { return '<a class="card" href="' + L.team(t.slug) + '"><div class="row">' + EP.img(t.logo_path, t.name, 'thumb lg') + '<div><h3>' + esc(t.name) + '</h3><p>' + EP.money(t.total_earnings) + '</p></div></div></a>'; }).join('') + '</div>' : EP.empty());
    };
    S.featured_players = function () {
      var l = B.players.filter(function (p) { return p.is_featured; }); if (!l.length) l = B.players.slice(0, 4);
      return EP.panel('Featured Players', l.length ? '<div class="cards">' + l.slice(0, 6).map(function (p) { return '<a class="card" href="' + L.player(p.slug) + '"><div class="row">' + EP.img(p.photo_path, p.ingame_name, 'thumb lg') + '<div><h3>' + esc(p.ingame_name) + '</h3><p>' + (B.T[p.current_team_id] ? esc(B.T[p.current_team_id].name) : 'Free Agent') + '</p></div></div></a>'; }).join('') + '</div>' : EP.empty());
    };
    S.latest_transfers = function () {
      return EP.panel('Latest Transfers', EP.table(['Date', 'Player', 'From', 'To'], trs.map(function (t) { return '<tr><td>' + EP.date(t.transfer_date) + '</td><td>' + EP.pl(B.Pl[t.player_id]) + '</td><td>' + EP.tl(B.T[t.from_team_id]) + '</td><td>' + EP.tl(B.T[t.to_team_id]) + '</td></tr>'; })) + '<a class="more" href="/transfers/" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600">View all transfers</a>');
    };
    S.upcoming_tournaments = function () {
      var l = tours.filter(function (t) { return t.status !== 'completed'; }).slice(0, 5);
      return EP.panel('Upcoming Tournaments', EP.table(['Tournament', 'Dates', 'Prize pool'], l.map(function (t) { return '<tr><td>' + EP.tourl(t) + '</td><td>' + EP.date(t.start_date) + '</td><td class="gold">' + EP.money(t.prize_pool) + '</td></tr>'; })));
    };
    S.recent_results = function () {
      var T = EP.by(tours);
      return EP.panel('Recent Results', EP.table(['Date', 'Tournament', 'Team', 'Place', 'Points'], res.map(function (x) { return '<tr><td>' + EP.date(x.match_date) + '</td><td>' + EP.tourl(T[x.tournament_id]) + '</td><td>' + EP.tl(B.T[x.team_id]) + '</td><td>' + (x.placement || '—') + '</td><td class="num">' + x.total_points + '</td></tr>'; })) + '<a class="more" href="/results/" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600">View all results</a>');
    };
    S.player_spotlight = function () {
      if (!spot || !B.Pl[spot.player_id]) return EP.panel('Player Spotlight', EP.empty('No spotlight has been published yet.'));
      var p = B.Pl[spot.player_id];
      return EP.panel('Player Spotlight', '<div class="body"><div class="title">' + EP.img(p.photo_path, p.ingame_name, 'thumb xl') + '<div><h1 style="font-size:24px"><a href="' + L.player(p.slug) + '">' + esc(p.ingame_name) + '</a></h1><p>' + (B.T[p.current_team_id] ? esc(B.T[p.current_team_id].name) : 'Free Agent') + (B.R[p.role_id] ? ' · ' + esc(B.R[p.role_id].name) : '') + '</p></div></div><div class="prose" style="margin-top:10px">' + EP.paras(spot.headline) + EP.paras(shortText(spot.description, 300)) + '</div><a class="btn gold" href="/spotlight/" style="margin-top:12px">All spotlights</a></div>');
    };
    ['rusher', 'igl', 'sniper', 'bomber'].forEach(function (k) {
      S['top_' + k] = function () {
        var rk = rks.filter(function (x) { return x.slug === 'top-' + k; })[0];
        var l = rk ? ents.filter(function (e) { return e.ranking_id === rk.id; }).slice(0, 5) : [];
        return EP.panel(rk ? rk.name : 'Top ' + k, EP.table(['#', 'Player', 'Team', 'Points'], l.map(function (e) { var p = B.Pl[e.player_id]; return '<tr><td class="rk">' + e.rank + '</td><td>' + EP.pl(p) + '</td><td>' + EP.tl(p && B.T[p.current_team_id]) + '</td><td class="num gold">' + (e.points == null ? '—' : e.points) + '</td></tr>'; })) + (rk ? '<a class="more" href="' + L.ranking(rk.slug) + '" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600">Full ranking</a>' : ''));
      };
    });
    S.bd_media = function () {
      return EP.panel('Bangladesh Esports Media', media.length ? '<div class="cards">' + media.map(function (m) { return '<a class="card" href="/media/"><div class="row">' + EP.img(m.logo_path, m.name, 'thumb lg') + '<div><h3>' + esc(m.name) + '</h3></div></div></a>'; }).join('') + '</div>' : EP.empty());
    };
    var hero = '<section class="hero"><h1>' + esc(EP.settings.site_name || 'Esports Pedia') + '</h1><p>' + esc(EP.settings.tagline || 'Bangladesh Esports Encyclopedia') + '. Teams, players, tournaments, transfers, results and earnings in one place.</p><a class="btn red" href="/teams/">Browse Teams</a><a class="btn gold" href="/tournaments/">View Tournaments</a></section>';
    var tl = tiles.length ? '<div class="tiles">' + tiles.map(function (t) { return '<a class="tile" href="' + esc(t.url) + '">' + (t.image_path ? '<img class="im" src="' + esc(EP.imageUrl(t.image_path)) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' : '<span class="im"></span>') + '<span>' + esc(t.label) + '</span></a>'; }).join('') + '</div>' : '';
    return hero + tl + '<div class="grid2">' + secs.map(function (s) { return S[s.key] ? S[s.key]() : ''; }).join('') + '</div>';
  };

  /* ---------------- TEAMS LIST ---------------- */
  P.teams = async function () {
    var B = await base();
    EP.after = function () {
      var f = document.getElementById('tf'), g = document.getElementById('tg');
      var run = function () { var v = f.value.toLowerCase(), gv = g.value; document.querySelectorAll('#tt tbody tr').forEach(function (tr) { tr.hidden = !(tr.dataset.n.indexOf(v) > -1 && (!gv || tr.dataset.g === gv)); }); };
      f.oninput = run; g.onchange = run;
    };
    var rows = B.teams.map(function (t, i) {
      var o = B.O[t.organization_id];
      return '<tr data-n="' + esc(t.name.toLowerCase()) + '" data-g="' + esc(t.game_id || '') + '"><td class="rk">' + (i + 1) + '</td><td>' + EP.tl(t) + '</td><td>' + nameList(B, t.id) + '</td><td class="gold">' + EP.money(t.total_earnings) + '</td><td>' + esc(t.country) + '</td><td>' + EP.status(t.status) + '</td></tr>';
    });
    return '<h1>Teams</h1>' + EP.panel('All Teams', '<div class="toolbar"><input id="tf" type="search" placeholder="Filter by team name" aria-label="Filter teams"><select id="tg" aria-label="Game"><option value="">All games</option>' + B.games.map(function (g) { return '<option value="' + esc(g.id) + '">' + esc(g.name) + '</option>'; }).join('') + '</select></div><div id="tt">' + EP.table(['Rank', 'Team', 'Current roster', 'Total earnings', 'Country', 'Status'], rows) + '</div>');
  };

  /* ---------------- TEAM PROFILE ---------------- */
  P.team = async function () {
    var B = await base(), slug = EP.slug(), t = B.teams.filter(function (x) { return x.slug === slug; })[0];
    if (!t) return notFound('team');
    document.title = t.name + ' – Esports Pedia';
    var r = await Promise.all([EP.q('transfers', { eq: { from_team_id: t.id }, order: [['transfer_date', false]] }), EP.q('transfers', { eq: { to_team_id: t.id }, order: [['transfer_date', false]] }),
      EP.q('achievements', { eq: { team_id: t.id }, order: [['achieved_on', false]] }), EP.q('tournament_teams', { eq: { team_id: t.id } }), EP.q('results', { eq: { team_id: t.id }, order: [['match_date', false]] }), EP.q('tournaments')]);
    var seen = {}, trs = r[0].concat(r[1]).filter(function (x) { if (seen[x.id]) return false; seen[x.id] = 1; return true; }).sort(function (a, b) { return a.transfer_date < b.transfer_date ? 1 : -1; });
    var T = EP.by(r[5]), cur = roster(B, t.id);
    var fm = {}; trs.forEach(function (x) { if (x.from_team_id === t.id && B.Pl[x.player_id] && B.Pl[x.player_id].current_team_id !== t.id) fm[x.player_id] = B.Pl[x.player_id]; });
    var former = Object.keys(fm).map(function (k) { return fm[k]; });
    var rank = B.teams.indexOf(t) + 1, org = B.O[t.organization_id], game = B.G[t.game_id];
    var main = EP.toc([['overview', 'Overview'], ['roster', 'Current roster'], ['former', 'Former players'], ['achievements', 'Achievements'], ['tournaments', 'Tournament results'], ['matches', 'Match history'], ['transfers', 'Transfer history']]) +
      EP.panel('Overview', '<div class="body prose">' + (EP.paras(t.description) || EP.empty('No description yet.')) + '</div>', 'overview') +
      EP.panel('Current roster', EP.table(['Player', 'Role', 'Status'], cur.map(function (p) { return '<tr><td>' + EP.pl(p) + '</td><td>' + esc(B.R[p.role_id] ? B.R[p.role_id].name : '—') + '</td><td>' + EP.status(p.status) + '</td></tr>'; })), 'roster') +
      EP.panel('Former players', EP.table(['Player', 'Role'], former.map(function (p) { return '<tr><td>' + EP.pl(p) + '</td><td>' + esc(B.R[p.role_id] ? B.R[p.role_id].name : '—') + '</td></tr>'; })), 'former') +
      EP.panel('Achievements', EP.table(['Date', 'Achievement', 'Place', 'Tournament', 'Prize'], r[2].map(function (a) { return '<tr><td>' + EP.date(a.achieved_on) + '</td><td>' + esc(a.title) + '</td><td>' + esc(a.placement || '—') + '</td><td>' + EP.tourl(T[a.tournament_id]) + '</td><td class="gold">' + EP.money(a.prize) + '</td></tr>'; })), 'achievements') +
      EP.panel('Tournament results', EP.table(['Tournament', 'Placement', 'Prize won'], r[3].map(function (x) { return '<tr><td>' + EP.tourl(T[x.tournament_id]) + '</td><td>' + (x.placement || '—') + '</td><td class="gold">' + EP.money(x.prize_won) + '</td></tr>'; })), 'tournaments') +
      EP.panel('Match history', EP.table(['Date', 'Tournament', 'Stage', 'Place', 'Kills', 'Points'], r[4].map(function (x) { return '<tr><td>' + EP.date(x.match_date) + '</td><td>' + EP.tourl(T[x.tournament_id]) + '</td><td>' + esc(x.stage || '—') + '</td><td>' + (x.placement || '—') + '</td><td class="num">' + x.kills + '</td><td class="num">' + x.total_points + '</td></tr>'; })), 'matches') +
      EP.panel('Transfer history', EP.table(['Date', 'Player', 'From', 'To', 'Type'], trs.map(function (x) { return '<tr><td>' + EP.date(x.transfer_date) + '</td><td>' + EP.pl(B.Pl[x.player_id]) + '</td><td>' + EP.tl(B.T[x.from_team_id]) + '</td><td>' + EP.tl(B.T[x.to_team_id]) + '</td><td>' + esc(EP.TYPE[x.type] || x.type) + '</td></tr>'; })), 'transfers');
    var side = EP.info(EP.img(t.logo_path, t.name, 'thumb xl') + '<h2>' + esc(t.name) + '</h2>', [['Country', t.country], ['Region', t.region], ['Game', game ? game.name : ''], ['Founded', t.founded_on ? EP.date(t.founded_on) : ''], ['Status', t.status], ['Ranking', '#' + rank, 1], ['Total earnings', EP.money(t.total_earnings), 1], ['Organization', org ? '<a href="' + L.org(org.slug) + '">' + esc(org.name) + '</a>' : '', 0, 1]], EP.socials(t));
    return EP.crumb([['Teams', '/teams/'], [t.name]]) + '<div class="cols"><div>' + main + '</div><aside>' + side + '</aside></div>';
  };

  /* ---------------- PLAYERS LIST (grouped by current team) ---------------- */
  P.players = async function () {
    var B = await base();
    var row = function (p) { return '<tr><td>' + EP.pl(p) + '</td><td>' + esc(B.R[p.role_id] ? B.R[p.role_id].name : '—') + '</td><td>' + EP.status(p.status) + '</td></tr>'; };
    var html = '<h1>Players</h1>';
    B.teams.forEach(function (t) {
      var l = roster(B, t.id); if (!l.length) return;
      html += '<section class="panel"><h2><a class="ent" href="' + L.team(t.slug) + '">' + EP.img(t.logo_path, t.name, 'thumb sm') + esc(t.name) + '</a> <span class="muted" style="font-weight:400;font-size:13px">Rank #' + (B.teams.indexOf(t) + 1) + '</span></h2>' + EP.table(['Player', 'Role', 'Status'], l.map(row)) + '</section>';
    });
    var teamIds = {}; B.teams.forEach(function (t) { teamIds[t.id] = 1; });
    var free = B.players.filter(function (p) { return !p.current_team_id || !teamIds[p.current_team_id]; });
    html += EP.panel('Free Agents', EP.table(['Player', 'Role', 'Status'], free.map(row)));
    return B.players.length ? html : '<h1>Players</h1>' + EP.panel('Players', EP.empty());
  };

  /* ---------------- PLAYER PROFILE ---------------- */
  P.player = async function () {
    var B = await base(), slug = EP.slug(), p = B.players.filter(function (x) { return x.slug === slug; })[0];
    if (!p) return notFound('player');
    document.title = p.ingame_name + ' – Esports Pedia';
    var r = await Promise.all([EP.q('transfers', { eq: { player_id: p.id }, order: [['transfer_date', false]] }), EP.q('achievements', { eq: { player_id: p.id }, order: [['achieved_on', false]] }),
      EP.q('ranking_entries', { eq: { player_id: p.id } }), EP.q('rankings'), EP.q('spotlights', { eq: { player_id: p.id }, order: [['spotlight_date', false]] }), EP.q('tournaments')]);
    var T = EP.by(r[5]), RK = EP.by(r[3]), team = B.T[p.current_team_id];
    var prev = {}; r[0].forEach(function (x) { [x.from_team_id, x.to_team_id].forEach(function (id) { if (id && id !== p.current_team_id && B.T[id]) prev[id] = B.T[id]; }); });
    var main = EP.toc([['highlights', 'Career highlights'], ['teams', 'Teams'], ['transfers', 'Transfer history'], ['achievements', 'Achievements'], ['tournaments', 'Tournament history'], ['stats', 'Statistics'], ['spotlights', 'Spotlight history']]) +
      EP.panel('Career highlights', '<div class="body prose">' + (EP.paras(p.bio) || EP.empty('No biography yet.')) + '</div>', 'highlights') +
      EP.panel('Teams', '<div class="body"><p><b>Current team:</b> ' + (team ? EP.tl(team) : 'Free Agent') + '</p><p><b>Previous teams:</b></p>' + (Object.keys(prev).length ? '<div class="chips">' + Object.keys(prev).map(function (k) { return '<a href="' + L.team(prev[k].slug) + '">' + esc(prev[k].name) + '</a>'; }).join('') + '</div>' : '<span class="muted">—</span>') + '</div>', 'teams') +
      EP.panel('Transfer history', EP.table(['Date', 'From', 'To', 'Type'], r[0].map(function (x) { return '<tr><td>' + EP.date(x.transfer_date) + '</td><td>' + EP.tl(B.T[x.from_team_id]) + '</td><td>' + EP.tl(B.T[x.to_team_id]) + '</td><td>' + esc(EP.TYPE[x.type] || x.type) + '</td></tr>'; })), 'transfers') +
      EP.panel('Achievements', EP.table(['Date', 'Achievement', 'Place', 'Prize'], r[1].map(function (a) { return '<tr><td>' + EP.date(a.achieved_on) + '</td><td>' + esc(a.title) + '</td><td>' + esc(a.placement || '—') + '</td><td class="gold">' + EP.money(a.prize) + '</td></tr>'; })), 'achievements') +
      EP.panel('Tournament history', EP.table(['Tournament', 'Place', 'Date'], r[1].filter(function (a) { return T[a.tournament_id]; }).map(function (a) { return '<tr><td>' + EP.tourl(T[a.tournament_id]) + '</td><td>' + esc(a.placement || '—') + '</td><td>' + EP.date(a.achieved_on) + '</td></tr>'; })), 'tournaments') +
      EP.panel('Statistics', EP.table(['Ranking', 'Rank', 'Matches', 'Kills', 'Points'], r[2].filter(function (e) { return RK[e.ranking_id]; }).map(function (e) { return '<tr><td><a href="' + L.ranking(RK[e.ranking_id].slug) + '">' + esc(RK[e.ranking_id].name) + '</a></td><td>#' + e.rank + '</td><td class="num">' + (e.matches == null ? '—' : e.matches) + '</td><td class="num">' + (e.kills == null ? '—' : e.kills) + '</td><td class="num">' + (e.points == null ? '—' : e.points) + '</td></tr>'; })), 'stats') +
      EP.panel('Spotlight history', EP.table(['Date', 'Headline'], r[4].map(function (s) { return '<tr><td>' + EP.date(s.spotlight_date) + '</td><td>' + esc(s.headline || '—') + '</td></tr>'; })), 'spotlights');
    var side = EP.info(EP.img(p.photo_path, p.ingame_name, 'thumb xl') + '<h2>' + esc(p.ingame_name) + '</h2>', [['Full name', p.full_name], ['Nationality', p.nationality], ['Team', team ? '<a href="' + L.team(team.slug) + '">' + esc(team.name) + '</a>' : 'Free Agent', 0, 1], ['Role', B.R[p.role_id] ? B.R[p.role_id].name : ''], ['Status', p.status], ['Born', p.date_of_birth ? EP.date(p.date_of_birth) : ''], ['Career start', p.career_start ? EP.date(p.career_start) : ''], ['Earnings', EP.money(p.total_earnings), 1]], EP.socials(p));
    return EP.crumb([['Players', '/players/'], [p.ingame_name]]) + '<div class="cols"><div>' + main + '</div><aside>' + side + '</aside></div>';
  };
})();
