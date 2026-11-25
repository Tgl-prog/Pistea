// La vista principal de Capacitor, con los plugins propios de Vallik registrados.
import UIKit
import Capacitor

class VallikViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(VallikNavPlugin())
    }
}
