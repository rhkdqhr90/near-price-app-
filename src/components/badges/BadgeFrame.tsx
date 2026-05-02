import React from 'react';
import Svg, {
  Defs,
  RadialGradient,
  LinearGradient,
  Stop,
  Path,
  Circle,
  Rect,
  Text as SvgText,
  G,
} from 'react-native-svg';
import type { BadgeTier } from '../../data/masilBadges';

/**
 * BadgeFrame — 23개 뱃지 공통 프레임 (티어 ring · 배경 그라디언트 · 잠금 · sparkle).
 *
 * 디자인: Claude Design / Masil Badges.html → masil-badges.jsx 의 BadgeFrame
 * react-native-svg 변환. viewBox 200×240 유지.
 */

const PALETTE = {
  mint: '#00BFA5',
  mintLight: '#A8E6DC',
  cream: '#FFF6E0',
  butter: '#FFD86B',
  warm: '#FF8A4C',
  red: '#E84A40',
  ink: '#1A2A26',
  cheek: '#FFB5A8',
  // 일부 Badge 일러스트(원본 jsx)가 외부에서 참조하는 보조 색상.
  // 디자인의 TIERS 안 색상을 그대로 빼서 일러스트에서 직접 참조하기 위한 alias.
  ringDark: '#7A4A1F',
  bgPlatinum: '#F0E8FF',
} as const;

interface TierVisual {
  label: string;
  ring: string;
  ringDark: string;
  ringLight: string;
  bg: string;
  bgDark: string;
  chip: string;
  glow: boolean;
  sparkle: number;
  rainbow?: boolean;
}

const TIERS: Record<BadgeTier, TierVisual> = {
  bronze: {
    label: 'COMMON',
    ring: '#B87333', ringDark: '#7A4A1F', ringLight: '#E0A872',
    bg: '#FFF1E2', bgDark: '#F5DCB7',
    chip: '#B87333',
    glow: false, sparkle: 0,
  },
  silver: {
    label: 'RARE',
    ring: '#A8B0BC', ringDark: '#6B7480', ringLight: '#D8DDE5',
    bg: '#F0F3F7', bgDark: '#D5DBE3',
    chip: '#5B6573',
    glow: false, sparkle: 2,
  },
  gold: {
    label: 'EPIC',
    ring: '#E8B946', ringDark: '#A87F1A', ringLight: '#FFE082',
    bg: '#FFF6D6', bgDark: '#F5E0A0',
    chip: '#9D6F0E',
    glow: true, sparkle: 4,
  },
  platinum: {
    label: 'LEGENDARY',
    ring: '#9B7EE8', ringDark: '#5B3FB0', ringLight: '#D4C4FF',
    bg: '#F0E8FF', bgDark: '#D4C4F5',
    chip: '#5B3FB0',
    glow: true, sparkle: 6,
  },
  mythic: {
    label: 'MYTHIC',
    ring: '#FF4F8B', ringDark: '#B0205E', ringLight: '#FFB3CD',
    bg: '#FFE4EC', bgDark: '#F7C4D5',
    chip: '#B0205E',
    glow: true, sparkle: 8,
    rainbow: true,
  },
};

interface BadgeFrameProps {
  tier: BadgeTier;
  num: number;
  locked?: boolean;
  size?: number;
  children?: React.ReactNode;
}

