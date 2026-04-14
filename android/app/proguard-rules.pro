# Keep runtime metadata used by Android/React Native reflection paths.
-keepattributes Signature,InnerClasses,EnclosingMethod,*Annotation*

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

# Firebase + ML Kit wrappers
-keep class com.google.firebase.** { *; }
-keep class io.invertase.firebase.** { *; }
-keep class com.google.mlkit.** { *; }

# Sentry
-keep class io.sentry.** { *; }

-dontwarn com.kakao.**
-dontwarn com.naver.maps.**
-dontwarn com.google.mlkit.**
