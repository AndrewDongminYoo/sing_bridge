import UIKit
import WebKit

// Opens the system share sheet for a practice-sharing message from the page. Registered in every build:
// it reads no storage and makes no network call.
final class ShareBridge: NSObject, WKScriptMessageHandler {
    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        // Only the app's own page may open the sheet, never the embedded player or another frame.
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == Bundle.main.bundleIdentifier,
              let text = message.body as? String, !text.isEmpty, text.utf16.count <= 2000,
              let webView = message.webView,
              var presenter = webView.window?.rootViewController else { return }
        while let presented = presenter.presentedViewController { presenter = presented }
        if presenter is UIActivityViewController { return }
        let sheet = UIActivityViewController(activityItems: [text], applicationActivities: nil)
        if let popover = sheet.popoverPresentationController {
            // iPad presents the sheet as a popover, which needs an anchor.
            popover.sourceView = webView
            popover.sourceRect = CGRect(x: webView.bounds.midX, y: webView.bounds.midY, width: 1, height: 1)
            popover.permittedArrowDirections = []
        }
        presenter.present(sheet, animated: true)
    }
}
