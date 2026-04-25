import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MyPageScreenProps } from '../../navigation/types';
import { flyerApi } from '../../api/flyer.api';
import { ownerApi } from '../../api/owner.api';
import { STALE_TIME } from '../../lib/queryClient';
import type { FlyerTemplateType } from '../../types/api.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';

const TEMPLATES: Array<{ key: FlyerTemplateType; label: string; emoji: string; desc: string }> = [
  { key: 'classic', label: '클래식', emoji: '🎯', desc: '모던하고 깔끔한 기본 스타일' },
  { key: 'retro', label: '레트로', emoji: '🛒', desc: '실물 마트 전단지 느낌' },
  { key: 'news', label: '신문', emoji: '🗞️', desc: '동네가격일보 — 신문 지면 스타일' },
  { key: 'coupon', label: '쿠폰북', emoji: '✂️', desc: '오려쓰는 쿠폰북 스타일' },
];

type Props = MyPageScreenProps<'OwnerFlyerForm'>;

const OwnerFlyerFormScreen: React.FC<Props> = ({ navigation, route }) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { mode } = route.params;
  const isEditMode = mode === 'edit';
  const editingFlyerId = isEditMode ? route.params.flyerId : null;

  const { data: myApplication, isLoading: isApplicationLoading } = useQuery({
    queryKey: ['owner', 'me'],
    queryFn: () => ownerApi.getMyApplication().then((res) => res.data),
    staleTime: STALE_TIME.short,
  });

  const { data: myFlyers, isLoading: isFlyersLoading } = useQuery({
    queryKey: ['flyers', 'my'],
    queryFn: () => flyerApi.getMyFlyers().then((res) => res.data),
    enabled: isEditMode,
    staleTime: STALE_TIME.short,
  });

  const editingFlyer = useMemo(
    () =>
      editingFlyerId
        ? myFlyers?.find((item) => item.id === editingFlyerId)
        : undefined,
    [editingFlyerId, myFlyers],
  );

  const [templateType, setTemplateType] = useState<FlyerTemplateType>('classic');
  const [promotionTitle, setPromotionTitle] = useState('');
  const [badge, setBadge] = useState('특가');
  const [badgeColor, setBadgeColor] = useState('#2E7D32');
  const [dateRange, setDateRange] = useState('기간한정');
  const [highlight, setHighlight] = useState('사장님이 준비한 알뜰 행사');
  const [warningText, setWarningText] = useState('');
  const [ownerQuote, setOwnerQuote] = useState('');

  useEffect(() => {
    if (!editingFlyer) {
      return;
    }
    setTemplateType(editingFlyer.templateType ?? 'classic');
    setPromotionTitle(editingFlyer.promotionTitle);
    setBadge(editingFlyer.badge);
    setBadgeColor(editingFlyer.badgeColor);
    setDateRange(editingFlyer.dateRange);
    setHighlight(editingFlyer.highlight);
    setWarningText(editingFlyer.warningText ?? '');
    setOwnerQuote(editingFlyer.ownerQuote ?? '');
  }, [editingFlyer]);

  const { mutateAsync: submitFlyer, isPending: isSubmitting } = useMutation({
    mutationFn: async () => {
      if (!promotionTitle.trim()) {
        throw new Error('전단지 제목을 입력해주세요.');
      }
      if (!badge.trim()) {
        throw new Error('배지 문구를 입력해주세요.');
      }
      if (!badgeColor.trim()) {
        throw new Error('배지 색상을 입력해주세요.');
      }
      if (!dateRange.trim()) {
        throw new Error('행사 기간 문구를 입력해주세요.');
      }
      if (!highlight.trim()) {
        throw new Error('한 줄 소개를 입력해주세요.');
      }
      if (!myApplication?.store.name) {
        throw new Error('매장 정보를 찾을 수 없습니다.');
      }

      const payload = {
        storeName: myApplication.store.name,
        storeAddress: myApplication.store.address,
        templateType,
        promotionTitle: promotionTitle.trim(),
        badge: badge.trim(),
        badgeColor: badgeColor.trim(),
        dateRange: dateRange.trim(),
        highlight: highlight.trim(),
        warningText: warningText.trim() || undefined,
        ownerQuote: ownerQuote.trim() || undefined,
      };

      if (isEditMode) {
        return await flyerApi.updateMyFlyer(route.params.flyerId, payload);
      }
      return await flyerApi.createMyFlyer(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['flyers'] });
      Alert.alert('완료', isEditMode ? '전단지가 수정되었습니다.' : '전단지가 생성되었습니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    },
  });

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSubmit = useCallback(async () => {
    try {
      await submitFlyer();
    } catch (error: unknown) {
      if (error instanceof Error) {
        Alert.alert('입력 오류', error.message);
        return;
      }
      Alert.alert('오류', '요청 처리에 실패했습니다.');
    }
  }, [submitFlyer]);

  if (isApplicationLoading || (isEditMode && isFlyersLoading)) {
    return (
      <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (isEditMode && !editingFlyer) {
    return (
      <View
        style={[styles.loadingContainer, { paddingTop: insets.top }]}
      >
        <Text style={styles.missingText}>수정할 전단지를 찾을 수 없습니다.</Text>
        <TouchableOpacity
          style={styles.missingButton}
          onPress={handleGoBack}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <Text style={styles.missingButtonText}>뒤로가기</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <ChevronLeftIcon size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? '전단지 수정' : '전단지 생성'}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <InfoField label="매장" value={myApplication?.store.name ?? '-'} />

        {/* 템플릿 선택 */}
        <Text style={styles.label}>전단지 디자인 *</Text>
        <Text style={styles.templateHint}>원하는 스타일을 선택하면 자동으로 디자인됩니다</Text>
        <View style={styles.templateGrid}>
          {TEMPLATES.map((t) => {
            const active = templateType === t.key;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.templateCard, active && styles.templateCardActive]}
                onPress={() => setTemplateType(t.key)}
                accessibilityRole="button"
                accessibilityLabel={`${t.label} 템플릿 선택`}
                accessibilityState={{ selected: active }}
              >
                <Text style={styles.templateEmoji}>{t.emoji}</Text>
                <Text style={[styles.templateLabel, active && styles.templateLabelActive]}>
                  {t.label}
                </Text>
                <Text style={styles.templateDesc} numberOfLines={2}>{t.desc}</Text>
                {active && <View style={styles.templateCheck}><Text style={styles.templateCheckText}>✓</Text></View>}
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.label}>전단지 제목 *</Text>
        <TextInput
          style={styles.input}
          value={promotionTitle}
          onChangeText={setPromotionTitle}
          placeholder="예: 주말 특가 행사"
          placeholderTextColor={colors.gray400}
          maxLength={100}
        />

        <Text style={styles.label}>배지 문구 *</Text>
        <TextInput
          style={styles.input}
          value={badge}
          onChangeText={setBadge}
          placeholder="예: 특가"
          placeholderTextColor={colors.gray400}
          maxLength={30}
        />

        <Text style={styles.label}>배지 색상 *</Text>
        <TextInput
          style={styles.input}
          value={badgeColor}
          onChangeText={setBadgeColor}
          placeholder="예: #2E7D32"
          placeholderTextColor={colors.gray400}
          maxLength={30}
        />

        <Text style={styles.label}>행사 기간 문구 *</Text>
        <TextInput
          style={styles.input}
          value={dateRange}
          onChangeText={setDateRange}
          placeholder="예: 4/25 - 4/30"
          placeholderTextColor={colors.gray400}
          maxLength={100}
        />

        <Text style={styles.label}>한 줄 소개 *</Text>
        <TextInput
          style={styles.input}
          value={highlight}
          onChangeText={setHighlight}
          placeholder="예: 신선한 제철 상품을 합리적인 가격으로"
          placeholderTextColor={colors.gray400}
          maxLength={200}
        />

        <Text style={styles.label}>안내 문구</Text>
        <TextInput
          style={styles.input}
          value={warningText}
          onChangeText={setWarningText}
          placeholder="예: 행사 상품은 조기 품절될 수 있습니다"
          placeholderTextColor={colors.gray400}
          maxLength={200}
        />

        <Text style={styles.label}>사장님 한마디</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          value={ownerQuote}
          onChangeText={setOwnerQuote}
          placeholder="고객에게 전할 메세지를 입력해주세요"
          placeholderTextColor={colors.gray400}
          multiline
          numberOfLines={4}
          textAlignVertical="top"
          maxLength={1000}
        />

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={isSubmitting}
          accessibilityRole="button"
          accessibilityLabel={isEditMode ? '전단지 수정 저장' : '전단지 생성'}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.submitButtonText}>
              {isEditMode ? '수정 저장' : '전단지 생성'}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const InfoField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <View style={styles.infoFieldBox}>
    <Text style={styles.infoFieldLabel}>{label}</Text>
    <Text style={styles.infoFieldValue}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  infoFieldBox: {
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  infoFieldLabel: {
    ...typography.caption,
    color: colors.gray600,
    marginBottom: spacing.xs,
  },
  infoFieldValue: {
    ...typography.body,
    fontWeight: '700' as const,
    color: colors.black,
  },
  label: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.black,
    marginBottom: spacing.xs,
    marginTop: spacing.md,
  },
  input: {
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    borderRadius: spacing.radiusMd,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    ...typography.body,
    color: colors.black,
  },
  multilineInput: {
    minHeight: 120,
  },
  templateHint: {
    ...typography.caption,
    color: colors.gray600,
    marginBottom: spacing.md,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  templateCard: {
    width: '47.5%',
    borderWidth: 1.5,
    borderColor: colors.gray200,
    borderRadius: spacing.radiusMd,
    padding: spacing.md,
    backgroundColor: colors.white,
    position: 'relative',
    minHeight: 100,
  },
  templateCardActive: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primaryLight,
  },
  templateEmoji: {
    fontSize: 26,
    marginBottom: spacing.xs,
  },
  templateLabel: {
    ...typography.bodySm,
    fontWeight: '700' as const,
    color: colors.black,
    marginBottom: 2,
  },
  templateLabelActive: {
    color: colors.primary,
  },
  templateDesc: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 16,
  },
  templateCheck: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateCheckText: {
    fontSize: 11,
    fontWeight: '900' as const,
    color: colors.white,
  },
  submitButton: {
    marginTop: spacing.xl,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700' as const,
  },
  missingText: {
    ...typography.body,
    color: colors.gray700,
    marginBottom: spacing.md,
  },
  missingButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  missingButtonText: {
    ...typography.body,
    color: colors.white,
    fontWeight: '700' as const,
  },
});

export default OwnerFlyerFormScreen;