export const BadgeFrame: React.FC<BadgeFrameProps> = ({
  tier,
  num,
  locked = false,
  size = 200,
  children,
}) => {
  const T = TIERS[tier];
  const id = `g_${tier}_${num}`;

  return (
    <Svg width={size} height={size * 1.2} viewBox="0 0 200 240">
      <Defs>
        <RadialGradient id={`${id}_bg`} cx="50%" cy="40%" rx="65%" ry="65%">
          <Stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
          <Stop offset="60%" stopColor={T.bg} />
          <Stop offset="100%" stopColor={T.bgDark} />
        </RadialGradient>
        <LinearGradient id={`${id}_ring`} x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor={T.ringLight} />
          <Stop offset="50%" stopColor={T.ring} />
          <Stop offset="100%" stopColor={T.ringDark} />
        </LinearGradient>
        {T.rainbow ? (
          <LinearGradient
            id={`${id}_rainbow`}
            x1="0%" y1="0%" x2="100%" y2="100%"
          >
            <Stop offset="0%" stopColor="#FF4F8B" />
            <Stop offset="33%" stopColor="#FFB347" />
            <Stop offset="66%" stopColor="#00BFA5" />
            <Stop offset="100%" stopColor="#9B7EE8" />
          </LinearGradient>
        ) : null}
      </Defs>

      {/* outer glow for high tiers */}
      {T.glow && !locked && (
        <Circle cx="100" cy="105" r="92" fill={T.ring} opacity="0.18" />
      )}

      {/* hexagonal pouch frame */}
      <Path
        d="M100 10 L172 38 L172 142 Q172 168 152 184 L100 220 L48 184 Q28 168 28 142 L28 38 Z"
        fill={`url(#${id}_bg)`}
        stroke={T.rainbow ? `url(#${id}_rainbow)` : `url(#${id}_ring)`}
        strokeWidth={6}
        strokeLinejoin="round"
      />

      {/* inner ring */}
      <Path
        d="M100 22 L162 46 L162 140 Q162 162 146 175 L100 207 L54 175 Q38 162 38 140 L38 46 Z"
        fill="none"
        stroke={T.ringDark}
        strokeWidth={1.5}
        strokeLinejoin="round"
        opacity="0.4"
      />

      {/* tier label band */}
      <G>
        <Rect
          x="60" y="2" width="80" height="22" rx="11"
          fill={T.chip}
          stroke={PALETTE.ink}
          strokeWidth={2}
        />
        <SvgText
          x="100" y="17" textAnchor="middle" fontSize="10"
          fontWeight="900" fill="#fff" letterSpacing="1.5"
        >
          {T.label}
        </SvgText>
      </G>

      {/* level number tag — bottom */}
      <G>
        <Circle cx="100" cy="223" r="17" fill={PALETTE.ink} />
        <Circle cx="100" cy="223" r="14" fill={T.chip} />
        <SvgText
          x="100" y="229" textAnchor="middle" fontSize="14"
          fontWeight="900" fill="#fff"
        >
          {num}
        </SvgText>
      </G>

      {/* content (locked or unlocked) */}
      {locked ? (
        <G opacity="0.35">
          <Rect x="84" y="100" width="32" height="40" rx="4" fill={PALETTE.ink} opacity="0.5" />
          <Path
            d="M88 100 L88 88 Q88 76 100 76 Q112 76 112 88 L112 100"
            stroke={PALETTE.ink}
            strokeWidth={4}
            fill="none"
            opacity="0.5"
          />
        </G>
      ) : (
        <G>{children}</G>
      )}

      {/* sparkles for higher tiers */}
      {!locked && T.sparkle > 0
        ? Array.from({ length: T.sparkle }).map((_, i) => {
            const angle = (i / T.sparkle) * Math.PI * 2 - Math.PI / 2;
            const r = 78 + (i % 2) * 6;
            const x = 100 + Math.cos(angle) * r;
            const y = 105 + Math.sin(angle) * r * 0.85;
            const s = 3 + (i % 3);
            const d = `M0 -${s} L${s * 0.3} -${s * 0.3} L${s} 0 L${s * 0.3} ${s * 0.3} L0 ${s} L-${s * 0.3} ${s * 0.3} L-${s} 0 L-${s * 0.3} -${s * 0.3} Z`;
            return (
              <G key={`spark-${i}`} transform={`translate(${x} ${y})`}>
                <Path d={d} fill={T.ringLight} stroke={T.ringDark} strokeWidth={1} />
              </G>
            );
          })
        : null}
    </Svg>
  );
};

export const BADGE_PALETTE = PALETTE;
