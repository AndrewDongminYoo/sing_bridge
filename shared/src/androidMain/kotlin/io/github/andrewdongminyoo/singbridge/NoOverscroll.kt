package io.github.andrewdongminyoo.singbridge

import androidx.compose.foundation.LocalOverscrollFactory
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider

// Android screens scroll without the Material stretch at either end (#75); iOS keeps its own bounce.
@Composable
fun NoOverscroll(content: @Composable () -> Unit) {
    CompositionLocalProvider(LocalOverscrollFactory provides null, content)
}
