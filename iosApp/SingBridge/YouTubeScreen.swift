import SwiftUI
import WebKit
import Shared

struct YouTubeScreen: View {
    @Environment(\.scenePhase) private var scenePhase
    var active = true

    var body: some View {
        // The page stays inside the safe area; its paper color fills the strip behind the status bar.
        YouTubeWebView(active: active && scenePhase == .active)
            .background(Color(red: 250 / 255, green: 247 / 255, blue: 240 / 255).ignoresSafeArea())
    }
}

private struct YouTubeWebView: UIViewRepresentable {
    let active: Bool

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .all
        configuration.allowsPictureInPictureMediaPlayback = false
        #if DEBUG && targetEnvironment(simulator)
        configuration.userContentController.add(context.coordinator.pronunciation, name: "pronunciation")
        #endif
        // Sharing needs no development server, so it is registered in every build.
        configuration.userContentController.add(context.coordinator.share, name: "share")
        let webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = context.coordinator
        let appId = Bundle.main.bundleIdentifier!
        webView.loadHTMLString(
            YouTubeEmbedKt.youtubeEmbedHtml(appId: appId),
            baseURL: URL(string: "https://\(appId)/")!
        )
        return webView
    }

    func updateUIView(_ webView: WKWebView, context: Context) {
        context.coordinator.active = active
        context.coordinator.updatePlayback(webView)
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        coordinator.pronunciation.close()
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "pronunciation")
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "share")
        webView.pauseAllMediaPlayback()
        webView.setAllMediaPlaybackSuspended(true)
        webView.stopLoading()
        webView.navigationDelegate = nil
        webView.loadHTMLString("", baseURL: nil)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let pronunciation = PronunciationBridge()
        let share = ShareBridge()
        var active = false

        func updatePlayback(_ webView: WKWebView) {
            if active {
                webView.setAllMediaPlaybackSuspended(false)
                webView.evaluateJavaScript("window.singBridgeResume && window.singBridgeResume()", completionHandler: nil)
            } else {
                webView.evaluateJavaScript("window.singBridgePause && window.singBridgePause()", completionHandler: nil)
                webView.pauseAllMediaPlayback()
                webView.setAllMediaPlaybackSuspended(true)
            }
        }

        func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
            guard webView.url?.host == Bundle.main.bundleIdentifier else { return }
            #if DEBUG && targetEnvironment(simulator)
            let available = true
            #else
            let available = false
            #endif
            webView.callAsyncJavaScript("window.singBridgeConfigurePronunciation(locale, available)",
                arguments: ["locale": Locale.preferredLanguages.first ?? "", "available": available],
                in: nil, in: .page, completionHandler: nil)
            updatePlayback(webView)
        }

        func webView(
            _ webView: WKWebView,
            decidePolicyFor navigationAction: WKNavigationAction,
            decisionHandler: @escaping (WKNavigationActionPolicy) -> Void
        ) {
            if navigationAction.targetFrame?.isMainFrame == false {
                decisionHandler(.allow)
                return
            }
            if navigationAction.navigationType == .linkActivated,
               let url = navigationAction.request.url, url.scheme == "https" {
                UIApplication.shared.open(url)
                decisionHandler(.cancel)
                return
            }
            // Only the app's initial local document may navigate the main frame.
            let location = navigationAction.request.url?.absoluteString
            let origin = "https://\(Bundle.main.bundleIdentifier!)/"
            let initial = navigationAction.navigationType == .other && (location == origin || location == "about:blank")
            decisionHandler(initial ? .allow : .cancel)
        }
    }
}
