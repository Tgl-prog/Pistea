// Copia la web de Pistea (raíz del repo) a www/, que es lo que va dentro de la app.
// La web sigue siendo la fuente única: se edita una vez y vale para GitHub Pages y para la app.
import { cpSync, rmSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { join, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const raiz = join(app, "..");
const www = join(app, "www");
const fuera = new Set(["app", "node_modules", ".git", ".github", "sw.js"]);   // sin service worker dentro de la app
const sirve = new Set([".html", ".js", ".json", ".jpg", ".png", ".svg", ".woff2", ".webmanifest"]);

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
let n = 0;
for (const f of readdirSync(raiz)) {
  if (fuera.has(f) || f.startsWith(".")) continue;
  const p = join(raiz, f);
  if (statSync(p).isDirectory() || !sirve.has(extname(f))) continue;
  cpSync(p, join(www, f)); n++;
}
console.log(`Web copiada a www/ (${n} archivos)`);
