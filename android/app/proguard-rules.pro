# Keep runtime metadata used by Android/React Native reflection paths.
-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*
-keepattributes RuntimeVisibleAnnotations,RuntimeVisibleParameterAnnotations,AnnotationDefault

# React Native / JNI bridge
-keep class com.facebook.react.** { *; }
-keep class com.facebook.jni.** { *; }

# Camera / image / keychain libs used in release flows
-keep class com.mrousavy.camera.** { *; }
-keep class com.imagepicker.** { *; }
-keep class com.oblador.keychain.** { *; }

# Kakao + Naver SDKs
-keep class com.kakao.** { *; }
-keep class com.naver.maps.** { *; }

# Retrofit/OkHttp metadata required by Kakao SDK reflective API calls.
# Rules below follow Square's official Retrofit R8 full-mode guidance:
# https://github.com/square/retrofit/blob/trunk/retrofit/src/main/resources/META-INF/proguard/retrofit2.pro
-keepattributes RuntimeInvisibleAnnotations,RuntimeInvisibleParameterAnnotations

-keep class retrofit2.** { *; }
-keep class okhttp3.** { *; }
-keep class okio.** { *; }

# Keep Retrofit service method parameters
-keepclassmembers,allowshrinking,allowobfuscation interface * {
    @retrofit2.http.* <methods>;
}

# R8 full mode: keep interfaces declaring @GET/@POST/etc so Retrofit can Proxy them
-if interface * { @retrofit2.http.* <methods>; }
-keep,allowobfuscation interface <1>

# R8 full mode strips generic signatures from non-kept types — keep Retrofit generics
-keep,allowobfuscation,allowshrinking interface retrofit2.Call
-keep,allowobfuscation,allowshrinking class retrofit2.Response
-keep,allowobfuscation,allowshrinking class kotlin.coroutines.Continuation

# Retrofit Kotlin extension helpers
-dontwarn retrofit2.KotlinExtensions
-dontwarn retrofit2.KotlinExtensions$*
-dontwarn org.codehaus.mojo.animal_sniffer.IgnoreJRERequirement
-dontwarn javax.annotation.**

# Firebase + ML Kit wrappers
-keep class com.google.firebase.** { *; }
-keep class com.google.firebase.messaging.** { *; }
-keep class io.invertase.firebase.** { *; }
-keep class com.google.mlkit.** { *; }

# Sentry
-keep class io.sentry.** { *; }

# Reanimated / Worklets (네이티브 메서드 reflection 사용)
-keep class com.swmansion.reanimated.** { *; }
-keep class com.swmansion.worklets.** { *; }
-keep class com.facebook.react.turbomodule.** { *; }

# Gesture Handler
-keep class com.swmansion.gesturehandler.** { *; }

# react-native-screens
-keep class com.swmansion.rnscreens.** { *; }

# react-native-geolocation-service
-keep class com.agontuk.RNFusedLocation.** { *; }

# react-native-config
-keep class com.lugg.RNCConfig.** { *; }
-keep class com.nearpriceapp.BuildConfig { *; }

# Glide (used internally by @d11/react-native-fast-image v8)
# 어노테이션 기반 모듈 등록을 R8이 못 찾으면 런타임 NPE — keep 필수.
-keep public class * extends com.bumptech.glide.module.AppGlideModule
-keep class com.bumptech.glide.GeneratedAppGlideModuleImpl
-keep class * implements com.bumptech.glide.module.GlideModule
-keep class * extends com.bumptech.glide.module.LibraryGlideModule
-keep public enum com.bumptech.glide.load.ImageHeaderParser$** {
    **[] $VALUES;
    public *;
}
# @d11/react-native-fast-image — 패키지 namespace는 d11 포크에서도 com.dylanvann.fastimage 유지.
-keep class com.dylanvann.fastimage.** { *; }

-dontwarn com.kakao.**
-dontwarn com.naver.maps.**
-dontwarn com.google.mlkit.**
-dontwarn com.swmansion.**
-dontwarn retrofit2.**
-dontwarn okhttp3.**
-dontwarn okio.**
-dontwarn com.bumptech.glide.**
