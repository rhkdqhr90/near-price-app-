# 마실앱 (NearPrice) — AI 컨텍스트 파일

> **이 파일은 AI가 작업을 시작하기 전 반드시 먼저 읽어야 합니다.**
> 하네스 방법론 기반 | 최종 수정: 2026-04-02

---

## 앱 개요 및 핵심 목적

**앱 이름**: 마실앱 (패키지명: `com.nearpriceapp`)
**핵심 가치**: "내가 살 거 제일 싼 데가 어디야"
**사용자 경험 흐름**: 검색 → 가격 순위 확인 → 제일 싼 매장으로 이동

오프라인 생활권(1~10km 반경)에서 실제 매장의 최저가를 크라우드소싱 방식으로 수집·비교하는 Android/iOS 앱.
사용자가 직접 가격을 등록(카메라 OCR 또는 수동 입력)하고, 다른 사용자가 등록한 가격을 검색·비교한다.

---

## 플랫폼 및 Android 버전 지원

| 항목 | 값 |
|------|-----|
| minSdkVersion | 24 (Android 7.0 Nougat) |
| targetSdkVersion | 36 |
| compileSdkVersion | 36 |
| buildToolsVersion | 36.0.0 |
| Kotlin | 2.1.20 |
| NDK | 27.1.12297006 |
| React Native | 0.84.1 |
| TypeScript | 5.8.3 |

**중요**: `play-services-location`은 **20.0.0으로 고정**한다.
- react-native-geolocation-service가 18.x 기준 컴파일됨
- 21.x부터 `FusedLocationProviderClient`가 interface로 변경 → `IncompatibleClassChangeError` 발생

---

## 의도적 설계 결정 (변경 전 반드시 이유 확인)

### 1. 카카오 지도/로컬 API 사용 금지
카카오 Developers 심사 탈락으로 `OPEN_MAP_AND_LOCAL` 서비스 비활성화됨.
`kakao-local.api.ts`는 삭제 예정. 지도/위치 검색은 **Naver API만** 사용.

### 2. 지도: Naver Map SDK (`@mj-studio/react-native-naver-map`)
- 역지오코딩: `maps.apigw.ntruss.com/map-reversegeocode/v2`
- 주소→좌표: `maps.apigw.ntruss.com/map-geocode/v2/geocode`
- 매장 검색: `openapi.naver.com` (Naver Search API)

### 3. OCR: Google ML Kit v2 온디바이스
네트워크 없이 기기에서 직접 텍스트 인식. 서버 전송 불가.

### 4. 인증 저장소: Keychain (react-native-keychain)
JWT 토큰을 **AsyncStorage에 저장하지 않는다**. Keychain 전용.
기존 AsyncStorage 토큰은 앱 재실행 시 자동 마이그레이션 후 삭제.

### 5. 상태 관리 역할 분리
- **서버 상태**: React Query (`useQuery`, `useMutation`) — 절대 Zustand에 서버 데이터 캐싱 금지
- **클라이언트 상태**: Zustand — 인증, 위치, 네트워크, 알림, 토스트

### 6. ErrorBoundary만 클래스 컴포넌트 허용
React의 `getDerivedStateFromError` / `componentDidCatch` 제약.
`src/components/common/ErrorBoundary.tsx` 한 파일에만 한정.

### 7. 탭 중앙 FAB 버튼 (가격등록)
`PriceRegisterStack` 탭은 `tabBarButton`에 커스텀 `FABTabButton` 렌더링.
탭 레이블/아이콘이 null이며 `tabBarStyle: display: none` 처리된 상태다.
FAB 버튼의 `fontFamily`를 설정하지 않는다 — PJS 폰트의 `+` 글리프 메트릭이 수직 중앙에서 어긋남.

---

## 절대 변경 금지 사항

1. **`play-services-location` 버전 20.0.0** — 21.x로 올리면 크래시
2. **카카오 지도/로컬 API 신규 추가** — 심사 탈락 상태
3. **AsyncStorage에 JWT 저장** — Keychain 전용
4. **컴포넌트에서 직접 axios 호출** — 반드시 `src/api/` 레이어 경유
5. **서버 상태를 Zustand에 캐싱** — React Query 전용
6. **ErrorBoundary 외 클래스 컴포넌트 작성**
7. **인라인 스타일 사용** — `StyleSheet.create` 전용
8. **하드코딩 색상/간격/타이포** — `theme/` 토큰 전용
9. **FlatList keyExtractor에 index 사용** — 고유 ID 필수
10. **ScrollView 안에 FlatList 중첩** — `ListHeaderComponent` 사용

