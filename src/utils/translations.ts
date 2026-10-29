import { BankPaymentAccount, Language } from '../types/bingo';

export interface TranslationStrings {
  appName: string;
  fastBingoBadge: string;
  fastRuleSubtitle: string;
  regularAppBtn: string;
  fastAppBtn: string;
  settings: string;
  settingsDesc: string;
  home: string;
  game: string;
  fastGameTab: string;
  wallet: string;
  profile: string;
  gameHistory: string;
  leaderboard: string;
  admin: string;
  rulesAndPatterns: string;
  cartela: string;
  betStake: string;
  playerWord: string;
  prizePool: string;
  derash: string;
  jackpot5Percent: string;
  autoDaub: string;
  manualDaub: string;
  calledNumbers: string;
  totalCalled: string;
  ballSpeedUnit: string;
  voiceOn: string;
  voiceOff: string;
  nextBallsPlaceholder: string;
  showMore: string;
  showLess: string;
  registerCartela: string;
  registered: string;
  notRegistered: string;
  blockedCardBadge: string;
  claimBingo: string;
  blockedCartelas: string;
  noBlockedCartelas: string;
  winningCartelas: string;
  freeGameSchedule: string;
  termsTitle: string;
  fastTermsTitle: string;
  contactUs: string;
  inviteFriend: string;
  inviteRewardNote: string;
  deposit: string;
  withdraw: string;
  transfer: string;
  transactions: string;
  gameStartingIn30s: string;
  bonusApplied: string;
  close: string;
  leaveGame: string;
  fastMatchIdLabel: string;
  regularMatchIdLabel: string;
  fastRuleShort: string;
  currentRuleLabel: string;
  availableCard: string;
  selectedCard: string;
  yourRegisteredCard: string;
  lockedByOtherCard: string;
  liveServerOnline: string;
  waitingForPlayersNote: string;
  refreshBtn: string;
  playSelectBtn: string;
  startGameBtn: string;
  selectBtn: string;
  unselectBtn: string;
  registerAllBtn: string;
  registerSelectedBtn: string;
  deleteSelectedBtn: string;
  cartelaSelectionSection: string;
  cartelaViewSection: string;
  twoSideBySide: string;
  threeSideBySide: string;
  sortingSection: string;
  sortFastWin: string;
  sortCorners: string;
  sortLines: string;
  sortCalled: string;
  sortDefault: string;
  languageLabel: string;
  mainWalletBalance: string;
  bonusBalanceLabel: string;
  phoneLabel: string;
  accountAndOtpBtn: string;
  changePasswordBtn: string;
  signOutBtn: string;
  appearanceSectionTitle: string;
  appearanceSectionSub: string;
  notificationSectionTitle: string;
  notificationSectionSub: string;
  leaderboardTitle: string;
  leaderboardSub: string;
  liveRanking: string;
  totalPrizeLabel: string;
  winsWord: string;
  youBadge: string;
  pastRoundsCount: string;
  noHistoryYet: string;
  roundWord: string;
  winnersLabel: string;
  inspectBtn: string;
  heroBadge75Ball: string;
  heroTitleLive: string;
  heroSubLive: string;
  currencyBirr: string;
  stakeTierTitle: string;
  roomOpenStatus: string;
  yourCardsLabel: string;
  bonusWord: string;
  backToRoomsBtn: string;
  startingGameInSec: string;
  startingGameRunning: string;
  guideLabel: string;
  winHeaderLabel: string;
  playersHeaderLabel: string;
  stakeHeaderLabel: string;
  callHeaderLabel: string;
  soundHeaderLabel: string;
  preGameHashLabel: string;
  copyBtn: string;
  verifyBtn: string;
  falseBingoBlockedMsg: string;
  remainingSecondsLabel: string;
  whenGameStartsUnregLabel: string;
  hideUnregBtn: string;
  dimUnregBtn: string;
  fairBtnLabel: string;
  fairBtn: string;
  logoutBtn: string;
  gameLabel: string;
  rulesGuideLabel: string;
  soundColLabel: string;
  waitLabel: string;
  infoLabel: string;
  codeLabel: string;
  timeLabel: string;
  statusFinished: string;
  statusPaused: string;
  statusPlaying: string;
  statusReady: string;
  yourHeldCartelasCount: string;
  bingoClaimLabel: string;
  unregisteredInactive: string;
  activeNumberLabel: string;
  readyToRegister: string;
}

