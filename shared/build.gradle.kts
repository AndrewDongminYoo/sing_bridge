import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    alias(libs.plugins.kotlin.multiplatform)
    alias(libs.plugins.android.multiplatform.library)
    alias(libs.plugins.compose.multiplatform)
    alias(libs.plugins.compose.compiler)
}

val generateYouTubeConfig by tasks.registering {
    val localConfig = rootProject.file("local.properties")
    val outputDirectory = layout.buildDirectory.dir("generated/youtubeConfig/commonMain")
    inputs.files(provider { listOf(localConfig).filter { it.exists() } })
    outputs.dir(outputDirectory)
    doLast {
        val config = Properties()
        if (localConfig.exists()) localConfig.inputStream().use { config.load(it) }
        val apiKey = config.getProperty("YOUTUBE_API_KEY", "").trim()
        require(apiKey.isEmpty() || Regex("[A-Za-z0-9_-]{1,200}").matches(apiKey)) {
            "YOUTUBE_API_KEY has an unsupported format"
        }
        val output = outputDirectory.get().file("YouTubeConfig.kt").asFile
        output.parentFile.mkdirs()
        output.writeText(
            "package io.github.andrewdongminyoo.singbridge\n\n" +
                "internal const val youtubeDataApiKey: String = \"$apiKey\"\n",
        )
    }
}

kotlin {
    android {
        namespace = "io.github.andrewdongminyoo.singbridge.shared"
        compileSdk = 36
        minSdk = 26
        androidResources.enable = true
        compilerOptions.jvmTarget.set(JvmTarget.JVM_17)
    }
    jvm {
        compilerOptions.jvmTarget.set(JvmTarget.JVM_17)
    }
    listOf(iosArm64(), iosSimulatorArm64()).forEach {
        it.binaries.framework {
            baseName = "Shared"
            isStatic = true
        }
    }
    sourceSets {
        getByName("commonMain").kotlin.srcDir(generateYouTubeConfig)
        commonMain.dependencies {
            implementation(libs.compose.runtime)
            implementation(libs.compose.foundation)
            implementation(libs.compose.material3)
            implementation(libs.compose.resources)
            implementation(libs.kotlinx.coroutines.core)
        }
        commonTest.dependencies {
            implementation(kotlin("test"))
        }
        androidMain.dependencies {
            implementation(libs.androidx.media3.exoplayer)
        }
    }
}

compose.resources {
    packageOfResClass = "io.github.andrewdongminyoo.singbridge.resources"
}
