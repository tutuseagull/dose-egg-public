/* prefs.js: the one copy of how a page picks up the person's settings.
   Loaded in <head> by every current prototype, before the page paints, so a chosen
   text size never flashes at the default first. Settings are saved by
   prototypes/settings.html. Prototype only: the real app reads them from the
   phone's own storage. */
(function () {
  var get = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  var s = get('doseegg-text-scale');
  if (s) document.documentElement.dataset.textScale = s;

  /* languages: 'phone' (default) follows the phone's language, if we have it */
  var SUPPORTED = ['en', 'ja', 'zh'];
  function phoneLang() {
    var l = (navigator.language || 'en').slice(0, 2).toLowerCase();
    return SUPPORTED.indexOf(l) >= 0 ? l : 'en';
  }
  window.DoseEggPrefs = {
    appLang: function () {
      var v = get('doseegg-app-lang');
      return v && v !== 'phone' ? v : phoneLang();
    },
    /* the default report language; the report's own picker can still change it */
    reportLang: function () {
      var v = get('doseegg-report-lang');
      return v && v !== 'app' ? v : this.appLang();
    },
    get: get,
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    remove: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
})();
