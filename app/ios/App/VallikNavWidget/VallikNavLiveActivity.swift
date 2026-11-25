// Actividad en Directo de la ruta: pantalla bloqueada e Isla Dinámica.
// Mismos colores que la app: azul Alpino de fondo, lima de acento, colores de pista solo para pistas.
import ActivityKit
import WidgetKit
import SwiftUI

private let alpino = Color(red: 14 / 255, green: 42 / 255, blue: 71 / 255)
private let raised = Color(red: 20 / 255, green: 53 / 255, blue: 90 / 255)
private let lima = Color(red: 200 / 255, green: 240 / 255, blue: 60 / 255)
private let nieve = Color(red: 246 / 255, green: 248 / 255, blue: 250 / 255)
private let niebla = Color(red: 169 / 255, green: 188 / 255, blue: 208 / 255)

private func hex(_ s: String) -> Color? {
    var h = s.trimmingCharacters(in: .whitespaces)
    if h.hasPrefix("#") { h.removeFirst() }
    guard h.count == 6, let v = UInt32(h, radix: 16) else { return nil }
    return Color(red: Double((v >> 16) & 0xFF) / 255, green: Double((v >> 8) & 0xFF) / 255, blue: Double(v & 0xFF) / 255)
}

private func symbol(_ kind: String) -> String {
    switch kind {
    case "up": return "arrow.up.right"
    case "down": return "arrow.down.right"
    case "walk": return "figure.walk"
    case "done": return "flag.checkered"
    default: return "arrow.down.forward"
    }
}

/// Fondo del icono: el color de la pista; lima en remontes y a pie; negro con borde en pistas negras.
private struct StepIcon: View {
    let kind: String
    let color: String
    var size: CGFloat = 44

    var body: some View {
        let piste = hex(color)
        let isLift = kind == "up" || kind == "down"
        let fill: Color = isLift || kind == "walk" || kind == "done" ? lima : (piste ?? raised)
        let ink: Color = (isLift || kind == "walk" || kind == "done") ? alpino : .white
        ZStack {
            RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                .fill(fill)
                .overlay(
                    RoundedRectangle(cornerRadius: size * 0.28, style: .continuous)
                        .strokeBorder(Color.white.opacity(piste != nil && !isLift ? 0.18 : 0), lineWidth: 1)
                )
            Image(systemName: isLift ? "cablecar.fill" : symbol(kind))
                .font(.system(size: size * 0.46, weight: .semibold))
                .foregroundStyle(ink)
        }
        .frame(width: size, height: size)
    }
}

private struct Minutes: View {
    let mins: Int
    let done: Bool
    var big: Bool = true

    var body: some View {
        if done {
            Image(systemName: "checkmark").font(.system(size: big ? 22 : 13, weight: .bold)).foregroundStyle(lima)
        } else {
            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text("\(mins)").font(.system(size: big ? 30 : 14, weight: .semibold, design: .rounded)).monospacedDigit()
                Text("min").font(.system(size: big ? 13 : 11, weight: .medium)).foregroundStyle(niebla)
            }
            .foregroundStyle(nieve)
        }
    }
}

private struct RouteBar: View {
    let idx: Int
    let total: Int

    var body: some View {
        GeometryReader { g in
            ZStack(alignment: .leading) {
                Capsule().fill(Color.white.opacity(0.12))
                // Arranca con un tramo hecho para que se lea como progreso desde el primer paso.
                Capsule().fill(lima).frame(width: total > 0 ? max(10, g.size.width * CGFloat(min(idx, total) + 1) / CGFloat(total + 1)) : 0)
            }
        }
        .frame(height: 4)
    }
}

struct VallikNavLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: VallikNavAttributes.self) { context in
            let s = context.state
            VStack(alignment: .leading, spacing: 12) {
                HStack(spacing: 6) {
                    Text("\(context.attributes.label) \(context.attributes.dest)")
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(niebla)
                        .lineLimit(1)
                    Spacer(minLength: 8)
                    Minutes(mins: s.mins, done: s.done, big: false)
                }
                HStack(alignment: .center, spacing: 14) {
                    StepIcon(kind: s.kind, color: s.color)
                    Text(s.step)
                        .font(.system(size: 19, weight: .semibold))
                        .foregroundStyle(nieve)
                        .lineLimit(2)
                        .minimumScaleFactor(0.85)
                    Spacer(minLength: 0)
                }
                if !s.next.isEmpty {
                    HStack(spacing: 8) {
                        StepIcon(kind: s.nextKind, color: s.nextColor, size: 20)
                        Text(s.next)
                            .font(.system(size: 14))
                            .foregroundStyle(niebla)
                            .lineLimit(1)
                    }
                }
                RouteBar(idx: s.idx, total: s.total)
            }
            .padding(16)
            .activityBackgroundTint(alpino)
            .activitySystemActionForegroundColor(nieve)
        } dynamicIsland: { context in
            let s = context.state
            return DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    StepIcon(kind: s.kind, color: s.color, size: 40).padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Minutes(mins: s.mins, done: s.done).padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.center) {
                    Text(s.step)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(nieve)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)
                        .frame(maxWidth: .infinity, alignment: .leading)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        if !s.next.isEmpty {
                            Text(s.next).font(.system(size: 13)).foregroundStyle(niebla).lineLimit(1)
                        }
                        RouteBar(idx: s.idx, total: s.total)
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                StepIcon(kind: s.kind, color: s.color, size: 22)
            } compactTrailing: {
                if s.done {
                    Image(systemName: "checkmark").foregroundStyle(lima)
                } else {
                    Text("\(s.mins)′").font(.system(size: 14, weight: .semibold, design: .rounded)).monospacedDigit().foregroundStyle(lima)
                }
            } minimal: {
                StepIcon(kind: s.kind, color: s.color, size: 22)
            }
            .keylineTint(lima)
        }
    }
}
