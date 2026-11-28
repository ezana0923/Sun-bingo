import React, { useState, useEffect } from 'react';
import {
  Copy,
  Check,
  ArrowDownCircle,
  ArrowUpCircle,
  Send,
  History,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardPaste,
} from 'lucide-react';
import { PAYMENT_ACCOUNTS, TRANSLATIONS } from '../utils/translations';
import { parseEthiopianPaymentSms, normalizeTransactionReference } from '../utils/smsParser';
import { BankPaymentAccount, Language, TransactionRecord, UserAccount } from '../types/bingo';
import { scrollAppToTop } from '../utils/telegramViewport';

export interface WalletSubmitResult {
  ok: boolean;
  error?: string;
  message?: string;
  isPending?: boolean;
  alreadyCredited?: boolean;
}

interface WalletViewProps {
  currentUser: UserAccount;
  transactions: TransactionRecord[];
  language: Language;
  isDark: boolean;
  initialSubTab?: 'deposit' | 'withdraw' | 'transfer' | 'history';
  requireAdminApproval?: boolean;
  bankAccounts?: BankPaymentAccount[];
  onSubmitDeposit: (
    method: string,
    amount: number,
    refNumber: string,
    fullSms: string
  ) => void | Promise<WalletSubmitResult | void>;
  onSubmitWithdraw: (
    method: string,
    amount: number,
    accountNumber: string
  ) => void | Promise<WalletSubmitResult | void>;
  onSubmitTransfer: (
    recipientPhone: string,
    amount: number
  ) => void | Promise<WalletSubmitResult | void>;
}

