# 마실앱 — 개발 현황 (PROGRESS.md)

> 하네스 방법론 기반 | 최종 수정: 2026-04-02

---

## 현재 상태

**개발 완료 → 출시 전 테스트 단계**

| 항목 | 상태 |
|------|------|
| 전체 화면 구현 | ✅ 완료 (28개 화면) |
| API 연동 | ✅ 완료 |
| 인증 플로우 (카카오 OAuth + JWT) | ✅ 완료 |
| 가격 등록 플로우 (OCR + 수동) | ✅ 완료 |
| 지도 연동 (Naver Map SDK) | ✅ 완료 |
| FCM 푸시 알림 | ✅ 완료 |
| Sentry 에러 모니터링 | ✅ 완료 |
| 디자인 시스템 토큰화 | ✅ 완료 (colors, spacing, typography) |
| 릴리즈 키스토어 생성 | ✅ 완료 (near-price-release.keystore) |
| CI/CD (GitHub Actions) | ✅ 완료 (build-android.yml) |
| 단위 테스트 | ❌ 미작성 |
| 앱스토어 (Google Play) 등록 | ⏳ 대기 중 |

---

## 완료된 주요 기능

### 인증 & 온보딩
- 카카오 OAuth 로그인
- JWT 토큰 발급 및 Keychain 보안 저장
- 자동 토큰 갱신 (401 인터셉터)
- 앱 재시작 시 인증 상태 복원
- AsyncStorage → Keychain 마이그레이션 (일회성)
- 온보딩: 카메라/위치/알림 권한 동의 화면

### 핵심 기능
- 상품 검색 및 가격 비교 (반경 1/3/5/10km)
- 가격 등록: 카메라 OCR (Google ML Kit v2) + 수동 입력
- 매장 선택 및 신규 매장 등록
- 가격 인정/반박 (신뢰도 검증)
- 가격 찜 (위시리스트)
- 전단지 뷰어

### 마이페이지
- 내가 등록한 가격 목록
- 내가 인정한 가격 목록
- 뱃지 시스템
- 동네 변경
- 알림 설정 (FCM)
- 공지사항, FAQ, 1:1 문의
- 이용약관 / 개인정보처리방침

---

## 알려진 이슈 및 개선 필요사항

### 🔴 높은 우선순위

#### 1. God Component — 대형 화면 분리 필요
코드 리뷰(2026-03-19) 결과 발견. 일부 화면이 지나치게 크다.

| 화면 | 줄 수 | 문제 |
|------|------|------|
| `StoreSelectScreen.tsx` | 882줄 | 상태/API/UI/스타일 혼재 |
| `HomeScreen.tsx` | 597줄 | 컴포넌트 분리 필요 |
| `ItemDetailScreen.tsx` | 449줄 | 폼 로직 분리 필요 |

**개선**: 커스텀 훅으로 비즈니스 로직 분리, 서브 컴포넌트로 UI 분리

#### 2. 이미지 업로드 시 리사이징 미처리
`ItemDetailScreen`에서 이미지 선택 시 `quality: 0.8`만 설정하고 `maxWidth`/`maxHeight` 미설정.
고해상도 사진이 원본 크기로 업로드될 수 있음.

**개선**: `launchCamera`/`launchImageLibrary`에 `maxWidth: 1920, maxHeight: 1920` 추가

#### 3. 카카오 로컬 API 파일 정리 미완료
`src/api/kakao-local.api.ts` 파일이 남아있으나 사용 불가 상태 (심사 탈락).
전면 교체 완료 후 삭제 예정이었으나 아직 파일이 존재.

**개선**: 파일 내 의존 코드 전부 Naver API로 교체 확인 후 삭제

---

### 🟡 중간 우선순위

#### 4. 거리 필터링이 클라이언트에서 수행됨
`PriceCompareScreen`에서 전체 가격 데이터를 받아온 뒤 Haversine 계산으로 클라이언트 필터링.
데이터 증가 시 성능 문제 가능.

**개선**: API에 `?latitude=&longitude=&radius=` 파라미터 추가 → 서버/DB 레벨 필터링

#### 5. ReactionButtons가 리스트 아이템마다 독립 API 호출
리스트에 가격 카드가 많을 때 반응 버튼 렌더링 시 N개 API 호출 발생 가능.

**개선**: 서버 응답에 `reactionCount`, `userReaction` 포함 or Batch API 도입

#### 6. 매직 넘버 잔존 (theme 토큰 미완성)
`paddingHorizontal: 14`, `gap: 6`, `fontSize: 10` 등 하드코딩 값이 일부 남아있음.
주석: `// no exact spacing token`

**개선**: `spacing.ts`에 `xs2: 6`, `inputPadH: 14` 등 누락 토큰 추가

#### 7. TODO 주석 관리
코드 내 TODO 주석 미처리:
```typescript
distance: '-', // TODO: 위치 기반 실제 거리 계산 필요
```
**개선**: GitHub Issues 등록 후 코드에서 TODO 주석 제거

---

### 🟢 낮은 우선순위

#### 8. 단위 테스트 부재
`__tests__` 디렉토리 존재하나 실질적 테스트 없음.

**개선 대상**: `format.ts` 유틸 함수 (formatPrice, getDistanceM 등), 인증 플로우

#### 9. wishlist 불필요한 쿼리 무효화
`useRemoveWishlist`의 `onSuccess`에서 전체 위시리스트 invalidate 발생.
특정 아이템만 invalidate하거나 optimistic update 적용 권장.

---

## 다음 작업 (우선순위 순)

1. **이미지 리사이징** — `launchCamera`/`launchImageLibrary`에 maxWidth/maxHeight 추가 (빠른 수정)
2. **kakao-local.api.ts 정리** — 잔존 의존 코드 확인 후 파일 삭제
3. **God Component 분리** — StoreSelectScreen부터 커스텀 훅으로 로직 분리
4. **spacing 토큰 보완** — 누락된 매직 넘버를 theme 토큰에 추가
5. **서버 사이드 거리 필터링** — 백엔드 API 파라미터 추가 (near-price-api 연동 필요)
6. **단위 테스트 작성** — format.ts, storage.ts 기본 유틸부터 시작
7. **Google Play 스토어 등록** — 배포 준비

---

## 배포 준비 현황

| 항목 | 상태 | 비고 |
|------|------|------|
| 릴리즈 키스토어 | ✅ | `near-price-release.keystore` (git 제외) |
| GitHub Secrets 설정 | ✅ | KEYSTORE_BASE64, KEYSTORE_PASSWORD 등 |
| CI/CD 빌드 파이프라인 | ✅ | `build-android.yml` |
| 프로덕션 API URL | ⏳ | `.env.production` 설정 필요 |
| Google Play 등록 | ❌ | 아직 미등록 |
| 개인정보처리방침 URL | ⏳ | 공개 URL 필요 |

---

## 코드 리뷰 히스토리

| 일자 | 리뷰어 | 결과 | 파일 |
|------|--------|------|------|
| 2026-03-19 | Claude (아키텍처+성능 리뷰) | B+ | `near-price-app-review.md` |
