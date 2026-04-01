#!/bin/bash
# ============================================================
# use-localhost.sh
# 최초 1회 실행 — API_BASE_URL을 LAN IP 대신 localhost로 변경
# 이후 IP가 바뀌어도 재빌드 불필요. adb reverse만 실행하면 됨.
# 사용법: ./scripts/use-localhost.sh
# ============================================================

set -e

ENV_FILE=".env"

if [ ! -f "$ENV_FILE" ]; then
  echo "❌ .env 파일 없음"
  exit 1
fi

CURRENT=$(grep "^API_BASE_URL=" "$ENV_FILE" | cut -d'=' -f2)
TARGET="http://localhost:3000"

if [ "$CURRENT" = "$TARGET" ]; then
  echo "✅ 이미 localhost 설정되어 있음: $CURRENT"
  exit 0
fi

echo "현재: $CURRENT"
echo "변경: $TARGET"
echo ""

sed -i '' "s|^API_BASE_URL=.*|API_BASE_URL=http://localhost:3000|" "$ENV_FILE"
echo "✅ .env 업데이트 완료"

echo ""
echo "⚠️  react-native-config는 빌드 시 값을 고정하므로 재빌드가 필요합니다:"
echo ""
echo "   cd android && ./gradlew clean && cd .."
echo "   npx react-native run-android"
echo ""
echo "이후부터는 IP가 바뀌어도 ./scripts/dev-setup.sh 만 실행하면 됩니다."
