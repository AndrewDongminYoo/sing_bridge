import SwiftUI
import Shared
import UniformTypeIdentifiers

@main
struct SingBridgeApp: App {
    var body: some Scene {
        WindowGroup {
            PracticeScreen()
        }
    }
}

private struct PracticeScreen: View {
    @StateObject private var importer = SongImporter()
    var body: some View {
        PracticeTabs(importer: importer)
            .ignoresSafeArea()
            .fileImporter(
                isPresented: $importer.pickerPresented,
                allowedContentTypes: importer.selectingAudio ? [.audio] : [.data]
            ) { result in
                importer.receive(result)
            }
    }
}

private struct PracticeTabs: UIViewControllerRepresentable {
    let importer: SongImporter

    func makeUIViewController(context: Context) -> UIViewController {
        PracticeTabController(importer: importer)
    }

    func updateUIViewController(_ uiViewController: UIViewController, context: Context) {}
}

private final class PracticeTabController: UITabBarController, UITabBarControllerDelegate {
    private let importer: SongImporter
    private let youtube = UIHostingController(rootView: YouTubeScreen(active: false))

    init(importer: SongImporter) {
        self.importer = importer
        super.init(nibName: nil, bundle: nil)
        delegate = self
        let home = MainViewControllerKt.MainViewController(
            library: importer.library,
            onPickAudio: { [weak importer] in importer?.pickAudio() },
            onPickLyrics: { [weak importer] in importer?.pickLyrics() },
            onSample: { [weak importer] in importer?.useSample() },
            onYouTube: {},
            tabbed: true
        )
        let songs = MainViewControllerKt.ImportViewController(
            library: importer.library,
            onPickAudio: { [weak importer] in importer?.pickAudio() },
            onPickLyrics: { [weak importer] in importer?.pickLyrics() },
            onPractice: { [weak self] in self?.selectHome() }
        )
        home.tabBarItem = UITabBarItem(title: "홈", image: UIImage(systemName: "house"), tag: 0)
        youtube.tabBarItem = UITabBarItem(title: "YouTube", image: UIImage(systemName: "play.rectangle"), tag: 1)
        songs.tabBarItem = UITabBarItem(title: "내 노래", image: UIImage(systemName: "music.note.list"), tag: 2)
        viewControllers = [home, youtube, songs]
        tabBar.tintColor = UIColor(red: 0.14, green: 0.37, blue: 0.32, alpha: 1)
        importer.onImported = { [weak self] in self?.selectHome() }
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func selectHome() {
        selectedIndex = 0
        updateVisibility()
    }

    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        updateVisibility()
    }

    private func updateVisibility() {
        importer.library.setPracticeVisible(visible: selectedIndex == 0)
        youtube.rootView = YouTubeScreen(active: selectedIndex == 1)
    }
}
