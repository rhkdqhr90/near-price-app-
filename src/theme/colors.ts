export const colors = {
  primary: '#00BFA5',          // Fresh Market teal
  primaryLight: '#E0F7F3',     // 연한 민트
  primaryDark: '#009688',      // 어두운 틸
  primaryContainer: '#26A69A', // 중간 틸
  onPrimary: '#ffffff',        // On Primary

  secondaryBg: '#F1F5EE',      // surface-container-low (레퍼런스 `마실 2/theme.js` fresh.surfaceAlt)

  // Surface 계층 (No-Line Rule 구현 — 테두리 대신 배경색 계층으로 구분)
  // 레퍼런스 `마실 2/theme.js` fresh variant 기준으로 재정렬 — 웜 옐로우 → 쿨 뉴트럴 그레이
  surface: '#FAFBF8',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#F1F5EE',
  surfaceContainer: '#EAEFE8',
  surfaceContainerHigh: '#E4EBE7',
  surfaceContainerHighest: '#DCE4DE',
  onBackground: '#1b1c19',

  // Accent: mustard yellow
  accent: '#E8BC50',
  accentLight: '#FFF9E6',
  accentSurface: '#FAFAF8',

  // Tertiary: Soft Mustard Gold (억양 색상)
  tertiary: '#5b4300',
  tertiaryContainer: '#795900',
  onTertiaryContainer: '#ffd274',
  tertiaryFixedDim: '#f6be39',

  // Olive green
  olive: '#5E8035',
  oliveLight: '#EFF5E7',
  oliveDark: '#3D5A20',

  // Teal
  midnightMint: '#3D7268',
  midnightMintLight: '#E5F0EE',
  midnightMintDark: '#2A5550',

  black: '#1b1c19',
  gray900: '#2d2e2b',
  gray700: '#555555',
  gray600: '#717171',
  gray400: '#AEAEB2',
  gray200: '#e4e2dd',
  gray100: '#f0eee9',
  white: '#FFFFFF',

  cardBg: '#FFFFFF',
  surfaceBg: '#FAFBF8',

  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FFC107',
  warningLight: '#FFF8E1',

  danger: '#E53935',
  dangerLight: '#FFEBEE',

  adBg: '#fdf6e0',
  adText: '#5b4300',

  tabBorder: '#F0F0F0',
  tabIconActive: '#00BFA5',
  tabIconInactive: '#C0C0C0',  // neutral muted gray

  // Outline ("Ghost Border" — 접근성용 최소 경계선)
  outlineVariant: '#c3c8bb',

  // Ambient Shadow (씨앗 기반 자연광 그림자)
  ambientShadow: 'rgba(0, 150, 136, 0.04)',

  // Card decoration
  cardDivider: '#F5F5F5',
  cardPriceStrike: '#CCCCCC',

  // FAB
  fabRipple: 'rgba(255,255,255,0.25)',

  // Camera
  cameraOverlayDark: 'rgba(0,0,0,0.5)',
  cameraShutterBg: 'rgba(255,255,255,0.2)',

  // Modal / Overlay
  modalOverlay: 'rgba(0,0,0,0.4)',
  dropdownOverlay: 'rgba(0,0,0,0.3)',

  // 배너 / 모달 오버레이
  bannerOverlay: 'rgba(0,0,0,0.35)',
  bannerTextMuted: 'rgba(255,255,255,0.85)',
  modalOverlayDark: 'rgba(0,0,0,0.5)',

  // 카드 이미지 오버레이
  featuredImageOverlay: 'rgba(0,0,0,0.18)',
  heartBtnBg: 'rgba(0,0,0,0.28)',
  distanceBadgeBg: 'rgba(0,0,0,0.42)',
  priceBadgeBg: 'rgba(255,255,255,0.92)',
  wishlistImgBg: '#2A1F12',       // 찜 카드 이미지 플레이스홀더 배경 (다크 웜브라운)
  flyerSubtitleText: 'rgba(255,255,255,0.88)',
  flyerSubtitleTextDim: 'rgba(255,255,255,0.55)',
  flyerBannerBg: '#16110c',
  flyerFanBgLeft: '#1a2e14',
  flyerFanBgCenter: '#142410',
  flyerFanBgRight: '#2e1e08',
  flyerCircleOverlay: 'rgba(255,255,255,0.12)',
  flyerCircleOverlayFaint: 'rgba(255,255,255,0.08)',
  // HeroGradient 위 텍스트/칩 — 그라디언트 배경 위 화이트 반투명 레이어
  onGradientChip: 'rgba(255,255,255,0.22)',
  onGradientTextStrong: 'rgba(255,255,255,0.90)',
  onGradientTextBase: 'rgba(255,255,255,0.82)',
  onGradientTextMuted: 'rgba(255,255,255,0.80)',
  onGradientTextSubtle: 'rgba(255,255,255,0.70)',
  // 전단지 배너 primary 장식 오버레이
  flyerPrimaryDotOverlay: 'rgba(0,191,165,0.28)',
  // 전단지 상세 헤더 glassmorphism
  flyerDetailHeaderBg: 'rgba(255,253,248,0.95)',
  flyerHeroDateLine: 'rgba(255,255,255,0.40)',
  flyerHeroDateText: '#ffffff',

  // Material 3 on-surface-variant / outline (olive-tinted)
  onSurfaceVariant: '#43483f',   // 보조 텍스트 (olive 팔레트 기반)
  outlineColor: '#74796e',       // 흐린 텍스트 / 경계 (회색-올리브)

  // Error / Danger container (M3 errorContainer scheme)
  errorContainer: '#ffdad6',     // 에러 배경 (달라요 버튼 bg)
  onErrorContainer: '#93000a',   // 에러 배경 위 텍스트

  // Success container (M3 successContainer scheme)
  successContainer: '#e6f4ea',   // 성공 배경 (맞아요 버튼 bg)
  onSuccessContainer: '#1a7a3a', // 성공 배경 위 텍스트

  // Surface variant (중간 배경)
  surfaceVariant: '#dcdad5',     // 비활성 원 배지 배경

  // Tertiary dark (on tertiary)
  onTertiary: '#261a00',         // 황금 배지 위 텍스트

  // 그림자
  shadowBase: '#000000',

  // Kakao
  kakaoYellow: '#FEE500',

  // 전단지 페이퍼 (retro paper 느낌)
  flyerPaper: '#E6DDC8',
  flyerInk: '#2A1F14',
  flyerInkMono: '#8B6E3C',
  flyerInkSub: '#5A4328',
  flyerSwitcherBg: '#D4C6A4',
  flyerSwitcherActiveText: '#FDF5DD',
  flyerTabInactiveBg: 'rgba(255,255,255,0.55)',
  flyerTabInactiveBorder: 'rgba(42,31,20,0.25)',

  // 전단지 전용
  flyerRed: '#e60012',
  flyerHeroRed: '#dc2626',
  flyerBadgeYellow: '#FFD700',
  flyerBadgeBlue: '#2563eb',
  flyerProductDark: '#1a1a1a',
  starYellow: '#F59E0B',
} as const;

