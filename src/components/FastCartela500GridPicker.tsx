import React, { useMemo, useState } from 'react';
import { RefreshCw, Play, ChevronUp, ChevronDown, Users, Lock } from 'lucide-react';
import { Language } from '../types/bingo';
import { TRANSLATIONS } from '../utils/translations';

export interface OtherPlayerLockedCartela {
  cartelaId: number;
  ownerPhone: string;
  ownerName: string;
  clientId?: string;
  isRegistered: boolean;
}

interface FastCartela500GridPickerProps {
  maxCartelas?: number;
  language?: Language;
  selectedCartelaIds: number[];
  registeredCartelaIds: number[];
  blockedCartelaIds: number[];
  otherPlayersLockedCartelas?: OtherPlayerLockedCartela[];
  onlinePlayersCount?: number;
  preGameCountdown: number | null;
  activePlayersCount: number;
  isPlaying: boolean;
  isAdminMode?: boolean;
  onToggleCartelaNumber: (id: number) => void;
  onRefreshBoard: () => void;
  onConfirmSelectNumbers: () => void;
  onStartGame: () => void;
  onSimulateOtherPlayerLock?: () => void;
}

export const FastCartela500GridPicker: React.FC<FastCartela500GridPickerProps> = ({
  maxCartelas = 500,
  language = 'am',
  selectedCartelaIds,
  registeredCartelaIds,
  blockedCartelaIds,
  otherPlayersLockedCartelas = [],
  onlinePlayersCount = 4,
  preGameCountdown,
  activePlayersCount,
  isPlaying,
  isAdminMode = false,
  onToggleCartelaNumber,
  onRefreshBoard,
  onConfirmSelectNumbers,
  onStartGame,
  onSimulateOtherPlayerLock,
}) => {
  const t = TRANSLATIONS[language];
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showFull500Board, setShowFull500Board] = useState(true);

  const numbersList = useMemo(
    () => Array.from({ length: maxCartelas }, (_, i) => i + 1),
    [maxCartelas]
  );

  const selectedSet = useMemo(() => new Set(selectedCartelaIds), [selectedCartelaIds]);
  const registeredSet = useMemo(() => new Set(registeredCartelaIds), [registeredCartelaIds]);
  const blockedSet = useMemo(() => new Set(blockedCartelaIds), [blockedCartelaIds]);
  const otherLockedMap = useMemo(() => {
    const m = new Map<number, OtherPlayerLockedCartela>();
    for (const item of otherPlayersLockedCartelas) {
      if (!selectedSet.has(item.cartelaId) && !registeredSet.has(item.cartelaId)) {
        m.set(item.cartelaId, item);
      }
    }
    return m;
  }, [otherPlayersLockedCartelas, selectedSet, registeredSet]);

  const handleRefreshClick = () => {
    setIsRefreshing(true);
    onRefreshBoard();
    setTimeout(() => setIsRefreshing(false), 350);
  };

  return (
    <div className="relative rounded-2xl border border-teal-500/30 bg-[#092329] text-white shadow-2xl overflow-hidden">
      {/* Top Status Text + Wait / Countdown on Top Right + Show Less / Show More Toggle */}
      <div className="pt-3 pb-2.5 px-3 border-b border-teal-500/20 bg-[#071d22] flex flex-wrap items-center justify-between gap-2">
        <div className="text-left space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm sm:text-base font-medium tracking-wide text-[#5cc9d6]">
              {preGameCountdown !== null
                ? `${t.startingGameInSec} ${preGameCountdown}s`
                : t.startingGameRunning}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-extrabold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span>
                {t.liveServerOnline} ({onlinePlayersCount} {t.playerWord})
              </span>
            </span>
          </div>
          <div className="text-[11px] text-teal-200/75 font-semibold flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {activePlayersCount < 2 && preGameCountdown === null
                ? t.waitingForPlayersNote
                : `${t.cartela}: ${activePlayersCount} · ${t.yourRegisteredCard}: ${registeredCartelaIds.length} · ${t.lockedByOtherCard}: ${otherLockedMap.size}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Top-right status: wait (when 1st player) or remaining seconds countdown */}
          <div
            className={`px-3 py-1.5 rounded-xl text-xs font-black font-mono-tabular border ${
              preGameCountdown !== null
                ? 'bg-amber-500 text-slate-950 border-amber-300'
                : 'bg-slate-800/90 text-amber-300 border-amber-500/40'
            }`}
          >
            {preGameCountdown !== null
              ? `${preGameCountdown}s`
              : t.waitLabel}
          </div>

          <button
            type="button"
            onClick={() => setShowFull500Board(!showFull500Board)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-colors cursor-pointer bg-slate-800/90 text-rose-400 hover:bg-slate-700 border border-slate-700 shrink-0"
          >
            {showFull500Board ? (
              <>
                <ChevronUp className="w-4 h-4" />
                <span>{t.showLess}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                <span>{t.showMore}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {showFull500Board && (
        <>
          {/* Color Legend Bar for Multiplayer Cartela States */}
          <div className="px-3 pt-2 pb-1 flex flex-wrap items-center gap-3 text-[10px] font-bold text-teal-100/80 border-b border-teal-500/10">
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#1e3a42] border border-white/20" />
              <span>{t.availableCard}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#f97316]" />
              <span>{t.selectedCard}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-[#22c55e]" />
              <span>{t.yourRegisteredCard}</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-xs bg-rose-600 border border-rose-300" />
              <span>
                {t.lockedByOtherCard} ({otherLockedMap.size})
              </span>
            </span>
          </div>

          {/* 1 to 500 10-Column Number Grid */}
          <div className="max-h-[430px] sm:max-h-[480px] overflow-y-auto px-2 sm:px-3 pt-2.5 pb-20">
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {numbersList.map((num) => {
                const isRegistered = registeredSet.has(num);
                const isSelected = selectedSet.has(num);
                const isBlocked = blockedSet.has(num);
                const otherOwner = otherLockedMap.get(num);

                let cellStyle =
                  'bg-[#1e3a42] hover:bg-[#294d57] text-white border border-white/5';

                if (isBlocked) {
                  cellStyle =
                    'bg-rose-900/80 text-white/90 border border-rose-500/50 cursor-not-allowed';
                } else if (otherOwner) {
                  // Red color indicates card is selected by another player ("በቀይ ቀለም የተመረጡ ቁጥሮች የሚያሳዩት መጫወቻ ካርድ በሌላ ተጫዋች መመረጡን ነው")
                  cellStyle =
                    'bg-rose-600 text-white border border-rose-300 cursor-not-allowed shadow-xs';
                } else if (isRegistered) {
                  cellStyle =
                    'bg-[#22c55e] text-white border border-emerald-300 shadow-md shadow-emerald-500/30 scale-[1.02]';
                } else if (isSelected) {
                  cellStyle =
                    'bg-[#f97316] text-white border border-amber-300 shadow-md shadow-orange-500/30 scale-[1.02]';
                }

                return (
                  <button
                    key={num}
                    type="button"
                    disabled={isBlocked}
                    title={
                      otherOwner
                        ? `${t.cartela} #${num} - ${otherOwner.ownerName} (${otherOwner.ownerPhone})`
                        : `${t.cartela} #${num}`
                    }
                    onClick={() => onToggleCartelaNumber(num)}
                    className={`relative h-9 sm:h-10 rounded-xl font-extrabold text-xs sm:text-sm font-mono-tabular flex items-center justify-center transition-all select-none cursor-pointer active:scale-95 ${cellStyle}`}
                  >
                    <span>{num}</span>
                    {(otherOwner || isRegistered) && (
                      <Lock className="w-2.5 h-2.5 absolute top-0.5 right-0.5 text-amber-300" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Floating Bottom Action Pills: Refresh | Play / Select Number */}
          <div className="absolute bottom-0 left-0 right-0 p-2.5 sm:p-3 bg-gradient-to-t from-[#06181c] via-[#06181c]/95 to-transparent grid grid-cols-2 gap-2 sm:gap-3">
            <button
              type="button"
              onClick={handleRefreshClick}
              className="py-2.5 sm:py-3 px-2 rounded-full bg-[#09697e] hover:bg-[#0b7d96] text-white font-extrabold text-xs sm:text-base shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>{t.refreshBtn}</span>
            </button>

            <button
              type="button"
              onClick={onConfirmSelectNumbers}
              className="py-2.5 sm:py-3 px-2 rounded-full bg-[#24c65a] hover:bg-[#1fb14f] text-white font-extrabold text-xs sm:text-base shadow-lg flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 transition"
            >
              <Play className="w-4 h-4 fill-current hidden sm:inline" />
              <span>
                {t.playSelectBtn}{selectedCartelaIds.length > 0 ? ` (${selectedCartelaIds.length})` : ''}
              </span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