export const TRANSLATIONS: Record<Language, TranslationStrings> = {
  am: {
    appName: 'Sun Bingo',
    fastBingoBadge: 'ፈጣን ቢንጎ',
    fastRuleSubtitle: '1 መስመር (Horizontal / Vertical / Diagonal) ወይም 4ቱ የማዕዘን ካስ',
    regularAppBtn: 'መደበኛ',
    fastAppBtn: 'ፈጣን ቢንጎ',
    settings: 'ቅንብር',
    settingsDesc: 'የካርቴላ መምረጫ፣ አደራደር፣ ቋንቋ እና Auto Daub',
    home: 'ገጽ',
    game: 'ጨዋታ',
    fastGameTab: 'ፈጣን ጨዋታ',
    wallet: 'ዋሌት',
    profile: 'ፕሮፋይል',
    gameHistory: 'የጨዋታ ታሪክ',
    leaderboard: 'Leaderboard',
    admin: 'መቆጣጠሪያ',
    rulesAndPatterns: 'የጨዋታ ቅንብር',
    cartela: 'ካርቴላ',
    betStake: 'ዋጋ',
    playerWord: 'ተጫዋች',
    prizePool: 'ሽልማት',
    derash: 'ደራሽ',
    jackpot5Percent: '🎰 ጃክፓት',
    autoDaub: 'በራሱ ምልክት',
    manualDaub: 'በእጅ ምልክት',
    calledNumbers: 'የወጡ ቁጥሮች:',
    totalCalled: 'የወጡ ኳሶች ብዛት:',
    ballSpeedUnit: 's/ኳስ',
    voiceOn: 'ድምጽ በርቷል',
    voiceOff: 'ድምጽ ጠፍቷል',
    nextBallsPlaceholder: 'ቀጣይ ኳሶች እዚህ ይታያሉ...',
    showMore: 'ሙሉ ሰሌዳ',
    showLess: 'ሰብስብ',
    registerCartela: 'ካርቴላ አስመዝግብ',
    registered: 'ተመዝግቧል',
    notRegistered: 'ካርቴላ አልተመዘገበም',
    blockedCardBadge: 'ካርቴላ ታግዷል',
    claimBingo: 'ቢንጎ!',
    blockedCartelas: 'የታገዱ ካርቴላዎች:',
    noBlockedCartelas: 'ምንም የታገደ ካርቴላ የለም',
    winningCartelas: 'ቢንጎ ያሉ ካርቴላዎች:',
    freeGameSchedule: 'የነፃ ጨዋታ ሰሌዳ',
    termsTitle: 'የጨዋታ ሕጎችና ደንቦች',
    fastTermsTitle: 'የቢንጎ ጨዋታ ህጎች',
    contactUs: 'አግኙን',
    inviteFriend: 'ጓደኛ መጋበዝ (25 ብር ሽልማት)',
    inviteRewardNote: 'በእያንዳንዱ ተጋባዥ ጓደኛ 25 ብር ሽልማት ያግኙ!',
    deposit: 'ገቢ',
    withdraw: 'ወጪ',
    transfer: 'ትራንስፈር',
    transactions: 'የግብይት ታሪኮች',
    gameStartingIn30s: 'ማሳወቂያ፦ ጨዋታው በ 30 ሰከንድ ውስጥ ይጀምራል!',
    bonusApplied: 'ከ20 በላይ ካርቴላ ስለያዙ +5 ነፃ ቦነስ ካርቴላ ተሰጥቶዎታል!',
    close: 'ዝጋ',
    leaveGame: 'ውጣ',
    fastMatchIdLabel: 'የፈጣን ጨዋታ መለያ',
    regularMatchIdLabel: 'የጨዋታ መለያ',
    fastRuleShort: 'ሕግ፦ 1 መስመር ወይም 4 ማዕዘን',
    currentRuleLabel: 'የአሁኑ ሕግ',
    availableCard: 'ክፍት',
    selectedCard: 'የመረጡት',
    yourRegisteredCard: 'የእርስዎ የተመዘገበ',
    lockedByOtherCard: '🔒 በቀይ ቀለም፦ በሌላ ተጫዋች የተመረጠ',
    liveServerOnline: 'ቀጥታ ሰርቨር',
    waitingForPlayersNote: '1 ተጫዋች ብቻ ነው ያለው — 2 ተጫዋቾች ሲገቡ ቀሪ ሴኮንድ መቁጠር ይጀምራል',
    refreshBtn: 'አድስ',
    playSelectBtn: 'ምረጥ',
    startGameBtn: 'ጨዋታ ጀምር',
    selectBtn: 'ምረጥ',
    unselectBtn: 'ምርጫ አጽዳ',
    registerAllBtn: 'ሁሉንም አስመዝግብ',
    registerSelectedBtn: 'የተመረጡትን አስመዝግብ',
    deleteSelectedBtn: 'የተመረጡትን አጥፋ',
    cartelaSelectionSection: '1. ካርቴላ መምረጫ እና መመዝገቢያ',
    cartelaViewSection: '2. የካርቴላ እይታ',
    twoSideBySide: '2 ጎን ለጎን',
    threeSideBySide: '3 ጎን ለጎን',
    sortingSection: 'የፈጣን ቢንጎ አደራደር:',
    sortFastWin: '⚡ በ1 መስመር / 4 ማዕዘን',
    sortCorners: 'በ4 ማዕዘን',
    sortLines: 'በ1 መስመር',
    sortCalled: 'ብዙ በተጠራ',
    sortDefault: 'መደበኛ',
    languageLabel: 'ቋንቋ፦',
    mainWalletBalance: 'ዋና ቀሪ ሂሳብ',
    bonusBalanceLabel: 'ቦነስ ሂሳብ',
    phoneLabel: 'ስልክ',
    accountAndOtpBtn: 'ስልክ ቁጥር / SMS OTP ምዝገባ',
    changePasswordBtn: 'የይለፍ ቃል መቀየሪያ',
    signOutBtn: 'ውጣ',
    appearanceSectionTitle: 'ቋንቋ፣ ገፅታ እና የምልክት ቀለም',
    appearanceSectionSub: 'አማርኛ / ትግርኛ / Oromoo / English · Dark/Light · 5 ቀለማት',
    notificationSectionTitle: 'የጨዋታ ማሳወቂያ ምርጫ',
    notificationSectionSub: 'ጨዋታ ሊጀምር 30 ሰከንድ ሲቀረው የሚመጣ ማሳወቂያ',
    leaderboardTitle: '🏆 የአሸናፊዎች የክብር ሰሌዳ',
    leaderboardSub: 'በፈጣን ቢንጎ እና በመደበኛ ቢንጎ ከፍተኛ ደራሽ እና ተደጋጋሚ ድል ያስመዘገቡ ምርጥ ተጫዋቾች',
    liveRanking: 'ቀጥታ የሚዘምን',
    totalPrizeLabel: 'ጠቅላላ ሽልማት',
    winsWord: 'ድሎች',
    youBadge: 'እርስዎ',
    pastRoundsCount: 'ጠቅላላ ዙሮች',
    noHistoryYet: 'ምንም የተመዘገበ የጨዋታ ታሪክ የለም።',
    roundWord: 'ዙር',
    winnersLabel: 'አሸናፊዎች:',
    inspectBtn: 'ቼክ አድርግ',
    heroBadge75Ball: '75-ኳስ የቀጥታ ቢንጎ',
    heroTitleLive: 'ኢዚ ቢንጎ የቀጥታ...',
    heroSubLive: 'የቀጥታ የኳስ እጣ፣ ፈጣን የብር ሽልማቶችና የ24/7...',
    currencyBirr: 'ብር',
    stakeTierTitle: 'ባለ',
    roomOpenStatus: 'ክፍት ነው',
    yourCardsLabel: 'የእርስዎ:',
    bonusWord: 'ቦነስ:',
    backToRoomsBtn: 'ተመለስ',
    startingGameInSec: 'ጨዋታው የሚጀምርበት ጊዜ፦',
    startingGameRunning: 'ጨዋታው ለመጀመር በመጠባበቅ ላይ',
    guideLabel: 'መመሪያ',
    winHeaderLabel: 'አሸንፍ',
    playersHeaderLabel: 'ተጫዋቾች',
    stakeHeaderLabel: 'መደብ',
    callHeaderLabel: 'ጥሪ',
    soundHeaderLabel: 'ድምጽ',
    preGameHashLabel: 'ቅድመ-ጨዋታ የተቆለፈ SHA-256 ሃሽ፦',
    copyBtn: 'ኮፒ',
    verifyBtn: 'አረጋግጥ',
    falseBingoBlockedMsg: 'የተሳሳተ ቢንጎ! ካርቴላ በራስ-ሰር ታግዷል',
    remainingSecondsLabel: 'የማጣሪያ ጊዜ ቆጣሪ:',
    whenGameStartsUnregLabel: 'ጨዋታ ከተጀመረ ያልተመዘገበ ካርቴላ፦',
    hideUnregBtn: '🚫 ይጥፋ',
    dimUnregBtn: '🌑 ደብዝዝ',
    fairBtnLabel: 'ፍትሃዊ',
    fairBtn: 'ፍትሃዊ',
    logoutBtn: 'ውጣ',
    gameLabel: 'ጨዋታ',
    rulesGuideLabel: 'መመሪያ',
    soundColLabel: 'ድምጽ',
    waitLabel: 'ጠብቅ (wait)',
    infoLabel: 'መረጃ',
    codeLabel: 'ኮድ:',
    timeLabel: 'ሰዓት:',
    statusFinished: 'ጨዋታው ተጠናቋል',
    statusPaused: 'ቆሟል',
    statusPlaying: 'በጨዋታ ላይ',
    statusReady: 'ዝግጁ',
    yourHeldCartelasCount: 'እርስዎ የያዙት ካርቴላ ብዛት:',
    bingoClaimLabel: 'ቢንጎ የማለት ሰዓት',
    unregisteredInactive: 'ያልተመዘገበ (አይሰራም)',
    activeNumberLabel: 'የወጣ ቁጥር (Active):',
    readyToRegister: 'ለመመዝገብ ዝግጁ ይሁኑ',
  },
  ti: {
    appName: 'Sun Bingo',
    fastBingoBadge: 'ቅልጡፍ ቢንጎ',
    fastRuleSubtitle: '1 መስመር (Horizontal / Vertical / Diagonal) ወይ 4 መኣዝን',
    regularAppBtn: 'ስሩዕ',
    fastAppBtn: 'ቅልጡፍ ቢንጎ',
    settings: 'ቅጥዒ',
    settingsDesc: 'መምረጺ ካርቴላ፣ ኣሰራርዓ፣ ቋንቋን Auto Daubን',
    home: 'ገጽ',
    game: 'ጸወታ',
    fastGameTab: 'ቅልጡፍ ጸወታ',
    wallet: 'ዋሌት',
    profile: 'ፕሮፋይል',
    gameHistory: 'ታሪኽ ጸወታ',
    leaderboard: 'Leaderboard',
    admin: 'መቆጻጸሪ',
    rulesAndPatterns: 'ሕግታትን ቅጥታትን',
    cartela: 'ካርቴላ',
    betStake: 'ዋጋ',
    playerWord: 'ተጻዋታይ',
    prizePool: 'ሽልማት',
    derash: 'ደራሽ',
    jackpot5Percent: '🎰 ጃክፓት',
    autoDaub: 'ባዕሉ ምልክት',
    manualDaub: 'ብኢድ ምልክት',
    calledNumbers: 'ዝወጹ ቁጽርታት:',
    totalCalled: 'ዝወጹ ኩዕሶታት ብዝሒ:',
    ballSpeedUnit: 's/ኩዕሶ',
    voiceOn: 'ድምጺ ተኸፊቱ',
    voiceOff: 'ድምጺ ተዓጽዩ',
    nextBallsPlaceholder: 'ዝቕጽሉ ኩዕሶታት ኣብዚ ይርአዩ...',
    showMore: 'ምሉእ ሰሌዳ',
    showLess: 'ኣክብ',
    registerCartela: 'ካርቴላ ኣመዝግብ',
    registered: 'ተመዝጊቡ',
    notRegistered: 'ካርቴላ ኣይተመዝገበን',
    blockedCardBadge: 'ካርቴላ ተኣጊዱ',
    claimBingo: 'ቢንጎ!',
    blockedCartelas: 'ዝተኣገዱ ካርቴላታት:',
    noBlockedCartelas: 'ዝተኣገደ ካርቴላ የለን',
    winningCartelas: 'ቢንጎ ዝበሉ ካርቴላታት:',
    freeGameSchedule: 'ናይ ነፃ ጸወታ ሰሌዳ',
    termsTitle: 'ሕግታት ጸወታ',
    fastTermsTitle: 'ሕግታት ጸወታ ቢንጎ',
    contactUs: 'ርኸቡና',
    inviteFriend: 'ዓርኪ ዓድም (25 ብር ሽልማት)',
    inviteRewardNote: 'ብነፍሲ ወከፍ ዝዓደምክሞ ዓርኪ 25 ብር ሽልማት ርኸቡ!',
    deposit: 'ኣታዊ',
    withdraw: 'ወፃኢ',
    transfer: 'ትራንስፈር',
    transactions: 'ታሪኽ ግብይት',
    gameStartingIn30s: 'ጸወታ ኣብ ውሽጢ 30 ሰከንድ ክጅምር እዩ!',
    bonusApplied: 'ልዕሊ 20 ካርቴላ ስለዝሓዝኩም +5 ነፃ ቦነስ ካርቴላ ተዋሂቡኩም!',
    close: 'ዕጸው',
    leaveGame: 'ውጻእ',
    fastMatchIdLabel: 'መለለዪ ቅልጡፍ ጸወታ',
    regularMatchIdLabel: 'መለለዪ ጸወታ',
    fastRuleShort: 'ሕጊ፦ 1 መስመር ወይ 4 መኣዝን',
    currentRuleLabel: 'ናይ ሕጂ ሕጊ',
    availableCard: 'ክፉት',
    selectedCard: 'ዝተመርጸ',
    yourRegisteredCard: 'ናትኩም ዝተመዝገበ',
    lockedByOtherCard: '🔒 ብቀይሕ ሕብሪ፦ ብካልእ ተጻዋታይ ዝተመርጸ',
    liveServerOnline: 'ቀጥታ ሰርቨር',
    waitingForPlayersNote: '1 ተጻዋታይ ጥራይ ኣሎ — 2 ተጻወትቲ ምስ ኣተዉ ቆጸራ ይጅምር',
    refreshBtn: 'ኣሐድስ',
    playSelectBtn: 'ምረጽ',
    startGameBtn: 'ጸወታ ጀምር',
    selectBtn: 'ምረጽ',
    unselectBtn: 'ምርጫ ኣጽሪ',
    registerAllBtn: 'ኩሉ ኣመዝግብ',
    registerSelectedBtn: 'ዝተመርጹ ኣመዝግብ',
    deleteSelectedBtn: 'ዝተመርጹ ኣጥፍእ',
    cartelaSelectionSection: '1. መምረጺን መመዝገቢን ካርቴላ',
    cartelaViewSection: '2. ርእየት ካርቴላ',
    twoSideBySide: '2 ጎኒ ንጎኒ',
    threeSideBySide: '3 ጎኒ ንጎኒ',
    sortingSection: 'ኣሰራርዓ ቅልጡፍ ቢንጎ:',
    sortFastWin: '⚡ ብ1 መስመር / 4 መኣዝን',
    sortCorners: 'ብ4 መኣዝን',
    sortLines: 'ብ1 መስመር',
    sortCalled: 'ብዙሕ ብዝተጸውዐ',
    sortDefault: 'ስሩዕ',
    languageLabel: 'ቋንቋ፦',
    mainWalletBalance: 'ቀንዲ ቀሪ ሒሳብ',
    bonusBalanceLabel: 'ቦነስ ሒሳብ',
    phoneLabel: 'ስልኪ',
    accountAndOtpBtn: 'ቁጽሪ ስልኪ / SMS OTP ምዝገባ',
    changePasswordBtn: 'መሕለፊ ቃል ቀይር',
    signOutBtn: 'ውጻእ',
    appearanceSectionTitle: 'ቋንቋ፣ ትርኢትን ሕብሪ ምልክትን',
    appearanceSectionSub: 'አማርኛ / ትግርኛ / Oromoo / English · Dark/Light · 5 ሕብርታት',
    notificationSectionTitle: 'ምርጫ መዘኻኸሪ ጸወታ',
    notificationSectionSub: 'ጸወታ ክጅምር 30 ሰከንድ ክተርፎ ከሎ ዝመጽእ መዘኻኸሪ',
    leaderboardTitle: '🏆 ሰሌዳ ክብሪ ተዓወትቲ',
    leaderboardSub: 'ኣብ ቅልጡፍ ቢንጎን ስሩዕ ቢንጎን ልዑል ሽልማት ዝረኸቡ ብሉጻት ተጻወትቲ',
    liveRanking: 'ቀጥታ ዝሕደስ',
    totalPrizeLabel: 'ጠቕላላ ሽልማት',
    winsWord: 'ዓወታት',
    youBadge: 'ንስኹም',
    pastRoundsCount: 'ጠቕላላ ዙራት',
    noHistoryYet: 'ዝተመዝገበ ታሪኽ ጸወታ የለን።',
    roundWord: 'ዙር',
    winnersLabel: 'ተዓወትቲ:',
    inspectBtn: 'መርምር',
    heroBadge75Ball: '75-ኩዕሶ ቀጥታ ቢንጎ',
    heroTitleLive: 'ኢዚ ቢንጎ ቀጥታ...',
    heroSubLive: 'ቀጥታ ዕጫ ኩዕሶ፣ ቅልጡፍ ናይ ብር ሽልማትን 24/7...',
    currencyBirr: 'ብር',
    stakeTierTitle: 'በዓል',
    roomOpenStatus: 'ክፉት እዩ',
    yourCardsLabel: 'ናትኩም:',
    bonusWord: 'ቦነስ:',
    backToRoomsBtn: 'ተመለስ',
    startingGameInSec: 'ጸወታ ዝጅምረሉ ግዜ፦',
    startingGameRunning: 'ጸወታ ንምጅማር ይጽበ ኣሎ',
    guideLabel: 'መምርሒ',
    winHeaderLabel: 'ተዓወት',
    playersHeaderLabel: 'ተጻወትቲ',
    stakeHeaderLabel: 'መደብ',
    callHeaderLabel: 'ጻውዒት',
    soundHeaderLabel: 'ድምጺ',
    preGameHashLabel: 'ናይ ጸወታ ዝተዓጽወ SHA-256 ሃሽ፦',
    copyBtn: 'ቅዳሕ',
    verifyBtn: 'ኣረጋግጽ',
    falseBingoBlockedMsg: 'ጌጋ ቢንጎ! ካርቴላ ብባዕሉ ተኣጊዱ',
    remainingSecondsLabel: 'ተረፍ ግዜ መጻረዪ:',
    whenGameStartsUnregLabel: 'ጸወታ ምስ ጀመረ ዘይተመዝገበ ካርቴላ፦',
    hideUnregBtn: '🚫 ይጥፋእ',
    dimUnregBtn: '🌑 ኣደብዝዝ',
    fairBtnLabel: 'ፍትሓዊ',
    fairBtn: 'ፍትሓዊ',
    logoutBtn: 'ውጻእ',
    gameLabel: 'ጸወታ',
    rulesGuideLabel: 'መምርሒ',
    soundColLabel: 'ድምጺ',
    waitLabel: 'ተጸበ',
    infoLabel: 'ሓበሬታ',
    codeLabel: 'ኮድ:',
    timeLabel: 'ሰዓት:',
    statusFinished: 'ጸወታ ተዛዚሙ',
    statusPaused: 'ጠጠው ኢሉ',
    statusPlaying: 'ኣብ ጸወታ',
    statusReady: 'ድሉው',
    yourHeldCartelasCount: 'ዝሓዝኩሞ ብዝሒ ካርቴላ:',
    bingoClaimLabel: 'ቢንጎ ምባል ሰዓት',
    unregisteredInactive: 'ዘይተመዝገበ (ኣይሰርሕን)',
    activeNumberLabel: 'ዝወጸት ቁጽሪ (Active):',
    readyToRegister: 'ምዝገባ ድሉው ኩን',
  },
  om: {
    appName: 'Sun Bingo',
    fastBingoBadge: 'Bingo Ariifataa',
    fastRuleSubtitle: 'Sarara 1 (Horizontal / Vertical / Diagonal) ykn Golee 4',
    regularAppBtn: 'Idilee',
    fastAppBtn: 'Bingo Ariifataa',
    settings: 'Qindaa’ina',
    settingsDesc: 'Filannoo Kaartelaa, Tartiiba, Afaanii fi Auto Daub',
    home: 'Fuula',
    game: 'Tapha',
    fastGameTab: 'Tapha Ariifataa',
    wallet: 'Waaletii',
    profile: 'Piroofaayilii',
    gameHistory: 'Seenaa Taphaa',
    leaderboard: 'Leaderboard',
    admin: 'To’annoo',
    rulesAndPatterns: 'Seeraa fi Boca',
    cartela: 'Kaartelaa',
    betStake: 'Gatii',
    playerWord: 'Taphataa',
    prizePool: 'Badhaasa',
    derash: 'Badhaasa (Derash)',
    jackpot5Percent: '🎰 Jaakpootii',
    autoDaub: 'Ofumaan Mallattoo',
    manualDaub: 'Harkaan Mallattoo',
    calledNumbers: 'Lakkoofsota Bahan:',
    totalCalled: 'Baay’ina Kubbaa Bahee:',
    ballSpeedUnit: 's/kubbaa',
    voiceOn: 'Sagaleen Banaadha',
    voiceOff: 'Sagaleen Cufaadha',
    nextBallsPlaceholder: 'Kubbaan itti aanu asitti mul’ata...',
    showMore: 'Guutuu Agarsiisi',
    showLess: 'Walitti Qabi',
    registerCartela: 'Kaartelaa Galmeessi',
    registered: 'Galmaa’eera',
    notRegistered: 'Kaartelaan Hin Galmoofne',
    blockedCardBadge: 'Kaartelaan Dhorkameera',
    claimBingo: 'BINGO!',
    blockedCartelas: 'Kaartelaawwan Dhorkaman:',
    noBlockedCartelas: 'Kaartelaan dhorkame hin jiru',
    winningCartelas: 'Kaartelaawwan Bingo Jedhan:',
    freeGameSchedule: 'Sagantaa Tapha Bilisaa',
    termsTitle: 'Seera Taphaa',
    fastTermsTitle: 'Seera Tapha Bingo',
    contactUs: 'Nu Quunnamaa',
    inviteFriend: 'Hiriyaa Afeeri (Badhaasa Birrii 25)',
    inviteRewardNote: 'Hiriyaa afeertan hundaaf badhaasa Birrii 25 argadhaa!',
    deposit: 'Galchii',
    withdraw: 'Baasii',
    transfer: 'Dabarsuu',
    transactions: 'Seenaa Daddabarsaa',
    gameStartingIn30s: 'Taphni sekondii 30 keessatti ni eegala!',
    bonusApplied: 'Kaartelaa 20 ol waan qabattaniif +5 Kaartelaa Bilisaa badhaafamtaniittu!',
    close: 'Cufi',
    leaveGame: 'Bahi',
    fastMatchIdLabel: 'Eenyummeessaa Tapha Ariifataa',
    regularMatchIdLabel: 'Eenyummeessaa Taphaa',
    fastRuleShort: 'Seera: Sarara 1 ykn Golee 4',
    currentRuleLabel: 'Seera Ammaa',
    availableCard: 'Banaa',
    selectedCard: 'Kan Filatame',
    yourRegisteredCard: 'Kan Galmaa’e',
    lockedByOtherCard: '🔒 Diimaa: Taphataa Biraatiin Qabame',
    liveServerOnline: 'Sarvara Kallattii',
    waitingForPlayersNote: 'Taphataa 1 qofa — Taphattoonni 2 yoo seenan lakkoofsi sekondii ni eegala',
    refreshBtn: 'Haaromsuu',
    playSelectBtn: 'Filadhu',
    startGameBtn: 'Tapha Eegali',
    selectBtn: 'Filadhu',
    unselectBtn: 'Filannoo Haqi',
    registerAllBtn: 'Hunda Galmeessi',
    registerSelectedBtn: 'Kan Filataman Galmeessi',
    deleteSelectedBtn: 'Kan Filataman Haqi',
    cartelaSelectionSection: '1. Filannoo fi Galmee Kaartelaa',
    cartelaViewSection: '2. Ilaalcha Kaartelaa',
    twoSideBySide: '2 Cinaa Walii',
    threeSideBySide: '3 Cinaa Walii',
    sortingSection: 'Tartiiba Bingo Ariifataa:',
    sortFastWin: '⚡ Sarara 1 / Golee 4',
    sortCorners: 'Golee 4',
    sortLines: 'Sarara 1',
    sortCalled: 'Baay’inaan Waamame',
    sortDefault: 'Idilee',
    languageLabel: 'Afaan፦',
    mainWalletBalance: 'Haftee Waaletii Guddaa',
    bonusBalanceLabel: 'Haftee Boonusii',
    phoneLabel: 'Bilbila',
    accountAndOtpBtn: 'Lakkoofsa Bilbilaa / SMS OTP',
    changePasswordBtn: 'Jecha Darbii Jijjiiri',
    signOutBtn: 'Bahi',
    appearanceSectionTitle: 'Afaan, Bifa fi Halluu Mallattoo',
    appearanceSectionSub: 'አማርኛ / ትግርኛ / Oromoo / English · Dark/Light · Halluu 5',
    notificationSectionTitle: 'Filannoo Beeksisa Taphaa',
    notificationSectionSub: 'Beeksisa sekondii 30 dura taphni eegaluuf jedhu dhufu',
    leaderboardTitle: '🏆 Gabatee Injifattootaa',
    leaderboardSub: 'Taphattoota badhaasa guddaa fi injifannoo baay’ee galmeessisan',
    liveRanking: 'Kallattiin Kan Haaromfamu',
    totalPrizeLabel: 'Badhaasa Waliigalaa',
    winsWord: 'Injifannoo',
    youBadge: 'Si’i',
    pastRoundsCount: 'Marsaa Waliigalaa',
    noHistoryYet: 'Seenaan taphaa galmaa’e hin jiru.',
    roundWord: 'Marsaa',
    winnersLabel: 'Injifattoota:',
    inspectBtn: 'Ilaali',
    heroBadge75Ball: '75-Kubbaa Bingo Kallattii',
    heroTitleLive: 'Sun Bingo Kallattii...',
    heroSubLive: 'Carraa kubbaa kallattii, badhaasa maallaqaa ariifataa fi 24/7...',
    currencyBirr: 'ETB',
    stakeTierTitle: 'Abbaa',
    roomOpenStatus: 'Banaadha',
    yourCardsLabel: 'Kan kee:',
    bonusWord: 'Boonusii:',
    backToRoomsBtn: 'Deebi’i',
    startingGameInSec: 'Taphni kan eegalu sekondii',
    startingGameRunning: 'Taphni eegaluuf eegaa jira',
    guideLabel: 'Qajeelfama',
    winHeaderLabel: 'Badhaasa',
    playersHeaderLabel: 'Taphattoota',
    stakeHeaderLabel: 'Gatii',
    callHeaderLabel: 'Waamicha',
    soundHeaderLabel: 'Sagalee',
    preGameHashLabel: 'SHA-256 Hash Taphaa፦',
    copyBtn: 'Waraabi',
    verifyBtn: 'Mirkaneessi',
    falseBingoBlockedMsg: 'Bingo Dogoggoraa! Kaartelaan ofumaan dhorkameera',
    remainingSecondsLabel: 'Yeroo hafe:',
    whenGameStartsUnregLabel: 'Taphni yoo eegalu kaartelaa hin galmoofne:',
    hideUnregBtn: '🚫 Dhoksi',
    dimUnregBtn: '🌑 Dukkaneessi',
    fairBtnLabel: 'Haqa',
    fairBtn: 'Haqa',
    logoutBtn: 'Bahi',
    gameLabel: 'Tapha',
    rulesGuideLabel: 'Qajeelfama',
    soundColLabel: 'Sagalee',
    waitLabel: 'Eegi',
    infoLabel: 'Odeeffannoo',
    codeLabel: 'Koodii:',
    timeLabel: 'Sa’aatii:',
    statusFinished: 'Taphni Xumurameera',
    statusPaused: 'Dhaabbateera',
    statusPlaying: 'Tapha Irratti',
    statusReady: 'Qophii',
    yourHeldCartelasCount: 'Baay’ina Kaartelaa Qabattan:',
    bingoClaimLabel: 'Yeroo Bingo jechuu',
    unregisteredInactive: 'Kan hin galmoofne (hin hojjetu)',
    activeNumberLabel: 'Lakkoofsa bahe (Active):',
    readyToRegister: 'Galmeef qophaa\'aa',
  },
  en: {
    appName: 'Sun Bingo',
    fastBingoBadge: 'Fast Bingo',
    fastRuleSubtitle: '1 Line (Horizontal / Vertical / Diagonal) or 4 Corners',
    regularAppBtn: 'Classic',
    fastAppBtn: 'Fast Bingo',
    settings: 'Settings',
    settingsDesc: 'Cartela Selection, Sorting, Language & Auto Daub',
    home: 'Home',
    game: 'Game',
    fastGameTab: 'Fast Game',
    wallet: 'Wallet',
    profile: 'Profile',
    gameHistory: 'Game History',
    leaderboard: 'Leaderboard',
    admin: 'Control',
    rulesAndPatterns: 'Rules & Patterns',
    cartela: 'Cartela',
    betStake: 'Stake',
    playerWord: 'Player',
    prizePool: 'Prize',
    derash: 'Winner Prize',
    jackpot5Percent: '🎰 Jackpot',
    autoDaub: 'Auto Daub',
    manualDaub: 'Tap to Daub',
    calledNumbers: 'Called Numbers:',
    totalCalled: 'Total Balls Out:',
    ballSpeedUnit: 's/ball',
    voiceOn: 'Voice ON',
    voiceOff: 'Voice OFF',
    nextBallsPlaceholder: 'Upcoming balls will appear here...',
    showMore: 'Show More',
    showLess: 'Show Less',
    registerCartela: 'Register Cartela',
    registered: 'Registered',
    notRegistered: 'Cartela Not Registered',
    blockedCardBadge: 'Cartela Blocked',
    claimBingo: 'BINGO!',
    blockedCartelas: 'Blocked Cartela IDs:',
    noBlockedCartelas: 'No blocked cartelas (Cards are never blocked before game starts)',
    winningCartelas: 'Winning Cartela IDs:',
    freeGameSchedule: 'Free Game Schedule',
    termsTitle: 'Terms & Conditions',
    fastTermsTitle: 'Bingo Game Rules',
    contactUs: 'Contact Us',
    inviteFriend: 'Invite a Friend (25 ETB Reward)',
    inviteRewardNote: 'Earn 25 ETB bonus for every friend you invite!',
    deposit: 'Deposit',
    withdraw: 'Withdraw',
    transfer: 'Transfer',
    transactions: 'Transaction History',
    gameStartingIn30s: 'Notice: Game is starting in 30 seconds!',
    bonusApplied: 'Over 20 Cartelas selected: +5 FREE Bonus Cartelas awarded!',
    close: 'Close',
    leaveGame: 'Leave',
    fastMatchIdLabel: 'Fast Game ID',
    regularMatchIdLabel: 'Game Match ID',
    fastRuleShort: 'Rule: 1 Line or 4 Corners',
    currentRuleLabel: 'Current Rule',
    availableCard: 'Available',
    selectedCard: 'Selected',
    yourRegisteredCard: 'Your Registered',
    lockedByOtherCard: '🔒 Red: Taken by another player',
    liveServerOnline: 'Live Server',
    waitingForPlayersNote: 'Only 1 player in room — Countdown starts when 2nd player joins',
    refreshBtn: 'Refresh',
    playSelectBtn: 'Select',
    startGameBtn: 'Start Game',
    selectBtn: 'Select',
    unselectBtn: 'Unselect',
    registerAllBtn: 'Register All',
    registerSelectedBtn: 'Register Selected',
    deleteSelectedBtn: 'Delete Selected',
    cartelaSelectionSection: '1. Cartela Selection & Registration',
    cartelaViewSection: '2. Cartela View',
    twoSideBySide: '2 Columns',
    threeSideBySide: '3 Columns',
    sortingSection: 'Fast Bingo Sorting:',
    sortFastWin: '⚡ By 1 Line / 4 Corners',
    sortCorners: 'By 4 Corners',
    sortLines: 'By 1 Line',
    sortCalled: 'By Most Called',
    sortDefault: 'Default Order',
    languageLabel: 'Language:',
    mainWalletBalance: 'Main Wallet Balance',
    bonusBalanceLabel: 'Bonus Balance',
    phoneLabel: 'Phone',
    accountAndOtpBtn: 'Phone / SMS OTP Registration',
    changePasswordBtn: 'Change Password',
    signOutBtn: 'Sign Out',
    appearanceSectionTitle: 'Language, Theme & Daub Color',
    appearanceSectionSub: 'Amharic / Tigrinya / Oromoo / English · Dark/Light · 5 Colors',
    notificationSectionTitle: 'Game Notification Settings',
    notificationSectionSub: 'Alert 30 seconds before a new game starts',
    leaderboardTitle: '🏆 Leaderboard',
    leaderboardSub: 'Top players with highest prizes and most wins in Fast & Classic Bingo',
    liveRanking: 'Live Ranking',
    totalPrizeLabel: 'Total Prize',
    winsWord: 'Wins',
    youBadge: 'You',
    pastRoundsCount: 'Total Rounds',
    noHistoryYet: 'No recorded game history yet.',
    roundWord: 'Round',
    winnersLabel: 'Winners:',
    inspectBtn: 'Inspect Card',
    heroBadge75Ball: '75-Ball Live Bingo',
    heroTitleLive: 'Sun Bingo Live...',
    heroSubLive: 'Live ball draws, instant cash prizes & 24/7...',
    currencyBirr: 'ETB',
    stakeTierTitle: 'Stake',
    roomOpenStatus: 'Open',
    yourCardsLabel: 'Yours:',
    bonusWord: 'Bonus:',
    backToRoomsBtn: 'Back',
    startingGameInSec: 'Starting game in',
    startingGameRunning: 'Waiting to start game',
    guideLabel: 'Rules',
    winHeaderLabel: 'Win',
    playersHeaderLabel: 'Players',
    stakeHeaderLabel: 'Stake',
    callHeaderLabel: 'Call',
    soundHeaderLabel: 'Sound',
    preGameHashLabel: 'Pre-Game Locked SHA-256 Hash:',
    copyBtn: 'Copy',
    verifyBtn: 'Verify',
    falseBingoBlockedMsg: 'False Bingo! Cartela Auto-Blocked',
    remainingSecondsLabel: 'Inspection Timer:',
    whenGameStartsUnregLabel: 'When Game Starts (Unregistered Cards):',
    hideUnregBtn: '🚫 Hide',
    dimUnregBtn: '🌑 Dim',
    fairBtnLabel: 'Fair',
    fairBtn: 'Fair',
    logoutBtn: 'Sign Out',
    gameLabel: 'Game',
    rulesGuideLabel: 'Rules',
    soundColLabel: 'Sound',
    waitLabel: 'wait',
    infoLabel: 'Info',
    codeLabel: 'Code:',
    timeLabel: 'Time:',
    statusFinished: 'Game Finished',
    statusPaused: 'Paused',
    statusPlaying: 'In Progress',
    statusReady: 'Ready',
    yourHeldCartelasCount: 'Your Held Cartelas:',
    bingoClaimLabel: 'Bingo Claim Time',
    unregisteredInactive: 'Unregistered (Inactive)',
    activeNumberLabel: 'Called Ball (Active):',
    readyToRegister: 'Get Ready to Register',
  },
};

