import React, { useState } from 'react';
import { X, Copy, CheckCircle2 } from 'lucide-react';

export type TelegramMenuActionId =
  | 'menu'
  | 'play'
  | 'deposit'
  | 'withdraw'
  | 'balance'
  | 'jackpot'
  | 'transfer'
  | 'leaderboard'
  | 'token'
  | 'rules'
  | 'support';

interface TelegramMenuSliderBarProps {
  activeAction?: TelegramMenuActionId;
  userName: string;
  userBalance: number;
  bonusBalance: number;
  jackpotPool: number;
  isDark: boolean;
  onPlayLiveBingo: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenTransfer: () => void;
  onOpenRules: () => void;
}

export const TELEGRAM_SLIDER_ITEMS: {
  id: TelegramMenuActionId;
  cmd: string;
  label: string;
}[] = [
  { id: 'menu', cmd: 'menu', label: '🏠 Main Menu' },
  { id: 'play', cmd: 'play', label: '🎮 Play Live Bingo' },
  { id: 'deposit', cmd: 'deposit', label: 'Deposit 💵' },
  { id: 'withdraw', cmd: 'withdraw', label: 'Withdraw 💸' },
  { id: 'balance', cmd: 'balance', label: 'Check Balance 💰' },
  { id: 'jackpot', cmd: 'jackpot', label: 'Jackpot 🎰' },
  { id: 'transfer', cmd: 'transfer', label: 'Transfer 🔄' },
  { id: 'leaderboard', cmd: 'leaderboard', label: 'Leaderboard 🏆' },
  { id: 'token', cmd: 'token', label: '🔐 Get Login Token / ኮድ' },
  { id: 'rules', cmd: 'rules', label: 'Game Rules 📖' },
  { id: 'support', cmd: 'support', label: 'Support 📞' },
];

