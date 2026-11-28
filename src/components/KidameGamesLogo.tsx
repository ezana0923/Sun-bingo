import React from 'react';

export type KidameLogoVariant = 'horizontal' | 'crest' | 'icon' | 'stacked';
export type KidameLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
export type KidameColorScheme = 'royal-gold' | 'emerald-crown' | 'neon-cyber' | 'crimson-vip';

export interface KidameGamesLogoProps {
  variant?: KidameLogoVariant;
  size?: KidameLogoSize;
  scheme?: KidameColorScheme;
  animated?: boolean;
  showTagline?: boolean;
  tagline?: string;
  className?: string;
}

const SIZE_DIMENSIONS: Record<
  KidameLogoVariant,
  Record<KidameLogoSize, { width: number; height: number }>
> = {
  horizontal: {
    xs: { width: 135, height: 46 },
    sm: { width: 185, height: 64 },
    md: { width: 260, height: 90 },
    lg: { width: 350, height: 120 },
    xl: { width: 460, height: 158 },
    '2xl': { width: 580, height: 200 },
  },
  crest: {
    xs: { width: 72, height: 84 },
    sm: { width: 110, height: 128 },
    md: { width: 170, height: 196 },
    lg: { width: 240, height: 276 },
    xl: { width: 320, height: 368 },
    '2xl': { width: 400, height: 460 },
  },
  stacked: {
    xs: { width: 110, height: 92 },
    sm: { width: 160, height: 134 },
    md: { width: 230, height: 192 },
    lg: { width: 310, height: 258 },
    xl: { width: 400, height: 334 },
    '2xl': { width: 490, height: 410 },
  },
  icon: {
    xs: { width: 36, height: 36 },
    sm: { width: 48, height: 48 },
    md: { width: 68, height: 68 },
    lg: { width: 96, height: 96 },
    xl: { width: 136, height: 136 },
    '2xl': { width: 184, height: 184 },
  },
};

const PALETTES: Record<
  KidameColorScheme,
  {
    primaryTop: string;
    primaryMid: string;
    primaryBot: string;
    secondaryTop: string;
    secondaryMid: string;
    secondaryBot: string;
    shieldDark: string;
    shieldInner: string;
    accentGlow: string;
    gemColor: string;
    strokeDark: string;
  }
> = {
  'royal-gold': {
    primaryTop: '#FEF08A',
    primaryMid: '#F59E0B',
    primaryBot: '#B45309',
    secondaryTop: '#6EE7B7',
    secondaryMid: '#10B981',
    secondaryBot: '#047857',
    shieldDark: '#061326',
    shieldInner: '#0B2239',
    accentGlow: '#F59E0B',
    gemColor: '#10B981',
    strokeDark: '#451A03',
  },
  'emerald-crown': {
    primaryTop: '#A7F3D0',
    primaryMid: '#10B981',
    primaryBot: '#065F46',
    secondaryTop: '#FDE047',
    secondaryMid: '#EAB308',
    secondaryBot: '#A16207',
    shieldDark: '#041E19',
    shieldInner: '#063229',
    accentGlow: '#10B981',
    gemColor: '#F59E0B',
    strokeDark: '#022C22',
  },
  'neon-cyber': {
    primaryTop: '#BAE6FD',
    primaryMid: '#38BDF8',
    primaryBot: '#0284C7',
    secondaryTop: '#FDE047',
    secondaryMid: '#F59E0B',
    secondaryBot: '#D97706',
    shieldDark: '#070F26',
    shieldInner: '#0F1E45',
    accentGlow: '#38BDF8',
    gemColor: '#38BDF8',
    strokeDark: '#082F49',
  },
  'crimson-vip': {
    primaryTop: '#FDE047',
    primaryMid: '#F59E0B',
    primaryBot: '#B45309',
    secondaryTop: '#FDA4AF',
    secondaryMid: '#F43F5E',
    secondaryBot: '#9F1239',
    shieldDark: '#1F0610',
    shieldInner: '#3B0A1E',
    accentGlow: '#F43F5E',
    gemColor: '#F43F5E',
    strokeDark: '#4C0519',
  },
};

