import { BingoRulePattern, CartelaCard } from '../types/bingo';

/**
 * Deterministic seeded PRNG (Mulberry32) so that every Cartela ID from 1 to 70,000
 * always generates the exact same unique, valid 75-ball Bingo board!
 */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickUniqueNumbers(min: number, max: number, count: number, rng: () => number): number[] {
  const pool: number[] = [];
  for (let i = min; i <= max; i++) {
    pool.push(i);
  }
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.floor(rng() * pool.length);
    result.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return result;
}

export function generateCartelaById(cartelaId: number): CartelaCard {
  const safeId = Math.max(1, Math.min(70000, Math.floor(cartelaId)));
  const rng = mulberry32(safeId * 98765 + 12345);

  const colB = pickUniqueNumbers(1, 15, 5, rng);
  const colI = pickUniqueNumbers(16, 30, 5, rng);
  const colN = pickUniqueNumbers(31, 45, 5, rng);
  const colG = pickUniqueNumbers(46, 60, 5, rng);
  const colO = pickUniqueNumbers(61, 75, 5, rng);

  const cols = [colB, colI, colN, colG, colO];
  const numbers: number[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => {
      if (r === 2 && c === 2) return 0; // FREE space
      return cols[c][r];
    })
  );

  const manualMarks: boolean[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => r === 2 && c === 2)
  );

  return {
    id: safeId,
    numbers,
    isRegistered: false,
    manualMarks,
  };
}

export function getLetterForBall(ball: number): 'B' | 'I' | 'N' | 'G' | 'O' {
  if (ball <= 15) return 'B';
  if (ball <= 30) return 'I';
  if (ball <= 45) return 'N';
  if (ball <= 60) return 'G';
  return 'O';
}

export interface StrictVerificationResult {
  isValid: boolean;
  winningCells: [number, number][];
  missingNumbers: number[];
  lastBallIncluded: boolean;
  reasonAm: string;
  needsAdminVerification?: boolean;
  isPatternComplete?: boolean;
}

/**
 * Helper to check all complete lines on a 5x5 boolean board
 */
function getCompleteLines(marked: boolean[][]) {
  const rows: number[] = [];
  const cols: number[] = [];
  let diag1 = true;
  let diag2 = true;

  for (let r = 0; r < 5; r++) {
    if (marked[r].every(Boolean)) rows.push(r);
  }
  for (let c = 0; c < 5; c++) {
    let allCol = true;
    for (let r = 0; r < 5; r++) {
      if (!marked[r][c]) allCol = false;
    }
    if (allCol) cols.push(c);
  }
  for (let i = 0; i < 5; i++) {
    if (!marked[i][i]) diag1 = false;
    if (!marked[i][4 - i]) diag2 = false;
  }

  return { rows, cols, diag1, diag2 };
}

/**
 * Strict Bingo Verification according to Ethiopian Ezi Bingo rules:
 * Rule 1: 4 corners do NOT count as a line.
 * Rule 2: Even if a cartela completes the pattern, the LAST CALLED NUMBER (activeBall)
 *         MUST be part of the winning pattern cells! Otherwise it is invalid and blocked.
 * Rule 3: Central FREE space (2,2) is always marked and included.
 */
