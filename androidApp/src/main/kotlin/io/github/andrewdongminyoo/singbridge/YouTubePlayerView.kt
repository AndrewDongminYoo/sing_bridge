package io.github.andrewdongminyoo.singbridge

import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import androidx.activity.ComponentActivity
import org.json.JSONObject

@SuppressLint("SetJavaScriptEnabled", "ViewConstructor")
internal class YouTubePlayerView(private val activity: ComponentActivity) : FrameLayout(activity) {
    private val webView: WebView
    private val pronunciation = PronunciationBridge()
    private val share = ShareBridge(activity)
    private var active = false
    private val packageName = activity.packageName

    init {
        webView = WebView(activity).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String?) {
                    if (url != "https://$packageName/") return
                    val debug = activity.applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
                    if (debug) pronunciation.attach(view, "https://$packageName")
                    share.attach(view, "https://$packageName")
                    val locale = resources.configuration.locales[0].toLanguageTag()
                    view.evaluateJavascript(
                        "window.singBridgeConfigurePronunciation(${JSONObject.quote(locale)}, $debug)",
                        null,
                    )
                    updatePlayback(view)
                }

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (!request.isForMainFrame) return false
                    if (request.hasGesture() && request.url.scheme == "https") {
                        runCatching { activity.startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                    }
                    return true
                }
            }
            loadDataWithBaseURL("https://$packageName/", youtubeEmbedHtml(packageName), "text/html", "utf-8", null)
        }
        addView(webView, LayoutParams(-1, -1))
    }

    fun setActive(value: Boolean) {
        active = value
        updatePlayback(webView)
    }

    private fun updatePlayback(view: WebView) {
        if (active) {
            view.onResume()
            view.evaluateJavascript("window.singBridgeResume && window.singBridgeResume()", null)
        } else {
            view.evaluateJavascript("window.singBridgePause && window.singBridgePause()", null)
            view.onPause()
        }
    }

    fun release() {
        pronunciation.close()
        share.close()
        webView.stopLoading()
        webView.loadUrl("about:blank")
        webView.removeAllViews()
        webView.destroy()
    }
}
