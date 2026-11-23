// El plugin de App Check vive en node_modules/@capacitor-firebase/app-check. Para Swift Package Manager
// el nombre de la carpeta ("app-check") choca con el paquete github.com/google/app-check de Firebase.
// Lo copiamos a ios/plugins/CapacitorFirebaseAppCheck y apuntamos ahí Package.swift (se ejecuta tras cap sync).
import { cpSync, rmSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const app = join(dirname(fileURLToPath(import.meta.url)), "..");
const desde = join(app, "node_modules/@capacitor-firebase/app-check");
const hasta = join(app, "ios/plugins/CapacitorFirebaseAppCheck");
const pkg = join(app, "ios/App/CapApp-SPM/Package.swift");

if (existsSync(desde)) {
  rmSync(hasta, { recursive: true, force: true });
  cpSync(desde, hasta, { recursive: true, filter: s => !/[\\/](android|node_modules)([\\/]|$)/.test(s.slice(desde.length)) });
}
const antes = readFileSync(pkg, "utf8");
const despues = antes.replace('path: "../../../node_modules/@capacitor-firebase/app-check"', 'path: "../../plugins/CapacitorFirebaseAppCheck"');
writeFileSync(pkg, despues);
console.log(despues === antes ? "Package.swift sin cambios" : "Package.swift: App Check desde ios/plugins/CapacitorFirebaseAppCheck");
