import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { MyPageScreenProps, MainTabParamList } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { useLocationStore } from '../../store/locationStore';
import { usePriceRegisterStore } from '../../store/priceRegisterStore';
import { useMyPrices } from '../../hooks/queries/usePrices';
import { useMyWishlist } from '../../hooks/queries/useWishlist';
import { useUserBadges } from '../../hooks/queries/useBadges';
import { useMyVerifications } from '../../hooks/queries/useVerification';
import MenuItem from '../../components/common/MenuItem';
import SkeletonBox from '../../components/common/SkeletonBox';
import TagIcon from '../../components/icons/TagIcon';
import BellIcon from '../../components/icons/BellIcon';
import MapPinIcon from '../../components/icons/MapPinIcon';
import LogOutIcon from '../../components/icons/LogOutIcon';
import DocumentIcon from '../../components/icons/DocumentIcon';
import HelpCircleIcon from '../../components/icons/HelpCircleIcon';
import CheckIcon from '../../components/icons/CheckIcon';
import { APP_VERSION } from '../../utils/config';
import { isAxiosError, isCancel } from '../../api/client';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import { userApi } from '../../api/user.api';

type Props = MyPageScreenProps<'MyPage'>;

// ─── 닉네임 변경 모달 ─────────────────────────────────────────────────────

interface NicknameModalProps {
  visible: boolean;
  currentNickname: string;
  onClose: () => void;
  onUpdate: (nickname: string) => Promise<void>;
}

const NICKNAME_REGEX = /^[가-힣a-zA-Z0-9]{2,6}$/;

const getNicknameError = (nickname: string): string | null => {
  // 공백만으로 이루어진 경우 거부
  if (!nickname || nickname.trim().length === 0) {
    return '닉네임을 입력하세요';
  }

  const trimmedNickname = nickname.trim();

  if (trimmedNickname.length < 2) {
    return '최소 2글자 이상 입력하세요';
  }
  if (trimmedNickname.length > 6) {
    return '최대 6글자까지 입력 가능합니다';
  }
  if (!NICKNAME_REGEX.test(trimmedNickname)) {
    return '한글, 영문, 숫자만 입력 가능합니다';
  }
  return null;
};

