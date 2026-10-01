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
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.unit.dp

@Composable
fun AppNavigationBar(selectedIndex: Int, onSelect: (Int) -> Unit) {
    MaterialTheme(colorScheme = lightColorScheme(primary = Color(0xFF235E52), secondaryContainer = Color(0xFFDFEAE3))) {
        // The bar shares the screens' paper color, so a hairline in the page border color marks where it starts (#75).
        NavigationBar(
            modifier = Modifier.drawWithContent {
                drawContent()
                val line = 1.dp.toPx()
                drawLine(Color(0xFFC6D0C9), Offset(0f, line / 2), Offset(size.width, line / 2), line)
            },
            containerColor = Color(0xFFFAF7F0),
        ) {
            listOf("노래 찾기", "연습", "내 노래").forEachIndexed { index, title ->
                NavigationBarItem(
                    selected = selectedIndex == index,
                    onClick = { onSelect(index) },
                    label = { Text(title) },
                    icon = {
                        Canvas(Modifier.size(24.dp)) {
                            val unit = size.width / 24
                            val ink = Color(0xFF235E52)
                            val stroke = Stroke(2 * unit)
                            when (index) {
                                0 -> {
                                    drawCircle(ink, 6.5f * unit, Offset(10 * unit, 10 * unit), style = stroke)
                                    drawLine(ink, Offset(15 * unit, 15 * unit), Offset(21 * unit, 21 * unit), 2 * unit)
                                }
                                1 -> {
                                    drawRoundRect(
                                        ink,
                                        Offset(9 * unit, 2 * unit),
                                        Size(6 * unit, 12 * unit),
                                        CornerRadius(3 * unit),
                                        style = stroke,
                                    )
                                    drawArc(
                                        ink,
                                        0f,
                                        180f,
                                        false,
                                        Offset(5 * unit, 6 * unit),
                                        Size(14 * unit, 12 * unit),
                                        style = stroke,
                                    )
                                    drawLine(ink, Offset(12 * unit, 18 * unit), Offset(12 * unit, 22 * unit), 2 * unit)
                                }
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