export const KidameGamesLogo: React.FC<KidameGamesLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  scheme = 'royal-gold',
  animated = true,
  showTagline = true,
  tagline = 'SATURDAY ROYAL GAMING LOUNGE',
  className = '',
}) => {
  const uid = React.useId().replace(/:/g, '');
  const dims = SIZE_DIMENSIONS[variant]?.[size] || SIZE_DIMENSIONS.horizontal.md;
  const p = PALETTES[scheme] || PALETTES['royal-gold'];

  const renderSharedDefs = () => (
    <defs>
      {/* Primary Metallic Gold / Theme Gradient */}
      <linearGradient id={`kg_primary_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={p.primaryTop} />
        <stop offset="45%" stopColor={p.primaryMid} />
        <stop offset="100%" stopColor={p.primaryBot} />
      </linearGradient>

      {/* Secondary Emerald / Theme Gradient */}
      <linearGradient id={`kg_secondary_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={p.secondaryTop} />
        <stop offset="48%" stopColor={p.secondaryMid} />
        <stop offset="100%" stopColor={p.secondaryBot} />
      </linearGradient>

      {/* Shield Dark Metallic Base */}
      <linearGradient id={`kg_shield_${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={p.shieldInner} />
        <stop offset="55%" stopColor={p.shieldDark} />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>

      {/* Platinum / Silver Gradient for GAMES text */}
      <linearGradient id={`kg_platinum_${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="55%" stopColor="#E2E8F0" />
        <stop offset="100%" stopColor="#94A3B8" />
      </linearGradient>

      {/* 3D Golden Sphere Gradient */}
      <radialGradient id={`kg_orb_${uid}`} cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#FEF9C3" />
        <stop offset="40%" stopColor={p.primaryMid} />
        <stop offset="85%" stopColor={p.primaryBot} />
        <stop offset="100%" stopColor={p.strokeDark} />
      </radialGradient>

      {/* Deep Drop Shadow */}
      <filter id={`kg_shadow_${uid}`} x="-18%" y="-18%" width="136%" height="142%">
        <feDropShadow dx="0" dy="10" stdDeviation="10" floodColor="#000000" floodOpacity="0.65" />
      </filter>

      {/* Soft Glow */}
      <filter id={`kg_glow_${uid}`} x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="8" result="blur" />
        <feComposite in="SourceGraphic" in2="blur" operator="over" />
      </filter>
    </defs>
  );

  // Reusable Royal Crown + Shield + Controller Emblem centered at (0, 0) within a 320x360 box
  const renderRoyalEmblem = (scale = 1) => (
    <g transform={`scale(${scale})`}>
      {/* Outer Ambient Halo */}
      <circle
        cx="0"
        cy="10"
        r="138"
        fill={p.accentGlow}
        opacity={animated ? '0.14' : '0.09'}
      />

      {/* Hexagonal Royal Shield Outer Frame */}
      <path
        d="M 0 -118 L 116 -72 L 102 68 L 0 148 L -102 68 L -116 -72 Z"
        fill={`url(#kg_primary_${uid})`}
        stroke="#FFFFFF"
        strokeWidth="4"
        strokeLinejoin="round"
      />

      {/* Inner Emerald Bevel Rim */}
      <path
        d="M 0 -106 L 103 -64 L 91 60 L 0 132 L -91 60 L -103 -64 Z"
        fill={`url(#kg_secondary_${uid})`}
        stroke={p.strokeDark}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Shield Obsidian Core */}
      <path
        d="M 0 -94 L 91 -56 L 80 52 L 0 116 L -80 52 L -91 -56 Z"
        fill={`url(#kg_shield_${uid})`}
        stroke={`url(#kg_primary_${uid})`}
        strokeWidth="3"
        strokeLinejoin="round"
      />

      {/* Decorative Ethiopian Geometric Corner Rays Inside Shield */}
      <g opacity="0.22" stroke={`url(#kg_primary_${uid})`} strokeWidth="2">
        <line x1="-75" y1="-45" x2="75" y2="45" />
        <line x1="75" y1="-45" x2="-75" y2="45" />
        <circle cx="0" cy="8" r="64" fill="none" strokeDasharray="6 6" />
      </g>

      {/* 3 Lucky Gaming Spheres Behind Controller */}
      <g>
        <circle cx="-42" cy="-36" r="22" fill={`url(#kg_orb_${uid})`} stroke="#FFFFFF" strokeWidth="2" />
        <text
          x="-42"
          y="-29"
          textAnchor="middle"
          fill="#090D16"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="900"
          fontSize="19"
        >
          7
        </text>

        <circle cx="42" cy="-36" r="22" fill={`url(#kg_orb_${uid})`} stroke="#FFFFFF" strokeWidth="2" />
        <text
          x="42"
          y="-29"
          textAnchor="middle"
          fill="#090D16"
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontWeight="900"
          fontSize="18"
        >
          21
        </text>

        <circle cx="0" cy="-52" r="26" fill={`url(#kg_secondary_${uid})`} stroke="#FEF08A" strokeWidth="2.5" />
        <text
          x="0"
          y="-43"
          textAnchor="middle"
          fill="#FFFFFF"
          fontFamily="'Noto Sans Ethiopic', 'Plus Jakarta Sans', sans-serif"
          fontWeight="900"
          fontSize="24"
        >
          ቅ
        </text>
      </g>

      {/* Stylized Next-Gen Golden/Emerald Gamepad Silhouette */}
      <g transform="translate(0, 26)">
        <path
          d="M -52 -24 C -68 -24, -78 -6, -74 22 C -71 42, -56 50, -42 38 L -24 20 L 24 20 L 42 38 C 56 50, 71 42, 74 22 C 78 -6, 68 -24, 52 -24 Z"
          fill={`url(#kg_primary_${uid})`}
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        <path
          d="M -48 -19 C -61 -19, -70 -4, -67 19 C -64 35, -52 41, -40 31 L -22 15 L 22 15 L 40 31 C 52 41, 64 35, 67 19 C 70 -4, 61 -19, 48 -19 Z"
          fill="#091526"
        />

        {/* D-Pad on Left */}
        <path
          d="M -44 -8 H -34 V -18 H -24 V -8 H -14 V 2 H -24 V 12 H -34 V 2 H -44 Z"
          fill={`url(#kg_primary_${uid})`}
        />

        {/* Action Gems on Right */}
        <circle cx="38" cy="-11" r="5.5" fill="#38BDF8" />
        <circle cx="49" cy="-1" r="5.5" fill="#F43F5E" />
        <circle cx="27" cy="-1" r="5.5" fill="#FACC15" />
        <circle cx="38" cy="9" r="5.5" fill="#4ADE80" />

        {/* Center Crown Star */}
        <polygon
          points="0,-12 3.5,-4 12,-4 5,1.5 7.5,10 0,5 -7.5,10 -5,1.5 -12,-4 -3.5,-4"
          fill={`url(#kg_primary_${uid})`}
        />
      </g>

      {/* Royal Saturday Crown Atop Shield */}
      <g transform="translate(0, -118)">
        <path
          d="M -68 12 L -82 -38 L -38 -10 L 0 -56 L 38 -10 L 82 -38 L 68 12 Z"
          fill={`url(#kg_primary_${uid})`}
          stroke="#FFFFFF"
          strokeWidth="3.5"
          strokeLinejoin="round"
        />
        {/* Crown Base Band */}
        <rect
          x="-68"
          y="10"
          width="136"
          height="16"
          rx="6"
          fill={`url(#kg_primary_${uid})`}
          stroke={p.strokeDark}
          strokeWidth="2.5"
        />
        {/* Crown Jewels */}
        <polygon points="0,-28 8,-14 0,0 -8,-14" fill={p.gemColor} stroke="#FFFFFF" strokeWidth="1.5" />
        <circle cx="-42" cy="-2" r="5.5" fill={p.gemColor} stroke="#FFFFFF" strokeWidth="1.2" />
        <circle cx="42" cy="-2" r="5.5" fill={p.gemColor} stroke="#FFFFFF" strokeWidth="1.2" />
        <circle cx="0" cy="-64" r="7" fill="#FEF08A" />
        <circle cx="-84" cy="-44" r="5.5" fill="#FEF08A" />
        <circle cx="84" cy="-44" r="5.5" fill="#FEF08A" />
      </g>
    </g>
  );

  if (variant === 'icon') {
    return (
      <div
        className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
        aria-label="ቅዳሜ Games Icon"
      >
        <svg
          width={dims.width}
          height={dims.height}
          viewBox="-155 -195 310 365"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-auto h-full max-w-full overflow-visible"
        >
          {renderSharedDefs()}
          <g filter={`url(#kg_shadow_${uid})`}>{renderRoyalEmblem(1)}</g>
        </svg>
      </div>
    );
  }

  if (variant === 'crest' || variant === 'stacked') {
    return (
      <div
        className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
        aria-label="ቅዳሜ Games Crest Logo"
      >
        <svg
          width={dims.width}
          height={dims.height}
          viewBox="-240 -210 480 510"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-auto h-full max-w-full overflow-visible"
        >
          {renderSharedDefs()}
          <g filter={`url(#kg_shadow_${uid})`}>
            <g transform="translate(0, -35)">{renderRoyalEmblem(0.95)}</g>

            {/* Ribbon Banner Overlay */}
            <g transform="translate(0, 128)">
              <path
                d="M -205 -44 L 205 -44 L 185 42 L -185 42 Z"
                fill="#050D1A"
                stroke={`url(#kg_primary_${uid})`}
                strokeWidth="5"
                strokeLinejoin="round"
              />
              {/* Amharic "ቅዳሜ" */}
              <text
                x="0"
                y="22"
                textAnchor="middle"
                fontFamily="'Noto Sans Ethiopic', 'Plus Jakarta Sans', system-ui, sans-serif"
                fontWeight="900"
                fontSize="86"
                letterSpacing="2"
                stroke="#000000"
                strokeWidth="14"
                strokeLinejoin="round"
                paintOrder="stroke fill"
                fill={`url(#kg_primary_${uid})`}
              >
                ቅዳሜ
              </text>
            </g>

            {/* "GAMES" Sub-plate */}
            <g transform="translate(0, 212)">
              <rect
                x="-148"
                y="-30"
                width="296"
                height="52"
                rx="14"
                fill={`url(#kg_secondary_${uid})`}
                stroke="#FFFFFF"
                strokeWidth="3"
              />
              <text
                x="0"
                y="8"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Arial Black', sans-serif"
                fontWeight="900"
                fontSize="42"
                letterSpacing="10"
                fill="#FFFFFF"
              >
                GAMES
              </text>
            </g>

            {showTagline && (
              <text
                x="0"
                y="268"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', sans-serif"
                fontWeight="700"
                fontSize="15"
                letterSpacing="5"
                fill="#94A3B8"
              >
                {tagline}
              </text>
            )}
          </g>
        </svg>
      </div>
    );
  }

  // Default: 'horizontal' Wide Brand Header Logo
  return (
    <div
      className={`inline-flex items-center justify-center select-none shrink-0 ${className}`}
      aria-label="ቅዳሜ Games"
    >
      <svg
        width={dims.width}
        height={dims.height}
        viewBox="0 0 1160 400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-auto h-full max-w-full overflow-visible"
      >
        {renderSharedDefs()}
        <g filter={`url(#kg_shadow_${uid})`}>
          {/* Left Royal Emblem */}
          <g transform="translate(195, 208)">{renderRoyalEmblem(0.92)}</g>

          {/* Right Typography Lockup: "ቅዳሜ" + "GAMES" */}
          <g transform="translate(375, 0)">
            {/* Top Crown Kicker Pill */}
            {showTagline && (
              <g transform="translate(8, 66)">
                <rect
                  x="0"
                  y="-24"
                  width="390"
                  height="34"
                  rx="8"
                  fill="#0B192C"
                  stroke={`url(#kg_primary_${uid})`}
                  strokeWidth="2"
                />
                <circle cx="22" cy="-7" r="6" fill={p.gemColor} />
                <text
                  x="40"
                  y="-1"
                  fontFamily="'Plus Jakarta Sans', sans-serif"
                  fontWeight="800"
                  fontSize="16"
                  letterSpacing="4.5"
                  fill="#FDE047"
                >
                  {tagline}
                </text>
              </g>
            )}

            {/* Main Bold Amharic Title: "ቅዳሜ" */}
            <g transform="translate(0, 232)">
              {/* 3D Extrusion Back Layer */}
              <text
                x="10"
                y="10"
                fontFamily="'Noto Sans Ethiopic', 'Plus Jakarta Sans', sans-serif"
                fontWeight="900"
                fontSize="172"
                letterSpacing="3"
                stroke="#000000"
                strokeWidth="34"
                strokeLinejoin="round"
                paintOrder="stroke fill"
                fill="#000000"
              >
                ቅዳሜ
              </text>
              {/* Crisp White Sticker Rim */}
              <text
                x="0"
                y="0"
                fontFamily="'Noto Sans Ethiopic', 'Plus Jakarta Sans', sans-serif"
                fontWeight="900"
                fontSize="172"
                letterSpacing="3"
                stroke="#FFFFFF"
                strokeWidth="28"
                strokeLinejoin="round"
                paintOrder="stroke fill"
                fill="#FFFFFF"
              >
                ቅዳሜ
              </text>
              {/* Deep Bronze Inner Contour */}
              <text
                x="0"
                y="0"
                fontFamily="'Noto Sans Ethiopic', 'Plus Jakarta Sans', sans-serif"
                fontWeight="900"
                fontSize="172"
                letterSpacing="3"
                stroke={p.strokeDark}
                strokeWidth="14"
                strokeLinejoin="round"
                paintOrder="stroke fill"
                fill={`url(#kg_primary_${uid})`}
              >
                ቅዳሜ
              </text>
            </g>

            {/* Bottom "GAMES" Badge + Emerald & Gold Signature Bar */}
            <g transform="translate(6, 336)">
              <rect
                x="0"
                y="-54"
                width="455"
                height="68"
                rx="16"
                fill={`url(#kg_secondary_${uid})`}
                stroke="#FFFFFF"
                strokeWidth="4"
              />
              <text
                x="227"
                y="-4"
                textAnchor="middle"
                fontFamily="'Plus Jakarta Sans', 'Arial Black', sans-serif"
                fontWeight="900"
                fontSize="52"
                letterSpacing="15"
                fill="#FFFFFF"
              >
                GAMES
              </text>

              {/* Glowing Gold Orbs to the Right of GAMES */}
              <circle cx="495" cy="-20" r="14" fill={`url(#kg_orb_${uid})`} />
              <circle cx="535" cy="-20" r="14" fill={`url(#kg_orb_${uid})`} />
              <rect
                x="565"
                y="-27"
                width="145"
                height="14"
                rx="7"
                fill={`url(#kg_primary_${uid})`}
              />
            </g>
          </g>
        </g>
      </svg>
    </div>
  );
};

export default KidameGamesLogo;
