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
  function askJoin() {
    const note = LS.get("pistea.aviso") || ""; LS.del("pistea.aviso");
    return new Promise(resolve => {
      const el = document.createElement("div");
      el.className = "join";
      el.innerHTML = `
        <div class="join-brand"><svg width="72" height="72" viewBox="0 0 1024 1024" aria-hidden="true"><rect width="1024" height="1024" rx="228" fill="#0A1620"/><g transform="translate(141 130) scale(2.9)"><path d="M128 226 C114 204 54 166 54 102 A74 74 0 1 1 202 102 C202 166 142 204 128 226 Z" fill="#5BE7F2"/><rect x="72" y="72" width="112" height="60" rx="30" fill="#0A1620"/><path d="M92 120 L113 98 L124 109 L141 90 L164 120" fill="none" stroke="#5BE7F2" stroke-width="9" stroke-linejoin="round" stroke-linecap="round"/></g></svg><b>Pistea</b><span>El mapa del grupo en la montaña</span></div>
        <form class="join-card glass" autocomplete="off" novalidate>
          <h2>Entra en tu grupo</h2>
          <p class="join-note" role="status" hidden></p>
          <p>Tus amigos te verán con este nombre.</p>
          <label>Tu nombre<input name="n" maxlength="24" value="${myName.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" autocapitalize="words" enterkeyhint="next"></label>
          ${code ? "" : `<label>Enlace o código del grupo<span class="join-row"><input name="c" maxlength="400" placeholder="Pega el enlace o el código" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go">${navigator.clipboard && navigator.clipboard.readText ? `<button class="btn dark" type="button" data-paste>Pegar</button>` : ""}</span><small>Pídeselo a quien creó el grupo.</small></label>`}
          <button class="btn wide" type="submit">Entrar</button>
          ${code ? "" : `<div class="join-or">o</div><button class="btn ghost wide" type="button" data-new>Crear un grupo nuevo</button>`}
        </form>`;
      const st = document.createElement("style");
      st.textContent = `.join{position:fixed;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:28px;padding:16px;overflow-y:auto;background:rgba(10,22,32,.88);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
      .join-brand{display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center}
      .join-brand b{font:700 28px/1.1 var(--font);letter-spacing:-.01em;margin-top:4px}
      .join-brand span{font-size:15px;color:var(--tx-2)}
      .join-row{display:flex;gap:8px}.join-row input{flex:1;min-width:0}.join-row .btn{min-height:52px;padding:0 16px}
      .join-card label small{font:400 13px/16px var(--font);color:var(--tx-2)}
      .join-or{display:flex;align-items:center;gap:10px;color:var(--tx-2);font-size:13px}.join-or::before,.join-or::after{content:"";flex:1;height:1px;background:var(--hair-2)}
      .join-card{width:min(100%,380px);border-radius:var(--r-lg,28px);padding:24px 20px 20px;display:grid;gap:14px;background:var(--glass-2)}
      .join-card h2{margin:0;font:700 22px/26px var(--font);letter-spacing:-.02em}
      .join-card p{margin:-8px 0 0;color:var(--tx-2);font-size:14px}
      .join-card .join-note{margin:0;padding:12px 14px;border-radius:14px;background:rgba(255,210,63,.12);color:var(--tx);font-size:14px}
      .join-card .join-note[hidden]{display:none}
      .join-card label{display:grid;gap:6px;font:600 13px/16px var(--font);color:var(--tx-2)}
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
      const nameOk = () => { myName = f.n.value.trim().slice(0, 24); if (!myName) { say("Escribe tu nombre."); f.n.focus(); } return !!myName; };
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
        if (!raw) { say("Pega el enlace o el código que te han enviado. Si eres el primero, crea un grupo nuevo."); f.c.focus(); return; }
        if (!c) { say("No encuentro el código en lo que has pegado. Copia otra vez el enlace entero."); f.c.focus(); return; }
        busy(true); say("Comprobando el grupo…");
        let ok = null;
        try { await ensureAuth(); ok = await groupExists(c); } catch (er) { ok = null; }
        busy(false);
        if (ok === null) { say("Sin conexión. Hace falta cobertura para entrar en un grupo. Prueba otra vez."); return; }
        if (!ok) { say("No hay ningún grupo con ese código. Revisa el enlace o pide que te lo envíen otra vez."); f.c.focus(); return; }
        code = c; fromLink = false; finish();
      });
      const pb = el.querySelector("[data-paste]");
      if (pb) pb.addEventListener("click", async () => { try { const t = await navigator.clipboard.readText(); if (t) { f.c.value = t.trim(); say(""); } } catch (er) { f.c.focus(); } });
      const nb = el.querySelector("[data-new]");
      if (nb) nb.addEventListener("click", async () => {
        if (!nameOk()) return;
        busy(true); say("Creando el grupo…");
        try { await ensureAuth(); } catch (er) { busy(false); say("Sin conexión. Hace falta cobertura para crear el grupo."); return; }
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
      LS.set("pistea.aviso", "Ese enlace no lleva a ningún grupo. Sigues en tu grupo de siempre.");
      try { history.replaceState(null, "", location.pathname + location.search + "#g=" + savedCode); } catch (e) {}
      setTimeout(() => location.reload(), 50);
    } else goOut("Ese enlace no lleva a ningún grupo. Pega el código correcto o crea un grupo nuevo.");
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
      const kicked = () => goOut("Te han quitado de ese grupo. Puedes crear uno nuevo o entrar en otro con su código.");

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

      const base = location.origin + location.pathname;
      const G = window.PISTEA_GROUP = {
        code,
        link: base + "#g=" + code,
        isOwner: owner === uid,
        aviso,
        leave() {
          // Sin esperar a la red: se borra al recuperar cobertura.
          ["aqui", "perfiles", "mensajes"].forEach(c => group.collection(c).doc(uid).delete().catch(() => {}));
          goOut("Has salido del grupo.");
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
