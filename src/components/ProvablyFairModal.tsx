import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Unlock,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  Hash,
  Sparkles,
  Eye,
} from 'lucide-react';
import {
  generateProvablyFairRound,
  ProvablyFairRoundData,
  sha256Hex,
} from '../utils/provablyFair';
import { getLetterForBall } from '../utils/bingoEngine';
import { GameHistoryRecord, Language } from '../types/bingo';

interface ProvablyFairModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  language?: Language;
  roundId: number;
  isPlaying: boolean;
  calledBalls: number[];
  hasWinnerOrEnded: boolean;
  clientSeed: string;
  onChangeClientSeed: (newSeed: string) => void;
  roundFairData: ProvablyFairRoundData;
  history?: GameHistoryRecord[];
}

interface FairModalCopy {
  title: string;
  subtitle: string;
  tabCurrent: (id: number) => string;
  tabVerifier: string;
  tabHistory: (count: number) => string;
  howItWorksTitle: string;
  howStep1: string;
  howStep2: string;
  howStep3: string;
  preGameHashHeading: (id: number) => string;
  copyHash: string;
  copied: string;
  copy: string;
  seedAndBallsHeading: string;
  revealedBadge: string;
  lockedBadge: string;
  serverSeedLabel: string;
  predeterminedLabel: string;
  verifyNowBtn: string;
  lockedNotice: string;
  calledSoFarLabel: (count: number) => string;
  verifierHeading: string;
  verifierLockedBanner: (id: number) => string;
  roundIdLabel: string;
  serverSeedInputLabel: string;
  serverSeedPlaceholder: string;
  expectedHashLabel: string;
  verifySubmitBtn: string;
  verifyBlockedError: (id: number) => string;
  verifyMissingSeedError: string;
  verifyMatchedMsg: string;
  verifyMismatchMsg: string;
  computedHashLabel: string;
  ballsFromSeedLabel: string;
  noHistoryMsg: string;
  roundTag: (id: number) => string;
  verifyRoundBtn: (id: number) => string;
  hashFieldLabel: string;
  seedFieldLabel: string;
}

