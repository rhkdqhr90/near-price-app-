import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Share,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Vibration,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../../navigation/types';
import type { PriceResponse, ProductCategory } from '../../types/api.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { formatPrice, formatRelativeTime } from '../../utils/format';
import EmptyState from '../../components/common/EmptyState';
import WifiOffIcon from '../../components/icons/WifiOffIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import ShareIcon from '../../components/icons/ShareIcon';
import HeartIcon from '../../components/icons/HeartIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import PriceRangeBar from '../../components/price/PriceRangeBar';
import StoreRankRow, { type StoreRankRowData } from '../../components/price/StoreRankRow';
import StoreHistorySheet from '../../components/price/StoreHistorySheet';
import { usePriceDetail, useProductPricesByName } from '../../hooks/queries/usePrices';
import { useVerifyPrice, useMyVerificationByPrice } from '../../hooks/queries/useVerification';
import { useMyWishlist, useAddWishlist, useRemoveWishlist } from '../../hooks/queries/useWishlist';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import { classifyError } from '../../utils/apiError';

type Props = HomeScreenProps<'PriceDetail'>;

type TabKey = 'stores' | 'history' | 'info';

const CATEGORY_LABELS: Record<ProductCategory, string> = {
  vegetable: '채소',
  fruit: '과일',
  meat: '육류',
  seafood: '해산물',
  dairy: '유제품',
  grain: '곡류',
  processed: '가공식품',
  household: '생활용품',
  other: '기타',
};

// Haversine 거리 계산 (미터 단위)
const haversineM = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
};

/**
 * 상품 상세 / 가격 비교 화면 (레퍼런스 `마실 2/screens-detail.jsx` 1:1 리디자인).
 *
 * 구조:
 *   (A) Sticky Header — 뒤로 + 상품명 + 공유 + 하트(찜)
 *   (B) Hero LinearGradient — "LOWEST NEAR YOU" + 대표가
 *   (C) PriceRangeBar 카드 — 최저/평균/최고 분포
 *   (D) Tabs — 가격 비교 / 가격 추이 / 품목 정보
 *   (E) 이 마트 등록 이력 (StoreHistorySheet — 마트 row 탭 시 펼침)
 *   (F) Sticky Bottom CTA — 지도 버튼 + 새 가격 제보하기
 *
 * 기획(SCREENS.md §0): 대표가 정렬 price ASC → createdAt DESC → verificationCount DESC,
 * 중복 등록은 이력 추가, 달라요 👎 N 수치 병기.
 */
const PriceDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { priceId } = route.params;
  const insets = useSafeAreaInsets();

  const [tab, setTab] = useState<TabKey>('stores');
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);

  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputePrice, setDisputePrice] = useState('');
  const [disputeError, setDisputeError] = useState<string | null>(null);

  const showToast = useToastStore((s) => s.showToast);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const myLat = useLocationStore((s) => s.latitude);
  const myLng = useLocationStore((s) => s.longitude);

  const { data: price, isLoading, isError, refetch } = usePriceDetail(priceId);
  const { data: allPricesData } = useProductPricesByName(price?.product.name ?? '');
  const { data: myVerification } = useMyVerificationByPrice(priceId);
  const { mutate: verifyPrice, isPending: isVerifying } = useVerifyPrice(priceId);
  const { data: wishlist } = useMyWishlist();
  const { mutate: addWishlist } = useAddWishlist();
  const { mutate: removeWishlist } = useRemoveWishlist();

  // ─── 파생 값 ────────────────────────────────────────────────────────────────
  const allPrices = useMemo(() => allPricesData ?? [], [allPricesData]);

  /**
   * 마트별 대표가 (SCREENS.md §0-1):
   *   동일 storeId 내 price ASC → createdAt DESC → verificationCount DESC
   */
  const storeRepresentatives = useMemo<PriceResponse[]>(() => {
    const byStore = new Map<string, PriceResponse[]>();
    for (const p of allPrices) {
      const arr = byStore.get(p.store.id) ?? [];
      arr.push(p);
      byStore.set(p.store.id, arr);
    }
    const reps: PriceResponse[] = [];
    for (const arr of byStore.values()) {
      arr.sort((a, b) => {
        if (a.price !== b.price) return a.price - b.price;
        const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (diff !== 0) return diff;
        return b.verificationCount - a.verificationCount;
      });
      reps.push(arr[0]);
    }
    // 대표가 기준 오름차순
    reps.sort((a, b) => a.price - b.price);
    return reps;
  }, [allPrices]);

  const lowPrice = storeRepresentatives[0]?.price ?? price?.price ?? 0;
  const highPrice = storeRepresentatives[storeRepresentatives.length - 1]?.price ?? price?.price ?? 0;
  const avgPrice = useMemo(() => {
    if (storeRepresentatives.length === 0) return price?.price ?? 0;
    const sum = storeRepresentatives.reduce((s, r) => s + r.price, 0);
    return Math.round(sum / storeRepresentatives.length);
  }, [storeRepresentatives, price?.price]);

  const savingsPct = useMemo(() => {
    if (!highPrice || highPrice === lowPrice) return 0;
    return Math.round((1 - lowPrice / highPrice) * 100);
  }, [lowPrice, highPrice]);

  // 추이 placeholder: 최신 2건 비교 (백엔드 trend 미제공)
  const trendPct = useMemo<number | null>(() => {
    const thisStore = allPrices.filter((p) => p.store.id === price?.store.id);
    if (thisStore.length < 2) return null;
    const sorted = [...thisStore].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
    const latest = sorted[0].price;
    const prev = sorted[1].price;
    if (prev === 0) return null;
    return Math.round(((latest - prev) / prev) * 100);
  }, [allPrices, price?.store.id]);

  const rankRows = useMemo<StoreRankRowData[]>(() => {
    return storeRepresentatives.map((rep, idx) => {
      const store = rep.store;
      const distanceM =
        myLat != null && myLng != null && store.latitude != null && store.longitude != null
          ? haversineM(myLat, myLng, store.latitude, store.longitude)
          : null;
      return {
        rank: idx + 1,
        storeName: store.name,
        distanceM,
        price: rep.price,
        time: formatRelativeTime(rep.createdAt),
        reporter: rep.user?.nickname ?? '익명',
        isMine: !!currentUserId && rep.user?.id === currentUserId,
        confirmCount: rep.confirmedCount,
        disputeCount: rep.disputedCount,
      };
    });
  }, [storeRepresentatives, myLat, myLng, currentUserId]);

  const currentStoreRepIndex = useMemo(
    () => storeRepresentatives.findIndex((r) => r.store.id === price?.store.id),
    [storeRepresentatives, price?.store.id],
  );
  const currentRank = currentStoreRepIndex >= 0 ? currentStoreRepIndex + 1 : null;
  const compareCount = storeRepresentatives.length;

  const isWishlisted = useMemo(() => {
    if (!wishlist || !price) return false;
    return wishlist.items.some((i) => i.productId === price.product.id);
  }, [wishlist, price]);

  const isOwnPrice = !!currentUserId && price?.user?.id === currentUserId;
  const hasVerified = !!myVerification;

  // ─── 핸들러 ──────────────────────────────────────────────────────────────────
  const handleToggleWish = useCallback(() => {
    if (!price || !currentUserId) {
      showToast('로그인이 필요해요', 'error');
      return;
    }
    if (isWishlisted) {
      removeWishlist(price.product.id);
    } else {
      addWishlist(price.product.id);
    }
  }, [price, currentUserId, isWishlisted, addWishlist, removeWishlist, showToast]);

  const handleShare = useCallback(async () => {
    if (!price) return;
    try {
      const message = `[마실] ${price.product.name} ${formatPrice(price.price)} - ${price.store.name}\n${price.store.address}\n내 동네 최저가를 찾아보세요!`;
      await Share.share({ message });
    } catch {
      showToast('공유할 수 없어요', 'error');
    }
  }, [price, showToast]);

  const handleRegisterNew = useCallback(() => {
    navigation.getParent()?.navigate('PriceRegisterStack' as never);
  }, [navigation]);

  const handleStoreRowPress = useCallback((storeId: string) => {
    setExpandedStoreId((prev) => (prev === storeId ? null : storeId));
  }, []);

  const handleConfirmPrice = useCallback(() => {
    if (isOwnPrice) {
      showToast('본인이 등록한 가격은 검증할 수 없어요', 'error');
      return;
    }
    if (hasVerified) {
      showToast('이미 검증에 참여했어요', 'error');
      return;
    }
    verifyPrice(
      { result: 'confirmed' },
      {
        onSuccess: () => {
          Vibration.vibrate(30);
          showToast('가격을 확인했어요!', 'success');
        },
        onError: () => {
          showToast('가격 확인 처리에 실패했습니다.', 'error');
        },
      },
    );
  }, [verifyPrice, showToast, isOwnPrice, hasVerified]);

  const handleDisputeSubmit = useCallback(() => {
    if (isOwnPrice) {
      setDisputeError('본인이 등록한 가격은 검증할 수 없습니다');
      return;
    }
    if (hasVerified) {
      setDisputeError('이미 검증에 참여했습니다');
      return;
    }
    const trimmed = disputePrice.trim();
    if (!/^\d+$/.test(trimmed)) {
      setDisputeError('숫자만 입력해 주세요');
      return;
    }
    const actualPrice = parseInt(trimmed, 10);
    if (actualPrice <= 0) {
      setDisputeError('0원보다 큰 가격을 입력해 주세요');
      return;
    }
    if (actualPrice > 10_000_000) {
      setDisputeError('10,000,000원 이하로 입력해 주세요');
      return;
    }
    setDisputeError(null);
    verifyPrice(
      { result: 'disputed', actualPrice },
      {
        onSuccess: () => {
          setShowDisputeModal(false);
          setDisputePrice('');
          setDisputeError(null);
          Vibration.vibrate(30);
          showToast('이의 제기가 등록되었어요', 'success');
        },
        onError: (err) => {
          setDisputeError(classifyError(err).message);
        },
      },
    );
  }, [disputePrice, verifyPrice, showToast, isOwnPrice, hasVerified]);

  // ─── Loading / Error ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerLoading}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <ChevronLeftIcon size={spacing.iconLg} color={colors.onBackground} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (isError || !price) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.headerLoading}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <ChevronLeftIcon size={spacing.iconLg} color={colors.onBackground} />
          </TouchableOpacity>
        </View>
        <EmptyState
          icon={WifiOffIcon}
          title="정보를 불러올 수 없어요"
          subtitle="네트워크 상태를 확인하고 다시 시도해 주세요."
          action={{ label: '다시 시도', onPress: refetch }}
        />
      </SafeAreaView>
    );
  }

  const productName = price.product.name;
  const categoryLabel = CATEGORY_LABELS[price.product.category] ?? '기타';
  const heroPrice = lowPrice.toLocaleString('ko-KR');

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* ─── (A) Sticky Header ────────────────────────────────────────────── */}
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <ChevronLeftIcon size={spacing.iconLg} color={colors.onBackground} />
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {productName}
          </Text>
          <Text style={styles.headerSubtitle}>
            {compareCount}곳에서 가격 비교 중
          </Text>
        </View>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleShare}
          accessibilityRole="button"
          accessibilityLabel="공유하기"
        >
          <ShareIcon size={spacing.iconLg} color={colors.onBackground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={handleToggleWish}
          accessibilityRole="button"
          accessibilityLabel={isWishlisted ? '찜 해제' : '찜 추가'}
        >
          <HeartIcon
            size={spacing.iconLg}
            color={isWishlisted ? colors.danger : colors.onBackground}
            filled={isWishlisted}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── (B) Hero ───────────────────────────────────────────────────── */}
        <View style={styles.heroWrap}>
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            {currentRank === 1 ? (
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>BEST PRICE</Text>
              </View>
            ) : null}
            <View style={styles.heroBottom}>
              <Text style={styles.heroKicker}>LOWEST NEAR YOU</Text>
              <View style={styles.heroPriceRow}>
                <Text style={styles.heroPrice}>{heroPrice}</Text>
                <Text style={styles.heroPriceUnit}>원</Text>
                {trendPct !== null ? (
                  <Text style={styles.heroTrend}>
                    {trendPct < 0 ? '↓' : trendPct > 0 ? '↑' : '·'} {Math.abs(trendPct)}%
                  </Text>
                ) : null}
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ─── (C) 가격 분포 카드 ─────────────────────────────────────────── */}
        <View style={styles.rangeCard}>
          <View style={styles.rangeHeader}>
            <Text style={styles.rangeTitle}>동네 가격 분포</Text>
            {savingsPct > 0 ? (
              <View style={styles.savingsPill}>
                <Text style={styles.savingsPillText}>{savingsPct}% 절약 가능</Text>
              </View>
            ) : null}
          </View>
          <PriceRangeBar low={lowPrice} avg={avgPrice} high={highPrice} />
        </View>

        {/* ─── (D) Tabs ───────────────────────────────────────────────────── */}
        <View style={styles.tabs}>
          {([
            { k: 'stores' as const, l: `가격 비교 · ${compareCount}` },
            { k: 'history' as const, l: '가격 추이' },
            { k: 'info' as const, l: '품목 정보' },
          ]).map((tb) => {
            const active = tab === tb.k;
            return (
              <TouchableOpacity
                key={tb.k}
                style={[styles.tabBtn, active && styles.tabBtnActive]}
                onPress={() => setTab(tb.k)}
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.tabText, active && styles.tabTextActive]}>
                  {tb.l}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* D-1 가격 비교 */}
        {tab === 'stores' ? (
          <View style={styles.tabContent}>
            {rankRows.length === 0 ? (
              <Text style={styles.emptyText}>
                주변에 등록된 가격이 없어요.{'\n'}첫 제보자가 되어 주세요.
              </Text>
            ) : (
              rankRows.map((row) => {
                const rep = storeRepresentatives[row.rank - 1];
                const expanded = expandedStoreId === rep.store.id;
                return (
                  <View key={rep.id} style={styles.rankRowWrap}>
                    <StoreRankRow
                      data={row}
                      minPrice={lowPrice}
                      expanded={expanded}
                      onPress={() => handleStoreRowPress(rep.store.id)}
                    />
                    {expanded ? (
                      <StoreHistorySheet
                        storeId={rep.store.id}
                        productId={rep.product.id}
                      />
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        ) : null}

        {/* D-2 가격 추이 */}
        {tab === 'history' ? (
          <View style={styles.tabContent}>
            <View style={styles.historyCard}>
              <View style={styles.historyHeader}>
                <View>
                  <Text style={styles.historyTitle}>최근 등록 가격</Text>
                  <Text style={styles.historySub}>
                    {lowPrice.toLocaleString('ko-KR')} ~ {highPrice.toLocaleString('ko-KR')}원
                  </Text>
                </View>
                {trendPct !== null ? (
                  <View
                    style={[
                      styles.trendPill,
                      trendPct <= 0 ? styles.trendPillDown : styles.trendPillUp,
                    ]}
                  >
                    <Text
                      style={[
                        styles.trendPillText,
                        trendPct <= 0 ? styles.trendPillTextDown : styles.trendPillTextUp,
                      ]}
                    >
                      {trendPct < 0 ? '↓' : trendPct > 0 ? '↑' : '·'} {Math.abs(trendPct)}%
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.historyPlaceholder}>
                아직 추이 데이터를 준비 중이에요.{'\n'}
                동네 제보가 쌓이면 차트가 표시됩니다.
              </Text>
            </View>
          </View>
        ) : null}

        {/* D-3 품목 정보 */}
        {tab === 'info' ? (
          <View style={styles.tabContent}>
            <View style={styles.infoCard}>
              <InfoRow label="카테고리" value={categoryLabel} />
              <InfoRow label="최근 업데이트" value={formatRelativeTime(price.createdAt)} />
              <InfoRow label="첫 등록자" value={price.user?.nickname ?? '익명'} />
              <InfoRow label="누적 제보" value={`${allPrices.length}건`} />
            </View>

            {/* 맞아요/달라요 — 본인 등록 아닐 때만 */}
            {!isOwnPrice && currentUserId ? (
              <View style={styles.verifyRow}>
                <TouchableOpacity
                  style={[styles.verifyBtn, styles.confirmBtn, hasVerified && styles.verifyBtnDisabled]}
                  onPress={handleConfirmPrice}
                  disabled={hasVerified || isVerifying}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="가격이 맞아요"
                >
                  <Text style={styles.confirmBtnText}>
                    맞아요 ✓ {price.confirmedCount}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.verifyBtn, styles.disputeBtn, hasVerified && styles.verifyBtnDisabled]}
                  onPress={() => setShowDisputeModal(true)}
                  disabled={hasVerified || isVerifying}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="가격이 달라요"
                >
                  <Text style={styles.disputeBtnText}>
                    달라요 ✗ {price.disputedCount}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={{ height: spacing.xxl + insets.bottom + spacing.stickyReactionBarHeight }} />
      </ScrollView>

      {/* ─── (F) Sticky Bottom CTA ─────────────────────────────────────────── */}
      <View style={[styles.ctaBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <TouchableOpacity
          style={styles.mapBtn}
          onPress={() => {
            /* 추후 StoreDetailScreen 또는 외부 지도 연동 */
            showToast('지도 보기는 준비 중이에요', 'info');
          }}
          accessibilityRole="button"
          accessibilityLabel="지도에서 보기"
        >
          <MapPinIcon size={spacing.iconLg} color={colors.onBackground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.ctaPrimary}
          onPress={handleRegisterNew}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="새 가격 제보하기"
        >
          <Text style={styles.ctaPrimaryText}>새 가격 제보하기</Text>
        </TouchableOpacity>
      </View>

      {/* ─── Dispute Modal (기존 이식) ─────────────────────────────────────── */}
      <Modal
        visible={showDisputeModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowDisputeModal(false);
          setDisputePrice('');
          setDisputeError(null);
        }}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              setShowDisputeModal(false);
              setDisputePrice('');
              setDisputeError(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="모달 닫기"
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>실제 가격 입력</Text>
            <Text style={styles.modalSubtitle}>
              현재 표시된 가격이 다르다면 실제 확인한 가격을 입력해 주세요.
            </Text>
            <TextInput
              style={styles.disputeInput}
              placeholder="실제 가격 (원)"
              placeholderTextColor={colors.gray400}
              keyboardType="number-pad"
              value={disputePrice}
              onChangeText={(v) => {
                setDisputePrice(v);
                if (disputeError) setDisputeError(null);
              }}
              autoFocus
              accessibilityLabel="실제 가격 입력"
            />
            {disputeError ? (
              <Text style={styles.disputeErrorText}>{disputeError}</Text>
            ) : null}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowDisputeModal(false);
                  setDisputePrice('');
                  setDisputeError(null);
                }}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="취소"
              >
                <Text style={styles.modalCancelBtnText}>취소</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalBtn,
                  styles.modalSubmitBtn,
                  (isVerifying || !disputePrice.trim() || !/^\d+$/.test(disputePrice.trim())) &&
                    styles.modalBtnDisabled,
                ]}
                onPress={handleDisputeSubmit}
                disabled={isVerifying || !disputePrice.trim() || !/^\d+$/.test(disputePrice.trim())}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="이의 제기 제출"
              >
                {isVerifying ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>제출</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

// ─── 작은 서브 컴포넌트 ────────────────────────────────────────────────────────
const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const HERO_H = 160;
const MAP_BTN_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // ─── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: spacing.borderHairline,
    borderBottomColor: colors.outlineVariant,
  },
  headerLoading: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerIconBtn: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontFamily: PJS.extraBold,
    fontSize: 15,
    color: colors.onBackground,
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 1,
  },

  // ─── Loading / Scroll ──────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
  },

  // ─── (B) Hero ──────────────────────────────────────────────────────────────
  heroWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  hero: {
    height: HERO_H,
    borderRadius: spacing.radiusHero - 4,
    overflow: 'hidden',
    padding: spacing.lg,
    justifyContent: 'space-between',
  },
  heroBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.flyerBadgeYellow,
  },
  heroBadgeText: {
    fontFamily: PJS.extraBold,
    fontSize: 10,
    color: colors.onBackground,
    letterSpacing: 0.5,
  },
  heroBottom: {
    gap: spacing.xs,
  },
  heroKicker: {
    fontFamily: PJS.extraBold,
    fontSize: 10,
    color: colors.white,
    letterSpacing: 2,
    opacity: 0.85,
  },
  heroPriceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  heroPrice: {
    fontFamily: PJS.extraBold,
    fontSize: 38,
    color: colors.white,
    letterSpacing: -1.5,
    lineHeight: 44,
  },
  heroPriceUnit: {
    fontFamily: PJS.bold,
    fontSize: 18,
    color: colors.white,
  },
  heroTrend: {
    fontFamily: PJS.bold,
    fontSize: 11,
    color: colors.white,
    opacity: 0.85,
    marginLeft: spacing.sm,
  },

  // ─── (C) PriceRange Card ───────────────────────────────────────────────────
  rangeCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusInput,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
  },
  rangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm + spacing.micro,
  },
  rangeTitle: {
    ...typography.labelMd,
    color: colors.onBackground,
  },
  savingsPill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primaryLight,
  },
  savingsPillText: {
    fontFamily: PJS.extraBold,
    fontSize: 11,
    color: colors.primary,
  },

  // ─── (D) Tabs ──────────────────────────────────────────────────────────────
  tabs: {
    flexDirection: 'row',
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.outlineVariant,
  },
  tabBtn: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.md,
    marginRight: spacing.sm,
    borderBottomWidth: spacing.borderMedium,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontFamily: PJS.semiBold,
    fontSize: 13,
    color: colors.onSurfaceVariant,
    letterSpacing: -0.2,
  },
  tabTextActive: {
    fontFamily: PJS.extraBold,
    color: colors.onBackground,
  },
  tabContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md + 2,
    gap: spacing.sm,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.xxl,
    lineHeight: 20,
  },

  // ─── Rank Row (D-1) ────────────────────────────────────────────────────────
  rankRowWrap: {
    gap: 0,
  },

  // ─── D-2 history ───────────────────────────────────────────────────────────
  historyCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusInput,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyTitle: {
    ...typography.labelMd,
    color: colors.onBackground,
  },
  historySub: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  historyPlaceholder: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingVertical: spacing.xl,
    lineHeight: 20,
  },
  trendPill: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.cardTextGap,
    borderRadius: spacing.radiusFull,
  },
  trendPillDown: {
    backgroundColor: colors.primaryLight,
  },
  trendPillUp: {
    backgroundColor: colors.dangerLight,
  },
  trendPillText: {
    fontFamily: PJS.extraBold,
    fontSize: 11,
  },
  trendPillTextDown: {
    color: colors.primary,
  },
  trendPillTextUp: {
    color: colors.danger,
  },

  // ─── D-3 info ──────────────────────────────────────────────────────────────
  infoCard: {
    padding: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusInput,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    gap: spacing.sm + 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },
  infoValue: {
    ...typography.bodySm,
    fontFamily: PJS.bold,
    color: colors.onBackground,
  },

  verifyRow: {
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginTop: spacing.md,
  },
  verifyBtn: {
    flex: 1,
    paddingVertical: spacing.md + 2,
    borderRadius: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtnDisabled: {
    opacity: spacing.disabledOpacity,
  },
  confirmBtn: {
    backgroundColor: colors.successContainer,
  },
  confirmBtnText: {
    fontFamily: PJS.bold,
    fontSize: 13,
    color: colors.onSuccessContainer,
  },
  disputeBtn: {
    backgroundColor: colors.errorContainer,
  },
  disputeBtnText: {
    fontFamily: PJS.bold,
    fontSize: 13,
    color: colors.onErrorContainer,
  },

  // ─── (F) CTA Bar ───────────────────────────────────────────────────────────
  ctaBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm + 2,
    backgroundColor: colors.white,
    borderTopWidth: spacing.borderHairline,
    borderTopColor: colors.outlineVariant,
  },
  mapBtn: {
    width: MAP_BTN_SIZE,
    height: MAP_BTN_SIZE,
    borderRadius: spacing.md,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaPrimary: {
    flex: 1,
    height: MAP_BTN_SIZE,
    borderRadius: spacing.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: spacing.shadowOffsetYLg },
    shadowOpacity: spacing.primaryShadowOpacity,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: spacing.elevationMd,
  },
  ctaPrimaryText: {
    ...typography.labelMd,
    color: colors.white,
  },

  // ─── Modal (기존 이식) ─────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.modalOverlay,
  },
  modalSheet: {
    backgroundColor: colors.surfaceContainerLowest,
    borderTopLeftRadius: spacing.radiusXl,
    borderTopRightRadius: spacing.radiusXl,
    padding: spacing.xxl,
  },
  modalHandle: {
    width: spacing.headerIconSize,
    height: spacing.xs,
    backgroundColor: colors.gray200,
    borderRadius: spacing.radiusFull,
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    ...typography.headingLg,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    ...typography.bodySm,
    marginBottom: spacing.lg,
  },
  disputeInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    ...typography.body,
    marginBottom: spacing.sm,
  },
  disputeErrorText: {
    ...typography.error,
    marginBottom: spacing.sm,
  },
  modalButtonRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtn: {
    backgroundColor: colors.surfaceContainerLow,
  },
  modalCancelBtnText: {
    ...typography.body,
    fontFamily: PJS.semiBold,
    color: colors.gray700,
  },
  modalSubmitBtn: {
    backgroundColor: colors.primary,
  },
  modalSubmitBtnText: {
    ...typography.body,
    fontFamily: PJS.bold,
    color: colors.white,
  },
  modalBtnDisabled: {
    opacity: spacing.disabledOpacity,
  },
});

export default PriceDetailScreen;
