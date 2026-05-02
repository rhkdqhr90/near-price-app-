/**
 * 마실 · 23개 레벨 뱃지 SVG 컴포넌트.
 *
 * 디자인: Claude Design / masil-badges.jsx → react-native-svg 변환.
 * 각 Badge 컴포넌트는 BadgeFrame을 기반으로 고유 모티프 일러스트를 그린다.
 *
 * 주의:
 *  - 자동 변환된 코드라 일러스트 path/좌표가 디자인 원본과 1:1.
 *  - 색상은 BADGE_PALETTE 유지. 회전/이동은 SVG transform 문자열을 사용한다.
 *  - 잠금 상태에서는 BadgeFrame이 자물쇠 마스크를 그려주므로 children은 비표시.
 */
import React from 'react';
import {
  Defs,
  RadialGradient,
  Stop,
  Path,
  Circle,
  Rect,
  Text as SvgText,
  Line,
  Ellipse,
  Polyline,
  G,
} from 'react-native-svg';
import { BadgeFrame, BADGE_PALETTE } from './BadgeFrame';

interface BadgeArtProps {
  locked?: boolean;
  size?: number;
}

// Mini pouch — base body for badge variants (smaller, simpler)
interface MiniPouchProps {
  cx?: number;
  cy?: number;
  scale?: number;
  color?: string;
  expression?: 'happy' | 'default';
}

const MiniPouch: React.FC<MiniPouchProps> = ({
  cx = 100,
  cy = 110,
  scale = 1,
  color = BADGE_PALETTE.mint,
  expression = 'happy',
}) => {
  const s = scale;
  return (
    <G transform={`translate(${cx} ${cy}) scale(${s})`}>
      {/* tie */}
      <Path d="M-30 -38 Q0 -46 30 -38" stroke={BADGE_PALETTE.ink} strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <Ellipse cx="0" cy="-40" rx="4" ry="3" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      {/* body */}
      <Path d="M-32 -28
        Q-40 -20 -42 -8
        L-42 22
        Q-42 36 -28 38
        L28 38
        Q42 36 42 22
        L42 -8
        Q40 -20 32 -28
        Q16 -34 0 -34
        Q-16 -34 -32 -28 Z"
        fill={color} stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      {/* drawstring */}
      <G stroke={BADGE_PALETTE.ink} strokeWidth="1.5" fill="none" opacity="0.4">
        <Path d="M-26 -27 Q-22 -31 -18 -27"/>
        <Path d="M-12 -29 Q-8 -32 -4 -29"/>
        <Path d="M4 -29 Q8 -32 12 -29"/>
        <Path d="M18 -27 Q22 -31 26 -27"/>
      </G>
      {/* face */}
      <Ellipse cx="-8" cy="0" rx="2.5" ry="3.5" fill={BADGE_PALETTE.ink}/>
      <Ellipse cx="8" cy="0" rx="2.5" ry="3.5" fill={BADGE_PALETTE.ink}/>
      <Circle cx="-7" cy="-1" r="1" fill="#fff"/>
      <Circle cx="9" cy="-1" r="1" fill="#fff"/>
      {expression === 'happy' ? (
        <Path d="M-5 10 Q0 16 5 10" stroke={BADGE_PALETTE.ink} strokeWidth="2" fill="none" strokeLinecap="round"/>
      ) : (
        <Path d="M-4 10 Q0 13 4 10" stroke={BADGE_PALETTE.ink} strokeWidth="2" fill="none" strokeLinecap="round"/>
      )}
      {/* cheeks */}
      <Circle cx="-16" cy="6" r="3" fill={BADGE_PALETTE.cheek} opacity="0.7"/>
      <Circle cx="16" cy="6" r="3" fill={BADGE_PALETTE.cheek} opacity="0.7"/>
    </G>
  );
};

// ═══════════════════════════════════════════════════════
// BADGES 1–15
// ═══════════════════════════════════════════════════════

// 1 · 새내기 복돌이 — 신규 가입
const Badge1: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="bronze" num={1} locked={locked} size={size}>
    <MiniPouch scale={1} color={BADGE_PALETTE.mintLight}/>
    {/* "NEW" ribbon */}
    <G transform="translate(140 50) rotate(20)">
      <Rect x="-22" y="-9" width="44" height="18" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <SvgText x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">NEW</SvgText>
    </G>
  </BadgeFrame>
);

// 2 · 첫 거래 — 첫 가격 등록
const Badge2: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="bronze" num={2} locked={locked} size={size}>
    <MiniPouch scale={0.85} color={BADGE_PALETTE.mint}/>
    {/* receipt in hand */}
    <G transform="translate(135 105)">
      <Path d="M-12 -22 L12 -22 L12 22 L8 18 L4 22 L0 18 L-4 22 L-8 18 L-12 22 Z"
        fill="#fff" stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Line x1="-8" y1="-15" x2="8" y2="-15" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="-8" y1="-9" x2="8" y2="-9" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="-8" y1="-3" x2="4" y2="-3" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <SvgText x="0" y="12" textAnchor="middle" fontSize="9" fontWeight="900" fill={BADGE_PALETTE.red}>₩</SvgText>
    </G>
  </BadgeFrame>
);

