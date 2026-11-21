import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { ModernRaminoGame } from './components/ModernRaminoGame';

const FastBingoStandaloneApp = React.lazy(() =>
  import('./components/FastBingoStandaloneApp').then((m) => ({
    default: m.FastBingoStandaloneApp,
  }))
);
const RegularBingoStandaloneApp = React.lazy(() =>
  import('./components/RegularBingoStandaloneApp').then((m) => ({
    default: m.RegularBingoStandaloneApp,
  }))
);
const FastKenoScreen = React.lazy(() =>
  import('./components/FastKenoScreen').then((m) => ({
    default: m.FastKenoScreen,
  }))
);
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanelView } from './components/AdminPanelView';
import { RulesAndPatternsModal } from './components/RulesAndPatternsModal';
import { PlayerAuthScreen, AuthenticatedPlayerPayload } from './components/PlayerAuthScreen';
import { WalletView } from './components/WalletView';
import {
  getOrCreateDevicePlayerIdentity,
  saveDevicePlayerIdentity,
  buildApiUrl,
  dispatchServerRoomAction,
  hasDeviceRegisteredPhone,
  getDeviceClientId,
  subscribeRealtimeRoomSync,
  subscribeGameNotifications,
  getSignedAccountToken,
  saveSignedAccountToken,
  recoverSignedAccountTokenFromCloudStorage,
  saveLocalTransactionsCache,
  getLocalTransactionsCache,
  getLocalWalletBalanceByPhone,
  saveLocalWalletBalanceByPhone,
  ServerLockedCartelaItem,
  ServerRoomStatePayload,
} from './utils/realtimeRoomClient';
import { localizeHeroAd } from './utils/adTranslations';
import { BINGO_PATTERNS } from './data/bingoPatterns';
import { applyTelegramSwipeLock, scrollAppToTop } from './utils/telegramViewport';
import {
  Language,
  TransactionRecord,
  UserAccount,
  BankPaymentAccount,
  HeroBannerAd,
  CallSpeed,
  GameStartNotificationEvent,
} from './types/bingo';
import { PAYMENT_ACCOUNTS } from './utils/translations';
import {
  Zap,
  Gamepad2,
  Sliders,
  Sun,
  Moon,
  Lock,
  LogOut,
  Globe,
  ChevronDown,
  Shield,
  ArrowLeft,
  Sparkles,
  Trophy,
  Flame,
  Wallet,
  Bell,
  Menu,
  X,
  User,
  Home,
  Edit3,
  Check,
  History,
  Plus,
} from 'lucide-react';
import gameTileBingoImg from './assets/images/game_tile_bingo_1794572557520.jpg';
import liyuBingoTileImg from './assets/images/liyu_bingo_tile_1794575305419.jpg';
import gameTileKenoImg from './assets/images/game_tile_keno_1794572558494.jpg';
import gameTileConkerImg from './assets/images/game_tile_conker_1794572558656.jpg';

type GameKey = 'fast' | 'regular' | 'keno' | 'ramino';
type GameVisibilityMap = Record<GameKey, { visible: boolean; comingSoon: boolean }>;

const DEFAULT_GAME_VISIBILITY: GameVisibilityMap = {
  fast: { visible: false, comingSoon: false },
  regular: { visible: false, comingSoon: false },
  keno: { visible: false, comingSoon: false },
  ramino: { visible: true, comingSoon: false },
};

const HUB_T: Record<
  Language,
  {
    gamesBtn: string;
    adminPortal: string;
    backToGame: string;
    selectLanguage: string;
    lightTheme: string;
    darkTheme: string;
    lightShort: string;
    darkShort: string;
    settings: string;
    adminLogout: string;
    adminControlTitle: string;
    adminControlSubtitle: string;
    notificationsTitle: string;
    walletTitle: string;
    bonusWord: string;
    currencyUnit: string;
    helloPlayer: (name: string, bal: number, bonus: number) => string;
    walletSummary: (bal: number, bonus: number) => string;
    languageSection: string;
    logout: string;
    chooseGameTitle: string;
    chooseGameSubtitle: string;
    soonBadge: string;
    soonNotice: (title: string) => string;
    gameHiddenNotice: string;
    fastTitle: string;
    regularTitle: string;
    kenoTitle: string;
    raminoTitle: string;
    bannerDefaultBadge: string;
    bannerDefaultCta: string;
    noVisibleGames: string;
    navHome: string;
    navHistory: string;
    navProfile: string;
    changeName: string;
    newNamePlaceholder: string;
    saveShort: string;
    playNowToast: string;
    defaultSlides: {
      badge: string;
      title: string;
      subtitle: string;
      cta: string;
      target: 'fast' | 'ramino' | 'regular' | 'keno';
    }[];
  }
> = {
  am: {
    gamesBtn: 'ጨዋታዎች',
    adminPortal: 'አድሚን ፖርታል',
    backToGame: 'ወደ ጨዋታው ተመለስ',
    selectLanguage: 'ቋንቋ ምረጥ',
    lightTheme: 'ብርሃን ገጽታ',
    darkTheme: 'ጨለማ ገጽታ',
    lightShort: 'ብርሃን',
    darkShort: 'ጨለማ',
    settings: 'ቅንብር',
    adminLogout: 'አድሚን ውጣ',
    adminControlTitle: 'ዋና የአድሚን ማዕከል',
    adminControlSubtitle: 'ባንኮች፣ ተጠቃሚዎች፣ ማስታወቂያዎች፣ የገንዘብ እንቅስቃሴ እና የጨዋታ ቁጥጥር በዚህ ማዕከል ይተዳደራሉ።',
    notificationsTitle: 'ማሳወቂያ',
    walletTitle: 'ዋሌት',
    bonusWord: 'ቦነስ',
    currencyUnit: 'ብር',
    helloPlayer: (name, bal, bonus) => `ሰላም ${name}! ሂሳብዎ ${bal} ብር • ቦነስ ${bonus} ብር`,
    walletSummary: (bal, bonus) => `ዋሌት ${bal} ብር • ቦነስ ${bonus} ብር`,
    languageSection: 'ቋንቋ',
    logout: 'ውጣ',
    chooseGameTitle: 'የጨዋታ ምድቦች',
    chooseGameSubtitle: 'የሚፈልጉትን ጨዋታ ነክተው አሁን ይጀምሩ',
    soonBadge: 'በቅርቡ',
    soonNotice: (title) => `⏳ ${title} በቅርብ ቀን ሲጠናቀቅ ይለቀቃል!`,
    gameHiddenNotice: '⚠️ ይህ ጨዋታ ለማስተካከል በአድሚን ለጊዜው ተደብቋል።',
    fastTitle: 'ፈጣን ቢንጎ',
    regularTitle: 'ልዩ ቢንጎ',
    kenoTitle: 'ኬኖ',
    raminoTitle: 'ራሚኖ',
    bannerDefaultBadge: 'ማስታወቂያ',
    bannerDefaultCta: 'አሁን ይጫወቱ →',
    noVisibleGames: 'ለጊዜው የሚታዩ ጨዋታዎች የሉም፤ የጥገና ስራ ላይ ነን።',
    navHome: 'ዋና ገጽ',
    navHistory: 'ታሪክ',
    navProfile: 'መገለጫ',
    changeName: 'ስም ቀይር',
    newNamePlaceholder: 'አዲስ ስም ያስገቡ...',
    saveShort: 'አስቀምጥ',
    playNowToast: '🎮 አሁን ግባ',
    defaultSlides: [
      {
        badge: 'የዕድል ሳጥን',
        title: 'ሁሉንም ጨዋታዎች በአንድ ቦታ',
        subtitle: 'ፈጣን ድል 2x • ልዩ ሽልማት 3x • የዕድል 5 ጨዋታ!',
        cta: 'አሁን ይጫወቱ →',
        target: 'fast',
      },
      {
        badge: 'ራሚኖ',
        title: 'የጓደኞች ግል ጠረጴዛ እና ድምፅ',
        subtitle: 'ዶፔይ 2x • በጆከር 3x • ከ5 ጨዋታ በኋላ ፖስት ዴይ!',
        cta: 'ራሚኖ ይግቡ →',
        target: 'ramino',
      },
      {
        badge: 'ልዩ ቢንጎ እና ኬኖ',
        title: 'በፈለጉት መደብ በሰከንዶች ያሸንፉ',
        subtitle: 'በቀጥታ ከዋሌትዎ ጋር የተገናኘ ፈጣን ክፍያ።',
        cta: 'ልዩ ቢንጎ ይግቡ →',
        target: 'regular',
      },
    ],
  },
  ti: {
    gamesBtn: 'ጸወታታት',
    adminPortal: 'ኣድሚን ፖርታል',
    backToGame: 'ናብ ጸወታ ተመለስ',
    selectLanguage: 'ቋንቋ ምረጹ',
    lightTheme: 'ብርሃን ገጽ',
    darkTheme: 'ጸልማት ገጽ',
    lightShort: 'ብርሃን',
    darkShort: 'ጸልማት',
    settings: 'ቅንብር',
    adminLogout: 'ኣድሚን ውጻእ',
    adminControlTitle: 'ዋና ማእከል ኣድሚን',
    adminControlSubtitle: 'ባንክታት፣ ተጠቀምቲ፣ መወዓውዒታት፣ ገንዘብን ቁጽጽር ጸወታን ኣብዚ ይመሓደሩ።',
    notificationsTitle: 'መፍለጢ',
    walletTitle: 'ዋሌት',
    bonusWord: 'ቦነስ',
    currencyUnit: 'ብር',
    helloPlayer: (name, bal, bonus) => `ሰላም ${name}! ሕሳብኩም ${bal} ብር • ቦነስ ${bonus} ብር`,
    walletSummary: (bal, bonus) => `ዋሌት ${bal} ብር • ቦነስ ${bonus} ብር`,
    languageSection: 'ቋንቋ',
    logout: 'ውጻእ',
    chooseGameTitle: 'ጸወታ ምረጹ',
    chooseGameSubtitle: 'ዝደለኹምዎ ጸወታ ጠዊቕኩም ሕጂ ጀምሩ',
    soonBadge: 'ብቐረባ',
    soonNotice: (title) => `⏳ ${title} ምስ ተወድአ ብቐረባ ክለቀቕ እዩ!`,
    gameHiddenNotice: '⚠️ እዚ ጸወታ ንምጽጋን ብኣድሚን ተዓጽዩ ኣሎ።',
    fastTitle: 'ቅልጡፍ ቢንጎ',
    regularTitle: 'ልዩ ቢንጎ',
    kenoTitle: 'ኬኖ',
    raminoTitle: 'ራሚኖ',
    bannerDefaultBadge: 'መወዓውዒ',
    bannerDefaultCta: 'ሕጂ ተጻወቱ →',
    noVisibleGames: 'ንግዚኡ ዝርኣዩ ጸወታታት የለዉን።',
    navHome: 'ዋና ገጽ',
    navHistory: 'ታሪኽ',
    navProfile: 'መግለጺ',
    changeName: 'ስም ቀይር',
    newNamePlaceholder: 'ሓዱሽ ስም የእትዉ...',
    saveShort: 'ኣቐምጥ',
    playNowToast: '🎮 ሕጂ እተዉ',
    defaultSlides: [
      {
        badge: 'ቀንዲ ማእከል',
        title: 'ኩሎም ጸወታታት ኣብ ሓደ ቦታ',
        subtitle: 'ዕድልኩም ሎሚ ፈትኑ! ቅልጡፍ ዓወትን ዓብዪ ሽልማትን።',
        cta: 'ሕጂ ተጻወቱ →',
        target: 'fast',
      },
      {
        badge: 'ራሚኖ',
        title: 'ናይ ኣዕሩኽ ብሕታዊ ጠረጴዛ',
        subtitle: 'ዶፔይ 2x • ብጆከር 3x • ድሕሪ 5 ጸወታ ፖስት ዴይ!',
        cta: 'ራሚኖ እተዉ →',
        target: 'ramino',
      },
      {
        badge: 'ልዩ ቢንጎን ኬኖን',
        title: 'ብዝደለኹምዎ መደብ ብሰከንድ ተዓወቱ',
        subtitle: 'ምስ ዋሌትኩም ብቀጥታ ዝተኣሳሰረ ቅልጡፍ ክፍሊት።',
        cta: 'ልዩ ቢንጎ እተዉ →',
        target: 'regular',
      },
    ],
  },
  om: {
    gamesBtn: 'Taphoota',
    adminPortal: 'Bulchiinsa',
    backToGame: 'Gara Taphaatti Deebi\'i',
    selectLanguage: 'Afaan Filadhu',
    lightTheme: 'Ifa',
    darkTheme: 'Dukkana',
    lightShort: 'Ifa',
    darkShort: 'Dukkana',
    settings: 'Qindaa\'ina',
    adminLogout: 'Bulchiinsa Bahi',
    adminControlTitle: 'Giddugala Bulchiinsaa',
    adminControlSubtitle: 'Baankonni, fayyadamtoonni, beeksisnii fi to\'annoon taphaa asitti hogganamu.',
    notificationsTitle: 'Beeksisa',
    walletTitle: 'Waaletii',
    bonusWord: 'Boonasii',
    currencyUnit: 'ETB',
    helloPlayer: (name, bal, bonus) => `Akkam ${name}! Hafteen kee ${bal} ETB • Boonasii ${bonus} ETB`,
    walletSummary: (bal, bonus) => `Waaletii ${bal} ETB • Boonasii ${bonus} ETB`,
    languageSection: 'Afaan',
    logout: 'Bahi',
    chooseGameTitle: 'Tapha Filadhu',
    chooseGameSubtitle: 'Tapha barbaaddan tuquun amma jalqabaa',
    soonBadge: 'Dhiyootti',
    soonNotice: (title) => `⏳ ${title} yeroo xumuramu dhiyootti ni gadhiifama!`,
    gameHiddenNotice: '⚠️ Taphni kun suphaaf yeroof bulchaadhaan dhokfameera.',
    fastTitle: 'Biingoo Ariifataa',
    regularTitle: 'Biingoo Addaa',
    kenoTitle: 'Keenoo',
    raminoTitle: 'Raaminoo',
    bannerDefaultBadge: 'Beeksisa',
    bannerDefaultCta: 'Amma Taphadhu →',
    noVisibleGames: 'Yeroof taphoonni mul\'atan hin jiran.',
    navHome: 'Fuula Duraa',
    navHistory: 'Seenaa',
    navProfile: 'Eenyummaa',
    changeName: 'Maqaa Jijjiiri',
    newNamePlaceholder: 'Maqaa haaraa galchi...',
    saveShort: 'Olkaa\'i',
    playNowToast: '🎮 Amma Seeni',
    defaultSlides: [
      {
        badge: 'Giddugala',
        title: 'Taphoota Hunda Bakka Tokkotti',
        subtitle: 'Carraa keessan har\'a yaalaa! Injifannoo ariifataa fi badhaasa guddaa.',
        cta: 'Amma Taphadhu →',
        target: 'fast',
      },
      {
        badge: 'Raaminoo',
        title: 'Gabatee Dhuunfaa Hiriyootaa',
        subtitle: 'Dooppey 2x • Jookeraan 3x • Tapha 5 booda Poost Deey!',
        cta: 'Raaminoo Seeni →',
        target: 'ramino',
      },
      {
        badge: 'Biingoo Addaa & Keenoo',
        title: 'Sekondii Muraasa Keessatti Injifadhaa',
        subtitle: 'Kaffaltii ariifataa waaletii keessaniin wal qabate.',
        cta: 'Biingoo Addaa Seeni →',
        target: 'regular',
      },
    ],
  },
  en: {
    gamesBtn: 'Games',
    adminPortal: 'Admin Portal',
    backToGame: 'Back to Game',
    selectLanguage: 'Select Language',
    lightTheme: 'Light Mode',
    darkTheme: 'Dark Mode',
    lightShort: 'Light',
    darkShort: 'Dark',
    settings: 'Settings',
    adminLogout: 'Admin Logout',
    adminControlTitle: 'Admin Control Center',
    adminControlSubtitle: 'Manage banks, users, ads, transactions, game visibility, and live rooms.',
    notificationsTitle: 'Notifications',
    walletTitle: 'Wallet',
    bonusWord: 'Bonus',
    currencyUnit: 'ETB',
    helloPlayer: (name, bal, bonus) => `Hi ${name}! Balance ${bal} ETB • Bonus ${bonus} ETB`,
    walletSummary: (bal, bonus) => `Wallet ${bal} ETB • Bonus ${bonus} ETB`,
    languageSection: 'Language',
    logout: 'Logout',
    chooseGameTitle: 'Choose a Game',
    chooseGameSubtitle: 'Tap any game below to start playing',
    soonBadge: 'Soon',
    soonNotice: (title) => `⏳ ${title} will launch soon once finished!`,
    gameHiddenNotice: '⚠️ This game is temporarily hidden by Admin for maintenance.',
    fastTitle: 'Fast Bingo',
    regularTitle: 'Liyu Bingo',
    kenoTitle: 'Keno',
    raminoTitle: 'SUN Ramino',
    bannerDefaultBadge: 'Featured',
    bannerDefaultCta: 'Play Now →',
    noVisibleGames: 'No games are currently visible while maintenance is underway.',
    navHome: 'Home',
    navHistory: 'History',
    navProfile: 'Profile',
    changeName: 'Edit Name',
    newNamePlaceholder: 'Enter new name...',
    saveShort: 'Save',
    playNowToast: '🎮 Play Now',
    defaultSlides: [
      {
        badge: 'Featured',
        title: 'All Your Favorite Games in One Place',
        subtitle: 'Try your luck today with instant payouts and exciting wins.',
        cta: 'Play Now →',
        target: 'fast',
      },
      {
        badge: 'SUN Ramino',
        title: 'Private Friend Tables & Live Voice',
        subtitle: 'Dopey 2x • Golden 3x • Post Day after 5 rounds!',
        cta: 'Enter Ramino →',
        target: 'ramino',
      },
      {
        badge: 'Liyu Bingo & Keno',
        title: 'Win Every Few Seconds',
        subtitle: 'Connected directly to your unified Sun Games wallet.',
        cta: 'Enter Liyu Bingo →',
        target: 'regular',
      },
    ],
  },
};

