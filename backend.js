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
  const LFR = {"Apple and App Store are trademarks of Apple Inc., registered in the U.S. and other countries.": "Apple et App Store sont des marques d'Apple Inc., déposées aux États-Unis et dans d'autres pays.", "You've been invited to a group. Download Vallik and join with this code:": "Tu as été invité dans un groupe. Télécharge Vallik et rejoins-le avec ce code :", "Copy": "Copier", "Copied": "Copié", "Free for iPhone. Your group on the Les 3 Vallées map, live.": "Gratuit sur iPhone. Ton groupe sur la carte des 3 Vallées, en direct.", "Download on the App Store": "Télécharger dans l'App Store", "Continue in the browser": "Continuer dans le navigateur", "Continue without an account": "Continuer sans compte", "Back": "Retour", "Create your trip's group": "Crée le groupe du voyage", "Add your name, then send the link to the others.": "Mets ton prénom, puis envoie le lien aux autres.", "Paste the link or code you were sent.": "Colle le lien ou le code qu'on t'a envoyé.", "Create my group": "Créer mon groupe", "Join the group": "Rejoindre le groupe", "I have an invite link": "J'ai un lien d'invitation", "Create a new group instead": "Plutôt créer un nouveau groupe", "Optional. With Google your profile follows you if you change phones.": "Facultatif. Avec Google, ton profil te suit si tu changes de téléphone.", "Nobody gets lost from the group": "Personne ne se perd du groupe", "See your friends and family on the piste map, get to them in a few turns and head home together before the lifts close.": "Vois tes amis et ta famille sur le plan des pistes, rejoins-les en quelques virages et rentrez ensemble avant la fermeture des remontées.", "You have been invited to a group. Join and you will all be on the map in a moment.": "Tu as été invité dans un groupe. Rejoins-le et vous serez tous sur la carte en un instant.", "Continue with Google": "Continuer avec Google", "Continue with Apple": "Continuer avec Apple", "With Google your profile follows you if you change phones. Or just use your name below.": "Avec Google, ton profil te suit si tu changes de téléphone. Sinon, entre juste avec ton prénom ci-dessous.", "Join your group": "Rejoins ton groupe", "This is the name your friends will see.": "C'est le nom que verront tes amis.", "Your name": "Ton prénom", "Group link or code": "Lien ou code du groupe", "Paste": "Coller", "Ask whoever created the group.": "Demande-le à qui a créé le groupe.", "Join": "Rejoindre", "or": "ou", "Create a new group": "Créer un nouveau groupe", "What it does for your group": "Ce que ça fait pour ton groupe", "Live": "En direct", "Your group, live": "Ton groupe, en direct", "Every friend is a dot on the 3D resort map. You know where they are without calling anyone.": "Chaque ami est un point sur la carte 3D de la station. Tu sais où il est sans appeler personne.", "3 on the slopes · 1 min ago": "3 sur les pistes · il y a 1 min", "Route": "Itinéraire", "Get to anyone": "Rejoins qui tu veux", "Step by step route over pistes and lifts to a friend, a bar or a lift. Skip the blacks if you like.": "Itinéraire étape par étape par les pistes et les remontées jusqu'à un ami, un bar ou une remontée. Sans noires, si tu préfères.", "Home": "Retour", "Make it home in time": "Rentre à temps", "It tells you when to head back so you are not stuck in the wrong valley when the lifts close.": "Il te dit quand repartir pour ne pas rester bloqué dans la mauvaise vallée à la fermeture des remontées.", "leave here · lifts close 16:45": "pars d'ici · fermeture 16:45", "Meet up": "Rendez-vous", "Meet up without wasting the morning": "Retrouvez-vous sans perdre la matinée", "Vallik picks the spot that is fairest for everyone. And if someone has a problem, the rest see how to reach them.": "Vallik choisit l'endroit le plus juste pour tous. Et si quelqu'un a un problème, les autres voient comment le rejoindre.", "Summit bar": "Bar du sommet", "6 min for everyone": "6 min pour tous", "Privacy": "Confidentialité", "Terms": "Conditions", "Contact": "Contact", "Map": "Carte", "Signed in with": "Connecté avec"};
  const LCA = {"Apple and App Store are trademarks of Apple Inc., registered in the U.S. and other countries.": "Apple i App Store són marques d'Apple Inc., registrades als EUA i en altres països.", "You've been invited to a group. Download Vallik and join with this code:": "T'han convidat a un grup. Descarrega Vallik i entra-hi amb aquest codi:", "Copy": "Copiar", "Copied": "Copiat", "Free for iPhone. Your group on the Les 3 Vallées map, live.": "Gratis per a iPhone. El teu grup al mapa de Les 3 Vallées, en directe.", "Download on the App Store": "Descarrega-la a l'App Store", "Continue in the browser": "Continuar al navegador", "Continue without an account": "Continuar sense compte", "Back": "Tornar", "Create your trip's group": "Crea el grup del viatge", "Add your name, then send the link to the others.": "Posa el teu nom i després envia l'enllaç als altres.", "Paste the link or code you were sent.": "Enganxa l'enllaç o el codi que t'han enviat.", "Create my group": "Crear el meu grup", "Join the group": "Entrar al grup", "I have an invite link": "Tinc un enllaç d'invitació", "Create a new group instead": "Millor crear un grup nou", "Optional. With Google your profile follows you if you change phones.": "Opcional. Amb Google el teu perfil et segueix si canvies de mòbil.", "Nobody gets lost from the group": "Que ningú es perdi del grup", "See your friends and family on the piste map, get to them in a few turns and head home together before the lifts close.": "Veus els teus amics i la teva família al mapa de pistes, hi arribes en quatre girs i torneu junts abans que tanquin els remuntadors.", "You have been invited to a group. Join and you will all be on the map in a moment.": "T'han convidat a un grup. Entra i en un moment us veureu tots al mapa.", "Continue with Google": "Continuar amb Google", "Continue with Apple": "Continuar amb Apple", "With Google your profile follows you if you change phones. Or just use your name below.": "Amb Google el teu perfil et segueix encara que canviïs de mòbil. Si ho prefereixes, entra només amb el teu nom aquí sota.", "Join your group": "Entra al teu grup", "This is the name your friends will see.": "Els teus amics et veuran amb aquest nom.", "Your name": "El teu nom", "Group link or code": "Enllaç o codi del grup", "Paste": "Enganxar", "Ask whoever created the group.": "Demana-ho a qui va crear el grup.", "Join": "Entrar", "or": "o", "Create a new group": "Crear un grup nou", "What it does for your group": "Què fa pel teu grup", "Live": "En directe", "Your group, live": "El teu grup, en directe", "Every friend is a dot on the 3D resort map. You know where they are without calling anyone.": "Cada amic és un punt al mapa 3D de l'estació. Saps on és sense trucar a ningú.", "3 on the slopes · 1 min ago": "3 a pistes · fa 1 min", "Route": "Ruta", "Get to anyone": "Arriba fins a qui vulguis", "Step by step route over pistes and lifts to a friend, a bar or a lift. Skip the blacks if you like.": "Ruta pas a pas per pistes i remuntadors fins a un amic, un bar o un remuntador. Sense negres, si ho prefereixes.", "Home": "Tornada", "Make it home in time": "Torna a casa a temps", "It tells you when to head back so you are not stuck in the wrong valley when the lifts close.": "T'avisa de quan sortir per no quedar-te atrapat en una altra vall quan tanquin els remuntadors.", "leave here · lifts close 16:45": "surt d'aquí · tanca 16:45", "Meet up": "Quedada", "Meet up without wasting the morning": "Quedeu sense perdre mig matí", "Vallik picks the spot that is fairest for everyone. And if someone has a problem, the rest see how to reach them.": "Vallik tria el punt que us va millor a tots. I si algú té un problema, la resta veu com arribar-hi.", "Summit bar": "Bar del cim", "6 min for everyone": "6 min per a tothom", "Privacy": "Privacitat", "Terms": "Condicions", "Contact": "Contacte", "Map": "Mapa", "Signed in with": "Has entrat amb"};
  /* Solo el idioma activo: cambiar de idioma recarga la página, y así Google lee un único idioma por dirección. */
  const L = (es, en) => LANG === "es" ? es : LANG === "fr" ? (LFR[en] || en) : LANG === "ca" ? (LCA[en] || es) : en;
  /* ----- Página promocional (solo en la web, en la pantalla de descarga) ----- */
  const PT = {
    sub: ["Gratis para iPhone. Ves a tu grupo en el mapa de pistas y llegas hasta ellos.", "Free for iPhone. See your crew on the piste map and get to them.", "Gratuit sur iPhone. Tu vois ton groupe sur le plan des pistes et tu le rejoins.", "Gratis per a iPhone. Veus el teu grup al mapa de pistes i hi arribes."],
    more: ["Cómo funciona", "How it works", "Comment ça marche", "Com funciona"],
    pk: ["El problema", "The problem", "Le problème", "El problema"],
    ph: ["Seis amigos, una estación enorme y un grupo de WhatsApp.", "Six friends, a huge resort and a group chat.", "Six amis, un domaine immense et un groupe WhatsApp.", "Sis amics, una estació enorme i un grup de WhatsApp."],
    pp: ["Los mensajes llegan tarde, nadie sabe qué pista es cuál y alguien siempre se queda atrás. Vallik pone a todos en el mismo mapa.", "Messages arrive late, nobody knows which run is which and someone always falls behind. Vallik puts everyone on the same map.", "Les messages arrivent en retard, personne ne sait quelle piste est laquelle et quelqu'un reste toujours derrière. Vallik met tout le monde sur la même carte.", "Els missatges arriben tard, ningú sap quina pista és quina i sempre algú es queda enrere. Vallik posa tothom al mateix mapa."],
    c1: ["¿Dónde estáis?", "Where are you?", "Vous êtes où ?", "On sou?"],
    c2: ["Arriba del todo", "Right at the top", "Tout en haut", "A dalt de tot"],
    c3: ["¿Arriba de qué?", "The top of what?", "En haut de quoi ?", "A dalt de què?"],
    c4: ["¿Qué bar?", "Which bar?", "Quel bar ?", "Quin bar?"],
    f1k: ["Mapa", "Map", "Carte", "Mapa"], f1h: ["Todo el grupo en el mapa de pistas.", "The whole crew on the piste map.", "Tout le groupe sur le plan des pistes.", "Tot el grup al mapa de pistes."],
    f1p: ["Cada uno con su nombre, la pista en la que está y a cuántos minutos queda de ti.", "Everyone with their name, the run they're on and how many minutes away they are.", "Chacun avec son prénom, la piste où il est et à combien de minutes de toi.", "Cadascú amb el seu nom, la pista on és i a quants minuts és de tu."],
    f2k: ["Ir hasta", "Get to", "Rejoindre", "Anar fins"], f2h: ["Llega hasta tus amigos pista a pista.", "Get to your friends run by run.", "Rejoins tes amis piste après piste.", "Arriba fins als teus amics pista a pista."],
    f2p: ["La ruta va por pistas y remontes según tu nivel. La guía por voz te avisa de cada giro con el móvil en el bolsillo.", "The route follows runs and lifts at your level. Voice guidance tells you every turn with your phone in your pocket.", "L'itinéraire suit les pistes et les remontées selon ton niveau. Le guidage vocal t'annonce chaque virage, téléphone dans la poche.", "La ruta va per pistes i remuntadors segons el teu nivell. La guia per veu t'avisa de cada gir amb el mòbil a la butxaca."],
    f3k: ["Peter", "Peter", "Peter", "Peter"], f3h: ["Pregúntale a Peter.", "Ask Peter.", "Demande à Peter.", "Pregunta-ho a en Peter."],
    f3p: ["Dónde comer, dónde tomar algo al sol o qué ruta hacer esta tarde. Peter conoce la estación y sabe dónde estás.", "Where to eat, where to grab a drink in the sun or which route to ski this afternoon. Peter knows the resort and where you are.", "Où manger, où boire un verre au soleil ou quel itinéraire faire cet après-midi. Peter connaît le domaine et sait où tu es.", "On menjar, on prendre alguna cosa al sol o quina ruta fer aquesta tarda. En Peter coneix l'estació i sap on ets."],
    f4k: ["Mi día", "My day", "Ma journée", "El meu dia"], f4h: ["Tu día de esquí, en números.", "Your ski day, in numbers.", "Ta journée de ski, en chiffres.", "El teu dia d'esquí, en números."],
    f4p: ["Pistas, desnivel y kilómetros. Al final del día, una tarjeta para mandar al grupo.", "Runs, vertical and distance. At the end of the day, a card to send to the crew.", "Pistes, dénivelé et kilomètres. En fin de journée, une carte à envoyer au groupe.", "Pistes, desnivell i quilòmetres. Al final del dia, una targeta per enviar al grup."],
    xk: ["Y además", "And also", "Et aussi", "I a més"],
    x1h: ["Quedar", "Meet up", "Se retrouver", "Quedar"], x1p: ["El punto de encuentro que queda más justo para todos.", "The meeting point that's fairest for everyone.", "Le point de rendez-vous le plus juste pour tous.", "El punt de trobada més just per a tothom."],
    x2h: ["Volver a casa", "Head home", "Rentrer", "Tornar a casa"], x2p: ["Te avisa de cuándo salir para no perder el último remonte.", "Tells you when to leave so you don't miss the last lift.", "Te prévient quand partir pour ne pas rater la dernière remontée.", "T'avisa de quan sortir per no perdre l'últim remuntador."],
    x3h: ["Tengo un problema", "I need help", "J'ai un problème", "Tinc un problema"], x3p: ["Un toque y el grupo sabe dónde estás.", "One tap and the crew knows where you are.", "Un geste et le groupe sait où tu es.", "Un toc i el grup sap on ets."],
    band: ["Cada uno a su nivel. Todos en el mapa.", "Everyone at their own level. All on the map.", "Chacun à son niveau. Tous sur la carte.", "Cadascú al seu nivell. Tots al mapa."],
    sk: ["Empezar", "Get started", "Commencer", "Començar"], sh: ["En un minuto, el grupo está listo.", "Your crew is ready in a minute.", "Ton groupe est prêt en une minute.", "En un minut, el grup està llest."],
    s1: ["Descarga Vallik. Es gratis.", "Download Vallik. It's free.", "Télécharge Vallik. C'est gratuit.", "Descarrega Vallik. És gratis."],
    s2: ["Crea el grupo del viaje.", "Create your trip's group.", "Crée le groupe du séjour.", "Crea el grup del viatge."],
    s3: ["Manda el enlace por WhatsApp. Quien lo abre, entra.", "Share the link on WhatsApp. Whoever opens it is in.", "Envoie le lien sur WhatsApp. Qui l'ouvre entre.", "Envia l'enllaç per WhatsApp. Qui l'obre, entra."],
    qk: ["Preguntas", "Questions", "Questions", "Preguntes"],
    q1: ["¿Cuánto cuesta?", "How much does it cost?", "Combien ça coûte ?", "Quant costa?"], a1: ["Nada. Vallik es gratis y no tiene publicidad.", "Nothing. Vallik is free and has no ads.", "Rien. Vallik est gratuit et sans publicité.", "Res. Vallik és gratis i no té publicitat."],
    q2: ["¿Dónde funciona?", "Where does it work?", "Où ça marche ?", "On funciona?"], a2: ["Esta temporada, en Les 3 Vallées. Vallik no es una app oficial de la estación.", "This season, in Les 3 Vallées. Vallik is not an official resort app.", "Cette saison, aux 3 Vallées. Vallik n'est pas une application officielle du domaine.", "Aquesta temporada, a Les 3 Vallées. Vallik no és una app oficial de l'estació."],
    q3: ["¿Quién ve dónde estoy?", "Who can see where I am?", "Qui voit où je suis ?", "Qui veu on soc?"], a3: ["Solo las personas de tu grupo. Puedes salir del grupo o borrar tu cuenta cuando quieras.", "Only the people in your group. You can leave the group or delete your account whenever you like.", "Seulement les personnes de ton groupe. Tu peux quitter le groupe ou supprimer ton compte quand tu veux.", "Només les persones del teu grup. Pots sortir del grup o esborrar el teu compte quan vulguis."],
    q4: ["¿Y si mis amigos tienen Android?", "What if my friends use Android?", "Et si mes amis ont Android ?", "I si els meus amics tenen Android?"], a4: ["Entran desde el navegador con el mismo enlace y aparecen en el mapa con el resto.", "They join from the browser with the same link and show up on the map with everyone else.", "Ils entrent depuis le navigateur avec le même lien et apparaissent sur la carte avec les autres.", "Entren des del navegador amb el mateix enllaç i apareixen al mapa amb la resta."],
    q5: ["¿Necesito cuenta?", "Do I need an account?", "Faut-il un compte ?", "Necessito compte?"], a5: ["No. Puedes entrar con Apple o Google para no perder tu perfil, o seguir sin cuenta.", "No. You can sign in with Apple or Google to keep your profile, or carry on without an account.", "Non. Tu peux te connecter avec Apple ou Google pour garder ton profil, ou continuer sans compte.", "No. Pots entrar amb Apple o Google per no perdre el teu perfil, o seguir sense compte."],
    end: ["Nadie baja solo.", "Nobody skis down alone.", "Personne ne descend seul.", "Ningú baixa sol."],
    web: ["Seguir en el navegador", "Continue in the browser", "Continuer dans le navigateur", "Seguir al navegador"],
    qr: ["Escanéalo con la cámara del iPhone", "Scan it with your iPhone camera", "Scanne-le avec l'appareil photo de l'iPhone", "Escaneja'l amb la càmera de l'iPhone"],
    faqb: ["Preguntas frecuentes", "FAQ", "Questions fréquentes", "Preguntes freqüents"],
    close: ["Cerrar", "Close", "Fermer", "Tancar"],
    alt1: ["La app de Vallik con el grupo en el mapa", "The Vallik app with the crew on the map", "L'app Vallik avec le groupe sur la carte", "L'app de Vallik amb el grup al mapa"],
  };
  const P = k => { const r = PT[k]; return LANG === "en" ? r[1] : LANG === "fr" ? r[2] : LANG === "ca" ? r[3] : r[0]; };
  function promoHTML() {
    const badge = `<a class="pr-store" href="https://apps.apple.com/app/id6838083819"><img src="badge-appstore-${LANG === "en" || LANG === "fr" || LANG === "ca" ? LANG : "es"}.svg" width="162" height="54" alt="${L("Descargar en el App Store","Download on the App Store")}"></a>`;
    const feat = (n, img, flip) => `<section class="pr-f${flip ? " flip" : ""}"><div class="pr-ft"><p class="pr-k">${P("f" + n + "k")}</p><h3>${P("f" + n + "h")}</h3><p>${P("f" + n + "p")}</p></div><img class="pr-ph" src="web/app-${img}.webp" width="600" height="1300" loading="lazy" alt=""></section>`;
    return `<div class="lp-promo">
      <section class="pr-prob"><div class="pr-in pr-rv">
        <div class="pr-pt"><p class="pr-k">${P("pk")}</p><h2>${P("ph")}</h2><p>${P("pp")}</p></div>
        <div class="pr-chat" aria-hidden="true">
          <div style="--d:0" class="pr-b"><small>MARTA · 11:42</small><span>${P("c1")}</span></div>
          <div style="--d:1" class="pr-b r"><small>DANI · 11:43</small><span>${P("c2")}</span></div>
          <div style="--d:2" class="pr-b"><small>LEO · 11:47</small><span>${P("c3")}</span></div>
          <div style="--d:3" class="pr-b r"><small>DANI · 12:31</small><span>${P("c4")}</span></div>
        </div></div></section>
      <section class="pr-show pr-in pr-rv">
        <div class="pr-tabs" role="tablist">${[1, 2, 3, 4].map(i => `<button type="button" role="tab" data-tab="${i - 1}"${i === 1 ? ' aria-selected="true"' : ""}>${P("f" + i + "k")}<i></i></button>`).join("")}</div>
        <div class="pr-stage">
          <div class="pr-txt">${[1, 2, 3, 4].map(i => `<div class="pr-tx${i === 1 ? " on" : ""}"><h3>${P("f" + i + "h")}</h3><p>${P("f" + i + "p")}</p></div>`).join("")}</div>
          <div class="pr-dev"><div class="pr-tilt">${["mapa", "ruta", "peter", "dia"].map((n, i) => `<img src="web/app-${n}.webp" width="600" height="1300" ${i ? 'loading="lazy" ' : ""}alt=""${i ? "" : ' class="on"'}>`).join("")}</div><div class="pr-glow"></div></div>
        </div></section>
      <section class="pr-x pr-in pr-rv"><p class="pr-k">${P("xk")}</p><ul>
        <li><b>${P("x1h")}</b><span>${P("x1p")}</span></li>
        <li><b>${P("x2h")}</b><span>${P("x2p")}</span></li>
        <li><b>${P("x3h")}</b><span>${P("x3p")}</span></li></ul></section>
      <section class="pr-band"><img src="web/telesilla.webp" width="1600" height="900" loading="lazy" alt=""><p>${P("band")}</p></section>
      <section class="pr-steps pr-in pr-rv"><p class="pr-k">${P("sk")}</p><h2>${P("sh")}</h2><ol>
        <li><span>01</span>${P("s1")}</li><li><span>02</span>${P("s2")}</li><li><span>03</span>${P("s3")}</li></ol></section>
      <section class="pr-faq pr-in pr-rv"><p class="pr-k">${P("qk")}</p>
        ${[1, 2, 3, 4, 5].map(i => `<details><summary>${P("q" + i)}</summary><p>${P("a" + i)}</p></details>`).join("")}</section>
      <section class="pr-end"><img src="web/alba.webp" width="1400" height="1749" loading="lazy" alt=""><div class="pr-endt pr-rv"><h2>${P("end")}</h2>${badge}<button class="lp-skip" type="button" data-web>${P("web")}</button></div></section>
      <footer class="pr-foot pr-in"><nav><a href="${LANG === "fr" ? "fr/confidentialite/" : LANG === "en" ? "privacy/" : "privacidad/"}">${L("Privacidad","Privacy")}</a><a href="${LANG === "fr" ? "fr/conditions/" : LANG === "en" ? "terms/" : "condiciones/"}">${L("Condiciones","Terms")}</a><a href="mailto:vallik-soporte@googlegroups.com">${L("Contacto","Contact")}</a></nav>
        <small>${L("Apple y App Store son marcas de Apple Inc., registradas en EE. UU. y en otros países.","Apple and App Store are trademarks of Apple Inc., registered in the U.S. and other countries.")} ${L("Mapa","Map")} © OpenStreetMap · Copernicus DEM</small></footer>
    </div>`;
  }
  function deskHTML() {
    const badge = `<a class="pr-store" href="https://apps.apple.com/app/id6838083819?ct=web"><img src="badge-appstore-${LANG === "en" || LANG === "fr" || LANG === "ca" ? LANG : "es"}.svg" width="162" height="54" alt="${L("Descargar en el App Store","Download on the App Store")}"></a>`;
    const legal = LANG === "fr" ? ["fr/confidentialite/", "fr/conditions/"] : LANG === "en" ? ["privacy/", "terms/"] : ["privacidad/", "condiciones/"];
    return `<div class="pr-desk">
      <div class="pr-dk-bg" aria-hidden="true"></div>
      <header class="pr-dk-top"><svg class="lp-wm" viewBox="0 0 331 100" width="122" height="37" role="img" aria-label="Vallik"><g fill="#F6F8FA"><path d="M0,34 H21 L33,78 L45,34 H66 L44,100 H22 Z"/><rect x="117" y="34" width="20" height="66"/><rect x="151" y="0" width="20" height="100"/><rect x="185" y="0" width="20" height="100"/><rect x="219" y="34" width="20" height="66"/><rect x="219" y="4" width="20" height="20"/><rect x="253" y="0" width="20" height="100"/><polygon points="272,67 302,34 328,34 272,93"/></g><circle cx="104" cy="67" r="23" fill="none" stroke="#F6F8FA" stroke-width="20"/><polygon points="288,76 301,63 329,100 302,100" fill="#C8F03C"/></svg>
        <div class="lp-lang pr-dk-lang" role="group" aria-label="Idioma / Language">${["es", "en", "fr", "ca"].map(l => `<button type="button" data-lang="${l}"${l === LANG ? ' aria-pressed="true"' : ""}>${l.toUpperCase()}</button>`).join("")}</div></header>
      <main class="pr-dk-main">
        <div class="pr-dk-l">
          <h1>${L("Que nadie se pierda del grupo","Nobody gets lost from the group")}</h1>
          <p class="pr-dk-sub">${P("sub")}</p>
          <div class="pr-dk-get">${badge}<div class="pr-dk-qr"><img src="web/qr-appstore.svg" width="88" height="88" alt=""><span>${P("qr")}</span></div></div>
          <div class="pr-show pr-dk-show">
            <div class="pr-tabs" role="tablist">${[1, 2, 3, 4].map(i => `<button type="button" role="tab" data-tab="${i - 1}"${i === 1 ? ' aria-selected="true"' : ""}>${P("f" + i + "k")}<i></i></button>`).join("")}</div>
            <div class="pr-txt">${[1, 2, 3, 4].map(i => `<div class="pr-tx${i === 1 ? " on" : ""}"><h3>${P("f" + i + "h")}</h3><p>${P("f" + i + "p")}</p></div>`).join("")}</div>
            <div class="pr-dev pr-dk-dev"><div class="pr-tilt">${["mapa", "ruta", "peter", "dia"].map((n, i) => `<img src="web/app-${n}.webp" width="600" height="1300" alt="${i ? "" : P("alt1")}"${i ? "" : ' class="on"'}>`).join("")}</div><div class="pr-glow"></div>
              <div class="pr-fl" aria-hidden="true"><span style="--d:0" class="a">${P("c1")}</span><span style="--d:1" class="b">${P("c2")}</span><span style="--d:2" class="c">${P("c4")}</span></div></div>
          </div>
        </div>
      </main>
      <footer class="pr-dk-foot"><button type="button" class="pr-dk-lk" data-web>${P("web")}</button><button type="button" class="pr-dk-lk" data-faq>${P("faqb")}</button><a href="${legal[0]}">${L("Privacidad","Privacy")}</a><a href="${legal[1]}">${L("Condiciones","Terms")}</a><a href="mailto:vallik-soporte@googlegroups.com">${L("Contacto","Contact")}</a><small>${L("Apple y App Store son marcas de Apple Inc., registradas en EE. UU. y en otros países.","Apple and App Store are trademarks of Apple Inc., registered in the U.S. and other countries.")}</small></footer>
      <dialog class="pr-dlg"><div class="pr-dlg-in"><div class="pr-dlg-h"><p class="pr-k">${P("qk")}</p><button type="button" data-faq-close aria-label="${P("close")}">✕</button></div>${[1, 2, 3, 4, 5].map(i => `<details><summary>${P("q" + i)}</summary><p>${P("a" + i)}</p></details>`).join("")}</div></dialog>
    </div>`;
  }
  const PROMO_CSS = `
      .pr-desk{display:none}
      @media (min-width:900px) and (min-height:620px){
        .join[data-stage=get]{padding:0!important;overflow:hidden!important}
        .join[data-stage=get] .lp,.join[data-stage=get] .lp-photo{display:none!important}
        .join[data-stage=get] .pr-desk{display:grid;grid-template-rows:auto 1fr auto;position:fixed;inset:0;color:var(--tx);font-family:var(--font);overflow:hidden}
      }
      .pr-dk-bg{position:absolute;inset:0;z-index:-1;background:#0E2A47 url(lp-grupo.jpg) 50% 78%/cover no-repeat;background-image:image-set("lp-grupo.webp" type("image/webp"),"lp-grupo.jpg" type("image/jpeg"))}
      .pr-dk-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(8,27,48,.94) 0%,rgba(8,27,48,.82) 40%,rgba(8,27,48,.35) 70%,rgba(8,27,48,.55) 100%),linear-gradient(180deg,rgba(6,20,36,.55) 0%,rgba(6,20,36,0) 25%,rgba(6,20,36,0) 70%,rgba(6,20,36,.8) 100%)}
      .pr-dk-top{display:flex;justify-content:space-between;align-items:center;width:min(100% - 80px,1200px);margin:0 auto;padding:28px 0 0}
      .pr-dk-lang{position:static!important}.pr-dk-lang button[aria-pressed=true]{background:#F6F8FA;color:#0E2A47}
      .pr-dk-main{width:min(100% - 80px,1200px);margin:0 auto;display:flex;align-items:center;min-height:0}
      .pr-dk-l{width:100%;display:grid;grid-template-columns:minmax(0,1fr) 360px;column-gap:72px;align-items:center}
      .pr-dk-l>h1,.pr-dk-l>p,.pr-dk-get{grid-column:1}
      .pr-dk-l h1{margin:0;font:800 clamp(48px,5.2vw,76px)/.98 var(--font);letter-spacing:-.05em;max-width:620px}
      .pr-dk-sub{margin:18px 0 0;font-size:19px;line-height:28px;color:var(--tx-2);max-width:520px}
      .pr-dk-get{display:flex;align-items:center;gap:22px;margin-top:28px}
      .pr-dk-qr{display:flex;align-items:center;gap:12px;padding:8px 14px 8px 8px;border-radius:16px;background:rgba(246,248,250,.08);box-shadow:inset 0 0 0 1px rgba(246,248,250,.12)}
      .pr-dk-qr img{width:64px;height:64px;padding:6px;border-radius:10px;background:#F6F8FA}
      .pr-dk-qr span{max-width:150px;font-size:13px;line-height:18px;color:var(--tx-2)}
      .pr-dk-show{display:contents}
      .pr-dk-show .pr-tabs{grid-column:1;margin:44px 0 16px;padding:0;overflow:visible}
      .pr-dk-show .pr-txt{grid-column:1;min-height:104px}
      .pr-dk-show .pr-tx h3{font:700 24px/1.2 var(--font);letter-spacing:-.02em;margin:0}
      .pr-dk-show .pr-tx p{margin:8px 0 0;font-size:16px;line-height:24px;color:var(--tx-2);max-width:500px}
      .pr-dk-dev{grid-column:2;grid-row:1 / span 6;width:min(320px,calc((100svh - 220px) * .46))!important;justify-self:center}
      .pr-fl span{position:absolute;padding:11px 16px;border-radius:18px 18px 18px 6px;background:rgba(246,248,250,.94);color:#0E2A47;font:600 15px/1.2 var(--font);white-space:nowrap;box-shadow:0 18px 40px rgba(2,8,16,.35);opacity:0;transform:translateY(12px) scale(.9);animation:prbub .5s cubic-bezier(.2,.8,.2,1.2) forwards,prfloat 5s ease-in-out infinite;animation-delay:calc(var(--d) * .9s + .8s),calc(var(--d) * .9s + 1.3s)}
      .pr-fl .a{left:-120px;top:14%}.pr-fl .b{right:-64px;top:38%;border-radius:18px 18px 6px 18px}.pr-fl .c{left:-90px;top:66%}
      @keyframes prbub{to{opacity:1;transform:none}}
      .pr-dk-foot{display:flex;flex-wrap:wrap;align-items:center;gap:6px 24px;width:min(100% - 80px,1200px);margin:0 auto;padding:0 0 22px}
      .pr-dk-foot a,.pr-dk-lk{all:unset;cursor:pointer;min-height:44px;display:inline-flex;align-items:center;font-size:14px;color:var(--tx)}
      .pr-dk-lk:first-child{font-weight:600}
      .pr-dk-foot small{margin-left:auto;font-size:11px;color:var(--tx-2)}
      .pr-dlg{border:0;padding:0;border-radius:24px;background:#14355A;color:var(--tx);width:min(560px,calc(100vw - 48px));box-shadow:0 40px 120px rgba(2,8,16,.6)}
      .pr-dlg::backdrop{background:rgba(6,20,36,.6);backdrop-filter:blur(6px)}
      .pr-dlg-in{padding:24px 28px 12px}.pr-dlg-h{display:flex;justify-content:space-between;align-items:center}
      .pr-dlg-h button{all:unset;cursor:pointer;width:44px;height:44px;display:grid;place-items:center;border-radius:50%;color:var(--tx-2)}
      .pr-dlg details{border-top:1px solid rgba(246,248,250,.1)}
      .pr-dlg summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;min-height:56px;font:600 17px/1.3 var(--font)}
      .pr-dlg summary::-webkit-details-marker{display:none}.pr-dlg summary::after{content:"+";font-size:22px;color:var(--tx-2);transition:transform .2s}.pr-dlg details[open] summary::after{transform:rotate(45deg)}
      .pr-dlg details p{margin:0 0 18px;font-size:15px;line-height:23px;color:var(--tx-2)}
      @media (prefers-reduced-motion:reduce){.pr-fl span{animation:none;opacity:1;transform:none}}

      .pr-rv{opacity:0;transform:translateY(28px);transition:opacity .7s cubic-bezier(.2,.7,.2,1),transform .7s cubic-bezier(.2,.7,.2,1)}
      .pr-rv.in{opacity:1;transform:none}
      .pr-b{opacity:0;transform:translateY(14px) scale(.96);transition:opacity .45s,transform .45s cubic-bezier(.2,.8,.2,1.2);transition-delay:calc(var(--d) * .55s + .2s)}
      .pr-rv.in .pr-b{opacity:1;transform:none}
      .pr-show{padding:8px 0 56px}
      .pr-tabs{display:flex;gap:6px;overflow-x:auto;scrollbar-width:none;margin:0 -20px 22px;padding:0 20px}.pr-tabs::-webkit-scrollbar{display:none}
      .pr-tabs button{all:unset;cursor:pointer;position:relative;flex:none;min-height:44px;padding:0 16px;display:inline-flex;align-items:center;border-radius:99px;background:rgba(246,248,250,.07);font:600 12px/1 var(--mono);letter-spacing:.1em;text-transform:uppercase;color:var(--tx-2);overflow:hidden;transition:background .25s,color .25s}
      .pr-tabs button[aria-selected=true]{background:#F6F8FA;color:#0E2A47}
      .pr-tabs button i{position:absolute;left:0;bottom:0;height:3px;width:0;background:#C8F03C}
      .pr-tabs button[aria-selected=true] i{animation:prbar var(--dur,5s) linear forwards}
      .pr-show.paused .pr-tabs button i{animation:none;width:0}
      @keyframes prbar{to{width:100%}}
      .pr-stage{display:grid;gap:18px;justify-items:center}
      .pr-txt{display:grid;justify-self:stretch}.pr-tx{grid-area:1/1;opacity:0;transform:translateY(10px);transition:opacity .4s,transform .4s;pointer-events:none}.pr-tx.on{opacity:1;transform:none;pointer-events:auto}
      .pr-tx p{margin:12px 0 0;max-width:440px}
      .pr-dev{position:relative;perspective:1400px;width:min(66vw,270px)}
      .pr-tilt{display:grid;transform:rotateY(var(--ry,-14deg)) rotateX(var(--rx,6deg));transform-style:preserve-3d;transition:transform .5s cubic-bezier(.2,.7,.2,1);animation:prfloat 6s ease-in-out infinite}
      .pr-tilt img{grid-area:1/1;width:100%;height:auto;opacity:0;transform:translateZ(0) scale(.97);transition:opacity .5s,transform .6s cubic-bezier(.2,.7,.2,1);filter:drop-shadow(-24px 30px 40px rgba(2,8,16,.55))}
      .pr-tilt img.on{opacity:1;transform:translateZ(30px) scale(1)}
      .pr-glow{position:absolute;inset:18% -20% 6%;z-index:-1;background:radial-gradient(closest-side,rgba(200,240,60,.18),rgba(200,240,60,0));filter:blur(10px)}
      @keyframes prfloat{0%,100%{translate:0 0}50%{translate:0 -10px}}
      .lp-hero-ph{transform-origin:50% 50%}
      .pr-band{height:min(56vw,420px)!important}
      .pr-band img{transform:scale(var(--bs,1.12));will-change:transform}
      @media (prefers-reduced-motion:reduce){.pr-rv,.pr-b,.pr-tx,.pr-tilt img{transition:none!important;opacity:1;transform:none}.pr-tilt{animation:none}.pr-tabs button i{animation:none!important}}
      @media (min-width:900px){
        .pr-show{padding:24px 0 96px}
        .pr-stage{grid-template-columns:1fr 1fr;align-items:center;justify-items:start;gap:60px}
        .pr-dev{width:300px;justify-self:center}
        .pr-tabs{margin:0 0 36px;padding:0}
      }

      .lp-promo{display:none;width:100vw;margin:24px 0 0 calc(50% - 50vw);color:var(--tx);font-family:var(--font)}
      .join[data-stage=get] .lp-promo{display:block}.join[data-stage=get] .lp-more{display:none}
      .join[data-stage=get]{overflow-x:hidden;background:#0E2A47}
      .pr-in{width:min(100% - 40px,1080px);margin:0 auto}
      .pr-k{margin:0 0 14px;font:600 12px/1 var(--mono);letter-spacing:.14em;text-transform:uppercase;color:var(--tx-2)}
      .lp-promo h2{margin:0;font:800 clamp(32px,5vw,56px)/1.02 var(--font);letter-spacing:-.045em}
      .lp-promo h3{margin:0;font:800 clamp(30px,4vw,46px)/1.04 var(--font);letter-spacing:-.04em}
      .lp-promo p{font-size:17px;line-height:26px;color:var(--tx-2)}
      .pr-more{display:flex;justify-content:center;margin-top:auto;padding-top:8px}.pr-more a{display:inline-flex;align-items:center;gap:8px;min-height:44px;color:var(--tx-2);font:600 12px/1 var(--mono);letter-spacing:.12em;text-transform:uppercase;text-decoration:none}
      .pr-prob{padding:32px 0 48px;border-top:1px solid rgba(246,248,250,.08)}
      .pr-prob .pr-in{display:grid;gap:36px}
      .pr-pt p:last-child{margin:18px 0 0;max-width:480px}
      .pr-chat{display:grid;gap:12px;max-width:420px}
      .pr-b{display:grid;justify-items:start;gap:6px}.pr-b.r{justify-items:end}
      .pr-b small{font:500 11px/1 var(--mono);letter-spacing:.1em;color:var(--tx-2)}
      .pr-b span{padding:13px 18px;border-radius:20px 20px 20px 6px;background:rgba(246,248,250,.08);box-shadow:inset 0 0 0 1px rgba(246,248,250,.1);font-size:17px}
      .pr-b.r span{border-radius:20px 20px 6px 20px;background:rgba(246,248,250,.14)}
      .pr-feats{display:grid;gap:88px;padding:24px 0 80px}
      .pr-f{display:grid;gap:28px;justify-items:center}
      .pr-ft{justify-self:stretch}.pr-ft p:last-child{margin:16px 0 0;max-width:440px}
      .pr-ph{width:min(76vw,300px);height:auto;filter:drop-shadow(0 30px 60px rgba(2,8,16,.5))}
      .pr-x{padding:0 0 56px}.pr-x ul{list-style:none;margin:0;padding:0;display:grid;gap:0}
      .pr-x li{display:grid;gap:6px;padding:20px 0;border-top:1px solid rgba(246,248,250,.1)}.pr-x li:last-child{border-bottom:1px solid rgba(246,248,250,.1)}
      .pr-x b{font:700 20px/1.2 var(--font);letter-spacing:-.02em}.pr-x span{color:var(--tx-2);font-size:16px;line-height:24px}
      .pr-band{position:relative;height:min(78vw,640px);overflow:hidden}
      .pr-band img{width:100%;height:100%;object-fit:cover;object-position:50% 45%;display:block}
      .pr-band::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(14,42,71,0) 40%,rgba(8,27,48,.82) 100%)}
      .pr-band p{position:absolute;left:max(20px,calc(50% - 540px));right:20px;bottom:28px;margin:0;z-index:1;font:800 clamp(28px,4.4vw,52px)/1.04 var(--font)!important;letter-spacing:-.045em;color:var(--tx)!important;max-width:720px}
      .pr-steps{padding:56px 0 48px}.pr-steps ol{list-style:none;margin:32px 0 0;padding:0;display:grid;gap:14px}
      .pr-steps li{display:flex;gap:16px;align-items:baseline;padding:16px 18px;border-radius:22px;background:rgba(246,248,250,.06);font:600 19px/1.35 var(--font);letter-spacing:-.015em}
      .pr-steps li span{font:500 13px/1 var(--mono);color:var(--tx-2);letter-spacing:.1em}
      .pr-faq{padding:0 0 56px}
      .pr-faq details{border-top:1px solid rgba(246,248,250,.1)}.pr-faq details:last-child{border-bottom:1px solid rgba(246,248,250,.1)}
      .pr-faq summary{list-style:none;cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;min-height:64px;font:600 18px/1.3 var(--font);letter-spacing:-.01em}
      .pr-faq summary::-webkit-details-marker{display:none}
      .pr-faq summary::after{content:"+";font:400 26px/1 var(--font);color:var(--tx-2);transition:transform .2s}.pr-faq details[open] summary::after{transform:rotate(45deg)}
      .pr-faq details p{margin:0 0 22px;max-width:640px}
      .pr-end{position:relative;min-height:min(110vw,560px);display:flex;align-items:flex-start;overflow:hidden}
      .pr-end>img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:50% 52%}
      .pr-end::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,#0E2A47 0%,rgba(14,42,71,0) 30%)}
      .pr-endt{position:relative;z-index:1;width:min(100% - 40px,1080px);margin:0 auto;padding-top:56px;display:grid;justify-items:start;gap:18px}
      .pr-endt h2{font-size:clamp(44px,7vw,88px)!important}
      .pr-store img{display:block}.pr-endt .lp-skip{justify-self:start;width:auto;padding-left:0;padding-right:0}
      .pr-foot{padding:32px 0 calc(var(--sab,0px) + 36px);display:grid;gap:14px}
      .pr-foot nav{display:flex;gap:22px;flex-wrap:wrap}.pr-foot a{color:var(--tx);font-size:15px;text-decoration:none;min-height:44px;display:inline-flex;align-items:center}
      .pr-foot small{color:var(--tx-2);font-size:12px;line-height:18px}
      @media (min-width:900px){
        .pr-prob{padding:48px 0 72px}.pr-prob .pr-in{grid-template-columns:1.1fr .9fr;align-items:center;gap:80px}
        .pr-feats{gap:120px;padding:40px 0 120px}
        .pr-f{grid-template-columns:1fr 1fr;align-items:center;justify-items:start;gap:80px}
        .pr-f .pr-ph{width:320px;justify-self:center}
        .pr-f.flip .pr-ft{order:2}
        .pr-x{padding-bottom:72px}.pr-x ul{grid-template-columns:repeat(3,1fr);gap:40px}.pr-x li,.pr-x li:last-child{border-bottom:0}
        .pr-steps{padding:72px 0}.pr-steps ol{grid-template-columns:repeat(3,1fr)}.pr-steps li{flex-direction:column;gap:20px;min-height:110px}
        .pr-faq{padding-bottom:72px;display:grid;grid-template-columns:280px 1fr;column-gap:80px}.pr-faq .pr-k{grid-row:span 5}
        .join[data-stage=get] .lp{width:min(100%,1080px)!important}
        .join[data-stage=get] .lp-hero h1{font-size:68px!important;line-height:66px!important;letter-spacing:-.05em}
        .join[data-stage=get] .lp-screen{position:relative}
        .join[data-stage=get] .lp-screen>*{max-width:520px}
        .join[data-stage=get] .lp-get{justify-items:start;text-align:left}.join[data-stage=get] .lp-get .lp-skip{justify-self:start;padding-left:0;padding-right:0}.join[data-stage=get] .lp-store{justify-self:start;margin:0}.join[data-stage=get] .pr-more{justify-content:flex-start}
        .join[data-stage=get] .lp-photo{height:100svh}
        .join[data-stage=get] .lp-photo{background-position:50% 78%}
        .join[data-stage=get] .lp-photo::after{background:linear-gradient(90deg,rgba(8,27,48,.86) 0%,rgba(8,27,48,.5) 38%,rgba(8,27,48,0) 62%),linear-gradient(180deg,rgba(6,20,36,.6) 0%,rgba(6,20,36,0) 20%,rgba(14,42,71,0) 70%,#0E2A47 100%)}
        .join[data-stage=get] .lp-hero-ph{display:block}
      }
      .lp-hero-ph{display:none;position:absolute;right:40px;top:50%;transform:translateY(-46%);width:320px;height:auto;max-width:none!important;filter:drop-shadow(0 40px 80px rgba(2,8,16,.6))}
`;
  function askJoin() {
    const note = LS.get("pistea.aviso") || ""; LS.del("pistea.aviso");
    return new Promise(resolve => {
      const el = document.createElement("div");
      // Primero la cuenta (Apple o Google, o seguir sin cuenta); después crear grupo o entrar con código.
      const withAuth = canLogin("google") || canLogin("apple");
      // En la web, primero la app: en iPhone y en el ordenador se ofrece descargarla; en Android (sin app todavía) se sigue en el navegador.
      const ANDROID = /android/i.test(navigator.userAgent);
      const getApp = !NATIVE_UA && !ANDROID && LS.get("vallik.web") !== "1";
      const firstStage = withAuth ? "auth" : code ? "form" : "pick";
      el.className = "join"; el.dataset.stage = getApp ? "get" : firstStage;
      el.innerHTML = `
        ${NATIVE_UA || code ? "" : deskHTML()}
        <div class="lp-photo" aria-hidden="true"></div>
        <div class="lp" data-lang="${LANG}">
        <div class="lp-lang" role="group" aria-label="Idioma / Language"><button type="button" data-lang="es">ES</button><button type="button" data-lang="en">EN</button><button type="button" data-lang="fr">FR</button><button type="button" data-lang="ca">CA</button></div>
        <div class="lp-screen">
        ${NATIVE_UA || code ? "" : `<img class="lp-hero-ph" src="web/app-mapa.webp" width="600" height="1300" alt="${P("alt1")}">`}
        <header class="lp-hero">
          <div class="lp-logo"><svg class="lp-mark" width="48" height="48" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22.5" fill="#14355A"/><mask id="kcutL" maskUnits="userSpaceOnUse" x="0" y="0" width="110" height="100"><rect width="110" height="100" fill="#fff"/><path d="M8,40 C30,44 46,58 60,66 C72,73 84,74 96,72" fill="none" stroke="#000" stroke-width="5.5" stroke-linecap="round"/></mask><g mask="url(#kcutL)" transform="translate(-5 0)"><rect x="27" y="16" width="17" height="68" fill="#F6F8FA"/><polygon points="43,58 67,32 87,32 43,79" fill="#F6F8FA"/><polygon points="56,65.114 66,54.432 88,84 67,84" fill="#C8F03C"/></g></svg><svg class="lp-wm" viewBox="0 0 331 100" width="122" height="37" role="img" aria-label="Vallik"><g fill="#F6F8FA"><path d="M0,34 H21 L33,78 L45,34 H66 L44,100 H22 Z"/><rect x="117" y="34" width="20" height="66"/><rect x="151" y="0" width="20" height="100"/><rect x="185" y="0" width="20" height="100"/><rect x="219" y="34" width="20" height="66"/><rect x="219" y="4" width="20" height="20"/><rect x="253" y="0" width="20" height="100"/><polygon points="272,67 302,34 328,34 272,93"/></g><circle cx="104" cy="67" r="23" fill="none" stroke="#F6F8FA" stroke-width="20"/><polygon points="288,76 301,63 329,100 302,100" fill="#C8F03C"/></svg></div>
          <h1>${L("Que nadie se pierda del grupo","Nobody gets lost from the group")}</h1>
          
        </header>
        ${code ? "" : `<p class="lp-msg" role="status"${note ? "" : " hidden"}>${note.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</p>`}
        <div class="lp-get">
          ${code ? `<p class="lp-code">${L("Te han invitado a un grupo. Descarga Vallik y entra con este código:","You've been invited to a group. Download Vallik and join with this code:")}<span><b>${code}</b><button type="button" class="lp-copy" data-copy="${code}">${L("Copiar","Copy")}</button></span></p>` : `<p class="lp-sub">${P("sub")}</p>`}
          <a class="lp-store" href="https://apps.apple.com/app/id6838083819"><img src="badge-appstore-${LANG === "en" || LANG === "fr" || LANG === "ca" ? LANG : "es"}.svg" width="162" height="54" alt="${L("Descargar en el App Store","Download on the App Store")}"></a>
          <button class="lp-skip" type="button" data-web>${L("Seguir en el navegador","Continue in the browser")}</button>
          <p class="lp-tm">${L("Apple y App Store son marcas de Apple Inc., registradas en EE. UU. y en otros países.","Apple and App Store are trademarks of Apple Inc., registered in the U.S. and other countries.")}</p>
          ${NATIVE_UA || code ? "" : `<div class="pr-more"><a href="#promo" data-more>${P("more")} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M6 13l6 6 6-6"/></svg></a></div>`}
        </div>
        <div class="lp-who" hidden></div>
        ${code ? "" : `<div class="lp-pick">
          <button class="btn wide" type="button" data-pick="new">${L("Crear un grupo","Create a group")}</button>
          <button class="btn ghost wide" type="button" data-pick="join">${L("Tengo un código","I have a code")}</button>
          ${canLogin("google") || canLogin("apple") ? `<button class="lp-back" type="button" data-to-auth>${L("Volver","Back")}</button>` : ""}
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
          <button class="lp-skip" type="button" data-skip>${L("Seguir sin cuenta","Continue without an account")}</button>
        </div>` : ""}
        <p class="lp-legal">${L("Al continuar aceptas las","By continuing you accept the")} <a href="${LANG === "fr" ? "fr/conditions/" : LANG === "en" ? "terms/" : "condiciones/"}">${L("Condiciones","Terms")}</a> ${L("y la","and the")} <a href="${LANG === "fr" ? "fr/confidentialite/" : LANG === "en" ? "privacy/" : "privacidad/"}">${L("Política de privacidad","Privacy policy")}</a>.</p>
        </div>
        ${NATIVE_UA || code ? "" : promoHTML()}
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
      st.textContent = PROMO_CSS + `.join{position:fixed;inset:0;z-index:30;display:block;padding:calc(var(--sat,0px) + 28px) 16px calc(var(--sab,0px) + 28px);overflow-y:auto;-webkit-overflow-scrolling:touch;background:rgba(14,42,71,.88);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
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
      .lp-lang{top:calc(var(--sat,0px) + 6px)!important;right:16px!important}.lp-lang button{min-width:40px!important;font-size:11px!important}
      .join[data-stage=pick] .join-card,.join[data-stage=pick] .lp-inv{display:none}
      .join[data-stage=auth] .lp-pick,.join[data-stage=auth] .join-card{display:none}
      .lp-get{display:grid;gap:10px}.join:not([data-stage=get]) .lp-get{display:none}
      .join[data-stage=get] .lp-pick,.join[data-stage=get] .join-card,.join[data-stage=get] .lp-inv,.join[data-stage=get] .lp-auth,.join[data-stage=get] .lp-msg{display:none}
      .lp-store{justify-self:center;display:block;line-height:0;border-radius:12px}.lp-store img{display:block;height:54px;width:auto}
      .lp-tm{margin:0;text-align:center;color:var(--tx-3);font-size:11px;line-height:15px}
      .join[data-stage=get] .lp-legal{display:none}
      .lp-sub{margin:0 0 4px;color:var(--tx-2);font-size:16px;line-height:22px}
      .lp-code{margin:0 0 4px;display:grid;gap:10px;color:var(--tx-2);font-size:15px;line-height:21px}
      .lp-code span{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:10px 10px 10px 16px;border-radius:16px;background:rgba(14,42,71,.6);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1px rgba(200,240,60,.35)}
      .lp-code b{font:600 20px/1 var(--mono);letter-spacing:.06em;color:var(--tx)}
      .lp-copy{all:unset;cursor:pointer;padding:10px 14px;border-radius:12px;background:rgba(255,255,255,.08);color:var(--tx);font:600 14px/1 var(--font)}
      .join:not([data-stage=auth]) .lp-auth{display:none}
      .lp-skip{all:unset;cursor:pointer;justify-self:center;min-height:44px;padding:0 14px;color:var(--tx-2);font:500 15px/44px var(--font)}
      .lp-who{display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;background:rgba(14,42,71,.6);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);font-size:14px;color:var(--tx-2)}.lp-who[hidden]{display:none}.lp-who b{color:var(--tx);font-weight:600}
      .join[data-stage=auth] .lp-who{display:none}
      .join[data-stage=form] .lp-pick{display:none}
      .lp-pick{display:grid;gap:10px}
      .lp-msg[hidden]{display:none}.lp-msg{margin:0;padding:12px 14px;border-radius:14px;background:rgba(14,42,71,.6);-webkit-backdrop-filter:blur(10px);backdrop-filter:blur(10px);box-shadow:inset 0 0 0 1px rgba(200,240,60,.35);font-size:15px}
      .lp-pick .btn,.lp-auth .btn{min-height:54px}
      .join-card{background:none!important;padding:0!important;box-shadow:none!important;border:0!important;-webkit-backdrop-filter:none!important;backdrop-filter:none!important}
      .join-card h2{font-size:24px!important}
      .lp-back{all:unset;cursor:pointer;justify-self:center;min-height:44px;padding:0 14px;color:var(--tx-2);font:500 15px/44px var(--font)}
      .lp-apple{position:relative;background:#fff!important;color:#000!important;font-weight:500;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",sans-serif!important;letter-spacing:0}
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
      // En el primer paso (elegir) no se ve la tarjeta del formulario: los avisos van arriba de los botones.
      const say = t => { const m = (el.dataset.stage === "pick" || el.dataset.stage === "auth" || el.dataset.stage === "get") && el.querySelector(".lp-msg"); const box = m || noteEl; box.textContent = t || ""; box.hidden = !t; };
      let busyBtn = null;
      const busy = (on, who) => { btns.forEach(b => { b.disabled = on; b.removeAttribute("aria-busy"); }); busyBtn = on ? (who || null) : null; if (busyBtn) busyBtn.setAttribute("aria-busy", "true"); };
      const sub = f.querySelector("[type=submit]");
      const sw = el.querySelector("[data-swap]");
      if (sw) sw.addEventListener("click", () => { f.dataset.mode = f.dataset.mode === "new" ? "join" : "new"; say(""); (f.dataset.mode === "join" ? f.c : f.n).focus(); });
      if (code) say(note);
      // Primero se elige (crear o entrar con código); después, el nombre. Con enlace de invitación se va directo al nombre.
      const msg = el.querySelector(".lp-msg");
      const stage = (st2, mode) => { el.dataset.stage = st2; if (mode) f.dataset.mode = mode; if (msg) msg.hidden = true; say(""); if (st2 === "form") f.n.focus(); el.scrollTop = 0; };
      el.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => stage("form", b.dataset.pick)));
      const bk = el.querySelector("[data-back]"); if (bk) bk.addEventListener("click", () => stage("pick"));
      if (code && el.dataset.stage === "form") f.n.focus({ preventScroll: true });
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
      // Quién entró: una línea discreta encima de crear o entrar con código.
      const showWho = (k, email) => { const w = el.querySelector(".lp-who"); if (!w) return; w.innerHTML = `${k === "apple" ? A_ICON : G_ICON}<span><b>${L("Has entrado con","Signed in with")} ${k === "apple" ? "Apple" : "Google"}</b>${email ? " · " + String(email).replace(/</g, "&lt;") : ""}</span>`; w.hidden = false; };
      const next = () => stage(code ? "form" : "pick", code ? "invite" : null);
      const sk = el.querySelector("[data-skip]"); if (sk) sk.addEventListener("click", next);
      el.querySelectorAll("[data-web]").forEach(wb => wb.addEventListener("click", () => { LS.set("vallik.web", "1"); stage(firstStage, code ? "invite" : null); }));
      (function promoFx() {
        const pr = el.querySelector(".lp-promo"); if (!pr) return;
        const dlg = el.querySelector(".pr-dlg");
        el.querySelectorAll("[data-faq]").forEach(b => b.addEventListener("click", () => { try { dlg.showModal(); } catch (e) { dlg.setAttribute("open", ""); } }));
        const dc = el.querySelector("[data-faq-close]"); if (dc) dc.addEventListener("click", () => dlg.close());
        if (dlg) dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });
        const RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
        const io = "IntersectionObserver" in window ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { root: el, threshold: .18 }) : null;
        pr.querySelectorAll(".pr-rv").forEach(n => io ? io.observe(n) : n.classList.add("in"));
        const RM2 = RM;
        const shows = [...el.querySelectorAll(".pr-show")];
        const tilts = [];
        shows.forEach(sh => {
          const tabs = [...sh.querySelectorAll("[data-tab]")], txs = [...sh.querySelectorAll(".pr-tx")], ims = [...sh.querySelectorAll(".pr-tilt img")];
          let cur = 0, timer = null; const DUR = 5000;
          const go = i => { cur = (i + tabs.length) % tabs.length; tabs.forEach((t, k) => t.setAttribute("aria-selected", k === cur ? "true" : "false")); txs.forEach((t, k) => t.classList.toggle("on", k === cur)); ims.forEach((t, k) => t.classList.toggle("on", k === cur)); };
          const auto = () => { clearInterval(timer); if (RM2) return; timer = setInterval(() => go(cur + 1), DUR); };
          sh.style.setProperty("--dur", DUR / 1000 + "s");
          tabs.forEach((t, k) => t.addEventListener("click", () => { go(k); auto(); }));
          if (sh.classList.contains("pr-dk-show")) auto();
          else { const vis = io ? new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) auto(); else clearInterval(timer); }), { root: el, threshold: .3 }) : null; if (vis) vis.observe(sh); else auto(); }
          tilts.push(sh.querySelector(".pr-tilt"));
        });
        if (RM) return;
        const hero = el.querySelector(".lp-hero-ph"), sh = shows.find(x => !x.classList.contains("pr-dk-show")), tilt = sh && sh.querySelector(".pr-tilt");
        const fine = window.matchMedia && matchMedia("(pointer:fine)").matches;
        if (fine) el.addEventListener("pointermove", ev => { const x = ev.clientX / innerWidth - .5, y = ev.clientY / innerHeight - .5; tilts.forEach(t => { if (!t) return; t.style.setProperty("--ry", (-14 + x * 18).toFixed(1) + "deg"); t.style.setProperty("--rx", (6 - y * 10).toFixed(1) + "deg"); }); if (hero) hero.style.transform = `translateY(-46%) perspective(1400px) rotateY(${(-10 + x * 14).toFixed(1)}deg) rotateX(${(4 - y * 8).toFixed(1)}deg)`; }, { passive: true });
        const band = pr.querySelector(".pr-band img"); let tk = false;
        el.addEventListener("scroll", () => { if (tk) return; tk = true; requestAnimationFrame(() => { tk = false;
          if (band) { const r = band.parentNode.getBoundingClientRect(), p = Math.min(1, Math.max(0, 1 - (r.top + r.height) / (innerHeight + r.height))); band.style.setProperty("--bs", (1.18 - p * .16).toFixed(3)); band.style.translate = `0 ${((p - .5) * 40).toFixed(1)}px`; }
          if (!fine && tilt) { const r = sh.getBoundingClientRect(), q = (r.top + r.height / 2) / innerHeight - .5; tilt.style.setProperty("--ry", (-14 + q * 20).toFixed(1) + "deg"); }
        }); }, { passive: true });
        if (hero) hero.style.transform = "translateY(-46%) perspective(1400px) rotateY(-10deg) rotateX(4deg)";
      })();
      const mo = el.querySelector("[data-more]"); if (mo) mo.addEventListener("click", ev => { ev.preventDefault(); const t = el.querySelector(".lp-promo"); if (t) el.scrollTo({ top: t.offsetTop - 8, behavior: "smooth" }); });
      const cp = el.querySelector("[data-copy]"); if (cp) cp.addEventListener("click", () => { try { navigator.clipboard.writeText(location.origin + "/#g=" + cp.dataset.copy); cp.textContent = L("Copiado","Copied"); } catch (e) {} });
      const ta = el.querySelector("[data-to-auth]"); if (ta) ta.addEventListener("click", () => { const w = el.querySelector(".lp-who"); if (w) w.hidden = true; stage("auth"); });
      // Si ya había entrado con Apple o Google en este móvil, no se vuelve a pedir.
      if (withAuth) try { const off = firebase.auth().onAuthStateChanged(u => { off(); const pd = u && !u.isAnonymous && (u.providerData || [])[0]; if (!pd || el.dataset.stage !== "auth") return; showWho(pd.providerId === "apple.com" ? "apple" : "google", pd.email || u.email); next(); }); } catch (e) {}
      el.querySelectorAll("[data-login]").forEach(b => b.addEventListener("click", async () => {
        const k = b.dataset.login; busy(true, b); say("");
        try {
          const u = await login(k, true);
          LS.set("vallik.lastLogin", k);
          const nm = (u.displayName || "").split(" ")[0];
          if (nm && !f.n.value.trim()) f.n.value = nm.slice(0, 24);
          showWho(k, u.email);
          next();
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
  const WEB_VER = "v54";
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
    window.vReport = er => report((er && er.message) || String(er), "diag");
    // Errores de antes de que cargara este archivo (por ejemplo, native.js): los guarda index.html.
    // Se envían cuando ya está todo definido (report usa NATIVE_UA, que se declara más abajo).
    setTimeout(() => (window.__earlyErr || []).forEach(x => { try { console.error("[vallik] error previo:", x.m, x.s); report(x.m, x.s); } catch (e) {} }), 0);
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
  if (NATIVE_UA && !NATIVE_LOGIN() && window.vReport) vReport("sin-puente-al-arrancar " + typeof window.PisteaNative + " " + typeof window.Capacitor);
  // En la app los botones salen siempre: si el puente nativo aún no está, se comprueba al tocar.
  const canLogin = k => NATIVE_UA ? (k === "apple" || k === "google") : !!LOGIN[k];
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
    if (c === "vallik/sin-puente") return T_("No se pudo abrir el inicio de sesión. Cierra la app del todo y vuelve a abrirla.", "Couldn't open sign-in. Close the app completely and open it again.", "Impossible d'ouvrir la connexion. Ferme complètement l'app et rouvre-la.", "No s'ha pogut obrir l'inici de sessió. Tanca l'app del tot i torna-la a obrir.");
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
    if (NATIVE_UA && !NATIVE_LOGIN()) {
      try { window.vReport && vReport(new Error("login-sin-puente " + typeof window.PisteaNative + " " + typeof window.Capacitor)); } catch (e) {}
      const er = new Error("sin-puente"); er.code = "vallik/sin-puente"; throw er;
    }
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