const NicknameModal: React.FC<NicknameModalProps> = ({
  visible,
  currentNickname,
  onClose,
  onUpdate,
}) => {
  const [nickname, setNickname] = useState(currentNickname);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingNickname, setCheckingNickname] = useState(false);

  const checkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (visible) {
      setNickname(currentNickname);
      setError(null);
      setCheckingNickname(false);
    }
  }, [visible, currentNickname]);

  useEffect(() => {
    return () => {
      if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const handleChangeNickname = useCallback((text: string) => {
    // 한글 자모(ㄱ-ㅎ, ㅏ-ㅣ) + 완성형(가-힣) + 영문 + 숫자 허용
    // 조합 중인 한글을 허용하기 위해 자모도 포함
    const filteredText = text.replace(/[^ㄱ-ㅎㅏ-ㅣ가-힣a-zA-Z0-9]/g, '');
    const limitedText = filteredText.slice(0, 6);

    setNickname(limitedText);

    // 입력 중 에러만 바로 표시 (중복 확인은 debounce)
    if (limitedText.length > 0 && limitedText.length < 2) {
      setError('최소 2글자 이상 입력하세요');
    } else {
      setError(null);
    }

    // 중복 확인은 debounce (키보드 안 내려감)
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (limitedText.length >= 2 && limitedText !== currentNickname) {
      checkTimerRef.current = setTimeout(async () => {
        // 완성형 한글인지 최종 확인
        if (!/^[가-힣a-zA-Z0-9]{2,6}$/.test(limitedText)) return;
        const controller = new AbortController();
        abortControllerRef.current = controller;
        setCheckingNickname(true);
        try {
          const response = await userApi.checkNicknameAvailable(limitedText, controller.signal);
          if (!response.available) {
            setError('이미 사용 중인 닉네임입니다');
          }
        } catch (err) {
          if (isCancel(err)) return;
          // 네트워크 에러 무시 (제출 시 다시 확인)
        } finally {
          setCheckingNickname(false);
        }
      }, 500);
    }
  }, [currentNickname]);

  const handleUpdate = useCallback(async () => {
    const validationError = getNicknameError(nickname);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (nickname === currentNickname) {
      onClose();
      return;
    }

    try {
      setLoading(true);
      await onUpdate(nickname);
      onClose();
    } catch (err) {
      let message = '닉네임 변경에 실패했습니다';

      if (isAxiosError(err)) {
        const status = err.response?.status;
        const rawData: unknown = err.response?.data;
        const apiMessage: string | undefined =
          rawData !== null &&
          typeof rawData === 'object' &&
          'message' in rawData &&
          typeof (rawData as Record<string, unknown>).message === 'string'
            ? (rawData as Record<string, unknown>).message as string
            : undefined;
        if (status === 409) {
          message = '이미 사용 중인 닉네임입니다';
        } else if (status === 400) {
          message = apiMessage ?? '유효하지 않은 닉네임입니다';
        } else if (status === 429) {
          message = '너무 빠르게 변경했습니다. 잠시 후 다시 시도해주세요';
        } else if (apiMessage) {
          message = apiMessage;
        }
      } else if (err instanceof Error) {
        message = err.message;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [nickname, currentNickname, onUpdate, onClose]);

  const handleClose = () => {
    if (checkTimerRef.current) clearTimeout(checkTimerRef.current);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setNickname(currentNickname);
    setError(null);
    setCheckingNickname(false);
    onClose();
  };

  const canSubmit = !error && nickname !== currentNickname && !loading && !checkingNickname;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>닉네임 변경</Text>

          <TextInput
            style={styles.nicknameInput}
            placeholder="새로운 닉네임"
            value={nickname}
            onChangeText={handleChangeNickname}
            maxLength={6}
            autoFocus={true}
            placeholderTextColor={colors.gray400}
            accessibilityLabel="닉네임 입력"
          />

          <Text style={styles.helperText}>한글, 영문, 숫자 2~6자</Text>

          <View style={styles.feedbackContainer}>
            {error ? (
              <Text style={styles.errorText}>{error}</Text>
            ) : checkingNickname ? (
              <View style={styles.checkingInner}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.checkingText}>중복 확인 중...</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="닉네임 변경 취소"
            >
              <Text style={styles.cancelButtonText}>취소</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                styles.confirmButton,
                !canSubmit && styles.disabledButton,
              ]}
              onPress={handleUpdate}
              disabled={!canSubmit}
              accessibilityRole="button"
              accessibilityLabel="닉네임 변경 확인"
              accessibilityState={{ disabled: !canSubmit }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.confirmButtonText}>변경</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─── 메인 스크린 ───────────────────────────────────────────────────────────

const MyPageScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const user = useAuthStore(s => s.user);
  const setUser = useAuthStore(s => s.setUser);
  const logout = useAuthStore(s => s.logout);
  const clearLocation = useLocationStore(s => s.clearLocation);
  const resetPriceRegister = usePriceRegisterStore(s => s.reset);
  const regionName = useLocationStore(s => s.regionName);
  const { data: myPrices, isLoading: isPricesLoading, isError: isPricesError } = useMyPrices();
  const { data: wishlist, isLoading: isWishlistLoading, isError: isWishlistError } = useMyWishlist();
  const { data: badgesData, isLoading: isBadgesLoading } = useUserBadges(user?.id);
  const { data: verifications, isLoading: isVerificationsLoading, isError: isVerificationsError } = useMyVerifications();

  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);

  // 닉네임이 없거나 빈 문자열인 경우 폴백 처리
  const displayNickname = user?.nickname && user.nickname.trim().length > 0
    ? user.nickname
    : (user?.email?.split('@')[0] ?? '익명');
  const initials = displayNickname?.charAt(0)?.toUpperCase() ?? '?';

  const scrollContentStyle = useMemo(
    () => ({ paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xxl }),
    [insets.bottom],
  );
  const containerStyle = useMemo(
    () => [styles.container, { paddingTop: insets.top }],
    [insets.top],
  );
  const priceCount = useMemo(
    () => isPricesError ? '-' : isPricesLoading ? '...' : String(myPrices?.length ?? 0),
    [myPrices, isPricesLoading, isPricesError],
  );
  const verificationCount = useMemo(
    () => isVerificationsError ? '-' : isVerificationsLoading ? '...' : String(verifications?.meta.total ?? 0),
    [verifications, isVerificationsLoading, isVerificationsError],
  );
  const wishlistCount = useMemo(
    () => isWishlistError ? '-' : isWishlistLoading ? '...' : String(wishlist?.totalCount ?? 0),
    [wishlist, isWishlistLoading, isWishlistError],
  );
  // 진행중 뱃지 우선, 최대 2개 표시
  const displayBadges = useMemo(() => {
    const progress = (badgesData?.progress ?? []).slice(0, 2).map(b => ({ kind: 'progress' as const, data: b }));
    if (progress.length >= 2) return progress;
    const earned = (badgesData?.earned ?? []).slice(0, 2 - progress.length).map(b => ({ kind: 'earned' as const, data: b }));
    return [...progress, ...earned];
  }, [badgesData]);

  const handleNavigateMyPriceList = useCallback(() => {
    navigation.navigate('MyPriceList');
  }, [navigation]);

  const handleNavigateLikedPrices = useCallback(() => {
    navigation.navigate('LikedPrices');
  }, [navigation]);

  const handleNavigateWishlist = useCallback(() => {
    navigation.getParent<BottomTabNavigationProp<MainTabParamList>>()?.navigate('Wishlist');
  }, [navigation]);

  const handleNavigateNoticeList = useCallback(() => {
    navigation.navigate('NoticeList');
  }, [navigation]);

  const handleNavigateInquiry = useCallback(() => {
    navigation.navigate('Inquiry');
  }, [navigation]);

  const handleNavigateBadge = useCallback(() => {
    navigation.navigate('Badge');
  }, [navigation]);

  const handleLocationChange = useCallback(() => {
    navigation.navigate('LocationSetup', { returnTo: 'mypage' });
  }, [navigation]);

  const handleNotificationSettings = useCallback(() => {
    navigation.navigate('NotificationSettings');
  }, [navigation]);

  const handleNavigateTerms = useCallback(() => {
    navigation.navigate('Terms');
  }, [navigation]);

  const handleNavigatePrivacyPolicy = useCallback(() => {
    navigation.navigate('PrivacyPolicy');
  }, [navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert('로그아웃', '정말 로그아웃 하시겠어요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '로그아웃',
        style: 'destructive',
        onPress: () => {
          queryClient.clear();
          clearLocation();
          resetPriceRegister();
          logout();
        },
      },
    ]);
  }, [logout, clearLocation, resetPriceRegister, queryClient]);

  const handleDeleteAccount = useCallback(() => {
    Alert.alert(
      '회원 탈퇴',
      '정말 탈퇴하시겠습니까? 등록한 가격 정보는 익명으로 유지됩니다.',
      [
        { text: '취소', style: 'cancel' },
        {
          text: '탈퇴',
          style: 'destructive',
          onPress: async () => {
            try {
              await userApi.deleteAccount();
              queryClient.clear();
              clearLocation();
              resetPriceRegister();
              logout();
            } catch {
              Alert.alert(
                '오류',
                '회원 탈퇴에 실패했습니다. 다시 시도해주세요.',
              );
            }
          },
        },
      ],
    );
  }, [logout, clearLocation, resetPriceRegister, queryClient]);

  const handleNicknameModalOpen = useCallback(() => {
    setNicknameModalVisible(true);
  }, []);

  const handleNicknameModalClose = useCallback(() => {
    setNicknameModalVisible(false);
  }, []);

  const handleNicknameUpdate = useCallback(
    async (newNickname: string) => {
      if (!user) return;

      const response = await userApi.updateNickname(user.id, {
        nickname: newNickname,
      });

      // store에 닉네임 업데이트
      setUser({
        ...user,
        nickname: response.nickname,
      });

      Alert.alert('성공', '닉네임이 변경되었습니다');
    },
    [user, setUser],
  );

  return (
    <>
      <ScrollView
        style={containerStyle}
        contentContainerStyle={scrollContentStyle}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. 프로필 섹션 */}
        <View style={styles.profileSection}>
          {/* 아바타 */}
          <View style={styles.avatarWrapper}>
            {user?.profileImageUrl ? (
              <Image
                source={{ uri: user.profileImageUrl }}
                style={styles.avatarImage}
                accessibilityRole="image"
                accessibilityLabel={`${displayNickname} 프로필 사진`}
              />
            ) : (
              <View style={styles.avatar} accessibilityRole="image" accessibilityLabel={`${displayNickname} 프로필`}>
                <Text style={styles.avatarText}>{initials}</Text>
              </View>
            )}
            <View style={styles.avatarVerifiedBadge}>
              <CheckIcon size={10} color={colors.white} />
            </View>
          </View>

          {/* 이름 + 편집 */}
          <View style={styles.nicknameRow}>
            <Text style={styles.nickname}>{displayNickname}</Text>
            <TouchableOpacity
              onPress={handleNicknameModalOpen}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="닉네임 변경"
            >
              <Text style={styles.nicknameEditBtnText}>편집</Text>
            </TouchableOpacity>
          </View>

          {/* 위치 */}
          <View style={styles.locationRow}>
            <MapPinIcon size={spacing.iconXs} color={colors.gray600} />
            <Text style={styles.regionText}>{regionName ?? '동네 미설정'}</Text>
          </View>

          {/* 신뢰도 배지 */}
          {user?.trustScore != null && (
            <View style={styles.trustBadgePill}>
              <CheckIcon size={14} color={colors.white} />
              <Text style={styles.trustBadgePillText}>신뢰도 레벨 {user.trustScore}</Text>
            </View>
          )}
        </View>

        {/* 2. 통계 그리드 */}
        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={handleNavigateMyPriceList}
            accessibilityRole="button"
            accessibilityLabel={`등록한 가격 ${priceCount}개`}
          >
            <Text style={styles.statCount}>{priceCount}</Text>
            <Text style={styles.statLabel}>등록한{'\n'}가격</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={handleNavigateLikedPrices}
            accessibilityRole="button"
            accessibilityLabel={`인정한 가격 ${verificationCount}개`}
          >
            <Text style={styles.statCount}>{verificationCount}</Text>
            <Text style={styles.statLabel}>인정한{'\n'}가격</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.statCard}
            activeOpacity={0.7}
            onPress={handleNavigateWishlist}
            accessibilityRole="button"
            accessibilityLabel={`찜한 상품 ${wishlistCount}개`}
          >
            <Text style={styles.statCount}>{wishlistCount}</Text>
            <Text style={styles.statLabel}>찜한{'\n'}상품</Text>
          </TouchableOpacity>
        </View>

        {/* 3. 뱃지 섹션 */}
        {(isBadgesLoading || displayBadges.length > 0) && (
          <View style={styles.sectionOuter}>
            <View style={styles.sectionLabelRow}>
              <Text style={styles.sectionLabel}>나의 뱃지</Text>
              <TouchableOpacity
                onPress={handleNavigateBadge}
                accessibilityRole="button"
                accessibilityLabel="뱃지 전체보기"
              >
                <Text style={styles.sectionHeaderLink}>전체보기</Text>
              </TouchableOpacity>
            </View>
            {isBadgesLoading ? (
              <View style={styles.badgeList}>
                <SkeletonBox style={styles.badgeSkeleton} />
                <SkeletonBox style={styles.badgeSkeleton} />
              </View>
            ) : (
            <View style={styles.badgeList}>
              {displayBadges.map(item => (
                <View
                  key={`${item.kind}-${item.data.type}`}
                  style={[
                    styles.badgeCard,
                    item.kind === 'earned' ? styles.badgeCardEarned : styles.badgeCardProgress,
                  ]}
                >
                  <View style={styles.badgeCardTop}>
                    <View style={styles.badgeLeft}>
                      <View style={[
                        styles.badgeIconWrap,
                        item.kind === 'earned' ? styles.badgeIconWrapEarned : styles.badgeIconWrapProgress,
                      ]}>
                        <Text style={styles.badgeIcon}>{item.data.icon}</Text>
                      </View>
                      <View>
                        <Text style={styles.badgeName}>{item.data.name}</Text>
                        <Text style={styles.badgeCategory}>
                          {item.data.category === 'registration' ? '가격 등록' : item.data.category === 'verification' ? '가격 검증' : '신뢰도'}
                        </Text>
                      </View>
                    </View>
                    {item.kind === 'earned' ? (
                      <CheckIcon size={20} color={colors.primary} />
                    ) : (
                      <View style={styles.badgeLevelBadge}>
                        <Text style={styles.badgeLevelText}>{item.data.progressPercent}%</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.badgeProgressSection}>
                    <View style={styles.badgeProgressMeta}>
                      <Text style={styles.badgeProgressLabel}>PROGRESS</Text>
                      <Text style={styles.badgeProgressValue}>
                        {item.kind === 'earned' ? '완료' : `${item.data.progressPercent}%`}
                      </Text>
                    </View>
                    <View style={styles.badgeProgressBar}>
                      <View
                        style={[
                          styles.badgeProgressFill,
                          item.kind === 'earned' ? styles.badgeProgressFillEarned : styles.badgeProgressFillProgress,
                          { width: `${item.kind === 'earned' ? 100 : item.data.progressPercent}%` },
                        ]}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </View>
            )}
          </View>
        )}

        {/* 4. 나의 활동 섹션 */}
        <View style={styles.sectionOuter}>
          <Text style={styles.sectionLabel}>나의 활동</Text>
          <View style={styles.sectionCard}>
            <MenuItem
              icon={<TagIcon size={20} color={colors.primary} />}
              label="내가 등록한 가격"
              onPress={handleNavigateMyPriceList}
            />
            <MenuItem
              icon={<CheckIcon size={20} color={colors.primary} />}
              label="내가 인정한 가격"
              onPress={handleNavigateLikedPrices}
            />
            <MenuItem
              icon={<MapPinIcon size={20} color={colors.primary} />}
              label="내 동네 설정"
              rightLabel={regionName ?? '미설정'}
              onPress={handleLocationChange}
            />
            <MenuItem
              icon={<BellIcon size={20} color={colors.primary} />}
              label="알림 설정"
              onPress={handleNotificationSettings}
            />
            <MenuItem
              icon={<DocumentIcon size={20} color={colors.primary} />}
              label="공지사항"
              onPress={handleNavigateNoticeList}
            />
            <MenuItem
              icon={<HelpCircleIcon size={20} color={colors.primary} />}
              label="도움말 / 문의"
              onPress={handleNavigateInquiry}
            />
            <MenuItem
              icon={<DocumentIcon size={20} color={colors.primary} />}
              label="이용약관"
              onPress={handleNavigateTerms}
            />
            <MenuItem
              icon={<DocumentIcon size={20} color={colors.primary} />}
              label="개인정보처리방침"
              onPress={handleNavigatePrivacyPolicy}
            />
            <MenuItem
              icon={<LogOutIcon size={20} color={colors.primary} />}
              label="로그아웃"
              onPress={handleLogout}
              isDanger
            />
            <MenuItem
              icon={<LogOutIcon size={20} color={colors.danger} />}
              label="회원 탈퇴"
              onPress={handleDeleteAccount}
              isLast
              isDanger
            />
          </View>
        </View>

        <Text style={styles.appVersion}>v{APP_VERSION}</Text>
      </ScrollView>

      {/* 닉네임 변경 모달 */}
      <NicknameModal
        visible={nicknameModalVisible}
        currentNickname={displayNickname}
        onClose={handleNicknameModalClose}
        onUpdate={handleNicknameUpdate}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.secondaryBg,
  },

  // ─── 프로필 ───────────────────────────────────────────────────────────
  profileSection: {
    alignItems: 'center',
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.xl,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: spacing.md,
  },
  avatar: {
    width: spacing.avatarSize,
    height: spacing.avatarSize,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: spacing.xs,
    borderColor: colors.gray200,
    elevation: spacing.sm,
  },
  avatarImage: {
    width: spacing.avatarSize,
    height: spacing.avatarSize,
    borderRadius: spacing.radiusFull,
    borderWidth: spacing.xs,
    borderColor: colors.gray200,
  },
  avatarText: {
    fontSize: spacing.avatarInitialFont,
    fontWeight: '700' as const,
    color: colors.white,
  },
  avatarVerifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: spacing.xxl,
    height: spacing.xxl,
    borderRadius: spacing.radiusFull,
    backgroundColor: colors.primary,
    borderWidth: spacing.borderMedium,
    borderColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: spacing.xs,
  },
  nicknameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  nickname: {
    ...typography.headingXl,
  },
  nicknameEditBtnText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '600' as const,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.micro,
    marginBottom: spacing.md,
  },
  regionText: {
    ...typography.bodySm,
    color: colors.gray600,
  },
  trustBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusFull,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  trustBadgePillText: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.white,
  },

  // ─── 통계 그리드 ──────────────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    gap: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.gray100,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
    alignItems: 'center',
    elevation: spacing.borderThin,
  },
  statCount: {
    ...typography.activityCount,
    color: colors.primary,
    marginBottom: spacing.micro,
  },
  statLabel: {
    ...typography.caption,
    fontWeight: '600' as const,
    color: colors.gray600,
    textAlign: 'center',
  },

  // ─── 섹션 공통 ────────────────────────────────────────────────────────
  sectionOuter: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.md,
  },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...typography.headingMd,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  sectionCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    overflow: 'hidden',
    elevation: spacing.borderMedium,
  },
  sectionHeaderLink: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.primary,
  },

  // ─── 뱃지 ────────────────────────────────────────────────────────────
  badgeList: {
    gap: spacing.sm,
  },
  badgeSkeleton: {
    height: spacing.badgeCardMinHeight,
    borderRadius: spacing.radiusMd,
  },
  badgeCard: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    borderLeftWidth: spacing.xs,
    elevation: spacing.borderMedium,
  },
  badgeCardEarned: {
    borderLeftColor: colors.primary,
  },
  badgeCardProgress: {
    borderLeftColor: colors.warning,
  },
  badgeCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  badgeLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    flex: 1,
  },
  badgeIconWrap: {
    width: spacing.headerIconSize,
    height: spacing.headerIconSize,
    borderRadius: spacing.radiusFull,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIconWrapEarned: {
    backgroundColor: colors.primaryLight,
  },
  badgeIconWrapProgress: {
    backgroundColor: colors.warningLight,
  },
  badgeIcon: {
    fontSize: spacing.xl,
  },
  badgeName: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.black,
    marginBottom: spacing.micro,
  },
  badgeCategory: {
    ...typography.caption,
    color: colors.gray400,
  },
  badgeLevelBadge: {
    backgroundColor: colors.warningLight,
    borderRadius: spacing.radiusFull,
    paddingVertical: spacing.micro,
    paddingHorizontal: spacing.sm,
  },
  badgeLevelText: {
    ...typography.caption,
    fontWeight: '700' as const,
    color: colors.warning,
  },
  badgeProgressSection: {
    gap: spacing.xs,
  },
  badgeProgressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badgeProgressLabel: {
    ...typography.caption,
    fontWeight: '700' as const,
    color: colors.gray400,
  },
  badgeProgressValue: {
    ...typography.caption,
    fontWeight: '700' as const,
    color: colors.gray400,
  },
  badgeProgressBar: {
    height: spacing.micro,
    backgroundColor: colors.gray100,
    borderRadius: spacing.radiusFull,
    overflow: 'hidden',
  },
  badgeProgressFill: {
    height: '100%',
    borderRadius: spacing.radiusFull,
  },
  badgeProgressFillEarned: {
    backgroundColor: colors.primary,
  },
  badgeProgressFillProgress: {
    backgroundColor: colors.warning,
  },

  // ─── 앱 버전 ──────────────────────────────────────────────────────────
  appVersion: {
    ...typography.caption,
    color: colors.gray400,
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },

  // ─── 모달 ────────────────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlayDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    padding: spacing.xl,
    width: '85%',
    maxWidth: spacing.modalMaxWidth,
    elevation: spacing.lg,
  },
  modalTitle: {
    ...typography.headingLg,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  nicknameInput: {
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    ...typography.body,
    marginBottom: spacing.xs,
  },
  feedbackContainer: {
    minHeight: 28,
    marginBottom: spacing.lg,
    justifyContent: 'center',
  },
  errorText: {
    ...typography.bodySm,
    color: colors.danger,
  },
  checkingInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  checkingText: {
    ...typography.bodySm,
    color: colors.gray600,
  },
  helperText: {
    ...typography.caption,
    color: colors.gray600,
    marginBottom: spacing.sm,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
  },
  modalButton: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: spacing.radiusMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: colors.gray100,
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
  },
  cancelButtonText: {
    ...typography.body,
    fontWeight: '600' as const,
    color: colors.gray700,
  },
  confirmButton: {
    backgroundColor: colors.primary,
  },
  confirmButtonText: {
    ...typography.body,
    fontWeight: '600' as const,
    color: colors.white,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default MyPageScreen;
