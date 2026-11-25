// Copia la web de Pistea (raíz del repo) a www/, que es lo que va dentro de la app.
// La web sigue siendo la fuente única: se edita una vez y vale para GitHub Pages y para la app.
import { cpSync, rmSync, mkdirSync, readdirSync, statSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const raiz = join(app, "..");
const www = join(app, "www");
const fuera = new Set(["app", "node_modules", ".git", ".github", "sw.js", "relief.jpg", "version.json"]);   // version.json se lee de vallik.app, no va dentro   // sin service worker; el relieve va en WebP (iOS 15 lo lee)
const sirve = new Set([".html", ".js", ".json", ".jpg", ".png", ".webp", ".svg", ".woff2", ".webmanifest"]);
const carpetas = ["privacidad", "privacy", "condiciones", "terms", "fr"];   // páginas legales, enlazadas desde la app

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
let n = 0;
for (const f of readdirSync(raiz)) {
  if (fuera.has(f) || f.startsWith(".")) continue;
  const p = join(raiz, f);
  if (statSync(p).isDirectory() || !sirve.has(extname(f))) continue;
  cpSync(p, join(www, f)); n++;
}
for (const d of carpetas) { cpSync(join(raiz, d), join(www, d), { recursive: true }); n++; }
console.log(`Web copiada a www/ (${n} archivos y carpetas)`);

// Número de compilación dentro de la app, para el aviso de actualización obligatoria (version.json).
// El workflow lo pasa en VALLIK_BUILD; en local queda 0 y el aviso no se usa.
const build = Number(process.env.VALLIK_BUILD || 0), version = String(process.env.VALLIK_VERSION || "");
writeFileSync(join(www, "app-build.js"), `window.VALLIK_BUILD = ${build}; window.VALLIK_VERSION = ${JSON.stringify(version)};\n`);
const idx = join(www, "index.html"), html = readFileSync(idx, "utf8");
if (!html.includes('<script src="native.js"></script>')) throw new Error("index.html sin native.js: no puedo añadir app-build.js");
// capacitor.js (de @capacitor/core) aporta Capacitor.registerPlugin: el puente nativo de iOS no lo trae
// y sin él native.js no puede hablar con ningún plugin (GPS, App Check, inicio de sesión).
const core = join(app, "node_modules/@capacitor/core/dist/capacitor.js");
if (!existsSync(core)) throw new Error("Falta @capacitor/core/dist/capacitor.js: ejecuta npm ci en app/");
cpSync(core, join(www, "capacitor.js"));
writeFileSync(idx, html.replace('<script src="native.js"></script>', '<script src="app-build.js"></script>\n<script src="capacitor.js"></script>\n<script src="native.js"></script>'));
console.log(`Compilación ${build || "(local)"} anotada en app-build.js`);
