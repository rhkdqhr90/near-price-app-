import React, { useCallback, useMemo } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MyPageScreenProps } from '../../navigation/types';
import { ownerApi } from '../../api/owner.api';
import { flyerApi } from '../../api/flyer.api';
import { isAxiosError } from '../../api/client';
import type {
  FlyerResponse,
  OwnerApplicationResponse,
  OwnerApplicationStatus,
} from '../../types/api.types';
import { STALE_TIME } from '../../lib/queryClient';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';
import PlusCircleIcon from '../../components/icons/PlusCircleIcon';

type Props = MyPageScreenProps<'OwnerCenter'>;

const statusMeta: Record<
  OwnerApplicationStatus,
  { label: string; color: string; bgColor: string }
> = {
  pending: {
    label: '심사중',
    color: colors.warning,
    bgColor: `${colors.warning}20`,
  },
  approved: {
    label: '승인완료',
    color: colors.success,
    bgColor: `${colors.success}20`,
  },
  rejected: {
    label: '반려',
    color: colors.danger,
    bgColor: `${colors.danger}20`,
  },
};

const OwnerCenterScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const {
    data: myApplication,
    isLoading: isApplicationLoading,
    isError: isApplicationError,
    error: applicationError,
  } = useQuery({
    queryKey: ['owner', 'me'],
    queryFn: () => ownerApi.getMyApplication().then((res) => res.data),
    retry: false,
    staleTime: STALE_TIME.short,
  });

  const hasApplication = useMemo(() => {
    if (myApplication) {
      return true;
    }
    if (!isApplicationError || !isAxiosError(applicationError)) {
      return false;
    }
    return applicationError.response?.status !== 404;
  }, [applicationError, isApplicationError, myApplication]);

  const hasApplicationFetchError = useMemo(() => {
    if (!isApplicationError) {
      return false;
    }
    if (!isAxiosError(applicationError)) {
      return true;
    }
    return applicationError.response?.status !== 404;
  }, [applicationError, isApplicationError]);

  const {
    data: myFlyers,
    isLoading: isFlyersLoading,
    isError: isFlyersError,
  } = useQuery({
    queryKey: ['flyers', 'my'],
    queryFn: () => flyerApi.getMyFlyers().then((res) => res.data),
    enabled: myApplication?.status === 'approved',
    staleTime: STALE_TIME.short,
  });

  const { mutateAsync: deleteApplication, isPending: isDeletingApplication } =
    useMutation({
      mutationFn: () => ownerApi.deleteMyApplication(),
      onSuccess: async () => {
        await queryClient.invalidateQueries({ queryKey: ['owner', 'me'] });
        await queryClient.invalidateQueries({ queryKey: ['flyers'] });
      },
    });

  const { mutateAsync: deleteFlyer, isPending: isDeletingFlyer } = useMutation({
    mutationFn: (flyerId: string) => flyerApi.deleteMyFlyer(flyerId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['flyers'] });
    },
  });

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCreateApplication = useCallback(() => {
    navigation.navigate('OwnerApplicationForm', { mode: 'create' });
  }, [navigation]);

  const handleEditApplication = useCallback(() => {
    navigation.navigate('OwnerApplicationForm', { mode: 'edit' });
  }, [navigation]);

  const handleDeleteApplication = useCallback(() => {
    Alert.alert('사장 등록 삭제', '사장 등록 신청 정보를 삭제할까요?', [
      { text: '취소', style: 'cancel' },
      {
        text: '삭제',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteApplication();
          } catch {
            Alert.alert('오류', '삭제에 실패했습니다. 다시 시도해주세요.');
          }
        },
      },
    ]);
  }, [deleteApplication]);

  const handleCreateFlyer = useCallback(() => {
    navigation.navigate('OwnerFlyerForm', { mode: 'create' });
  }, [navigation]);

  const handleEditFlyer = useCallback(
    (flyerId: string) => {
      navigation.navigate('OwnerFlyerForm', { mode: 'edit', flyerId });
    },
    [navigation],
  );

  const handleDeleteFlyer = useCallback(
    (flyerId: string) => {
      Alert.alert('전단지 삭제', '선택한 전단지를 삭제할까요?', [
        { text: '취소', style: 'cancel' },
        {
          text: '삭제',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFlyer(flyerId);
            } catch {
              Alert.alert('오류', '전단지 삭제에 실패했습니다.');
            }
          },
        },
      ]);
    },
    [deleteFlyer],
  );

  const renderFlyerItem = useCallback(
    ({ item }: { item: FlyerResponse }) => (
      <View style={styles.flyerCard}>
        <Text style={styles.flyerStore}>{item.storeName}</Text>
        <Text style={styles.flyerTitle}>{item.promotionTitle}</Text>
        <Text style={styles.flyerMeta}>{item.dateRange}</Text>
        <View style={styles.flyerActionsRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => handleEditFlyer(item.id)}
            accessibilityRole="button"
            accessibilityLabel="전단지 수정"
          >
            <Text style={styles.secondaryButtonText}>수정</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, styles.dangerButton]}
            onPress={() => handleDeleteFlyer(item.id)}
            accessibilityRole="button"
            accessibilityLabel="전단지 삭제"
          >
            <Text style={[styles.secondaryButtonText, styles.dangerButtonText]}>
              삭제
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    ),
    [handleDeleteFlyer, handleEditFlyer],
  );

  const applicationSection = useMemo(() => {
    if (isApplicationLoading) {
      return (
        <View style={styles.centeredPad}>
          <ActivityIndicator color={colors.primary} />
        </View>
      );
    }

    if (!hasApplication || !myApplication) {
      if (hasApplicationFetchError) {
        return (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              사장 등록 신청이 접수되어 심사중입니다. 잠시 후 다시 확인해주세요.
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>아직 사장 등록을 하지 않았어요</Text>
          <Text style={styles.emptyDescription}>
            사장 등록 후 승인되면 전단지를 직접 관리할 수 있어요.
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={handleCreateApplication}
            accessibilityRole="button"
            accessibilityLabel="사장 등록 신청"
          >
            <Text style={styles.primaryButtonText}>사장 등록 신청</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return <ApplicationCard application={myApplication} />;
  }, [
    hasApplication,
    handleCreateApplication,
    hasApplicationFetchError,
    isApplicationLoading,
    myApplication,
  ]);

  const canManageFlyers = myApplication?.status === 'approved';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <ChevronLeftIcon size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>사장님 센터</Text>
        <View style={styles.headerSpacer} />
      </View>

      <FlatList
        data={canManageFlyers ? myFlyers ?? [] : []}
        keyExtractor={(item) => item.id}
        renderItem={renderFlyerItem}
        contentContainerStyle={styles.contentContainer}
        ListHeaderComponent={
          <>
            {applicationSection}

            {myApplication ? (
              <View style={styles.controlRow}>
                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={handleEditApplication}
                  accessibilityRole="button"
                  accessibilityLabel="사장 등록 수정"
                >
                  <Text style={styles.secondaryButtonText}>신청 정보 수정</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.secondaryButton, styles.dangerButton]}
                  onPress={handleDeleteApplication}
                  disabled={isDeletingApplication}
                  accessibilityRole="button"
                  accessibilityLabel="사장 등록 삭제"
                >
                  <Text style={[styles.secondaryButtonText, styles.dangerButtonText]}>
                    삭제
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>내 전단지</Text>
              {canManageFlyers ? (
                <TouchableOpacity
                  style={styles.inlineAddButton}
                  onPress={handleCreateFlyer}
                  accessibilityRole="button"
                  accessibilityLabel="전단지 생성"
                >
                  <PlusCircleIcon
                    size={18}
                    active
                    activeColor={colors.primary}
                  />
                  <Text style={styles.inlineAddButtonText}>새 전단지</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {!canManageFlyers ? (
              <View style={styles.infoCard}>
                <Text style={styles.infoText}>
                  사장 등록이 승인되면 전단지를 생성/수정/삭제할 수 있습니다.
                </Text>
              </View>
            ) : null}

            {canManageFlyers && isFlyersLoading ? (
              <View style={styles.centeredPad}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : null}

            {canManageFlyers && isFlyersError ? (
              <View style={styles.infoCard}>
                <Text style={styles.errorText}>전단지 목록을 불러오지 못했습니다.</Text>
              </View>
            ) : null}
          </>
        }
        ListEmptyComponent={
          canManageFlyers && !isFlyersLoading && !isFlyersError ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>등록된 전단지가 없습니다</Text>
              <Text style={styles.emptyDescription}>
                새 전단지를 만들어 고객에게 매장 소식을 알려보세요.
              </Text>
            </View>
          ) : null
        }
        showsVerticalScrollIndicator={false}
        ListFooterComponent={<View style={styles.bottomSpacer} />}
      />

      {(isDeletingFlyer || isDeletingApplication) && (
        <View style={styles.overlayLoading}>
          <ActivityIndicator color={colors.white} />
        </View>
      )}
    </View>
  );
};

const ApplicationCard: React.FC<{ application: OwnerApplicationResponse }> = ({
  application,
}) => {
  const meta = statusMeta[application.status] ?? {
    label: application.status,
    color: colors.gray700,
    bgColor: colors.gray100,
  };
  return (
    <View style={styles.applicationCard}>
      <View style={styles.applicationHeaderRow}>
        <Text style={styles.applicationTitle}>사장 등록 정보</Text>
        <View style={[styles.statusPill, { backgroundColor: meta.bgColor }]}>
          <Text style={[styles.statusPillText, { color: meta.color }]}>
            {meta.label}
          </Text>
        </View>
      </View>

      <InfoRow label="매장" value={application.store.name} />
      <InfoRow label="주소" value={application.store.address} />
      <InfoRow label="사장명" value={application.ownerName} />
      <InfoRow label="연락처" value={application.ownerPhone} />
      <InfoRow
        label="사업자등록번호"
        value={application.businessRegistrationNumberMasked}
      />

      {application.status === 'rejected' && application.rejectionReason ? (
        <View style={styles.rejectBox}>
          <Text style={styles.rejectLabel}>반려 사유</Text>
          <Text style={styles.rejectText}>{application.rejectionReason}</Text>
        </View>
      ) : null}
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  headerTitle: {
    ...typography.headingMd,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: spacing.headerIconSize,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  centeredPad: {
    paddingVertical: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCard: {
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.body,
    fontWeight: '700' as const,
    color: colors.black,
  },
  emptyDescription: {
    ...typography.bodySm,
    color: colors.gray600,
  },
  primaryButton: {
    marginTop: spacing.sm,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  primaryButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700' as const,
  },
  applicationCard: {
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    borderRadius: spacing.radiusMd,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  applicationHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  applicationTitle: {
    ...typography.body,
    fontWeight: '700' as const,
  },
  statusPill: {
    borderRadius: spacing.radiusFull,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  statusPillText: {
    ...typography.captionBold,
  },
  infoRow: {
    marginBottom: spacing.sm,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.bodySm,
    color: colors.black,
  },
  rejectBox: {
    marginTop: spacing.sm,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    backgroundColor: `${colors.danger}10`,
  },
  rejectLabel: {
    ...typography.captionBold,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  rejectText: {
    ...typography.bodySm,
    color: colors.black,
  },
  controlRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  secondaryButton: {
    flex: 1,
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  secondaryButtonText: {
    ...typography.bodySm,
    color: colors.black,
    fontWeight: '600' as const,
  },
  dangerButton: {
    borderColor: colors.danger,
  },
  dangerButtonText: {
    color: colors.danger,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.headingMd,
  },
  inlineAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  inlineAddButtonText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700' as const,
  },
  infoCard: {
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.gray100,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoText: {
    ...typography.bodySm,
    color: colors.gray700,
  },
  errorText: {
    ...typography.bodySm,
    color: colors.danger,
  },
  flyerCard: {
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  flyerStore: {
    ...typography.caption,
    color: colors.gray600,
  },
  flyerTitle: {
    ...typography.body,
    color: colors.black,
    fontWeight: '700' as const,
    marginTop: spacing.xs,
  },
  flyerMeta: {
    ...typography.caption,
    color: colors.gray600,
    marginTop: spacing.xs,
  },
  flyerActionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  bottomSpacer: {
    height: spacing.xxl,
  },
  overlayLoading: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: `${colors.black}30`,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default OwnerCenterScreen;