// 3 · 동네탐방 — 매장 5곳 방문
const Badge3: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="bronze" num={3} locked={locked} size={size}>
    <MiniPouch scale={0.85} color={BADGE_PALETTE.mintLight} expression="default"/>
    {/* map pin trail */}
    <G>
      {[
        [55, 70], [70, 90], [130, 70], [145, 95], [100, 60],
      ].map(([x, y], i) => (
        <G key={i} transform={`translate(${x} ${y})`}>
          <Path d="M0 -8 Q-6 -8 -6 -2 Q-6 4 0 10 Q6 4 6 -2 Q6 -8 0 -8 Z"
            fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
          <Circle cx="0" cy="-2" r="1.5" fill="#fff"/>
        </G>
      ))}
    </G>
  </BadgeFrame>
);

// 4 · 영수증 마스터 — 영수증 10장
const Badge4: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="bronze" num={4} locked={locked} size={size}>
    {/* stack of receipts */}
    <G transform="translate(100 110)">
      {[2, 1, 0].map((i) => (
        <G key={i} transform={`translate(${i * 4 - 4} ${-i * 6}) rotate(${(i - 1) * 6})`}>
          <Path d="M-22 -34 L22 -34 L22 30 L18 26 L14 30 L10 26 L6 30 L2 26 L-2 30 L-6 26 L-10 30 L-14 26 L-18 30 L-22 26 Z"
            fill={i === 0 ? BADGE_PALETTE.cream : '#fff'} stroke={BADGE_PALETTE.ink} strokeWidth="2.5"/>
          <Line x1="-16" y1="-25" x2="16" y2="-25" stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
          <Line x1="-16" y1="-17" x2="16" y2="-17" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
          <Line x1="-16" y1="-10" x2="10" y2="-10" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
          <Line x1="-16" y1="-3" x2="14" y2="-3" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
          {i === 0 && (
            <SvgText x="0" y="18" textAnchor="middle" fontSize="14" fontWeight="900" fill={BADGE_PALETTE.red}>10</SvgText>
          )}
        </G>
      ))}
    </G>
  </BadgeFrame>
);

// 5 · 알뜰 사냥꾼 — 최저가 10건
const Badge5: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="silver" num={5} locked={locked} size={size}>
    <MiniPouch scale={0.85} color={BADGE_PALETTE.mint}/>
    {/* arrow & target */}
    <G transform="translate(150 60)">
      <Circle cx="0" cy="0" r="16" fill={BADGE_PALETTE.cream} stroke={BADGE_PALETTE.ink} strokeWidth="2.5"/>
      <Circle cx="0" cy="0" r="10" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Circle cx="0" cy="0" r="4" fill={BADGE_PALETTE.cream}/>
      <Path d="M-22 22 L-2 2" stroke={BADGE_PALETTE.ink} strokeWidth="3" strokeLinecap="round"/>
      <Path d="M-2 2 L4 -2 L0 0 Z" fill={BADGE_PALETTE.ink}/>
    </G>
    {/* hat — hunter cap */}
    <G transform="translate(100 60)">
      <Ellipse cx="0" cy="2" rx="22" ry="5" fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Path d="M-14 2 Q-14 -16 0 -16 Q14 -16 14 2 Z" fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Circle cx="0" cy="-12" r="3" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
    </G>
  </BadgeFrame>
);

// 6 · 카메라맨 — OCR 등록 30건
const Badge6: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="silver" num={6} locked={locked} size={size}>
    <MiniPouch scale={0.85} color={BADGE_PALETTE.mintLight}/>
    {/* camera */}
    <G transform="translate(100 75)">
      <Rect x="-22" y="-10" width="44" height="28" rx="4"
        fill={BADGE_PALETTE.ink} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Rect x="-10" y="-16" width="20" height="8" rx="2"
        fill={BADGE_PALETTE.ink} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Circle cx="0" cy="4" r="9" fill={BADGE_PALETTE.mint} stroke="#fff" strokeWidth="2"/>
      <Circle cx="0" cy="4" r="5" fill={BADGE_PALETTE.ink}/>
      <Circle cx="-2" cy="2" r="2" fill="#fff" opacity="0.6"/>
      <Circle cx="14" cy="-5" r="1.5" fill={BADGE_PALETTE.red}/>
    </G>
    {/* flash */}
    <G transform="translate(70 50)" opacity="0.8">
      <Path d="M0 -8 L4 -2 L8 0 L4 2 L0 8 L-4 2 L-8 0 L-4 -2 Z"
        fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
    </G>
  </BadgeFrame>
);

