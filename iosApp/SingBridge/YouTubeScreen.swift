import SwiftUI
import WebKit
import Shared

struct YouTubeScreen: View {
    @Environment(\.dismiss) private var dismiss
    @Environment(\.scenePhase) private var scenePhase

    var body: some View {
        NavigationStack {
            YouTubeWebView(active: scenePhase == .active)
                .navigationTitle("YouTube")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button("닫기") { dismiss() }
                    }
                }
        }
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
        if active {
            webView.setAllMediaPlaybackSuspended(false)
            webView.evaluateJavaScript("window.singBridgeResume && window.singBridgeResume()", completionHandler: nil)
        } else {
            webView.evaluateJavaScript("window.singBridgePause && window.singBridgePause()", completionHandler: nil)
            webView.pauseAllMediaPlayback()
            webView.setAllMediaPlaybackSuspended(true)
        }
    }

    static func dismantleUIView(_ webView: WKWebView, coordinator: Coordinator) {
        coordinator.pronunciation.close()
        webView.configuration.userContentController.removeScriptMessageHandler(forName: "pronunciation")
        webView.pauseAllMediaPlayback()
        webView.setAllMediaPlaybackSuspended(true)
        webView.stopLoading()
        webView.navigationDelegate = nil
        webView.loadHTMLString("", baseURL: nil)
    }

    final class Coordinator: NSObject, WKNavigationDelegate {
        let pronunciation = PronunciationBridge()

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
