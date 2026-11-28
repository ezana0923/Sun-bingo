import React from 'react';

interface FloatingBall {
  id: number;
  letter: 'B' | 'I' | 'N' | 'G' | 'O';
  number: number;
  color: string;
  glow: string;
  left: string;
  top: string;
  size: number;
  duration: number;
  delay: number;
  driftX: number;
}

const BALLS_CONFIG: FloatingBall[] = [
  { id: 1, letter: 'B', number: 7, color: 'from-emerald-400 via-emerald-600 to-emerald-950', glow: 'rgba(16,185,129,0.35)', left: '6%', top: '12%', size: 54, duration: 18, delay: 0, driftX: 20 },
  { id: 2, letter: 'I', number: 24, color: 'from-rose-400 via-rose-600 to-rose-950', glow: 'rgba(244,63,94,0.3)', left: '88%', top: '18%', size: 62, duration: 22, delay: 2, driftX: -25 },
  { id: 3, letter: 'N', number: 38, color: 'from-sky-400 via-blue-600 to-blue-950', glow: 'rgba(14,165,233,0.35)', left: '14%', top: '70%', size: 66, duration: 24, delay: 4, driftX: 30 },
  { id: 4, letter: 'G', number: 55, color: 'from-purple-400 via-purple-600 to-purple-950', glow: 'rgba(168,85,247,0.3)', left: '82%', top: '75%', size: 58, duration: 20, delay: 1, driftX: -20 },
  { id: 5, letter: 'O', number: 71, color: 'from-amber-300 via-amber-500 to-amber-900', glow: 'rgba(245,158,11,0.35)', left: '48%', top: '8%', size: 50, duration: 19, delay: 3, driftX: 15 },
  { id: 6, letter: 'B', number: 12, color: 'from-teal-400 via-teal-600 to-teal-950', glow: 'rgba(20,184,166,0.25)', left: '2%', top: '42%', size: 44, duration: 21, delay: 5, driftX: 18 },
  { id: 7, letter: 'G', number: 60, color: 'from-indigo-400 via-indigo-600 to-indigo-950', glow: 'rgba(99,102,241,0.25)', left: '92%', top: '48%', size: 48, duration: 23, delay: 2.5, driftX: -15 },
];

export const AnimatedBingoBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden z-0 select-none"
    >
      {/* 1. Ambient Aurora Glow Blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl animate-pulse" />
      <div
        className="absolute top-1/3 -right-32 w-96 h-96 rounded-full bg-blue-600/12 blur-3xl"
        style={{ animation: 'floatBlob 16s ease-in-out infinite alternate' }}
      />
      <div
        className="absolute -bottom-32 left-1/4 w-[32rem] h-[32rem] rounded-full bg-amber-500/10 blur-3xl"
        style={{ animation: 'floatBlob 20s ease-in-out infinite alternate-reverse' }}
      />
      <div className="absolute top-2/3 right-1/4 w-72 h-72 rounded-full bg-purple-600/10 blur-3xl animate-pulse" />

      {/* 2. Floating 3D Bingo Spheres */}
      {BALLS_CONFIG.map((ball) => (
        <div
          key={ball.id}
          className="absolute will-change-transform"
          style={{
            left: ball.left,
            top: ball.top,
            width: ball.size,
            height: ball.size,
            animation: `floatBall ${ball.duration}s ease-in-out ${ball.delay}s infinite alternate`,
          }}
        >
          <div
            className={`w-full h-full rounded-full bg-gradient-to-br ${ball.color} relative flex items-center justify-center opacity-40 dark:opacity-55 transition-opacity`}
            style={{
              boxShadow: `0 0 24px ${ball.glow}, inset -3px -3px 8px rgba(0,0,0,0.6), inset 3px 3px 6px rgba(255,255,255,0.4)`,
            }}
          >
            {/* Top light reflection */}
            <div className="absolute top-1 left-2 w-3.5 h-1.5 rounded-full bg-white/40 rotate-[-25deg]" />
            {/* Inner white circle */}
            <div className="w-[58%] h-[58%] rounded-full bg-white/90 shadow-inner flex flex-col items-center justify-center text-slate-900 leading-none">
              <span className="text-[7px] font-black tracking-tighter opacity-70">
                {ball.letter}
              </span>
              <span className="text-[10px] font-black font-mono-tabular">
                {ball.number}
              </span>
            </div>
          </div>
        </div>
      ))}

      {/* 3. Subtle sparkling stars */}
      <div className="absolute top-1/4 left-1/3 w-1.5 h-1.5 rounded-full bg-amber-300/60 shadow-[0_0_8px_rgba(252,211,77,0.8)] animate-ping" />
      <div className="absolute top-2/3 left-2/3 w-1 h-1 rounded-full bg-emerald-300/70 shadow-[0_0_6px_rgba(110,231,183,0.8)] animate-pulse" />
      <div className="absolute top-1/2 right-1/6 w-1.5 h-1.5 rounded-full bg-blue-300/60 shadow-[0_0_8px_rgba(147,197,253,0.8)] animate-ping" />
    </div>
  );
};