// 7 · 골목대장 — 동네 1위
const Badge7: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="silver" num={7} locked={locked} size={size}>
    <MiniPouch scale={0.85} color={BADGE_PALETTE.mint}/>
    {/* crown */}
    <G transform="translate(100 56)">
      <Path d="M-22 6 L-22 -10 L-12 -2 L-6 -14 L0 -4 L6 -14 L12 -2 L22 -10 L22 6 Z"
        fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
      <Circle cx="-12" cy="-2" r="2" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Circle cx="0" cy="-4" r="2" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Circle cx="12" cy="-2" r="2" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="-22" y1="6" x2="22" y2="6" stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
    </G>
    {/* "1" medal */}
    <G transform="translate(135 110)">
      <Circle cx="0" cy="0" r="15" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5"/>
      <SvgText x="0" y="6" textAnchor="middle" fontSize="18" fontWeight="900" fill={BADGE_PALETTE.ink}>1</SvgText>
    </G>
  </BadgeFrame>
);

// 8 · 시세 박사 — 가격 추적 30개
const Badge8: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="silver" num={8} locked={locked} size={size}>
    <MiniPouch scale={0.8} color={BADGE_PALETTE.mintLight}/>
    {/* graduation cap */}
    <G transform="translate(100 56)">
      <Rect x="-20" y="-2" width="40" height="6" fill={BADGE_PALETTE.ink}/>
      <Path d="M-26 0 L0 -12 L26 0 L0 8 Z" fill={BADGE_PALETTE.ink} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      <Path d="M22 2 L26 14" stroke={BADGE_PALETTE.butter} strokeWidth="2.5" strokeLinecap="round"/>
      <Circle cx="26" cy="14" r="2.5" fill={BADGE_PALETTE.butter}/>
    </G>
    {/* graph chart */}
    <G transform="translate(100 130)">
      <Rect x="-26" y="-12" width="52" height="28" rx="3"
        fill="#fff" stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Polyline points="-22,10 -12,4 -2,8 8,-2 18,-8 22,-6"
        fill="none" stroke={BADGE_PALETTE.mint} strokeWidth="2.5" strokeLinejoin="round"/>
      <Circle cx="18" cy="-8" r="2" fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
    </G>
  </BadgeFrame>
);

// 9 · 황금 영수증 — 100건 등록
const Badge9: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="gold" num={9} locked={locked} size={size}>
    {/* glowing receipt */}
    <G transform="translate(100 110)">
      <Path d="M-26 -38 L26 -38 L26 32 L22 28 L18 32 L14 28 L10 32 L6 28 L2 32 L-2 28 L-6 32 L-10 28 L-14 32 L-18 28 L-22 32 L-26 28 Z"
        fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      <Line x1="-20" y1="-28" x2="20" y2="-28" stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      <Line x1="-20" y1="-20" x2="20" y2="-20" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="-20" y1="-12" x2="14" y2="-12" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="-20" y1="-4" x2="18" y2="-4" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <SvgText x="0" y="18" textAnchor="middle" fontSize="20" fontWeight="900" fill={BADGE_PALETTE.ink}>100</SvgText>
    </G>
    {/* sparkle around */}
    <G opacity="0.9">
      <Path d="M68 70 L72 78 L80 80 L72 82 L68 90 L64 82 L56 80 L64 78 Z" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      <Path d="M138 130 L141 136 L147 138 L141 140 L138 146 L135 140 L129 138 L135 136 Z" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
    </G>
  </BadgeFrame>
);

// 10 · 시장의 등불 — 채택률 80%
const Badge10: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="gold" num={10} locked={locked} size={size}>
    {/* lantern */}
    <G transform="translate(100 110)">
      <Path d="M-2 -50 L2 -50 L2 -38 L-2 -38 Z" fill={BADGE_PALETTE.ink}/>
      <Path d="M-14 -38 L14 -38 L14 -32 L-14 -32 Z" fill={BADGE_PALETTE.ink}/>
      <Path d="M-22 -32 Q-22 24 0 28 Q22 24 22 -32 Z"
        fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      <Path d="M-22 -32 Q-22 24 0 28 Q22 24 22 -32 Z"
        fill={`url(#lantern_glow)`} opacity="0.5"/>
      <Defs>
        <RadialGradient id="lantern_glow">
          <Stop offset="0%" stopColor={BADGE_PALETTE.butter}/>
          <Stop offset="100%" stopColor={BADGE_PALETTE.warm} stopOpacity="0"/>
        </RadialGradient>
      </Defs>
      <Line x1="-22" y1="-12" x2="22" y2="-12" stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Line x1="-22" y1="8" x2="22" y2="8" stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <SvgText x="0" y="2" textAnchor="middle" fontSize="14" fontWeight="900" fill={BADGE_PALETTE.ink}>福</SvgText>
      <Path d="M-14 28 L14 28 L14 34 L-14 34 Z" fill={BADGE_PALETTE.ink}/>
    </G>
    {/* glow rays */}
    <G opacity="0.4">
      {[0, 60, 120, 180, 240, 300].map((a) => (
        <Line key={a} x1="100" y1="105"
          x2={100 + Math.cos((a - 90) * Math.PI / 180) * 75}
          y2={105 + Math.sin((a - 90) * Math.PI / 180) * 75}
          stroke={BADGE_PALETTE.butter} strokeWidth="2" strokeLinecap="round" strokeDasharray="2 4"/>
      ))}
    </G>
  </BadgeFrame>
);