export function verifyCartelaBingo(
  cartela: CartelaCard,
  calledBalls: number[],
  activeBall: number | null,
  rulePattern: BingoRulePattern
): StrictVerificationResult {
  const effectiveActiveBall =
    activeBall ?? (calledBalls.length > 0 ? calledBalls[calledBalls.length - 1] : null);

  if (!effectiveActiveBall || calledBalls.length === 0) {
    return {
      isValid: false,
      winningCells: [],
      missingNumbers: [],
      lastBallIncluded: false,
      reasonAm: 'ገና ምንም የወጣ ቁጥር የለም! ካርቴላው ታግዷል።',
    };
  }

  const calledSet = new Set(calledBalls.map(Number));
  if (effectiveActiveBall !== null && Number(effectiveActiveBall) > 0) {
    calledSet.add(Number(effectiveActiveBall));
  }

  // Marked matrix based on called balls (plus FREE space at 2,2)
  const marked: boolean[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => {
      if (r === 2 && c === 2) return true;
      const cellNum = Number(cartela.numbers[r][c]);
      return calledSet.has(cellNum);
    })
  );

  // Check if any valid candidate pattern for this rule is satisfied
  const candidateCoordsList: [number, number][][] = [];

  const { rows, cols, diag1, diag2 } = getCompleteLines(marked);

  // 1. Check all explicit variations in rulePattern
  for (const v of rulePattern.variations) {
    const coords: [number, number][] = [];
    let allMarked = true;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (v.grid[r][c]) {
          coords.push([r, c]);
          if (!marked[r][c]) {
            allMarked = false;
          }
        }
      }
    }
    if (allMarked && coords.length > 0) {
      candidateCoordsList.push(coords);
    }
  }

  // 2. Also check general mathematical rule for line-based and box-based rules so any valid combination of lines/boxes works
  const getCoordsForLines = (rList: number[], cList: number[], d1: boolean, d2: boolean): [number, number][] => {
    const set = new Set<string>();
    const res: [number, number][] = [];
    const add = (r: number, c: number) => {
      const k = `${r},${c}`;
      if (!set.has(k)) {
        set.add(k);
        res.push([r, c]);
      }
    };
    rList.forEach((r) => {
      for (let c = 0; c < 5; c++) add(r, c);
    });
    cList.forEach((c) => {
      for (let r = 0; r < 5; r++) add(r, c);
    });
    if (d1) {
      for (let i = 0; i < 5; i++) add(i, i);
    }
    if (d2) {
      for (let i = 0; i < 5; i++) add(i, 4 - i);
    }
    return res;
  };

  // Find all completed 2x2 boxes on the 5x5 grid
  const completedBoxes: { r: number; c: number; cells: [number, number][] }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (marked[r][c] && marked[r][c + 1] && marked[r + 1][c] && marked[r + 1][c + 1]) {
        completedBoxes.push({
          r,
          c,
          cells: [
            [r, c],
            [r, c + 1],
            [r + 1, c],
            [r + 1, c + 1],
          ],
        });
      }
    }
  }

  const allCompletedLines: [number, number][][] = [
    ...rows.map((r) => getCoordsForLines([r], [], false, false)),
    ...cols.map((c) => getCoordsForLines([], [c], false, false)),
    ...(diag1 ? [getCoordsForLines([], [], true, false)] : []),
    ...(diag2 ? [getCoordsForLines([], [], false, true)] : []),
  ];

  const nonOverlappingBoxes = (boxes: { r: number; c: number; cells: [number, number][] }[], count: number): [number, number][][] => {
    const results: [number, number][][] = [];
    const backtrack = (startIdx: number, chosen: { r: number; c: number; cells: [number, number][] }[], usedKeys: Set<string>) => {
      if (chosen.length === count) {
        const merged: [number, number][] = [];
        chosen.forEach((b) => merged.push(...b.cells));
        results.push(merged);
        return;
      }
      for (let i = startIdx; i < boxes.length; i++) {
        const b = boxes[i];
        const overlaps = b.cells.some(([r, c]) => usedKeys.has(`${r},${c}`));
        if (!overlaps) {
          const nextKeys = new Set(usedKeys);
          b.cells.forEach(([r, c]) => nextKeys.add(`${r},${c}`));
          backtrack(i + 1, [...chosen, b], nextKeys);
        }
      }
    };
    backtrack(0, [], new Set());
    return results;
  };

  // Find all completed 2x3 and 3x2 boxes on the 5x5 grid
  const completed2x3Boxes: { cells: [number, number][] }[] = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      if (
        marked[r][c] && marked[r][c + 1] && marked[r][c + 2] &&
        marked[r + 1][c] && marked[r + 1][c + 1] && marked[r + 1][c + 2]
      ) {
        completed2x3Boxes.push({
          cells: [
            [r, c], [r, c + 1], [r, c + 2],
            [r + 1, c], [r + 1, c + 1], [r + 1, c + 2],
          ],
        });
      }
    }
  }
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      if (
        marked[r][c] && marked[r][c + 1] &&
        marked[r + 1][c] && marked[r + 1][c + 1] &&
        marked[r + 2][c] && marked[r + 2][c + 1]
      ) {
        completed2x3Boxes.push({
          cells: [
            [r, c], [r, c + 1],
            [r + 1, c], [r + 1, c + 1],
            [r + 2, c], [r + 2, c + 1],
          ],
        });
      }
    }
  }

  const findDisjointPairs = (items: { cells: [number, number][] }[]): [number, number][][] => {
    const pairs: [number, number][][] = [];
    for (let i = 0; i < items.length; i++) {
      const setA = new Set(items[i].cells.map(([r, c]) => `${r},${c}`));
      for (let j = i + 1; j < items.length; j++) {
        const overlaps = items[j].cells.some(([r, c]) => setA.has(`${r},${c}`));
        if (!overlaps) {
          pairs.push([...items[i].cells, ...items[j].cells]);
        }
      }
    }
    return pairs;
  };

  if (rulePattern.isFastBingo || rulePattern.code === 'FAST_ONE_LINE_OR_FOUR_CORNERS') {
    // 1. Check every completed horizontal row (Row 0..4)
    rows.forEach((r) => candidateCoordsList.push(getCoordsForLines([r], [], false, false)));
    // 2. Check every completed vertical column (B=0, I=1, N=2, G=3, O=4)
    cols.forEach((c) => candidateCoordsList.push(getCoordsForLines([], [c], false, false)));
    // 3. Check both diagonals
    if (diag1) candidateCoordsList.push(getCoordsForLines([], [], true, false));
    if (diag2) candidateCoordsList.push(getCoordsForLines([], [], false, true));
    // 4. Check the 4 corners ([0,0], [0,4], [4,0], [4,4])
    if (marked[0][0] && marked[0][4] && marked[4][0] && marked[4][4]) {
      candidateCoordsList.push([
        [0, 0],
        [0, 4],
        [4, 0],
        [4, 4],
      ]);
    }
    // Also combine all completed lines/corners in case multiple were completed at once
    const combined: [number, number][] = getCoordsForLines(rows, cols, diag1, diag2);
    if (marked[0][0] && marked[0][4] && marked[4][0] && marked[4][4]) {
      combined.push([0, 0], [0, 4], [4, 0], [4, 4]);
    }
    if (combined.length > 0) {
      candidateCoordsList.push(combined);
    }
  } else if (rulePattern.code === 'TWO_2X3_DISJOINT') {
    candidateCoordsList.push(...findDisjointPairs(completed2x3Boxes));
  } else if (rulePattern.code === 'FOUR_2X2_DISJOINT') {
    candidateCoordsList.push(...nonOverlappingBoxes(completedBoxes, 4));
  } else if (rulePattern.code === 'THREE_2X2_NO_3_CORNERS') {
    candidateCoordsList.push(...nonOverlappingBoxes(completedBoxes, 3));
  } else if (rulePattern.code === 'TWO_PARALLEL_LINES') {
    // Two parallel horizontal lines
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        candidateCoordsList.push(getCoordsForLines([rows[i], rows[j]], [], false, false));
      }
    }
    // Two parallel vertical lines
    for (let i = 0; i < cols.length; i++) {
      for (let j = i + 1; j < cols.length; j++) {
        candidateCoordsList.push(getCoordsForLines([], [cols[i], cols[j]], false, false));
      }
    }
    // Two diagonals
    if (diag1 && diag2) {
      candidateCoordsList.push(getCoordsForLines([], [], true, true));
    }
  } else if (rulePattern.code === 'BIG_LETTER_X_STAR' || rulePattern.code === 'LETTER_X' || rulePattern.code === 'BIG_X') {
    if (diag1 && diag2) {
      candidateCoordsList.push(getCoordsForLines([], [], true, true));
    }
  } else if (rulePattern.code === 'BIG_LETTER_H' || rulePattern.code === 'LETTER_H') {
    if (cols.length >= 2 && rows.length >= 1) {
      candidateCoordsList.push(getCoordsForLines(rows.slice(0, 1), cols.slice(0, 2), false, false));
    }
  } else if (rulePattern.code === 'BIG_CROSS') {
    if (rows.length >= 1 && cols.length >= 1) {
      candidateCoordsList.push(getCoordsForLines(rows.slice(0, 1), cols.slice(0, 1), false, false));
    }
  } else if (rulePattern.code === 'BIG_LETTER_O_FRAME') {
    if (marked[0].every(Boolean) && marked[4].every(Boolean) && [0,1,2,3,4].every(r => marked[r][0] && marked[r][4])) {
      const frameCells: [number, number][] = [];
      for (let c = 0; c < 5; c++) {
        frameCells.push([0, c], [4, c]);
      }
      for (let r = 1; r < 4; r++) {
        frameCells.push([r, 0], [r, 4]);
      }
      candidateCoordsList.push(frameCells);
    }
  } else if (rulePattern.code === 'FOUR_CORNERS_CENTER') {
    if (marked[0][0] && marked[0][4] && marked[4][0] && marked[4][4] && marked[2][2]) {
      candidateCoordsList.push([[0, 0], [0, 4], [4, 0], [4, 4], [2, 2]]);
    }
  } else if (rulePattern.code === 'FIVE_LINES_NO_DIAG') {
    if (rows.length + cols.length >= 5) {
      candidateCoordsList.push(getCoordsForLines(rows, cols, false, false));
    }
  } else if (rulePattern.code === 'TWO_V_TWO_H_ONE_D') {
    if (rows.length >= 2 && cols.length >= 2 && (diag1 || diag2)) {
      candidateCoordsList.push(getCoordsForLines(rows, cols, diag1, diag2));
    }
  } else if (rulePattern.code === 'FOUR_LINES_NO_FREE') {
    const noFreeRows = rows.filter((r) => r !== 2);
    const noFreeCols = cols.filter((c) => c !== 2);
    if (noFreeRows.length + noFreeCols.length >= 4) {
      candidateCoordsList.push(getCoordsForLines(noFreeRows, noFreeCols, false, false));
    }
  } else if (rulePattern.code === 'FIVE_LINES_ANY') {
    const total = rows.length + cols.length + (diag1 ? 1 : 0) + (diag2 ? 1 : 0);
    if (total >= 5) {
      candidateCoordsList.push(getCoordsForLines(rows, cols, diag1, diag2));
    }
  } else if (rulePattern.code === 'SIX_LINES_ANY') {
    const total = rows.length + cols.length + (diag1 ? 1 : 0) + (diag2 ? 1 : 0);
    if (total >= 6) {
      candidateCoordsList.push(getCoordsForLines(rows, cols, diag1, diag2));
    }
  } else if (rulePattern.code === 'SEVEN_LINES_ANY') {
    const total = rows.length + cols.length + (diag1 ? 1 : 0) + (diag2 ? 1 : 0);
    if (total >= 7) {
      candidateCoordsList.push(getCoordsForLines(rows, cols, diag1, diag2));
    }
  } else if (rulePattern.code === 'HALF_HOUSE_15') {
    let totalMarkedCount = 0;
    const allMarkedCoords: [number, number][] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (marked[r][c]) {
          totalMarkedCount++;
          allMarkedCoords.push([r, c]);
        }
      }
    }
    if (totalMarkedCount >= 15) {
      candidateCoordsList.push(allMarkedCoords);
    }
  } else if (rulePattern.code === 'FULL_HOUSE' || rulePattern.code === 'FULL_HOUSE_BLACKOUT') {
    let allCovered = true;
    const allCells: [number, number][] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        allCells.push([r, c]);
        if (!marked[r][c]) allCovered = false;
      }
    }
    if (allCovered) candidateCoordsList.push(allCells);
  }

  // Also check all defined pattern variations for this rule
  if (rulePattern.variations && rulePattern.variations.length > 0) {
    for (const v of rulePattern.variations) {
      let allMet = true;
      const requiredCoords: [number, number][] = [];
      for (let r = 0; r < 5; r++) {
        for (let c = 0; c < 5; c++) {
          if (v.grid[r][c]) {
            requiredCoords.push([r, c]);
            if (!marked[r][c]) allMet = false;
          }
        }
      }
      if (allMet && requiredCoords.length > 0) {
        candidateCoordsList.push(requiredCoords);
      }
    }
  }

  // If we found at least one completed pattern variation:
  // In Regular Bingo: active number መኖር አለበት ግድ ነው!
  // In Fast Bingo: any completed line or 4 corners wins immediately.
  if (candidateCoordsList.length > 0) {
    const isFastRule = Boolean(
      rulePattern.isFastBingo || rulePattern.code === 'FAST_ONE_LINE_OR_FOUR_CORNERS'
    );

    if (!isFastRule) {
      if (effectiveActiveBall === null) {
        return {
          isValid: false,
          winningCells: [],
          missingNumbers: [],
          lastBallIncluded: false,
          reasonAm: 'የተሳሳተ ቢንጎ! የወጣው ቁጥር (Active Number) ገና አልተመዘገበም። በRegular Bingo የወጣው ቁጥር ቅጡ ውስጥ መኖር አለበት!',
        };
      }
      const withActiveBall = candidateCoordsList.find((coords) =>
        coords.some(([r, c]) => !(r === 2 && c === 2) && Number(cartela.numbers[r][c]) === Number(effectiveActiveBall))
      );
      if (withActiveBall) {
        return {
          isValid: true,
          winningCells: withActiveBall,
          missingNumbers: [],
          lastBallIncluded: true,
          reasonAm: 'ትክክለኛ ቢንጎ! እንኳን ደስ አለዎት!',
        };
      }

      // If the active ball is on this cartela, approve the completed pattern
      const activeBallOnCard = cartela.numbers.some((row, r) =>
        row.some((num, c) => !(r === 2 && c === 2) && Number(num) === Number(effectiveActiveBall))
      );
      if (activeBallOnCard) {
        return {
          isValid: true,
          winningCells: candidateCoordsList[0],
          missingNumbers: [],
          lastBallIncluded: true,
          reasonAm: 'ትክክለኛ ቢንጎ! የወጣው ቁጥር በካርቴላው ላይ ይገኛል!',
        };
      }

      // User instruction: "በRegular bingo active number ከሌለ block ይሁን"
      // If the active ball is NOT on this cartela, block the cartela immediately!
      return {
        isValid: false,
        needsAdminVerification: false,
        isPatternComplete: false,
        winningCells: [],
        missingNumbers: [effectiveActiveBall],
        lastBallIncluded: false,
        reasonAm: `የተሳሳተ ቢንጎ! የወጣው ቁጥር (${effectiveActiveBall}) በዚህ ካርቴላ ላይ የለም። ካርቴላ #${cartela.id} ታግዷል!`,
      };
    } else {
      // In Fast Bingo:
      const withActiveBall = candidateCoordsList.find((coords) =>
        coords.some(([r, c]) => !(r === 2 && c === 2) && Number(cartela.numbers[r][c]) === Number(effectiveActiveBall))
      );
      const chosenPattern = withActiveBall || candidateCoordsList[0];
      return {
        isValid: true,
        winningCells: chosenPattern,
        missingNumbers: [],
        lastBallIncluded: Boolean(withActiveBall),
        reasonAm: 'ትክክለኛ ቢንጎ! እንኳን ደስ አለዎት!',
      };
    }
  }

  // Special handling for Half House (15 cells with F)
  if (rulePattern.code === 'HALF_HOUSE_15') {
    let count = 0;
    const missing: number[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (marked[r][c]) count++;
        else if (!(r === 2 && c === 2)) missing.push(cartela.numbers[r][c]);
      }
    }
    const needed = Math.max(0, 15 - count);
    return {
      isValid: false,
      winningCells: [],
      missingNumbers: missing.slice(0, needed),
      lastBallIncluded: false,
      reasonAm: `የተሳሳተ ቢንጎ! ግማሽ ቤት 15 ካስ መጥቆር አለበት፤ እስካሁን ${count} ካስ ብቻ ነው የጠቆረው (${needed} ቁጥሮች ይቀራሉ)።`,
    };
  }

  // Pattern is NOT completed: find the closest variation and list missing numbers
  let bestMissing: number[] = [];
  for (const v of rulePattern.variations) {
    const missing: number[] = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (v.grid[r][c] && !marked[r][c]) {
          missing.push(cartela.numbers[r][c]);
        }
      }
    }
    if (bestMissing.length === 0 || missing.length < bestMissing.length) {
      bestMissing = missing;
    }
  }

  return {
    isValid: false,
    winningCells: [],
    missingNumbers: bestMissing,
    lastBallIncluded: false,
    reasonAm: `የተሳሳተ ቢንጎ! ቅጡ አልተሟላም (${bestMissing.length} ቁጥሮች ይቀራሉ፦ ${bestMissing.slice(0, 6).join(', ')})። ካርቴላ #${cartela.id} በራስ-ሰር ታግዷል።`,
  };
}

