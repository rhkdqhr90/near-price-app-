# SCREENS.md — 화면 설계 문서

> NearPrice(마실앱) 전체 화면의 단계·정보·플로우·데이터 의존성을 정리.
> 기획 변경 시 이 문서를 먼저 업데이트한 뒤 구현.
> 최종 수정: 2026-04-20

---

## 0. 기획 공통 규칙 (2026-04-20 확정)

### 0-1. 대표가(Representative Price) 산출
동일 `(storeId × productId)` 그룹 내 정렬 규칙:

1. **최저가** (`price ASC`)
2. **최신** (`createdAt DESC`)
3. **인증 수** (`verifiedCount DESC` — "맞아요" 투표 합)

상위 1건 = 대표가. 단, 이벤트 가격(`isEvent=true` + `eventEnd` 미경과)은 정가 대표가와 **병행 노출** — "할인 중" 배지로 구분.

### 0-2. 가격 유통기한
- **없음** — 등록된 모든 가격은 영구 유효.
- 예외: 이벤트 가격은 `eventEnd` 경과 시 자동으로 정가 그룹에 병합(또는 숨김).

### 0-3. 중복 등록 처리
- 같은 유저가 같은 마트·상품을 재등록해도 **덮어쓰지 않고 새 레코드 추가**.
- 상세 화면에 **"이 마트 등록 이력"** 섹션을 두어 시간순으로 나열.

### 0-4. "달라요" 투표
- 가격 row에 `👍 N · 👎 M` 수치만 병기.
- 임계값으로 자동 숨김·삭제 하지 않음. 유저 판단에 맡김.

---

## 1. 네비게이션 최상위 트리

```
RootNavigator (조건부)
├── [온보딩 미완료] → OnboardingNavigator
│     └── PermissionScreen
├── [인증 O + 위치 O] → MainTabNavigator
│     ├── HomeStack
│     ├── FlyerStack
│     ├── PriceRegisterStack  (탭 중앙 FAB)
│     ├── WishlistStack
│     └── MyPageStack
└── [그 외] → AuthStack
      ├── LoginScreen
      ├── SignUpScreen
      └── LocationSetupScreen
```

---

## 2. Auth / Onboarding

### 2-1. PermissionScreen (`src/screens/onboarding/PermissionScreen.tsx`)
| 항목 | 내용 |
|------|------|
| 진입 | 앱 최초 실행 (`onboardingStore.hasSeen=false`) |
| 단계 | 단일 화면 — 위치/카메라/알림 일괄 요청 |
| 정보 | 각 권한 카드(아이콘 + 타이틀 + 설명 + 선택 배지) |
| 액션 | `확인` → 시스템 권한 요청 → `markOnboardingSeen()` |
| 다음 | RootNavigator가 AuthStack 또는 MainTab으로 자동 전환 |
| 정책 | **허용하지 않아도 사용 가능** (블로킹 아님) |

### 2-2. LoginScreen (`src/screens/auth/LoginScreen.tsx`)
| 항목 | 내용 |
|------|------|
| 진입 | AuthStack 첫 화면 |
| 단계 | 소셜 로그인 선택(카카오 / 네이버 / 애플 iOS) |
| 액션 | 로그인 성공 → 토큰 Keychain 저장 → `setUser()` |
| 다음 | 위치 미설정 → `LocationSetup`, 설정 완료 → MainTab 자동 전환 |

### 2-3. SignUpScreen (있을 경우)
- 소셜 로그인에서 신규 사용자 닉네임 입력 단계.

### 2-4. LocationSetupScreen (`src/screens/auth/LocationSetupScreen.tsx`)
| 항목 | 내용 |
|------|------|
| 진입 | (A) AuthStack 흐름, (B) MyPage에서 변경 시 `returnTo='mypage'` |
| 단계 | STEP 2/2 배지 + 지도 + GPS FAB + 주소 검색 모달 |
| 정보 | `previewLocation` (latitude, longitude, regionName) |
| 액션 | GPS 자동 감지 / 주소 검색 / `시작하기` → `setLocation()` |
| 다음 | AuthStack 진입 시 → RootNavigator 조건부 Main 전환, MyPage 진입 시 → `goBack()` |
| 주의 | `play-services-location 20.0.0 고정`, GPS 로딩 무한 표시 버그 방지 (finally에서 무조건 해제) |

---

## 3. Home / Search