// 11 · 신뢰의 인장 — 정확도 95%
const Badge11: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="gold" num={11} locked={locked} size={size}>
    {/* wax seal stamp */}
    <G transform="translate(100 110)">
      <Circle cx="0" cy="0" r="38" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      <Circle cx="0" cy="0" r="38" fill="url(#seal_grad)" opacity="0.3"/>
      <Defs>
        <RadialGradient id="seal_grad">
          <Stop offset="0%" stopColor="#fff" stopOpacity="0.6"/>
          <Stop offset="100%" stopColor="#fff" stopOpacity="0"/>
        </RadialGradient>
      </Defs>
      {/* drip edges */}
      <Path d="M-38 0 Q-42 -8 -36 -16" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Path d="M38 0 Q42 8 36 16" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Path d="M-26 28 Q-30 36 -22 38" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      {/* inner */}
      <Circle cx="0" cy="0" r="28" fill="none" stroke={BADGE_PALETTE.cream} strokeWidth="1.5"/>
      <SvgText x="0" y="-2" textAnchor="middle" fontSize="22" fontWeight="900"
        fill={BADGE_PALETTE.cream}>信</SvgText>
      <SvgText x="0" y="14" textAnchor="middle" fontSize="8" fontWeight="700"
        fill={BADGE_PALETTE.cream} letterSpacing="1.5">TRUSTED</SvgText>
    </G>
  </BadgeFrame>
);

// 12 · 전단지 마스터 — 전단지 50개 공유
const Badge12: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="platinum" num={12} locked={locked} size={size}>
    {/* fanned flyers */}
    <G transform="translate(100 110)">
      {[-25, -12, 0, 12, 25].map((rot, i) => (
        <G key={i} transform={`rotate(${rot})`}>
          <Rect x="-18" y="-32" width="36" height="56" rx="2"
            fill={i % 2 ? BADGE_PALETTE.cream : '#fff'} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
          <Rect x="-14" y="-28" width="28" height="8" fill={BADGE_PALETTE.red}/>
          <SvgText x="0" y="-22" textAnchor="middle" fontSize="6" fontWeight="900" fill="#fff">SALE</SvgText>
          <Line x1="-12" y1="-14" x2="12" y2="-14" stroke={BADGE_PALETTE.ink} strokeWidth="0.8"/>
          <Line x1="-12" y1="-9" x2="8" y2="-9" stroke={BADGE_PALETTE.ink} strokeWidth="0.8"/>
          <SvgText x="0" y="6" textAnchor="middle" fontSize="10" fontWeight="900" fill={BADGE_PALETTE.red}>₩</SvgText>
          <Line x1="-12" y1="14" x2="12" y2="14" stroke={BADGE_PALETTE.ink} strokeWidth="0.8"/>
        </G>
      ))}
    </G>
  </BadgeFrame>
);

// 13 · 동네 전설 — 누적 절약 100만원
const Badge13: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="platinum" num={13} locked={locked} size={size}>
    {/* big won coin with character */}
    <G transform="translate(100 110)">
      <Circle cx="0" cy="0" r="42" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      <Circle cx="0" cy="0" r="36" fill="none" stroke={BADGE_PALETTE.ink} strokeWidth="1.5" strokeDasharray="3 2"/>
      <SvgText x="0" y="14" textAnchor="middle" fontSize="44" fontWeight="900" fill={BADGE_PALETTE.ink}>₩</SvgText>
      {/* 100 ribbon */}
      <G transform="translate(0 30)">
        <Rect x="-26" y="-7" width="52" height="14" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
        <Path d="M-30 -7 L-26 0 L-30 7 Z" fill={BADGE_PALETTE.ringDark || '#A82020'} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
        <Path d="M30 -7 L26 0 L30 7 Z" fill={BADGE_PALETTE.ringDark || '#A82020'} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
        <SvgText x="0" y="3" textAnchor="middle" fontSize="9" fontWeight="900" fill="#fff" letterSpacing="0.5">1,000,000</SvgText>
      </G>
    </G>
  </BadgeFrame>
);

