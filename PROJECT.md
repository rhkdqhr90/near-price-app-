# 마실앱 — 기술 문서 (PROJECT.md)

> 하네스 방법론 기반 | 최종 수정: 2026-04-02

---

## 기술 스택

### 코어
| 항목 | 버전 | 역할 |
|------|------|------|
| React Native CLI (Bare) | 0.84.1 | 크로스플랫폼 모바일 프레임워크 |
| TypeScript | 5.8.3 | 타입 안전성 |
| Node.js | ≥ 22.11.0 | 빌드 환경 |
| Kotlin | 2.1.20 | Android 네이티브 레이어 |

### 상태 관리
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| Zustand | ^5.0.11 | 클라이언트 상태 (인증, 위치, UI) |
| TanStack React Query | ^5.90.21 | 서버 상태, 캐싱, 비동기 처리 |

### 네비게이션
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| @react-navigation/native | ^7.1.33 | 네비게이션 코어 |
| @react-navigation/native-stack | ^7.14.5 | 스택 네비게이터 |
| @react-navigation/bottom-tabs | ^7.15.5 | 탭 네비게이터 |

### UI / 애니메이션
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| react-native-reanimated | ^4.2.2 | 고성능 애니메이션 |
| react-native-gesture-handler | ^2.30.0 | 제스처 처리 |
| @gorhom/bottom-sheet | ^5.2.8 | 바텀시트 |
| react-native-linear-gradient | ^2.8.3 | 그라디언트 (FAB 버튼 등) |
| react-native-safe-area-context | ^5.5.2 | Safe Area 처리 |
| react-native-screens | ^4.24.0 | 네이티브 화면 최적화 |
| react-native-svg | ^15.15.3 | SVG 아이콘 렌더링 |
| react-native-skeleton-placeholder | ^5.2.4 | 스켈레톤 로딩 UI |

### 지도 / 위치
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| @mj-studio/react-native-naver-map | ^2.7.0 | 네이버 지도 SDK |
| react-native-geolocation-service | ^5.3.1 | GPS 위치 조회 |

### 카메라 / OCR
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| react-native-vision-camera | ^4.7.3 | 카메라 기능 |
| @react-native-ml-kit/text-recognition | ^2.0.0 | 온디바이스 OCR (Google ML Kit v2) |
| react-native-image-picker | ^8.2.1 | 갤러리 이미지 선택 |

### 통신 / 인증
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| axios | ^1.13.6 | HTTP 클라이언트 |
| @react-native-seoul/kakao-login | ^5.4.2 | 카카오 OAuth 로그인 |
| react-native-keychain | ^10.0.0 | JWT 토큰 보안 저장 (Keychain/Keystore) |
| @react-native-async-storage/async-storage | ^2.2.0 | 위치, 유저 정보 등 일반 데이터 저장 |

### 푸시 알림
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| @react-native-firebase/app | ^23.8.8 | Firebase 코어 |
| @react-native-firebase/messaging | ^23.8.8 | FCM 푸시 알림 |

### 기타
| 라이브러리 | 버전 | 역할 |
|-----------|------|------|
| @sentry/react-native | ^8.5.0 | 에러 모니터링 |
| react-native-bootsplash | ^7.1.0 | 스플래시 스크린 |
| react-native-config | ^1.6.1 | 환경변수 (.env) |
| react-native-webview | ^13.16.1 | 약관/정책 웹뷰 |
| @react-native-community/datetimepicker | ^9.1.0 | 날짜 선택 |

---

## 아키텍처 패턴

### 계층 구조
```
Screens (UI)
    ↓
Hooks / Components
    ↓
API Layer (src/api/)          ← 서버 통신 단일 진입점
    ↓
Axios Client (client.ts)      ← 인터셉터, 토큰 갱신
    ↓
NestJS Backend (near-price-api)
```

### 상태 흐름
```
서버 데이터       → React Query (useQuery/useMutation) → 컴포넌트
클라이언트 상태   → Zustand Store                      → 컴포넌트
```

### 파일 명명 규칙
- 컴포넌트: `PascalCase.tsx` (예: `PriceCard.tsx`)
- 훅/유틸: `camelCase.ts` (예: `useAuth.ts`, `format.ts`)
- API: `{domain}.api.ts` (예: `price.api.ts`)
- 스토어: `{domain}Store.ts` (예: `authStore.ts`)

---

## 디렉토리 구조

