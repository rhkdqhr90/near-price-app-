import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ListRenderItemInfo,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import type { OnboardingScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import WonIcon from '../../components/icons/WonIcon';
import CameraIcon from '../../components/icons/CameraIcon';

type OnboardingIntroScreenProps = OnboardingScreenProps<'OnboardingIntro'>;

interface Slide {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  Icon: React.FC<{ size?: number; color?: string }>;
}

const SLIDES: Slide[] = [
  {
    id: '1',
    eyebrow: 'STEP 01',
    title: '우리 동네\n최저가를 한눈에',
    subtitle: '마트별 가격을 비교하고\n가장 싼 곳으로 바로 이동해요',
    Icon: WonIcon,
  },
  {
    id: '2',
    eyebrow: 'STEP 02',
    title: '찍기만 하면\n가격 등록 끝',
    subtitle: '가격표를 촬영하면 OCR이\n자동으로 숫자를 읽어요',
    Icon: CameraIcon,
  },
  {
    id: '3',
    eyebrow: 'STEP 03',
    title: '이웃과 함께 만드는\n진짜 동네 정보',
    subtitle: '가격을 등록하고 검증하면\n활동 뱃지를 받을 수 있어요',
    Icon: WonIcon,
  },
];

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SKIP_HIT_SLOP = { top: 8, bottom: 8, left: 8, right: 8 } as const;

const LOGO_SIZE = 120;
const LOGO_RADIUS = 32;
const ICON_GLYPH = 56;

const OnboardingIntroScreen: React.FC<OnboardingIntroScreenProps> = ({ navigation }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatListRef = useRef<FlatList<Slide>>(null);
  const insets = useSafeAreaInsets();

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
      setActiveIndex(index);
    },
    [],
  );

  const handleSkip = useCallback(() => {
    navigation.navigate('Permission');
  }, [navigation]);

  const handleNext = useCallback(() => {
    if (activeIndex < SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: activeIndex + 1, animated: true });
    } else {
      navigation.navigate('Permission');
    }
  }, [activeIndex, navigation]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<Slide>) => {
    const { Icon } = item;
    return (
      <View style={styles.slide}>
        <View style={styles.logoWrap}>
          <View style={styles.logoBack} />
          <View style={styles.logoFront}>
            <Icon size={ICON_GLYPH} color={colors.primary} />
          </View>
        </View>

        <View style={styles.textBlock}>
          <Text style={styles.eyebrow}>{item.eyebrow}</Text>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.subtitle}>{item.subtitle}</Text>
        </View>
      </View>
    );
  }, []);

  const isLastSlide = activeIndex === SLIDES.length - 1;

  return (
    <LinearGradient
      colors={[colors.primaryLight, colors.surface]}
      start={{ x: 0.15, y: 0 }}
      end={{ x: 0.85, y: 1 }}
      locations={[0, 0.55]}
      style={styles.container}
    >
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <View style={styles.brand}>
          <View style={styles.brandDot} />
          <Text style={styles.brandText}>마실</Text>
        </View>
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          hitSlop={SKIP_HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel="건너뛰기"
        >
          <Text style={styles.skipText}>건너뛰기</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={SLIDES}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        style={styles.flatList}
        onScrollToIndexFailed={() => {}}
      />

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.xl) + spacing.sm }]}>
        <View style={styles.dots}>
          {SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              style={[styles.dot, index === activeIndex && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isLastSlide ? '시작하기' : '다음'}
        >
          <Text style={styles.nextButtonText}>
            {isLastSlide ? '시작하기' : '다음'}
          </Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xxl,
    paddingBottom: spacing.sm,
  },
  brand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  brandText: {
    fontSize: 16,
    fontWeight: '800' as const,
    color: colors.onBackground,
    letterSpacing: -0.5,
  },
  skipButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  skipText: {
    fontSize: 14,
    color: colors.gray600,
    fontWeight: '500' as const,
  },
  flatList: {
    flex: 1,
  },
  slide: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    gap: 32,
  },

  // 로고 마크 (Login과 동일 패턴)
  logoWrap: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBack: {
    position: 'absolute',
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
    backgroundColor: colors.primary,
    transform: [{ rotate: '-8deg' }],
  },
  logoFront: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    borderRadius: LOGO_RADIUS,
    backgroundColor: colors.white,
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 12,
  },

  textBlock: {
    alignItems: 'center',
    gap: 10,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: '700' as const,
    color: colors.primary,
    letterSpacing: 2,
  },
  title: {
    fontSize: 26,
    fontWeight: '800' as const,
    color: colors.onBackground,
    letterSpacing: -1,
    textAlign: 'center',
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: 4,
  },

  // 하단 CTA
  footer: {
    paddingHorizontal: spacing.xxl,
    gap: 16,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.gray200,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 24,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
  nextButtonText: {
    fontSize: 16,
    fontWeight: '700' as const,
    color: colors.white,
    letterSpacing: -0.3,
  },
});

export default OnboardingIntroScreen;
