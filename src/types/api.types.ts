// ─── Auth ──────────────────────────────────────────────────────────────────

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: Pick<UserResponse, 'id' | 'email' | 'nickname' | 'profileImageUrl' | 'trustScore'>;
}

export interface KakaoLoginDto {
  kakaoAccessToken: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export type RefreshTokenResponse = Pick<AuthTokens, 'accessToken' | 'refreshToken'>;

// ─── User ──────────────────────────────────────────────────────────────────

export interface UserResponse {
  id: string;
  email: string;
  nickname: string;
  profileImageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  trustScore: number;
  notifPriceChange: boolean;
  notifPromotion: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PublicUserResponse {
  id: string;
  nickname: string;
  latitude: number | null;
  longitude: number | null;
  trustScore: number;
  notifPriceChange: boolean;
  notifPromotion: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateNicknameDto {
  nickname: string;
}

// UserResponse에서 파생하여 필드 추가 시 자동 동기화
export type UpdateNotificationSettingsDto = Partial<Pick<UserResponse, 'notifPriceChange' | 'notifPromotion'>>;

export interface CheckNicknameResponseDto {
  available: boolean;
}

// ─── Store ─────────────────────────────────────────────────────────────────

export type StoreType =
  | 'large_mart'
  | 'mart'
  | 'supermarket'
  | 'convenience'
  | 'traditional_market'
  | (string & {}); // 커스텀 카테고리를 위한 문자열 지원

export interface StoreResponse {
  id: string;
  name: string;
  type: StoreType;
  latitude: number;
  longitude: number;
  address: string;
  externalPlaceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NearbyStoreResponse {
  id: string;
  name: string;
  type: StoreType;
  latitude: number;
  longitude: number;
  address: string;
  distance: number;
}

export interface CreateStoreDto {
  name: string;
  type: StoreType;
  latitude: number;
  longitude: number;
  address: string;
  externalPlaceId?: string;
}

// ─── Product ───────────────────────────────────────────────────────────────

export type ProductCategory =
  | 'vegetable'
  | 'fruit'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'grain'
  | 'processed'
  | 'household'
  | 'other';

export type UnitType =
  | 'g'
  | 'kg'
  | 'ml'
  | 'l'
  | 'count'
  | 'bunch'
  | 'pack'
  | 'bag'
  | 'other';

export interface ProductResponse {
  id: string;
  name: string;
  category: ProductCategory;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProductDto {
  name: string;
  category: ProductCategory;
}

// ─── Paginated ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

// ─── Price ─────────────────────────────────────────────────────────────────

export interface PriceResponse {
  id: string;
  user: PublicUserResponse | null;
  store: StoreResponse;
  product: ProductResponse;
  price: number;
  quantity: number | null;
  unitType: UnitType;
  imageUrl: string;
  saleStartDate: string | null;
  saleEndDate: string | null;
  condition: string | null;
  isActive: boolean;
  likeCount: number;
  reportCount: number;
  trustScore: number | null;
  verificationCount: number;
  confirmedCount: number;
  disputedCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePriceDto {
  storeId: string;
  productId: string;
  price: number;
  imageUrl: string;
  quantity?: number;
  unitType?: UnitType;
  saleStartDate?: string;
  saleEndDate?: string;
  condition?: string;
  // ── 가격표(PriceTag) 필드 ──
  priceTagType?: PriceTagType;
  originalPrice?: number;
  bundleType?: BundleType;
  bundleQty?: number;
  flatGroupName?: string;
  memberPrice?: number;
  endsAt?: string; // ISO
  cardLabel?: string;
  cardDiscountType?: CardDiscountType;
  cardDiscountValue?: number;
  cardConditionNote?: string;
  note?: string;
}

export interface UpdatePriceDto {
  price?: number;
  quantity?: number;
  imageUrl?: string;
  saleStartDate?: string;
  saleEndDate?: string;
  condition?: string;
}

// ─── Price Submit (네비게이션 파라미터) ────────────────────────────────────

export interface PriceSubmitData {
  productId: string;
  productName: string;
  price: number;
  quantity?: number;
  unitType: UnitType;
  condition?: string;
  imageUri: string;
}

// ─── Wishlist ──────────────────────────────────────────────────────────────

export interface WishlistItem {
  productId: string;
  productName: string;
  category: ProductCategory;
  unitType: UnitType | null;
  lowestPrice: number | null;
  lowestPriceStoreName: string | null;
  imageUrl: string | null;
  verificationCount: number;
  addedAt: string;
}

export interface WishlistResponse {
  totalCount: number;
  items: WishlistItem[];
}

// ─── Upload ────────────────────────────────────────────────────────────────

export interface UploadResponse {
  url: string;
}

// ─── Notice ────────────────────────────────────────────────────────────────

export interface NoticeResponse {
  id: string;
  title: string;
  content: string;
  isActive: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── FAQ ───────────────────────────────────────────────────────────────────

export interface FaqItemResponse {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  orderIndex: number;
  isActive: boolean;
  createdAt: string;
}

export interface FaqGroupResponse {
  category: string | null;
  items: FaqItemResponse[];
}

// ─── Reaction ──────────────────────────────────────────────────────────────

export type ReactionType = 'confirm' | 'report';

export interface ReactionResponse {
  confirmCount: number;
  reportCount: number;
  myReaction: ReactionType | null;
}

// ─── Verification (신뢰도 검증) ──────────────────────────────────────────

export type VerificationResult = 'confirmed' | 'disputed';

export interface CreateVerificationDto {
  result: VerificationResult;
  actualPrice?: number;
}

export interface VerifierProfile {
  id: string;
  nickname: string;
  trustScore: number;
  representativeBadge?: {
    type: string;
    name: string;
    icon: string;
  } | null;
  profileImageUrl?: string | null;
}

export interface VerificationDetail {
  id: string;
  result: VerificationResult;
  actualPrice: number | null;
  verifier: VerifierProfile;
  createdAt: string;
}

export interface VerificationListResponse {
  data: VerificationDetail[];
  meta: {
    total: number;
    confirmedCount: number;
    disputedCount: number;
  };
}

export interface VerificationResponse {
  id: string;
  priceId: string;
  result: VerificationResult;
  actualPrice: number | null;
  newPriceId: string | null;
  createdAt: string;
}

export interface MyVerificationByPriceResponse {
  id: string;
  priceId: string;
  result: VerificationResult;
  actualPrice: number | null;
  newPriceId: string | null;
  createdAt: string;
}

export interface MyVerificationItem {
  id: string;
  priceId: string;
  result: VerificationResult;
  actualPrice: number | null;
  price: {
    id: string;
    price: number;
    product: { id: string; name: string };
    store: { id: string; name: string };
  };
  createdAt: string;
}

export interface MyVerificationsResponse {
  data: MyVerificationItem[];
  meta: { total: number };
}

export interface PriceTrustScoreResponse {
  priceId: string;
  trustScore: number | null;
  status: 'scored' | 'verifying' | 'new';
  verificationCount: number;
  confirmedCount: number;
  disputedCount: number;
  isStale: boolean;
  registeredAt: string;
  daysSinceRegistered: number;
}

// ─── Trust Score & Badges ────────────────────────────────────────────────

export interface UserTrustScoreResponse {
  userId: string;
  trustScore: number;
  registrationScore: number;
  verificationScore: number;
  consistencyBonus: number;
  totalRegistrations: number;
  totalVerifications: number;
  calculatedAt: string;
}

export interface BadgeInfo {
  type: string;
  name: string;
  icon: string;
  category: 'registration' | 'verification' | 'trust';
  earnedAt?: string;
}

export interface BadgeProgress {
  type: string;
  name: string;
  icon: string;
  category: 'registration' | 'verification' | 'trust';
  current: number;
  threshold: number;
  progressPercent: number;
}

export interface UserBadgesResponse {
  earned: BadgeInfo[];
  progress: BadgeProgress[];
}

// ─── Search ────────────────────────────────────────────────────────────────

export interface SearchProductResult {
  id: string;
  name: string;
  score: number;
  highlight: string[];
}

// ─── Inquiry ───────────────────────────────────────────────────────────────

export interface InquiryResponse {
  id: string;
  title: string;
  content: string;
  email: string;
  status: 'pending' | 'answered' | 'closed';
  adminReply: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInquiryDto {
  title: string;
  content: string;
  email: string;
}

// ─── Flyer ─────────────────────────────────────────────────────────────────

export interface FlyerProductItem {
  id: string;
  name: string;
  emoji: string;
  originalPrice: number | null;
  salePrice: number;
  badges: Array<{ label: string; type: 'red' | 'yellow' | 'blue' }>;
}

export interface FlyerReviewItem {
  id: string;
  name: string;
  initial: string;
  meta: string;
  content: string;
  helpfulCount?: number;
  avatarColor: string;
}

export interface FlyerResponse {
  id: string;
  storeName: string;
  promotionTitle: string;
  badge: string;
  badgeColor: string;
  dateRange: string;
  highlight: string;
  bgColor: string;
  emoji: string;
  warningText: string | null;
  ownerQuote: string | null;
  ownerName: string | null;
  ownerRole: string | null;
  storeAddress: string | null;
  storeRating: number | null;
  storeReviewCount: number | null;
  products: FlyerProductItem[] | null;
  reviews: FlyerReviewItem[] | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerPostResponse {
  id: string;
  ownerName: string;
  badge: string;
  message: string;
  emoji: string;
  likeCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── PriceTag (가격표 시스템) ─────────────────────────────────────────────
// API: src/price/entities/price.entity.ts 와 반드시 동기화

export type PriceTagType =
  | 'normal'
  | 'sale'
  | 'special'
  | 'closing'
  | 'bundle'
  | 'flat'
  | 'member'
  | 'cardPayment';

export type BundleType = '1+1' | '2+1' | '3+1';
export type CardDiscountType = 'amount' | 'percent';

export interface PriceTag {
  type: PriceTagType;
  originalPrice: number | null;
  bundleType: BundleType | null;
  bundleQty: number | null;
  flatGroupName: string | null;
  memberPrice: number | null;
  endsAt: string | null; // ISO
  cardLabel: string | null;
  cardDiscountType: CardDiscountType | null;
  cardDiscountValue: number | null;
  cardConditionNote: string | null;
  note: string | null;
}

export interface PriceSignals {
  storeCount: number;
  minPrice: number;
  maxPrice: number;
  avgPrice: number | null;
  isLowest7d: boolean;
  hasClosingDiscount: boolean;
  verificationCount: number;
}

// ─── ProductPriceCard (홈 무한스크롤용 상품별 집계) ──────────────────────────

export interface ProductPriceCard {
  productId: string;
  productName: string;
  unitType: UnitType | null; // 집계 결과에서 단위 정보가 없는 경우 null (ProductResponse와 의도적 차이)
  minPrice: number;
  maxPrice: number;
  storeCount: number;
  cheapestStore: {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  imageUrl: string | null;
  quantity: string | null;
  hasClosingDiscount: boolean;
  verificationCount: number;
  createdAt: string;
  registrant: { nickname: string; profileImageUrl: string | null } | null;
  // ── 가격표(PriceTag) 시스템 ──
  priceTag: PriceTag;
  signals: PriceSignals;
}

// ─── StoreReview ──────────────────────────────────────────────────────────

export interface StoreReviewResponse {
  id: string;
  rating: number;
  comment: string | null;
  user: { id: string; nickname: string };
  createdAt: string;
}

export interface CreateStoreReviewDto {
  rating: number;
  comment?: string;
}

// ─── Notification (앱 알림) ───────────────────────────────────────────────

export type NotificationType =
  | 'priceVerified'
  | 'priceDisputed'
  | 'newNearbyPrice'
  | 'wishlistLowered'
  | 'system';

export type NotificationLinkType =
  | 'price'
  | 'product'
  | 'store'
  | 'notice'
  | 'url';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  linkType: NotificationLinkType | null;
  linkId: string | null;
  imageUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationListResponse {
  items: AppNotification[];
  nextCursor: string | null;
}

export interface UnreadCountResponse {
  count: number;
}

// ─── Common ────────────────────────────────────────────────────────────────

export interface SuccessResponse {
  success: boolean;
}

// ─── Inquiry / Reaction DTOs ───────────────────────────────────────────────

export interface CreateReportDto {
  reason: string;
}

// ─── Error ─────────────────────────────────────────────────────────────────

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