export const PAYMENT_ACCOUNTS: BankPaymentAccount[] = [
  {
    id: 'CBE',
    bankName: 'Commercial Bank of Ethiopia (CBE)',
    shortName: 'CBE',
    accountNumber: '1000112964936',
    accountHolder: 'Ezana Gebremedhin',
    badgeBg: 'bg-purple-700 text-white',
  },
  {
    id: 'Abyssinia',
    bankName: 'Bank of Abyssinia (አቢሲኒያ ባንክ)',
    shortName: 'Abyssinia',
    accountNumber: '66816532',
    accountHolder: 'Ezana Gebremedhin',
    badgeBg: 'bg-amber-500 text-slate-950',
  },
  {
    id: 'Telebirr',
    bankName: 'Telebirr (ቴሌብር)',
    shortName: 'Telebirr',
    accountNumber: '0942742684',
    accountHolder: 'Ezana Gebremedhin',
    badgeBg: 'bg-sky-500 text-white',
  },
  {
    id: 'M-Pesa',
    bankName: 'M-Pesa Safaricom (ኤም-ፔሳ)',
    shortName: 'M-Pesa',
    accountNumber: '0711742684',
    accountHolder: 'Ezana Gebremedhin',
    badgeBg: 'bg-emerald-600 text-white',
  },
  {
    id: 'Cash',
    bankName: 'በካሽ / Cash (በቀጥታ በጥሬ ገንዘብ)',
    shortName: 'Cash 💵',
    accountNumber: 'ጥሬ ገንዘብ (Agent / Cashier)',
    accountHolder: 'ወኪል ወይም አድሚን (In-Person Cash)',
    badgeBg: 'bg-emerald-500 text-slate-950 font-black',
  },
];

