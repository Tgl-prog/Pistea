/* Configuración de Firebase para Pistea.
 * Estos valores no son secretos: la seguridad la dan las reglas de firestore.rules.
 */
window.PISTEA_FIREBASE = {
  apiKey: "AIzaSyDIKhknu_nWMjFPoxwtdASuBSbikHIZT54",
  authDomain: "pistea-94bf0.firebaseapp.com",
  projectId: "pistea-94bf0",
  storageBucket: "pistea-94bf0.firebasestorage.app",
  messagingSenderId: "113462040978",
  appId: "1:113462040978:web:ea25bc8e2a6ea72462094b"
};

/* Peter, el guía con IA: dirección de su servidor (ver peter/README.md). Vacío = Peter avisa de que no está conectado. */
window.PISTEA_PETER = { url: "https://pistea-peter.vercel.app/api/peter" };

/* Iniciar sesión con cuenta (además del acceso solo con nombre). Cada opción hay que activarla
   antes en Firebase › Authentication › Sign-in method, y añadir vallik.app en Settings › Authorized domains. */
window.PISTEA_LOGIN = { google: true, apple: false };
