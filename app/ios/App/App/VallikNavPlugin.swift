// Plugin propio de Vallik: empieza, actualiza y termina la Actividad en Directo de la ruta.
// Desde la web: Capacitor.registerPlugin("VallikNav").update({...}) y .end() (ver native.js).
import Foundation
import Capacitor
#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(VallikNavPlugin)
public class VallikNavPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VallikNavPlugin"
    public let jsName = "VallikNav"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise)
    ]

    @objc func update(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else { call.resolve(["ok": false]); return }
        let state = VallikNavAttributes.ContentState(
            step: call.getString("step") ?? "",
            kind: call.getString("kind") ?? "run",
            color: call.getString("color") ?? "",
            next: call.getString("next") ?? "",
            nextKind: call.getString("nextKind") ?? "",
            nextColor: call.getString("nextColor") ?? "",
            mins: call.getInt("mins") ?? 0,
            idx: call.getInt("idx") ?? 0,
            total: call.getInt("total") ?? 0,
            done: call.getBool("done") ?? false
        )
        let dest = call.getString("dest") ?? ""
        let label = call.getString("label") ?? "Vallik"
        Task {
            let content = ActivityContent(state: state, staleDate: Date().addingTimeInterval(15 * 60))
            let running = Activity<VallikNavAttributes>.activities
            if let a = running.first(where: { $0.attributes.dest == dest && $0.activityState == .active }) {
                if state.done {
                    // Llegaste: se queda unos minutos con "Ya estás" y se va sola.
                    await a.end(content, dismissalPolicy: .after(Date().addingTimeInterval(5 * 60)))
                } else {
                    await a.update(content)
                }
                call.resolve(["ok": true])
                return
            }
            for a in running { await a.end(nil, dismissalPolicy: .immediate) }
            if state.done { call.resolve(["ok": true]); return }
            guard ActivityAuthorizationInfo().areActivitiesEnabled else { call.resolve(["ok": false]); return }
            do {
                _ = try Activity.request(attributes: VallikNavAttributes(dest: dest, label: label), content: content, pushType: nil)
                call.resolve(["ok": true])
            } catch {
                call.reject("No se pudo empezar la Actividad en Directo: \(error.localizedDescription)")
            }
        }
        #else
        call.resolve(["ok": false])
        #endif
    }

    @objc func end(_ call: CAPPluginCall) {
        #if canImport(ActivityKit)
        guard #available(iOS 16.2, *) else { call.resolve(); return }
        Task {
            for a in Activity<VallikNavAttributes>.activities { await a.end(nil, dismissalPolicy: .immediate) }
            call.resolve()
        }
        #else
        call.resolve()
        #endif
    }
}
