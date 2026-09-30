package io.github.andrewdongminyoo.singbridge

import android.content.Intent
import android.net.Uri
import android.webkit.WebMessage
import android.webkit.WebMessagePort
import android.webkit.WebView
import androidx.activity.ComponentActivity
import java.util.UUID
import org.json.JSONObject

// Opens the system share sheet for a practice-sharing message from the page. Registered in every build:
// it reads no storage and makes no network call. The port reaches only the app's own page origin.
internal class ShareBridge(private val activity: ComponentActivity) {
    private var port: WebMessagePort? = null

    fun attach(view: WebView, origin: String) {
        port?.close()
        val channel = view.createWebMessageChannel()
        port = channel[0]
        channel[0].setWebMessageCallback(object : WebMessagePort.WebMessageCallback() {
            override fun onMessage(port: WebMessagePort, message: WebMessage?) {
                val text = message?.data ?: return
                if (text.isEmpty() || text.length > 2000) return
                val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
                runCatching { activity.startActivity(Intent.createChooser(send, null)) }
            }
        })
        val nonce = UUID.randomUUID().toString()
        view.evaluateJavascript("window.singBridgePrepareSharePort(${JSONObject.quote(nonce)})") {
            view.postWebMessage(WebMessage(nonce, arrayOf(channel[1])), Uri.parse(origin))
        }
    }

    fun close() {
        port?.close()
        port = null
    }
}
