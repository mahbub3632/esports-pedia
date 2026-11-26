// Esports Pedia v2 - shared Supabase client. Load AFTER config.js and the supabase-js script.
window.EP = window.EP || {};
(function () {
  var c = window.EP_CONFIG || {};
  EP.configured = !!c.SUPABASE_URL && c.SUPABASE_URL.indexOf('PASTE_') !== 0 &&
                  !!c.SUPABASE_ANON_KEY && c.SUPABASE_ANON_KEY.indexOf('PASTE_') !== 0;
  EP.db = EP.configured && window.supabase ? window.supabase.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY) : null;
  // Public address of an image stored in the "media" bucket (or a file inside the project).
  EP.imageUrl = function (path) {
    if (!path) return '';
    if (/^https?:/.test(path)) return path;
    if (/^\/?assets\//.test(path)) return '/' + path.replace(/^\//, '');
    return EP.configured ? c.SUPABASE_URL + '/storage/v1/object/public/media/' + path : '';
  };
})();
