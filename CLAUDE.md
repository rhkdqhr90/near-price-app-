# NearPrice Frontend (near-price-app)

## 프로젝트 개요
크라우드소싱 + 자동화 하이브리드 가격 비교 앱의 모바일 클라이언트.
핵심 가치: "내가 살 거 제일 싼 데가 어디야"
사용자 경험: "검색 → 가격 순위 확인 → 제일 싼 데로 간다"

## 기술 스택
- React Native CLI (Bare workflow) + TypeScript
- 상태관리: Zustand (클라이언트 상태) + React Query (서버 상태)
- 네비게이션: React Navigation (Bottom Tab + Stack)
- OCR: Google ML Kit v2 (온디바이스)
- 지도: Naver Map SDK (`@mj-studio/react-native-naver-map`) — NCP 키 사용
- 역지오코딩 (좌표→동이름): Naver Reverse Geocoding API (`maps.apigw.ntruss.com/map-reversegeocode/v2`)
- 주소검색 (텍스트→좌표): Naver Geocoding API (`maps.apigw.ntruss.com/map-geocode/v2/geocode`)
- 매장검색: Naver Search API (`openapi.naver.com`)
- ⛔ 카카오 지도/로컬 API 사용 금지 — Kakao Developers 심사 탈락으로 OPEN_MAP_AND_LOCAL 서비스 비활성화됨. kakao-local.api.ts 의존 코드 전면 교체 완료 후 삭제 예정
- 인증: 카카오 OAuth → JWT Bearer 토큰
- HTTP: Axios


## 백엔드 API
- Base URL (개발): http://10.0.2.2:3000 (Android 에뮬레이터)
- 인증 헤더: Authorization: Bearer {jwt_token}
- 백엔드 프로젝트: ~/Projects/near-price-api/

