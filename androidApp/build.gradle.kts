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
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildFeatures.compose = true
}

dependencies {
    implementation(project(":shared"))
    implementation(libs.androidx.activity.compose)
}