export const WalletView: React.FC<WalletViewProps> = ({
  currentUser,
  transactions,
  language,
  isDark,
  initialSubTab = 'deposit',
  requireAdminApproval = true,
  bankAccounts,
  onSubmitDeposit,
  onSubmitWithdraw,
  onSubmitTransfer,
}) => {
  const t = TRANSLATIONS[language];
  const wt = {
    am: {
      withdrawableLabel: '💸 ወጪ ሊደረግ የሚችል',
      forPlayOnly: 'ለጨዋታ ብቻ',
      close: 'ዝጋ',
      depositTitle: 'ገንዘብ ማስገቢያ 💵',
      withdrawTitle: 'ገንዘብ ማውጫ 💸',
      stepOf3: (s: number) => `ደረጃ ${s} ከ 3`,
      stepAmount: '1. መጠን',
      stepBank: '2. ባንክ',
      stepTxNo: '3. የግብይት ቁጥር',
      stepConfirm: '3. ማረጋገጫ',
      howMuchDeposit: '💵 ስንት ብር ገቢ ማድረግ ይፈልጋሉ?',
      pickOrTypeAmount: 'ፈጣን የብር መጠን ይምረጡ ወይም ከታች በእጅዎ ይጻፉ።',
      manualAmountLabel: 'የብር መጠን (በእጅ መጻፊያ — ETB)፦',
      amountPlaceholder: 'ምሳሌ: 100, 500 ወይም 1,500',
      enterAmountFirstErr: 'እባክዎ መጀመሪያ ገቢ የሚያደርጉትን የብር መጠን ይምረጡ ወይም ይጻፉ (ምሳሌ: 100)።',
      continueChooseBank: 'ቀጥል — ባንክ ምረጥ',
      backChangeAmount: 'ተመለስ (መጠን ቀይር)',
      chosenAmount: '💵 የመረጡት መጠን፦',
      chooseBankCopyTitle: '🏦 የባንክ አካውንት ይምረጡ እና ቁጥሩን ይቅዱ፦',
      chooseBankCopyDesc: '«📋 ቁጥር ቅዳና ቀጥል» ሲነኩ ቁጥሩ ተቀድቶ ወደ የግብይት ቁጥር ማስገቢያ ይወስድዎታል።',
      noActiveBanks: '⚠️ ለጊዜው የነቁ የባንክ አካውንቶች የሉም።',
      receiverLabel: 'መቀበያ፦ ',
      holderNameLabel: 'ስም፦ ',
      cashContinueBtn: '💵 በካሽ ቀጥል →',
      copyAndEnterTxBtn: '📋 ቁጥር ቅዳና የግብይት ቁጥር አስገባ',
      backChangeBank: 'ተመለስ (ባንክ ቀይር)',
      selectedAcctPrefix: 'የተመረጠ አካውንት',
      copiedWord: 'ተቀድቷል',
      copyWord: 'ቅዳ',
      cashInfoTitle: 'የካሽ ክፍያ መረጃ',
      txNoOnlyTitle: 'የግብይት ቁጥር ብቻ ያስገቡ',
      pasteTxBtn: '📋 የግብይት ቁጥር ለጥፍ',
      sentAmountLabel: 'የላኩት የብር መጠን (ETB) *፦',
      agentNoteLabel: 'የወኪሉ ስም / ማስታወሻ፦',
      txNoInputLabel: 'የግብይት ቁጥር *፦',
      agentPlaceholder: 'ምሳሌ: ወኪል ዮናስ #1024',
      txPlaceholder: 'ምሳሌ: FT26108XYZ ወይም CE84K29M1P',
      sending: '⏳ በመላክ ላይ...',
      submitDepositBtn: (bank: string) => `✅ አረጋግጥና ላክ (${bank})`,
      withdrawableHeader: 'ማውጣት የሚችሉት',
      howMuchWithdraw: '💸 ስንት ብር ማውጣት ይፈልጋሉ? (50 – 75,000 ETB)',
      pickOrTypeSimple: 'ፈጣን መጠን ይምረጡ ወይም በእጅዎ ይጻፉ።',
      allBtn: (amt: number) => `ሁሉንም (${amt})`,
      withdrawAmountLabel: 'የወጪ መጠን (ETB)፦',
      continueChooseMethod: 'ቀጥል — ባንክ / መንገድ ምረጥ',
      withdrawingAmount: '💸 የሚያወጡት መጠን፦',
      chooseReceivingBank: '🏦 ገንዘብ የሚቀበሉበትን ባንክ / መንገድ ይምረጡ፦',
      continueWord: 'ቀጥል',
      yourAcctPhoneLabel: (bank: string) => `የእርስዎ ${bank} ሂሳብ / ስልክ ቁጥር፦`,
      fillMyPhone: 'ስልኬን ሙላ',
      holderFullNameLabel: 'የሂሳብ ባለቤት ሙሉ ስም፦',
      fullNamePlaceholder: 'ሙሉ ስም',
      submitWithdrawBtn: (amt: string, bank: string) => `✅ አረጋግጥና ወጪ ጠይቅ (${amt} ETB → ${bank})`,
      transferTitle: 'ወደ ሌላ ተጫዋች ገንዘብ ማስተላለፊያ',
      recipientPhoneLabel: 'የተቀባይ ስልክ ቁጥር፦',
      recipientPhonePlaceholder: 'ምሳሌ: 0911223344',
      transferAmountLabel: 'የብር መጠን (ETB)፦',
      sendTransferBtn: 'አሁን አስተላልፍ',
      noTxHistory: 'ምንም የግብይት ታሪክ የለም።',
      transferReceived: 'የደረሰዎት ዝውውር',
      transferTo: 'ዝውውር ወደ',
      txTypeDeposit: 'ገቢ',
      txTypeWithdraw: 'ወጪ',
      txTypeWin: 'ድል',
      txTypeBet: 'ውርርድ',
      txTypeReferral: 'ግብዣ',
      statusApproved: 'ጸድቋል',
      statusPending: 'በመጠባበቅ ላይ',
      statusRejected: 'ውድቅ ሆኗል',
      copiedAccountNotice: (shortName: string, acct: string) =>
        `📋 ${shortName} ቁጥር (${acct}) ተቀድቷል! ክፍያውን ፈጽመው የግብይት ቁጥሩን ከታች ያስገቡ።`,
      pasteManualErr: '📋 እባክዎ ከስልክዎ የግብይት ቁጥሩን በሳጥኑ ውስጥ ይለጥፉ።',
      clipboardEmptyErr: '📋 በ Clipboard ውስጥ የተቀዳ ጽሁፍ የለም! መጀመሪያ የግብይት ቁጥሩን ይቅዱ።',
      clipboardOk: '✅ የግብይት ቁጥሩ ተለጥፏል! ከታች ያረጋግጡ።',
      clipboardPermErr: '📋 የግብይት ቁጥር ሳጥኑን ተጭነው ይለጥፉ።',
      withdrawAutoDetected: '🔄 የወጪ ጥያቄ በራሱ ተለይቷል! እባክዎ የወጪ ቅጹን ያረጋግጡ።',
      enterBirrAmountErr: 'እባክዎ የላኩትን የብር መጠን ያስገቡ።',
      amountMismatchErr: (chosen: number, parsed: number) =>
        `⚠️ የመረጡት መጠን (${chosen} ETB) እና በመልዕክቱ ላይ ያለው መጠን (${parsed} ETB) አይመሳሰልም!`,
      invalidTxRefErr: 'እባክዎ ትክክለኛ የግብይት ቁጥር ያስገቡ።',
      duplicateTxRefErr: (ref: string) =>
        `❌ የተደገመ የግብይት ቁጥር! ይህ ቁጥር (${ref}) ከዚህ በፊት ጥቅም ላይ ውሏል!`,
      depositFailedErr: '❌ የገቢ ጥያቄው አልተላከም! እባክዎ እንደገና ይሞክሩ።',
      depositCreditedOk: (amt: number) => `✅ ${amt} ETB ወደ ዋሌትዎ ገቢ ሆኗል!`,
      depositCashPending: (amt: number) =>
        `⏳ የ ${amt} ETB በካሽ ገቢ ጥያቄዎ ወደ አድሚን ተልኳል! ሲረጋገጥ ወዲያውኑ ወደ ዋሌትዎ ይገባል።`,
      depositBankPending: (amt: number, bank: string, ref: string) =>
        `⏳ የ ${amt} ETB ገቢ ጥያቄዎ በ ${bank} (${ref}) ወደ አድሚን ተልኳል! ሲረጋገጥ ወዲያውኑ ወደ ዋሌትዎ ይገባል።`,
      minWithdrawErr: 'ዝቅተኛው የወጪ መጠን 50 ETB ነው።',
      maxWithdrawErr: 'ከፍተኛው የወጪ መጠን 75,000 ETB ነው።',
      insufficientWithdrawableErr: (avail: number) =>
        `❌ ወጪ ሊደረግ የሚችል ቀሪ ሂሳብ በቂ አይደለም! (ወጪ ሊደረግ የሚችል: ${avail.toFixed(2)} ETB — የተሰጠው ቦነስ ለጨዋታ ብቻ ስለሆነ ወጪ አይደረግም)`,
      enterWithdrawAcctErr: 'እባክዎ የባንክ ሂሳብ ወይም የስልክ ቁጥርዎን ያስገቡ።',
      withdrawFailedErr: '❌ የወጪ ጥያቄው አልተላከም! እባክዎ እንደገና ይሞክሩ።',
      withdrawPendingOk: (amt: number, bank: string, acct: string) =>
        `⏳ የ ${amt} ETB ወጪ ጥያቄ ወደ ${bank} (${acct}) ተልኳል! ሲጸድቅ ወደ ሂሳብዎ ይላካል።`,
      withdrawDoneOk: (amt: number, bank: string, acct: string) =>
        `✅ የ ${amt} ETB ወጪ ጥያቄዎ በ ${bank} (${acct}) ተፈጽሟል!`,
      enterValidTransferAmt: 'እባክዎ ትክክለኛ የብር መጠን ያስገቡ።',
      insufficientBalanceErr: 'በቂ ቀሪ ሂሳብ የለዎትም!',
      enterValidRecipientErr: 'እባክዎ ትክክለኛ የተቀባይ ስልክ ቁጥር ያስገቡ (ምሳሌ: 0911223344)።',
      cannotTransferSelfErr: 'ወደ ራስዎ ስልክ ቁጥር ማስተላለፍ አይችሉም! የሌላ ተጫዋች ስልክ ያስገቡ።',
      transferSuccessOk: (amt: number, to: string) =>
        `✅ ${amt.toFixed(2)} ETB ወደ ${to} ዋሌት በተሳካ ሁኔታ ተልኳል!`,
    },
    ti: {
      withdrawableLabel: '💸 ክወጽእ ዝኽእል',
      forPlayOnly: 'ንጸወታ ጥራይ',
      close: 'ዕጾ',
      depositTitle: 'ገንዘብ መእተዊ 💵',
      withdrawTitle: 'ገንዘብ መውጽኢ 💸',
      stepOf3: (s: number) => `ደረጃ ${s} ካብ 3`,
      stepAmount: '1. መጠን',
      stepBank: '2. ባንኪ',
      stepTxNo: '3. ቁጽሪ ግብይት',
      stepConfirm: '3. መረጋገጺ',
      howMuchDeposit: '💵 ክንደይ ብር ከተእትዉ ትደልዩ?',
      pickOrTypeAmount: 'ቅልጡፍ መጠን ምረጹ ወይ ብኢድኩም ጸሓፉ።',
      manualAmountLabel: 'መጠን ብር (ብኢድ መጻሓፊ — ETB)፦',
      amountPlaceholder: 'ንኣብነት: 100, 500 ወይ 1,500',
      enterAmountFirstErr: 'ብኽብረትኩም መጀመርያ እተእትውዎ መጠን ብር ምረጹ ወይ ጸሓፉ (ንኣብነት: 100)።',
      continueChooseBank: 'ቀጽል — ባንኪ ምረጽ',
      backChangeAmount: 'ተመለስ (መጠን ቀይር)',
      chosenAmount: '💵 ዝመረጽኩምዎ መጠን፦',
      chooseBankCopyTitle: '🏦 ናይ ባንኪ ኣካውንት ምረጹ እሞ ቁጽሩ ቅድሑ፦',
      chooseBankCopyDesc: '«📋 ቁጽሪ ቅዳሕን ቀጽልን» ምስ ጠወቕኩም እቲ ቁጽሪ ተቐዲሑ ናብ መእተዊ ቁጽሪ ግብይት ይወስደኩም።',
      noActiveBanks: '⚠️ ንግዚኡ ንጡፋት ናይ ባንኪ ኣካውንታት የለዉን።',
      receiverLabel: 'ተቐባሊ፦ ',
      holderNameLabel: 'ሽም፦ ',
      cashContinueBtn: '💵 ብጥረ ገንዘብ ቀጽል →',
      copyAndEnterTxBtn: '📋 ቁጽሪ ቅዳሕን ቁጽሪ ግብይት ኣእቱን',
      backChangeBank: 'ተመለስ (ባንኪ ቀይር)',
      selectedAcctPrefix: 'ዝተመርጸ ኣካውንት',
      copiedWord: 'ተቐዲሑ',
      copyWord: 'ቅዳሕ',
      cashInfoTitle: 'ሓበሬታ ክፍሊት ጥረ ገንዘብ',
      txNoOnlyTitle: 'ቁጽሪ ግብይት ጥራይ የእትዉ',
      pasteTxBtn: '📋 ቁጽሪ ግብይት ለጥፍ',
      sentAmountLabel: 'ዝሰደድኩምዎ መጠን ብር (ETB) *፦',
      agentNoteLabel: 'ሽም ወኪል / መዘኻኸሪ፦',
      txNoInputLabel: 'ቁጽሪ ግብይት *፦',
      agentPlaceholder: 'ንኣብነት: ወኪል ዮናስ #1024',
      txPlaceholder: 'ንኣብነት: FT26108XYZ ወይ CE84K29M1P',
      sending: '⏳ ይስደድ ኣሎ...',
      submitDepositBtn: (bank: string) => `✅ ኣረጋግጽን ስደድን (${bank})`,
      withdrawableHeader: 'ከተውጽእዎ እትኽእሉ',
      howMuchWithdraw: '💸 ክንደይ ብር ከተውጽኡ ትደልዩ? (50 – 75,000 ETB)',
      pickOrTypeSimple: 'ቅልጡፍ መጠን ምረጹ ወይ ብኢድኩም ጸሓፉ።',
      allBtn: (amt: number) => `ኩሉ (${amt})`,
      withdrawAmountLabel: 'መጠን ወጻኢ (ETB)፦',
      continueChooseMethod: 'ቀጽል — ባንኪ / መንገዲ ምረጽ',
      withdrawingAmount: '💸 እተውጽእዎ መጠን፦',
      chooseReceivingBank: '🏦 ገንዘብ እትቕበሉሉ ባንኪ / መንገዲ ምረጹ፦',
      continueWord: 'ቀጽል',
      yourAcctPhoneLabel: (bank: string) => `ናትኩም ${bank} ሕሳብ / ቁጽሪ ስልኪ፦`,
      fillMyPhone: 'ስልከይ ምላእ',
      holderFullNameLabel: 'ምሉእ ሽም በዓል ሕሳብ፦',
      fullNamePlaceholder: 'ምሉእ ሽም',
      submitWithdrawBtn: (amt: string, bank: string) => `✅ ኣረጋግጽን ወጻኢ ሕተትን (${amt} ETB → ${bank})`,
      transferTitle: 'ናብ ካልእ ተጻዋታይ ገንዘብ መሰጋገሪ',
      recipientPhoneLabel: 'ቁጽሪ ስልኪ ተቐባሊ፦',
      recipientPhonePlaceholder: 'ንኣብነት: 0911223344',
      transferAmountLabel: 'መጠን ብር (ETB)፦',
      sendTransferBtn: 'ሕጂ ኣሰጋግር',
      noTxHistory: 'ዝኾነ ታሪኽ ግብይት የለን።',
      transferReceived: 'ዝተቐበልኩምዎ ምስግጋር',
      transferTo: 'ምስግጋር ናብ',
      txTypeDeposit: 'ኣታዊ',
      txTypeWithdraw: 'ወጻኢ',
      txTypeWin: 'ዓወት',
      txTypeBet: 'ውርርድ',
      txTypeReferral: 'ዕድመ',
      statusApproved: 'ጸዲቑ',
      statusPending: 'ይጽበ ኣሎ',
      statusRejected: 'ተነጺጉ',
      copiedAccountNotice: (shortName: string, acct: string) =>
        `📋 ቁጽሪ ${shortName} (${acct}) ተቐዲሑ! ክፍሊት ፈጺምኩም ቁጽሪ ግብይት ኣብ ታሕቲ የእትዉ።`,
      pasteManualErr: '📋 ብኽብረትኩም ቁጽሪ ግብይት ኣብቲ ሳጹን ለጥፉ።',
      clipboardEmptyErr: '📋 ኣብ Clipboard ዝተቐድሐ ጽሑፍ የለን! መጀመርያ ቁጽሪ ግብይት ቅድሑ።',
      clipboardOk: '✅ ቁጽሪ ግብይት ተለጢፉ! ኣብ ታሕቲ ኣረጋግጹ።',
      clipboardPermErr: '📋 ኣብ ሳጹን ቁጽሪ ግብይት ጠዊቕኩም ለጥፉ።',
      withdrawAutoDetected: '🔄 ሕቶ ወጻኢ ብርእሱ ተፈሊጡ! ብኽብረትኩም ቅጥዒ ወጻኢ ኣረጋግጹ።',
      enterBirrAmountErr: 'ብኽብረትኩም ዝሰደድኩምዎ መጠን ብር የእትዉ።',
      amountMismatchErr: (chosen: number, parsed: number) =>
        `⚠️ ዝመረጽኩምዎ መጠን (${chosen} ETB) ምስቲ ኣብ መልእኽቲ ዘሎ መጠን (${parsed} ETB) ኣይተመሳሰለን!`,
      invalidTxRefErr: 'ብኽብረትኩም ትክክለኛ ቁጽሪ ግብይት የእትዉ።',
      duplicateTxRefErr: (ref: string) =>
        `❌ ዝተደገመ ቁጽሪ ግብይት! እዚ ቁጽሪ (${ref}) ቅድሚ ሕጂ ተጠቒሙ እዩ!`,
      depositFailedErr: '❌ ሕቶ ኣታዊ ኣይተላእከን! ደጊምኩም ፈትኑ።',
      depositCreditedOk: (amt: number) => `✅ ${amt} ETB ናብ ዋሌትኩም ኣትዩ እዩ!`,
      depositCashPending: (amt: number) =>
        `⏳ ናይ ${amt} ETB ብጥረ ገንዘብ ሕቶኹም ናብ ኣድሚን ተላኢኹ! ምስ ተረጋገጸ ብኡንብኡ ናብ ዋሌትኩም ክኣቱ እዩ።`,
      depositBankPending: (amt: number, bank: string, ref: string) =>
        `⏳ ናይ ${amt} ETB ሕቶ ኣታዊ ብ${bank} (${ref}) ናብ ኣድሚን ተላኢኹ! ምስ ተረጋገጸ ብኡንብኡ ናብ ዋሌትኩም ክኣቱ እዩ።`,
      minWithdrawErr: 'ዝተሓተ መጠን ወጻኢ 50 ETB እዩ።',
      maxWithdrawErr: 'ዝለዓለ መጠን ወጻኢ 75,000 ETB እዩ።',
      insufficientWithdrawableErr: (avail: number) =>
        `❌ ክወጽእ ዝኽእል ቀሪ ሕሳብ እኹል ኣይኮነን! (ክወጽእ ዝኽእል: ${avail.toFixed(2)} ETB — ቦነስ ንጸወታ ጥራይ እዩ)`,
      enterWithdrawAcctErr: 'ብኽብረትኩም ናይ ባንኪ ሕሳብ ወይ ቁጽሪ ስልክኹም የእትዉ።',
      withdrawFailedErr: '❌ ሕቶ ወጻኢ ኣይተላእከን! ደጊምኩም ፈትኑ።',
      withdrawPendingOk: (amt: number, bank: string, acct: string) =>
        `⏳ ናይ ${amt} ETB ሕቶ ወጻኢ ናብ ${bank} (${acct}) ተላኢኹ! ምስ ጸደቐ ክስደደልኩም እዩ።`,
      withdrawDoneOk: (amt: number, bank: string, acct: string) =>
        `✅ ናይ ${amt} ETB ሕቶ ወጻኢ ብ${bank} (${acct}) ተፈጺሙ!`,
      enterValidTransferAmt: 'ብኽብረትኩም ትክክለኛ መጠን ብር የእትዉ።',
      insufficientBalanceErr: 'እኹል ቀሪ ሕሳብ የብልኩምን!',
      enterValidRecipientErr: 'ብኽብረትኩም ትክክለኛ ቁጽሪ ስልኪ ተቐባሊ የእትዉ (ንኣብነት: 0911223344)።',
      cannotTransferSelfErr: 'ናብ ናይ ባዕልኹም ስልኪ ምስግጋር ኣይከኣልን! ናይ ካልእ ተጻዋታይ ስልኪ የእትዉ።',
      transferSuccessOk: (amt: number, to: string) =>
        `✅ ${amt.toFixed(2)} ETB ናብ ${to} ዋሌት ብዓወት ተሰጋጊሩ!`,
    },
    om: {
      withdrawableLabel: '💸 Kan Baafamuu Dandaʼu',
      forPlayOnly: 'Tapha qofaaf',
      close: 'Cufi',
      depositTitle: 'Qarshii Galchuu 💵',
      withdrawTitle: 'Qarshii Baasuu 💸',
      stepOf3: (s: number) => `Sadarkaa ${s} / 3`,
      stepAmount: '1. Hamma',
      stepBank: '2. Baankii',
      stepTxNo: '3. Lakkoofsa Kaffaltii',
      stepConfirm: '3. Mirkaneessuu',
      howMuchDeposit: '💵 Qarshii meeqa galchuu barbaaddu?',
      pickOrTypeAmount: 'Hamma ariifataa filadhaa ykn harka keessaniin barreessaa.',
      manualAmountLabel: 'Hamma qarshii (ETB)፦',
      amountPlaceholder: 'Fakkeenyaaf: 100, 500 ykn 1,500',
      enterAmountFirstErr: 'Mee jalqaba hamma qarshii galchitan filadhaa ykn barreessaa (Fkn: 100).',
      continueChooseBank: 'Itti Fufi — Baankii Filadhu',
      backChangeAmount: 'Deebiʼi (Hamma Jijjiiri)',
      chosenAmount: '💵 Hamma Filattan:',
      chooseBankCopyTitle: '🏦 Lakkoofsa Baankii filadhaatii waraabaa:',
      chooseBankCopyDesc: '«📋 Waraabiitii Itti Fufi» yoo tuqan lakkoofsi waraabamee gara iddoo koodii galfannaa isin geessa.',
      noActiveBanks: '⚠️ Yeroo ammaaf baankonni banaa taʼan hin jiran.',
      receiverLabel: 'Fudhataa: ',
      holderNameLabel: 'Maqaa: ',
      cashContinueBtn: '💵 Kaashiidhaan Itti Fufi →',
      copyAndEnterTxBtn: '📋 Waraabiitii Lakkoofsa Kaffaltii Galchi',
      backChangeBank: 'Deebiʼi (Baankii Jijjiiri)',
      selectedAcctPrefix: 'Akkaawuntii filatame',
      copiedWord: 'Waraabameera',
      copyWord: 'Waraabi',
      cashInfoTitle: 'Odeeffannoo Kaffaltii Kaashii',
      txNoOnlyTitle: 'Lakkoofsa Kaffaltii qofa galchaa',
      pasteTxBtn: '📋 Lakkoofsa Kaffaltii Maxxansi',
      sentAmountLabel: 'Hamma qarshii ergitan (ETB) *:',
      agentNoteLabel: 'Maqaa bakka buʼaa / yaadannoo:',
      txNoInputLabel: 'Lakkoofsa Kaffaltii *:',
      agentPlaceholder: 'Fkn: Yonas #1024',
      txPlaceholder: 'Fkn: FT26108XYZ ykn CE84K29M1P',
      sending: '⏳ Ergaa jira...',
      submitDepositBtn: (bank: string) => `✅ Mirkaneessiitii Ergi (${bank})`,
      withdrawableHeader: 'Kan Baafamuu Dandaʼu',
      howMuchWithdraw: '💸 Qarshii meeqa baasuu barbaaddu? (50 – 75,000 ETB)',
      pickOrTypeSimple: 'Hamma ariifataa filadhaa ykn barreessaa.',
      allBtn: (amt: number) => `Hunda (${amt})`,
      withdrawAmountLabel: 'Hamma baasii (ETB):',
      continueChooseMethod: 'Itti Fufi — Baankii Filadhu',
      withdrawingAmount: '💸 Hamma baastan:',
      chooseReceivingBank: '🏦 Baankii qarshii itti fudhattan filadhaa:',
      continueWord: 'Itti Fufi',
      yourAcctPhoneLabel: (bank: string) => `Lakkoofsa ${bank} / bilbila keessanii:`,
      fillMyPhone: 'Bilbila koo guuti',
      holderFullNameLabel: 'Maqaa guutuu abbaa herregaa:',
      fullNamePlaceholder: 'Maqaa guutuu',
      submitWithdrawBtn: (amt: string, bank: string) => `✅ Mirkaneessiitii Gaafadhu (${amt} ETB → ${bank})`,
      transferTitle: 'Gara Taphataa Biraatti Dabarsuu',
      recipientPhoneLabel: 'Lakkoofsa bilbilaa fudhataa:',
      recipientPhonePlaceholder: 'Fkn: 0911223344',
      transferAmountLabel: 'Hamma qarshii (ETB):',
      sendTransferBtn: 'Amma Ergi',
      noTxHistory: 'Seenaan kaffaltii hin jiru.',
      transferReceived: 'Qarshii Siif Ergame',
      transferTo: 'Ergame gara',
      txTypeDeposit: 'Galii',
      txTypeWithdraw: 'Baasii',
      txTypeWin: 'Injifannoo',
      txTypeBet: 'Qabsiisa',
      txTypeReferral: 'Afeerraa',
      statusApproved: 'Mirkaneeffame',
      statusPending: 'Eegaa Jira',
      statusRejected: 'Kufameera',
      copiedAccountNotice: (shortName: string, acct: string) =>
        `📋 Lakkoofsi ${shortName} (${acct}) waraabameera! Kaffaltii raawwadhaatii lakkoofsa kaffaltii gadiitti galchaa.`,
      pasteManualErr: '📋 Mee lakkoofsa kaffaltii saanduqa keessatti maxxansaa.',
      clipboardEmptyErr: '📋 Clipboard duwwaadha! Jalqaba lakkoofsa kaffaltii waraabaa.',
      clipboardOk: '✅ Lakkoofsi kaffaltii maxxanfameera! Gadiitti mirkaneessaa.',
      clipboardPermErr: '📋 Saanduqa lakkoofsa kaffaltii tuqaatii maxxansaa.',
      withdrawAutoDetected: '🔄 Gaaffiin baasii adda baafameera! Unka baasii mirkaneessaa.',
      enterBirrAmountErr: 'Mee hamma qarshii ergitan galchaa.',
      amountMismatchErr: (chosen: number, parsed: number) =>
        `⚠️ Hammi filattan (${chosen} ETB) fi hammi ergaa irra jiru (${parsed} ETB) wal hin fakkaatu!`,
      invalidTxRefErr: 'Mee lakkoofsa kaffaltii sirrii galchaa.',
      duplicateTxRefErr: (ref: string) =>
        `❌ Lakkoofsi kaffaltii kun (${ref}) kanaan dura fayyadamameera!`,
      depositFailedErr: '❌ Gaaffiin galii hin ergamne! Irra deebiʼaa yaalaa.',
      depositCreditedOk: (amt: number) => `✅ ${amt} ETB gara waaletii keessaniitti galeera!`,
      depositCashPending: (amt: number) =>
        `⏳ Gaaffiin kaashii ${amt} ETB gara bulchaatti ergameera! Yeroo mirkanaaʼu waaletii keessanitti gala.`,
      depositBankPending: (amt: number, bank: string, ref: string) =>
        `⏳ Gaaffiin galii ${amt} ETB karaa ${bank} (${ref}) ergameera! Yeroo mirkanaaʼu waaletii keessanitti gala.`,
      minWithdrawErr: 'Hammi baasii xiqqaataan 50 ETB dha.',
      maxWithdrawErr: 'Hammi baasii guddaan 75,000 ETB dha.',
      insufficientWithdrawableErr: (avail: number) =>
        `❌ Qarshiin baafamuu dandaʼu hin gaʼu! (Kan baafamuu dandaʼu: ${avail.toFixed(2)} ETB — boonasiin tapha qofaaf)`,
      enterWithdrawAcctErr: 'Mee lakkoofsa baankii ykn bilbila keessan galchaa.',
      withdrawFailedErr: '❌ Gaaffiin baasii hin ergamne! Irra deebiʼaa yaalaa.',
      withdrawPendingOk: (amt: number, bank: string, acct: string) =>
        `⏳ Gaaffiin baasii ${amt} ETB gara ${bank} (${acct}) ergameera! Yeroo mirkanaaʼu isiniif ergama.`,
      withdrawDoneOk: (amt: number, bank: string, acct: string) =>
        `✅ Gaaffiin baasii ${amt} ETB karaa ${bank} (${acct}) xumurameera!`,
      enterValidTransferAmt: 'Mee hamma qarshii sirrii galchaa.',
      insufficientBalanceErr: 'Hafteen qarshii keessanii hin gaʼu!',
      enterValidRecipientErr: 'Mee lakkoofsa bilbilaa fudhataa sirrii galchaa (Fkn: 0911223344).',
      cannotTransferSelfErr: 'Gara lakkoofsa bilbila keessaniitti dabarsuun hin dandaʼamu!',
      transferSuccessOk: (amt: number, to: string) =>
        `✅ ${amt.toFixed(2)} ETB gara waaletii ${to} tti milkaaʼinaan ergameera!`,
    },
    en: {
      withdrawableLabel: '💸 Withdrawable',
      forPlayOnly: 'For Play Only',
      close: 'Close',
      depositTitle: 'Deposit Funds 💵',
      withdrawTitle: 'Withdraw Funds 💸',
      stepOf3: (s: number) => `Step ${s} of 3`,
      stepAmount: '1. Amount',
      stepBank: '2. Bank',
      stepTxNo: '3. Transaction No',
      stepConfirm: '3. Confirm',
      howMuchDeposit: '💵 How much would you like to deposit?',
      pickOrTypeAmount: 'Choose a quick amount or type manually below.',
      manualAmountLabel: 'Amount (Manual — ETB):',
      amountPlaceholder: 'e.g. 100, 500 or 1,500',
      enterAmountFirstErr: 'Please select or enter the deposit amount first (e.g. 100).',
      continueChooseBank: 'Continue — Choose Bank',
      backChangeAmount: 'Back (Change Amount)',
      chosenAmount: '💵 Selected Amount:',
      chooseBankCopyTitle: '🏦 Select a bank account & copy the number:',
      chooseBankCopyDesc: 'Tap "Copy & Enter Transaction No" to copy the account and continue to receipt verification.',
      noActiveBanks: '⚠️ No active bank accounts are currently enabled.',
      receiverLabel: 'Receiver: ',
      holderNameLabel: 'Name: ',
      cashContinueBtn: '💵 Continue with Cash →',
      copyAndEnterTxBtn: '📋 Copy & Enter Transaction No',
      backChangeBank: 'Back (Change Bank)',
      selectedAcctPrefix: 'Selected Account',
      copiedWord: 'Copied',
      copyWord: 'Copy',
      cashInfoTitle: 'Cash Payment Details',
      txNoOnlyTitle: 'Enter Transaction Number',
      pasteTxBtn: '📋 Paste Transaction No',
      sentAmountLabel: 'Amount Sent (ETB) *:',
      agentNoteLabel: 'Agent Name / Note:',
      txNoInputLabel: 'Transaction Number *:',
      agentPlaceholder: 'e.g. Agent Yonas #1024',
      txPlaceholder: 'e.g. FT26108XYZ or CE84K29M1P',
      sending: '⏳ Submitting...',
      submitDepositBtn: (bank: string) => `✅ Confirm & Submit ${bank} Deposit`,
      withdrawableHeader: 'Withdrawable Balance',
      howMuchWithdraw: '💸 How much would you like to withdraw? (50 – 75,000 ETB)',
      pickOrTypeSimple: 'Choose a quick preset or enter manually.',
      allBtn: (amt: number) => `All (${amt})`,
      withdrawAmountLabel: 'Withdrawal Amount (ETB):',
      continueChooseMethod: 'Continue — Choose Bank / Method',
      withdrawingAmount: '💸 Withdrawal Amount:',
      chooseReceivingBank: '🏦 Select the bank or mobile money method:',
      continueWord: 'Continue',
      yourAcctPhoneLabel: (bank: string) => `Your ${bank} Account / Phone Number:`,
      fillMyPhone: 'Use My Phone',
      holderFullNameLabel: 'Account Holder Full Name:',
      fullNamePlaceholder: 'Full Name',
      submitWithdrawBtn: (amt: string, bank: string) => `✅ Confirm Withdrawal (${amt} ETB → ${bank})`,
      transferTitle: 'Wallet-to-Wallet Transfer',
      recipientPhoneLabel: 'Recipient Phone Number:',
      recipientPhonePlaceholder: 'e.g. 0911223344',
      transferAmountLabel: 'Amount (ETB):',
      sendTransferBtn: 'Send Instant Transfer',
      noTxHistory: 'No transaction history yet.',
      transferReceived: 'TRANSFER RECEIVED',
      transferTo: 'TRANSFER TO',
      txTypeDeposit: 'DEPOSIT',
      txTypeWithdraw: 'WITHDRAW',
      txTypeWin: 'WIN',
      txTypeBet: 'BET',
      txTypeReferral: 'REFERRAL',
      statusApproved: 'Approved',
      statusPending: 'Pending',
      statusRejected: 'Rejected',
      copiedAccountNotice: (shortName: string, acct: string) =>
        `📋 ${shortName} number (${acct}) copied! Complete the transfer and enter the Transaction Number below.`,
      pasteManualErr: '📋 Please paste the Transaction Number into the input box below.',
      clipboardEmptyErr: '📋 Clipboard is empty! Copy your Transaction Number first.',
      clipboardOk: '✅ Transaction Number pasted! Please verify below.',
      clipboardPermErr: '📋 Clipboard permission blocked — long-press the Transaction Number box to paste.',
      withdrawAutoDetected: '🔄 Withdrawal request detected automatically! Please confirm your withdrawal below.',
      enterBirrAmountErr: 'Please enter the amount you transferred.',
      amountMismatchErr: (chosen: number, parsed: number) =>
        `⚠️ Chosen amount (${chosen} ETB) does not match the receipt amount (${parsed} ETB)!`,
      invalidTxRefErr: 'Please enter a valid Transaction Number.',
      duplicateTxRefErr: (ref: string) =>
        `❌ Duplicate Transaction Number! Reference (${ref}) has already been used!`,
      depositFailedErr: '❌ Failed to submit deposit request! Please try again.',
      depositCreditedOk: (amt: number) => `✅ ${amt} ETB credited to your wallet!`,
      depositCashPending: (amt: number) =>
        `⏳ Your ${amt} ETB cash deposit request has been sent to admin! It will be credited once approved.`,
      depositBankPending: (amt: number, bank: string, ref: string) =>
        `⏳ Your ${amt} ETB ${bank} deposit (${ref}) has been sent to admin! It will be credited once verified.`,
      minWithdrawErr: 'Minimum withdrawal amount is 50 ETB.',
      maxWithdrawErr: 'Maximum withdrawal amount is 75,000 ETB.',
      insufficientWithdrawableErr: (avail: number) =>
        `❌ Insufficient withdrawable balance! (Available: ${avail.toFixed(2)} ETB — bonus balance is for play only)`,
      enterWithdrawAcctErr: 'Please enter your bank account or mobile money phone number.',
      withdrawFailedErr: '❌ Failed to submit withdrawal request! Please try again.',
      withdrawPendingOk: (amt: number, bank: string, acct: string) =>
        `⏳ Your ${amt} ETB withdrawal to ${bank} (${acct}) is pending verification.`,
      withdrawDoneOk: (amt: number, bank: string, acct: string) =>
        `✅ Your ${amt} ETB withdrawal to ${bank} (${acct}) has been processed!`,
      enterValidTransferAmt: 'Please enter a valid amount.',
      insufficientBalanceErr: 'Insufficient balance!',
      enterValidRecipientErr: 'Please enter a valid recipient phone number (e.g. 0911223344).',
      cannotTransferSelfErr: 'You cannot transfer to your own phone number!',
      transferSuccessOk: (amt: number, to: string) =>
        `✅ ${amt.toFixed(2)} ETB transferred to ${to} successfully!`,
    },
  }[language];
  const rawBanksList: BankPaymentAccount[] =
    Array.isArray(bankAccounts) && bankAccounts.length > 0 ? bankAccounts : PAYMENT_ACCOUNTS;
  const activeBanksList: BankPaymentAccount[] = rawBanksList.filter((b) => b.isActive !== false);

  const [activeSubTab, setActiveSubTab] = useState<'deposit' | 'withdraw' | 'transfer' | 'history'>(
    initialSubTab
  );
  const [selectedBank, setSelectedBank] = useState<string>(
    activeBanksList[0]?.id || rawBanksList[0]?.id || 'Telebirr'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Explicit 3-Step Flows for Deposit & Withdraw
  const [depStep, setDepStep] = useState<1 | 2 | 3>(1);
  const [withStep, setWithStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    setActiveSubTab(initialSubTab);
    setDepStep(1);
    setWithStep(1);
  }, [initialSubTab]);

  useEffect(() => {
    scrollAppToTop();
  }, [activeSubTab, depStep, withStep]);

  useEffect(() => {
    if (activeBanksList.length > 0 && !activeBanksList.some((b) => b.id === selectedBank)) {
      setSelectedBank(activeBanksList[0].id);
    }
  }, [activeBanksList, selectedBank]);

  // Deposit Form
  const [depAmount, setDepAmount] = useState('');
  const [depRefNumber, setDepRefNumber] = useState('');
  const [depFullSms, setDepFullSms] = useState('');
  const [detectedTxType, setDetectedTxType] = useState<'deposit' | 'withdraw' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Withdraw Form
  const [withAmount, setWithAmount] = useState('');
  const [withAccount, setWithAccount] = useState(currentUser.phone);
  const [withHolderName, setWithHolderName] = useState(currentUser.name);

  // Transfer Form
  const [transPhone, setTransPhone] = useState('');
  const [transAmount, setTransAmount] = useState('');

  const selectedAccountObj =
    activeBanksList.find((a) => a.id === selectedBank) || activeBanksList[0] || rawBanksList[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCopyBankAndProceedToReceipt = (acct: BankPaymentAccount) => {
    setSelectedBank(acct.id);
    if (acct.id !== 'Cash') {
      handleCopy(acct.accountNumber, `step2-${acct.id}`);
      setFeedbackMsg({
        type: 'ok',
        text: wt.copiedAccountNotice(acct.shortName, acct.accountNumber),
      });
    } else {
      setFeedbackMsg(null);
    }
    setDepStep(3);
  };

  const handlePasteReceiptFromClipboard = async () => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        setFeedbackMsg({
          type: 'err',
          text: wt.pasteManualErr,
        });
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        setFeedbackMsg({
          type: 'err',
          text: wt.clipboardEmptyErr,
        });
        return;
      }
      handleSmsInputChange(clipText.trim());
      setFeedbackMsg({
        type: 'ok',
        text: wt.clipboardOk,
      });
    } catch {
      setFeedbackMsg({
        type: 'err',
        text: wt.clipboardPermErr,
      });
    }
  };

  const parseCleanAmount = (raw: string): number => {
    if (!raw) return NaN;
    const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '').trim();
    return cleaned ? parseFloat(cleaned) : NaN;
  };

  const looksLikeFullReceiptSmsText = (val: string) =>
    /(?:etb|birr|br\.?|ብር|received|credited|transferred|debited|balance|current|available|ገቢ|ተልኳል|ቀሪ)/i.test(
      val
    ) || val.trim().split(/\s+/).length >= 4;

  const handleSmsInputChange = (val: string) => {
    const parsed = parseEthiopianPaymentSms(val);
    const isFullReceipt = looksLikeFullReceiptSmsText(val);
    if (parsed.referenceNumber) {
      setDepRefNumber(parsed.referenceNumber);
      setDepFullSms(isFullReceipt ? val : '');
    } else {
      const compact = val.trim().replace(/\s+/g, '');
      setDepRefNumber(compact);
      setDepFullSms('');
    }
    if (isFullReceipt && parsed.amount !== null && !depAmount.trim()) {
      setDepAmount(String(parsed.amount));
    }
    if (parsed.detectedBank) {
      setSelectedBank(parsed.detectedBank);
    }
    setDetectedTxType(parsed.detectedType);
  };

  const submitDepositForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTx) return;
    const parsedFromSms = depFullSms ? parseEthiopianPaymentSms(depFullSms) : null;
    const parsedFromRefField = parseEthiopianPaymentSms(depRefNumber);
    const chosenAmt = parseCleanAmount(depAmount);

    if (parsedFromSms?.detectedType === 'withdraw' && !parsedFromSms.referenceNumber) {
      setActiveSubTab('withdraw');
      setWithStep(1);
      if (parsedFromSms.amount) setWithAmount(String(parsedFromSms.amount));
      if (parsedFromSms.detectedBank) setSelectedBank(parsedFromSms.detectedBank);
      setFeedbackMsg({
        type: 'ok',
        text: wt.withdrawAutoDetected,
      });
      return;
    }

    const amt =
      (Number.isFinite(chosenAmt) && chosenAmt > 0 ? chosenAmt : null) ??
      parsedFromSms?.amount ??
      parsedFromRefField.amount ??
      NaN;

    if (isNaN(amt) || amt <= 0) {
      setFeedbackMsg({
        type: 'err',
        text: wt.enterBirrAmountErr,
      });
      return;
    }

    if (
      Number.isFinite(chosenAmt) &&
      chosenAmt > 0 &&
      parsedFromSms &&
      parsedFromSms.amount !== null &&
      Math.abs(parsedFromSms.amount - chosenAmt) > 0.01
    ) {
      setFeedbackMsg({
        type: 'err',
        text: wt.amountMismatchErr(chosenAmt, parsedFromSms.amount),
      });
      return;
    }

    const rawRef = (
      parsedFromSms?.referenceNumber ||
      parsedFromRefField.referenceNumber ||
      depRefNumber.trim().replace(/\s+/g, '')
    ).toUpperCase();
    const bankToUse =
      (selectedBank === 'Cash' ? 'Cash' : null) ||
      parsedFromSms?.detectedBank ||
      parsedFromRefField.detectedBank ||
      selectedBank ||
      'Telebirr';
    const isCash = bankToUse === 'Cash' || selectedBank === 'Cash';
    const cleanRef = isCash
      ? depRefNumber.trim() || `CASH-${Date.now().toString().slice(-6)}`
      : normalizeTransactionReference(rawRef) || rawRef;

    const cleanSms = isCash
      ? `Cash Deposit ${amt} ETB by ${currentUser.phone} (${cleanRef})`
      : '';

    if (!isCash && (!cleanRef || cleanRef.length < 4)) {
      setFeedbackMsg({
        type: 'err',
        text: wt.invalidTxRefErr,
      });
      return;
    }

    if (!isCash) {
      const existingDuplicate = transactions.find((tx) => {
        if (tx.type !== 'deposit' || tx.status === 'rejected' || tx.method === 'Cash') return false;
        const txRefNorm = normalizeTransactionReference(tx.referenceNumber);
        if (
          cleanRef &&
          cleanRef.length >= 4 &&
          !cleanRef.startsWith('REF') &&
          !cleanRef.startsWith('CASH') &&
          txRefNorm &&
          txRefNorm === cleanRef
        ) {
          return true;
        }
        return false;
      });

      if (existingDuplicate) {
        setFeedbackMsg({
          type: 'err',
          text: wt.duplicateTxRefErr(existingDuplicate.referenceNumber),
        });
        return;
      }
    }

    setIsSubmittingTx(true);
    try {
      const result = await onSubmitDeposit(bankToUse, amt, cleanRef, cleanSms);
      if (result && result.ok === false) {
        setFeedbackMsg({
          type: 'err',
          text: result.error || wt.depositFailedErr,
        });
        return;
      }
      setDepAmount('');
      setDepRefNumber('');
      setDepFullSms('');
      setDetectedTxType(null);
      setDepStep(1);
      setFeedbackMsg({
        type: 'ok',
        text:
          result?.message ||
          (result && result.isPending === false
            ? wt.depositCreditedOk(amt)
            : isCash
            ? wt.depositCashPending(amt)
            : wt.depositBankPending(amt, bankToUse, cleanRef)),
      });
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const submitWithdrawForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingTx) return;
    const amt = parseFloat(withAmount);
    if (isNaN(amt) || amt < 50) {
      setFeedbackMsg({ type: 'err', text: wt.minWithdrawErr });
      return;
    }
    if (amt > 75000) {
      setFeedbackMsg({ type: 'err', text: wt.maxWithdrawErr });
      return;
    }
    if (amt > availableWithdrawable) {
      setFeedbackMsg({
        type: 'err',
        text: wt.insufficientWithdrawableErr(availableWithdrawable),
      });
      return;
    }
    if (!withAccount.trim()) {
      setFeedbackMsg({ type: 'err', text: wt.enterWithdrawAcctErr });
      return;
    }
    const targetAcctDisplay = withHolderName.trim()
      ? `${withAccount.trim()} (${withHolderName.trim()})`
      : withAccount.trim();
    setIsSubmittingTx(true);
    try {
      const result = await onSubmitWithdraw(selectedBank, amt, targetAcctDisplay);
      if (result && result.ok === false) {
        setFeedbackMsg({
          type: 'err',
          text: result.error || wt.withdrawFailedErr,
        });
        return;
      }
      setWithAmount('');
      setWithStep(1);
      const pendingState = result?.isPending ?? requireAdminApproval;
      setFeedbackMsg({
        type: 'ok',
        text:
          result?.message ||
          (pendingState
            ? wt.withdrawPendingOk(amt, selectedBank, withAccount.trim())
            : wt.withdrawDoneOk(amt, selectedBank, withAccount.trim())),
      });
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const normalizePhoneForMatch = (ph?: string) => {
    const digits = (ph || '').replace(/\D/g, '');
    if (digits.startsWith('251') && digits.length === 12) return `0${digits.slice(3)}`;
    if (digits.length === 9 && /^[79]/.test(digits)) return `0${digits}`;
    return digits || (ph || '').trim();
  };

  const submitTransferForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseCleanAmount(transAmount);
    if (isNaN(amt) || amt <= 0) {
      setFeedbackMsg({ type: 'err', text: wt.enterValidTransferAmt });
      return;
    }
    if (amt > currentUser.balance) {
      setFeedbackMsg({ type: 'err', text: wt.insufficientBalanceErr });
      return;
    }
    const cleanRecipient = normalizePhoneForMatch(transPhone);
    const cleanMyPhone = normalizePhoneForMatch(currentUser.phone);
    if (!cleanRecipient || cleanRecipient.length < 9) {
      setFeedbackMsg({ type: 'err', text: wt.enterValidRecipientErr });
      return;
    }
    if (cleanRecipient === cleanMyPhone) {
      setFeedbackMsg({ type: 'err', text: wt.cannotTransferSelfErr });
      return;
    }
    onSubmitTransfer(cleanRecipient, amt);
    setTransAmount('');
    setTransPhone('');
    setFeedbackMsg({
      type: 'ok',
      text: wt.transferSuccessOk(amt, cleanRecipient),
    });
  };

  const myCleanPhone = normalizePhoneForMatch(currentUser.phone);
  const userTransactions = transactions.filter(
    (tx) =>
      tx.userId === currentUser.id ||
      normalizePhoneForMatch(tx.userPhone) === myCleanPhone ||
      (tx.recipientPhone && normalizePhoneForMatch(tx.recipientPhone) === myCleanPhone)
  );
  const pendingWithdrawTotal = userTransactions
    .filter((tx) => tx.type === 'withdraw' && tx.status === 'pending')
    .reduce((sum, tx) => sum + Number(tx.amount || 0), 0);
  const rawWithdrawable = Math.max(
    0,
    Math.min(currentUser.balance, Number(currentUser.withdrawableBalance ?? 0))
  );
  const availableWithdrawable = Math.max(
    0,
    Number((rawWithdrawable - pendingWithdrawTotal).toFixed(2))
  );

  return (
    <div className="space-y-5">
      {/* Top Wallet Balance & Action Switcher Card */}
      <div className="rounded-2xl p-5 bg-gradient-to-r from-blue-700 via-indigo-700 to-emerald-700 text-white shadow-lg space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-85">
              {t.mainWalletBalance}
            </p>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono-tabular mt-1">
              {currentUser.balance.toFixed(2)} <span className="text-lg">ETB</span>
            </div>
            <p className="text-xs mt-1 text-amber-200 font-bold">
              {wt.withdrawableLabel}: {availableWithdrawable.toFixed(2)} ETB
            </p>
            <p className="text-xs mt-0.5 text-emerald-200 font-semibold">
              🎁 {t.bonusBalanceLabel} ({wt.forPlayOnly}): {currentUser.bonusBalance.toFixed(2)} ETB · 📱 {t.phoneLabel}: {currentUser.phone}
            </p>
          </div>

          {/* Primary Big Deposit & Withdraw Buttons */}
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setActiveSubTab('deposit');
                setFeedbackMsg(null);
              }}
              className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                activeSubTab === 'deposit'
                  ? 'bg-emerald-400 text-slate-950 ring-2 ring-white scale-[1.02]'
                  : 'bg-emerald-600/80 text-white hover:bg-emerald-500'
              }`}
            >
              <ArrowDownCircle className="w-5 h-5" />
              <span>{t.deposit} 💵</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveSubTab('withdraw');
                setFeedbackMsg(null);
              }}
              className={`flex-1 sm:flex-initial px-5 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                activeSubTab === 'withdraw'
                  ? 'bg-amber-400 text-slate-950 ring-2 ring-white scale-[1.02]'
                  : 'bg-amber-500/80 text-slate-950 hover:bg-amber-400'
              }`}
            >
              <ArrowUpCircle className="w-5 h-5" />
              <span>{t.withdraw} 💸</span>
            </button>
          </div>
        </div>

        {/* Secondary Sub-Navigation Pills */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-white/15">
          <button
            type="button"
            onClick={() => {
              setActiveSubTab('deposit');
              setFeedbackMsg(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === 'deposit'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <ArrowDownCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>{t.deposit} 💵</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('withdraw');
              setFeedbackMsg(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === 'withdraw'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
            <span>{t.withdraw} 💸</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('transfer');
              setFeedbackMsg(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === 'transfer'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Send className="w-3.5 h-3.5 text-sky-300" />
            <span>{t.transfer} 🔄</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveSubTab('history');
              setFeedbackMsg(null);
            }}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeSubTab === 'history'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <History className="w-3.5 h-3.5 text-purple-300" />
            <span>{t.transactions}</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-xl border text-xs sm:text-sm font-bold flex items-center justify-between ${
            feedbackMsg.type === 'ok'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
              : 'bg-rose-500/15 border-rose-500/40 text-rose-400'
          }`}
        >
          <span>{feedbackMsg.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-xs underline ml-2 cursor-pointer"
          >
            {wt.close}
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: DEPOSIT 💵 (3-STEP WIZARD: AMOUNT -> BANK+COPY -> RECEIPT)     */}
      {/* ===================================================================== */}
      {activeSubTab === 'deposit' && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          {/* Step Progress Header */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-700/40">
            <div>
              <h3 className="text-base sm:text-lg font-black">{wt.depositTitle}</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                {wt.stepOf3(depStep)}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-black">
              {[
                { s: 1, label: wt.stepAmount },
                { s: 2, label: wt.stepBank },
                { s: 3, label: wt.stepTxNo },
              ].map((st) => (
                <span
                  key={st.s}
                  className={`px-2.5 py-1 rounded-lg border ${
                    depStep === st.s
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                      : depStep > st.s
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                      : isDark
                      ? 'bg-slate-800 text-slate-400 border-slate-700'
                      : 'bg-slate-100 text-slate-500 border-slate-200'
                  }`}
                >
                  {st.label}
                </span>
              ))}
            </div>
          </div>

          {/* DEPOSIT STEP 1: Choose Amount */}
          {depStep === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm sm:text-base font-black text-emerald-400">
                  {wt.howMuchDeposit}
                </h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {wt.pickOrTypeAmount}
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-7 gap-2">
                {[50, 100, 200, 500, 1000, 1500, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setDepAmount(String(preset));
                      setFeedbackMsg(null);
                    }}
                    className={`py-2.5 px-2 rounded-xl font-mono-tabular text-xs font-black border cursor-pointer transition-all ${
                      parseCleanAmount(depAmount) === preset
                        ? 'bg-emerald-500 text-slate-950 border-emerald-300 shadow-sm scale-[1.02]'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {preset.toLocaleString()} ETB
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{wt.manualAmountLabel}</label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={depAmount}
                  onChange={(e) => {
                    const rawVal = e.target.value;
                    if (/^[\d,.\s]*$/.test(rawVal)) {
                      setDepAmount(rawVal.replace(/\s+/g, ''));
                    } else {
                      handleSmsInputChange(rawVal);
                    }
                  }}
                  placeholder={wt.amountPlaceholder}
                  className={`w-full px-3.5 py-3 rounded-xl text-sm font-mono-tabular font-black border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const amt = parseCleanAmount(depAmount);
                  if (isNaN(amt) || amt <= 0) {
                    setFeedbackMsg({
                      type: 'err',
                      text: wt.enterAmountFirstErr,
                    });
                    return;
                  }
                  setFeedbackMsg(null);
                  setDepStep(2);
                }}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <span>{wt.continueChooseBank}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* DEPOSIT STEP 2: Show Admin-Enabled Banks + Copy & Go to Receipt */}
          {depStep === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackMsg(null);
                    setDepStep(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{wt.backChangeAmount}</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black font-mono-tabular">
                  {wt.chosenAmount} {depAmount} ETB
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-black">
                  {wt.chooseBankCopyTitle}
                </h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {wt.chooseBankCopyDesc}
                </p>
              </div>

              {activeBanksList.length === 0 ? (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-bold text-center">
                  {wt.noActiveBanks}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activeBanksList.map((acct) => {
                    const isSelected = selectedBank === acct.id;
                    return (
                      <div
                        key={acct.id}
                        className={`p-4 rounded-2xl border-2 flex flex-col justify-between gap-3 transition-all ${
                          isSelected
                            ? isDark
                              ? 'bg-slate-950 border-emerald-500 shadow-lg'
                              : 'bg-emerald-50 border-emerald-500'
                            : isDark
                            ? 'bg-slate-800/60 border-slate-700'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`px-2.5 py-0.5 rounded-md text-xs font-black ${acct.badgeBg}`}>
                              {acct.shortName}
                            </span>
                            <span className="text-[11px] font-bold opacity-75 truncate">
                              {acct.bankName}
                            </span>
                          </div>
                          <div className="text-xl font-black font-mono-tabular text-emerald-400 select-all pt-1">
                            {acct.accountNumber}
                          </div>
                          <div className="text-xs font-bold opacity-85">
                            {acct.id === 'Cash' ? wt.receiverLabel : wt.holderNameLabel}
                            <span className="underline">{acct.accountHolder}</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyBankAndProceedToReceipt(acct)}
                          className={`w-full py-2.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-md ${
                            copiedId === `step2-${acct.id}`
                              ? 'bg-emerald-500 text-slate-950'
                              : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                          }`}
                        >
                          {acct.id === 'Cash' ? (
                            <span>{wt.cashContinueBtn}</span>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>{wt.copyAndEnterTxBtn}</span>
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* DEPOSIT STEP 3: Paste Receipt / SMS & Verify against chosen amount */}
          {depStep === 3 && selectedAccountObj && (
            <form onSubmit={submitDepositForm} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackMsg(null);
                    setDepStep(2);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{wt.backChangeBank}</span>
                </button>
                <div className="flex items-center gap-2 text-xs font-black">
                  <span className={`px-2 py-1 rounded-lg ${selectedAccountObj.badgeBg}`}>
                    {selectedAccountObj.shortName}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-mono-tabular">
                    {depAmount} ETB
                  </span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-2 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="text-xs">
                  <span className="opacity-75">{wt.selectedAcctPrefix} ({selectedAccountObj.shortName}): </span>
                  <strong className="font-mono-tabular text-emerald-400 select-all">
                    {selectedAccountObj.accountNumber}
                  </strong>
                  <span className="opacity-75"> ({selectedAccountObj.accountHolder})</span>
                </div>
                {selectedAccountObj.id !== 'Cash' && (
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(selectedAccountObj.accountNumber, `step3-${selectedAccountObj.id}`)
                    }
                    className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-400 text-[11px] font-black flex items-center gap-1 cursor-pointer"
                  >
                    {copiedId === `step3-${selectedAccountObj.id}` ? (
                      <>
                        <Check className="w-3 h-3" />
                        <span>{wt.copiedWord}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>{wt.copyWord}</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="text-sm font-extrabold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-500" />
                  <span>
                    {selectedAccountObj.id === 'Cash'
                      ? wt.cashInfoTitle
                      : wt.txNoOnlyTitle}
                  </span>
                </h4>
                {selectedAccountObj.id !== 'Cash' && (
                  <button
                    type="button"
                    onClick={handlePasteReceiptFromClipboard}
                    className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span>{wt.pasteTxBtn}</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1">{wt.sentAmountLabel}</label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={depAmount}
                    onChange={(e) => {
                      const rawVal = e.target.value;
                      if (/^[\d,.\s]*$/.test(rawVal)) {
                        setDepAmount(rawVal.replace(/\s+/g, ''));
                      } else {
                        handleSmsInputChange(rawVal);
                      }
                    }}
                    placeholder={wt.amountPlaceholder}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular font-bold border ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">
                    {selectedAccountObj.id === 'Cash'
                      ? wt.agentNoteLabel
                      : wt.txNoInputLabel}
                  </label>
                  <input
                    type="text"
                    required={selectedAccountObj.id !== 'Cash'}
                    value={depRefNumber}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (selectedAccountObj.id !== 'Cash' && (v.length > 24 || /\s/.test(v.trim()))) {
                        handleSmsInputChange(v);
                      } else {
                        setDepRefNumber(v);
                      }
                    }}
                    placeholder={
                      selectedAccountObj.id === 'Cash'
                        ? wt.agentPlaceholder
                        : wt.txPlaceholder
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular font-bold border ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {detectedTxType && depRefNumber.trim() && (
                <div className="text-[11px] font-extrabold text-emerald-400">
                  ✓ {selectedAccountObj.shortName} | {depAmount ? `${depAmount} ETB` : '—'} | {depRefNumber}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingTx}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white font-black text-sm sm:text-base cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {isSubmittingTx
                    ? wt.sending
                    : wt.submitDepositBtn(selectedAccountObj.shortName)}
                </span>
              </button>
            </form>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: WITHDRAW 💸 (3-STEP WIZARD: AMOUNT -> BANK -> ACCOUNT/CONFIRM) */}
      {/* ===================================================================== */}
      {activeSubTab === 'withdraw' && (
        <div
          className={`rounded-2xl border p-4 sm:p-5 space-y-5 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-700/40">
            <div>
              <h3 className="text-base sm:text-lg font-black">{wt.withdrawTitle}</h3>
              <div className="flex items-center gap-1.5 text-[11px] font-black mt-1">
                {[
                  { s: 1, label: wt.stepAmount },
                  { s: 2, label: wt.stepBank },
                  { s: 3, label: wt.stepConfirm },
                ].map((st) => (
                  <span
                    key={st.s}
                    className={`px-2 py-0.5 rounded-lg border ${
                      withStep === st.s
                        ? 'bg-amber-400 text-slate-950 border-amber-300'
                        : withStep > st.s
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : isDark
                        ? 'bg-slate-800 text-slate-400 border-slate-700'
                        : 'bg-slate-100 text-slate-500 border-slate-200'
                    }`}
                  >
                    {st.label}
                  </span>
                ))}
              </div>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-right">
              <div className="text-[11px] font-bold text-amber-300">{wt.withdrawableHeader}</div>
              <div className="text-base sm:text-lg font-black font-mono-tabular text-amber-400">
                {currentUser.balance.toFixed(2)} ETB
              </div>
            </div>
          </div>

          {/* WITHDRAW STEP 1: Amount (50 - 75,000 ETB or All) */}
          {withStep === 1 && (
            <div className="space-y-4">
              <div>
                <h4 className="text-sm sm:text-base font-black text-amber-400">
                  {wt.howMuchWithdraw}
                </h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {wt.pickOrTypeSimple}
                </p>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {[50, 100, 200, 500, 1000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setWithAmount(String(preset));
                      setFeedbackMsg(null);
                    }}
                    className={`py-2.5 px-2.5 rounded-xl font-mono-tabular text-xs font-black border cursor-pointer transition-all ${
                      withAmount === String(preset)
                        ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-xs'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {preset} ETB
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    setWithAmount(String(Math.floor(availableWithdrawable)));
                    setFeedbackMsg(null);
                  }}
                  className={`py-2.5 px-2.5 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                    withAmount === String(Math.floor(availableWithdrawable))
                      ? 'bg-amber-500 text-slate-950 border-amber-300'
                      : isDark
                      ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                  }`}
                >
                  {wt.allBtn(Math.floor(availableWithdrawable))}
                </button>
              </div>

              <div className="rounded-xl px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/35 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-amber-300">
                  {wt.withdrawableLabel}:
                </span>
                <span className="font-mono-tabular font-black text-amber-300">
                  {availableWithdrawable.toFixed(2)} ETB
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">{wt.withdrawAmountLabel}</label>
                <input
                  type="number"
                  min={50}
                  max={75000}
                  value={withAmount}
                  onChange={(e) => setWithAmount(e.target.value)}
                  placeholder="50 - 75,000 ETB"
                  className={`w-full px-3.5 py-3 rounded-xl text-sm font-mono-tabular font-black border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  const amt = parseFloat(withAmount);
                  if (isNaN(amt) || amt < 50) {
                    setFeedbackMsg({ type: 'err', text: wt.minWithdrawErr });
                    return;
                  }
                  if (amt > 75000) {
                    setFeedbackMsg({ type: 'err', text: wt.maxWithdrawErr });
                    return;
                  }
                  if (amt > availableWithdrawable) {
                    setFeedbackMsg({
                      type: 'err',
                      text: wt.insufficientWithdrawableErr(availableWithdrawable),
                    });
                    return;
                  }
                  setFeedbackMsg(null);
                  setWithStep(2);
                }}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <span>{wt.continueChooseMethod}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* WITHDRAW STEP 2: Bank / Method Selection (Synced with Admin Active Banks) */}
          {withStep === 2 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackMsg(null);
                    setWithStep(1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{wt.backChangeAmount}</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black font-mono-tabular">
                  {wt.withdrawingAmount} {withAmount} ETB
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-black">
                  {wt.chooseReceivingBank}
                </h4>
              </div>

              {activeBanksList.length === 0 ? (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-bold text-center">
                  {wt.noActiveBanks}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {activeBanksList.map((m) => {
                    const isSelected = selectedBank === m.id;
                    const isMobileMoney =
                      m.id === 'Telebirr' ||
                      m.id === 'M-Pesa' ||
                      m.shortName.toLowerCase().includes('tele') ||
                      m.shortName.toLowerCase().includes('pesa');
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedBank(m.id);
                          if (isMobileMoney && !withAccount) {
                            setWithAccount(currentUser.phone);
                          }
                          setFeedbackMsg(null);
                          setWithStep(3);
                        }}
                        className={`p-3 rounded-xl text-left border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md ring-2 ring-amber-400/50'
                            : isDark
                            ? 'bg-slate-800 text-slate-200 border-slate-700 hover:bg-slate-700'
                            : 'bg-slate-50 text-slate-800 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-base">{isMobileMoney ? '📱' : '🏦'}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-slate-950" />}
                        </div>
                        <div className="text-xs font-black mt-1 truncate">{m.shortName}</div>
                        <div
                          className={`text-[10px] font-bold truncate ${
                            isSelected ? 'text-slate-900' : 'opacity-65'
                          }`}
                        >
                          {m.bankName}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {activeBanksList.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackMsg(null);
                    setWithStep(3);
                  }}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer shadow-lg flex items-center justify-center gap-2"
                >
                  <span>{wt.continueWord} ({selectedBank})</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* WITHDRAW STEP 3: Confirm Account / Phone & Submit */}
          {withStep === 3 && (
            <form onSubmit={submitWithdrawForm} className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFeedbackMsg(null);
                    setWithStep(2);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 cursor-pointer border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                      : 'bg-slate-100 border-slate-300 text-slate-800'
                  }`}
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>{wt.backChangeBank}</span>
                </button>
                <div className="flex items-center gap-2 text-xs font-black">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300">
                    {selectedBank === 'Abyssinia' ? 'BOA' : selectedBank}
                  </span>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-400 font-mono-tabular">
                    {withAmount} ETB
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold">
                      {wt.yourAcctPhoneLabel(selectedBank === 'Abyssinia' ? 'BOA' : selectedBank)}
                    </label>
                    {(selectedBank === 'Telebirr' || selectedBank === 'M-Pesa') && (
                      <button
                        type="button"
                        onClick={() => setWithAccount(currentUser.phone)}
                        className="text-[11px] font-extrabold text-amber-400 hover:underline cursor-pointer"
                      >
                        {wt.fillMyPhone}
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    value={withAccount}
                    onChange={(e) => setWithAccount(e.target.value)}
                    placeholder={
                      selectedBank === 'CBE'
                        ? '1000...'
                        : selectedBank === 'Abyssinia'
                        ? 'BOA...'
                        : '09... / 07...'
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular font-bold border ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">{wt.holderFullNameLabel}</label>
                  <input
                    type="text"
                    value={withHolderName}
                    onChange={(e) => setWithHolderName(e.target.value)}
                    placeholder={wt.fullNamePlaceholder}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-bold border ${
                      isDark
                        ? 'bg-slate-800 border-slate-700 text-white'
                        : 'bg-slate-50 border-slate-300 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmittingTx}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-60 text-slate-950 font-black text-sm sm:text-base cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <ArrowUpCircle className="w-5 h-5" />
                <span>
                  {isSubmittingTx
                    ? wt.sending
                    : wt.submitWithdrawBtn(withAmount, selectedBank === 'Abyssinia' ? 'BOA' : selectedBank)}
                </span>
              </button>
            </form>
          )}
        </div>
      )}

      {activeSubTab === 'transfer' && (
        <form
          onSubmit={submitTransferForm}
          className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h4 className="text-sm sm:text-base font-extrabold">
            {wt.transferTitle}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">{wt.recipientPhoneLabel}</label>
              <input
                type="tel"
                value={transPhone}
                onChange={(e) => setTransPhone(e.target.value)}
                placeholder={wt.recipientPhonePlaceholder}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">{wt.transferAmountLabel}</label>
              <input
                type="text"
                inputMode="decimal"
                value={transAmount}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  if (/^[\d,.\s]*$/.test(rawVal)) {
                    setTransAmount(rawVal.replace(/\s+/g, ''));
                  }
                }}
                placeholder={wt.amountPlaceholder}
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm cursor-pointer shadow-md"
          >
            {wt.sendTransferBtn}
          </button>
        </form>
      )}

      {/* Transaction History List */}
      <div
        className={`rounded-2xl border p-4 sm:p-5 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}
      >
        <h4 className="text-sm sm:text-base font-extrabold mb-3 flex items-center gap-2">
          <History className="w-4 h-4 text-blue-500" />
          <span>{t.transactions}</span>
        </h4>

        {userTransactions.length === 0 ? (
          <p className="text-xs text-slate-400 py-4 text-center">{wt.noTxHistory}</p>
        ) : (
          <div className="space-y-2.5">
            {userTransactions.map((tx) => {
              const isIncomingTransfer =
                tx.type === 'transfer' &&
                tx.recipientPhone &&
                normalizePhoneForMatch(tx.recipientPhone) === myCleanPhone &&
                normalizePhoneForMatch(tx.userPhone) !== myCleanPhone;
              const isPositiveCredit =
                tx.type === 'deposit' ||
                tx.type === 'win' ||
                tx.type === 'referral' ||
                isIncomingTransfer;
              const txTypeLabel = isIncomingTransfer
                ? wt.transferReceived
                : tx.type === 'transfer'
                ? `${wt.transferTo} ${tx.recipientPhone || ''}`
                : tx.type === 'deposit'
                ? wt.txTypeDeposit
                : tx.type === 'withdraw'
                ? wt.txTypeWithdraw
                : tx.type === 'win'
                ? wt.txTypeWin
                : tx.type === 'bet'
                ? wt.txTypeBet
                : tx.type === 'referral'
                ? wt.txTypeReferral
                : tx.type;
              const txStatusLabel =
                tx.status === 'approved'
                  ? wt.statusApproved
                  : tx.status === 'pending'
                  ? wt.statusPending
                  : wt.statusRejected;

              return (
                <div
                  key={tx.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-extrabold flex-wrap">
                      <span className="uppercase">{txTypeLabel}</span>
                      <span>·</span>
                      <span className="text-blue-500">{tx.method}</span>
                      <span>·</span>
                      <span className="font-mono-tabular opacity-75">Ref: {tx.referenceNumber}</span>
                    </div>
                    {tx.fullSmsText && tx.type === 'transfer' && (
                      <p className={`text-[11px] italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {tx.fullSmsText}
                      </p>
                    )}
                    <div className="text-[11px] text-slate-400">{tx.timestamp}</div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-center">
                    <span
                      className={`font-mono-tabular text-sm font-extrabold ${
                        isPositiveCredit ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                    >
                      {isPositiveCredit ? '+' : '-'}
                      {tx.amount.toFixed(2)} ETB
                    </span>

                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        tx.status === 'approved'
                          ? 'text-emerald-500'
                          : tx.status === 'pending'
                          ? 'text-amber-500'
                          : 'text-rose-500'
                      }`}
                    >
                      {tx.status === 'approved' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : tx.status === 'pending' ? (
                        <Clock className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      {txStatusLabel}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