### 3-1. HomeScreen (`src/screens/home/HomeScreen.tsx`)
| 섹션 | 내용 |
|------|------|
| 상단 | 지역명 + 반경 선택(1/3/5/10km) |
| 검색바 | 탭 → `SearchScreen` |
| 배너 | 전단지/이벤트 큐레이션 |
| 리스트 | 인기 품목, 최근 등록 |
| 의존 | `useMe()`, `locationStore`, `useTrendingPrices()` |

### 3-2. SearchScreen (`src/screens/home/SearchScreen.tsx`)
| 항목 | 내용 |
|------|------|
| 진입 | HomeScreen 검색바 |
| 단계 | (1) 인풋 → debounce → (2) 결과 리스트 |
| 정보 | 상품별 **대표가** + `storeName·매장N곳` + `인증됨` + 절약률 pill |
| 액션 | 카드 탭 → `PriceDetailScreen` |
| 디자인 | **가로 리스트 카드** (64×64 thumb + info + 가격 column, 레퍼런스 `PriceCard`) |

---

## 4. PriceDetailScreen — 상품 상세 ⭐ (기획 핵심)

**파일**: `src/screens/price/PriceDetailScreen.tsx`
**레퍼런스**: `마실 2/screens-detail.jsx` DetailScreen

### 4-1. 진입 경로
- SearchScreen 카드 탭
- HomeScreen 배너/카드 탭
- WishlistScreen 카드 탭
- StoreDetailScreen 상품 row 탭

### 4-2. 스크린 구조 (상단 → 하단)

#### (A) Sticky Header
- 뒤로가기 + 상품명 + "N곳에서 가격 비교 중" + 공유 + 하트(찜)

#### (B) Hero 그라디언트 (160h, radius 18)
- primary→primaryDark 그라디언트
- 카테고리 일러스트(반투명)
- 배지 (예: "BEST PRICE")
- `LOWEST NEAR YOU` kicker
- **대표가 대문자 숫자** + 원 + 추이 화살표(↓N%)

#### (C) 가격 분포 카드
- `동네 가격 분포` + `N% 절약 가능` pill
- **PriceRangeBar**: 최저(primary dot) · 평균(blackline) · 최고(gray dot)
- 아래 3컬럼: 최저 / 평균 / 최고 숫자

#### (D) Tabs (sticky 권장)
```
[ 가격 비교 · N ]  [ 가격 추이 ]  [ 품목 정보 ]
```

##### D-1. 가격 비교 탭 (케이스 B: 여러 마트 같은 상품)
- **StoreRow 리스트** — 대표가 기준 마트별 1건씩
- 각 row: 순위(🏆/2/3) + 마트명 + BEST 배지(1등) + 거리·시간·제보자 + 가격 + `+diff / 최저가`
- 1등 = primaryLight 배경 + primary 테두리

##### D-2. 가격 추이 탭
- 최근 7일 평균가 라인 차트 (SVG)
- 상단 우측: 추이 % pill

##### D-3. 품목 정보 탭
- 카테고리 / 최초 등록일 / 최근 업데이트 / 첫 등록자 / 누적 제보
- 하단 "잘못된 정보가 있나요? 수정 제안 →" 배너

#### (E) **이 마트 등록 이력 섹션** (기획 0-3 반영, 레퍼런스에 없음 — 신규)
- D-1에서 특정 마트 row 탭 시 펼침 or 별도 sheet
- 시간순(최신 DESC) 리스트
- 각 row: `가격 · 등록일 · @유저 · 👍N · 👎M` + 정렬 토글 [최저가/최신/인증많음/달라요많음]

#### (F) Sticky Bottom CTA
- 지도 아이콘 버튼(52×52) + `새 가격 제보하기` Primary 버튼
  - 지도 탭 → StoreDetailScreen 또는 외부 지도 앱
  - 새 가격 제보 → `PriceRegisterStack` (해당 상품 pre-fill)

### 4-3. 데이터 의존
- `GET /prices/product/:productId?near={lat,lng,radius}` — 마트별 대표가 집계 (백엔드 정렬)
- `GET /prices/store/:storeId/product/:productId` — 이 마트 등록 이력 (신규 필요)
- `GET /products/:id/history?days=7` — 추이
- `POST /prices/:id/vote` — 👍/👎 투표
- `POST /wishlists` — 찜 등록

### 4-4. 상태 / 에러
- 로딩: Hero·카드 Skeleton
- 에러: 재시도 버튼 배너
- 빈 상태: "주변에 등록된 가격이 없어요" + "첫 제보자가 되어 주세요"

