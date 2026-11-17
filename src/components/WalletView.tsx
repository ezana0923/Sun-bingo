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
        text: `📋 ${acct.shortName} ቁጥር (${acct.accountNumber}) Copy ተደርጓል! ክፍያውን ፈጽመው የደረሰኝ SMS ወይም Ref ቁጥር ከታች ያስገቡ።`,
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
          text: '📋 እባክዎ ከስልክዎ/ኪቦርድ Paste በመንካት ደረሰኙን ሳጥኑ ውስጥ ይለጥፉ።',
        });
        return;
      }
      const clipText = await navigator.clipboard.readText();
      if (!clipText || !clipText.trim()) {
        setFeedbackMsg({
          type: 'err',
          text: '📋 በ Clipboard ውስጥ የተቀዳ ጽሁፍ የለም! መጀመሪያ የባንክ SMS ወይም Ref ቁጥር Copy ያድርጉ።',
        });
        return;
      }
      handleSmsInputChange(clipText.trim());
      setFeedbackMsg({
        type: 'ok',
        text: '✅ ደረሰኙ በተሳካ ሁኔታ Paste ተደርጓል! ከታች ያረጋግጡ።',
      });
    } catch {
      setFeedbackMsg({
        type: 'err',
        text: '📋 Browser clipboard ፍቃድ አልሰጠም — እባክዎ ሳጥኑን ተጭነው Paste ያድርጉ።',
      });
    }
  };

  const parseCleanAmount = (raw: string): number => {
    if (!raw) return NaN;
    const cleaned = raw.replace(/,/g, '').replace(/[^\d.]/g, '').trim();
    return cleaned ? parseFloat(cleaned) : NaN;
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
    const chosenAmt = parseCleanAmount(depAmount);

    // If the user pasted a withdrawal message inside the deposit box, automatically switch or process as withdrawal!
    if (parsedFromSms.detectedType === 'withdraw' && !parsedFromSms.referenceNumber) {
      setActiveSubTab('withdraw');
      setWithStep(1);
      if (parsedFromSms.amount) setWithAmount(String(parsedFromSms.amount));
      if (parsedFromSms.detectedBank) setSelectedBank(parsedFromSms.detectedBank);
      setFeedbackMsg({
        type: 'ok',
        text: '🔄 የወጪ (Withdraw) ጥያቄ በራሱ ተለይቷል! እባክዎ የወጪ ቅጹን ያረጋግጡ።',
      });
      return;
    }

    const amt =
      (Number.isFinite(chosenAmt) && chosenAmt > 0 ? chosenAmt : null) ??
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

    if (
      Number.isFinite(chosenAmt) &&
      chosenAmt > 0 &&
      parsedFromSms.amount !== null &&
      Math.abs(parsedFromSms.amount - chosenAmt) > 0.01
    ) {
      setFeedbackMsg({
        type: 'err',
        text: `⚠️ የመረጡት መጠን (${chosenAmt} ETB) እና በደረሰኙ SMS ላይ ያለው መጠን (${parsedFromSms.amount} ETB) አይመሳሰልም! እባክዎ ትክክለኛውን ደረሰኝ ያስገቡ ወይም ተመለስ በመንካት መጠኑን ያስተካክሉ።`,
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
      : normalizeTransactionReference(rawRef) || rawRef;

    const cleanSms = isCash
      ? depFullSms.trim() || `Cash Deposit ${amt} ETB by ${currentUser.phone} (Note: ${cleanRef})`
      : depFullSms.trim() || `${bankToUse} Deposit ${amt} ETB (Ref: ${cleanRef})`;

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

    onSubmitDeposit(bankToUse, amt, cleanRef, cleanSms);
    setDepAmount('');
    setDepRefNumber('');
    setDepFullSms('');
    setDetectedTxType(null);
    setDepStep(1);
    setFeedbackMsg({
      type: 'ok',
      text: isCash
        ? `⏳ የ ${amt} ETB በካሽ (Cash) የተከፈለ ገቢ ጥያቄዎ ተልኳል! አድሚኑ/ወኪሉ ሲያረጋግጥ ወዲያውኑ ወደ ዋሌትዎ ይጨመራል።`
        : `⏳ የ ${amt} ETB ገቢ (Deposit) ጥያቄዎ በ ${bankToUse} (Ref: ${cleanRef || 'SMS'}) ተልኳል! የባንክ SMS በ Webhook ሲረጋገጥ ወዲያውኑ ወደ ዋሌትዎ ይገባል።`,
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
    if (amt > availableWithdrawable) {
      setFeedbackMsg({
        type: 'err',
        text: `❌ ወጪ ሊደረግ የሚችል ቀሪ ሂሳብ በቂ አይደለም! (ወጪ ሊደረግ የሚችል: ${availableWithdrawable.toFixed(2)} ETB — ገቢ ያደረጉት ብር ጨዋታ አሸንፈው ብቻ ወጪ ይደረጋል)`,
      });
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
    setWithStep(1);
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
              💸 ወጪ ሊደረግ የሚችል (ከድል): {availableWithdrawable.toFixed(2)} ETB
            </p>
            <p className="text-xs mt-0.5 text-emerald-200 font-semibold">
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
              <h3 className="text-base sm:text-lg font-black">Deposit 💵 (ገንዘብ ማስገቢያ)</h3>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                ደረጃ {depStep} ከ 3
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-black">
              {[
                { s: 1, label: '1. መጠን' },
                { s: 2, label: '2. ባንክ' },
                { s: 3, label: '3. ደረሰኝ' },
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
                  💵 ስንት ብር ገቢ ማድረግ ይፈልጋሉ?
                </h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ፈጣን የብር መጠን ይምረጡ ወይም ከታች በእጅዎ ይጻፉ።
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
                <label className="block text-xs font-bold mb-1">የብር መጠን (በእጅ መጻፊያ — ETB)፦</label>
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
                  placeholder="ምሳሌ: 100, 500 ወይም 1,500"
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
                      text: 'እባክዎ መጀመሪያ ገቢ የሚያደርጉትን የብር መጠን ይምረጡ ወይም ይጻፉ (ምሳሌ: 100)።',
                    });
                    return;
                  }
                  setFeedbackMsg(null);
                  setDepStep(2);
                }}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <span>ቀጥል — ባንክ ምረጥ</span>
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
                  <span>ተመለስ (መጠን ቀይር)</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-xs font-black font-mono-tabular">
                  💵 የመረጡት መጠን፦ {depAmount} ETB
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-black">
                  🏦 የባንክ አካውንት ይምረጡ እና ቁጥሩን Copy ያድርጉ፦
                </h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  «📋 Copy አድርግና ወደ ደረሰኝ ሂድ» ሲነኩ ቁጥሩ Copy ሆኖ ወደ ደረሰኝ ማስገቢያ ይወስድዎታል።
                </p>
              </div>

              {activeBanksList.length === 0 ? (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-bold text-center">
                  ⚠️ ለጊዜው በአድሚን የነቁ የባንክ አካውንቶች የሉም።
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
                            {acct.id === 'Cash' ? 'መቀበያ፦ ' : 'ስም፦ '}
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
                            <span>💵 በካሽ ደረሰኝ ሂድ →</span>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>📋 Copy አድርግና ወደ ደረሰኝ ሂድ</span>
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
                  <span>ተመለስ (ባንክ ቀይር)</span>
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
                  <span className="opacity-75">የተመረጠ አካውንት ({selectedAccountObj.shortName})፦ </span>
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
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
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
                      ? 'የካሽ ደረሰኝ ማረጋገጫ'
                      : 'ደረሰኝ (SMS ወይም Ref ቁጥር) Paste አድርገው ያረጋግጡ'}
                  </span>
                </h4>
                {selectedAccountObj.id !== 'Cash' && (
                  <button
                    type="button"
                    onClick={handlePasteReceiptFromClipboard}
                    className="px-3.5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <ClipboardPaste className="w-4 h-4" />
                    <span>📋 ደረሰኝ Paste አድርግ</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold mb-1">የላኩት የብር መጠን (ETB) *፦</label>
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
                    placeholder="ምሳሌ: 500"
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
                      ? 'የወኪሉ ስም / ደረሰኝ ቁጥር፦'
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
                        ? 'ምሳሌ: ወኪል ዮናስ #1024'
                        : 'ምሳሌ: FT26108XYZ ወይም DKA00C24SE'
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
                      : 'ሙሉ የባንክ / ቴሌብር SMS ደረሰኝ እዚህ Paste ያድርጉ፦'}
                  </label>
                  {depFullSms.trim() && selectedAccountObj.id !== 'Cash' && (
                    <span className="text-[11px] font-extrabold text-emerald-400">
                      ✓ የተለየ፦ {detectedTxType === 'withdraw' ? 'ወጪ' : 'ገቢ'} |{' '}
                      {selectedAccountObj.shortName} | {depAmount ? `${depAmount} ETB` : '—'} | Ref:{' '}
                      {depRefNumber || '—'}
                    </span>
                  )}
                </div>
                <textarea
                  rows={3}
                  value={depFullSms}
                  onChange={(e) => handleSmsInputChange(e.target.value)}
                  placeholder={
                    selectedAccountObj.id === 'Cash'
                      ? 'የካሽ ክፍያ የፈጸሙበት ቦታ ወይም ተጨማሪ መረጃ...'
                      : 'ከባንክ ወይም ከቴሌብር የደረሰዎትን SMS መልዕክት ሙሉውን እዚህ Paste ያድርጉ...'
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
                <CheckCircle2 className="w-5 h-5" />
                <span>✅ አረጋግጥና ላክ (Submit {selectedAccountObj.shortName} Deposit)</span>
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
              <h3 className="text-base sm:text-lg font-black">Withdraw 💸 (ገንዘብ ማውጫ)</h3>
              <div className="flex items-center gap-1.5 text-[11px] font-black mt-1">
                {[
                  { s: 1, label: '1. መጠን' },
                  { s: 2, label: '2. ባንክ' },
                  { s: 3, label: '3. ማረጋገጫ' },
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
              <div className="text-[11px] font-bold text-amber-300">ማውጣት የሚችሉት (Balance)</div>
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
                  💸 ስንት ብር ማውጣት ይፈልጋሉ? (50 – 75,000 ETB)
                </h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  ፈጣን መጠን ይምረጡ ወይም በእጅዎ ይጻፉ።
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
                  ሁሉንም ({Math.floor(availableWithdrawable)})
                </button>
              </div>

              <div className="rounded-xl px-3.5 py-2.5 bg-amber-500/10 border border-amber-500/35 text-xs flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold text-amber-300">
                  💸 ወጪ ሊደረግ የሚችል (ከጨዋታ ድል የተገኘ)፦
                </span>
                <span className="font-mono-tabular font-black text-amber-300">
                  {availableWithdrawable.toFixed(2)} ETB
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">የወጪ መጠን (ETB)፦</label>
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
                    setFeedbackMsg({ type: 'err', text: 'ዝቅተኛው የወጪ መጠን 50 ETB ነው።' });
                    return;
                  }
                  if (amt > 75000) {
                    setFeedbackMsg({ type: 'err', text: 'ከፍተኛው የወጪ መጠን 75,000 ETB ነው።' });
                    return;
                  }
                  if (amt > availableWithdrawable) {
                    setFeedbackMsg({
                      type: 'err',
                      text: `❌ ወጪ ሊደረግ የሚችል ቀሪ ሂሳብ በቂ አይደለም! (ወጪ ሊደረግ የሚችል: ${availableWithdrawable.toFixed(2)} ETB — ገቢ ያደረጉት ብር ጨዋታ አሸንፈው ብቻ ወጪ ይደረጋል)`,
                    });
                    return;
                  }
                  setFeedbackMsg(null);
                  setWithStep(2);
                }}
                className="w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm cursor-pointer shadow-lg flex items-center justify-center gap-2"
              >
                <span>ቀጥል — ባንክ / መንገድ ምረጥ</span>
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
                  <span>ተመለስ (መጠን ቀይር)</span>
                </button>
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black font-mono-tabular">
                  💸 የሚያወጡት መጠን፦ {withAmount} ETB
                </span>
              </div>

              <div>
                <h4 className="text-sm sm:text-base font-black">
                  🏦 ገንዘብ የሚቀበሉበትን ባንክ / መንገድ ይምረጡ፦
                </h4>
              </div>

              {activeBanksList.length === 0 ? (
                <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-400 text-xs font-bold text-center">
                  ⚠️ ለጊዜው በአድሚን የነቁ ባንኮች የሉም።
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
                  <span>ቀጥል ({selectedBank})</span>
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
                  <span>ተመለስ (ባንክ ቀይር)</span>
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
                      የእርስዎ {selectedBank === 'Abyssinia' ? 'BOA' : selectedBank} ሂሳብ / ስልክ ቁጥር፦
                    </label>
                    {(selectedBank === 'Telebirr' || selectedBank === 'M-Pesa') && (
                      <button
                        type="button"
                        onClick={() => setWithAccount(currentUser.phone)}
                        className="text-[11px] font-extrabold text-amber-400 hover:underline cursor-pointer"
                      >
                        ስልኬን ሙላ
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
                  <label className="block text-xs font-bold mb-1">የሂሳብ ባለቤት ሙሉ ስም፦</label>
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
                <span>✅ አረጋግጥና ወጪ ጠይቅ ({withAmount} ETB → {selectedBank === 'Abyssinia' ? 'BOA' : selectedBank})</span>
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
