/* Pistea · puente con la app nativa (iPhone/Android con Capacitor).
 * En la web este archivo no hace nada. Dentro de la app:
 *  - el GPS sigue funcionando con el móvil bloqueado (plugin BackgroundGeolocation),
 *  - en segundo plano la posición se envía por HTTP nativo a la API REST de Firestore,
 *    porque la conexión de Firestore del navegador se duerme cuando la app no está delante.
 */
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;

  var BG = C.registerPlugin("BackgroundGeolocation");
  var Http = (C.Plugins && C.Plugins.CapacitorHttp) || C.registerPlugin("CapacitorHttp");
  var cfg = window.PISTEA_FIREBASE || {};
  var watcher = null;
  var tok = { id: null, exp: 0, refresh: null };

  document.documentElement.classList.add("native");

  /* Token de Firebase: se guarda mientras la app está delante y se renueva por HTTP nativo si caduca en segundo plano. */
  function rememberToken() {
    try {
      var u = window.firebase && firebase.auth().currentUser;
      if (!u) return Promise.resolve();
      tok.refresh = u.refreshToken || tok.refresh;
      return u.getIdTokenResult().then(function (r) { tok.id = r.token; tok.exp = Date.parse(r.expirationTime) || 0; }, function () {});
    } catch (e) { return Promise.resolve(); }
  }
  function idToken() {
    if (tok.id && tok.exp - Date.now() > 5 * 60000) return Promise.resolve(tok.id);
    if (!tok.refresh) return Promise.reject(new Error("sin token"));
    return Http.request({
      url: "https://securetoken.googleapis.com/v1/token?key=" + encodeURIComponent(cfg.apiKey),
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      data: "grant_type=refresh_token&refresh_token=" + encodeURIComponent(tok.refresh)
    }).then(function (r) {
      var d = typeof r.data === "string" ? JSON.parse(r.data) : r.data;
      if (!d || !d.id_token) throw new Error("token " + r.status);
      tok.id = d.id_token; tok.refresh = d.refresh_token || tok.refresh;
      tok.exp = Date.now() + (+d.expires_in || 3600) * 1000;
      return tok.id;
    });
  }
  document.addEventListener("visibilitychange", function () { if (!document.hidden) rememberToken(); });
  setInterval(function () { if (!document.hidden) rememberToken(); }, 10 * 60000);

  /* Firestore REST: mismo documento y mismos campos que escribe la app con el SDK. */
  function val(v) {
    if (v === null || v === undefined) return { nullValue: null };
    if (typeof v === "boolean") return { booleanValue: v };
    if (typeof v === "number") return Number.isSafeInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
    if (typeof v === "string") return { stringValue: v };
    if (Array.isArray(v)) return { arrayValue: { values: v.map(val) } };
    var f = {}; Object.keys(v).forEach(function (k) { f[k] = val(v[k]); });
    return { mapValue: { fields: f } };
  }
  function restSet(col, id, data) {
    var g = window.PISTEA_GROUP;
    if (!g || !cfg.projectId) return Promise.reject(new Error("sin grupo"));
    return idToken().then(function (t) {
      var fields = {}; Object.keys(data).forEach(function (k) { fields[k] = val(data[k]); });
      return Http.request({
        url: "https://firestore.googleapis.com/v1/projects/" + cfg.projectId + "/databases/(default)/documents/grupos/" +
          encodeURIComponent(g.code) + "/" + col + "/" + encodeURIComponent(id),
        method: "PATCH",
        headers: { "Content-Type": "application/json", "Authorization": "Bearer " + t },
        data: { fields: fields }
      });
    }).then(function (r) { if (r.status >= 300) throw new Error("firestore " + r.status); return true; });
  }

  window.PisteaNative = {
    /* GPS que no se para en segundo plano. cb recibe lo mismo que navigator.geolocation. */
    watch: function (cb, onDenied) {
      if (watcher === "cancel") { watcher = "pending"; return; }   // se paró y se volvió a pedir antes de arrancar
      if (watcher) return;
      rememberToken();
      watcher = "pending";
      BG.addWatcher({
        backgroundTitle: "Pistea en directo",
        backgroundMessage: "Tu grupo ve dónde estás. Abre Pistea para parar.",
        requestPermissions: true,
        stale: false,
        distanceFilter: 20
      }, function (loc, err) {
        if (err) { if (err.code === "NOT_AUTHORIZED" && onDenied) onDenied(); return; }
        if (!loc) return;
        cb({ coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy, altitude: loc.altitude, speed: loc.speed },
             timestamp: loc.time || Date.now() });
      }).then(function (id) {
        if (watcher === "cancel") { BG.removeWatcher({ id: id }); watcher = null; } else watcher = id;
      });
    },
    unwatch: function () {
      if (!watcher) return;
      if (watcher === "pending") { watcher = "cancel"; return; }
      if (watcher !== "cancel") { BG.removeWatcher({ id: watcher }); watcher = null; }
    },
    openSettings: function () { return BG.openSettings(); },
    /* En segundo plano, escribir por HTTP nativo. Delante, la app usa el SDK de siempre. */
    background: function () { return document.hidden; },
    send: restSet
  };
})();
