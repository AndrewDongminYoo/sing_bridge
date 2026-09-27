import SwiftUI
import Shared
import UniformTypeIdentifiers

@main
struct SingBridgeApp: App {
    var body: some Scene {
        WindowGroup {
            PracticeScreen()
                .ignoresSafeArea()
        }
    }
}

private struct PracticeScreen: View {
    @StateObject private var importer = SongImporter()

    var body: some View {
        PracticeView(importer: importer)
            .fileImporter(
                isPresented: $importer.pickerPresented,
                allowedContentTypes: importer.selectingAudio ? [.audio] : [.data]
            ) { result in
                importer.receive(result)
            }
    }
}

private struct PracticeView: UIViewControllerRepresentable {
    let importer: SongImporter

    func makeUIViewController(context: Context) -> UIViewController {
        MainViewControllerKt.MainViewController(
            library: importer.library,
            onPickAudio: { importer.pickAudio() },
            onPickLyrics: { importer.pickLyrics() },
            onSample: { importer.useSample() }
        )
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