export const TERMS_AND_CONDITIONS_LIST = [
  '1. 4ት የመኣዝን ኳስ እንደ ኣንድ መስመር ኣይታሰብም።',
  '2. ካርቴላ የተሰጠውን ጨዋታ በትክክል ሰርቶ እያለ ነገር ግን የመጨረሻ ቁጥር(Active Number) በሰራው ቢንጎ ውስጥ ከሌለ ይህ ትክክለኛ ኣሸናፊ ኣይደለም ካርቲላም ይታሰራል።',
  '3. ከኣንድ በላይ ካርቴላ ኣሸናፊ ከሆኑ ምንም ለውጥ ሳያመጣ ሁሉንም ኣሸናፊ ይሆናል ፣ ሽልማትም ለሁሉም በእኩል ያካፈላል።',
  '4. 5ት ቀን እና ከዚያ በላይ በፊት በቴሌብር ይሁን በሲቢኢ ባንክ የተላከ ገንዘብ ዲፖዚት መደረግ ኣይችልም ፣ በ 4ት ቀን ውስጥ ገቢ መደረግ ኣለበት።',
  '5. በደምበኞቻችን በኩል የ ኮኔክሽን ችግር ለሚነሱ ኣቤቱታዎች ምንም ኣይነት ተቀባይነት የላቸውም።',
];

