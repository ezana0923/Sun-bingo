import { HeroBannerAd, Language } from '../types/bingo';

interface AdTextPack {
  badgeText?: string;
  title: string;
  subtitle: string;
  ctaText?: string;
}

const EXACT_PHRASE_TRANSLATIONS: Record<string, Partial<Record<Language, string>>> = {
  'ፈጣን ገቢ፣ ፈጣን ወጪ': {
    am: 'ፈጣን ገቢ፣ ፈጣን ወጪ',
    en: 'Fast Deposit, Instant Withdrawal',
    ti: 'ቅልጡፍ ኣታዊ፣ ቅልጡፍ ወጻኢ',
    om: 'Galii Ariifataa, Baasii Ariifataa',
  },
  'ያሸነፉትን ወዲያውኑ ይውሰዱ': {
    am: 'ያሸነፉትን ወዲያውኑ ይውሰዱ',
    en: 'Withdraw your winnings immediately!',
    ti: 'ዝተዓወትኩምዎ ብኡንብኡ ውሰዱ!',
    om: 'Waan mo’attan battalumatti fudhadhaa!',
  },
  '10% የገቢ ቦነስ': {
    am: '10% የገቢ ቦነስ',
    en: '10% Deposit Bonus',
    ti: '10% ቦነስ ኣታዊ',
    om: 'Boonasii Galii 10%',
  },
  'ገንዘብ ባስገቡ ቁጥር ተጨማሪ ያግኙ': {
    am: 'ገንዘብ ባስገቡ ቁጥር ተጨማሪ ያግኙ',
    en: 'Get extra bonus every time you deposit!',
    ti: 'ገንዘብ ብዘእተኹም ቁጽሪ ተወሳኺ ርኸቡ!',
    om: 'Yeroo hunda yoo galchitan dabalata argadhaa!',
  },
  'ቦነስዎን ይውሰዱ →': {
    am: 'ቦነስዎን ይውሰዱ →',
    en: 'Claim Your Bonus →',
    ti: 'ቦነስኩም ውሰዱ →',
    om: 'Boonasii Keessan Fudhadhaa →',
  },
  'ራሚ ይጫወቱ፣ ይሸለሙ': {
    am: 'ራሚ ይጫወቱ፣ ይሸለሙ',
    en: 'Play Ramino & Win Rewards',
    ti: 'ራሚኖ ተጻወቱ፣ ተሸለሙ',
    om: 'Raaminoo Taphadhaa, Badhaafamaa',
  },
  'ራሚኖ ይጫወቱ፣ ይሸለሙ': {
    am: 'ራሚኖ ይጫወቱ፣ ይሸለሙ',
    en: 'Play Ramino & Win Rewards',
    ti: 'ራሚኖ ተጻወቱ፣ ተሸለሙ',
    om: 'Raaminoo Taphadhaa, Badhaafamaa',
  },
  '10% ቦነስ · ትልቅ ጃክፖት · ፈጣን ክፍያ': {
    am: '10% ቦነስ · ትልቅ ጃክፖት · ፈጣን ክፍያ',
    en: '10% Bonus · Huge Jackpot · Instant Payout',
    ti: '10% ቦነስ · ዓብዪ ጃክፖት · ቅልጡፍ ክፍሊት',
    om: 'Boonasii 10% · Jaakpootii Guddaa · Kaffaltii Ariifataa',
  },
  'ልዩ ቢንጎ ፣ ልዩ ሽልማት': {
    am: 'ልዩ ቢንጎ ፣ ልዩ ሽልማት',
    en: 'Liyu Bingo, Special Rewards',
    ti: 'ልዩ ቢንጎ ፣ ፍሉይ ሽልማት',
    om: 'Biingoo Addaa, Badhaasa Addaa',
  },
  'ከልዩ ቦነስ ካርቴላ 4+1 8+2 እንደዛ ይቀጥላል': {
    am: 'ከልዩ ቦነስ ካርቴላ 4+1 8+2 እንደዛ ይቀጥላል',
    en: 'Free Bonus Cartelas: 4+1, 8+2 and more as you play!',
    ti: 'ብፍሉይ ቦነስ ካርቴላ 4+1 8+2 ከምኡ እንዳበለ ይቕጽል!',
    om: 'Kaartelaa Boonasii Addaa 4+1, 8+2 fi kan biroo!',
  },
  'አሁን ይጫወቱ →': {
    am: 'አሁን ይጫወቱ →',
    en: 'Play Now →',
    ti: 'ሕጂ ተጻወቱ →',
    om: 'Amma Taphadhaa →',
  },
  'SUN GAMES ልዩ ማስታወቂያ': {
    am: 'SUN GAMES ልዩ ማስታወቂያ',
    en: 'SUN GAMES Special Promo',
    ti: 'SUN GAMES ፍሉይ መወዓውዒ',
    om: 'Beeksisa Addaa SUN GAMES',
  },
  'ዕድልዎን ዛሬ ይሞክሩ! ፈጣን ድል እና ታላቅ ሽልማት።': {
    am: 'ዕድልዎን ዛሬ ይሞክሩ! ፈጣን ድል እና ታላቅ ሽልማት።',
    en: 'Try your luck today! Fast wins and huge rewards.',
    ti: 'ዕድልኩም ሎሚ ፈትኑ! ቅልጡፍ ዓወትን ዓብዪ ሽልማትን።',
    om: 'Carraa keessan har’a yaalaa! Injifannoo ariifataa fi badhaasa guddaa.',
  },
  'ማስታወቂያ': {
    am: 'ማስታወቂያ',
    en: 'Promo',
    ti: 'መወዓውዒ',
    om: 'Beeksisa',
  },
  'SUN GAMES': {
    am: 'SUN GAMES',
    en: 'SUN GAMES',
    ti: 'SUN GAMES',
    om: 'SUN GAMES',
  },
};

