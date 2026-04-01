export const spacing = {
  // 기본 단위
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,

  // 레이아웃
  screenH: 20,   // 화면 좌우 패딩
  cardGap: 12,   // 카드 간격
  sectionGap: 24,// 섹션 간격
  headerContent: 20, // 헤더-콘텐츠 간격

  // 카드 패딩
  cardPadH: 16,  // 카드 가로 패딩
  cardPadV: 20,  // 카드 세로 패딩

  // 컴포넌트
  headerHeight: 56,
  tabBarContentHeight: 56, // insets.bottom 제외 탭바 콘텐츠 높이
  fabSize: 56,
  fabRight: 20,
  fabBottom: 16, // 탭바 상단으로부터 FAB까지의 여백

  // Toast
  toastMaxWidth: 320,
  zIndexToast: 9999,

  // 컴포넌트 내부 패딩 (디자인 시스템 기본값 14)
  inputPad: 14,
  // 카드 내 텍스트 간격 (디자인 시스템 기본값 6)
  cardTextGap: 6,

  // CameraScreen 전용
  cameraControlSize: 56,  // 갤러리 버튼 / 셔터 내부 고정 크기
  cameraShutterSize: 72,  // 셔터 버튼 고정 크기

  // OcrResultScreen 전용
  imagePreviewH: 220,     // OCR 결과 화면 이미지 미리보기 높이

  // 지도 미리보기 높이
  storeMapH: 200,           // StoreSelectScreen 지도 높이
  locationMapPreviewH: 200, // LocationSetupScreen 지도 미리보기 높이

  // 미세 간격 / 아이콘 크기
  micro: 2,               // 가장 작은 단위 간격 (카드 텍스트 라인 간격 등)
  iconSm: 16,             // 소형 인라인 아이콘/이모지 크기
  avatarInitialFont: 36,  // 아바타 이니셜 텍스트 크기
  modalMaxWidth: 320,     // 모달 최대 너비

  // Border Radius 토큰
  radiusSm: 6,
  radiusMd: 10,
  radiusLg: 16,
  radiusXl: 24,
  radiusFull: 9999,

  // 추가 컴포넌트 크기
  headerIconSize: 40,
  notifDotSize: 7,
  cardImageSize: 100,
  priceImageHeight: 280,
  priceImagePlaceholderHeight: 160,
  headerLargeHeight: 56,

  // 문의 화면
  inquiryContentH: 200,

  // 드롭다운 메뉴
  dropdownMenuWidth: 240,

  // 랭크 뱃지
  rankBadgeSize: 28,
  heartBtnSm: 30,      // 찜 삭제 버튼 (absolute 원형)
  heartBtnXs: 28,      // 소형 찜 버튼 (그리드 카드용)

  // 테두리 두께
  borderThin: 1,
  borderMedium: 2,
  borderEmphasis: 1.5,  // 강조 테두리 (버튼 아웃라인 등)
  dividerThick: 8,      // 섹션 간 두꺼운 구분선

  // 아이콘 크기
  iconXs: 14,
  iconMd: 18,
  iconLg: 22,

  // 뒤로가기 버튼 크기
  backBtnSize: 36,
  backBtnWidth: 60,    // 헤더 뒤로가기 버튼 컨테이너 너비 (좌우 대칭용)

  // 프로필 아바타 크기
  avatarSize: 112,

  // PriceDetailScreen 전용 크기 토큰
  priceDetailChartH: 128,          // 가격 트렌드 차트 플레이스홀더 높이
  priceDetailRankCircleSm: 32,     // 2위/3위 순위 원형 배지 크기
  priceDetailVerifyAvatarSize: 48, // 인증 현황 아바타 크기
  badgePadH: 10,                   // 배지 수평 패딩 (sm+micro = 8+2)

  // 매장 썸네일 크기 (PriceCompareScreen 1위 카드)
  storeThumbSize: 80,

  // 그림자 오프셋 Y
  shadowOffsetY: 1,    // 기본 카드/버튼 그림자
  shadowOffsetYLg: 4,  // 드롭다운 모달 그림자

  // 그림자 반경
  shadowRadiusSm: 2,   // 기본 카드/버튼 그림자
  shadowRadiusMd: 4,   // 검색바/FAB 그림자
  shadowRadiusXl: 8,   // 검색결과 패널 그림자
  shadowRadiusLg: 12,  // 드롭다운 모달 그림자

  // 그림자 오프셋 (추가)
  shadowOffsetYMd: 2,  // 검색바/FAB 아래방향 그림자
  shadowOffsetYUp: -3, // 검색결과 패널 위방향 그림자

  // 뱃지 카드 최소 높이 (MyPageScreen 스켈레톤 높이와 동기화)
  badgeCardMinHeight: 88,

  // Digital Concierge 반경 토큰
  radiusButton: 32,    // 버튼 (2rem = 32px)
  radiusCardXl: 48,    // Product Card (3rem = 48px, "pillowy")

  // Ambient Shadow 토큰 (olive 기반 자연광)
  ambientShadowRadius: 40,
  ambientShadowOpacity: 0.04,
  ambientShadowOffsetY: 8,

  // FAB 텍스트 토큰 (MainTabNavigator FAB 플러스 아이콘)
  fabPlusFontSize: 28,
  fabPlusLineHeight: 32,
  fabOverhang: 20,       // 탭바 상단 돌출 오프셋 (marginTop: -fabOverhang)

  // HomeScreen 전단지 팬 카드 토큰
  flyerFanWrapH: 120,
  flyerFanShadowOffsetY: 6,
  flyerFanShadowOpacity: 0.4,
  flyerFanShadowRadius: 10,
  flyerFanElevation: 8,

  // FAB 그림자 토큰
  fabShadowOffsetY: 6,
  fabShadowOpacity: 0.4,
  fabShadowRadius: 12,
  fabShadowElevation: 10,

  // 비활성화 불투명도
  disabledOpacity: 0.6,

  // 헤어라인 구분선 두께 (0.5px — iOS/Android 공통)
  borderHairline: 0.5,

  // 카드 그림자 불투명도
  cardShadowOpacityLight: 0.06, // 인라인 카드 (목록 아이템 등 — 가장 은은한 그림자)
  cardShadowOpacity: 0.08,
  // 플로팅 요소 그림자 불투명도 (검색바, FAB 등 — 카드보다 약간 강함)
  floatShadowOpacity: 0.12,
  // Primary 색상 그림자 불투명도 (확인 버튼 등)
  primaryShadowOpacity: 0.3,

  // 소형 텍스트 줄간격 (13pt 기준 — tagText/bodySm 계열)
  lineHeightSm: 18,
  // 중형 텍스트 줄간격 (13~15pt 계열 — 여러 줄 bodySm 텍스트 등)
  lineHeightMd: 20,

  // HomeScreen 피드 카드 이미지 크기
  feedCardImageSize: 88,

  // WishlistScreen 카드 이미지 크기 (피드보다 작게 — 텍스트 공간 확보)
  wishlistCardImgSize: 56,

  // 이모지 아이콘 크기
  emojiLg: 52,
  emojiMd: 28,       // 전단지 팬 카드 이모지 크기

  // LocationSetupScreen 전용 토큰
  buttonHeight: 52,     // GPS 자동 감지 버튼 / 확인 버튼 높이
  dragHandleW: 36,      // 바텀 패널 드래그 핸들 너비
  dragHandleH: 4,       // 바텀 패널 드래그 핸들 높이

  // StoreDetailScreen 전용 토큰
  reviewInputMinHeight: 80,  // 리뷰 입력창 최소 높이
  ratingStarSize: 32,        // 별점 선택 별 크기

  // Android Elevation 토큰 (그림자 높이 — 숫자가 클수록 그림자 강함)
  elevationXs: 2,   // 인라인 목록 카드 (가장 낮은 단계)
  elevationSm: 4,   // 칩 / 소형 카드
  elevationMd: 6,   // 검색 컨테이너 / 중형 카드
  elevationLg: 8,   // 패널 / 대형 카드
} as const;
