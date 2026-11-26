/* Esports Pedia v2 - public pages, part B */
(function () {
  var EP = window.EP, esc = EP.esc, P = EP.P, L = EP.L;
  function notFound(w) { return EP.panel('Not found', EP.empty('This ' + w + ' was not found, or it has not been published yet.')); }
  function cardList(items) { return items.length ? '<div class="cards">' + items.join('') + '</div>' : EP.empty(); }
  function linkMore(href, t) { return '<a href="' + href + '" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600">' + t + '</a>'; }

  /* ---------- TOURNAMENTS ---------- */
  P.tournaments = async function () {
    var r = await Promise.all([EP.q('tournaments', { order: [['start_date', false]] }), EP.q('games')]), G = EP.by(r[1]);
    var tb = function (st) { return EP.table(['Tournament', 'Game', 'Dates', 'Location', 'Prize pool'], r[0].filter(function (t) { return t.status === st; }).map(function (t) { return '<tr><td><a class="ent" href="' + L.tournament(t.slug) + '">' + EP.img(t.logo_path, t.name, 'thumb sm') + esc(t.name) + '</a></td><td>' + esc(G[t.game_id] ? G[t.game_id].name : '—') + '</td><td>' + EP.date(t.start_date) + ' – ' + EP.date(t.end_date) + '</td><td>' + esc(t.location || '—') + '</td><td class="gold">' + EP.money(t.prize_pool) + '</td></tr>'; })); };
    return '<h1>Tournaments</h1>' + EP.panel('Ongoing Tournaments', tb('ongoing')) + EP.panel('Upcoming Tournaments', tb('upcoming')) + EP.panel('Completed Tournaments', tb('completed'));
  };
  P.tournament = async function () {
    var slug = EP.slug(), t = await EP.one('tournaments', { slug: slug });
    if (!t) return notFound('tournament');
    document.title = t.name + ' – Esports Pedia';
    var B = await EP.base();
    var r = await Promise.all([EP.q('tournament_teams', { eq: { tournament_id: t.id }, order: [['placement']] }), EP.q('matches', { eq: { tournament_id: t.id }, order: [['starts_at']] }), EP.q('results', { eq: { tournament_id: t.id }, order: [['match_date', false]] })]);
    var agg = {}; r[2].forEach(function (x) { var a = agg[x.team_id] = agg[x.team_id] || { id: x.team_id, pts: 0, kills: 0, n: 0, best: null }; a.pts += x.total_points; a.kills += x.kills; a.n++; if (x.placement && (a.best == null || x.placement < a.best)) a.best = x.placement; });
    var st = Object.keys(agg).map(function (k) { return agg[k]; }).sort(function (a, b) { return b.pts - a.pts || b.kills - a.kills; });
    var kills = r[2].reduce(function (s, x) { return s + x.kills; }, 0), mvp = B.Pl[t.mvp_player_id], game = B.G[t.game_id];
    var main = EP.toc([['about', 'About'], ['teams', 'Participating teams'], ['schedule', 'Match schedule'], ['standings', 'Standings'], ['results', 'Results'], ['stats', 'Statistics']]) +
      EP.panel('About', '<div class="body prose">' + (EP.paras(t.description) || EP.empty('No description yet.')) + '</div>', 'about') +
      EP.panel('Participating teams', EP.table(['Team', 'Seed', 'Placement', 'Prize won'], r[0].map(function (x) { return '<tr><td>' + EP.tl(B.T[x.team_id]) + '</td><td>' + (x.seed || '—') + '</td><td>' + (x.placement || '—') + '</td><td class="gold">' + EP.money(x.prize_won) + '</td></tr>'; })), 'teams') +
      EP.panel('Match schedule', EP.table(['Date & time', 'Stage', 'Match', 'Status'], r[1].map(function (m) { return '<tr><td>' + (m.starts_at ? new Date(m.starts_at).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—') + '</td><td>' + esc(m.stage || '—') + '</td><td>' + (EP.safeUrl(m.stream_url) ? '<a href="' + esc(EP.safeUrl(m.stream_url)) + '" target="_blank" rel="noopener noreferrer">' + esc(m.title) + '</a>' : esc(m.title)) + '</td><td>' + EP.status(m.status) + '</td></tr>'; })), 'schedule') +
      EP.panel('Standings', EP.table(['#', 'Team', 'Matches', 'Best place', 'Kills', 'Points'], st.map(function (a, i) { return '<tr><td class="rk">' + (i + 1) + '</td><td>' + EP.tl(B.T[a.id]) + '</td><td class="num">' + a.n + '</td><td>' + (a.best || '—') + '</td><td class="num">' + a.kills + '</td><td class="num gold">' + a.pts + '</td></tr>'; })), 'standings') +
      EP.panel('Results', EP.table(['Date', 'Stage', 'Team', 'Place', 'Kills', 'Points'], r[2].map(function (x) { return '<tr><td>' + EP.date(x.match_date) + '</td><td>' + esc(x.stage || '—') + '</td><td>' + EP.tl(B.T[x.team_id]) + '</td><td>' + (x.placement || '—') + '</td><td class="num">' + x.kills + '</td><td class="num">' + x.total_points + '</td></tr>'; })), 'results') +
      EP.panel('Statistics', '<div class="body"><p>Teams: <b>' + r[0].length + '</b> · Result entries: <b>' + r[2].length + '</b> · Total kills: <b>' + kills + '</b></p></div>', 'stats');
    var side = EP.info(EP.img(t.logo_path, t.name, 'thumb xl') + '<h2>' + esc(t.name) + '</h2>' + EP.status(t.status), [['Game', game ? game.name : ''], ['Organizer', t.organizer], ['Dates', EP.date(t.start_date) + ' – ' + EP.date(t.end_date)], ['Location', t.location], ['Format', t.format], ['Prize pool', EP.money(t.prize_pool), 1], ['MVP', mvp ? '<a href="' + L.player(mvp.slug) + '">' + esc(mvp.ingame_name) + '</a>' : '', 0, 1], ['Stream', EP.safeUrl(t.stream_url) ? '<a href="' + esc(EP.safeUrl(t.stream_url)) + '" target="_blank" rel="noopener noreferrer">Watch</a>' : '', 0, 1]]);
    return EP.crumb([['Tournaments', '/tournaments/'], [t.name]]) + '<div class="cols"><div>' + main + '</div><aside>' + side + '</aside></div>';
  };

  /* ---------- TRANSFERS ---------- */
  P.transfers = async function () {
    var B = await EP.base(), l = await EP.q('transfers', { order: [['transfer_date', false]], limit: 500 });
    EP.after = function () { var f = document.getElementById('xf'); f.oninput = function () { var v = f.value.toLowerCase(); document.querySelectorAll('#xt tbody tr').forEach(function (tr) { tr.hidden = tr.dataset.n.indexOf(v) < 0; }); }; };
    var rows = l.map(function (t) {
      var p = B.Pl[t.player_id];
      return '<tr data-n="' + esc((p ? p.ingame_name : '').toLowerCase()) + '"><td>' + EP.date(t.transfer_date) + '</td><td>' + EP.pl(p) + '</td><td>' + EP.tl(B.T[t.from_team_id]) + '</td><td>' + EP.tl(B.T[t.to_team_id]) + '</td><td>' + esc(EP.TYPE[t.type] || t.type) + '</td><td>' + EP.status(t.status) + '</td><td>' + (EP.safeUrl(t.source_url) ? '<a href="' + esc(EP.safeUrl(t.source_url)) + '" target="_blank" rel="noopener noreferrer">Source</a>' : '—') + '</td><td>' + esc(t.description || '') + '</td></tr>';
    });
    return '<h1>Transfers</h1>' + EP.panel('Transfer Database', '<div class="toolbar"><input id="xf" type="search" placeholder="Filter by player name" aria-label="Filter transfers"></div><div id="xt">' + EP.table(['Date', 'Player', 'Previous team', 'New team', 'Type', 'Status', 'Announcement', 'Notes'], rows) + '</div>');
  };

  /* ---------- RESULTS ---------- */
  P.results = async function () {
    var B = await EP.base(), r = await Promise.all([EP.q('results', { order: [['match_date', false]], limit: 1000 }), EP.q('tournaments', { order: [['start_date', false]] })]), T = EP.by(r[1]);
    EP.after = function () {
      var s = document.getElementById('rt'), d = document.getElementById('rd');
      var run = function () { document.querySelectorAll('#rr tbody tr').forEach(function (tr) { tr.hidden = !((!s.value || tr.dataset.t === s.value) && (!d.value || (tr.dataset.d && tr.dataset.d >= d.value))); }); };
      s.onchange = run; d.onchange = run;
      var q = new URLSearchParams(location.search).get('tournament'); if (q) { s.value = q; run(); }
    };
    var rows = r[0].map(function (x) { return '<tr data-t="' + esc(x.tournament_id) + '" data-d="' + esc(x.match_date || '') + '"><td>' + EP.date(x.match_date) + '</td><td>' + EP.tourl(T[x.tournament_id]) + '</td><td>' + esc(x.stage || '—') + '</td><td>' + EP.tl(B.T[x.team_id]) + '</td><td>' + (x.placement || '—') + '</td><td class="num">' + x.kills + '</td><td class="num">' + x.placement_points + '</td><td class="num gold">' + x.total_points + '</td></tr>'; });
    return '<h1>Results</h1>' + EP.panel('Match Results', '<div class="toolbar"><select id="rt" aria-label="Tournament"><option value="">All tournaments</option>' + r[1].map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>'; }).join('') + '</select><label class="muted">From date <input id="rd" type="date"></label></div><div id="rr">' + EP.table(['Date', 'Tournament', 'Stage', 'Team', 'Placement', 'Kills', 'Placement pts', 'Total points'], rows) + '</div>');
  };

  /* ---------- RANKINGS ---------- */
  P.rankings = async function () {
    var B = await EP.base(), r = await Promise.all([EP.q('rankings', { order: [['sort_order']] }), EP.q('ranking_entries', { order: [['rank']] })]);
    return '<h1>Rankings</h1>' + EP.panel('Player Rankings', cardList(r[0].map(function (k) {
      var top = r[1].filter(function (e) { return e.ranking_id === k.id; }).slice(0, 3);
      return '<a class="card" href="' + L.ranking(k.slug) + '"><h3>' + esc(k.name) + '</h3><p>' + (top.length ? top.map(function (e, i) { return (i + 1) + '. ' + esc(B.Pl[e.player_id] ? B.Pl[e.player_id].ingame_name : '—'); }).join('<br>') : 'No entries yet') + '</p></a>';
    })));
  };
  P.ranking = async function () {
    var k = await EP.one('rankings', { slug: EP.slug() }); if (!k) return notFound('ranking');
    document.title = k.name + ' – Esports Pedia';
    var B = await EP.base(), l = await EP.q('ranking_entries', { eq: { ranking_id: k.id }, order: [['rank']] });
    return EP.crumb([['Rankings', '/rankings/'], [k.name]]) + '<h1>' + esc(k.name) + '</h1>' + (k.description ? '<div class="prose">' + EP.paras(k.description) + '</div>' : '') +
      EP.panel(k.name, EP.table(['#', 'Player', 'Team', 'Role', 'Matches', 'Kills', 'Points', 'Updated'], l.map(function (e) { var p = B.Pl[e.player_id]; return '<tr><td class="rk">' + e.rank + '</td><td>' + EP.pl(p) + '</td><td>' + EP.tl(p && B.T[p.current_team_id]) + '</td><td>' + esc(p && B.R[p.role_id] ? B.R[p.role_id].name : '—') + '</td><td class="num">' + (e.matches == null ? '—' : e.matches) + '</td><td class="num">' + (e.kills == null ? '—' : e.kills) + '</td><td class="num gold">' + (e.points == null ? '—' : e.points) + '</td><td>' + EP.date(e.updated_on) + '</td></tr>'; })) + (k.calculation_note ? '<div class="body muted">' + esc(k.calculation_note) + '</div>' : ''));
  };

  /* ---------- EARNINGS ---------- */
  P.earnings = async function () {
    var B = await EP.base(), srt = function (a, b) { return Number(b.total_earnings) - Number(a.total_earnings); };
    return '<h1>Earnings</h1>' + EP.panel('Team Earnings', EP.table(['#', 'Team', 'Total earnings'], B.teams.slice().sort(srt).map(function (t, i) { return '<tr><td class="rk">' + (i + 1) + '</td><td>' + EP.tl(t) + '</td><td class="gold">' + EP.money(t.total_earnings) + '</td></tr>'; }))) +
      EP.panel('Player Earnings', EP.table(['#', 'Player', 'Team', 'Total earnings'], B.players.slice().sort(srt).map(function (p, i) { return '<tr><td class="rk">' + (i + 1) + '</td><td>' + EP.pl(p) + '</td><td>' + EP.tl(B.T[p.current_team_id]) + '</td><td class="gold">' + EP.money(p.total_earnings) + '</td></tr>'; })));
  };

  /* ---------- ORGANIZATIONS / GAMES ---------- */
  P.organizations = async function () {
    var l = await EP.q('organizations', { order: [['name']] });
    return '<h1>Organizations</h1>' + EP.panel('Organizations', cardList(l.map(function (o) { return '<a class="card" href="' + L.org(o.slug) + '"><div class="row">' + EP.img(o.logo_path, o.name, 'thumb lg') + '<div><h3>' + esc(o.name) + '</h3><p>' + esc(o.country) + '</p></div></div></a>'; })));
  };
  P.organization = async function () {
    var o = await EP.one('organizations', { slug: EP.slug() }); if (!o) return notFound('organization');
    document.title = o.name + ' – Esports Pedia';
    var B = await EP.base(), teams = B.teams.filter(function (t) { return t.organization_id === o.id; });
    return EP.crumb([['Organizations', '/organizations/'], [o.name]]) + '<div class="cols"><div>' + EP.panel('About', '<div class="body prose">' + (EP.paras(o.description) || EP.empty('No description yet.')) + '</div>') + EP.panel('Teams', EP.table(['Team', 'Total earnings'], teams.map(function (t) { return '<tr><td>' + EP.tl(t) + '</td><td class="gold">' + EP.money(t.total_earnings) + '</td></tr>'; }))) + '</div><aside>' +
      EP.info(EP.img(o.logo_path, o.name, 'thumb xl') + '<h2>' + esc(o.name) + '</h2>', [['Country', o.country], ['Founded', o.founded_on ? EP.date(o.founded_on) : '']], EP.socials(o)) + '</aside></div>';
  };
  P.games = async function () {
    var l = await EP.q('games', { order: [['sort_order']] });
    return '<h1>Games</h1>' + EP.panel('Games', cardList(l.map(function (g) { return '<a class="card" href="' + L.game(g.slug) + '"><div class="row">' + EP.img(g.icon_path, g.name, 'thumb lg') + '<div><h3>' + esc(g.name) + '</h3></div></div></a>'; })));
  };
  P.game = async function () {
    var g = await EP.one('games', { slug: EP.slug() }); if (!g) return notFound('game');
    document.title = g.name + ' – Esports Pedia';
    var B = await EP.base(), tours = await EP.q('tournaments', { eq: { game_id: g.id }, order: [['start_date', false]] }), teams = B.teams.filter(function (t) { return t.game_id === g.id; });
    return EP.crumb([['Games', '/games/'], [g.name]]) + '<div class="title">' + EP.img(g.icon_path, g.name, 'thumb lg') + '<h1>' + esc(g.name) + '</h1></div>' + (g.description ? '<div class="prose">' + EP.paras(g.description) + '</div>' : '') +
      EP.panel('Teams', EP.table(['Team', 'Total earnings'], teams.map(function (t) { return '<tr><td>' + EP.tl(t) + '</td><td class="gold">' + EP.money(t.total_earnings) + '</td></tr>'; }))) +
      EP.panel('Tournaments', EP.table(['Tournament', 'Status', 'Dates'], tours.map(function (t) { return '<tr><td>' + EP.tourl(t) + '</td><td>' + EP.status(t.status) + '</td><td>' + EP.date(t.start_date) + '</td></tr>'; })));
  };

  /* ---------- SPOTLIGHT / MEDIA / NEWS ---------- */
  P.spotlight = async function () {
    var B = await EP.base(), l = await EP.q('spotlights', { order: [['spotlight_date', false]] });
    var cur = l.filter(function (s) { return s.is_current; })[0] || l[0], html = '<h1>Player Spotlight</h1>';
    if (cur && B.Pl[cur.player_id]) { var p = B.Pl[cur.player_id]; html += EP.panel('Featured player', '<div class="body"><div class="title">' + EP.img(p.photo_path, p.ingame_name, 'thumb xl') + '<div><h1 style="font-size:26px"><a href="' + L.player(p.slug) + '">' + esc(p.ingame_name) + '</a></h1><p>' + (B.T[p.current_team_id] ? '<a href="' + L.team(B.T[p.current_team_id].slug) + '">' + esc(B.T[p.current_team_id].name) + '</a>' : 'Free Agent') + (B.R[p.role_id] ? ' · ' + esc(B.R[p.role_id].name) : '') + ' · ' + EP.date(cur.spotlight_date) + '</p></div></div><div class="prose" style="margin-top:12px">' + EP.paras(cur.headline) + EP.paras(cur.description) + (cur.recent_performance ? '<p><b>Recent performance:</b> ' + esc(cur.recent_performance) + '</p>' : '') + '</div></div>'); }
    else html += EP.panel('Featured player', EP.empty('No spotlight has been published yet.'));
    return html + EP.panel('Spotlight history', EP.table(['Date', 'Player', 'Headline'], l.map(function (s) { return '<tr><td>' + EP.date(s.spotlight_date) + '</td><td>' + EP.pl(B.Pl[s.player_id]) + '</td><td>' + esc(s.headline || '—') + '</td></tr>'; })));
  };
  P.media = async function () {
    var l = await EP.q('media_outlets', { order: [['name']] });
    return '<h1>Bangladesh Esports Media</h1>' + EP.panel('Media directory', cardList(l.map(function (m) {
      var extra = (Array.isArray(m.other_links) ? m.other_links : []).filter(function (x) { return x && EP.safeUrl(x.url); }).map(function (x) { return '<a href="' + esc(EP.safeUrl(x.url)) + '" target="_blank" rel="noopener noreferrer">' + esc(x.label || 'Link') + '</a>'; }).join('');
      return '<div class="card"><div class="row">' + EP.img(m.logo_path, m.name, 'thumb lg') + '<div><h3>' + esc(m.name) + '</h3>' + (m.is_active ? '' : '<span class="badge">Inactive</span>') + '</div></div><p style="margin-top:8px">' + esc(m.description || '') + '</p>' + EP.socials(m).replace('class="soc"', 'class="soc" style="padding:10px 0 0"').replace('</div>', extra + '</div>') + '</div>';
    })));
  };
  P.news = async function () {
    var l = await EP.q('articles', { order: [['published_at', false]] });
    return '<h1>News</h1>' + EP.panel('Latest news', cardList(l.map(function (a) { return '<a class="card" href="' + L.news(a.slug) + '">' + (a.cover_path ? EP.img(a.cover_path, a.title, 'thumb lg') : '') + '<h3>' + esc(a.title) + '</h3><p>' + esc(a.summary || '') + '</p><p>' + EP.date(a.published_at) + (a.is_trending ? ' · <span class="badge">Trending</span>' : '') + '</p></a>'; })));
  };
  P.article = async function () {
    var a = await EP.one('articles', { slug: EP.slug() }); if (!a) return notFound('article');
    document.title = a.title + ' – Esports Pedia';
    return EP.crumb([['News', '/news/'], [a.title]]) + '<article class="panel"><h2>' + esc(a.title) + '</h2><div class="body prose">' + (a.cover_path ? '<p>' + EP.img(a.cover_path, a.title, 'thumb xl') + '</p>' : '') + '<p class="muted">' + EP.date(a.published_at) + '</p>' + EP.paras(a.body || a.summary) + '</div></article>';
  };

  /* ---------- SEARCH ---------- */
  P.search = async function () {
    var q = (new URLSearchParams(location.search).get('q') || '').trim().slice(0, 80);
    var form = '<form class="search" action="/search/" method="get" style="max-width:640px"><input name="q" type="search" value="' + esc(q) + '" placeholder="Search teams, players, tournaments, news…" aria-label="Search" maxlength="80"><button type="submit">Search</button></form>';
    if (q.length < 2) return '<h1>Search</h1>' + form + EP.panel('Results', EP.empty('Type at least 2 letters to search.'));
    var B = await EP.base();
    var r = await Promise.all([EP.q('teams', { ilike: { name: q }, limit: 20 }), EP.q('players', { ilike: { ingame_name: q }, limit: 20 }), EP.q('players', { ilike: { full_name: q }, limit: 20 }), EP.q('tournaments', { ilike: { name: q }, limit: 20 }),
      EP.q('organizations', { ilike: { name: q }, limit: 20 }), EP.q('media_outlets', { ilike: { name: q }, limit: 20 }), EP.q('articles', { ilike: { title: q }, limit: 20 })]);
    var seen = {}, pls = r[1].concat(r[2]).filter(function (p) { if (seen[p.id]) return false; seen[p.id] = 1; return true; });
    var tr = await EP.q('transfers', { in: { player_id: pls.map(function (p) { return p.id; }) }, order: [['transfer_date', false]], limit: 20 });
    var li = function (title, items) { return items.length ? EP.panel(title + ' (' + items.length + ')', '<div class="body"><ul style="margin:0;padding-left:18px;display:grid;gap:6px">' + items.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul></div>') : ''; };
    var out = li('Teams', r[0].map(EP.tl)) + li('Players', pls.map(EP.pl)) + li('Tournaments', r[3].map(function (t) { return EP.tourl(t) + ' <span class="muted">· <a href="/results/?tournament=' + encodeURIComponent(t.id) + '">results</a></span>'; })) +
      li('Transfers', tr.map(function (t) { return EP.date(t.transfer_date) + ' · ' + EP.pl(B.Pl[t.player_id]) + ' → ' + (B.T[t.to_team_id] ? esc(B.T[t.to_team_id].name) : '—'); })) +
      li('Organizations', r[4].map(function (o) { return '<a href="' + L.org(o.slug) + '">' + esc(o.name) + '</a>'; })) + li('Media', r[5].map(function (m) { return '<a href="/media/">' + esc(m.name) + '</a>'; })) + li('News', r[6].map(function (a) { return '<a href="' + L.news(a.slug) + '">' + esc(a.title) + '</a>'; }));
    return '<h1>Search</h1>' + form + (out || EP.panel('Results', EP.empty('Nothing found for “' + q + '”.')));
  };

  /* ---------- SUBMIT AN UPDATE ---------- */
  P.submit = async function () {
    EP.after = function () {
      var f = document.getElementById('sf'), m = document.getElementById('sm');
      f.onsubmit = async function (e) {
        e.preventDefault(); var d = new FormData(f), say = function (t, ok) { m.className = 'msg ' + (ok ? 'ok' : 'bad'); m.textContent = t; };
        if (d.get('hp')) { say('Thank you! Your update was received and will be reviewed.', true); return; }
        var last = Number(localStorage.getItem('ep_last_submit') || 0); if (Date.now() - last < 60000) { say('অনুগ্রহ করে এক মিনিট পর আবার পাঠান।', false); return; }
        var row = { kind: d.get('kind'), title: String(d.get('title') || '').trim(), message: String(d.get('message') || '').trim(), source_url: String(d.get('source_url') || '').trim() || null, submitter_name: String(d.get('name') || '').trim() || null, submitter_contact: String(d.get('contact') || '').trim() || null };
        if (row.title.length < 3 || row.title.length > 150) return say('Title must be 3 to 150 characters.', false);
        if (row.message.length < 10 || row.message.length > 3000) return say('Details must be 10 to 3000 characters.', false);
        if (row.source_url && !EP.safeUrl(row.source_url)) return say('Source link must start with http:// or https://', false);
        var b = f.querySelector('button'); b.disabled = true;
        var r = await EP.db.from('contributions').insert([row]);
        b.disabled = false;
        if (r.error) return say('পাঠানো যায়নি। কিছুক্ষণ পর আবার চেষ্টা করুন।', false);
        localStorage.setItem('ep_last_submit', String(Date.now())); f.reset();
        say('ধন্যবাদ! আপনার তথ্য জমা হয়েছে। অ্যাডমিন যাচাই করার পর প্রকাশ হবে।', true);
      };
    };
    return '<h1>Submit an Update</h1>' + EP.panel('Send us information', '<form class="form" id="sf"><p class="muted">Your submission is never published automatically. An admin reviews it first. Do not send private information.</p>' +
      '<label>Type<select name="kind"><option value="team">New team information</option><option value="player">Player information</option><option value="transfer">Transfer update</option><option value="tournament">Tournament update</option><option value="result_correction">Result correction</option><option value="other">Other correction</option></select></label>' +
      '<label>Title<input name="title" required minlength="3" maxlength="150"></label><label>Details<textarea name="message" rows="6" required minlength="10" maxlength="3000"></textarea></label>' +
      '<label>Source link (optional)<input name="source_url" type="url" maxlength="500" placeholder="https://"></label><label>Your name (optional)<input name="name" maxlength="100"></label><label>Contact (optional)<input name="contact" maxlength="150"></label>' +
      '<div class="hp" aria-hidden="true"><label>Leave empty<input name="hp" tabindex="-1" autocomplete="off"></label></div><button class="btn red" type="submit">Submit</button><div id="sm" role="status"></div></form>');
  };

  /* ---------- STATISTICS (real numbers from the database; nothing is invented) ---------- */
  function n0(x) { return Number(x || 0).toLocaleString('en-US'); }
  function sum(l, k) { return l.reduce(function (s, x) { return s + (Number(x[k]) || 0); }, 0); }
  function kv(heads, rows) { return EP.table(heads, rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td class="num gold">' + r[1] + '</td></tr>'; })); }
  P.statistics = async function () {
    var C = await Promise.all([EP.count('teams'), EP.count('players'), EP.count('tournaments'), EP.count('matches')]);
    var A = await Promise.all([EP.all('teams', 'id,slug,name,logo_path,status,total_earnings'), EP.all('players', 'id,status,role_id,current_team_id'), EP.all('tournaments', 'id,status,prize_pool'),
      EP.all('results', 'id,team_id,kills,total_points'), EP.all('transfers', 'id,type,transfer_date'), EP.q('roles', { order: [['sort_order']] }), EP.q('rankings', { order: [['sort_order']] }), EP.q('ranking_entries', { order: [['rank']] })]);
    var teams = A[0], players = A[1], tours = A[2], res = A[3], trs = A[4], roles = A[5], rks = A[6], ents = A[7], T = EP.by(teams);
    var kills = sum(res, 'kills'), cnt = function (l, k, v) { return l.filter(function (x) { return x[k] === v; }).length; };
    var kpi = [['Total Teams', C[0]], ['Total Players', C[1]], ['Total Tournaments', C[2]], ['Total Matches', C[3]], ['Total Kills', kills]];
    var html = '<h1>Statistics</h1><div class="kpis">' + kpi.map(function (k) { return '<div class="kpi"><b>' + n0(k[1]) + '</b><span>' + k[0] + '</span></div>'; }).join('') + '</div>' +
      '<p class="muted">শুধু প্রকাশিত (Published) তথ্য থেকে গণনা। Matches = ম্যাচ শিডিউলে যোগ করা এন্ট্রি; Kills = প্রকাশিত রেজাল্টের মোট কিল।</p>';

    var rosterTeams = {}; players.forEach(function (p) { if (p.current_team_id && T[p.current_team_id]) rosterTeams[p.current_team_id] = 1; });
    var topT = teams.slice().sort(function (a, b) { return Number(b.total_earnings) - Number(a.total_earnings); }).filter(function (t) { return Number(t.total_earnings) > 0; }).slice(0, 5);
    var teamsP = EP.panel('Teams', kv(['Item', 'Value'], [['Active', n0(cnt(teams, 'status', 'active'))], ['Inactive', n0(cnt(teams, 'status', 'inactive'))], ['Disbanded', n0(cnt(teams, 'status', 'disbanded'))], ['Teams with a current roster', n0(Object.keys(rosterTeams).length)], ['Total team earnings', EP.money(sum(teams, 'total_earnings'))]]) +
      '<div class="body"><b>Top teams by earnings</b></div>' + EP.table(['Team', 'Earnings'], topT.map(function (t) { return '<tr><td>' + EP.tl(t) + '</td><td class="num gold">' + EP.money(t.total_earnings) + '</td></tr>'; })) + '<a href="/teams/" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600;border-top:1px solid var(--border)">All teams</a>');

    var onTeam = players.filter(function (p) { return p.current_team_id && T[p.current_team_id]; }).length, byRole = roles.map(function (r) { return [esc(r.name), n0(cnt(players, 'role_id', r.id))]; });
    var noRole = players.filter(function (p) { return !p.role_id; }).length; if (noRole) byRole.push(['No role set', n0(noRole)]);
    var playersP = EP.panel('Players', kv(['Item', 'Value'], [['Active', n0(cnt(players, 'status', 'active'))], ['Free agents', n0(cnt(players, 'status', 'free_agent'))], ['Retired', n0(cnt(players, 'status', 'retired'))], ['Inactive', n0(cnt(players, 'status', 'inactive'))], ['Currently on a team', n0(onTeam)], ['Without a team', n0(players.length - onTeam)]]) +
      '<div class="body"><b>Players by role</b></div>' + kv(['Role', 'Players'], byRole) + '<a href="/players/" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600;border-top:1px solid var(--border)">All players</a>');

    var toursP = EP.panel('Tournaments', kv(['Item', 'Value'], [['Ongoing', n0(cnt(tours, 'status', 'ongoing'))], ['Upcoming', n0(cnt(tours, 'status', 'upcoming'))], ['Completed', n0(cnt(tours, 'status', 'completed'))], ['Total prize pool', EP.money(sum(tours, 'prize_pool'))], ['Scheduled matches', n0(C[3])]]) + '<a href="/tournaments/" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600;border-top:1px solid var(--border)">All tournaments</a>');

    var byTeam = {}; res.forEach(function (x) { var a = byTeam[x.team_id] = byTeam[x.team_id] || { id: x.team_id, kills: 0, pts: 0, n: 0 }; a.kills += x.kills || 0; a.pts += x.total_points || 0; a.n++; });
    var topK = Object.keys(byTeam).map(function (k) { return byTeam[k]; }).filter(function (a) { return T[a.id]; }).sort(function (a, b) { return b.kills - a.kills; }).slice(0, 5);
    var resP = EP.panel('Results', kv(['Item', 'Value'], [['Result entries', n0(res.length)], ['Total kills', n0(kills)], ['Total points', n0(sum(res, 'total_points'))]]) +
      '<div class="body"><b>Most kills by team</b></div>' + EP.table(['Team', 'Entries', 'Kills', 'Points'], topK.map(function (a) { return '<tr><td>' + EP.tl(T[a.id]) + '</td><td class="num">' + a.n + '</td><td class="num gold">' + n0(a.kills) + '</td><td class="num">' + n0(a.pts) + '</td></tr>'; })) + '<a href="/results/" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600;border-top:1px solid var(--border)">All results</a>');

    var since = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10), latest = trs.reduce(function (m, x) { return x.transfer_date > m ? x.transfer_date : m; }, '');
    var trP = EP.panel('Transfers', kv(['Item', 'Value'], [['Total transfers', n0(trs.length)]].concat(Object.keys(EP.TYPE).map(function (k) { return [esc(EP.TYPE[k]), n0(cnt(trs, 'type', k))]; })).concat([['Last 30 days', n0(trs.filter(function (x) { return x.transfer_date >= since; }).length)], ['Latest transfer date', latest ? EP.date(latest) : '—']])) + '<a href="/transfers/" style="display:block;padding:12px 16px;color:var(--gold);font-weight:600;border-top:1px solid var(--border)">All transfers</a>');

    var ids = {}; rks.forEach(function (k) { var f = ents.filter(function (e) { return e.ranking_id === k.id; })[0]; if (f) ids[f.player_id] = 1; });
    var PL = EP.by(await EP.q('players', { in: { id: Object.keys(ids) } }));
    var rkP = EP.panel('Rankings', EP.table(['Ranking', 'Entries', 'Rank #1'], rks.map(function (k) {
      var l = ents.filter(function (e) { return e.ranking_id === k.id; }), f = l[0];
      return '<tr><td><a href="' + L.ranking(k.slug) + '">' + esc(k.name) + '</a></td><td class="num">' + n0(l.length) + '</td><td>' + (f ? EP.pl(PL[f.player_id]) : '<span class="muted">—</span>') + '</td></tr>';
    })));
    return html + '<div class="grid2">' + teamsP + playersP + toursP + resP + trP + rkP + '</div>';
  };

  P.nf = async function () { return EP.panel('Page not found', '<div class="empty">এই পেজটি পাওয়া যায়নি। <a href="/" style="color:var(--gold)">হোমপেজে ফিরে যান</a>।</div>'); };
  EP.run();
})();
