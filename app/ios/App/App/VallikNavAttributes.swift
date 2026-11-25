// Datos de la Actividad en Directo de la ruta. Lo comparten la app y la extensión del widget.
import Foundation
#if canImport(ActivityKit)
import ActivityKit

@available(iOS 16.2, *)
struct VallikNavAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var step: String        // "Baja por la roja Col de l'Audzin"
        var kind: String        // run, up, down, walk, done
        var color: String       // color de la pista (#RRGGBB) o vacío
        var next: String
        var nextKind: String
        var nextColor: String
        var mins: Int           // minutos que faltan
        var idx: Int
        var total: Int
        var done: Bool
    }
    var dest: String            // destino: un amigo, un remonte, un bar
    var label: String           // "Vallik · hacia"
}
#endif