```
src/
├── api/                    # API 호출 레이어 (Axios 기반)
│   ├── client.ts           # Axios 인스턴스 + 인터셉터 + 토큰 갱신
│   ├── constants.ts        # API 엔드포인트 상수
│   ├── auth.api.ts         # 로그인, 로그아웃, 토큰 갱신
│   ├── price.api.ts        # 가격 등록/조회/삭제
│   ├── product.api.ts      # 상품 검색/조회
│   ├── store.api.ts        # 매장 검색/등록
│   ├── wishlist.api.ts     # 찜 추가/삭제/목록
│   ├── flyer.api.ts        # 전단지 목록/상세
│   ├── user.api.ts         # 유저 프로필
│   ├── badge.api.ts        # 뱃지 목록/획득
│   ├── verification.api.ts # 가격 신뢰도 검증 (인정/반박)
│   ├── reaction.api.ts     # 좋아요/반응
│   ├── notice.api.ts       # 공지사항
│   ├── faq.api.ts          # FAQ
│   ├── inquiry.api.ts      # 1:1 문의
│   ├── upload.api.ts       # 이미지 업로드
│   ├── naver-maps.api.ts   # 네이버 지도 API (역지오코딩, 주소검색)
│   ├── naver-local.api.ts  # 네이버 검색 API (매장 검색)
│   └── vworld.api.ts       # VWorld API (보조)
│
├── components/
│   ├── common/             # 공통 UI 컴포넌트
│   │   ├── Button.tsx      # primary/secondary/outline/ghost variant
│   │   ├── Toast.tsx       # success/warning/error 토스트
│   │   ├── SkeletonCard.tsx, SkeletonBox.tsx
│   │   ├── EmptyState.tsx, ErrorView.tsx, LoadingView.tsx
│   │   ├── OfflineBanner.tsx
│   │   ├── ReportSheet.tsx # 신고 바텀시트
│   │   └── ErrorBoundary.tsx  # ⚠️ 유일한 클래스 컴포넌트
│   ├── icons/              # SVG 아이콘 (react-native-svg)
│   ├── map/                # 네이버 지도 컴포넌트
│   │   └── PriceMapView.tsx
│   └── price/              # 가격 관련 컴포넌트
│       └── PriceRankCard.tsx
│
├── hooks/
│   ├── useAppPermissions.ts    # 앱 시작 시 권한 일괄 요청
│   ├── useFCM.ts               # FCM 토큰 등록 및 알림 처리
│   ├── useDebounce.ts          # 검색 입력 디바운스
│   ├── useStoreTypes.ts        # 매장 유형 목록
│   ├── useUnsavedChangesWarning.ts
│   └── queries/                # React Query 커스텀 훅
│
├── navigation/
│   ├── RootNavigator.tsx       # 최상위 (온보딩/인증/메인 분기)
│   ├── AuthStack.tsx           # 로그인 + 동네 설정
│   ├── MainTabNavigator.tsx    # 탭 + 중첩 스택
│   ├── OnboardingNavigator.tsx # 권한 동의
│   └── types.ts                # 모든 네비게이션 파라미터 타입
│
├── screens/
│   ├── auth/           LoginScreen.tsx, LocationSetupScreen.tsx
│   ├── onboarding/     PermissionScreen.tsx
│   ├── home/           HomeScreen.tsx, SearchScreen.tsx
│   ├── price/          [8개 화면 — 가격 등록/비교 플로우]
│   ├── flyer/          FlyerScreen.tsx, FlyerDetailScreen.tsx
│   ├── wishlist/       WishlistScreen.tsx
│   └── mypage/         [11개 화면 — 프로필/설정/공지/FAQ 등]
│
├── store/              # Zustand 글로벌 상태
│   ├── authStore.ts        # 인증 (JWT, 유저, 로그인 상태)
│   ├── locationStore.ts    # 위치 (좌표, 동네명, 반경)
│   ├── networkStore.ts     # 오프라인 감지
│   ├── notificationStore.ts
│   ├── onboardingStore.ts  # 온보딩 완료 여부
│   ├── priceRegisterStore.ts  # 가격 등록 플로우 임시 상태
│   └── toastStore.ts       # 토스트 메시지
│
├── theme/              # 디자인 토큰 (절대 하드코딩 금지)
│   ├── colors.ts       # primary, success, warning, danger, gray*
│   ├── typography.ts   # headingXl, body, price, tabLabel 등
│   ├── spacing.ts      # xs~xxl, radius*, fab* 등
│   └── index.ts
│
├── types/
│   └── api.types.ts    # Product, Price, Store, User, Badge 등
│
└── utils/
    ├── storage.ts      # AsyncStorage 래퍼 (typed)
    ├── config.ts       # API_BASE_URL, Naver 키 등 환경설정
    ├── constants.ts    # 앱 전역 상수
    ├── format.ts       # 가격/날짜 포맷팅 유틸
    └── highlight.ts    # 검색어 강조 유틸
```

---

## 주요 화면 목록 및 네비게이션 구조