const PHRASE_REPLACEMENTS: Array<{
  am: RegExp;
  en: string;
  ti: string;
  om: string;
}> = [
  { am: /ፈጣን\s*ገቢ/g, en: 'Fast Deposit', ti: 'ቅልጡፍ ኣታዊ', om: 'Galii Ariifataa' },
  { am: /ፈጣን\s*ወጪ/g, en: 'Instant Withdrawal', ti: 'ቅልጡፍ ወጻኢ', om: 'Baasii Ariifataa' },
  { am: /ፈጣን\s*ክፍያ/g, en: 'Fast Payout', ti: 'ቅልጡፍ ክፍሊት', om: 'Kaffaltii Ariifataa' },
  { am: /ፈጣን\s*ቢንጎ/g, en: 'Fast Bingo', ti: 'ቅልጡፍ ቢንጎ', om: 'Biingoo Ariifataa' },
  { am: /ልዩ\s*ቢንጎ/g, en: 'Liyu Bingo', ti: 'ልዩ ቢንጎ', om: 'Biingoo Addaa' },
  { am: /ልዩ\s*ሽልማት/g, en: 'Special Reward', ti: 'ፍሉይ ሽልማት', om: 'Badhaasa Addaa' },
  { am: /ልዩ\s*ቦነስ/g, en: 'Special Bonus', ti: 'ፍሉይ ቦነስ', om: 'Boonasii Addaa' },
  { am: /ቦነስ\s*ካርቴላ/g, en: 'Bonus Cartela', ti: 'ቦነስ ካርቴላ', om: 'Kaartelaa Boonasii' },
  { am: /አሁን\s*ይጫወቱ/g, en: 'Play Now', ti: 'ሕጂ ተጻወቱ', om: 'Amma Taphadhaa' },
  { am: /ይጫወቱ/g, en: 'Play', ti: 'ተጻወቱ', om: 'Taphadhaa' },
  { am: /ይሸለሙ/g, en: 'Win Rewards', ti: 'ተሸለሙ', om: 'Badhaafamaa' },
  { am: /ያሸንፉ/g, en: 'Win', ti: 'ተዓወቱ', om: 'Injifadhaa' },
  { am: /ያሸነፉትን/g, en: 'Your Winnings', ti: 'ዝተዓወትኩምዎ', om: 'Waan Mo’attan' },
  { am: /ወዲያውኑ/g, en: 'Instantly', ti: 'ብኡንብኡ', om: 'Battalumatti' },
  { am: /ይውሰዱ/g, en: 'Claim / Withdraw', ti: 'ውሰዱ', om: 'Fudhadhaa' },
  { am: /ቦነስዎን/g, en: 'Your Bonus', ti: 'ቦነስኩም', om: 'Boonasii Keessan' },
  { am: /የገቢ\s*ቦነስ/g, en: 'Deposit Bonus', ti: 'ቦነስ ኣታዊ', om: 'Boonasii Galii' },
  { am: /ትልቅ\s*ጃክፖት/g, en: 'Huge Jackpot', ti: 'ዓብዪ ጃክፖት', om: 'Jaakpootii Guddaa' },
  { am: /ጃክፖት/g, en: 'Jackpot', ti: 'ጃክፖት', om: 'Jaakpootii' },
  { am: /ራሚኖ|ራሚ/g, en: 'Ramino', ti: 'ራሚኖ', om: 'Raaminoo' },
  { am: /ኬኖ/g, en: 'Keno', ti: 'ኬኖ', om: 'Keenoo' },
  { am: /ካርቴላ/g, en: 'Cartela', ti: 'ካርቴላ', om: 'Kaartelaa' },
  { am: /ቦነስ/g, en: 'Bonus', ti: 'ቦነስ', om: 'Boonasii' },
  { am: /ሽልማት/g, en: 'Reward', ti: 'ሽልማት', om: 'Badhaasa' },
  { am: /ነፃ/g, en: 'Free', ti: 'ናጻ', om: 'Bilisaa' },
  { am: /ዛሬ/g, en: 'Today', ti: 'ሎሚ', om: 'Har’a' },
  { am: /ብር/g, en: 'ETB', ti: 'ብር', om: 'ETB' },
  { am: /እስከ/g, en: 'Up to', ti: 'ክሳብ', om: 'Hanga' },
  { am: /ተጨማሪ/g, en: 'Extra', ti: 'ተወሳኺ', om: 'Dabalata' },
  { am: /ፈጣን/g, en: 'Fast', ti: 'ቅልጡፍ', om: 'Ariifataa' },
  { am: /ልዩ/g, en: 'Special', ti: 'ፍሉይ', om: 'Addaa' },
  { am: /ገቢ/g, en: 'Deposit', ti: 'ኣታዊ', om: 'Galii' },
  { am: /ወጪ/g, en: 'Withdraw', ti: 'ወጻኢ', om: 'Baasii' },
  { am: /ማስታወቂያ/g, en: 'Promo', ti: 'መወዓውዒ', om: 'Beeksisa' },
];

