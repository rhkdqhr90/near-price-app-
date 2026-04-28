import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FlyerResponse, FlyerTemplateType } from '../../types/api.types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';
import CloseIcon from '../icons/CloseIcon';
import ColorFlyerTemplate from './ColorFlyerTemplate';
import NewsFlyerTemplate from './NewsFlyerTemplate';
import RisoFlyerTemplate from './RisoFlyerTemplate';
import PosterFlyerTemplate from './PosterFlyerTemplate';

interface Props {
  flyer: FlyerResponse | null;
  onClose: () => void;
}

type PreviewStyle = 'color' | 'news' | 'riso' | 'poster';

const PAGE_SIZE = 8;

const toPreviewStyle = (templateType: FlyerTemplateType | null | undefined): PreviewStyle => {
  if (templateType === 'news') return 'news';
  if (templateType === 'retro') return 'riso';
  if (templateType === 'coupon') return 'poster';
  return 'color';
};

const noop = () => {};

const FlyerPreviewModal: React.FC<Props> = ({ flyer, onClose }) => {
  const insets = useSafeAreaInsets();
  const handleClose = useCallback(() => onClose(), [onClose]);
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    setPageIndex(0);
  }, [flyer?.id]);

  const pageCount = useMemo(
    () => Math.max(1, Math.ceil((flyer?.products?.length ?? 0) / PAGE_SIZE)),
    [flyer?.products?.length],
  );

  useEffect(() => {
    if (pageIndex <= pageCount - 1) {
      return;
    }
    setPageIndex(Math.max(0, pageCount - 1));
  }, [pageCount, pageIndex]);

  const pagedFlyer = useMemo(() => {
    if (!flyer) {
      return null;
    }
    const products = flyer.products ?? [];
    const start = pageIndex * PAGE_SIZE;
    return {
      ...flyer,
      products: products.slice(start, start + PAGE_SIZE),
    };
  }, [flyer, pageIndex]);

  const styleType = toPreviewStyle(flyer?.templateType);

  return (
    <Modal
      visible={flyer !== null}
      transparent={false}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={[
        styles.container,
        { paddingTop: insets.top },
      ]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>미리보기</Text>
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={handleClose}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="미리보기 닫기"
          >
            <View style={styles.closeBtnContent}>
              <CloseIcon size={spacing.iconSm} color={colors.gray700} />
              <Text style={styles.closeBtnText}>닫기</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.banner}>
          <Text style={styles.bannerText}>
            💡 사장님센터에서 고른 템플릿으로 렌더됩니다. 상품이 9개 이상이면 페이지가 분할됩니다.
          </Text>
        </View>

        {pagedFlyer && (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.xl },
            ]}
            showsVerticalScrollIndicator={false}
          >
            {styleType === 'color' && (
              <ColorFlyerTemplate
                flyer={pagedFlyer}
                onProductPress={noop}
              />
            )}
            {styleType === 'news' && (
              <NewsFlyerTemplate
                flyer={pagedFlyer}
                onProductPress={noop}
              />
            )}
            {styleType === 'riso' && (
              <RisoFlyerTemplate
                flyer={pagedFlyer}
                onProductPress={noop}
              />
            )}
            {styleType === 'poster' && (
              <PosterFlyerTemplate
                flyer={pagedFlyer}
                onProductPress={noop}
              />
            )}

            {pageCount > 1 && (
              <View style={styles.pageControlsWrap}>
                <TouchableOpacity
                  style={[styles.pageButton, pageIndex === 0 && styles.pageButtonDisabled]}
                  onPress={() => setPageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={pageIndex === 0}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="미리보기 이전 페이지"
                >
                  <Text style={[styles.pageButtonText, pageIndex === 0 && styles.pageButtonTextDisabled]}>이전</Text>
                </TouchableOpacity>

                <Text style={styles.pageIndicator}>{pageIndex + 1} / {pageCount}</Text>

                <TouchableOpacity
                  style={[styles.pageButton, pageIndex >= pageCount - 1 && styles.pageButtonDisabled]}
                  onPress={() => setPageIndex((prev) => Math.min(pageCount - 1, prev + 1))}
                  disabled={pageIndex >= pageCount - 1}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="미리보기 다음 페이지"
                >
                  <Text
                    style={[
                      styles.pageButtonText,
                      pageIndex >= pageCount - 1 && styles.pageButtonTextDisabled,
                    ]}
                  >
                    다음
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.primaryLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  headerTitle: {
    ...typography.headingMd,
    color: colors.black,
  },
  closeBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: spacing.radiusMd,
    backgroundColor: colors.gray100,
  },
  closeBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  closeBtnText: {
    ...typography.bodySm,
    color: colors.gray700,
    fontWeight: '700' as const,
  },
  banner: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray100,
  },
  bannerText: {
    ...typography.caption,
    color: colors.gray600,
    lineHeight: 16,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  pageControlsWrap: {
    marginTop: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  pageButton: {
    borderWidth: 1,
    borderColor: colors.gray200,
    backgroundColor: colors.white,
    borderRadius: spacing.radiusSm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    minWidth: 72,
    alignItems: 'center',
  },
  pageButtonDisabled: {
    backgroundColor: colors.gray100,
    borderColor: colors.gray200,
  },
  pageButtonText: {
    fontSize: 12,
    color: colors.gray700,
    fontWeight: '700' as const,
  },
  pageButtonTextDisabled: {
    color: colors.gray400,
  },
  pageIndicator: {
    minWidth: 64,
    textAlign: 'center',
    fontSize: 12,
    color: colors.gray700,
    fontWeight: '800' as const,
  },
});

export default FlyerPreviewModal;
