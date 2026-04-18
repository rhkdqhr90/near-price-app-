import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from 'react-native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { isAxiosError } from '../../api/client';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MyPageScreenProps } from '../../navigation/types';
import { useAuthStore } from '../../store/authStore';
import { inquiryApi } from '../../api/inquiry.api';
import { STALE_TIME } from '../../lib/queryClient';
import type { CreateInquiryDto, InquiryResponse } from '../../types/api.types';
import { formatDate } from '../../utils/format';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import ChevronLeftIcon from '../../components/icons/ChevronLeftIcon';

type Props = MyPageScreenProps<'Inquiry'>;

const STATUS_LABEL: Record<InquiryResponse['status'], string> = {
  pending: '답변 대기',
  answered: '답변 완료',
  closed: '종료',
};

const STATUS_COLOR: Record<InquiryResponse['status'], string> = {
  pending: colors.warning,
  answered: colors.success,
  closed: colors.gray400,
};

const InquiryScreen: React.FC<Props> = ({ navigation }) => {
  const insets = useSafeAreaInsets();
  const user = useAuthStore(s => s.user);

  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const { data: myInquiries, isLoading: isLoadingHistory } = useQuery({
    queryKey: ['inquiries', 'my'],
    queryFn: () => inquiryApi.getMyInquiries().then(r => r.data),
    enabled: activeTab === 'history',
    staleTime: STALE_TIME.short,
  });

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const { mutate: submitInquiry, isPending } = useMutation({
    mutationFn: (dto: CreateInquiryDto) => inquiryApi.createInquiry(dto),
    onSuccess: () => {
      Alert.alert('성공', '문의가 접수되었습니다. 빠른 답변 부탁드립니다.', [
        { text: '확인', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: unknown) => {
      let message = '문의 제출에 실패했습니다.';
      if (isAxiosError(error)) {
        const data: unknown = error.response?.data;
        if (data !== null && typeof data === 'object' && 'message' in data && typeof (data as { message?: unknown }).message === 'string') {
          message = (data as { message: string }).message;
        } else if (error.response?.status === 400) {
          message = '입력값이 올바르지 않습니다.';
        }
      }
      Alert.alert('오류', message);
    },
  });

  const handleSubmit = useCallback(() => {
    if (!user?.email) {
      Alert.alert('오류', '사용자 정보를 불러올 수 없습니다. 다시 로그인해주세요.');
      return;
    }
    if (!title.trim()) {
      Alert.alert('입력 오류', '제목을 입력해주세요.');
      return;
    }
    if (!content.trim()) {
      Alert.alert('입력 오류', '내용을 입력해주세요.');
      return;
    }
    submitInquiry({ email: user.email, title: title.trim(), content: content.trim() });
  }, [user?.email, title, content, submitInquiry]);

  const renderHistoryItem = useCallback(({ item }: { item: InquiryResponse }) => (
    <View style={styles.historyItem}>
      <View style={styles.historyItemHeader}>
        <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[item.status] + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
            {STATUS_LABEL[item.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.historyContent} numberOfLines={2}>{item.content}</Text>
      {item.adminReply ? (
        <View style={styles.replyBox}>
          <Text style={styles.replyLabel}>관리자 답변</Text>
          <Text style={styles.replyText}>{item.adminReply}</Text>
        </View>
      ) : null}
      <Text style={styles.historyDate}>{formatDate(item.createdAt)}</Text>
    </View>
  ), []);

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* 헤더 */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleGoBack}
          style={styles.backButton}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="뒤로가기"
        >
          <ChevronLeftIcon size={24} color={colors.black} />
        </TouchableOpacity>
        <Text style={styles.title}>문의하기</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* 탭 */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'new' && styles.tabActive]}
          onPress={() => setActiveTab('new')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'new' }}>
          <Text style={[styles.tabText, activeTab === 'new' && styles.tabTextActive]}>새 문의</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'history' && styles.tabActive]}
          onPress={() => setActiveTab('history')}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'history' }}>
          <Text style={[styles.tabText, activeTab === 'history' && styles.tabTextActive]}>문의 내역</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'new' ? (
        <>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
          >
            {/* 제목 입력 */}
            <View style={styles.section}>
              <Text style={styles.label}>제목 *</Text>
              <TextInput
                style={styles.input}
                placeholder="문의 제목"
                placeholderTextColor={colors.gray400}
                value={title}
                onChangeText={setTitle}
                editable={!isPending}
                maxLength={100}
                accessibilityLabel="제목 입력"
              />
            </View>

            {/* 내용 입력 */}
            <View style={styles.section}>
              <Text style={styles.label}>내용 *</Text>
              <TextInput
                style={[styles.input, styles.contentInput]}
                placeholder="문의 내용을 입력해주세요"
                placeholderTextColor={colors.gray400}
                value={content}
                onChangeText={setContent}
                editable={!isPending}
                multiline
                numberOfLines={10}
                textAlignVertical="top"
                accessibilityLabel="내용 입력"
              />
            </View>
          </ScrollView>

          {/* 버튼 영역 */}
          <View style={[styles.bottomArea, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <TouchableOpacity
              style={[styles.submitButton, isPending && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isPending}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel="문의 보내기"
            >
              {isPending ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.submitButtonText}>문의 보내기</Text>
              )}
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <FlatList
          data={myInquiries ?? []}
          keyExtractor={item => item.id}
          renderItem={renderHistoryItem}
          contentContainerStyle={[
            styles.historyList,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          ListEmptyComponent={
            isLoadingHistory ? (
              <View style={styles.centeredPad}>
                <ActivityIndicator color={colors.primary} />
              </View>
            ) : (
              <View style={styles.centeredPad}>
                <Text style={styles.emptyText}>문의 내역이 없습니다</Text>
              </View>
            )
          }
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={true}
        />
      )}
    </KeyboardAvoidingView>
  );
};

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
    backgroundColor: colors.white,
  },

  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },

  title: {
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
    paddingVertical: spacing.lg,
  },

  section: {
    marginBottom: spacing.xl,
  },

  label: {
    ...typography.bodySm,
    fontWeight: '600' as const,
    color: colors.black,
    marginBottom: spacing.sm,
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

  contentInput: {
    height: spacing.inquiryContentH,
    paddingTop: spacing.md,
  },

  bottomArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    backgroundColor: colors.white,
  },

  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: spacing.radiusMd,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },

  submitButtonDisabled: {
    opacity: 0.5,
  },

  submitButtonText: {
    ...typography.body,
    fontWeight: '600' as const,
    color: colors.white,
  },

  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: spacing.borderThin,
    borderBottomColor: colors.gray200,
    backgroundColor: colors.white,
  },

  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },

  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },

  tabText: {
    ...typography.body,
    color: colors.gray400,
  },

  tabTextActive: {
    color: colors.primary,
    fontWeight: '600' as const,
  },

  historyList: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },

  historyItem: {
    backgroundColor: colors.white,
    borderRadius: spacing.radiusMd,
    borderWidth: spacing.borderThin,
    borderColor: colors.gray200,
    padding: spacing.md,
    marginBottom: spacing.md,
  },

  historyItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },

  historyTitle: {
    ...typography.body,
    fontWeight: '600' as const,
    color: colors.black,
    flex: 1,
    marginRight: spacing.sm,
  },

  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: spacing.radiusSm,
  },

  statusText: {
    ...typography.caption,
    fontWeight: '600' as const,
  },

  historyContent: {
    ...typography.bodySm,
    color: colors.gray600,
    marginBottom: spacing.sm,
  },

  replyBox: {
    backgroundColor: colors.gray100,
    borderRadius: spacing.radiusSm,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },

  replyLabel: {
    ...typography.caption,
    fontWeight: '600' as const,
    color: colors.primary,
    marginBottom: spacing.xs,
  },

  replyText: {
    ...typography.bodySm,
    color: colors.gray900,
  },

  historyDate: {
    ...typography.caption,
    color: colors.gray400,
  },

  centeredPad: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
  },

  emptyText: {
    ...typography.body,
    color: colors.gray400,
  },
});

export default InquiryScreen;
