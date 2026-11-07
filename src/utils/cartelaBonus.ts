/**
 * Cartela Bonus Tier System
 * Rules:
 * 5 ተጨማሪ ካርቴላ ከገዙ 1 የቦነስ ካርቴላ ያገኛሉ።
 * ቦነስ በራሱ ይሰጣል፤ ካርቴላ ብቻ ያስመዝግቡ። አንድ ደረጃ ሲደርሱ ነጻ ካርቴላዎቹ ከሚያስመዘግቧቸው ካርቴላዎች ይወሰዳሉ፣ የሚከፍሉት ለቀሪዎቹ ብቻ ነው። ቦነስ የሚሰጠው ጨዋታው ከመጀመሩ በፊት ብቻ ነው።
 * 
 * የቦነስ ደረጃዎች:
 * 5+ ካርቴላ → 1 የቦነስ ካርቴላ
 * 10+ ካርቴላ → 2 የቦነስ ካርቴላ
 * 15+ ካርቴላ → 3 የቦነስ ካርቴላ
 * 20+ ካርቴላ → 5 የቦነስ ካርቴላ
 * 25+ ካርቴላ → 7 የቦነስ ካርቴላ
 * 30+ ካርቴላ → 10 የቦነስ ካርቴላ
 */

export interface CartelaBonusInfo {
  totalRegistered: number;
  bonusCount: number;
  paidCount: number;
  totalCost: number;
  savedBirr: number;
  tierLabelAm: string;
  tierLabelEn: string;
  nextTierHintAm: string;
  nextTierHintEn: string;
}

export const BONUS_TIERS_CONFIG = [
  { minCards: 30, bonusCards: 10, labelAm: '30+ ካርቴላ → 10 የቦነስ ካርቴላ', labelEn: '30+ Cartelas → 10 Bonus' },
  { minCards: 25, bonusCards: 7, labelAm: '25+ ካርቴላ → 7 የቦነስ ካርቴላ', labelEn: '25+ Cartelas → 7 Bonus' },
  { minCards: 20, bonusCards: 5, labelAm: '20+ ካርቴላ → 5 የቦነስ ካርቴላ', labelEn: '20+ Cartelas → 5 Bonus' },
  { minCards: 15, bonusCards: 3, labelAm: '15+ ካርቴላ → 3 የቦነስ ካርቴላ', labelEn: '15+ Cartelas → 3 Bonus' },
  { minCards: 10, bonusCards: 2, labelAm: '10+ ካርቴላ → 2 የቦነስ ካርቴላ', labelEn: '10+ Cartelas → 2 Bonus' },
  { minCards: 5, bonusCards: 1, labelAm: '5+ ካርቴላ → 1 የቦነስ ካርቴላ', labelEn: '5+ Cartelas → 1 Bonus' },
] as const;

export function getCartelaBonusCount(totalRegistered: number): number {
  if (totalRegistered >= 30) return 10;
  if (totalRegistered >= 25) return 7;
  if (totalRegistered >= 20) return 5;
  if (totalRegistered >= 15) return 3;
  if (totalRegistered >= 10) return 2;
  if (totalRegistered >= 5) return 1;
  return 0;
}

export function calculateCartelaBonus(totalRegistered: number, stakeAmount: number): CartelaBonusInfo {
  const bonusCount = getCartelaBonusCount(totalRegistered);
  const paidCount = Math.max(0, totalRegistered - bonusCount);
  const totalCost = Number((paidCount * stakeAmount).toFixed(2));
  const savedBirr = Number((bonusCount * stakeAmount).toFixed(2));

  let nextTierHintAm = '';
  let nextTierHintEn = '';
  if (totalRegistered < 5) {
    const diff = 5 - totalRegistered;
    nextTierHintAm = `${diff} ተጨማሪ ካርቴላ ቢያስመዘግቡ 1 የቦነስ ካርቴላ ያገኛሉ!`;
    nextTierHintEn = `Register ${diff} more to get 1 bonus cartela!`;
  } else if (totalRegistered < 10) {
    const diff = 10 - totalRegistered;
    nextTierHintAm = `${diff} ተጨማሪ ካርቴላ ቢያስመዘግቡ 2 የቦነስ ካርቴላ ያገኛሉ!`;
    nextTierHintEn = `Register ${diff} more to get 2 bonus cartelas!`;
  } else if (totalRegistered < 15) {
    const diff = 15 - totalRegistered;
    nextTierHintAm = `${diff} ተጨማሪ ካርቴላ ቢያስመዘግቡ 3 የቦነስ ካርቴላ ያገኛሉ!`;
    nextTierHintEn = `Register ${diff} more to get 3 bonus cartelas!`;
  } else if (totalRegistered < 20) {
    const diff = 20 - totalRegistered;
    nextTierHintAm = `${diff} ተጨማሪ ካርቴላ ቢያስመዘግቡ 5 የቦነስ ካርቴላ ያገኛሉ!`;
    nextTierHintEn = `Register ${diff} more to get 5 bonus cartelas!`;
  } else if (totalRegistered < 25) {
    const diff = 25 - totalRegistered;
    nextTierHintAm = `${diff} ተጨማሪ ካርቴላ ቢያስመዘግቡ 7 የቦነስ ካርቴላ ያገኛሉ!`;
    nextTierHintEn = `Register ${diff} more to get 7 bonus cartelas!`;
  } else if (totalRegistered < 30) {
    const diff = 30 - totalRegistered;
    nextTierHintAm = `${diff} ተጨማሪ ካርቴላ ቢያስመዘግቡ 10 የቦነስ ካርቴላ ያገኛሉ!`;
    nextTierHintEn = `Register ${diff} more to get 10 bonus cartelas!`;
  }

  return {
    totalRegistered,
    bonusCount,
    paidCount,
    totalCost,
    savedBirr,
    tierLabelAm:
      bonusCount > 0
        ? `🎁 የቦነስ ደረጃ ደርሰዋል! (${bonusCount} ነፃ ቦነስ ካርቴላ ተቀንሷል፤ የሚከፍሉት ለ ${paidCount} ካርቴላ ብቻ ነው)`
        : 'ቦነስ በራሱ ይሰጣል፤ ካርቴላ ብቻ ያስመዝግቡ።',
    tierLabelEn:
      bonusCount > 0
        ? `🎁 Bonus tier applied! (${bonusCount} free cartelas; you only pay for ${paidCount})`
        : 'Bonus is given automatically; just register cartelas.',
    nextTierHintAm,
    nextTierHintEn,
  };
}
