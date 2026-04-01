# 출시 전 직접 처리 항목

> 코드로 해결 불가 — 개발자가 직접 해야 하는 것들
> 최종 업데이트: 2026-03-30

---

## P0 — 안 하면 출시 불가

### 1. Release Keystore 생성
```bash
cd near-price-app/android/app
keytool -genkeypair -v \
  -keystore near-price-release.keystore \
  -alias near-price-key \
  -keyalg RSA -keysize 2048 \
  -validity 10000
```
생성 후 `android/gradle.properties`에 추가:
```
KEYSTORE_PATH=./app/near-price-release.keystore
KEYSTORE_PASSWORD=<비밀번호>
KEY_ALIAS=near-price-key
KEY_PASSWORD=<비밀번호>
```
> ⚠️ `near-price-release.keystore`는 절대 git 커밋 금지. 분실 시 Play Store 앱 업데이트 불가.

---

### 2. 카카오 개발자 콘솔 키해시 등록
1. Release keystore SHA-256 추출:
   ```bash
   keytool -list -v -keystore near-price-release.keystore -alias near-price-key
   ```
2. https://developers.kakao.com → 내 앱 → 플랫폼 → Android
3. 패키지명: `com.nearpriceapp`
4. 키해시: 위에서 추출한 SHA-256 값 입력

---

### 3. 위치기반서비스 사업자 신고
- 근거: 위치정보의 보호 및 이용 등에 관한 법률 제9조
- 방법: 방송통신위원회 신고 (https://www.lbsreg.kr)
- 대상: 위치정보를 수집·이용하는 모든 앱 (NearPrice는 동네 기반 위치 수집)
- 미신고 시 3천만원 이하 과태료

---

### 4. 개인정보처리방침 웹 URL 확보
- Play Store 등록 시 URL 필드 필수
- 방법: GitHub Pages, Notion, 자체 서버 등에 게시
- 앱 내 PrivacyPolicyScreen 내용을 웹으로도 공개해야 함

---

### 5. 이용약관 웹 URL 확보
- 4번과 동일 방법으로 웹 게시

---

### 6. 프로덕션 서버 배포
- 백엔드 `https://api.nearprice.kr` 배포
- DB 마이그레이션 실행: `npm run typeorm:migration:run`
- 환경변수 설정 (`deploy/.env.example` 참고)

---

### 7. GitHub Secrets 등록 (CI/CD 자동 빌드용)
Keystore 생성 후 등록:
```
KEYSTORE_BASE64    = base64로 인코딩한 keystore 파일 내용
KEYSTORE_PASSWORD  = keystore 비밀번호
KEY_ALIAS          = near-price-key
KEY_PASSWORD       = key 비밀번호
```
인코딩 방법: `base64 -i near-price-release.keystore | pbcopy`

---

## P1 — 출시 전 권장

### 8. Sentry DSN 설정
1. https://sentry.io 에서 React Native 프로젝트 생성
2. `android/sentry.properties` 파일에 값 채우기:
   - `defaults.org`, `defaults.project`, `auth.token`
3. `sentry.properties`는 git 커밋 금지 (`.gitignore` 확인)

---

### 9. google-services.json 프로덕션 파일 확인
- 현재 파일이 프로덕션 Firebase 프로젝트 파일인지 확인
- FCM 발신자 ID가 API 서버의 Firebase 설정과 일치하는지 확인

---

### 10. 앱 아이콘 커스텀 여부 확인
- 현재 `mipmap-*/ic_launcher.png`가 기본 RN 아이콘일 수 있음
- 실제 NearPrice 브랜드 아이콘으로 교체 필요
- 필요 해상도: mdpi(48), hdpi(72), xhdpi(96), xxhdpi(144), xxxhdpi(192)

---

### 11. Play Store 등록정보 준비
- 앱 이름 확정
- 짧은 설명 (80자 이하)
- 긴 설명 (4000자 이하)
- 스크린샷 최소 2장 (홈, 가격비교, 가격등록 권장)
- 피처드 이미지 1024×500
- 앱 아이콘 512×512 PNG
- 콘텐츠 등급 설문 (IARC)

---

## P2 — 출시 이후

- iOS: Xcode 설정, Apple Developer 인증서, App Store Connect 등록
- DB 백업 스케줄 설정
- 모니터링 알림 설정 (Sentry 이메일 알림 등)
