import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * 화면 렌더링 중 예외 발생 시 앱 전체 크래시를 막는 안전망.
 * React 클래스 컴포넌트만 Error Boundary를 구현할 수 있음 (React 제약).
 */
class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  handleReset = () => {
    this.setState({ hasError: false });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>앗, 문제가 생겼어요</Text>
          <Text style={styles.message}>
            예상치 못한 오류가 발생했습니다.{'\n'}잠시 후 다시 시도해 주세요.
          </Text>
          <TouchableOpacity
            style={styles.button}
            onPress={this.handleReset}
            accessibilityRole="button"
            accessibilityLabel="다시 시도"
          >
            <Text style={styles.buttonText}>다시 시도</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    padding: spacing.xxl,
  },
  title: {
    ...typography.headingXl,
    color: colors.black,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyMd,
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
  },
  button: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    borderRadius: spacing.radiusMd,
  },
  buttonText: {
    ...typography.headingMd,
    color: colors.white,
  },
});

export default ErrorBoundary;