// 14 · 만석꾼 복돌이 — 1만 포인트
const Badge14: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="mythic" num={14} locked={locked} size={size}>
    {/* big golden pouch with overflowing coins */}
    <G transform="translate(100 110)">
      {/* coins behind */}
      {[
        [-32, 24], [32, 26], [-26, 36], [28, 38], [0, 42],
      ].map(([x, y], i) => (
        <G key={i} transform={`translate(${x} ${y})`}>
          <Circle cx="0" cy="0" r="6" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
          <SvgText x="0" y="2" textAnchor="middle" fontSize="6" fontWeight="900" fill={BADGE_PALETTE.ink}>₩</SvgText>
        </G>
      ))}
      {/* pouch */}
      <Path d="M-28 -28 Q-38 -18 -38 -4
        L-38 16 Q-38 28 -26 30
        L26 30 Q38 28 38 16 L38 -4
        Q38 -18 28 -28
        Q14 -34 0 -34 Q-14 -34 -28 -28 Z"
        fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      <Path d="M-32 -28 Q-2 -36 32 -28" stroke={BADGE_PALETTE.ink} strokeWidth="2" fill="none"/>
      <SvgText x="0" y="6" textAnchor="middle" fontSize="22" fontWeight="900" fill={BADGE_PALETTE.ink}>₩</SvgText>
      {/* spillover coins on top */}
      {[
        [-14, -32], [12, -34], [-2, -38],
      ].map(([x, y], i) => (
        <G key={i} transform={`translate(${x} ${y})`}>
          <Circle cx="0" cy="0" r="5" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
        </G>
      ))}
    </G>
  </BadgeFrame>
);

// 15 · 수호신 복돌이 — 마실 1주년 + 모든 뱃지
const Badge15: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="mythic" num={15} locked={locked} size={size}>
    {/* halo */}
    <G opacity="0.85">
      <Circle cx="100" cy="80" r="24" fill="none" stroke={BADGE_PALETTE.butter} strokeWidth="3"/>
      <Circle cx="100" cy="80" r="28" fill="none" stroke={BADGE_PALETTE.butter} strokeWidth="1.5" opacity="0.5"/>
    </G>
    <MiniPouch scale={1} color={BADGE_PALETTE.mint} cy={105}/>
    {/* wings */}
    <G>
      <Path d="M68 110 Q40 90 32 110 Q40 118 56 116 Q44 124 38 134 Q56 130 68 122"
        fill={BADGE_PALETTE.cream} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
      <Path d="M132 110 Q160 90 168 110 Q160 118 144 116 Q156 124 162 134 Q144 130 132 122"
        fill={BADGE_PALETTE.cream} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
      {/* feather lines */}
      <G stroke={BADGE_PALETTE.ink} strokeWidth="1" fill="none" opacity="0.4">
        <Path d="M52 112 Q48 116 50 122"/>
        <Path d="M148 112 Q152 116 150 122"/>
      </G>
    </G>
    {/* aura sparkles handled by frame */}
    {/* star above */}
    <G transform="translate(100 56)">
      <Path d="M0 -10 L3 -3 L10 -3 L4 2 L7 9 L0 5 L-7 9 L-4 2 L-10 -3 L-3 -3 Z"
        fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
    </G>
  </BadgeFrame>
);

// ═══════════════════════════════════════════════════════
// EXTENDED UPPER-TIER BADGES (16-23) — gold/platinum/mythic
// ═══════════════════════════════════════════════════════

// 16 · 황금 저울 — 정직한 가격 비교 1000회
const Badge16: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="gold" num={16} locked={locked} size={size}>
    {/* balance scale */}
    <G transform="translate(100 110)">
      <Line x1="0" y1="-40" x2="0" y2="20" stroke={BADGE_PALETTE.ink} strokeWidth="3" strokeLinecap="round"/>
      <Path d="M0 -40 L0 -45" stroke={BADGE_PALETTE.ink} strokeWidth="3" strokeLinecap="round"/>
      <Line x1="-32" y1="-32" x2="32" y2="-32" stroke={BADGE_PALETTE.ink} strokeWidth="3" strokeLinecap="round"/>
      <Line x1="-32" y1="-32" x2="-32" y2="-22" stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      <Line x1="32" y1="-32" x2="32" y2="-22" stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
      {/* left pan with coin */}
      <Path d="M-44 -22 L-20 -22 Q-22 -8 -32 -6 Q-42 -8 -44 -22 Z"
        fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5"/>
      <Circle cx="-32" cy="-26" r="5" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      <SvgText x="-32" y="-23" textAnchor="middle" fontSize="6" fontWeight="900" fill={BADGE_PALETTE.ink}>₩</SvgText>
      {/* right pan with coin */}
      <Path d="M20 -22 L44 -22 Q42 -8 32 -6 Q22 -8 20 -22 Z"
        fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5"/>
      <Circle cx="32" cy="-26" r="5" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      <SvgText x="32" y="-23" textAnchor="middle" fontSize="6" fontWeight="900" fill={BADGE_PALETTE.ink}>₩</SvgText>
      {/* base */}
      <Rect x="-18" y="20" width="36" height="6" rx="2" fill={BADGE_PALETTE.ink}/>
      <Ellipse cx="0" cy="26" rx="22" ry="4" fill={BADGE_PALETTE.ink} opacity="0.3"/>
    </G>
  </BadgeFrame>
);

