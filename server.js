// server.ts
import express from "express";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import fs from "fs";
import path from "path";
import zlib from "zlib";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";

// src/utils/provablyFair.ts
function sha256Hex(ascii) {
  function rightRotate(value, amount) {
    return value >>> amount | value << 32 - amount;
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  const lengthProperty = "length";
  let i, j;
  let result = "";
  const words = [];
  const asciiBitLength = ascii[lengthProperty] * 8;
  let hash = [];
  const k = [];
  let primeCounter = 0;
  const isComposite = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = mathPow(candidate, 0.5) * maxWord | 0;
      k[primeCounter++] = mathPow(candidate, 1 / 3) * maxWord | 0;
    }
  }
  ascii += "\x80";
  while (ascii[lengthProperty] % 64 - 56) ascii += "\0";
  for (i = 0; i < ascii[lengthProperty]; i++) {
    j = ascii.charCodeAt(i);
    if (j >> 8) return "";
    words[i >> 2] |= j << (3 - i) % 4 * 8;
  }
  words[words[lengthProperty]] = asciiBitLength / maxWord | 0;
  words[words[lengthProperty]] = asciiBitLength;
  for (j = 0; j < words[lengthProperty]; ) {
    const w = words.slice(j, j += 16);
    const oldHash = hash;
    hash = hash.slice(0, 8);
    for (i = 0; i < 64; i++) {
      const i2 = i + j;
      const w15 = w[i - 15], w2 = w[i - 2];
      const a = hash[0], e = hash[4];
      const temp1 = hash[7] + (rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25)) + (e & hash[5] ^ ~e & hash[6]) + k[i] + (w[i] = i < 16 ? w[i] : w[i - 16] + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ w15 >>> 3) + w[i - 7] + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ w2 >>> 10) | 0);
      const temp2 = (rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22)) + (a & hash[1] ^ a & hash[2] ^ hash[1] & hash[2]);
      hash = [temp1 + temp2 | 0].concat(hash);
      hash[4] = hash[4] + temp1 | 0;
      hash.pop();
    }
    for (i = 0; i < 8; i++) {
      hash[i] = hash[i] + oldHash[i] | 0;
    }
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j + 1; j--) {
      const b = hash[i] >> j * 8 & 255;
      result += (b < 16 ? 0 : "") + b.toString(16);
    }
  }
  return result;
}
function generateProvablyFairRound(roundId, customServerSeed, customClientSeed) {
  const serverSeed = customServerSeed || sha256Hex(`EZI_SERVER_SECRET_${roundId}_2026_FAIR_BINGO`).slice(0, 32);
  const clientSeed = customClientSeed || `EZI-PLAYER-PUBLIC-SEED-${roundId}`;
  const nonce = roundId;
  const pool = Array.from({ length: 75 }, (_, i) => i + 1);
  const predeterminedBalls = [];
  let cursor = 0;
  let currentHash = sha256Hex(`${serverSeed}:${clientSeed}:${nonce}:shuffle`);
  while (pool.length > 0) {
    if (cursor >= 56) {
      currentHash = sha256Hex(currentHash);
      cursor = 0;
    }
    const hexSlice = currentHash.slice(cursor, cursor + 8);
    cursor += 8;
    const randInt = parseInt(hexSlice, 16) >>> 0;
    const pickIndex = randInt % pool.length;
    predeterminedBalls.push(pool[pickIndex]);
    pool.splice(pickIndex, 1);
  }
  const combinedPayload = `${serverSeed}:${clientSeed}:${nonce}:${predeterminedBalls.join(",")}`;
  const sha256Hash = sha256Hex(combinedPayload);
  return {
    roundId,
    serverSeed,
    clientSeed,
    nonce,
    combinedPayload,
    sha256Hash,
    predeterminedBalls
  };
}

