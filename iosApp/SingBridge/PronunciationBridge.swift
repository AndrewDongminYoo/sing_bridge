import Foundation
import WebKit

// Local development transport only. The provider credential never reaches the app.
final class PronunciationBridge: NSObject, WKScriptMessageHandler, URLSessionTaskDelegate {
    private var task: URLSessionDataTask?
    private var currentID: String?
    private lazy var session = URLSession(configuration: .ephemeral, delegate: self, delegateQueue: nil)

    func cancel() {
        currentID = nil
        task?.cancel()
        task = nil
    }

    func close() {
        cancel()
        session.invalidateAndCancel()
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        #if DEBUG && targetEnvironment(simulator)
        guard message.frameInfo.isMainFrame,
              message.frameInfo.securityOrigin.protocol == "https",
              message.frameInfo.securityOrigin.host == Bundle.main.bundleIdentifier,
              let body = message.body as? [String: Any] else { return }
        if body["cancel"] as? Bool == true { cancel(); return }
        guard currentID == nil, let id = body["id"] as? String,
              id.range(of: "^[0-9]+-[0-9]+$", options: .regularExpression) != nil, id.count <= 40,
              let input = body["request"] as? [String: Any],
              let data = try? JSONSerialization.data(withJSONObject: input), data.count <= 32768 else { return }
        currentID = id
        var request = URLRequest(url: URL(string: "http://127.0.0.1:18773/pronunciation")!)
        request.httpMethod = "POST"
        request.httpBody = data
        request.timeoutInterval = 50
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("native-dev", forHTTPHeaderField: "X-SingBridge-Client")
        weak var webView = message.webView
        task = session.dataTask(with: request) { [weak self] data, response, error in
            var reply: [String: Any] = ["id": id, "error": "unavailable"]
            if error == nil, (response as? HTTPURLResponse)?.statusCode == 200,
               let data, data.count <= 262144,
               let result = try? JSONSerialization.jsonObject(with: data) {
                reply = ["id": id, "result": result]
            }
            let finished = reply
            DispatchQueue.main.async {
                guard let self, self.currentID == id else { return }
                self.currentID = nil
                self.task = nil
                webView?.callAsyncJavaScript("window.singBridgePronunciationResult(reply)", arguments: ["reply": finished], in: nil, in: .page, completionHandler: nil)
            }
        }
        task?.resume()
        #endif
    }

    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}
