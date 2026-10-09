# Add project specific ProGuard rules here.
# By default, the flags in this file are appended to flags specified
# in /usr/local/Cellar/android-sdk/24.3.3/tools/proguard/proguard-android.txt
# You can edit the include path and order by changing the proguardFiles
# directive in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# react-native-reanimated
-keep class com.swmansion.reanimated.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Add any project specific keep options here:

# JNA references desktop AWT APIs that are unavailable and unused on Android.
-dontwarn java.awt.Component
-dontwarn java.awt.GraphicsEnvironment
-dontwarn java.awt.HeadlessException
-dontwarn java.awt.Window

# Expo creates GLView through reflection; it does not extend ExpoView.
-keep class expo.modules.gl.GLView {
    public <init>(android.content.Context, expo.modules.kotlin.AppContext);
}

# Worklets reads this React Native field reflectively during teardown.
-keepclassmembers class com.facebook.react.bridge.queue.MessageQueueThreadImpl {
    boolean mIsFinished;
}

# expo-gl JNI resolves this method by its original name.
-keepclassmembers class expo.modules.gl.GLContext {
    public void flush();
}
