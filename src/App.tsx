import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FastBingoStandaloneApp } from './components/FastBingoStandaloneApp';
import { RegularBingoStandaloneApp } from './components/RegularBingoStandaloneApp';
import { FastKenoScreen } from './components/FastKenoScreen';
import { LudoMasterGame } from './components/LudoMasterGame';
import { ModernRaminoGame } from './components/ModernRaminoGame';
import { AdminLoginModal } from './components/AdminLoginModal';
import { AdminPanelView } from './components/AdminPanelView';
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
} from './utils/realtimeRoomClient';
import {
  Language,
  TransactionRecord,
  UserAccount,
  BankPaymentAccount,
  HeroBannerAd,
  CallSpeed,
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
} from 'lucide-react';
import homePromoBannerImg from './assets/images/home_promo_banner_1794572556701.jpg';
import gameTileLudoImg from './assets/images/game_tile_ludo_1794572556916.jpg';
import gameTileBingoImg from './assets/images/game_tile_bingo_1794572557520.jpg';
import liyuBingoTileImg from './assets/images/liyu_bingo_tile_1794575305419.jpg';
import gameTileKenoImg from './assets/images/game_tile_keno_1794572558494.jpg';
import gameTileConkerImg from './assets/images/game_tile_conker_1794572558656.jpg';

type GameKey = 'ludo' | 'fast' | 'regular' | 'keno' | 'ramino' | 'dama';
type GameVisibilityMap = Record<GameKey, { visible: boolean; comingSoon: boolean }>;

