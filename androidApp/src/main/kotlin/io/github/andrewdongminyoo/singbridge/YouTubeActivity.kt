package io.github.andrewdongminyoo.singbridge

import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.os.Bundle
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.LinearLayout
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import org.json.JSONObject

class YouTubeActivity : ComponentActivity() {
    private lateinit var webView: WebView
    private val pronunciation = PronunciationBridge()

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = true
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            webViewClient = object : WebViewClient() {
                override fun onPageFinished(view: WebView, url: String?) {
                    if (url != "https://$packageName/") return
                    val debug = applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0
                    if (debug) pronunciation.attach(view, "https://$packageName")
                    val locale = resources.configuration.locales[0].toLanguageTag()
                    view.evaluateJavascript(
                        "window.singBridgeConfigurePronunciation(${JSONObject.quote(locale)}, $debug)",
                        null,
                    )
                }

                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                    if (!request.isForMainFrame) return false
                    if (request.hasGesture() && request.url.scheme == "https") {
                        runCatching { startActivity(Intent(Intent.ACTION_VIEW, request.url)) }
                    }
                    return true
                }
            }
            loadDataWithBaseURL("https://$packageName/", youtubeEmbedHtml(packageName), "text/html", "utf-8", null)
        }
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(
                Button(this@YouTubeActivity).apply {
                    text = "로컬 연습으로 돌아가기"
                    setOnClickListener { finish() }
                },
                LinearLayout.LayoutParams(-1, -2),
            )
            addView(webView, LinearLayout.LayoutParams(-1, 0, 1f))
        }
        ViewCompat.setOnApplyWindowInsetsListener(layout) { view, insets ->
            val safe = insets.getInsets(WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.ime())
            view.setPadding(safe.left, safe.top, safe.right, safe.bottom)
            insets
        }
        setContentView(layout)
    }

    override fun onResume() {
        super.onResume()
        webView.onResume()
        webView.evaluateJavascript("window.singBridgeResume && window.singBridgeResume()", null)
    }

    override fun onPause() {
        webView.evaluateJavascript("window.singBridgePause && window.singBridgePause()", null)
        webView.onPause()
        super.onPause()
    }

    override fun onDestroy() {
        pronunciation.close()
        webView.stopLoading()
        webView.loadUrl("about:blank")
        webView.removeAllViews()
        webView.destroy()
        super.onDestroy()
    }
}