## 디렉토리 구조
```
src/
├── api/                    # API 호출 레이어 (Axios)
│   ├── client.ts           # Axios 인스턴스 (인터셉터, 토큰 주입)
│   ├── auth.api.ts
│   ├── price.api.ts
│   ├── product.api.ts
│   ├── store.api.ts
│   ├── wishlist.api.ts
│   ├── verification.api.ts # 신뢰도 검증 API
│   └── badge.api.ts        # 뱃지 API
├── components/             # 재사용 컴포넌트
│   ├── common/             # 공통 UI 컴포넌트
│   │   ├── Button.tsx      # 다중 variant 버튼 (primary/secondary/outline/ghost)
│   │   ├── SkeletonCard.tsx # 로딩 상태 스켈레톤 카드
│   │   ├── SkeletonBox.tsx # 기본 스켈레톤 박스
│   │   ├── MenuItem.tsx    # 메뉴 항목 (아이콘 + 텍스트 + 화살표)
│   │   ├── OfflineBanner.tsx # 오프라인 배너
│   │   ├── Toast.tsx       # 토스트 알림 (success/warning/error)
│   │   ├── ReportSheet.tsx # 신고 바텀시트
│   │   ├── EmptyState.tsx  # 빈 상태 화면
│   │   ├── ErrorView.tsx   # 에러 상태 화면
│   │   ├── LoadingView.tsx # 로딩 상태 화면
│   │   ├── HighlightText.tsx # 강조 텍스트
│   │   └── index.tsx       # 배럴 export
│   ├── icons/              # SVG 아이콘 컴포넌트
│   │   ├── CloseIcon.tsx   # X 아이콘
│   │   ├── StoreIcon.tsx   # 매장 아이콘
│   │   ├── MapPinIcon.tsx  # 위치 아이콘
│   │   ├── SearchIcon.tsx  # 검색 아이콘
│   │   ├── CheckIcon.tsx   # 체크마크
│   │   ├── HeartIcon.tsx   # 찜(하트) 아이콘
│   │   ├── HomeIcon.tsx    # 홈 아이콘
│   │   ├── CameraIcon.tsx  # 카메라 아이콘
│   │   ├── ChevronIcon.tsx # 화살표 아이콘
│   │   └── (... 기타 SVG)
│   ├── map/                # 지도 관련 컴포넌트
│   │   └── PriceMapView.tsx # 네이버맵 통합
│   └── price/              # 가격 관련 컴포넌트
│       ├── PriceRankCard.tsx # 가격 순위 카드
│       └── (... 기타)
├── hooks/                  # 커스텀 훅
│   ├── useAuth.ts         # 인증 상태 및 로직
│   ├── useLocation.ts     # 위치 정보 훅
│   └── queries/            # React Query 훅
│       ├── useProductPrices.ts
│       ├── usePriceVerifications.ts # 신뢰도 검증 쿼리
│       ├── useBadges.ts   # 뱃지 쿼리
│       └── (... 기타)
├── navigation/             # 네비게이션 설정
│   ├── RootNavigator.tsx   # 최상위 Stack (비로그인/로그인)
│   ├── AuthStack.tsx       # 인증 화면 Stack
│   ├── MainTabNavigator.tsx # 로그인 후 Tab + Stack 조합
│   ├── OnboardingNavigator.tsx # 권한 동의 화면
│   └── types.ts            # 네비게이션 param 타입 정의
├── screens/                # 화면 컴포넌트
│   ├── auth/               # 인증 관련 화면
│   │   ├── LoginScreen.tsx # 카카오 로그인
│   │   └── LocationSetupScreen.tsx # 동네 선택
│   ├── onboarding/         # 온보딩 화면
│   │   └── PermissionScreen.tsx # 카메라/위치/알림 권한 요청
│   ├── home/               # 홈 탭 화면
│   │   ├── HomeScreen.tsx  # 홈 피드
│   │   └── SearchScreen.tsx # 검색 화면
│   ├── price/              # 가격 등록/비교 화면 (복잡한 플로우)
│   │   ├── CameraScreen.tsx # 카메라로 가격표 촬영
│   │   ├── OcrResultScreen.tsx # OCR 인식 결과 확인
│   │   ├── ItemDetailScreen.tsx # 품목 상세 정보 입력 폼
│   │   ├── StoreSelectScreen.tsx # 매장 선택 (지도 포함)
│   │   ├── InputMethodScreen.tsx # 입력 방식 선택 (카메라/수동)
│   │   ├── PriceCompareScreen.tsx # 상품별 가격 비교
│   │   ├── StoreDetailScreen.tsx # 매장 상세 (지도/리뷰)
│   │   └── ConfirmScreen.tsx # 최종 확인 및 저장
│   ├── wishlist/           # 찜목록 탭
│   │   └── WishlistScreen.tsx # 찜 목록
│   └── mypage/             # 마이페이지 탭
│       ├── MyPageScreen.tsx # 사용자 정보/활동 요약
│       ├── MyPriceListScreen.tsx # 내가 등록한 가격
│       ├── LikedPricesScreen.tsx # 내가 인정한 가격
│       ├── NoticeListScreen.tsx # 공지 목록
│       ├── NoticeDetailScreen.tsx # 공지 상세
│       └── FaqScreen.tsx   # FAQ
├── store/                  # Zustand 글로벌 상태
│   ├── authStore.ts        # 인증 (토큰, 유저 정보, 로그인 상태)
│   ├── locationStore.ts    # 위치 (현재 동네, 좌표)
│   └── (... 기타)
├── theme/                  # 디자인 토큰 (Phase 1 완성)
│   ├── colors.ts           # 색상 토큰 (primary, success, warning, danger 등)
│   ├── typography.ts       # 타이포그래피 토큰 (heading-xl, body, price 등)
│   ├── spacing.ts          # 간격 및 반경 토큰 (xs~xxl, radiusSm~Full)
│   └── index.ts            # 배럴 export
├── types/                  # 공유 TypeScript 타입
│   └── api.types.ts        # API 요청/응답 타입 (Product, Price, User, PriceVerification 등)
└── utils/                  # 유틸 함수
    ├── storage.ts          # AsyncStorage 래퍼
    ├── format.ts           # 가격/날짜 포맷팅
    ├── constants.ts        # 상수 (API 경로, 지도 설정 등)
    ├── config.ts           # 환경 설정 (API_BASE_URL, NAVER_CLIENT_ID 등)
    └── highlight.ts        # 텍스트 강조 유틸리티
```

## 설계 원칙
- 상품 가격이 주인공, 매장은 부가 정보
- API 호출은 반드시 api/ 레이어를 통해 (컴포넌트에서 직접 axios 금지)
- 서버 상태는 React Query, 클라이언트 상태는 Zustand (혼용 금지)