export const TERMS_AND_CONDITIONS_BY_LANG: Record<Language, string[]> = {
  am: TERMS_AND_CONDITIONS_LIST,
  ti: [
    '1. 4ተ ናይ መኣዝን ኩዕሶ ከም ሓደ መስመር ኣይሕሰብን።',
    '2. ካርቴላ ነቲ ዝተዋህቦ ጸወታ ብትኽክል ሰሪሑ እንከሎ ግን እታ ናይ መወዳእታ ቁጽሪ (Active Number) ኣብቲ ዝሰርሖ ቢንጎ እንተዘይሃልያ ትኽክለኛ ተዓዋቲ ኣይኮነን፣ ካርቴላ እውን ይእሰር።',
    '3. ልዕሊ ሓደ ካርቴላ ተዓዋቲ እንተኾይኑ ሽልማት ንኹሎም ብማዕረ ይምቀል።',
    '4. ቅድሚ 5 መዓልትን ልዕሊኡን ብቴሌብር ወይ ሲቢኢ ዝተለኣኸ ገንዘብ ዲፖዚት ክግበር ኣይከኣልን፣ ኣብ ውሽጢ 4 መዓልቲ ኣታዊ ክግበር ኣለዎ።',
    '5. ብወገን ዓማዊልና ንዝፍጠር ናይ ኮኔክሽን ጸገም ዝቐርብ ጥርዓን ተቐባልነት የብሉን።',
  ],
  om: [
    '1. Kubbaan golee 4 akka sarara tokkootti hin lakkaa’amu.',
    '2. Kaartelaan tapha kenname sirriitti hojjetee osoo jiruu lakkoofsi dhumaa (Active Number) bingo hojjete keessa yoo hin jiraanne mo’ataa sirrii miti, kaartelaanis ni hidhama.',
    '3. Kaartelaan tokkoo ol yoo mo’atan badhaasni hundaaf walqixa qoodama.',
    '4. Maallaqni guyyaa 5 fi isaa ol dura Telebirr ykn CBE dhaan ergame deposit ta’uu hin danda’u; guyyaa 4 keessatti galii ta’uu qaba.',
    '5. Rakkoo intarneetii (connection) maamiltoota keenya biratti uumamuuf komiin dhiyaatu fudhatama hin qabu.',
  ],
  en: [
    '1. The 4 corner balls do not count as a single line in regular mode.',
    '2. Even if a cartela completes the pattern, if the last called number (Active Ball) is not part of the winning pattern, it is not a valid win and the cartela will be blocked.',
    '3. If more than one cartela wins simultaneously, all winning cartelas share the prize equally.',
    '4. Transfers sent via Telebirr or CBE 5 or more days ago cannot be deposited; deposits must be submitted within 4 days.',
    '5. Complaints regarding connection issues on the customer side are not accepted.',
  ],
};