const DEFAULT_GAME_VISIBILITY: GameVisibilityMap = {
  ludo: { visible: true, comingSoon: true },
  fast: { visible: true, comingSoon: false },
  regular: { visible: true, comingSoon: false },
  keno: { visible: true, comingSoon: false },
  ramino: { visible: true, comingSoon: false },
  dama: { visible: true, comingSoon: true },
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
    ludoTitle: string;
    fastTitle: string;
    regularTitle: string;
    kenoTitle: string;
    raminoTitle: string;
    damaTitle: string;
    bannerDefaultBadge: string;
    bannerDefaultCta: string;
    noVisibleGames: string;
    defaultSlides: {
      badge: string;
      title: string;
      subtitle: string;
      cta: string;
      target: 'fast' | 'ramino' | 'ludo' | 'regular' | 'keno';
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
    chooseGameTitle: 'ጨዋታ ይምረጡ',
    chooseGameSubtitle: 'የሚፈልጉትን ጨዋታ ነክተው አሁን ይጀምሩ',
    soonBadge: 'በቅርቡ',
    soonNotice: (title) => `⏳ ${title} በቅርብ ቀን ሲጠናቀቅ ይለቀቃል!`,
    gameHiddenNotice: '⚠️ ይህ ጨዋታ ለማስተካከል በአድሚን ለጊዜው ተደብቋል።',
    ludoTitle: 'ሉዶ',
    fastTitle: 'ፈጣን ቢንጎ',
    regularTitle: 'ልዩ ቢንጎ',
    kenoTitle: 'ኬኖ',
    raminoTitle: 'ራሚኖ',
    damaTitle: 'ዳማ',
    bannerDefaultBadge: 'ማስታወቂያ',
    bannerDefaultCta: 'አሁን ይጫወቱ →',
    noVisibleGames: 'ለጊዜው የሚታዩ ጨዋታዎች የሉም፤ የጥገና ስራ ላይ ነን።',
    defaultSlides: [
      {
        badge: 'ዋና ማዕከል',
        title: 'ሁሉንም ጨዋታዎች በአንድ ቦታ',
        subtitle: 'ዕድልዎን ዛሬ ይሞክሩ! ፈጣን ድል እና ታላቅ ሽልማት።',
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
        badge: 'በቅርቡ',
        title: 'ሉዶ — በቅርብ ቀን ይለቀቃል',
        subtitle: 'ሲጠናቀቅ ወዲያውኑ በሁሉም ስልክ ይከፈታል።',
        cta: 'በቅርብ ቀን 🔜',
        target: 'ludo',
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
    ludoTitle: 'ሉዶ',
    fastTitle: 'ቅልጡፍ ቢንጎ',
    regularTitle: 'ልዩ ቢንጎ',
    kenoTitle: 'ኬኖ',
    raminoTitle: 'ራሚኖ',
    damaTitle: 'ዳማ',
    bannerDefaultBadge: 'መወዓውዒ',
    bannerDefaultCta: 'ሕጂ ተጻወቱ →',
    noVisibleGames: 'ንግዚኡ ዝርኣዩ ጸወታታት የለዉን።',
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
        badge: 'ብቐረባ',
        title: 'ሉዶ — ብቐረባ ክለቀቕ እዩ',
        subtitle: 'ምስ ተዛዘመ ብቀጥታ ክኽፈት እዩ።',
        cta: 'ብቐረባ 🔜',
        target: 'ludo',
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
    ludoTitle: 'Luudoo',
    fastTitle: 'Biingoo Ariifataa',
    regularTitle: 'Biingoo Addaa',
    kenoTitle: 'Keenoo',
    raminoTitle: 'Raaminoo',
    damaTitle: 'Daamaa',
    bannerDefaultBadge: 'Beeksisa',
    bannerDefaultCta: 'Amma Taphadhu →',
    noVisibleGames: 'Yeroof taphoonni mul\'atan hin jiran.',
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
        badge: 'Dhiyootti',
        title: 'Luudoo — Dhiyootti Ni Dhufa',
        subtitle: 'Yeroo xumuramu battalumatti ni banama.',
        cta: 'Dhiyootti 🔜',
        target: 'ludo',
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
    ludoTitle: 'Ludo',
    fastTitle: 'Fast Bingo',
    regularTitle: 'Liyu Bingo',
    kenoTitle: 'Keno',
    raminoTitle: 'Conker Ramino',
    damaTitle: 'Dama',
    bannerDefaultBadge: 'Featured',
    bannerDefaultCta: 'Play Now →',
    noVisibleGames: 'No games are currently visible while maintenance is underway.',
    defaultSlides: [
      {
        badge: 'Featured',
        title: 'All Your Favorite Games in One Place',
        subtitle: 'Try your luck today with instant payouts and exciting wins.',
        cta: 'Play Now →',
        target: 'fast',
      },
      {
        badge: 'Conker Ramino',
        title: 'Private Friend Tables & Live Voice',
        subtitle: 'Dopey 2x • Joker Dopey 3x • Post Day after 5 rounds!',
        cta: 'Enter Ramino →',
        target: 'ramino',
      },
      {
        badge: 'Coming Soon',
        title: 'Ludo Master — Launching Soon',
        subtitle: 'Currently finalizing gameplay and matchmaking.',
        cta: 'Soon 🔜',
        target: 'ludo',
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
  // Defaults strictly to false so regular players never see admin controls!
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('ezi_admin_authenticated_v2');
      return saved === 'true';
    }
    return false;
  });

  const [viewMode, setViewMode] = useState<'game' | 'admin'>('game');
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('ezi_admin_authenticated_v2', String(isAdminAuthenticated));
    } catch {}
  }, [isAdminAuthenticated]);

  const [showGameHub, setShowGameHub] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('raminoRoom') || params.get('mode') || params.get('app') || params.get('game')) {
        return false;
      }
    }
    return true;
  });

  const tHub = HUB_T[language] || HUB_T.am;
  const [promoSlideIndex, setPromoSlideIndex] = useState(0);
  const [hubMenuOpen, setHubMenuOpen] = useState(false);
  const [hubNotice, setHubNotice] = useState<string | null>(null);
  const hubMenuRef = useRef<HTMLDivElement | null>(null);
  const [liveGameCounts, setLiveGameCounts] = useState<{
    fast: number;
    regular: number;
    keno: number;
    ramino: number;
    ludo: number;
    dama: number;
  }>({ fast: 0, regular: 0, keno: 0, ramino: 0, ludo: 0, dama: 0 });

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
      fetch(buildApiUrl('/api/home-ads'))
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
    };

    fetchVisibility();
    fetchHomeAds();
    const syncTimer = window.setInterval(() => {
      fetchVisibility();
      fetchHomeAds();
    }, 5000);
    return () => window.clearInterval(syncTimer);
  }, []);

  const persistHomeAdsToServer = useCallback((nextAds: HeroBannerAd[]) => {
    setHeroBanners(nextAds);
    try {
      localStorage.setItem('sun_home_ads_v1', JSON.stringify(nextAds));
    } catch {}
    fetch(buildApiUrl('/api/home-ads'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ heroBanners: nextAds }),
    }).catch(() => {});
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

  // Active game mode: defaults to 'fast' (Fast Bingo)
  const [gameMode, setGameMode] = useState<'fast' | 'regular' | 'keno' | 'ludo' | 'ramino'>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const mode = params.get('mode') || params.get('app') || params.get('game');
      if (mode === 'ramino' || params.has('raminoRoom')) return 'ramino';
      if (mode === 'keno') return 'keno';
      if (mode === 'ludo') return 'ludo';
      if (mode === 'regular') return 'regular';
      if (mode === 'fast') return 'fast';

      const saved = localStorage.getItem('ezi_bingo_active_mode');
      if (saved === 'ramino' || saved === 'keno' || saved === 'ludo' || saved === 'regular' || saved === 'fast') {
        return saved as 'fast' | 'regular' | 'keno' | 'ludo' | 'ramino';
      }
    }
    return 'fast';
  });

  const handleSwitchMode = (mode: 'fast' | 'regular' | 'keno' | 'ludo' | 'ramino') => {
    const vis = gameVisibility[mode];
    if (vis && vis.visible === false) {
      setShowGameHub(true);
      setHubNotice(tHub.gameHiddenNotice);
      return;
    }
    if (vis && vis.comingSoon) {
      const titleMap: Record<string, string> = {
        ludo: tHub.ludoTitle,
        fast: tHub.fastTitle,
        regular: tHub.regularTitle,
        keno: tHub.kenoTitle,
        ramino: tHub.raminoTitle,
      };
      setShowGameHub(true);
      setHubNotice(tHub.soonNotice(titleMap[mode] || mode));
      return;
    }
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

      // Save pending Ramino private room invite code and switch directly to Ramino
      const raminoRoom = p.get('raminoRoom');
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
        const saved = localStorage.getItem('ezi_admin_authenticated_v2');
        if (saved === 'true') {
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
    let initialBalance = 500.0;
    if (typeof window !== 'undefined') {
      const savedBal = parseFloat(localStorage.getItem('sun_unified_wallet_balance_v1') || '');
      if (!Number.isNaN(savedBal) && savedBal >= 0) {
        initialBalance = savedBal;
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

  const [sharedTransactions, setSharedTransactions] = useState<TransactionRecord[]>([]);
  const [requireDepositApproval, setRequireDepositApproval] = useState<boolean>(true);
  const [isGlobalWalletOpen, setIsGlobalWalletOpen] = useState<boolean>(false);
  const [globalWalletTab, setGlobalWalletTab] = useState<'deposit' | 'withdraw' | 'transfer' | 'history'>('deposit');
  const [globalWalletNotice, setGlobalWalletNotice] = useState<string | null>(null);

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
      return combined.slice(0, 600);
    });
  }, []);

  const recordGameWalletDelta = useCallback(
    (delta: number, game: 'keno' | 'ramino', reason?: string) => {
      if (!Number.isFinite(delta) || delta === 0) return;
      const curUser = sharedUsersRef.current[0];
      const tempId = `gtx-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const txType: 'bet' | 'win' = delta < 0 ? 'bet' : 'win';
      const methodLabel = game === 'keno' ? 'Fast Keno' : 'Conker Ramino';

      setSharedUsers((prev) =>
        prev.map((u, idx) =>
          idx === 0 ? { ...u, balance: Math.max(0, Number((u.balance + delta).toFixed(2))) } : u
        )
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
          })
          .catch(() => {});
      }
    },
    []
  );

  const currentUserPhone = sharedUsers[0]?.phone;
  const currentUserBalance = sharedUsers[0]?.balance;

  // Persist unified wallet locally whenever it changes
  useEffect(() => {
    if (typeof currentUserBalance === 'number' && !Number.isNaN(currentUserBalance)) {
      try {
        localStorage.setItem('sun_unified_wallet_balance_v1', String(currentUserBalance));
      } catch {}
    }
  }, [currentUserBalance]);

  // Keep unified wallet & transactions synced with server across Home Hub, Bingo, Keno, and Ramino
  useEffect(() => {
    if (!isLoggedIn) return;
    const clientId = getDeviceClientId();
    const phoneParam = encodeURIComponent(sharedUsersRef.current[0]?.phone || '');
    const nameParam = encodeURIComponent(sharedUsersRef.current[0]?.name || 'Sun Player');

    fetch(
      buildApiUrl(
        `/api/live-room/state?mode=fast&phone=${phoneParam}&name=${nameParam}&clientId=${encodeURIComponent(clientId)}`
      )
    )
      .then((r) => r.json())
      .then((data) => {
        if (!data?.ok) return;
        if (typeof data.requireDepositApproval === 'boolean') {
          setRequireDepositApproval(data.requireDepositApproval);
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
            const others = syncedPlayers
              .filter((p) => p.phone !== myPhone)
              .map((p, idx) => ({
                id: p.id || `u-${p.phone || idx}`,
                name: p.name || `User_${idx}`,
                phone: p.phone || `091100000${idx}`,
                passwordHash: '****',
                balance: typeof p.balance === 'number' ? p.balance : 0,
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
                  balance: typeof serverMe.balance === 'number' ? serverMe.balance : prev[0].balance,
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

    const unsubscribe = subscribeRealtimeRoomSync((msg) => {
      if (typeof msg?.requireDepositApproval === 'boolean') {
        setRequireDepositApproval(msg.requireDepositApproval);
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
          const others = syncedPlayers
            .filter((p) => p.phone !== myPhone)
            .map((p, idx) => ({
              id: p.id || `u-${p.phone || idx}`,
              name: p.name || `User_${idx}`,
              phone: p.phone || `091100000${idx}`,
              passwordHash: '****',
              balance: typeof p.balance === 'number' ? p.balance : 0,
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
                balance: typeof serverMe.balance === 'number' ? serverMe.balance : prev[0].balance,
                bonusBalance:
                  typeof serverMe.bonusBalance === 'number' ? serverMe.bonusBalance : prev[0].bonusBalance,
                isBlocked: !!serverMe.isBlocked,
              }
            : prev[0];
          return [updatedMe, ...others];
        });
      }
    });
    return () => unsubscribe();
  }, [isLoggedIn, mergeGlobalTransactions]);

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
    const timer = window.setInterval(sendPresence, 8000);
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
              ludo: Number(data.counts.ludo || 0),
              dama: Number(data.counts.dama || 0),
            });
          }
        })
        .catch(() => {});
    };
    fetchCounts();
    const timer = window.setInterval(fetchCounts, 4000);
    return () => window.clearInterval(timer);
  }, [isLoggedIn, showGameHub]);

  // Unified Logout Function
  const handleLogout = () => {
    try {
      localStorage.setItem('ezi_phone_registered_v2', 'false');
      localStorage.removeItem('ezi_player_auth_session');
    } catch {}
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
        balance: typeof player.balance === 'number' ? player.balance : me?.balance ?? 500,
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
      className={`min-h-screen font-sans flex flex-col transition-colors ${
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
                onClick={() => handleSwitchMode('ludo')}
                className={`px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg text-[11px] sm:text-xs font-black flex items-center gap-1 transition-all cursor-pointer ${
                  gameMode === 'ludo'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-md shadow-purple-500/20'
                    : isDark
                    ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-300/50'
                }`}
                title="Sun Ludo Master"
              >
                <Trophy className="w-3 h-3 text-amber-400" />
                <span>Ludo</span>
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
                title="EZI Ramino (መቀለ ራሚኖ)"
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
                  localStorage.setItem('ezi_admin_authenticated_v2', 'false');
                } catch {}
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

            <AdminPanelView
              isAdminAuthenticated={isAdminAuthenticated}
              isFastMode={gameMode === 'fast'}
              stakeAmount={10}
              prizeAmount={80}
              blockedCartelaIds={[]}
              totalCartelasCount={100}
              registeredCartelasCount={15}
              isPlaying={adminIsPlaying}
              isPaused={adminIsPaused}
              callSpeedSec={adminCallSpeed}
              onChangeSpeed={(sec) => setAdminCallSpeed(sec)}
              onTogglePause={() => setAdminIsPaused(!adminIsPaused)}
              onDrawNextManual={() => {}}
              onResetGame={() => {}}
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
              onAdjustUserBalance={(uid, delta) => {
                setSharedUsers((prev) =>
                  prev.map((u) =>
                    u.id === uid ? { ...u, balance: Math.max(0, u.balance + delta) } : u
                  )
                );
              }}
              onToggleUserBlock={(uid) => {
                setSharedUsers((prev) =>
                  prev.map((u) => (u.id === uid ? { ...u, isBlocked: !u.isBlocked } : u))
                );
              }}
              onApproveRejectTransaction={(txId, status) => {
                setSharedTransactions((prev) =>
                  prev.map((tx) => (tx.id === txId ? { ...tx, status } : tx))
                );
              }}
              onStartRegistrationCountdown={() => {}}
              onBlockCartelaId={() => {}}
              onUnblockCartelaId={() => {}}
            />
          </div>
        ) : showGameHub ? (
          /* 3. SUN GAMES HOME HUB (Matches dark gaming hub with hero banner + 3-column game cards) */
          <div
            className={`flex-1 flex flex-col min-h-screen transition-colors ${
              isDark ? 'bg-[#0B1120] text-slate-100' : 'bg-slate-100 text-slate-900'
            }`}
          >
            {/* Top Bar */}
            <header
              className={`sticky top-0 z-40 px-4 py-3 flex items-center justify-between border-b backdrop-blur-md ${
                isDark
                  ? 'bg-[#0B1120]/95 border-slate-800/80'
                  : 'bg-white/95 border-slate-200'
              }`}
            >
              {/* Left: Wallet Balance -> Opens Unified Global Wallet */}
              <button
                type="button"
                onClick={() => openGlobalWallet('deposit')}
                className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 text-sm font-extrabold tabular-nums transition-all cursor-pointer active:scale-95 ${
                  isDark
                    ? 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-white'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-300 text-slate-900'
                }`}
                title={tHub.walletTitle}
              >
                <Wallet className="w-4 h-4 text-sky-400 shrink-0" />
                <span>{Math.floor(sharedUsers[0]?.balance ?? 500)}</span>
              </button>

              {/* Center: Two-Tone Wordmark */}
              <div className="font-black text-lg sm:text-xl tracking-wider flex items-center gap-1 select-none whitespace-nowrap">
                <span className="text-amber-400">SUN</span>
                <span className="text-sky-400">GAMES</span>
              </div>

              {/* Right: Menu Drawer (Notifications / Bell inside Menu; No direct Admin shortcut) */}
              <div className="flex items-center gap-2 relative" ref={hubMenuRef}>
                <button
                  type="button"
                  onClick={() => setHubMenuOpen((prev) => !prev)}
                  className={`p-2 rounded-xl transition-colors cursor-pointer ${
                    isDark
                      ? 'text-slate-200 hover:text-amber-400 hover:bg-slate-800/70'
                      : 'text-slate-800 hover:bg-slate-200'
                  }`}
                  aria-label="Menu"
                >
                  {hubMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>

                {hubMenuOpen && (
                  <div
                    className={`absolute right-0 top-12 w-64 rounded-2xl border shadow-2xl p-2.5 z-50 space-y-2 ${
                      isDark
                        ? 'bg-[#11192E] border-slate-700/80 text-slate-100'
                        : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  >
                    <div
                      className={`px-3 py-2 rounded-xl text-xs border ${
                        isDark
                          ? 'bg-slate-900/80 border-slate-800 text-slate-300'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="font-black text-amber-400 truncate">
                        {sharedUsers[0]?.name || 'Sun Player'}
                      </div>
                      <div className="text-[11px] opacity-75">{sharedUsers[0]?.phone}</div>
                    </div>

                    {/* Notifications / Bell inside Menu */}
                    <button
                      type="button"
                      onClick={() => {
                        setHubNotice(
                          tHub.helloPlayer(
                            sharedUsers[0]?.name || 'Sun Player',
                            Math.floor(sharedUsers[0]?.balance ?? 500),
                            Math.floor(sharedUsers[0]?.bonusBalance ?? 0)
                          )
                        );
                        setHubMenuOpen(false);
                      }}
                      className={`w-full px-3 py-2 rounded-xl text-xs border flex items-start gap-2 text-left cursor-pointer transition-colors ${
                        isDark
                          ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-200'
                          : 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900'
                      }`}
                    >
                      <Bell className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-black">{tHub.notificationsTitle}</div>
                        <div className="text-[11px] opacity-80">
                          {tHub.walletSummary(
                            Math.floor(sharedUsers[0]?.balance ?? 500),
                            Math.floor(sharedUsers[0]?.bonusBalance ?? 0)
                          )}
                        </div>
                      </div>
                    </button>

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
                              ? 'hover:bg-slate-800 text-slate-300'
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
                        isDark ? 'hover:bg-slate-800 text-slate-200' : 'hover:bg-slate-100 text-slate-800'
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

            <main className="w-full max-w-2xl mx-auto px-3.5 sm:px-5 pt-4 pb-10 space-y-5">
              {/* Inline Status Notice (for Bell / Soon games) */}
              {hubNotice && (
                <div className="px-4 py-2.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-300 text-xs sm:text-sm font-bold text-center">
                  {hubNotice}
                </div>
              )}

              {/* Hero Promotional Carousel Banner (Synced with Admin Ads Creator) */}
              {(() => {
                const carouselSlides: {
                  id: string;
                  badge: string;
                  title: string;
                  subtitle: string;
                  cta: string;
                  imageUrl: string;
                  target: 'fast' | 'regular' | 'keno' | 'ramino' | 'ludo' | 'none';
                }[] =
                  activeAdminAds.length > 0
                    ? activeAdminAds.map((ad) => ({
                        id: ad.id,
                        badge: ad.badgeText || tHub.bannerDefaultBadge,
                        title: ad.title,
                        subtitle: ad.subtitle,
                        cta: ad.ctaText || tHub.bannerDefaultCta,
                        imageUrl: ad.imageUrl || homePromoBannerImg,
                        target: (ad.targetGame || 'fast') as 'fast' | 'regular' | 'keno' | 'ramino' | 'ludo' | 'none',
                      }))
                    : tHub.defaultSlides.map((s, idx) => ({
                        id: `default_${idx}`,
                        badge: s.badge,
                        title: s.title,
                        subtitle: s.subtitle,
                        cta: s.cta,
                        imageUrl: homePromoBannerImg,
                        target: s.target,
                      }));

                const safeIndex = promoSlideIndex % carouselSlides.length;
                const activeSlide = carouselSlides[safeIndex];
                return (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        if (activeSlide.target === 'none') return;
                        handleSwitchMode(activeSlide.target);
                      }}
                      className="relative w-full aspect-[16/8.2] rounded-2xl overflow-hidden border border-sky-500/30 shadow-xl shadow-black/40 group text-left cursor-pointer block"
                    >
                      <img
                        src={activeSlide.imageUrl}
                        alt={activeSlide.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-[1.03]"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-[#071124]/92 via-[#071124]/55 to-transparent" />
                      <div className="absolute inset-0 p-4 sm:p-6 flex flex-col justify-between">
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[10px] sm:text-xs font-black uppercase tracking-wider text-amber-300">
                            {activeSlide.badge}
                          </span>
                        </div>
                        <div className="max-w-[78%] space-y-1">
                          <h2 className="text-sm sm:text-xl font-black text-white leading-snug drop-shadow">
                            {activeSlide.title}
                          </h2>
                          <p className="text-[11px] sm:text-xs text-slate-200/90 leading-snug line-clamp-2">
                            {activeSlide.subtitle}
                          </p>
                          <div className="pt-1">
                            <span className="inline-flex items-center px-3 py-1 rounded-lg bg-amber-400 text-slate-950 text-[11px] sm:text-xs font-black shadow">
                              {activeSlide.cta}
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>

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
                              ? 'w-5 bg-amber-400'
                              : 'w-1.5 bg-slate-600 hover:bg-slate-400'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Section Title */}
              <div className="text-center pt-1 pb-0.5 space-y-0.5">
                <h1 className="text-xl sm:text-2xl font-black text-amber-400 tracking-tight">
                  {tHub.chooseGameTitle}
                </h1>
                <p className="text-xs text-slate-400 font-medium">{tHub.chooseGameSubtitle}</p>
              </div>

              {/* 3-Column Game Artwork Card Grid (Filtered by Admin Visibility Control) */}
              {(() => {
                const allTiles: {
                  key: GameKey;
                  title: string;
                  players: number;
                  image?: string;
                  isDamaSvg?: boolean;
                }[] = [
                  { key: 'ludo', title: tHub.ludoTitle, players: liveGameCounts.ludo, image: gameTileLudoImg },
                  { key: 'fast', title: tHub.fastTitle, players: liveGameCounts.fast, image: gameTileBingoImg },
                  { key: 'regular', title: tHub.regularTitle, players: liveGameCounts.regular, image: liyuBingoTileImg },
                  { key: 'keno', title: tHub.kenoTitle, players: liveGameCounts.keno, image: gameTileKenoImg },
                  { key: 'ramino', title: tHub.raminoTitle, players: liveGameCounts.ramino, image: gameTileConkerImg },
                  { key: 'dama', title: tHub.damaTitle, players: liveGameCounts.dama, isDamaSvg: true },
                ];

                const visibleTiles = allTiles.filter((item) => gameVisibility[item.key]?.visible !== false);

                if (visibleTiles.length === 0) {
                  return (
                    <div className="p-6 rounded-2xl bg-slate-900/70 border border-slate-800 text-center text-xs font-bold text-slate-400">
                      {tHub.noVisibleGames}
                    </div>
                  );
                }

                return (
                  <div className="grid grid-cols-3 gap-3 sm:gap-4">
                    {visibleTiles.map((item) => {
                      const isSoon = Boolean(gameVisibility[item.key]?.comingSoon);
                      const handleTileClick = () => {
                        if (isSoon || item.key === 'dama') {
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
                          className="group flex flex-col items-center gap-1.5 cursor-pointer focus:outline-none"
                        >
                          <div className="relative w-full aspect-square rounded-2xl overflow-hidden border border-slate-800/90 bg-slate-900 shadow-lg shadow-black/40 group-hover:border-amber-400/70 transition-all">
                            {item.isDamaSvg ? (
                              <svg
                                viewBox="0 0 120 120"
                                className="w-full h-full transition-transform duration-300 group-hover:scale-105 bg-[#1B1410]"
                                aria-label={item.title}
                              >
                                {Array.from({ length: 6 }).map((_, r) =>
                                  Array.from({ length: 6 }).map((__, c) => (
                                    <rect
                                      key={`${r}-${c}`}
                                      x={c * 20}
                                      y={r * 20}
                                      width={20}
                                      height={20}
                                      fill={(r + c) % 2 === 0 ? '#D4A373' : '#4A2C18'}
                                    />
                                  ))
                                )}
                                <circle cx="30" cy="10" r="7" fill="#1E1B18" stroke="#F59E0B" strokeWidth="1.2" />
                                <circle cx="70" cy="10" r="7" fill="#1E1B18" stroke="#F59E0B" strokeWidth="1.2" />
                                <circle cx="90" cy="30" r="7" fill="#1E1B18" stroke="#F59E0B" strokeWidth="1.2" />
                                <circle cx="30" cy="90" r="7" fill="#FDE68A" stroke="#92400E" strokeWidth="1.5" />
                                <circle cx="70" cy="90" r="7" fill="#FDE68A" stroke="#92400E" strokeWidth="1.5" />
                                <circle cx="50" cy="70" r="7" fill="#FDE68A" stroke="#92400E" strokeWidth="1.5" />
                              </svg>
                            ) : (
                              <img
                                src={item.image}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                            {isSoon && (
                              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 text-amber-400 border border-amber-500/40">
                                {tHub.soonBadge}
                              </span>
                            )}
                            <span className="absolute bottom-2 inset-x-1.5 text-center text-[11px] sm:text-xs font-black tracking-wide text-white drop-shadow">
                              {item.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs font-bold text-slate-300 tabular-nums">
                            <User className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span>{item.players}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                );
              })()}
            </main>
          </div>
        ) : (
          /* 4. LOGGED-IN GAMEPLAY VIEW (Fast Bingo, Regular Bingo, Fast Keno, Ludo, or Ramino) */
          gameMode === 'fast' ? (
            <FastBingoStandaloneApp
              onSwitchToRegularApp={() => handleSwitchMode('regular')}
              onBackToLobby={handleReturnToHub}
              language={language}
              onChangeLanguage={handleUpdateLanguage}
              sharedUsers={sharedUsers}
              onUpdateSharedUsers={setSharedUsers}
              sharedTransactions={sharedTransactions}
              onUpdateSharedTransactions={setSharedTransactions}
              isAdminAuthenticated={isAdminAuthenticated}
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
            />
          ) : gameMode === 'regular' ? (
            <RegularBingoStandaloneApp
              onSwitchToFastApp={() => handleSwitchMode('fast')}
              onBackToLobby={handleReturnToHub}
              language={language}
              onChangeLanguage={handleUpdateLanguage}
              sharedUsers={sharedUsers}
              onUpdateSharedUsers={setSharedUsers}
              sharedTransactions={sharedTransactions}
              onUpdateSharedTransactions={setSharedTransactions}
              isAdminAuthenticated={isAdminAuthenticated}
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
            />
          ) : gameMode === 'keno' ? (
            <div className="flex-1 w-full flex flex-col items-center justify-start overflow-y-auto">
              <div className="w-full max-w-2xl min-h-full">
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
              </div>
            </div>
          ) : gameMode === 'ludo' ? (
            <div className="flex-1 w-full flex flex-col items-center justify-start overflow-y-auto p-2 sm:p-4">
              <div className="w-full max-w-4xl">
                <LudoMasterGame
                  balanceBirr={sharedUsers[0]?.balance ?? 500}
                  onAdjustBalance={(delta) => {
                    setSharedUsers((prev) =>
                      prev.map((u, idx) =>
                        idx === 0 ? { ...u, balance: Math.max(0, u.balance + delta) } : u
                      )
                    );
                  }}
                  onBackToLobby={handleReturnToHub}
                  sharedUsers={sharedUsers}
                  onUpdateSharedUsers={setSharedUsers}
                />
              </div>
            </div>
          ) : (
            <div className="fixed inset-0 z-50 bg-[#0f0728] overflow-y-auto overflow-x-hidden flex flex-col">
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

      {/* Unified Global Wallet Modal (Accessible from Home Hub, Fast Keno, and Conker Ramino) */}
      {isLoggedIn && isGlobalWalletOpen && sharedUsers[0] && (
        <div
          className="fixed inset-0 z-[200000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-hidden"
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

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 sm:p-4">
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
                  const txStatus: 'pending' | 'approved' = requireDepositApproval ? 'pending' : 'approved';
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
                    status: txStatus,
                    timestamp: new Date().toLocaleString(),
                  };
                  setSharedTransactions((prev) => [newTx, ...prev]);
                  if (txStatus === 'approved') {
                    setSharedUsers((prev) =>
                      prev.map((u, i) => (i === 0 ? { ...u, balance: u.balance + amount } : u))
                    );
                    setGlobalWalletNotice(`✅ ${amount} ETB ወደ ዋሌትዎ ገቢ ሆኗል!`);
                  } else {
                    setGlobalWalletNotice(
                      `⏳ የ ${amount} ETB ገቢ ጥያቄዎ ተልኳል! ሲጸድቅ ወዲያውኑ ወደ ዋሌትዎ ይገባል።`
                    );
                  }
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
                        if (txStatus === 'approved') {
                          setSharedUsers((prev) =>
                            prev.map((u, i) =>
                              i === 0 ? { ...u, balance: Math.max(0, u.balance - amount) } : u
                            )
                          );
                        }
                        setGlobalWalletNotice(
                          data?.error || '❌ የተደገመ የክፍያ ደረሰኝ (Duplicate Transaction) ተቀባይነት የለውም!'
                        );
                        return;
                      }
                      if (Array.isArray(data.transactions)) {
                        mergeGlobalTransactions(data.transactions);
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
            localStorage.setItem('ezi_admin_authenticated_v2', 'true');
          } catch {}
          window.location.hash = '#admin0923';
        }}
        onLogout={() => {
          setIsAdminAuthenticated(false);
          setViewMode('game');
          try {
            localStorage.setItem('ezi_admin_authenticated_v2', 'false');
          } catch {}
          window.location.hash = '';
        }}
      />
    </div>
  );
}
