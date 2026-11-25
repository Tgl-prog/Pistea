// Plugin propio de Vallik: empieza, actualiza y termina la Actividad en Directo de la ruta.
// Desde la web: Capacitor.registerPlugin("VallikNav").update({...}) y .end() (ver native.js).
import Foundation
import Capacitor
import AVFoundation
#if canImport(ActivityKit)
import ActivityKit
#endif

@objc(VallikNavPlugin)
public class VallikNavPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "VallikNavPlugin"
    public let jsName = "VallikNav"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "speak", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopSpeaking", returnType: CAPPluginReturnPromise)
    ]

    // Voz de la guía con el sintetizador del iPhone: sigue hablando con el móvil bloqueado
    // (modo de audio en segundo plano) y baja la música mientras habla, como Waze o Google Maps.
    private let synth = AVSpeechSynthesizer()
    private lazy var voiceDelegate = VoiceDelegate()

    @objc func speak(_ call: CAPPluginCall) {
        guard let text = call.getString("text"), !text.isEmpty else { call.resolve(); return }
        let lang = call.getString("lang") ?? "es-ES"
        DispatchQueue.main.async {
            let session = AVAudioSession.sharedInstance()
            try? session.setCategory(.playback, mode: .voicePrompt, options: [.duckOthers, .interruptSpokenAudioAndMixWithOthers])
            try? session.setActive(true)
            if self.synth.isSpeaking { self.synth.stopSpeaking(at: .immediate) }
            self.synth.delegate = self.voiceDelegate
            let u = AVSpeechUtterance(string: text)
            let prefix = String(lang.prefix(2))
            let voices = AVSpeechSynthesisVoice.speechVoices().filter { $0.language == lang || $0.language.hasPrefix(prefix) }
            u.voice = voices.first(where: { $0.language == lang && $0.quality != .default })
                ?? voices.first(where: { $0.quality != .default })
                ?? AVSpeechSynthesisVoice(language: lang)
            u.rate = AVSpeechUtteranceDefaultSpeechRate * 1.02
            self.synth.speak(u)
            call.resolve()
        }
    }

    @objc func stopSpeaking(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.synth.stopSpeaking(at: .immediate)
            call.resolve()
        }
    }

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

/// Al terminar de hablar devuelve el volumen a la música del usuario.
final class VoiceDelegate: NSObject, AVSpeechSynthesizerDelegate {
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) { release(synthesizer) }
    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didCancel utterance: AVSpeechUtterance) { release(synthesizer) }
    private func release(_ s: AVSpeechSynthesizer) {
        guard !s.isSpeaking else { return }
        try? AVAudioSession.sharedInstance().setActive(false, options: .notifyOthersOnDeactivation)
    }
}