---

## 5. 가격 등록 플로우 (PriceRegisterStack)

```
StoreSelect → (신규) StoreRegister
           → InputMethod → [카메라] Camera → OcrResult → ItemDetail
                        → [수동]   ItemDetail
                        → Confirm → Done  ← ⚠ Done 화면 미구현
```

### 5-1. StoreSelectScreen
- STEP 1/3 | GPS + 반경 슬라이더 + 마트 리스트
- 미등록 마트 → "여기 새 매장 등록하기"

### 5-2. StoreRegisterScreen (신규 마트)
- 이름, 카테고리(편의점/시장/슈퍼/대형마트/마트), 주소

### 5-3. InputMethodScreen
- STEP 2/3 | 매장 pill
- 2개 카드: **사진으로 등록(RECOMMENDED, 다크)** / **직접 입력(라이트)**

### 5-4. CameraScreen
- VisionCamera + 가격표 가이드 프레임
- `isCapturingRef` 가드 (중복 탭 방지)
- 촬영 실패 시 Sentry 보고(`__DEV__` 제외)

### 5-5. OcrResultScreen
- ML Kit v2 온디바이스 인식
- 인식된 텍스트 하이라이트 → 터치해서 상품/가격 매칭

### 5-6. ItemDetailScreen — **품목 상세 (편집)**
필드 순서 (`RegisterItemForm` 1:1):
1. STEP kicker + OCR 배너
2. 상품명*
3. 가격* (56h, 우측 정렬)
4. 단위·수량 (kg/g/개/구/팩/봉/기타 pill)
5. 할인 중인가요? (pill 토글 — OFF="정가" / ON="기간/할인율 상세 가능")
6. 사진 (100×100)
7. 품질 (primaryLight active)
8. [collapsible] 세부 가격표 타입 (normal/sale/closing/bundle/flat/member/cardPayment)
9. [collapsible] 메모

제출 조건: `productName.trim() && price`.
편집 플로우: `ConfirmScreen`에서 item 탭 시 `editIndex`로 진입.

### 5-7. ConfirmScreen — **상품상세 (최종 확인)**
- `FINAL STEP` kicker + `등록 내역 확인` + 매장명 + `N개` pill
- 품목 카드 리스트 — 탭 시 편집
- 하단: `+ 품목 추가` / `저장` Primary
- onSuccess: **`navigation.replace('Done', { summary })`** (현재 직접 popToTop → 변경 필요)

### 5-8. RegisterDoneScreen — **등록 완료** (⚠ 미구현)
레퍼런스 `screens-register.jsx:447` 기반:
- 88×88 primary 원 + 체크 아이콘 (primary 그림자)
- `등록 완료!` (22/800)
- `{상품명} · {가격}` / `이웃에게 큰 도움이 될 거예요 🙏`
- primaryLight pill — `+N 포인트 · 동네 가격지기 Lv.X`
- `홈으로` PrimaryBtn → popToTop + HomeStack + `reset()`

---

## 6. Flyer / Wishlist / MyPage

### 6-1. FlyerScreen / FlyerDetailScreen
- 마트별 전단지 그리드 / 페이지 뷰어 (레퍼런스 paper 테마)

### 6-2. WishlistScreen
- 찜한 `(storeId × productId)` 리스트 — 대표가 변동 추적
- 최근 변동 배지 (▼/▲)

### 6-3. MyPageScreen (+ 11개 하위)
- 프로필 / 알림설정 / 동네설정(→LocationSetup) / 공지 / FAQ / 이용약관 / 개인정보처리방침 / 로그아웃 / 탈퇴 등

---

## 7. 향후 수정 지점 (TODO)

- [ ] `RegisterDoneScreen` 구현 + `PriceRegisterStackParamList` `Done` 라우트 추가
- [ ] `ConfirmScreen.onSuccess` → `replace('Done')`로 변경
- [ ] `PriceDetailScreen` 레퍼런스 1:1 리디자인 + **이 마트 등록 이력 섹션** 신규
- [ ] 백엔드 신규 엔드포인트: `GET /prices/store/:storeId/product/:productId`
- [ ] `Price` 엔티티 `upvoteCount` / `downvoteCount` / `verifiedCount` 필드 확인
- [ ] 이벤트 가격 `eventEnd` 만료 자동 처리 (cron or 조회 시 필터)