const FAIR_MODAL_COPY: Record<Language, FairModalCopy> = {
  am: {
    title: 'ፍትሃዊ ጨዋታ ማረጋገጫ',
    subtitle: 'የሚወጡት 75 ኳሶች ጨዋታው ከመጀመሩ በፊት በ SHA-256 ሃሽ የተቆለፉ ናቸው',
    tabCurrent: (id) => `የተጠናቀቀው ዙር (#${id})`,
    tabVerifier: 'ሃሽ ማረጋገጫ',
    tabHistory: (count) => `ያለፉ ዙሮች (${count})`,
    howItWorksTitle: 'እንዴት ይሰራል?',
    howStep1:
      '1. ጨዋታው ከመጀመሩ በፊት የሚወጡት 75 ኳሶች ቅደም ተከተል ተዘጋጅቶ በ SHA-256 ሃሽ ተቆልፎ ለሁሉም ተጫዋቾች ይታያል።',
    howStep2:
      '2. ጨዋታው ከጀመረ በኋላ ማንም ሰው የሚወጡትን ቁጥሮች መቀየር አይችልም፤ 1 ቁጥር እንኳን ቢቀየር ሃሹ ሙሉ በሙሉ ይቀየራል።',
    howStep3:
      '3. ዙሩ ሲጠናቀቅ ብቻ የሰርቨር ሚስጥራዊ ቁልፍ እና 75 ኳሶች ይገለጣሉ፤ ከዚያም በሃሽ ማረጋገጫ ገጽ ማረጋገጥ ይችላሉ።',
    preGameHashHeading: (id) => `1. ቅድመ-ጨዋታ የተቆለፈ SHA-256 ሃሽ (ዙር #${id})`,
    copyHash: 'ሃሽ ቅዳ',
    copied: 'ተቀድቷል',
    copy: 'ቅዳ',
    seedAndBallsHeading: '2. የሰርቨር ቁልፍ እና የ75 ኳሶች ቅደም ተከተል',
    revealedBadge: 'ተገልጧል',
    lockedBadge: 'እስኪጠናቀቅ የተቆለፈ',
    serverSeedLabel: 'የሰርቨር ሚስጥራዊ ቁልፍ፦',
    predeterminedLabel: 'ሙሉ የ75 ኳሶች ቅደም ተከተል፦',
    verifyNowBtn: 'አሁኑኑ በ SHA-256 አረጋግጥ',
    lockedNotice:
      '🔒 የአሁኑ ዙር ገና በመካሄድ ላይ ስለሆነ የሰርቨር ቁልፉ እና ቀሪዎቹ ኳሶች ተቆልፈዋል። ጨዋታው ሲጠናቀቅ ብቻ ይገለጣሉ!',
    calledSoFarLabel: (count) => `እስካሁን የወጡ ኳሶች (${count}/75)፦`,
    verifierHeading: 'የፍትሃዊነት ማረጋገጫ ካልኩሌተር',
    verifierLockedBanner: () =>
      '🔒 በመካሄድ ላይ ያለው ዙር ገና ስላልተጠናቀቀ በሃሽ ማረጋገጫ ውስጥ አይታይም። የተጠናቀቁ ዙሮችን ከ«ያለፉ ዙሮች» ትር መርጠው ማረጋገጥ ይችላሉ።',
    roundIdLabel: 'የዙር ቁጥር፦',
    serverSeedInputLabel: 'የሰርቨር ሚስጥራዊ ቁልፍ፦',
    serverSeedPlaceholder: 'የተጠናቀቀ ዙር የሰርቨር ቁልፍ ያስገቡ...',
    expectedHashLabel: 'ቅድመ-ጨዋታ የነበረው SHA-256 ሃሽ፦',
    verifySubmitBtn: 'SHA-256 ሃሽ አስላ እና አረጋግጥ',
    verifyBlockedError: (id) =>
      `🔒 የአሁኑ ዙር (#${id}) ገና አልተጠናቀቀም! ጨዋታው እስኪያልቅ ድረስ ሃሽ ማረጋገጫ እና የኳሶች ቅደም ተከተል አይታዩም።`,
    verifyMissingSeedError: '⚠️ እባክዎ የሚያረጋግጡትን የተጠናቀቀ ዙር የሰርቨር ቁልፍ ያስገቡ።',
    verifyMatchedMsg: '✅ ተረጋግጧል! ጨዋታው 100% ፍትሃዊ እና ያልተነካ መሆኑ ተረጋግጧል።',
    verifyMismatchMsg: '❌ ሃሹ አልተዛመደም! የገቡት መረጃዎች አይገናኙም።',
    computedHashLabel: 'የተሰላ SHA-256 ሃሽ፦',
    ballsFromSeedLabel: 'በዚህ ቁልፍ የተፈጠሩት 75 ኳሶች ቅደም ተከተል፦',
    noHistoryMsg:
      'ገና የተጠናቀቀ ዙር የለም። የአሁኑ ዙር ሲያልቅ እዚህ እና በ«ሃሽ ማረጋገጫ» ትር ላይ ማረጋገጥ ይችላሉ።',
    roundTag: (id) => `ዙር #${id}`,
    verifyRoundBtn: (id) => `ዙር #${id} አረጋግጥ`,
    hashFieldLabel: 'SHA-256 ሃሽ፦',
    seedFieldLabel: 'የሰርቨር ቁልፍ፦',
  },
  ti: {
    title: 'ምርግጋጽ ፍትሓውነት ጸወታ',
    subtitle: 'ዝወጹ 75 ኩዕሶታት ቅድሚ ምጅማር ጸወታ ብ SHA-256 ሃሽ ተዓጽዮም እዮም',
    tabCurrent: (id) => `ዝተወድአ ዙር (#${id})`,
    tabVerifier: 'ምርግጋጽ ሃሽ',
    tabHistory: (count) => `ዝሓለፉ ዙራት (${count})`,
    howItWorksTitle: 'ከመይ ይሰርሕ?',
    howStep1:
      '1. ቅድሚ ምጅማር ጸወታ ዝወጹ 75 ኩዕሶታት ተሰሪዖም ብ SHA-256 ሃሽ ተዓጽዮም ንኹሎም ተጻወትቲ ይረኣዩ።',
    howStep2:
      '2. ጸወታ ምስ ጀመረ ማንም ሰብ ዝወጹ ቁጽርታት ክቕይር ኣይክእልን፤ ሓንቲ ቁጽሪ እኳ እንተተቐየረት እቲ ሃሽ ሙሉእ ብሙሉእ ይቕየር።',
    howStep3:
      '3. እቲ ዙር ምስ ተወድአ ጥራይ ምስጢራዊ ቁልፊ ሰርቨርን 75 ኩዕሶታትን ይግለጹ፤ ድሕሪኡ ኣብ ገጽ ምርግጋጽ ሃሽ ከተረጋግጹ ትኽእሉ።',
    preGameHashHeading: (id) => `1. ቅድመ-ጸወታ ዝተዓጽወ SHA-256 ሃሽ (ዙር #${id})`,
    copyHash: 'ሃሽ ቅዳሕ',
    copied: 'ተቐዲሑ',
    copy: 'ቅዳሕ',
    seedAndBallsHeading: '2. ቁልፊ ሰርቨርን ቅደም ተኸተል 75 ኩዕሶታትን',
    revealedBadge: 'ተገሊጹ',
    lockedBadge: 'ክሳብ ዝውዳእ ዝተዓጽወ',
    serverSeedLabel: 'ምስጢራዊ ቁልፊ ሰርቨር፦',
    predeterminedLabel: 'ሙሉእ ቅደም ተኸተል 75 ኩዕሶታት፦',
    verifyNowBtn: 'ሕጂ ብ SHA-256 ኣረጋግጽ',
    lockedNotice:
      '🔒 እዚ ዙር ገና ይካየድ ስለ ዘሎ ቁልፊ ሰርቨርን ዝተረፉ ኩዕሶታትን ተዓጽዮም ኣለዉ። ጸወታ ምስ ተወድአ ጥራይ ክግለጹ እዮም!',
    calledSoFarLabel: (count) => `ክሳብ ሕጂ ዝወጹ ኩዕሶታት (${count}/75)፦`,
    verifierHeading: 'መረጋገጺ ካልኩሌተር ፍትሓውነት',
    verifierLockedBanner: () =>
      '🔒 ዝካየድ ዘሎ ዙር ገና ስለ ዘይተወድአ ኣብ ምርግጋጽ ሃሽ ኣይረአን እዩ። ዝተወድኡ ዙራት ካብ «ዝሓለፉ ዙራት» መሪጽኩም ከተረጋግጹ ትኽእሉ።',
    roundIdLabel: 'ቁጽሪ ዙር፦',
    serverSeedInputLabel: 'ምስጢራዊ ቁልፊ ሰርቨር፦',
    serverSeedPlaceholder: 'ናይ ዝተወድአ ዙር ቁልፊ ሰርቨር የእትዉ...',
    expectedHashLabel: 'ቅድመ-ጸወታ ዝነበረ SHA-256 ሃሽ፦',
    verifySubmitBtn: 'SHA-256 ሃሽ ኣስሊሕካ ኣረጋግጽ',
    verifyBlockedError: (id) =>
      `🔒 ናይ ሕጂ ዙር (#${id}) ገና ኣይተወድአን! ጸወታ ክሳብ ዝውዳእ ምርግጋጽ ሃሽን ዝተረፉ ኩዕሶታትን ኣይረኣዩን።`,
    verifyMissingSeedError: '⚠️ በጃኹም ናይ ዝተወድአ ዙር ቁልፊ ሰርቨር የእትዉ።',
    verifyMatchedMsg: '✅ ተረጋጊጹ! እቲ ጸወታ 100% ፍትሓውን ዘይተተንከፈን ምዃኑ ተረጋጊጹ።',
    verifyMismatchMsg: '❌ እቲ ሃሽ ኣይተዛመደን! ዝኣተዉ ሓበሬታታት ኣይተገናነዩን።',
    computedHashLabel: 'ዝተሰልዐ SHA-256 ሃሽ፦',
    ballsFromSeedLabel: 'በዚ ቁልፊ ዝተፈጥሩ 75 ኩዕሶታት፦',
    noHistoryMsg:
      'ገና ዝተወድአ ዙር የለን። እዚ ዙር ምስ ተወድአ ኣብዚን ኣብ «ምርግጋጽ ሃሽ»ን ከተረጋግጹ ትኽእሉ።',
    roundTag: (id) => `ዙር #${id}`,
    verifyRoundBtn: (id) => `ዙር #${id} ኣረጋግጽ`,
    hashFieldLabel: 'SHA-256 ሃሽ፦',
    seedFieldLabel: 'ቁልፊ ሰርቨር፦',
  },
  om: {
    title: 'Mirkaneessa Haqummaa Taphaa',
    subtitle: 'Kubbootni 75 bahaniin dura haashii SHA-256 tiin cufamu',
    tabCurrent: (id) => `Marsaa Xumurame (#${id})`,
    tabVerifier: 'Mirkaneessa Haashii',
    tabHistory: (count) => `Marsaa Darbe (${count})`,
    howItWorksTitle: 'Akkamitti Hojjeta?',
    howStep1:
      '1. Taphni osoo hin jalqabin dura tartiibni kubboota 75 qophaa\'ee haashii SHA-256 tiin cufamee taphattoota hundaaf mul\'ata.',
    howStep2:
      '2. Taphni erga jalqabee booda eenyuyyuu lakkoofsota bahaniin jijjiiruu hin danda\'u; lakkoofsi tokko yoo jijjiirame haashiin guutumaan guutuutti jijjiirama.',
    howStep3:
      '3. Marsaan yoo xumurame qofa furtuun sarvarii fi kubbootni 75 ni mul\'atu; sana booda fuula mirkaneessaa irratti mirkaneessuu dandeessu.',
    preGameHashHeading: (id) => `1. Haashii SHA-256 Taphaan Dura Cufame (Marsaa #${id})`,
    copyHash: 'Haashii Garagalchi',
    copied: 'Garagalfameera',
    copy: 'Garagalchi',
    seedAndBallsHeading: '2. Furtuu Sarvarii fi Tartiiba Kubboota 75',
    revealedBadge: 'Mul\'ateera',
    lockedBadge: 'Hanga Xumuramutti Cufame',
    serverSeedLabel: 'Furtuu Iccitii Sarvarii:',
    predeterminedLabel: 'Tartiiba Guutuu Kubboota 75:',
    verifyNowBtn: 'Amma SHA-256 tiin Mirkaneessi',
    lockedNotice:
      '🔒 Marsaan ammaa ammas gaggeeffamaa waan jiruuf furtuun sarvarii fi kubbootni hafan cufamaniiru. Taphni yoo xumurame qofa mul\'atu!',
    calledSoFarLabel: (count) => `Kubboota Hanga Ammaa Bahan (${count}/75):`,
    verifierHeading: 'Herregduu Mirkaneessa Haqummaa',
    verifierLockedBanner: () =>
      '🔒 Marsaan gaggeeffamaa jiru waan hin xumuramneef mirkaneessa haashii irratti hin mul\'atu. Marsaawwan xumuraman kutaa «Marsaa Darbe» keessaa filachuun mirkaneessaa.',
    roundIdLabel: 'Lakkoofsa Marsaa:',
    serverSeedInputLabel: 'Furtuu Iccitii Sarvarii:',
    serverSeedPlaceholder: 'Furtuu sarvarii marsaa xumuramee galchi...',
    expectedHashLabel: 'Haashii SHA-256 Taphaan Duraa:',
    verifySubmitBtn: 'SHA-256 Herregii Mirkaneessi',
    verifyBlockedError: (id) =>
      `🔒 Marsaan ammaa (#${id}) amma iyyuu hin xumuramne! Taphni hanga xumuramutti mirkaneessi haashii fi kubbootni hin mul\'atan.`,
    verifyMissingSeedError: '⚠️ Maaloo furtuu sarvarii marsaa xumuramee galchaa.',
    verifyMatchedMsg: '✅ Mirkanaa\'eera! Taphni 100% haqa qabeessaa fi hin tuqamne ta\'uun mirkanaa\'eera.',
    verifyMismatchMsg: '❌ Haashiin wal hin simne! Odeeffannoon gale wal hin fakkaatu.',
    computedHashLabel: 'Haashii SHA-256 Herregame:',
    ballsFromSeedLabel: 'Tartiiba Kubboota 75 Furtuu Kanaan Uumaman:',
    noHistoryMsg:
      'Marsaan xumurame ammaaf hin jiru. Marsaan ammaa yoo xumuramu asii fi kutaa «Mirkaneessa Haashii» irratti mirkaneessuu dandeessu.',
    roundTag: (id) => `Marsaa #${id}`,
    verifyRoundBtn: (id) => `Marsaa #${id} Mirkaneessi`,
    hashFieldLabel: 'Haashii SHA-256:',
    seedFieldLabel: 'Furtuu Sarvarii:',
  },
  en: {
    title: 'Provably Fair Verification',
    subtitle: 'All 75 ball draws are locked with a SHA-256 hash before the round begins',
    tabCurrent: (id) => `Finished Round (#${id})`,
    tabVerifier: 'Verify Hash',
    tabHistory: (count) => `Past Rounds (${count})`,
    howItWorksTitle: 'How It Works',
    howStep1:
      '1. Before the game starts, the entire 75-ball draw order is sealed with a SHA-256 commitment hash visible to every player.',
    howStep2:
      '2. Once play begins, nobody can alter upcoming numbers because changing even a single ball changes the SHA-256 hash completely.',
    howStep3:
      '3. Only after the round finishes are the server seed and full 75-ball order revealed so you can verify them here.',
    preGameHashHeading: (id) => `1. Pre-Game Locked SHA-256 Hash (Round #${id})`,
    copyHash: 'Copy Hash',
    copied: 'Copied',
    copy: 'Copy',
    seedAndBallsHeading: '2. Server Seed & 75-Ball Draw Sequence',
    revealedBadge: 'Revealed',
    lockedBadge: 'Locked Until Finish',
    serverSeedLabel: 'Server Seed:',
    predeterminedLabel: 'Complete 75-Ball Draw Order:',
    verifyNowBtn: 'Verify with SHA-256 Now',
    lockedNotice:
      '🔒 The server seed and remaining balls stay sealed while the round is still active. They unlock automatically once the round finishes.',
    calledSoFarLabel: (count) => `Called Balls So Far (${count}/75):`,
    verifierHeading: 'SHA-256 Fairness Calculator',
    verifierLockedBanner: () =>
      '🔒 Active rounds cannot be inspected or verified in Hash Verification until they finish. Select any completed round from Past Rounds to verify it.',
    roundIdLabel: 'Round ID:',
    serverSeedInputLabel: 'Server Seed:',
    serverSeedPlaceholder: 'Enter server seed from a completed round...',
    expectedHashLabel: 'Pre-Game SHA-256 Commitment Hash:',
    verifySubmitBtn: 'Compute & Verify SHA-256',
    verifyBlockedError: (id) =>
      `🔒 Round #${id} has not finished yet! Live round verification stays locked until the round ends.`,
    verifyMissingSeedError: '⚠️ Please enter the server seed of a completed round.',
    verifyMatchedMsg: '✅ Verified! This round is confirmed 100% fair and untampered.',
    verifyMismatchMsg: '❌ Hash mismatch! Provided inputs do not match.',
    computedHashLabel: 'Computed SHA-256 Hash:',
    ballsFromSeedLabel: 'Generated 75-Ball Order:',
    noHistoryMsg:
      'No completed rounds yet. Once a round finishes, you can inspect and verify it here.',
    roundTag: (id) => `Round #${id}`,
    verifyRoundBtn: (id) => `Verify #${id}`,
    hashFieldLabel: 'SHA-256 Hash:',
    seedFieldLabel: 'Server Seed:',
  },
};

