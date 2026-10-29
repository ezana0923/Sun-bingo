import React, { useState, useMemo } from 'react';
import {
  RefreshCw,
  Calendar,
  Clock,
  XCircle,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import { GameHistoryRecord, Language, WinnerAnnouncement } from '../types/bingo';

interface GameHistoryViewProps {
  history: GameHistoryRecord[];
  language?: Language;
  isDark: boolean;
  currentUserName?: string;
  currentUserPhone?: string;
  playedCartelasByMatchId?: Record<number, number[]>;
  onRefreshHistory?: () => void;
  onInspectWinnerCartela: (winner: WinnerAnnouncement) => void;
}

function generateEziRef(matchId: number, index: number): string {
  const num = matchId && matchId > 0 ? matchId : 100000 + index * 137;
  return `SUN-${num}`;
}

function parseDateAndTime(rawTimestamp: string): { dateStr: string; timeStr: string } {
  const now = new Date();
  if (!rawTimestamp) {
    return {
      dateStr: now.toLocaleDateString('en-GB'),
      timeStr: now.toTimeString().slice(0, 5),
    };
  }
  const parsed = new Date(rawTimestamp);
  if (!Number.isNaN(parsed.getTime())) {
    const day = String(parsed.getDate()).padStart(2, '0');
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const year = parsed.getFullYear();
    const hours = String(parsed.getHours()).padStart(2, '0');
    const mins = String(parsed.getMinutes()).padStart(2, '0');
    return {
      dateStr: `${day}/${month}/${year}`,
      timeStr: `${hours}:${mins}`,
    };
  }
  const parts = rawTimestamp.split(/[ ,]+/);
  return {
    dateStr: parts[0] || '06/10/2026',
    timeStr: (parts[1] || '08:00').slice(0, 5),
  };
}

export const GameHistoryView: React.FC<GameHistoryViewProps> = ({
  history,
  isDark,
  currentUserName,
  currentUserPhone,
  playedCartelasByMatchId = {},
  onRefreshHistory,
  onInspectWinnerCartela,
}) => {
  const [mainTab, setMainTab] = useState<'recent' | 'my'>('my');
  const [subFilter, setSubFilter] = useState<'all' | 'wins' | 'losses'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const localPlayedMap = useMemo<Record<number, number[]>>(() => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = localStorage.getItem('ezi_played_rounds_by_match_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // ignore
    }
    return {};
  }, [history]);

  const enrichedList = useMemo(() => {
    const cleanMyName = (currentUserName || '').trim().toLowerCase();
    const cleanMyPhone = (currentUserPhone || '').trim();

    return history.map((item, idx) => {
      const fromProp = playedCartelasByMatchId[item.gameMatchId] || [];
      const fromStorage = localPlayedMap[item.gameMatchId] || [];
      const fromItem = item.myRegisteredCartelaIds || [];
      const fromServerByPhone =
        (cleanMyPhone && item.participantCartelasByPhone?.[cleanMyPhone]) || [];

      const wonCartelasByMe = item.winners
        .filter((w) => cleanMyName && w.userName.trim().toLowerCase() === cleanMyName)
        .map((w) => w.cartelaId);

      const mergedMyCartelas = Array.from(
        new Set([
          ...fromProp,
          ...fromStorage,
          ...fromItem,
          ...fromServerByPhone,
          ...wonCartelasByMe,
        ])
      );

      const didPlay =
        Boolean(item.playedByCurrentUser) ||
        mergedMyCartelas.length > 0 ||
        Boolean(cleanMyPhone && item.participantPhones?.includes(cleanMyPhone)) ||
        wonCartelasByMe.length > 0;

      const didWin = wonCartelasByMe.length > 0;
      const refCode = generateEziRef(item.gameMatchId, idx);
      const { dateStr, timeStr } = parseDateAndTime(item.timestamp);

      return {
        ...item,
        didPlay,
        didWin,
        myCartelas: mergedMyCartelas,
        refCode,
        dateStr,
        timeStr,
      };
    });
  }, [history, currentUserName, currentUserPhone, playedCartelasByMatchId, localPlayedMap]);

  const filteredList = useMemo(() => {
    const base =
      mainTab === 'my'
        ? enrichedList.some((r) => r.didPlay)
          ? enrichedList.filter((r) => r.didPlay)
          : enrichedList
        : enrichedList;

    if (subFilter === 'wins') {
      return base.filter((r) => r.didWin);
    }
    if (subFilter === 'losses') {
      return base.filter((r) => !r.didWin);
    }
    return base;
  }, [enrichedList, mainTab, subFilter]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    if (onRefreshHistory) {
      onRefreshHistory();
    }
    setTimeout(() => setIsRefreshing(false), 500);
  };

  return (
    <div
      className={`rounded-3xl border p-4 sm:p-6 shadow-2xl min-h-[75vh] space-y-4 transition-colors ${
        isDark
          ? 'bg-gradient-to-b from-slate-900 via-[#111827] to-slate-950 border-slate-800 text-slate-100'
          : 'bg-gradient-to-b from-white via-slate-50 to-slate-100 border-slate-200 text-slate-900'
      }`}
    >
      {/* Top Title: Bingo History + Refresh Icon */}
      <div className="flex items-center justify-center gap-2.5 pt-1">
        <h2 className="text-xl sm:text-2xl font-black tracking-tight bg-gradient-to-r from-amber-400 via-orange-400 to-emerald-400 bg-clip-text text-transparent">
          Bingo History
        </h2>
        <button
          type="button"
          onClick={handleRefresh}
          title="Refresh History"
          className={`p-1.5 rounded-xl border transition-colors cursor-pointer active:scale-95 ${
            isDark
              ? 'bg-slate-800 border-slate-700 text-amber-400 hover:bg-slate-700'
              : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100'
          }`}
        >
          <RefreshCw
            className={`w-4 h-4 stroke-[2.5] ${
              isRefreshing ? 'animate-spin' : ''
            }`}
          />
        </button>
      </div>

      {/* Primary Segmented Tabs: Recent Games | My Games */}
      <div
        className={`rounded-2xl p-1.5 grid grid-cols-2 gap-1.5 border ${
          isDark
            ? 'bg-slate-950/90 border-slate-800'
            : 'bg-slate-200/80 border-slate-300'
        }`}
      >
        <button
          type="button"
          onClick={() => setMainTab('recent')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            mainTab === 'recent'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
              : isDark
              ? 'text-slate-300 hover:bg-slate-800/70'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          Recent Games
        </button>
        <button
          type="button"
          onClick={() => setMainTab('my')}
          className={`py-2.5 px-4 rounded-xl text-xs sm:text-sm font-black transition-all cursor-pointer ${
            mainTab === 'my'
              ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 shadow-md'
              : isDark
              ? 'text-slate-300 hover:bg-slate-800/70'
              : 'text-slate-700 hover:bg-white/60'
          }`}
        >
          My Games
        </button>
      </div>

      {/* Sub-filter Pills: All Games | Wins | Losses */}
      <div className="flex items-center justify-center gap-2 sm:gap-2.5 pt-0.5">
        {(
          [
            { id: 'all', label: 'All Games' },
            { id: 'wins', label: 'Wins' },
            { id: 'losses', label: 'Losses' },
          ] as const
        ).map((tab) => {
          const isActive = subFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSubFilter(tab.id)}
              className={`px-4 sm:px-5 py-2 rounded-2xl text-xs sm:text-sm font-extrabold border transition-all cursor-pointer ${
                isActive
                  ? isDark
                    ? 'bg-white text-slate-950 border-white shadow-md'
                    : 'bg-slate-900 text-white border-slate-900 shadow-md'
                  : isDark
                  ? 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-700'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Cards List */}
      <div className="space-y-3 pt-1">
        {filteredList.length === 0 ? (
          <div
            className={`rounded-2xl border py-12 text-center text-xs sm:text-sm font-bold ${
              isDark
                ? 'bg-slate-900/70 border-slate-800 text-slate-400'
                : 'bg-white border-slate-200 text-slate-500'
            }`}
          >
            No games found in this category.
          </div>
        ) : (
          filteredList.map((item) => {
            const firstWinner = item.winners[0];
            return (
              <div
                key={item.id}
                onClick={() => {
                  if (firstWinner) {
                    onInspectWinnerCartela({
                      cartelaId: firstWinner.cartelaId,
                      userName: firstWinner.userName,
                      prizeAmount: firstWinner.prizeAmount,
                      winningCells: firstWinner.winningCells,
                      lastBall: item.lastBall,
                      calledBallsSnapshot: item.calledBallsSnapshot,
                      patternTitle: item.patternTitle,
                      timestamp: item.timestamp,
                    });
                  }
                }}
                className={`rounded-2xl border p-4 sm:p-5 shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isDark
                    ? 'bg-slate-900/90 hover:bg-slate-800/90 border-slate-800'
                    : 'bg-white hover:bg-slate-50 border-slate-200'
                }`}
              >
                {/* Left: Status Icon (Red X for Lost, Green Check for Won) + Title + Ezi Ref Code */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {item.didWin ? (
                    <div className="w-11 h-11 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-8 h-8 text-emerald-400 stroke-[2.25]" />
                    </div>
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
                      <XCircle className="w-8 h-8 text-rose-500 stroke-[2.25]" />
                    </div>
                  )}

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm sm:text-base font-black tracking-tight ${
                          item.didWin
                            ? 'text-emerald-400'
                            : isDark
                            ? 'text-white'
                            : 'text-slate-900'
                        }`}
                      >
                        {item.didWin ? 'Won' : 'Lost'}
                      </span>
                      {firstWinner && (
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                            isDark
                              ? 'bg-slate-800 border-slate-700 text-amber-400'
                              : 'bg-amber-50 border-amber-200 text-amber-800'
                          }`}
                        >
                          <Eye className="w-3 h-3" />
                          <span>#{firstWinner.cartelaId}</span>
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-xs sm:text-sm font-mono-tabular font-bold truncate ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}
                    >
                      Ref: {item.refCode}
                    </div>
                  </div>
                </div>

                {/* Right: Date + Time + Stake/Prize Badge */}
                <div className="flex flex-col items-end gap-1 shrink-0 text-right">
                  <div
                    className={`flex items-center gap-1.5 text-xs font-mono-tabular font-bold ${
                      isDark ? 'text-slate-300' : 'text-slate-600'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5 opacity-80" />
                    <span>{item.dateStr}</span>
                  </div>
                  <div
                    className={`flex items-center gap-1.5 text-xs font-mono-tabular font-bold ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5 opacity-80" />
                    <span>{item.timeStr}</span>
                  </div>
                  <span
                    className={`mt-0.5 px-3 py-0.5 rounded-full text-white text-xs font-mono-tabular font-extrabold shadow-xs ${
                      item.didWin ? 'bg-emerald-600' : 'bg-rose-600'
                    }`}
                  >
                    {item.didWin
                      ? `+${item.prizeAmount} ETB`
                      : `${item.stakeAmount || 10} birr`}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
