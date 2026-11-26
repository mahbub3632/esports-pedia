/* Esports Pedia v2 - shared layout + helpers (public site) */
(function () {
  var EP = window.EP = window.EP || {};
  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  EP.esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return ESC[c]; }); };
  var esc = EP.esc;
  EP.safeUrl = function (u) { return /^https?:\/\//i.test(u || '') ? u : ''; };
  EP.settings = {};
  EP.money = function (n) {
    if (n === null || n === undefined || n === '') return '—';
    var v = Number(n); if (isNaN(v)) return '—';
    return (EP.settings.currency ? EP.settings.currency + ' ' : '') + v.toLocaleString('en-US', { maximumFractionDigits: 2 });
  };
  EP.date = function (d) {
    if (!d) return '—'; var x = new Date(d); if (isNaN(x)) return '—';
    return x.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };
  EP.by = function (rows, key) { var o = {}; (rows || []).forEach(function (r) { o[r[key || 'id']] = r; }); return o; };
  // ---- database helper: read published rows (RLS hides the rest) ----
  EP.q = async function (table, o) {
    o = o || {};
    var q = EP.db.from(table).select(o.select || '*');
    Object.keys(o.eq || {}).forEach(function (k) { q = q.eq(k, o.eq[k]); });
    var ins = o.in || {}, k2;
    for (k2 in ins) { if (!ins[k2].length) return []; q = q.in(k2, ins[k2]); }
    Object.keys(o.ilike || {}).forEach(function (k) { q = q.ilike(k, '%' + o.ilike[k] + '%'); });
    (o.order || []).forEach(function (x) { q = q.order(x[0], { ascending: x[1] !== false, nullsFirst: false }); });
    if (o.limit) q = q.limit(o.limit);
    var r = await q; if (r.error) throw r.error; return r.data || [];
  };
  // exact number of published rows (works past the 1000-row API limit)
  EP.count = async function (table) {
    var r = await EP.db.from(table).select('*', { count: 'exact', head: true }); if (r.error) throw r.error; return r.count || 0;
  };
  // fetch ALL published rows in pages of 1000 (Supabase returns at most 1000 rows per request)
  EP.all = async function (table, cols) {
    var out = [], from = 0;
    for (;;) {
      var r = await EP.db.from(table).select(cols || '*').order('id').range(from, from + 999); if (r.error) throw r.error;
      var d = r.data || []; out = out.concat(d); if (d.length < 1000 || from > 100000) break; from += 1000;
    }
    return out;
  };
  EP.one = async function (table, eq) { var r = await EP.q(table, { eq: eq, limit: 1 }); return r[0] || null; };
  // ---- addresses ----
  EP.L = {
    team: function (s) { return '/teams/' + encodeURIComponent(s); }, player: function (s) { return '/players/' + encodeURIComponent(s); },
    tournament: function (s) { return '/tournaments/' + encodeURIComponent(s); }, org: function (s) { return '/organizations/' + encodeURIComponent(s); },
    game: function (s) { return '/games/' + encodeURIComponent(s); }, ranking: function (s) { return '/rankings/' + encodeURIComponent(s); },
    news: function (s) { return '/news/' + encodeURIComponent(s); }
  };
  EP.slug = function () {
    var p = location.pathname.split('/').filter(Boolean);
    return new URLSearchParams(location.search).get('slug') || (p[1] ? decodeURIComponent(p[1]) : '');
  };
  // ---- small html builders ----
  EP.img = function (path, alt, cls) {
    cls = cls || 'thumb'; var u = EP.imageUrl(path);
    if (!u) return '<span class="' + cls + ' ph"></span>';
    return '<img class="' + cls + '" src="' + esc(u) + '" alt="' + esc(alt || '') + '" loading="lazy" onerror="this.outerHTML=\'<span class=&quot;' + cls + ' ph&quot;></span>\'">';
  };
  EP.panel = function (title, body, id) { return '<section class="panel"' + (id ? ' id="' + id + '"' : '') + '><h2>' + esc(title) + '</h2>' + body + '</section>'; };
  EP.empty = function (m) { return '<div class="empty">' + esc(m || 'No information has been published yet.') + '</div>'; };
  EP.table = function (heads, rows) {
    if (!rows.length) return EP.empty();
    return '<div class="scroll"><table><thead><tr>' + heads.map(function (h) { return '<th' + (/^#?(Points|Kills|Total|Matches|Earnings)/.test(h) ? ' class="num"' : '') + '>' + h + '</th>'; }).join('') + '</tr></thead><tbody>' + rows.join('') + '</tbody></table></div>';
  };
  EP.tl = function (t) { return t ? '<a class="ent" href="' + EP.L.team(t.slug) + '">' + EP.img(t.logo_path, t.name, 'thumb sm') + '<span>' + esc(t.name) + '</span></a>' : '<span class="muted">—</span>'; };
  EP.pl = function (p) { return p ? '<a class="ent" href="' + EP.L.player(p.slug) + '">' + EP.img(p.photo_path, p.ingame_name, 'thumb sm round') + '<span>' + esc(p.ingame_name) + '</span></a>' : '<span class="muted">—</span>'; };
  EP.tourl = function (t) { return t ? '<a href="' + EP.L.tournament(t.slug) + '">' + esc(t.name) + '</a>' : '<span class="muted">—</span>'; };
  EP.socials = function (o) {
    var l = [['website', 'Website'], ['facebook', 'Facebook'], ['youtube', 'YouTube'], ['instagram', 'Instagram'], ['discord', 'Discord']].filter(function (x) { return EP.safeUrl(o[x[0]]); })
      .map(function (x) { return '<a href="' + esc(EP.safeUrl(o[x[0]])) + '" target="_blank" rel="noopener noreferrer">' + x[1] + '</a>'; });
    return l.length ? '<div class="soc">' + l.join('') + '</div>' : '';
  };
  EP.info = function (cover, rows, extra) {
    return '<section class="panel info"><h2>Information</h2><div class="cover">' + cover + '</div><dl>' +
      rows.filter(function (r) { return r[1] !== '' && r[1] != null; }).map(function (r) { return '<dt>' + esc(r[0]) + '</dt><dd' + (r[2] ? ' class="g"' : '') + '>' + (r[3] ? r[1] : esc(r[1])) + '</dd>'; }).join('') + '</dl>' + (extra || '') + '</section>';
  };
  EP.toc = function (items) { return EP.panel('Contents', '<div class="body"><div class="chips">' + items.map(function (i) { return '<a href="#' + i[0] + '">' + esc(i[1]) + '</a>'; }).join('') + '</div></div>'); };
  EP.crumb = function (a) { return '<div class="crumb"><a href="/">Home</a> / ' + a.map(function (x) { return x[1] ? '<a href="' + x[1] + '">' + esc(x[0]) + '</a>' : esc(x[0]); }).join(' / ') + '</div>'; };
  EP.paras = function (t) { return (t ? String(t).split(/\n{2,}/) : []).map(function (p) { return '<p>' + esc(p).replace(/\n/g, '<br>') + '</p>'; }).join(''); };
  EP.status = function (s) { return '<span class="badge' + (s === 'live' || s === 'ongoing' ? ' live' : s === 'active' ? ' ok' : '') + '">' + esc(String(s || '').replace('_', ' ')) + '</span>'; };

  // ---- layout ----
  var DEFAULT_NAV = [['Home', '/'], ['Teams', '/teams/'], ['Players', '/players/'], ['Tournaments', '/tournaments/'], ['Transfers', '/transfers/'], ['Results', '/results/'], ['Statistics', '/statistics/'], ['Rankings', '/rankings/'], ['Earnings', '/earnings/'], ['Organizations', '/organizations/'], ['Games', '/games/'], ['Media', '/media/'], ['News', '/news/'], ['Spotlight', '/spotlight/']];
  function active(url) { var p = location.pathname; return url === '/' ? (p === '/' || p === '/index.html') : p.indexOf(url.replace(/\/$/, '')) === 0; }
  function navHtml(items) {
    var a = function (x) { return '<a href="' + esc(x[1]) + '"' + (active(x[1]) ? ' class="on"' : '') + '>' + esc(x[0]) + '</a>'; };
    return items.slice(0, 8).map(a).join('') + (items.length > 8 ? '<details class="more"><summary>More</summary><div class="drop">' + items.slice(8).map(a).join('') + '</div></details>' : '');
  }
  EP.layout = function () {
    var app = document.getElementById('app');
    var head = document.createElement('div');
    head.innerHTML = '<header class="top" id="top"><div class="wrap"><a class="brand" href="/"><img src="/assets/brand/logo.png" alt="EP" onerror="this.onerror=null;this.src=\'/assets/brand/logo.png\'"><b id="bn">Esports <span>Pedia</span></b></a>' +
      '<form class="search" role="search" action="/search/" method="get"><input id="q" name="q" type="search" placeholder="Search teams, players, tournaments" aria-label="Search" maxlength="80"><button type="submit">Search</button></form>' +
      '<a class="btn red" href="/submit/">Submit an Update</a></div></header><nav class="main" aria-label="Main"><div class="wrap" id="nav">' + navHtml(DEFAULT_NAV) + '</div></nav>';
    while (head.firstChild) document.body.insertBefore(head.firstChild, app);
    var foot = document.createElement('div');
    foot.innerHTML = '<footer class="site"><div class="wrap"><span><b id="fn">Esports Pedia</b> – <span id="ft">Bangladesh Esports Encyclopedia</span></span><nav aria-label="Footer"><a href="/submit/">Submit an Update</a><a href="/media/">Media</a><a href="/news/">News</a><span id="fsoc"></span><a href="/admin/">Admin</a></nav></div></footer>' +
      '<nav class="bar" aria-label="Quick"><a href="/news/"><svg viewBox="0 0 24 24"><path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-6 1-9z"/></svg>Trending</a>' +
      '<a href="/tournaments/"><svg viewBox="0 0 24 24"><path d="M8 4h8v5a4 4 0 0 1-8 0V4zM8 6H4v1a3 3 0 0 0 4 3M16 6h4v1a3 3 0 0 1-4 3M12 13v4M8 20h8"/></svg>Tournaments</a>' +
      '<a class="c" href="/submit/"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></svg>Contribute</a>' +
      '<a href="/search/"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6"/><path d="M16 16l4 4"/></svg>Search</a>' +
      '<a href="#top"><svg viewBox="0 0 24 24"><path d="M12 19V5M6 11l6-6 6 6"/></svg>Top</a></nav>';
    while (foot.firstChild) document.body.appendChild(foot.firstChild);
    var d = document.querySelector('nav.main details'); if (d && window.innerWidth < 900) d.open = true;
  };
  // ---- brand (name / logo / favicon) controlled from Admin > Settings ----
  function nameHtml(n) { var w = String(n).trim().split(/\s+/); return w.length > 1 ? esc(w.slice(0, -1).join(' ')) + ' <span>' + esc(w[w.length - 1]) + '</span>' : esc(n); }
  EP.applyBrand = function (b) {
    var name = b.name || 'Esports Pedia';
    document.querySelectorAll('.brand img').forEach(function (i) { if (i.getAttribute('src') !== b.logo) { i.onerror = function () { i.onerror = null; i.src = '/assets/brand/logo.png'; }; i.src = b.logo; } });
    var bn = document.getElementById('bn'); if (bn) bn.innerHTML = nameHtml(name);
    var fn = document.getElementById('fn'); if (fn) fn.textContent = name;
    var ft = document.getElementById('ft'); if (ft && b.tag) ft.textContent = b.tag;
    var ic = document.querySelector('link[rel~="icon"]'); if (ic && b.fav) ic.setAttribute('href', b.fav);
    document.title = document.title.replace(/Esports Pedia/g, name);
  };
  EP.brand = function () {
    var s = EP.settings || {};
    var b = { name: (s.site_name || '').trim() || 'Esports Pedia', tag: (s.tagline || '').trim(), logo: s.site_logo ? EP.imageUrl(s.site_logo) : '/assets/brand/logo.png', fav: s.site_favicon ? EP.imageUrl(s.site_favicon) : '/assets/brand/favicon.png' };
    EP.applyBrand(b);
    if ((s.site_description || '').trim() && document.body.dataset.page === 'home') { var m = document.querySelector('meta[name="description"]'); if (m) m.setAttribute('content', s.site_description.trim()); }
    try { localStorage.setItem('ep_brand', JSON.stringify(b)); } catch (e) { /* private mode */ }
  };
  EP.cachedBrand = function () { try { var c = JSON.parse(localStorage.getItem('ep_brand') || 'null'); if (c && c.logo) EP.applyBrand(c); } catch (e) { /* ignore */ } };
  EP.loadChrome = async function () {
    try {
      var s = await EP.q('site_settings'); s.forEach(function (r) { EP.settings[r.key] = r.value; }); EP.brand();
      var n = await EP.q('navigation_items', { order: [['sort_order']] });
      if (n.length) { document.getElementById('nav').innerHTML = navHtml(n.filter(function (x) { return !x.parent_id; }).map(function (x) { return [x.label, x.url]; })); var d = document.querySelector('nav.main details'); if (d && window.innerWidth < 900) d.open = true; }
      var f = [['facebook_url', 'Facebook'], ['youtube_url', 'YouTube'], ['discord_url', 'Discord']].filter(function (x) { return EP.safeUrl(EP.settings[x[0]]); })
        .map(function (x) { return '<a href="' + esc(EP.safeUrl(EP.settings[x[0]])) + '" target="_blank" rel="noopener noreferrer">' + x[1] + '</a>'; }).join('');
      document.getElementById('fsoc').innerHTML = f;
    } catch (e) { /* menu falls back to the default links */ }
  };
  EP.run = async function () {
    EP.layout(); EP.cachedBrand();
    var app = document.getElementById('app'), page = document.body.dataset.page;
    if (!EP.configured || !EP.db) { app.innerHTML = '<div class="notice"><b>সাইট এখনো Supabase-এর সাথে যুক্ত হয়নি।</b><br>js/config.js ফাইলে Project URL ও anon key বসান (SETUP-BN.md দেখুন)।</div>'; return; }
    app.innerHTML = '<div class="empty">Loading…</div>';
    try {
      await EP.loadChrome();
      var fn = EP.P[page]; if (!fn) throw new Error('Unknown page');
      var html = await fn(); if (html != null) app.innerHTML = html;
      if (EP.after) { EP.after(); EP.after = null; }
      if (location.hash) { var el = document.getElementById(location.hash.slice(1)); if (el) el.scrollIntoView(); }
    } catch (e) {
      console.error(e);
      app.innerHTML = '<div class="notice">কিছু একটা সমস্যা হয়েছে। পেজটি রিফ্রেশ করে আবার চেষ্টা করুন।<br><span class="muted">' + esc(e && e.message || '') + '</span></div>';
    }
  };
  EP.P = {};
})();
