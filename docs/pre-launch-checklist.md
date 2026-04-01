# NearPrice Android 출시 전 체크리스트

> 최종 업데이트: 2026-03-30
> 플랫폼: Android (Play Store) 먼저, 이후 iOS 추가

---

## P0 — 출시 불가 (반드시 해결)

### 앱 버전
| 항목 | 상태 | 비고 |
|------|------|------|
| `versionCode 1` (build.gradle) | ✅ | 완료 |
| `versionName "1.0.0"` (build.gradle) | ✅ | 완료 |
| `APP_VERSION = '1.0.0'` (config.ts) | ✅ | 완료 |

### 앱 서명 (Release Keystore)
| 항목 | 상태 | 비고 |
|------|------|------|
| `near-price-release.keystore` 파일 생성 | ⬜ | `android/app/` 위치, git 제외됨 — 로컬 파일 확인 필요 |
| `android/gradle.properties`에 KEYSTORE_PATH 등 4개 값 설정 | ⬜ | 로컬 릴리스 빌드용 |
| GitHub Secrets에 KEYSTORE_BASE64 등 4개 등록 | ⬜ | CI/CD 자동 빌드용 (`project_github_secrets.md` 참조) |
| `./gradlew assembleRelease` 빌드 성공 확인 | ⬜ | |

### 카카오 로그인
| 항목 | 상태 | 비고 |
|------|------|------|
| 카카오 개발자 콘솔 — 플랫폼 등록 (패키지명: `com.nearpriceapp`) | ⬜ | https://developers.kakao.com |
| Release keystore SHA-256 키해시 등록 | ⬜ | `keytool -list -v -keystore near-price-release.keystore` |
| `KAKAO_APP_KEY` 환경변수 (CI Secrets + 로컬 .env) | ⬜ | |

### 네이버 지도 SDK
| 항목 | 상태 | 비고 |
|------|------|------|
| NCP 콘솔에서 `com.nearpriceapp` 패키지명 등록 | ⬜ | https://console.ncloud.com |
| `NAVER_MAP_CLIENT_ID` 환경변수 (CI Secrets + 로컬 .env) | ⬜ | |

### 프로덕션 API
| 항목 | 상태 | 비고 |
|------|------|------|
| 프로덕션 서버 배포 완료 | ⬜ | `https://api.nearprice.kr` |
| DB 마이그레이션 프로덕션 실행 | ⬜ | `npm run typeorm:migration:run` |
| `API_BASE_URL` 분기 확인 (`__DEV__` false → 프로덕션 URL) | ✅ | config.ts 완료 |

### 법적 요건 (한국 앱 의무)
| 항목 | 상태 | 비고 |
|------|------|------|
| **위치기반서비스 사업자 신고** | ⬜ | 방통위 신고 필수 — 위치정보법 제9조. 미신고 시 과태료 |
| 개인정보처리방침 웹 URL 확보 | ⬜ | 스토어 등록 시 URL 필요 (앱 내 화면만으로 불충분) |
| 이용약관 웹 URL 확보 | ⬜ | 동일 |

---

## P1 — 출시 전 권장

### 모니터링
| 항목 | 상태 | 비고 |
|------|------|------|
| `android/sentry.properties` 프로덕션 DSN 설정 | ⬜ | 현재 파일 없음 — Sentry 프로젝트 생성 후 추가 |
| `google-services.json` 프로덕션 파일 확인 | ✅ | 파일 있음 — 프로덕션 Firebase 프로젝트 파일인지 확인 |
| Firebase Crashlytics 활성화 확인 | ⬜ | |

### 앱 아이콘 / 스플래시
| 항목 | 상태 | 비고 |
|------|------|------|
| 모든 해상도 아이콘 (hdpi~xxxhdpi) | ✅ | 파일 있음 — 커스텀 아이콘인지 확인 |
| 스플래시 스크린 구현 여부 | ⬜ | 현재 기본 RN 스플래시 사용 여부 확인 |
| 다크모드 아이콘 (`mipmap-night`) | ⬜ | 필수는 아님 |

### 성능
| 항목 | 상태 | 비고 |
|------|------|------|
| Hermes 엔진 활성화 | ✅ | `hermesEnabled=true` |
| ProGuard/R8 활성화 | ✅ | `minifyEnabled true`, `shrinkResources true` |
| Release APK/AAB 크기 확인 | ⬜ | 목표: AAB 50MB 이하 |

### UX 최종 점검 (기기 직접 확인)
| 플로우 | 상태 | 비고 |
|--------|------|------|
| 첫 실행 → 온보딩 → 카카오 로그인 → 위치 설정 → 홈 | ⬜ | |
| 가격 등록: 카메라 → OCR → 수정 → 매장선택 → 최종확인 | ⬜ | |
| 가격 수동 등록 플로우 | ⬜ | |
| 홈 피드 무한스크롤 | ⬜ | |
| 검색 → 가격비교 → 상세 → 맞아요/달라요 | ⬜ | |
| 찜하기 토글 + 찜목록 반영 | ⬜ | |
| 플라이어 탭 전체 | ⬜ | |
| 마이페이지 (뱃지, 내 가격, 알림 설정) | ⬜ | |
| 오프라인 시나리오 (Wi-Fi 끄고 동작 확인) | ⬜ | |
| 앱 백그라운드 → 포그라운드 복귀 | ⬜ | |

### Play Store 등록정보
| 항목 | 상태 | 비고 |
|------|------|------|
| 앱 이름 확정 | ⬜ | "마실" 또는 "NearPrice" |
| 짧은 설명 (80자 이하) | ⬜ | |
| 긴 설명 (4000자 이하) | ⬜ | |
| 스크린샷 최소 2장 (Phone) | ⬜ | 권장: 홈, 가격비교, 가격등록 화면 |
| 피처드 이미지 (1024×500) | ⬜ | |
| 앱 아이콘 (512×512 PNG) | ⬜ | |
| 콘텐츠 등급 설문 (Google IARC) | ⬜ | |
| 개인정보처리방침 URL 입력 | ⬜ | P0 항목과 연계 |

---

## P2 — 출시 이후 처리

### iOS 준비
| 항목 | 비고 |
|------|------|
| Xcode 프로젝트 Bundle ID 설정 | |
| Apple Developer 인증서 + Provisioning Profile | |
| `Info.plist` 권한 설명 문구 (한국어) | 위치, 카메라 |
| App Store Connect 앱 등록 | |
| TestFlight 내부 테스트 | |

### 백엔드/운영
| 항목 | 비고 |
|------|------|
| PostgreSQL 백업 스케줄 설정 | |
| Rate limiting 값 프로덕션 조정 | |
| Elasticsearch 인덱스 최적화 | |
| Redis 메모리 설정 | |
| 모니터링 알림 설정 (Sentry 이메일 알림) | |

---

## 릴리스 빌드 명령어

```bash
# 1. JS 번들 + APK 빌드
cd near-price-app/android
./gradlew assembleRelease

# 2. AAB 빌드 (Play Store 권장)
./gradlew bundleRelease

# APK 경로: android/app/build/outputs/apk/release/app-release.apk
# AAB 경로: android/app/build/outputs/bundle/release/app-release.aab
```

## keystore 생성 명령어 (최초 1회)

```bash
keytool -genkeypair -v \
  -keystore near-price-release.keystore \
  -alias near-price-key \
  -keyalg RSA -keysize 2048 \
  -validity 10000

# SHA-256 해시 확인 (카카오 등록용)
keytool -list -v -keystore near-price-release.keystore
```
