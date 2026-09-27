package io.github.andrewdongminyoo.singbridge

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge

class MainActivity : ComponentActivity() {
    private lateinit var player: AndroidAudioPlayer

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        player = AndroidAudioPlayer(this)
        setContent { App(player) }
    }

    override fun onStop() {
        player.pause()
        super.onStop()
    }

    override fun onDestroy() {
        player.release()
        super.onDestroy()
    }
}
