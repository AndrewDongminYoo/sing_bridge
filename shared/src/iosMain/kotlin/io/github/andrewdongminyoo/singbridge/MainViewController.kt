package io.github.andrewdongminyoo.singbridge

import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.remember
import androidx.compose.ui.window.ComposeUIViewController
import platform.AVFAudio.AVAudioSessionInterruptionNotification
import platform.Foundation.NSNotificationCenter
import platform.Foundation.NSOperationQueue
import platform.UIKit.UIApplicationWillResignActiveNotification

fun MainViewController() = ComposeUIViewController {
    val player = remember { IosAudioPlayer() }
    DisposableEffect(player) {
        val center = NSNotificationCenter.defaultCenter
        val observers = listOf(
            UIApplicationWillResignActiveNotification,
            AVAudioSessionInterruptionNotification,
        ).map { name ->
            center.addObserverForName(name, null, NSOperationQueue.mainQueue) { player.pause() }
        }
        onDispose {
            observers.forEach(center::removeObserver)
            player.release()
        }
    }
    App(player)
}
