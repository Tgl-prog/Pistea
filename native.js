/* Pistea · puente con la app nativa (iPhone/Android con Capacitor).
 * En la web este archivo no hace nada. Dentro de la app:
 *  - el GPS sigue funcionando con el móvil bloqueado (plugin BackgroundGeolocation),
 *  - en segundo plano la posición se envía por HTTP nativo a la API REST de Firestore,
 *    porque la conexión de Firestore del navegador se duerme cuando la app no está delante.
 */
(function () {
  var C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return;
  if (!C.registerPlugin) { console.error("[vallik] falta Capacitor.registerPlugin (capacitor.js no cargó)"); return; }

  var BG = C.registerPlugin("BackgroundGeolocation");
  var Http = (C.Plugins && C.Plugins.CapacitorHttp) || C.registerPlugin("CapacitorHttp");
  /* App Check con App Attest: demuestra a Firebase que las peticiones vienen de Vallik de verdad. */
  var FAC = C.registerPlugin("FirebaseAppCheck");
  var acReady = FAC.initialize({ isTokenAutoRefreshEnabled: true }).catch(function () {});
  /* Inicio de sesión nativo con Apple o Google (la ventana web de Google no funciona dentro de apps).
     El plugin solo consigue las credenciales (skipNativeAuth); la sesión la abre el SDK de la web. */
  var FAU = C.registerPlugin("FirebaseAuthentication");
  /* Valoración con el sistema oficial de Apple (SKStoreReviewController). */
  var IAR = C.registerPlugin("InAppReview");
  /* Actividad en Directo de la ruta (plugin propio en la app: ios/App/App/VallikNav*.swift). */
  var NAV = C.registerPlugin("VallikNav");
  function acToken() {
    return acReady.then(function () { return FAC.getToken(); }).then(function (r) {
      return { token: r.token, expireTimeMillis: r.expireTimeMillis || (Date.now() + 30 * 60000) };
    });
  }
  var cfg = window.PISTEA_FIREBASE || {};
  var watcher = null, navW = null;
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
      var fields = {}; Object.keys(data).forEach(function (k) { if (k !== "ttl") fields[k] = val(data[k]); });
      // Fecha de borrado automático, igual que las escrituras del SDK (withTtl en backend.js): posición y mensajes, 2 días.
      if (window.PISTEA_TTL) fields.ttl = { timestampValue: new Date(Date.now() + 2 * 86400000).toISOString() };
      return acToken().then(function (a) { return a.token; }, function () { return ""; }).then(function (ac) {
      var h = { "Content-Type": "application/json", "Authorization": "Bearer " + t };
      if (ac) h["X-Firebase-AppCheck"] = ac;
      return Http.request({
        url: "https://firestore.googleapis.com/v1/projects/" + cfg.projectId + "/databases/(default)/documents/grupos/" +
          encodeURIComponent(g.code) + "/" + col + "/" + encodeURIComponent(id),
        method: "PATCH",
        headers: h,
        data: { fields: fields }
      });
      });
    }).then(function (r) { if (r.status >= 300) throw new Error("firestore " + r.status); return true; });
  }

  window.PisteaNative = {
    /* Token de App Check para el SDK de Firebase de la web (CustomProvider en backend.js) */
    appCheckToken: acToken,
    askReview: function () { return IAR.requestReview(); },
    /* d: { dest, step, kind, color, next, nextKind, nextColor, mins, idx, total, done, label }. Empieza o actualiza. */
    navActivity: function (d) { return NAV.update(d); },
    navActivityEnd: function () { return NAV.end(); },
    /* Voz de la guía con el sintetizador del iPhone (sigue con el móvil bloqueado). */
    speak: function (text, lang) { return NAV.speak({ text: text, lang: lang }); },
    stopSpeaking: function () { return NAV.stopSpeaking(); },
    /* k: "apple" o "google". Devuelve { idToken, accessToken, nonce, authorizationCode } */
    signIn: function (k) {
      var f = k === "apple" ? FAU.signInWithApple({ skipNativeAuth: true }) : FAU.signInWithGoogle({ skipNativeAuth: true });
      return f.then(function (r) { return (r && r.credential) || {}; });
    },
    /* Apple exige cortar el permiso al borrar la cuenta: se pide un código nuevo y se revoca. */
    revokeApple: function () {
      return FAU.signInWithApple({ skipNativeAuth: true }).then(function (r) {
        var c = (r && r.credential) || {};
        if (!c.authorizationCode) throw new Error("sin-codigo");
        return FAU.revokeAccessToken({ token: c.authorizationCode }).then(function () { return c; });
      });
    },
    /* GPS que no se para en segundo plano. cb recibe lo mismo que navigator.geolocation. */
    watch: function (cb, onDenied) {
      if (watcher === "cancel") { watcher = "pending"; return; }   // se paró y se volvió a pedir antes de arrancar
      if (watcher) return;
      rememberToken();
      watcher = "pending";
      BG.addWatcher({
        backgroundTitle: (EN?((CA?"Vallik en directe":FR?"Vallik en direct":"Vallik live")):"Vallik en directo"),
        backgroundMessage: (EN?((CA?"El teu grup pot veure on ets. Obre Vallik per aturar-ho.":FR?"Ton groupe peut voir où tu es. Ouvre Vallik pour arrêter.":"Your group can see where you are. Open Vallik to stop.")):"Tu grupo ve dónde estás. Abre Vallik para parar."),
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
    /* GPS solo para la ruta paso a paso. Sigue con el móvil bloqueado (para la Actividad en Directo y la voz),
       sin el mensaje de "tu grupo te ve". Va aparte del directo. */
    navWatch: function (cb) {
      if (navW === "cancel") { navW = "pending"; return; }
      if (navW) return;
      navW = "pending";
      BG.addWatcher({
        backgroundTitle: (EN?((CA?"Vallik et guia":FR?"Vallik te guide":"Vallik is guiding you")):"Vallik te guía"),
        backgroundMessage: (EN?((CA?"Seguint la teva ruta.":FR?"Suit ton itinéraire.":"Following your route.")):"Siguiendo tu ruta."),
        requestPermissions: true, stale: false, distanceFilter: 10
      }, function (loc, err) {
        if (err || !loc) return;
        cb({ coords: { latitude: loc.latitude, longitude: loc.longitude, accuracy: loc.accuracy }, timestamp: loc.time || Date.now() });
      }).then(function (id) {
        if (navW === "cancel") { BG.removeWatcher({ id: id }); navW = null; } else navW = id;
      });
    },
    navUnwatch: function () {
      if (!navW) return;
      if (navW === "pending") { navW = "cancel"; return; }
      if (navW !== "cancel") { BG.removeWatcher({ id: navW }); navW = null; }
    },
    unwatch: function () {
      if (!watcher) return;
      if (watcher === "pending") { watcher = "cancel"; return; }
      if (watcher !== "cancel") { BG.removeWatcher({ id: watcher }); watcher = null; }
    },
    openSettings: function () { return BG.openSettings(); },
    /* Leer una web de otro dominio (estado oficial de pistas). Solo se puede desde la app: el navegador lo bloquea. */
    get: function (url) {
      return Http.request({ url: url, method: "GET", responseType: "text", connectTimeout: 15000, readTimeout: 20000,
        headers: { "Accept": "text/html", "Accept-Language": "fr-FR,fr;q=0.9", "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" } })
        .then(function (r) { if (r.status >= 300) throw new Error("http " + r.status); return typeof r.data === "string" ? r.data : JSON.stringify(r.data); });
    },
    /* En segundo plano, escribir por HTTP nativo. Delante, la app usa el SDK de siempre. */
    background: function () { return document.hidden; },
    send: restSet
  };
})();
