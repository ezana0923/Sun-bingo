import React, { useState } from 'react';
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
} from 'lucide-react';
import { PAYMENT_ACCOUNTS, TRANSLATIONS } from '../utils/translations';
import { parseEthiopianPaymentSms, normalizeTransactionReference } from '../utils/smsParser';
import { BankPaymentAccount, Language, TransactionRecord, UserAccount } from '../types/bingo';

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
  ) => void;
  onSubmitWithdraw: (
    method: string,
    amount: number,
    accountNumber: string
  ) => void;
  onSubmitTransfer: (recipientPhone: string, amount: number) => void;
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
  const activeBanksList: BankPaymentAccount[] =
    Array.isArray(bankAccounts) && bankAccounts.length > 0 ? bankAccounts : PAYMENT_ACCOUNTS;

  const [activeSubTab, setActiveSubTab] = useState<'deposit' | 'withdraw' | 'transfer' | 'history'>(
    initialSubTab
  );
  const [selectedBank, setSelectedBank] = useState<string>(
    activeBanksList[0]?.id || 'Telebirr'
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  React.useEffect(() => {
    setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  // Deposit Form
  const [depAmount, setDepAmount] = useState('');
  const [depRefNumber, setDepRefNumber] = useState('');
  const [depFullSms, setDepFullSms] = useState('');
  const [detectedTxType, setDetectedTxType] = useState<'deposit' | 'withdraw' | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Withdraw Form
  const [withAmount, setWithAmount] = useState('');
  const [withAccount, setWithAccount] = useState(currentUser.phone);
  const [withHolderName, setWithHolderName] = useState(currentUser.name);

  // Transfer Form
  const [transPhone, setTransPhone] = useState('');
  const [transAmount, setTransAmount] = useState('');

  const selectedAccountObj =
    activeBanksList.find((a) => a.id === selectedBank) || activeBanksList[0];

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const parseCleanAmount = (raw: string): number => {
    if (!raw) return NaN;
    const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '').trim();
    return cleaned ? parseFloat(cleaned) : NaN;
  };

  const handlePasteSampleSms = () => {
    const existingClean = parseCleanAmount(depAmount);
    const parsedExistingSms = parseEthiopianPaymentSms(depFullSms);
    const numAmt =
      (Number.isFinite(existingClean) && existingClean > 0 ? existingClean : null) ||
      parsedExistingSms.amount ||
      500;
    const amt = String(numAmt);
    const formattedAmt = numAmt.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const uniqueSuffix = Math.floor(100000 + Math.random() * 900000);
    const sample =
      selectedBank === 'Telebirr'
        ? `Dear Ezana, You have received ETB ${formattedAmt} from ${currentUser.phone} on 08/10/2026. Your transaction number is TB${uniqueSuffix}.`
        : selectedBank === 'CBE'
        ? `Dear Customer, your account 1000112964936 has been credited with ETB ${formattedAmt}. Ref No FT${uniqueSuffix}AB.`
        : selectedBank === 'Abyssinia'
        ? `Bank of Abyssinia: Acct 66816532 credited with ETB ${formattedAmt}. Txn ID BOA${uniqueSuffix}.`
        : `M-PESA Confirmed. You have received ETB ${formattedAmt}. Transaction ID MP${uniqueSuffix}CD.`;
    setDepFullSms(sample);
    setDepAmount(amt);
    setDetectedTxType('deposit');
    setDepRefNumber(
      selectedBank === 'Telebirr'
        ? `TB${uniqueSuffix}`
        : selectedBank === 'CBE'
        ? `FT${uniqueSuffix}AB`
        : selectedBank === 'Abyssinia'
        ? `BOA${uniqueSuffix}`
        : `MP${uniqueSuffix}CD`
    );
  };

  const handleSmsInputChange = (val: string) => {
    setDepFullSms(val);
    const parsed = parseEthiopianPaymentSms(val);
    if (parsed.amount !== null) {
      setDepAmount(String(parsed.amount));
    }
    if (parsed.referenceNumber) {
      setDepRefNumber(parsed.referenceNumber);
    }
    if (parsed.detectedBank) {
      setSelectedBank(parsed.detectedBank);
    }
    setDetectedTxType(parsed.detectedType);
  };

  const submitDepositForm = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedFromSms = parseEthiopianPaymentSms(depFullSms);
    const parsedFromRefField = parseEthiopianPaymentSms(depRefNumber);
    const typedAmt = parseCleanAmount(depAmount);

    // If the user pasted a withdrawal message inside the deposit box, automatically switch or process as withdrawal!
    if (parsedFromSms.detectedType === 'withdraw' && !parsedFromSms.referenceNumber) {
      setActiveSubTab('withdraw');
      if (parsedFromSms.amount) setWithAmount(String(parsedFromSms.amount));
      if (parsedFromSms.detectedBank) setSelectedBank(parsedFromSms.detectedBank);
      setFeedbackMsg({
        type: 'ok',
        text: '🔄 የወጪ (Withdraw) ጥያቄ በራሱ ተለይቷል! እባክዎ የወጪ ቅጹን ያረጋግጡ።',
      });
      return;
    }

    const amt =
      (Number.isFinite(typedAmt) && typedAmt > 0 ? typedAmt : null) ??
      parsedFromSms.amount ??
      parsedFromRefField.amount ??
      NaN;

    if (isNaN(amt) || amt <= 0) {
      setFeedbackMsg({
        type: 'err',
        text: 'እባክዎ የላኩትን የብር መጠን ያስገቡ ወይም የባንክ/ቴሌብር SMS ደረሰኝ ይለጥፉ።',
      });
      return;
    }

    const rawRef = (
      parsedFromSms.referenceNumber ||
      parsedFromRefField.referenceNumber ||
      depRefNumber.trim()
    ).toUpperCase();
    const bankToUse =
      (selectedBank === 'Cash' ? 'Cash' : null) ||
      parsedFromSms.detectedBank ||
      parsedFromRefField.detectedBank ||
      selectedBank ||
      'Telebirr';
    const isCash = bankToUse === 'Cash' || selectedBank === 'Cash';
    const cleanRef = isCash
      ? depRefNumber.trim() || `CASH-${Date.now().toString().slice(-6)}`
      : (normalizeTransactionReference(rawRef) || rawRef);

    const cleanSms = isCash
      ? (depFullSms.trim() || `Cash Deposit ${amt} ETB by ${currentUser.phone} (Note: ${cleanRef})`)
      : (depFullSms.trim() || `${bankToUse} Deposit ${amt} ETB (Ref: ${cleanRef})`);

    if (!isCash && !cleanRef && !depFullSms.trim()) {
      setFeedbackMsg({
        type: 'err',
        text: 'እባክዎ የግብይት ቁጥር (Transaction Ref No) ወይም የባንክ/ቴሌብር SMS ደረሰኝ ያስገቡ።',
      });
      return;
    }

    // DUPLICATE CHECK: Reject if this reference number or exact SMS was already used!
    if (!isCash) {
      const normIncomingSms = depFullSms.trim().replace(/\s+/g, ' ').toLowerCase();
      const existingDuplicate = transactions.find((tx) => {
        if (tx.type !== 'deposit' || tx.status === 'rejected' || tx.method === 'Cash') return false;
        const txRefNorm = normalizeTransactionReference(tx.referenceNumber);
        if (
          cleanRef &&
          cleanRef.length >= 5 &&
          !cleanRef.startsWith('REF') &&
          !cleanRef.startsWith('CASH') &&
          txRefNorm &&
          txRefNorm === cleanRef
        ) {
          return true;
        }
        if (
          normIncomingSms.length >= 25 &&
          tx.fullSmsText &&
          tx.fullSmsText.trim().replace(/\s+/g, ' ').toLowerCase() === normIncomingSms
        ) {
          return true;
        }
        return false;
      });

      if (existingDuplicate) {
        setFeedbackMsg({
          type: 'err',
          text: `❌ የተደገመ ደረሰኝ! ይህ የግብይት ቁጥር (${existingDuplicate.referenceNumber}) ከዚህ በፊት ጥቅም ላይ ውሏል! የተደገመ ደረሰኝ ተቀባይነት የለውም።`,
        });
        return;
      }
    }

    onSubmitDeposit(
      bankToUse,
      amt,
      cleanRef,
      cleanSms
    );
    setDepAmount('');
    setDepRefNumber('');
    setDepFullSms('');
    setDetectedTxType(null);
    setFeedbackMsg({
      type: 'ok',
      text: isCash
        ? (requireAdminApproval
            ? `⏳ የ ${amt} ETB በካሽ (Cash) የተከፈለ ገቢ ጥያቄዎ ተልኳል! አድሚኑ/ወኪሉ ጥሬ ገንዘቡን ሲቀበል ወዲያውኑ ወደ ዋሌትዎ ይጨመራል!`
            : `✅ የ ${amt} ETB በካሽ ገቢ ተረጋግጦ ወደ ዋሌትዎ ተጨምሯል!`)
        : (requireAdminApproval
            ? `⏳ የ ${amt} ETB ገቢ (Deposit) ጥያቄዎ በ ${bankToUse} (Ref: ${cleanRef || 'SMS'}) በራሱ ተለይቶ ተልኳል! ከባንክ ደረሰኝ ጋር ተመሳክሮ ሲጸድቅ ወዲያውኑ ወደ ዋሌትዎ ይገባል!`
            : `✅ የ ${amt} ETB ገቢ በ ${bankToUse} ተረጋግጦ ወደ ዋሌትዎ ተጨምሯል!`),
    });
  };

  const submitWithdrawForm = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withAmount);
    if (isNaN(amt) || amt < 50) {
      setFeedbackMsg({ type: 'err', text: 'ዝቅተኛው የወጪ መጠን 50 ETB ነው።' });
      return;
    }
    if (amt > 75000) {
      setFeedbackMsg({ type: 'err', text: 'ከፍተኛው የወጪ መጠን 75,000 ETB ነው።' });
      return;
    }
    if (amt > currentUser.balance) {
      setFeedbackMsg({ type: 'err', text: 'በቂ ቀሪ ሂሳብ የለዎትም!' });
      return;
    }
    if (!withAccount.trim()) {
      setFeedbackMsg({ type: 'err', text: 'እባክዎ የባንክ ሂሳብ ወይም የቴሌብር/ኤም-ፔሳ ስልክ ቁጥርዎን ያስገቡ።' });
      return;
    }
    const targetAcctDisplay = withHolderName.trim()
      ? `${withAccount.trim()} (${withHolderName.trim()})`
      : withAccount.trim();
    onSubmitWithdraw(selectedBank, amt, targetAcctDisplay);
    setWithAmount('');
    setFeedbackMsg({
      type: 'ok',
      text: requireAdminApproval
        ? `⏳ የ ${amt} ETB ወጪ ጥያቄ ወደ ${selectedBank} (${withAccount.trim()}) ተልኳል! ተጣርቶ ሲጸድቅ ወደ ሂሳብዎ ይላካል።`
        : `✅ የ ${amt} ETB ወጪ ጥያቄዎ በ ${selectedBank} (${withAccount.trim()}) ተፈጽሟል!`,
    });
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
      setFeedbackMsg({ type: 'err', text: 'እባክዎ ትክክለኛ የብር መጠን ያስገቡ።' });
      return;
    }
    if (amt > currentUser.balance) {
      setFeedbackMsg({ type: 'err', text: 'በቂ ቀሪ ሂሳብ የለዎትም!' });
      return;
    }
    const cleanRecipient = normalizePhoneForMatch(transPhone);
    const cleanMyPhone = normalizePhoneForMatch(currentUser.phone);
    if (!cleanRecipient || cleanRecipient.length < 9) {
      setFeedbackMsg({ type: 'err', text: 'እባክዎ ትክክለኛ የተቀባይ ስልክ ቁጥር ያስገቡ (ምሳሌ: 0911223344)።' });
      return;
    }
    if (cleanRecipient === cleanMyPhone) {
      setFeedbackMsg({ type: 'err', text: 'ወደ ራስዎ ስልክ ቁጥር ማስተላለፍ አይችሉም! የሌላ ተጫዋች ስልክ ያስገቡ።' });
      return;
    }
    onSubmitTransfer(cleanRecipient, amt);
    setTransAmount('');
    setTransPhone('');
    setFeedbackMsg({
      type: 'ok',
      text: `✅ ${amt.toFixed(2)} ETB ወደ ${cleanRecipient} ዋሌት በተሳካ ሁኔታ ተልኳል!`,
    });
  };

  const myCleanPhone = normalizePhoneForMatch(currentUser.phone);
  const userTransactions = transactions.filter(
    (tx) =>
      tx.userId === currentUser.id ||
      normalizePhoneForMatch(tx.userPhone) === myCleanPhone ||
      (tx.recipientPhone && normalizePhoneForMatch(tx.recipientPhone) === myCleanPhone)
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
            <p className="text-xs mt-1 text-emerald-200 font-semibold">
              🎁 {t.bonusBalanceLabel}: {currentUser.bonusBalance.toFixed(2)} ETB · 📱 {t.phoneLabel}: {currentUser.phone}
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
            ዝጋ
          </button>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: DEPOSIT 💵 (WHEN USER TAPS DEPOSIT)                            */}
      {/* ===================================================================== */}
      {activeSubTab === 'deposit' && (
        <div className="space-y-4">
          {/* Step 1: Select Deposit Method & Copy Account */}
          <div
            className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                  <span>Deposit 💵 (ገንዘብ ማስገቢያ)</span>
                </h3>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  1. የሚያስገቡበትን ባንክ ይምረጡ · 2. ቁጥሩን Copy አድርገው ይላኩ · 3. የደረሰዎትን SMS/Ref ያስገቡ
                </p>
              </div>
              <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-extrabold">
                ⚡ Instant Telebirr & Bank Deposit
              </span>
            </div>

            {/* Payment Method Buttons (Dynamic from Admin Bank Accounts) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {activeBanksList.map((acct) => {
                const isSelected = selectedBank === acct.id;
                return (
                  <button
                    key={acct.id}
                    type="button"
                    onClick={() => setSelectedBank(acct.id)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-md ring-2 ring-emerald-400/50'
                        : isDark
                        ? 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800'
                        : 'bg-slate-50 border-slate-200 text-slate-800 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-black ${
                          isSelected ? 'bg-slate-950 text-emerald-400' : acct.badgeBg
                        }`}
                      >
                        {acct.shortName}
                      </span>
                      {isSelected && <CheckCircle2 className="w-4 h-4 text-white" />}
                    </div>
                    <div className="text-xs font-extrabold truncate">{acct.bankName}</div>
                    <div className="font-mono-tabular text-xs font-black opacity-90">
                      {acct.accountNumber}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Highlighted Selected Deposit Account Box with One-Tap Copy */}
            <div
              className={`p-4 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                isDark
                  ? 'bg-slate-950/90 border-emerald-500/50'
                  : 'bg-emerald-50/70 border-emerald-400'
              }`}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-md text-xs font-black ${selectedAccountObj.badgeBg}`}>
                    {selectedAccountObj.shortName}
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold">
                    {selectedAccountObj.bankName}
                  </span>
                </div>
                <div className="text-2xl sm:text-3xl font-black font-mono-tabular tracking-wider text-emerald-400 select-all">
                  {selectedAccountObj.accountNumber}
                </div>
                <div className={`text-xs sm:text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {selectedAccountObj.id === 'Cash'
                    ? 'ክፍያ መቀበያ: '
                    : 'የሂሳብ ባለቤት ስም (Account Holder): '}
                  <strong className="font-black underline">{selectedAccountObj.accountHolder}</strong>
                </div>
              </div>

              {selectedAccountObj.id === 'Cash' ? (
                <div className="px-4 py-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs sm:text-sm font-extrabold flex items-center gap-2 shrink-0">
                  <span>💵 ክፍያ በጥሬ ገንዘብ / ወኪል</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => handleCopy(selectedAccountObj.accountNumber, selectedAccountObj.id)}
                  className={`px-5 py-3.5 rounded-xl text-xs sm:text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md shrink-0 ${
                    copiedId === selectedAccountObj.id
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                  }`}
                >
                  {copiedId === selectedAccountObj.id ? (
                    <>
                      <Check className="w-4 h-4 stroke-[3]" />
                      <span>ቁጥሩ Copy ተደርጓል! ({selectedAccountObj.accountNumber})</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>📋 Copy {selectedAccountObj.shortName} ({selectedAccountObj.accountNumber})</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* All Accounts Quick Copy List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {activeBanksList.map((acct) => (
                <div
                  key={acct.id}
                  onClick={() => setSelectedBank(acct.id)}
                  className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
                    selectedBank === acct.id
                      ? isDark
                        ? 'bg-emerald-950/30 border-emerald-500/50'
                        : 'bg-emerald-50 border-emerald-400'
                      : isDark
                      ? 'bg-slate-800/50 border-slate-700/80 hover:bg-slate-800'
                      : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${acct.badgeBg}`}>
                        {acct.shortName}
                      </span>
                      <span className="text-xs font-bold">{acct.accountHolder}</span>
                    </div>
                    <div className="font-mono-tabular text-sm font-black mt-0.5">
                      {acct.accountNumber}
                    </div>
                  </div>
                  {acct.id === 'Cash' ? (
                    <span className="px-2.5 py-1 rounded-lg text-xs font-extrabold bg-emerald-500/20 text-emerald-400">
                      በካሽ 💵
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopy(acct.accountNumber, `list-${acct.id}`);
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-extrabold flex items-center gap-1 cursor-pointer ${
                        copiedId === `list-${acct.id}`
                          ? 'bg-emerald-600 text-white'
                          : isDark
                          ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                          : 'bg-white text-slate-800 border border-slate-300'
                      }`}
                    >
                      {copiedId === `list-${acct.id}` ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: Deposit Amount & SMS / Reference Verification Form */}
          <form
            onSubmit={submitDepositForm}
            className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
              isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 className="text-sm sm:text-base font-extrabold flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>
                  {selectedAccountObj.id === 'Cash'
                    ? 'የከፈሉበትን የካሽ መረጃ ማረጋገጫ (በካሽ / Cash)'
                    : `የከፈሉበትን መረጃ / SMS ደረሰኝ ማረጋገጫ (${selectedAccountObj.shortName})`}
                </span>
              </h4>
              {selectedAccountObj.id !== 'Cash' && (
                <button
                  type="button"
                  onClick={handlePasteSampleSms}
                  className="px-3 py-1 rounded-lg bg-blue-500/15 border border-blue-500/30 text-xs font-extrabold text-blue-400 hover:bg-blue-500/25 cursor-pointer"
                >
                  ናሙና SMS ሙላ (Auto-fill Sample SMS)
                </button>
              )}
            </div>

            {/* Quick Deposit Amount Pills */}
            <div>
              <label className="block text-xs font-bold mb-1.5 opacity-85">
                {selectedAccountObj.id === 'Cash'
                  ? 'ፈጣን የካሽ መጠን ይምረጡ፦'
                  : 'ፈጣን የብር መጠን ይምረጡ (Quick Deposit Amount)፦'}
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                {[50, 100, 200, 500, 1000, 1500, 2000].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setDepAmount(String(preset))}
                    className={`py-2 px-2 rounded-xl font-mono-tabular text-xs font-black border cursor-pointer transition-all ${
                      parseCleanAmount(depAmount) === preset
                        ? 'bg-emerald-600 text-white border-emerald-400 shadow-xs'
                        : isDark
                        ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
                        : 'bg-slate-100 border-slate-300 text-slate-800 hover:bg-slate-200'
                    }`}
                  >
                    {preset.toLocaleString()} ETB
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1">
                  {selectedAccountObj.id === 'Cash' ? 'የከፈሉት የካሽ መጠን (ETB) *፦' : 'የላኩት የብር መጠን (ETB) *፦'}
                </label>
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
                  placeholder="ምሳሌ: 1,500 ወይም 500"
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
                    ? 'የወኪሉ/ካሸሩ ስም ወይም ደረሰኝ ቁጥር (ማስታወሻ)፦'
                    : 'የግብይት ቁጥር (Transaction ID / Ref No)፦'}
                </label>
                <input
                  type="text"
                  value={depRefNumber}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (selectedAccountObj.id !== 'Cash' && (v.length > 28 || /\s/.test(v.trim()))) {
                      handleSmsInputChange(v);
                    } else {
                      setDepRefNumber(v);
                    }
                  }}
                  placeholder={
                    selectedAccountObj.id === 'Cash'
                      ? 'ምሳሌ: ወኪል ዮናስ ወይም ደረሰኝ #1024'
                      : 'ምሳሌ: FT26108XYZ ወይም DCO412389A'
                  }
                  className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular font-bold border ${
                    isDark
                      ? 'bg-slate-800 border-slate-700 text-white'
                      : 'bg-slate-50 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold">
                  {selectedAccountObj.id === 'Cash'
                    ? 'ተጨማሪ የካሽ ማስታወሻ (አማራጭ)፦'
                    : 'ወይም የደረሰዎትን ሙሉ የባንክ / ቴሌብር SMS ደረሰኝ እዚህ ይለጥፉ፦'}
                </label>
                {depFullSms.trim() && selectedAccountObj.id !== 'Cash' && (
                  <span className="text-[11px] font-extrabold text-emerald-400">
                    ✓ የተለየ፦ {detectedTxType === 'withdraw' ? 'ወጪ (Withdraw)' : 'ገቢ (Deposit)'} | {selectedAccountObj.shortName} | {depAmount ? `${depAmount} ETB` : '—'} | Ref: {depRefNumber || '—'}
                  </span>
                )}
              </div>
              <textarea
                rows={selectedAccountObj.id === 'Cash' ? 2 : 3}
                value={depFullSms}
                onChange={(e) => handleSmsInputChange(e.target.value)}
                placeholder={
                  selectedAccountObj.id === 'Cash'
                    ? 'የካሽ ክፍያ የፈጸሙበት ቦታ ወይም ተጨማሪ መረጃ ይጻፉ...'
                    : 'Dear Customer, your account 1000112964936 has been credited with ETB 500.00... ወይም የቴሌብር SMS ይለጥፉ'
                }
                className={`w-full px-3.5 py-2.5 rounded-xl text-xs sm:text-sm border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <button
              type="submit"
              className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm sm:text-base cursor-pointer shadow-lg flex items-center justify-center gap-2"
            >
              <ArrowDownCircle className="w-5 h-5" />
              <span>
                {selectedAccountObj.id === 'Cash'
                  ? '💵 በካሽ ገቢ አረጋግጥ (Submit Cash Deposit)'
                  : `ገቢ አረጋግጥ (Submit ${selectedAccountObj.shortName} Deposit)`}
              </span>
            </button>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: WITHDRAW 💸 (WHEN USER TAPS WITHDRAW)                          */}
      {/* ===================================================================== */}
      {activeSubTab === 'withdraw' && (
        <form
          onSubmit={submitWithdrawForm}
          className={`rounded-2xl border p-4 sm:p-5 space-y-5 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-3 border-slate-700/40">
            <div>
              <h3 className="text-base sm:text-lg font-black flex items-center gap-2">
                <span>Withdraw 💸 (ገንዘብ ማውጫ)</span>
              </h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ገንዘብ የሚያወጡበትን ባንክ ይምረጡ፣ መጠን እና የሂሳብ ቁጥርዎን ያስገቡ
              </p>
            </div>
            <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-right">
              <div className="text-[11px] font-bold text-amber-300">ማውጣት የሚችሉት (Cash Balance)</div>
              <div className="text-base sm:text-lg font-black font-mono-tabular text-amber-400">
                {currentUser.balance.toFixed(2)} ETB
              </div>
            </div>
          </div>

          {/* Step 1: Bank / Mobile Money Selector for Withdrawal */}
          <div>
            <label className="block text-xs font-extrabold mb-2">
              1. ገንዘብ የሚያወጡበትን መንገድ ይምረጡ (Select Withdrawal Method)፦
            </label>
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
          </div>

          {/* Step 2: Quick Withdrawal Amount Pills */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-extrabold">
                2. የሚያወጡትን የብር መጠን ይምረጡ (Min: 50 ETB · Max: 75,000 ETB)፦
              </label>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[50, 100, 200, 500, 1000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setWithAmount(String(preset))}
                  className={`py-2 px-2.5 rounded-xl font-mono-tabular text-xs font-black border cursor-pointer transition-all ${
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
                onClick={() => setWithAmount(String(Math.floor(currentUser.balance)))}
                className={`py-2 px-2.5 rounded-xl text-xs font-black border cursor-pointer transition-all ${
                  withAmount === String(Math.floor(currentUser.balance))
                    ? 'bg-amber-500 text-slate-950 border-amber-300'
                    : isDark
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400 hover:bg-emerald-900/50'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                }`}
              >
                ሁሉንም ({Math.floor(currentUser.balance)})
              </button>
            </div>
          </div>

          {/* Step 3: Amount & Account Details Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">
                የወጪ መጠን (ETB)፦
              </label>
              <input
                type="number"
                min={50}
                max={75000}
                value={withAmount}
                onChange={(e) => setWithAmount(e.target.value)}
                placeholder="50 - 75,000 ETB"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular font-bold border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold">
                  የእርስዎ {selectedBank === 'Abyssinia' ? 'BOA' : selectedBank} ቁጥር፦
                </label>
                {(selectedBank === 'Telebirr' || selectedBank === 'M-Pesa') && (
                  <button
                    type="button"
                    onClick={() => setWithAccount(currentUser.phone)}
                    className="text-[11px] font-extrabold text-amber-400 hover:underline cursor-pointer"
                  >
                    የተመዘገበ ስልኬን ሙላ
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
                    ? 'BOA Account Number...'
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
              <label className="block text-xs font-bold mb-1">
                የሂሳብ ባለቤት ሙሉ ስም፦
              </label>
              <input
                type="text"
                value={withHolderName}
                onChange={(e) => setWithHolderName(e.target.value)}
                placeholder="ሙሉ ስም"
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
            className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm sm:text-base cursor-pointer shadow-lg flex items-center justify-center gap-2"
          >
            <ArrowUpCircle className="w-5 h-5" />
            <span>ወጪ ጠይቅ (Withdraw via {selectedBank === 'Abyssinia' ? 'BOA' : selectedBank})</span>
          </button>
        </form>
      )}

      {activeSubTab === 'transfer' && (
        <form
          onSubmit={submitTransferForm}
          className={`rounded-2xl border p-4 sm:p-5 space-y-4 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
          }`}
        >
          <h4 className="text-sm sm:text-base font-extrabold">
            ወደ ሌላ ተጫዋች ገንዘብ ማስተላለፊያ (Wallet-to-Wallet Transfer)
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1">የተቀባይ ስልክ ቁጥር፦</label>
              <input
                type="tel"
                value={transPhone}
                onChange={(e) => setTransPhone(e.target.value)}
                placeholder="ምሳሌ: 0911223344"
                className={`w-full px-3.5 py-2.5 rounded-xl text-sm font-mono-tabular border ${
                  isDark
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-slate-50 border-slate-300 text-slate-900'
                }`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">የብር መጠን (ETB)፦</label>
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
                placeholder="ምሳሌ: 100 ወይም 1,500"
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
            አሁን አስተላልፍ (Send Instant Transfer)
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
          <p className="text-xs text-slate-400 py-4 text-center">ምንም የግብይት ታሪክ የለም።</p>
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

              return (
                <div
                  key={tx.id}
                  className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                    isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 text-xs font-extrabold flex-wrap">
                      <span className="uppercase">
                        {isIncomingTransfer
                          ? 'TRANSFER RECEIVED (የደረሰዎት)'
                          : tx.type === 'transfer'
                          ? `TRANSFER TO ${tx.recipientPhone || ''}`
                          : tx.type}
                      </span>
                      <span>·</span>
                      <span className="text-blue-500">{tx.method}</span>
                      <span>·</span>
                      <span className="font-mono-tabular opacity-75">Ref: {tx.referenceNumber}</span>
                    </div>
                    {tx.fullSmsText && (
                      <p className={`text-[11px] italic ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {tx.type === 'transfer' ? tx.fullSmsText : `SMS: "${tx.fullSmsText}"`}
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
                      {tx.status}
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