### RootNavigator (Stack)
```
Onboarding Stack
└── PermissionScreen          # 카메라/위치/알림 권한 동의

Auth Stack
├── LoginScreen               # 카카오 로그인 버튼
└── LocationSetupScreen       # 동네/위치 설정 (지도 포함)

Main Tab Navigator
├── HomeStack
│   ├── HomeScreen            # 메인 피드 (상품 검색, 최근 등록가)
│   ├── SearchScreen          # 상품명 검색
│   ├── PriceCompareScreen    # 상품별 매장 가격 비교 목록
│   ├── PriceDetailScreen     # 개별 가격 상세 (좋아요/신고)
│   ├── StoreDetailScreen     # 매장 상세 (지도, 가격 목록)
│   └── StoreInfoScreen       # 매장 기본 정보
│
├── Flyer Stack
│   ├── FlyerScreen           # 전단지 목록
│   └── FlyerDetailScreen     # 전단지 상세 (WebView 또는 이미지)
│
├── PriceRegister Stack (FAB) ← 탭바 중앙 + 버튼
│   ├── StoreSelectScreen     # 매장 선택 또는 신규 등록
│   ├── StoreRegisterScreen   # 매장 신규 등록 폼
│   ├── InputMethodScreen     # 카메라 or 수동 입력 선택
│   ├── CameraScreen          # Vision Camera 촬영
│   ├── OcrResultScreen       # ML Kit OCR 결과 확인/수정
│   ├── ItemDetailScreen      # 상품명/가격/날짜 입력 폼
│   └── ConfirmScreen         # 최종 확인 및 서버 저장
│
├── WishlistScreen            # 찜한 가격 목록
│
└── MyPage Stack
    ├── MyPageScreen          # 프로필, 활동 요약, 뱃지
    ├── MyPriceListScreen     # 내가 등록한 가격 목록
    ├── LikedPricesScreen     # 내가 인정한 가격 목록
    ├── LocationSetupScreen   # 동네 변경
    ├── NoticeListScreen      # 공지사항 목록
    ├── NoticeDetailScreen    # 공지사항 상세
    ├── FaqScreen             # 도움말 / FAQ
    ├── InquiryScreen         # 1:1 문의
    ├── NotificationSettingsScreen  # 알림 설정
    ├── BadgeScreen           # 뱃지 목록
    ├── TermsScreen           # 이용약관 (WebView)
    └── PrivacyPolicyScreen   # 개인정보처리방침 (WebView)
```

---

## API 연동 구조

### 인증 흐름
```
카카오 OAuth SDK → kakaoAccessToken
→ POST /auth/kakao (백엔드)
→ JWT accessToken + refreshToken
→ react-native-keychain 저장
→ apiClient 인터셉터에서 자동 주입
```

### 토큰 갱신 (자동)
```
401 응답 감지 (인터셉터)
→ isRefreshing 플래그 ON
→ POST /auth/refresh (refreshToken 전송)
→ 신규 토큰 저장
→ 실패한 요청 재시도 (대기열에서 순차 처리)
→ 갱신 실패 시: queryClient.clear() + logout()
```

### 외부 API
| API | 엔드포인트 | 용도 |
|-----|-----------|------|
| Naver Reverse Geocode | `maps.apigw.ntruss.com/map-reversegeocode/v2` | 좌표 → 동 이름 |
| Naver Geocode | `maps.apigw.ntruss.com/map-geocode/v2/geocode` | 주소 → 좌표 |
| Naver Search (Local) | `openapi.naver.com/v1/search/local` | 매장명 검색 |

---

## 환경 변수 (.env)

```
API_BASE_URL=http://10.0.2.2:3000      # Android 에뮬레이터
KAKAO_APP_KEY=...                        # 카카오 앱 키
NAVER_MAP_CLIENT_ID=...                  # 네이버 지도 NCP 키
NAVER_CLIENT_ID=...                      # 네이버 검색 API
NAVER_CLIENT_SECRET=...
SENTRY_DSN=...
```

> `react-native-config`로 주입. `manifestPlaceholders`로 AndroidManifest에 전달.

---

## 코딩 규칙 요약 (상세는 CLAUDE.md 참조)

1. 함수형 컴포넌트 + Hooks 전용
2. API는 반드시 `src/api/` 레이어 경유
3. 서버 상태 → React Query / 클라이언트 상태 → Zustand (혼용 금지)
4. 스타일 → `StyleSheet.create` (인라인 금지)
5. 색상/간격/타이포 → `theme/` 토큰 (하드코딩 금지)
6. `any` 타입 금지
7. `console.log` 커밋 금지
8. 데이터 화면: 로딩/에러/빈 상태 3개 필수
9. 접근성: `accessibilityRole`, `accessibilityLabel` 필수
10. 네비게이션 타입: `src/navigation/types.ts`에 먼저 정의