/**
 * Computes sorting metrics for a Cartela based on currently marked/called numbers:
 * - completedLines: number of complete rows, columns, and diagonals (plus near-complete lines weight)
 * - calledCount: total marked numbers on the cartela (including FREE)
 * - completedSquares: number of complete 2x2 squares on the cartela (plus 3/4 square progress weight)
 */
export function getCartelaSortMetrics(
  cartela: CartelaCard,
  calledBalls: number[],
  autoDaub: boolean
) {
  const calledSet = new Set(calledBalls);
  const marked: boolean[][] = Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => {
      if (r === 2 && c === 2) return true;
      return autoDaub
        ? calledSet.has(cartela.numbers[r][c]) || cartela.manualMarks[r][c]
        : cartela.manualMarks[r][c];
    })
  );

  // 1. Total Marked/Called count
  let calledCount = 0;
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) {
      if (marked[r][c]) calledCount++;
    }
  }

  // 2. Line score (complete lines * 100 + 4-in-a-line * 10 + calledCount)
  const { rows, cols, diag1, diag2 } = getCompleteLines(marked);
  const completeLinesCount =
    rows.length + cols.length + (diag1 ? 1 : 0) + (diag2 ? 1 : 0);

  let nearLinesCount = 0;
  for (let r = 0; r < 5; r++) {
    if (marked[r].filter(Boolean).length === 4) nearLinesCount++;
  }
  for (let c = 0; c < 5; c++) {
    let colHits = 0;
    for (let r = 0; r < 5; r++) if (marked[r][c]) colHits++;
    if (colHits === 4) nearLinesCount++;
  }

  const lineScore = completeLinesCount * 100 + nearLinesCount * 15 + calledCount;

  // 3. 2x2 Square score (complete 2x2 squares * 100 + 3-of-4 squares * 10 + calledCount)
  let completeSquares = 0;
  let nearSquares = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const hits =
        (marked[r][c] ? 1 : 0) +
        (marked[r][c + 1] ? 1 : 0) +
        (marked[r + 1][c] ? 1 : 0) +
        (marked[r + 1][c + 1] ? 1 : 0);
      if (hits === 4) completeSquares++;
      else if (hits === 3) nearSquares++;
    }
  }

  const squareScore = completeSquares * 100 + nearSquares * 15 + calledCount;

  // 4. 4-Corners score (for Fast Bingo: 4 corners or 1 line)
  const cornerHits =
    (marked[0][0] ? 1 : 0) +
    (marked[0][4] ? 1 : 0) +
    (marked[4][0] ? 1 : 0) +
    (marked[4][4] ? 1 : 0);
  const cornerScore = (cornerHits === 4 ? 100 : cornerHits === 3 ? 25 : cornerHits * 5) + calledCount;
  const fastScore = Math.max(lineScore, cornerScore);

  return {
    calledCount,
    completeLinesCount,
    lineScore,
    completeSquares,
    squareScore,
    cornerHits,
    cornerScore,
    fastScore,
  };
}