## 코딩 규칙 — 절대 위반 금지
1. **함수형 컴포넌트 + hooks만 사용** (class 컴포넌트 금지)
   - **예외**: `ErrorBoundary` — React 제약상 `getDerivedStateFromError` / `componentDidCatch`는 클래스 컴포넌트만 구현 가능. `src/components/common/ErrorBoundary.tsx` 한 파일에만 허용.
2. **컴포넌트 파일명**: PascalCase (PriceCard.tsx)
3. **훅/유틸 파일명**: camelCase (useAuth.ts, format.ts)
4. **인라인 스타일 금지** → StyleSheet.create 사용
5. **any 타입 금지** → 구체적인 인터페이스/타입 정의
6. **console.log 커밋 금지** → 개발 중에만 사용
7. **하드코딩 금지**:
   - 색상: theme/colors.ts 사용 (primary, success, warning, danger, gray* 등)
   - 간격/크기: theme/spacing.ts 사용 (xs, sm, md, lg, xl, radiusMd 등)
   - 타이포그래피: theme/typography.ts 사용 (headingXl, body, price 등)
   - 문자열: utils/constants.ts에 정의
8. **API 호출** → 항상 src/api/ 레이어 경유 (컴포넌트에서 직접 axios 금지)
9. **상태 관리 역할 분리**:
   - 서버 상태 (데이터): React Query (useQuery, useMutation)
   - 클라이언트 상태 (UI, 로그인 정보): Zustand (useAuthStore, useLocationStore)
10. **네비게이션 타입**: src/navigation/types.ts에 먼저 정의 후 사용
11. **접근성 (Accessibility)**:
    - `<Pressable>`, `<TouchableOpacity>`에 `accessibilityRole` 지정
    - 버튼/아이콘에 `accessibilityLabel` 필수
    - 폼 입력에 `accessibilityHint` 권장
    - WCAG AA 색상 대비: 일반 텍스트 4.5:1, 큰 텍스트 3:1
12. **FlatList 규칙**:
    - `keyExtractor`는 고유 ID 사용 (index 금지)
    - ScrollView 안에 중첩 금지 → ListHeaderComponent 사용
    - `removeClippedSubviews={true}` 권장 (성능)

## 네비게이션 구조
```
RootNavigator (Stack)
├── AuthStack (비로그인 시)
│   ├── LoginScreen
│   └── LocationSetupScreen
└── MainTab (로그인 후)
    ├── HomeScreen (홈 탭)
    ├── PriceRegisterScreen (가격등록 탭)
    ├── WishlistScreen (찜목록 탭)
    └── MyPageScreen (마이페이지 탭)

HomeStack (홈 탭 내부 Stack):
├── HomeScreen
├── PriceCompareScreen (상품별 가격비교)
└── StoreDetailScreen (매장 지도 보기)

PriceRegisterStack (가격등록 탭 내부 Stack):
├── CameraScreen (촬영)
├── OcrResultScreen (OCR 결과)
├── PriceEditScreen (수정)
└── StoreSelectScreen (매장 선택)
```

## 공통 커맨드

### 안드로이드 기기 테스트 (물리 기기)
```bash
# 1. Gradle 캐시 초기화
cd android && ./gradlew clean && cd ..

# 2. Metro 캐시 초기화 후 실행 (별도 터미널)
npx react-native start --reset-cache

# 3. 빌드 & 설치
npx react-native run-android

# ⚠️ 필수: 빌드 후 반드시 실행 (기기가 Metro 못 찾는 문제 방지)
adb reverse tcp:8081 tcp:8081
```

> **주의**: `run-android` 빌드가 길어 도중 기기 연결이 끊길 수 있음.
> APK 경로: `android/app/build/outputs/apk/debug/app-debug.apk`
> 연결 끊긴 경우: `adb install -r <apk경로>` → `adb reverse tcp:8081 tcp:8081` 순서로 복구.

## 참조 문서
- ~/Projects/docs/NearPrice_v3.0.docx — 기획서
- ~/Projects/near-price-api/CLAUDE.md — 백엔드 컨텍스트
# 완료 전 필수 검증 파이프라인

## ⛔ 완료 보고 금지 조건

