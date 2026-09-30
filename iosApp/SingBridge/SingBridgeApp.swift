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
    // Tab positions: 노래 찾기, 연습, 내 노래.
    private static let searchTab = 0
    private static let practiceTab = 1

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
            onPractice: { [weak self] in self?.selectPractice() }
        )
        youtube.tabBarItem = UITabBarItem(title: "노래 찾기", image: UIImage(systemName: "magnifyingglass"), tag: 0)
        home.tabBarItem = UITabBarItem(title: "연습", image: UIImage(systemName: "music.mic"), tag: 1)
        songs.tabBarItem = UITabBarItem(title: "내 노래", image: UIImage(systemName: "music.note.list"), tag: 2)
        viewControllers = [youtube, home, songs]
        tabBar.tintColor = UIColor(red: 0.14, green: 0.37, blue: 0.32, alpha: 1)
        importer.onImported = { [weak self] in self?.selectPractice() }
        updateVisibility()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) has not been implemented") }

    private func selectPractice() {
        selectedIndex = Self.practiceTab
        updateVisibility()
    }

    func tabBarController(_ tabBarController: UITabBarController, didSelect viewController: UIViewController) {
        updateVisibility()
    }

    private func updateVisibility() {
        importer.library.setPracticeVisible(visible: selectedIndex == Self.practiceTab)
        youtube.rootView = YouTubeScreen(active: selectedIndex == Self.searchTab)
    }
}
