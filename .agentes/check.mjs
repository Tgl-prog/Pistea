// Comprobaciones de Vallik antes de publicar. Sin dependencias: solo Node 20 o posterior.
//
//   node .agentes/check.mjs            todo lo que no necesita red ni emulador
//   node .agentes/check.mjs --base main   además compara con esa rama (VERSION del service worker)
//
// Sale con código 1 si algo falla. Lo ejecutan los agentes antes de cada entrega y GitHub Actions en cada PR.
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join, dirname, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import vm from "node:vm";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const base = args.includes("--base") ? args[args.indexOf("--base") + 1] : null;
const fallos = [], avisos = [];
const mal = (m) => fallos.push(m), ojo = (m) => avisos.push(m);
const leer = (p) => readFileSync(join(raiz, p), "utf8");
const FUERA = new Set(["node_modules", ".git", "www", "ios", "plugins", ".www_roto_1795627353"]);

function archivos(dir = "", out = []) {
  for (const f of readdirSync(join(raiz, dir))) {
    if (FUERA.has(f) || f.startsWith(".www_roto")) continue;
    const p = join(dir, f), st = statSync(join(raiz, p));
    if (st.isDirectory()) { if (!f.startsWith(".") || f === ".agentes" || f === ".github") archivos(p, out); }
    else out.push(p);
  }
  return out;
}
const todos = archivos();