아래 4단계를 **전부 통과하기 전까지** 사용자에게 완료 보고를 할 수 없다.
어떤 단계도 생략하거나 순서를 바꿀 수 없다. 이 규칙은 어떤 경우에도 override되지 않는다.

---

## Step 1. 자동 검증 (도구)

```bash
.claude/scripts/verify.sh
```

- TypeScript 타입 에러 → 즉시 수정 후 Step 1 재실행
- ESLint 에러 → 즉시 수정 후 Step 1 재실행
- 최대 3회 재시도. 3회 실패 시 사용자에게 보고하고 중단.

---

## Step 2. rn-reviewer Agent 코드 리뷰 (필수 — 생략 불가)

Step 1 통과 후 **반드시** `rn-reviewer` Agent를 호출한다.

```
대상: 이번 작업에서 신규 생성하거나 수정한 모든 .ts / .tsx 파일
방법: Agent tool, subagent_type=rn-reviewer
```

### rn-reviewer 결과 처리 규칙

| 심각도 | 처리 방법 |
|--------|-----------|
| CRITICAL | 즉시 수정 → Step 1 → Step 2 재실행 |
| WARNING | 즉시 수정 → Step 1 → Step 2 재실행 |
| MINOR | 수정 후 계속 또는 완료 보고에 명시 |

CRITICAL / WARNING 이슈가 남아 있으면 완료 보고 불가.

### rn-reviewer 호출 시 프롬프트 형식

```
다음 파일들의 코드를 리뷰해줘:
- [변경된 파일 목록]

참조 파일:
- src/types/api.types.ts
- src/navigation/types.ts
- src/utils/theme.ts

확인 항목:
1. import 경로 오류 / 존재하지 않는 파일 참조
2. 네비게이션 params 타입 불일치
3. React Query v5 useMutation / useQuery 사용법
4. useEffect dependency array 누락/과잉
5. null/undefined 처리 누락
6. FlatList keyExtractor 고유값 여부
7. ScrollView 안에 FlatList 중첩 여부
8. StyleSheet 대신 인라인 스타일 사용 여부
9. theme.ts 미사용 하드코딩 색상/수치
10. any 타입 / 불필요한 타입 단언(as) 사용
11. API 호출이 api/ 레이어를 경유하는가
12. 성공/실패 후 네비게이션 로직 정확성
13. 보안: 토큰 노출, 인증 필요 API 미보호
```

---

## Step 3. 자체 검토 체크리스트

rn-reviewer 통과 후 변경 파일 기준으로 직접 확인:

1. [ ] API 호출이 api/ 레이어를 통하는가?
2. [ ] 서버 상태 React Query, 클라이언트 상태 Zustand (혼용 없음)?
3. [ ] 데이터 fetch 화면에 로딩/에러/빈 상태 3개 있는가?
4. [ ] 네비게이션 타입 정의 및 Screen 등록이 맞는가?
5. [ ] StyleSheet.create 사용, 인라인 스타일 없는가?
6. [ ] theme.ts 상수 사용, 하드코딩 색상/수치 없는가?
7. [ ] Props interface 정의되어 있는가?
8. [ ] any 타입 없는가?
9. [ ] console.log 없는가?
10. [ ] code-review-checklist.md 의 사이드이펙트/버그/보안/성능 항목 확인했는가?

하나라도 실패 시 수정 후 Step 1부터 재실행.

---

## Step 4. 완료 보고

아래 형식 그대로 보고. `rn-reviewer` 항목이 없으면 보고 무효.

```
✅ 구현 완료

변경 파일:
- src/screens/home/HomeScreen.tsx (신규)
- src/hooks/queries/usePrices.ts (신규)

검증 결과:
- TypeScript: ✅ 통과
- ESLint: ✅ 통과
- rn-reviewer: ✅ CRITICAL 0건 / WARNING 0건 / MINOR n건
- 빌드: ✅ 통과 (해당 Phase 이상)

자체 검토:
- 코딩 규칙 10개 전부 준수
- 3상태 처리 포함
- 네비게이션 타입 등록 확인
```

---
## 디자인 시스템
UI 구현 시 반드시 DESIGN_SYSTEM.md를 참조한다. 이 문서의 컬러, 타이포, 컴포넌트 스펙을 따르지 않는 코드는 리뷰 실패 처리한다.
