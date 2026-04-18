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

-dontwarn com.kakao.**
-dontwarn com.naver.maps.**
-dontwarn com.google.mlkit.**
-dontwarn com.swmansion.**
