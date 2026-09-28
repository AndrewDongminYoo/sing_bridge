package io.github.andrewdongminyoo.singbridge

import android.net.Uri
import android.webkit.WebMessage
import android.webkit.WebMessagePort
import android.webkit.WebView
import java.io.ByteArrayOutputStream
import java.net.HttpURLConnection
import java.net.URL
import java.util.UUID
import java.util.concurrent.Executors
import org.json.JSONObject

internal class PronunciationBridge {
    private var port: WebMessagePort? = null

    @Volatile private var requestId: String? = null

    @Volatile private var connection: HttpURLConnection? = null
    private val executor = Executors.newSingleThreadExecutor()

    fun attach(view: WebView, origin: String) {
        cancel()
        port?.close()
        val channel = view.createWebMessageChannel()
        port = channel[0]
        channel[0].setWebMessageCallback(object : WebMessagePort.WebMessageCallback() {
            override fun onMessage(port: WebMessagePort, message: WebMessage?) {
                val text = message?.data ?: return
                if (text.length > 32768) return
                val body = runCatching { JSONObject(text) }.getOrNull() ?: return
                if (body.optBoolean("cancel")) {
                    cancel()
                    return
                }
                val id = body.optString("id")
                val input = body.optJSONObject("request") ?: return
                if (requestId != null || !Regex("[0-9]+-[0-9]+").matches(id) || id.length > 40) return
                requestId = id
                executor.execute {
                    if (requestId != id) return@execute
                    val reply = JSONObject().put("id", id)
                    var request: HttpURLConnection? = null
                    try {
                        // adb reverse maps device loopback to the development host.
                        request = URL("http://127.0.0.1:18773/pronunciation").openConnection() as HttpURLConnection
                        connection = request
                        if (requestId != id) return@execute
                        request.requestMethod = "POST"
                        request.instanceFollowRedirects = false
                        request.connectTimeout = 5000
                        request.readTimeout = 50000
                        request.setRequestProperty("Content-Type", "application/json")
                        request.setRequestProperty("X-SingBridge-Client", "native-dev")
                        request.doOutput = true
                        if (requestId != id) return@execute
                        request.outputStream.use { it.write(input.toString().toByteArray(Charsets.UTF_8)) }
                        check(request.responseCode == 200)
                        val bytes = request.inputStream.use { stream ->
                            val output = ByteArrayOutputStream()
                            val buffer = ByteArray(8192)
                            while (true) {
                                val count = stream.read(buffer)
                                if (count == -1) break
                                check(output.size() + count <= 262144)
                                output.write(buffer, 0, count)
                            }
                            output.toByteArray()
                        }
                        check(bytes.size <= 262144)
                        reply.put("result", JSONObject(String(bytes, Charsets.UTF_8)))
                    } catch (_: Exception) {
                        reply.put("error", "unavailable")
                    } finally {
                        request?.disconnect()
                        if (connection === request) connection = null
                    }
                    view.post {
                        if (requestId == id) {
                            requestId = null
                            this@PronunciationBridge.port?.postMessage(WebMessage(reply.toString()))
                        }
                    }
                }
            }
        })
        val nonce = UUID.randomUUID().toString()
        view.evaluateJavascript("window.singBridgePreparePronunciationPort(${JSONObject.quote(nonce)})") {
            view.postWebMessage(WebMessage(nonce, arrayOf(channel[1])), Uri.parse(origin))
        }
    }

    private fun cancel() {
        requestId = null
        connection?.disconnect()
        connection = null
    }

    fun close() {
        cancel()
        port?.close()
        port = null
        executor.shutdownNow()
    }
}