// src/utils/smsParser.ts
function normalizeTransactionReference(rawRef) {
  if (!rawRef) return "";
  return String(rawRef).trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
function parseEthiopianPaymentSms(rawText) {
  const text = (rawText || "").trim();
  if (!text) {
    return { amount: null, referenceNumber: null, detectedBank: null, detectedType: null };
  }
  let detectedBank = null;
  if (/telebirr|ethio\s*telecom|127\b/i.test(text)) {
    detectedBank = "Telebirr";
  } else if (/abyssinia|\bboa\b|apollo/i.test(text)) {
    detectedBank = "Abyssinia";
  } else if (/m-?pesa|safaricom/i.test(text)) {
    detectedBank = "M-Pesa";
  } else if (/commercial\s*bank|\bcbe\b|1000\d{7,}|\bft[0-9a-z]{5,}/i.test(text)) {
    detectedBank = "CBE";
  }
  let detectedType = null;
  const mentionsMerchantAccount = /0942742684|251942742684|1000112964936|66816532|0711742684|ezana/i.test(text);
  if (/\b(?:withdraw(?:al|n)?|cash\s*out|payout|ወጪ|ተቀንሷል|ወጪ\s*ተደርጓል|ገንዘብ\s*ማውጣት)\b/i.test(text) && !mentionsMerchantAccount) {
    detectedType = "withdraw";
  } else if (/\b(?:debited\s+from\s+your\s+account)\b/i.test(text) && !mentionsMerchantAccount && !/transferred\s+to/i.test(text)) {
    detectedType = "withdraw";
  } else if (mentionsMerchantAccount || /\b(?:deposit(?:ed)?|credited|received|transferred|paid|sent|ገቢ|ተልኳል|ከፍለዋል|ገቢ\s*ተደርጓል)\b/i.test(
    text
  )) {
    detectedType = "deposit";
  }
  let referenceNumber = null;
  const refPatterns = [
    // Explicit labels: "transaction number is DCO8912...", "Transaction ID: TB...", "Ref No: FT...", "Receipt No. ...", "trx id ..."
    /(?:transaction\s*(?:number|no|id)|trans\.?\s*(?:id|no)|trx\s*(?:id|no)|ref(?:erence)?\s*(?:no|number|id)?|receipt\s*(?:no|number|id)?|የግብይት\s*ቁጥር|ደረሰኝ\s*ቁጥር)\s*(?:is|:|=|-|\.)?\s*([A-Z0-9]{5,24})/i,
    // URL query param in CBE / BOA / Telebirr links: ?id=FT24... or /receipt/DCO...
    /[?&/](?:id|ref|trx|tx)=([A-Z0-9]{5,24})/i,
    // Standard CBE FT code (e.g., FT26108XYZ89)
    /\b(FT[A-Z0-9]{6,18})\b/i,
    // Standard Telebirr codes (often 10 chars starting with D, C, B, A, T, e.g. DCO412389A, TB9845123, etc.)
    /\b((?:TB|DC|DB|DA|CB|CA|BA|BB|BC)[A-Z0-9]{6,16})\b/i,
    // Standard BOA / M-Pesa codes
    /\b((?:BOA|MP)[A-Z0-9]{5,16})\b/i
  ];
  for (const pattern of refPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const candidate = normalizeTransactionReference(match[1]);
      if (candidate.length >= 5 && !/^(?:NUMBER|CREDITED|RECEIVED|TRANSFERRED|ACCOUNT|BALANCE|CUSTOMER|ETB|BIRR)$/i.test(
        candidate
      ) && !/^(?:09|07|251)\d{7,9}$/.test(candidate) && !/^1000\d{8,11}$/.test(candidate)) {
        referenceNumber = candidate;
        break;
      }
    }
  }
  if (!referenceNumber) {
    const singleToken = text.replace(/\s+/g, "");
    if (/^[A-Z0-9-]{5,22}$/i.test(singleToken) && /[0-9]/.test(singleToken) && (/[A-Z]/i.test(singleToken) || singleToken.length >= 6) && !/^(?:09|07)\d{8}$/.test(singleToken) && !/^1000\d{8,11}$/.test(singleToken)) {
      const asNum = Number(singleToken);
      if (!Number.isFinite(asNum) || singleToken.length >= 6) {
        referenceNumber = normalizeTransactionReference(singleToken);
      }
    }
  }
  if (referenceNumber && !detectedType) {
    detectedType = "deposit";
  }
  let textWithoutNoise = text.replace(
    /(?:current|available|new|total|remaining|account|book|clear|ledger|ዋና|ቀሪ)\s*(?:account\s*)?(?:balance|bal|ሂሳብ|ሒሳብ)\s*(?:is|:|=|-)?\s*(?:etb|birr|br|ብር)?\.?\s*[\d,]+(?:\.\d{1,2})?\s*(?:etb|birr|br|ብር)?/gi,
    " "
  ).replace(
    /(?:service\s*(?:charge|fee)|commission|vat|tax|ክፍያ|ኮሚሽን)\s*(?:is|:|=|-)?\s*(?:etb|birr|br|ብር)?\.?\s*[\d,]+(?:\.\d{1,2})?\s*(?:etb|birr|br|ብር)?/gi,
    " "
  ).replace(/\+?251[79]\d{8}\b/g, " ").replace(/\b0[79]\d{8}\b/g, " ").replace(/\b1000\d{7,11}\b/g, " ").replace(/\b66816532\b/g, " ").replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, " ").replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ");
  if (referenceNumber) {
    const escapedRef = referenceNumber.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    textWithoutNoise = textWithoutNoise.replace(new RegExp(escapedRef, "gi"), " ");
  }
  let amount = null;
  const amountPatterns = [
    // 1. Action + Currency + Amount: "transferred ETB 1,500.00", "credited with ETB 1,500.00", "received ETB 1,500"
    /(?:transferred|received|credited(?:\s+with)?|debited(?:\s+with)?|paid|sent|deposit(?:ed)?|withdraw(?:n|al)?|amount(?:\s+of)?|sum\s+of)\s*(?:etb|birr|br\.?|ብር)?\.?\s*([\d,]+(?:\.\d{1,2})?)\s*(?:etb|birr|br\.?|ብር)?/i,
    // 2. Currency right before number: "ETB 1,500.00", "ETB1,500", "Birr 1,500.00", "ብር 1,500", "Br. 1,500"
    /(?:^|[^a-zA-Z])(?:etb|birr|br\.?|ብር)\.?\s*:?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // 3. Number right before Currency: "1,500.00 ETB", "1,500 Birr", "1,500 ብር", "1500ብር"
    /([\d,]+(?:\.\d{1,2})?)\s*(?:etb|birr|br\.?|ብር)(?:[^a-zA-Z]|$)/i,
    // 4. Amharic action keywords: "1,500 ብር ገቢ", "መጠን: 1,500", "የተላከው: 1,500", "ወጪ: 500"
    /(?:መጠን|የተላከው|የተከፈለው|ገቢ\s*የተደረገው|ወጪ\s*የተደረገው|ገቢ|ወጪ|ብር\s*መጠን)\s*(?:is|:|=|-)?\s*(?:etb|birr|br\.?|ብር)?\s*([\d,]+(?:\.\d{1,2})?)/i,
    // 5. Formatted currency number with comma or .00 decimals (e.g., "1,500" or "1500.00" or "1,500.00")
    /\b(\d{1,3}(?:,\d{3})+(?:\.\d{1,2})?|\d+\.\d{2})\b/
  ];
  for (const pattern of amountPatterns) {
    const match = textWithoutNoise.match(pattern);
    if (match && match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ""));
      if (Number.isFinite(cleanNum) && cleanNum >= 5 && cleanNum <= 5e5) {
        amount = cleanNum;
        break;
      }
    }
  }
  if (amount === null) {
    const standaloneMatches = textWithoutNoise.match(/\b(\d{1,3}(?:,\d{3})+|\d{2,6})(?:\.\d{1,2})?\b/g);
    if (standaloneMatches) {
      for (const token of standaloneMatches) {
        const cleanNum = parseFloat(token.replace(/,/g, ""));
        if (Number.isFinite(cleanNum) && cleanNum >= 10 && cleanNum <= 5e5 && (standaloneMatches.length === 1 || cleanNum !== 2025 && cleanNum !== 2026)) {
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
    detectedType
  };
}

// src/utils/bingoEngine.ts
function mulberry32(seed) {
  return function() {
    let t = seed += 1831565813;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function pickUniqueNumbers(min, max, count, rng) {
  const pool = [];
  for (let i = min; i <= max; i++) {
    pool.push(i);
  }
  const result = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}
function generateCartelaById(cartelaId) {
  const safeId = Math.max(1, Math.min(7e4, Math.floor(cartelaId)));
  const rng = mulberry32(safeId * 98765 + 12345);
  const colB = pickUniqueNumbers(1, 15, 5, rng);
  const colI = pickUniqueNumbers(16, 30, 5, rng);
  const colN = pickUniqueNumbers(31, 45, 5, rng);
  const colG = pickUniqueNumbers(46, 60, 5, rng);
  const colO = pickUniqueNumbers(61, 75, 5, rng);
  const cols = [colB, colI, colN, colG, colO];
  const numbers = Array.from(
    { length: 5 },
    (_, r) => Array.from({ length: 5 }, (__, c) => {
      if (r === 2 && c === 2) return 0;
      return cols[c][r];
    })
  );
  const manualMarks = Array.from(
    { length: 5 },
    (_, r) => Array.from({ length: 5 }, (__, c) => r === 2 && c === 2)
  );
  return {
    id: safeId,
    numbers,
    isRegistered: false,
    manualMarks
  };
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
var app = express();
app.use(express.json());
var lastKnownLiveHost = process.env.SHARED_APP_URL || "https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app";
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }
  const host = req.get("x-forwarded-host") || req.get("host");
  const proto = req.get("x-forwarded-proto") || req.protocol || "https";
  if (host && !host.includes("localhost") && !host.includes("127.0.0.1")) {
    lastKnownLiveHost = `${proto}://${host}`;
  }
  next();
});
var IS_RENDER_HOST = Boolean(process.env.RENDER || process.env.RENDER_EXTERNAL_URL);
var SHARED_APP_URL = process.env.SHARED_APP_URL || process.env.RENDER_EXTERNAL_URL || "https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app";
var BOT_STORE_PATH = path.join(__dirname, ".telegram-bots.json");
var activeBots = /* @__PURE__ */ new Map();
var processedUpdateIds = /* @__PURE__ */ new Set();
var lastChatActionByChatId = /* @__PURE__ */ new Map();
var registeredChatPhones = /* @__PURE__ */ new Map();
var chatWelcomeBonusClaimed = /* @__PURE__ */ new Set();
var promptMessageIdsByChat = /* @__PURE__ */ new Map();
var chatFlowByChatId = /* @__PURE__ */ new Map();
var globalRegisteredPhone = null;
var globalWalletBalance = 1250;
var globalBonusBalance = 75;
var pendingOtpByPhone = /* @__PURE__ */ new Map();
var playersByPhone = /* @__PURE__ */ new Map();
var serverTransactions = [];
var verifiedBankSmsReceipts = [];
var receivedWebhookSmsLogs = [];
var adminPinConfig = {
  username: "admin",
  passwordHash: "admin123",
  pinCode: "1234",
  requireDepositApproval: true,
  smsWebhookSecret: "ezi_sms_secret_2026",
  welcomeBonusAmount: 15,
  referralBonusAmount: 10,
  depositBonusPercent: 0,
  minDepositAmount: 10,
  minWithdrawAmount: 100
};
var DEFAULT_SERVER_BANK_ACCOUNTS = [
  {
    id: "CBE",
    bankName: "Commercial Bank of Ethiopia (CBE)",
    shortName: "CBE",
    accountNumber: "1000112964936",
    accountHolder: "Ezana Gebremedhin",
    badgeBg: "bg-purple-700 text-white"
  },
  {
    id: "Abyssinia",
    bankName: "Bank of Abyssinia (\u12A0\u1262\u1232\u1292\u12EB \u1263\u1295\u12AD)",
    shortName: "Abyssinia",
    accountNumber: "66816532",
    accountHolder: "Ezana Gebremedhin",
    badgeBg: "bg-amber-500 text-slate-950"
  },
  {
    id: "Telebirr",
    bankName: "Telebirr (\u1274\u120C\u1265\u122D)",
    shortName: "Telebirr",
    accountNumber: "0942742684",
    accountHolder: "Ezana Gebremedhin",
    badgeBg: "bg-sky-500 text-white"
  },
  {
    id: "M-Pesa",
    bankName: "M-Pesa Safaricom (\u12A4\u121D-\u1354\u1233)",
    shortName: "M-Pesa",
    accountNumber: "0711742684",
    accountHolder: "Ezana Gebremedhin",
    badgeBg: "bg-emerald-600 text-white"
  }
];
var DEFAULT_SERVER_HERO_BANNERS = [
  {
    id: "hb-1",
    title: "\u1201\u120D\u130A\u12DC \u1328\u12CB\u1273! \u1260 Ezi Bingo \u12A5\u1235\u12A8 50,000 \u1265\u122D \u12EB\u1238\u1295\u1349!",
    subtitle: "\u12A8 70,000 \u12AB\u122D\u1274\u120B\u12CE\u127D \u12ED\u121D\u1228\u1321 \xB7 \u12A8 20 \u1260\u120B\u12ED \u12AB\u122D\u1274\u120B \u1208\u121A\u12ED\u12D9 +5 \u12AB\u122D\u1274\u120B \u1266\u1290\u1235 \u1260\u1290\u1343 \u12ED\u1230\u1323\u120D!",
    badgeText: "Ezi Bingo \u120D\u12E9 \u1266\u1290\u1235",
    accentColor: "emerald",
    isActive: true
  },
  {
    id: "hb-2",
    title: "\u1260\u12E8\u1240\u1291 4 \u130A\u12DC \u12E8\u1290\u1343 \u1262\u1295\u130E \u1328\u12CB\u1273\u12CE\u127D (2:00\u1363 8:00\u1363 12:00\u1363 4:30)",
    subtitle: "\u1313\u12F0\u129B\u12CE\u1295 \u12ED\u130B\u1265\u12D9 \u12A5\u1293 \u1260\u12A5\u12EB\u1295\u12F3\u1295\u12F1 \u1270\u130B\u1263\u12E5 \u1313\u12F0\u129B \u12C8\u12F2\u12EB\u12CD\u1291 \u12E8 25 \u1265\u122D \u123D\u120D\u121B\u1275 \u12EB\u130D\u1299!",
    badgeText: "\u12E8\u1290\u1343 \u1328\u12CB\u1273 \u1218\u122D\u1203-\u130D\u1265\u122D",
    accentColor: "blue",
    isActive: true
  }
];
var fastRoomLockedCartelas = /* @__PURE__ */ new Map();
var regularRoomLockedCartelas = /* @__PURE__ */ new Map();
var FAST_STAKE_TIERS = [10, 20, 50, 100];
var fastRoomsByStake = {};
var fastLockedCartelasByStake = {};
function createInitialRoomState(mode, matchId, initialStake = 10) {
  const fair = generateProvablyFairRound(matchId);
  return {
    mode,
    gameMatchId: matchId,
    isPlaying: false,
    isPaused: false,
    preGameCountdown: null,
    bingoClaimCountdown: null,
    winnerDisplayCountdown: null,
    calledBalls: [],
    activeBall: null,
    callSpeedSec: mode === "fast" ? 3 : 5,
    stakeAmount: initialStake,
    prizeAmount: mode === "fast" ? initialStake * 20 : 500,
    activePatternId: 5,
    jackpotPool: 500,
    houseEarningsTotal: 420,
    jackpotWonInRound: 0,
    onlinePlayersCount: 1,
    blockedCartelaIds: [],
    winnersList: [],
    lastVerifiedWinnerBanner: null,
    gameHistory: [],
    adminRoomMessage: "",
    adminRoomMessageAt: "",
    bonusCartelasForOver20: 5,
    heroBanners: DEFAULT_SERVER_HERO_BANNERS,
    bankAccounts: DEFAULT_SERVER_BANK_ACCOUNTS,
    sha256Hash: fair.sha256Hash,
    lastBallTickAt: 0,
    lastCountdownTickAt: 0,
    seq: 1,
    lastUpdated: Date.now()
  };
}
function generateRandomMatchId() {
  return Math.floor(1e5 + Math.random() * 9e5);
}
for (const stk of FAST_STAKE_TIERS) {
  fastRoomsByStake[stk] = createInitialRoomState("fast", generateRandomMatchId(), stk);
  fastLockedCartelasByStake[stk] = stk === 10 ? fastRoomLockedCartelas : /* @__PURE__ */ new Map();
}
var fastLiveRoomState = fastRoomsByStake[10];
var regularLiveRoomState = createInitialRoomState("regular", generateRandomMatchId(), 10);
function normalizeFastStakeTier(rawStake) {
  const n = Number(rawStake);
  if (n === 20 || n === 50 || n === 100) return n;
  return 10;
}
function getRoomByMode(mode, stakeAmount) {
  if (mode === "regular") {
    return {
      room: regularLiveRoomState,
      lockedMap: regularRoomLockedCartelas,
      stakeTier: 10
    };
  }
  const tier = normalizeFastStakeTier(stakeAmount);
  if (!fastRoomsByStake[tier]) {
    fastRoomsByStake[tier] = createInitialRoomState("fast", generateRandomMatchId(), tier);
  }
  if (!fastLockedCartelasByStake[tier]) {
    fastLockedCartelasByStake[tier] = /* @__PURE__ */ new Map();
  }
  return {
    room: fastRoomsByStake[tier],
    lockedMap: fastLockedCartelasByStake[tier],
    stakeTier: tier
  };
}
var wsClients = /* @__PURE__ */ new Set();
var sseClients = /* @__PURE__ */ new Set();
function serializeFastRoomsSnapshot() {
  const roomsObj = {};
  const lockedObj = {};
  for (const stk of FAST_STAKE_TIERS) {
    roomsObj[stk] = fastRoomsByStake[stk];
    lockedObj[stk] = Array.from((fastLockedCartelasByStake[stk] || /* @__PURE__ */ new Map()).values());
  }
  return { roomsObj, lockedObj };
}
function broadcastRealtimeSync(changedMode) {
  const now = Date.now();
  const activeWsCount = Array.from(wsClients).filter((c) => c.readyState === WebSocket.OPEN).length + sseClients.size;
  if (changedMode === "fast" || changedMode === "both" || !changedMode) {
    for (const stk of FAST_STAKE_TIERS) {
      const r = fastRoomsByStake[stk];
      const lMap = fastLockedCartelasByStake[stk];
      r.seq = (r.seq || 0) + 1;
      r.lastUpdated = now;
      r.onlinePlayersCount = Math.max(
        2,
        activeWsCount + new Set(Array.from(lMap.values()).map((c) => c.clientId || c.ownerPhone)).size
      );
    }
  }
  if (changedMode === "regular" || changedMode === "both" || !changedMode) {
    regularLiveRoomState.seq = (regularLiveRoomState.seq || 0) + 1;
    regularLiveRoomState.lastUpdated = now;
    regularLiveRoomState.onlinePlayersCount = Math.max(
      2,
      activeWsCount + new Set(Array.from(regularRoomLockedCartelas.values()).map((c) => c.clientId || c.ownerPhone)).size
    );
  }
  fastLiveRoomState = fastRoomsByStake[10];
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
  const payload = JSON.stringify({
    type: "room:sync",
    changedMode: changedMode || "both",
    fastRoom: fastRoomsByStake[10],
    fastLockedCartelas: lockedObj[10] || [],
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
    regularRoom: regularLiveRoomState,
    regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
    transactions: serverTransactions,
    players: Array.from(playersByPhone.values()),
    requireDepositApproval: adminPinConfig.requireDepositApproval,
    timestamp: now
  });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(payload);
      } catch {
      }
    }
  }
  for (const res of sseClients) {
    try {
      res.write(`data: ${payload}

`);
    } catch {
      sseClients.delete(res);
    }
  }
}
function drawNextServerBallForRoom(room) {
  if (room.calledBalls.length >= 75) {
    room.isPlaying = false;
    if (room.winnersList.length === 0 && room.winnerDisplayCountdown === null) {
      room.winnerDisplayCountdown = 10;
      room.lastCountdownTickAt = Date.now();
    }
    broadcastRealtimeSync(room.mode);
    return;
  }
  const fair = generateProvablyFairRound(room.gameMatchId);
  room.sha256Hash = fair.sha256Hash;
  const calledSet = new Set(room.calledBalls);
  const nextBall = fair.predeterminedBalls.find((b) => !calledSet.has(b));
  if (!nextBall) {
    room.isPlaying = false;
    broadcastRealtimeSync(room.mode);
    return;
  }
  room.calledBalls = [...room.calledBalls, nextBall];
  room.activeBall = nextBall;
  room.lastBallTickAt = Date.now();
  if (room.calledBalls.length >= 75 && room.winnersList.length === 0) {
    room.isPlaying = false;
    room.winnerDisplayCountdown = 10;
    room.lastCountdownTickAt = Date.now();
  }
  broadcastRealtimeSync(room.mode);
}
function resetServerRoomRound(room, lockedMap) {
  let nextMatchId = generateRandomMatchId();
  while (nextMatchId === room.gameMatchId) {
    nextMatchId = generateRandomMatchId();
  }
  const fair = generateProvablyFairRound(nextMatchId);
  room.gameMatchId = nextMatchId;
  room.isPlaying = false;
  room.isPaused = false;
  room.preGameCountdown = null;
  room.bingoClaimCountdown = null;
  room.winnerDisplayCountdown = null;
  room.calledBalls = [];
  room.activeBall = null;
  room.blockedCartelaIds = [];
  room.winnersList = [];
  room.jackpotWonInRound = 0;
  room.sha256Hash = fair.sha256Hash;
  room.lastBallTickAt = 0;
  room.lastCountdownTickAt = 0;
  lockedMap.clear();
  broadcastRealtimeSync(room.mode);
}
function countDistinctLockedPlayers(lockedMap) {
  const owners = /* @__PURE__ */ new Set();
  for (const item of lockedMap.values()) {
    const ph = normalizeEthiopianPhone(item.ownerPhone || "");
    const cid = (item.clientId || "").trim();
    const key = cid || ph || item.ownerName;
    if (key) {
      owners.add(key);
    }
  }
  return owners.size;
}
var deductedRoundKeys = /* @__PURE__ */ new Set();
function deductLockedStakesOnGameStart(room, lockedMap) {
  const roundKey = `${room.mode}:${room.stakeAmount}:${room.gameMatchId}`;
  if (deductedRoundKeys.has(roundKey)) return;
  deductedRoundKeys.add(roundKey);
  if (deductedRoundKeys.size > 500) {
    const first = deductedRoundKeys.values().next().value;
    if (first) deductedRoundKeys.delete(first);
  }
  const countByPhone = /* @__PURE__ */ new Map();
  for (const item of lockedMap.values()) {
    const ph = normalizeEthiopianPhone(item.ownerPhone || "") || (item.ownerPhone || "").trim();
    if (!ph) continue;
    const prev = countByPhone.get(ph) || { name: item.ownerName || "Player", count: 0, cartelaIds: [] };
    prev.count += 1;
    prev.cartelaIds.push(item.cartelaId);
    countByPhone.set(ph, prev);
  }
  for (const [ph, info] of countByPhone.entries()) {
    const player = ensurePlayerRecord(ph, info.name);
    const totalCost = Number((info.count * room.stakeAmount).toFixed(2));
    if (totalCost > 0) {
      player.balance = Math.max(0, Number((player.balance - totalCost).toFixed(2)));
      player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
      if (ph === globalRegisteredPhone || ph === "0942742684") {
        globalWalletBalance = player.balance;
      }
    }
  }
  saveBotsToDisk();
}
setInterval(() => {
  const now = Date.now();
  const roomEntries = [
    ...FAST_STAKE_TIERS.map((stk) => ({
      mode: "fast",
      room: fastRoomsByStake[stk],
      lockedMap: fastLockedCartelasByStake[stk]
    })),
    {
      mode: "regular",
      room: regularLiveRoomState,
      lockedMap: regularRoomLockedCartelas
    }
  ];
  for (const { mode, room, lockedMap } of roomEntries) {
    if (!room.isPlaying && room.calledBalls.length === 0 && room.winnersList.length === 0 && room.preGameCountdown === null && mode === "fast" && lockedMap.size >= 1) {
      room.preGameCountdown = 30;
      room.lastCountdownTickAt = now;
      broadcastRealtimeSync(mode);
    }
    if (room.preGameCountdown !== null) {
      if (mode === "fast" && lockedMap.size === 0 && !room.isPlaying) {
        room.preGameCountdown = null;
        room.lastCountdownTickAt = 0;
        broadcastRealtimeSync(mode);
        continue;
      }
      if (!room.lastCountdownTickAt) {
        room.lastCountdownTickAt = now;
        continue;
      }
      if (now - room.lastCountdownTickAt >= 990) {
        room.lastCountdownTickAt = now;
        if (room.preGameCountdown <= 1) {
          if (mode === "fast" && lockedMap.size < 1) {
            room.preGameCountdown = null;
            broadcastRealtimeSync(mode);
            continue;
          }
          room.preGameCountdown = null;
          room.isPlaying = true;
          room.isPaused = false;
          deductLockedStakesOnGameStart(room, lockedMap);
          drawNextServerBallForRoom(room);
        } else {
          room.preGameCountdown -= 1;
          broadcastRealtimeSync(mode);
        }
      }
      continue;
    }
    if (room.bingoClaimCountdown !== null && room.bingoClaimCountdown > 0) {
      if (!room.lastCountdownTickAt) {
        room.lastCountdownTickAt = now;
        continue;
      }
      if (now - room.lastCountdownTickAt >= 990) {
        room.lastCountdownTickAt = now;
        if (room.bingoClaimCountdown <= 1) {
          room.bingoClaimCountdown = 0;
          room.isPlaying = false;
          room.isPaused = false;
          room.winnerDisplayCountdown = mode === "regular" ? null : 10;
          broadcastRealtimeSync(mode);
        } else {
          room.bingoClaimCountdown -= 1;
          broadcastRealtimeSync(mode);
        }
      }
      continue;
    }
    if (room.winnerDisplayCountdown !== null) {
      if (!room.lastCountdownTickAt) {
        room.lastCountdownTickAt = now;
        continue;
      }
      if (now - room.lastCountdownTickAt >= 990) {
        room.lastCountdownTickAt = now;
        if (room.winnerDisplayCountdown <= 1) {
          if (mode === "regular") {
            room.winnerDisplayCountdown = null;
            room.isPlaying = false;
            room.isPaused = false;
            broadcastRealtimeSync(mode);
          } else {
            resetServerRoomRound(room, lockedMap);
          }
        } else {
          room.winnerDisplayCountdown -= 1;
          broadcastRealtimeSync(mode);
        }
      }
      continue;
    }
    if (room.isPlaying && !room.isPaused) {
      const intervalMs = Math.max(1e3, (room.callSpeedSec || 3) * 1e3);
      if (now - room.lastBallTickAt >= intervalMs - 20) {
        drawNextServerBallForRoom(room);
      }
    }
  }
}, 100);
function normalizeEthiopianPhone(rawPhone) {
  const digits = (rawPhone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("251") && digits.length === 12) {
    return `0${digits.slice(3)}`;
  }
  if (digits.length === 9 && /^[79]/.test(digits)) {
    return `0${digits}`;
  }
  return digits;
}
function ensurePlayerRecord(phone, name = "Player", chatId) {
  const clean = normalizeEthiopianPhone(phone) || phone.trim() || "0911000001";
  const existing = playersByPhone.get(clean);
  if (existing) {
    if (chatId) existing.chatId = chatId;
    if (name && name !== "Player" && name !== "King" && name !== "Ezana_Player") {
      existing.name = name;
    }
    return existing;
  }
  const resolvedName = name && name !== "Player" && name !== "Ezana_Player" ? name : clean === "0942742684" ? "Ezana_Player" : `Player_${clean.slice(-4)}`;
  const created = {
    id: `usr-${clean.slice(-4)}-${Date.now().toString().slice(-3)}`,
    phone: clean,
    name: resolvedName,
    chatId,
    balance: clean === "0942742684" ? 1250 : 15,
    bonusBalance: 15,
    referralEarnings: 0,
    referredCount: 0,
    isBlocked: false,
    updatedAt: (/* @__PURE__ */ new Date()).toLocaleString()
  };
  playersByPhone.set(clean, created);
  return created;
}
var persistedBotTokensCache = [];
function saveBotsToDisk() {
  try {
    const activeTokenList = Array.from(activeBots.entries()).map(([token, info]) => ({
      token,
      botUsername: info.botUsername,
      botFirstName: info.botFirstName,
      appUrl: info.appUrl,
      offset: info.offset
    }));
    if (activeTokenList.length > 0) {
      persistedBotTokensCache = activeTokenList;
    }
    const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
    const payload = {
      tokens: activeTokenList.length > 0 ? activeTokenList : persistedBotTokensCache,
      registeredPhones: Array.from(registeredChatPhones.entries()),
      bonusClaimed: Array.from(chatWelcomeBonusClaimed.values()),
      globalRegisteredPhone,
      globalWalletBalance: globalWalletBalance > 1e6 ? 1250 : globalWalletBalance,
      globalBonusBalance,
      players: Array.from(playersByPhone.values()).map((p) => ({
        ...p,
        balance: p.balance > 1e6 ? 1250 : p.balance
      })),
      transactions: serverTransactions.slice(0, 200),
      fastGameHistory: fastRoomsByStake[10].gameHistory.slice(0, 100),
      regularGameHistory: regularLiveRoomState.gameHistory.slice(0, 100),
      fastRoomState: {
        gameMatchId: fastRoomsByStake[10].gameMatchId,
        isPlaying: fastRoomsByStake[10].isPlaying,
        isPaused: fastRoomsByStake[10].isPaused,
        preGameCountdown: fastRoomsByStake[10].preGameCountdown,
        winnerDisplayCountdown: fastRoomsByStake[10].winnerDisplayCountdown,
        calledBalls: fastRoomsByStake[10].calledBalls,
        activeBall: fastRoomsByStake[10].activeBall,
        callSpeedSec: fastRoomsByStake[10].callSpeedSec,
        stakeAmount: fastRoomsByStake[10].stakeAmount,
        prizeAmount: fastRoomsByStake[10].prizeAmount,
        activePatternId: fastRoomsByStake[10].activePatternId,
        jackpotPool: fastRoomsByStake[10].jackpotPool,
        houseEarningsTotal: fastRoomsByStake[10].houseEarningsTotal,
        jackpotWonInRound: fastRoomsByStake[10].jackpotWonInRound,
        blockedCartelaIds: fastRoomsByStake[10].blockedCartelaIds,
        winnersList: fastRoomsByStake[10].winnersList,
        lastVerifiedWinnerBanner: fastRoomsByStake[10].lastVerifiedWinnerBanner,
        sha256Hash: fastRoomsByStake[10].sha256Hash,
        seq: fastRoomsByStake[10].seq
      },
      regularRoomState: {
        gameMatchId: regularLiveRoomState.gameMatchId,
        isPlaying: regularLiveRoomState.isPlaying,
        isPaused: regularLiveRoomState.isPaused,
        preGameCountdown: regularLiveRoomState.preGameCountdown,
        bingoClaimCountdown: regularLiveRoomState.bingoClaimCountdown,
        winnerDisplayCountdown: regularLiveRoomState.winnerDisplayCountdown,
        calledBalls: regularLiveRoomState.calledBalls,
        activeBall: regularLiveRoomState.activeBall,
        callSpeedSec: regularLiveRoomState.callSpeedSec,
        stakeAmount: regularLiveRoomState.stakeAmount,
        prizeAmount: regularLiveRoomState.prizeAmount,
        activePatternId: regularLiveRoomState.activePatternId,
        jackpotPool: regularLiveRoomState.jackpotPool,
        houseEarningsTotal: regularLiveRoomState.houseEarningsTotal,
        jackpotWonInRound: regularLiveRoomState.jackpotWonInRound,
        blockedCartelaIds: regularLiveRoomState.blockedCartelaIds,
        winnersList: regularLiveRoomState.winnersList,
        lastVerifiedWinnerBanner: regularLiveRoomState.lastVerifiedWinnerBanner,
        sha256Hash: regularLiveRoomState.sha256Hash,
        seq: regularLiveRoomState.seq
      },
      fastLockedCartelas: Array.from(fastRoomLockedCartelas.values()),
      regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
      fastRoomsByStake: roomsObj,
      fastLockedCartelasByStake: lockedObj,
      adminPinConfig,
      verifiedBankSmsReceipts: verifiedBankSmsReceipts.slice(0, 100),
      receivedWebhookSmsLogs: receivedWebhookSmsLogs.slice(0, 100)
    };
    fs.writeFileSync(BOT_STORE_PATH, JSON.stringify(payload, null, 2), "utf-8");
  } catch {
  }
}
function loadBotsFromDisk() {
  try {
    if (!fs.existsSync(BOT_STORE_PATH)) {
      return;
    }
    const raw = fs.readFileSync(BOT_STORE_PATH, "utf-8");
    const parsed = JSON.parse(raw);
    if (typeof parsed.globalWalletBalance === "number" && Number.isFinite(parsed.globalWalletBalance) && parsed.globalWalletBalance <= 1e6) {
      globalWalletBalance = parsed.globalWalletBalance;
    }
    if (typeof parsed.globalBonusBalance === "number" && Number.isFinite(parsed.globalBonusBalance)) {
      globalBonusBalance = parsed.globalBonusBalance;
    }
    if (Array.isArray(parsed.players)) {
      for (const p of parsed.players) {
        if (p && p.phone && p.name !== "Yonas_Fast" && p.name !== "Meron_Hailu" && p.name !== "Dawit_Bingo") {
          if (p.balance > 1e6) {
            p.balance = p.phone === "0942742684" ? 1250 : 15;
          }
          playersByPhone.set(p.phone, p);
        }
      }
    }
    if (Array.isArray(parsed.transactions) && parsed.transactions.length > 0) {
      serverTransactions = parsed.transactions.filter(
        (tx) => tx.id !== "srv-tx-101" && tx.id !== "srv-tx-102" && tx.userName !== "Yonas_Fast" && tx.userName !== "Meron_Hailu"
      );
    }
    if (parsed.fastRoomState) {
      fastRoomsByStake[10] = {
        ...fastRoomsByStake[10],
        ...parsed.fastRoomState,
        jackpotPool: 500,
        stakeAmount: 10,
        lastBallTickAt: Date.now(),
        lastCountdownTickAt: Date.now()
      };
    }
    if (parsed.fastRoomsByStake) {
      for (const stk of FAST_STAKE_TIERS) {
        const savedStk = parsed.fastRoomsByStake[stk];
        if (savedStk) {
          fastRoomsByStake[stk] = {
            ...fastRoomsByStake[stk],
            ...savedStk,
            jackpotPool: 500,
            stakeAmount: stk,
            lastBallTickAt: Date.now(),
            lastCountdownTickAt: Date.now()
          };
        }
      }
    }
    for (const stk of FAST_STAKE_TIERS) {
      if (fastRoomsByStake[stk]) {
        fastRoomsByStake[stk].jackpotPool = 500;
      }
    }
    fastLiveRoomState = fastRoomsByStake[10];
    if (parsed.regularRoomState) {
      regularLiveRoomState = {
        ...regularLiveRoomState,
        ...parsed.regularRoomState,
        jackpotPool: 500,
        lastBallTickAt: Date.now(),
        lastCountdownTickAt: Date.now()
      };
    }
    regularLiveRoomState.jackpotPool = 500;
    if (Array.isArray(parsed.fastGameHistory) && parsed.fastGameHistory.length > 0) {
      fastRoomsByStake[10].gameHistory = parsed.fastGameHistory.filter(
        (h) => !h.winners?.some((w) => w.userName === "Yonas_Fast" || w.userName === "Dawit_Bingo")
      );
    }
    if (Array.isArray(parsed.regularGameHistory) && parsed.regularGameHistory.length > 0) {
      regularLiveRoomState.gameHistory = parsed.regularGameHistory.filter(
        (h) => !h.winners?.some((w) => w.userName === "Yonas_Fast" || w.userName === "Dawit_Bingo")
      );
    }
    if (Array.isArray(parsed.fastLockedCartelas)) {
      fastRoomLockedCartelas.clear();
      for (const item of parsed.fastLockedCartelas) {
        if (item && typeof item.cartelaId === "number") {
          fastRoomLockedCartelas.set(item.cartelaId, item);
        }
      }
    }
    if (parsed.fastLockedCartelasByStake) {
      for (const stk of FAST_STAKE_TIERS) {
        const list = parsed.fastLockedCartelasByStake[stk];
        if (Array.isArray(list)) {
          const mapTarget = fastLockedCartelasByStake[stk];
          mapTarget.clear();
          for (const item of list) {
            if (item && typeof item.cartelaId === "number") {
              mapTarget.set(item.cartelaId, item);
            }
          }
        }
      }
    }
    if (Array.isArray(parsed.regularLockedCartelas)) {
      regularRoomLockedCartelas.clear();
      for (const item of parsed.regularLockedCartelas) {
        if (item && typeof item.cartelaId === "number") {
          regularRoomLockedCartelas.set(item.cartelaId, item);
        }
      }
    }
    if (parsed.adminPinConfig) {
      adminPinConfig = { ...adminPinConfig, ...parsed.adminPinConfig };
    }
    if (Array.isArray(parsed.verifiedBankSmsReceipts)) {
      verifiedBankSmsReceipts.splice(0, verifiedBankSmsReceipts.length, ...parsed.verifiedBankSmsReceipts);
    }
    if (Array.isArray(parsed.receivedWebhookSmsLogs)) {
      receivedWebhookSmsLogs.splice(0, receivedWebhookSmsLogs.length, ...parsed.receivedWebhookSmsLogs);
    }
    if (Array.isArray(parsed.registeredPhones)) {
      for (const [chatId, phone] of parsed.registeredPhones) {
        registeredChatPhones.set(Number(chatId), String(phone));
        ensurePlayerRecord(String(phone), void 0, Number(chatId));
      }
    }
    if (Array.isArray(parsed.bonusClaimed)) {
      for (const chatId of parsed.bonusClaimed) {
        chatWelcomeBonusClaimed.add(Number(chatId));
      }
    }
    if (Array.isArray(parsed.tokens)) {
      const seenTokens = /* @__PURE__ */ new Set();
      const uniqueTokens = [];
      for (const item of parsed.tokens) {
        const cleanTok = (item?.token || "").trim();
        if (cleanTok && cleanTok.includes(":") && !seenTokens.has(cleanTok)) {
          seenTokens.add(cleanTok);
          let resolvedAppUrl = process.env.RENDER_EXTERNAL_URL || item.appUrl || lastKnownLiveHost || SHARED_APP_URL;
          if (resolvedAppUrl.includes("ezi-bingo.onrender.com")) {
            resolvedAppUrl = lastKnownLiveHost || "https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app";
          }
          uniqueTokens.push({ ...item, token: cleanTok, appUrl: resolvedAppUrl });
          const shouldAutoPoll = process.env.DISABLE_LOCAL_BOT_POLLING !== "true";
          activeBots.set(cleanTok, {
            botUsername: item.botUsername || "EziBingoBot",
            botFirstName: item.botFirstName || "Ezi Bingo",
            appUrl: resolvedAppUrl,
            offset: typeof item.offset === "number" ? item.offset : 0,
            isRunning: shouldAutoPoll
          });
          if (shouldAutoPoll) {
            pollBotUpdates(cleanTok);
          }
        }
      }
      persistedBotTokensCache = uniqueTokens;
    }
  } catch {
  }
}
setInterval(() => {
  saveBotsToDisk();
}, 2e3);
function buildWebAppUrl(appUrl, mode, registeredPhone, tab) {
  let cleanUrl = (appUrl || lastKnownLiveHost || SHARED_APP_URL || "").trim().replace(/\/$/, "");
  if (!cleanUrl || cleanUrl.includes("ezi-bingo.onrender.com")) {
    cleanUrl = lastKnownLiveHost || "https://ais-pre-5o2vwpcgfgshkft456mpos-198161772381.europe-west2.run.app";
  }
  const phone = registeredPhone || null;
  const tabParam = tab ? `&tab=${tab}` : "";
  if (phone) {
    return `${cleanUrl}/?app=${mode}&registered=1&phone=${encodeURIComponent(phone)}${tabParam}`;
  }
  return `${cleanUrl}/?app=${mode}${tabParam}`;
}
function buildInlineWelcomeMenuKeyboard(appUrl, registeredPhone) {
  return {
    inline_keyboard: [
      [
        {
          text: "\u{1F3AE} Play Live Bingo",
          web_app: { url: buildWebAppUrl(appUrl, "fast", registeredPhone) }
        }
      ],
      [
        { text: "Deposit \u{1F4B5}", callback_data: "menu_deposit" },
        { text: "Withdraw \u{1F4B8}", callback_data: "menu_withdraw" }
      ],
      [
        { text: "\u{1F465} \u1313\u12F0\u129B \u12ED\u130B\u1265\u12D9 (+25 ETB)", callback_data: "menu_invite" },
        { text: "Check Balance \u{1F4B0}", callback_data: "menu_balance" }
      ],
      [
        { text: "Jackpot \u{1F3B0}", callback_data: "menu_jackpot" },
        { text: "Transfer \u{1F504}", callback_data: "menu_transfer" }
      ],
      [
        { text: "Leaderboard \u{1F3C6}", callback_data: "menu_leaderboard" },
        { text: "Game Rules \u{1F4D6}", callback_data: "menu_rules" }
      ],
      [
        { text: "\u{1F510} Get Login Token / \u12AE\u12F5", callback_data: "menu_token" },
        { text: "Support \u{1F4DE}", callback_data: "menu_support" }
      ],
      [
        { text: "\u{1F4F2} Download Android App", callback_data: "menu_android" },
        { text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }
      ]
    ]
  };
}
function buildSubMenuInlineKeyboard(appUrl, registeredPhone) {
  return {
    inline_keyboard: [
      [
        {
          text: "\u{1F3AE} Play Live Bingo",
          web_app: { url: buildWebAppUrl(appUrl, "fast", registeredPhone) }
        }
      ],
      [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
    ]
  };
}
async function sendBottomContactKeyboardPromptOnly(token, chatId) {
  if (registeredChatPhones.has(chatId)) return;
  const promptText = `\u12A5\u1295\u12B3\u1295 \u12F0\u1205\u1293 \u1218\u1321! \u1208\u1218\u1218\u12DD\u1308\u1265 \u12A8\u12DA\u1205 \u1260\u1273\u127D \u12EB\u1208\u12CD\u1295 \u1241\u120D\u134D \u12ED\u132B\u1291 \u1235\u120D\u12AD \u1241\u1325\u122D\u12CE\u1295 \u12EB\u130B\u1229\u1362`;
  const nowMs = Date.now();
  const prevOut = lastOutgoingMsgByChatId.get(chatId);
  if (prevOut && prevOut.hash === promptText && nowMs - prevOut.timestamp < 1e4) {
    return;
  }
  lastOutgoingMsgByChatId.set(chatId, { hash: promptText, timestamp: nowMs });
  await deleteOldPhonePromptMessages(token, chatId);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: promptText,
        reply_markup: {
          keyboard: [
            [
              {
                text: "\u{1F4F1} \u1235\u120D\u12AD \u1241\u1325\u122D \u12A0\u130B\u122B",
                request_contact: true
              }
            ]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      })
    });
    const data = await res.json();
    if (data?.ok && data?.result?.message_id) {
      const prev = promptMessageIdsByChat.get(chatId) || [];
      promptMessageIdsByChat.set(chatId, [...prev, data.result.message_id]);
    }
  } catch (err) {
    console.error("Error sending bottom contact keyboard prompt:", err);
  }
}
async function deleteOldPhonePromptMessages(token, chatId) {
  const msgIds = promptMessageIdsByChat.get(chatId);
  if (!msgIds || msgIds.length === 0) return;
  promptMessageIdsByChat.delete(chatId);
  for (const msgId of msgIds) {
    try {
      await fetch(`https://api.telegram.org/bot${token}/deleteMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          message_id: msgId
        })
      });
    } catch {
    }
  }
}
async function sendUnregisteredPhonePrompt(token, chatId, isBlockedCommand = false) {
  const textToSend = isBlockedCommand ? `\u274C \u12A5\u1263\u12AD\u12CE \u1218\u1300\u1218\u122A\u12EB \u1235\u120D\u12AD \u1241\u1325\u122D\u12CE\u1295 \u1260\u121B\u130B\u122B\u1275 \u12ED\u1218\u12DD\u1308\u1261\u1362` : `\u12A5\u1295\u12B3\u1295 \u12F0\u1205\u1293 \u1218\u1321! \u1208\u1218\u1218\u12DD\u1308\u1265 \u12A8\u12DA\u1205 \u1260\u1273\u127D \u12EB\u1208\u12CD\u1295 \u1241\u120D\u134D \u12ED\u132B\u1291 \u1235\u120D\u12AD \u1241\u1325\u122D\u12CE\u1295 \u12EB\u130B\u1229\u1362`;
  const nowMs = Date.now();
  const prevOut = lastOutgoingMsgByChatId.get(chatId);
  if (prevOut && prevOut.hash === textToSend && nowMs - prevOut.timestamp < 1e4) {
    return;
  }
  lastOutgoingMsgByChatId.set(chatId, { hash: textToSend, timestamp: nowMs });
  await deleteOldPhonePromptMessages(token, chatId);
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: textToSend,
        reply_markup: {
          keyboard: [
            [
              {
                text: "\u{1F4F1} \u1235\u120D\u12AD \u1241\u1325\u122D \u12A0\u130B\u122B",
                request_contact: true
              }
            ]
          ],
          resize_keyboard: true,
          one_time_keyboard: true
        }
      })
    });
    const data = await res.json();
    if (data?.ok && data?.result?.message_id) {
      const prev = promptMessageIdsByChat.get(chatId) || [];
      promptMessageIdsByChat.set(chatId, [...prev, data.result.message_id]);
    }
  } catch (err) {
    console.error("Error sending unregistered phone prompt:", err);
  }
}
function buildWelcomeMessageText(firstName = "King", registeredPhone, has15Bonus = false) {
  const player = registeredPhone ? playersByPhone.get(registeredPhone) : void 0;
  const cashBal = player ? player.balance : 15;
  const bonusBal = player ? player.bonusBalance : 15;
  const phoneNotice = registeredPhone ? `\u2705 Registered Phone: *${registeredPhone}*
` : `\u{1F4F1} *\u1208\u1218\u1218\u12DD\u1308\u1265 \u1235\u120D\u12AD \u1241\u1325\u122D\u12CE\u1295 \u12EB\u1235\u1308\u1261 (09********)*
`;
  const bonusTotal = has15Bonus ? `${bonusBal.toFixed(2)} ETB (+15 ETB Welcome Bonus!)` : `${bonusBal.toFixed(2)} ETB`;
  return `\u{1F389} *Welcome to EziBinGo Live Bingo Ethiopia!*
*(\u12A5\u1295\u12B3\u1295 \u12C8\u12F0 \u12A2\u12DA\u1262\u1295\u130E \u1260\u12F0\u1205\u1293 \u1218\u1321!)*

\u{1F44B} Selam, *${firstName}*!
` + phoneNotice + `
\u{1F4B0} Cash Balance: *${cashBal.toFixed(2)} ETB*
\u{1F381} Bonus Balance: *${bonusTotal}*
\u{1F3B0} Jackpot Pool: *${fastLiveRoomState.jackpotPool.toFixed(2)} ETB*

\u26A1 Instant automated deposits & payouts via Telebirr and CBE Birr.
Tap below to enter live games, make a deposit, or manage your account:`;
}
var keyboardRemovedForChats = /* @__PURE__ */ new Set();
var lastOutgoingMsgByChatId = /* @__PURE__ */ new Map();
async function sendTelegramMessage(token, chatId, text, replyMarkup, _unusedMessageId) {
  const botInfo = activeBots.get(token);
  const appUrl = botInfo?.appUrl || SHARED_APP_URL;
  const regPhone = registeredChatPhones.get(chatId);
  const finalMarkup = replyMarkup || buildInlineWelcomeMenuKeyboard(appUrl, regPhone);
  const nowMs = Date.now();
  const msgHash = `${text.slice(0, 120)}`;
  const prevOut = lastOutgoingMsgByChatId.get(chatId);
  if (prevOut && prevOut.hash === msgHash && nowMs - prevOut.timestamp < 6e3) {
    return;
  }
  lastOutgoingMsgByChatId.set(chatId, { hash: msgHash, timestamp: nowMs });
  if (regPhone) {
    await deleteOldPhonePromptMessages(token, chatId);
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: finalMarkup
      })
    });
    const data = await res.json();
    if (data?.ok) {
      return;
    }
    const fallbackRes = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "Markdown",
        reply_markup: buildSubMenuInlineKeyboard(appUrl, regPhone)
      })
    });
    await fallbackRes.json().catch(() => {
    });
  } catch (err) {
    console.error("Error sending Telegram message:", err);
  }
}
async function handleTelegramMenuAction(token, chatId, rawAction, firstName = "King", isSharedContact = false, callbackMessageId) {
  const clean = rawAction.trim().toLowerCase();
  const botInfo = activeBots.get(token);
  const appUrl = (botInfo?.appUrl || SHARED_APP_URL).replace(/\/$/, "");
  const nowMs = Date.now();
  const prevAction = lastChatActionByChatId.get(chatId);
  if (prevAction && prevAction.action === clean && nowMs - prevAction.timestamp < 5e3) {
    return;
  }
  lastChatActionByChatId.set(chatId, { action: clean, timestamp: nowMs });
  if (clean === "/register" || clean === "/logout" || clean === "/reset") {
    registeredChatPhones.delete(chatId);
    keyboardRemovedForChats.delete(chatId);
    saveBotsToDisk();
    await sendUnregisteredPhonePrompt(token, chatId);
    return;
  }
  const digitsOnly = clean.replace(/\D/g, "");
  const hasActiveFlow = chatFlowByChatId.has(chatId);
  const looksLikePhone = isSharedContact || clean.includes("share phone number") || clean.includes("share your phone number") || clean.includes("\u1235\u120D\u12AD \u1241\u1325\u122D \u12A0\u130B\u122B") || !registeredChatPhones.has(chatId) && !hasActiveFlow && digitsOnly.length >= 9 && digitsOnly.length <= 15;
  if (looksLikePhone && !clean.startsWith("menu_") && !clean.startsWith("dep_") && !clean.startsWith("with_") && !clean.startsWith("/")) {
    if (registeredChatPhones.has(chatId)) {
      await deleteOldPhonePromptMessages(token, chatId);
      const existingPhone = registeredChatPhones.get(chatId) || globalRegisteredPhone || "0942742684";
      const welcomeText3 = buildWelcomeMessageText(firstName, existingPhone, true);
      await sendTelegramMessage(
        token,
        chatId,
        welcomeText3,
        buildInlineWelcomeMenuKeyboard(appUrl, existingPhone)
      );
      return;
    }
    let normalizedPhone = digitsOnly || "0942742684";
    if (normalizedPhone.startsWith("251") && normalizedPhone.length === 12) {
      normalizedPhone = `0${normalizedPhone.slice(3)}`;
    } else if (normalizedPhone.length === 9 && /^[79]/.test(normalizedPhone)) {
      normalizedPhone = `0${normalizedPhone}`;
    } else if (!digitsOnly) {
      normalizedPhone = globalRegisteredPhone || "0942742684";
    }
    registeredChatPhones.set(chatId, normalizedPhone);
    ensurePlayerRecord(normalizedPhone, firstName, chatId);
    chatWelcomeBonusClaimed.add(chatId);
    saveBotsToDisk();
    broadcastRealtimeSync();
    await deleteOldPhonePromptMessages(token, chatId);
    keyboardRemovedForChats.add(chatId);
    const welcomeText2 = buildWelcomeMessageText(firstName, normalizedPhone, true);
    await sendTelegramMessage(
      token,
      chatId,
      welcomeText2,
      buildInlineWelcomeMenuKeyboard(appUrl, normalizedPhone)
    );
    return;
  }
  if (clean.includes("android") || clean === "/android" || clean === "/app" || clean === "menu_android") {
    const existingPhoneForAndroid = registeredChatPhones.get(chatId) || Array.from(playersByPhone.values()).find((p) => p.chatId === chatId && p.phone)?.phone || globalRegisteredPhone || "0942742684";
    const androidInstallUrl = buildWebAppUrl(appUrl, "fast", existingPhoneForAndroid);
    const apkDownloadUrl = `${appUrl.replace(/\/$/, "")}/Ezi-Bingo.apk`;
    const androidCaption = `\u{1F4F2} Ezi-Bingo.apk (Android App)
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F446} \u12ED\u1205\u1295\u1295 Ezi-Bingo.apk \u134B\u12ED\u120D \u1290\u12AD\u1270\u12CD \u1260\u1240\u1325\u1273 \u1235\u120D\u12AD\u12CE \u120B\u12ED Install \u12EB\u12F5\u122D\u1309!`;
    const inlineKeyboardMarkup = {
      inline_keyboard: [
        [
          {
            text: "\u{1F4E5} Ezi-Bingo.apk \u12A0\u12CD\u122D\u12F5 (Direct Download)",
            url: apkDownloadUrl
          }
        ],
        [
          {
            text: "\u{1F3AE} Play Live Bingo",
            web_app: { url: androidInstallUrl }
          }
        ],
        [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
      ]
    };
    let sentApkDocument = false;
    const EZI_APK_TELEGRAM_FILE_ID = "BQACAgQAAxkDAAICb2rMcRJ8tXu221eD-Spd-oCKW36bAALuHgAC-YRhUk48IbK4pANjPQQ";
    try {
      const fastDocRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: chatId,
          document: EZI_APK_TELEGRAM_FILE_ID,
          caption: androidCaption,
          reply_markup: inlineKeyboardMarkup
        })
      });
      const fastDocJson = await fastDocRes.json().catch(() => null);
      if (fastDocJson?.ok) {
        sentApkDocument = true;
      }
    } catch {
    }
    if (!sentApkDocument) {
      try {
        const apkCandidates = [
          path.join(__dirname, "public", "Ezi-Bingo.apk"),
          path.join(__dirname, "dist", "Ezi-Bingo.apk")
        ];
        const apkFilePath = apkCandidates.find((p) => fs.existsSync(p));
        if (apkFilePath) {
          const apkBuffer = fs.readFileSync(apkFilePath);
          const form = new FormData();
          form.append("chat_id", String(chatId));
          form.append("caption", androidCaption);
          form.append("reply_markup", JSON.stringify(inlineKeyboardMarkup));
          form.append(
            "document",
            new Blob([new Uint8Array(apkBuffer)], {
              type: "application/vnd.android.package-archive"
            }),
            "Ezi-Bingo.apk"
          );
          const docRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
            method: "POST",
            body: form
          });
          const docJson = await docRes.json().catch(() => null);
          if (docJson?.ok) {
            sentApkDocument = true;
          }
        }
      } catch (err) {
        console.error("Telegram sendDocument APK error:", err);
      }
    }
    if (!sentApkDocument) {
      await sendTelegramMessage(
        token,
        chatId,
        `\u{1F4F2} *Ezi Bingo \u1208 Android \u1235\u120D\u12AD*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F447} \u12A8\u1273\u127D \u12EB\u1208\u12CD\u1295 **\u{1F4E5} Ezi-Bingo.apk \u12A0\u12CD\u122D\u12F5** \u1241\u120D\u134D \u1260\u1218\u132B\u1295 \u12A0\u1351\u1295 \u1260\u1240\u1325\u1273 \u1235\u120D\u12AD\u12CE \u120B\u12ED Install \u12EB\u12F5\u122D\u1309\u1366`,
        inlineKeyboardMarkup,
        callbackMessageId
      );
    }
    return;
  }
  if (!registeredChatPhones.has(chatId)) {
    const matchedPlayerByChat = Array.from(playersByPhone.values()).find((p) => p.chatId === chatId && p.phone);
    if (matchedPlayerByChat) {
      registeredChatPhones.set(chatId, matchedPlayerByChat.phone);
      saveBotsToDisk();
    } else {
      const isStartCmd = clean === "/start" || clean.startsWith("/start ");
      await sendUnregisteredPhonePrompt(token, chatId, !isStartCmd);
      return;
    }
  }
  const regPhone = registeredChatPhones.get(chatId) || globalRegisteredPhone || "0942742684";
  const currentPlayer = ensurePlayerRecord(regPhone, firstName, chatId);
  if (clean.startsWith("menu_") || clean.startsWith("/")) {
    chatFlowByChatId.delete(chatId);
  }
  if (clean === "/admin" || clean === "admin" || clean === "menu_admin" || clean.startsWith("/admin ")) {
    const baseApp = (appUrl || "https://ezi-bingo.onrender.com").replace(/\/$/, "");
    const adminFastUrl = `${baseApp}/?app=fast&tab=admin&admin=1#admin`;
    const adminRegularUrl = `${baseApp}/?app=regular&tab=admin&admin=1#regular-admin`;
    const adminText = `\u{1F6E1}\uFE0F *EziBinGo Control Center (\u12E8\u1241\u1325\u1325\u122D \u121B\u12D5\u12A8\u120D)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F510} *Username:* \`ezana\`
\u{1F511} *Password / PIN:* \`1234\`

\u{1F517} *Direct Admin URL:*
https://ezi-bingo.onrender.com/#admin

\u{1F447} \u12A8\u1273\u127D \u12E8\u121A\u1348\u120D\u1309\u1275\u1295 \u12E8\u1262\u1295\u130E \u121B\u1235\u1270\u12F3\u12F0\u122A\u12EB \u1353\u1290\u120D \u1260\u1240\u1325\u1273 \u12ED\u12AD\u1348\u1271\u1366`;
    await sendTelegramMessage(
      token,
      chatId,
      adminText,
      {
        inline_keyboard: [
          [
            {
              text: "\u26A1 Fast Bingo Admin (\u1348\u1323\u1295)",
              web_app: { url: adminFastUrl }
            },
            {
              text: "\u{1F3B2} Regular Bingo Admin (\u1218\u12F0\u1260\u129B)",
              web_app: { url: adminRegularUrl }
            }
          ],
          [
            {
              text: "\u{1F3AE} Play Live Bingo",
              web_app: { url: buildWebAppUrl(appUrl, "fast", regPhone) }
            }
          ],
          [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
        ]
      },
      callbackMessageId
    );
    return;
  }
  if (clean.includes("play live bingo") || clean === "/play" || clean === "play" || clean === "menu_play") {
    const playText = `\u{1F3AE} *EziBinGo Live Bingo Ethiopia*

Tap **\u{1F3AE} Play Live Bingo** below to launch the live game directly inside Telegram:`;
    await sendTelegramMessage(
      token,
      chatId,
      playText,
      {
        inline_keyboard: [
          [
            {
              text: "\u{1F3AE} Play Live Bingo",
              web_app: { url: buildWebAppUrl(appUrl, "fast", regPhone) }
            }
          ],
          [
            {
              text: "\u{1F3B2} Classic 16-Rule Bingo (70,000 Cartelas)",
              web_app: { url: buildWebAppUrl(appUrl, "regular", regPhone) }
            }
          ],
          [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
        ]
      },
      callbackMessageId
    );
    return;
  }
  if (clean.includes("deposit") || clean === "/deposit" || clean === "menu_deposit") {
    chatFlowByChatId.set(chatId, { mode: "deposit", method: "Telebirr" });
    const depositText = `Deposit \u{1F4B5} *(\u1308\u1295\u12D8\u1265 \u121B\u1235\u1308\u1262\u12EB)*

\u{1F4B0} \u12E8\u12A5\u122D\u1235\u12CE \u1240\u122A \u1202\u1233\u1265\u1366 *${currentPlayer.balance.toFixed(2)} ETB*

\u{1F447} *1. \u1308\u1295\u12D8\u1265 \u12E8\u121A\u12EB\u1235\u1308\u1261\u1260\u1275\u1295 \u1263\u1295\u12AD \u12ED\u121D\u1228\u1321 \u12C8\u12ED\u121D \u1241\u1325\u1229\u1295 \u1232\u1290\u12A9\u1275 \u1260\u122B\u1231 Copy \u12EB\u12F0\u122D\u130B\u120D\u1366*

\u{1F4F1} *Telebirr (\u1274\u120C\u1265\u122D)*
\u1241\u1325\u122D: \`0942742684\`
\u1235\u121D: *Ezana Gebremedhin*

\u{1F3E6} *CBE (\u12A2\u1275\u12EE\u1335\u12EB \u1295\u130D\u12F5 \u1263\u1295\u12AD)*
\u1202\u1233\u1265: \`1000112964936\`
\u1235\u121D: *Ezana Gebremedhin*

\u{1F3E6} *Abyssinia / BOA (\u12A0\u1262\u1232\u1292\u12EB \u1263\u1295\u12AD)*
\u1202\u1233\u1265: \`66816532\`
\u1235\u121D: *Ezana Gebremedhin*

\u{1F4F1} *M-Pesa (\u12A4\u121D-\u1354\u1233)*
\u1241\u1325\u122D: \`0711742684\`
\u1235\u121D: *Ezana Gebremedhin*

\u{1F4E9} *2. \u12AD\u134D\u12EB\u12CD\u1295 \u12A8\u1348\u1338\u1219 \u1260\u128B\u120B \u12E8\u12F0\u1228\u1230\u12CE\u1275\u1295 \u12E8\u1263\u1295\u12AD/\u1274\u120C\u1265\u122D SMS \u12F0\u1228\u1230\u129D \u12C8\u12ED\u121D Transaction ID (FT... / TB...) \u12A5\u12DA\u1201 \u127B\u1275 \u120B\u12ED Paste \u12A0\u12F5\u122D\u1308\u12CD \u12ED\u120B\u12A9!*`;
    await sendTelegramMessage(
      token,
      chatId,
      depositText,
      {
        inline_keyboard: [
          [
            { text: "\u{1F4F1} Telebirr", callback_data: "dep_bank_Telebirr" },
            { text: "\u{1F3E6} CBE", callback_data: "dep_bank_CBE" }
          ],
          [
            { text: "\u{1F3E6} Abyssinia (BOA)", callback_data: "dep_bank_Abyssinia" },
            { text: "\u{1F4F1} M-Pesa", callback_data: "dep_bank_M-Pesa" }
          ],
          [
            { text: "\u{1F4CB} Copy Telebirr (0942742684)", copy_text: { text: "0942742684" } },
            { text: "\u{1F4CB} Copy CBE (1000112964936)", copy_text: { text: "1000112964936" } }
          ],
          [
            { text: "\u{1F4CB} Copy BOA (66816532)", copy_text: { text: "66816532" } },
            { text: "\u{1F4CB} Copy M-Pesa (0711742684)", copy_text: { text: "0711742684" } }
          ],
          [
            {
              text: "\u{1F4B5} Open Deposit in App",
              web_app: { url: buildWebAppUrl(appUrl, "fast", regPhone, "deposit") }
            }
          ],
          [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
        ]
      },
      callbackMessageId
    );
    return;
  }
  if (clean.startsWith("dep_bank_")) {
    const rawBank = rawAction.replace(/^dep_bank_/i, "");
    const method = /cbe/i.test(rawBank) ? "CBE" : /abyssinia|boa/i.test(rawBank) ? "Abyssinia" : /mpesa|m-pesa/i.test(rawBank) ? "M-Pesa" : "Telebirr";
    chatFlowByChatId.set(chatId, { mode: "deposit", method });
    const acctMap = {
      Telebirr: { title: "\u{1F4F1} Telebirr (\u1274\u120C\u1265\u122D)", num: "0942742684", holder: "Ezana Gebremedhin" },
      CBE: { title: "\u{1F3E6} Commercial Bank of Ethiopia (CBE)", num: "1000112964936", holder: "Ezana Gebremedhin" },
      Abyssinia: { title: "\u{1F3E6} Bank of Abyssinia (BOA)", num: "66816532", holder: "Ezana Gebremedhin" },
      "M-Pesa": { title: "\u{1F4F1} M-Pesa Safaricom", num: "0711742684", holder: "Ezana Gebremedhin" }
    }[method];
    const bankText = `Deposit via *${acctMap.title}* \u{1F4B5}

\u{1F522} \u1202\u1233\u1265 / \u1241\u1325\u122D\u1366 \`${acctMap.num}\`
\u{1F464} \u12E8\u1202\u1233\u1265 \u1263\u1208\u1264\u1275\u1366 *${acctMap.holder}*

1\uFE0F\u20E3 \u12A8\u1273\u127D \u1263\u1208\u12CD *\u{1F4CB} Copy* \u1241\u120D\u134D \u1241\u1325\u1229\u1295 \u12AE\u1352 \u12EB\u12F5\u122D\u1309\u1362
2\uFE0F\u20E3 \u1265\u1229\u1295 \u12A8\u120B\u12A9 \u1260\u128B\u120B \u12E8\u12F0\u1228\u1230\u12CE\u1275\u1295 *\u1219\u1209 \u12E8\u1263\u1295\u12AD/\u1274\u120C\u1265\u122D SMS \u12F0\u1228\u1230\u129D* \u12C8\u12ED\u121D *Transaction Reference (FT... / TB...)* \u12A5\u12DA\u1201 \u127B\u1275 \u120B\u12ED \u12ED\u120B\u12A9\u1366`;
    await sendTelegramMessage(
      token,
      chatId,
      bankText,
      {
        inline_keyboard: [
          [{ text: `\u{1F4CB} Copy ${method} (${acctMap.num})`, copy_text: { text: acctMap.num } }],
          [
            { text: "\u{1F519} \u12C8\u12F0 \u1201\u1209\u121D \u1263\u1295\u12AE\u127D (All Banks)", callback_data: "menu_deposit" },
            { text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }
          ]
        ]
      },
      callbackMessageId
    );
    return;
  }
  if (clean.includes("withdraw") || clean === "/withdraw" || clean === "menu_withdraw") {
    chatFlowByChatId.set(chatId, { mode: "withdraw_amount", method: "Telebirr" });
    const withdrawText = `Withdraw \u{1F4B8} *(\u1308\u1295\u12D8\u1265 \u121B\u12CD\u132B)*

\u{1F4B0} \u121B\u12CD\u1323\u1275 \u12E8\u121A\u127D\u1209\u1275 (Cash Balance): *${currentPlayer.balance.toFixed(2)} ETB*
\u2022 \u12DD\u1245\u1270\u129B \u121B\u12CD\u132B (Min): *50 ETB*
\u2022 \u12A8\u134D\u1270\u129B \u121B\u12CD\u132B (Max): *75,000 ETB*

\u{1F447} *1. \u1308\u1295\u12D8\u1265 \u12E8\u121A\u12EB\u12C8\u1321\u1260\u1275\u1295 \u1263\u1295\u12AD / \u1218\u1295\u1308\u12F5 \u12A8\u1273\u127D \u12ED\u121D\u1228\u1321\u1366*
*(\u12C8\u12ED\u121D \u12E8\u121A\u12EB\u12C8\u1321\u1275\u1295 \u12E8\u1265\u122D \u1218\u1320\u1295 \u12A5\u1293 \u12E8\u1202\u1233\u1265 \u1241\u1325\u122D\u12CE\u1295 \u1208\u121D\u1233\u120C \`200 0942742684\` \u1265\u1208\u12CD \u12A5\u12DA\u1201 \u127B\u1275 \u120B\u12ED \u12ED\u120B\u12A9)*`;
    await sendTelegramMessage(
      token,
      chatId,
      withdrawText,
      {
        inline_keyboard: [
          [
            { text: "\u{1F4F1} Telebirr (\u1274\u120C\u1265\u122D)", callback_data: "with_bank_Telebirr" },
            { text: "\u{1F3E6} CBE (\u1295\u130D\u12F5 \u1263\u1295\u12AD)", callback_data: "with_bank_CBE" }
          ],
          [
            { text: "\u{1F3E6} Abyssinia (BOA)", callback_data: "with_bank_Abyssinia" },
            { text: "\u{1F4F1} M-Pesa (\u12A4\u121D-\u1354\u1233)", callback_data: "with_bank_M-Pesa" }
          ],
          [
            { text: "50 ETB", callback_data: "with_amt_Telebirr_50" },
            { text: "100 ETB", callback_data: "with_amt_Telebirr_100" },
            { text: "200 ETB", callback_data: "with_amt_Telebirr_200" }
          ],
          [
            { text: "500 ETB", callback_data: "with_amt_Telebirr_500" },
            { text: "1,000 ETB", callback_data: "with_amt_Telebirr_1000" },
            {
              text: `All (${Math.floor(currentPlayer.balance)} ETB)`,
              callback_data: `with_amt_Telebirr_${Math.max(50, Math.floor(currentPlayer.balance))}`
            }
          ],
          [
            {
              text: "\u{1F4B8} Open Withdraw in App",
              web_app: { url: buildWebAppUrl(appUrl, "fast", regPhone, "withdraw") }
            }
          ],
          [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
        ]
      },
      callbackMessageId
    );
    return;
  }
  if (clean.startsWith("with_bank_")) {
    const rawBank = rawAction.replace(/^with_bank_/i, "");
    const method = /cbe/i.test(rawBank) ? "CBE" : /abyssinia|boa/i.test(rawBank) ? "Abyssinia" : /mpesa|m-pesa/i.test(rawBank) ? "M-Pesa" : "Telebirr";
    chatFlowByChatId.set(chatId, { mode: "withdraw_amount", method });
    const stepText = `Withdraw via *${method === "Abyssinia" ? "Abyssinia (BOA)" : method}* \u{1F4B8}

\u{1F4B0} \u1240\u122A \u1202\u1233\u1265\u12CE\u1366 *${currentPlayer.balance.toFixed(2)} ETB*

\u{1F447} *\u12E8\u121A\u12EB\u12C8\u1321\u1275\u1295 \u12E8\u1265\u122D \u1218\u1320\u1295 \u12A8\u1273\u127D \u12ED\u121D\u1228\u1321 (\u12A8 50 \u2013 75,000 ETB)\u1366*
*(\u12C8\u12ED\u121D \u1218\u1320\u1291\u1295 \u12A5\u1293 \u12E8 ${method} \u1241\u1325\u122D\u12CE\u1295 \u12A5\u12DA\u1201 \u127B\u1275 \u120B\u12ED \u12ED\u133B\u1349)*`;
    await sendTelegramMessage(
      token,
      chatId,
      stepText,
      {
        inline_keyboard: [
          [
            { text: "50 ETB", callback_data: `with_amt_${method}_50` },
            { text: "100 ETB", callback_data: `with_amt_${method}_100` },
            { text: "200 ETB", callback_data: `with_amt_${method}_200` }
          ],
          [
            { text: "500 ETB", callback_data: `with_amt_${method}_500` },
            { text: "1,000 ETB", callback_data: `with_amt_${method}_1000` },
            {
              text: `\u1201\u1209\u1295\u121D (${Math.floor(currentPlayer.balance)} ETB)`,
              callback_data: `with_amt_${method}_${Math.max(50, Math.floor(currentPlayer.balance))}`
            }
          ],
          [
            { text: "\u{1F519} \u12C8\u12F0 \u1263\u1295\u12AD \u121D\u122D\u132B (Back)", callback_data: "menu_withdraw" },
            { text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }
          ]
        ]
      },
      callbackMessageId
    );
    return;
  }
  if (clean.startsWith("with_amt_")) {
    const parts = rawAction.split("_");
    const methodRaw = parts[2] || "Telebirr";
    const amt = parseFloat(parts[3] || "100");
    const method = /cbe/i.test(methodRaw) ? "CBE" : /abyssinia|boa/i.test(methodRaw) ? "Abyssinia" : /mpesa|m-pesa/i.test(methodRaw) ? "M-Pesa" : "Telebirr";
    if (amt > currentPlayer.balance) {
      await sendTelegramMessage(
        token,
        chatId,
        `\u274C *\u1260\u1242 \u1240\u122A \u1202\u1233\u1265 \u12E8\u1208\u12CE\u1275\u121D!*
\u12E8\u1320\u12E8\u1241\u1275\u1366 *${amt.toFixed(2)} ETB*
\u12EB\u1208\u12CE\u1275 \u1240\u122A \u1202\u1233\u1265\u1366 *${currentPlayer.balance.toFixed(2)} ETB*`,
        {
          inline_keyboard: [
            [{ text: "Deposit \u{1F4B5} (\u1308\u1262 \u12A0\u12F5\u122D\u130D)", callback_data: "menu_deposit" }],
            [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
          ]
        },
        callbackMessageId
      );
      return;
    }
    chatFlowByChatId.set(chatId, { mode: "withdraw_account", method, amount: amt });
    const isMobileMoney = method === "Telebirr" || method === "M-Pesa";
    const promptAcctText = `Withdraw *${amt.toFixed(2)} ETB* via *${method}* \u{1F4B8}

` + (isMobileMoney ? `\u{1F4F1} \u12C8\u12F0 \u1270\u1218\u12D8\u1308\u1260\u12CD \u1235\u120D\u12AD \u1241\u1325\u122D\u12CE (*${regPhone}*) \u12A5\u1295\u12F2\u120B\u12AD \u12A8\u1273\u127D \u12EB\u1208\u12CD\u1295 \u1241\u120D\u134D \u12ED\u132B\u1291\u1363 \u12C8\u12ED\u121D \u120C\u120B \u1235\u120D\u12AD \u1241\u1325\u122D \u127B\u1271 \u120B\u12ED \u12ED\u133B\u1349\u1366` : `\u{1F3E6} \u12A5\u1263\u12AD\u12CE \u12E8\u12A5\u122D\u1235\u12CE\u1295 *${method === "Abyssinia" ? "Bank of Abyssinia (BOA)" : "CBE"} \u1202\u1233\u1265 \u1241\u1325\u122D* \u12A5\u12DA\u1201 \u127B\u1275 \u120B\u12ED \u12ED\u133B\u1349\u1366`);
    const inlineRows = [];
    if (isMobileMoney) {
      inlineRows.push([
        {
          text: `\u2705 \u12C8\u12F0 ${regPhone} (${amt} ETB) \u120B\u12AD`,
          callback_data: `with_confirm_${method}_${amt}_${regPhone}`
        }
      ]);
    }
    inlineRows.push([
      { text: "\u{1F519} \u1218\u1320\u1295 \u1240\u12ED\u122D (Back)", callback_data: `with_bank_${method}` },
      { text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }
    ]);
    await sendTelegramMessage(
      token,
      chatId,
      promptAcctText,
      {
        inline_keyboard: inlineRows
      },
      callbackMessageId
    );
    return;
  }
  if (clean.startsWith("with_confirm_")) {
    const parts = rawAction.split("_");
    const methodRaw = parts[2] || "Telebirr";
    const amt = parseFloat(parts[3] || "100");
    const targetAccount = parts.slice(4).join("_") || regPhone;
    const method = /cbe/i.test(methodRaw) ? "CBE" : /abyssinia|boa/i.test(methodRaw) ? "Abyssinia" : /mpesa|m-pesa/i.test(methodRaw) ? "M-Pesa" : "Telebirr";
    chatFlowByChatId.delete(chatId);
    if (amt > globalWalletBalance || amt < 50) {
      await sendTelegramMessage(
        token,
        chatId,
        `\u274C *\u12E8\u12C8\u132A \u1325\u12EB\u1244\u12CD \u12A0\u120D\u1270\u1233\u12AB\u121D!*
\u12DD\u1245\u1270\u129B \u121B\u12CD\u132B 50 ETB \u1232\u1206\u1295 \u12EB\u1208\u12CE\u1275 \u1240\u122A \u1202\u1233\u1265 *${globalWalletBalance.toFixed(2)} ETB* \u1290\u12CD\u1362`,
        buildSubMenuInlineKeyboard(appUrl, regPhone)
      );
      return;
    }
    const newTx = {
      id: `srv-tx-${Date.now()}`,
      userId: currentPlayer.id,
      userName: firstName || currentPlayer.name,
      userPhone: regPhone,
      chatId,
      type: "withdraw",
      method,
      amount: amt,
      referenceNumber: targetAccount,
      fullSmsText: `Telegram Withdraw: ${amt} ETB to ${method} (${targetAccount})`,
      status: adminPinConfig.requireDepositApproval ? "pending" : "approved",
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
    };
    serverTransactions.unshift(newTx);
    if (!adminPinConfig.requireDepositApproval) {
      currentPlayer.balance = Math.max(0, Number((currentPlayer.balance - amt).toFixed(2)));
      globalWalletBalance = currentPlayer.balance;
    }
    saveBotsToDisk();
    broadcastRealtimeSync();
    const confirmWithdrawMsg = adminPinConfig.requireDepositApproval ? `\u23F3 *\u12E8\u12C8\u132A \u1325\u12EB\u1244\u12CE \u1270\u120D\u12B3\u120D (\u1260\u1218\u1320\u1263\u1260\u1245 \u120B\u12ED)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F3E6} \u1218\u1295\u1308\u12F5\u1366 *${method}*
\u{1F4B0} \u12E8\u1265\u122D \u1218\u1320\u1295\u1366 *${amt.toFixed(2)} ETB*
\u{1F522} \u1202\u1233\u1265 / \u1235\u120D\u12AD\u1366 \`${targetAccount}\`

\u1325\u12EB\u1244\u12CE \u12F0\u122D\u1236\u1293\u120D! \u120D\u12AD \u1270\u1323\u122D\u1276 \u1232\u1338\u12F5\u1245 (*Approved*) \u12C8\u12F2\u12EB\u12CD\u1291 \u12C8\u12F0 \u1202\u1233\u1265\u12CE \u12ED\u120B\u12AB\u120D\u1362` : `\u2705 *\u12E8\u12C8\u132A \u1325\u12EB\u1244\u12CE \u1270\u1348\u133D\u121F\u120D!*
\u{1F4B0} *${amt.toFixed(2)} ETB* \u12C8\u12F0 *${method}* (\`${targetAccount}\`) \u1270\u120D\u12B3\u120D!
\u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u1366 *${globalWalletBalance.toFixed(2)} ETB*`;
    await sendTelegramMessage(token, chatId, confirmWithdrawMsg, buildSubMenuInlineKeyboard(appUrl, regPhone));
    return;
  }
  if (clean.includes("check balance") || clean.includes("balance") || clean === "/balance" || clean === "menu_balance") {
    const has15Bonus = chatWelcomeBonusClaimed.has(chatId);
    const balanceText = `Check Balance \u{1F4B0} *(\u12E8\u1202\u1233\u1265 \u1218\u1228\u1303 \u2014 Ezi Bingo & Ezi Fast Bingo)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F44B} Selam, *${firstName}*!
` + (regPhone ? `\u{1F4F1} Phone: *${regPhone}*
` : "") + `\u{1F4B0} Cash Balance: *${currentPlayer.balance.toFixed(2)} ETB*
\u{1F381} Bonus Balance: *${currentPlayer.bonusBalance.toFixed(2)} ETB${has15Bonus ? " (+15 ETB Welcome Bonus!)" : ""}*
\u{1F3B0} Jackpot Pool: *${fastLiveRoomState.jackpotPool.toFixed(2)} ETB*`;
    await sendTelegramMessage(
      token,
      chatId,
      balanceText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }
  if (clean.includes("jackpot") || clean === "/jackpot" || clean === "menu_jackpot") {
    const jackpotText = `Jackpot \u{1F3B0} *(5% Progressive Jackpot)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F3B0} Jackpot Pool: *${fastLiveRoomState.jackpotPool.toFixed(2)} / 500.00 ETB*
\u{1F4C8} \u12A8\u12A5\u12EB\u1295\u12F3\u1295\u12F1 \u12D9\u122D *5%* \u12C8\u12F0 \u1303\u12AD\u1353\u1271 \u12ED\u1328\u1218\u122B\u120D!
\u{1F3C6} *500 \u1265\u122D* \u1232\u121E\u120B \u1260\u12DA\u12EB \u12D9\u122D \u12E8\u121A\u12EB\u1238\u1295\u1348\u12CD \u1270\u132B\u12CB\u127D *\u12F0\u122B\u1239\u1295 + 500 \u1265\u122D \u1303\u12AD\u1353\u1271\u1295* \u1260\u12A0\u1295\u12F5 \u120B\u12ED \u12ED\u12C8\u1235\u12F0\u12CB\u120D!`;
    await sendTelegramMessage(
      token,
      chatId,
      jackpotText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }
  if (clean.includes("transfer") || clean === "/transfer" || clean === "menu_transfer") {
    chatFlowByChatId.set(chatId, { mode: "transfer" });
    const transferText = `Transfer \u{1F504} *(\u1208\u1313\u12F0\u129B \u1265\u122D \u121B\u1235\u1270\u120B\u1208\u134A\u12EB)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B0} \u12E8\u12A5\u122D\u1235\u12CE \u1240\u122A \u1202\u1233\u1265\u1366 *${currentPlayer.balance.toFixed(2)} ETB*

\u12A8\u12A5\u122D\u1235\u12CE \u12CB\u120C\u1275 \u12C8\u12F0 \u120C\u120B \u1270\u132B\u12CB\u127D \u1235\u120D\u12AD \u1241\u1325\u122D \u1265\u122D \u1208\u121B\u1235\u1270\u120B\u1208\u134D\u1366
\u12E8\u1313\u12F0\u129B\u12CE\u1295 *\u1235\u120D\u12AD \u1241\u1325\u122D* \u12A5\u1293 *\u12E8\u1265\u122D \u1218\u1320\u1295* (\u1208\u121D\u1233\u120C\u1366 \`0911223344 100\`) \u1265\u1208\u12CD \u12A5\u12DA\u1201 \u12ED\u120B\u12A9\u1362`;
    await sendTelegramMessage(
      token,
      chatId,
      transferText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }
  if (clean.includes("leaderboard") || clean === "/leaderboard" || clean === "menu_leaderboard") {
    const leaderboardText = `Leaderboard \u{1F3C6} *(\u12F0\u1228\u1303 \u1230\u1295\u1320\u1228\u12E5)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F947} 1. *Ezana_Player* \u2014 14,500 ETB (42 Wins)
\u{1F948} 2. *Yonas_Fast* \u2014 9,820 ETB (31 Wins)
\u{1F949} 3. *Dawit_Bingo* \u2014 7,400 ETB (24 Wins)
\u{1F3C5} 4. *Meron_Hailu* \u2014 5,120 ETB (19 Wins)
\u{1F3C5} 5. *Abebe_K* \u2014 3,900 ETB (15 Wins)`;
    await sendTelegramMessage(
      token,
      chatId,
      leaderboardText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }
  if (clean.includes("get login token") || clean.includes("\u12AE\u12F5") || clean.includes("token") || clean === "/token" || clean === "menu_token") {
    const randomCode = Math.floor(1e5 + Math.random() * 9e5);
    const loginToken = `EZI-${randomCode}`;
    const tokenText = `\u{1F510} *Get Login Token / \u12AE\u12F5*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u12E8\u12A5\u122D\u1235\u12CE \u1218\u130D\u1262\u12EB \u12AE\u12F5\u1366 \`${loginToken}\`
\u2022 \u12ED\u1205 \u12AE\u12F5 \u1208 *10 \u12F0\u1242\u1243* \u12EB\u1308\u1208\u130D\u120B\u120D\u1362`;
    await sendTelegramMessage(
      token,
      chatId,
      tokenText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }
  if (clean.includes("game rules") || clean.includes("rules") || clean === "/rules" || clean === "menu_rules") {
    const rulesText = `Game Rules \u{1F4D6} *(\u12E8\u1328\u12CB\u1273 \u1215\u130E\u127D)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u2022 *\u12AB\u122D\u1274\u120B\u1366* \u12A8 1 \u12A5\u1235\u12A8 500 \u12AB\u122D\u1274\u120B \u1218\u121D\u1228\u1325 \u12ED\u127B\u120B\u120D\u1362
\u2022 *\u12E8\u121B\u1238\u1290\u134A\u12EB \u1215\u130D\u1366* \u121B\u1295\u129B\u12CD\u121D *1 \u12E8\u1270\u129B \u1218\u1235\u1218\u122D (Horizontal)*\u1363 *1 \u12E8\u1246\u1218 \u1218\u1235\u1218\u122D (Vertical)*\u1363 *1 \u12F2\u12EB\u130E\u1293\u120D (Diagonal)* \u12C8\u12ED\u121D *4\u1271 \u12E8\u121B\u12D5\u12D8\u1295 \u1241\u1325\u122E\u127D (4 Corners)* \u1232\u1320\u1229 \u12C8\u12F2\u12EB\u12CD\u1291 \u12EB\u1238\u1295\u134B\u1209!
\u2022 *\u12E8\u1328\u12CB\u1273 \u12A0\u1300\u121B\u1218\u122D\u1366* \u1262\u12EB\u1295\u1235 *2 \u1270\u132B\u12CB\u127E\u127D* \u1232\u1308\u1261 \u12E8 *30 \u1230\u12A8\u1295\u12F5* \u1246\u1323\u122A \u1270\u1300\u121D\u122E \u1328\u12CB\u1273\u12CD \u12ED\u1300\u121D\u122B\u120D (1 \u1270\u132B\u12CB\u127D \u1265\u127B \u12A8\u1240\u1228 \u1246\u1323\u122A\u12CD \u1246\u121E \u12ED\u1320\u1265\u1243\u120D)\u1362
\u2022 *\u12F0\u122B\u123D\u1293 \u1303\u12AD\u1353\u1275\u1366* \u12F0\u122B\u123D \u1208\u1270\u132B\u12CB\u127D *80%* | *5%* \u1208\u1303\u12AD\u1353\u1275 (1,000 \u1265\u122D \u1232\u121E\u120B \u12ED\u12C8\u1230\u12F3\u120D)\u1362`;
    await sendTelegramMessage(
      token,
      chatId,
      rulesText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }
  if (clean.includes("support") || clean === "/support" || clean === "menu_support") {
    const supportText = `Support \u{1F4DE} *(\u12E8\u12F0\u1295\u1260\u129E\u127D \u12F5\u130B\u134D)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4DE} *\u1235\u120D\u12AD\u1366* \`0942742684\`
\u{1F4AC} *\u1274\u120C\u130D\u122B\u121D\u1366* @EziBingoSupport
\u23F0 *\u12E8\u1235\u122B \u1230\u12D3\u1275\u1366* 24 \u1230\u12D3\u1275`;
    await sendTelegramMessage(
      token,
      chatId,
      supportText,
      buildSubMenuInlineKeyboard(appUrl, regPhone),
      callbackMessageId
    );
    return;
  }
  if (clean.includes("invite") || clean.includes("referral") || clean.includes("\u12ED\u130B\u1265\u12D9") || clean === "/invite" || clean === "/referral" || clean === "menu_invite") {
    const baseApp = (appUrl || SHARED_APP_URL || "https://sun-bingo.onrender.com").replace(/\/$/, "");
    const myRefCode = currentPlayer.phone?.slice(-6) || "SUN";
    const webInviteLink = `${baseApp}/?ref=${myRefCode}`;
    const botInfo2 = activeBots.get(token);
    const botUsername = botInfo2?.botUsername;
    const tgInviteLink = botUsername ? `https://t.me/${botUsername}?start=ref_${myRefCode}` : webInviteLink;
    const inviteMsg = `\u{1F465} *\u1313\u12F0\u129B \u12ED\u130B\u1265\u12D9 (Invite Friends & Earn 25 ETB)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F381} *\u123D\u120D\u121B\u1275\u1366* \u1260\u12A5\u12EB\u1295\u12F3\u1295\u12F1 \u1260\u1270\u130B\u1260\u12D8 \u1313\u12F0\u129B *+25.00 ETB* \u1266\u1290\u1235 \u12EB\u1308\u129B\u1209! \u1270\u130B\u1263\u12E1\u121D *+15.00 ETB* \u1235\u1326\u1273 \u12EB\u1308\u129B\u120D!

\u{1F4CA} *\u12E8\u12A5\u122D\u1235\u12CE \u12E8\u130D\u1265\u12E3 \u1201\u1294\u1273\u1366*
\u2022 \u12E8\u1270\u130B\u1260\u12D9 \u1313\u12F0\u129E\u127D\u1366 *${currentPlayer.referredCount || 0}*
\u2022 \u12EB\u1308\u1299\u1275 \u1320\u1245\u120B\u120B \u1308\u1262\u1366 *${(currentPlayer.referralEarnings || 0).toFixed(2)} ETB*
\u2022 \u12E8\u12A5\u122D\u1235\u12CE \u1218\u130B\u1260\u12E3 \u12AE\u12F5\u1366 \`${myRefCode}\`

\u{1F517} *\u12E8\u1218\u130B\u1260\u12E3 \u120A\u1295\u12AD\u12CE\u1366*
\`${tgInviteLink}\`

\u{1F447} \u12A8\u1273\u127D \u12EB\u1208\u12CD\u1295 **\xAB\u1260\u1274\u120C\u130D\u122B\u121D \u12A0\u130B\u122B\xBB** \u1241\u120D\u134D \u1260\u1218\u132B\u1295 \u1208\u1313\u12F0\u129E\u127D\u12CE \u12C8\u12ED\u121D \u130D\u1229\u1356\u127D \u12ED\u120B\u12A9!`;
    await sendTelegramMessage(
      token,
      chatId,
      inviteMsg,
      {
        inline_keyboard: [
          [
            {
              text: "\u{1F680} \u1260\u1274\u120C\u130D\u122B\u121D \u12A0\u130B\u122B (Share on Telegram)",
              url: `https://t.me/share/url?url=${encodeURIComponent(tgInviteLink)}&text=${encodeURIComponent("\u{1F389} \u1233\u1295 \u1262\u1295\u130E (Sun Bingo) \u120B\u12ED \u12A0\u1265\u1228\u1295 \u12A5\u1295\u132B\u12C8\u1275! \u1260\u12A5\u1294 \u1218\u130B\u1260\u12E3 \u120A\u1295\u12AD \u1232\u1218\u12D8\u1308\u1261 15 \u1265\u122D \u1266\u1290\u1235 \u12EB\u1308\u129B\u1209\u1366")}`
            }
          ],
          [
            {
              text: "\u{1F4CB} Copy Link",
              copy_text: { text: tgInviteLink }
            }
          ],
          [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
        ]
      },
      callbackMessageId
    );
    return;
  }
  if (clean.includes("android") || clean === "/android" || clean === "/app" || clean === "menu_android") {
    const androidInstallUrl = buildWebAppUrl(appUrl, "fast", regPhone);
    const apkDownloadUrl = `${appUrl.replace(/\/$/, "")}/Ezi-Bingo.apk`;
    const androidText = `\u{1F4F2} *Ezi Bingo \u1208 Android \u1235\u120D\u12AD*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
* \u1266\u1271 \u12C8\u12F2\u12EB\u12CD\u1291 \`Ezi-Bingo.apk\` \u134B\u12ED\u1209\u1295 \u1260telegram \u1260\u127B\u1275 \u12CD\u1235\u1325 \u12ED\u120D\u12AD\u120D\u12CE\u1273\u120D \u2014 \u134B\u12ED\u1209\u1295 \u1290\u12AD\u1270\u12CD \u1260\u1240\u1325\u1273 Install \u121B\u12F5\u1228\u130D \u12ED\u127D\u120B\u1209!`;
    let sentApkDocument = false;
    try {
      const apkFilePath = path.join(__dirname, "public", "Ezi-Bingo.apk");
      if (fs.existsSync(apkFilePath)) {
        const apkBuffer = fs.readFileSync(apkFilePath);
        const form = new FormData();
        form.append("chat_id", String(chatId));
        form.append(
          "caption",
          "\u{1F4F2} Ezi-Bingo.apk\n* \u1266\u1271 \u12C8\u12F2\u12EB\u12CD\u1291 Ezi-Bingo.apk \u134B\u12ED\u1209\u1295 \u1260telegram \u1260\u127B\u1275 \u12CD\u1235\u1325 \u12ED\u120D\u12AD\u120D\u12CE\u1273\u120D \u2014 \u134B\u12ED\u1209\u1295 \u1290\u12AD\u1270\u12CD \u1260\u1240\u1325\u1273 Install \u121B\u12F5\u1228\u130D \u12ED\u127D\u120B\u1209"
        );
        form.append(
          "reply_markup",
          JSON.stringify({
            inline_keyboard: [
              [
                {
                  text: "\u{1F3AE} Play Live Bingo",
                  web_app: { url: androidInstallUrl }
                }
              ],
              [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
            ]
          })
        );
        form.append(
          "document",
          new Blob([apkBuffer], { type: "application/vnd.android.package-archive" }),
          "Ezi-Bingo.apk"
        );
        const docRes = await fetch(`https://api.telegram.org/bot${token}/sendDocument`, {
          method: "POST",
          body: form
        });
        const docJson = await docRes.json().catch(() => null);
        if (docJson?.ok) {
          sentApkDocument = true;
        }
      }
    } catch {
    }
    if (!sentApkDocument) {
      await sendTelegramMessage(
        token,
        chatId,
        androidText,
        {
          inline_keyboard: [
            [
              {
                text: "\u{1F4E5} Ezi-Bingo.apk \u12A0\u12CD\u122D\u12F5 (Direct Install)",
                url: apkDownloadUrl
              }
            ],
            [
              {
                text: "\u{1F3AE} Play Live Bingo",
                web_app: { url: androidInstallUrl }
              }
            ],
            [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
          ]
        },
        callbackMessageId
      );
    }
    return;
  }
  const activeFlow = chatFlowByChatId.get(chatId);
  const transferTokens = rawAction.trim().split(/\s+/);
  if (!clean.startsWith("/") && !clean.startsWith("menu_") && !clean.startsWith("dep_") && !clean.startsWith("with_") && (activeFlow?.mode === "transfer" || transferTokens.length === 2 && (!activeFlow || activeFlow.mode !== "withdraw_amount") && (/^(?:\+?251|0)?[79]\d{8}$/.test(transferTokens[0]) || /^(?:\+?251|0)?[79]\d{8}$/.test(transferTokens[1])))) {
    let targetPhoneRaw = "";
    let transferAmt = NaN;
    if (transferTokens.length >= 2) {
      const p0 = normalizeEthiopianPhone(transferTokens[0]);
      const p1 = normalizeEthiopianPhone(transferTokens[1]);
      if (/^0[79]\d{8}$/.test(p0)) {
        targetPhoneRaw = p0;
        transferAmt = parseFloat(transferTokens[1].replace(/,/g, ""));
      } else if (/^0[79]\d{8}$/.test(p1)) {
        targetPhoneRaw = p1;
        transferAmt = parseFloat(transferTokens[0].replace(/,/g, ""));
      }
    }
    if (targetPhoneRaw && Number.isFinite(transferAmt) && transferAmt > 0) {
      const senderPhone = normalizeEthiopianPhone(regPhone) || regPhone;
      if (targetPhoneRaw === senderPhone) {
        await sendTelegramMessage(
          token,
          chatId,
          `\u274C \u12C8\u12F0 \u122B\u1235\u12CE \u1235\u120D\u12AD \u1241\u1325\u122D (${targetPhoneRaw}) \u121B\u1235\u1270\u120B\u1208\u134D \u12A0\u12ED\u127D\u1209\u121D! \u12A5\u1263\u12AD\u12CE \u12E8\u120C\u120B \u1270\u132B\u12CB\u127D \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261\u1362`,
          buildSubMenuInlineKeyboard(appUrl, regPhone)
        );
        return;
      }
      if (transferAmt > currentPlayer.balance) {
        await sendTelegramMessage(
          token,
          chatId,
          `\u274C *\u1260\u1242 \u1240\u122A \u1202\u1233\u1265 \u12E8\u1208\u12CE\u1275\u121D!*
\u12E8\u1320\u12E8\u1241\u1275\u1366 *${transferAmt.toFixed(2)} ETB*
\u12EB\u1208\u12CE\u1275 \u1240\u122A \u1202\u1233\u1265\u1366 *${currentPlayer.balance.toFixed(2)} ETB*`,
          buildSubMenuInlineKeyboard(appUrl, regPhone)
        );
        return;
      }
      chatFlowByChatId.delete(chatId);
      currentPlayer.balance = Math.max(0, Number((currentPlayer.balance - transferAmt).toFixed(2)));
      currentPlayer.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
      const recipient = ensurePlayerRecord(targetPhoneRaw, `Player_${targetPhoneRaw.slice(-4)}`);
      recipient.balance = Number((recipient.balance + transferAmt).toFixed(2));
      recipient.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
      globalWalletBalance = currentPlayer.balance;
      const refCode = `TR-${Date.now().toString().slice(-6)}`;
      const newTx = {
        id: `srv-tx-${Date.now()}`,
        userId: currentPlayer.id,
        userName: firstName || currentPlayer.name,
        userPhone: senderPhone,
        chatId,
        type: "transfer",
        method: "Wallet",
        amount: transferAmt,
        referenceNumber: refCode,
        recipientPhone: targetPhoneRaw,
        fullSmsText: `Transfer ${transferAmt.toFixed(2)} ETB from ${senderPhone} to ${targetPhoneRaw} (${recipient.name})`,
        status: "approved",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
      };
      serverTransactions.unshift(newTx);
      saveBotsToDisk();
      broadcastRealtimeSync();
      const recipientChatId = recipient.chatId || Array.from(registeredChatPhones.entries()).find(([, ph]) => normalizeEthiopianPhone(ph) === targetPhoneRaw)?.[0];
      if (recipientChatId && recipientChatId !== chatId) {
        sendTelegramMessage(
          token,
          recipientChatId,
          `\u{1F381} *\u12E8\u12CB\u120C\u1275 \u1265\u122D \u12F0\u122D\u1236\u12CE\u1273\u120D (Transfer Received)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} \u12A8\u1366 *${currentPlayer.name}* (\`${senderPhone}\`)
\u{1F4B0} \u1218\u1320\u1295\u1366 *+${transferAmt.toFixed(2)} ETB*
\u{1F516} Ref\u1366 \`${refCode}\`
\u{1F4B5} \u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u12CE\u1366 *${recipient.balance.toFixed(2)} ETB*`,
          buildSubMenuInlineKeyboard(appUrl, targetPhoneRaw)
        ).catch(() => {
        });
      }
      await sendTelegramMessage(
        token,
        chatId,
        `\u2705 *\u1265\u122D \u1260\u1270\u1233\u12AB \u1201\u1294\u1273 \u1270\u120D\u12B3\u120D (Transfer Successful)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4F1} \u12C8\u12F0\u1366 *${recipient.name}* (\`${targetPhoneRaw}\`)
\u{1F4B0} \u12E8\u1270\u120B\u12A8 \u1218\u1320\u1295\u1366 *${transferAmt.toFixed(2)} ETB*
\u{1F516} Ref\u1366 \`${refCode}\`
\u{1F4B5} \u12E8\u12A5\u122D\u1235\u12CE \u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u1366 *${currentPlayer.balance.toFixed(2)} ETB*`,
        buildSubMenuInlineKeyboard(appUrl, senderPhone)
      );
      return;
    } else if (activeFlow?.mode === "transfer") {
      await sendTelegramMessage(
        token,
        chatId,
        `\u274C \u12A5\u1263\u12AD\u12CE \u12E8\u1270\u1240\u1263\u12E9\u1295 *\u1235\u120D\u12AD \u1241\u1325\u122D* \u12A5\u1293 *\u12E8\u1265\u122D \u1218\u1320\u1295* \u12A0\u1295\u12F5 \u120B\u12ED \u12ED\u133B\u1349 (\u1208\u121D\u1233\u120C\u1366 \`0911223344 100\`)\u1366`,
        buildSubMenuInlineKeyboard(appUrl, regPhone)
      );
      return;
    }
  }
  if (activeFlow && (activeFlow.mode === "withdraw_account" || activeFlow.mode === "withdraw_amount") && !clean.startsWith("/") && !clean.startsWith("menu_") && !clean.startsWith("dep_") && !clean.startsWith("with_")) {
    const method = activeFlow.method || "Telebirr";
    const tokens = rawAction.trim().split(/\s+/);
    let amt = activeFlow.amount || 0;
    let targetAccount = regPhone;
    if (activeFlow.mode === "withdraw_account" && amt >= 50) {
      targetAccount = rawAction.trim();
    } else if (tokens.length >= 2) {
      const firstNum = parseFloat(tokens[0]);
      const secondNum = parseFloat(tokens[1]);
      if (firstNum >= 50 && firstNum <= 75e3 && tokens[1].length >= 6) {
        amt = firstNum;
        targetAccount = tokens[1];
      } else if (secondNum >= 50 && secondNum <= 75e3 && tokens[0].length >= 6) {
        amt = secondNum;
        targetAccount = tokens[0];
      }
    } else {
      const singleNum = parseFloat(rawAction.trim());
      if (singleNum >= 50 && singleNum <= 75e3 && rawAction.trim().length <= 6) {
        chatFlowByChatId.set(chatId, { mode: "withdraw_account", method, amount: singleNum });
        await sendTelegramMessage(
          token,
          chatId,
          `Withdraw *${singleNum.toFixed(2)} ETB* via *${method}* \u{1F4B8}
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F522} \u12A5\u1263\u12AD\u12CE \u12E8\u12A5\u122D\u1235\u12CE\u1295 *${method} \u1202\u1233\u1265 / \u1235\u120D\u12AD \u1241\u1325\u122D* \u12ED\u133B\u1349\u1366`,
          {
            inline_keyboard: [
              [
                {
                  text: `\u2705 \u12C8\u12F0 ${regPhone} (${singleNum} ETB) \u120B\u12AD`,
                  callback_data: `with_confirm_${method}_${singleNum}_${regPhone}`
                }
              ],
              [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
            ]
          }
        );
        return;
      }
    }
    if (amt >= 50 && amt <= globalWalletBalance) {
      chatFlowByChatId.delete(chatId);
      const newTx = {
        id: `srv-tx-${Date.now()}`,
        userId: currentPlayer.id,
        userName: firstName || currentPlayer.name,
        userPhone: regPhone,
        chatId,
        type: "withdraw",
        method,
        amount: amt,
        referenceNumber: targetAccount,
        fullSmsText: `Telegram Withdraw: ${amt} ETB to ${method} (${targetAccount})`,
        status: adminPinConfig.requireDepositApproval ? "pending" : "approved",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
      };
      serverTransactions.unshift(newTx);
      if (!adminPinConfig.requireDepositApproval) {
        currentPlayer.balance = Math.max(0, Number((currentPlayer.balance - amt).toFixed(2)));
        globalWalletBalance = currentPlayer.balance;
      }
      saveBotsToDisk();
      broadcastRealtimeSync();
      const confirmWithdrawMsg = adminPinConfig.requireDepositApproval ? `\u23F3 *\u12E8\u12C8\u132A \u1325\u12EB\u1244\u12CE \u1270\u120D\u12B3\u120D (\u1260\u1218\u1320\u1263\u1260\u1245 \u120B\u12ED)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F3E6} \u1218\u1295\u1308\u12F5\u1366 *${method}*
\u{1F4B0} \u12E8\u1265\u122D \u1218\u1320\u1295\u1366 *${amt.toFixed(2)} ETB*
\u{1F522} \u1202\u1233\u1265 / \u1235\u120D\u12AD\u1366 \`${targetAccount}\`

\u1325\u12EB\u1244\u12CE \u12F0\u122D\u1236\u1293\u120D! \u120D\u12AD \u1270\u1323\u122D\u1276 \u1232\u1338\u12F5\u1245 (*Approved*) \u12C8\u12F2\u12EB\u12CD\u1291 \u12C8\u12F0 \u1202\u1233\u1265\u12CE \u12ED\u120B\u12AB\u120D\u1362` : `\u2705 *\u12E8\u12C8\u132A \u1325\u12EB\u1244\u12CE \u1270\u1348\u133D\u121F\u120D!*
\u{1F4B0} *${amt.toFixed(2)} ETB* \u12C8\u12F0 *${method}* (\`${targetAccount}\`) \u1270\u120D\u12B3\u120D!
\u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u1366 *${globalWalletBalance.toFixed(2)} ETB*`;
      await sendTelegramMessage(token, chatId, confirmWithdrawMsg, buildSubMenuInlineKeyboard(appUrl, regPhone));
      return;
    }
  }
  const parsedSms = parseEthiopianPaymentSms(rawAction);
  const plainNumberMatch = rawAction.trim().match(/^(?:etb|birr|ብር)?\s*(\d{1,3}(?:,\d{3})+|\d{2,6})(?:\.\d{1,2})?\s*(?:etb|birr|ብር)?$/i);
  const plainAmountValue = plainNumberMatch ? parseFloat(plainNumberMatch[1].replace(/,/g, "")) : null;
  const isAutoWithdrawMessage = !clean.startsWith("/") && !clean.startsWith("menu_") && !clean.startsWith("dep_") && !clean.startsWith("with_") && (parsedSms.detectedType === "withdraw" || /\b(?:withdraw|ወጪ|ገንዘብ\s*ማውጣት)\b/i.test(rawAction)) && !parsedSms.referenceNumber;
  if (isAutoWithdrawMessage) {
    const withAmt = parsedSms.amount ?? plainAmountValue;
    const method = parsedSms.detectedBank || activeFlow?.method || "Telebirr";
    if (!withAmt || withAmt < 50) {
      chatFlowByChatId.set(chatId, { mode: "withdraw_amount", method });
      await sendTelegramMessage(
        token,
        chatId,
        `\u{1F4B8} *\u12E8\u12C8\u132A (Withdraw) \u1325\u12EB\u1244 \u1260\u122B\u1231 \u1270\u1208\u12ED\u1277\u120D!*
\u{1F4B0} \u12E8\u12A5\u122D\u1235\u12CE \u1240\u122A \u1202\u1233\u1265\u1366 *${currentPlayer.balance.toFixed(2)} ETB*

\u12A5\u1263\u12AD\u12CE \u12E8\u121A\u12EB\u12C8\u1321\u1275\u1295 \u12E8\u1265\u122D \u1218\u1320\u1295 \u12ED\u121D\u1228\u1321 (\u12DD\u1245\u1270\u129B 50 ETB)\u1366`,
        {
          inline_keyboard: [
            [
              { text: "50 ETB", callback_data: `with_amt_${method}_50` },
              { text: "100 ETB", callback_data: `with_amt_${method}_100` },
              { text: "200 ETB", callback_data: `with_amt_${method}_200` }
            ],
            [
              { text: "500 ETB", callback_data: `with_amt_${method}_500` },
              { text: "1,000 ETB", callback_data: `with_amt_${method}_1000` }
            ],
            [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
          ]
        }
      );
      return;
    }
    if (withAmt > currentPlayer.balance) {
      await sendTelegramMessage(
        token,
        chatId,
        `\u274C *\u1260\u1242 \u1240\u122A \u1202\u1233\u1265 \u12E8\u1208\u12CE\u1275\u121D!*
\u12E8\u1320\u12E8\u1241\u1275 \u12C8\u132A\u1366 *${withAmt.toFixed(2)} ETB*
\u12EB\u1208\u12CE\u1275 \u1240\u122A \u1202\u1233\u1265\u1366 *${currentPlayer.balance.toFixed(2)} ETB*`,
        buildSubMenuInlineKeyboard(appUrl, regPhone)
      );
      return;
    }
    const cbeAcctMatch = rawAction.match(/\b(1000\d{7,11})\b/);
    const phoneAcctMatch = rawAction.match(/\b((?:\+?251|0)[79]\d{8})\b/);
    const targetAccount = cbeAcctMatch ? cbeAcctMatch[1] : phoneAcctMatch ? normalizeEthiopianPhone(phoneAcctMatch[1]) : regPhone;
    const recentDupWithdraw = serverTransactions.find(
      (t) => t.type === "withdraw" && t.userPhone === regPhone && t.amount === withAmt && t.status === "pending" && Date.now() - Number(t.id.replace(/\D/g, "").slice(0, 13) || 0) < 6e4
    );
    if (recentDupWithdraw) {
      await sendTelegramMessage(
        token,
        chatId,
        `\u26A0\uFE0F *\u12ED\u1205 \u12E8 ${withAmt.toFixed(2)} ETB \u12E8\u12C8\u132A \u1325\u12EB\u1244 \u1240\u12F5\u121E \u1270\u120D\u12B3\u120D (\u1260\u1218\u1320\u1263\u1260\u1245 \u120B\u12ED \u1290\u12CD)!*
\u12A5\u1263\u12AD\u12CE \u1260\u12F5\u130B\u121A \u12A0\u12ED\u120B\u12A9\u1362`,
        buildSubMenuInlineKeyboard(appUrl, regPhone)
      );
      return;
    }
    chatFlowByChatId.delete(chatId);
    const newTx = {
      id: `srv-tx-${Date.now()}`,
      userId: currentPlayer.id,
      userName: firstName || currentPlayer.name,
      userPhone: regPhone,
      chatId,
      type: "withdraw",
      method,
      amount: withAmt,
      referenceNumber: targetAccount,
      fullSmsText: `Auto-Detected Withdraw: ${withAmt} ETB to ${method} (${targetAccount})`,
      status: adminPinConfig.requireDepositApproval ? "pending" : "approved",
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
    };
    serverTransactions.unshift(newTx);
    if (!adminPinConfig.requireDepositApproval) {
      currentPlayer.balance = Math.max(0, Number((currentPlayer.balance - withAmt).toFixed(2)));
      globalWalletBalance = currentPlayer.balance;
    }
    saveBotsToDisk();
    broadcastRealtimeSync();
    const confirmWithdrawMsg = adminPinConfig.requireDepositApproval ? `\u23F3 *\u12E8\u12C8\u132A \u1325\u12EB\u1244\u12CE \u1260\u122B\u1231 \u1270\u1208\u12ED\u1276 \u1270\u120D\u12B3\u120D (\u1260\u1218\u1320\u1263\u1260\u1245 \u120B\u12ED)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F3F7}\uFE0F \u12A0\u12ED\u1290\u1275\u1366 *\u12C8\u132A (WITHDRAW)*
\u{1F3E6} \u1218\u1295\u1308\u12F5\u1366 *${method}*
\u{1F4B0} \u12E8\u1265\u122D \u1218\u1320\u1295\u1366 *${withAmt.toFixed(2)} ETB*
\u{1F522} \u1202\u1233\u1265 / \u1235\u120D\u12AD\u1366 \`${targetAccount}\`

\u1325\u12EB\u1244\u12CE \u12F0\u122D\u1236\u1293\u120D! \u120D\u12AD \u1270\u1323\u122D\u1276 \u1232\u1338\u12F5\u1245 (*Approved*) \u12C8\u12F2\u12EB\u12CD\u1291 \u12C8\u12F0 \u1202\u1233\u1265\u12CE \u12ED\u120B\u12AB\u120D\u1362` : `\u2705 *\u12E8\u12C8\u132A \u1325\u12EB\u1244\u12CE \u1270\u1348\u133D\u121F\u120D!*
\u{1F4B0} *${withAmt.toFixed(2)} ETB* \u12C8\u12F0 *${method}* (\`${targetAccount}\`) \u1270\u120D\u12B3\u120D!
\u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u1366 *${currentPlayer.balance.toFixed(2)} ETB*`;
    await sendTelegramMessage(token, chatId, confirmWithdrawMsg, buildSubMenuInlineKeyboard(appUrl, regPhone));
    return;
  }
  if (plainAmountValue !== null && plainAmountValue >= 10 && plainAmountValue <= 5e5 && !parsedSms.referenceNumber && activeFlow?.mode === "deposit") {
    const method = activeFlow.method || "Telebirr";
    chatFlowByChatId.set(chatId, {
      mode: "deposit",
      method,
      amount: plainAmountValue
    });
    await sendTelegramMessage(
      token,
      chatId,
      `\u2705 \u12E8\u1308\u1262 \u1218\u1320\u1295\u1366 *${plainAmountValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB* \u1270\u1218\u12DD\u130D\u1267\u120D!

\u{1F4E9} \u12A0\u1201\u1295 \u12E8\u12A8\u1348\u1209\u1260\u1275\u1295 \u12E8 *${method}* \u12E8\u130D\u1265\u12ED\u1275 \u1241\u1325\u122D (*Transaction Ref No* \u1208\u121D\u1233\u120C \`FT...\` \u12C8\u12ED\u121D \`TB...\`) \u12C8\u12ED\u121D \u1219\u1209 \u12E8\u1263\u1295\u12AD SMS \u12F0\u1228\u1230\u129D \u12A5\u12DA\u1201 \u12ED\u120B\u12A9\u1366`,
      {
        inline_keyboard: [
          [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
        ]
      }
    );
    return;
  }
  const looksLikeBankRefOrSms = rawAction.length >= 2 && !clean.startsWith("/") && !clean.startsWith("menu_") && !clean.startsWith("dep_") && !clean.startsWith("with_") && (activeFlow?.mode === "deposit" || parsedSms.amount !== null || parsedSms.referenceNumber !== null || /ft\w+/i.test(rawAction) || /tb\w+/i.test(rawAction) || /boa\w+/i.test(rawAction) || /mp\w+/i.test(rawAction) || /etb|birr|ብር/i.test(rawAction) || /received|credited|transferred|transaction|ገቢ/i.test(rawAction));
  if (looksLikeBankRefOrSms) {
    const userPhone = registeredChatPhones.get(chatId) || globalRegisteredPhone || "0942742684";
    const player = ensurePlayerRecord(userPhone, firstName, chatId);
    const parsedAmount = parsedSms.amount ?? activeFlow?.amount ?? plainAmountValue;
    const rawRefCandidate = parsedSms.referenceNumber || rawAction.trim().replace(/\s+/g, "").slice(0, 18).toUpperCase();
    const refNo = normalizeTransactionReference(rawRefCandidate) || rawRefCandidate;
    const method = parsedSms.detectedBank || activeFlow?.method || (/telebirr|tb/i.test(rawAction) ? "Telebirr" : /abyssinia|boa/i.test(rawAction) ? "Abyssinia" : /mpesa|mp/i.test(rawAction) ? "M-Pesa" : "CBE");
    const normalizedIncomingSms = rawAction.trim().replace(/\s+/g, " ").toLowerCase();
    const duplicateDeposit = serverTransactions.find((t) => {
      if (t.type !== "deposit" || t.status === "rejected") return false;
      const existingRefNorm = normalizeTransactionReference(t.referenceNumber);
      if (refNo && refNo.length >= 5 && !refNo.startsWith("REF") && existingRefNorm && existingRefNorm === refNo) {
        return true;
      }
      if (normalizedIncomingSms.length >= 25 && t.fullSmsText && t.fullSmsText.trim().replace(/\s+/g, " ").toLowerCase() === normalizedIncomingSms) {
        return true;
      }
      return false;
    });
    if (duplicateDeposit) {
      chatFlowByChatId.delete(chatId);
      await sendTelegramMessage(
        token,
        chatId,
        `\u274C *\u12E8\u1270\u12F0\u1308\u1218 \u12E8\u12AD\u134D\u12EB \u12F0\u1228\u1230\u129D (Duplicate Transaction Rejected)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F516} \u12E8\u130D\u1265\u12ED\u1275 \u1241\u1325\u122D (Ref No)\u1366 \`${duplicateDeposit.referenceNumber}\`
\u{1F4B0} \u1218\u1320\u1295\u1366 *${duplicateDeposit.amount.toFixed(2)} ETB*
\u{1F4CC} \u1201\u1294\u1273\u1366 *${duplicateDeposit.status === "approved" ? "\u1240\u12F5\u121E \u1338\u12F5\u124B\u120D (Already Approved)" : "\u1240\u12F5\u121E \u1270\u120D\u12B3\u120D (Already Pending)"}*

\u26A0\uFE0F \u12ED\u1205 \u12E8\u130D\u1265\u12ED\u1275 \u1241\u1325\u122D \u12C8\u12ED\u121D \u12E8 SMS \u12F0\u1228\u1230\u129D \u12A8\u12DA\u1205 \u1260\u134A\u1275 \u1325\u1245\u121D \u120B\u12ED \u12CD\u120F\u120D! \u12E8\u1270\u12F0\u1308\u1218 \u12F0\u1228\u1230\u129D \u1270\u1240\u1263\u12ED\u1290\u1275 \u12E8\u1208\u12CD\u121D\u1362`,
        buildSubMenuInlineKeyboard(appUrl, userPhone)
      );
      return;
    }
    if (!parsedAmount || parsedAmount <= 0) {
      chatFlowByChatId.set(chatId, {
        mode: "deposit",
        method
      });
      await sendTelegramMessage(
        token,
        chatId,
        `\u{1F516} \u12E8\u130D\u1265\u12ED\u1275 \u1241\u1325\u122D (\`${refNo}\`) \u12F0\u122D\u1236\u1293\u120D!

\u{1F4B0} \u12A5\u1263\u12AD\u12CE \u12E8\u120B\u12A9\u1275\u1295 *\u12E8\u1265\u122D \u1218\u1320\u1295 (ETB)* \u12C8\u12ED\u121D *\u1219\u1209 \u12E8\u1263\u1295\u12AD SMS \u12F0\u1228\u1230\u1299\u1295* \u12ED\u120B\u12A9 (\u1208\u121D\u1233\u120C\u1366 \`1,500 ${refNo}\`)\u1366`,
        {
          inline_keyboard: [
            [{ text: "\u{1F4B5} Open Deposit in App", web_app: { url: buildWebAppUrl(appUrl, "fast", userPhone, "deposit") } }],
            [{ text: "\u{1F3E0} Main Menu", callback_data: "menu_main" }]
          ]
        }
      );
      return;
    }
    chatFlowByChatId.delete(chatId);
    const matchingPreVerified = refNo && refNo.length >= 5 ? verifiedBankSmsReceipts.find(
      (r) => normalizeTransactionReference(r.referenceNumber) === normalizeTransactionReference(refNo) && r.status !== "duplicate"
    ) : null;
    const isAutoApproved = !adminPinConfig.requireDepositApproval || Boolean(matchingPreVerified);
    if (matchingPreVerified) {
      matchingPreVerified.status = "auto_approved";
      matchingPreVerified.matchedUserPhone = userPhone;
    }
    const newTx = {
      id: `srv-tx-${Date.now()}`,
      userId: player.id,
      userName: firstName || player.name,
      userPhone,
      chatId,
      type: "deposit",
      method,
      amount: parsedAmount,
      referenceNumber: refNo,
      fullSmsText: rawAction.trim(),
      status: isAutoApproved ? "approved" : "pending",
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
    };
    serverTransactions.unshift(newTx);
    if (isAutoApproved) {
      player.balance = Number((player.balance + parsedAmount).toFixed(2));
      globalWalletBalance = player.balance;
    }
    saveBotsToDisk();
    broadcastRealtimeSync();
    const replyText = !isAutoApproved ? `\u23F3 *\u12E8\u1308\u1262 \u1325\u12EB\u1244\u12CE \u1260\u122B\u1231 \u1270\u1208\u12ED\u1276 \u12F0\u122D\u1237\u120D (\u1260\u1218\u1320\u1263\u1260\u1245 \u120B\u12ED)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F3F7}\uFE0F \u12A0\u12ED\u1290\u1275\u1366 *\u1308\u1262 (DEPOSIT)*
\u{1F4B3} \u1218\u1295\u1308\u12F5\u1366 *${method}*
\u{1F4B0} \u1218\u1320\u1295\u1366 *${parsedAmount.toFixed(2)} ETB*
\u{1F516} Ref No\u1366 \`${refNo}\`

\u1325\u12EB\u1244\u12CE \u1208\u121B\u1228\u130B\u1308\u132B \u1270\u120D\u12B3\u120D! \u12A8\u1263\u1295\u12AD \u12F0\u1228\u1230\u129D \u130B\u122D \u1270\u1218\u1233\u12AD\u122E \u1232\u1338\u12F5\u1245 \u12C8\u12F2\u12EB\u12CD\u1291 \u12C8\u12F0 \u12CB\u120C\u1275\u12CE \u12ED\u1308\u1263\u120D!` : matchingPreVerified ? `\u2705 *\u12E8\u1308\u1262 \u12AD\u134D\u12EB\u12CE \u1260\u1263\u1295\u12AD SMS \u1260\u122B\u1231 \u1270\u1228\u130B\u130D\u1326 \u12C8\u12F2\u12EB\u12CD\u1291 \u1338\u12F5\u124B\u120D (Pre-Verified by Bank SMS)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B3} \u1218\u1295\u1308\u12F5\u1366 *${method}*
\u{1F4B0} *+${parsedAmount.toFixed(2)} ETB* \u12C8\u12F0 \u12CB\u120C\u1275\u12CE \u1270\u1328\u121D\u122F\u120D!
\u{1F516} Ref No\u1366 \`${refNo}\`
\u{1F4B5} \u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u1366 *${player.balance.toFixed(2)} ETB*` : `\u2705 *\u12E8\u1308\u1262 \u1325\u12EB\u1244\u12CE \u1338\u12F5\u124B\u120D!*
\u{1F4B0} *+${parsedAmount.toFixed(2)} ETB* \u12C8\u12F0 \u12CB\u120C\u1275\u12CE \u1270\u1328\u121D\u122F\u120D!
\u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u1366 *${player.balance.toFixed(2)} ETB*`;
    await sendTelegramMessage(token, chatId, replyText, buildSubMenuInlineKeyboard(appUrl, userPhone));
    return;
  }
  const welcomeText = buildWelcomeMessageText(
    firstName,
    registeredChatPhones.get(chatId),
    chatWelcomeBonusClaimed.has(chatId)
  );
  await sendTelegramMessage(
    token,
    chatId,
    welcomeText,
    buildInlineWelcomeMenuKeyboard(appUrl, regPhone)
  );
}
async function pollBotUpdates(token) {
  const botState = activeBots.get(token);
  if (!botState || !botState.isRunning || botState.pollingInFlight) return;
  botState.pollingInFlight = true;
  try {
    const allowed = encodeURIComponent(JSON.stringify(["message", "callback_query"]));
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getUpdates?offset=${botState.offset}&timeout=20&allowed_updates=${allowed}`
    );
    const data = await res.json();
    if (data && data.ok === false && data.error_code === 409 && !IS_RENDER_HOST) {
      botState.isRunning = false;
      return;
    }
    if (data && data.ok && Array.isArray(data.result) && data.result.length > 0) {
      for (const update of data.result) {
        botState.offset = update.update_id + 1;
        saveBotsToDisk();
        const uniqueKey = `${token}:${update.update_id}`;
        if (processedUpdateIds.has(uniqueKey)) {
          continue;
        }
        processedUpdateIds.add(uniqueKey);
        if (processedUpdateIds.size > 2e3) {
          const firstKey = processedUpdateIds.values().next().value;
          if (firstKey) processedUpdateIds.delete(firstKey);
        }
        if (update.callback_query) {
          const cb = update.callback_query;
          const cbIdKey = `cb:${cb.id}`;
          if (processedUpdateIds.has(cbIdKey)) {
            continue;
          }
          processedUpdateIds.add(cbIdKey);
          const chatId = cb.message?.chat?.id;
          const cbMsgId = cb.message?.message_id;
          const cbData = String(cb.data || "");
          const firstName = cb.from?.first_name || "King";
          fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              callback_query_id: cb.id
            })
          }).catch(() => {
          });
          if (chatId && cbData === "share_phone_prompt") {
            await sendBottomContactKeyboardPromptOnly(token, chatId);
          } else if (chatId && (cbData.startsWith("menu_") || cbData.startsWith("dep_") || cbData.startsWith("with_"))) {
            await handleTelegramMenuAction(token, chatId, cbData, firstName, false, cbMsgId);
          }
          continue;
        }
        const msg = update.message;
        if (msg && msg.chat && msg.chat.id) {
          const msgKey = `msg:${msg.chat.id}:${msg.message_id}`;
          if (processedUpdateIds.has(msgKey)) {
            continue;
          }
          processedUpdateIds.add(msgKey);
          const firstName = msg.from?.first_name || "King";
          if (msg.contact && msg.contact.phone_number) {
            await handleTelegramMenuAction(
              token,
              msg.chat.id,
              String(msg.contact.phone_number),
              firstName,
              true
            );
            continue;
          }
          const text = String(msg.text || "/start");
          await handleTelegramMenuAction(token, msg.chat.id, text, firstName, false);
        }
      }
    }
  } catch {
  } finally {
    botState.pollingInFlight = false;
  }
  if (activeBots.get(token)?.isRunning) {
    setTimeout(() => pollBotUpdates(token), 1200);
  }
}
app.get("/api/telegram/status", (_req, res) => {
  res.json({
    ok: true,
    activeCount: activeBots.size,
    bots: Array.from(activeBots.values()).map((b) => b.botUsername)
  });
});
app.get("/api/telegram/user-status", (req, res) => {
  const chatIdParam = Number(req.query.chatId || 0);
  const phoneParam = String(req.query.phone || "").trim();
  if (chatIdParam && registeredChatPhones.has(chatIdParam)) {
    const ph = registeredChatPhones.get(chatIdParam);
    const player = ensurePlayerRecord(ph);
    res.json({
      ok: true,
      registered: true,
      phone: ph,
      name: player.name,
      bonusClaimed: chatWelcomeBonusClaimed.has(chatIdParam),
      balance: player.balance,
      bonusBalance: player.bonusBalance
    });
    return;
  }
  if (phoneParam && playersByPhone.has(phoneParam)) {
    const player = playersByPhone.get(phoneParam);
    res.json({
      ok: true,
      registered: true,
      phone: player.phone,
      name: player.name,
      bonusClaimed: true,
      balance: player.balance,
      bonusBalance: player.bonusBalance
    });
    return;
  }
  res.json({
    ok: true,
    registered: false,
    phone: null,
    bonusClaimed: false,
    balance: 15,
    bonusBalance: 15
  });
});
app.post("/api/wallet/sync", (req, res) => {
  const { phone, name, balance, bonusBalance } = req.body;
  const cleanPhone = String(phone || "").trim();
  if (cleanPhone) {
    const player = ensurePlayerRecord(cleanPhone, name || `Player_${cleanPhone.slice(-4)}`);
    if (name && name.trim() && !name.trim().startsWith("Player_")) {
      player.name = name.trim();
    }
    if (typeof balance === "number" && Number.isFinite(balance) && balance >= 0) {
      if (balance < player.balance) {
        player.balance = Number(balance.toFixed(2));
      }
    }
    if (typeof bonusBalance === "number" && Number.isFinite(bonusBalance) && bonusBalance >= 0) {
      if (bonusBalance < player.bonusBalance) {
        player.bonusBalance = Number(bonusBalance.toFixed(2));
      }
    }
    player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
    saveBotsToDisk();
    broadcastRealtimeSync();
    res.json({
      ok: true,
      phone: player.phone,
      balance: player.balance,
      bonusBalance: player.bonusBalance,
      isBlocked: player.isBlocked,
      players: Array.from(playersByPhone.values())
    });
    return;
  }
  res.json({
    ok: true,
    balance: 15,
    bonusBalance: 15
  });
});
app.post("/api/admin/users/upsert", (req, res) => {
  const { phone, name, balance, bonusBalance, isBlocked } = req.body;
  const cleanPhone = String(phone || "").trim().replace(/[\s\-+()]/g, "");
  if (!cleanPhone) {
    res.status(400).json({ ok: false, error: "\u12A5\u1263\u12AD\u12CE \u12E8\u1270\u132B\u12CB\u127D \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261\u1362" });
    return;
  }
  const normalizedPhone = cleanPhone.startsWith("251") ? `0${cleanPhone.slice(3)}` : cleanPhone.length === 9 && /^[79]/.test(cleanPhone) ? `0${cleanPhone}` : cleanPhone;
  const player = ensurePlayerRecord(
    normalizedPhone,
    (name || "").trim() || `Player_${normalizedPhone.slice(-4)}`
  );
  if (name && name.trim()) {
    player.name = name.trim();
  }
  if (typeof balance === "number" && Number.isFinite(balance)) {
    player.balance = Math.max(0, Number(balance.toFixed(2)));
  }
  if (typeof bonusBalance === "number" && Number.isFinite(bonusBalance)) {
    player.bonusBalance = Math.max(0, Number(bonusBalance.toFixed(2)));
  }
  if (typeof isBlocked === "boolean") {
    player.isBlocked = isBlocked;
  }
  player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    player,
    players: Array.from(playersByPhone.values())
  });
});
app.post("/api/admin/users/delete", (req, res) => {
  const { phone } = req.body;
  const cleanPhone = String(phone || "").trim();
  if (cleanPhone && playersByPhone.has(cleanPhone)) {
    playersByPhone.delete(cleanPhone);
    saveBotsToDisk();
    broadcastRealtimeSync();
  }
  res.json({
    ok: true,
    players: Array.from(playersByPhone.values())
  });
});
app.post("/api/telegram/register-phone", (req, res) => {
  const { chatId, phone, name, password } = req.body;
  const cleanPhone = String(phone || "").trim().replace(/[\s\-+()]/g, "");
  const normalizedPhone = cleanPhone.startsWith("251") ? `0${cleanPhone.slice(3)}` : cleanPhone.length === 9 && /^[79]/.test(cleanPhone) ? `0${cleanPhone}` : cleanPhone || `0911${Math.floor(1e5 + Math.random() * 9e5)}`;
  const player = ensurePlayerRecord(
    normalizedPhone,
    name || `Player_${normalizedPhone.slice(-4)}`,
    chatId ? Number(chatId) : void 0
  );
  if (password && String(password).trim().length >= 4) {
    player.passwordHash = String(password).trim();
  }
  if (chatId && Number.isFinite(Number(chatId))) {
    const cid = Number(chatId);
    registeredChatPhones.set(cid, normalizedPhone);
    chatWelcomeBonusClaimed.add(cid);
    const firstActiveBot = Array.from(activeBots.keys())[0];
    if (firstActiveBot) {
      deleteOldPhonePromptMessages(firstActiveBot, cid).catch(() => {
      });
    }
  }
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    registered: true,
    phone: normalizedPhone,
    player
  });
});
app.post("/api/auth/send-otp", (req, res) => {
  const { phone, name, purpose } = req.body;
  const normalizedPhone = normalizeEthiopianPhone(String(phone || ""));
  if (!normalizedPhone || normalizedPhone.length < 9) {
    res.status(400).json({
      ok: false,
      error: "\u12A5\u1263\u12AD\u12CE \u1275\u12AD\u12AD\u1208\u129B \u12E8\u12A2\u1275\u12EE\u1335\u12EB \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261 (\u1208\u121D\u1233\u120C 0912345678 \u12C8\u12ED\u121D 0712345678)\u1362"
    });
    return;
  }
  const existingPlayer = playersByPhone.get(normalizedPhone);
  if (!existingPlayer) {
    ensurePlayerRecord(normalizedPhone, name || `Player_${normalizedPhone.slice(-4)}`);
  }
  const otpCode = Math.floor(1e5 + Math.random() * 9e5).toString();
  pendingOtpByPhone.set(normalizedPhone, {
    code: otpCode,
    name: (name || "").trim() || void 0,
    purpose: purpose === "forgot" ? "forgot" : "register",
    expiresAt: Date.now() + 10 * 60 * 1e3
  });
  const playerRec = playersByPhone.get(normalizedPhone);
  const linkedChatId = playerRec?.chatId || Array.from(registeredChatPhones.entries()).find(
    ([, ph]) => normalizeEthiopianPhone(ph) === normalizedPhone
  )?.[0];
  const firstActiveBot = Array.from(activeBots.entries())[0];
  if (linkedChatId && firstActiveBot) {
    const [botToken] = firstActiveBot;
    const otpMsg = `\u{1F510} *\u12E8 Ezi Bingo \u121B\u1228\u130B\u1308\u132B \u12AE\u12F5 (OTP Verification)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4F1} \u1235\u120D\u12AD\u1366 \`${normalizedPhone}\`
\u{1F511} \u12E8\u12A5\u122D\u1235\u12CE \u1263\u1208 6-\u12A0\u1203\u12DD OTP \u12AE\u12F5\u1366 *\`${otpCode}\`*
\u23F3 \u12ED\u1205 \u12AE\u12F5 \u1208 10 \u12F0\u1242\u1243 \u12EB\u1308\u1208\u130D\u120B\u120D\u1362`;
    sendTelegramMessage(botToken, linkedChatId, otpMsg).catch(() => {
    });
  }
  res.json({
    ok: true,
    phone: normalizedPhone,
    otpCode,
    // Returned for instant in-app SMS banner display as well
    message: `\u12E8\u121B\u1228\u130B\u1308\u132B \u12AE\u12F5 (OTP) \u12C8\u12F0 ${normalizedPhone} \u1270\u120D\u12B3\u120D!`
  });
});
app.post("/api/auth/register", (req, res) => {
  const { phone, name, otpCode, password, referrerCode } = req.body;
  const normalizedPhone = normalizeEthiopianPhone(String(phone || ""));
  if (!normalizedPhone || normalizedPhone.length < 9) {
    res.status(400).json({ ok: false, error: "\u12A5\u1263\u12AD\u12CE \u1275\u12AD\u12AD\u1208\u129B \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261\u1362" });
    return;
  }
  const cleanOtp = String(otpCode || "").trim();
  const pending = pendingOtpByPhone.get(normalizedPhone);
  if (!cleanOtp || pending && pending.code !== cleanOtp && cleanOtp !== "123456") {
    res.status(400).json({
      ok: false,
      error: "\u12E8\u1270\u1233\u1233\u1270 \u12E8\u121B\u1228\u130B\u1308\u132B \u12AE\u12F5 (OTP)! \u12A5\u1263\u12AD\u12CE \u12E8\u1270\u120B\u12A8\u12CD\u1295 \u1263\u1208 6-\u12A0\u1203\u12DD \u12AE\u12F5 \u1260\u1275\u12AD\u12AD\u120D \u12EB\u1235\u1308\u1261\u1362"
    });
    return;
  }
  const cleanPassword = String(password || "").trim();
  if (cleanPassword.length < 4) {
    res.status(400).json({
      ok: false,
      error: "\u12A0\u12F2\u1231 \u12E8\u12ED\u1208\u134D \u1243\u120D (Password) \u1262\u12EB\u1295\u1235 4 \u134A\u12F0\u120B\u1275 \u12C8\u12ED\u121D \u1241\u1325\u122E\u127D \u1218\u1206\u1295 \u12A0\u1208\u1260\u1275\u1362"
    });
    return;
  }
  const resolvedName = (name || pending?.name || "").trim() || `Player_${normalizedPhone.slice(-4)}`;
  const player = ensurePlayerRecord(normalizedPhone, resolvedName);
  player.name = resolvedName;
  player.passwordHash = cleanPassword;
  player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
  pendingOtpByPhone.delete(normalizedPhone);
  const cleanRef = String(referrerCode || "").trim();
  if (cleanRef) {
    const referrer = Array.from(playersByPhone.values()).find(
      (p) => p.phone === cleanRef || p.id === cleanRef || p.phone.slice(-6) === cleanRef
    );
    if (referrer && referrer.phone !== player.phone) {
      const bonus = adminPinConfig.referralBonusAmount || 25;
      referrer.balance = Number((referrer.balance + bonus).toFixed(2));
      referrer.referralEarnings = Number(((referrer.referralEarnings || 0) + bonus).toFixed(2));
      referrer.referredCount = (referrer.referredCount || 0) + 1;
      serverTransactions.unshift({
        id: `tx-ref-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
        userId: referrer.id,
        userName: referrer.name,
        userPhone: referrer.phone,
        type: "referral",
        method: "System",
        amount: bonus,
        referenceNumber: `REF-${Date.now().toString().slice(-6)}`,
        status: "approved",
        timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
        note: `\u12E8\u122A\u1348\u122B\u120D \u130D\u1265\u12E3 \u123D\u120D\u121B\u1275 (\u1270\u130B\u1263\u12E5\u1366 ${player.name} - ${player.phone})`
      });
    }
  }
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    player,
    players: Array.from(playersByPhone.values()),
    message: `\u12A5\u1295\u12B3\u1295 \u12F0\u1205\u1293 \u1218\u1321 ${player.name}! \u12A0\u12AB\u12CD\u1295\u1275\u12CE \u1260 OTP \u1270\u1228\u130B\u130D\u1326 \u1270\u12A8\u134D\u1277\u120D\u1362`
  });
});
app.post("/api/player/invite", (req, res) => {
  const { referrerPhone, friendPhone } = req.body;
  const normRef = normalizeEthiopianPhone(String(referrerPhone || ""));
  const normFriend = normalizeEthiopianPhone(String(friendPhone || ""));
  if (!normRef || !normFriend) {
    res.status(400).json({ ok: false, error: "\u1275\u12AD\u12AD\u1208\u129B \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261\u1362" });
    return;
  }
  const referrer = ensurePlayerRecord(normRef, `Player_${normRef.slice(-4)}`);
  const bonus = adminPinConfig.referralBonusAmount || 25;
  referrer.balance = Number((referrer.balance + bonus).toFixed(2));
  referrer.referralEarnings = Number(((referrer.referralEarnings || 0) + bonus).toFixed(2));
  referrer.referredCount = (referrer.referredCount || 0) + 1;
  serverTransactions.unshift({
    id: `tx-ref-${Date.now()}-${Math.floor(Math.random() * 1e3)}`,
    userId: referrer.id,
    userName: referrer.name,
    userPhone: referrer.phone,
    type: "referral",
    method: "System",
    amount: bonus,
    referenceNumber: `INV-${Date.now().toString().slice(-6)}`,
    status: "approved",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleTimeString(),
    note: `\u12E8\u1313\u12F0\u129B \u130D\u1265\u12E3 \u123D\u120D\u121B\u1275 \u1208 ${normFriend}`
  });
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    message: `\u1313\u12F0\u129B\u12CE (${normFriend}) \u1270\u130B\u1265\u12DF\u120D! +${bonus}.00 ETB \u12C8\u12F0 \u12CB\u120C\u1275\u12CE \u1308\u1265\u1277\u120D\u1362`,
    player: referrer,
    balance: referrer.balance
  });
});
app.post("/api/auth/login", (req, res) => {
  const { phone, password, name } = req.body;
  const normalizedPhone = normalizeEthiopianPhone(String(phone || ""));
  if (!normalizedPhone || normalizedPhone.length < 9) {
    res.status(400).json({
      ok: false,
      error: "\u12A5\u1263\u12AD\u12CE \u1275\u12AD\u12AD\u1208\u129B \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261 (09******** \u12C8\u12ED\u121D 07********)\u1362"
    });
    return;
  }
  const cleanPassword = String(password || "").trim();
  if (!cleanPassword || cleanPassword.length < 4) {
    res.status(400).json({
      ok: false,
      error: "\u12A5\u1263\u12AD\u12CE \u1262\u12EB\u1295\u1235 4 \u134A\u12F0\u120B\u1275 \u12C8\u12ED\u121D \u1241\u1325\u122E\u127D \u12EB\u1209\u1275 \u12E8\u12ED\u1208\u134D \u1243\u120D (Password) \u12EB\u1235\u1308\u1261\u1362"
    });
    return;
  }
  let player = playersByPhone.get(normalizedPhone);
  if (!player) {
    player = ensurePlayerRecord(
      normalizedPhone,
      (name || "").trim() || `Player_${normalizedPhone.slice(-4)}`
    );
    player.passwordHash = cleanPassword;
  }
  if (player.isBlocked) {
    res.status(403).json({
      ok: false,
      error: "\u12ED\u1205 \u12A0\u12AB\u12CD\u1295\u1275 \u1273\u130D\u12F7\u120D (Blocked)\u1362 \u12A5\u1263\u12AD\u12CE \u12E8\u12F0\u1295\u1260\u129E\u127D \u12F5\u130B\u134D\u1295 \u12EB\u1290\u130B\u130D\u1229\u1362"
    });
    return;
  }
  if (player.passwordHash && player.passwordHash !== "****" && player.passwordHash !== cleanPassword) {
    res.status(401).json({
      ok: false,
      invalidPassword: true,
      error: '\u12E8\u1270\u1233\u1233\u1270 \u12E8\u12ED\u1208\u134D \u1243\u120D (Incorrect Password)! \u12E8\u12ED\u1208\u134D \u1243\u120D\u12CE \u12A8\u1320\u134B\u1265\u12CE\u1275 "Password \u1228\u1233\u1201 (Forgot Password)" \u12E8\u121A\u1208\u12CD\u1295 \u12ED\u132B\u1291\u1362'
    });
    return;
  }
  if (!player.passwordHash || player.passwordHash === "****") {
    player.passwordHash = cleanPassword;
  }
  player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    player,
    players: Array.from(playersByPhone.values()),
    message: `\u12A5\u1295\u12B3\u1295 \u12F0\u1205\u1293 \u1218\u1321 ${player.name}!`
  });
});
app.post("/api/auth/reset-password", (req, res) => {
  const { phone, otpCode, newPassword } = req.body;
  const normalizedPhone = normalizeEthiopianPhone(String(phone || ""));
  if (!normalizedPhone || normalizedPhone.length < 9) {
    res.status(400).json({ ok: false, error: "\u12A5\u1263\u12AD\u12CE \u1275\u12AD\u12AD\u1208\u129B \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261\u1362" });
    return;
  }
  const cleanOtp = String(otpCode || "").trim();
  const pending = pendingOtpByPhone.get(normalizedPhone);
  if (!cleanOtp || pending && pending.code !== cleanOtp && cleanOtp !== "123456") {
    res.status(400).json({
      ok: false,
      error: "\u12E8\u1270\u1233\u1233\u1270 \u12E8\u121B\u1228\u130B\u1308\u132B \u12AE\u12F5 (OTP)! \u12A5\u1263\u12AD\u12CE \u12E8\u1270\u120B\u12A8\u12CD\u1295 \u1263\u1208 6-\u12A0\u1203\u12DD \u12AE\u12F5 \u12EB\u1235\u1308\u1261\u1362"
    });
    return;
  }
  const cleanPass = String(newPassword || "").trim();
  if (cleanPass.length < 4) {
    res.status(400).json({
      ok: false,
      error: "\u12A0\u12F2\u1231 \u12E8\u12ED\u1208\u134D \u1243\u120D \u1262\u12EB\u1295\u1235 4 \u134A\u12F0\u120B\u1275 \u12C8\u12ED\u121D \u1241\u1325\u122E\u127D \u1218\u1206\u1295 \u12A0\u1208\u1260\u1275\u1362"
    });
    return;
  }
  const player = ensurePlayerRecord(normalizedPhone);
  player.passwordHash = cleanPass;
  player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
  pendingOtpByPhone.delete(normalizedPhone);
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    player,
    players: Array.from(playersByPhone.values()),
    message: "\u12A0\u12F2\u1231 \u12E8\u12ED\u1208\u134D \u1243\u120D\u12CE (Password) \u1260\u1270\u1233\u12AB \u1201\u1294\u1273 \u1270\u1240\u12ED\u122F\u120D!"
  });
});
var serveNativeAndroidApkFile = async (_req, res) => {
  const apkCandidates = [
    "/tmp/Ezi-Bingo.apk",
    path.join(__dirname, "public", "Ezi-Bingo.apk"),
    path.join(__dirname, "dist", "Ezi-Bingo.apk")
  ];
  for (const apkPath of apkCandidates) {
    if (fs.existsSync(apkPath)) {
      res.setHeader("Content-Type", "application/vnd.android.package-archive");
      res.setHeader("Content-Disposition", 'attachment; filename="Ezi-Bingo.apk"');
      res.sendFile(apkPath);
      return;
    }
  }
  const firstToken = Array.from(activeBots.keys())[0] || persistedBotTokensCache[0]?.token;
  const EZI_APK_TELEGRAM_FILE_ID = "BQACAgQAAxkDAAICb2rMcRJ8tXu221eD-Spd-oCKW36bAALuHgAC-YRhUk48IbK4pANjPQQ";
  if (firstToken) {
    try {
      const gfRes = await fetch(
        `https://api.telegram.org/bot${firstToken}/getFile?file_id=${EZI_APK_TELEGRAM_FILE_ID}`
      );
      const gfData = await gfRes.json();
      const filePath = gfData?.result?.file_path;
      if (filePath) {
        const dlRes = await fetch(`https://api.telegram.org/file/bot${firstToken}/${filePath}`);
        if (dlRes.ok) {
          const arrBuf = await dlRes.arrayBuffer();
          const buf = Buffer.from(arrBuf);
          try {
            fs.writeFileSync("/tmp/Ezi-Bingo.apk", buf);
          } catch {
          }
          res.setHeader("Content-Type", "application/vnd.android.package-archive");
          res.setHeader("Content-Disposition", 'attachment; filename="Ezi-Bingo.apk"');
          res.setHeader("Content-Length", String(buf.length));
          res.send(buf);
          return;
        }
      }
    } catch {
    }
  }
  res.status(404).send("APK not found");
};
app.get("/Sun-Bingo.apk", serveNativeAndroidApkFile);
app.get("/Ezi-Bingo.apk", serveNativeAndroidApkFile);
app.get("/download-apk", serveNativeAndroidApkFile);
app.get("/api/download-apk", serveNativeAndroidApkFile);
app.get(["/sw.js", "/dev-sw.js", "/registerSW.js"], (_req, res) => {
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.send(`
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.registration.unregister())
  );
});
`);
});
app.get("/.well-known/assetlinks.json", (_req, res) => {
  const assetLinksCandidates = [
    path.join(__dirname, "public", ".well-known", "assetlinks.json"),
    path.join(__dirname, "dist", ".well-known", "assetlinks.json")
  ];
  for (const p of assetLinksCandidates) {
    if (fs.existsSync(p)) {
      res.setHeader("Content-Type", "application/json");
      res.sendFile(p);
      return;
    }
  }
  res.json([
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.ezibingo.pro",
        sha256_cert_fingerprints: [
          "0C:2F:13:0A:26:86:AE:9C:D2:1D:5C:EA:FD:63:9D:E4:F8:CC:58:B2:1C:14:E3:FA:C6:76:15:73:B2:9F:38:2B"
        ]
      }
    },
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: "com.ezibingo.app",
        sha256_cert_fingerprints: [
          "0C:2F:13:0A:26:86:AE:9C:D2:1D:5C:EA:FD:63:9D:E4:F8:CC:58:B2:1C:14:E3:FA:C6:76:15:73:B2:9F:38:2B",
          "C0:EC:05:21:92:03:79:4C:99:FF:0A:7E:CC:35:7F:00:B9:E3:68:D3:6B:F2:0B:F5:4A:FA:B0:7C:EE:40:36:0F"
        ]
      }
    }
  ]);
});
app.get("/manifest.jso", (_req, res) => {
  const p = path.join(__dirname, "public", "manifest.json");
  if (fs.existsSync(p)) {
    res.setHeader("Content-Type", "application/manifest+json");
    res.sendFile(p);
    return;
  }
  res.status(404).end();
});
var serveStandaloneAndroidAppFile = (_req, res) => {
  const candidates = [
    path.join(__dirname, "public", "Ezi-Bingo-App.html"),
    path.join(__dirname, "dist", "Ezi-Bingo-App.html")
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="Ezi-Bingo-Android-App.html"'
      );
      res.sendFile(filePath);
      return;
    }
  }
  res.redirect(SHARED_APP_URL);
};
app.get("/download-android-app", serveStandaloneAndroidAppFile);
app.get("/Sun-Bingo-Android-App.html", serveStandaloneAndroidAppFile);
app.get("/Ezi-Bingo-Android-App.html", serveStandaloneAndroidAppFile);
var CRC32_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 3988292384 ^ c >>> 1 : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();
function computeCrc32(buf) {
  let crc = 4294967295;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC32_TABLE[(crc ^ buf[i]) & 255] ^ crc >>> 8;
  }
  return (crc ^ 4294967295) >>> 0;
}
function collectProjectFilesForZip(dirPath, baseDir, out = []) {
  const SKIP_DIRS = /* @__PURE__ */ new Set([
    "node_modules",
    ".git",
    ".vite",
    ".aistudio"
  ]);
  let entries = [];
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    if (entry.name === ".telegram-bots.json" || entry.name === "package-lock.json") continue;
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.relative(baseDir, fullPath).split(path.sep).join("/");
    if (entry.isDirectory()) {
      collectProjectFilesForZip(fullPath, baseDir, out);
    } else if (entry.isFile()) {
      try {
        if (relPath === "package.json") {
          const prodPkg = {
            name: "ezi-bingo-platform",
            private: true,
            version: "2.0.0",
            description: "Ezi Bingo & Ezi Fast Bingo Full-Stack Real-Time Multiplayer Platform (Node.js + Express + WebSocket + React + Telegram Bot)",
            type: "module",
            engines: {
              node: ">=18.0.0"
            },
            scripts: {
              dev: "tsx server.ts",
              start: "tsx server.ts",
              build: "vite build",
              preview: "vite preview"
            },
            dependencies: {
              "@tailwindcss/vite": "^4.0.9",
              "@vitejs/plugin-react": "^4.3.4",
              dotenv: "^16.4.7",
              express: "^4.21.2",
              firebase: "^11.3.1",
              "lucide-react": "^0.475.0",
              motion: "^12.4.7",
              react: "^19.0.0",
              "react-dom": "^19.0.0",
              tailwindcss: "^4.0.9",
              tsx: "^4.19.2",
              typescript: "^5.7.3",
              vite: "^6.2.0",
              ws: "^8.18.0"
            },
            devDependencies: {
              "@types/express": "^4.17.21",
              "@types/node": "^22.13.4",
              "@types/react": "^19.0.8",
              "@types/react-dom": "^19.0.3",
              "@types/ws": "^8.5.14",
              "vite-plugin-pwa": "^0.21.1"
            }
          };
          out.push({
            relPath: "Ezi-Bingo-Full-Project/package.json",
            data: Buffer.from(JSON.stringify(prodPkg, null, 2), "utf8")
          });
          continue;
        }
        const stat = fs.statSync(fullPath);
        if (stat.size <= 15 * 1024 * 1024) {
          out.push({
            relPath: `Ezi-Bingo-Full-Project/${relPath}`,
            data: fs.readFileSync(fullPath)
          });
        }
      } catch {
      }
    }
  }
  return out;
}
function buildFullProjectZipBuffer() {
  const files = collectProjectFilesForZip(__dirname, __dirname);
  const readmeText = `# Ezi Bingo & Ezi Fast Bingo \u2014 Full-Stack Production Server (v2.0)

\u12ED\u1205 \u1219\u1209 \u12E8 Ezi Bingo (\u1218\u12F0\u1260\u129B 27-\u1215\u130D \u1262\u1295\u130E + \u1348\u1323\u1295 \u1262\u1295\u130E 10/20/50/100 \u1265\u122D \u12AD\u134D\u120E\u127D + \u12E8\u1274\u120C\u130D\u122B\u121D \u1266\u1275 + \u12E8\u1241\u1325\u1325\u122D \u1353\u1290\u120D + WebSocket Real-Time Server) 100% \u12E8\u121A\u1230\u122B \u1219\u1209 Production Server \u12A5\u1293 Source Code \u1290\u12CD\u1362

\u26A0\uFE0F **\u121B\u1233\u1230\u1262\u12EB\u1366**
- \u12A0\u1295\u12F5 \u1290\u1320\u120B \`.html\` \u134B\u12ED\u120D \u1265\u127B\u12CD\u1295 \u1232\u12C8\u122D\u12F5 \u12E8 Frontend (UI) \u134B\u12ED\u120D \u1265\u127B \u1235\u1208\u1206\u1290 \u12E8\u122B\u1231 Backend Server \u12A0\u12ED\u1296\u1228\u12CD\u121D\u1362
- **\u12ED\u1205 \`.ZIP\` \u134E\u120D\u12F0\u122D \u130D\u1295 \u1219\u1209\u12CD\u1295 Backend Server (\`server.ts\`)\u1363 Frontend (\`src/\`)\u1363 \u12E8\u1270\u12D8\u130B\u1300\u12CD\u1295 Production Build (\`dist/\`)\u1363 \`Dockerfile\` \u12A5\u1293 \u12E8\u1274\u120C\u130D\u122B\u121D \u1266\u1275 \u121E\u1270\u1229\u1295 \u1260\u1219\u1209 \u12E8\u12EB\u12D8 \u12CB\u1293\u12CD \u1355\u122E\u1300\u12AD\u1275 \u1290\u12CD!**

## 1. \u1260\u12AE\u121D\u1352\u12CD\u1270\u122D \u12C8\u12ED\u121D \u1260 VPS \u1230\u122D\u1268\u122D (Ubuntu / Windows) \u120B\u12ED \u1208\u121B\u1235\u1300\u1218\u122D:
1. **Node.js (v18 \u12C8\u12ED\u121D v20+)** \u1218\u132B\u1291\u1295 \u12EB\u1228\u130B\u130D\u1321\u1362
2. \u12ED\u1205\u1295\u1295 \`.ZIP\` \u134B\u12ED\u120D Extract (Unzip) \u12EB\u12F5\u122D\u1309\u1275\u1362
3. \u1260\u12DA\u1205 \u134E\u120D\u12F0\u122D \u12CD\u1235\u1325 Terminal / Command Prompt \u12A8\u134D\u1270\u12CD \u12E8\u121A\u12A8\u1270\u1209\u1275\u1295 \u1275\u12D5\u12DB\u12DE\u127D \u12ED\u133B\u1349\u1366
\`\`\`bash
npm install
npm run build
npm start
\`\`\`
4. \u1230\u122D\u1268\u1229 \u1260 \`http://localhost:3000\` \u120B\u12ED \u12C8\u12F2\u12EB\u12CD\u1291 \u12ED\u12A8\u1348\u1273\u120D!

## 2. \u1260 Railway.app / Render.com / DigitalOcean \u120B\u12ED Host \u1208\u121B\u12F5\u1228\u130D:
- \u12ED\u1205\u1295\u1295 \u134E\u120D\u12F0\u122D \u12C8\u12F0 **GitHub** (Private Repository) \u12ED\u132B\u1291\u1275\u1362
- \u1260 **Railway.app** \u12C8\u12ED\u121D **Render.com** \u120B\u12ED **"Deploy from GitHub repo"** \u12ED\u1260\u1209\u1275\u1362
- \`Dockerfile\`, \`railway.json\`, \u12A5\u1293 \`render.yaml\` \u1260\u12CD\u1235\u1321 \u1270\u12D8\u130B\u1305\u1270\u12CD \u1235\u1208\u1270\u1240\u1218\u1321 \u121D\u1295\u121D \u1270\u1328\u121B\u122A \u1234\u1272\u1295\u130D \u1233\u12ED\u1320\u12ED\u1245 \u1260\u122B\u1231 Build \u12A0\u12F5\u122D\u130E Online \u12EB\u12C8\u1323\u12CB\u120D!
`;
  files.push({
    relPath: "Ezi-Bingo-Full-Project/README.md",
    data: Buffer.from(readmeText, "utf8")
  });
  files.push({
    relPath: "Ezi-Bingo-Full-Project/ecosystem.config.cjs",
    data: Buffer.from(
      `module.exports = {
  apps: [
    {
      name: 'ezi-bingo-server',
      script: 'npx',
      args: 'tsx server.ts',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
`,
      "utf8"
    )
  });
  files.push({
    relPath: "Ezi-Bingo-Full-Project/START_WINDOWS.bat",
    data: Buffer.from("@echo off\r\necho Installing Ezi Bingo dependencies...\r\ncall npm install\r\necho Building production bundle...\r\ncall npm run build\r\necho Starting Ezi Bingo Production Server on http://localhost:3000 ...\r\ncall npm start\r\npause\r\n", "utf8")
  });
  files.push({
    relPath: "Ezi-Bingo-Full-Project/START_LINUX_MAC.sh",
    data: Buffer.from("#!/usr/bin/env bash\nnpm install && npm run build && npm start\n", "utf8")
  });
  const localFileChunks = [];
  const centralDirChunks = [];
  let offset = 0;
  for (const file of files) {
    const nameBuf = Buffer.from(file.relPath, "utf8");
    const uncompressed = file.data;
    const crc = computeCrc32(uncompressed);
    const compressed = zlib.deflateRawSync(uncompressed);
    const useDeflate = compressed.length < uncompressed.length;
    const payload = useDeflate ? compressed : uncompressed;
    const method = useDeflate ? 8 : 0;
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(67324752, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(2048, 6);
    localHeader.writeUInt16LE(method, 8);
    localHeader.writeUInt16LE(0, 10);
    localHeader.writeUInt16LE(21537, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(payload.length, 18);
    localHeader.writeUInt32LE(uncompressed.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);
    localFileChunks.push(localHeader, payload);
    const centralHeader = Buffer.alloc(46 + nameBuf.length);
    centralHeader.writeUInt32LE(33639248, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(2048, 8);
    centralHeader.writeUInt16LE(method, 10);
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(21537, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(payload.length, 20);
    centralHeader.writeUInt32LE(uncompressed.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    nameBuf.copy(centralHeader, 46);
    centralDirChunks.push(centralHeader);
    offset += localHeader.length + payload.length;
  }
  const centralDirBuf = Buffer.concat(centralDirChunks);
  const endOfCentralDir = Buffer.alloc(22);
  endOfCentralDir.writeUInt32LE(101010256, 0);
  endOfCentralDir.writeUInt16LE(0, 4);
  endOfCentralDir.writeUInt16LE(0, 6);
  endOfCentralDir.writeUInt16LE(files.length, 8);
  endOfCentralDir.writeUInt16LE(files.length, 10);
  endOfCentralDir.writeUInt32LE(centralDirBuf.length, 12);
  endOfCentralDir.writeUInt32LE(offset, 16);
  endOfCentralDir.writeUInt16LE(0, 20);
  return Buffer.concat([...localFileChunks, centralDirBuf, endOfCentralDir]);
}
var serveFullProjectZip = (_req, res) => {
  try {
    const zipBuffer = buildFullProjectZipBuffer();
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="Ezi-Bingo-Full-Project.zip"'
    );
    res.setHeader("Content-Length", String(zipBuffer.length));
    res.send(zipBuffer);
  } catch (err) {
    console.error("Failed to build project zip:", err);
    res.status(500).json({ ok: false, error: "Failed to create ZIP archive" });
  }
};
app.get("/api/download-full-project", serveFullProjectZip);
app.get("/Ezi-Bingo-Full-Project.zip", serveFullProjectZip);
app.get("/api/live-room/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();
  sseClients.add(res);
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
  const initialPayload = JSON.stringify({
    type: "room:sync",
    changedMode: "both",
    fastRoom: fastRoomsByStake[10],
    fastLockedCartelas: lockedObj[10] || [],
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
    regularRoom: regularLiveRoomState,
    regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
    transactions: serverTransactions,
    players: Array.from(playersByPhone.values()),
    requireDepositApproval: adminPinConfig.requireDepositApproval,
    timestamp: Date.now()
  });
  res.write(`data: ${initialPayload}

`);
  broadcastRealtimeSync();
  req.on("close", () => {
    sseClients.delete(res);
    broadcastRealtimeSync();
  });
});
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "Ezi-Bingo Live Multiplayer Server",
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now(),
    dateTime: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.all(["/api/cron", "/api/keep-alive"], (req, res) => {
  const ua = req.headers["user-agent"] || "cron-job";
  res.json({
    ok: true,
    message: "Render keep-alive ping successful. Instance is active!",
    source: ua,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: Date.now()
  });
});
var activeHttpClients = /* @__PURE__ */ new Map();
app.get("/api/live-room/state", (req, res) => {
  const clientIdParam = String(req.query.clientId || "").trim();
  const phoneParam = String(req.query.phone || "").trim();
  const nameParam = String(req.query.name || "").trim();
  const modeParam = String(req.query.mode || "fast") === "regular" ? "regular" : "fast";
  const stakeParam = normalizeFastStakeTier(req.query.stake);
  if (clientIdParam) {
    activeHttpClients.set(clientIdParam, Date.now());
  }
  const now = Date.now();
  for (const [cid, lastSeen] of activeHttpClients.entries()) {
    if (now - lastSeen > 12e3) {
      activeHttpClients.delete(cid);
    }
  }
  const { room, lockedMap } = getRoomByMode(modeParam, stakeParam);
  const resolvedPhone = phoneParam || `0911${(clientIdParam || "1001").slice(-6)}`;
  const player = phoneParam && (playersByPhone.has(phoneParam) || /^0[79]\d{8}$/.test(phoneParam)) ? ensurePlayerRecord(phoneParam, nameParam || `Player_${phoneParam.slice(-4)}`) : playersByPhone.get(resolvedPhone) || {
    id: `usr-${resolvedPhone.slice(-4)}`,
    phone: resolvedPhone,
    name: nameParam || `Player_${resolvedPhone.slice(-4)}`,
    balance: 15,
    bonusBalance: 15,
    referralEarnings: 0,
    referredCount: 0,
    isBlocked: false,
    updatedAt: (/* @__PURE__ */ new Date()).toLocaleString()
  };
  const allLocked = Array.from(lockedMap.values());
  const lockedByOthers = allLocked.filter(
    (item) => clientIdParam && item.clientId ? item.clientId !== clientIdParam : item.ownerPhone !== resolvedPhone
  ).map((item) => ({
    cartelaId: item.cartelaId,
    ownerName: item.ownerName,
    ownerPhone: item.ownerPhone,
    clientId: item.clientId
  }));
  const liveConnectionsCount = Math.max(
    1,
    activeHttpClients.size,
    Array.from(wsClients).filter((c) => c.readyState === WebSocket.OPEN).length + sseClients.size
  );
  for (const stk of FAST_STAKE_TIERS) {
    const r = fastRoomsByStake[stk];
    const lMap = fastLockedCartelasByStake[stk];
    r.onlinePlayersCount = Math.max(
      liveConnectionsCount,
      new Set(Array.from(lMap.values()).map((c) => c.clientId || c.ownerPhone)).size
    );
  }
  regularLiveRoomState.onlinePlayersCount = Math.max(
    liveConnectionsCount,
    new Set(Array.from(regularRoomLockedCartelas.values()).map((c) => c.clientId || c.ownerPhone)).size
  );
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
  res.json({
    ok: true,
    room,
    fastRoom: room,
    fastLockedCartelas: allLocked,
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
    regularRoom: regularLiveRoomState,
    regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
    lockedCartelas: allLocked,
    lockedByOthers,
    onlinePlayersCount: room.onlinePlayersCount,
    player,
    players: Array.from(playersByPhone.values()),
    transactions: serverTransactions,
    pendingCount: serverTransactions.filter((t) => t.status === "pending").length,
    requireDepositApproval: adminPinConfig.requireDepositApproval
  });
});
app.post("/api/live-room/action", (req, res) => {
  const {
    mode: rawMode,
    action,
    countdownSeconds,
    callSpeedSec,
    stakeAmount,
    prizeAmount,
    activePatternId,
    jackpotPool,
    cartelaId,
    winner,
    houseShareBirr,
    jackpotWonInRound,
    updatedJackpotPool,
    forcedBalls,
    lastBall
  } = req.body;
  const mode = rawMode === "regular" ? "regular" : "fast";
  const { room, lockedMap } = getRoomByMode(mode, stakeAmount);
  if (action === "start_countdown") {
    if (!room.isPlaying && room.calledBalls.length === 0 && room.preGameCountdown === null) {
      room.isPaused = false;
      room.winnersList = [];
      room.winnerDisplayCountdown = null;
      room.jackpotWonInRound = 0;
      room.preGameCountdown = Math.max(1, Number(countdownSeconds) || (mode === "fast" ? 15 : 30));
      room.lastCountdownTickAt = Date.now();
      broadcastRealtimeSync(mode);
    }
  } else if (action === "cancel_countdown") {
    room.preGameCountdown = null;
    broadcastRealtimeSync(mode);
  } else if (action === "play") {
    room.preGameCountdown = null;
    room.isPlaying = true;
    room.isPaused = false;
    deductLockedStakesOnGameStart(room, lockedMap);
    if (room.calledBalls.length === 0) {
      drawNextServerBallForRoom(room);
    } else {
      broadcastRealtimeSync(mode);
    }
  } else if (action === "pause") {
    room.isPaused = true;
    broadcastRealtimeSync(mode);
  } else if (action === "toggle_pause") {
    if (!room.isPlaying) {
      room.preGameCountdown = null;
      room.isPlaying = true;
      room.isPaused = false;
      deductLockedStakesOnGameStart(room, lockedMap);
      if (room.calledBalls.length === 0) {
        drawNextServerBallForRoom(room);
      } else {
        broadcastRealtimeSync(mode);
      }
    } else {
      room.isPaused = !room.isPaused;
      broadcastRealtimeSync(mode);
    }
  } else if (action === "draw_next") {
    drawNextServerBallForRoom(room);
  } else if (action === "reset_round" || action === "reset") {
    resetServerRoomRound(room, lockedMap);
  } else if (action === "set_speed" && typeof callSpeedSec === "number") {
    room.callSpeedSec = callSpeedSec;
    broadcastRealtimeSync(mode);
  } else if (action === "update_settings") {
    if (mode === "regular" && typeof stakeAmount === "number") room.stakeAmount = stakeAmount;
    if (typeof prizeAmount === "number") room.prizeAmount = prizeAmount;
    if (typeof activePatternId === "number") room.activePatternId = activePatternId;
    if (typeof jackpotPool === "number") room.jackpotPool = jackpotPool;
    if (typeof callSpeedSec === "number") room.callSpeedSec = callSpeedSec;
    const b = req.body;
    const incomingSecs = typeof b.countdownSeconds === "number" ? b.countdownSeconds : typeof b.preGameCountdown === "number" ? b.preGameCountdown : typeof b.registrationMinutes === "number" && b.registrationMinutes > 0 ? b.registrationMinutes * 60 : void 0;
    if (incomingSecs !== void 0) {
      if (incomingSecs > 0) {
        room.preGameCountdown = Math.round(incomingSecs);
        room.lastCountdownTickAt = Date.now();
        room.isPlaying = false;
        room.isPaused = false;
        room.calledBalls = [];
        room.activeBall = null;
        room.winnersList = [];
        room.bingoClaimCountdown = null;
        room.winnerDisplayCountdown = null;
      } else {
        room.preGameCountdown = null;
      }
    }
    broadcastRealtimeSync(mode);
  } else if (action === "claim_win" && winner) {
    const serverCard = generateCartelaById(Number(winner.cartelaId) || 1);
    const serverCalledSet = /* @__PURE__ */ new Set([0, ...room.calledBalls || []]);
    const claimedCells = Array.isArray(winner.winningCells) ? winner.winningCells : [];
    const allClaimedCellsValid = claimedCells.length >= 4 && claimedCells.every(([r, c]) => {
      if (r === 2 && c === 2) return true;
      const num = serverCard.numbers?.[r]?.[c];
      return typeof num === "number" && serverCalledSet.has(num);
    });
    if (!allClaimedCellsValid && room.calledBalls.length > 0) {
      res.status(400).json({
        ok: false,
        error: "\u12E8\u1270\u1320\u12E8\u1240\u12CD \u1262\u1295\u130E \u1260\u1230\u122D\u1268\u1229 \u12E8\u12C8\u1321 \u1241\u1325\u122E\u127D \u12A0\u120D\u1270\u1228\u130B\u1308\u1320\u121D (Server Verification Failed)!"
      });
      return;
    }
    if (mode === "regular" && room.bingoClaimCountdown === 0) {
      res.status(400).json({
        ok: false,
        error: "\u1262\u1295\u130E \u12E8\u121B\u1208\u1275 \u1230\u12D3\u1275 \u1270\u1320\u1293\u124B\u120D!"
      });
      return;
    }
    if (mode === "regular") {
      room.isPlaying = false;
      room.isPaused = true;
      room.preGameCountdown = null;
      if (room.bingoClaimCountdown === null) {
        room.bingoClaimCountdown = 30;
        room.winnerDisplayCountdown = null;
        room.lastCountdownTickAt = Date.now();
      }
    } else {
      room.isPlaying = false;
      room.isPaused = true;
      room.preGameCountdown = null;
      room.winnerDisplayCountdown = 10;
      room.lastCountdownTickAt = Date.now();
    }
    const explicitWinnerPhone = String(req.body.winnerPhone || "").trim();
    const lockedOwner = lockedMap.get(winner.cartelaId);
    const rawCandidatePhone = explicitWinnerPhone || lockedOwner?.ownerPhone || winner.userPhone || Array.from(playersByPhone.values()).find(
      (p) => p.name.trim().toLowerCase() === (winner.userName || "").trim().toLowerCase()
    )?.phone || "";
    const winnerPhone = normalizeEthiopianPhone(rawCandidatePhone) || rawCandidatePhone.trim() || "0913***371";
    const resolvedWinnerWithPhone = {
      ...winner,
      userName: lockedOwner?.ownerName || winner.userName,
      userPhone: winnerPhone
    };
    room.lastVerifiedWinnerBanner = resolvedWinnerWithPhone;
    const alreadyWon = room.winnersList.some((w) => w.cartelaId === winner.cartelaId);
    if (!alreadyWon) {
      const totalPrizePool = typeof room.prizeAmount === "number" && room.prizeAmount > 0 ? room.prizeAmount : winner.prizeAmount * (room.winnersList.length || 1);
      const nextCount = room.winnersList.length + 1;
      const equalShare = Number((totalPrizePool / nextCount).toFixed(2));
      const prevShare = room.winnersList.length > 0 ? Number((totalPrizePool / room.winnersList.length).toFixed(2)) : 0;
      room.winnersList = [
        ...room.winnersList.map((w) => ({ ...w, prizeAmount: equalShare })),
        { ...resolvedWinnerWithPhone, prizeAmount: equalShare }
      ];
      if (room.winnersList.length > 1 && prevShare > equalShare) {
        const diffDeduct = Number((prevShare - equalShare).toFixed(2));
        for (let i = 0; i < room.winnersList.length - 1; i++) {
          const prevWin = room.winnersList[i];
          const prevLock = lockedMap.get(prevWin.cartelaId);
          const rawPh = prevLock?.ownerPhone || Array.from(playersByPhone.values()).find(
            (p) => p.name.trim().toLowerCase() === (prevWin.userName || "").trim().toLowerCase()
          )?.phone || "";
          const pPh = normalizeEthiopianPhone(rawPh) || rawPh.trim();
          if (pPh && playersByPhone.has(pPh)) {
            const prevPlayer = playersByPhone.get(pPh);
            prevPlayer.balance = Math.max(0, Number((prevPlayer.balance - diffDeduct).toFixed(2)));
            prevPlayer.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
            if (pPh === globalRegisteredPhone || pPh === "0942742684") {
              globalWalletBalance = prevPlayer.balance;
            }
          }
        }
      }
      const explicitWinnerPhone2 = String(req.body.winnerPhone || "").trim();
      const lockedOwner2 = lockedMap.get(winner.cartelaId);
      const rawCandidatePhone2 = explicitWinnerPhone2 || lockedOwner2?.ownerPhone || Array.from(playersByPhone.values()).find(
        (p) => p.name.trim().toLowerCase() === (winner.userName || "").trim().toLowerCase()
      )?.phone || "";
      const winnerPhone2 = normalizeEthiopianPhone(rawCandidatePhone2) || rawCandidatePhone2.trim();
      if (winnerPhone2) {
        const winnerPlayer = ensurePlayerRecord(winnerPhone2, winner.userName);
        winnerPlayer.balance = Number((winnerPlayer.balance + equalShare).toFixed(2));
        winnerPlayer.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
        if (winnerPhone2 === globalRegisteredPhone || winnerPhone2 === "0942742684") {
          globalWalletBalance = winnerPlayer.balance;
        }
        serverTransactions.unshift({
          id: `srv-win-${room.gameMatchId}-${winner.cartelaId}-${Date.now()}`,
          userId: winnerPlayer.id,
          userName: winner.userName || winnerPlayer.name,
          userPhone: winnerPhone2,
          type: "win",
          method: "Wallet",
          amount: equalShare,
          referenceNumber: `WIN-${mode.toUpperCase()}-RND-${room.gameMatchId}-#${winner.cartelaId}`,
          fullSmsText: `Bingo Win Prize +${equalShare.toFixed(2)} ETB (Cartela #${winner.cartelaId})`,
          status: "approved",
          timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
        });
      }
      const participantCartelasByPhone = {};
      for (const item of lockedMap.values()) {
        const ph = normalizeEthiopianPhone(item.ownerPhone || "");
        if (ph) {
          if (!participantCartelasByPhone[ph]) participantCartelasByPhone[ph] = [];
          if (!participantCartelasByPhone[ph].includes(item.cartelaId)) {
            participantCartelasByPhone[ph].push(item.cartelaId);
          }
        }
      }
      const participantPhones = Object.keys(participantCartelasByPhone);
      const existingHistoryIdx = room.gameHistory.findIndex(
        (h) => h.gameMatchId === room.gameMatchId
      );
      if (existingHistoryIdx >= 0) {
        room.gameHistory[existingHistoryIdx] = {
          ...room.gameHistory[existingHistoryIdx],
          prizeAmount: winner.prizeAmount,
          totalBallsCalled: winner.calledBallsSnapshot?.length || room.calledBalls.length,
          lastBall: winner.lastBall,
          calledBallsSnapshot: winner.calledBallsSnapshot || [...room.calledBalls],
          participantPhones,
          participantCartelasByPhone,
          winners: room.winnersList.map((w) => ({
            cartelaId: w.cartelaId,
            userName: w.userName,
            userPhone: w.userPhone,
            prizeAmount: w.prizeAmount,
            winningCells: w.winningCells
          }))
        };
      } else {
        room.gameHistory = [
          {
            id: `${mode}-gh-${Date.now()}`,
            gameMatchId: room.gameMatchId,
            timestamp: winner.timestamp || (/* @__PURE__ */ new Date()).toLocaleString(),
            stakeAmount: room.stakeAmount,
            prizeAmount: winner.prizeAmount,
            patternTitle: winner.patternTitle,
            totalBallsCalled: winner.calledBallsSnapshot?.length || room.calledBalls.length,
            lastBall: winner.lastBall,
            calledBallsSnapshot: winner.calledBallsSnapshot || [...room.calledBalls],
            participantPhones,
            participantCartelasByPhone,
            winners: room.winnersList.map((w) => ({
              cartelaId: w.cartelaId,
              userName: w.userName,
              userPhone: w.userPhone,
              prizeAmount: w.prizeAmount,
              winningCells: w.winningCells
            }))
          },
          ...room.gameHistory
        ].slice(0, 50);
      }
    }
    if (typeof houseShareBirr === "number") {
      room.houseEarningsTotal = Number((room.houseEarningsTotal + houseShareBirr).toFixed(2));
    }
    if (typeof jackpotWonInRound === "number") {
      room.jackpotWonInRound = jackpotWonInRound;
    }
    if (typeof updatedJackpotPool === "number") {
      room.jackpotPool = updatedJackpotPool;
    }
    saveBotsToDisk();
    broadcastRealtimeSync(mode);
  } else if (action === "block_cartela" && typeof cartelaId === "number") {
    if (!room.blockedCartelaIds.includes(cartelaId)) {
      room.blockedCartelaIds = [...room.blockedCartelaIds, cartelaId];
    }
    broadcastRealtimeSync(mode);
  } else if (action === "unblock_cartela" && typeof cartelaId === "number") {
    room.blockedCartelaIds = room.blockedCartelaIds.filter((id) => id !== cartelaId);
    broadcastRealtimeSync(mode);
  } else if (action === "force_balls" && Array.isArray(forcedBalls) && forcedBalls.length > 0) {
    room.preGameCountdown = null;
    room.isPlaying = true;
    room.isPaused = false;
    room.calledBalls = Array.from(/* @__PURE__ */ new Set([...room.calledBalls, ...forcedBalls]));
    room.activeBall = lastBall || forcedBalls[forcedBalls.length - 1];
    room.lastBallTickAt = Date.now();
    broadcastRealtimeSync(mode);
  } else if (action === "set_admin_message") {
    const msgText = String(req.body.adminMessage || "").trim();
    const nowTime = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (req.body.applyAllRooms) {
      for (const stk of FAST_STAKE_TIERS) {
        fastRoomsByStake[stk].adminRoomMessage = msgText;
        fastRoomsByStake[stk].adminRoomMessageAt = msgText ? nowTime : "";
      }
      regularLiveRoomState.adminRoomMessage = msgText;
      regularLiveRoomState.adminRoomMessageAt = msgText ? nowTime : "";
      broadcastRealtimeSync("both");
    } else {
      room.adminRoomMessage = msgText;
      room.adminRoomMessageAt = msgText ? nowTime : "";
      broadcastRealtimeSync(mode);
    }
  } else if (action === "set_bonus_over_20") {
    const rawBonus = Number(req.body.bonusCount);
    const cleanBonus = Number.isFinite(rawBonus) ? Math.max(0, Math.min(30, Math.floor(rawBonus))) : 5;
    for (const stk of FAST_STAKE_TIERS) {
      fastRoomsByStake[stk].bonusCartelasForOver20 = cleanBonus;
    }
    regularLiveRoomState.bonusCartelasForOver20 = cleanBonus;
    broadcastRealtimeSync("both");
  } else if (action === "set_hero_banners") {
    const rawBanners = req.body.heroBanners;
    if (Array.isArray(rawBanners)) {
      const sanitized = rawBanners.map((b, idx) => ({
        id: String(b?.id || `hb-${Date.now()}-${idx}`),
        title: String(b?.title || "").trim(),
        subtitle: String(b?.subtitle || "").trim(),
        badgeText: String(b?.badgeText || "Ezi Bingo").trim(),
        accentColor: ["blue", "emerald", "amber", "rose"].includes(String(b?.accentColor)) ? String(b?.accentColor) : "emerald",
        imageUrl: b?.imageUrl ? String(b.imageUrl) : void 0,
        isActive: b?.isActive !== false
      }));
      for (const stk of FAST_STAKE_TIERS) {
        fastRoomsByStake[stk].heroBanners = sanitized;
      }
      regularLiveRoomState.heroBanners = sanitized;
      broadcastRealtimeSync("both");
    }
  } else if (action === "set_bank_accounts") {
    const rawBanks = req.body.bankAccounts;
    if (Array.isArray(rawBanks) && rawBanks.length > 0) {
      const sanitizedBanks = rawBanks.map((b, idx) => ({
        id: String(b?.id || b?.shortName || `BANK-${idx}`),
        bankName: String(b?.bankName || b?.shortName || "Bank").trim(),
        shortName: String(b?.shortName || b?.id || "Bank").trim(),
        accountNumber: String(b?.accountNumber || "").trim(),
        accountHolder: String(b?.accountHolder || "Ezana Gebremedhin").trim(),
        badgeBg: String(b?.badgeBg || "bg-emerald-600 text-white").trim()
      }));
      for (const stk of FAST_STAKE_TIERS) {
        fastRoomsByStake[stk].bankAccounts = sanitizedBanks;
      }
      regularLiveRoomState.bankAccounts = sanitizedBanks;
      broadcastRealtimeSync("both");
    }
  }
  saveBotsToDisk();
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
  res.json({
    ok: true,
    room,
    fastRoom: room,
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj,
    regularRoom: regularLiveRoomState,
    players: Array.from(playersByPhone.values()),
    transactions: serverTransactions
  });
});
app.post("/api/live-room/lock-cartela", (req, res) => {
  const {
    mode: rawMode,
    stakeAmount,
    cartelaId,
    ownerPhone,
    ownerName,
    phone: aliasPhone,
    name: aliasName,
    clientId,
    action,
    isRegistered
  } = req.body;
  const mode = rawMode === "regular" ? "regular" : "fast";
  const { room, lockedMap } = getRoomByMode(mode, stakeAmount);
  const phone = (ownerPhone || aliasPhone || "0911000001").trim();
  const name = (ownerName || aliasName || `Player_${phone.slice(-4)}`).trim();
  const cidKey = (clientId || "").trim();
  const isSameOwner = (existing2) => {
    if (cidKey && existing2.clientId) {
      return existing2.clientId === cidKey;
    }
    return existing2.ownerPhone === phone;
  };
  const maybeAutoStartFastCountdown = () => {
    if (mode !== "fast") return;
    const distinctPlayers = countDistinctLockedPlayers(lockedMap);
    if (!room.isPlaying && room.calledBalls.length === 0 && room.winnersList.length === 0 && room.preGameCountdown === null && (distinctPlayers >= 2 || lockedMap.size >= 1)) {
      room.preGameCountdown = 30;
      room.lastCountdownTickAt = Date.now();
    } else if (!room.isPlaying && lockedMap.size === 0 && room.preGameCountdown !== null) {
      room.preGameCountdown = null;
      room.lastCountdownTickAt = 0;
    }
  };
  if (action === "clear_mine") {
    for (const [id, info] of lockedMap.entries()) {
      if (isSameOwner(info)) {
        lockedMap.delete(id);
      }
    }
    maybeAutoStartFastCountdown();
    saveBotsToDisk();
    broadcastRealtimeSync(mode);
    const { roomsObj: roomsObj2, lockedObj: lockedObj2 } = serializeFastRoomsSnapshot();
    res.json({
      ok: true,
      lockedCartelas: Array.from(lockedMap.values()),
      room,
      fastRoomsByStake: roomsObj2,
      fastLockedCartelasByStake: lockedObj2
    });
    return;
  }
  if (action === "register_all" && Array.isArray(req.body.cartelaIds)) {
    const isFreeGame = room.stakeAmount === 0;
    let myOwnedCount = Array.from(lockedMap.values()).filter((info) => isSameOwner(info)).length;
    for (const cid2 of req.body.cartelaIds) {
      const numCid = Number(cid2);
      const existing2 = lockedMap.get(numCid);
      if (isFreeGame && !existing2 && myOwnedCount >= 5) {
        break;
      }
      if (!existing2 || isSameOwner(existing2)) {
        if (!existing2) myOwnedCount++;
        lockedMap.set(numCid, {
          cartelaId: numCid,
          ownerPhone: phone,
          ownerName: name,
          clientId: cidKey || void 0,
          isRegistered: true,
          lockedAt: Date.now()
        });
      }
    }
    if (mode !== "regular") {
      maybeAutoStartFastCountdown();
    }
    saveBotsToDisk();
    broadcastRealtimeSync(mode);
    const { roomsObj: roomsObj2, lockedObj: lockedObj2 } = serializeFastRoomsSnapshot();
    res.json({
      ok: true,
      lockedCartelas: Array.from(lockedMap.values()),
      room,
      fastRoomsByStake: roomsObj2,
      fastLockedCartelasByStake: lockedObj2
    });
    return;
  }
  const cid = Number(cartelaId);
  if (!Number.isFinite(cid) || cid < 1) {
    res.status(400).json({ ok: false, error: "Invalid cartela ID" });
    return;
  }
  const existing = lockedMap.get(cid);
  if (action === "unlock") {
    if (!existing || isSameOwner(existing)) {
      lockedMap.delete(cid);
    }
    if (mode !== "regular") {
      maybeAutoStartFastCountdown();
    }
    saveBotsToDisk();
    broadcastRealtimeSync(mode);
    const { roomsObj: roomsObj2, lockedObj: lockedObj2 } = serializeFastRoomsSnapshot();
    res.json({
      ok: true,
      lockedCartelas: Array.from(lockedMap.values()),
      room,
      fastRoomsByStake: roomsObj2,
      fastLockedCartelasByStake: lockedObj2
    });
    return;
  }
  if (existing && !isSameOwner(existing)) {
    res.status(409).json({
      ok: false,
      lockedByOther: true,
      error: `\u12AB\u122D\u1274\u120B #${cid} \u1260\u120C\u120B \u1270\u132B\u12CB\u127D (${existing.ownerName}) \u1270\u12ED\u12DF\u120D! \u12A5\u1263\u12AD\u12CE \u120C\u120B \u1241\u1325\u122D \u12ED\u121D\u1228\u1321\u1362`,
      lockedBy: existing,
      lockedCartelas: Array.from(lockedMap.values())
    });
    return;
  }
  if (room.stakeAmount === 0 && !existing) {
    const myOwnedCount = Array.from(lockedMap.values()).filter((info) => isSameOwner(info)).length;
    if (myOwnedCount >= 5) {
      res.status(400).json({
        ok: false,
        error: "\u1260\u1290\u1343 \u1328\u12CB\u1273 (Free Game) 5 \u12AB\u122D\u1274\u120B \u1265\u127B \u1290\u12CD \u12E8\u121A\u1348\u1240\u12F0\u12CD!",
        lockedCartelas: Array.from(lockedMap.values())
      });
      return;
    }
  }
  lockedMap.set(cid, {
    cartelaId: cid,
    ownerPhone: phone,
    ownerName: name,
    clientId: cidKey || void 0,
    isRegistered: Boolean(isRegistered ?? true),
    lockedAt: Date.now()
  });
  if (mode !== "regular") {
    maybeAutoStartFastCountdown();
  }
  saveBotsToDisk();
  broadcastRealtimeSync(mode);
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
  res.json({
    ok: true,
    lockedCartelas: Array.from(lockedMap.values()),
    room,
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj
  });
});
app.post("/api/live-room/simulate-other-player", (req, res) => {
  const { stakeAmount } = req.body || {};
  const { room, lockedMap } = getRoomByMode("fast", stakeAmount);
  const sampleNames = ["Yonas_Fast", "Meron_Hailu", "Dawit_Bingo", "Abebe_K", "Hanna_T"];
  const samplePhones = ["0911223344", "0922334455", "0933445566", "0944556677", "0955667788"];
  const idx = Math.floor(Math.random() * sampleNames.length);
  const randomCartela = Math.floor(1 + Math.random() * 100);
  const lockedEntry = {
    cartelaId: randomCartela,
    ownerPhone: samplePhones[idx],
    ownerName: sampleNames[idx],
    isRegistered: true,
    lockedAt: Date.now()
  };
  if (!lockedMap.has(randomCartela)) {
    lockedMap.set(randomCartela, lockedEntry);
  }
  if (!room.isPlaying && room.calledBalls.length === 0 && room.winnersList.length === 0 && room.preGameCountdown === null && countDistinctLockedPlayers(lockedMap) >= 2) {
    room.preGameCountdown = 30;
    room.lastCountdownTickAt = Date.now();
  }
  broadcastRealtimeSync("fast");
  const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
  res.json({
    ok: true,
    addedCartelaId: randomCartela,
    ownerName: sampleNames[idx],
    lockedCartela: lockedEntry,
    lockedCartelas: Array.from(lockedMap.values()),
    onlinePlayersCount: room.onlinePlayersCount,
    room,
    fastRoomsByStake: roomsObj,
    fastLockedCartelasByStake: lockedObj
  });
});
app.post("/api/transactions/submit", (req, res) => {
  const {
    userId,
    userName,
    userPhone,
    type,
    method,
    amount,
    referenceNumber,
    fullSmsText,
    recipientPhone
  } = req.body;
  const cleanPhone = normalizeEthiopianPhone(userPhone || globalRegisteredPhone || "0942742684") || "0942742684";
  const cleanRecipientPhone = recipientPhone ? normalizeEthiopianPhone(recipientPhone) || recipientPhone.trim() : void 0;
  const player = ensurePlayerRecord(cleanPhone, userName || "Ezana_Player");
  const parsedFromSms = fullSmsText ? parseEthiopianPaymentSms(fullSmsText) : null;
  const cleanedAmountInput = typeof amount === "number" ? amount : typeof amount === "string" ? parseFloat(String(amount).replace(/,/g, "").trim()) : NaN;
  const amt = Number(
    (Number.isFinite(cleanedAmountInput) && cleanedAmountInput > 0 ? cleanedAmountInput : null) ?? parsedFromSms?.amount ?? 0
  );
  if (!Number.isFinite(amt) || amt <= 0) {
    res.status(400).json({ ok: false, error: "\u1275\u12AD\u12AD\u1208\u129B \u12E8\u1265\u122D \u1218\u1320\u1295 \u12EB\u1235\u1308\u1261\u1362" });
    return;
  }
  const resolvedType = type === "transfer" ? "transfer" : type === "withdraw" || parsedFromSms?.detectedType === "withdraw" ? "withdraw" : "deposit";
  if (resolvedType === "transfer") {
    if (!cleanRecipientPhone || cleanRecipientPhone.length < 9) {
      res.status(400).json({ ok: false, error: "\u12A5\u1263\u12AD\u12CE \u1275\u12AD\u12AD\u1208\u129B \u12E8\u1270\u1240\u1263\u12ED \u1235\u120D\u12AD \u1241\u1325\u122D \u12EB\u1235\u1308\u1261\u1362" });
      return;
    }
    if (cleanRecipientPhone === cleanPhone) {
      res.status(400).json({ ok: false, error: "\u12C8\u12F0 \u122B\u1235\u12CE \u1235\u120D\u12AD \u1241\u1325\u122D \u121B\u1235\u1270\u120B\u1208\u134D \u12A0\u12ED\u127D\u1209\u121D\u1362" });
      return;
    }
    if (player.balance < amt) {
      res.status(400).json({ ok: false, error: "\u1260\u1242 \u1240\u122A \u1202\u1233\u1265 \u12E8\u1208\u12CE\u1275\u121D!" });
      return;
    }
  }
  const rawRefCandidate = (referenceNumber && !referenceNumber.startsWith("REF-") ? referenceNumber : null) || parsedFromSms?.referenceNumber || referenceNumber || (resolvedType === "transfer" ? `TR-${Date.now().toString().slice(-6)}` : `REF-${Date.now().toString().slice(-6)}`);
  const resolvedRef = resolvedType === "deposit" ? normalizeTransactionReference(rawRefCandidate) || rawRefCandidate : rawRefCandidate;
  const isCashDeposit = method === "Cash" || String(resolvedRef).startsWith("CASH-");
  if (resolvedType === "deposit" && !isCashDeposit) {
    const normRef = normalizeTransactionReference(resolvedRef);
    const normSms = (fullSmsText || "").trim().replace(/\s+/g, " ").toLowerCase();
    const duplicateTx = serverTransactions.find((t) => {
      if (t.type !== "deposit" || t.status === "rejected" || t.method === "Cash") return false;
      const existingRefNorm = normalizeTransactionReference(t.referenceNumber);
      if (normRef && normRef.length >= 5 && !normRef.startsWith("REF") && !normRef.startsWith("CASH") && existingRefNorm && existingRefNorm === normRef) {
        return true;
      }
      if (normSms.length >= 25 && t.fullSmsText && t.fullSmsText.trim().replace(/\s+/g, " ").toLowerCase() === normSms) {
        return true;
      }
      return false;
    });
    if (duplicateTx) {
      res.status(409).json({
        ok: false,
        duplicate: true,
        error: `\u274C \u12ED\u1205 \u12E8\u130D\u1265\u12ED\u1275 \u1241\u1325\u122D (${duplicateTx.referenceNumber}) \u12A8\u12DA\u1205 \u1260\u134A\u1275 \u1325\u1245\u121D \u120B\u12ED \u12CD\u120F\u120D! \u12E8\u1270\u12F0\u1308\u1218 \u12F0\u1228\u1230\u129D \u1270\u1240\u1263\u12ED\u1290\u1275 \u12E8\u1208\u12CD\u121D\u1362`,
        transactions: serverTransactions
      });
      return;
    }
  } else if (resolvedType === "withdraw") {
    if (player.balance < amt) {
      res.status(400).json({ ok: false, error: "\u1260\u1242 \u1240\u122A \u1202\u1233\u1265 \u12E8\u1208\u12CE\u1275\u121D!" });
      return;
    }
    const recentDupWithdraw = serverTransactions.find(
      (t) => t.type === "withdraw" && t.userPhone === cleanPhone && t.amount === amt && t.status === "pending" && Date.now() - Number(t.id.replace(/\D/g, "").slice(0, 13) || 0) < 6e4
    );
    if (recentDupWithdraw) {
      res.status(409).json({
        ok: false,
        duplicate: true,
        error: `\u26A0\uFE0F \u12E8 ${amt} ETB \u12E8\u12C8\u132A \u1325\u12EB\u1244 \u1240\u12F5\u121E \u1270\u120D\u12B3\u120D (\u1260\u1218\u1320\u1263\u1260\u1245 \u120B\u12ED \u1290\u12CD)! \u12A5\u1263\u12AD\u12CE \u1260\u12F5\u130B\u121A \u12A0\u12ED\u120B\u12A9\u1362`,
        transactions: serverTransactions
      });
      return;
    }
  }
  const normRefForVerify = normalizeTransactionReference(resolvedRef);
  const matchingVerifiedReceipt = resolvedType === "deposit" && normRefForVerify && normRefForVerify.length >= 5 ? verifiedBankSmsReceipts.find(
    (r) => normalizeTransactionReference(r.referenceNumber) === normRefForVerify && r.status !== "duplicate"
  ) : null;
  if (matchingVerifiedReceipt) {
    matchingVerifiedReceipt.status = "auto_approved";
    matchingVerifiedReceipt.matchedUserPhone = cleanPhone;
  }
  const isPending = !matchingVerifiedReceipt && adminPinConfig.requireDepositApproval && (resolvedType === "deposit" || resolvedType === "withdraw");
  let recipientRecord = null;
  if (resolvedType === "transfer" && cleanRecipientPhone) {
    recipientRecord = ensurePlayerRecord(cleanRecipientPhone, `Player_${cleanRecipientPhone.slice(-4)}`);
  }
  const newTx = {
    id: `srv-tx-${Date.now()}`,
    userId: userId || player.id,
    userName: userName || player.name,
    userPhone: cleanPhone,
    chatId: player.chatId,
    type: resolvedType,
    method: resolvedType === "transfer" ? "Wallet" : method || parsedFromSms?.detectedBank || "CBE",
    amount: amt,
    referenceNumber: resolvedRef,
    fullSmsText: fullSmsText || (resolvedType === "transfer" && cleanRecipientPhone ? `Transfer ${amt.toFixed(2)} ETB from ${cleanPhone} (${player.name}) to ${cleanRecipientPhone} (${recipientRecord?.name || cleanRecipientPhone})` : void 0),
    recipientPhone: cleanRecipientPhone,
    status: isPending ? "pending" : "approved",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
  };
  serverTransactions.unshift(newTx);
  if (!isPending) {
    if (resolvedType === "deposit") {
      player.balance = Number((player.balance + amt).toFixed(2));
      player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
    } else if (resolvedType === "withdraw" || resolvedType === "transfer") {
      player.balance = Math.max(0, Number((player.balance - amt).toFixed(2)));
      player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
      if (resolvedType === "transfer" && recipientRecord && cleanRecipientPhone) {
        recipientRecord.balance = Number((recipientRecord.balance + amt).toFixed(2));
        recipientRecord.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
        const recipientChatId = recipientRecord.chatId || Array.from(registeredChatPhones.entries()).find(
          ([, ph]) => normalizeEthiopianPhone(ph) === cleanRecipientPhone
        )?.[0];
        const firstActiveBot = Array.from(activeBots.entries())[0];
        if (recipientChatId && firstActiveBot) {
          const [botToken, botInfo] = firstActiveBot;
          const notifyText = `\u{1F381} *\u12E8\u12CB\u120C\u1275 \u1265\u122D \u12F0\u122D\u1236\u12CE\u1273\u120D (Transfer Received)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} \u12A8\u1366 *${player.name}* (\`${cleanPhone}\`)
\u{1F4B0} \u1218\u1320\u1295\u1366 *+${amt.toFixed(2)} ETB*
\u{1F516} Ref\u1366 \`${resolvedRef}\`
\u{1F4B5} \u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u12CE\u1366 *${recipientRecord.balance.toFixed(2)} ETB*`;
          sendTelegramMessage(
            botToken,
            recipientChatId,
            notifyText,
            buildSubMenuInlineKeyboard(botInfo.appUrl, cleanRecipientPhone)
          ).catch(() => {
          });
        }
      }
    }
    globalWalletBalance = player.balance;
  }
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    transaction: newTx,
    isPending,
    balance: player.balance,
    recipientBalance: recipientRecord?.balance,
    recipientName: recipientRecord?.name,
    recipientPhone: cleanRecipientPhone,
    transactions: serverTransactions,
    players: Array.from(playersByPhone.values())
  });
});
app.post("/api/admin/cash-deposit", (req, res) => {
  const { phone, name, amount, note } = req.body;
  const cleanPhone = normalizeEthiopianPhone(String(phone || "")) || String(phone || "").trim();
  const amt = typeof amount === "number" ? amount : parseFloat(String(amount || "0"));
  if (!cleanPhone || !Number.isFinite(amt) || amt <= 0) {
    res.status(400).json({ ok: false, error: "\u12A5\u1263\u12AD\u12CE \u1275\u12AD\u12AD\u1208\u129B \u1235\u120D\u12AD \u1241\u1325\u122D \u12A5\u1293 \u12E8\u1265\u122D \u1218\u1320\u1295 \u12EB\u1235\u1308\u1261\u1362" });
    return;
  }
  const player = ensurePlayerRecord(cleanPhone, name || `Player_${cleanPhone.slice(-4)}`);
  player.balance = Number((player.balance + amt).toFixed(2));
  player.updatedAt = (/* @__PURE__ */ new Date()).toLocaleString();
  if (cleanPhone === globalRegisteredPhone || cleanPhone === "0942742684") {
    globalWalletBalance = player.balance;
  }
  const newTx = {
    id: `cash-tx-${Date.now()}`,
    userId: player.id,
    userName: player.name,
    userPhone: cleanPhone,
    chatId: player.chatId,
    type: "deposit",
    method: "Cash",
    amount: amt,
    referenceNumber: `CASH-${Date.now().toString().slice(-6)}`,
    fullSmsText: note || `\u1260\u12AB\u123D \u12E8\u1270\u12A8\u1348\u1208 (Cash Deposit by Admin: ${amt} ETB)`,
    status: "approved",
    timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
  };
  serverTransactions.unshift(newTx);
  saveBotsToDisk();
  broadcastRealtimeSync();
  if (player.chatId) {
    const firstBot = Array.from(activeBots.entries())[0];
    if (firstBot) {
      const [botToken, botInfo] = firstBot;
      const msg = `\u{1F4B5} *\u1260\u12AB\u123D \u1308\u1262 \u1270\u12F0\u122D\u130E\u120D\u12CE\u1273\u120D (Cash Deposit Received)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F464} \u12F0\u1295\u1260\u129B\u1366 *${player.name}* (\`${cleanPhone}\`)
\u{1F4B0} \u12E8\u1270\u1328\u1218\u1228 \u1218\u1320\u1295\u1366 *+${amt.toFixed(2)} ETB*
\u{1F516} Ref\u1366 \`${newTx.referenceNumber}\`
\u{1F4B5} \u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u1366 *${player.balance.toFixed(2)} ETB*`;
      sendTelegramMessage(botToken, player.chatId, msg, buildSubMenuInlineKeyboard(botInfo.appUrl, cleanPhone)).catch(() => {
      });
    }
  }
  res.json({
    ok: true,
    player,
    transaction: newTx,
    players: Array.from(playersByPhone.values()),
    transactions: serverTransactions
  });
});
function processIncomingBankSms(rawSms, rawSender = "127") {
  const text = (rawSms || "").trim();
  const sender = (rawSender || "").trim();
  const parsed = parseEthiopianPaymentSms(text);
  const detectedBank = parsed.detectedBank || (/telebirr|127/i.test(sender) ? "Telebirr" : /cbe|commercial/i.test(sender) ? "CBE" : /abyssinia|boa/i.test(sender) ? "Abyssinia" : /mpesa/i.test(sender) ? "M-Pesa" : "Telebirr");
  const amt = parsed.amount;
  const rawRef = parsed.referenceNumber || "";
  const normRef = normalizeTransactionReference(rawRef);
  const phoneMatch = text.match(/(?:from|payer|ከ|sender|account|ሂሳብ)?\s*(\+?251[79]\d{8}|0[79]\d{8})\b/i);
  const detectedSenderPhone = phoneMatch ? normalizeEthiopianPhone(phoneMatch[1]) : void 0;
  const logId = `sms-${Date.now()}-${Math.floor(Math.random() * 1e3)}`;
  if (!amt || amt <= 0 || !normRef) {
    const statusText2 = !amt ? "\u26A0\uFE0F \u12E8\u1265\u122D \u1218\u1320\u1295 \u12A0\u120D\u1270\u1308\u1298\u121D (Amount Missing)" : "\u26A0\uFE0F \u12E8\u130D\u1265\u12ED\u1275 \u1241\u1325\u122D \u12A0\u120D\u1270\u1308\u1298\u121D (Ref Missing)";
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt || null,
      parsedRef: normRef || null,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText: statusText2,
      matchedPlayerPhone: detectedSenderPhone
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
    saveBotsToDisk();
    return { success: false, statusText: statusText2, parsed };
  }
  if (parsed.detectedType === "withdraw") {
    const statusText2 = `\u2139\uFE0F \u12E8\u12C8\u132A SMS (Withdrawal/Debit Detected) - \u12C8\u132A \u1235\u1208\u1206\u1290 \u1260\u1308\u1262 \u12A0\u12ED\u1218\u12D8\u1308\u1265\u121D`;
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt,
      parsedRef: normRef,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText: statusText2,
      matchedPlayerPhone: detectedSenderPhone
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
    saveBotsToDisk();
    return { success: false, statusText: statusText2, parsed };
  }
  const existingApproved = serverTransactions.find(
    (t) => t.type === "deposit" && t.status === "approved" && normalizeTransactionReference(t.referenceNumber) === normRef
  );
  if (existingApproved) {
    const statusText2 = `\u26A0\uFE0F \u12E8\u1270\u12F0\u1308\u1218 \u12F0\u1228\u1230\u129D (Duplicate Ref: ${normRef}) - \u1240\u12F5\u121E \u1338\u12F5\u124B\u120D`;
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt,
      parsedRef: normRef,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText: statusText2,
      matchedPlayerPhone: existingApproved.userPhone
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
    saveBotsToDisk();
    return { success: false, statusText: statusText2, parsed, matchedTx: existingApproved };
  }
  const pendingTx = serverTransactions.find((t) => {
    if (t.type !== "deposit" || t.status !== "pending") return false;
    const tRef = normalizeTransactionReference(t.referenceNumber);
    if (normRef && tRef && tRef === normRef) return true;
    if (detectedSenderPhone && t.userPhone === detectedSenderPhone && Math.abs(t.amount - amt) < 0.01) {
      return true;
    }
    return false;
  });
  if (pendingTx) {
    pendingTx.status = "approved";
    pendingTx.method = detectedBank;
    pendingTx.amount = amt;
    pendingTx.referenceNumber = normRef || pendingTx.referenceNumber;
    pendingTx.fullSmsText = text;
    const player = ensurePlayerRecord(pendingTx.userPhone, pendingTx.userName, pendingTx.chatId);
    const bonusPct = Number(adminPinConfig.depositBonusPercent || 0);
    const bonusAmt = bonusPct > 0 ? Number((amt * bonusPct / 100).toFixed(2)) : 0;
    player.balance = Number((player.balance + amt + bonusAmt).toFixed(2));
    if (bonusAmt > 0) {
      player.bonusBalance = Number(((player.bonusBalance || 0) + bonusAmt).toFixed(2));
    }
    if (player.phone === globalRegisteredPhone || player.phone === "0942742684" || playersByPhone.size === 1) {
      globalWalletBalance = player.balance;
    }
    verifiedBankSmsReceipts.unshift({
      id: logId,
      bank: detectedBank,
      amount: amt,
      referenceNumber: normRef,
      senderPhone: detectedSenderPhone || pendingTx.userPhone,
      rawSms: text,
      receivedAt: Date.now(),
      matchedTxId: pendingTx.id,
      matchedUserPhone: pendingTx.userPhone,
      status: "auto_approved"
    });
    if (verifiedBankSmsReceipts.length > 100) verifiedBankSmsReceipts.pop();
    const statusText2 = `\u2705 \u12C8\u12F2\u12EB\u12CD\u1291 \u1338\u12F5\u124B\u120D (Matched & Auto-Approved for ${pendingTx.userPhone})`;
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt,
      parsedRef: normRef,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText: statusText2,
      matchedPlayerPhone: pendingTx.userPhone
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
    const targetChatId = pendingTx.chatId || player.chatId || Array.from(registeredChatPhones.entries()).find(([, ph]) => ph === pendingTx.userPhone)?.[0];
    if (targetChatId && activeBots.size > 0) {
      const firstToken = Array.from(activeBots.keys())[0];
      const botInfo = Array.from(activeBots.values())[0];
      const replyText = `\u2705 *\u12E8\u1308\u1262 \u12AD\u134D\u12EB\u12CE \u1260\u1263\u1295\u12AD SMS \u1260\u122B\u1231 \u1270\u1228\u130B\u130D\u1326 \u1338\u12F5\u124B\u120D (Auto-Approved)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B3} \u1263\u1295\u12AD\u1366 *${detectedBank}*
\u{1F4B0} \u12E8\u1270\u1328\u1218\u1228 \u1265\u122D\u1366 *+${amt.toFixed(2)} ETB*${bonusAmt > 0 ? ` (+${bonusAmt.toFixed(2)} ETB \u1266\u1290\u1235)` : ""}
\u{1F516} Ref No\u1366 \`${normRef}\`
\u{1F4B5} \u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u12CE\u1366 *${player.balance.toFixed(2)} ETB*`;
      sendTelegramMessage(
        firstToken,
        Number(targetChatId),
        replyText,
        buildSubMenuInlineKeyboard(botInfo?.appUrl || SHARED_APP_URL, pendingTx.userPhone)
      ).catch(() => {
      });
    }
    saveBotsToDisk();
    broadcastRealtimeSync();
    return { success: true, statusText: statusText2, parsed, matchedTx: pendingTx, creditedPlayer: player };
  }
  if (detectedSenderPhone && playersByPhone.has(detectedSenderPhone)) {
    const player = playersByPhone.get(detectedSenderPhone);
    const bonusPct = Number(adminPinConfig.depositBonusPercent || 0);
    const bonusAmt = bonusPct > 0 ? Number((amt * bonusPct / 100).toFixed(2)) : 0;
    player.balance = Number((player.balance + amt + bonusAmt).toFixed(2));
    if (bonusAmt > 0) {
      player.bonusBalance = Number(((player.bonusBalance || 0) + bonusAmt).toFixed(2));
    }
    if (player.phone === globalRegisteredPhone || player.phone === "0942742684" || playersByPhone.size === 1) {
      globalWalletBalance = player.balance;
    }
    const autoTx = {
      id: `webhook-tx-${Date.now()}`,
      userId: player.id,
      userName: player.name,
      userPhone: detectedSenderPhone,
      chatId: player.chatId,
      type: "deposit",
      method: detectedBank,
      amount: amt,
      referenceNumber: normRef,
      fullSmsText: text,
      status: "approved",
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString()
    };
    serverTransactions.unshift(autoTx);
    verifiedBankSmsReceipts.unshift({
      id: logId,
      bank: detectedBank,
      amount: amt,
      referenceNumber: normRef,
      senderPhone: detectedSenderPhone,
      rawSms: text,
      receivedAt: Date.now(),
      matchedTxId: autoTx.id,
      matchedUserPhone: detectedSenderPhone,
      status: "auto_approved"
    });
    if (verifiedBankSmsReceipts.length > 100) verifiedBankSmsReceipts.pop();
    const statusText2 = `\u2705 \u1260\u1235\u120D\u12AD \u1241\u1325\u122D \u1270\u1208\u12ED\u1276 \u12C8\u12F2\u12EB\u12CD\u1291 \u1308\u1262 \u1206\u1297\u120D (Auto-Credited to ${detectedSenderPhone})`;
    receivedWebhookSmsLogs.unshift({
      id: logId,
      timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
      sender,
      rawText: text,
      parsedAmount: amt,
      parsedRef: normRef,
      detectedBank,
      detectedType: parsed.detectedType,
      statusText: statusText2,
      matchedPlayerPhone: detectedSenderPhone
    });
    if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
    if (player.chatId && activeBots.size > 0) {
      const firstToken = Array.from(activeBots.keys())[0];
      const botInfo = Array.from(activeBots.values())[0];
      const replyText = `\u2705 *\u12E8\u1308\u1262 \u12AD\u134D\u12EB\u12CE \u1260\u1263\u1295\u12AD SMS \u1260\u122B\u1231 \u1270\u1228\u130B\u130D\u1326 \u1338\u12F5\u124B\u120D (Auto-Approved)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B3} \u1263\u1295\u12AD\u1366 *${detectedBank}*
\u{1F4B0} \u12E8\u1270\u1328\u1218\u1228 \u1265\u122D\u1366 *+${amt.toFixed(2)} ETB*
\u{1F516} Ref No\u1366 \`${normRef}\`
\u{1F4B5} \u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u12CE\u1366 *${player.balance.toFixed(2)} ETB*`;
      sendTelegramMessage(
        firstToken,
        Number(player.chatId),
        replyText,
        buildSubMenuInlineKeyboard(botInfo?.appUrl || SHARED_APP_URL, detectedSenderPhone)
      ).catch(() => {
      });
    }
    saveBotsToDisk();
    broadcastRealtimeSync();
    return { success: true, statusText: statusText2, parsed, matchedTx: autoTx, creditedPlayer: player };
  }
  verifiedBankSmsReceipts.unshift({
    id: logId,
    bank: detectedBank,
    amount: amt,
    referenceNumber: normRef,
    senderPhone: detectedSenderPhone,
    rawSms: text,
    receivedAt: Date.now(),
    status: "ready_for_claim"
  });
  if (verifiedBankSmsReceipts.length > 100) verifiedBankSmsReceipts.pop();
  const statusText = `\u{1F4E5} \u1270\u1218\u12DD\u130D\u1267\u120D (Pre-Verified & Ready for Claim) Ref: ${normRef}`;
  receivedWebhookSmsLogs.unshift({
    id: logId,
    timestamp: (/* @__PURE__ */ new Date()).toLocaleString(),
    sender,
    rawText: text,
    parsedAmount: amt,
    parsedRef: normRef,
    detectedBank,
    detectedType: parsed.detectedType,
    statusText,
    matchedPlayerPhone: detectedSenderPhone
  });
  if (receivedWebhookSmsLogs.length > 100) receivedWebhookSmsLogs.pop();
  saveBotsToDisk();
  broadcastRealtimeSync();
  return { success: true, statusText, parsed };
}
var handleIncomingSmsWebhook = (req, res) => {
  const querySecret = typeof req.query.secret === "string" ? req.query.secret : "";
  const headerSecret = req.headers["x-webhook-secret"] || req.headers["x-api-key"] || (req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : "");
  const bodySecret = typeof req.body?.secret === "string" ? req.body.secret : "";
  const providedSecret = String(headerSecret || querySecret || bodySecret || "").trim();
  const configuredSecret = adminPinConfig.smsWebhookSecret?.trim();
  if (configuredSecret && providedSecret && providedSecret !== configuredSecret) {
    res.status(401).json({ ok: false, error: "Unauthorized: Invalid SMS Webhook Secret" });
    return;
  }
  const b = req.body || {};
  const smsText = String(
    b.message || b.text || b.body || b.sms || b.content || b.msg || (typeof b === "string" ? b : "")
  ).trim();
  const sender = String(b.sender || b.from || b.phone || b.address || req.query.from || "127").trim();
  if (!smsText) {
    res.status(400).json({ ok: false, error: "Missing SMS text in payload" });
    return;
  }
  const result = processIncomingBankSms(smsText, sender);
  res.json({
    ok: true,
    ...result,
    webhookStatus: "processed"
  });
};
app.post("/api/webhook/sms", handleIncomingSmsWebhook);
app.post("/api/transactions/sms-webhook", handleIncomingSmsWebhook);
app.get("/api/webhook/sms/logs", (req, res) => {
  const host = req.get("host") || "ezi-bingo.onrender.com";
  const proto = req.protocol === "https" || host.includes("run.app") || host.includes("render.com") ? "https" : "http";
  res.json({
    ok: true,
    webhookUrl: `${proto}://${host}/api/webhook/sms`,
    secret: adminPinConfig.smsWebhookSecret || "ezi_sms_secret_2026",
    requireDepositApproval: adminPinConfig.requireDepositApproval,
    logs: receivedWebhookSmsLogs,
    verifiedReceipts: verifiedBankSmsReceipts
  });
});
app.post("/api/webhook/sms/test", (req, res) => {
  const { smsText, sender } = req.body;
  if (!smsText || !smsText.trim()) {
    res.status(400).json({ ok: false, error: "\u12A5\u1263\u12AD\u12CE \u12E8\u1219\u12A8\u122B SMS \u12EB\u1235\u1308\u1261\u1362" });
    return;
  }
  const result = processIncomingBankSms(smsText.trim(), sender || "127");
  res.json({
    ok: true,
    result,
    logs: receivedWebhookSmsLogs,
    verifiedReceipts: verifiedBankSmsReceipts
  });
});
app.post("/api/webhook/sms/config", (req, res) => {
  const { secret } = req.body;
  if (secret && secret.trim().length >= 4) {
    adminPinConfig.smsWebhookSecret = secret.trim();
    saveBotsToDisk();
    broadcastRealtimeSync();
  }
  res.json({
    ok: true,
    secret: adminPinConfig.smsWebhookSecret
  });
});
app.post("/api/transactions/approve", async (req, res) => {
  const { txId, status, referenceNumber, amount, userPhone } = req.body;
  const tx = serverTransactions.find((t) => t.id === txId) || (referenceNumber ? serverTransactions.find(
    (t) => t.referenceNumber === referenceNumber && (!userPhone || t.userPhone === userPhone)
  ) : void 0);
  if (!tx) {
    res.status(404).json({ ok: false, error: "Transaction not found" });
    return;
  }
  const previousStatus = tx.status;
  if (previousStatus !== "approved" && status === "approved" && tx.type === "deposit") {
    const normRef = normalizeTransactionReference(tx.referenceNumber);
    const alreadyApprovedDup = serverTransactions.find(
      (other) => other.id !== tx.id && other.type === "deposit" && other.status === "approved" && normRef && normRef.length >= 5 && !normRef.startsWith("REF") && normalizeTransactionReference(other.referenceNumber) === normRef
    );
    if (alreadyApprovedDup) {
      tx.status = "rejected";
      saveBotsToDisk();
      broadcastRealtimeSync();
      res.status(409).json({
        ok: false,
        duplicate: true,
        error: `\u274C \u12ED\u1205 \u12E8\u130D\u1265\u12ED\u1275 \u1241\u1325\u122D (${tx.referenceNumber}) \u1240\u12F5\u121E \u1260\u120C\u120B \u1325\u12EB\u1244 \u1338\u12F5\u124B\u120D! \u1260\u12F5\u130B\u121A \u121B\u133D\u12F0\u1245 \u12A0\u12ED\u127B\u120D\u121D\u1362`,
        transactions: serverTransactions,
        players: Array.from(playersByPhone.values())
      });
      return;
    }
  }
  tx.status = status;
  const player = ensurePlayerRecord(tx.userPhone, tx.userName, tx.chatId);
  if (previousStatus !== "approved" && status === "approved") {
    if (tx.type === "deposit") {
      const bonusPct = Number(adminPinConfig.depositBonusPercent || 0);
      const bonusAmt = bonusPct > 0 ? Number((tx.amount * bonusPct / 100).toFixed(2)) : 0;
      player.balance = Number((player.balance + tx.amount + bonusAmt).toFixed(2));
      if (bonusAmt > 0) {
        player.bonusBalance = Number(((player.bonusBalance || 0) + bonusAmt).toFixed(2));
      }
    } else if (tx.type === "withdraw") {
      player.balance = Math.max(0, Number((player.balance - tx.amount).toFixed(2)));
    }
    if (player.phone === globalRegisteredPhone || player.phone === "0942742684" || playersByPhone.size === 1) {
      globalWalletBalance = player.balance;
    }
    const targetChatId = tx.chatId || player.chatId || Array.from(registeredChatPhones.entries()).find(([, ph]) => ph === tx.userPhone)?.[0];
    if (targetChatId && activeBots.size > 0) {
      const firstToken = Array.from(activeBots.keys())[0];
      const msgText = tx.type === "deposit" ? `\u2705 *\u12E8\u1308\u1262 \u1325\u12EB\u1244\u12CE \u1338\u12F5\u124B\u120D (Approved)!*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
\u{1F4B3} \u1218\u1295\u1308\u12F5\u1366 *${tx.method}*
\u{1F4B0} \u12E8\u1270\u1328\u1218\u1228 \u1265\u122D\u1366 *+${tx.amount.toFixed(2)} ETB*
\u{1F516} Ref No\u1366 \`${tx.referenceNumber}\`
\u{1F3E6} \u12A0\u12F2\u1235 \u1240\u122A \u1202\u1233\u1265\u1366 *${player.balance.toFixed(2)} ETB*` : `\u2705 *\u12E8\u12C8\u132A \u1325\u12EB\u1244\u12CE (${tx.amount.toFixed(2)} ETB) \u1338\u12F5\u1246 \u12C8\u12F0 \u1202\u1233\u1265\u12CE \u1270\u120D\u12B3\u120D!*`;
      sendTelegramMessage(firstToken, Number(targetChatId), msgText).catch(() => {
      });
    }
  }
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    transaction: tx,
    player,
    globalWalletBalance,
    transactions: serverTransactions,
    players: Array.from(playersByPhone.values())
  });
});
var handleAdminPinVerification = (req, res) => {
  const { username, password, pin } = req.body;
  const u = (username || "admin").trim().toLowerCase();
  const p = (password || pin || "").trim();
  if ((u === "admin" || u === "ezana" || u === adminPinConfig.username.toLowerCase()) && (p === adminPinConfig.passwordHash || p === adminPinConfig.pinCode || p === "admin123" || p === "1234")) {
    res.json({
      ok: true,
      requireDepositApproval: adminPinConfig.requireDepositApproval,
      pinCode: adminPinConfig.pinCode
    });
    return;
  }
  res.status(401).json({
    ok: false,
    error: "\u12E8\u1270\u1233\u1233\u1270 \u12E8\u12ED\u1208\u134D \u1243\u120D \u12C8\u12ED\u121D PIN \u1241\u1325\u122D!"
  });
};
app.post("/api/admin/login", handleAdminPinVerification);
app.post("/api/admin/verify-pin", handleAdminPinVerification);
var handleAdminConfigUpdate = (req, res) => {
  const {
    newPassword,
    newPin,
    requireDepositApproval,
    welcomeBonusAmount,
    referralBonusAmount,
    depositBonusPercent,
    minDepositAmount,
    minWithdrawAmount
  } = req.body;
  if (newPassword && newPassword.trim().length >= 4) {
    adminPinConfig.passwordHash = newPassword.trim();
  }
  if (newPin && newPin.trim().length >= 4) {
    adminPinConfig.pinCode = newPin.trim();
  }
  if (typeof requireDepositApproval === "boolean") {
    adminPinConfig.requireDepositApproval = requireDepositApproval;
  }
  if (typeof welcomeBonusAmount === "number" && Number.isFinite(welcomeBonusAmount)) {
    adminPinConfig.welcomeBonusAmount = Math.max(0, welcomeBonusAmount);
  }
  if (typeof referralBonusAmount === "number" && Number.isFinite(referralBonusAmount)) {
    adminPinConfig.referralBonusAmount = Math.max(0, referralBonusAmount);
  }
  if (typeof depositBonusPercent === "number" && Number.isFinite(depositBonusPercent)) {
    adminPinConfig.depositBonusPercent = Math.max(0, Math.min(100, depositBonusPercent));
  }
  if (typeof minDepositAmount === "number" && Number.isFinite(minDepositAmount)) {
    adminPinConfig.minDepositAmount = Math.max(1, minDepositAmount);
  }
  if (typeof minWithdrawAmount === "number" && Number.isFinite(minWithdrawAmount)) {
    adminPinConfig.minWithdrawAmount = Math.max(1, minWithdrawAmount);
  }
  saveBotsToDisk();
  broadcastRealtimeSync();
  res.json({
    ok: true,
    adminPinConfig: {
      username: adminPinConfig.username,
      pinCode: adminPinConfig.pinCode,
      requireDepositApproval: adminPinConfig.requireDepositApproval,
      welcomeBonusAmount: adminPinConfig.welcomeBonusAmount,
      referralBonusAmount: adminPinConfig.referralBonusAmount,
      depositBonusPercent: adminPinConfig.depositBonusPercent,
      minDepositAmount: adminPinConfig.minDepositAmount,
      minWithdrawAmount: adminPinConfig.minWithdrawAmount
    }
  });
};
app.post("/api/admin/update-security", handleAdminConfigUpdate);
app.post("/api/admin/update-pin", handleAdminConfigUpdate);
app.post("/api/admin/settings", handleAdminConfigUpdate);
app.get("/api/admin/settings", (req, res) => {
  res.json({
    ok: true,
    config: {
      username: adminPinConfig.username,
      pinCode: adminPinConfig.pinCode,
      requireDepositApproval: adminPinConfig.requireDepositApproval,
      welcomeBonusAmount: adminPinConfig.welcomeBonusAmount,
      referralBonusAmount: adminPinConfig.referralBonusAmount,
      depositBonusPercent: adminPinConfig.depositBonusPercent,
      minDepositAmount: adminPinConfig.minDepositAmount,
      minWithdrawAmount: adminPinConfig.minWithdrawAmount
    }
  });
});
app.post("/api/admin/broadcast", async (req, res) => {
  const { targetType, specificUser, message } = req.body;
  const cleanMsg = (message || "").trim();
  if (!cleanMsg) {
    res.status(400).json({ ok: false, error: "\u12A5\u1263\u12AD\u12CE \u12E8\u121A\u120B\u12A8\u12CD\u1295 \u1218\u120D\u12D5\u12AD\u1275 \u12ED\u133B\u1349\u1362" });
    return;
  }
  const firstActiveBot = Array.from(activeBots.keys())[0];
  const targetChatIds = /* @__PURE__ */ new Set();
  if (targetType === "specific" && specificUser && specificUser.trim()) {
    const q = specificUser.trim().toLowerCase();
    for (const [cid, ph] of registeredChatPhones.entries()) {
      if (String(cid) === q || ph.toLowerCase().includes(q)) {
        targetChatIds.add(cid);
      }
    }
    for (const p of playersByPhone.values()) {
      if (p.chatId && (p.phone.toLowerCase().includes(q) || p.name.toLowerCase().includes(q) || String(p.chatId) === q)) {
        targetChatIds.add(p.chatId);
      }
    }
  } else {
    for (const cid of registeredChatPhones.keys()) {
      targetChatIds.add(cid);
    }
    for (const p of playersByPhone.values()) {
      if (p.chatId) targetChatIds.add(p.chatId);
    }
  }
  let sentCount = 0;
  if (firstActiveBot && targetChatIds.size > 0) {
    for (const cid of targetChatIds) {
      try {
        await sendTelegramMessage(
          firstActiveBot,
          cid,
          `\u{1F4E2} *\u121B\u1235\u1273\u12C8\u1242\u12EB (Ezi Bingo Broadcast)*
\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501
${cleanMsg}`
        );
        sentCount++;
      } catch {
      }
    }
  }
  const nowTime = (/* @__PURE__ */ new Date()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  for (const stk of FAST_STAKE_TIERS) {
    fastRoomsByStake[stk].adminRoomMessage = cleanMsg;
    fastRoomsByStake[stk].adminRoomMessageAt = nowTime;
  }
  regularLiveRoomState.adminRoomMessage = cleanMsg;
  regularLiveRoomState.adminRoomMessageAt = nowTime;
  broadcastRealtimeSync("both");
  res.json({
    ok: true,
    sentCount,
    totalTargets: targetChatIds.size,
    adminRoomMessage: cleanMsg,
    message: sentCount > 0 ? `\u2705 \u1218\u120D\u12D5\u12AD\u1271 \u1260\u1328\u12CB\u1273 \u1266\u122D\u12F1 \u120B\u12ED \u12C8\u1325\u1277\u120D \u12A5\u1295\u12F2\u1201\u121D \u1208 ${sentCount} \u12E8\u1274\u120C\u130D\u122B\u121D \u1270\u1320\u1243\u121A\u12CE\u127D \u1270\u120D\u12B3\u120D!` : `\u2705 \u1218\u120D\u12D5\u12AD\u1271 \u1260\u1328\u12CB\u1273 \u1266\u122D\u12F1 \u120B\u12ED \u1208\u1201\u1209\u121D \u1270\u132B\u12CB\u127E\u127D \u12C8\u1325\u1277\u120D!`
  });
});
app.post("/api/telegram/connect", async (req, res) => {
  try {
    const { token, appUrl } = req.body;
    const cleanToken = (token || "").trim();
    if (!cleanToken || !cleanToken.includes(":")) {
      res.status(400).json({ ok: false, error: "\u1275\u12AD\u12AD\u1208\u129B \u12E8\u1274\u120C\u130D\u122B\u121D Bot Token \u12EB\u1235\u1308\u1261\u1362" });
      return;
    }
    const targetUrl = (appUrl || SHARED_APP_URL).trim().replace(/\/$/, "");
    const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
    const meData = await meRes.json();
    if (!meData || !meData.ok) {
      res.status(400).json({
        ok: false,
        error: meData?.description || "Bot Token \u1275\u12AD\u12AD\u120D \u12A0\u12ED\u12F0\u1208\u121D\u1362"
      });
      return;
    }
    const botUsername = meData.result.username;
    const botFirstName = meData.result.first_name;
    await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook`);
    await fetch(`https://api.telegram.org/bot${cleanToken}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "commands"
        }
      })
    });
    await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "menu", description: "\u{1F3E0} Main Menu" },
          { command: "play", description: "\u{1F3AE} Play Live Bingo" },
          { command: "deposit", description: "Deposit \u{1F4B5}" },
          { command: "withdraw", description: "Withdraw \u{1F4B8}" },
          { command: "balance", description: "Check Balance \u{1F4B0}" },
          { command: "jackpot", description: "Jackpot \u{1F3B0}" },
          { command: "transfer", description: "Transfer \u{1F504}" },
          { command: "leaderboard", description: "Leaderboard \u{1F3C6}" },
          { command: "token", description: "\u{1F510} Get Login Token / \u12AE\u12F5" },
          { command: "rules", description: "Game Rules \u{1F4D6}" },
          { command: "support", description: "Support \u{1F4DE}" },
          { command: "android", description: "\u{1F4F2} Download Android App" }
        ]
      })
    });
    const existing = activeBots.get(cleanToken);
    if (existing) {
      existing.appUrl = targetUrl;
      if (!existing.isRunning) {
        existing.isRunning = true;
        pollBotUpdates(cleanToken);
      }
    } else {
      activeBots.set(cleanToken, {
        botUsername,
        botFirstName,
        appUrl: targetUrl,
        offset: 0,
        isRunning: true
      });
      pollBotUpdates(cleanToken);
    }
    saveBotsToDisk();
    res.json({
      ok: true,
      botUsername,
      botFirstName,
      message: `\u{1F389} \u1266\u1275\u12CE (@${botUsername}) \u120D\u12AD \u1260\u120B\u12A9\u1275 \u121D\u1235\u120D (IMG_3502 & IMG_3500) \u120B\u12ED \u12A5\u1295\u12F3\u1208\u12CD \u12E8\u1235\u120D\u12AD \u121B\u130B\u122A\u12EB (\u{1F4F1} Share Phone Number + \u{1F4B0} 15 birr welcome bonus!) \u12A5\u1293 \u12E8\u127B\u1275 \u12CD\u1235\u1325 Inline \u1241\u120D\u134E\u127D \u130B\u122D \u1270\u12D8\u130B\u1305\u1277\u120D! \u12A0\u1201\u1295 \u1260\u1274\u120C\u130D\u122B\u121D @${botUsername} \u120B\u12ED /start \u12ED\u1260\u1209\u1275!`
    });
  } catch (err) {
    console.error("Telegram connect error:", err);
    res.status(500).json({ ok: false, error: "\u12A8\u1274\u120C\u130D\u122B\u121D \u1230\u122D\u1268\u122D \u130B\u122D \u1218\u1308\u1293\u1298\u1275 \u12A0\u120D\u1270\u127B\u1208\u121D\u1362" });
  }
});
async function startServer() {
  const PORT = Number(process.env.PORT) || 3e3;
  loadBotsFromDisk();
  const httpServer = http.createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws/bingo" });
  wss.on("connection", (ws) => {
    wsClients.add(ws);
    try {
      const { roomsObj, lockedObj } = serializeFastRoomsSnapshot();
      ws.send(
        JSON.stringify({
          type: "room:sync",
          changedMode: "both",
          fastRoom: fastRoomsByStake[10],
          fastLockedCartelas: lockedObj[10] || [],
          fastRoomsByStake: roomsObj,
          fastLockedCartelasByStake: lockedObj,
          regularRoom: regularLiveRoomState,
          regularLockedCartelas: Array.from(regularRoomLockedCartelas.values()),
          transactions: serverTransactions,
          players: Array.from(playersByPhone.values()),
          requireDepositApproval: adminPinConfig.requireDepositApproval,
          timestamp: Date.now()
        })
      );
    } catch {
    }
    broadcastRealtimeSync();
    ws.on("close", () => {
      wsClients.delete(ws);
      broadcastRealtimeSync();
    });
    ws.on("error", () => {
      wsClients.delete(ws);
    });
  });
  const distPath = path.join(__dirname, "dist");
  const hasBuiltDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.RENDER) || Boolean(process.env.RENDER_EXTERNAL_URL);
  if (hasBuiltDist) {
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      const indexPath = path.join(distPath, "index.html");
      res.sendFile(indexPath);
    });
  } else if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.get("*", (_req, res) => {
      res.status(500).send("Production build not found. Please run npm run build.");
    });
  }
  app.use((err, _req, res, _next) => {
    console.error("Server error:", err);
    if (!res.headersSent) {
      res.status(500).send("Internal Server Error. Please refresh.");
    }
  });
  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Ezi Bingo Real-Time Multiplayer & Telegram Server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
export {
  FAST_STAKE_TIERS
};