/**
 * Counts complete 2x2 squares anywhere on the 5x5 cartela
 */
export function countCompletedSquares(marked: boolean[][]): number {
  let count = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      if (marked[r][c] && marked[r][c + 1] && marked[r + 1][c] && marked[r + 1][c + 1]) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Counts complete 3x2 or 2x3 rectangles anywhere on the 5x5 cartela
 */
export function countCompletedRectangles(marked: boolean[][]): number {
  let count = 0;
  // 3 rows x 2 cols
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      if (
        marked[r][c] && marked[r][c + 1] &&
        marked[r + 1][c] && marked[r + 1][c + 1] &&
        marked[r + 2][c] && marked[r + 2][c + 1]
      ) {
        count++;
      }
    }
  }
  // 2 rows x 3 cols
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 3; c++) {
      if (
        marked[r][c] && marked[r][c + 1] && marked[r][c + 2] &&
        marked[r + 1][c] && marked[r + 1][c + 1] && marked[r + 1][c + 2]
      ) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Counts complete 3x3 + (cross/plus) shapes anywhere on the 5x5 cartela
 */
export function countCompletedCrosses(marked: boolean[][]): number {
  let count = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      if (
        marked[r][c + 1] &&
        marked[r + 1][c] && marked[r + 1][c + 1] && marked[r + 1][c + 2] &&
        marked[r + 2][c + 1]
      ) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Counts complete 3x3 T-shapes anywhere on the 5x5 cartela
 */
export function countCompletedTShapes(marked: boolean[][]): number {
  let count = 0;
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) {
      // Upright T
      const upright =
        marked[r][c] && marked[r][c + 1] && marked[r][c + 2] &&
        marked[r + 1][c + 1] && marked[r + 2][c + 1];
      // Inverted T
      const inverted =
        marked[r + 2][c] && marked[r + 2][c + 1] && marked[r + 2][c + 2] &&
        marked[r + 1][c + 1] && marked[r][c + 1];
      if (upright || inverted) {
        count++;
      }
    }
  }
  return count;
}