export const FAST_BINGO_TERMS_SECTIONS = [
  {
    title: '🎯 መጫወቻ ካርድ',
    items: [
      'ጨዋታውን ለመጀመር ከሚመጣልን ከ1-500 የመጫወቻ ካርድ ውስጥ አንዱን እንመርጣለን',
      'የመጫወቻ ካርዱ ላይ በቀይ ቀለም የተመረጡ ቁጥሮች የሚያሳዩት መጫወቻ ካርድ በሌላ ተጫዋች መመረጡን ነው',
      'የመጫወቻ ካርድ ስንነካው ከታች በኩል ካርድ ቁጥሩ የሚይዘዉን መጫወቻ ካርድ ያሳየናል',
      'ወደ ጨዋታው ለመግባት የምንፈልገዉን ካርድ ከመረጥን በኋላ ከታች በኩል መሃል ላይ Play የሚለዉን ክሊክ በማረግ ወደጨዋታው እንገባለን',
    ],
  },
  {
    title: '🎯 ጨዋታ',
    items: [
      'ወደ ጨዋታው ስንገባ በመረጥነው የካርድ ቁትር መሰረት የመጫወቻ ካርድ እናገኛለን',
      'የመጀመሪያ ተጫዋች ከሆንን ከላይ በቀኝ በኩል wait የሚል ጽሁፍ እናገኛለን',
      'ተጨማሪ ተጫዋች ሲገባ ከላይ በቀኝ በኩል ጨዋታው ለመጀመር ያለዉን ቀሪ ሴኮንድ መቁጠር ይጀምራል',
      'ጨዋታው ሲጀምር የተለያዪ ቁትሮች ከ1 እስከ 75 መጥራት ይጀምራል',
      'የሚጠራው ቁጥር የኛ መጫወቻ ካርድ ዉስጥ ካለ የተጠራዉን ቁጥር ክሊክ በማረግ መምረጥ እንችላለን',
      'የመረጥነዉን ቁጥር ማጥፋት ከፈለግን መልሰን እራሱን ቁጠር ክሊክ በማረግ ማጥፋት እንችላለን',
    ],
  },
  {
    title: '🎯 አሸናፊ',
    items: [
      'ቁጥሮቹ ሲጠሩ ከመጫወቻ ካርዳችን ላይ እየመረጥን ወደጎን ወይም ወደታች ወይም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ከመረጥን ወዲአዉኑ ከታች በኩል bingo የሚለዉን በመንካት ማሸነፍ እንችላለን',
      'ወደጎን ወይም ወደታች ወዪም ወደሁለቱም አግዳሚ ወይም አራቱን ማእዘናት ሳይጠሩ bingo የሚለዉን ክሊክ ካደረግን ከጨዋታው እንባረራለን',
      'ሁለት ተጫዋቾች እኩል ቢያሸንፉ ለሁለት ይካፈላሉ',
      'ጨዋታው ዉስጥ ከገባን በኋላ ሌላ ተጫዋች ካልገባ leave የሚለዉን በመንካት ከጨዋታው መውጣት እንችላለን',
    ],
  },
];