function SunGamesLogo({ isDark = true }: { isDark?: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center select-none">
      <svg
        viewBox="0 0 260 112"
        className="w-44 sm:w-52 h-auto drop-shadow-[0_4px_18px_rgba(34,211,238,0.28)]"
        aria-label="SUN GAMES"
      >
        <defs>
          <linearGradient id="sgGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF3B0" />
            <stop offset="35%" stopColor="#F5C451" />
            <stop offset="70%" stopColor="#D4942A" />
            <stop offset="100%" stopColor="#8C5811" />
          </linearGradient>
          <linearGradient id="sgGoldText" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#FFF6C9" />
            <stop offset="48%" stopColor="#F2C04E" />
            <stop offset="100%" stopColor="#B87A1E" />
          </linearGradient>
          <linearGradient id="sgCyanGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#7DF9FF" />
            <stop offset="55%" stopColor="#06B6D4" />
            <stop offset="100%" stopColor="#0E7490" />
          </linearGradient>
          <linearGradient id="sgTealSphere" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0D3B46" />
            <stop offset="100%" stopColor="#03131A" />
          </linearGradient>
          <clipPath id="sgLeftHalf">
            <rect x="96" y="25" width="34" height="50" />
          </clipPath>
          <clipPath id="sgRightHalf">
            <rect x="130" y="25" width="34" height="50" />
          </clipPath>
        </defs>

        {/* 7 Faceted Electric-Cyan Sun Rays */}
        <g stroke="#67E8F9" strokeWidth="0.7" strokeLinejoin="round">
          <polygon points="94,45 68,40 89,37" fill="url(#sgCyanGrad)" />
          <polygon points="98,37 76,22 103,31" fill="url(#sgCyanGrad)" />
          <polygon points="108,30 96,10 116,27" fill="url(#sgCyanGrad)" />
          <polygon points="124,26 130,3 136,26" fill="url(#sgCyanGrad)" />
          <polygon points="144,27 164,10 152,30" fill="url(#sgCyanGrad)" />
          <polygon points="157,31 184,22 162,37" fill="url(#sgCyanGrad)" />
          <polygon points="171,37 192,40 166,45" fill="url(#sgCyanGrad)" />
        </g>

        {/* Outer Glowing Cyan Horizon Ring */}
        <path
          d="M 88 53 A 42 42 0 0 1 172 53"
          fill="none"
          stroke="#22D3EE"
          strokeWidth="1.6"
          opacity="0.85"
        />

        {/* Sun Sphere: Left Brushed Gold + Right Dark Teal Tech Traces */}
        <circle cx="130" cy="49" r="22" fill="url(#sgGoldGrad)" clipPath="url(#sgLeftHalf)" />
        <circle cx="130" cy="49" r="22" fill="url(#sgTealSphere)" clipPath="url(#sgRightHalf)" />
        <g clipPath="url(#sgRightHalf)" stroke="#22D3EE" strokeWidth="1.25" fill="none" opacity="0.95">
          <path d="M 130 35 L 138 35 L 143 30" />
          <path d="M 130 42 L 142 42 L 147 37" />
          <path d="M 130 49 L 146 49" />
          <path d="M 130 56 L 139 56 L 144 61" />
          <circle cx="144" cy="30" r="1.5" fill="#7DF9FF" />
          <circle cx="148" cy="37" r="1.5" fill="#7DF9FF" />
          <circle cx="147" cy="49" r="1.5" fill="#7DF9FF" />
          <circle cx="145" cy="61" r="1.5" fill="#7DF9FF" />
        </g>
        <circle cx="130" cy="49" r="22" fill="none" stroke="#F5C451" strokeWidth="1.2" opacity="0.9" />

        {/* Sweeping Horizon Orbital Arc */}
        <path
          d="M 55 59 Q 130 43 205 59 Q 130 50 55 59 Z"
          fill="url(#sgCyanGrad)"
          opacity="0.92"
        />
        <ellipse cx="130" cy="54" rx="58" ry="2.2" fill="#A5F3FC" opacity="0.55" />

        {/* Wordmark: SUN GAMES */}
        <text
          x="130"
          y="96"
          textAnchor="middle"
          fontFamily="'Georgia', 'Plus Jakarta Sans', serif"
          fontWeight="800"
          fontSize="27"
          letterSpacing="2"
          fill={isDark ? 'url(#sgGoldText)' : '#92400E'}
          stroke={isDark ? '#3B2305' : '#FEF3C7'}
          strokeWidth="0.9"
          paintOrder="stroke fill"
        >
          SUN GAMES
        </text>
      </svg>
    </div>
  );
}

