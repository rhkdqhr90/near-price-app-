export const colors = {
  primary: '#7B5E3A',          // 보리씨앗 갈색
  primaryLight: '#F5EFE6',     // 연한 크림
  primaryDark: '#5C4429',      // 어두운 갈색
  primaryContainer: '#9E7A50', // 중간 갈색
  onPrimary: '#ffffff',        // On Primary

  secondaryBg: '#f5f3ee',      // surface-container-low

  // Surface 계층 (No-Line Rule 구현 — 테두리 대신 배경색 계층으로 구분)
  surface: '#fbf9f4',
  surfaceContainerLowest: '#ffffff',
  surfaceContainerLow: '#f5f3ee',
  surfaceContainer: '#f0eee9',
  surfaceContainerHigh: '#eae8e3',
  surfaceContainerHighest: '#e4e2dd',
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
  surfaceBg: '#fbf9f4',

  success: '#4CAF50',
  successLight: '#E8F5E9',
  warning: '#FFC107',
  warningLight: '#FFF8E1',

  danger: '#E53935',
  dangerLight: '#FFEBEE',

  adBg: '#fdf6e0',
  adText: '#5b4300',

  tabBorder: '#F0F0F0',
  tabIconActive: '#7B5E3A',
  tabIconInactive: '#A08060',  // warm muted brown (씨앗 팔레트 기반 desaturated)

  // Outline ("Ghost Border" — 접근성용 최소 경계선)
  outlineVariant: '#c3c8bb',

  // Ambient Shadow (씨앗 기반 자연광 그림자)
  ambientShadow: 'rgba(123, 94, 58, 0.04)',

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
  // 전단지 상세 헤더 glassmorphism
  flyerDetailHeaderBg: 'rgba(255,253,248,0.95)',
  flyerHeroDateLine: 'rgba(255,255,255,0.40)',
  flyerHeroDateText: 'rgba(255,255,255,0.97)',

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

  // 전단지 전용
  flyerRed: '#e60012',
  flyerHeroRed: '#dc2626',
  flyerBadgeYellow: '#FFD700',
  flyerBadgeBlue: '#2563eb',
  flyerProductDark: '#1a1a1a',
  starYellow: '#F59E0B',
} as const;