---

## 주요 화면/기능 구조 요약

### 네비게이션 진입 로직 (RootNavigator)
```
앱 시작
├── 온보딩 미완료 → OnboardingNavigator (권한 동의)
├── 인증 O + 위치 설정 O → MainTabNavigator
└── 그 외 → AuthStack (로그인 + 동네 설정)
```

### 메인 탭 구조
| 탭 | 화면 | 설명 |
|----|------|------|
| 홈 | HomeScreen, SearchScreen | 검색, 피드 |
| 전단지 | FlyerScreen, FlyerDetailScreen | 마트 전단지 뷰어 |
| **가격등록(FAB)** | StoreSelect → InputMethod → Camera → OcrResult → ItemDetail → Confirm | 핵심 플로우 |
| 찜 | WishlistScreen | 찜한 가격 목록 |
| MY | MyPageScreen + 하위 11개 화면 | 프로필, 설정, 공지, FAQ 등 |

### 가격 등록 플로우 (핵심 기능)
```
StoreSelectScreen (매장 선택/등록)
→ InputMethodScreen (카메라 or 수동 선택)
→ [카메라] CameraScreen → OcrResultScreen → ItemDetailScreen
→ [수동] ItemDetailScreen
→ ConfirmScreen (최종 확인 및 저장)
```

---

## 권한 처리 방식

### 요청 시점
- **앱 최초 실행**: OnboardingNavigator → `PermissionScreen.tsx` (일괄 요청)
- **앱 재실행**: `useAppPermissions` 훅 → `PermissionsAndroid.requestMultiple` 호출

### 권한 목록
| 권한 | 용도 |
|------|------|
| `ACCESS_FINE_LOCATION` | GPS 현재 위치, 반경 내 매장 검색 |
| `ACCESS_COARSE_LOCATION` | 대략적 위치 (백업) |
| `CAMERA` | 가격표 촬영 (Vision Camera + ML Kit OCR) |
| `POST_NOTIFICATIONS` | FCM 푸시 알림 |
| `INTERNET` | API 통신 |
| `VIBRATE` | 피드백 진동 |

### 위치 처리 패턴
- GPS 좌표는 `locationStore`에 영구 저장 (AsyncStorage)
- 반경 옵션: 1km / 3km / 5km / 10km (기본값 10km)
- 위치 미설정 시 → AuthStack으로 리다이렉트

---

## API 구조

**Base URL (dev)**: `http://10.0.2.2:3000` (Android 에뮬레이터)
**인증**: `Authorization: Bearer {JWT}`

### 토큰 갱신 전략
- `apiClient` 인터셉터에서 401 감지 → `isRefreshing` 플래그로 중복 갱신 방지
- 대기열 최대 10개 (`MAX_FAILED_QUEUE_SIZE`)
- 갱신 실패 시 → `queryClient.clear()` + `logout()`

---

## 공통 개발 커맨드

```bash
# Android 물리 기기 실행
cd android && ./gradlew clean && cd ..
npx react-native start --reset-cache   # 별도 터미널
npx react-native run-android
adb reverse tcp:8081 tcp:8081          # 반드시 실행

# APK 경로: android/app/build/outputs/apk/debug/app-debug.apk
# 기기 연결 끊긴 경우: adb install -r <apk경로> → adb reverse tcp:8081 tcp:8081
```

---

## 검증 파이프라인 (완료 전 필수)

작업 완료 전 아래 순서로 반드시 검증:

1. `.claude/scripts/verify.sh` 실행 (TypeScript + ESLint)
2. `rn-reviewer` Agent 코드 리뷰 (CRITICAL/WARNING 이슈 수정)
3. 자체 체크리스트 10개 확인
4. 완료 보고 형식 준수

---

## 참조 문서

- `PROJECT.md` — 기술 스택 및 아키텍처 상세
- `PROGRESS.md` — 개발 현황 및 이슈 트래킹
- `DESIGN_SYSTEM.md` — UI 컴포넌트 스펙, 색상/타이포 토큰
- `~/Projects/near-price-api/CLAUDE.md` — 백엔드 컨텍스트
- `~/Projects/docs/NearPrice_v3.0.docx` — 기획서