export default function App() {
  const [openSettingsTrigger, setOpenSettingsTrigger] = useState<number>(0);
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ezi_pref_dark');
      if (saved !== null) return saved === 'true';
    }
    return true;
  });

  const handleToggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('ezi_pref_dark', String(next));
      } catch {}
      return next;
    });
  };

  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('ezi_selected_language') ||
        localStorage.getItem('ezi_fast_language') ||
        localStorage.getItem('ezi_regular_language');
      if (saved === 'am' || saved === 'ti' || saved === 'om' || saved === 'en') return saved;
    }
    return 'am';
  });

  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangDropdownOpen(false);
      }
    };
    window.addEventListener('mousedown', handleClickOutside);
    return () => window.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUpdateLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsLangDropdownOpen(false);
    try {
      localStorage.setItem('ezi_selected_language', lang);
      localStorage.setItem('ezi_fast_language', lang);
      localStorage.setItem('ezi_regular_language', lang);
    } catch {}
  };

  // 1. Unified Authentication State (Fast Bingo and Regular Bingo share the exact same login/logout)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const reg = localStorage.getItem('ezi_phone_registered_v2');
      if (reg === 'true') return true;
      if (reg === 'false') return false;
      return hasDeviceRegisteredPhone();
    }
    return false;
  });

  // 2. Dedicated Admin Authentication & View Mode Separation
  // Never trust persistent localStorage in Chrome/browsers so regular players never see admin controls!
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('ezi_admin_authenticated_v2');
      } catch {}
      const path = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase();
      const isSecretAdminRoute =
        path.includes('/admin0923') ||
        path.endsWith('admin0923') ||
        h.includes('admin0923');
      if (isSecretAdminRoute) {
        try {
          return sessionStorage.getItem('ezi_admin_session_v3') === 'true';
        } catch {}
      }
    }
    return false;
  });

  const [viewMode, setViewMode] = useState<'game' | 'admin'>('game');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isAdminRulesModalOpen, setIsAdminRulesModalOpen] = useState(false);
  const [adminActivePatternId, setAdminActivePatternId] = useState<number>(1);
  const [adminControlGame, setAdminControlGame] = useState<'fast' | 'regular' | 'keno' | 'ramino'>('ramino');
  const [adminStakeTier, setAdminStakeTier] = useState<10 | 20 | 50 | 100>(10);
  const [adminFastRoomsByStake, setAdminFastRoomsByStake] = useState<Record<number, ServerRoomStatePayload>>({});
  const [adminFastLockedByStake, setAdminFastLockedByStake] = useState<Record<number, ServerLockedCartelaItem[]>>({});
  const [adminRegularRoom, setAdminRegularRoom] = useState<ServerRoomStatePayload | null>(null);
  const [adminRegularLocked, setAdminRegularLocked] = useState<ServerLockedCartelaItem[]>([]);

  useEffect(() => {
    try {
      localStorage.removeItem('ezi_admin_authenticated_v2');
      if (isAdminAuthenticated) {
        sessionStorage.setItem('ezi_admin_session_v3', 'true');
      } else {
        sessionStorage.removeItem('ezi_admin_session_v3');
      }
    } catch {}
  }, [isAdminAuthenticated]);

  const [showGameHub, setShowGameHub] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const explicitMode = params.get('mode') || params.get('game');
      if (
        params.has('raminoRoom') ||
        params.get('tab') === 'admin' ||
        params.get('direct') === '1' ||
        (explicitMode && ['fast', 'regular', 'keno', 'ramino'].includes(explicitMode))
      ) {
        return false;
      }
    }
    return true;
  });

  const tHub = HUB_T[language] || HUB_T.am;
  const [promoSlideIndex, setPromoSlideIndex] = useState(0);
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
  const [hubNotificationsOpen, setHubNotificationsOpen] = useState(false);
  const [hubNotice, setHubNotice] = useState<string | null>(null);
  const [isEditingHubName, setIsEditingHubName] = useState(false);
  const [hubNameDraft, setHubNameDraft] = useState('');
  const [isSavingHubName, setIsSavingHubName] = useState(false);
  const [activeGameNotification, setActiveGameNotification] =
    useState<GameStartNotificationEvent | null>(null);
  const [notificationHistory, setNotificationHistory] = useState<GameStartNotificationEvent[]>([]);
  const [hasUnreadNotifs, setHasUnreadNotifs] = useState(false);
  const hubMenuRef = useRef<HTMLDivElement | null>(null);
  const [liveGameCounts, setLiveGameCounts] = useState<{
    fast: number;
    regular: number;
    keno: number;
    ramino: number;
  }>({ fast: 0, regular: 0, keno: 0, ramino: 0 });

  const [gameVisibility, setGameVisibility] = useState<GameVisibilityMap>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sun_game_visibility_v1');
        if (saved) return { ...DEFAULT_GAME_VISIBILITY, ...JSON.parse(saved) };
      } catch {}
    }
    return DEFAULT_GAME_VISIBILITY;
  });

  const [heroBanners, setHeroBanners] = useState<HeroBannerAd[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sun_home_ads_v1');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  const [homeAdsEnabled, setHomeAdsEnabled] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sun_home_ads_enabled_v1');
        if (saved === 'false') return false;
      } catch {}
    }
    return true;
  });

  const lastHomeAdsWriteAtRef = useRef<number>(0);

  useEffect(() => {
    const fetchVisibility = () => {
      fetch(buildApiUrl('/api/games/visibility'))
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data.visibility) {
            const nextMap = { ...DEFAULT_GAME_VISIBILITY, ...data.visibility };
            setGameVisibility(nextMap);
            try {
              localStorage.setItem('sun_game_visibility_v1', JSON.stringify(nextMap));
            } catch {}
          }
        })
        .catch(() => {});
    };

    const fetchHomeAds = () => {
      const reqStartedAt = Date.now();
      fetch(buildApiUrl('/api/home-ads'))
        .then((r) => r.json())
        .then((data) => {
          if (lastHomeAdsWriteAtRef.current > reqStartedAt) return;
          if (data?.ok && typeof data.homeAdsEnabled === 'boolean') {
            setHomeAdsEnabled(data.homeAdsEnabled);
            try {
              localStorage.setItem('sun_home_ads_enabled_v1', String(data.homeAdsEnabled));
            } catch {}
          }
          const incomingAds = Array.isArray(data?.heroBanners)
            ? data.heroBanners
            : Array.isArray(data?.ads)
            ? data.ads
            : null;
          if (data?.ok && incomingAds) {
            setHeroBanners(incomingAds);
            try {
              localStorage.setItem('sun_home_ads_v1', JSON.stringify(incomingAds));
            } catch {}
          }
        })
        .catch(() => {});
    };

    fetchVisibility();
    fetchHomeAds();
    const syncTimer = window.setInterval(() => {
      fetchVisibility();
      fetchHomeAds();
    }, 30000);
    return () => window.clearInterval(syncTimer);
  }, []);

  const handleToggleHomeAdsEnabled = useCallback((nextEnabled: boolean) => {
    lastHomeAdsWriteAtRef.current = Date.now();
    setHomeAdsEnabled(nextEnabled);
    try {
      localStorage.setItem('sun_home_ads_enabled_v1', String(nextEnabled));
    } catch {}
    fetch(buildApiUrl('/api/home-ads'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ homeAdsEnabled: nextEnabled }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && typeof data.homeAdsEnabled === 'boolean') {
          setHomeAdsEnabled(data.homeAdsEnabled);
          try {
            localStorage.setItem('sun_home_ads_enabled_v1', String(data.homeAdsEnabled));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const persistHomeAdsToServer = useCallback((nextAds: HeroBannerAd[]) => {
    lastHomeAdsWriteAtRef.current = Date.now();
    setHeroBanners(nextAds);
    try {
      localStorage.setItem('sun_home_ads_v1', JSON.stringify(nextAds));
    } catch {}
    fetch(buildApiUrl('/api/home-ads'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heroBanners: nextAds }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.heroBanners)) {
          setHeroBanners(data.heroBanners);
          try {
            localStorage.setItem('sun_home_ads_v1', JSON.stringify(data.heroBanners));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleAddHeroBanner = useCallback(
    (banner: Omit<HeroBannerAd, 'id'>) => {
      setHeroBanners((prev) => {
        const next: HeroBannerAd[] = [
          ...prev,
          {
            ...banner,
            id: `ad_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          },
        ];
        persistHomeAdsToServer(next);
        return next;
      });
    },
    [persistHomeAdsToServer]
  );

  const handleUpdateHeroBanner = useCallback(
    (banner: HeroBannerAd) => {
      setHeroBanners((prev) => {
        const next = prev.map((b) => (b.id === banner.id ? banner : b));
        persistHomeAdsToServer(next);
        return next;
      });
    },
    [persistHomeAdsToServer]
  );

  const handleRemoveHeroBanner = useCallback(
    (id: string) => {
      setHeroBanners((prev) => {
        const next = prev.filter((b) => b.id !== id);
        persistHomeAdsToServer(next);
        return next;
      });
    },
    [persistHomeAdsToServer]
  );

  useEffect(() => {
    const handleHubMenuOutside = (e: MouseEvent) => {
      if (hubMenuRef.current && !hubMenuRef.current.contains(e.target as Node)) {
        setHubMenuOpen(false);
        setHubNotificationsOpen(false);
      }
    };
    window.addEventListener('mousedown', handleHubMenuOutside);
    return () => window.removeEventListener('mousedown', handleHubMenuOutside);
  }, []);

  const activeAdminAds = heroBanners.filter((b) => b.isActive !== false);
  const promoSlidesCount = activeAdminAds.length > 0 ? activeAdminAds.length : tHub.defaultSlides.length;

  useEffect(() => {
    if (!showGameHub || promoSlidesCount <= 1) return;
    const timer = window.setInterval(() => {
      setPromoSlideIndex((prev) => (prev + 1) % promoSlidesCount);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [showGameHub, promoSlidesCount]);

  useEffect(() => {
    if (!hubNotice) return;
    const t = window.setTimeout(() => setHubNotice(null), 3200);
    return () => window.clearTimeout(t);
  }, [hubNotice]);

  // Persistent Telegram Mini App Viewport Lock (prevent downward swipe-close or page jump)
  useEffect(() => {
    const lockTg = () => {
      try {
        const w = window as unknown as {
          Telegram?: {
            WebApp?: {
              ready?: () => void;
              expand?: () => void;
              disableVerticalSwipes?: () => void;
            };
          };
          TelegramWebviewProxy?: {
            postEvent?: (name: string, data: string) => void;
          };
        };
        w.Telegram?.WebApp?.ready?.();
        w.Telegram?.WebApp?.expand?.();
        w.Telegram?.WebApp?.disableVerticalSwipes?.();
        w.TelegramWebviewProxy?.postEvent?.('web_app_expand', '');
        w.TelegramWebviewProxy?.postEvent?.(
          'web_app_setup_swipe_behavior',
          JSON.stringify({ allow_vertical_swipe: false })
        );
      } catch {}
    };
    lockTg();
    const timer = window.setInterval(lockTg, 2000);
    window.addEventListener('focus', lockTg);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', lockTg);
    };
  }, []);

  // Active game mode: defaults to 'ramino' (SUN Ramino)
  const [gameMode, setGameMode] = useState<'fast' | 'regular' | 'keno' | 'ramino'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode') || params.get('game');
      if (mode === 'ramino' || params.has('raminoRoom')) return 'ramino';
      if (mode === 'keno') return 'keno';
      if (mode === 'regular') return 'regular';
      if (mode === 'fast') return 'fast';

      const saved = localStorage.getItem('ezi_bingo_active_mode');
      if (saved === 'ramino' || saved === 'keno' || saved === 'regular' || saved === 'fast') {
        return saved as 'fast' | 'regular' | 'keno' | 'ramino';
      }
    }
    return 'ramino';
  });

  const handleSwitchMode = (mode: 'fast' | 'regular' | 'keno' | 'ramino') => {
    const vis = gameVisibility[mode];
    if (vis && vis.visible === false) {
      setShowGameHub(true);
      setHubNotice(tHub.gameHiddenNotice);
      return;
    }
    if (vis && vis.comingSoon) {
      const titleMap: Record<string, string> = {
        fast: tHub.fastTitle,
        regular: tHub.regularTitle,
        keno: tHub.kenoTitle,
        ramino: tHub.raminoTitle,
      };
      setShowGameHub(true);
      setHubNotice(tHub.soonNotice(titleMap[mode] || mode));
      return;
    }
    scrollAppToTop();
    applyTelegramSwipeLock();
    setOpenSettingsTrigger(0);
    setGameMode(mode);
    setShowGameHub(false);
    setHubMenuOpen(false);
    try {
      localStorage.setItem('ezi_bingo_active_mode', mode);
      const url = new URL(window.location.href);
      url.searchParams.set('mode', mode);
      window.history.replaceState({}, '', url.toString());
    } catch {}
  };

  const handleReturnToHub = useCallback(() => {
    scrollAppToTop();
    applyTelegramSwipeLock();
    setShowGameHub(true);
    setHubMenuOpen(false);
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('mode');
      url.searchParams.delete('app');
      url.searchParams.delete('game');
      window.history.replaceState({}, '', url.toString());
    } catch {}
  }, []);

  // Auto-return player to Hub if Admin hides the currently open game
  useEffect(() => {
    if (isLoggedIn && viewMode === 'game' && !showGameHub) {
      const vis = gameVisibility[gameMode];
      if (vis && vis.visible === false) {
        handleReturnToHub();
        setHubNotice(tHub.gameHiddenNotice);
      }
    }
  }, [isLoggedIn, viewMode, showGameHub, gameMode, gameVisibility, handleReturnToHub, tHub.gameHiddenNotice]);

  // 3. Persistent Bank Accounts (Fetched from server /api/bank-accounts, saved to disk, and kept in sync)
  const [bankAccounts, setBankAccounts] = useState<BankPaymentAccount[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('ezi_bank_accounts_v2');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return PAYMENT_ACCOUNTS;
  });

  useEffect(() => {
    fetch(buildApiUrl('/api/bank-accounts'))
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok && Array.isArray(data.bankAccounts) && data.bankAccounts.length > 0) {
          setBankAccounts(data.bankAccounts);
          try {
            localStorage.setItem('ezi_bank_accounts_v2', JSON.stringify(data.bankAccounts));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveBankAccounts = useCallback((nextList: BankPaymentAccount[]) => {
    setBankAccounts(nextList);
    try {
      localStorage.setItem('ezi_bank_accounts_v2', JSON.stringify(nextList));
    } catch {}
    fetch(buildApiUrl('/api/bank-accounts'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bankAccounts: nextList }),
    }).catch(() => {});

    dispatchServerRoomAction({
      mode: 'fast',
      action: 'set_bank_accounts',
      bankAccounts: nextList,
    } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
    dispatchServerRoomAction({
      mode: 'regular',
      action: 'set_bank_accounts',
      bankAccounts: nextList,
    } as unknown as Parameters<typeof dispatchServerRoomAction>[0]);
  }, []);

  const handleAddBankAccount = useCallback(
    (bank: BankPaymentAccount) => {
      setBankAccounts((prev) => {
        const uniqueId = prev.some((b) => b.id === bank.id)
          ? `${bank.id}_${Date.now().toString().slice(-4)}`
          : bank.id;
        const next = [...prev, { ...bank, id: uniqueId }];
        handleSaveBankAccounts(next);
        return next;
      });
    },
    [handleSaveBankAccounts]
  );

  const handleUpdateBankAccount = useCallback(
    (bank: BankPaymentAccount) => {
      setBankAccounts((prev) => {
        const next = prev.map((b) => (b.id === bank.id ? bank : b));
        handleSaveBankAccounts(next);
        return next;
      });
    },
    [handleSaveBankAccounts]
  );

  const handleRemoveBankAccount = useCallback(
    (id: string) => {
      setBankAccounts((prev) => {
        const next = prev.filter((b) => b.id !== id);
        handleSaveBankAccounts(next);
        return next;
      });
    },
    [handleSaveBankAccounts]
  );

  // Dedicated Secret Admin Route: /admin0923 or #admin0923 (as requested: Sunbingo.onrender.com/admin0923)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkAdminRouteAndHash = () => {
      const path = window.location.pathname.toLowerCase();
      const h = window.location.hash.toLowerCase();
      const p = new URLSearchParams(window.location.search);

      // Save referral code if user clicked an invite link
      const refCode = p.get('ref') || p.get('invite');
      if (refCode) {
        try {
          localStorage.setItem('sun_referral_code', refCode);
        } catch {}
      }

      // Save pending Ramino private room invite code (URL or Telegram WebApp start_param) and switch directly to Ramino
      const tgStartParam =
        (window as unknown as { Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } } })
          ?.Telegram?.WebApp?.initDataUnsafe?.start_param || '';
      const startParamRoom = tgStartParam.toLowerCase().startsWith('ramino_')
        ? tgStartParam.slice(7)
        : '';
      const raminoRoom = p.get('raminoRoom') || startParamRoom;
      if (raminoRoom) {
        try {
          localStorage.setItem('sun_pending_ramino_room', raminoRoom.trim().toUpperCase());
        } catch {}
        setGameMode('ramino');
        setViewMode('game');
        setShowGameHub(false);
      }

      // Check strictly for dedicated secret admin path or hash: /admin0923 or #admin0923
      const isSecretAdminRoute =
        path.includes('/admin0923') ||
        path.endsWith('admin0923') ||
        h.includes('admin0923');

      if (isSecretAdminRoute) {
        const savedSession = sessionStorage.getItem('ezi_admin_session_v3');
        if (savedSession === 'true') {
          setIsAdminAuthenticated(true);
          setViewMode('admin');
        } else {
          setIsAdminModalOpen(true);
        }
      }
    };
    checkAdminRouteAndHash();
    window.addEventListener('hashchange', checkAdminRouteAndHash);
    window.addEventListener('popstate', checkAdminRouteAndHash);
    return () => {
      window.removeEventListener('hashchange', checkAdminRouteAndHash);
      window.removeEventListener('popstate', checkAdminRouteAndHash);
    };
  }, []);

  // Shared Birr Wallet and Users (single unified wallet across all games)
  const [sharedUsers, setSharedUsers] = useState<UserAccount[]>(() => {
    const devIdentity = getOrCreateDevicePlayerIdentity();
    let initialBalance = 0;
    if (typeof window !== 'undefined') {
      const phoneSaved = getLocalWalletBalanceByPhone(devIdentity.phone);
      const legacySaved = parseFloat(localStorage.getItem('sun_unified_wallet_balance_v1') || '');
      if (phoneSaved !== null) {
        initialBalance = phoneSaved;
      } else if (!Number.isNaN(legacySaved) && legacySaved >= 0) {
        initialBalance = legacySaved;
      }
    }
    return [
      {
        id: devIdentity.id,
        name: devIdentity.name || 'Sun Player',
        phone: devIdentity.phone || '0942742684',
        passwordHash: '****',
        balance: initialBalance,
        bonusBalance: 15.0,
        referralCode: devIdentity.referralCode,
        referredCount: 0,
        referralEarnings: 0,
        isBlocked: false,
        isAdmin: false,
        joinedAt: new Date().toISOString().slice(0, 10),
      },
    ];
  });

  const [sharedTransactions, setSharedTransactions] = useState<TransactionRecord[]>(() => {
    if (typeof window !== 'undefined') {
      return getLocalTransactionsCache() as TransactionRecord[];
    }
    return [];
  });
  const [requireDepositApproval, setRequireDepositApproval] = useState<boolean>(true);
  const [isGlobalWalletOpen, setIsGlobalWalletOpen] = useState<boolean>(false);
  const [globalWalletTab, setGlobalWalletTab] = useState<'deposit' | 'withdraw' | 'transfer' | 'history'>('deposit');
  const [globalWalletNotice, setGlobalWalletNotice] = useState<string | null>(null);

  // Reset scroll to top whenever navigating between Hub, Games, Settings, Wallet, or Admin
  useEffect(() => {
    const resetScrollTop = () => {
      scrollAppToTop();
      applyTelegramSwipeLock();
      try {
        document.querySelectorAll('[data-scroll-reset="true"]').forEach((el) => {
          (el as HTMLElement).scrollTop = 0;
        });
      } catch {}
    };
    resetScrollTop();
    const rafId = window.requestAnimationFrame(resetScrollTop);
    return () => window.cancelAnimationFrame(rafId);
  }, [isLoggedIn, showGameHub, gameMode, viewMode, isGlobalWalletOpen, globalWalletTab, openSettingsTrigger]);

  const sharedUsersRef = useRef<UserAccount[]>(sharedUsers);
  sharedUsersRef.current = sharedUsers;

  const openGlobalWallet = useCallback(
    (tab: 'deposit' | 'withdraw' | 'transfer' | 'history' = 'deposit') => {
      setGlobalWalletTab(tab);
      setGlobalWalletNotice(null);
      setIsGlobalWalletOpen(true);
    },
    []
  );

  const mergeGlobalTransactions = useCallback((serverTxs: TransactionRecord[]) => {
    if (!Array.isArray(serverTxs)) return;
    setSharedTransactions((prev) => {
      const seen = new Set<string>();
      const combined: TransactionRecord[] = [];
      for (const tx of serverTxs) {
        if (!tx?.id || seen.has(tx.id)) continue;
        seen.add(tx.id);
        combined.push(tx);
      }
      for (const tx of prev) {
        if (!tx?.id || seen.has(tx.id)) continue;
        // Keep optimistic local txs only briefly if not replaced yet
        if (!tx.id.startsWith('gtx-') && !tx.id.startsWith('ftx-')) continue;
        seen.add(tx.id);
        combined.push(tx);
      }
      const sliced = combined.slice(0, 600);
      saveLocalTransactionsCache(sliced);
      return sliced;
    });
  }, []);

  const recordGameWalletDelta = useCallback(
    (delta: number, game: 'keno' | 'ramino', reason?: string) => {
      if (!Number.isFinite(delta) || delta === 0) return;
      const curUser = sharedUsersRef.current[0];
      const tempId = `gtx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const txType: 'bet' | 'win' = delta < 0 ? 'bet' : 'win';
      const methodLabel = game === 'keno' ? 'Fast Keno' : 'SUN Ramino';

      setSharedUsers((prev) =>
        prev.map((u, idx) => {
          if (idx !== 0) return u;
          const nextBalance = Math.max(0, Number((u.balance + delta).toFixed(2)));
          const prevWithdrawable = Math.max(0, Math.min(u.balance, Number(u.withdrawableBalance ?? 0)));
          const lockedBonus = Math.min(nextBalance, Math.max(0, Number(u.nonWithdrawableBonus ?? u.bonusBalance ?? 0)));
          const maxCashAllowed = Math.max(0, Number((nextBalance - lockedBonus).toFixed(2)));
          const isWinDelta = delta > 0 && !/refund|revert|cancel/i.test(reason || '');
          const nextWithdrawable = isWinDelta
            ? maxCashAllowed
            : Math.min(maxCashAllowed, prevWithdrawable);
          return { ...u, balance: nextBalance, withdrawableBalance: nextWithdrawable };
        })
      );

      if (curUser) {
        const optimisticTx: TransactionRecord = {
          id: tempId,
          userId: curUser.id,
          userName: curUser.name,
          userPhone: curUser.phone,
          type: txType,
          method: methodLabel,
          amount: Math.abs(Number(delta.toFixed(2))),
          referenceNumber: reason || (txType === 'bet' ? `${methodLabel} Bet` : `${methodLabel} Win`),
          status: 'approved',
          timestamp: new Date().toLocaleString(),
        };
        setSharedTransactions((prev) => [optimisticTx, ...prev].slice(0, 600));
      }

      if (curUser?.phone) {
        fetch(buildApiUrl('/api/wallet/game-tx'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: curUser.phone,
            name: curUser.name,
            delta,
            game,
            reason,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            if (data?.ok && data.transaction) {
              setSharedTransactions((prev) => {
                const filtered = prev.filter((t) => t.id !== tempId && t.id !== data.transaction.id);
                return [data.transaction as TransactionRecord, ...filtered].slice(0, 600);
              });
            }
            if (data?.ok && typeof data.withdrawableBalance === 'number') {
              setSharedUsers((prev) =>
                prev.map((u, idx) =>
                  idx === 0
                    ? {
                        ...u,
                        balance: typeof data.balance === 'number' ? data.balance : u.balance,
                        withdrawableBalance: data.withdrawableBalance,
                      }
                    : u
                )
              );
            }
            if (data?.ok && data.accountToken && curUser?.phone) {
              saveSignedAccountToken(curUser.phone, data.accountToken);
            }
          })
          .catch(() => {});
      }
    },
    []
  );

  const currentUserPhone = sharedUsers[0]?.phone;
  const currentUserBalance = sharedUsers[0]?.balance;

  // Persist unified wallet locally (globally + per-phone) whenever it changes
  useEffect(() => {
    if (typeof currentUserBalance === 'number' && !Number.isNaN(currentUserBalance)) {
      try {
        localStorage.setItem('sun_unified_wallet_balance_v1', String(currentUserBalance));
        if (currentUserPhone) {
          saveLocalWalletBalanceByPhone(currentUserPhone, currentUserBalance);
        }
      } catch {}
    }
  }, [currentUserBalance, currentUserPhone]);

  // Subscribe to real-time game start & admin notifications
  useEffect(() => {
    if (!isLoggedIn) return;
    let hideTimer: number | null = null;
    const unsubNotify = subscribeGameNotifications((notif) => {
      setActiveGameNotification(notif);
      setNotificationHistory((prev) => [notif, ...prev].slice(0, 15));
      setHasUnreadNotifs(true);
      if (hideTimer) window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => {
        setActiveGameNotification(null);
      }, 8000);
    });
    return () => {
      unsubNotify();
      if (hideTimer) window.clearTimeout(hideTimer);
    };
  }, [isLoggedIn]);

  // Keep unified wallet, username, bank accounts & session recovery synced across all games
  useEffect(() => {
    if (!isLoggedIn) return;
    const clientId = getDeviceClientId();
    const curPhone = sharedUsersRef.current[0]?.phone || '';
    const curName = sharedUsersRef.current[0]?.name || 'Sun Player';
    const phoneParam = encodeURIComponent(curPhone);
    const nameParam = encodeURIComponent(curName);
    let isCancelled = false;

    const runInitialSync = async () => {
      let accountToken = curPhone ? getSignedAccountToken(curPhone) : '';
      if (!accountToken && curPhone) {
        accountToken = await recoverSignedAccountTokenFromCloudStorage(curPhone);
      }
      if (isCancelled) return;

      if (curPhone && accountToken) {
        fetch(buildApiUrl('/api/auth/restore-session'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            phone: curPhone,
            name: curName,
            accountToken,
          }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (isCancelled) return;
            if (res?.ok && res.player) {
              if (res.accountToken) {
                saveSignedAccountToken(res.player.phone, res.accountToken);
              }
              saveDevicePlayerIdentity(res.player.name, res.player.phone);
              if (typeof res.player.balance === 'number') {
                saveLocalWalletBalanceByPhone(res.player.phone, res.player.balance);
              }
              setSharedUsers((prev) =>
                prev.map((u, idx) =>
                  idx === 0
                    ? {
                        ...u,
                        name: res.player.name || u.name,
                        phone: res.player.phone || u.phone,
                        balance:
                          typeof res.player.balance === 'number' ? res.player.balance : u.balance,
                        withdrawableBalance:
                          typeof res.player.withdrawableBalance === 'number'
                            ? res.player.withdrawableBalance
                            : u.withdrawableBalance,
                        bonusBalance:
                          typeof res.player.bonusBalance === 'number'
                            ? res.player.bonusBalance
                            : u.bonusBalance,
                        isBlocked: !!res.player.isBlocked,
                      }
                    : u
                )
              );
            }
          })
          .catch(() => {});
      }

      fetch(
        buildApiUrl(
          `/api/live-room/state?mode=fast&phone=${phoneParam}&name=${nameParam}&clientId=${encodeURIComponent(
            clientId
          )}${accountToken ? `&accountToken=${encodeURIComponent(accountToken)}` : ''}`
        ),
        {
          headers: accountToken ? { 'x-account-token': accountToken } : undefined,
        }
      )
        .then((r) => r.json())
        .then((data) => {
          if (isCancelled || !data?.ok) return;
        if (data.fastRoomsByStake) {
          setAdminFastRoomsByStake(data.fastRoomsByStake);
        } else if (data.fastRoom) {
          setAdminFastRoomsByStake((prev) => ({ ...prev, [data.fastRoom.stakeAmount || 10]: data.fastRoom }));
        }
        if (data.fastLockedCartelasByStake) {
          setAdminFastLockedByStake(data.fastLockedCartelasByStake);
        }
        if (data.regularRoom) {
          setAdminRegularRoom(data.regularRoom);
          if (typeof data.regularRoom.activePatternId === 'number') {
            setAdminActivePatternId(data.regularRoom.activePatternId);
          }
        }
        if (Array.isArray(data.regularLockedCartelas)) {
          setAdminRegularLocked(data.regularLockedCartelas);
        }
        if (data.accountToken && data.player?.phone) {
          saveSignedAccountToken(data.player.phone, data.accountToken);
        }
        if (typeof data.requireDepositApproval === 'boolean') {
          setRequireDepositApproval(data.requireDepositApproval);
        }
        if (typeof data.homeAdsEnabled === 'boolean') {
          setHomeAdsEnabled(data.homeAdsEnabled);
          try {
            localStorage.setItem('sun_home_ads_enabled_v1', String(data.homeAdsEnabled));
          } catch {}
        }
        const incomingBanks =
          (Array.isArray(data.bankAccounts) && data.bankAccounts.length > 0 && data.bankAccounts) ||
          (Array.isArray(data.fastRoom?.bankAccounts) &&
            data.fastRoom.bankAccounts.length > 0 &&
            data.fastRoom.bankAccounts) ||
          (Array.isArray(data.regularRoom?.bankAccounts) &&
            data.regularRoom.bankAccounts.length > 0 &&
            data.regularRoom.bankAccounts) ||
          null;
        if (incomingBanks) {
          setBankAccounts(incomingBanks);
          try {
            localStorage.setItem('ezi_bank_accounts_v2', JSON.stringify(incomingBanks));
          } catch {}
        }
        if (Array.isArray(data.transactions)) {
          mergeGlobalTransactions(data.transactions);
        }
        if (Array.isArray(data.players) && data.players.length > 0) {
          const syncedPlayers = data.players as NonNullable<
            Parameters<Parameters<typeof subscribeRealtimeRoomSync>[0]>[0]['players']
          >;
          setSharedUsers((prev) => {
            const myPhone = prev[0]?.phone;
            if (!myPhone) return prev;
            const serverMe = syncedPlayers.find((p) => p.phone === myPhone);
            if (serverMe?.name && serverMe.name !== prev[0].name) {
              saveDevicePlayerIdentity(serverMe.name, myPhone);
            }
            const others = syncedPlayers
              .filter((p) => p.phone !== myPhone)
              .map((p, idx) => ({
                id: p.id || `u-${p.phone || idx}`,
                name: p.name || `User_${idx}`,
                phone: p.phone || `091100000${idx}`,
                passwordHash: '****',
                balance: typeof p.balance === 'number' ? p.balance : 0,
                withdrawableBalance:
                  typeof p.withdrawableBalance === 'number' ? p.withdrawableBalance : 0,
                bonusBalance: typeof p.bonusBalance === 'number' ? p.bonusBalance : 0,
                referralCode: `SUN${(p.phone || '0000').slice(-4)}`,
                referredCount: 0,
                referralEarnings: 0,
                isBlocked: !!p.isBlocked,
                isAdmin: false,
                joinedAt: new Date().toISOString().slice(0, 10),
              }));
            const updatedMe = serverMe
              ? {
                  ...prev[0],
                  name: serverMe.name || prev[0].name,
                  balance: typeof serverMe.balance === 'number' ? serverMe.balance : prev[0].balance,
                  withdrawableBalance:
                    typeof serverMe.withdrawableBalance === 'number'
                      ? serverMe.withdrawableBalance
                      : prev[0].withdrawableBalance,
                  bonusBalance:
                    typeof serverMe.bonusBalance === 'number' ? serverMe.bonusBalance : prev[0].bonusBalance,
                  isBlocked: !!serverMe.isBlocked,
                }
              : prev[0];
            return [updatedMe, ...others];
          });
        }
      })
      .catch(() => {});
    };

    void runInitialSync();

    const unsubscribe = subscribeRealtimeRoomSync((msg) => {
      if (msg?.fastRoomsByStake) {
        setAdminFastRoomsByStake(msg.fastRoomsByStake);
      } else if (msg?.fastRoom) {
        setAdminFastRoomsByStake((prev) => ({
          ...prev,
          [msg.fastRoom.stakeAmount || 10]: msg.fastRoom,
        }));
      }
      if (msg?.fastLockedCartelasByStake) {
        setAdminFastLockedByStake(msg.fastLockedCartelasByStake);
      }
      if (msg?.regularRoom) {
        setAdminRegularRoom(msg.regularRoom);
        if (typeof msg.regularRoom.activePatternId === 'number') {
          setAdminActivePatternId(msg.regularRoom.activePatternId);
        }
      }
      if (Array.isArray(msg?.regularLockedCartelas)) {
        setAdminRegularLocked(msg.regularLockedCartelas);
      }
      if (typeof msg?.requireDepositApproval === 'boolean') {
        setRequireDepositApproval(msg.requireDepositApproval);
      }
      if (typeof msg?.homeAdsEnabled === 'boolean') {
        setHomeAdsEnabled(msg.homeAdsEnabled);
        try {
          localStorage.setItem('sun_home_ads_enabled_v1', String(msg.homeAdsEnabled));
        } catch {}
      }
      if (Array.isArray(msg?.homeHeroAds)) {
        setHeroBanners(msg.homeHeroAds);
        try {
          localStorage.setItem('sun_home_ads_v1', JSON.stringify(msg.homeHeroAds));
        } catch {}
      }
      const msgBanks =
        (Array.isArray(msg?.fastRoom?.bankAccounts) &&
          msg.fastRoom.bankAccounts.length > 0 &&
          msg.fastRoom.bankAccounts) ||
        (Array.isArray(msg?.regularRoom?.bankAccounts) &&
          msg.regularRoom.bankAccounts.length > 0 &&
          msg.regularRoom.bankAccounts) ||
        null;
      if (msgBanks) {
        setBankAccounts(msgBanks);
        try {
          localStorage.setItem('ezi_bank_accounts_v2', JSON.stringify(msgBanks));
        } catch {}
      }
      if (Array.isArray(msg?.transactions)) {
        mergeGlobalTransactions(msg.transactions);
      }
      if (msg?.type === 'room:sync' && Array.isArray(msg.players) && msg.players.length > 0) {
        const syncedPlayers = msg.players;
        setSharedUsers((prev) => {
          const myPhone = prev[0]?.phone;
          if (!myPhone) return prev;
          const serverMe = syncedPlayers.find((p) => p.phone === myPhone);
          if (serverMe?.name && serverMe.name !== prev[0].name) {
            saveDevicePlayerIdentity(serverMe.name, myPhone);
          }
          const others = syncedPlayers
            .filter((p) => p.phone !== myPhone)
            .map((p, idx) => ({
              id: p.id || `u-${p.phone || idx}`,
              name: p.name || `User_${idx}`,
              phone: p.phone || `091100000${idx}`,
              passwordHash: '****',
              balance: typeof p.balance === 'number' ? p.balance : 0,
              withdrawableBalance:
                typeof p.withdrawableBalance === 'number' ? p.withdrawableBalance : 0,
              bonusBalance: typeof p.bonusBalance === 'number' ? p.bonusBalance : 0,
              referralCode: `SUN${(p.phone || '0000').slice(-4)}`,
              referredCount: 0,
              referralEarnings: 0,
              isBlocked: !!p.isBlocked,
              isAdmin: false,
              joinedAt: new Date().toISOString().slice(0, 10),
            }));
          const updatedMe = serverMe
            ? {
                ...prev[0],
                name: serverMe.name || prev[0].name,
                balance: typeof serverMe.balance === 'number' ? serverMe.balance : prev[0].balance,
                withdrawableBalance:
                  typeof serverMe.withdrawableBalance === 'number'
                    ? serverMe.withdrawableBalance
                    : prev[0].withdrawableBalance,
                bonusBalance:
                  typeof serverMe.bonusBalance === 'number' ? serverMe.bonusBalance : prev[0].bonusBalance,
                isBlocked: !!serverMe.isBlocked,
              }
            : prev[0];
          return [updatedMe, ...others];
        });
      }
    });
    return () => {
      isCancelled = true;
      unsubscribe();
    };
  }, [isLoggedIn, mergeGlobalTransactions]);

  const refreshAdminLiveState = useCallback(() => {
    const clientId = getDeviceClientId();
    const curPhone = sharedUsersRef.current[0]?.phone || '';
    const accountToken = curPhone ? getSignedAccountToken(curPhone) : '';
    fetch(
      buildApiUrl(
        `/api/live-room/state?mode=fast&stake=${adminStakeTier}&phone=${encodeURIComponent(
          curPhone
        )}&clientId=${encodeURIComponent(clientId)}`
      ),
      {
        headers: accountToken ? { 'x-account-token': accountToken } : undefined,
      }
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data?.ok) return;
        if (data.fastRoomsByStake) setAdminFastRoomsByStake(data.fastRoomsByStake);
        if (data.fastLockedCartelasByStake) setAdminFastLockedByStake(data.fastLockedCartelasByStake);
        if (data.regularRoom) {
          setAdminRegularRoom(data.regularRoom);
          if (typeof data.regularRoom.activePatternId === 'number') {
            setAdminActivePatternId(data.regularRoom.activePatternId);
          }
        }
        if (Array.isArray(data.regularLockedCartelas)) {
          setAdminRegularLocked(data.regularLockedCartelas);
        }
        if (typeof data.requireDepositApproval === 'boolean') {
          setRequireDepositApproval(data.requireDepositApproval);
        }
        if (Array.isArray(data.transactions)) {
          mergeGlobalTransactions(data.transactions);
        }
      })
      .catch(() => {});
  }, [adminStakeTier, mergeGlobalTransactions]);

  // Report live player presence heartbeat & poll accurate live counts on Home Hub
  useEffect(() => {
    if (!isLoggedIn) return;
    const clientId = getDeviceClientId();
    const activeGameKey = viewMode === 'admin' ? 'hub' : showGameHub ? 'hub' : gameMode;
    const sendPresence = () => {
      fetch(buildApiUrl('/api/games/presence'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          game: activeGameKey,
          phone: currentUserPhone,
        }),
      }).catch(() => {});
    };
    sendPresence();
    const timer = window.setInterval(sendPresence, 25000);
    return () => window.clearInterval(timer);
  }, [isLoggedIn, showGameHub, gameMode, viewMode, currentUserPhone]);

  useEffect(() => {
    if (!isLoggedIn || !showGameHub) return;
    const fetchCounts = () => {
      fetch(buildApiUrl('/api/games/live-counts'))
        .then((r) => r.json())
        .then((data) => {
          if (data?.ok && data.counts) {
            setLiveGameCounts({
              fast: Number(data.counts.fast || 0),
              regular: Number(data.counts.regular || 0),
              keno: Number(data.counts.keno || 0),
              ramino: Number(data.counts.ramino || 0),
            });
          }
        })
        .catch(() => {});
    };
    fetchCounts();
    const timer = window.setInterval(fetchCounts, 15000);
    return () => window.clearInterval(timer);
  }, [isLoggedIn, showGameHub]);

  // Unified Logout Function
  const handleLogout = () => {
    try {
      localStorage.setItem('ezi_phone_registered_v2', 'false');
      localStorage.removeItem('ezi_player_auth_session');
      localStorage.removeItem('ezi_admin_authenticated_v2');
      sessionStorage.removeItem('ezi_admin_session_v3');
    } catch {}
    setIsAdminAuthenticated(false);
    setIsLoggedIn(false);
    setViewMode('game');
  };

  // Unified Auth Success Function
  const handleAuthSuccess = (
    player: AuthenticatedPlayerPayload,
    allPlayers?: AuthenticatedPlayerPayload[]
  ) => {
    try {
      localStorage.setItem('ezi_phone_registered_v2', 'true');
      if (localStorage.getItem('sun_pending_ramino_room')) {
        setGameMode('ramino');
        setViewMode('game');
        setShowGameHub(false);
      }
    } catch {}
    saveDevicePlayerIdentity(player.name, player.phone);
    if (player.accountToken) {
      saveSignedAccountToken(player.phone, player.accountToken);
    }
    if (typeof player.balance === 'number') {
      saveLocalWalletBalanceByPhone(player.phone, player.balance);
    }
    setIsLoggedIn(true);

    setSharedUsers((prev) => {
      const me = prev[0];
      const updatedMe: UserAccount = {
        ...(me || {
          id: player.id || `u-${player.phone}`,
          referralCode: `SUN${player.phone.slice(-4)}`,
          referredCount: 0,
          referralEarnings: 0,
          isBlocked: false,
          isAdmin: false,
          joinedAt: new Date().toISOString().slice(0, 10),
        }),
        name: player.name,
        phone: player.phone,
        passwordHash: player.passwordHash || me?.passwordHash || '****',
        balance: typeof player.balance === 'number' ? player.balance : me?.balance ?? 0,
        withdrawableBalance:
          typeof player.withdrawableBalance === 'number'
            ? player.withdrawableBalance
            : me?.withdrawableBalance ?? 0,
        bonusBalance:
          typeof player.bonusBalance === 'number' ? player.bonusBalance : me?.bonusBalance ?? 15,
      };

      if (allPlayers && Array.isArray(allPlayers) && allPlayers.length > 0) {
        const others = allPlayers
          .filter((p) => p.phone !== player.phone)
          .map((p, idx) => ({
            id: p.id || `u-${p.phone || idx}`,
            name: p.name || `User_${idx}`,
            phone: p.phone || `091100000${idx}`,
            passwordHash: '****',
            balance: typeof p.balance === 'number' ? p.balance : 0,
            withdrawableBalance:
              typeof p.withdrawableBalance === 'number' ? p.withdrawableBalance : 0,
            bonusBalance: typeof p.bonusBalance === 'number' ? p.bonusBalance : 0,
            referralCode: `SUN${(p.phone || '0000').slice(-4)}`,
            referredCount: 0,
            referralEarnings: 0,
            isBlocked: !!p.isBlocked,
            isAdmin: false,
            joinedAt: new Date().toISOString().slice(0, 10),
          }));
        return [updatedMe, ...others];
      }
      return prev.map((u, i) => (i === 0 ? updatedMe : u));
    });
  };

  // Inline Home Hub Menu Username Save Handler (syncs to backend & all games)
  const handleSaveHubUsername = useCallback(async () => {
    const me = sharedUsersRef.current[0];
    const cleanName = hubNameDraft.trim();
    if (!me || cleanName.length < 2 || isSavingHubName) return;
    setIsSavingHubName(true);
    try {
      const accountToken = getSignedAccountToken(me.phone);
      const res = await fetch(buildApiUrl('/api/player/update-profile'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: me.phone,
          name: cleanName,
          accountToken: accountToken || undefined,
        }),
      });
      const data = await res.json();
      if (data?.ok) {
        const finalName = data.player?.name || cleanName;
        saveDevicePlayerIdentity(finalName, me.phone);
        if (data.accountToken) {
          saveSignedAccountToken(me.phone, data.accountToken);
        }
        setSharedUsers((prev) =>
          prev.map((u, idx) => (idx === 0 ? { ...u, name: finalName } : u))
        );
        setIsEditingHubName(false);
        setHubNotice(`✅ የመጫወቻ ስምዎ ወደ "${finalName}" ተቀይሯል (ሁሉም ጨዋታዎች ላይ ተስተካክሏል)!`);
      } else {
        setHubNotice(data?.error || '❌ ስሙን መቀየር አልተቻለም።');
      }
    } catch {
      saveDevicePlayerIdentity(cleanName, me.phone);
      setSharedUsers((prev) =>
        prev.map((u, idx) => (idx === 0 ? { ...u, name: cleanName } : u))
      );
      setIsEditingHubName(false);
      setHubNotice(`✅ የመጫወቻ ስምዎ ወደ "${cleanName}" ተቀይሯል!`);
    } finally {
      setIsSavingHubName(false);
    }
  }, [hubNameDraft, isSavingHubName]);

  // Admin Panel states
  const [adminCallSpeed, setAdminCallSpeed] = useState<CallSpeed>(3);
  const [adminIsPlaying, setAdminIsPlaying] = useState<boolean>(false);
  const [adminIsPaused, setAdminIsPaused] = useState<boolean>(false);

  const languagesList: { code: Language; label: string; flag: string }[] = [
    { code: 'am', label: 'አማርኛ', flag: '🇪🇹' },
    { code: 'ti', label: 'ትግርኛ', flag: '🇪🇹' },
    { code: 'om', label: 'Afaan Oromoo', flag: '🇪🇹' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
  ];

  return (
    <div
      className={`min-h-full font-sans flex flex-col transition-colors overscroll-y-contain ${
        isDark
          ? 'bg-[#050B16] text-slate-100 selection:bg-amber-500 selection:text-slate-950'
          : 'bg-slate-100 text-slate-900 selection:bg-blue-500 selection:text-white'
      }`}
    >
      {/* =========================================================================
          TOP NAVIGATION BAR
          Rules per user request:
          1. When LOGGED OUT (!isLoggedIn):
             Hide ALL game switchers (Fast/Regular), settings, cartelas.
             Keep ONLY Logo + Language Selector + Light/Dark Theme toggle.
          2. When LOGGED IN (isLoggedIn) in Game Mode:
             Show Game Switcher (Fast/Regular), Theme, Language, Settings, Logout.
          3. When in ADMIN MODE (viewMode === 'admin'):
             Show "Back to Game" (ወደ ጨዋታው ተመለስ), Admin Logout, Language, Theme.
         ========================================================================= */}
      {(!isLoggedIn || viewMode === 'admin') && (
      <nav
        className={`px-3 sm:px-5 py-2 flex items-center justify-between z-40 backdrop-blur-md sticky top-0 border-b transition-colors shadow-sm ${
          isDark
            ? 'bg-[#0B1120]/95 border-slate-800/80 text-slate-100'
            : 'bg-white/95 border-slate-200 text-slate-900'
        }`}
      >
        {/* Left: Back to Hub + App Wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          {isLoggedIn && viewMode === 'game' && (
            <button
              type="button"
              onClick={handleReturnToHub}
              className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border transition-colors cursor-pointer ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700/80 text-amber-400'
                  : 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-800'
              }`}
              title={tHub.gamesBtn}
            >
              <Home className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tHub.gamesBtn}</span>
            </button>
          )}
          <button
            type="button"
            onClick={isLoggedIn && viewMode === 'game' ? handleReturnToHub : undefined}
            className="font-black text-sm sm:text-base tracking-tight flex items-center gap-1 select-none cursor-pointer whitespace-nowrap"
          >
            <span className="text-amber-400">SUN</span>
            <span className="text-sky-400">GAMES</span>
          </button>

          {viewMode === 'admin' ? (
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[11px] font-black flex items-center gap-1">
              <Shield className="w-3 h-3" />
              <span>{tHub.adminPortal}</span>
            </span>
          ) : isLoggedIn ? (
            <span
              className={`text-xs hidden sm:inline ${
                isDark ? 'text-slate-600' : 'text-slate-300'
              }`}
            >
              |
            </span>
          ) : null}
        </div>

        {/* Center / Right Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* A. If ADMIN MODE: Prominent Back to Game Button */}
          {viewMode === 'admin' && (
            <button
              type="button"
              onClick={() => setViewMode('game')}
              className="px-3 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
            >
              <Gamepad2 className="w-3.5 h-3.5 fill-slate-950" />
              <span>{tHub.backToGame}</span>
            </button>
          )}

          {/* B. If LOGGED IN and in Game Mode: Show Fast Bingo / Regular Bingo switcher */}
          {isLoggedIn && viewMode === 'game' && (
            <div
              className={`flex items-center p-0.5 rounded-xl border transition-colors shadow-inner ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-200/80 border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => handleSwitchMode('fast')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  gameMode === 'fast'
                    ? isDark
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20'
                      : 'bg-amber-500 text-slate-950 shadow-xs'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                }`}
              >
                <Zap
                  className={`w-3 h-3 ${
                    gameMode === 'fast'
                      ? 'fill-slate-950 text-slate-950'
                      : isDark
                      ? 'text-amber-400'
                      : 'text-amber-600'
                  }`}
                />
                <span className="hidden sm:inline">Fast</span>
                <span>Bingo</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('regular')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  gameMode === 'regular'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/20'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                }`}
              >
                <Gamepad2 className="w-3 h-3" />
                <span className="hidden sm:inline">Regular</span>
                <span>70k</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('keno')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  gameMode === 'keno'
                    ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                }`}
                title="ፈጣን ኬኖ (Fast Keno 80)"
              >
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span>Keno</span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchMode('ramino')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  gameMode === 'ramino'
                    ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-amber-500 text-slate-950 font-black shadow-md shadow-emerald-500/20 ring-1 ring-amber-400'
                    : isDark
                    ? 'text-amber-400 hover:text-amber-200 hover:bg-slate-800/60'
                    : 'text-amber-600 hover:text-amber-900 hover:bg-slate-300/50'
                }`}
                title="SUN Ramino (SUN ራሚኖ)"
              >
                <span className="text-xs">♠</span>
                <span>Ramino</span>
              </button>
            </div>
          )}

          {/* C. ALWAYS VISIBLE: Language Selector (ቋንቋ እንዳይጠፋ) */}
          <div className="relative" ref={langDropdownRef}>
            <button
              type="button"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
              className={`px-2 py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800'
              }`}
              title={tHub.selectLanguage}
            >
              <Globe className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span className="text-[11px] font-extrabold uppercase">{language}</span>
              <ChevronDown className="w-3 h-3 opacity-60" />
            </button>

            {isLangDropdownOpen && (
              <div
                className={`absolute right-0 mt-1.5 w-36 rounded-2xl border shadow-xl py-1 z-50 overflow-hidden ${
                  isDark
                    ? 'bg-slate-900 border-slate-700 text-slate-100'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              >
                {languagesList.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => handleUpdateLanguage(l.code)}
                    className={`w-full px-3 py-1.5 text-xs font-bold text-left flex items-center justify-between cursor-pointer transition-colors ${
                      language === l.code
                        ? 'bg-amber-500/20 text-amber-400 font-black'
                        : isDark
                        ? 'hover:bg-slate-800 text-slate-300'
                        : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{l.label}</span>
                    <span className="text-[10px]">{l.flag}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* D. ALWAYS VISIBLE: Light / Dark Mode Toggle */}
          <button
            type="button"
            onClick={handleToggleTheme}
            className={`p-1.5 sm:px-2 sm:py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
              isDark
                ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-amber-400'
                : 'bg-white hover:bg-slate-100 border-slate-300 hover:border-slate-400 text-slate-700'
            }`}
            title={isDark ? tHub.lightTheme : tHub.darkTheme}
            aria-label={isDark ? tHub.lightTheme : tHub.darkTheme}
          >
            {isDark ? (
              <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            ) : (
              <Moon className="w-3.5 h-3.5 text-slate-700 shrink-0" />
            )}
            <span className="hidden md:inline">{isDark ? tHub.lightShort : tHub.darkShort}</span>
          </button>

          {/* E. Settings Button (Only when Logged In) */}
          {isLoggedIn && viewMode === 'game' && (
            <button
              type="button"
              onClick={() => setOpenSettingsTrigger((prev) => prev + 1)}
              className={`p-1.5 sm:px-2.5 sm:py-1 rounded-xl text-xs font-black flex items-center gap-1 border transition-all cursor-pointer shadow-xs active:scale-95 ${
                isDark
                  ? 'bg-slate-900 hover:bg-slate-800 border-slate-700 hover:border-amber-400 text-amber-400'
                  : 'bg-white hover:bg-slate-100 border-slate-300 hover:border-slate-400 text-slate-700'
              }`}
              title={tHub.settings}
            >
              <Sliders className="w-3.5 h-3.5 shrink-0" />
              <span className="hidden sm:inline">{tHub.settings}</span>
            </button>
          )}

          {/* G. Admin Mode Exit / Logout */}
          {viewMode === 'admin' && (
            <button
              type="button"
              onClick={() => {
                setIsAdminAuthenticated(false);
                setViewMode('game');
                try {
                  localStorage.removeItem('ezi_admin_authenticated_v2');
                  sessionStorage.removeItem('ezi_admin_session_v3');
                } catch {}
                window.location.hash = '';
              }}
              className="px-2.5 py-1 rounded-xl text-xs font-black bg-rose-500/20 border border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
              title={tHub.adminLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{tHub.adminLogout}</span>
            </button>
          )}
        </div>
      </nav>
      )}

      {/* =========================================================================
          MAIN BODY CONTAINER
         ========================================================================= */}
      <div className="flex-1 flex flex-col relative z-10">
        {/* 1. LOGGED-OUT STATE: ONLY Auth Card (Login, Register with OTP, Forgot Password with OTP) */}
        {!isLoggedIn && viewMode !== 'admin' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 my-auto">
            <PlayerAuthScreen
              inlineMode={true}
              isDark={isDark}
              appTitle="SUN GAMES"
              language={language}
              onChangeLanguage={handleUpdateLanguage}
              onAuthSuccess={handleAuthSuccess}
            />
          </div>
        ) : viewMode === 'admin' ? (
          /* 2. DEDICATED ADMIN PORTAL VIEW (Strictly separated from normal player game) */
          <div className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 via-orange-500/10 to-amber-500/20 border border-amber-500/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  👑
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-black text-amber-400">
                    SUN GAMES — {tHub.adminControlTitle}
                  </h1>
                  <p className="text-xs text-slate-400">{tHub.adminControlSubtitle}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewMode('game')}
                className="px-4 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400 flex items-center gap-1.5 cursor-pointer shadow-md transition-all active:scale-95"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>{tHub.backToGame}</span>
              </button>
            </div>

            {(() => {
              const curAdminMode: 'fast' | 'regular' =
                adminControlGame === 'regular' ? 'regular' : 'fast';
              const curRoom =
                curAdminMode === 'regular'
                  ? adminRegularRoom
                  : adminFastRoomsByStake[adminStakeTier];
              const curLocked =
                curAdminMode === 'regular'
                  ? adminRegularLocked
                  : adminFastLockedByStake[adminStakeTier] || [];
              const livePatternId = curRoom?.activePatternId ?? adminActivePatternId;
              const liveStake =
                curRoom?.stakeAmount ?? (curAdminMode === 'regular' ? 10 : adminStakeTier);
              const livePrize =
                curRoom?.prizeAmount ??
                (curAdminMode === 'regular'
                  ? 500
                  : Number((Math.max(1, curLocked.length) * adminStakeTier * 0.8).toFixed(0)));
              const liveSpeed = ((curRoom?.callSpeedSec ?? adminCallSpeed) as CallSpeed);

              return (
                <AdminPanelView
                  isAdminAuthenticated={isAdminAuthenticated}
                  onAdminLogout={() => {
                    setIsAdminAuthenticated(false);
                    setViewMode('game');
                    try {
                      localStorage.removeItem('ezi_admin_authenticated_v2');
                      sessionStorage.removeItem('ezi_admin_session_v3');
                    } catch {}
                    window.location.hash = '';
                  }}
                  onOpenAll16RulesModal={() => setIsAdminRulesModalOpen(true)}
                  isFastMode={adminControlGame === 'fast'}
                  onSelectedAdminGameChange={setAdminControlGame}
                  activeStakeTier={adminStakeTier}
                  onSelectStakeRoom={setAdminStakeTier}
                  allFastRoomsByStake={adminFastRoomsByStake}
                  allFastLockedByStake={adminFastLockedByStake}
                  activePatternId={livePatternId}
                  stakeAmount={liveStake}
                  prizeAmount={livePrize}
                  blockedCartelaIds={curRoom?.blockedCartelaIds ?? []}
                  totalCartelasCount={curAdminMode === 'regular' ? 70000 : 500}
                  registeredCartelasCount={curLocked.length}
                  isPlaying={curRoom ? curRoom.isPlaying : adminIsPlaying}
                  isPaused={curRoom ? curRoom.isPaused : adminIsPaused}
                  callSpeedSec={liveSpeed}
                  jackpotPool={curRoom?.jackpotPool ?? 0}
                  houseEarningsTotal={curRoom?.houseEarningsTotal ?? 0}
                  bonusCartelasForOver20={curRoom?.bonusCartelasForOver20 ?? 5}
                  gameHistory={curRoom?.gameHistory ?? []}
                  onRefreshLiveState={refreshAdminLiveState}
                  onChangeSpeed={(sec) => {
                    setAdminCallSpeed(sec);
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'set_speed',
                      callSpeedSec: sec,
                      applyAllRooms: curAdminMode === 'fast',
                    }).then(() => refreshAdminLiveState());
                  }}
                  onTogglePause={() => {
                    const nextPlaying = curRoom ? !curRoom.isPlaying : !adminIsPlaying;
                    const nextPaused = curRoom ? !curRoom.isPaused : !adminIsPaused;
                    setAdminIsPlaying(nextPlaying);
                    setAdminIsPaused(nextPaused);
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'toggle_pause',
                    }).then(() => refreshAdminLiveState());
                  }}
                  onDrawNextManual={() => {
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'draw_next',
                    }).then(() => refreshAdminLiveState());
                  }}
                  onResetGame={() => {
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'reset_round',
                    }).then(() => refreshAdminLiveState());
                  }}
                  onStartRegistrationCountdown={(seconds) => {
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'start_countdown',
                      countdownSeconds: seconds,
                    }).then(() => refreshAdminLiveState());
                  }}
                  onUpdateGameSettings={(stake, prize, patternId, regMinutes) => {
                    setAdminActivePatternId(patternId);
                    const totalSecs = regMinutes > 0 ? Math.round(regMinutes * 60) : undefined;
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: stake,
                      prizeAmount: prize,
                      activePatternId: patternId,
                      countdownSeconds: totalSecs,
                      preGameCountdown: totalSecs ?? null,
                      action: 'update_settings',
                      applyAllRooms: curAdminMode === 'fast',
                    }).then(() => refreshAdminLiveState());
                  }}
                  onUpdateJackpotPool={(nextJp) => {
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'set_jackpot',
                      jackpotPool: nextJp,
                    }).then(() => refreshAdminLiveState());
                  }}
                  onUpdateBonusCartelasForOver20={(bonusCount) => {
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'set_bonus_over_20',
                      bonusCount,
                    }).then(() => refreshAdminLiveState());
                  }}
                  onBlockCartelaId={(id) => {
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'block_cartela',
                      cartelaId: id,
                    }).then(() => refreshAdminLiveState());
                  }}
                  onUnblockCartelaId={(id) => {
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'unblock_cartela',
                      cartelaId: id,
                    }).then(() => refreshAdminLiveState());
                  }}
                  onManualApproveWinner={(cartelaId) => {
                    const winBall =
                      curRoom?.activeBall ||
                      (curRoom?.calledBalls?.length
                        ? curRoom.calledBalls[curRoom.calledBalls.length - 1]
                        : 1);
                    const pat = BINGO_PATTERNS.find((p) => p.id === livePatternId);
                    const winnerObj = {
                      cartelaId,
                      userName: `Cartela #${cartelaId} (Admin Verified)`,
                      prizeAmount: livePrize,
                      winningCells: [] as [number, number][],
                      lastBall: winBall,
                      calledBallsSnapshot: curRoom?.calledBalls || [],
                      patternTitle: `${pat?.titleAm || 'ቢንጎ'} (በአድሚን የተረጋገጠ)`,
                      timestamp: new Date().toLocaleString(),
                    };
                    dispatchServerRoomAction({
                      mode: curAdminMode,
                      stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
                      action: 'claim_win',
                      winner: winnerObj,
                      winnerPhone: sharedUsersRef.current[0]?.phone || '0942742684',
                      isAdminOverride: true,
                    }).then(() => refreshAdminLiveState());
                  }}
                  homeAdsEnabled={homeAdsEnabled}
                  onToggleHomeAdsEnabled={handleToggleHomeAdsEnabled}
                  heroBanners={heroBanners}
                  onAddHeroBanner={handleAddHeroBanner}
                  onUpdateHeroBanner={handleUpdateHeroBanner}
                  onRemoveHeroBanner={handleRemoveHeroBanner}
                  bankAccounts={bankAccounts}
                  onAddBankAccount={handleAddBankAccount}
                  onUpdateBankAccount={handleUpdateBankAccount}
                  onRemoveBankAccount={handleRemoveBankAccount}
                  users={sharedUsers}
                  transactions={sharedTransactions}
                  isDark={isDark}
                  requireDepositApproval={requireDepositApproval}
                  onToggleRequireDepositApproval={(nextState) => {
                    setRequireDepositApproval(nextState);
                    fetch(buildApiUrl('/api/admin/update-pin'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ requireDepositApproval: nextState }),
                    }).catch(() => {});
                  }}
                  onAdjustUserBalance={(uid, delta, phone) => {
                    const target = sharedUsersRef.current.find(
                      (u) => u.id === uid || (phone && u.phone === phone)
                    );
                    if (!target) return;
                    const nextBal = Math.max(0, Number((target.balance + delta).toFixed(2)));
                    setSharedUsers((prev) =>
                      prev.map((u) =>
                        u.id === target.id || u.phone === target.phone
                          ? { ...u, balance: nextBal }
                          : u
                      )
                    );
                    fetch(buildApiUrl('/api/admin/users/upsert'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone: target.phone,
                        name: target.name,
                        balance: nextBal,
                        bonusBalance: target.bonusBalance,
                        isBlocked: target.isBlocked,
                      }),
                    })
                      .then(() => refreshAdminLiveState())
                      .catch(() => {});
                  }}
                  onSetExactUserBalance={(phone, name, balance, bonusBalance = 15) => {
                    fetch(buildApiUrl('/api/admin/users/upsert'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ phone, name, balance, bonusBalance }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        if (data?.ok) refreshAdminLiveState();
                      })
                      .catch(() => {});
                  }}
                  onToggleUserBlock={(uid, phone) => {
                    const target = sharedUsersRef.current.find(
                      (u) => u.id === uid || (phone && u.phone === phone)
                    );
                    if (!target) return;
                    const nextBlocked = !target.isBlocked;
                    setSharedUsers((prev) =>
                      prev.map((u) =>
                        u.id === target.id || u.phone === target.phone
                          ? { ...u, isBlocked: nextBlocked }
                          : u
                      )
                    );
                    fetch(buildApiUrl('/api/admin/users/upsert'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        phone: target.phone,
                        name: target.name,
                        balance: target.balance,
                        bonusBalance: target.bonusBalance,
                        isBlocked: nextBlocked,
                      }),
                    })
                      .then(() => refreshAdminLiveState())
                      .catch(() => {});
                  }}
                  onApproveRejectTransaction={(txId, status) => {
                    const targetTx = sharedTransactions.find((t) => t.id === txId);
                    setSharedTransactions((prev) =>
                      prev.map((tx) => (tx.id === txId ? { ...tx, status } : tx))
                    );
                    if (targetTx && targetTx.status === 'pending' && status === 'approved') {
                      setSharedUsers((prev) =>
                        prev.map((u) => {
                          if (u.id === targetTx.userId || u.phone === targetTx.userPhone) {
                            const delta =
                              targetTx.type === 'deposit' ? targetTx.amount : -targetTx.amount;
                            return { ...u, balance: Math.max(0, u.balance + delta) };
                          }
                          return u;
                        })
                      );
                    }
                    fetch(buildApiUrl('/api/transactions/approve'), {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        txId,
                        status,
                        referenceNumber: targetTx?.referenceNumber,
                        userPhone: targetTx?.userPhone,
                      }),
                    })
                      .then((r) => r.json())
                      .then((data) => {
                        if (data?.ok && Array.isArray(data.transactions)) {
                          mergeGlobalTransactions(data.transactions);
                        }
                        refreshAdminLiveState();
                      })
                      .catch(() => {});
                  }}
                  onApproveAllPending={() => {
                    const pendingList = sharedTransactions.filter((t) => t.status === 'pending');
                    pendingList.forEach((tx) => {
                      fetch(buildApiUrl('/api/transactions/approve'), {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          txId: tx.id,
                          status: 'approved',
                          referenceNumber: tx.referenceNumber,
                          userPhone: tx.userPhone,
                        }),
                      }).catch(() => {});
                    });
                    window.setTimeout(() => refreshAdminLiveState(), 500);
                  }}
                />
              );
            })()}
          </div>
        ) : showGameHub ? (
          /* 3. SUN GAMES HOME HUB (Redesigned after IMG_3954: Cosmic Midnight-Teal, Gold Crest, Split Hero Card, 2-Column Game Cards & Bottom Bar) */
          <div
            className={`flex-1 flex flex-col min-h-screen relative overflow-x-hidden transition-colors ${
              isDark
                ? 'bg-[radial-gradient(ellipse_at_top,_#0D303A_0%,_#061820_45%,_#030C11_100%)] text-slate-100'
                : 'bg-gradient-to-b from-slate-100 via-cyan-50/40 to-slate-100 text-slate-900'
            }`}
          >
            {/* Subtle Cosmic Starfield Sparkles */}
            {isDark && (
              <div className="pointer-events-none fixed inset-0 overflow-hidden z-0">
                <span className="absolute top-14 left-8 w-1 h-1 rounded-full bg-amber-300/60 shadow-[0_0_6px_#FCD34D]" />
                <span className="absolute top-28 right-10 w-1 h-1 rounded-full bg-cyan-300/60 shadow-[0_0_6px_#67E8F9]" />
                <span className="absolute top-52 left-1/4 w-0.5 h-0.5 rounded-full bg-amber-200/50" />
                <span className="absolute top-72 right-6 w-1 h-1 rounded-full bg-amber-400/50 shadow-[0_0_6px_#F59E0B]" />
                <span className="absolute bottom-40 left-6 w-1 h-1 rounded-full bg-cyan-400/40" />
              </div>
            )}

            {/* Top Bar: Coins + Balance + "+" on Left | Gold Hamburger on Right */}
            <header
              className={`sticky top-0 z-40 px-3.5 sm:px-5 pt-3 pb-2 flex items-center justify-between backdrop-blur-md ${
                isDark ? 'bg-[#05151C]/80' : 'bg-white/90 border-b border-slate-200'
              }`}
            >
              {/* Left: Stacked Coins + Balance Pill + "+" Deposit Trigger */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openGlobalWallet('deposit')}
                  className={`group flex items-center gap-2 pl-1.5 pr-1.5 py-1 rounded-full border transition-all cursor-pointer active:scale-95 shadow-lg ${
                    isDark
                      ? 'bg-[#081D26]/95 border-cyan-400/35 hover:border-amber-400/70 text-white shadow-black/40'
                      : 'bg-white border-amber-400/60 hover:border-amber-500 text-slate-900 shadow-slate-200'
                  }`}
                  title={tHub.walletTitle}
                >
                  {/* Gold Coin Stack SVG */}
                  <svg viewBox="0 0 36 36" className="w-7 h-7 shrink-0 drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]">
                    <ellipse cx="14" cy="27" rx="9" ry="3.5" fill="#B45309" />
                    <ellipse cx="14" cy="25" rx="9" ry="3.5" fill="#F59E0B" stroke="#FEF08A" strokeWidth="0.7" />
                    <ellipse cx="14" cy="21" rx="9" ry="3.5" fill="#B45309" />
                    <ellipse cx="14" cy="19" rx="9" ry="3.5" fill="#FBBF24" stroke="#FEF08A" strokeWidth="0.7" />
                    <ellipse cx="14" cy="15" rx="9" ry="3.5" fill="#B45309" />
                    <ellipse cx="14" cy="13" rx="9" ry="3.5" fill="#FDE047" stroke="#FFFBEB" strokeWidth="0.8" />
                    <ellipse cx="24" cy="28" rx="7" ry="2.8" fill="#B45309" />
                    <ellipse cx="24" cy="26" rx="7" ry="2.8" fill="#FBBF24" stroke="#FEF08A" strokeWidth="0.7" />
                    <ellipse cx="24" cy="22" rx="7" ry="2.8" fill="#FDE047" stroke="#FFFBEB" strokeWidth="0.7" />
                  </svg>

                  <span className="text-sm sm:text-base font-black tabular-nums tracking-tight px-1">
                    {Math.floor(sharedUsers[0]?.balance ?? 0)}
                  </span>

                  <span className="w-6 h-6 rounded-full bg-gradient-to-b from-amber-300 via-amber-500 to-amber-700 text-slate-950 flex items-center justify-center border border-amber-200/80 shadow-[0_0_10px_rgba(245,158,11,0.55)] group-hover:scale-105 transition-transform">
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                </button>
              </div>

              {/* Right: Notifications Bell + Gold Hamburger Menu Drawer */}
              <div className="flex items-center gap-2 relative" ref={hubMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setHubMenuOpen(false);
                    setHubNotificationsOpen((prev) => !prev);
                    setHasUnreadNotifs(false);
                  }}
                  className={`relative p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                    hubNotificationsOpen
                      ? isDark
                        ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                        : 'bg-amber-100 border-amber-400 text-amber-800'
                      : isDark
                      ? 'bg-[#081D26]/90 border-amber-400/35 text-amber-300 hover:border-amber-400 hover:bg-[#0D2B36]'
                      : 'bg-slate-100 border-slate-300 text-amber-700 hover:bg-slate-200'
                  }`}
                  aria-label={tHub.notificationsTitle}
                  title={tHub.notificationsTitle}
                >
                  <Bell className="w-6 h-6" />
                  {hasUnreadNotifs && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-[#081D26] animate-pulse" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setHubNotificationsOpen(false);
                    setHubMenuOpen((prev) => !prev);
                  }}
                  className={`p-2 rounded-xl border transition-all cursor-pointer active:scale-95 ${
                    isDark
                      ? 'bg-[#081D26]/90 border-amber-400/35 text-amber-300 hover:border-amber-400 hover:bg-[#0D2B36]'
                      : 'bg-slate-100 border-slate-300 text-amber-700 hover:bg-slate-200'
                  }`}
                  aria-label="Menu"
                >
                  {hubMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                {hubNotificationsOpen && (
                  <div
                    className={`absolute right-0 top-12 w-72 sm:w-80 rounded-2xl border shadow-2xl p-3 z-50 space-y-2.5 ${
                      isDark
                        ? 'bg-[#081D26] border-cyan-500/35 text-slate-100 shadow-black/80'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-1.5 font-black text-xs text-amber-400">
                        <Bell className="w-4 h-4" />
                        <span>{tHub.notificationsTitle}</span>
                      </div>
                      {notificationHistory.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setNotificationHistory([])}
                          className="text-[11px] font-bold text-slate-400 hover:text-rose-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setHubNotice(
                          tHub.helloPlayer(
                            sharedUsers[0]?.name || 'Sun Player',
                            Math.floor(sharedUsers[0]?.balance ?? 0),
                            Math.floor(sharedUsers[0]?.bonusBalance ?? 0)
                          )
                        );
                        setHubNotificationsOpen(false);
                      }}
                      className={`w-full px-3 py-2.5 rounded-xl text-xs border flex items-start gap-2 text-left cursor-pointer transition-colors ${
                        isDark
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-200'
                          : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
                      }`}
                    >
                      <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-black truncate">
                          {sharedUsers[0]?.name || 'Sun Player'}
                        </div>
                        <div className="text-[11px] opacity-85 mt-0.5">
                          {tHub.walletSummary(
                            Math.floor(sharedUsers[0]?.balance ?? 0),
                            Math.floor(sharedUsers[0]?.bonusBalance ?? 0)
                          )}
                        </div>
                      </div>
                    </button>

                    {notificationHistory.length > 0 && (
                      <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                        {notificationHistory.map((item, idx) => (
                          <div
                            key={`${item.title}-${idx}`}
                            className={`px-3 py-2 rounded-xl border text-xs space-y-1 ${
                              isDark
                                ? 'bg-[#051218] border-cyan-500/20 text-slate-200'
                                : 'bg-slate-50 border-slate-200 text-slate-800'
                            }`}
                          >
                            <div className="font-black text-amber-400 truncate">{item.title}</div>
                            <div className="text-[11px] opacity-85 leading-snug whitespace-pre-line">
                              {item.message}
                            </div>
                            {item.game &&
                              item.game !== 'admin' &&
                              ['fast', 'regular', 'keno', 'ramino'].includes(item.game) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const target = item.game as 'fast' | 'regular' | 'keno' | 'ramino';
                                    setHubNotificationsOpen(false);
                                    setViewMode('game');
                                    handleSwitchMode(target);
                                  }}
                                  className="mt-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black cursor-pointer"
                                >
                                  {tHub.playNowToast}
                                </button>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {hubMenuOpen && (
                  <div
                    className={`absolute right-0 top-12 w-64 rounded-2xl border shadow-2xl p-2.5 z-50 space-y-2 ${
                      isDark
                        ? 'bg-[#081D26] border-cyan-500/35 text-slate-100 shadow-black/80'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <div
                      className={`px-3 py-2 rounded-xl text-xs border space-y-2 ${
                        isDark
                          ? 'bg-[#051218] border-cyan-500/20 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-black text-amber-400 truncate">
                            {sharedUsers[0]?.name || 'Sun Player'}
                          </div>
                          <div className="text-[11px] opacity-75">{sharedUsers[0]?.phone}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setHubNameDraft(sharedUsers[0]?.name || '');
                            setIsEditingHubName((v) => !v);
                          }}
                          className={`px-2 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer transition-colors ${
                            isDark
                              ? 'bg-[#0D2B36] hover:bg-[#123947] text-amber-300 border border-cyan-500/30'
                              : 'bg-white hover:bg-slate-100 text-amber-700 border border-slate-300'
                          }`}
                          title={tHub.changeName}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{tHub.changeName}</span>
                        </button>
                      </div>

                      {isEditingHubName && (
                        <div className="flex items-center gap-1.5 pt-1 border-t border-cyan-500/20">
                          <input
                            type="text"
                            value={hubNameDraft}
                            onChange={(e) => setHubNameDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveHubUsername();
                            }}
                            maxLength={24}
                            placeholder={tHub.newNamePlaceholder}
                            className={`flex-1 min-w-0 px-2 py-1 rounded-lg text-xs border outline-none ${
                              isDark
                                ? 'bg-[#030D12] border-cyan-500/30 text-white focus:border-amber-400'
                                : 'bg-white border-slate-300 text-slate-900 focus:border-amber-500'
                            }`}
                          />
                          <button
                            type="button"
                            disabled={isSavingHubName || hubNameDraft.trim().length < 2}
                            onClick={handleSaveHubUsername}
                            className="p-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-black cursor-pointer shrink-0"
                            title={tHub.saveShort}
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="px-2 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {tHub.languageSection}
                    </div>
                    <div className="grid grid-cols-2 gap-1 px-1">
                      {languagesList.map((l) => (
                        <button
                          key={l.code}
                          type="button"
                          onClick={() => {
                            handleUpdateLanguage(l.code);
                            setHubMenuOpen(false);
                          }}
                          className={`px-2 py-1.5 rounded-lg text-xs font-bold text-left cursor-pointer transition-colors ${
                            language === l.code
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : isDark
                              ? 'hover:bg-[#0E2F3B] text-slate-300'
                              : 'hover:bg-slate-100 text-slate-700'
                          }`}
                        >
                          {l.label}
                        </button>
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        handleToggleTheme();
                        setHubMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between cursor-pointer transition-colors ${
                        isDark ? 'hover:bg-[#0E2F3B] text-slate-200' : 'hover:bg-slate-100 text-slate-800'
                      }`}
                    >
                      <span>{isDark ? tHub.lightTheme : tHub.darkTheme}</span>
                      {isDark ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-slate-700" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setHubMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-500/15 flex items-center justify-between cursor-pointer transition-colors"
                    >
                      <span>{tHub.logout}</span>
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </header>

            <main className="relative z-10 w-full max-w-2xl mx-auto px-3.5 sm:px-5 pt-1 pb-24 space-y-4">
              {/* Centered Brand Crest + Metallic Gold Section Title */}
              <div className="flex flex-col items-center text-center space-y-1">
                <SunGamesLogo isDark={isDark} />
                <h1
                  className={`text-xl sm:text-2xl font-black tracking-wide drop-shadow ${
                    isDark
                      ? 'bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent'
                      : 'text-amber-700'
                  }`}
                >
                  {tHub.chooseGameTitle}
                </h1>
              </div>

              {/* Inline Status Notice (for Bell / Soon games) */}
              {hubNotice && (
                <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-400/50 text-amber-300 text-xs sm:text-sm font-bold text-center shadow-lg">
                  {hubNotice}
                </div>
              )}

              {/* Split Featured Hero Carousel Card (Synced with Admin Ads Creator; Hidden when Admin turns Front Ads OFF) */}
              {homeAdsEnabled && (() => {
                const totalOnline =
                  liveGameCounts.fast +
                  liveGameCounts.regular +
                  liveGameCounts.keno +
                  liveGameCounts.ramino;
                const carouselSlides: {
                  id: string;
                  badge: string;
                  title: string;
                  subtitle: string;
                  cta: string;
                  imageUrl?: string;
                  target: 'fast' | 'regular' | 'keno' | 'ramino' | 'none';
                }[] =
                  activeAdminAds.length > 0
                    ? activeAdminAds.map((rawAd) => {
                        const ad = localizeHeroAd(rawAd, language);
                        return {
                          id: ad.id,
                          badge: ad.badgeText || tHub.bannerDefaultBadge,
                          title: ad.title,
                          subtitle: ad.subtitle,
                          cta: ad.ctaText || tHub.bannerDefaultCta,
                          imageUrl: ad.imageUrl || undefined,
                          target: ((ad.targetGame as string) === 'ludo'
                            ? 'fast'
                            : ad.targetGame || 'fast') as
                            | 'fast'
                            | 'regular'
                            | 'keno'
                            | 'ramino'
                            | 'none',
                        };
                      })
                    : tHub.defaultSlides.map((s, idx) => ({
                        id: `default_${idx}`,
                        badge: s.badge,
                        title: s.title,
                        subtitle: s.subtitle,
                        cta: s.cta,
                        imageUrl: undefined,
                        target: s.target,
                      }));

                const safeIndex = promoSlideIndex % carouselSlides.length;
                const activeSlide = carouselSlides[safeIndex];
                return (
                  <div className="space-y-2.5">
                    <div
                      onClick={() => {
                        if (activeSlide.target === 'none') return;
                        handleSwitchMode(activeSlide.target);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && activeSlide.target !== 'none') {
                          handleSwitchMode(activeSlide.target);
                        }
                      }}
                      className={`relative w-full rounded-2xl overflow-hidden border transition-all cursor-pointer group ${
                        isDark
                          ? 'bg-gradient-to-br from-[#071D26] via-[#041219] to-[#081F29] border-amber-400/50 shadow-[0_12px_36px_rgba(0,0,0,0.6),inset_0_0_24px_rgba(34,211,238,0.12)]'
                          : 'bg-gradient-to-br from-slate-900 via-[#08202B] to-slate-900 border-amber-500/60 shadow-xl'
                      }`}
                    >
                      {activeSlide.imageUrl ? (
                        /* Admin-Posted Full Artwork Ad Showcase */
                        <div className="relative min-h-[188px] sm:min-h-[210px] flex flex-col justify-between">
                          <img
                            src={activeSlide.imageUrl}
                            alt={activeSlide.title}
                            referrerPolicy="no-referrer"
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                          />
                          <div className="absolute inset-0 bg-gradient-to-r from-[#030F15]/95 via-[#051822]/75 to-black/30" />

                          {/* Top Badges */}
                          <div className="relative z-10 flex items-center justify-between px-3 pt-2.5">
                            <span className="px-2.5 py-0.5 rounded-br-xl rounded-tl-md bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 border border-amber-300/60 text-[10px] sm:text-xs font-black text-amber-100 shadow-md">
                              {activeSlide.badge}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-[10px] sm:text-xs font-bold text-emerald-300 tabular-nums shadow">
                              <User className="w-3 h-3 text-emerald-400" />
                              <span>{totalOnline}</span>
                            </span>
                          </div>

                          {/* Ad Copy & CTA Overlay */}
                          <div className="relative z-10 px-3.5 sm:px-5 py-3.5 space-y-2 max-w-[78%]">
                            <h2 className="text-base sm:text-xl font-black leading-tight bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow">
                              {activeSlide.title}
                            </h2>
                            <p className="text-[11px] sm:text-xs text-slate-100/95 leading-snug line-clamp-2 drop-shadow">
                              {activeSlide.subtitle}
                            </p>
                            {activeSlide.target !== 'none' && (
                              <div className="pt-0.5">
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-700 via-red-600 to-amber-500 border border-amber-300/80 text-white text-[11px] sm:text-xs font-black shadow-[0_4px_14px_rgba(225,29,72,0.45)] group-hover:brightness-110 transition-all">
                                  {activeSlide.cta}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <>
                          {/* Top-Left Crimson Ribbon Badge & Top-Right Green Online Count Pill */}
                          <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
                            <span className="px-2.5 py-0.5 rounded-br-xl rounded-tl-md bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 border border-amber-300/60 text-[10px] sm:text-xs font-black text-amber-100 shadow-md">
                              {activeSlide.badge}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-[10px] sm:text-xs font-bold text-emerald-300 tabular-nums shadow">
                              <User className="w-3 h-3 text-emerald-400" />
                              <span>{totalOnline}</span>
                            </span>
                          </div>

                          {/* Split Content: Left Promo Text + Chest/Coin Artwork + CTA | Right Bingo Card Graphic */}
                          <div className="px-3.5 sm:px-5 pb-4 pt-1 grid grid-cols-12 gap-2.5 items-center">
                            <div className="col-span-7 flex flex-col justify-between space-y-2">
                              <div>
                                <h2 className="text-sm sm:text-lg font-black leading-tight bg-gradient-to-b from-amber-100 via-amber-300 to-amber-500 bg-clip-text text-transparent drop-shadow">
                                  {activeSlide.title}
                                </h2>
                                <p className="mt-0.5 text-[10px] sm:text-xs text-slate-200/90 leading-snug line-clamp-2">
                                  {activeSlide.subtitle}
                                </p>
                              </div>

                              {/* Centerpiece Treasure & Coin Burst */}
                              <div className="flex items-center gap-2">
                                <svg viewBox="0 0 110 62" className="h-14 sm:h-16 w-auto drop-shadow-[0_4px_12px_rgba(245,158,11,0.35)]">
                                  <defs>
                                    <linearGradient id="chestGold" x1="0" y1="0" x2="1" y2="1">
                                      <stop offset="0%" stopColor="#FEF08A" />
                                      <stop offset="50%" stopColor="#F59E0B" />
                                      <stop offset="100%" stopColor="#92400E" />
                                    </linearGradient>
                                  </defs>
                                  <ellipse cx="55" cy="54" rx="40" ry="6" fill="#F59E0B" opacity="0.22" />
                                  <path d="M 32 34 L 78 34 L 74 52 L 36 52 Z" fill="#78350F" stroke="url(#chestGold)" strokeWidth="2.2" />
                                  <path d="M 28 34 Q 55 18 82 34 Z" fill="#92400E" stroke="url(#chestGold)" strokeWidth="2.2" />
                                  <ellipse cx="55" cy="33" rx="19" ry="6" fill="#FDE047" opacity="0.85" />
                                  <circle cx="48" cy="32" r="4" fill="#FBBF24" stroke="#FFFBEB" strokeWidth="0.8" />
                                  <circle cx="56" cy="30" r="4.5" fill="#FDE047" stroke="#FFFBEB" strokeWidth="0.8" />
                                  <circle cx="63" cy="33" r="3.8" fill="#F59E0B" stroke="#FFFBEB" strokeWidth="0.8" />
                                  <rect x="51" y="36" width="8" height="9" rx="2" fill="url(#chestGold)" />
                                  <circle cx="24" cy="49" r="3.5" fill="#FBBF24" />
                                  <circle cx="84" cy="50" r="3.5" fill="#FDE047" />
                                  <path d="M 20 22 L 29 14 M 88 22 L 80 14" stroke="#22D3EE" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
                                </svg>
                              </div>

                              <div>
                                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-rose-700 via-red-600 to-amber-500 border border-amber-300/80 text-white text-[11px] sm:text-xs font-black shadow-[0_4px_14px_rgba(225,29,72,0.45)] group-hover:brightness-110 transition-all">
                                  {activeSlide.cta}
                                </span>
                              </div>
                            </div>

                            {/* Right: 5x5 Stylized Bingo Card & 3D 43/41 Balls */}
                            <div className="col-span-5 flex flex-col items-center justify-center">
                              <div className="relative w-full max-w-[126px] rounded-xl bg-gradient-to-b from-[#0E3542] to-[#061820] border border-cyan-400/50 p-1.5 shadow-xl">
                                <div className="text-center text-[10px] font-black tracking-widest text-amber-200 pb-1">
                                  BINGO
                                </div>
                                <div className="grid grid-cols-5 gap-0.5 text-[7px] font-bold text-center">
                                  {[
                                    '4', '18', '33', '46', '61',
                                    '11', '22', '43', '51', '68',
                                    '7', '17', '★', '48', '73',
                                    '14', '29', '31', '54', '65',
                                    '2', '24', '39', '58', '70',
                                  ].map((cell, cIdx) => (
                                    <div
                                      key={cIdx}
                                      className={`aspect-square rounded-[3px] flex items-center justify-center ${
                                        cell === '43' || cell === '48' || cell === '★'
                                          ? 'bg-cyan-400/80 text-slate-950 font-black'
                                          : 'bg-cyan-950/80 text-cyan-100/85 border border-cyan-500/20'
                                      }`}
                                    >
                                      {cell}
                                    </div>
                                  ))}
                                </div>
                                {/* Floating 3D Bingo Balls */}
                                <div className="absolute -bottom-2 -left-2 w-8 h-8 rounded-full bg-[radial-gradient(circle_at_30%_30%,_#93C5FD,_#1D4ED8_65%,_#1E3A8A)] border border-sky-200/80 flex items-center justify-center shadow-lg">
                                  <span className="w-4.5 h-4.5 rounded-full bg-white text-slate-950 text-[8px] font-black flex items-center justify-center">
                                    43
                                  </span>
                                </div>
                                <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-[radial-gradient(circle_at_30%_30%,_#86EFAC,_#15803D_65%,_#14532D)] border border-emerald-200/80 flex items-center justify-center shadow-lg">
                                  <span className="w-4.5 h-4.5 rounded-full bg-white text-slate-950 text-[8px] font-black flex items-center justify-center">
                                    41
                                  </span>
                                </div>
                              </div>
                              <span className="mt-3 text-xs sm:text-sm font-black text-amber-300 tracking-wide">
                                {tHub.fastTitle}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Carousel Dots */}
                    <div className="flex items-center justify-center gap-1.5">
                      {carouselSlides.map((s, idx) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setPromoSlideIndex(idx)}
                          aria-label={`Slide ${idx + 1}`}
                          className={`h-1.5 rounded-full transition-all cursor-pointer ${
                            safeIndex === idx
                              ? 'w-5 bg-cyan-400 shadow-[0_0_8px_#22D3EE]'
                              : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* 2-Column Game Artwork Cards Grid (Filtered by Admin Visibility Control) */}
              {(() => {
                const allTiles: {
                  key: GameKey;
                  title: string;
                  players: number;
                  image: string;
                }[] = [
                  { key: 'fast', title: tHub.fastTitle, players: liveGameCounts.fast, image: gameTileBingoImg },
                  { key: 'regular', title: tHub.regularTitle, players: liveGameCounts.regular, image: liyuBingoTileImg },
                  { key: 'keno', title: tHub.kenoTitle, players: liveGameCounts.keno, image: gameTileKenoImg },
                  { key: 'ramino', title: tHub.raminoTitle, players: liveGameCounts.ramino, image: gameTileConkerImg },
                ];

                const visibleTiles = allTiles.filter((item) => gameVisibility[item.key]?.visible !== false);

                if (visibleTiles.length === 0) {
                  return (
                    <div className="p-6 rounded-2xl bg-[#071D26]/80 border border-cyan-500/30 text-center text-xs font-bold text-slate-300">
                      {tHub.noVisibleGames}
                    </div>
                  );
                }

                return (
                  <div
                    className={
                      visibleTiles.length === 1
                        ? 'grid grid-cols-1 max-w-sm mx-auto gap-3 sm:gap-4'
                        : 'grid grid-cols-2 gap-3 sm:gap-4'
                    }
                  >
                    {visibleTiles.map((item) => {
                      const isSoon = Boolean(gameVisibility[item.key]?.comingSoon);
                      const handleTileClick = () => {
                        if (isSoon) {
                          setHubNotice(tHub.soonNotice(item.title));
                        } else {
                          handleSwitchMode(item.key);
                        }
                      };
                      return (
                        <button
                          key={item.key}
                          type="button"
                          onClick={handleTileClick}
                          className={`group relative flex flex-col rounded-2xl overflow-hidden border transition-all cursor-pointer focus:outline-none active:scale-[0.98] ${
                            isDark
                              ? 'bg-gradient-to-b from-[#081F28] to-[#041117] border-cyan-500/30 hover:border-amber-400/70 shadow-[0_8px_24px_rgba(0,0,0,0.55)]'
                              : 'bg-white border-slate-300 hover:border-amber-500 shadow-md'
                          }`}
                        >
                          {/* Top Bar Badges inside Card */}
                          <div className="relative w-full aspect-[4/3.1] overflow-hidden bg-[#05141B]">
                            <img
                              src={item.image}
                              alt={item.title}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#041117] via-transparent to-black/35" />

                            {isSoon && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500/90 text-slate-950 shadow">
                                {tHub.soonBadge}
                              </span>
                            )}

                            <span className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/90 border border-emerald-400/50 text-[10px] font-bold text-emerald-300 tabular-nums shadow">
                              <User className="w-2.5 h-2.5 text-emerald-400" />
                              <span>{item.players}</span>
                            </span>
                          </div>

                          {/* Card Bottom Gold Title Plate */}
                          <div className="w-full py-2 px-2 text-center bg-gradient-to-b from-transparent to-black/30">
                            <span
                              className={`block text-xs sm:text-sm font-black tracking-wide truncate ${
                                isDark ? 'text-amber-300' : 'text-amber-700'
                              }`}
                            >
                              {item.title}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </main>

            {/* Slim Sticky Bottom Navigation Bar */}
            <nav
              className={`fixed bottom-0 inset-x-0 z-40 border-t backdrop-blur-lg pb-[max(0.45rem,env(safe-area-inset-bottom))] pt-1.5 px-2 ${
                isDark
                  ? 'bg-[#041219]/95 border-cyan-500/25 text-slate-300'
                  : 'bg-white/95 border-slate-200 text-slate-600'
              }`}
            >
              <div className="max-w-2xl mx-auto grid grid-cols-5 items-center gap-1 text-[10px] sm:text-xs font-bold">
                <button
                  type="button"
                  onClick={handleReturnToHub}
                  className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl text-amber-400 cursor-pointer"
                >
                  <Home className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="truncate">{tHub.navHome}</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    handleSwitchMode(gameVisibility.fast?.visible !== false ? 'fast' : 'ramino')
                  }
                  className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl hover:text-amber-300 cursor-pointer transition-colors"
                >
                  <Zap className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="truncate">
                    {gameVisibility.fast?.visible !== false ? tHub.fastTitle : tHub.raminoTitle}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => openGlobalWallet('deposit')}
                  className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl hover:text-amber-300 cursor-pointer transition-colors"
                >
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="truncate">{tHub.walletTitle}</span>
                </button>
                <button
                  type="button"
                  onClick={() => openGlobalWallet('history')}
                  className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl hover:text-amber-300 cursor-pointer transition-colors"
                >
                  <History className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="truncate">{tHub.navHistory}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    scrollAppToTop();
                    setHubMenuOpen((prev) => !prev);
                  }}
                  className="flex flex-col items-center justify-center gap-0.5 py-1 rounded-xl hover:text-amber-300 cursor-pointer transition-colors"
                >
                  <User className="w-4 h-4 sm:w-5 sm:h-5" />
                  <span className="truncate">{tHub.navProfile}</span>
                </button>
              </div>
            </nav>
          </div>
        ) : (
          /* 4. LOGGED-IN GAMEPLAY VIEW (Fast Bingo, Regular Bingo, Fast Keno, or Ramino) */
          gameMode === 'fast' ? (
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#06131A] text-amber-300 font-bold text-sm">
                  Loading...
                </div>
              }
            >
              <FastBingoStandaloneApp
                onSwitchToRegularApp={() => handleSwitchMode('regular')}
                onBackToLobby={handleReturnToHub}
                language={language}
                onChangeLanguage={handleUpdateLanguage}
                sharedUsers={sharedUsers}
                onUpdateSharedUsers={setSharedUsers}
                sharedTransactions={sharedTransactions}
                onUpdateSharedTransactions={setSharedTransactions}
                isAdminAuthenticated={false}
                onToggleAdminAuthenticated={setIsAdminAuthenticated}
                openSettingsTrigger={openSettingsTrigger}
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
                onLogout={handleLogout}
                onOpenAdminPortal={() => {
                  if (isAdminAuthenticated) {
                    setViewMode('admin');
                  } else {
                    setIsAdminModalOpen(true);
                  }
                }}
                bankAccounts={bankAccounts}
                onAddBankAccount={handleAddBankAccount}
                onUpdateBankAccount={handleUpdateBankAccount}
                onRemoveBankAccount={handleRemoveBankAccount}
                heroBanners={heroBanners}
                onAddHeroBanner={handleAddHeroBanner}
                onUpdateHeroBanner={handleUpdateHeroBanner}
                onRemoveHeroBanner={handleRemoveHeroBanner}
              />
            </Suspense>
          ) : gameMode === 'regular' ? (
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-[#06131A] text-amber-300 font-bold text-sm">
                  Loading...
                </div>
              }
            >
              <RegularBingoStandaloneApp
                onSwitchToFastApp={() => handleSwitchMode('fast')}
                onBackToLobby={handleReturnToHub}
                language={language}
                onChangeLanguage={handleUpdateLanguage}
                sharedUsers={sharedUsers}
                onUpdateSharedUsers={setSharedUsers}
                sharedTransactions={sharedTransactions}
                onUpdateSharedTransactions={setSharedTransactions}
                isAdminAuthenticated={false}
                onToggleAdminAuthenticated={setIsAdminAuthenticated}
                openSettingsTrigger={openSettingsTrigger}
                isDark={isDark}
                onToggleTheme={handleToggleTheme}
                onLogout={handleLogout}
                onOpenAdminPortal={() => {
                  if (isAdminAuthenticated) {
                    setViewMode('admin');
                  } else {
                    setIsAdminModalOpen(true);
                  }
                }}
                bankAccounts={bankAccounts}
                onAddBankAccount={handleAddBankAccount}
                onUpdateBankAccount={handleUpdateBankAccount}
                onRemoveBankAccount={handleRemoveBankAccount}
                heroBanners={heroBanners}
                onAddHeroBanner={handleAddHeroBanner}
                onUpdateHeroBanner={handleUpdateHeroBanner}
                onRemoveHeroBanner={handleRemoveHeroBanner}
              />
            </Suspense>
          ) : gameMode === 'keno' ? (
            <div data-scroll-reset="true" className="flex-1 w-full flex flex-col items-center justify-start overflow-y-auto overscroll-y-contain">
              <div className="w-full max-w-2xl min-h-full">
                <Suspense
                  fallback={
                    <div className="min-h-screen flex items-center justify-center bg-[#06131A] text-amber-300 font-bold text-sm">
                      Loading...
                    </div>
                  }
                >
                  <FastKenoScreen
                    language={language}
                    onChangeLanguage={handleUpdateLanguage}
                    initialBalance={sharedUsers[0]?.balance ?? 500}
                    playerPhone={sharedUsers[0]?.phone}
                    playerName={sharedUsers[0]?.name}
                    onOpenWallet={(tab) => openGlobalWallet(tab || 'deposit')}
                    onBalanceChange={(newBal, reason) => {
                      const prevBal = sharedUsersRef.current[0]?.balance ?? 0;
                      const clamped = Math.max(0, newBal);
                      const delta = Number((clamped - prevBal).toFixed(2));
                      if (delta !== 0) {
                        recordGameWalletDelta(
                          delta,
                          'keno',
                          reason || (delta > 0 ? 'Keno payout' : 'Keno wager')
                        );
                      }
                    }}
                    onBackToLudo={handleReturnToHub}
                  />
                </Suspense>
              </div>
            </div>
          ) : (
            <div data-scroll-reset="true" className="fixed inset-0 z-50 bg-[#0f0728] overflow-y-auto overscroll-y-contain overflow-x-hidden flex flex-col">
              <ModernRaminoGame
                language={language}
                onChangeLanguage={handleUpdateLanguage}
                isDark={isDark}
                sharedUsers={sharedUsers}
                onUpdateSharedUsers={setSharedUsers}
                onBackToLobby={handleReturnToHub}
                onOpenWallet={(tab) => openGlobalWallet(tab || 'deposit')}
                onRecordWalletTx={(delta, reason) =>
                  recordGameWalletDelta(delta, 'ramino', reason)
                }
              />
            </div>
          )
        )}
      </div>

      {/* Unified Global Wallet Modal (Accessible from Home Hub, Fast Keno, and SUN Ramino) */}
      {isLoggedIn && isGlobalWalletOpen && sharedUsers[0] && (
        <div
          className="fixed inset-0 z-[200000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden overscroll-none"
          onClick={() => setIsGlobalWalletOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className={`w-full max-w-2xl max-h-[92dvh] rounded-3xl border shadow-2xl flex flex-col overflow-hidden ${
              isDark
                ? 'bg-[#0B1120] border-slate-700 text-slate-100'
                : 'bg-white border-slate-200 text-slate-900'
            }`}
          >
            <div
              className={`shrink-0 px-4 py-3 border-b flex items-center justify-between ${
                isDark ? 'border-slate-800 bg-slate-900/80' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-2 font-black text-sm sm:text-base">
                <Wallet className="w-5 h-5 text-amber-400" />
                <span>{tHub.walletTitle}</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs">
                  {Math.floor(sharedUsers[0].balance)} {tHub.currencyUnit}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsGlobalWalletOpen(false)}
                className={`p-1.5 rounded-xl transition cursor-pointer ${
                  isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-200 text-slate-700'
                }`}
                aria-label="Close Wallet"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {globalWalletNotice && (
              <div className="shrink-0 mx-3 mt-3 px-3 py-2 rounded-xl bg-amber-500/15 border border-amber-400/40 text-amber-300 text-xs font-bold">
                {globalWalletNotice}
              </div>
            )}

            <div data-app-scroll="true" className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
              <WalletView
                currentUser={sharedUsers[0]}
                transactions={sharedTransactions.filter((tx) => tx.userPhone === sharedUsers[0].phone)}
                language={language}
                isDark={isDark}
                initialSubTab={globalWalletTab}
                requireAdminApproval={requireDepositApproval}
                bankAccounts={bankAccounts}
                onSubmitDeposit={(method, amount, refNumber, fullSms) => {
                  const me = sharedUsersRef.current[0];
                  if (!me) return;
                  const tempId = `ftx-${Date.now()}`;
                  const newTx: TransactionRecord = {
                    id: tempId,
                    userId: me.id,
                    userName: me.name,
                    userPhone: me.phone,
                    type: 'deposit',
                    method,
                    amount,
                    referenceNumber: refNumber,
                    fullSmsText: fullSms,
                    status: 'pending',
                    timestamp: new Date().toLocaleString(),
                  };
                  setSharedTransactions((prev) => [newTx, ...prev]);
                  setGlobalWalletNotice(
                    `⏳ የ ${amount} ETB ገቢ ጥያቄዎ ተልኳል! የባንክ SMS በ Webhook ሲረጋገጥ ወዲያውኑ ወደ ዋሌትዎ ይገባል።`
                  );
                  fetch(buildApiUrl('/api/transactions/submit'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: me.id,
                      userName: me.name,
                      userPhone: me.phone,
                      type: 'deposit',
                      method,
                      amount,
                      referenceNumber: refNumber,
                      fullSmsText: fullSms,
                    }),
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (!data?.ok) {
                        setSharedTransactions((prev) => prev.filter((t) => t.id !== tempId));
                        setGlobalWalletNotice(
                          data?.error || '❌ የተደገመ የክፍያ ደረሰኝ (Duplicate Transaction) ተቀባይነት የለውም!'
                        );
                        return;
                      }
                      if (Array.isArray(data.transactions)) {
                        mergeGlobalTransactions(data.transactions);
                      }
                      if (typeof data.balance === 'number' && !data.isPending) {
                        setSharedUsers((prev) =>
                          prev.map((u, i) => (i === 0 ? { ...u, balance: data.balance } : u))
                        );
                        setGlobalWalletNotice(
                          data.alreadyCredited
                            ? 'ℹ️ ይህ ክፍያ በባንክ SMS Webhook ቀድሞ ገቢ ተደርጓል!'
                            : `✅ በባንክ SMS Webhook ተረጋግጦ ${data.transaction?.amount ?? amount} ETB ወደ ዋሌትዎ ገቢ ሆኗል!`
                        );
                      }
                    })
                    .catch(() => {});
                }}
                onSubmitWithdraw={(method, amount, accountNumber) => {
                  const me = sharedUsersRef.current[0];
                  if (!me) return;
                  const txStatus: 'pending' | 'approved' = requireDepositApproval ? 'pending' : 'approved';
                  const tempId = `ftx-${Date.now()}`;
                  const newTx: TransactionRecord = {
                    id: tempId,
                    userId: me.id,
                    userName: me.name,
                    userPhone: me.phone,
                    type: 'withdraw',
                    method,
                    amount,
                    referenceNumber: accountNumber,
                    status: txStatus,
                    timestamp: new Date().toLocaleString(),
                  };
                  setSharedTransactions((prev) => [newTx, ...prev]);
                  if (txStatus === 'approved') {
                    setSharedUsers((prev) =>
                      prev.map((u, i) =>
                        i === 0 ? { ...u, balance: Math.max(0, u.balance - amount) } : u
                      )
                    );
                    setGlobalWalletNotice(`✅ ${amount} ETB ወጪ ተከናውኗል!`);
                  } else {
                    setGlobalWalletNotice(
                      `⏳ የ ${amount} ETB ወጪ ጥያቄዎ እየተጣራ ነው (Pending Approval)።`
                    );
                  }
                  fetch(buildApiUrl('/api/transactions/submit'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: me.id,
                      userName: me.name,
                      userPhone: me.phone,
                      type: 'withdraw',
                      method,
                      amount,
                      referenceNumber: accountNumber,
                    }),
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (!data?.ok) {
                        setSharedTransactions((prev) => prev.filter((t) => t.id !== tempId));
                        if (txStatus === 'approved') {
                          setSharedUsers((prev) =>
                            prev.map((u, i) => (i === 0 ? { ...u, balance: u.balance + amount } : u))
                          );
                        }
                        setGlobalWalletNotice(data?.error || '❌ የወጪ ጥያቄው አልተሳካም!');
                        return;
                      }
                      if (Array.isArray(data.transactions)) {
                        mergeGlobalTransactions(data.transactions);
                      }
                    })
                    .catch(() => {});
                }}
                onSubmitTransfer={(recipientPhone, amount) => {
                  const me = sharedUsersRef.current[0];
                  if (!me) return;
                  const rawDigits = recipientPhone.replace(/\D/g, '');
                  const normalizedRecipient =
                    rawDigits.startsWith('251') && rawDigits.length === 12
                      ? `0${rawDigits.slice(3)}`
                      : rawDigits.length === 9 && /^[79]/.test(rawDigits)
                      ? `0${rawDigits}`
                      : rawDigits || recipientPhone.trim();
                  const refCode = `TR-${Date.now().toString().slice(-6)}`;
                  const newTx: TransactionRecord = {
                    id: `ftx-${Date.now()}`,
                    userId: me.id,
                    userName: me.name,
                    userPhone: me.phone,
                    type: 'transfer',
                    method: 'Wallet',
                    amount,
                    referenceNumber: refCode,
                    recipientPhone: normalizedRecipient,
                    fullSmsText: `Transfer ${amount.toFixed(2)} ETB from ${me.phone} (${me.name}) to ${normalizedRecipient}`,
                    status: 'approved',
                    timestamp: new Date().toLocaleString(),
                  };
                  setSharedTransactions((prev) => [newTx, ...prev]);
                  setSharedUsers((prev) =>
                    prev.map((u, i) => {
                      if (i === 0) {
                        return { ...u, balance: Math.max(0, Number((u.balance - amount).toFixed(2))) };
                      }
                      if (u.phone.trim() === normalizedRecipient) {
                        return { ...u, balance: Number((u.balance + amount).toFixed(2)) };
                      }
                      return u;
                    })
                  );
                  setGlobalWalletNotice(
                    `✅ ${amount.toFixed(2)} ETB ወደ ${normalizedRecipient} ዋሌት በተሳካ ሁኔታ ተልኳል!`
                  );
                  fetch(buildApiUrl('/api/transactions/submit'), {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      userId: me.id,
                      userName: me.name,
                      userPhone: me.phone,
                      type: 'transfer',
                      method: 'Wallet',
                      amount,
                      referenceNumber: refCode,
                      recipientPhone: normalizedRecipient,
                    }),
                  })
                    .then((r) => r.json())
                    .then((data) => {
                      if (data?.ok && Array.isArray(data.transactions)) {
                        mergeGlobalTransactions(data.transactions);
                      }
                    })
                    .catch(() => {});
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Secret Admin Login Modal (Unlocked via PIN 1234 or 7788) */}
      <AdminLoginModal
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
        isDark={isDark}
        isAdminAuthenticated={isAdminAuthenticated}
        onSuccess={() => {
          setIsAdminAuthenticated(true);
          setViewMode('admin');
          try {
            localStorage.removeItem('ezi_admin_authenticated_v2');
            sessionStorage.setItem('ezi_admin_session_v3', 'true');
          } catch {}
          window.location.hash = '#admin0923';
        }}
        onLogout={() => {
          setIsAdminAuthenticated(false);
          setViewMode('game');
          try {
            localStorage.removeItem('ezi_admin_authenticated_v2');
            sessionStorage.removeItem('ezi_admin_session_v3');
          } catch {}
          window.location.hash = '';
        }}
      />

      {/* Admin-Only 27 Rules & Registration Countdown Modal inside /admin0923 */}
      {isAdminAuthenticated && viewMode === 'admin' && (
        <RulesAndPatternsModal
          isOpen={isAdminRulesModalOpen}
          onClose={() => setIsAdminRulesModalOpen(false)}
          activePatternId={adminActivePatternId}
          isAdminAuthenticated={true}
          onSelectPattern={(patternId) => {
            setAdminActivePatternId(patternId);
            dispatchServerRoomAction({
              mode: 'regular',
              action: 'update_settings',
              activePatternId: patternId,
            });
            dispatchServerRoomAction({
              mode: 'fast',
              action: 'update_settings',
              activePatternId: patternId,
              applyAllRooms: true,
            });
            refreshAdminLiveState();
          }}
          onSetRegistrationMinutes={(minutes) => {
            const totalSecs = minutes > 0 ? Math.round(minutes * 60) : null;
            const curAdminMode: 'fast' | 'regular' =
              adminControlGame === 'regular' ? 'regular' : 'fast';
            dispatchServerRoomAction({
              mode: curAdminMode,
              stakeAmount: curAdminMode === 'fast' ? adminStakeTier : undefined,
              action: 'update_settings',
              countdownSeconds: totalSecs !== null ? totalSecs : undefined,
              preGameCountdown: totalSecs,
              isPlaying: false,
            }).then(() => refreshAdminLiveState());
          }}
          language={language}
          isDark={isDark}
        />
      )}

      {/* Global Real-time Game Start / Admin Broadcast Toast */}
      {isLoggedIn && activeGameNotification && (
        <div className="fixed top-3 inset-x-3 sm:left-auto sm:right-4 sm:max-w-sm z-[250000] pointer-events-auto">
          <div
            className={`rounded-2xl border shadow-2xl p-3 flex items-start gap-2.5 backdrop-blur-md ${
              isDark
                ? 'bg-[#0F172A]/95 border-amber-500/50 text-slate-100'
                : 'bg-white/95 border-amber-400 text-slate-900'
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0 space-y-1">
              <div className="text-xs font-black text-amber-400 truncate">
                {activeGameNotification.title}
              </div>
              <div className="text-[11px] leading-snug opacity-90 whitespace-pre-line">
                {activeGameNotification.message}
              </div>
              {activeGameNotification.game &&
                activeGameNotification.game !== 'admin' &&
                ['fast', 'regular', 'keno', 'ramino'].includes(activeGameNotification.game) && (
                  <button
                    type="button"
                    onClick={() => {
                      const target = activeGameNotification.game as
                        | 'fast'
                        | 'regular'
                        | 'keno'
                        | 'ramino';
                      setActiveGameNotification(null);
                      setViewMode('game');
                      handleSwitchMode(target);
                    }}
                    className="mt-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black cursor-pointer"
                  >
                    {tHub.playNowToast}
                  </button>
                )}
            </div>
            <button
              type="button"
              onClick={() => setActiveGameNotification(null)}
              className="p-1 rounded-lg opacity-70 hover:opacity-100 cursor-pointer shrink-0"
              aria-label="Close Notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
