/* Pistea · datos del grupo con Firebase.
 *
 * La app habla con una interfaz mínima (use("db"), use("user")). Este archivo la implementa
 * con Firestore y acceso anónimo, y pide el nombre y el código del grupo la primera vez.
 * Si falta la configuración (firebase-config.js) o no hay red, la app arranca en modo ejemplo.
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
  const ALPHA = "abcdefghjkmnpqrstuvwxyz23456789";
  function newCode() {
    const a = new Uint8Array(10); crypto.getRandomValues(a);
    return Array.from(a, n => ALPHA[n % ALPHA.length]).join("");
  }
  function codeFromUrl() {
    const m = /[#&?]g=([a-z0-9]{6,32})/i.exec(location.hash || "");
    return m ? m[1].toLowerCase() : null;
  }
  let code = codeFromUrl() || LS.get("pistea.grupo");
  let myName = LS.get("pistea.nombre") || "";

  /* ----- Pantalla de entrada: nombre y grupo ----- */
  function askJoin() {
    const note = LS.get("pistea.aviso") || ""; LS.del("pistea.aviso");
    return new Promise(resolve => {
      const el = document.createElement("div");
      el.className = "join";
      el.innerHTML = `
        <form class="join-card glass" autocomplete="off">
          <h2>Entra en tu grupo</h2>
          ${note ? `<p class="join-note">${note}</p>` : ""}
          <p>Tus amigos te verán con este nombre.</p>
          <label>Tu nombre<input name="n" maxlength="24" required value="${myName.replace(/"/g, "&quot;")}" autocapitalize="words" enterkeyhint="done"></label>
          ${code ? "" : `<label>Código del grupo<input name="c" maxlength="32" placeholder="Déjalo vacío para crear uno nuevo" autocapitalize="none" spellcheck="false"></label>`}
          <button class="btn wide" type="submit">Entrar</button>
        </form>`;
      const st = document.createElement("style");
      st.textContent = `.join{position:fixed;inset:0;z-index:30;display:grid;place-items:center;padding:16px;background:rgba(10,22,32,.88);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
      .join-card{width:min(100%,380px);border-radius:var(--r-lg,28px);padding:24px 20px 20px;display:grid;gap:14px;background:var(--glass-2)}
      .join-card h2{margin:0;font:700 22px/26px var(--font);letter-spacing:-.02em}
      .join-card p{margin:-8px 0 0;color:var(--tx-2);font-size:14px}
      .join-card .join-note{margin:0;padding:12px 14px;border-radius:14px;background:rgba(255,210,63,.12);color:var(--tx);font-size:14px}
      .join-card label{display:grid;gap:6px;font:600 13px/16px var(--font);color:var(--tx-2)}
      .join-card input{height:52px;border-radius:26px;padding:0 18px;font-size:16px;color:var(--tx);background:rgba(255,255,255,.06);border:1px solid var(--hair);-webkit-appearance:none}
      .join-card input:focus{outline:none;border-color:var(--acc)}`;
      document.head.appendChild(st);
      document.body.appendChild(el);
      const f = el.querySelector("form");
      f.n.focus();
      f.addEventListener("submit", e => {
        e.preventDefault();
        myName = f.n.value.trim().slice(0, 24);
        if (!myName) return;
        if (!code) {
          const typed = f.c ? f.c.value.trim().toLowerCase().replace(/[^a-z0-9]/g, "") : "";
          code = typed.length >= 6 ? typed : newCode();
        }
        LS.set("pistea.nombre", myName); LS.set("pistea.grupo", code);
        try { history.replaceState(null, "", location.pathname + location.search + "#g=" + code); } catch (e2) {}
        el.remove(); st.remove(); resolve();
      });
    });
  }

  /* ----- Firebase ----- */
  firebase.initializeApp(cfg);
  const auth = firebase.auth();
  const fs = firebase.firestore();
  try { fs.enablePersistence({ synchronizeTabs: true }).catch(() => {}); } catch (e) {}

  let ready = null;
  function goOut(aviso) {
    LS.del("pistea.grupo");
    if (aviso) LS.set("pistea.aviso", aviso);
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    location.reload();
  }
  function boot() {
    if (ready) return ready;
    ready = (async () => {
      if (!code || !myName) await askJoin();
      else { try { history.replaceState(null, "", location.pathname + location.search + "#g=" + code); } catch (e) {} }
      if (!auth.currentUser) await auth.signInAnonymously();
      const uid = auth.currentUser.uid;
      const group = fs.collection("grupos").doc(code);
      const kicked = () => goOut("Te han quitado de ese grupo. Puedes crear uno nuevo o entrar en otro con su código.");

      // ¿Me han quitado de este grupo?
      try { if ((await group.collection("fuera").doc(uid).get()).exists) { kicked(); return new Promise(() => {}); } } catch (e) {}

      // Quién creó el grupo. Si el grupo aún no tiene creador, lo es quien entra primero.
      let owner = null;
      try {
        const g = await group.get();
        if (g.exists) owner = g.data().owner;
        else { await group.set({ owner: uid, at: Date.now() }); owner = uid; }
      } catch (e) {}

      await group.collection("perfiles").doc(uid).set({ name: myName, at: Date.now() });

      // Si me quitan mientras tengo la app abierta, salgo en el momento.
      group.collection("fuera").doc(uid).onSnapshot(s => { if (s.exists) kicked(); }, () => {});

      const base = location.origin + location.pathname;
      window.PISTEA_GROUP = {
        code,
        link: base + "#g=" + code,
        isOwner: owner === uid,
        async leave() {
          try { await group.collection("aqui").doc(uid).delete(); } catch (e) {}
          try { await group.collection("perfiles").doc(uid).delete(); } catch (e) {}
          goOut("Has salido del grupo.");
        },
        async kick(id) {
          if (owner !== uid || id === uid) return false;
          await group.collection("fuera").doc(id).set({ at: Date.now(), by: uid });
          try { await group.collection("aqui").doc(id).delete(); } catch (e) {}
          try { await group.collection("perfiles").doc(id).delete(); } catch (e) {}
          return true;
        }
      };
      return { uid, group };
    })();
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