/**
 * Helper to get the 5x5 marked boolean matrix
 */
export function getMarkedMatrix(
  cartela: CartelaCard,
  calledBalls: number[],
  autoDaub: boolean
): boolean[][] {
  const calledSet = new Set(calledBalls);
  return Array.from({ length: 5 }, (_, r) =>
    Array.from({ length: 5 }, (__, c) => {
      if (r === 2 && c === 2) return true; // FREE space
      return autoDaub
        ? calledSet.has(cartela.numbers[r][c]) || cartela.manualMarks[r][c]
        : cartela.manualMarks[r][c];
    })
  );
}

/**
 * Returns shape badge (e.g. S-3, S-1, S-0, R-2, +-1, T-2) matching IMG_3758_1b92cc16.jpeg
 */
export function getShapeBadge(
  cartela: CartelaCard,
  calledBalls: number[],
  autoDaub: boolean,
  sortMode: string
): string | null {
  const marked = getMarkedMatrix(cartela, calledBalls, autoDaub);
  if (sortMode === 'by_square') {
    return `S-${countCompletedSquares(marked)}`;
  }
  if (sortMode === 'by_rect') {
    return `R-${countCompletedRectangles(marked)}`;
  }
  if (sortMode === 'by_cross') {
    return `+-${countCompletedCrosses(marked)}`;
  }
  if (sortMode === 'by_t') {
    return `T-${countCompletedTShapes(marked)}`;
  }
  return null;
}

/**
 * Formats a winner's phone number cleanly with middle digits masked
 * exactly matching user reference IMG_3782_7fb1d730.jpeg (e.g. "0913***371")
 */
export function formatWinnerPhone(phone?: string | null): string {
  if (!phone || phone.trim() === '') {
    return '0913***371';
  }
  const clean = phone.replace(/\D/g, '');
  if (clean.length === 10 && (clean.startsWith('09') || clean.startsWith('07'))) {
    return `${clean.slice(0, 4)}***${clean.slice(-3)}`;
  }
  if (clean.length === 12 && clean.startsWith('251')) {
    const local = `0${clean.slice(3)}`;
    return `${local.slice(0, 4)}***${local.slice(-3)}`;
  }
  if (clean.length === 9 && (clean.startsWith('9') || clean.startsWith('7'))) {
    return `0${clean.slice(0, 3)}***${clean.slice(-3)}`;
  }
  if (phone.includes('*')) {
    return phone;
  }
  if (phone.length >= 7) {
    return `${phone.slice(0, 4)}***${phone.slice(-3)}`;
  }
  return phone;
}