export const FAST_BINGO_TERMS_BY_LANG: Record<
  Language,
  { title: string; items: string[] }[]
> = {
  am: FAST_BINGO_TERMS_SECTIONS,
  ti: [
    {
      title: '🎯 መጻወቲ ካርድ',
      items: [
        'ጸወታ ንምጅማር ካብ ዝመጻልና ካብ 1-500 መጻወቲ ካርድ ውሽጢ ሓደ ንመርጽ',
        'ኣብቲ መጻወቲ ካርድ ብቀይሕ ሕብሪ ዝተመርጹ ቁጽርታት እቲ ካርድ ብካልእ ተጻዋታይ ምምራጹ የርኢ',
        'መጻወቲ ካርድ ምስ ነኸአዮ ኣብ ታሕቲ እቲ ቁጽሪ ካርድ ዝሕዞ መጻወቲ ካርድ የርእየና',
        'ናብ ጸወታ ንምእታው ንደልዮ ካርድ ምስ መረጽና ኣብ ታሕቲ ማእኸል Play ዝብል ብምጥዋቕ ናብ ጸወታ ንኣቱ',
      ],
    },
    {
      title: '🎯 ጸወታ',
      items: [
        'ናብ ጸወታ ምስ ኣተና ብመሰረት ዝመረጽናዮ ቁጽሪ ካርድ መጻወቲ ካርድ ንረክብ',
        'ቀዳማይ ተጻዋታይ እንተኾይንና ኣብ ላዕሊ ብየማን wait ዝብል ጽሑፍ ንረክብ',
        'ተወሳኺ ተጻዋታይ ምስ ኣተወ ኣብ ላዕሊ ብየማን ጸወታ ንምጅማር ዘለዎ ተረፍ ሴኮንድ ምቑጻር ይጅምር',
        'ጸወታ ምስ ጀመረ ዝተፈላለዩ ቁጽርታት ካብ 1 ክሳብ 75 ምጽዋዕ ይጅምር',
        'እቲ ዝጽዋዕ ቁጽሪ ኣብ ናትና ካርድ እንተሃልዩ ነቲ ዝተጸውዐ ቁጽሪ ብምጥዋቕ ክንመርጽ ንኽእል',
        'ነቲ ዝመረጽናዮ ቁጽሪ ከነጥፍኦ እንተደሊና መሊስና ንዕኡ ብምጥዋቕ ከነጥፍኦ ንኽእል',
      ],
    },
    {
      title: '🎯 ተዓዋቲ',
      items: [
        'ቁጽርታት ክጽውዑ ከለዉ ካብ ካርድና እናመረጽና ናብ ጎኒ ወይ ናብ ታሕቲ ወይ ናብ ክልቲኡ ዲያጎናል ወይ ኣርባዕቲኡ መኣዝናት እንተመሪጽና ብቕጽበት ኣብ ታሕቲ bingo ዝብል ብምትንካፍ ክንዕወት ንኽእል',
        'ናብ ጎኒ ወይ ናብ ታሕቲ ወይ ዲያጎናል ወይ ኣርባዕቲኡ መኣዝናት ከይተጸውዑ bingo እንተጠዊቕና ካብ ጸወታ ንባረር',
        'ክልተ ተጻወትቲ ማዕረ እንተተዓዊቶም ንኽልተ ይምቀሉ',
        'ናብ ጸወታ ምስ ኣተና ካልእ ተጻዋታይ እንተዘይኣትዩ leave ዝብል ብምትንካፍ ካብ ጸወታ ክንወጽእ ንኽእል',
      ],
    },
  ],
  om: [
    {
      title: '🎯 Kaardii Taphaa',
      items: [
        'Tapha eegaluuf kaardii taphaa 1-500 dhufu keessaa tokko filanna',
        'Kaardii taphaa irratti lakkoofsonni halluu diimaadhaan mul’atan kaardiin sun taphataa biraatiin filatamuu isaa agarsiisa',
        'Kaardii taphaa yoo tuqnu gara gadiitiin kaardii lakkoofsichi qabate nuuf agarsiisa',
        'Kaardii barbaannu erga filannee booda gara gadii walakkaa irratti Play kan jedhu tuquudhaan gara taphaatti seenna',
      ],
    },
    {
      title: '🎯 Tapha',
      items: [
        'Gara taphaatti yoo seennu lakkoofsa kaardii filanneen kaardii taphaa arganna',
        'Taphataa jalqabaa yoo taane gara olii mirgaan barreeffama wait jedhu arganna',
        'Taphataan dabalataa yoo seenu gara olii mirgaan sekondii taphni eegaluuf hafe lakkaa’uu eegala',
        'Taphni yoo eegalu lakkoofsota 1 hanga 75 waamuu eegala',
        'Lakkoofsi waamamu kaardii keenya keessa yoo jiraate tuquudhaan filachuu dandeenya',
        'Lakkoofsa filanne balleessuu yoo barbaanne deebisnee isuma tuquudhaan balleessuu dandeenya',
      ],
    },
    {
      title: '🎯 Mo’ataa',
      items: [
        'Lakkoofsonni yoo waamaman kaardii keenya irraa filachaa gara cinaatti, gara gadiitti, sarara qaxxaamuraa lamaan ykn golee افur (4 corners) yoo guunne battaluma gara gadiitti bingo kan jedhu tuquun mo’achuu dandeenya',
        'Sararri ykn goleen 4 osoo hin waamamin bingo kan jedhu yoo tuqne tapha keessaa ni ari’amna',
        'Taphattoonni lama walqixa yoo mo’atan lamaan qooddatu',
        'Tapha keessa erga seennee booda taphataan biraa yoo hin seenne leave kan jedhu tuquun tapha keessaa bahuu dandeenya',
      ],
    },
  ],
  en: [
    {
      title: '🎯 Playing Card',
      items: [
        'To start the game, choose any card number from the 1–500 board',
        'Numbers highlighted in red on the board indicate cards already chosen by another player',
        'When you tap a card number, the 5×5 playing card for that number is shown below',
        'After choosing your desired card, click Play in the bottom center to enter the game',
      ],
    },
    {
      title: '🎯 Gameplay',
      items: [
        'When entering the game, you receive the playing card matching your selected number',
        'If you are the first player, you will see "wait" in the top right corner',
        'When an additional player joins, the countdown timer in seconds starts in the top right corner',
        'When the game starts, numbers from 1 to 75 are called out',
        'If a called number is on your playing card, click the number to mark it',
        'If you want to unmark a selected number, click the same number again to clear it',
      ],
    },
    {
      title: '🎯 Winning',
      items: [
        'As numbers are called, if you complete a horizontal line, vertical line, either diagonal, or all four corners, immediately tap BINGO at the bottom to win',
        'If you click BINGO without completing a horizontal, vertical, diagonal line or four corners from called numbers, you will be disqualified from the round',
        'If two players win at the exact same time, the prize is split equally between them',
        'After entering a game, if no other player joins, you can tap Leave to exit the game and get your stake refunded',
      ],
    },
  ],
};