const REVERSE_EN_TO_LOCAL: Array<{
  en: RegExp;
  am: string;
  ti: string;
  om: string;
}> = [
  { en: /\bFast\s*Deposit\b/gi, am: 'ፈጣን ገቢ', ti: 'ቅልጡፍ ኣታዊ', om: 'Galii Ariifataa' },
  { en: /\bInstant\s*Withdraw(?:al)?\b/gi, am: 'ፈጣን ወጪ', ti: 'ቅልጡፍ ወጻኢ', om: 'Baasii Ariifataa' },
  { en: /\bDeposit\s*Bonus\b/gi, am: 'የገቢ ቦነስ', ti: 'ቦነስ ኣታዊ', om: 'Boonasii Galii' },
  { en: /\bPlay\s*Now\b/gi, am: 'አሁን ይጫወቱ', ti: 'ሕጂ ተጻወቱ', om: 'Amma Taphadhaa' },
  { en: /\bClaim\s*(?:Your\s*)?Bonus\b/gi, am: 'ቦነስዎን ይውሰዱ', ti: 'ቦነስኩም ውሰዱ', om: 'Boonasii Keessan Fudhadhaa' },
  { en: /\bJackpot\b/gi, am: 'ጃክፖት', ti: 'ጃክፖት', om: 'Jaakpootii' },
  { en: /\bBonus\b/gi, am: 'ቦነስ', ti: 'ቦነስ', om: 'Boonasii' },
  { en: /\bFree\b/gi, am: 'ነፃ', ti: 'ናጻ', om: 'Bilisaa' },
  { en: /\bWin\b/gi, am: 'ያሸንፉ', ti: 'ተዓወቱ', om: 'Injifadhaa' },
  { en: /\bFast\s*Bingo\b/gi, am: 'ፈጣን ቢንጎ', ti: 'ቅልጡፍ ቢንጎ', om: 'Biingoo Ariifataa' },
  { en: /\bLiyu\s*Bingo\b/gi, am: 'ልዩ ቢንጎ', ti: 'ልዩ ቢንጎ', om: 'Biingoo Addaa' },
  { en: /\bRamino\b/gi, am: 'ራሚኖ', ti: 'ራሚኖ', om: 'Raaminoo' },
  { en: /\bKeno\b/gi, am: 'ኬኖ', ti: 'ኬኖ', om: 'Keenoo' },
];

export function translateAdText(rawText: string, language: Language): string {
  const text = (rawText || '').trim();
  if (!text) return '';

  const exact = EXACT_PHRASE_TRANSLATIONS[text]?.[language];
  if (exact) return exact;

  // Check if input is English and user wants am/ti/om
  const hasEthiopic = /[\u1200-\u137F]/.test(text);
  if (!hasEthiopic && language !== 'en') {
    let out = text;
    for (const rule of REVERSE_EN_TO_LOCAL) {
      out = out.replace(rule.en, rule[language]);
    }
    return out;
  }

  // Input contains Ethiopic (Amharic) and user switched to en / ti / om
  if (hasEthiopic && language !== 'am') {
    let out = text;
    for (const rule of PHRASE_REPLACEMENTS) {
      out = out.replace(rule.am, rule[language]);
    }
    if (language === 'en') {
      out = out.replace(/፣/g, ', ').replace(/።/g, '.').replace(/\s{2,}/g, ' ').trim();
    }
    return out;
  }

  return text;
}

export function localizeHeroAd(ad: HeroBannerAd, language: Language): HeroBannerAd {
  const override: Partial<AdTextPack> | undefined = ad.translations?.[language];
  return {
    ...ad,
    badgeText: override?.badgeText?.trim() || translateAdText(ad.badgeText, language),
    title: override?.title?.trim() || translateAdText(ad.title, language),
    subtitle: override?.subtitle?.trim() || translateAdText(ad.subtitle, language),
    ctaText:
      override?.ctaText?.trim() ||
      (ad.ctaText ? translateAdText(ad.ctaText, language) : undefined),
  };
}
