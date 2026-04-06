#!/usr/bin/env bash
set -euo pipefail

echo "[1/3] Static checks (TypeScript + ESLint)"
bash .claude/scripts/verify.sh

echo "[2/3] Unit tests"
npm test -- --passWithNoTests

echo "[3/4] Android Debug APK smoke check"
(cd android && ./gradlew :app:assembleDebug --no-daemon)

echo "[4/4] Android Release AAB smoke check (서명/난독화 포함)"
if [ -n "${KEYSTORE_PATH:-}" ]; then
  (cd android && ./gradlew :app:bundleRelease --no-daemon)
  AAB_PATH="android/app/build/outputs/bundle/release/app-release.aab"
  if [ ! -f "$AAB_PATH" ]; then
    echo "❌ Release AAB not found at $AAB_PATH"
    exit 1
  fi
  echo "  ✓ Release AAB built: $(ls -lh "$AAB_PATH" | awk '{print $5}')"
else
  echo "  ⚠ KEYSTORE_PATH not set — Release AAB verification skipped (CI에서만 실행)"
fi

echo "✅ Android release preflight verification passed"
