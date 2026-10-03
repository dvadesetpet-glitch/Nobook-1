# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

-dontwarn org.slf4j.impl.StaticLoggerBinder

# JS bridges: WebView calls these by name through reflection.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keep class com.ycngmn.nobook.utils.jsBridge.** { *; }

# Room entities and database (reflection / generated code)
-keep class com.ycngmn.nobook.data.local.** { *; }

# Readable crash traces
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