export const ProvablyFairModal: React.FC<ProvablyFairModalProps> = ({
  isOpen,
  onClose,
  isDark,
  language = 'am',
  roundId,
  calledBalls,
  hasWinnerOrEnded,
  roundFairData,
  history = [],
}) => {
  const c = FAIR_MODAL_COPY[language] || FAIR_MODAL_COPY.am;
  const isSeedRevealed = Boolean(hasWinnerOrEnded);

  const completedHistory = React.useMemo(
    () =>
      history.filter(
        (item) => isSeedRevealed || Number(item.gameMatchId) !== Number(roundId)
      ),
    [history, isSeedRevealed, roundId]
  );

  const [activeTab, setActiveTab] = useState<'current' | 'verifier' | 'history'>('verifier');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setActiveTab((prev) => (!isSeedRevealed && prev === 'current' ? 'verifier' : prev === 'current' ? 'verifier' : prev));
    }
  }, [isOpen, isSeedRevealed]);

  // Never prefill live unfinished round serverSeed; fall back to latest completed round when locked
  const [verifyRoundId, setVerifyRoundId] = useState<number>(() =>
    isSeedRevealed
      ? roundId
      : completedHistory.length > 0
      ? completedHistory[0].gameMatchId
      : 0
  );
  const [verifyServerSeed, setVerifyServerSeed] = useState<string>('');
  const [verifyClientSeed, setVerifyClientSeed] = useState<string>(roundFairData.clientSeed);
  const [verifyExpectedHash, setVerifyExpectedHash] = useState<string>('');
  const [verifyBlockedMsg, setVerifyBlockedMsg] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<{
    checked: boolean;
    computedHash: string;
    isMatch: boolean;
    balls: number[];
  } | null>(null);

  useEffect(() => {
    setVerifyBlockedMsg(null);
    setVerificationResult(null);
    if (isSeedRevealed) {
      setVerifyRoundId(roundFairData.roundId);
      setVerifyServerSeed(roundFairData.serverSeed);
      setVerifyClientSeed(roundFairData.clientSeed);
      setVerifyExpectedHash(roundFairData.sha256Hash);
    } else if (completedHistory.length > 0) {
      const latestPast = completedHistory[0];
      const pastFair = generateProvablyFairRound(latestPast.gameMatchId);
      setVerifyRoundId(latestPast.gameMatchId);
      setVerifyServerSeed(latestPast.serverSeed || pastFair.serverSeed);
      setVerifyClientSeed(pastFair.clientSeed);
      setVerifyExpectedHash(pastFair.sha256Hash);
    } else {
      setVerifyRoundId(0);
      setVerifyServerSeed('');
      setVerifyClientSeed(roundFairData.clientSeed);
      setVerifyExpectedHash('');
    }
  }, [roundFairData, isSeedRevealed, completedHistory]);

  if (!isOpen) return null;

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRunVerification = (
    overrideRoundId?: number,
    overrideServerSeed?: string,
    overrideClientSeed?: string,
    overrideExpectedHash?: string
  ) => {
    const targetRound = Number(overrideRoundId ?? verifyRoundId);
    const targetSeed = (overrideServerSeed ?? verifyServerSeed).trim();
    const targetClient = (overrideClientSeed ?? verifyClientSeed).trim();
    const targetHash = (overrideExpectedHash ?? verifyExpectedHash).trim();

    const touchesLiveUnfinishedRound =
      !isSeedRevealed &&
      (targetRound === Number(roundFairData.roundId) ||
        (targetHash !== '' && targetHash.toLowerCase() === roundFairData.sha256Hash.toLowerCase()) ||
        (targetSeed !== '' && targetSeed === roundFairData.serverSeed));

    if (touchesLiveUnfinishedRound) {
      setVerificationResult(null);
      setVerifyBlockedMsg(c.verifyBlockedError(roundFairData.roundId));
      return;
    }

    if (!targetSeed || !targetRound) {
      setVerificationResult(null);
      setVerifyBlockedMsg(c.verifyMissingSeedError);
      return;
    }

    setVerifyBlockedMsg(null);
    const recomputed = generateProvablyFairRound(targetRound, targetSeed, targetClient);
    const isMatch =
      targetHash !== '' && recomputed.sha256Hash.toLowerCase() === targetHash.toLowerCase();
    setVerificationResult({
      checked: true,
      computedHash: recomputed.sha256Hash,
      isMatch,
      balls: recomputed.predeterminedBalls,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div
        className={`w-full max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border shadow-2xl overflow-hidden ${
          isDark
            ? 'bg-slate-900 border-emerald-500/40 text-slate-100'
            : 'bg-white border-emerald-300 text-slate-900'
        }`}
      >
        {/* Top Header */}
        <div
          className={`flex items-center justify-between px-4 py-3.5 border-b ${
            isDark
              ? 'bg-gradient-to-r from-emerald-950/80 via-slate-900 to-slate-950 border-emerald-500/30'
              : 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight">{c.title}</h2>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500 text-slate-950">
                  SHA-256
                </span>
              </div>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {c.subtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div
          className={`grid ${isSeedRevealed ? 'grid-cols-3' : 'grid-cols-2'} gap-1.5 p-2 border-b text-xs font-extrabold ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-100 border-slate-200'
          }`}
        >
          <button
            type="button"
            onClick={() => {
              setActiveTab('verifier');
              setVerifyBlockedMsg(null);
              if (isSeedRevealed) {
                setVerifyRoundId(roundFairData.roundId);
                setVerifyServerSeed(roundFairData.serverSeed);
                setVerifyClientSeed(roundFairData.clientSeed);
                setVerifyExpectedHash(roundFairData.sha256Hash);
                handleRunVerification(
                  roundFairData.roundId,
                  roundFairData.serverSeed,
                  roundFairData.clientSeed,
                  roundFairData.sha256Hash
                );
              } else if (completedHistory.length > 0) {
                const latestPast = completedHistory[0];
                const pastFair = generateProvablyFairRound(latestPast.gameMatchId);
                const pastSeed = latestPast.serverSeed || pastFair.serverSeed;
                setVerifyRoundId(latestPast.gameMatchId);
                setVerifyServerSeed(pastSeed);
                setVerifyClientSeed(pastFair.clientSeed);
                setVerifyExpectedHash(pastFair.sha256Hash);
                handleRunVerification(
                  latestPast.gameMatchId,
                  pastSeed,
                  pastFair.clientSeed,
                  pastFair.sha256Hash
                );
              } else {
                setVerifyRoundId(0);
                setVerifyServerSeed('');
                setVerifyExpectedHash('');
                setVerificationResult(null);
              }
            }}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'verifier'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{c.tabVerifier}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'history'
                ? 'bg-emerald-600 text-white shadow-xs'
                : isDark
                ? 'text-slate-400 hover:bg-slate-800'
                : 'text-slate-700 hover:bg-white'
            }`}
          >
            <Hash className="w-3.5 h-3.5" />
            <span>{c.tabHistory(completedHistory.length)}</span>
          </button>

          {isSeedRevealed && (
            <button
              type="button"
              onClick={() => setActiveTab('current')}
              className={`py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                activeTab === 'current'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : isDark
                  ? 'text-slate-400 hover:bg-slate-800'
                  : 'text-slate-700 hover:bg-white'
              }`}
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>{c.tabCurrent(roundId)}</span>
            </button>
          )}
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {isSeedRevealed && activeTab === 'current' && (
            <>
              {/* Explanation Banner */}
              <div
                className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-1.5 ${
                  isDark
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-950'
                }`}
              >
                <div className="font-extrabold flex items-center gap-1.5 text-emerald-400">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>{c.howItWorksTitle}</span>
                </div>
                <p>{c.howStep1}</p>
                <p>{c.howStep2}</p>
                <p>{c.howStep3}</p>
              </div>

              {/* 1. Pre-Game SHA-256 Hash (Always Visible Before & During Game) */}
              <div
                className={`rounded-2xl border p-3.5 space-y-2 ${
                  isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5" />
                    <span>{c.preGameHashHeading(roundId)}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(roundFairData.sha256Hash, 'hash')}
                    className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-extrabold flex items-center gap-1 cursor-pointer"
                  >
                    {copiedField === 'hash' ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>{c.copied}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{c.copyHash}</span>
                      </>
                    )}
                  </button>
                </div>

                <div
                  className={`p-2.5 rounded-xl font-mono-tabular text-[11px] sm:text-xs break-all border select-all ${
                    isDark
                      ? 'bg-slate-950 border-emerald-500/30 text-emerald-300'
                      : 'bg-white border-emerald-300 text-emerald-800'
                  }`}
                >
                  {roundFairData.sha256Hash}
                </div>
              </div>

              {/* 2. Server Seed & Predetermined 75 Balls (Locked until round finishes) */}
              <div
                className={`rounded-2xl border p-3.5 space-y-2.5 ${
                  isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-sky-400 flex items-center gap-1.5">
                    {isSeedRevealed ? (
                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-amber-400" />
                    )}
                    <span>{c.seedAndBallsHeading}</span>
                  </span>

                  <span
                    className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                      isSeedRevealed
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {isSeedRevealed ? c.revealedBadge : c.lockedBadge}
                  </span>
                </div>

                {isSeedRevealed ? (
                  <div className="space-y-2.5">
                    <div>
                      <div className="text-[11px] font-bold opacity-75 mb-1">
                        {c.serverSeedLabel}
                      </div>
                      <div className="flex items-center gap-2">
                        <div
                          className={`flex-1 p-2 rounded-xl font-mono-tabular text-xs break-all border ${
                            isDark
                              ? 'bg-slate-950 border-slate-700 text-amber-300'
                              : 'bg-white border-slate-300 text-slate-900'
                          }`}
                        >
                          {roundFairData.serverSeed}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(roundFairData.serverSeed, 'seed')}
                          className="px-2.5 py-2 rounded-xl bg-slate-700 text-white text-xs font-bold cursor-pointer"
                        >
                          {copiedField === 'seed' ? c.copied : c.copy}
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-bold opacity-75 mb-1">
                        {c.predeterminedLabel}
                      </div>
                      <div
                        className={`p-2.5 rounded-xl border max-h-32 overflow-y-auto flex flex-wrap gap-1 ${
                          isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-200'
                        }`}
                      >
                        {roundFairData.predeterminedBalls.map((ball, idx) => {
                          const wasCalled = calledBalls.includes(ball);
                          return (
                            <span
                              key={ball}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono-tabular font-extrabold ${
                                wasCalled
                                  ? 'bg-emerald-600 text-white'
                                  : isDark
                                  ? 'bg-slate-800 text-slate-400'
                                  : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {idx + 1}. {getLetterForBall(ball)}-{ball}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setVerifyRoundId(roundFairData.roundId);
                        setVerifyServerSeed(roundFairData.serverSeed);
                        setVerifyClientSeed(roundFairData.clientSeed);
                        setVerifyExpectedHash(roundFairData.sha256Hash);
                        setActiveTab('verifier');
                        handleRunVerification(
                          roundFairData.roundId,
                          roundFairData.serverSeed,
                          roundFairData.clientSeed,
                          roundFairData.sha256Hash
                        );
                      }}
                      className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>{c.verifyNowBtn}</span>
                    </button>
                  </div>
                ) : (
                  <div
                    className={`p-3 rounded-xl border text-xs space-y-2 ${
                      isDark
                        ? 'bg-slate-950/80 border-slate-800 text-slate-300'
                        : 'bg-white border-slate-200 text-slate-600'
                    }`}
                  >
                    <p>{c.lockedNotice}</p>
                    {calledBalls.length > 0 && (
                      <div className="pt-1">
                        <div className="text-[11px] font-extrabold text-emerald-400 mb-1">
                          {c.calledSoFarLabel(calledBalls.length)}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {calledBalls.map((ball, idx) => (
                            <span
                              key={ball}
                              className="px-1.5 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-mono-tabular font-extrabold"
                            >
                              {idx + 1}. {getLetterForBall(ball)}-{ball}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'verifier' && (
            <div className="space-y-3.5">
              {!isSeedRevealed && (
                <div
                  className={`p-3 rounded-2xl border text-xs font-bold flex items-start gap-2 ${
                    isDark
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                      : 'bg-amber-50 border-amber-300 text-amber-900'
                  }`}
                >
                  <Lock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span>{c.verifierLockedBanner(roundFairData.roundId)}</span>
                </div>
              )}

              <div
                className={`p-3.5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-800/70 border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs sm:text-sm font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>{c.verifierHeading}</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">{c.roundIdLabel}</label>
                  <input
                    type="number"
                    value={verifyRoundId || ''}
                    onChange={(e) => {
                      setVerifyRoundId(Number(e.target.value));
                      setVerifyBlockedMsg(null);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-white'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">
                    {c.serverSeedInputLabel}
                  </label>
                  <input
                    type="text"
                    value={verifyServerSeed}
                    placeholder={c.serverSeedPlaceholder}
                    onChange={(e) => {
                      setVerifyServerSeed(e.target.value);
                      setVerifyBlockedMsg(null);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-amber-300'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold mb-1">{c.expectedHashLabel}</label>
                  <input
                    type="text"
                    value={verifyExpectedHash}
                    onChange={(e) => {
                      setVerifyExpectedHash(e.target.value);
                      setVerifyBlockedMsg(null);
                    }}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-mono-tabular border ${
                      isDark
                        ? 'bg-slate-950 border-slate-700 text-emerald-300'
                        : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => handleRunVerification()}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{c.verifySubmitBtn}</span>
                </button>
              </div>

              {verifyBlockedMsg && (
                <div
                  className={`p-3.5 rounded-2xl border flex items-start gap-2 text-xs font-bold ${
                    isDark
                      ? 'bg-rose-950/40 border-rose-500/50 text-rose-200'
                      : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>{verifyBlockedMsg}</span>
                </div>
              )}

              {verificationResult && (
                <div
                  className={`p-4 rounded-2xl border space-y-2.5 ${
                    verificationResult.isMatch
                      ? isDark
                        ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                        : 'bg-emerald-50 border-emerald-400 text-emerald-950'
                      : isDark
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-200'
                      : 'bg-rose-50 border-rose-400 text-rose-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-black text-sm">
                    <CheckCircle2
                      className={`w-5 h-5 ${
                        verificationResult.isMatch ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    />
                    <span>
                      {verificationResult.isMatch ? c.verifyMatchedMsg : c.verifyMismatchMsg}
                    </span>
                  </div>

                  <div className="text-[11px] font-mono-tabular break-all opacity-90">
                    <strong>{c.computedHashLabel}</strong> {verificationResult.computedHash}
                  </div>

                  <div className="pt-1">
                    <div className="text-[11px] font-bold mb-1">{c.ballsFromSeedLabel}</div>
                    <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto p-2 rounded-xl bg-black/20">
                      {verificationResult.balls.map((b, i) => (
                        <span
                          key={b}
                          className="px-1.5 py-0.5 rounded bg-emerald-600/80 text-white text-[10px] font-mono-tabular font-bold"
                        >
                          {i + 1}.{getLetterForBall(b)}-{b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2.5">
              {completedHistory.length === 0 ? (
                <div className="text-center py-8 text-xs opacity-70">{c.noHistoryMsg}</div>
              ) : (
                completedHistory.map((item) => {
                  const pastFair = generateProvablyFairRound(item.gameMatchId);
                  const actualPayload = `${pastFair.serverSeed}:${pastFair.clientSeed}:${item.gameMatchId}:${item.calledBallsSnapshot.join(',')}`;
                  const itemHash = item.provablyFairHash || sha256Hex(actualPayload);
                  const itemSeed = item.serverSeed || pastFair.serverSeed;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border space-y-2 ${
                        isDark
                          ? 'bg-slate-800/60 border-slate-700'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-600 text-white text-xs font-mono-tabular font-extrabold">
                            {c.roundTag(item.gameMatchId)}
                          </span>
                          <span className="text-xs font-bold opacity-80">{item.timestamp}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const roundData = generateProvablyFairRound(item.gameMatchId);
                            const pastSeed = item.serverSeed || roundData.serverSeed;
                            setVerifyRoundId(item.gameMatchId);
                            setVerifyServerSeed(pastSeed);
                            setVerifyClientSeed(roundData.clientSeed);
                            setVerifyExpectedHash(roundData.sha256Hash);
                            setVerifyBlockedMsg(null);
                            setActiveTab('verifier');
                            const check = generateProvablyFairRound(
                              item.gameMatchId,
                              pastSeed,
                              roundData.clientSeed
                            );
                            setVerificationResult({
                              checked: true,
                              computedHash: check.sha256Hash,
                              isMatch:
                                check.sha256Hash.toLowerCase() ===
                                roundData.sha256Hash.toLowerCase(),
                              balls: check.predeterminedBalls,
                            });
                          }}
                          className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{c.verifyRoundBtn(item.gameMatchId)}</span>
                        </button>
                      </div>

                      <div className="text-[11px] font-mono-tabular break-all opacity-85 space-y-0.5">
                        <div>
                          <strong className="text-emerald-400">{c.hashFieldLabel}</strong>{' '}
                          {itemHash}
                        </div>
                        <div>
                          <strong className="text-amber-400">{c.seedFieldLabel}</strong> {itemSeed}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