// 17 · 시장의 학자 — 1년 연속 가격 등록
const Badge17: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="gold" num={17} locked={locked} size={size}>
    <MiniPouch scale={0.78} color={BADGE_PALETTE.butter}/>
    {/* open book */}
    <G transform="translate(100 145)">
      <Path d="M-30 -12 Q-30 -16 -26 -16 L-2 -14 L-2 14 L-26 12 Q-30 12 -30 8 Z"
        fill="#fff" stroke={BADGE_PALETTE.ink} strokeWidth="2.5"/>
      <Path d="M30 -12 Q30 -16 26 -16 L2 -14 L2 14 L26 12 Q30 12 30 8 Z"
        fill="#fff" stroke={BADGE_PALETTE.ink} strokeWidth="2.5"/>
      <Line x1="-24" y1="-9" x2="-6" y2="-8" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="-24" y1="-4" x2="-8" y2="-3" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="-24" y1="1" x2="-6" y2="2" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="6" y1="-8" x2="24" y2="-9" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="8" y1="-3" x2="24" y2="-4" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      <Line x1="6" y1="2" x2="24" y2="1" stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
    </G>
    {/* quill above */}
    <G transform="translate(140 56) rotate(30)">
      <Path d="M0 0 L-2 -28 Q-1 -30 1 -28 L2 0 Z" fill={BADGE_PALETTE.cream} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      <Path d="M-2 -22 Q-6 -20 -2 -16" stroke={BADGE_PALETTE.ink} strokeWidth="0.8" fill="none"/>
    </G>
  </BadgeFrame>
);

// 18 · 매장 정복자 — 매장 100곳 방문
const Badge18: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="platinum" num={18} locked={locked} size={size}>
    {/* world map / district grid with flag */}
    <G transform="translate(100 110)">
      <Circle cx="0" cy="0" r="42" fill={BADGE_PALETTE.cream} stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      {/* district lines */}
      <G stroke={BADGE_PALETTE.ink} strokeWidth="1" fill="none" opacity="0.4">
        <Path d="M-42 0 Q-20 -8 0 0 Q20 8 42 0"/>
        <Path d="M-30 -30 Q-10 -20 10 -28 Q26 -32 38 -22"/>
        <Path d="M-38 22 Q-18 14 4 24 Q24 30 36 22"/>
        <Line x1="-12" y1="-42" x2="-8" y2="42"/>
        <Line x1="20" y1="-38" x2="14" y2="40"/>
      </G>
      {/* pins scattered */}
      {[
        [-22, -10], [12, -18], [-8, 14], [22, 8], [-26, 18], [4, -28], [28, -8],
      ].map(([x, y], i) => (
        <G key={i} transform={`translate(${x} ${y})`}>
          <Path d="M0 -8 Q-5 -8 -5 -2 Q-5 4 0 8 Q5 4 5 -2 Q5 -8 0 -8 Z"
            fill={i === 0 ? BADGE_PALETTE.red : BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
          <Circle cx="0" cy="-2" r="1.5" fill="#fff"/>
        </G>
      ))}
      {/* central flag */}
      <G transform="translate(0 -2)">
        <Line x1="0" y1="-6" x2="0" y2="22" stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinecap="round"/>
        <Path d="M0 -16 L18 -10 L0 -4 Z" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
        <SvgText x="6" y="-8" fontSize="7" fontWeight="900" fill="#fff">100</SvgText>
      </G>
    </G>
  </BadgeFrame>
);

// 19 · 시간의 증인 — 마실 1주년 활동
const Badge19: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="platinum" num={19} locked={locked} size={size}>
    {/* hourglass / clock with laurel */}
    <G transform="translate(100 110)">
      {/* laurel left */}
      <G stroke={BADGE_PALETTE.ringDark || '#5B3FB0'} strokeWidth="2" fill="none" opacity="0.7">
        <Path d="M-40 30 Q-46 0 -40 -28"/>
      </G>
      <G fill={BADGE_PALETTE.mint} stroke={BADGE_PALETTE.ink} strokeWidth="1.5" opacity="0.85">
        <Ellipse cx="-42" cy="-14" rx="5" ry="3" transform="rotate(-30 -42 -14)"/>
        <Ellipse cx="-44" cy="0" rx="5" ry="3" transform="rotate(-10 -44 0)"/>
        <Ellipse cx="-42" cy="14" rx="5" ry="3" transform="rotate(20 -42 14)"/>
      </G>
      {/* laurel right */}
      <G stroke={BADGE_PALETTE.ringDark || '#5B3FB0'} strokeWidth="2" fill="none" opacity="0.7">
        <Path d="M40 30 Q46 0 40 -28"/>
      </G>
      <G fill={BADGE_PALETTE.mint} stroke={BADGE_PALETTE.ink} strokeWidth="1.5" opacity="0.85">
        <Ellipse cx="42" cy="-14" rx="5" ry="3" transform="rotate(30 42 -14)"/>
        <Ellipse cx="44" cy="0" rx="5" ry="3" transform="rotate(10 44 0)"/>
        <Ellipse cx="42" cy="14" rx="5" ry="3" transform="rotate(-20 42 14)"/>
      </G>
      {/* clock face */}
      <Circle cx="0" cy="0" r="30" fill="#fff" stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      <Circle cx="0" cy="0" r="30" fill={BADGE_PALETTE.bgPlatinum || '#F0E8FF'} opacity="0.4"/>
      {/* tick marks at 12 / 3 / 6 / 9 */}
      <G stroke={BADGE_PALETTE.ink} strokeWidth="2" strokeLinecap="round">
        <Line x1="0" y1="-26" x2="0" y2="-22"/>
        <Line x1="26" y1="0" x2="22" y2="0"/>
        <Line x1="0" y1="26" x2="0" y2="22"/>
        <Line x1="-26" y1="0" x2="-22" y2="0"/>
      </G>
      {/* hands */}
      <Line x1="0" y1="0" x2="0" y2="-18" stroke={BADGE_PALETTE.ink} strokeWidth="3" strokeLinecap="round"/>
      <Line x1="0" y1="0" x2="14" y2="6" stroke={BADGE_PALETTE.warm} strokeWidth="2.5" strokeLinecap="round"/>
      <Circle cx="0" cy="0" r="3" fill={BADGE_PALETTE.ink}/>
      {/* "1Y" label */}
      <SvgText x="0" y="20" textAnchor="middle" fontSize="9" fontWeight="900" fill={BADGE_PALETTE.ink} letterSpacing="1">1 YEAR</SvgText>
    </G>
  </BadgeFrame>
);

