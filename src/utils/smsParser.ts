export type BankMethodId = 'CBE' | 'Abyssinia' | 'Telebirr' | 'M-Pesa';
export type DetectedTxType = 'deposit' | 'withdraw' | null;

export interface ParsedEthiopianSmsResult {
  amount: number | null;
  referenceNumber: string | null;
  detectedBank: BankMethodId | null;
  detectedType: DetectedTxType;
}

/**
 * Normalizes a transaction reference number so duplicate checks are 100% reliable
 * (uppercase, strips spaces/dashes/punctuation).
 */
export function normalizeTransactionReference(rawRef?: string | null): string {
  if (!rawRef) return '';
  return String(rawRef)
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

/**
 * Smart parser for Ethiopian Bank & Mobile Money SMS Receipts (CBE, Telebirr, Bank of Abyssinia / BOA, M-Pesa)
 * Accurately extracts:
 *   1. The transferred / credited / received / debited ETB amount (ignoring 13-digit account numbers, phone numbers, dates, and remaining balance)
 *   2. The Transaction ID / Reference Number (e.g., FT..., TB..., DCO..., BOA..., MP..., or any alphanumeric receipt ID)
 *   3. The Bank / Mobile Money method
 *   4. Whether the SMS represents a Deposit (ገቢ) or a Withdrawal / Payout (ወጪ)
 */
export function parseEthiopianPaymentSms(rawText: string): ParsedEthiopianSmsResult {
  const text = (rawText || '').trim();
  if (!text) {
    return { amount: null, referenceNumber: null, detectedBank: null, detectedType: null };
  }

  // 1. Detect Bank / Payment Method from SMS keywords
  let detectedBank: BankMethodId | null = null;
  if (/telebirr|ethio\s*telecom|127\b/i.test(text)) {
    detectedBank = 'Telebirr';
  } else if (/abyssinia|\bboa\b|apollo/i.test(text)) {
    detectedBank = 'Abyssinia';
  } else if (/m-?pesa|safaricom/i.test(text)) {
    detectedBank = 'M-Pesa';
  } else if (/commercial\s*bank|\bcbe\b|1000\d{7,}|\bft[0-9a-z]{5,}/i.test(text)) {
    detectedBank = 'CBE';
  }

  // 1B. Automatically detect Transaction Type: Deposit (ገቢ) vs Withdraw (ወጪ)
  let detectedType: DetectedTxType = null;
  const mentionsMerchantAccount =
    /0942742684|251942742684|1000112964936|66816532|0711742684|ezana/i.test(text);

  if (
    /\b(?:withdraw(?:al|n)?|cash\s*out|payout|ወጪ|ተቀንሷል|ወጪ\s*ተደርጓል|ገንዘብ\s*ማውጣት)\b/i.test(text) &&
    !mentionsMerchantAccount
  ) {
    detectedType = 'withdraw';
  } else if (
    /\b(?:debited\s+from\s+your\s+account)\b/i.test(text) &&
    !mentionsMerchantAccount &&
    !/transferred\s+to/i.test(text)
  ) {
    detectedType = 'withdraw';
  } else if (
    mentionsMerchantAccount ||
    /\b(?:deposit(?:ed)?|credited|received|transferred|paid|sent|ገቢ|ተልኳል|ከፍለዋል|ገቢ\s*ተደርጓል)\b/i.test(
      text
    )
  ) {
    detectedType = 'deposit';
  }

  // 2. Extract Transaction ID / Reference Number
  let referenceNumber: string | null = null;

  const refPatterns: RegExp[] = [
    // Explicit labels: "transaction number is DCO8912...", "Transaction ID: TB...", "Ref No: FT...", "Receipt No. ...", "trx id ..."
    /(?:transaction\s*(?:number|no|id)|trans\.?\s*(?:id|no)|trx\s*(?:id|no)|ref(?:erence)?\s*(?:no|number|id)?|receipt\s*(?:no|number|id)?|የግብይት\s*ቁጥር|ደረሰኝ\s*ቁጥር)\s*(?:is|:|=|-|\.)?\s*([A-Z0-9]{5,24})/i,
    // URL query param in CBE / BOA / Telebirr links: ?id=FT24... or /receipt/DCO...
    /[?&/](?:id|ref|trx|tx)=([A-Z0-9]{5,24})/i,
    // Standard CBE FT code (e.g., FT26108XYZ89)
    /\b(FT[A-Z0-9]{6,18})\b/i,
    // Standard Telebirr codes (often 10 chars starting with D, C, B, A, T, e.g. DCO412389A, TB9845123, etc.)
    /\b((?:TB|DC|DB|DA|CB|CA|BA|BB|BC)[A-Z0-9]{6,16})\b/i,
    // Standard BOA / M-Pesa codes
    /\b((?:BOA|MP)[A-Z0-9]{5,16})\b/i,
  ];

  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = normalizeTransactionReference(match[1]);
      // Make sure candidate is not just the word "NUMBER" or "CREDITED" or a pure 10-digit phone number
      if (
        candidate.length >= 5 &&
        !/^(?:NUMBER|CREDITED|RECEIVED|TRANSFERRED|ACCOUNT|BALANCE|CUSTOMER|ETB|BIRR)$/i.test(
          candidate
        ) &&
        !/^(?:09|07|251)\d{7,9}$/.test(candidate) &&
        !/^1000\d{8,11}$/.test(candidate)
      ) {
        referenceNumber = candidate;
        break;
      }
    }
  }

  // If the user pasted ONLY a reference code (single token 5-22 chars with letters & digits, not a phone/account)
  if (!referenceNumber) {
    const singleToken = text.replace(/\s+/g, '');
    if (
      /^[A-Z0-9-]{5,22}$/i.test(singleToken) &&
      /[0-9]/.test(singleToken) &&
      (/[A-Z]/i.test(singleToken) || singleToken.length >= 6) &&
      !/^(?:09|07)\d{8}$/.test(singleToken) &&
      !/^1000\d{8,11}$/.test(singleToken)
    ) {
      // Only treat as pure reference if it's not a small plain deposit number like "500"
      const asNum = Number(singleToken);
      if (!Number.isFinite(asNum) || singleToken.length >= 6) {
        referenceNumber = normalizeTransactionReference(singleToken);
      }
    }
  }

  if (referenceNumber && !detectedType) {
    detectedType = 'deposit';
  }

  // 3. Extract Transferred / Received / Credited Amount (ETB / Birr / ብር)
  // First strip out balance sentences ("Your current balance is ETB ...", "Available balance ...", "Service fee ...")
  // AND strip out Ethiopian phone numbers (+2519..., 2519..., 09..., 07...), 13-digit bank account numbers,
  // dates (08/10/2026), times (14:25:10), and extracted reference codes so they are NEVER mistaken for the ETB amount!
  let textWithoutNoise = text
    .replace(
      /(?:current|available|new|total|remaining|account|book|clear|ledger|ዋና|ቀሪ)\s*(?:account\s*)?(?:balance|bal|ሂሳብ|ሒሳብ)\s*(?:is|:|=|-)?\s*(?:etb|birr|br|ብር)?\.?\s*[\d,]+(?:\.\d{1,2})?\s*(?:etb|birr|br|ብር)?/gi,
      ' '
    )
    .replace(
      /(?:service\s*(?:charge|fee)|commission|vat|tax|ክፍያ|ኮሚሽን)\s*(?:is|:|=|-)?\s*(?:etb|birr|br|ብር)?\.?\s*[\d,]+(?:\.\d{1,2})?\s*(?:etb|birr|br|ብር)?/gi,
      ' '
    )
    .replace(/\+?251[79]\d{8}\b/g, ' ')
    .replace(/\b0[79]\d{8}\b/g, ' ')
    .replace(/\b1000\d{7,11}\b/g, ' ')
    .replace(/\b66816532\b/g, ' ')
    .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, ' ')
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, ' ');

  if (referenceNumber) {
    const escapedRef = referenceNumber.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    textWithoutNoise = textWithoutNoise.replace(new RegExp(escapedRef, 'gi'), ' ');
  }

  let amount: number | null = null;

  const amountPatterns: RegExp[] = [
    // 1. Action + Currency + Amount: "transferred ETB 1,500.00", "credited with ETB 1,500.00", "received ETB 1,500"
    /(?:transferred|received|credited(?:\s+with)?|debited(?:\s+with)?|paid|sent|deposit(?:ed)?|withdraw(?:n|al)?|amount(?:\s+of)?|sum\s+of)\s*(?:etb|birr|br\.?|ብር)?\.?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:etb|birr|br\.?|ብር)?/i,
    // 2. Currency right before number: "ETB 1,500.00", "ETB1,500", "Birr 1,500.00", "ብር 1,500", "Br. 1,500"
    /(?:^|[^a-zA-Z])(?:etb|birr|br\.?|ብር)\.?\s*:?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // 3. Number right before Currency: "1,500.00 ETB", "1,500 Birr", "1,500 ብር", "1500ብር"
    /([\d,]+(?:\.\d{1,2})?)\s*(?:etb|birr|br\.?|ብር)(?:[^a-zA-Z]|$)/i,
    // 4. Amharic action keywords: "1,500 ብር ገቢ", "መጠን: 1,500", "የተላከው: 1,500", "ወጪ: 500"
    /(?:መጠን|የተላከው|የተከፈለው|ገቢ\s*የተደረገው|ወጪ\s*የተደረገው|ገቢ|ወጪ|ብር\s*መጠን)\s*(?:is|:|=|-)?\s*(?:etb|birr|br\.?|ብር)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // 5. Formatted currency number with comma or .00 decimals (e.g., "1,500" or "1500.00" or "1,500.00")
    /\b(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})\b/,
  ];

  for (const pattern of amountPatterns) {
    const match = textWithoutNoise.match(pattern);
    if (match && match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ''));
      if (Number.isFinite(cleanNum) && cleanNum >= 5 && cleanNum <= 500000) {
        amount = cleanNum;
        break;
      }
    }
  }

  // 6. If still null and the input contains a standalone number (e.g. user typed "1,500" or "1500 FT26108XYZ")
  if (amount === null) {
    const standaloneMatches = textWithoutNoise.match(/\b(\d{1,3}(?:,\d{3})+|\d{2,6})(?:\.\d{1,2})?\b/g);
    if (standaloneMatches) {
      for (const token of standaloneMatches) {
        const cleanNum = parseFloat(token.replace(/,/g, ''));
        // Ignore year numbers like 2025/2026 if there are other tokens, or accept if it's the only number
        if (
          Number.isFinite(cleanNum) &&
          cleanNum >= 10 &&
          cleanNum <= 500000 &&
          (standaloneMatches.length === 1 || (cleanNum !== 2025 && cleanNum !== 2026))
        ) {
          amount = cleanNum;
          break;
        }
      }
    }
  }

  return {
    amount,
    referenceNumber,
    detectedBank,
    detectedType,
  };
}

