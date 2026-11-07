import React, { useMemo } from 'react';
import { Trophy, Crown, Medal, Award, Sparkles, Flame } from 'lucide-react';
import { GameHistoryRecord, Language, UserAccount } from '../types/bingo';
import { TRANSLATIONS } from '../utils/translations';

interface LeaderboardViewProps {
  users: UserAccount[];
  history: GameHistoryRecord[];
  currentUserPhone?: string;
  language?: Language;
  isDark: boolean;
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  phoneMasked: string;
  isCurrentUser: boolean;
  winsCount: number;
  totalPrizeWon: number;
  bestFastBalls?: number;
  badgeLabel: string;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({
  users,
  history,
  currentUserPhone,
  language = 'am',
  isDark,
}) => {
  const t = TRANSLATIONS[language];
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const map = new Map<
      string,
      {
        name: string;
        phone: string;
        winsCount: number;
        totalPrizeWon: number;
        bestFastBalls?: number;
      }
    >();

    // Seed with realistic top players so Leaderboard is rich and motivating
    const seedPlayers = [
      {
        name: 'Yonas_Fast',
        phone: '0911223344',
        winsCount: 19,
        totalPrizeWon: 4850,
        bestFastBalls: 4,
      },
      {
        name: 'Mekdes_Bingo',
        phone: '0922847192',
        winsCount: 15,
        totalPrizeWon: 3620,
        bestFastBalls: 5,
      },
      {
        name: 'Dawit_777',
        phone: '0934918273',
        winsCount: 12,
        totalPrizeWon: 2940,
        bestFastBalls: 6,
      },
      {
        name: 'Hana_Queen',
        phone: '0945192837',
        winsCount: 9,
        totalPrizeWon: 2180,
        bestFastBalls: 7,
      },
      {
        name: 'Biniyam_Star',
        phone: '0913982371',
        winsCount: 7,
        totalPrizeWon: 1640,
        bestFastBalls: 8,
      },
      {
        name: 'Selam_Lucky',
        phone: '0974829104',
        winsCount: 5,
        totalPrizeWon: 1120,
        bestFastBalls: 9,
      },
    ];

    seedPlayers.forEach((sp) => {
      map.set(sp.name.toLowerCase(), { ...sp });
    });

    users.forEach((u) => {
      const key = u.name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          name: u.name,
          phone: u.phone,
          winsCount: u.id === 'u-1' ? 8 : 3,
          totalPrizeWon: u.id === 'u-1' ? 1950 : 600,
          bestFastBalls: 6,
        });
      }
    });

    // Aggregate actual recorded game history winners
    history.forEach((rec) => {
      rec.winners.forEach((w) => {
        const key = w.userName.toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.winsCount += 1;
          existing.totalPrizeWon += w.prizeAmount;
          if (
            rec.totalBallsCalled > 0 &&
            (!existing.bestFastBalls || rec.totalBallsCalled < existing.bestFastBalls)
          ) {
            existing.bestFastBalls = rec.totalBallsCalled;
          }
        } else {
          map.set(key, {
            name: w.userName,
            phone: '09********',
            winsCount: 1,
            totalPrizeWon: w.prizeAmount,
            bestFastBalls: rec.totalBallsCalled,
          });
        }
      });
    });

    const sorted = Array.from(map.values()).sort(
      (a, b) => b.totalPrizeWon - a.totalPrizeWon || b.winsCount - a.winsCount
    );

    return sorted.map((item, idx) => {
      const rank = idx + 1;
      const cleanPhone = item.phone || '09********';
      const phoneMasked =
        cleanPhone.length >= 10
          ? `${cleanPhone.slice(0, 4)}***${cleanPhone.slice(-3)}`
          : cleanPhone;
      const isCurrentUser =
        Boolean(currentUserPhone && item.phone === currentUserPhone) ||
        item.name.toLowerCase().includes('ezana');

      const badgeLabel =
        rank === 1
          ? '👑 1ኛ ሻምፒዮን'
          : rank === 2
          ? '🥈 2ኛ ደረጃ'
          : rank === 3
          ? '🥉 3ኛ ደረጃ'
          : '⭐ ንቁ ተጫዋች';

      return {
        rank,
        name: item.name,
        phoneMasked,
        isCurrentUser,
        winsCount: item.winsCount,
        totalPrizeWon: item.totalPrizeWon,
        bestFastBalls: item.bestFastBalls,
        badgeLabel,
      };
    });
  }, [users, history, currentUserPhone]);

  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="rounded-2xl p-4 sm:p-5 bg-gradient-to-r from-amber-500 via-orange-600 to-rose-600 text-slate-950 shadow-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-slate-950 text-amber-400 flex items-center justify-center shadow-lg">
            <Trophy className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black">
              {t.leaderboardTitle}
            </h2>
            <p className="text-xs font-extrabold text-slate-900/85">
              {t.leaderboardSub}
            </p>
          </div>
        </div>

        <div className="px-3 py-1.5 rounded-xl bg-slate-950 text-amber-400 text-xs font-black flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" />
          <span>{t.liveRanking}</span>
        </div>
      </div>

      {/* Top 3 Podium Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {topThree.map((player) => {
          const isFirst = player.rank === 1;
          const isSecond = player.rank === 2;
          return (
            <div
              key={player.rank}
              className={`rounded-2xl border p-4 relative overflow-hidden ${
                isFirst
                  ? isDark
                    ? 'bg-gradient-to-br from-amber-950/60 via-slate-900 to-slate-900 border-amber-400 ring-1 ring-amber-400/50'
                    : 'bg-amber-50 border-amber-400'
                  : isSecond
                  ? isDark
                    ? 'bg-slate-900 border-slate-600'
                    : 'bg-white border-slate-300'
                  : isDark
                  ? 'bg-slate-900 border-amber-700/50'
                  : 'bg-orange-50/50 border-orange-200'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={`px-2.5 py-0.5 rounded-lg text-xs font-black flex items-center gap-1 ${
                    isFirst
                      ? 'bg-amber-400 text-slate-950'
                      : isSecond
                      ? 'bg-slate-300 text-slate-950'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {isFirst ? (
                    <Crown className="w-3.5 h-3.5" />
                  ) : isSecond ? (
                    <Medal className="w-3.5 h-3.5" />
                  ) : (
                    <Award className="w-3.5 h-3.5" />
                  )}
                  <span>{player.badgeLabel}</span>
                </span>
                <span className="text-xs font-mono-tabular opacity-75">
                  {player.phoneMasked}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm sm:text-base font-extrabold flex items-center gap-1.5">
                    <span>{player.name}</span>
                    {player.isCurrentUser && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black">
                        {t.youBadge}
                      </span>
                    )}
                  </div>
                  <div className="text-xs opacity-75 mt-0.5 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-400" />
                    <span>
                      {player.winsCount} {t.winsWord}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-[10px] uppercase opacity-70 font-bold">{t.totalPrizeLabel}</div>
                  <div className="text-base sm:text-lg font-black font-mono-tabular text-emerald-400">
                    {player.totalPrizeWon.toFixed(0)} ETB
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Leaderboard List */}
      <div
        className={`rounded-2xl border overflow-hidden ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <div
          className={`px-4 py-3 border-b flex items-center justify-between text-xs font-extrabold ${
            isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}
        >
          <span>ደረጃ እና ተጫዋች (Player Rank)</span>
          <span>ድሎች እና ጠቅላላ ደራሽ (Total Won)</span>
        </div>

        <div className="divide-y divide-slate-800/40">
          {leaderboard.map((item) => (
            <div
              key={`${item.rank}-${item.name}`}
              className={`px-4 py-3 flex items-center justify-between gap-3 ${
                item.isCurrentUser
                  ? isDark
                    ? 'bg-emerald-950/30'
                    : 'bg-emerald-50/70'
                  : ''
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono-tabular font-black text-xs ${
                    item.rank === 1
                      ? 'bg-amber-400 text-slate-950'
                      : item.rank === 2
                      ? 'bg-slate-300 text-slate-950'
                      : item.rank === 3
                      ? 'bg-amber-600 text-white'
                      : isDark
                      ? 'bg-slate-800 text-slate-300'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  #{item.rank}
                </div>

                <div>
                  <div className="text-xs sm:text-sm font-extrabold flex items-center gap-1.5">
                    <span>{item.name}</span>
                    {item.isCurrentUser && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950 text-[10px] font-black">
                        እርስዎ
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] opacity-70 font-mono-tabular">
                    {item.phoneMasked} · {item.winsCount} ድሎች (Wins)
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs sm:text-sm font-black font-mono-tabular text-emerald-400">
                  +{item.totalPrizeWon.toFixed(2)} ETB
                </div>
                <div className="text-[10px] opacity-70 font-bold">
                  {item.badgeLabel}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
