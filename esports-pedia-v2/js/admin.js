/* Esports Pedia v2 - Admin dashboard (Supabase Auth + Storage + RLS). Only the anon key is used here. */
(function () {
  var EP = window.EP, db = EP.db, esc = EP.esc, root = document.getElementById('admin');
  var main, files = {}, flags = {}, refCache = {};
  function $(s, r) { return (r || document).querySelector(s); }
  function toast(m, bad) { var t = $('.toast') || document.body.appendChild(Object.assign(document.createElement('div'), { className: 'toast' })); var d = document.createElement('div'); d.textContent = m; if (bad) d.className = 'bad'; t.appendChild(d); setTimeout(function () { d.remove(); }, 4200); }
  function err(e) { var m = e && e.message || String(e); if (e && e.code === '23505') m = 'এই slug বা নাম আগেই ব্যবহার হয়েছে। অন্য একটা দিন।'; if (e && e.code === '23503') m = 'অন্য তথ্যের সাথে যুক্ত থাকায় মোছা বা বদলানো যাচ্ছে না।'; toast(m, true); }
  function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
  var SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
  var YN = function (v) { return v ? 'Yes' : 'No'; };

  /* ---------------- entity definitions ---------------- */
  var ST = ['active', 'inactive', 'disbanded'], PS = ['active', 'free_agent', 'retired', 'inactive'];
  var url = function (n, l) { return [n, l, 'url']; };
  var ENT = {
    teams: { t: 'Teams', table: 'teams', title: 'name', order: ['manual_rank'], cols: [['name', 'Name'], ['status', 'Status'], ['manual_rank', 'Rank'], ['total_earnings', 'Earnings']], fields: [
      ['name', 'Name', 'text', { req: 1 }], ['slug', 'Slug (address)', 'slug', { from: 'name', hint: 'ছোট ইংরেজি অক্ষর ও ড্যাশ, যেমন team-alpha' }], ['short_name', 'Short name', 'text'], ['logo_path', 'Logo', 'image', { folder: 'teams' }],
      ['game_id', 'Game', 'ref', { table: 'games', label: 'name' }], ['organization_id', 'Organization', 'ref', { table: 'organizations', label: 'name' }], ['status', 'Status', 'select', { options: ST, def: 'active' }],
      ['region', 'Region', 'text'], ['country', 'Country', 'text', { def: 'Bangladesh' }], ['founded_on', 'Founded', 'date'], ['manual_rank', 'Rank (1 = top)', 'number'], ['total_earnings', 'Total earnings', 'number', { def: 0 }],
      ['description', 'Description / history', 'textarea', { wide: 1 }], url('website', 'Website'), url('facebook', 'Facebook'), url('youtube', 'YouTube'), url('instagram', 'Instagram'), url('discord', 'Discord'),
      ['is_featured', 'Featured on homepage', 'bool'], ['is_published', 'Published', 'bool']] },
    players: { t: 'Players', table: 'players', title: 'ingame_name', order: ['ingame_name'], cols: [['ingame_name', 'In-game name'], ['current_team_id', 'Team', 'ref', 'teams', 'name'], ['status', 'Status'], ['total_earnings', 'Earnings']], fields: [
      ['ingame_name', 'In-game name', 'text', { req: 1 }], ['slug', 'Slug (address)', 'slug', { from: 'ingame_name' }], ['full_name', 'Full name', 'text'], ['photo_path', 'Photo', 'image', { folder: 'players' }],
      ['current_team_id', 'Current team (empty = Free Agent)', 'ref', { table: 'teams', label: 'name' }], ['team_sort_order', 'Order inside team', 'number', { def: 0 }], ['role_id', 'Role', 'ref', { table: 'roles', label: 'name' }],
      ['status', 'Status', 'select', { options: PS, def: 'active' }], ['nationality', 'Nationality', 'text', { def: 'Bangladesh' }], ['date_of_birth', 'Date of birth', 'date'], ['career_start', 'Career start', 'date'],
      ['total_earnings', 'Total earnings', 'number', { def: 0 }], ['bio', 'Biography / career highlights', 'textarea', { wide: 1 }], url('facebook', 'Facebook'), url('youtube', 'YouTube'), url('instagram', 'Instagram'),
      ['is_featured', 'Featured on homepage', 'bool'], ['is_published', 'Published', 'bool']] },
    tournaments: { t: 'Tournaments', table: 'tournaments', title: 'name', order: ['start_date', false], cols: [['name', 'Name'], ['status', 'Status'], ['start_date', 'Start'], ['prize_pool', 'Prize pool']], fields: [
      ['name', 'Name', 'text', { req: 1 }], ['slug', 'Slug (address)', 'slug', { from: 'name' }], ['logo_path', 'Logo', 'image', { folder: 'tournaments' }], ['game_id', 'Game', 'ref', { table: 'games', label: 'name' }],
      ['organizer', 'Organizer', 'text'], ['start_date', 'Start date', 'date'], ['end_date', 'End date', 'date'], ['location', 'Location', 'text'], ['format', 'Format', 'text'], ['prize_pool', 'Prize pool', 'number'],
      ['status', 'Status', 'select', { options: ['upcoming', 'ongoing', 'completed'], def: 'upcoming' }], ['mvp_player_id', 'Tournament MVP', 'ref', { table: 'players', label: 'ingame_name' }], url('stream_url', 'Stream link'),
      ['description', 'Description', 'textarea', { wide: 1 }], ['is_featured', 'Featured on homepage', 'bool'], ['is_published', 'Published', 'bool']] },
    transfers: { t: 'Transfers', table: 'transfers', order: ['transfer_date', false], cols: [['transfer_date', 'Date'], ['player_id', 'Player', 'ref', 'players', 'ingame_name'], ['from_team_id', 'From', 'ref', 'teams', 'name'], ['to_team_id', 'To', 'ref', 'teams', 'name'], ['type', 'Type']], note: 'নতুন ট্রান্সফার প্রকাশ (Published) করলে খেলোয়াড়ের বর্তমান টিম নিজে বদলে যায়। পুরোনো ইতিহাস মোছে না।', fields: [
      ['player_id', 'Player', 'ref', { table: 'players', label: 'ingame_name', req: 1 }], ['from_team_id', 'Previous team', 'ref', { table: 'teams', label: 'name' }], ['to_team_id', 'New team', 'ref', { table: 'teams', label: 'name' }],
      ['transfer_date', 'Transfer date', 'date', { req: 1 }], ['type', 'Type', 'select', { options: ['joined', 'left', 'loan', 'retired', 'returned', 'free_agent'], def: 'joined' }], ['status', 'Status', 'select', { options: ['official', 'unconfirmed'], def: 'official' }],
      url('source_url', 'Announcement link'), ['description', 'Description', 'textarea', { wide: 1 }], ['is_published', 'Published', 'bool']] },
    matches: { t: 'Match Schedule', table: 'matches', title: 'title', order: ['starts_at', false], cols: [['title', 'Match'], ['tournament_id', 'Tournament', 'ref', 'tournaments', 'name'], ['starts_at', 'Starts'], ['status', 'Status']], fields: [
      ['tournament_id', 'Tournament', 'ref', { table: 'tournaments', label: 'name', req: 1 }], ['title', 'Match title', 'text', { req: 1 }], ['stage', 'Stage', 'text'], ['starts_at', 'Date & time', 'datetime'],
      ['status', 'Status', 'select', { options: ['scheduled', 'live', 'finished'], def: 'scheduled' }], url('stream_url', 'Stream link'), ['is_published', 'Published', 'bool']] },
    results: { t: 'Results', table: 'results', order: ['match_date', false], cols: [['match_date', 'Date'], ['tournament_id', 'Tournament', 'ref', 'tournaments', 'name'], ['team_id', 'Team', 'ref', 'teams', 'name'], ['placement', 'Place'], ['total_points', 'Points']], fields: [
      ['tournament_id', 'Tournament', 'ref', { table: 'tournaments', label: 'name', req: 1 }], ['team_id', 'Team', 'ref', { table: 'teams', label: 'name', req: 1 }], ['match_id', 'Match (optional)', 'ref', { table: 'matches', label: 'title' }],
      ['stage', 'Stage', 'text'], ['match_date', 'Match date', 'date'], ['placement', 'Placement', 'number'], ['kills', 'Kills', 'number', { def: 0 }], ['placement_points', 'Placement points', 'number', { def: 0 }], ['total_points', 'Total points', 'number', { def: 0 }],
      ['notes', 'Notes', 'textarea', { wide: 1 }], ['is_published', 'Published', 'bool']] },
    achievements: { t: 'Achievements', table: 'achievements', title: 'title', order: ['achieved_on', false], cols: [['title', 'Achievement'], ['team_id', 'Team', 'ref', 'teams', 'name'], ['player_id', 'Player', 'ref', 'players', 'ingame_name'], ['achieved_on', 'Date']], fields: [
      ['title', 'Achievement title', 'text', { req: 1 }], ['team_id', 'Team', 'ref', { table: 'teams', label: 'name' }], ['player_id', 'Player', 'ref', { table: 'players', label: 'ingame_name' }], ['tournament_id', 'Tournament', 'ref', { table: 'tournaments', label: 'name' }],
      ['placement', 'Placement (e.g. 1st)', 'text'], ['achieved_on', 'Date', 'date'], ['prize', 'Prize', 'number'], ['is_published', 'Published', 'bool']], rule: function (v) { return v.team_id || v.player_id ? '' : 'Team অথবা Player অন্তত একটা দিন।'; } },
    organizations: { t: 'Organizations', table: 'organizations', title: 'name', order: ['name'], cols: [['name', 'Name'], ['country', 'Country']], fields: [
      ['name', 'Name', 'text', { req: 1 }], ['slug', 'Slug (address)', 'slug', { from: 'name' }], ['logo_path', 'Logo', 'image', { folder: 'organizations' }], ['country', 'Country', 'text', { def: 'Bangladesh' }], ['founded_on', 'Founded', 'date'],
      ['description', 'Description', 'textarea', { wide: 1 }], url('website', 'Website'), url('facebook', 'Facebook'), url('youtube', 'YouTube'), url('instagram', 'Instagram'), ['is_published', 'Published', 'bool']] },
    games: { t: 'Games', table: 'games', title: 'name', order: ['sort_order'], cols: [['name', 'Name'], ['sort_order', 'Order']], fields: [
      ['name', 'Name', 'text', { req: 1 }], ['slug', 'Slug (address)', 'slug', { from: 'name' }], ['icon_path', 'Icon', 'image', { folder: 'games' }], ['cover_path', 'Cover', 'image', { folder: 'games' }], ['sort_order', 'Order', 'number', { def: 0 }], ['description', 'Description', 'textarea', { wide: 1 }], ['is_published', 'Published', 'bool']] },
    roles: { t: 'Ranking Roles', table: 'roles', title: 'name', order: ['sort_order'], note: 'নতুন রোল (যেমন Support) এখানে যোগ করুন, তারপর Rankings থেকে সেই রোলের র‍্যাঙ্কিং বানান।', cols: [['name', 'Role'], ['sort_order', 'Order']], fields: [
      ['name', 'Role name', 'text', { req: 1 }], ['slug', 'Slug', 'slug', { from: 'name' }], ['sort_order', 'Order', 'number', { def: 0 }], ['is_published', 'Published', 'bool', { def: true }]] },
    rankings: { t: 'Rankings (categories)', table: 'rankings', title: 'name', order: ['sort_order'], cols: [['name', 'Ranking'], ['role_id', 'Role', 'ref', 'roles', 'name'], ['sort_order', 'Order']], fields: [
      ['name', 'Ranking name (e.g. Top Rusher)', 'text', { req: 1 }], ['slug', 'Slug', 'slug', { from: 'name' }], ['role_id', 'Role', 'ref', { table: 'roles', label: 'name' }], ['sort_order', 'Order', 'number', { def: 0 }],
      ['description', 'Description', 'textarea', { wide: 1 }], ['calculation_note', 'How points are calculated', 'textarea', { wide: 1 }], ['is_published', 'Published', 'bool']] },
    articles: { t: 'News', table: 'articles', title: 'title', order: ['published_at', false], cols: [['title', 'Title'], ['published_at', 'Date'], ['is_trending', 'Trending']], fields: [
      ['title', 'Title', 'text', { req: 1 }], ['slug', 'Slug (address)', 'slug', { from: 'title' }], ['cover_path', 'Cover image', 'image', { folder: 'articles' }], ['published_at', 'Publish date', 'datetime'],
      ['summary', 'Short summary', 'textarea', { wide: 1 }], ['body', 'Article text (blank line = new paragraph)', 'textarea', { wide: 1, tall: 1 }], ['is_trending', 'Trending', 'bool'], ['is_published', 'Published', 'bool']] },
    media_outlets: { t: 'Media Outlets', table: 'media_outlets', title: 'name', order: ['name'], cols: [['name', 'Name'], ['is_active', 'Active']], fields: [
      ['name', 'Name', 'text', { req: 1 }], ['slug', 'Slug', 'slug', { from: 'name' }], ['logo_path', 'Logo', 'image', { folder: 'media' }], ['description', 'Description', 'textarea', { wide: 1 }], url('website', 'Website'), url('facebook', 'Facebook'), url('youtube', 'YouTube'), url('instagram', 'Instagram'),
      ['other_links', 'Other links (JSON: [{"label":"TikTok","url":"https://..."}])', 'json', { wide: 1 }], ['is_active', 'Active', 'bool', { def: true }], ['is_published', 'Published', 'bool']] },
    spotlights: { t: 'Player Spotlight', table: 'spotlights', order: ['spotlight_date', false], note: '"Current" চালু করলে বাকি সব স্পটলাইট নিজে বন্ধ হয়ে যায়।', cols: [['spotlight_date', 'Date'], ['player_id', 'Player', 'ref', 'players', 'ingame_name'], ['headline', 'Headline'], ['is_current', 'Current']], fields: [
      ['player_id', 'Player', 'ref', { table: 'players', label: 'ingame_name', req: 1 }], ['headline', 'Headline', 'text'], ['spotlight_date', 'Date', 'date'], ['description', 'Description', 'textarea', { wide: 1 }], ['recent_performance', 'Recent performance', 'textarea', { wide: 1 }],
      ['is_current', 'Current spotlight', 'bool'], ['is_published', 'Published', 'bool']] },
    home_sections: { t: 'Homepage Sections', table: 'home_sections', pk: 'key', order: ['sort_order'], note: 'এখানে হোমপেজের অংশগুলোর ক্রম বদলানো, দেখানো বা লুকানো যায়।', cols: [['title', 'Section'], ['sort_order', 'Order']], noAdd: 1, noDel: 1, fields: [
      ['key', 'Key', 'text', { ro: 1 }], ['title', 'Title', 'text', { req: 1 }], ['sort_order', 'Order', 'number', { def: 0 }], ['is_published', 'Show on homepage', 'bool']] },
    home_tiles: { t: 'Homepage Tiles', table: 'home_tiles', order: ['sort_order'], cols: [['label', 'Label'], ['url', 'Link'], ['sort_order', 'Order']], fields: [
      ['label', 'Label', 'text', { req: 1 }], ['url', 'Link (e.g. /teams/)', 'text', { req: 1 }], ['image_path', 'Tile image', 'image', { folder: 'tiles' }], ['sort_order', 'Order', 'number', { def: 0 }], ['is_published', 'Published', 'bool', { def: true }]] },
    navigation_items: { t: 'Navigation Menu', table: 'navigation_items', order: ['sort_order'], cols: [['label', 'Label'], ['url', 'Link'], ['sort_order', 'Order']], fields: [
      ['label', 'Label', 'text', { req: 1 }], ['url', 'Link (e.g. /teams/)', 'text', { req: 1 }], ['sort_order', 'Order', 'number', { def: 0 }], ['is_published', 'Published', 'bool', { def: true }]] },
    site_settings: { t: 'Advanced Settings (all keys)', table: 'site_settings', pk: 'key', order: ['key'], note: 'Keys: site_name, tagline, currency (যেমন ৳ বা BDT), contact_email, facebook_url, youtube_url, discord_url।', cols: [['key', 'Key'], ['value', 'Value']], fields: [
      ['key', 'Key', 'text', { req: 1, roEdit: 1 }], ['value', 'Value', 'textarea', { wide: 1 }]] }
  };
  Object.keys(ENT).forEach(function (k) { ENT[k].k = k; ENT[k].pk = ENT[k].pk || 'id'; ENT[k].fields = ENT[k].fields.map(function (f) { return { n: f[0], l: f[1], type: f[2], o: f[3] || {} }; }); });

  var MENU = [['Dashboard', 'dash'], ['h', 'Content'], ['Teams', 'teams'], ['Players', 'players'], ['Player Order', 'order'], ['Organizations', 'organizations'], ['Games', 'games'], ['Ranking Roles', 'roles'],
    ['h', 'Competition'], ['Tournaments', 'tournaments'], ['Tournament Teams', 'ttp'], ['Match Schedule', 'matches'], ['Results', 'results'], ['Achievements', 'achievements'], ['Transfers', 'transfers'],
    ['h', 'Rankings & Earnings'], ['Rankings', 'rankings'], ['Ranking Entries', 'rentries'], ['Earnings', 'earn'], ['h', 'Editorial'], ['News', 'articles'], ['Player Spotlight', 'spotlights'], ['Media Outlets', 'media_outlets'],
    ['h', 'Website'], ['Homepage Sections', 'home_sections'], ['Homepage Tiles', 'home_tiles'], ['Navigation Menu', 'navigation_items'], ['Settings', 'settings'], ['Advanced Settings', 'site_settings'], ['Media Library', 'lib'], ['Contributions', 'contrib']];

  /* ---------------- login ---------------- */
  function loginView(msg) {
    root.innerHTML = '<div class="login"><div class="panel"><h2>Admin Login – Esports Pedia</h2><form class="form" id="lf"><label>Email<input name="email" type="email" required autocomplete="username"></label><label>Password<input name="password" type="password" required autocomplete="current-password"></label>' +
      '<button class="btn red" type="submit">Log in</button>' + (msg ? '<div class="msg bad">' + esc(msg) + '</div>' : '') + '</form></div><p class="muted" style="text-align:center"><a href="/">← Back to website</a></p></div>';
    $('#lf').onsubmit = async function (e) {
      e.preventDefault(); var d = new FormData(e.target), b = $('#lf button'); b.disabled = true;
      var r = await db.auth.signInWithPassword({ email: String(d.get('email')).trim(), password: String(d.get('password')) });
      if (r.error) { loginView('ইমেইল বা পাসওয়ার্ড ঠিক নয়।'); return; }
      start();
    };
  }
  async function start() {
    var s = await db.auth.getSession(); var sess = s.data && s.data.session;
    if (!sess) return loginView();
    var a = await db.from('admin_users').select('user_id').eq('user_id', sess.user.id);
    if (a.error || !a.data || !a.data.length) { await db.auth.signOut(); return loginView('এই অ্যাকাউন্টটি অ্যাডমিন নয়।'); }
    shell(sess.user.email); route();
    EP.q('site_settings').then(function (rs) { rs.forEach(function (r) { EP.settings[r.key] = r.value; }); EP.brand(); }).catch(function () {});
  }
  function shell(email) {
    root.innerHTML = '<div class="ashell"><nav class="aside"><a class="brand" href="/" style="display:flex;gap:8px;align-items:center"><img src="/assets/brand/logo.png" alt="" width="30" height="30"><b>Admin</b></a>' +
      MENU.map(function (m) { return m[0] === 'h' ? '<h4>' + m[1] + '</h4>' : '<a href="#' + m[1] + '" data-v="' + m[1] + '">' + m[0] + '</a>'; }).join('') +
      '<a href="#" id="lo" style="margin-top:12px;color:#ff6b7d">Log out (' + esc(email) + ')</a></nav><main class="amain" id="am"></main></div>';
    main = $('#am'); $('#lo').onclick = async function (e) { e.preventDefault(); await db.auth.signOut(); loginView(); };
    window.onhashchange = route;
  }
  function route() {
    var v = (location.hash || '#dash').slice(1).split('/'); var k = v[0];
    document.querySelectorAll('.aside a[data-v]').forEach(function (a) { a.classList.toggle('on', a.dataset.v === k); });
    main.innerHTML = '<div class="empty">Loading…</div>'; files = {}; flags = {}; refCache = {};
    var run = ENT[k] ? (v[1] === 'edit' ? function () { return formView(ENT[k], v[2] ? decodeURIComponent(v[2]) : null); } : function () { return listView(ENT[k]); }) : VIEWS[k] || VIEWS.dash;
    Promise.resolve(run()).catch(err);
  }

  /* ---------------- helpers ---------------- */
  async function rows(table, cols, order) { var q = db.from(table).select(cols || '*'); if (order) q = q.order(order[0], { ascending: order[1] !== false, nullsFirst: false }); var r = await q.limit(2000); if (r.error) throw r.error; return r.data || []; }
  async function refs(table, label) { var k = table + label; if (!refCache[k]) refCache[k] = await rows(table, 'id,' + label, [label]); return refCache[k]; }
  async function upload(file, folder) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (['png', 'jpg', 'jpeg', 'webp'].indexOf(ext) < 0) throw new Error('শুধু PNG, JPG বা WEBP ছবি দিন।');
    if (file.size > 5 * 1024 * 1024) throw new Error('ছবি ৫ MB-এর কম হতে হবে।');
    var path = folder + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 8) + '.' + ext;
    var r = await db.storage.from('media').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || 'image/' + ext });
    if (r.error) throw r.error; return path;
  }
  function isStored(p) { return p && !/^(https?:|\/?assets\/)/.test(p); }
  async function removeFiles(list) { list = list.filter(isStored); if (list.length) await db.storage.from('media').remove(list); }
  function toLocal(iso) { if (!iso) return ''; var d = new Date(iso); if (isNaN(d)) return ''; var p = function (n) { return String(n).padStart(2, '0'); }; return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); }
  function cell(E, c, row, R) {
    var v = row[c[0]]; if (c[2] === 'ref') { var m = (R[c[3]] || []).filter(function (x) { return x.id === v; })[0]; return m ? esc(m[c[4]]) : '—'; }
    var f = E.fields.filter(function (x) { return x.n === c[0]; })[0];
    if (f && f.type === 'bool') return YN(v); if (v == null || v === '') return '—'; if (/_at$/.test(c[0])) return EP.date(v); if (f && f.type === 'date') return EP.date(v); return esc(String(v).slice(0, 80));
  }

  /* ---------------- generic list ---------------- */
  async function listView(E) {
    var R = {}, rf = E.cols.filter(function (c) { return c[2] === 'ref'; });
    await Promise.all(rf.map(async function (c) { R[c[3]] = await refs(c[3], c[4]); }));
    var data = await rows(E.table, '*', E.order), hasPub = E.fields.some(function (f) { return f.n === 'is_published'; });
    main.innerHTML = '<div class="bar2"><h1>' + E.t + '</h1><span class="sp"></span><input id="sq" type="search" placeholder="Search…" aria-label="Search">' + (E.noAdd ? '' : '<a class="btn red" href="#' + E.k + '/edit">+ Add new</a>') + '</div>' + (E.note ? '<div class="notice">' + esc(E.note) + '</div>' : '') +
      '<div class="panel"><div class="scroll"><table><thead><tr>' + E.cols.map(function (c) { return '<th>' + c[1] + '</th>'; }).join('') + (hasPub ? '<th>Published</th>' : '') + '<th></th></tr></thead><tbody id="tb">' +
      data.map(function (r) {
        var id = r[E.pk];
        return '<tr data-s="' + esc(JSON.stringify(r).toLowerCase()) + '">' + E.cols.map(function (c) { return '<td>' + cell(E, c, r, R) + '</td>'; }).join('') + (hasPub ? '<td><input type="checkbox" data-pub="' + esc(id) + '"' + (r.is_published ? ' checked' : '') + ' aria-label="Published"></td>' : '') +
          '<td style="white-space:nowrap"><a class="btn gold sm" href="#' + E.k + '/edit/' + encodeURIComponent(id) + '">Edit</a> ' + (E.noDel ? '' : '<button class="btn del sm" data-del="' + esc(id) + '">Delete</button>') + '</td></tr>';
      }).join('') + '</tbody></table></div>' + (data.length ? '' : EP.empty('এখনো কিছু যোগ করা হয়নি।')) + '</div>';
    $('#sq').oninput = function (e) { var v = e.target.value.toLowerCase(); document.querySelectorAll('#tb tr').forEach(function (tr) { tr.hidden = tr.dataset.s.indexOf(v) < 0; }); };
    document.querySelectorAll('[data-pub]').forEach(function (c) { c.onchange = async function () { var r = await db.from(E.table).update({ is_published: c.checked }).eq(E.pk, c.dataset.pub); if (r.error) { c.checked = !c.checked; err(r.error); } else toast(c.checked ? 'Published' : 'Unpublished'); }; });
    document.querySelectorAll('[data-del]').forEach(function (b) {
      b.onclick = async function () {
        if (!confirm('সত্যিই মুছে ফেলবেন? এটা আর ফেরানো যাবে না।')) return;
        var row = data.filter(function (r) { return String(r[E.pk]) === b.dataset.del; })[0];
        var r = await db.from(E.table).delete().eq(E.pk, b.dataset.del); if (r.error) return err(r.error);
        await removeFiles(E.fields.filter(function (f) { return f.type === 'image'; }).map(function (f) { return row && row[f.n]; })).catch(function () {});
        toast('Deleted'); listView(E);
      };
    });
  }

  /* ---------------- generic form ---------------- */
  async function formView(E, id) {
    var row = null; if (id) { var r = await db.from(E.table).select('*').eq(E.pk, id).limit(1); if (r.error) throw r.error; row = r.data[0]; if (!row) { main.innerHTML = EP.empty('Not found'); return; } }
    var R = {}; await Promise.all(E.fields.filter(function (f) { return f.type === 'ref'; }).map(async function (f) { R[f.n] = await refs(f.o.table, f.o.label); }));
    var val = function (f) { return row ? row[f.n] : (f.o.def !== undefined ? f.o.def : ''); };
    var inp = function (f) {
      var v = val(f), n = esc(f.n), dis = (f.o.ro || (f.o.roEdit && row)) ? ' readonly' : '';
      if (f.type === 'bool') return '<label class="chk"><input type="checkbox" name="' + n + '"' + (v ? ' checked' : '') + '> ' + esc(f.l) + '</label>';
      var h = '<label' + (f.o.wide ? ' class="wide"' : '') + '>' + esc(f.l) + (f.o.req ? ' *' : '');
      if (f.type === 'textarea') h += '<textarea name="' + n + '"' + (f.o.tall ? ' style="min-height:260px"' : '') + '>' + esc(v) + '</textarea>';
      else if (f.type === 'json') h += '<textarea name="' + n + '">' + esc(row ? JSON.stringify(row[f.n] || [], null, 1) : '[]') + '</textarea>';
      else if (f.type === 'select') h += '<select name="' + n + '">' + f.o.options.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>';
      else if (f.type === 'ref') h += '<select name="' + n + '"><option value="">—</option>' + R[f.n].map(function (o) { return '<option value="' + esc(o.id) + '"' + (o.id === v ? ' selected' : '') + '>' + esc(o[f.o.label]) + '</option>'; }).join('') + '</select>';
      else if (f.type === 'image') { var u = v ? EP.imageUrl(v) : ''; h += '<div class="imgf">' + (u ? '<img id="pv-' + n + '" src="' + esc(u) + '" alt="">' : '<span class="ph" id="pv-' + n + '"></span>') + '<input type="file" accept="image/png,image/jpeg,image/webp" data-img="' + n + '"><button type="button" class="btn del sm" data-rm="' + n + '">Remove</button></div><span class="hint">PNG / JPG / WEBP, সর্বোচ্চ ৫ MB</span>'; }
      else if (f.type === 'datetime') h += '<input type="datetime-local" name="' + n + '" value="' + esc(toLocal(v)) + '">';
      else if (f.type === 'slug') h += '<input name="' + n + '" value="' + esc(v) + '" maxlength="80" autocomplete="off"><span class="hint">' + esc(f.o.hint || 'ছোট ইংরেজি অক্ষর, সংখ্যা ও ড্যাশ। ফাঁকা রাখলে নাম থেকে নিজে তৈরি হবে।') + '</span>';
      else h += '<input name="' + n + '" type="' + (f.type === 'number' ? 'number" step="any' : f.type === 'date' ? 'date' : f.type === 'url' ? 'url' : 'text') + '" value="' + esc(v == null ? '' : v) + '"' + dis + '>';
      return h + '</label>';
    };
    main.innerHTML = '<div class="bar2"><h1>' + (row ? 'Edit' : 'Add') + ' – ' + E.t + '</h1><span class="sp"></span><a class="btn gold" href="#' + E.k + '">← Back</a></div><div class="panel"><form class="aform" id="af">' + E.fields.map(inp).join('') + '<div class="wide" style="grid-column:1/-1"><button class="btn red" type="submit">Save</button></div></form></div>';
    document.querySelectorAll('[data-img]').forEach(function (i) { i.onchange = function () { var f = i.files[0]; if (!f) return; files[i.dataset.img] = f; delete flags[i.dataset.img]; var p = $('#pv-' + i.dataset.img); p.outerHTML = '<img id="pv-' + i.dataset.img + '" src="' + URL.createObjectURL(f) + '" alt="">'; }; });
    document.querySelectorAll('[data-rm]').forEach(function (b) { b.onclick = function () { flags[b.dataset.rm] = 1; delete files[b.dataset.rm]; var p = $('#pv-' + b.dataset.rm); p.outerHTML = '<span class="ph" id="pv-' + b.dataset.rm + '"></span>'; }; });
    $('#af').onsubmit = async function (e) {
      e.preventDefault(); var form = e.target, btn = $('button[type=submit]', form), payload = {}, newFiles = [], oldFiles = [], v = {};
      try {
        for (var i = 0; i < E.fields.length; i++) {
          var f = E.fields[i], el = form.elements[f.n], x;
          if (f.type === 'image') { if (files[f.n]) { var p = await upload(files[f.n], f.o.folder || 'general'); newFiles.push(p); payload[f.n] = p; if (row && row[f.n]) oldFiles.push(row[f.n]); } else if (flags[f.n]) { payload[f.n] = null; if (row && row[f.n]) oldFiles.push(row[f.n]); } continue; }
          if (f.type === 'bool') { payload[f.n] = el.checked; continue; }
          x = el.value.trim();
          if (f.o.req && !x) throw new Error('"' + f.l + '" দিতে হবে।');
          if (f.type === 'number') { x = x === '' ? (f.o.def !== undefined ? f.o.def : null) : Number(x); if (x !== null && isNaN(x)) throw new Error('"' + f.l + '" সংখ্যা হতে হবে।'); }
          else if (f.type === 'json') { try { x = JSON.parse(x || '[]'); if (!Array.isArray(x)) throw 0; } catch (z) { throw new Error('"' + f.l + '" সঠিক JSON তালিকা নয়।'); } }
          else if (f.type === 'datetime') x = x ? new Date(x).toISOString() : null;
          else if (f.type === 'url') { if (x && !EP.safeUrl(x)) throw new Error('"' + f.l + '" http:// বা https:// দিয়ে শুরু হতে হবে।'); x = x || null; }
          else if (f.type === 'ref' || f.type === 'date') x = x || null;
          else if (f.type === 'slug') { if (!x) x = slugify(form.elements[f.o.from].value); if (!SLUG.test(x)) throw new Error('Slug লিখুন: শুধু ছোট ইংরেজি অক্ষর, সংখ্যা ও ড্যাশ (যেমন team-alpha)।'); }
          else if (!x && !f.o.req) x = (f.o.def !== undefined && f.o.def !== '' && typeof f.o.def === 'string') ? f.o.def : null;
          if (!(f.o.ro || (f.o.roEdit && row))) payload[f.n] = x; v[f.n] = x;
        }
        if (E.rule) { var m = E.rule(payload); if (m) throw new Error(m); }
        if (E.k === 'rankings' || E.k === 'roles') { /* nothing extra */ }
        btn.disabled = true;
        var res = row ? await db.from(E.table).update(payload).eq(E.pk, id) : await db.from(E.table).insert([payload]);
        if (res.error) { await removeFiles(newFiles).catch(function () {}); btn.disabled = false; return err(res.error); }
        await removeFiles(oldFiles).catch(function () {});
        toast('Saved'); location.hash = '#' + E.k;
      } catch (ex) { if (btn) btn.disabled = false; await removeFiles(newFiles).catch(function () {}); err(ex); }
    };
  }

  /* ---------------- custom views ---------------- */
  var VIEWS = {};
  VIEWS.dash = async function () {
    var items = [['teams', 'Teams'], ['players', 'Players'], ['tournaments', 'Tournaments'], ['transfers', 'Transfers'], ['articles', 'News']];
    var c = await Promise.all(items.map(function (i) { return db.from(i[0]).select('*', { count: 'exact', head: true }); }));
    var pend = await db.from('contributions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
    var pub = await db.from('articles').select('*', { count: 'exact', head: true }).eq('is_published', true);
    main.innerHTML = '<h1>Dashboard</h1><div class="stats">' + items.map(function (i, n) { return '<div class="stat"><b>' + (c[n].count || 0) + '</b><span>Total ' + i[1] + '</span></div>'; }).join('') +
      '<a class="stat" href="#contrib"><b>' + (pend.count || 0) + '</b><span>Pending contributions</span></a><div class="stat"><b>' + (pub.count || 0) + '</b><span>Published articles</span></div></div>' +
      '<div class="notice">শুরু করতে: Games → Teams → Players যোগ করুন। কিছু <b>Published</b> না করলে সেটা পাবলিক সাইটে দেখা যাবে না।</div>';
  };
  VIEWS.order = async function () {
    var teams = await rows('teams', 'id,name', ['name']);
    main.innerHTML = '<h1>Player Order</h1><div class="notice">টেনে (drag) খেলোয়াড়ের ক্রম ঠিক করুন, তারপর Save order চাপুন। টিম বদলালে ট্রান্সফার ইতিহাসের জন্য Transfers-এও একটা এন্ট্রি দিন।</div><div class="bar2"><select id="ot" aria-label="Team"><option value="">Free Agents</option>' + teams.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>'; }).join('') + '</select><button class="btn red" id="so">Save order</button></div><div class="panel"><ul class="dl" id="ol"></ul></div>';
    var load = async function () {
      var tid = $('#ot').value, q = db.from('players').select('id,ingame_name,status,team_sort_order'); q = tid ? q.eq('current_team_id', tid) : q.is('current_team_id', null);
      var r = await q.order('team_sort_order').order('ingame_name'); if (r.error) return err(r.error);
      $('#ol').innerHTML = r.data.length ? r.data.map(function (p) { return '<li draggable="true" data-id="' + esc(p.id) + '"><span class="h">☰</span><span class="nm">' + esc(p.ingame_name) + '</span><span class="badge">' + esc(p.status) + '</span><select data-mv aria-label="Move to team"><option value="">Move to…</option><option value="null">Free Agent</option>' + teams.map(function (t) { return '<option value="' + esc(t.id) + '">' + esc(t.name) + '</option>'; }).join('') + '</select></li>'; }).join('') : '<li style="cursor:default">এই তালিকায় কোনো খেলোয়াড় নেই।</li>';
      var drag = null; document.querySelectorAll('#ol li[draggable]').forEach(function (li) {
        li.ondragstart = function () { drag = li; li.classList.add('drag'); }; li.ondragend = function () { li.classList.remove('drag'); drag = null; };
        li.ondragover = function (e) { e.preventDefault(); if (!drag || drag === li) return; var b = li.getBoundingClientRect(); li.parentNode.insertBefore(drag, e.clientY > b.top + b.height / 2 ? li.nextSibling : li); };
        $('[data-mv]', li).onchange = async function (e) { var t = e.target.value; if (!t) return; var u = await db.from('players').update({ current_team_id: t === 'null' ? null : t, team_sort_order: 999 }).eq('id', li.dataset.id); if (u.error) return err(u.error); toast('Moved'); load(); };
      });
    };
    $('#ot').onchange = load; $('#so').onclick = async function () {
      var ids = Array.prototype.map.call(document.querySelectorAll('#ol li[data-id]'), function (l) { return l.dataset.id; });
      var res = await Promise.all(ids.map(function (id, i) { return db.from('players').update({ team_sort_order: i }).eq('id', id); }));
      var bad = res.filter(function (r) { return r.error; })[0]; bad ? err(bad.error) : toast('Order saved');
    }; load();
  };
  function childEditor(cfg) {
    return async function () {
      var parents = await rows(cfg.parent, 'id,' + cfg.plabel, [cfg.plabel]), kids = await rows(cfg.kid, 'id,' + cfg.klabel, [cfg.klabel]);
      main.innerHTML = '<h1>' + cfg.t + '</h1>' + (cfg.note ? '<div class="notice">' + esc(cfg.note) + '</div>' : '') + '<div class="bar2"><select id="pp" aria-label="' + cfg.parent + '"><option value="">— ' + cfg.pick + ' —</option>' + parents.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(p[cfg.plabel]) + '</option>'; }).join('') + '</select></div><div id="ce"></div>';
      var load = async function () {
        var pid = $('#pp').value; if (!pid) { $('#ce').innerHTML = ''; return; }
        var r = await db.from(cfg.table).select('*').eq(cfg.pfk, pid).order(cfg.sort || cfg.kfk); if (r.error) return err(r.error); var kn = EP.by(kids);
        $('#ce').innerHTML = '<div class="panel"><div class="scroll"><table><thead><tr><th>' + cfg.kt + '</th>' + cfg.nums.map(function (n) { return '<th>' + n[1] + '</th>'; }).join('') + '<th></th></tr></thead><tbody>' + r.data.map(function (x) {
          return '<tr data-k="' + esc(x[cfg.kfk]) + '"><td>' + esc(kn[x[cfg.kfk]] ? kn[x[cfg.kfk]][cfg.klabel] : '—') + '</td>' + cfg.nums.map(function (n) { return '<td><input class="inl" type="number" step="any" data-f="' + n[0] + '" value="' + esc(x[n[0]] == null ? '' : x[n[0]]) + '"></td>'; }).join('') + '<td style="white-space:nowrap"><button class="btn gold sm" data-sv>Save</button> <button class="btn del sm" data-rmv>Remove</button></td></tr>';
        }).join('') + '</tbody></table></div>' + (r.data.length ? '' : EP.empty('এখনো কিছু যোগ করা হয়নি।')) + '<div class="toolbar"><select id="ak" aria-label="' + cfg.kt + '"><option value="">' + cfg.add + '</option>' + kids.map(function (k) { return '<option value="' + esc(k.id) + '">' + esc(k[cfg.klabel]) + '</option>'; }).join('') + '</select><button class="btn red sm" id="ad">Add</button></div></div>';
        document.querySelectorAll('[data-sv]').forEach(function (b) { b.onclick = async function () { var tr = b.closest('tr'), o = {}; o[cfg.pfk] = pid; o[cfg.kfk] = tr.dataset.k; tr.querySelectorAll('[data-f]').forEach(function (i) { o[i.dataset.f] = i.value === '' ? null : Number(i.value); }); if (cfg.extra) cfg.extra(o); var u = await db.from(cfg.table).upsert([o], { onConflict: cfg.pfk + ',' + cfg.kfk }); u.error ? err(u.error) : toast('Saved'); }; });
        document.querySelectorAll('[data-rmv]').forEach(function (b) { b.onclick = async function () { if (!confirm('সরিয়ে ফেলবেন?')) return; var d = await db.from(cfg.table).delete().eq(cfg.pfk, pid).eq(cfg.kfk, b.closest('tr').dataset.k); d.error ? err(d.error) : (toast('Removed'), load()); }; });
        $('#ad').onclick = async function () { var k = $('#ak').value; if (!k) return; var o = {}; o[cfg.pfk] = pid; o[cfg.kfk] = k; if (cfg.defaults) Object.assign(o, cfg.defaults(r.data)); if (cfg.extra) cfg.extra(o); var u = await db.from(cfg.table).upsert([o], { onConflict: cfg.pfk + ',' + cfg.kfk }); u.error ? err(u.error) : (toast('Added'), load()); };
      };
      $('#pp').onchange = load;
    };
  }
  VIEWS.ttp = childEditor({ t: 'Tournament Teams (participants)', table: 'tournament_teams', parent: 'tournaments', plabel: 'name', pick: 'Select tournament', kid: 'teams', klabel: 'name', pfk: 'tournament_id', kfk: 'team_id', kt: 'Team', add: 'Add a team…', nums: [['seed', 'Seed'], ['placement', 'Placement'], ['prize_won', 'Prize won']] });
  VIEWS.rentries = childEditor({ t: 'Ranking Entries', note: 'র‍্যাঙ্কিং এখন হাতে (manual) বসাতে হয়। Rank, Matches, Kills ও Points লিখে Save চাপুন।', table: 'ranking_entries', parent: 'rankings', plabel: 'name', pick: 'Select ranking', kid: 'players', klabel: 'ingame_name', pfk: 'ranking_id', kfk: 'player_id', kt: 'Player', add: 'Add a player…', sort: 'rank', nums: [['rank', 'Rank'], ['matches', 'Matches'], ['kills', 'Kills'], ['points', 'Points']], defaults: function (l) { return { rank: l.length + 1 }; }, extra: function (o) { o.updated_on = new Date().toISOString().slice(0, 10); if (o.rank == null) o.rank = 1; } });
  VIEWS.earn = async function () {
    main.innerHTML = '<h1>Earnings</h1><div class="notice">খেলোয়াড় ও টিমের মোট আয় এখানে বদলান। শুধু সংখ্যা লিখুন।</div><div class="bar2"><select id="et"><option value="teams">Teams</option><option value="players">Players</option></select></div><div id="ee"></div>';
    var load = async function () {
      var t = $('#et').value, lab = t === 'teams' ? 'name' : 'ingame_name', d = await rows(t, 'id,' + lab + ',total_earnings', [lab]);
      $('#ee').innerHTML = '<div class="panel"><div class="scroll"><table><thead><tr><th>Name</th><th>Total earnings</th><th></th></tr></thead><tbody>' + d.map(function (x) { return '<tr data-id="' + esc(x.id) + '"><td>' + esc(x[lab]) + '</td><td><input class="inl w" type="number" step="any" value="' + esc(x.total_earnings) + '"></td><td><button class="btn gold sm">Save</button></td></tr>'; }).join('') + '</tbody></table></div>' + (d.length ? '' : EP.empty()) + '</div>';
      document.querySelectorAll('#ee button').forEach(function (b) { b.onclick = async function () { var tr = b.closest('tr'), v = Number(tr.querySelector('input').value); if (isNaN(v) || v < 0) return err(new Error('সঠিক সংখ্যা দিন।')); var u = await db.from(t).update({ total_earnings: v }).eq('id', tr.dataset.id); u.error ? err(u.error) : toast('Saved'); }; });
    };
    $('#et').onchange = load; load();
  };
  var FOLDERS = ['branding', 'teams', 'players', 'tournaments', 'organizations', 'games', 'media', 'articles', 'tiles', 'general'];
  VIEWS.lib = async function () {
    main.innerHTML = '<h1>Media Library</h1><div class="bar2"><select id="lf2">' + FOLDERS.map(function (f) { return '<option>' + f + '</option>'; }).join('') + '</select><input type="file" id="lu" accept="image/png,image/jpeg,image/webp"><button class="btn red sm" id="lb">Upload</button></div><div class="panel"><div class="lib" id="ll"></div></div>';
    var load = async function () {
      var f = $('#lf2').value, r = await db.storage.from('media').list(f, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } }); if (r.error) return err(r.error);
      var l = (r.data || []).filter(function (x) { return x.name && x.name !== '.emptyFolderPlaceholder'; });
      $('#ll').innerHTML = l.length ? l.map(function (x) { var p = f + '/' + x.name; return '<div><img src="' + esc(EP.imageUrl(p)) + '" alt=""><span style="word-break:break-all">' + esc(p) + '</span><button class="btn del sm" data-p="' + esc(p) + '">Delete</button></div>'; }).join('') : EP.empty('এই ফোল্ডারে কোনো ছবি নেই।');
      document.querySelectorAll('[data-p]').forEach(function (b) { b.onclick = async function () { if (!confirm('ছবিটি মুছবেন?')) return; var d = await db.storage.from('media').remove([b.dataset.p]); d.error ? err(d.error) : (toast('Deleted'), load()); }; });
    };
    $('#lf2').onchange = load; $('#lb').onclick = async function () { var f = $('#lu').files[0]; if (!f) return toast('একটা ছবি বেছে নিন।', true); try { await upload(f, $('#lf2').value); toast('Uploaded'); $('#lu').value = ''; load(); } catch (e) { err(e); } }; load();
  };
  VIEWS.contrib = async function () {
    var st = (location.hash.split('/')[1]) || 'pending', all = await rows('contributions', '*', ['created_at', false]);
    var l = all.filter(function (c) { return st === 'all' || c.status === st; });
    main.innerHTML = '<h1>Contributions</h1><div class="bar2">' + ['pending', 'approved', 'rejected', 'all'].map(function (s) { return '<a class="btn ' + (s === st ? 'red' : 'gold') + ' sm" href="#contrib/' + s + '">' + s + '</a>'; }).join('') + '</div><div class="notice">অনুমোদন (Approve) মানে আপনি তথ্যটি যাচাই করেছেন। সাইটে প্রকাশ করতে সংশ্লিষ্ট ম্যানেজারে (Teams, Players, Transfers…) গিয়ে নিজে যোগ করুন।</div><div class="panel">' +
      (l.length ? l.map(function (c) { return '<div class="cbox" data-id="' + esc(c.id) + '"><div><span class="badge">' + esc(c.kind) + '</span> <span class="badge">' + esc(c.status) + '</span> <b>' + esc(c.title) + '</b></div><div class="m">' + esc(c.message) + '</div><div class="muted">' + (EP.safeUrl(c.source_url) ? '<a href="' + esc(EP.safeUrl(c.source_url)) + '" target="_blank" rel="noopener noreferrer">Source</a> · ' : '') + esc(c.submitter_name || 'Anonymous') + ' · ' + esc(c.submitter_contact || '—') + ' · ' + EP.date(c.created_at) + '</div><input placeholder="Admin note" value="' + esc(c.admin_note || '') + '" data-n><div><button class="btn red sm" data-s="approved">Approve</button> <button class="btn gold sm" data-s="rejected">Reject</button> <button class="btn gold sm" data-s="pending">Reopen</button> <button class="btn del sm" data-x>Delete</button></div></div>'; }).join('') : EP.empty('কোনো আবেদন নেই।')) + '</div>';
    document.querySelectorAll('.cbox').forEach(function (b) {
      b.querySelectorAll('[data-s]').forEach(function (x) { x.onclick = async function () { var u = await db.from('contributions').update({ status: x.dataset.s, admin_note: $('[data-n]', b).value || null, reviewed_at: new Date().toISOString() }).eq('id', b.dataset.id); u.error ? err(u.error) : (toast('Updated'), VIEWS.contrib()); }; });
      $('[data-x]', b).onclick = async function () { if (!confirm('মুছবেন?')) return; var d = await db.from('contributions').delete().eq('id', b.dataset.id); d.error ? err(d.error) : (toast('Deleted'), VIEWS.contrib()); };
    });
  };


  /* ---------------- Settings (name, description, logo, favicon, contact) ---------------- */
  function checkImg(file, kind) {
    return new Promise(function (ok, no) {
      var ext = (file.name.split('.').pop() || '').toLowerCase();
      if (['png', 'jpg', 'jpeg', 'webp'].indexOf(ext) < 0 || !/^image\/(png|jpeg|webp)$/.test(file.type)) return no(new Error('শুধু PNG, JPG বা WEBP ছবি দিন।'));
      if (file.size > 5 * 1024 * 1024) return no(new Error('ছবি ৫ MB-এর কম হতে হবে।'));
      var u = URL.createObjectURL(file), im = new Image();
      im.onload = function () {
        var w = im.naturalWidth, h = im.naturalHeight;
        if (w < 32 || h < 32) return no(new Error('ছবি কমপক্ষে ৩২×৩২ পিক্সেল হতে হবে।'));
        if (kind === 'favicon' && (w / h < 0.8 || w / h > 1.25)) return no(new Error('ফেভিকন বর্গাকার (square) হতে হবে, যেমন ১২৮×১২৮।'));
        ok(u);
      };
      im.onerror = function () { no(new Error('ছবিটি পড়া যায়নি। অন্য ছবি দিন।')); };
      im.src = u;
    });
  }
  VIEWS.settings = async function () {
    var d = await rows('site_settings', 'key,value'), S = {}; d.forEach(function (r) { S[r.key] = r.value || ''; });
    var pend = {}, rm = {}, DEF = { logo: '/assets/brand/logo.png', favicon: '/assets/brand/favicon.png' }, TXT = ['site_name', 'tagline', 'site_description', 'currency', 'contact_email', 'facebook_url', 'youtube_url', 'discord_url'];
    var cur = function (k) { if (pend[k]) return pend[k].url; if (rm[k]) return DEF[k]; return S['site_' + k] ? EP.imageUrl(S['site_' + k]) : DEF[k]; };
    var state = function (k) { return pend[k] ? 'নতুন ছবি (Save করলে প্রযোজ্য হবে)' : rm[k] ? 'মুছে ফেলা হবে (ডিফল্ট ব্যবহার হবে)' : S['site_' + k] ? 'বর্তমান ছবি' : 'ডিফল্ট ছবি ব্যবহার হচ্ছে'; };
    var box = function (k, title, hint) { return '<div class="bbox ' + (k === 'favicon' ? 'fav' : '') + '"><b>' + title + '</b><div class="pv"><img id="pv-' + k + '" alt=""></div><span class="hint" id="st-' + k + '"></span><input type="file" id="fi-' + k + '" accept="image/png,image/jpeg,image/webp"><div class="btns"><button type="button" class="btn del" data-rs="' + k + '">Remove (ডিফল্টে ফিরুন)</button></div><span class="hint">' + hint + '</span></div>'; };
    var inp = function (k, l, o) { o = o || {}; return '<label' + (o.wide ? ' class="wide"' : '') + '>' + l + '<' + (o.ta ? 'textarea' : 'input') + ' name="' + k + '" maxlength="' + (o.max || 200) + '"' + (o.ta ? '>' + esc(S[k] || '') + '</textarea>' : ' value="' + esc(S[k] || '') + '"' + (o.type ? ' type="' + o.type + '"' : '') + '>') + (o.hint ? '<span class="hint" id="' + o.hint + '"></span>' : '') + '</label>'; };
    main.innerHTML = '<h1>Settings</h1><div class="notice">এখানে বদলালে পাবলিক সাইটের লোগো, নাম, ফেভিকন ও বর্ণনা নিজে থেকেই বদলে যাবে। কোড বা GitHub-এ কিছু বদলাতে হবে না।</div>' +
      '<form id="stf" class="stk"><section class="panel"><h2>Website identity</h2><div class="aform">' + inp('site_name', 'Website name *', { max: 60 }) + inp('tagline', 'Tagline (ছোট বাক্য)', { max: 100 }) +
      inp('site_description', 'Website description (হোমপেজ ও সার্চ ইঞ্জিনে দেখায়)', { max: 300, ta: 1, wide: 1, hint: 'dc' }) + '</div></section>' +
      '<section class="panel"><h2>Logo & Favicon</h2><div class="aform">' + box('logo', 'Website logo', 'PNG / JPG / WEBP, সর্বোচ্চ ৫ MB, কমপক্ষে ৩২×৩২ পিক্সেল। স্বচ্ছ ব্যাকগ্রাউন্ডের PNG ভালো।') + box('favicon', 'Favicon (ব্রাউজার ট্যাবের আইকন)', 'বর্গাকার PNG, যেমন ১২৮×১২৮ পিক্সেল।') +
      '</div><div class="bprev" aria-label="Preview"><div class="hdr"><img id="pl" alt=""><b id="pn"></b></div><div class="tab"><img id="pf" alt=""><span id="pt"></span></div></div></section>' +
      '<section class="panel"><h2>Contact & social links</h2><div class="aform">' + inp('currency', 'Currency symbol (যেমন ৳ বা BDT)', { max: 10 }) + inp('contact_email', 'Contact email', { max: 120, type: 'email' }) + inp('facebook_url', 'Facebook link (https://…)', { type: 'url' }) + inp('youtube_url', 'YouTube link (https://…)', { type: 'url' }) + inp('discord_url', 'Discord link (https://…)', { type: 'url' }) + '</div></section>' +
      '<div class="bar2"><button class="btn red" type="submit" id="ssv">Save settings</button><a class="btn gold" href="#site_settings">Advanced (সব key)</a></div></form>';
    var f = $('#stf');
    var refresh = function () {
      ['logo', 'favicon'].forEach(function (k) { $('#pv-' + k).src = cur(k); $('#st-' + k).textContent = state(k); });
      var n = f.elements.site_name.value.trim() || 'Esports Pedia'; $('#pl').src = cur('logo'); $('#pf').src = cur('favicon'); $('#pn').textContent = n; $('#pt').textContent = n;
      $('#dc').textContent = f.elements.site_description.value.length + '/300 (সার্চ ইঞ্জিনের জন্য ১৫০–১৬০ অক্ষর ভালো)';
    };
    f.addEventListener('input', refresh); refresh();
    ['logo', 'favicon'].forEach(function (k) {
      $('#fi-' + k).onchange = async function (e) {
        var file = e.target.files[0]; if (!file) return;
        try { var u = await checkImg(file, k); pend[k] = { file: file, url: u }; delete rm[k]; } catch (x) { e.target.value = ''; err(x); }
        refresh();
      };
    });
    document.querySelectorAll('[data-rs]').forEach(function (b) { b.onclick = function () { var k = b.dataset.rs; delete pend[k]; rm[k] = 1; $('#fi-' + k).value = ''; refresh(); }; });
    f.onsubmit = async function (e) {
      e.preventDefault(); var v = {}, up = [], old = [], btn = $('#ssv');
      TXT.forEach(function (k) { v[k] = f.elements[k].value.trim(); });
      var bad = null;
      if (v.site_name.length < 2 || v.site_name.length > 60) bad = 'Website name ২ থেকে ৬০ অক্ষরের মধ্যে হতে হবে।';
      else if (v.tagline.length > 100) bad = 'Tagline ১০০ অক্ষরের বেশি হবে না।';
      else if (v.site_description.length > 300) bad = 'Description ৩০০ অক্ষরের বেশি হবে না।';
      else if (v.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.contact_email)) bad = 'Contact email সঠিক নয়।';
      else ['facebook_url', 'youtube_url', 'discord_url'].forEach(function (k) { if (!bad && v[k] && !EP.safeUrl(v[k])) bad = k.replace('_url', '') + ' লিংক http:// বা https:// দিয়ে শুরু হতে হবে।'; });
      if (bad) return err(new Error(bad));
      btn.disabled = true;
      try {
        for (var i = 0, ks = ['logo', 'favicon']; i < ks.length; i++) {
          var k = ks[i], key = 'site_' + k;
          if (pend[k]) { var p = await upload(pend[k].file, 'branding'); up.push(p); if (isStored(S[key])) old.push(S[key]); v[key] = p; }
          else if (rm[k]) { if (isStored(S[key])) old.push(S[key]); v[key] = ''; }
        }
        var batch = Object.keys(v).map(function (k) { return { key: k, value: v[k] }; });
        var r = await db.from('site_settings').upsert(batch, { onConflict: 'key' });
        if (r.error) throw r.error;
        await removeFiles(old).catch(function () {});
        Object.keys(v).forEach(function (k) { EP.settings[k] = v[k]; }); EP.brand();
        toast('Settings saved'); VIEWS.settings();
      } catch (x) { await removeFiles(up).catch(function () {}); btn.disabled = false; err(x); }
    };
  };

  /* ---------------- boot ---------------- */
  if (!EP.configured || !db) { root.innerHTML = '<div class="login"><div class="notice">js/config.js-এ Supabase URL ও anon key বসান (SETUP-BN.md দেখুন)।</div></div>'; return; }
  db.auth.onAuthStateChange(function (ev) { if (ev === 'SIGNED_OUT') loginView(); });
  start().catch(function (e) { loginView(e && e.message); });
})();
