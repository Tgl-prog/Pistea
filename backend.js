/* Pistea · datos del grupo con Firebase.
 *
 * La app habla con una interfaz mínima (use("db"), use("user")). Este archivo la implementa
 * con Firestore y acceso anónimo, y pide el nombre y el código del grupo la primera vez.
 * Si falta la configuración (firebase-config.js), la app arranca en modo ejemplo.
 * Pensado para la montaña: nada espera a la red. Lo guardado se ve al momento y lo que
 * escribes se envía cuando vuelve la cobertura.
 */
(function () {
  "use strict";
  if (window.claude) return;                       // dentro de Claude se usa su propio almacén
  const cfg = window.PISTEA_FIREBASE;
  if (!cfg || !cfg.apiKey || /PEGA/.test(cfg.apiKey) || !window.firebase) return;

  const LS = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };

  /* ----- Código de grupo: viene en el enlace (#g=...) y se recuerda ----- */
  // Solo se crean grupos con un código generado de 10 caracteres (no se puede elegir uno a mano:
  // «amigos» se adivina y da la posición de todos). Para entrar, el grupo tiene que existir.
  const ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
  function newCode() {
    const a = new Uint8Array(10); crypto.getRandomValues(a);
    return Array.from(a, n => ALPHA[n % ALPHA.length]).join("");
  }
  const CODE_RE = /[#&?]g=([a-z0-9]{6,32})/i;
  function codeIn(text) { const m = CODE_RE.exec(text || ""); return m ? m[1].toLowerCase() : null; }
  function codeFromUrl() { return codeIn(location.hash); }
  // Lo pegado puede ser el enlace entero (se saca g=) o solo el código.
  function codeFromPaste(t) {
    t = String(t || "").trim();
    const c = codeIn(t); if (c) return c;
    const s = t.toLowerCase().replace(/[\s-]/g, "");
    return /^[a-z0-9]{6,32}$/.test(s) ? s : null;
  }
  const savedCode = LS.get("pistea.grupo"), urlCode = codeFromUrl();
  let code = urlCode || savedCode;
  let fromLink = !!urlCode && urlCode !== savedCode;   // enlace de otro grupo: se comprueba y se guarda al entrar
  let creating = false;
  let myName = LS.get("pistea.nombre") || "";

  /* ----- Pantalla de entrada: nombre y grupo ----- */
  // En iPhone, la app de la pantalla de inicio no comparte datos con Safari: al abrirla hay que
  // volver a entrar. Por eso se acepta pegar el enlace entero o el código.
  // Idioma de la landing: el del móvil, salvo que se haya elegido otro con ES/EN.
  const LANG = window.VLANG || "es";
  const L = (es, en) => `<span lang="es">${es}</span><span lang="en">${en}</span>`;
  function askJoin() {
    const note = LS.get("pistea.aviso") || ""; LS.del("pistea.aviso");
    return new Promise(resolve => {
      const el = document.createElement("div");
      el.className = "join";
      el.innerHTML = `
        <div class="lp" data-lang="${LANG}">
        <div class="lp-lang" role="group" aria-label="Idioma / Language"><button type="button" data-lang="es">ES</button><button type="button" data-lang="en">EN</button></div>
        <header class="lp-hero">
          <div class="lp-logo"><svg width="48" height="48" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22.5" fill="#14355A"/><rect x="27" y="16" width="17" height="68" fill="#F6F8FA"/><polygon points="43,58 67,32 87,32 43,79" fill="#F6F8FA"/><polygon points="56,65 66,55 88,84 67,84" fill="#C8F03C"/><path d="M8,40 C30,44 46,58 60,66 C72,73 84,74 96,72" fill="none" stroke="#14355A" stroke-width="4.5" stroke-linecap="round"/></svg><svg class="lp-wm" viewBox="0 0 331 100" width="122" height="37" role="img" aria-label="Vallik"><g fill="#F6F8FA"><path d="M0,34 H21 L33,78 L45,34 H66 L44,100 H22 Z"/><rect x="117" y="34" width="20" height="66"/><rect x="151" y="0" width="20" height="100"/><rect x="185" y="0" width="20" height="100"/><rect x="219" y="34" width="20" height="66"/><rect x="219" y="4" width="20" height="20"/><rect x="253" y="0" width="20" height="100"/><polygon points="272,67 302,34 328,34 272,93"/></g><circle cx="104" cy="67" r="23" fill="none" stroke="#F6F8FA" stroke-width="20"/><polygon points="288,76 301,63 329,100 302,100" fill="#C8F03C"/></svg></div>
          <h1>${L("Que nadie se pierda del grupo","Nobody gets lost from the group")}</h1>
          <p>${L("Ves a tus amigos en el mapa de pistas, llegas hasta ellos y volvéis a casa antes de que cierren los remontes.","See your friends on the piste map, get to them in a few turns and make it home before the lifts close.")}</p>
          <p class="lp-tags"><span>${L("Gratis","Free")}</span><span>${L("Sin instalar nada","No install")}</span><span>${L("Para grupos","Made for groups")}</span></p>
        </header>
        ${code ? `<p class="lp-inv">${L("Te han invitado a un grupo. Entra y en un momento os veis todos en el mapa.","You have been invited to a group. Join and you will all be on the map in a moment.")}</p>` : ""}
        ${canLogin("google") || canLogin("apple") ? `<div class="lp-auth" id="lpauth">
          ${canLogin("google") ? `<button class="btn wide lp-google" type="button" data-login="google">${G_ICON}${L("Continuar con Google","Continue with Google")}</button>` : ""}
          ${canLogin("apple") ? `<button class="btn wide lp-apple" type="button" data-login="apple">${A_ICON}${L("Continuar con Apple","Continue with Apple")}</button>` : ""}
          <small>${L("Con Google tu perfil te sigue aunque cambies de móvil. Si prefieres, entra solo con tu nombre aquí debajo.","With Google your profile follows you if you change phones. Or just use your name below.")}</small>
        </div>` : ""}
        <form class="join-card glass" autocomplete="off" novalidate>
          <h2>${L("Entra en tu grupo","Join your group")}</h2>
          <p class="join-note" role="status" hidden></p>
          <p>${L("Tus amigos te verán con este nombre.","This is the name your friends will see.")}</p>
          <label>${L("Tu nombre","Your name")}<input name="n" maxlength="24" value="${myName.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" autocapitalize="words" enterkeyhint="next"></label>
          ${code ? "" : `<label>${L("Enlace o código del grupo","Group link or code")}<span class="join-row"><input name="c" maxlength="400" placeholder="${LANG==="en"?"Paste the link or code":"Pega el enlace o el código"}" data-ph-es="Pega el enlace o el código" data-ph-en="Paste the link or code" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go">${navigator.clipboard && navigator.clipboard.readText ? `<button class="btn dark" type="button" data-paste>${L("Pegar","Paste")}</button>` : ""}</span><small>${L("Pídeselo a quien creó el grupo.","Ask whoever created the group.")}</small></label>`}
          <button class="btn wide" type="submit">${L("Entrar","Join")}</button>
          ${code ? "" : `<div class="join-or">${L("o","or")}</div><button class="btn ghost wide" type="button" data-new>${L("Crear un grupo nuevo","Create a new group")}</button>`}
        </form>
        <h2 class="lp-h2">${L("Lo que hace por tu grupo","What it does for your group")}</h2>
        <ul class="lp-feat">
          <li><span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="8" r="2.5"/><path d="M16 13.6c2.4 0 4 1.3 4.6 3.9"/></svg></span><div><b>${L("Tu grupo, en directo","Your group, live")}</b><small>${L("Cada amigo es un punto en el mapa 3D de la estación. Sabes dónde está sin llamar a nadie.","Every friend is a dot on the 3D resort map. You know where they are without calling anyone.")}</small></div></li>
          <li><span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 19c3-1 4-5 7-7s6-2 7-7"/><circle cx="5" cy="19" r="2"/><path d="M15 5h4v4"/></svg></span><div><b>${L("Llega hasta quien sea","Get to anyone")}</b><small>${L("Ruta paso a paso por pistas y remontes hasta un amigo, un bar o un remonte. Sin negras, si lo prefieres.","Step by step route over pistes and lifts to a friend, a bar or a lift. Skip the blacks if you like.")}</small></div></li>
          <li><span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg></span><div><b>${L("Vuelve a casa a tiempo","Make it home in time")}</b><small>${L("Te avisa de cuándo salir para no quedarte atrapado en otro valle cuando cierran los remontes.","It tells you when to head back so you are not stuck in the wrong valley when the lifts close.")}</small></div></li>
          <li><span><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg></span><div><b>${L("Quedad sin perder media mañana","Meet up without wasting the morning")}</b><small>${L("Vallik elige el punto que os queda a todos más a mano. Y si alguien tiene un problema, el resto ve cómo llegar.","Vallik picks the spot that is fairest for everyone. And if someone has a problem, the rest see how to reach them.")}</small></div></li>
        </ul>
        <p class="lp-made">${L("Hecha por un grupo de amigos que esquía junto.","Made by a group of friends who ski together.")}</p>
        <p class="lp-foot">vallik.app · <a href="privacidad/" style="color:inherit">${L("Privacidad","Privacy")}</a> · <a href="condiciones/" style="color:inherit">${L("Condiciones","Terms")}</a> · ${L("mapa","map")} © OpenStreetMap</p>
        </div>`;
      const st = document.createElement("style");
      st.textContent = `.join{position:fixed;inset:0;z-index:30;display:block;padding:calc(var(--sat,0px) + 28px) 16px calc(var(--sab,0px) + 28px);overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(14,42,71,.88);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
      .lp{width:min(100%,400px);margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
      .lp-hero{display:grid;gap:14px;padding:8px 4px 4px}
      .lp-logo{display:flex;align-items:center;gap:14px}
      .lp-hero h1{margin:6px 0 0;font:800 34px/36px var(--font);letter-spacing:-.035em;color:var(--tx)}
      .lp-hero p{margin:0;font-size:17px;line-height:24px;color:var(--tx-2)}
      .lp-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px!important}.lp-tags span{padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.07);color:var(--tx);font:500 12px/1 var(--mono);letter-spacing:.01em}.lp-h2{margin:14px 0 -2px;font:700 13px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--tx-2)}.lp-made{margin:6px 0 0;text-align:center;color:var(--tx-2);font-size:14px}
      .lp{position:relative}.lp-lang{position:absolute;top:10px;right:4px;display:flex;padding:3px;border-radius:99px;background:rgba(255,255,255,.07);z-index:1}.lp-lang button{all:unset;cursor:pointer;padding:6px 10px;border-radius:99px;font:600 12px/1 var(--mono);color:var(--tx-2)}.lp[data-lang=es] .lp-lang [data-lang=es],.lp[data-lang=en] .lp-lang [data-lang=en]{background:var(--tx);color:var(--bg)}.lp[data-lang=es] [lang=en],.lp[data-lang=en] [lang=es]{display:none}
      .lp-inv{margin:0;padding:12px 14px;border-radius:14px;background:rgba(200,240,60,.12);box-shadow:inset 0 0 0 1px rgba(200,240,60,.35);font-size:15px}
      .lp-auth{display:grid;gap:10px}
      .lp-auth small{color:var(--tx-2);font-size:13px;line-height:18px;padding:0 4px}
      .lp-auth .btn{display:flex;align-items:center;justify-content:center;gap:10px}
      .lp-google{background:#fff;color:#1F1F1F}
      .lp-apple{background:#000;color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.25)}
      .lp-done{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.06);font-size:14px;color:var(--tx-2)}
      .lp-done b{display:block;color:var(--tx);font-size:15px}
      .lp-feat{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:16px}
      .lp-feat li{display:flex;gap:14px;align-items:flex-start}
      .lp-feat li>span{flex:0 0 44px;height:44px;border-radius:14px;display:grid;place-items:center;background:rgba(200,240,60,.12);color:var(--acc)}
      .lp-feat b{display:block;font-size:16px;line-height:20px}
      .lp-feat small{display:block;margin-top:3px;color:var(--tx-2);font-size:14px;line-height:20px}
      .lp-foot{margin:8px 0 0;text-align:center;color:var(--tx-3);font:500 11px/1 var(--mono)}
      .join-card{width:100%!important}
      .join-brand b{font:700 28px/1.1 var(--font);letter-spacing:-.01em;margin-top:4px}
      .join-brand span{font-size:15px;color:var(--tx-2)}
      .join-row{display:flex;gap:8px}.join-row input{flex:1;min-width:0}.join-row .btn{min-height:52px;padding:0 16px}
      .join-card label small{font:400 13px/16px var(--font);color:var(--tx-2)}
      .join-or{display:flex;align-items:center;gap:10px;color:var(--tx-2);font-size:13px}.join-or::before,.join-or::after{content:"";flex:1;height:1px;background:var(--hair-2)}
      .join-card{width:min(100%,380px);grid-template-columns:minmax(0,1fr);border-radius:var(--r-lg,28px);padding:24px 20px 20px;display:grid;gap:14px;background:var(--glass-2)}
      .join-card h2{margin:0;font:700 22px/26px var(--font);letter-spacing:-.02em}
      .join-card p{margin:-8px 0 0;color:var(--tx-2);font-size:14px}
      .join-card .join-note{margin:0;padding:12px 14px;border-radius:14px;background:rgba(200,240,60,.12);color:var(--tx);font-size:14px}
      .join-card .join-note[hidden]{display:none}
      .join-card label{display:grid;grid-template-columns:minmax(0,1fr);gap:6px;font:600 13px/16px var(--font);color:var(--tx-2)}
      .join-card input{height:52px;border-radius:26px;padding:0 18px;font-size:16px;color:var(--tx);background:rgba(255,255,255,.06);border:1px solid var(--hair);-webkit-appearance:none}
      .join-card input:focus{outline:none;border-color:var(--acc)}
      .join-card .btn.wide+.btn.wide{margin-top:-4px}
      .join-card .btn[disabled]{opacity:.5}`;
      document.head.appendChild(st);
      document.body.appendChild(el);
      const f = el.querySelector("form"), noteEl = el.querySelector(".join-note"), btns = el.querySelectorAll("button");
      const say = t => { noteEl.textContent = t || ""; noteEl.hidden = !t; };
      const busy = on => btns.forEach(b => { b.disabled = on; });
      say(note);
      (myName && f.c ? f.c : f.n).focus();
      const nameOk = () => { myName = f.n.value.trim().slice(0, 24); if (!myName) { say((EN?"Type your name.":"Escribe tu nombre.")); f.n.focus(); } return !!myName; };
      const finish = () => {
        LS.set("pistea.nombre", myName);
        try { history.replaceState(null, "", location.pathname + location.search + "#g=" + code); } catch (e2) {}
        el.remove(); st.remove(); resolve();
      };
      f.addEventListener("submit", async e => {
        e.preventDefault();
        if (!nameOk()) return;
        if (code) { finish(); return; }                 // vino en el enlace: se comprueba al arrancar
        const raw = f.c.value.trim(), c = codeFromPaste(raw);
        if (!raw) { say((EN?"Paste the link or code you were sent. If you're the first, create a new group.":"Pega el enlace o el código que te han enviado. Si eres el primero, crea un grupo nuevo.")); f.c.focus(); return; }
        if (!c) { say((EN?"I can't find the code in what you pasted. Copy the whole link again.":"No encuentro el código en lo que has pegado. Copia otra vez el enlace entero.")); f.c.focus(); return; }
        busy(true); say((EN?"Checking the group…":"Comprobando el grupo…"));
        let ok = null;
        try { await ensureAuth(); ok = await groupExists(c); } catch (er) { ok = null; }
        busy(false);
        if (ok === null) { say((EN?"No connection. You need signal to join a group. Try again.":"Sin conexión. Hace falta cobertura para entrar en un grupo. Prueba otra vez.")); return; }
        if (!ok) { say((EN?"There's no group with that code. Check the link or ask for it again.":"No hay ningún grupo con ese código. Revisa el enlace o pide que te lo envíen otra vez.")); f.c.focus(); return; }
        code = c; fromLink = false; finish();
      });
      el.querySelectorAll("[data-login]").forEach(b => b.addEventListener("click", async () => {
        const k = b.dataset.login; busy(true); say("");
        try {
          const u = await login(k, true);
          const box = el.querySelector("#lpauth"), nm = (u.displayName || "").split(" ")[0];
          if (nm && !f.n.value.trim()) f.n.value = nm.slice(0, 24);
          if (box) box.innerHTML = `<div class="lp-done">${k === "apple" ? A_ICON : G_ICON}<span><b>${L("Has entrado con","Signed in with")} ${k === "apple" ? "Apple" : "Google"}</b>${(u.email || "").replace(/</g, "&lt;")}</span></div>`;
          say(code ? (EN?"Done. Check your name and press Join.":"Ya está. Revisa tu nombre y pulsa Entrar.") : (EN?"Done. Now paste your group link or create a new one.":"Ya está. Ahora pega el enlace de tu grupo o crea uno nuevo."));
          (f.c || f.n).focus();
        } catch (er) { const t = loginErr(er); if (t) say(t); }
        busy(false);
      }));
      el.querySelectorAll(".lp-lang [data-lang]").forEach(b => b.addEventListener("click", () => {
        const v = b.dataset.lang; if (v === LANG) return; LS.set("vallik.lang", v); location.reload(); return;
        const root = el.querySelector(".lp"); root.dataset.lang = v;
        document.documentElement.lang = v;
        el.querySelectorAll("[data-ph-es]").forEach(i => { i.placeholder = i.dataset["ph" + (v === "en" ? "En" : "Es")]; });
      }));
      document.documentElement.lang = LANG;
      const pb = el.querySelector("[data-paste]");
      if (pb) pb.addEventListener("click", async () => { try { const t = await navigator.clipboard.readText(); if (t) { f.c.value = t.trim(); say(""); } } catch (er) { f.c.focus(); } });
      const nb = el.querySelector("[data-new]");
      if (nb) nb.addEventListener("click", async () => {
        if (!nameOk()) return;
        busy(true); say((EN?"Creating the group…":"Creando el grupo…"));
        try { await ensureAuth(); } catch (er) { busy(false); say((EN?"No connection. You need signal to create the group.":"Sin conexión. Hace falta cobertura para crear el grupo.")); return; }
        code = newCode(); creating = true; fromLink = false; finish();
      });
    });
  }

  /* ----- Firebase ----- */
  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  // Copia local de los datos del grupo (IndexedDB): sin cobertura se ve lo último que llegó,
  // y lo que escribas se guarda y se envía al recuperarla. Con el SDK compat 10.x es enablePersistence.
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}

  // Con mala cobertura Firestore puede tardar mucho en contestar: las lecturas del arranque
  // tienen un límite y, si no llegan a tiempo, se sigue con lo guardado.
  const TIMEOUT = {};
  const within = (p, ms) => Promise.race([p.catch(() => null), new Promise(r => setTimeout(() => r(TIMEOUT), ms))]);
  const got = s => s && s !== TIMEOUT ? s : null;

  // El usuario anónimo se guarda en el móvil: sin cobertura sigue valiendo el de la última vez.
  // Solo la primera vez hace falta red para crearlo.
  let authP = null;
  function ensureAuth() {
    if (!authP) authP = new Promise(res => { const off = auth.onAuthStateChanged(u => { off(); res(u); }); })
      .then(u => u || auth.signInAnonymously().then(c => c.user))
      .catch(e => { authP = null; throw e; });
    return authP;
  }

  /* ----- Cuenta: Google o Apple, además del acceso solo con nombre ----- */
  // Si ya tenías sesión anónima, se convierte en cuenta (link): mismo usuario, mismo perfil y grupos.
  // Si esa cuenta ya existía (otro móvil), se entra con ella y recuperas tu usuario de siempre.
  const LOGIN = window.PISTEA_LOGIN || { google: true, apple: false };
  const NATIVE_UA = /PisteaNative/.test(navigator.userAgent) || !/^https?:$/.test(location.protocol);
  const canLogin = k => !NATIVE_UA && !!LOGIN[k];
  function provider(k) {
    if (k === "apple") { const p = new firebase.auth.OAuthProvider("apple.com"); p.addScope("email"); p.addScope("name"); p.setCustomParameters({ locale: "es_ES" }); return p; }
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); return p;
  }
  function loginErr(e) {
    const c = (e && e.code) || "";
    if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "";
    if (c === "auth/operation-not-allowed") return (EN?"Signing in with that account isn't switched on yet. Use your name for now.":"El acceso con esa cuenta aún no está activado. Entra con tu nombre de momento.");
    if (c === "auth/unauthorized-domain") return (EN?"This address still needs to be authorised in Firebase. Use your name for now.":"Falta autorizar esta dirección en Firebase. Entra con tu nombre de momento.");
    if (c === "auth/popup-blocked") return (EN?"The browser blocked the window. Tap the button again.":"El navegador ha bloqueado la ventana. Toca otra vez el botón.");
    if (c === "auth/network-request-failed") return (EN?"No connection. You need signal to sign in with your account.":"Sin conexión. Hace falta cobertura para entrar con tu cuenta.");
    if (c === "auth/operation-not-supported-in-this-environment" || c === "auth/web-storage-unsupported") return (EN?"The sign-in window can't open here. Open vallik.app in Safari.":"Aquí no se puede abrir la ventana de inicio de sesión. Abre vallik.app en Safari.");
    return (EN?"Couldn't sign in with that account. Try again or use your name.":"No se ha podido entrar con la cuenta. Prueba otra vez o entra con tu nombre.");
  }
  // allowSwitch: en la pantalla de entrada se puede pasar a una cuenta que ya existía; dentro de la app, no
  // (cambiaría el usuario y perderías el perfil de este grupo).
  async function login(k, allowSwitch) {
    const pv = provider(k);
    const cur = auth.currentUser || await ensureAuth().catch(() => null);
    let user;
    if (cur && cur.isAnonymous) {
      try { user = (await cur.linkWithPopup(pv)).user; }
      catch (e) {
        if (e && (e.code === "auth/credential-already-in-use" || e.code === "auth/email-already-in-use") && e.credential) {
          if (!allowSwitch) { const er = new Error("en-uso"); er.code = "vallik/en-uso"; throw er; }
          user = (await auth.signInWithCredential(e.credential)).user;
        } else throw e;
      }
    } else user = (await auth.signInWithPopup(pv)).user;
    authP = Promise.resolve(user);
    LS.set("vallik.cuenta", k);
    return user;
  }
  function account() {
    const u = auth.currentUser; if (!u) return null;
    const pd = (u.providerData || [])[0];
    return { anon: u.isAnonymous, via: pd ? (pd.providerId === "google.com" ? "Google" : pd.providerId === "apple.com" ? "Apple" : pd.providerId) : null, email: (pd && pd.email) || u.email || "", name: u.displayName || "" };
  }
  const G_ICON = `<svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>`;
  const A_ICON = `<svg width="18" height="20" viewBox="0 0 17 20" aria-hidden="true"><path fill="currentColor" d="M14.1 10.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9-.1 0-2.7-1-2.7-4.1zM11.6 3c.7-.9 1.2-2 1-3.2-1 0-2.2.7-3 1.6-.6.7-1.2 1.9-1 3.1 1.1.1 2.3-.6 3-1.5z"/></svg>`;

  // ¿Existe el grupo? true / false / null (no se ha podido saber: sin red). Los grupos de antes del
  // cambio no tienen documento propio, pero sí perfiles.
  async function groupExists(c) {
    const g = fs.collection("grupos").doc(c);
    const s = got(await within(g.get({ source: "server" }), 8000));
    if (!s) return null;
    if (s.exists) return true;
    const p = got(await within(g.collection("perfiles").limit(1).get({ source: "server" }), 8000));
    return p ? !p.empty : null;
  }

  let ready = null;
  function goOut(aviso) {
    LS.del("pistea.grupo");
    if (aviso) LS.set("pistea.aviso", aviso);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    // Un momento para que las escrituras pendientes queden guardadas en el móvil antes de recargar.
    setTimeout(() => location.reload(), 400);
  }
  // Enlace que no lleva a ningún grupo: si ya tenías uno, sigues en él.
  function badLink() {
    if (fromLink && savedCode) {
      LS.set("pistea.aviso", (EN?"That link doesn't lead to any group. You're still in your usual group.":"Ese enlace no lleva a ningún grupo. Sigues en tu grupo de siempre."));
      try { history.replaceState(null, "", location.pathname + location.search + "#g=" + savedCode); } catch (e) {}
      setTimeout(() => location.reload(), 50);
    } else goOut((EN?"That link doesn't lead to any group. Paste the right code or create a new group.":"Ese enlace no lleva a ningún grupo. Pega el código correcto o crea un grupo nuevo."));
  }
  function boot() {
    if (ready) return ready;
    ready = (async () => {
      let aviso = null;
      if (!code || !myName) await askJoin();
      else {
        try { history.replaceState(null, "", location.pathname + location.search + "#g=" + code); } catch (e) {}
        aviso = LS.get("pistea.aviso"); LS.del("pistea.aviso");   // sin pantalla de entrada: la app lo enseña
      }
      const uid = (await ensureAuth()).uid;
      const group = fs.collection("grupos").doc(code);
      const kicked = () => goOut((EN?"You were removed from that group. You can create a new one or join another with its code.":"Te han quitado de ese grupo. Puedes crear uno nuevo o entrar en otro con su código."));

      // ¿Me han quitado? ¿Quién creó el grupo? Las dos lecturas a la vez y como mucho 2,5 s
      // (las escrituras nunca se esperan).
      let owner = null;
      if (creating) {
        // Grupo nuevo: documento del grupo y perfil juntos. No se espera: sin cobertura se envía después.
        creating = false; owner = uid;
        const b = fs.batch();
        b.set(group, { owner: uid, at: Date.now() });
        b.set(group.collection("perfiles").doc(uid), { name: myName, at: Date.now() });
        b.commit().catch(() => {});
      } else {
        // Si la red no contesta a tiempo, lo que haya en la copia del móvil.
        const read = async ref => got(await within(ref.get(), 2500)) || got(await within(ref.get({ source: "cache" }), 1000));
        const [out, g] = await Promise.all([read(group.collection("fuera").doc(uid)), read(group)]);
        if (out && out.exists) { kicked(); return new Promise(() => {}); }
        if (g && g.exists) owner = g.data().owner;
        else if (g && !g.metadata.fromCache) {
          // El servidor dice que no hay documento de grupo: o es un grupo de antes (sin creador)
          // o el enlace no lleva a ningún grupo.
          if (await groupExists(code) === false) { badLink(); return new Promise(() => {}); }
          // Grupo de antes: el primero que entra pasa a ser el creador. Las escrituras no se esperan.
          owner = uid;
          group.set({ owner: uid, at: Date.now() }).catch(() => group.get().then(s => { if (s.exists && window.PISTEA_GROUP) window.PISTEA_GROUP.isOwner = s.data().owner === uid; }, () => {}));
        }
        group.collection("perfiles").doc(uid).set({ name: myName, at: Date.now() }).catch(() => {});
      }
      // A partir de aquí este es tu grupo, también al abrir la app sin enlace.
      LS.set("pistea.grupo", code); fromLink = false;

      // Si me quitan mientras tengo la app abierta, salgo en el momento.
      group.collection("fuera").doc(uid).onSnapshot(s => { if (s.exists) kicked(); }, () => {});

      const base = /^https?:$/.test(location.protocol) ? location.origin + location.pathname : "https://vallik.app/";   // en la app nativa el origen es capacitor://
      const G = window.PISTEA_GROUP = {
        code,
        link: base + "#g=" + code,
        isOwner: owner === uid,
        aviso,
        account,
        canLogin,
        async signIn(k) {
          try { await login(k, false); return { ok: true }; }
          catch (e) { return { ok: false, msg: e && e.code === "vallik/en-uso" ? (EN?"That account is already used on another phone. To use it here, leave the group and sign in with it from the start screen.":"Esa cuenta ya se usa en otro móvil. Para usarla aquí, sal del grupo y entra con ella desde la pantalla de inicio.") : loginErr(e) }; }
        },
        leave() {
          // Sin esperar a la red: se borra al recuperar cobertura.
          ["aqui", "perfiles", "mensajes"].forEach(c => group.collection(c).doc(uid).delete().catch(() => {}));
          goOut((EN?"You've left the group.":"Has salido del grupo."));
        },
        kick(id, onErr) {
          if (!G.isOwner || id === uid) return false;
          const fail = e => { if (onErr) onErr(e); };
          group.collection("fuera").doc(id).set({ at: Date.now(), by: uid }).catch(fail);
          ["aqui", "perfiles", "mensajes"].forEach(c => group.collection(c).doc(id).delete().catch(() => {}));
          return true;
        }
      };
      return { uid, group };
    })();
    ready.catch(() => { ready = null; });              // sin red la primera vez: se puede reintentar
    return ready;
  }

  /* Misma forma que usa la app: db.collection(c).doc(id).set / delete, query.onSnapshot */
  function dbFacade() {
    const col = name => {
      const pending = boot().then(b => b.group.collection(name));
      return {
        doc: id => ({
          set: async data => (await pending).doc(id).set(data),
          delete: async () => (await pending).doc(id).delete()
        }),
        onSnapshot(ok, err) {
          let unsub = null, dead = false;
          pending.then(c => { if (!dead) unsub = c.onSnapshot({ includeMetadataChanges: true }, ok, err); }, e => err && err(e));
          return () => { dead = true; if (unsub) unsub(); };
        }
      };
    };
    return { collection: col };
  }

  const userFacade = {
    id: async () => (await boot()).uid,
    can: async () => true,
    profiles: async ids => {
      const b = await boot(), out = {};
      await Promise.all(ids.map(async id => {
        try { const s = await b.group.collection("perfiles").doc(id).get(); out[id] = { name: s.exists ? s.data().name : "" }; }
        catch (e) { out[id] = { name: "" }; }
      }));
      return out;
    }
  };

  window.claude = {
    use: async what => {
      if (what === "db") { await boot(); return dbFacade(); }
      if (what === "user") return userFacade;
      return null;
    }
  };
})();
