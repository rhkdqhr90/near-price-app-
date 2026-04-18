import React, { useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MyPageScreenProps } from '../../navigation/types';
import { colors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import { typography } from '../../theme/typography';

type Props = MyPageScreenProps<'PrivacyPolicy'>;

interface Section {
  title: string;
  body: string;
}

const SECTIONS: Section[] = [
  {
    title: '1. 수집하는 개인정보 항목',
    body:
      '가. 소셜 로그인 시 수집 항목\n· 카카오 계정: 이메일, 닉네임, 프로필 이미지 (카카오 동의 항목에 한함)\n\n나. 서비스 이용 과정에서 자동 수집\n· 기기 정보 (기기 모델명, OS 버전, 고유 식별자)\n· 위치 정보 (동네 설정/주변 가격 조회 시, 사용자 동의 후 수집)\n· 푸시 알림 토큰 (FCM 등록 토큰)\n· 서비스 이용 기록, 접속 로그, 접속 IP\n\n다. 이용자가 직접 입력·업로드하는 항목\n· 등록한 매장 정보 (매장명, 주소, 위치 좌표)\n· 등록한 가격 정보 (상품명, 가격, 촬영 이미지)\n· 찜한 상품 목록, 문의 내용\n\n라. 카메라/사진\n· 가격표 촬영을 위한 카메라 및 사진 접근 권한. 촬영 이미지는 이용자가 게시를 확정한 경우에만 서버에 업로드되며, 업로드 전 기기 내 OCR(Google ML Kit, 온디바이스) 처리에만 활용되어 외부로 전송되지 않습니다.',
  },
  {
    title: '2. 개인정보의 수집 및 이용 목적',
    body:
      '· 회원 식별, 로그인 및 서비스 제공\n· 가격 등록/조회 및 매장 검색\n· 찜하기, 가격 변동 알림 등 맞춤 서비스\n· 부정 이용 방지, 신고 처리, 신뢰도 관리\n· 서비스 개선, 품질 진단, 오류 분석 (익명 또는 가명 처리)\n· 법적 의무 이행 및 고객 문의 응대',
  },
  {
    title: '3. 개인정보의 보유 및 이용 기간',
    body:
      '원칙적으로 회원 탈퇴 시 즉시 파기합니다. 다만 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.\n\n· 계약 또는 청약 철회, 대금 결제 및 재화 공급에 관한 기록: 5년 (전자상거래법)\n· 소비자 불만 또는 분쟁 처리에 관한 기록: 3년 (전자상거래법)\n· 표시/광고에 관한 기록: 6개월 (전자상거래법)\n· 로그인 및 서비스 방문 기록: 3개월 (통신비밀보호법)\n\n이용자가 등록한 가격·매장 정보는 서비스 정보 제공을 위해 탈퇴 후에도 익명 처리된 상태로 통계적 목적에 한해 활용될 수 있습니다.',
  },
  {
    title: '4. 개인정보의 제3자 제공',
    body:
      '회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다음의 경우에만 예외로 합니다.\n· 이용자가 사전에 동의한 경우\n· 법령에 특별한 규정이 있거나 수사기관의 적법한 절차에 따른 요청이 있는 경우',
  },
  {
    title: '5. 개인정보 처리의 위탁',
    body:
      '회사는 서비스 제공을 위해 아래와 같이 개인정보 처리 업무를 위탁하고 있습니다.\n\n· Amazon Web Services, Inc.: 서버 인프라, 이미지 및 데이터 저장 (리전: 대한민국)\n· Google LLC (Firebase): 푸시 알림(FCM) 발송 및 전달\n· Functional Software, Inc. (Sentry): 앱 오류/충돌 진단 로그 수집\n· Kakao Corp.: 카카오 소셜 로그인 인증\n· NAVER Cloud Platform: 지도, 역지오코딩 및 매장 검색 API\n\n위탁 업무가 종료되거나 위탁 계약이 해지된 경우 해당 수탁사가 보유한 개인정보는 즉시 파기하도록 관리하고 있습니다.',
  },
  {
    title: '6. 이용자 및 법정대리인의 권리',
    body:
      '이용자는 언제든지 다음의 권리를 행사할 수 있습니다.\n· 개인정보 열람 요청\n· 개인정보 정정·삭제 요청\n· 처리 정지 요청\n· 동의 철회 및 회원 탈퇴 (MY > 계정 관리)\n\n권리 행사는 앱 내 "문의하기" 또는 개인정보 보호책임자 연락처를 통해 요청할 수 있으며, 회사는 지체 없이 조치합니다.',
  },
  {
    title: '7. 위치정보 처리',
    body:
      '앱은 동네 설정 및 주변 매장 검색 기능을 위해 기기의 GPS/네트워크 기반 위치 정보를 수집할 수 있습니다. 위치 정보는 해당 기능 수행 직후 또는 앱 종료 시 메모리에서 즉시 삭제되며, 이용자가 설정한 "내 동네" 좌표만 기기 내부 저장소에 보관됩니다.\n\n위치 정보 수집에 동의하지 않을 경우 주소 검색을 통해 수동으로 동네를 설정하여 서비스를 이용할 수 있습니다.',
  },
  {
    title: '8. 만 14세 미만 아동의 개인정보',
    body:
      '회사는 만 14세 미만 아동의 회원 가입을 받지 않습니다. 카카오 계정 연령 정보를 통해 이를 확인하며, 만 14세 미만임이 확인된 경우 즉시 계정을 삭제합니다.',
  },
  {
    title: '9. 개인정보 안전성 확보 조치',
    body:
      '· 기술적 조치: 전송 구간 HTTPS 암호화, 비밀번호 및 토큰의 운영체제 보안 저장소(Keychain) 보관, 접근 권한 최소화\n· 관리적 조치: 개인정보 취급자 최소화 및 정기 교육\n· 물리적 조치: 클라우드 데이터센터의 물리적 접근 통제',
  },
  {
    title: '10. 개인정보 보호책임자',
    body:
      '개인정보 처리에 관한 문의는 아래로 연락해 주시기 바랍니다.\n\n· 개인정보 보호책임자: 이광교\n· 이메일: rhkdqhr90@gmail.com\n· 문의: 앱 내 "MY > 1:1 문의"\n\n개인정보 침해 관련 상담은 아래 기관으로도 문의할 수 있습니다.\n· 개인정보분쟁조정위원회: (국번 없이) 1833-6972\n· 개인정보침해신고센터: (국번 없이) 118\n· 대검찰청 사이버수사과: (국번 없이) 1301\n· 경찰청 사이버수사국: (국번 없이) 182',
  },
  {
    title: '11. 개인정보처리방침 변경',
    body:
      '이 개인정보처리방침은 2026년 4월 18일부터 적용됩니다. 법령이나 서비스 변경에 따라 내용이 추가, 삭제, 수정될 경우 시행 최소 7일 전에 앱 내 공지사항을 통해 사전 고지합니다.',
  },
];

const PrivacyPolicyScreen: React.FC<Props> = () => {
  const insets = useSafeAreaInsets();
  const contentStyle = useMemo(
    () => [styles.content, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.xxl }],
    [insets.bottom],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={contentStyle}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.effectiveDate}>시행일: 2026년 4월 18일</Text>

      {SECTIONS.map((section) => (
        <View key={section.title} style={styles.section}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <Text style={styles.sectionBody}>{section.body}</Text>
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
  },
  effectiveDate: {
    ...typography.bodySm,
    color: colors.gray600,
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.headingMd,
    color: colors.black,
    marginBottom: spacing.sm,
  },
  sectionBody: {
    ...typography.body,
    color: colors.gray700,
    lineHeight: 24,
  },
});

export default PrivacyPolicyScreen;
