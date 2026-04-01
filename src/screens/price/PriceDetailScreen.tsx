import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  Share,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { HomeScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography, PJS } from '../../theme/typography';
import { formatPrice, formatRelativeTime, formatDate } from '../../utils/format';
import EmptyState from '../../components/common/EmptyState';
import WifiOffIcon from '../../components/icons/WifiOffIcon';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import SearchIcon from '../../components/icons/SearchIcon';
import ShareIcon from '../../components/icons/ShareIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import { useVerifications, useVerifyPrice } from '../../hooks/queries/useVerification';
import { usePriceDetail, useProductPricesByName } from '../../hooks/queries/usePrices';
import { usePriceTrustScore } from '../../hooks/queries/usePriceTrustScore';
import { useReactions, useConfirmReaction, useReportReaction } from '../../hooks/queries/useReactions';
import { useToastStore } from '../../store/toastStore';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import { isAxiosError } from '../../api/client';
import type { ProductCategory } from '../../types/api.types';

type Props = HomeScreenProps<'PriceDetail'>;

const HORIZONTAL_PADDING = spacing.xxl; // 24

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

const WEEK_DAYS = ['월', '화', '수', '목', '금', '토', '일'];

const PriceDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { priceId } = route.params;
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [disputePrice, setDisputePrice] = useState('');
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [reportError, setReportError] = useState<string | null>(null);
  const showToast = useToastStore((s) => s.showToast);
  const currentUserId = useAuthStore((s) => s.user?.id);
  const regionName = useLocationStore((s) => s.regionName);
  const insets = useSafeAreaInsets();

  const bottomSpacerStyle = useMemo(
    () => ({ height: spacing.xxl + insets.bottom + 60 }),
    [insets.bottom],
  );

  const headerDynamicStyle = useMemo(
    () => [styles.header, { paddingTop: insets.top }],
    [insets.top],
  );

  const {
    data: price,
    isLoading,
    isError,
    refetch,
  } = usePriceDetail(priceId);

  const { data: verifications } = useVerifications(priceId);
  const { data: trustScore } = usePriceTrustScore(priceId);
  const { mutate: verifyPrice, isPending: isVerifying } = useVerifyPrice(priceId);
  const { data: reactions } = useReactions(priceId);
  const { mutate: confirmReaction, isPending: isConfirming } = useConfirmReaction(priceId);
  const { mutate: reportReaction, isPending: isReporting } = useReportReaction(priceId);

  const { data: allPricesData } = useProductPricesByName(price?.product.name ?? '');

  const rankedPrices = useMemo(() => {
    if (!allPricesData) return [];
    return [...allPricesData].sort((a, b) => a.price - b.price);
  }, [allPricesData]);

  const currentRank = useMemo<number | null>(() => {
    if (rankedPrices.length === 0) return null;
    const idx = rankedPrices.findIndex(p => p.id === priceId);
    return idx >= 0 ? idx + 1 : null;
  }, [rankedPrices, priceId]);



  const hasVerified = verifications?.data?.some(
    (v) => v.verifier?.id === currentUserId,
  ) ?? false;

  const isOwnPrice = !!currentUserId && price?.user?.id === currentUserId;

  const handleConfirmPrice = useCallback(() => {
    verifyPrice(
      { result: 'confirmed' },
      {
        onSuccess: () => {
          showToast('가격을 확인했어요!', 'success');
        },
        onError: () => {
          showToast('가격 확인 처리에 실패했습니다.', 'error');
        },
      },
    );
  }, [verifyPrice, showToast]);

  const handleDisputeSubmit = useCallback(() => {
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
          showToast('이의 제기가 등록되었어요', 'success');
        },
        onError: (err) => {
          const msg = isAxiosError<{ message?: string }>(err)
            ? err.response?.data?.message
            : undefined;
          setDisputeError(msg ?? '이의 제기에 실패했어요');
        },
      },
    );
  }, [disputePrice, verifyPrice, showToast]);

  const handleConfirmReaction = useCallback(() => {
    confirmReaction();
  }, [confirmReaction]);

  const handleReportSubmit = useCallback(() => {
    const trimmed = reportReason.trim();
    if (!trimmed) return;
    setReportError(null);
    reportReaction(trimmed, {
      onSuccess: () => {
        setShowReportModal(false);
        setReportReason('');
        setReportError(null);
        showToast('신고가 접수됐어요', 'success');
      },
      onError: () => {
        setReportError('신고 처리에 실패했어요. 다시 시도해 주세요.');
      },
    });
  }, [reportReason, reportReaction, showToast]);

  const handleShare = useCallback(async () => {
    if (!price) return;
    try {
      const message = `[마실] ${price.product.name} ${formatPrice(price.price)} - ${price.store.name}\n${price.store.address}\n내 동네 최저가를 찾아보세요!`;
      await Share.share({ message });
    } catch {
      showToast('공유할 수 없어요', 'error');
    }
  }, [price, showToast]);

  // ─── Loading State ───────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <ChevronLeftIcon size={spacing.xxl} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error State ─────────────────────────────────────────────────────────────
  if (isError || !price) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.goBack()}
            accessibilityRole="button"
            accessibilityLabel="뒤로 가기"
          >
            <ChevronLeftIcon size={spacing.xxl} color={colors.primary} />
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

  const hasSale = !!(price.saleStartDate && price.saleEndDate);
  const categoryLabel = CATEGORY_LABELS[price.product.category] ?? '기타';
  const priceInt = Math.floor(price.price);
  const priceFormatted = priceInt.toLocaleString('ko-KR');
  const verificationList = verifications?.data ?? [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* ─── Sticky Header ───────────────────────────────────────────────── */}
      <View style={headerDynamicStyle}>
        <TouchableOpacity
          style={styles.headerIconBtn}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="뒤로 가기"
        >
          <ChevronLeftIcon size={spacing.xxl} color={colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <MapPinIcon size={spacing.iconXs} color={colors.primary} />
          <Text style={styles.headerLocationText} numberOfLines={1}>
            {regionName ?? '동네'}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={() => navigation.navigate('Search', { initialQuery: undefined })}
            accessibilityRole="button"
            accessibilityLabel="검색"
          >
            <SearchIcon size={spacing.iconLg} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel="공유하기"
          >
            <ShareIcon size={spacing.iconLg} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Scroll Content ──────────────────────────────────────────────── */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* ─── 컨텍스트 칩 ─────────────────────────────────────────────── */}
        <View style={styles.contextChip}>
          <Text style={styles.contextChipText} numberOfLines={1}>{price.product.name}</Text>
        </View>

        {/* ─── 상품 정보 ───────────────────────────────────────────────── */}
        <View style={styles.productInfoSection}>
          {/* 배지 row */}
          <View style={styles.badgeRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryLabel}</Text>
            </View>
            {hasSale && (
              <View style={styles.saleBadge}>
                <Text style={styles.saleBadgeText}>할인 중</Text>
              </View>
            )}
          </View>

          {/* 가격 */}
          <View style={styles.priceRow}>
            <Text style={styles.priceNumber}>{priceFormatted}</Text>
            <Text style={styles.priceUnit}>원</Text>
            {currentRank !== null && (
              <View style={[styles.rankBadge, currentRank === 1 && styles.rankBadgeFirst]}>
                <Text style={[styles.rankBadgeText, currentRank === 1 && styles.rankBadgeFirstText]}>
                  {currentRank}위
                </Text>
              </View>
            )}
          </View>

          {/* 메타 */}
          <Text style={styles.metaText}>
            {price.store.name}
            {' · '}
            {formatRelativeTime(price.createdAt)}
            {price.verificationCount > 0 ? ` · 검증 ${price.verificationCount}명` : ''}
          </Text>

          {/* 등록자 카드 */}
          {price.user && (
            <View style={styles.registrantCard}>
              <View style={styles.registrantAvatar}>
                {price.user.profileImageUrl ? (
                  <Image
                    source={{ uri: price.user.profileImageUrl }}
                    style={StyleSheet.absoluteFillObject}
                    resizeMode="cover"
                    accessibilityLabel={`${price.user.nickname} 프로필 사진`}
                  />
                ) : (
                  <Text style={styles.registrantAvatarInitial}>
                    {price.user.nickname[0] ?? '?'}
                  </Text>
                )}
              </View>
              <View style={styles.registrantInfo}>
                <Text style={styles.registrantName}>{price.user.nickname}</Text>
                <Text style={styles.registrantMeta}>
                  {formatRelativeTime(price.createdAt)} · 신뢰점수 {price.user.trustScore}점
                </Text>
              </View>
            </View>
          )}

          {/* 본인 등록 가격 칩 */}
          {isOwnPrice && (
            <View style={styles.ownPriceChip}>
              <Text style={styles.ownPriceChipText}>내가 등록한 가격이에요</Text>
            </View>
          )}

          {/* 맞아요/달라요 버튼 — 본인 등록 아닐 때만 */}
          {!isOwnPrice && (
            <View style={styles.verifyBtnRow}>
              {isVerifying ? (
                <View style={styles.verifyingContainer}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={styles.verifyingText}>검증 중...</Text>
                </View>
              ) : hasVerified ? (
                <View style={styles.verifiedContainer}>
                  <Text style={styles.verifiedText}>검증에 참여했어요 ✓</Text>
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    style={[styles.verifyBtn, styles.confirmBtn]}
                    onPress={handleConfirmPrice}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="가격이 맞아요"
                  >
                    <Text style={styles.confirmBtnText}>맞아요 ✓</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.verifyBtn, styles.disputeBtn]}
                    onPress={() => setShowDisputeModal(true)}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="가격이 달라요"
                  >
                    <Text style={styles.disputeBtnText}>달라요 ✗</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

        </View>

        {/* ─── 가격 인증 현황 카드 ─────────────────────────────────────── */}
        {(!isOwnPrice || verificationList.length > 0) && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>가격 인증 현황</Text>

            {/* 검증 비율 바 */}
            {price.verificationCount > 0 && (
              <View style={styles.verifyRatioSection}>
                <View style={styles.verifyRatioBar}>
                  {price.confirmedCount > 0 && (
                    <View style={[styles.verifyConfirmedBar, { flex: price.confirmedCount }]} />
                  )}
                  {price.disputedCount > 0 && (
                    <View style={[styles.verifyDisputedBar, { flex: price.disputedCount }]} />
                  )}
                </View>
                <Text style={styles.verifyRatioText}>
                  맞아요 {price.confirmedCount}명  ·  달라요 {price.disputedCount}명
                </Text>
              </View>
            )}

            {verificationList.length === 0 ? (
              <Text style={styles.noVerificationText}>아직 인증한 사람이 없어요</Text>
            ) : (
              verificationList.map((v, idx) => (
                <View
                  key={v.id}
                  style={[
                    styles.verificationItem,
                    idx < verificationList.length - 1 && styles.verificationItemBorder,
                  ]}
                >
                  <View style={styles.verificationAvatar}>
                    <Text style={styles.verificationAvatarText}>
                      {(v.verifier?.nickname ?? '?')[0]}
                    </Text>
                  </View>
                  <View style={styles.verificationInfo}>
                    <Text style={styles.verificationName}>
                      {v.verifier?.nickname ?? '알 수 없음'}
                    </Text>
                    <Text style={styles.verificationTime}>
                      {formatRelativeTime(v.createdAt)}
                    </Text>
                  </View>
                  <View style={[
                    styles.verificationResultBadge,
                    v.result === 'confirmed' ? styles.confirmedResultBadge : styles.disputedResultBadge,
                  ]}>
                    <Text style={[
                      styles.verificationResultText,
                      v.result === 'confirmed' ? styles.confirmedResultText : styles.disputedResultText,
                    ]}>
                      {v.result === 'confirmed' ? '맞아요' : '달라요'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        )}

        {/* ─── 7일 가격 트렌드 카드 ────────────────────────────────────── */}
        <View style={styles.card}>
          <View style={styles.trendHeader}>
            <Text style={styles.cardTitle}>7일 가격 트렌드</Text>
            {trustScore && (
              <Text style={styles.trendSubLabel}>
                30일 최저가 {trustScore.status === 'scored' ? formatPrice(price.price) : '-'}
              </Text>
            )}
          </View>
          <View style={styles.chartPlaceholder} />
          <View style={styles.weekDayRow}>
            {WEEK_DAYS.map((d) => (
              <Text key={d} style={styles.weekDayLabel}>{d}</Text>
            ))}
          </View>
        </View>

        {/* 세일 기간 정보 (있을 때) */}
        {(price.saleStartDate || price.saleEndDate) && (
          <View style={[styles.card, styles.cardLast]}>
            <Text style={styles.cardTitle}>세일 기간</Text>
            <Text style={styles.saleText}>
              {price.saleStartDate ? formatDate(price.saleStartDate) : ''}
              {price.saleStartDate && price.saleEndDate ? ' ~ ' : ''}
              {price.saleEndDate ? formatDate(price.saleEndDate) : ''}
            </Text>
          </View>
        )}

        <View style={bottomSpacerStyle} />
      </ScrollView>

      {/* ─── 하단 고정 반응 바 ─────────────────────────────────────────── */}
      {!isOwnPrice && (
        <View style={styles.stickyReactionBar}>
          <TouchableOpacity
            style={[
              styles.reactionBtn,
              reactions?.myReaction === 'confirm' && styles.reactionBtnActive,
            ]}
            onPress={handleConfirmReaction}
            disabled={isConfirming}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`유용해요 ${reactions?.confirmCount ?? 0}명`}
          >
            <Text style={[
              styles.reactionBtnText,
              reactions?.myReaction === 'confirm' && styles.reactionBtnTextActive,
            ]}>
              👍 유용해요 {reactions?.confirmCount ?? 0}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.reactionReportBtn}
            onPress={() => setShowReportModal(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="신고하기"
          >
            <Text style={styles.reactionReportBtnText}>⚑ 신고</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ─── Dispute Modal ───────────────────────────────────────────────── */}
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
      {/* ─── Report Modal ────────────────────────────────────────────────── */}
      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowReportModal(false);
          setReportReason('');
          setReportError(null);
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
              setShowReportModal(false);
              setReportReason('');
              setReportError(null);
            }}
            accessibilityRole="button"
            accessibilityLabel="모달 닫기"
          />
          <View style={styles.modalSheet}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>신고하기</Text>
            <Text style={styles.modalSubtitle}>
              허위 가격, 부적절한 사진 등 신고 이유를 입력해 주세요.
            </Text>
            <TextInput
              style={styles.disputeInput}
              placeholder="신고 이유를 입력하세요"
              placeholderTextColor={colors.gray400}
              value={reportReason}
              onChangeText={(v) => {
                setReportReason(v);
                if (reportError) setReportError(null);
              }}
              autoFocus
              accessibilityLabel="신고 이유 입력"
            />
            {reportError ? (
              <Text style={styles.disputeErrorText}>{reportError}</Text>
            ) : null}
            <View style={styles.modalButtonRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.modalCancelBtn]}
                onPress={() => {
                  setShowReportModal(false);
                  setReportReason('');
                  setReportError(null);
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
                  (!reportReason.trim() || isReporting) && styles.modalBtnDisabled,
                ]}
                onPress={handleReportSubmit}
                disabled={!reportReason.trim() || isReporting}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="신고 제출"
              >
                {isReporting ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>신고</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // ─── Header ───────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  headerIconBtn: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  headerLocationText: {
    ...typography.headingMd,
    fontFamily: PJS.bold,
    color: colors.primary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // ─── Loading / Error ───────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Scroll ───────────────────────────────────────────────────────────────
  scrollView: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: spacing.lg,
  },

  // ─── 컨텍스트 칩 ──────────────────────────────────────────────────────────
  contextChip: {
    alignSelf: 'flex-start',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  contextChipText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
  },

  // ─── 상품 정보 섹션 ────────────────────────────────────────────────────────
  productInfoSection: {
    marginBottom: spacing.md,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  categoryBadge: {
    backgroundColor: colors.tertiaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
  },
  categoryBadgeText: {
    ...typography.captionBold,
    color: colors.onTertiaryContainer,
  },
  saleBadge: {
    backgroundColor: colors.errorContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
  },
  saleBadgeText: {
    ...typography.captionBold,
    color: colors.onErrorContainer,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  priceNumber: {
    ...typography.priceHero,
    color: colors.onBackground,
  },
  priceUnit: {
    ...typography.priceHeroUnit,
    color: colors.onSurfaceVariant,
    alignSelf: 'flex-end',
    paddingBottom: spacing.xs,
  },
  metaText: {
    ...typography.labelSm,
    color: colors.outlineColor,
    marginTop: spacing.xs,
  },

  // ─── 등록자 카드 ─────────────────────────────────────────────────────────────
  registrantCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  registrantAvatar: {
    width: spacing.priceDetailVerifyAvatarSize,
    height: spacing.priceDetailVerifyAvatarSize,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  registrantAvatarInitial: {
    ...typography.headingMd,
    color: colors.primary,
    fontWeight: '700' as const,
  },
  registrantInfo: {
    flex: 1,
  },
  registrantName: {
    ...typography.bodyMd,
    color: colors.onBackground,
    fontWeight: '600' as const,
  },
  registrantMeta: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: spacing.micro,
  },

  // ─── 본인 등록 가격 칩 ────────────────────────────────────────────────────
  ownPriceChip: {
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  ownPriceChipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600' as const,
  },

  // ─── 맞아요/달라요 버튼 ────────────────────────────────────────────────────
  verifyBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  verifyBtn: {
    flex: 1,
    borderRadius: spacing.radiusLg,
    paddingVertical: spacing.inputPad,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: {
    backgroundColor: colors.successContainer,
  },
  confirmBtnText: {
    ...typography.labelMd,
    color: colors.onSuccessContainer,
  },
  disputeBtn: {
    backgroundColor: colors.errorContainer,
  },
  disputeBtnText: {
    ...typography.labelMd,
    color: colors.onErrorContainer,
  },
  verifyingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.inputPad,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusLg,
  },
  verifyingText: {
    ...typography.body,
    color: colors.primary,
  },
  verifiedContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.inputPad,
    backgroundColor: colors.primaryLight,
    borderRadius: spacing.radiusLg,
  },
  verifiedText: {
    ...typography.labelMd,
    color: colors.primary,
  },

  // ─── 공통 카드 ────────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: spacing.radiusLg,
    padding: spacing.xl,
    marginBottom: spacing.md,
    shadowColor: colors.shadowBase,
    shadowOffset: { width: 0, height: spacing.shadowOffsetY },
    shadowOpacity: 0.06,
    shadowRadius: spacing.shadowRadiusMd,
    elevation: 2,
  },
  cardLast: {
    marginBottom: 0,
  },
  cardTitle: {
    ...typography.labelMd,
    color: colors.primary,
    marginBottom: spacing.md,
  },

  // ─── 7일 가격 트렌드 ──────────────────────────────────────────────────────
  trendHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  trendSubLabel: {
    ...typography.caption,
    color: colors.tertiary,
  },
  chartPlaceholder: {
    height: spacing.priceDetailChartH,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusSm,
    marginBottom: spacing.sm,
  },
  weekDayRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  weekDayLabel: {
    ...typography.tabLabel,
    fontFamily: PJS.semiBold,
    color: colors.outlineColor,
  },

  // ─── 순위 배지 (인라인) ───────────────────────────────────────────────────
  rankBadge: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.micro,
    alignSelf: 'center',
    marginLeft: spacing.sm,
  },
  rankBadgeFirst: {
    backgroundColor: colors.warning,
  },
  rankBadgeText: {
    ...typography.captionBold,
    color: colors.outlineColor,
  },
  rankBadgeFirstText: {
    color: colors.gray900,
  },

  // ─── 가격 인증 현황 ───────────────────────────────────────────────────────
  noVerificationText: {
    ...typography.bodySm,
    color: colors.gray400,
    textAlign: 'center',
    paddingVertical: spacing.md,
  },
  verificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  verificationItemBorder: {
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.surfaceContainerHigh,
  },
  verificationAvatar: {
    width: spacing.priceDetailVerifyAvatarSize,
    height: spacing.priceDetailVerifyAvatarSize,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.surfaceContainerLow,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  verificationAvatarText: {
    ...typography.headingLg,
    color: colors.primary,
  },
  verificationInfo: {
    flex: 1,
  },
  verificationName: {
    ...typography.labelMd,
    color: colors.onBackground,
    marginBottom: spacing.micro,
  },
  verificationTime: {
    ...typography.labelSm,
    color: colors.outlineColor,
  },
  verificationResultBadge: {
    paddingHorizontal: spacing.badgePadH,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusFull,
  },
  confirmedResultBadge: {
    backgroundColor: colors.successContainer,
  },
  disputedResultBadge: {
    backgroundColor: colors.errorContainer,
  },
  verificationResultText: {
    ...typography.labelSm,
    fontFamily: PJS.bold,
  },
  confirmedResultText: {
    color: colors.onSuccessContainer,
  },
  disputedResultText: {
    color: colors.onErrorContainer,
  },
  saleText: {
    ...typography.body,
    color: colors.onBackground,
  },

  // ─── Dispute Modal ────────────────────────────────────────────────────────
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

  // ─── 하단 고정 반응 바 ────────────────────────────────────────────────────────
  stickyReactionBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.screenH,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: spacing.borderThin,
    borderTopColor: colors.surfaceContainer,
  },

  // ─── 추천/신고 반응 버튼 ────────────────────────────────────────────────────
  reactionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radiusFull,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  reactionBtnActive: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  reactionBtnText: {
    ...typography.bodySm,
    color: colors.gray700,
    fontFamily: PJS.semiBold,
  },
  reactionBtnTextActive: {
    color: colors.primary,
  },
  reactionReportBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: spacing.radiusFull,
    borderWidth: spacing.borderThin,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  reactionReportBtnText: {
    ...typography.bodySm,
    color: colors.gray600,
    fontFamily: PJS.semiBold,
  },

  // ─── 검증 비율 바 ───────────────────────────────────────────────────────────
  verifyRatioSection: {
    marginBottom: spacing.md,
  },
  verifyRatioBar: {
    flexDirection: 'row',
    height: spacing.lg,
    borderRadius: spacing.radiusFull,
    overflow: 'hidden',
    backgroundColor: colors.surfaceContainerLow,
    marginBottom: spacing.xs,
  },
  verifyConfirmedBar: {
    backgroundColor: colors.success,
  },
  verifyDisputedBar: {
    backgroundColor: colors.danger,
  },
  verifyRatioText: {
    ...typography.caption,
    color: colors.gray600,
  },
});

export default PriceDetailScreen;
