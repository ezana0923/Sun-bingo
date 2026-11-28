import React, { useState } from 'react';

interface RevenueDataPoint {
  date: string;
  fullDate: string;
  netRevenue: number;
  deposits: number;
  withdrawals: number;
  txCount: number;
}

interface RevenueTrendChartProps {
  data: RevenueDataPoint[];
  isDark: boolean;
}

export const RevenueTrendChart: React.FC<RevenueTrendChartProps> = ({ data, isDark }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center text-xs text-slate-400">
        ምንም የገቢ ዳታ የለም (No revenue data)
      </div>
    );
  }

  // Calculate scales
  const maxVal = Math.max(
    ...data.map((d) => Math.max(d.netRevenue, d.deposits, d.withdrawals, 100)),
    1000
  );
  const minVal = Math.min(
    ...data.map((d) => Math.min(d.netRevenue, d.deposits, d.withdrawals, 0)),
    0
  );
  const range = maxVal - minVal || 1;

  // Chart dimensions
  const width = 800;
  const height = 260;
  const paddingLeft = 45;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return paddingTop + chartHeight - ((val - minVal) / range) * chartHeight;
  };

  // Build SVG path strings
  const buildPath = (key: 'netRevenue' | 'deposits' | 'withdrawals') => {
    return data.reduce((acc, d, i) => {
      const x = getX(i);
      const y = getY(d[key]);
      return i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)}` : `${acc} L ${x.toFixed(1)} ${y.toFixed(1)}`;
    }, '');
  };

  const netPath = buildPath('netRevenue');
  const depPath = buildPath('deposits');
  const wthPath = buildPath('withdrawals');

  // Y-axis grid ticks (4 ticks)
  const yTicks = [0, 0.33, 0.66, 1].map((pct) => minVal + pct * range);

  // X-axis sampled labels (every ~5th or 6th item)
  const labelInterval = Math.max(1, Math.floor(data.length / 6));

  const hoveredItem = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="w-full flex flex-col items-center select-none">
      <div className="relative w-full aspect-[800/260] max-h-72">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          {/* Horizontal Grid lines */}
          {yTicks.map((val, idx) => {
            const y = getY(val);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke={isDark ? '#272738' : '#e2e8f0'}
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  fontSize="10"
                  fill={isDark ? '#94a3b8' : '#64748b'}
                  fontFamily="monospace"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(1)}k` : Math.round(val)}
                </text>
              </g>
            );
          })}

          {/* Zero baseline if minVal < 0 */}
          {minVal < 0 && (
            <line
              x1={paddingLeft}
              y1={getY(0)}
              x2={width - paddingRight}
              y2={getY(0)}
              stroke={isDark ? '#475569' : '#cbd5e1'}
              strokeWidth="1.5"
            />
          )}

          {/* Lines */}
          {/* Deposits (indigo) */}
          <path
            d={depPath}
            fill="none"
            stroke="#6366f1"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* Withdrawals (amber) */}
          <path
            d={wthPath}
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />

          {/* Net Revenue (emerald - primary) */}
          <path
            d={netPath}
            fill="none"
            stroke="#10b981"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Hover overlay column */}
          {data.map((d, i) => {
            const x = getX(i);
            const isHovered = hoveredIndex === i;

            return (
              <g key={i}>
                {/* Dots on Net Revenue */}
                <circle
                  cx={x}
                  cy={getY(d.netRevenue)}
                  r={isHovered ? 6 : 2.5}
                  fill="#10b981"
                  stroke={isDark ? '#0f172a' : '#ffffff'}
                  strokeWidth={isHovered ? 2 : 1}
                  className="transition-all duration-150"
                />

                {/* Vertical hover guide */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={paddingTop}
                    x2={x}
                    y2={height - paddingBottom}
                    stroke={isDark ? '#64748b' : '#94a3b8'}
                    strokeDasharray="2 2"
                    strokeWidth="1"
                  />
                )}

                {/* Transparent hover capture zone */}
                <rect
                  x={x - chartWidth / (data.length * 2)}
                  y={paddingTop}
                  width={chartWidth / data.length}
                  height={chartHeight}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(i)}
                  onMouseLeave={() => setHoveredIndex(null)}
                />
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) => {
            if (i % labelInterval === 0 || i === data.length - 1) {
              const x = getX(i);
              return (
                <text
                  key={i}
                  x={x}
                  y={height - paddingBottom + 18}
                  textAnchor="middle"
                  fontSize="10"
                  fill={isDark ? '#94a3b8' : '#64748b'}
                  fontFamily="sans-serif"
                >
                  {d.date}
                </text>
              );
            }
            return null;
          })}
        </svg>

        {/* Hover Tooltip overlay */}
        {hoveredItem && (
          <div
            className={`absolute pointer-events-none z-20 px-3 py-2 rounded-xl border shadow-xl text-xs transition-opacity duration-150 ${
              isDark
                ? 'bg-slate-900/95 border-slate-700 text-white'
                : 'bg-white/95 border-slate-200 text-slate-900'
            }`}
            style={{
              left: `${Math.min(
                Math.max((getX(hoveredIndex!) / width) * 100, 15),
                85
              )}%`,
              top: '15px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="font-bold border-b pb-1 mb-1.5 flex items-center justify-between gap-3 text-[11px] opacity-75">
              <span>{hoveredItem.date}</span>
              <span>{hoveredItem.fullDate}</span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  የተጣራ ገቢ (Net):
                </span>
                <span className="font-mono font-bold text-emerald-500">
                  {hoveredItem.netRevenue.toLocaleString()} ETB
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
                  ተቀማጭ (Deposits):
                </span>
                <span className="font-mono text-indigo-400">
                  {hoveredItem.deposits.toLocaleString()} ETB
                </span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-1.5 text-amber-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  ወጪ (Withdrawals):
                </span>
                <span className="font-mono text-amber-400">
                  {hoveredItem.withdrawals.toLocaleString()} ETB
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-5 pt-3 text-[11px]">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-[#10b981]" />
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            የተጣራ ገቢ (Net Revenue)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-[#6366f1]" />
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            ተቀማጭ (Deposits)
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-1 rounded bg-[#f59e0b]" />
          <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>
            ወጪ (Withdrawals)
          </span>
        </div>
      </div>
    </div>
  );
};
