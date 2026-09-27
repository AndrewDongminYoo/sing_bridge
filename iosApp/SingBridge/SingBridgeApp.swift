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
    @State private var showingYouTube = false

    var body: some View {
        PracticeView(importer: importer, onYouTube: {
            importer.library.song.player.pause()
            showingYouTube = true
        })
            .fullScreenCover(isPresented: $showingYouTube) {
                YouTubeScreen()
            }
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
    let onYouTube: () -> Void

    func makeUIViewController(context: Context) -> UIViewController {
        MainViewControllerKt.MainViewController(
            library: importer.library,
            onPickAudio: { importer.pickAudio() },
            onPickLyrics: { importer.pickLyrics() },
            onSample: { importer.useSample() },
            onYouTube: onYouTube
        )
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}
