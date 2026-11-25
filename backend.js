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
  const LFR = {"Create your trip's group": "Crée le groupe du voyage", "Add your name, then send the link to the others.": "Mets ton prénom, puis envoie le lien aux autres.", "Paste the link or code you were sent.": "Colle le lien ou le code qu'on t'a envoyé.", "Create my group": "Créer mon groupe", "Join the group": "Rejoindre le groupe", "I have an invite link": "J'ai un lien d'invitation", "Create a new group instead": "Plutôt créer un nouveau groupe", "Optional. With Google your profile follows you if you change phones.": "Facultatif. Avec Google, ton profil te suit si tu changes de téléphone.", "Nobody gets lost from the group": "Personne ne se perd du groupe", "See your friends and family on the piste map, get to them in a few turns and head home together before the lifts close.": "Vois tes amis et ta famille sur le plan des pistes, rejoins-les en quelques virages et rentrez ensemble avant la fermeture des remontées.", "You have been invited to a group. Join and you will all be on the map in a moment.": "Tu as été invité dans un groupe. Rejoins-le et vous serez tous sur la carte en un instant.", "Continue with Google": "Continuer avec Google", "Continue with Apple": "Continuer avec Apple", "With Google your profile follows you if you change phones. Or just use your name below.": "Avec Google, ton profil te suit si tu changes de téléphone. Sinon, entre juste avec ton prénom ci-dessous.", "Join your group": "Rejoins ton groupe", "This is the name your friends will see.": "C'est le nom que verront tes amis.", "Your name": "Ton prénom", "Group link or code": "Lien ou code du groupe", "Paste": "Coller", "Ask whoever created the group.": "Demande-le à qui a créé le groupe.", "Join": "Rejoindre", "or": "ou", "Create a new group": "Créer un nouveau groupe", "What it does for your group": "Ce que ça fait pour ton groupe", "Live": "En direct", "Your group, live": "Ton groupe, en direct", "Every friend is a dot on the 3D resort map. You know where they are without calling anyone.": "Chaque ami est un point sur la carte 3D de la station. Tu sais où il est sans appeler personne.", "3 on the slopes · 1 min ago": "3 sur les pistes · il y a 1 min", "Route": "Itinéraire", "Get to anyone": "Rejoins qui tu veux", "Step by step route over pistes and lifts to a friend, a bar or a lift. Skip the blacks if you like.": "Itinéraire étape par étape par les pistes et les remontées jusqu'à un ami, un bar ou une remontée. Sans noires, si tu préfères.", "Home": "Retour", "Make it home in time": "Rentre à temps", "It tells you when to head back so you are not stuck in the wrong valley when the lifts close.": "Il te dit quand repartir pour ne pas rester bloqué dans la mauvaise vallée à la fermeture des remontées.", "leave here · lifts close 16:45": "pars d'ici · fermeture 16:45", "Meet up": "Rendez-vous", "Meet up without wasting the morning": "Retrouvez-vous sans perdre la matinée", "Vallik picks the spot that is fairest for everyone. And if someone has a problem, the rest see how to reach them.": "Vallik choisit l'endroit le plus juste pour tous. Et si quelqu'un a un problème, les autres voient comment le rejoindre.", "Summit bar": "Bar du sommet", "6 min for everyone": "6 min pour tous", "Privacy": "Confidentialité", "Terms": "Conditions", "Contact": "Contact", "Map": "Carte", "Signed in with": "Connecté avec"};
  const LCA = {"Create your trip's group": "Crea el grup del viatge", "Add your name, then send the link to the others.": "Posa el teu nom i després envia l'enllaç als altres.", "Paste the link or code you were sent.": "Enganxa l'enllaç o el codi que t'han enviat.", "Create my group": "Crear el meu grup", "Join the group": "Entrar al grup", "I have an invite link": "Tinc un enllaç d'invitació", "Create a new group instead": "Millor crear un grup nou", "Optional. With Google your profile follows you if you change phones.": "Opcional. Amb Google el teu perfil et segueix si canvies de mòbil.", "Nobody gets lost from the group": "Que ningú es perdi del grup", "See your friends and family on the piste map, get to them in a few turns and head home together before the lifts close.": "Veus els teus amics i la teva família al mapa de pistes, hi arribes en quatre girs i torneu junts abans que tanquin els remuntadors.", "You have been invited to a group. Join and you will all be on the map in a moment.": "T'han convidat a un grup. Entra i en un moment us veureu tots al mapa.", "Continue with Google": "Continuar amb Google", "Continue with Apple": "Continuar amb Apple", "With Google your profile follows you if you change phones. Or just use your name below.": "Amb Google el teu perfil et segueix encara que canviïs de mòbil. Si ho prefereixes, entra només amb el teu nom aquí sota.", "Join your group": "Entra al teu grup", "This is the name your friends will see.": "Els teus amics et veuran amb aquest nom.", "Your name": "El teu nom", "Group link or code": "Enllaç o codi del grup", "Paste": "Enganxar", "Ask whoever created the group.": "Demana-ho a qui va crear el grup.", "Join": "Entrar", "or": "o", "Create a new group": "Crear un grup nou", "What it does for your group": "Què fa pel teu grup", "Live": "En directe", "Your group, live": "El teu grup, en directe", "Every friend is a dot on the 3D resort map. You know where they are without calling anyone.": "Cada amic és un punt al mapa 3D de l'estació. Saps on és sense trucar a ningú.", "3 on the slopes · 1 min ago": "3 a pistes · fa 1 min", "Route": "Ruta", "Get to anyone": "Arriba fins a qui vulguis", "Step by step route over pistes and lifts to a friend, a bar or a lift. Skip the blacks if you like.": "Ruta pas a pas per pistes i remuntadors fins a un amic, un bar o un remuntador. Sense negres, si ho prefereixes.", "Home": "Tornada", "Make it home in time": "Torna a casa a temps", "It tells you when to head back so you are not stuck in the wrong valley when the lifts close.": "T'avisa de quan sortir per no quedar-te atrapat en una altra vall quan tanquin els remuntadors.", "leave here · lifts close 16:45": "surt d'aquí · tanca 16:45", "Meet up": "Quedada", "Meet up without wasting the morning": "Quedeu sense perdre mig matí", "Vallik picks the spot that is fairest for everyone. And if someone has a problem, the rest see how to reach them.": "Vallik tria el punt que us va millor a tots. I si algú té un problema, la resta veu com arribar-hi.", "Summit bar": "Bar del cim", "6 min for everyone": "6 min per a tothom", "Privacy": "Privacitat", "Terms": "Condicions", "Contact": "Contacte", "Map": "Mapa", "Signed in with": "Has entrat amb"};
  /* Solo el idioma activo: cambiar de idioma recarga la página, y así Google lee un único idioma por dirección. */
  const L = (es, en) => LANG === "es" ? es : LANG === "fr" ? (LFR[en] || en) : LANG === "ca" ? (LCA[en] || es) : en;
  function askJoin() {
    const note = LS.get("pistea.aviso") || ""; LS.del("pistea.aviso");
    return new Promise(resolve => {
      const el = document.createElement("div");
      el.className = "join"; el.dataset.stage = code ? "form" : "pick";
      el.innerHTML = `
        <div class="lp-photo" aria-hidden="true"></div>
        <div class="lp" data-lang="${LANG}">
        <div class="lp-lang" role="group" aria-label="Idioma / Language"><button type="button" data-lang="es">ES</button><button type="button" data-lang="en">EN</button><button type="button" data-lang="fr">FR</button><button type="button" data-lang="ca">CA</button></div>
        <div class="lp-screen">
        <header class="lp-hero">
          <div class="lp-logo"><svg class="lp-mark" width="48" height="48" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22.5" fill="#14355A"/><mask id="kcutL" maskUnits="userSpaceOnUse" x="0" y="0" width="110" height="100"><rect width="110" height="100" fill="#fff"/><path d="M8,40 C30,44 46,58 60,66 C72,73 84,74 96,72" fill="none" stroke="#000" stroke-width="4.5" stroke-linecap="round"/></mask><g mask="url(#kcutL)" transform="translate(-5 0)"><rect x="27" y="16" width="17" height="68" fill="#F6F8FA"/><polygon points="43,58 67,32 87,32 43,79" fill="#F6F8FA"/><polygon points="56,65 66,55 88,84 67,84" fill="#C8F03C"/></g></svg><svg class="lp-wm" viewBox="0 0 331 100" width="122" height="37" role="img" aria-label="Vallik"><g fill="#F6F8FA"><path d="M0,34 H21 L33,78 L45,34 H66 L44,100 H22 Z"/><rect x="117" y="34" width="20" height="66"/><rect x="151" y="0" width="20" height="100"/><rect x="185" y="0" width="20" height="100"/><rect x="219" y="34" width="20" height="66"/><rect x="219" y="4" width="20" height="20"/><rect x="253" y="0" width="20" height="100"/><polygon points="272,67 302,34 328,34 272,93"/></g><circle cx="104" cy="67" r="23" fill="none" stroke="#F6F8FA" stroke-width="20"/><polygon points="288,76 301,63 329,100 302,100" fill="#C8F03C"/></svg></div>
          <h1>${L("Que nadie se pierda del grupo","Nobody gets lost from the group")}</h1>
          
        </header>
        ${!code && note ? `<p class="lp-msg" role="status">${note.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>` : ""}
        ${code ? "" : `<div class="lp-pick">
          <button class="btn wide" type="button" data-pick="new">${L("Crear un grupo","Create a group")}</button>
          <button class="btn ghost wide" type="button" data-pick="join">${L("Tengo un código","I have a code")}</button>
        </div>`}
        ${code ? `<p class="lp-inv">${L("Te han invitado a un grupo. Entra y en un momento os veis todos en el mapa.","You have been invited to a group. Join and you will all be on the map in a moment.")}</p>` : ""}
        <form class="join-card glass" autocomplete="off" novalidate data-mode="${code ? "invite" : "new"}">
          <h2 data-m="new">${L("Crea el grupo del viaje","Create your trip's group")}</h2>
          <h2 data-m="join">${L("Entra en tu grupo","Join your group")}</h2>
          <h2 data-m="invite">${L("Entra en tu grupo","Join your group")}</h2>
          <p data-m="new">${L("Pon tu nombre y después mandas el enlace a los demás.","Add your name, then send the link to the others.")}</p>
          <p data-m="join">${L("Pega el enlace o el código que te mandaron.","Paste the link or code you were sent.")}</p>
          <p data-m="invite">${L("Tus amigos te verán con este nombre.","This is the name your friends will see.")}</p>
          <p class="join-note" role="status" hidden></p>
          <label>${L("Tu nombre","Your name")}<input name="n" maxlength="24" value="${myName.replace(/&/g, "&amp;").replace(/"/g, "&quot;")}" autocapitalize="words" enterkeyhint="${code ? "go" : "next"}"></label>
          ${code ? "" : `<label data-m="join">${L("Enlace o código del grupo","Group link or code")}<span class="join-row"><input name="c" maxlength="400" placeholder="${LANG==="ca"?"Enganxa l'enllaç o el codi":LANG==="fr"?"Colle le lien ou le code":LANG==="en"?"Paste the link or code":"Pega el enlace o el código"}" data-ph-es="Pega el enlace o el código" data-ph-en="Paste the link or code" autocapitalize="none" autocorrect="off" spellcheck="false" enterkeyhint="go">${navigator.clipboard && navigator.clipboard.readText ? `<button class="btn dark" type="button" data-paste>${L("Pegar","Paste")}</button>` : ""}</span><small>${L("Pídeselo a quien creó el grupo.","Ask whoever created the group.")}</small></label>`}
          <button class="btn wide" type="submit"><span data-m="new">${L("Crear mi grupo","Create my group")}</span><span data-m="join">${L("Entrar al grupo","Join the group")}</span><span data-m="invite">${L("Entrar al grupo","Join the group")}</span></button>
          ${code ? "" : `<button class="lp-back" type="button" data-back>${L("Volver","Back")}</button>`}
          ${code ? "" : `<button class="btn ghost wide" type="button" data-swap hidden><span data-m="new">${L("Tengo un enlace de invitación","I have an invite link")}</span><span data-m="join">${L("Mejor crear un grupo nuevo","Create a new group instead")}</span></button>`}
        </form>
        ${canLogin("google") || canLogin("apple") ? `<div class="lp-auth" id="lpauth">
          ${canLogin("apple") ? `<button class="btn wide lp-apple" type="button" data-login="apple">${A_ICON}${L("Continuar con Apple","Continue with Apple")}${LS.get("vallik.lastLogin") === "apple" ? `<span class="lp-last">${L("Último usado","Last used")}</span>` : ""}</button>` : ""}
          ${canLogin("google") ? `<button class="btn ghost wide lp-google" type="button" data-login="google">${G_ICON}${L("Continuar con Google","Continue with Google")}${LS.get("vallik.lastLogin") === "google" ? `<span class="lp-last">${L("Último usado","Last used")}</span>` : ""}</button>` : ""}
          <small>${L("Opcional. Con Google tu perfil te sigue si cambias de móvil.","Optional. With Google your profile follows you if you change phones.")}</small>
        </div>` : ""}
        <p class="lp-legal">${L("Al continuar aceptas las","By continuing you accept the")} <a href="${LANG === "fr" ? "fr/conditions/" : LANG === "en" ? "terms/" : "condiciones/"}">${L("Condiciones","Terms")}</a> ${L("y la","and the")} <a href="${LANG === "fr" ? "fr/confidentialite/" : LANG === "en" ? "privacy/" : "privacidad/"}">${L("Política de privacidad","Privacy policy")}</a>.</p>
        </div>
        <div class="lp-more"${NATIVE_UA ? " hidden" : ""}>
        <h2 class="lp-h2">${L("Lo que hace por tu grupo","What it does for your group")}</h2>
        <ul class="lp-feat">
          <li><p class="lf-k"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="9" r="3.2"/><path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6"/><circle cx="17" cy="8" r="2.5"/><path d="M16 13.6c2.4 0 4 1.3 4.6 3.9"/></svg><span class="lf-n">01</span>${L("En directo","Live")}</p><b>${L("Tu grupo, en directo","Your group, live")}</b><small>${L("Cada amigo es un punto en el mapa 3D de la estación. Sabes dónde está sin llamar a nadie.","Every friend is a dot on the 3D resort map. You know where they are without calling anyone.")}</small>
            <div class="lf-ro"><span class="lf-av"><i>A</i><i>P</i><i class="on">J</i></span><em>${L("3 en pista · hace 1 min","3 on the slopes · 1 min ago")}</em></div></li>
          <li><p class="lf-k"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 19c3-1 4-5 7-7s6-2 7-7"/><circle cx="5" cy="19" r="2"/><path d="M15 5h4v4"/></svg><span class="lf-n">02</span>${L("Ruta","Route")}</p><b>${L("Llega hasta quien sea","Get to anyone")}</b><small>${L("Ruta paso a paso por pistas y remontes hasta un amigo, un bar o un remonte. Sin negras, si lo prefieres.","Step by step route over pistes and lifts to a friend, a bar or a lift. Skip the blacks if you like.")}</small>
            <div class="lf-ro"><span class="lf-rt"><i style="flex:2;background:#F6F8FA"></i><i style="flex:3;background:#E5484D"></i><i style="flex:2;background:#3B82F6"></i></span><em>14 min</em></div></li>
          <li><p class="lf-k"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/></svg><span class="lf-n">03</span>${L("Vuelta","Home")}</p><b>${L("Vuelve a casa a tiempo","Make it home in time")}</b><small>${L("Te avisa de cuándo salir para no quedarte atrapado en otro valle cuando cierran los remontes.","It tells you when to head back so you are not stuck in the wrong valley when the lifts close.")}</small>
            <div class="lf-ro"><strong>16:05</strong><em>${L("sal de aquí · cierra 16:45","leave here · lifts close 16:45")}</em></div></li>
          <li><p class="lf-k"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg><span class="lf-n">04</span>${L("Quedada","Meet up")}</p><b>${L("Quedad sin perder media mañana","Meet up without wasting the morning")}</b><small>${L("Vallik elige el punto que os queda a todos más a mano. Y si alguien tiene un problema, el resto ve cómo llegar.","Vallik picks the spot that is fairest for everyone. And if someone has a problem, the rest see how to reach them.")}</small>
            <div class="lf-ro"><span class="lf-pin"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6-5.4-6-10a6 6 0 0 1 12 0c0 4.6-6 10-6 10z"/><circle cx="12" cy="11" r="2"/></svg>${L("Bar de la cima","Summit bar")}</span><em>${L("6 min para todos","6 min for everyone")}</em></div></li>
        </ul>
        <footer class="lp-end">
          <nav><a href="${LANG === "fr" ? "fr/confidentialite/" : LANG === "en" ? "privacy/" : "privacidad/"}">${L("Privacidad","Privacy")}</a><a href="${LANG === "fr" ? "fr/conditions/" : LANG === "en" ? "terms/" : "condiciones/"}">${L("Condiciones","Terms")}</a><a href="mailto:vallik-soporte@googlegroups.com">${L("Contacto","Contact")}</a></nav>
          <small>${L("Mapa","Map")} © OpenStreetMap · Copernicus DEM</small>
        </footer>
        </div>
        </div>`;
      const st = document.createElement("style");
      st.textContent = `.join{position:fixed;inset:0;z-index:30;display:block;padding:calc(var(--sat,0px) + 28px) 16px calc(var(--sab,0px) + 28px);overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(14,42,71,.88);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
      .lp{width:min(100%,400px);margin:0 auto;display:grid;grid-template-columns:minmax(0,1fr);gap:20px}
      .lp-hero{display:grid;gap:14px;padding:8px 4px 4px}
      .lp-logo{display:flex;align-items:center;gap:14px}
      .lp-hero h1{margin:6px 0 0;font:800 34px/36px var(--font);letter-spacing:-.035em;color:var(--tx)}
      .lp-hero p{margin:0;font-size:17px;line-height:24px;color:var(--tx-2)}
      .lp-tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px!important}.lp-tags span{padding:5px 10px;border-radius:99px;background:rgba(255,255,255,.07);color:var(--tx);font:500 12px/1 var(--mono);letter-spacing:.01em}.lp-h2{margin:14px 0 -2px;font:700 13px/1 var(--mono);text-transform:uppercase;letter-spacing:.08em;color:var(--tx-2)}.lp-made{margin:6px 0 0;text-align:center;color:var(--tx-2);font-size:14px}
      .lp{position:relative}.lp-lang{position:absolute;top:10px;right:4px;display:flex;padding:3px;border-radius:99px;background:rgba(255,255,255,.07);z-index:1}.lp-lang button{all:unset;cursor:pointer;box-sizing:border-box;min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center;padding:6px 10px;border-radius:99px;font:600 12px/1 var(--mono);color:var(--tx-2)}.lp[data-lang=es] .lp-lang [data-lang=es],.lp[data-lang=en] .lp-lang [data-lang=en],.lp[data-lang=fr] .lp-lang [data-lang=fr],.lp[data-lang=ca] .lp-lang [data-lang=ca]{background:var(--tx);color:var(--bg)}.lp[data-lang=es] [lang=en],.lp[data-lang=es] [lang=fr],.lp[data-lang=es] [lang=ca],.lp[data-lang=en] [lang=es],.lp[data-lang=en] [lang=fr],.lp[data-lang=en] [lang=ca],.lp[data-lang=fr] [lang=es],.lp[data-lang=fr] [lang=en],.lp[data-lang=fr] [lang=ca],.lp[data-lang=ca] [lang=es],.lp[data-lang=ca] [lang=en],.lp[data-lang=ca] [lang=fr]{display:none}
      .lp-inv{margin:0;padding:12px 14px;border-radius:14px;background:rgba(200,240,60,.12);box-shadow:inset 0 0 0 1px rgba(200,240,60,.35);font-size:15px}
      .lp-auth{display:grid;gap:10px}
      .lp-auth small{color:var(--tx-2);font-size:13px;line-height:18px;padding:0 4px}
      .lp-auth .btn{display:flex;align-items:center;justify-content:center;gap:10px}
      .lp-google{background:transparent;color:var(--tx)}
      .lp-apple{background:transparent;color:var(--tx)}
      .lp-done{display:flex;align-items:center;gap:12px;padding:12px 14px;border-radius:16px;background:rgba(255,255,255,.06);font-size:14px;color:var(--tx-2)}
      .lp-done b{display:block;color:var(--tx);font-size:15px}
      .lp-feat{list-style:none;margin:8px 0 0;padding:0;display:grid;gap:16px}
      .lp-feat li{display:flex;gap:14px;align-items:flex-start}
      .lp-feat li>span{flex:0 0 44px;height:44px;border-radius:14px;display:grid;place-items:center;background:rgba(200,240,60,.12);color:var(--acc)}
      .lp-feat b{display:block;font-size:16px;line-height:20px}
      .lp-feat small{display:block;margin-top:3px;color:var(--tx-2);font-size:14px;line-height:20px}
      .lp-foot{margin:8px 0 0;text-align:center;color:var(--tx-3);font:500 11px/1 var(--mono)}
      .join-card{width:100%!important}.join-card [data-m]{display:none}.join-card[data-mode=new] [data-m=new],.join-card[data-mode=join] [data-m=join],.join-card[data-mode=invite] [data-m=invite]{display:revert}.join-card label[data-m=join]{display:none}.join-card[data-mode=join] label[data-m=join]{display:grid}.join-card .btn{min-height:52px}.join-card .btn[aria-busy=true]{position:relative;color:transparent}.join-card .btn[aria-busy=true]::after{content:"";position:absolute;inset:0;margin:auto;width:28px;height:6px;border-radius:3px;background:currentColor;color:var(--acc-ink,#0E2A47);opacity:.8;animation:lpbusy 1s ease-in-out infinite}@keyframes lpbusy{0%,100%{transform:scaleX(.35);opacity:.35}50%{transform:scaleX(1);opacity:.9}}#lpauth{margin-top:2px}.lp-google,.lp-apple{min-height:48px}
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
      .join-card .btn[disabled]{opacity:.5}
      .join{background:#0E2A47 var(--sky,linear-gradient(180deg,#061A31 0%,#0E2A47 45%,#174170 82%,#1D4F86 100%))!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      .lp-snow{position:absolute;top:0;left:50%;transform:translateX(-50%);width:min(100%,572px);height:min(calc(100vw * 1.2),640px);pointer-events:none;background:#3a4f66 url(nieve-k.jpg) 50% 30%/cover no-repeat;background-image:image-set("nieve-k.webp" type("image/webp"),"nieve-k.jpg" type("image/jpeg"));-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%),linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);-webkit-mask-composite:source-in;mask-image:linear-gradient(180deg,#000 55%,transparent 100%),linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent);mask-composite:intersect}@media(max-width:572px){.lp-snow{-webkit-mask-image:linear-gradient(180deg,#000 55%,transparent 100%);mask-image:linear-gradient(180deg,#000 55%,transparent 100%)}}
      .lp-snow::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,42,71,.5) 0%,rgba(14,42,71,.42) 22%,rgba(14,42,71,.55) 45%,rgba(14,42,71,.7) 70%,rgba(14,42,71,.6) 100%)}
      .lp-mark{display:none}
      .lp-hero{padding:8px 0 4px!important}.lp-auth small{padding:0!important}.lp-wm{width:92px;height:28px}
      .lp-hero h1{margin-top:44px!important;font-size:44px!important;line-height:44px!important;text-shadow:0 2px 24px rgba(14,42,71,.6)}
      .lp-lang{background:rgba(14,42,71,.55)!important;-webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px)}
      .lp-logo .lp-wm{filter:drop-shadow(0 2px 12px rgba(14,42,71,.45))}
      .lp-h2{margin:22px 0 0!important;font:500 12px/1 var(--mono)!important;letter-spacing:.12em!important}
      .lp-feat{gap:10px!important;margin:4px 0 0!important}
      .lp-feat li{display:block!important;position:relative;padding:16px 16px 14px;border-radius:22px;background:linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025));box-shadow:inset 0 1px 0 rgba(255,255,255,.10),inset 0 0 0 1px rgba(255,255,255,.07)}
      .lf-k{display:flex;align-items:center;gap:8px;margin:0 0 10px!important;color:var(--acc);font:500 11px/1 var(--mono)!important;letter-spacing:.1em;text-transform:uppercase}
      .lf-k .lf-n{color:var(--tx-3);margin-left:auto}
      .lp-feat b{font-size:17px!important;line-height:21px!important;letter-spacing:-.015em}
      .lp-feat small{margin-top:4px!important}
      .lf-ro{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:14px;padding-top:12px;border-top:1px solid rgba(255,255,255,.07)}
      .lf-ro em{font:500 11px/1.2 var(--mono);font-style:normal;letter-spacing:.06em;text-transform:uppercase;color:var(--tx-2);text-align:right}
      .lf-ro strong{font:500 30px/1 var(--mono);letter-spacing:-.04em;color:var(--tx)}
      .lf-av{display:flex}.lf-av i{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;font:700 11px/1 var(--font);font-style:normal;background:#F6F8FA;color:#0E2A47;box-shadow:0 0 0 2px #15304F}.lf-av i+i{margin-left:-6px}.lf-av i.on{background:var(--acc)}
      .lf-rt{flex:1;display:flex;gap:3px;height:6px;max-width:170px}.lf-rt i{border-radius:3px}
      .lf-pin{display:inline-flex;align-items:center;gap:6px;padding:6px 10px 6px 8px;border-radius:99px;background:rgba(200,240,60,.12);color:var(--acc);font:600 13px/1 var(--font)}.lf-pin svg{width:15px;height:15px}
      .lp-end{margin-top:18px;padding:22px 0 6px;border-top:1px solid rgba(255,255,255,.08);display:grid;justify-items:center;gap:12px;text-align:center}
      .lp-end p{margin:0;color:var(--tx-2);font-size:14px}
      .lp-end nav{display:flex;gap:8px;flex-wrap:wrap;justify-content:center}.lp-end nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 10px;color:var(--tx);font:500 14px/1 var(--font);text-decoration:none;opacity:.85}
      .lp-end small{color:var(--tx-3);font:500 10px/1 var(--mono);letter-spacing:.06em;text-transform:uppercase}
      /* Pantalla de inicio: foto real a sangre, botones abajo (al alcance del pulgar), sin recuadros. */
      .join{padding:0!important;background:#0E2A47!important}
      .lp-photo{position:absolute;top:0;left:0;right:0;height:max(68svh,500px);pointer-events:none;background:#0E2A47 url(lp-grupo.jpg) 50% 100%/cover no-repeat;background-image:image-set("lp-grupo.webp" type("image/webp"),"lp-grupo.jpg" type("image/jpeg"))}
      .lp-photo::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(6,20,36,.7) 0%,rgba(6,20,36,.1) 16%,rgba(14,42,71,0) 45%,rgba(14,42,71,.6) 70%,#0E2A47 90%)}
      .lp{display:block!important;width:min(100%,440px)!important;padding:calc(var(--sat,0px) + 18px) 20px calc(var(--sab,0px) + 18px);gap:12px!important;align-content:start}
      .lp-screen{min-height:calc(100svh - var(--sat,0px) - var(--sab,0px) - 36px);display:flex;flex-direction:column;gap:12px}
      .lp-screen>.lp-hero{flex:1;display:flex!important;flex-direction:column;gap:0!important}
      .lp-hero h1{margin-top:auto!important;font-size:42px!important;line-height:42px!important;max-width:11ch;padding-bottom:6px}
      .lp-hero{padding:0!important}
      .lp-lang{top:0!important}.lp-lang button{min-width:40px!important;font-size:11px!important}
      .join[data-stage=pick] .join-card,.join[data-stage=pick] .lp-inv{display:none}
      .join[data-stage=form] .lp-pick{display:none}
      .join[data-stage=form]:not(:has(.join-card[data-mode=invite])) .lp-auth{display:none}
      .lp-pick{display:grid;gap:10px}
      .lp-msg{margin:0;padding:12px 14px;border-radius:14px;background:rgba(14,42,71,.6);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1px rgba(200,240,60,.35);font-size:15px}
      .lp-pick .btn,.lp-auth .btn{min-height:54px}
      .join-card{background:none!important;padding:0!important;box-shadow:none!important;border:0!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      .join-card h2{font-size:24px!important}
      .lp-back{all:unset;cursor:pointer;justify-self:center;min-height:44px;padding:0 14px;color:var(--tx-2);font:500 15px/44px var(--font)}
      .lp-apple{position:relative;background:#F6F8FA!important;color:#000!important;font-weight:600}
      .lp-google{position:relative;background:rgba(14,42,71,.45)!important;-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px)}
      .lp-last{position:absolute;top:-9px;right:16px;padding:4px 8px;border-radius:99px;background:var(--acc);color:#0E2A47;font:600 11px/1 var(--font);letter-spacing:0}
      .lp-auth small{display:none}
      .join-card [data-swap]{display:none!important}
      .join[data-stage=form] .lp-hero h1{display:none}
      .join[data-stage=form] .join-card h2{font-size:30px!important;line-height:32px!important;letter-spacing:-.03em}
      .lp-legal{margin:2px 0 0;text-align:center;color:var(--tx-2);font-size:12px;line-height:17px}.lp-legal a{color:var(--tx);text-decoration:underline;text-underline-offset:2px}
      .lp-more{display:grid;gap:12px;margin-top:40px}.lp-more[hidden]{display:none}`;
      document.head.appendChild(st);
      document.body.appendChild(el);
      const f = el.querySelector("form"), noteEl = el.querySelector(".join-note"), btns = el.querySelectorAll("button");
      const say = t => { noteEl.textContent = t || ""; noteEl.hidden = !t; };
      let busyBtn = null;
      const busy = (on, who) => { btns.forEach(b => { b.disabled = on; b.removeAttribute("aria-busy"); }); busyBtn = on ? (who || null) : null; if (busyBtn) busyBtn.setAttribute("aria-busy", "true"); };
      const sub = f.querySelector("[type=submit]");
      const sw = el.querySelector("[data-swap]");
      if (sw) sw.addEventListener("click", () => { f.dataset.mode = f.dataset.mode === "new" ? "join" : "new"; say(""); (f.dataset.mode === "join" ? f.c : f.n).focus(); });
      if (code) say(note);
      // Primero se elige (crear o entrar con código); después, el nombre. Con enlace de invitación se va directo al nombre.
      const msg = el.querySelector(".lp-msg");
      const stage = (st2, mode) => { el.dataset.stage = st2; if (mode) f.dataset.mode = mode; say(""); if (msg) msg.remove(); if (st2 === "form") f.n.focus(); el.scrollTop = 0; };
      el.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => stage("form", b.dataset.pick)));
      const bk = el.querySelector("[data-back]"); if (bk) bk.addEventListener("click", () => stage("pick"));
      if (code) f.n.focus({ preventScroll: true });
      const nameOk = () => { myName = f.n.value.trim().slice(0, 24); if (!myName) { say((EN?((CA?"Escriu el teu nom.":FR?"Écris ton nom.":"Type your name.")):"Escribe tu nombre.")); f.n.focus(); } return !!myName; };
      const finish = () => {
        LS.set("pistea.nombre", myName);
        try { history.replaceState(null, "", location.pathname + location.search + "#g=" + code); } catch (e2) {}
        el.remove(); st.remove(); resolve();
      };
      f.addEventListener("submit", async e => {
        e.preventDefault();
        if (!nameOk()) return;
        if (code) { finish(); return; }                 // vino en el enlace: se comprueba al arrancar
        if (f.dataset.mode === "new") { createGroup(); return; }
        const raw = f.c.value.trim(), c = codeFromPaste(raw);
        if (!raw) { say((EN?((CA?"Enganxa l'enllaç o el codi que t'han enviat. Si ets el primer, crea un grup nou.":FR?"Colle le lien ou le code qu'on t'a envoyé. Si tu es le premier, crée un nouveau groupe.":"Paste the link or code you were sent. If you're the first, create a new group.")):"Pega el enlace o el código que te han enviado. Si eres el primero, crea un grupo nuevo.")); f.c.focus(); return; }
        if (!c) { say((EN?((CA?"No trobo el codi en el que has enganxat. Torna a copiar l'enllaç sencer.":FR?"Je ne trouve pas le code dans ce que tu as collé. Copie à nouveau le lien en entier.":"I can't find the code in what you pasted. Copy the whole link again.")):"No encuentro el código en lo que has pegado. Copia otra vez el enlace entero.")); f.c.focus(); return; }
        busy(true, sub); say((EN?((CA?"Comprovant el grup…":FR?"Vérification du groupe…":"Checking the group…")):"Comprobando el grupo…"));
        let ok = null;
        try { await ensureAuth(); ok = await groupExists(c); } catch (er) { ok = null; }
        busy(false);
        if (ok === null) { say((EN?((CA?"Sense connexió. Necessites cobertura per entrar en un grup. Torna-ho a provar.":FR?"Pas de connexion. Il faut du réseau pour rejoindre un groupe. Réessaie.":"No connection. You need signal to join a group. Try again.")):"Sin conexión. Hace falta cobertura para entrar en un grupo. Prueba otra vez.")); return; }
        if (!ok) { say((EN?((CA?"No hi ha cap grup amb aquest codi. Revisa l'enllaç o demana'l una altra vegada.":FR?"Il n'y a aucun groupe avec ce code. Vérifie le lien ou redemande-le.":"There's no group with that code. Check the link or ask for it again.")):"No hay ningún grupo con ese código. Revisa el enlace o pide que te lo envíen otra vez.")); f.c.focus(); return; }
        code = c; fromLink = false; finish();
      });
      el.querySelectorAll("[data-login]").forEach(b => b.addEventListener("click", async () => {
        const k = b.dataset.login; busy(true, b); say("");
        try {
          const u = await login(k, true);
          LS.set("vallik.lastLogin", k);
          const box = el.querySelector("#lpauth"), nm = (u.displayName || "").split(" ")[0];
          if (nm && !f.n.value.trim()) f.n.value = nm.slice(0, 24);
          if (box) box.innerHTML = `<div class="lp-done">${k === "apple" ? A_ICON : G_ICON}<span><b>${L("Has entrado con","Signed in with")} ${k === "apple" ? "Apple" : "Google"}</b>${(u.email || "").replace(/</g, "&lt;")}</span></div>`;
          say(code ? (EN?((CA?"Fet. Revisa el teu nom i prem Entrar.":FR?"C'est fait. Vérifie ton nom et appuie sur Rejoindre.":"Done. Check your name and press Join.")):"Ya está. Revisa tu nombre y pulsa Entrar.") : (EN?((CA?"Fet. Ara enganxa l'enllaç del teu grup o crea'n un de nou.":FR?"C'est fait. Colle maintenant le lien de ton groupe ou crées-en un nouveau.":"Done. Now paste your group link or create a new one.")):"Ya está. Ahora pega el enlace de tu grupo o crea uno nuevo."));
          if (el.dataset.stage === "form") (f.c || f.n).focus();
        } catch (er) { const t = loginErr(er); if (t) say(t); }
        busy(false);
      }));
      el.querySelectorAll(".lp-lang [data-lang]").forEach(b => b.addEventListener("click", () => {
        const v = b.dataset.lang; if (v === LANG) return; LS.set("vallik.lang", v); window.vReload ? vReload() : location.reload(); return;
        const root = el.querySelector(".lp"); root.dataset.lang = v;
        document.documentElement.lang = v;
        el.querySelectorAll("[data-ph-es]").forEach(i => { i.placeholder = i.dataset["ph" + (v === "en" ? "En" : "Es")]; });
      }));
      document.documentElement.lang = LANG;
      const pb = el.querySelector("[data-paste]");
      if (pb) pb.addEventListener("click", async () => { try { const t = await navigator.clipboard.readText(); if (t) { f.c.value = t.trim(); say(""); } } catch (er) { f.c.focus(); } });
      async function createGroup() {
        if (!nameOk()) return;
        busy(true, sub); say((EN?((CA?"Creant el grup…":FR?"Création du groupe…":"Creating the group…")):"Creando el grupo…"));
        try { await ensureAuth(); } catch (er) { busy(false); say((EN?((CA?"Sense connexió. Necessites cobertura per crear el grup.":FR?"Pas de connexion. Il faut du réseau pour créer le groupe.":"No connection. You need signal to create the group.")):"Sin conexión. Hace falta cobertura para crear el grupo.")); return; }
        code = newCode(); creating = true; fromLink = false; finish();
      }
    });
  }

  /* ----- Firebase ----- */
  firebase.initializeApp(cfg);
  /* App Check: Firebase comprueba que quien pide datos es Vallik y no un programa que copió la clave.
     En la web, Fraud Defense (reCAPTCHA) de forma invisible; en el iPhone, App Attest a través de native.js.
     Hasta que se active "Aplicar" en la consola, si falla no bloquea nada. */
  (function appCheck() {
    const AC = window.PISTEA_APPCHECK || {};
    if (!firebase.appCheck) return;
    try {
      const N = window.PisteaNative;
      if (N && N.appCheckToken) {
        firebase.appCheck().activate(new firebase.appCheck.CustomProvider({ getToken: () => N.appCheckToken() }), true);
      } else if (AC.web && /(^|\.)vallik\.app$|^pistea-94bf0\.firebaseapp\.com$/.test(location.hostname)) {
        firebase.appCheck().activate(new firebase.appCheck.ReCaptchaEnterpriseProvider(AC.web), true);
      }
    } catch (e) {}
  })();
  const auth = firebase.auth();
  const fs = firebase.firestore();

  /* Informe de errores: si algo falla en el móvil de alguien, queda una nota técnica en "errores"
     (mensaje, archivo y línea, versión y plataforma). Sin datos personales: sin nombre, sin usuario,
     sin posición; se quita cualquier código de grupo. Como mucho 5 por sesión, y se borran a los 30 días. */
  const WEB_VER = "v49";
  (function errores() {
    let sent = 0; const seen = new Set();
    const clean = t => String(t || "").replace(/([#&?]g=)[a-z0-9]+/gi, "$1…").replace(/\b[A-Za-z0-9_-]{24,}\b/g, "…").slice(0, 300);
    function report(msg, src) {
      msg = clean(msg); src = clean(src);
      const k = msg + "|" + src;
      if (!msg || seen.has(k) || sent >= 5) return;
      seen.add(k); sent++;
      const plat = NATIVE_UA ? (/android/i.test(navigator.userAgent) ? "android" : "ios") : "web";
      const data = { msg, src, v: WEB_VER, plat, at: Date.now() };
      if (window.PISTEA_TTL) data.ttl = firebase.firestore.Timestamp.fromMillis(Date.now() + 30 * 864e5);
      ensureAuth().then(() => fs.collection("errores").add(data)).catch(() => {});
    }
    window.addEventListener("error", e => { if (e && e.message) report(e.message, (e.filename || "").split("/").pop() + ":" + (e.lineno || 0) + ":" + (e.colno || 0)); });
    window.addEventListener("unhandledrejection", e => { const r = e && e.reason; if (!r) return; const m = r.message || String(r); if (/permission|offline|unavailable|network|aborted|cancel/i.test(m)) return; report(m, ((r.stack || "").split("\n")[1] || "").trim()); });
  })();
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
  // En la app del iPhone, Apple y Google van por el plugin nativo (las ventanas web de Google no funcionan dentro de apps).
  const NATIVE_LOGIN = () => !!(window.PisteaNative && window.PisteaNative.signIn);
  const canLogin = k => NATIVE_UA ? NATIVE_LOGIN() && (k === "apple" || k === "google") : !!LOGIN[k];
  // Credencial de Firebase a partir de lo que devuelve el plugin nativo.
  function nativeCred(k, c) {
    if (k === "apple") return new firebase.auth.OAuthProvider("apple.com").credential({ idToken: c.idToken, rawNonce: c.nonce });
    return firebase.auth.GoogleAuthProvider.credential(c.idToken, c.accessToken);
  }
  function provider(k) {
    if (k === "apple") { const p = new firebase.auth.OAuthProvider("apple.com"); p.addScope("email"); p.addScope("name"); p.setCustomParameters({ locale: "es_ES" }); return p; }
    const p = new firebase.auth.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); return p;
  }
  function loginErr(e) {
    const c = (e && e.code) || "";
    if (c === "auth/popup-closed-by-user" || c === "auth/cancelled-popup-request") return "";
    if (/cancel/i.test((e && e.message) || "") || /cancel/i.test(c)) return "";   // cerró la ventana nativa de Apple o Google
    if (c === "auth/operation-not-allowed") return (EN?((CA?"L'accés amb aquest compte encara no està activat. De moment, fes servir el teu nom.":FR?"La connexion avec ce compte n'est pas encore activée. Utilise ton nom pour l'instant.":"Signing in with that account isn't switched on yet. Use your name for now.")):"El acceso con esa cuenta aún no está activado. Entra con tu nombre de momento.");
    if (c === "auth/unauthorized-domain") return (EN?((CA?"Aquesta adreça encara s'ha d'autoritzar a Firebase. De moment, fes servir el teu nom.":FR?"Cette adresse doit encore être autorisée dans Firebase. Utilise ton nom pour l'instant.":"This address still needs to be authorised in Firebase. Use your name for now.")):"Falta autorizar esta dirección en Firebase. Entra con tu nombre de momento.");
    if (c === "auth/popup-blocked") return (EN?((CA?"El navegador ha bloquejat la finestra. Torna a tocar el botó.":FR?"Le navigateur a bloqué la fenêtre. Touche encore le bouton.":"The browser blocked the window. Tap the button again.")):"El navegador ha bloqueado la ventana. Toca otra vez el botón.");
    if (c === "auth/network-request-failed") return (EN?((CA?"Sense connexió. Necessites cobertura per entrar amb el teu compte.":FR?"Pas de connexion. Il faut du réseau pour te connecter avec ton compte.":"No connection. You need signal to sign in with your account.")):"Sin conexión. Hace falta cobertura para entrar con tu cuenta.");
    if (c === "auth/operation-not-supported-in-this-environment" || c === "auth/web-storage-unsupported") return (EN?((CA?"La finestra d'accés no es pot obrir aquí. Obre vallik.app a Safari.":FR?"La fenêtre de connexion ne peut pas s'ouvrir ici. Ouvre vallik.app dans Safari.":"The sign-in window can't open here. Open vallik.app in Safari.")):"Aquí no se puede abrir la ventana de inicio de sesión. Abre vallik.app en Safari.");
    return (EN?((CA?"No s'ha pogut entrar amb aquest compte. Torna-ho a provar o fes servir el teu nom.":FR?"Impossible de te connecter avec ce compte. Réessaie ou utilise ton nom.":"Couldn't sign in with that account. Try again or use your name.")):"No se ha podido entrar con la cuenta. Prueba otra vez o entra con tu nombre.");
  }
  // allowSwitch: en la pantalla de entrada se puede pasar a una cuenta que ya existía; dentro de la app, no
  // (cambiaría el usuario y perderías el perfil de este grupo).
  async function login(k, allowSwitch) {
    const pv = provider(k);
    const cur = auth.currentUser || await ensureAuth().catch(() => null);
    const nat = NATIVE_UA && NATIVE_LOGIN();
    const cred = nat ? nativeCred(k, await window.PisteaNative.signIn(k)) : null;
    let user;
    if (cur && cur.isAnonymous) {
      try { user = (nat ? await cur.linkWithCredential(cred) : await cur.linkWithPopup(pv)).user; }
      catch (e) {
        if (e && (e.code === "auth/credential-already-in-use" || e.code === "auth/email-already-in-use") && (e.credential || cred)) {
          if (!allowSwitch) { const er = new Error("en-uso"); er.code = "vallik/en-uso"; throw er; }
          user = (await auth.signInWithCredential(e.credential || cred)).user;
        } else throw e;
      }
    } else user = (nat ? await auth.signInWithCredential(cred) : await auth.signInWithPopup(pv)).user;
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
  const T_ = (es, en, fr, ca) => EN ? (CA ? ca : FR ? fr : en) : es;
  const movedMsg = () => T_("Quien creó el grupo cambió el código. Ya estás en el nuevo.", "Whoever created the group changed the code. You're in the new one now.", "La personne qui a créé le groupe a changé le code. Tu es dans le nouveau.", "Qui va crear el grup n'ha canviat el codi. Ja ets al nou.");
  // Pasar al código nuevo del grupo (lo cambió quien lo creó): me llevo mis pistas del diario,
  // borro lo mío del grupo viejo y vuelvo a abrir la app con el código nuevo.
  async function moveTo(group, uid, nc, aviso) {
    try {
      const q = got(await within(group.collection("pistas").where("uid", "==", uid).get(), 4000));
      if (q && q.size) {
        const dst = fs.collection("grupos").doc(nc).collection("pistas"), b = fs.batch();
        q.docs.slice(0, 400).forEach(d => { const v = Object.assign({}, d.data()); delete v.ttl; b.set(dst.doc(d.id), withTtl("pistas", v)); });
        b.commit().catch(() => {});
      }
    } catch (e) {}
    ["aqui", "perfiles", "mensajes"].forEach(c => group.collection(c).doc(uid).delete().catch(() => {}));
    LS.set("pistea.grupo", nc);
    if (aviso) LS.set("pistea.aviso", aviso);
    try { history.replaceState(null, "", location.pathname + location.search + "#g=" + nc); } catch (e) {}
    setTimeout(() => location.reload(), 400);
  }
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
      LS.set("pistea.aviso", (EN?((CA?"Aquest enllaç no porta a cap grup. Continues al teu grup de sempre.":FR?"Ce lien ne mène à aucun groupe. Tu restes dans ton groupe habituel.":"That link doesn't lead to any group. You're still in your usual group.")):"Ese enlace no lleva a ningún grupo. Sigues en tu grupo de siempre."));
      try { history.replaceState(null, "", location.pathname + location.search + "#g=" + savedCode); } catch (e) {}
      setTimeout(() => location.reload(), 50);
    } else goOut((EN?((CA?"Aquest enllaç no porta a cap grup. Enganxa el codi correcte o crea un grup nou.":FR?"Ce lien ne mène à aucun groupe. Colle le bon code ou crée un nouveau groupe.":"That link doesn't lead to any group. Paste the right code or create a new group.")):"Ese enlace no lleva a ningún grupo. Pega el código correcto o crea un grupo nuevo."));
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
      const kicked = () => goOut((EN?((CA?"T'han tret d'aquell grup. Pots crear-ne un de nou o entrar en un altre amb el seu codi.":FR?"Tu as été retiré de ce groupe. Tu peux en créer un nouveau ou en rejoindre un autre avec son code.":"You were removed from that group. You can create a new one or join another with its code.")):"Te han quitado de ese grupo. Puedes crear uno nuevo o entrar en otro con su código."));

      // ¿Me han quitado? ¿Quién creó el grupo? Las dos lecturas a la vez y como mucho 2,5 s
      // (las escrituras nunca se esperan).
      let owner = null;
      if (creating) {
        // Grupo nuevo: documento del grupo y perfil juntos. No se espera: sin cobertura se envía después.
        creating = false; owner = uid;
        const b = fs.batch();
        b.set(group, { owner: uid, at: Date.now() });
        b.set(group.collection("perfiles").doc(uid), withTtl("perfiles", { name: myName, at: Date.now() }));
        b.commit().catch(() => {});
      } else {
        // Si la red no contesta a tiempo, lo que haya en la copia del móvil.
        const read = async ref => got(await within(ref.get(), 2500)) || got(await within(ref.get({ source: "cache" }), 1000));
        const [out, g, nv, mv] = await Promise.all([read(group.collection("fuera").doc(uid)), read(group), read(group.collection("nuevo").doc(uid)), read(group.collection("movido").doc("info"))]);
        if (out && out.exists) { kicked(); return new Promise(() => {}); }
        // El creador cambió el código: si estoy en la lista, paso al nuevo; si no, me quedo fuera.
        if (nv && nv.exists && nv.data().code) { moveTo(group, uid, nv.data().code, movedMsg()); return new Promise(() => {}); }
        if (mv && mv.exists) { goOut(T_("Este grupo cambió de código. Pídele el nuevo a quien lo creó.", "This group has a new code. Ask whoever created it for the new one.", "Ce groupe a changé de code. Demande le nouveau à qui l'a créé.", "Aquest grup ha canviat de codi. Demana el nou a qui el va crear.")); return new Promise(() => {}); }
        if (g && g.exists) owner = g.data().owner;
        else if (g && !g.metadata.fromCache) {
          // El servidor dice que no hay documento de grupo: o es un grupo de antes (sin creador)
          // o el enlace no lleva a ningún grupo.
          if (await groupExists(code) === false) { badLink(); return new Promise(() => {}); }
          // Grupo de antes: el primero que entra pasa a ser el creador. Las escrituras no se esperan.
          owner = uid;
          group.set({ owner: uid, at: Date.now() }).catch(() => group.get().then(s => { if (s.exists && window.PISTEA_GROUP) window.PISTEA_GROUP.isOwner = s.data().owner === uid; }, () => {}));
        }
        group.collection("perfiles").doc(uid).set(withTtl("perfiles", { name: myName, at: Date.now() }), { merge: true }).catch(() => {});
      }
      // A partir de aquí este es tu grupo, también al abrir la app sin enlace.
      LS.set("pistea.grupo", code); fromLink = false;

      // Si me quitan mientras tengo la app abierta, salgo en el momento.
      group.collection("fuera").doc(uid).onSnapshot(s => { if (s.exists) kicked(); }, () => {});
      // Si el creador cambia el código mientras tengo la app abierta, paso al nuevo en el momento.
      group.collection("nuevo").doc(uid).onSnapshot(s => { if (s.exists && s.data().code && s.data().code !== code) moveTo(group, uid, s.data().code, movedMsg()); }, () => {});

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
          catch (e) { return { ok: false, msg: e && e.code === "vallik/en-uso" ? (EN?((CA?"Aquest compte ja es fa servir en un altre mòbil. Per fer-lo servir aquí, surt del grup i entra-hi des de la pantalla d'inici.":FR?"Ce compte est déjà utilisé sur un autre téléphone. Pour l'utiliser ici, quitte le groupe et connecte-toi avec depuis l'écran d'accueil.":"That account is already used on another phone. To use it here, leave the group and sign in with it from the start screen.")):"Esa cuenta ya se usa en otro móvil. Para usarla aquí, sal del grupo y entra con ella desde la pantalla de inicio.") : loginErr(e) }; }
        },
        leave() {
          // Sin esperar a la red: se borra al recuperar cobertura.
          ["aqui", "perfiles", "mensajes"].forEach(c => group.collection(c).doc(uid).delete().catch(() => {}));
          goOut((EN?((CA?"Has sortit del grup.":FR?"Tu as quitté le groupe.":"You've left the group.")):"Has salido del grupo."));
        },
        // Borrar mi cuenta (lo pide Apple): todo lo mío en este grupo y el usuario de Firebase. Necesita red.
        async deleteAccount() {
          const T = (es, en, fr, ca) => EN ? (CA ? ca : FR ? fr : en) : es;
          if (navigator.onLine === false) return { ok: false, msg: T("Necesitas conexión para borrar tu cuenta.", "You need a connection to delete your account.", "Il te faut du réseau pour supprimer ton compte.", "Necessites connexió per esborrar el teu compte.") };
          try {
            const mine = async c => { const q = got(await within(group.collection(c).where("uid", "==", uid).get({ source: "server" }), 10000)); if (!q) throw new Error("red"); await Promise.all(q.docs.map(d => d.ref.delete())); };
            await mine("pistas"); await mine("avisos"); await mine("quedada");
            await Promise.all(["aqui", "mensajes", "perfiles"].map(c => group.collection(c).doc(uid).delete()));
            const u = auth.currentUser;
            if (u) {
              const pd = (u.providerData || [])[0], k = pd && pd.providerId === "apple.com" ? "apple" : pd && pd.providerId === "google.com" ? "google" : null;
              const nat = NATIVE_UA && NATIVE_LOGIN();
              // Apple exige revocar el permiso de "Iniciar sesión con Apple" al borrar la cuenta (guideline 5.1.1).
              // Para eso hace falta volver a confirmar con Apple, y de paso sirve como inicio de sesión reciente.
              if (k === "apple") {
                if (nat) { const c = await window.PisteaNative.revokeApple(); await u.reauthenticateWithCredential(nativeCred("apple", c)); }
                else { const r = await u.reauthenticateWithPopup(provider("apple")); const t = r && r.credential && r.credential.accessToken; if (t && auth.revokeAccessToken) await auth.revokeAccessToken(t); }
              }
              try { await u.delete(); }
              catch (e) {
                if (e && e.code === "auth/requires-recent-login" && k) {
                  if (nat) await u.reauthenticateWithCredential(nativeCred(k, await window.PisteaNative.signIn(k)));
                  else await u.reauthenticateWithPopup(provider(k));
                  await u.delete();
                } else throw e;
              }
            }
          } catch (e) {
            if (e && (e.code === "auth/popup-closed-by-user" || e.code === "auth/cancelled-popup-request")) return { ok: false, msg: "" };
            return { ok: false, msg: T("No se ha podido borrar tu cuenta. Revisa la conexión y vuelve a probar, o escríbenos a vallik-soporte@googlegroups.com.", "Couldn't delete your account. Check your connection and try again, or write to vallik-soporte@googlegroups.com.", "Impossible de supprimer ton compte. Vérifie ta connexion et réessaie, ou écris-nous à vallik-soporte@googlegroups.com.", "No s'ha pogut esborrar el teu compte. Revisa la connexió i torna-ho a provar, o escriu-nos a vallik-soporte@googlegroups.com.") };
          }
          try { Object.keys(localStorage).filter(k => /^(pistea|vallik)\./.test(k) && k !== "vallik.lang").forEach(k => localStorage.removeItem(k)); } catch (e) {}
          goOut(T("Hemos borrado tu cuenta y todo lo tuyo en el grupo.", "We've deleted your account and everything of yours in the group.", "Nous avons supprimé ton compte et tout ce qui était à toi dans le groupe.", "Hem esborrat el teu compte i tot el que era teu al grup."));
          return { ok: true };
        },
        // Cambiar el código (solo quien creó el grupo): crea el grupo con un código nuevo, avisa a cada
        // persona que sigue en el grupo y cierra el viejo, así quien fue quitado no puede volver a entrar.
        async changeCode() {
          if (!G.isOwner) return { ok: false, msg: "" };
          if (navigator.onLine === false) return { ok: false, msg: T_("Necesitas conexión para cambiar el código.", "You need a connection to change the code.", "Il te faut du réseau pour changer le code.", "Necessites connexió per canviar el codi.") };
          try {
            const ps = got(await within(group.collection("perfiles").get({ source: "server" }), 10000));
            if (!ps) throw new Error("red");
            const nc = newCode(), ng = fs.collection("grupos").doc(nc), now = Date.now(), b = fs.batch();
            b.set(ng, { owner: uid, at: now });
            b.set(ng.collection("perfiles").doc(uid), withTtl("perfiles", { name: myName, at: now }));
            ps.docs.filter(d => d.id !== uid).slice(0, 400).forEach(d => b.set(group.collection("nuevo").doc(d.id), withTtl("perfiles", { code: nc, by: uid, at: now })));
            b.set(group.collection("movido").doc("info"), withTtl("perfiles", { by: uid, at: now }));
            await within(b.commit(), 15000).then(r => { if (r === TIMEOUT) throw new Error("red"); });
            moveTo(group, uid, nc, T_("Listo. El grupo tiene código nuevo y los demás pasan solos.", "Done. The group has a new code and everyone else moves over on their own.", "C'est fait. Le groupe a un nouveau code et les autres suivent tout seuls.", "Fet. El grup té codi nou i la resta hi passa sola."));
            return { ok: true };
          } catch (e) {
            return { ok: false, msg: T_("No se ha podido cambiar el código. Revisa la conexión y vuelve a probar.", "Couldn't change the code. Check your connection and try again.", "Impossible de changer le code. Vérifie ta connexion et réessaie.", "No s'ha pogut canviar el codi. Revisa la connexió i torna-ho a provar.") };
          }
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

  /* Borrado automático: cada documento lleva "ttl", la fecha en que Firestore lo borra solo
     (política TTL activada en la consola para cada colección). Posiciones y mensajes duran 2 días;
     avisos y punto de encuentro, un día después de caducar; perfil y pistas, 60 días desde la última vez. */
  const DAY = 86400000, TTL_DAYS = { aqui: 2, mensajes: 2, perfiles: 60, pistas: 60 };
  // Se activa (PISTEA_TTL en firebase-config.js) después de publicar las reglas que aceptan "ttl".
  function withTtl(c, data) {
    if (!window.PISTEA_TTL) return data;
    let t = TTL_DAYS[c] ? Date.now() + TTL_DAYS[c] * DAY : (data && typeof data.exp === "number" ? data.exp + DAY : Date.now() + 2 * DAY);
    return Object.assign({}, data, { ttl: firebase.firestore.Timestamp.fromMillis(t) });
  }

  /* Misma forma que usa la app: db.collection(c).doc(id).set / delete, query.onSnapshot */
  function dbFacade() {
    const col = name => {
      const pending = boot().then(b => b.group.collection(name));
      return {
        doc: id => ({
          set: async data => (await pending).doc(id).set(withTtl(name, data)),
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