// 20 · 가격 예언자 — 가격 변동 예측 정확도 90%
const Badge20: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="platinum" num={20} locked={locked} size={size}>
    {/* crystal ball with graph */}
    <G transform="translate(100 110)">
      {/* base */}
      <Path d="M-26 32 L26 32 L20 42 L-20 42 Z" fill={BADGE_PALETTE.ink}/>
      <Ellipse cx="0" cy="32" rx="26" ry="4" fill={BADGE_PALETTE.ringDark || '#5B3FB0'}/>
      {/* ball */}
      <Circle cx="0" cy="0" r="36" fill={BADGE_PALETTE.bgPlatinum || '#F0E8FF'} stroke={BADGE_PALETTE.ink} strokeWidth="3"/>
      <Circle cx="0" cy="0" r="36" fill="url(#ball_grad)" opacity="0.6"/>
      <Defs>
        <RadialGradient id="ball_grad" cx="35%" cy="30%">
          <Stop offset="0%" stopColor="#fff" stopOpacity="0.9"/>
          <Stop offset="60%" stopColor="#fff" stopOpacity="0.1"/>
          <Stop offset="100%" stopColor="#9B7EE8" stopOpacity="0.4"/>
        </RadialGradient>
      </Defs>
      {/* graph inside ball — predicting drop */}
      <Polyline points="-20,-4 -10,-12 0,-8 10,4 18,12"
        fill="none" stroke={BADGE_PALETTE.warm} strokeWidth="2.5" strokeLinejoin="round" strokeDasharray="0 0"/>
      <Polyline points="18,12 24,18"
        fill="none" stroke={BADGE_PALETTE.warm} strokeWidth="2.5" strokeDasharray="3 2" strokeLinejoin="round"/>
      <Circle cx="18" cy="12" r="2.5" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      {/* highlight */}
      <Ellipse cx="-12" cy="-18" rx="8" ry="5" fill="#fff" opacity="0.5"/>
      {/* sparks */}
      <G opacity="0.9">
        <Path d="M-30 -34 L-28 -30 L-24 -28 L-28 -26 L-30 -22 L-32 -26 L-36 -28 L-32 -30 Z"
          fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      </G>
    </G>
  </BadgeFrame>
);

// 21 · 봉황 복돌이 — 누적 절약 1000만원
const Badge21: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="mythic" num={21} locked={locked} size={size}>
    {/* phoenix wings + pouch */}
    <G>
      {/* tail feathers behind */}
      <G transform="translate(100 130)">
        <Path d="M-50 30 Q-60 0 -40 -20" fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round" opacity="0.85"/>
        <Path d="M-36 36 Q-46 12 -28 -10" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
        <Path d="M50 30 Q60 0 40 -20" fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round" opacity="0.85"/>
        <Path d="M36 36 Q46 12 28 -10" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
      </G>
      {/* flame above */}
      <G transform="translate(100 56)">
        <Path d="M-12 8 Q-14 -8 -2 -14 Q0 -8 6 -12 Q10 -4 8 4 Q12 0 14 8 Q8 16 -4 16 Q-12 14 -12 8 Z"
          fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
        <Path d="M-6 6 Q-4 -2 4 -2 Q4 4 8 6 Q4 12 -2 10 Z"
          fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      </G>
      {/* central pouch */}
      <MiniPouch scale={0.95} color={BADGE_PALETTE.red} cy={115} expression="default"/>
      {/* wings overlay */}
      <G transform="translate(100 115)">
        <Path d="M-32 -8 Q-58 -20 -68 0 Q-54 6 -42 -2 Q-58 14 -50 28 Q-36 18 -32 8"
          fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
        <Path d="M32 -8 Q58 -20 68 0 Q54 6 42 -2 Q58 14 50 28 Q36 18 32 8"
          fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
      </G>
    </G>
  </BadgeFrame>
);