// 1. JavaScript sin errores de sintaxis (archivos y scripts dentro de los HTML)
for (const f of todos.filter((f) => /\.(js|mjs)$/.test(f) && !/\.min\.js$|-compat\.js$/.test(f))) {
  try { execFileSync(process.execPath, ["--check", join(raiz, f)], { stdio: "pipe" }); }
  catch (e) { mal(`JS con error de sintaxis: ${f}\n${String(e.stderr).split("\n").slice(0, 4).join("\n")}`); }
}
for (const f of todos.filter((f) => f.endsWith(".html"))) {
  const html = leer(f);
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/g; let m, n = 0;
  while ((m = re.exec(html))) {
    const attrs = m[1] || "", code = m[2];
    if (/\ssrc=/.test(attrs) || !code.trim()) continue;
    n++;
    const linea = html.slice(0, m.index).split("\n").length;
    if (/application\/ld\+json/.test(attrs)) { try { JSON.parse(code); } catch (e) { mal(`JSON-LD roto en ${f}:${linea}: ${e.message}`); } continue; }
    if (/type=["']?module/.test(attrs)) continue;
    try { new vm.Script(code, { filename: `${f}:${linea}` }); } catch (e) { mal(`Script con error de sintaxis en ${f} (bloque que empieza en la línea ${linea}): ${e.message}`); }
  }
}

// 2. JSON válidos
for (const f of todos.filter((f) => /\.(json|webmanifest)$/.test(f) && !f.includes("package-lock"))) {
  try { JSON.parse(leer(f)); } catch (e) { mal(`JSON roto: ${f}: ${e.message}`); }
}

// 3. Cuatro idiomas: cada texto con EN? tiene que llevar catalán y francés: EN?((CA?"…":FR?"…":"…")):"…"
{
  const html = leer("index.html");
  const lin = (i) => html.slice(0, i).split("\n").length;
  const re = /\bEN\s*\?\s*/g; let m;
  while ((m = re.exec(html))) {
    const resto = html.slice(m.index + m[0].length, m.index + m[0].length + 8);
    if (!/^\(*\s*(CA|FR)\s*\?/.test(resto)) {
      // EN?"x":"y" sin CA?/FR?: catalán y francés reciben el texto en inglés. Vale solo si la palabra es igual (Bar, Restaurant, pistes).
      const trozo = html.slice(m.index, m.index + 60).split("\n")[0];
      if (/^["'`]/.test(resto) && !/^EN\s*\?\s*(["'`])(.*?)\1\s*:\s*\1\2\1/.test(trozo)) ojo(`index.html:${lin(m.index)}: ${trozo.slice(0, 50)}… sin CA?/FR?: confirma que vale igual en catalán y francés`);
    }
  }
  const reCA = /\bCA\s*\?/g; const pos = []; while ((m = reCA.exec(html))) pos.push(m.index);
  pos.forEach((p, i) => {
    const hasta = i + 1 < pos.length ? pos[i + 1] : html.length;
    if (!/:\s*FR\s*\?/.test(html.slice(p, hasta))) ojo(`index.html:${lin(p)}: CA? sin FR? antes del siguiente texto; comprueba que el francés está`);
  });
}

// 4. Service worker: todo lo de CORE existe; si cambian archivos de CORE respecto a la rama base, VERSION tiene que cambiar
const sw = leer("sw.js");
const core = JSON.parse((sw.match(/const CORE = (\[[\s\S]*?\]);/) || [])[1].replace(/'/g, '"').replace(/,\s*\]/, "]"));
for (const c of core) if (c !== "./" && !existsSync(join(raiz, c))) mal(`sw.js: CORE incluye ${c}, que no existe`);
const version = (sw.match(/const VERSION = "([^"]+)"/) || [])[1];
if (!version) mal("sw.js: no encuentro VERSION");
if (base) {
  try {
    const cambiados = execFileSync("git", ["diff", "--name-only", `${base}...HEAD`], { cwd: raiz }).toString().trim().split("\n").filter(Boolean);
    const vBase = (execFileSync("git", ["show", `${base}:sw.js`], { cwd: raiz }).toString().match(/const VERSION = "([^"]+)"/) || [])[1];
    const tocaCore = cambiados.filter((f) => core.includes(f) && !/^(index\.html|backend\.js|firebase-config\.js)$/.test(f));
    if (tocaCore.length && vBase === version) mal(`sw.js: cambian ${tocaCore.join(", ")} pero VERSION sigue en ${version}. Súbela (p. ej. vallik-v${Number(version.replace(/\D/g, "")) + 1}).`);
    else if (cambiados.some((f) => core.includes(f)) && vBase === version) ojo(`sw.js: cambia index.html/backend.js/firebase-config.js con VERSION igual (${version}). Llegan solos por red, pero súbela si el cambio es grande.`);
  } catch (e) { ojo(`No pude comparar con ${base}: ${e.message.split("\n")[0]}`); }
}

// 5. Lo que necesita la app de iPhone (app/scripts/copiar-web.mjs) y lo aprendido
{
  const html = leer("index.html");
  if (!html.includes('<script src="native.js"></script>')) mal('index.html: falta <script src="native.js"></script> exacto (copiar-web.mjs mete capacitor.js antes de él)');
  const iFirebase = html.indexOf('src="firebase-app-compat.js"'), iBody = html.indexOf("<body");
  if (iFirebase > -1 && iBody > -1 && iFirebase < iBody) mal("index.html: Firebase se carga en <head>; App Check (reCAPTCHA) necesita document.body: cárgalo al principio del <body>");
  if (!/window\.__earlyErr/.test(html)) ojo("index.html: falta el recogedor de errores tempranos (__earlyErr)");
  const cfg = leer("firebase-config.js");
  if (/PEGA/.test(cfg)) mal("firebase-config.js: tiene valores de ejemplo");
  const vj = JSON.parse(leer("version.json"));
  if (!vj.ios || typeof vj.ios.minBuild !== "number") mal("version.json: falta ios.minBuild numérico");
}

// 6. Nada secreto en el repo (la clave de Firebase web y la de reCAPTCHA son públicas por diseño)
for (const f of todos.filter((f) => /\.(js|mjs|json|html|md|yml|plist)$/.test(f) && !/-compat\.js$|\.min\.js$/.test(f))) {
  const t = leer(f);
  if (/sk-ant-[a-zA-Z0-9_-]{10,}/.test(t)) mal(`${f}: parece una clave de Anthropic. Va solo en Vercel.`);
  if (/-----BEGIN (EC |RSA )?PRIVATE KEY-----/.test(t)) mal(`${f}: contiene una clave privada`);
}
for (const f of todos) if (/AuthKey_.*\.p8$|\.p12$|\.mobileprovision$|(^|\/)\.env$/.test(f)) mal(`${f}: archivo de credenciales en el repo`);
// Documentos internos (registro de tratamientos, EIPD, business plan): el repo es público, no pueden estar aquí
for (const f of todos) if (/rat-y-eipd|eipd|business-plan|(^|\/)claude\//i.test(f)) mal(`${f}: documento interno en el repo público. Su sitio es ~/Documents/Vallik/claude`);

const r = (l, t) => l.length && console.log(`\n${t}\n- ${l.join("\n- ")}`);
r(avisos, "AVISOS"); r(fallos, "FALLOS");
console.log(fallos.length ? `\n✗ ${fallos.length} fallo(s)` : `\n✓ Comprobaciones superadas (${todos.length} archivos)${avisos.length ? `, ${avisos.length} aviso(s)` : ""}`);
process.exit(fallos.length ? 1 : 0);
