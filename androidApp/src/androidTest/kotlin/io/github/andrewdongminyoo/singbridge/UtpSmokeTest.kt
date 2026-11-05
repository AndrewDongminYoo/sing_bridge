package io.github.andrewdongminyoo.singbridge

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class UtpSmokeTest {
    @Test
    fun installedPackageHasLaunchableActivity() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        assertEquals("io.github.andrewdongminyoo.singbridge", context.packageName)
        val intent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        assertNotNull(intent)
        assertEquals("io.github.andrewdongminyoo.singbridge.MainActivity", intent?.component?.className)
        assertNotNull(context.resources)
    }
}
