import React from 'react';

export type EziLogoSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface EziBingoLogoProps {
  size?: EziLogoSize;
  className?: string;
  showTagline?: boolean;
}

const DIMENSIONS: Record<EziLogoSize, { width: number; height: number; titleSize: string; subSize: string }> = {
  xs: { width: 130, height: 42, titleSize: 'text-sm', subSize: 'text-[9px]' },
  sm: { width: 170, height: 52, titleSize: 'text-base', subSize: 'text-[10px]' },
  md: { width: 220, height: 64, titleSize: 'text-xl', subSize: 'text-xs' },
  lg: { width: 280, height: 80, titleSize: 'text-2xl', subSize: 'text-sm' },
  xl: { width: 340, height: 96, titleSize: 'text-3xl', subSize: 'text-base' },
};

export const EziBingoLogo: React.FC<EziBingoLogoProps> = ({
  size = 'md',
  className = '',
  showTagline = true,
}) => {
  const dim = DIMENSIONS[size];

  return (
    <div className={`inline-flex items-center gap-2.5 select-none ${className}`}>
      {/* 3D Golden & Emerald Bingo Sphere Emblem */}
      <div className="relative shrink-0">
        <svg
          width={dim.height}
          height={dim.height}
          viewBox="0 0 64 64"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-md"
        >
          <defs>
            <radialGradient id="sphereGrad" cx="35%" cy="30%" r="65%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="35%" stopColor="#F59E0B" />
              <stop offset="80%" stopColor="#B45309" />
              <stop offset="100%" stopColor="#78350F" />
            </radialGradient>
            <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34D399" />
              <stop offset="50%" stopColor="#10B981" />
              <stop offset="100%" stopColor="#047857" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F59E0B" floodOpacity="0.4" />
            </filter>
          </defs>

          {/* Outer Emerald Ring */}
          <circle cx="32" cy="32" r="30" stroke="url(#ringGrad)" strokeWidth="3" fill="#061326" />

          {/* Main Golden Sphere */}
          <circle cx="32" cy="32" r="23" fill="url(#sphereGrad)" filter="url(#glow)" />

          {/* Inner Light Reflection */}
          <ellipse cx="26" cy="20" rx="8" ry="4.5" fill="#FFFFFF" fillOpacity="0.38" transform="rotate(-20 26 20)" />

          {/* White Center Badge for 75 */}
          <circle cx="32" cy="32" r="13" fill="#FFFFFF" />
          <text
            x="32"
            y="37"
            textAnchor="middle"
            fill="#0F172A"
            fontWeight="900"
            fontSize="14"
            fontFamily="JetBrains Mono, monospace"
          >
            75
          </text>

          {/* Crown on top */}
          <path
            d="M 23 15 L 20 8 L 27 12 L 32 6 L 37 12 L 44 8 L 41 15 Z"
            fill="#FDE047"
            stroke="#B45309"
            strokeWidth="1"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col justify-center">
        <div className="flex items-center gap-1.5 leading-none">
          <span className={`font-black tracking-tight text-white ${dim.titleSize} drop-shadow-sm`}>
            Sun <span className="text-amber-400">Bingo</span>
          </span>
          <span className="px-1.5 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-black uppercase tracking-wider">
            ሳን ቢንጎ
          </span>
        </div>
        {showTagline && (
          <span className={`text-slate-400 font-bold tracking-normal mt-1 ${dim.subSize}`}>
            የኢትዮጵያ ዘመናዊ የቢንጎ መድረክ
          </span>
        )}
      </div>
    </div>
  );
};

export const SunBingoLogo = EziBingoLogo;
export default EziBingoLogo;

