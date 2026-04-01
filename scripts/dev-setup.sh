#!/bin/bash
# ============================================================
# dev-setup.sh
# 기기 연결 후 매번 실행 — APK 설치(선택) + adb reverse + 앱 재시작
# 사용법:
#   ./scripts/dev-setup.sh          # adb reverse + 앱 재시작만
#   ./scripts/dev-setup.sh install  # APK 재설치 + adb reverse + 앱 재시작
# ============================================================

set -e

APK_PATH="android/app/build/outputs/apk/debug/app-debug.apk"

echo "📱 NearPrice 개발 환경 설정 시작..."

# 1. 기기 연결 확인 (최대 10초 대기)
for i in {1..10}; do
  DEVICE=$(adb devices 2>/dev/null | grep -v "List of" | grep "device$" | awk '{print $1}')
  if [ -n "$DEVICE" ]; then break; fi
  echo "  기기 대기 중... ($i/10)"
  sleep 1
done

if [ -z "$DEVICE" ]; then
  echo "❌ 연결된 Android 기기 없음 — USB 케이블 확인"
  exit 1
fi
echo "✅ 기기 연결 확인: $DEVICE"

# 2. APK 설치 (install 인자 있을 때만)
if [ "$1" = "install" ]; then
  if [ ! -f "$APK_PATH" ]; then
    echo "❌ APK 없음: $APK_PATH"
    echo "   먼저 빌드를 실행하세요: cd android && ./gradlew assembleDebug && cd .."
    exit 1
  fi
  echo "📦 APK 설치 중..."
  adb install -r "$APK_PATH"
  echo "✅ APK 설치 완료"
fi

# 3. adb reverse 설정 (Metro + API)
adb reverse tcp:8081 tcp:8081
adb reverse tcp:3000 tcp:3000
echo "✅ adb reverse 설정 완료 (8081 Metro / 3000 API)"

# 4. 앱 재시작
adb shell am force-stop com.nearpriceapp 2>/dev/null || true
sleep 0.5
adb shell am start -n com.nearpriceapp/.MainActivity > /dev/null
echo "✅ 앱 재시작 완료"

echo ""
echo "🎉 설정 완료!"
echo "   Metro가 실행 중이 아니라면: npx react-native start"
