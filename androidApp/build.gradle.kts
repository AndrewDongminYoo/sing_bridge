plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
}

android {
    namespace = "io.github.andrewdongminyoo.singbridge"
    compileSdk = 36
    defaultConfig {
        applicationId = "io.github.andrewdongminyoo.singbridge"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1.0"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures.compose = true
    testOptions.emulatorControl.enable = true
}

dependencies {
    implementation(project(":shared"))
    implementation(libs.androidx.activity.compose)
    androidTestImplementation(libs.androidx.test.runner)
    androidTestImplementation(libs.androidx.test.junit)
}

// AGP 9.1.1 creates these internal configurations lazily. Recheck this exact
// allowlist and tools/verify_utp_security.py when upgrading AGP; names are not public API.
val utpPrefix = "_internal-unified-test-platform-"
val utpGuavaConfigurations = setOf(
    "android-device-provider-ddmlib",
    "android-driver-instrumentation",
    "android-test-plugin",
    "android-test-plugin-host-additional-test-output",
    "android-test-plugin-host-apk-installer",
    "android-test-plugin-host-coverage",
    "android-test-plugin-host-device-info",
    "android-test-plugin-host-emulator-control",
    "android-test-plugin-host-logcat",
    "android-test-plugin-result-listener-gradle",
    "core",
    "gradle-work-action",
    "launcher",
).map { utpPrefix + it }.toSet()
val utpNettyConfigurations = setOf(
    utpPrefix + "android-test-plugin-host-emulator-control",
    utpPrefix + "core",
)
val utpNettyModules = listOf(
    "buffer",
    "codec",
    "codec-http",
    "codec-http2",
    "codec-socks",
    "common",
    "handler",
    "handler-proxy",
    "resolver",
    "transport",
    "transport-native-unix-common",
)
configurations.configureEach {
    if (name in utpGuavaConfigurations) {
        project.dependencies.constraints.add(name, "com.google.guava:guava:33.7.2-jre")
    }
    if (name in utpNettyConfigurations) {
        utpNettyModules.forEach { module ->
            project.dependencies.constraints.add(name, "io.netty:netty-$module:4.1.137.Final")
        }
    }
    if (name == utpPrefix + "android-test-plugin-result-listener-gradle") {
        listOf("bcpkix-jdk18on", "bcprov-jdk18on", "bcutil-jdk18on").forEach { module ->
            project.dependencies.constraints.add(name, "org.bouncycastle:$module:1.85")
        }
        project.dependencies.constraints.add(name, "org.apache.httpcomponents:httpclient:4.5.13")
        project.dependencies.constraints.add(name, "org.apache.commons:commons-lang3:3.18.0")
    }
}
