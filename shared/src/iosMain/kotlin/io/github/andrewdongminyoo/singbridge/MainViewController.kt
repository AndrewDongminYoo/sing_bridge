package io.github.andrewdongminyoo.singbridge

import androidx.compose.runtime.DisposableEffect
import androidx.compose.ui.window.ComposeUIViewController
import platform.AVFAudio.AVAudioSessionInterruptionNotification
import platform.Foundation.NSNotificationCenter
import platform.Foundation.NSOperationQueue
import platform.UIKit.UIApplicationDidBecomeActiveNotification
import platform.UIKit.UIApplicationWillResignActiveNotification

// Keep the exported Swift entry point used by the iOS host.
@Suppress("ktlint:standard:function-naming")
fun MainViewController(library: SongLibrary, onPickAudio: () -> Unit, onPickLyrics: () -> Unit, onSample: () -> Unit) =
    ComposeUIViewController {
        DisposableEffect(library) {
            val center = NSNotificationCenter.defaultCenter
            val observers = listOf(
                center.addObserverForName(UIApplicationWillResignActiveNotification, null, NSOperationQueue.mainQueue) {
                    library.setActive(false)
                },
                center.addObserverForName(UIApplicationDidBecomeActiveNotification, null, NSOperationQueue.mainQueue) {
                    library.setActive(true)
                },
                center.addObserverForName(AVAudioSessionInterruptionNotification, null, NSOperationQueue.mainQueue) {
                    library.song.player.pause()
                },
            )
            onDispose {
                observers.forEach(center::removeObserver)
                library.release()
            }
        }
        LibraryApp(library, onPickAudio, onPickLyrics, onSample)
    }
