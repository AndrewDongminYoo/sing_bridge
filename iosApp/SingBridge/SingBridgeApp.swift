import SwiftUI
import Shared

@main
struct SingBridgeApp: App {
    var body: some Scene {
        WindowGroup {
            PracticeView()
                .ignoresSafeArea()
        }
    }
}

private struct PracticeView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> UIViewController {
        MainViewControllerKt.MainViewController()
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