export const TelegramMenuSliderBar: React.FC<TelegramMenuSliderBarProps> = ({
  userName,
  userBalance,
  bonusBalance,
  jackpotPool,
  isDark,
  onPlayLiveBingo,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenTransfer,
  onOpenRules,
}) => {
  const [selectedModalItem, setSelectedModalItem] = useState<TelegramMenuActionId | null>(null);
  const [generatedToken, setGeneratedToken] = useState<string>('EZI-749201');
  const [copiedToken, setCopiedToken] = useState(false);

  const handleSliderClick = (id: TelegramMenuActionId) => {
    if (id === 'play' || id === 'menu') {
      setSelectedModalItem(null);
      onPlayLiveBingo();
      return;
    }
    if (id === 'deposit') {
      setSelectedModalItem(null);
      onOpenDeposit();
      return;
    }
    if (id === 'withdraw') {
      setSelectedModalItem(null);
      onOpenWithdraw();
      return;
    }
    if (id === 'transfer') {
      setSelectedModalItem(null);
      onOpenTransfer();
      return;
    }
    if (id === 'rules') {
      setSelectedModalItem(null);
      onOpenRules();
      return;
    }
    if (id === 'token') {
      const code = Math.floor(100000 + Math.random() * 900000);
      setGeneratedToken(`EZI-${code}`);
      setCopiedToken(false);
    }
    setSelectedModalItem(id);
  };

  return (
    <>
      {/* Horizontal Touch-Scrollable Slider Bar containing all 11 items */}
      <div
        className={`w-full rounded-2xl border p-2 overflow-x-auto no-scrollbar ${
          isDark
            ? 'bg-slate-900/95 border-slate-800'
            : 'bg-white border-slate-200 shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2 min-w-max">
          {TELEGRAM_SLIDER_ITEMS.map((item) => {
            const isPrimaryPlay = item.id === 'play';
            const isActiveModal = selectedModalItem === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSliderClick(item.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-extrabold whitespace-nowrap transition-all cursor-pointer active:scale-95 flex items-center gap-1.5 border ${
                  isPrimaryPlay
                    ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-slate-950 border-amber-400 shadow-md'
                    : isActiveModal
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : isDark
                    ? 'bg-[#1e2631] hover:bg-slate-800 text-white border-slate-700/80'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
                }`}
              >
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Modal for Check Balance, Jackpot, Leaderboard, Get Login Token, Support */}
      {selectedModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 backdrop-blur-xs">
          <div
            className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl space-y-4 ${
              isDark
                ? 'bg-slate-900 border-slate-700 text-white'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b pb-3 border-slate-700/40">
              <h3 className="text-base font-black">
                {TELEGRAM_SLIDER_ITEMS.find((i) => i.id === selectedModalItem)?.label}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedModalItem(null)}
                className="p-1.5 rounded-xl bg-rose-600 text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {selectedModalItem === 'balance' && (
              <div className="space-y-2.5 text-sm">
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex justify-between items-center">
                  <span className="font-bold">ዋና ቀሪ ሂሳብ (Main Balance)፦</span>
                  <span className="font-black font-mono-tabular text-lg text-emerald-400">
                    {userBalance.toFixed(2)} ETB
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/40 flex justify-between items-center">
                  <span className="font-bold">የቦነስ ሂሳብ (Bonus Balance)፦</span>
                  <span className="font-black font-mono-tabular text-lg text-amber-400">
                    {bonusBalance.toFixed(2)} ETB
                  </span>
                </div>
                <div className="p-3.5 rounded-xl bg-blue-500/15 border border-blue-500/40 flex justify-between items-center">
                  <span className="font-bold">ጠቅላላ ሂሳብ (Total)፦</span>
                  <span className="font-black font-mono-tabular text-lg text-blue-400">
                    {(userBalance + bonusBalance).toFixed(2)} ETB
                  </span>
                </div>
              </div>
            )}

            {selectedModalItem === 'jackpot' && (
              <div className="space-y-3 text-sm">
                <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/50 text-center space-y-1">
                  <div className="text-xs font-bold text-amber-300">
                    5% Progressive Jackpot Pool
                  </div>
                  <div className="text-2xl font-black font-mono-tabular text-amber-400">
                    {jackpotPool.toFixed(2)} / 1,000 ETB
                  </div>
                </div>
                <p className="text-xs leading-relaxed opacity-90">
                  ከእያንዳንዱ ዙር <strong>5%</strong> ወደ ጃክፓቱ ይጨመራል። <strong>1,000 ብር</strong> ሲሞላ በዚያ ዙር የሚያሸንፈው ተጫዋች ደራሹን እና 1,000 ብር ጃክፓቱን በአንድ ላይ ይወስደዋል!
                </p>
              </div>
            )}

            {selectedModalItem === 'leaderboard' && (
              <div className="space-y-2 text-xs sm:text-sm">
                {[
                  { rank: '🥇 1', name: userName || 'Ezana_Player', won: '14,500 ETB', wins: '42 Wins' },
                  { rank: '🥈 2', name: 'Yonas_Fast', won: '9,820 ETB', wins: '31 Wins' },
                  { rank: '🥉 3', name: 'Dawit_Bingo', won: '7,400 ETB', wins: '24 Wins' },
                  { rank: '🏅 4', name: 'Meron_Hailu', won: '5,120 ETB', wins: '19 Wins' },
                  { rank: '🏅 5', name: 'Abebe_K', won: '3,900 ETB', wins: '15 Wins' },
                ].map((row) => (
                  <div
                    key={row.rank}
                    className={`p-2.5 rounded-xl border flex items-center justify-between ${
                      isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="font-extrabold">
                      {row.rank}. {row.name}
                    </div>
                    <div className="font-mono-tabular font-black text-amber-400">
                      {row.won} ({row.wins})
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedModalItem === 'token' && (
              <div className="space-y-3 text-center">
                <p className="text-xs opacity-85">
                  የእርስዎ የአንድ ጊዜ መግቢያ ኮድ (One-Time Login Token)፦
                </p>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-amber-500/50 font-mono-tabular text-xl font-black text-amber-400 tracking-wider flex items-center justify-between">
                  <span>{generatedToken}</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (typeof window !== 'undefined' && navigator.clipboard) {
                        navigator.clipboard.writeText(generatedToken);
                        setCopiedToken(true);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center gap-1 cursor-pointer"
                  >
                    {copiedToken ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {selectedModalItem === 'support' && (
              <div className="space-y-2.5 text-xs sm:text-sm">
                <div className="p-3 rounded-xl bg-slate-800/70 border border-slate-700 space-y-1.5">
                  <div>
                    📞 <strong>ስልክ፦</strong> <code>0942742684</code>
                  </div>
                  <div>
                    💬 <strong>ቴሌግራም፦</strong> <code>@SunBingoSupport</code>
                  </div>
                  <div>
                    ⏰ <strong>የስራ ሰዓት፦</strong> 24 ሰዓት (ከሰኞ እስከ እሁድ)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
