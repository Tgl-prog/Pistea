// Pruebas de firestore.rules con el emulador (proyecto demo-vallik: nunca toca el proyecto real).
// Cómo: cd .agentes/pruebas && npm ci && npm run reglas   (necesita Java y firebase-tools)
// Cada regla nueva o cambiada lleva su prueba aquí: lo que debe dejar y lo que debe impedir.
import { test, before, after, beforeEach } from "node:test";
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertSucceeds, assertFails } from "@firebase/rules-unit-testing";
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, writeBatch } from "firebase/firestore";

const G = "abcdefgh23";            // código válido: 10 letras o cifras
const OTRO = "zzzzzzzz99";
let env;
const db = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();
const ahora = () => Date.now();

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-vallik",
    firestore: { rules: readFileSync(new URL("../../firestore.rules", import.meta.url), "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
after(async () => { await env.cleanup(); });
beforeEach(async () => {
  await env.clearFirestore();
  // Grupo de partida: lo creó "ana"; "bea" está dentro.
  await env.withSecurityRulesDisabled(async (c) => {
    const f = c.firestore();
    await setDoc(doc(f, `grupos/${G}`), { owner: "ana", at: 1 });
    await setDoc(doc(f, `grupos/${G}/perfiles/ana`), { name: "Ana" });
    await setDoc(doc(f, `grupos/${G}/perfiles/bea`), { name: "Bea" });
  });
});

test("sin sesión no se lee nada", async () => {
  await assertFails(getDoc(doc(db(null), `grupos/${G}`)));
  await assertFails(getDoc(doc(db(null), `grupos/${G}/perfiles/ana`)));
});

test("nadie puede listar los grupos", async () => {
  await assertFails(getDocs(collection(db("bea"), "grupos")));
});

test("crear grupo: solo con código de 10 y uno mismo como creador", async () => {
  const c = db("carla"), b = writeBatch(c);
  b.set(doc(c, `grupos/${OTRO}`), { owner: "carla", at: ahora() });
  b.set(doc(c, `grupos/${OTRO}/perfiles/carla`), { name: "Carla" });
  await assertSucceeds(b.commit());
  await assertFails(setDoc(doc(db("carla"), "grupos/amigos"), { owner: "carla" }));
  await assertFails(setDoc(doc(db("carla"), "grupos/qqqqqqqq11"), { owner: "otra" }));
  await assertFails(setDoc(doc(db("ana"), `grupos/${G}`), { owner: "ana", at: 2 }));   // no se cambia
});

test("perfil: solo el tuyo, con nombre de 1 a 40 y sin campos extra", async () => {
  await assertSucceeds(setDoc(doc(db("carla"), `grupos/${G}/perfiles/carla`), { name: "Carla" }));
  await assertFails(setDoc(doc(db("carla"), `grupos/${G}/perfiles/dani`), { name: "Dani" }));
  await assertFails(setDoc(doc(db("carla"), `grupos/${G}/perfiles/carla`), { name: "" }));
  await assertFails(setDoc(doc(db("carla"), `grupos/${G}/perfiles/carla`), { name: "x".repeat(41) }));
  await assertFails(setDoc(doc(db("carla"), `grupos/${G}/perfiles/carla`), { name: "Carla", admin: true }));
  await assertFails(setDoc(doc(db("carla"), `grupos/${G}/perfiles/carla`), { name: "Carla", foto: "data:image/png;base64,AAAA" }));
});

test("perfil en un grupo que no existe: no", async () => {
  await assertFails(setDoc(doc(db("carla"), `grupos/${OTRO}/perfiles/carla`), { name: "Carla" }));
});

test("posición: solo la tuya y con coordenadas válidas; acepta ttl", async () => {
  const ok = { uid: "bea", lat: 45.3, lon: 6.58, at: ahora(), live: true };
  await assertSucceeds(setDoc(doc(db("bea"), `grupos/${G}/aqui/bea`), ok));
  await assertSucceeds(setDoc(doc(db("bea"), `grupos/${G}/aqui/bea`), { ...ok, ttl: new Date() }));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/aqui/ana`), { ...ok, uid: "ana" }));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/aqui/bea`), { ...ok, lat: 91 }));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/aqui/bea`), { ...ok, ttl: "mañana" }));
});

test("quitar a alguien: solo el creador, y el quitado ya no lee ni escribe", async () => {
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/fuera/ana`), { by: "bea" }));
  await assertSucceeds(setDoc(doc(db("ana"), `grupos/${G}/fuera/bea`), { by: "ana", at: ahora() }));
  await assertFails(getDoc(doc(db("bea"), `grupos/${G}/perfiles/ana`)));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/aqui/bea`), { uid: "bea", lat: 45, lon: 6, at: ahora() }));
  await assertSucceeds(getDoc(doc(db("bea"), `grupos/${G}/fuera/bea`)));   // la app vigila su propia entrada
});

test("cambio de código: el grupo viejo queda cerrado para perfiles nuevos", async () => {
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/movido/info`), { by: "bea" }));
  await assertSucceeds(setDoc(doc(db("ana"), `grupos/${G}/nuevo/bea`), { code: OTRO, by: "ana", at: ahora() }));
  await assertSucceeds(setDoc(doc(db("ana"), `grupos/${G}/movido/info`), { by: "ana", at: ahora() }));
  await assertFails(setDoc(doc(db("carla"), `grupos/${G}/perfiles/carla`), { name: "Carla" }));
  await assertSucceeds(getDoc(doc(db("bea"), `grupos/${G}/nuevo/bea`)));
  await assertFails(getDoc(doc(db("carla"), `grupos/${G}/nuevo/bea`)));
});

test("punto de encuentro: caduca como mucho a las 16 h", async () => {
  const q = { uid: "bea", lat: 45.3, lon: 6.58, en: "Refugio", at: ahora(), exp: ahora() + 3600e3, hora: "13:30" };
  await assertSucceeds(setDoc(doc(db("bea"), `grupos/${G}/quedada/actual`), q));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/quedada/otra`), q));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/quedada/actual`), { ...q, exp: ahora() + 17 * 3600e3 }));
});

test("avisos: solo tipos conocidos, no se editan", async () => {
  const a = { uid: "bea", tipo: "cola", ref: "w123", lat: 45.3, lon: 6.58, at: ahora(), exp: ahora() + 7200e3 };
  await assertSucceeds(setDoc(doc(db("bea"), `grupos/${G}/avisos/a1`), a));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/avisos/a2`), { ...a, tipo: "fiesta" }));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/avisos/a1`), { ...a, ref: "w999" }));
  await assertSucceeds(deleteDoc(doc(db("ana"), `grupos/${G}/avisos/a1`)));   // el creador puede borrarlo
});

test("mensajes de un toque: solo los tipos de la app", async () => {
  await assertSucceeds(setDoc(doc(db("bea"), `grupos/${G}/mensajes/bea`), { uid: "bea", tipo: "ayuda", at: ahora() }));
  await assertFails(setDoc(doc(db("bea"), `grupos/${G}/mensajes/bea`), { uid: "bea", tipo: "spam", at: ahora() }));
});

test("errores: se crean sin sesión de nadie más y nadie los lee", async () => {
  await assertSucceeds(setDoc(doc(db("bea"), "errores/e1"), { msg: "fallo", at: ahora(), plat: "ios" }));
  await assertFails(getDoc(doc(db("bea"), "errores/e1")));
  await assertFails(setDoc(doc(db("bea"), "errores/e2"), { msg: "fallo", at: ahora(), plat: "windows" }));
});