// ─── StoreType 카테고리 컬러 (StoreSelectScreen) ─────────────────────────
// 레퍼런스 `마실 2/screens-register.jsx` catBadge 규칙 기반.
// 매장 리스트 카드 좌측 뱃지와 지도 핀 색상을 동일하게 사용.
export const storeCategoryColors = {
  convenience:       { bg: '#E8F1FF', fg: '#1E6BD1' }, // 편의점 — 파랑
  traditional_market:{ bg: '#FFF0DB', fg: '#B55A00' }, // 시장 — 주황
  supermarket:       { bg: '#E8F7EC', fg: '#1B7A3A' }, // 슈퍼 — 초록
  large_mart:        { bg: '#FFF8E1', fg: '#B8860B' }, // 대형마트 — 머스터드
  mart:              { bg: '#E0F7F3', fg: '#00857A' }, // 일반 마트 — primary
} as const;

export type StoreCategoryKey = keyof typeof storeCategoryColors;

// ─── 가격표(PriceTag) 그라디언트 토큰 ─────────────────────────────────────
// LinearGradient start/end 쌍. 135deg 방향 권장.
// 실제 매장 가격표 색상 관습 기반: sale/closing=레드, member=퍼플, card=딥블루, flat=옐로우
export const priceTagGradients = {
  normal: ['#00BFA5', '#00A58E'] as const,       // teal (primary)
  sale: ['#FF4D4F', '#D63C3E'] as const,         // 세일 레드
  special: ['#FF7043', '#F4511E'] as const,      // 오렌지 (핫딜)
  closing: ['#E53935', '#B71C1C'] as const,      // 마감 딥레드
  bundle: ['#26A69A', '#00897B'] as const,       // 틸 (1+1)
  flat: ['#E8BC50', '#D1A337'] as const,         // 골드 (균일가)
  member: ['#7E57C2', '#5E35B1'] as const,       // 퍼플 (회원)
  cardPayment: ['#2C3E50', '#4CA1AF'] as const,  // 딥블루→틸 (카드 할인, BI 중립)
} as const;

export type PriceTagGradientKey = keyof typeof priceTagGradients;