// 22 · 황금 도깨비 — 가격 등록 1000건
const Badge22: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="mythic" num={22} locked={locked} size={size}>
    {/* dokkaebi club + horns + golden pouch */}
    <G>
      {/* horns */}
      <G transform="translate(100 60)">
        <Path d="M-14 0 Q-22 -16 -16 -28 Q-8 -22 -8 -8" fill={BADGE_PALETTE.cream} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
        <Path d="M14 0 Q22 -16 16 -28 Q8 -22 8 -8" fill={BADGE_PALETTE.cream} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
        {/* horn rings */}
        <Line x1="-18" y1="-12" x2="-10" y2="-14" stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
        <Line x1="18" y1="-12" x2="10" y2="-14" stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      </G>
      <MiniPouch scale={1} color={BADGE_PALETTE.butter} cy={115} expression="default"/>
      {/* dokkaebi club at side */}
      <G transform="translate(155 110) rotate(20)">
        <Rect x="-4" y="-4" width="8" height="36" rx="3" fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="2"/>
        <Ellipse cx="0" cy="-8" rx="14" ry="12" fill={BADGE_PALETTE.warm} stroke={BADGE_PALETTE.ink} strokeWidth="2.5"/>
        {/* spikes */}
        <G fill={BADGE_PALETTE.ink}>
          <Circle cx="-8" cy="-10" r="2"/>
          <Circle cx="8" cy="-10" r="2"/>
          <Circle cx="-6" cy="-2" r="2"/>
          <Circle cx="6" cy="-2" r="2"/>
          <Circle cx="0" cy="-14" r="2"/>
        </G>
      </G>
      {/* gold sparks */}
      <G>
        <Path d="M50 80 L52 84 L56 86 L52 88 L50 92 L48 88 L44 86 L48 84 Z" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
        <Path d="M148 158 L150 162 L154 164 L150 166 L148 170 L146 166 L142 164 L146 162 Z" fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
      </G>
    </G>
  </BadgeFrame>
);

// 23 · 마실의 신 — 모든 뱃지 + 1만 채택
const Badge23: React.FC<BadgeArtProps> = ({ locked, size }) => (
  <BadgeFrame tier="mythic" num={23} locked={locked} size={size}>
    {/* divine pouch with rays + crown */}
    <G>
      {/* divine rays */}
      <G opacity="0.55">
        {[-60, -40, -20, 0, 20, 40, 60].map((a) => {
          const rad = (a - 90) * Math.PI / 180;
          return (
            <Path key={a}
              d={`M100 110 L${100 + Math.cos(rad) * 90} ${110 + Math.sin(rad) * 90}`}
              stroke={BADGE_PALETTE.butter} strokeWidth={a % 40 === 0 ? 3 : 1.5}
              strokeLinecap="round"/>
          );
        })}
      </G>
      {/* central halo */}
      <Circle cx="100" cy="105" r="50" fill={BADGE_PALETTE.butter} opacity="0.18"/>
      <Circle cx="100" cy="80" r="20" fill="none" stroke={BADGE_PALETTE.butter} strokeWidth="3"/>
      {/* pouch with majestic look */}
      <MiniPouch scale={1.05} color={BADGE_PALETTE.mint} cy={120} expression="default"/>
      {/* crown over halo */}
      <G transform="translate(100 60)">
        <Path d="M-18 4 L-18 -8 L-10 -2 L-4 -12 L0 -4 L4 -12 L10 -2 L18 -8 L18 4 Z"
          fill={BADGE_PALETTE.butter} stroke={BADGE_PALETTE.ink} strokeWidth="2.5" strokeLinejoin="round"/>
        <Circle cx="0" cy="-4" r="2" fill={BADGE_PALETTE.red} stroke={BADGE_PALETTE.ink} strokeWidth="1"/>
        <Line x1="-18" y1="4" x2="18" y2="4" stroke={BADGE_PALETTE.ink} strokeWidth="1.5"/>
      </G>
      {/* won character on body — sacred mark */}
      <G transform="translate(100 122)">
        <SvgText x="0" y="0" textAnchor="middle" fontSize="22" fontWeight="900"
          fill={BADGE_PALETTE.cream} stroke={BADGE_PALETTE.ink} strokeWidth="0.5">神</SvgText>
      </G>
    </G>
  </BadgeFrame>
);

// ─────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────

/**
 * id 1~23 → SVG 컴포넌트 매핑. masilBadges.ts의 num과 일치.
 */
export const BADGE_ART: Record<number, React.FC<BadgeArtProps>> = {
  1: Badge1, 2: Badge2, 3: Badge3, 4: Badge4, 5: Badge5,
  6: Badge6, 7: Badge7, 8: Badge8, 9: Badge9, 10: Badge10,
  11: Badge11, 12: Badge12, 13: Badge13, 14: Badge14, 15: Badge15,
  16: Badge16, 17: Badge17, 18: Badge18, 19: Badge19, 20: Badge20,
  21: Badge21, 22: Badge22, 23: Badge23,
};
