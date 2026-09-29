package io.github.andrewdongminyoo.singbridge

import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

@Composable
fun AppNavigationBar(selectedIndex: Int, onSelect: (Int) -> Unit) {
    MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF235E52), secondaryContainer = Color(0xFFDFEAE3))) {
        NavigationBar(containerColor = Color(0xFFFAF7F0)) {
            listOf("홈", "YouTube", "내 노래").forEachIndexed { index, title ->
                NavigationBarItem(
                    selected = selectedIndex == index,
                    onClick = { onSelect(index) },
                    label = { Text(title) },
                    icon = {
                        Canvas(Modifier.size(24.dp)) {
                            val unit = size.width / 24
                            val ink = Color(0xFF235E52)
                            when (index) {
                                0 -> drawPath(
                                    Path().apply {
                                        moveTo(3 * unit, 11 * unit)
                                        lineTo(12 * unit, 3 * unit)
                                        lineTo(21 * unit, 11 * unit)
                                        lineTo(21 * unit, 21 * unit)
                                        lineTo(3 * unit, 21 * unit)
                                        close()
                                    },
                                    ink,
                                    style = Stroke(2 * unit),
                                )
                                1 -> drawPath(
                                    Path().apply {
                                        moveTo(6 * unit, 3 * unit)
                                        lineTo(21 * unit, 12 * unit)
                                        lineTo(6 * unit, 21 * unit)
                                        close()
                                    },
                                    ink,
                                    style = Stroke(2 * unit),
                                )
                                else -> listOf(5f, 12f, 19f).forEach { y ->
                                    drawCircle(ink, 1.5f * unit, Offset(4 * unit, y * unit))
                                    drawLine(ink, Offset(9 * unit, y * unit), Offset(22 * unit, y * unit), 2 * unit)
                                }
                            }
                        }
                    },
                )
            }
        }
    }
}
