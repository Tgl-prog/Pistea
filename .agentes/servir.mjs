// Servidor local de la web para probar en este ordenador (sin dependencias).
//   node .agentes/servir.mjs [puerto]      → http://localhost:5500/?emu
// Con ?emu la web usa los emuladores de Firebase (ver AGENTS.md). Sin service worker, para ver
// siempre lo último, y sin caché del navegador.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, dirname, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const puerto = Number(process.argv[2] || process.env.PORT || 5500);
const tipos = { ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".mjs": "text/javascript", ".json": "application/json",
  ".webmanifest": "application/manifest+json", ".css": "text/css", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg",
  ".webp": "image/webp", ".woff2": "font/woff2", ".xml": "application/xml", ".txt": "text/plain" };

createServer(async (req, res) => {
  try {
    let ruta = normalize(decodeURIComponent(new URL(req.url, "http://x").pathname)).replace(/^(\.\.[/\\])+/, "");
    if (ruta === "/sw.js" || /(^|\/)\.|node_modules|\/app\//.test(ruta)) { res.writeHead(404).end(); return; }
    let f = join(raiz, ruta);
    if ((await stat(f).catch(() => null))?.isDirectory()) f = join(f, "index.html");
    const body = await readFile(f);
    res.writeHead(200, { "content-type": tipos[extname(f)] || "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch { res.writeHead(404).end("No existe"); }
}).listen(puerto, () => console.log(`Vallik en http://localhost:${puerto}/?emu  (emuladores: http://localhost:4000)`));
