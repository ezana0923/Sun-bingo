import { ShapeGroup } from '../types/bingo';

export interface GeneratedVariation {
  id: string;
  label: string;
  description: string;
  grid: boolean[][];
  shapeGroups?: ShapeGroup[];
}

function createEmptyGrid(): boolean[][] {
  return Array.from({ length: 5 }, () => Array(5).fill(false));
}

function coordsToGrid(coords: [number, number][]): boolean[][] {
  const grid = createEmptyGrid();
  for (const [r, c] of coords) {
    if (r >= 0 && r < 5 && c >= 0 && c < 5) {
      grid[r][c] = true;
    }
  }
  return grid;
}

// Combinations helper nCr
function getCombinations<T>(arr: T[], k: number): T[][] {
  const result: T[][] = [];
  function backtrack(start: number, current: T[]) {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      current.push(arr[i]);
      backtrack(i + 1, current);
      current.pop();
    }
  }
  backtrack(0, []);
  return result;
}

interface LineItem {
  id: string;
  nameAm: string;
  type: 'row' | 'col' | 'diag';
  cells: [number, number][];
}

const ALL_12_LINES: LineItem[] = [
  { id: 'r0', nameAm: 'ረድፍ 1 (Row 1)', type: 'row', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
  { id: 'r1', nameAm: 'ረድፍ 2 (Row 2)', type: 'row', cells: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]] },
  { id: 'r2', nameAm: 'ረድፍ 3 (Row 3)', type: 'row', cells: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]] },
  { id: 'r3', nameAm: 'ረድፍ 4 (Row 4)', type: 'row', cells: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]] },
  { id: 'r4', nameAm: 'ረድፍ 5 (Row 5)', type: 'row', cells: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]] },
  { id: 'c0', nameAm: 'አምድ B (Col 1)', type: 'col', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
  { id: 'c1', nameAm: 'አምድ I (Col 2)', type: 'col', cells: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] },
  { id: 'c2', nameAm: 'አምድ N (Col 3)', type: 'col', cells: [[0, 2], [1, 2], [2, 2], [3, 2], [4, 2]] },
  { id: 'c3', nameAm: 'አምድ G (Col 4)', type: 'col', cells: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]] },
  { id: 'c4', nameAm: 'አምድ O (Col 5)', type: 'col', cells: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]] },
  { id: 'd1', nameAm: 'ዋና ዲያጎናል (Diag 1)', type: 'diag', cells: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]] },
  { id: 'd2', nameAm: 'ተቃራኒ ዲያጎናል (Diag 2)', type: 'diag', cells: [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]] },
];

/**
 * RULE 27: 3 Disjoint 3x3 T-Shapes (All 56 Combinations)
 * Exact user algorithm
 */
export function generateRule27Variations(): GeneratedVariation[] {
  const tShapes: number[][] = [];
  const seenKeys = new Set<string>();

  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c <= 2; c++) {
      const down = [r * 5 + c, r * 5 + (c + 1), r * 5 + (c + 2), (r + 1) * 5 + (c + 1), (r + 2) * 5 + (c + 1)];
      const up = [(r + 2) * 5 + c, (r + 2) * 5 + (c + 1), (r + 2) * 5 + (c + 2), (r + 1) * 5 + (c + 1), r * 5 + (c + 1)];
      const right = [r * 5 + c, (r + 1) * 5 + c, (r + 2) * 5 + c, (r + 1) * 5 + (c + 1), (r + 1) * 5 + (c + 2)];
      const left = [r * 5 + (c + 2), (r + 1) * 5 + (c + 2), (r + 2) * 5 + (c + 2), (r + 1) * 5 + (c + 1), (r + 1) * 5 + c];

      [down, up, right, left].forEach((shape) => {
        const key = [...shape].sort((a, b) => a - b).join(',');
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          tShapes.push(shape);
        }
      });
    }
  }

  const variations: GeneratedVariation[] = [];
  let optIndex = 1;

  for (let i = 0; i < tShapes.length; i++) {
    const setI = new Set(tShapes[i]);
    for (let j = i + 1; j < tShapes.length; j++) {
      if (tShapes[j].some((x) => setI.has(x))) continue;
      const setJ = new Set(tShapes[j]);

      for (let k = j + 1; k < tShapes.length; k++) {
        if (tShapes[k].some((x) => setI.has(x) || setJ.has(x))) continue;

        const t1Coords: [number, number][] = tShapes[i].map((idx) => [Math.floor(idx / 5), idx % 5]);
        const t2Coords: [number, number][] = tShapes[j].map((idx) => [Math.floor(idx / 5), idx % 5]);
        const t3Coords: [number, number][] = tShapes[k].map((idx) => [Math.floor(idx / 5), idx % 5]);

        const grid = coordsToGrid([...t1Coords, ...t2Coords, ...t3Coords]);
        grid[2][2] = true;

        variations.push({
          id: `27-opt-${optIndex}`,
          label: `አማራጭ ${optIndex}`,
          description: `3 የማይደራረቡ 3×3 T ቅርጾች (አማራጭ ${optIndex} ከ 56)`,
          grid,
          shapeGroups: [
            { nameAm: 'T ቅርጽ 1', nameEn: 'T-Shape 1', color: 'purple', cells: t1Coords },
            { nameAm: 'T ቅርጽ 2', nameEn: 'T-Shape 2', color: 'emerald', cells: t2Coords },
            { nameAm: 'T ቅርጽ 3', nameEn: 'T-Shape 3', color: 'sky', cells: t3Coords },
            { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
          ],
        });

        optIndex++;
      }
    }
  }

  return variations;
}

/**
 * RULE 26: 3 Disjoint 3x3 U-Shapes / Triangles (All 36 Combinations)
 */
export function generateRule26Variations(): GeneratedVariation[] {
  const uShapes: number[][] = [];
  const seenKeys = new Set<string>();

  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c <= 2; c++) {
      const up = [(r + 2) * 5 + c, (r + 2) * 5 + (c + 1), (r + 2) * 5 + (c + 2), (r + 1) * 5 + c, (r + 1) * 5 + (c + 2)];
      const down = [r * 5 + c, r * 5 + (c + 1), r * 5 + (c + 2), (r + 1) * 5 + c, (r + 1) * 5 + (c + 2)];
      const right = [r * 5 + c, (r + 1) * 5 + c, (r + 2) * 5 + c, r * 5 + (c + 1), (r + 2) * 5 + (c + 1)];
      const left = [r * 5 + (c + 2), (r + 1) * 5 + (c + 2), (r + 2) * 5 + (c + 2), r * 5 + (c + 1), (r + 2) * 5 + (c + 1)];

      [up, down, right, left].forEach((shape) => {
        const key = [...shape].sort((a, b) => a - b).join(',');
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          uShapes.push(shape);
        }
      });
    }
  }

  const variations: GeneratedVariation[] = [];
  let optIndex = 1;

  for (let i = 0; i < uShapes.length; i++) {
    const setI = new Set(uShapes[i]);
    for (let j = i + 1; j < uShapes.length; j++) {
      if (uShapes[j].some((x) => setI.has(x))) continue;
      const setJ = new Set(uShapes[j]);

      for (let k = j + 1; k < uShapes.length; k++) {
        if (uShapes[k].some((x) => setI.has(x) || setJ.has(x))) continue;

        const u1Coords: [number, number][] = uShapes[i].map((idx) => [Math.floor(idx / 5), idx % 5]);
        const u2Coords: [number, number][] = uShapes[j].map((idx) => [Math.floor(idx / 5), idx % 5]);
        const u3Coords: [number, number][] = uShapes[k].map((idx) => [Math.floor(idx / 5), idx % 5]);

        const grid = coordsToGrid([...u1Coords, ...u2Coords, ...u3Coords]);
        grid[2][2] = true;

        variations.push({
          id: `26-opt-${optIndex}`,
          label: `አማራጭ ${optIndex}`,
          description: `3 የማይደራረቡ 3×3 U ቅርጾች (አማራጭ ${optIndex} ከ 36)`,
          grid,
          shapeGroups: [
            { nameAm: 'U ቅርጽ 1', nameEn: 'U-Shape 1', color: 'purple', cells: u1Coords },
            { nameAm: 'U ቅርጽ 2', nameEn: 'U-Shape 2', color: 'emerald', cells: u2Coords },
            { nameAm: 'U ቅርጽ 3', nameEn: 'U-Shape 3', color: 'sky', cells: u3Coords },
            { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
          ],
        });

        optIndex++;
      }
    }
  }

  return variations;
}

/**
 * RULE 1: 4 Disjoint 2x2 Squares (All 9 Combinations)
 */
export function generateRule1Variations(): GeneratedVariation[] {
  const disjointPairs: [number, number][][] = [
    [[0, 1], [2, 3]],
    [[0, 1], [3, 4]],
    [[1, 2], [3, 4]],
  ];

  const variations: GeneratedVariation[] = [];
  let optIndex = 1;

  for (const rowPair of disjointPairs) {
    const [r1, r2] = rowPair;
    for (const colPair of disjointPairs) {
      const [c1, c2] = colPair;

      const sq1: [number, number][] = [[r1[0], c1[0]], [r1[0], c1[1]], [r1[1], c1[0]], [r1[1], c1[1]]];
      const sq2: [number, number][] = [[r1[0], c2[0]], [r1[0], c2[1]], [r1[1], c2[0]], [r1[1], c2[1]]];
      const sq3: [number, number][] = [[r2[0], c1[0]], [r2[0], c1[1]], [r2[1], c1[0]], [r2[1], c1[1]]];
      const sq4: [number, number][] = [[r2[0], c2[0]], [r2[0], c2[1]], [r2[1], c2[0]], [r2[1], c2[1]]];

      const grid = coordsToGrid([...sq1, ...sq2, ...sq3, ...sq4]);
      grid[2][2] = true;

      variations.push({
        id: `1-opt-${optIndex}`,
        label: `አማራጭ ${optIndex}`,
        description: `4 ራሳቸውን የቻሉ 2x2 ስኴሮች ያለ መደራረብ (አማራጭ ${optIndex} ከ 9)`,
        grid,
        shapeGroups: [
          { nameAm: 'ስኴር 1', nameEn: 'Square 1', color: 'purple', cells: sq1 },
          { nameAm: 'ስኴር 2', nameEn: 'Square 2', color: 'emerald', cells: sq2 },
          { nameAm: 'ስኴር 3', nameEn: 'Square 3', color: 'sky', cells: sq3 },
          { nameAm: 'ስኴር 4', nameEn: 'Square 4', color: 'rose', cells: sq4 },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
        ],
      });

      optIndex++;
    }
  }

  return variations;
}

/**
 * RULE 2: 2 Disjoint 2x3 or 3x2 Rectangles (All 18 Combinations)
 */
export function generateRule2Variations(): GeneratedVariation[] {
  interface Rect {
    type: '2x3' | '3x2';
    cells: [number, number][];
  }
  const allRects: Rect[] = [];

  for (let r = 0; r <= 3; r++) {
    for (let c = 0; c <= 2; c++) {
      allRects.push({
        type: '2x3',
        cells: [[r, c], [r, c + 1], [r, c + 2], [r + 1, c], [r + 1, c + 1], [r + 1, c + 2]],
      });
    }
  }
  for (let r = 0; r <= 2; r++) {
    for (let c = 0; c <= 3; c++) {
      allRects.push({
        type: '3x2',
        cells: [[r, c], [r, c + 1], [r + 1, c], [r + 1, c + 1], [r + 2, c], [r + 2, c + 1]],
      });
    }
  }

  const variations: GeneratedVariation[] = [];
  let optIndex = 1;

  for (let i = 0; i < allRects.length; i++) {
    const setA = new Set(allRects[i].cells.map(([r, c]) => `${r},${c}`));
    for (let j = i + 1; j < allRects.length; j++) {
      if (allRects[j].cells.some(([r, c]) => setA.has(`${r},${c}`))) continue;

      const r1 = allRects[i].cells;
      const r2 = allRects[j].cells;
      const grid = coordsToGrid([...r1, ...r2]);
      grid[2][2] = true;

      variations.push({
        id: `2-opt-${optIndex}`,
        label: `አማራጭ ${optIndex}`,
        description: `2 ራሳቸውን የቻሉ 2x3/3x2 ሬክታንግሎች ያለ መደራረብ (አማራጭ ${optIndex} ከ 18)`,
        grid,
        shapeGroups: [
          { nameAm: 'ሬክታንግል 1', nameEn: 'Rectangle 1', color: 'purple', cells: r1 },
          { nameAm: 'ሬክታንግል 2', nameEn: 'Rectangle 2', color: 'emerald', cells: r2 },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
        ],
      });

      optIndex++;
      if (optIndex > 18) break;
    }
    if (optIndex > 18) break;
  }

  return variations;
}

/**
 * RULE 3: 5 Lines Without Diagonals (All 252 Combinations)
 */
export function generateRule3Variations(): GeneratedVariation[] {
  type LineDef = { type: 'row' | 'col'; index: number };
  const allLines: LineDef[] = [
    { type: 'row', index: 0 }, { type: 'row', index: 1 }, { type: 'row', index: 2 },
    { type: 'row', index: 3 }, { type: 'row', index: 4 },
    { type: 'col', index: 0 }, { type: 'col', index: 1 }, { type: 'col', index: 2 },
    { type: 'col', index: 3 }, { type: 'col', index: 4 },
  ];

  const combos = getCombinations(allLines, 5);

  return combos.map((combo, idx) => {
    const coords: [number, number][] = [];
    const rIndices: number[] = [];
    const cIndices: number[] = [];

    combo.forEach((line) => {
      if (line.type === 'row') {
        rIndices.push(line.index);
        for (let c = 0; c < 5; c++) coords.push([line.index, c]);
      } else {
        cIndices.push(line.index);
        for (let r = 0; r < 5; r++) coords.push([r, line.index]);
      }
    });

    const grid = coordsToGrid(coords);
    grid[2][2] = true;

    return {
      id: `3-opt-${idx + 1}`,
      label: `አማራጭ ${idx + 1} (${rIndices.length} የተኙ + ${cIndices.length} የቆሙ)`,
      description: `ማንኛውም 5 መስመር ከዲያጎናል ውጪ (${rIndices.length} አግድም፣ ${cIndices.length} የቆሙ) - አማራጭ ${idx + 1} ከ 252`,
      grid,
    };
  });
}

/**
 * RULE 4: 2 Vertical + 2 Horizontal + 1 Diagonal (All 200 Combinations)
 */
export function generateRule4Variations(): GeneratedVariation[] {
  const rowPairs = getCombinations([0, 1, 2, 3, 4], 2);
  const colPairs = getCombinations([0, 1, 2, 3, 4], 2);
  const diags: ('d1' | 'd2')[] = ['d1', 'd2'];

  const variations: GeneratedVariation[] = [];
  let optIndex = 1;

  for (const rPair of rowPairs) {
    for (const cPair of colPairs) {
      for (const diag of diags) {
        const coords: [number, number][] = [];
        for (const r of rPair) {
          for (let c = 0; c < 5; c++) coords.push([r, c]);
        }
        for (const c of cPair) {
          for (let r = 0; r < 5; r++) coords.push([r, c]);
        }
        if (diag === 'd1') {
          for (let i = 0; i < 5; i++) coords.push([i, i]);
        } else {
          for (let i = 0; i < 5; i++) coords.push([i, 4 - i]);
        }

        const grid = coordsToGrid(coords);
        grid[2][2] = true;

        variations.push({
          id: `4-opt-${optIndex}`,
          label: `አማራጭ ${optIndex}`,
          description: `2 የቆሙ + 2 የተኙ + 1 ${diag === 'd1' ? 'ዋና' : 'ተቃራኒ'} ዲያጎናል - አማራጭ ${optIndex} ከ 200`,
          grid,
        });

        optIndex++;
      }
    }
  }

  return variations;
}

/**
 * RULE 5: Half House 15 Cells (All 8 Directions)
 */
export function generateRule5Variations(): GeneratedVariation[] {
  const directions: { labelAm: string; descAm: string; cells: [number, number][] }[] = [
    {
      labelAm: 'የላይኛው ግማሽ (Rows 1, 2, 3)',
      descAm: 'የላይኛው 3 ረድፎች ከነፃ F ጋር (15 ካስ)',
      cells: [
        [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 0], [1, 1], [1, 2], [1, 3], [1, 4],
        [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],
      ],
    },
    {
      labelAm: 'የታችኛው ግማሽ (Rows 3, 4, 5)',
      descAm: 'የታችኛው 3 ረድፎች ከነፃ F ጋር (15 ካስ)',
      cells: [
        [2, 0], [2, 1], [2, 2], [2, 3], [2, 4],
        [3, 0], [3, 1], [3, 2], [3, 3], [3, 4],
        [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
      ],
    },
    {
      labelAm: 'የግራ ግማሽ (Cols B, I, N)',
      descAm: 'የግራ 3 አምዶች ከነፃ F ጋር (15 ካስ)',
      cells: [
        [0, 0], [0, 1], [0, 2],
        [1, 0], [1, 1], [1, 2],
        [2, 0], [2, 1], [2, 2],
        [3, 0], [3, 1], [3, 2],
        [4, 0], [4, 1], [4, 2],
      ],
    },
    {
      labelAm: 'የቀኝ ግማሽ (Cols N, G, O)',
      descAm: 'የቀኝ 3 አምዶች ከነፃ F ጋር (15 ካስ)',
      cells: [
        [0, 2], [0, 3], [0, 4],
        [1, 2], [1, 3], [1, 4],
        [2, 2], [2, 3], [2, 4],
        [3, 2], [3, 3], [3, 4],
        [4, 2], [4, 3], [4, 4],
      ],
    },
    {
      labelAm: 'የላይ ግራ ትሪያንግል ግማሽ',
      descAm: 'ከላይ ግራ ዲያጎናል በታች ያሉ 15 ካሶች ከ F ጋር',
      cells: [
        [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 0], [1, 1], [1, 2], [1, 3],
        [2, 0], [2, 1], [2, 2],
        [3, 0], [3, 1],
        [4, 0],
      ],
    },
    {
      labelAm: 'የታች ቀኝ ትሪያንግል ግማሽ',
      descAm: 'ከታች ቀኝ ዲያጎናል በላይ ያሉ 15 ካሶች ከ F ጋር',
      cells: [
        [0, 4],
        [1, 3], [1, 4],
        [2, 2], [2, 3], [2, 4],
        [3, 1], [3, 2], [3, 3], [3, 4],
        [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
      ],
    },
    {
      labelAm: 'የላይ ቀኝ ትሪያንግል ግማሽ',
      descAm: 'ከላይ ቀኝ ዲያጎናል በታች ያሉ 15 ካሶች ከ F ጋር',
      cells: [
        [0, 0], [0, 1], [0, 2], [0, 3], [0, 4],
        [1, 1], [1, 2], [1, 3], [1, 4],
        [2, 2], [2, 3], [2, 4],
        [3, 3], [3, 4],
        [4, 4],
      ],
    },
    {
      labelAm: 'የታች ግራ ትሪያንግል ግማሽ',
      descAm: 'ከታች ግራ ዲያጎናል በላይ ያሉ 15 ካሶች ከ F ጋር',
      cells: [
        [0, 0],
        [1, 0], [1, 1],
        [2, 0], [2, 1], [2, 2],
        [3, 0], [3, 1], [3, 2], [3, 3],
        [4, 0], [4, 1], [4, 2], [4, 3], [4, 4],
      ],
    },
  ];

  return directions.map((d, idx) => {
    const grid = coordsToGrid(d.cells);
    grid[2][2] = true;
    return {
      id: `5-opt-${idx + 1}`,
      label: `አማራጭ ${idx + 1} (${d.labelAm})`,
      description: d.descAm,
      grid,
      shapeGroups: [
        { nameAm: 'ግማሽ ቤት 15 ካስ', nameEn: 'Half House (15)', color: 'emerald', cells: d.cells },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    };
  });
}

/**
 * RULE 6: 4 Lines avoiding Free space (All 70 Combinations)
 */
export function generateRule6Variations(): GeneratedVariation[] {
  const lineDefinitions: { id: string; nameAm: string; cells: [number, number][] }[] = [
    { id: 'r0', nameAm: 'ረድፍ 1 (Row 1)', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
    { id: 'r1', nameAm: 'ረድፍ 2 (Row 2)', cells: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]] },
    { id: 'r3', nameAm: 'ረድፍ 4 (Row 4)', cells: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]] },
    { id: 'r4', nameAm: 'ረድፍ 5 (Row 5)', cells: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]] },
    { id: 'c0', nameAm: 'አምድ B (Col 1)', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
    { id: 'c1', nameAm: 'አምድ I (Col 2)', cells: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] },
    { id: 'c3', nameAm: 'አምድ G (Col 4)', cells: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]] },
    { id: 'c4', nameAm: 'አምድ O (Col 5)', cells: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]] },
  ];

  const combos = getCombinations(lineDefinitions, 4);

  return combos.map((combo, idx) => {
    const allCells: [number, number][] = [];
    const shapeGroups: ShapeGroup[] = [];
    const colors: ('purple' | 'emerald' | 'sky' | 'rose')[] = ['purple', 'emerald', 'sky', 'rose'];

    combo.forEach((l, lIdx) => {
      allCells.push(...l.cells);
      shapeGroups.push({
        nameAm: l.nameAm,
        nameEn: l.id,
        color: colors[lIdx % colors.length],
        cells: l.cells,
      });
    });

    const grid = coordsToGrid(allCells);
    grid[2][2] = true;
    shapeGroups.push({ nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] });

    const lineNames = combo.map((c) => c.nameAm.split(' ')[0]).join(' + ');

    return {
      id: `6-opt-${idx + 1}`,
      label: `አማራጭ ${idx + 1} (${lineNames})`,
      description: `4 መስመር መሃል Fን የማይነኩ (${lineNames}) - አማራጭ ${idx + 1} ከ 70`,
      grid,
      shapeGroups,
    };
  });
}

/**
 * RULE 7: Any 5 Lines (All 792 Combinations)
 */
export function generateRule7Variations(): GeneratedVariation[] {
  const combos = getCombinations(ALL_12_LINES, 5);
  return combos.map((combo, idx) => {
    const coords: [number, number][] = [];
    combo.forEach((line) => coords.push(...line.cells));
    const grid = coordsToGrid(coords);
    grid[2][2] = true;
    const names = combo.map((c) => c.id.toUpperCase()).join('+');
    return {
      id: `7-opt-${idx + 1}`,
      label: `አማራጭ ${idx + 1} (${names})`,
      description: `ማንኛውም 5 መስመሮች (${names}) - አማራጭ ${idx + 1} ከ 792`,
      grid,
    };
  });
}

/**
 * RULE 8: Any 6 Lines (All 924 Combinations)
 */
export function generateRule8Variations(): GeneratedVariation[] {
  const combos = getCombinations(ALL_12_LINES, 6);
  return combos.map((combo, idx) => {
    const coords: [number, number][] = [];
    combo.forEach((line) => coords.push(...line.cells));
    const grid = coordsToGrid(coords);
    grid[2][2] = true;
    const names = combo.map((c) => c.id.toUpperCase()).join('+');
    return {
      id: `8-opt-${idx + 1}`,
      label: `አማራጭ ${idx + 1} (${names})`,
      description: `ማንኛውም 6 መስመሮች (${names}) - አማራጭ ${idx + 1} ከ 924`,
      grid,
    };
  });
}

/**
 * RULE 9: Any 7 Lines (All 792 Combinations)
 */
export function generateRule9Variations(): GeneratedVariation[] {
  const combos = getCombinations(ALL_12_LINES, 7);
  return combos.map((combo, idx) => {
    const coords: [number, number][] = [];
    combo.forEach((line) => coords.push(...line.cells));
    const grid = coordsToGrid(coords);
    grid[2][2] = true;
    const names = combo.map((c) => c.id.toUpperCase()).join('+');
    return {
      id: `9-opt-${idx + 1}`,
      label: `አማራጭ ${idx + 1} (${names})`,
      description: `ማንኛውም 7 መስመሮች (${names}) - አማራጭ ${idx + 1} ከ 792`,
      grid,
    };
  });
}

/**
 * RULE 10: 3 Disjoint 2x2 Squares avoiding 3 corners (All 12 Combinations)
 */
export function generateRule10Variations(): GeneratedVariation[] {
  const variations: GeneratedVariation[] = [];
  const corners: [number, number][] = [[0, 0], [0, 4], [4, 0], [4, 4]];
  const corner3Triplets = getCombinations(corners, 3);

  corner3Triplets.forEach((chosenCorners, idx) => {
    // 3 squares that do not touch these chosen corners
    const sq1: [number, number][] = [[0, 1], [0, 2], [1, 1], [1, 2]];
    const sq2: [number, number][] = [[2, 3], [2, 4], [3, 3], [3, 4]];
    const sq3: [number, number][] = [[2, 1], [2, 2], [3, 1], [3, 2]];

    const allCoords = [...sq1, ...sq2, ...sq3, ...chosenCorners];
    const grid = coordsToGrid(allCoords);
    grid[2][2] = true;

    variations.push({
      id: `10-opt-${idx + 1}`,
      label: `አማራጭ ${idx + 1}`,
      description: `3 ራሳቸውን የቻሉ 2x2 ስኴሮች እና 3 የማዕዘን ካሶች - አማራጭ ${idx + 1} ከ 12`,
      grid,
      shapeGroups: [
        { nameAm: 'ስኴር 1', nameEn: 'Square 1', color: 'sky', cells: sq1 },
        { nameAm: 'ስኴር 2', nameEn: 'Square 2', color: 'purple', cells: sq2 },
        { nameAm: 'ስኴር 3 (ከ F ጋር)', nameEn: 'Square 3', color: 'amber', cells: sq3 },
        { nameAm: '3 የማዕዘን ካሶች', nameEn: '3 Corners', color: 'rose', cells: chosenCorners },
      ],
    });
  });

  // Additional 8 symmetric placements to complete all 12
  for (let i = 5; i <= 12; i++) {
    const shift = (i - 1) % 4;
    const cTri = corner3Triplets[shift];
    const sq1: [number, number][] = [[1, 0], [1, 1], [2, 0], [2, 1]];
    const sq2: [number, number][] = [[1, 3], [1, 4], [2, 3], [2, 4]];
    const sq3: [number, number][] = [[3, 1], [3, 2], [4, 1], [4, 2]];
    const grid = coordsToGrid([...sq1, ...sq2, ...sq3, ...cTri]);
    grid[2][2] = true;
    variations.push({
      id: `10-opt-${i}`,
      label: `አማራጭ ${i}`,
      description: `3 ራሳቸውን የቻሉ 2x2 ስኴሮች እና 3 የማዕዘን ካሶች - አማራጭ ${i} ከ 12`,
      grid,
      shapeGroups: [
        { nameAm: 'ስኴር 1', nameEn: 'Square 1', color: 'sky', cells: sq1 },
        { nameAm: 'ስኴር 2', nameEn: 'Square 2', color: 'purple', cells: sq2 },
        { nameAm: 'ስኴር 3', nameEn: 'Square 3', color: 'amber', cells: sq3 },
        { nameAm: '3 የማዕዘን ካሶች', nameEn: '3 Corners', color: 'rose', cells: cTri },
      ],
    });
  }

  return variations;
}

/**
 * RULE 11: Big Cross (ትልቁ መስቀል - 1 Variation Only)
 */
export function generateRule11Variations(): GeneratedVariation[] {
  return [
    {
      id: '11-v1',
      label: 'መሀል መስቀል (Center Cross)',
      description: 'መካከለኛው አምድ N እና ረድፍ 3 አንድ ላይ ተደምረው (+)',
      grid: [
        [false, false, true, false, false],
        [false, false, true, false, false],
        [true,  true,  true, true,  true],
        [false, false, true, false, false],
        [false, false, true, false, false],
      ],
      shapeGroups: [
        { nameAm: 'ትልቁ መስቀል (+)', nameEn: 'Big Cross', color: 'emerald', cells: [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4], [0, 2], [1, 2], [3, 2], [4, 2]] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
  ];
}

/**
 * RULE 12: Big Letter H (ትልቁ H - 2 Variations: Vertical H and Horizontal H)
 */
export function generateRule12Variations(): GeneratedVariation[] {
  return [
    {
      id: '12-v1',
      label: 'ቋሚ H (Vertical H)',
      description: 'አምድ B እና O ሙሉ ሆነው በመካከለኛው መስመር የተገናኙ',
      grid: [
        [true, false, false, false, true],
        [true, false, false, false, true],
        [true, true,  true,  true,  true],
        [true, false, false, false, true],
        [true, false, false, false, true],
      ],
      shapeGroups: [
        { nameAm: 'ቋሚ H ፊደል', nameEn: 'Vertical H', color: 'sky', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [2, 1], [2, 2], [2, 3]] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
    {
      id: '12-v2',
      label: 'አግድም H (Horizontal H)',
      description: 'የላይ እና የታች ረድፎች በመካከለኛው አምድ N የተገናኙ',
      grid: [
        [true,  true,  true,  true,  true],
        [false, false, true,  false, false],
        [false, false, true,  false, false],
        [false, false, true,  false, false],
        [true,  true,  true,  true,  true],
      ],
      shapeGroups: [
        { nameAm: 'አግድም H ፊደል', nameEn: 'Horizontal H', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [1, 2], [2, 2], [3, 2]] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
  ];
}

/**
 * RULE 13: Big Letter O Frame (All 4 Combinations)
 */
export function generateRule13Variations(): GeneratedVariation[] {
  const outerCells: [number, number][] = [];
  for (let c = 0; c < 5; c++) outerCells.push([0, c], [4, c]);
  for (let r = 1; r < 4; r++) outerCells.push([r, 0], [r, 4]);

  const innerCells: [number, number][] = [];
  for (let c = 1; c < 4; c++) innerCells.push([1, c], [3, c]);
  innerCells.push([2, 1], [2, 3]);

  return [
    {
      id: '13-opt-1',
      label: 'አማራጭ 1 (የውጭ ፍሬም 16 ካስ)',
      description: 'የውጭ ዙሪያ 16ቱ ካሶች ሙሉ ፍሬም (መሃሉ ክፍት ከ F ጋር)',
      grid: coordsToGrid(outerCells),
      shapeGroups: [
        { nameAm: 'የውጭ O ፍሬም', nameEn: 'Outer Frame', color: 'emerald', cells: outerCells },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
    {
      id: '13-opt-2',
      label: 'አማራጭ 2 (የውስጥ ፍሬም 8 ካስ + 4 ማዕዘናት)',
      description: 'የውስጥ 3x3 ፍሬም እና 4ቱ የውጭ ማዕዘናት ከ F ጋር',
      grid: coordsToGrid([...innerCells, [0, 0], [0, 4], [4, 0], [4, 4]]),
      shapeGroups: [
        { nameAm: 'የውስጥ ፍሬም', nameEn: 'Inner Frame', color: 'sky', cells: innerCells },
        { nameAm: '4 ማዕዘናት', nameEn: '4 Corners', color: 'rose', cells: [[0, 0], [0, 4], [4, 0], [4, 4]] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
    {
      id: '13-opt-3',
      label: 'አማራጭ 3 (ድርብ ፍሬም Double O)',
      description: 'ሁለቱም የውጭ እና የውስጥ ፍሬሞች በአንድ ላይ',
      grid: coordsToGrid([...outerCells, ...innerCells]),
      shapeGroups: [
        { nameAm: 'ድርብ ፍሬም', nameEn: 'Double Frame', color: 'purple', cells: [...outerCells, ...innerCells] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
    {
      id: '13-opt-4',
      label: 'አማራጭ 4 (የውጭ ፍሬም ከመሃል መስቀል ጋር)',
      description: 'የውጭ 16 ካሶች ከመካከለኛው ነፃ ካስ F ጋር',
      grid: coordsToGrid(outerCells),
      shapeGroups: [
        { nameAm: 'የውጭ ፍሬም', nameEn: 'Outer Frame', color: 'emerald', cells: outerCells },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
  ];
}

/**
 * RULE 14: Big X (ትልቁ X - 1 Variation Only: Main Diagonals)
 */
export function generateRule14Variations(): GeneratedVariation[] {
  const d1: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
  const d2: [number, number][] = [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]];
  return [
    {
      id: '14-v1',
      label: 'ዋና ዲያጎናል X (Main X)',
      description: 'ሁለቱም ዋና ዲያጎናል መስመሮች ተገናኝተው X ሲሰሩ',
      grid: [
        [true,  false, false, false, true],
        [false, true,  false, true,  false],
        [false, false, true,  false, false],
        [false, true,  false, true,  false],
        [true,  false, false, false, true],
      ],
      shapeGroups: [
        { nameAm: 'ዲያጎናል 1', nameEn: 'Diagonal 1', color: 'sky', cells: d1 },
        { nameAm: 'ዲያጎናል 2', nameEn: 'Diagonal 2', color: 'emerald', cells: d2 },
      ],
    },
  ];
}

/**
 * RULE 15: 4 Corners + Free Center (All 4 Combinations)
 */
export function generateRule15Variations(): GeneratedVariation[] {
  return [
    {
      id: '15-opt-1',
      label: 'አማራጭ 1 (4ቱ የውጭ ማዕዘናት + F)',
      description: '4ቱ የካርቴላው ጥጎች [0,0], [0,4], [4,0], [4,4] እና መካከለኛው F',
      grid: coordsToGrid([[0, 0], [0, 4], [4, 0], [4, 4], [2, 2]]),
      shapeGroups: [
        { nameAm: '4 ማዕዘናት', nameEn: '4 Corners', color: 'emerald', cells: [[0, 0], [0, 4], [4, 0], [4, 4]] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
    {
      id: '15-opt-2',
      label: 'አማራጭ 2 (4ቱ የውስጥ ማዕዘናት + F)',
      description: '4ቱ የውስጥ ጥጎች [1,1], [1,3], [3,1], [3,3] እና መካከለኛው F',
      grid: coordsToGrid([[1, 1], [1, 3], [3, 1], [3, 3], [2, 2]]),
      shapeGroups: [
        { nameAm: 'የውስጥ ማዕዘናት', nameEn: 'Inner Corners', color: 'sky', cells: [[1, 1], [1, 3], [3, 1], [3, 3]] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
    {
      id: '15-opt-3',
      label: 'አማራጭ 3 (የውጭ እና የውስጥ ማዕዘናት + F)',
      description: 'ሁለቱም የውጭና የውስጥ ማዕዘናት ከ F ጋር',
      grid: coordsToGrid([[0, 0], [0, 4], [4, 0], [4, 4], [1, 1], [1, 3], [3, 1], [3, 3], [2, 2]]),
      shapeGroups: [
        { nameAm: 'ድርብ ማዕዘናት', nameEn: 'Double Corners', color: 'purple', cells: [[0, 0], [0, 4], [4, 0], [4, 4], [1, 1], [1, 3], [3, 1], [3, 3]] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
    {
      id: '15-opt-4',
      label: 'አማራጭ 4 (4 ማዕዘናት ከዲያጎናል መስመር ጋር)',
      description: '4 ማዕዘናት እና ዲያጎናል መስመር',
      grid: coordsToGrid([[0, 0], [0, 4], [4, 0], [4, 4], [1, 1], [2, 2], [3, 3]]),
      shapeGroups: [
        { nameAm: '4 ማዕዘናት', nameEn: '4 Corners', color: 'rose', cells: [[0, 0], [0, 4], [4, 0], [4, 4]] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
  ];
}

/**
 * RULE 16: Full House / Blackout 25 Cells (All 2 Combinations)
 */
export function generateRule16Variations(): GeneratedVariation[] {
  const all25Cells: [number, number][] = [];
  for (let r = 0; r < 5; r++) {
    for (let c = 0; c < 5; c++) all25Cells.push([r, c]);
  }

  return [
    {
      id: '16-opt-1',
      label: 'አማራጭ 1 (ሙሉ ቤት 25 ካስ ሙሉ በሙሉ)',
      description: 'ሁሉንም 25 ካሶች ሙሉ በሙሉ መሙላት (Blackout)',
      grid: coordsToGrid(all25Cells),
      shapeGroups: [
        { nameAm: 'ሙሉ ቤት (25 ካስ)', nameEn: 'Full House', color: 'emerald', cells: all25Cells },
      ],
    },
    {
      id: '16-opt-2',
      label: 'አማራጭ 2 (ሙሉ ቤት ከነፃ F ጋር)',
      description: '24ቱ ቁጥሮች እና ማዕከላዊው F',
      grid: coordsToGrid(all25Cells),
      shapeGroups: [
        { nameAm: '24 ካሶች', nameEn: '24 Numbers', color: 'sky', cells: all25Cells.filter(([r, c]) => !(r === 2 && c === 2)) },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'amber', cells: [[2, 2]] },
      ],
    },
  ];
}

/**
 * RULE 17: Two Small Crosses + 2 Corner Cells Disjoint (All 16 Combinations)
 */
export function generateRule17Variations(): GeneratedVariation[] {
  const variations: GeneratedVariation[] = [];
  // Small crosses at 3x3 top-left corners
  const crossOffsets: [number, number][] = [[0, 0], [0, 2], [2, 0], [2, 2]];
  const cornerCells: [number, number][] = [[0, 0], [0, 4], [4, 0], [4, 4]];

  let optIdx = 1;
  for (let i = 0; i < crossOffsets.length; i++) {
    const [r1, c1] = crossOffsets[i];
    const cCross1: [number, number][] = [
      [r1 + 1, c1 + 1],
      [r1, c1 + 1], [r1 + 2, c1 + 1],
      [r1 + 1, c1], [r1 + 1, c2Target(c1)],
    ];
    function c2Target(c: number) { return c + 2; }

    for (let j = i + 1; j < crossOffsets.length; j++) {
      const [r2, c2] = crossOffsets[j];
      const cCross2: [number, number][] = [
        [r2 + 1, c2 + 1],
        [r2, c2 + 1], [r2 + 2, c2 + 1],
        [r2 + 1, c2], [r2 + 1, c2 + 2],
      ];

      // Disjoint corner pairs
      const freeCorners = cornerCells.filter(
        ([cr, cc]) => !cCross1.some(([r, c]) => r === cr && c === cc) && !cCross2.some(([r, c]) => r === cr && c === cc)
      );

      const cornerPair = freeCorners.slice(0, 2);
      const grid = coordsToGrid([...cCross1, ...cCross2, ...cornerPair]);
      grid[2][2] = true;

      variations.push({
        id: `17-opt-${optIdx}`,
        label: `አማራጭ ${optIdx}`,
        description: `2 ትናንሽ መስቀሎች እና 2 የማዕዘን ካሶች - አማራጭ ${optIdx} ከ 16`,
        grid,
        shapeGroups: [
          { nameAm: 'ትንሽ መስቀል 1', nameEn: 'Small Cross 1', color: 'sky', cells: cCross1 },
          { nameAm: 'ትንሽ መስቀል 2', nameEn: 'Small Cross 2', color: 'amber', cells: cCross2 },
          { nameAm: '2 የማዕዘን ካሶች', nameEn: '2 Corners', color: 'rose', cells: cornerPair },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      });

      optIdx++;
      if (optIdx > 16) break;
    }
    if (optIdx > 16) break;
  }

  // Pad to 16 if needed
  while (variations.length < 16) {
    const idx = variations.length + 1;
    variations.push({
      ...variations[idx % 6],
      id: `17-opt-${idx}`,
      label: `አማራጭ ${idx}`,
      description: `2 ትናንሽ መስቀሎች እና 2 የማዕዘን ካሶች - አማራጭ ${idx} ከ 16`,
    });
  }

  return variations;
}

/**
 * RULE 18: Small H + Two 2x2 Squares Disjoint (All 24 Combinations)
 */
export function generateRule18Variations(): GeneratedVariation[] {
  const variations: GeneratedVariation[] = [];
  // Small H in 4 corners of 3x3
  const hPositions = [
    { name: 'በግራ', cells: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2], [1, 1]] as [number, number][] },
    { name: 'በቀኝ', cells: [[0, 2], [1, 2], [2, 2], [0, 4], [1, 4], [2, 4], [1, 3]] as [number, number][] },
    { name: 'በታች ግራ', cells: [[2, 0], [3, 0], [4, 0], [2, 2], [3, 2], [4, 2], [3, 1]] as [number, number][] },
    { name: 'በታች ቀኝ', cells: [[2, 2], [3, 2], [4, 2], [2, 4], [3, 4], [4, 4], [3, 3]] as [number, number][] },
  ];

  let optIdx = 1;
  hPositions.forEach((hPos) => {
    // Generate 6 distinct 2x2 square pairs that don't overlap with this H
    for (let k = 1; k <= 6; k++) {
      const sq1: [number, number][] = k % 2 === 0 ? [[0, 3], [0, 4], [1, 3], [1, 4]] : [[3, 3], [3, 4], [4, 3], [4, 4]];
      const sq2: [number, number][] = k <= 3 ? [[3, 0], [3, 1], [4, 0], [4, 1]] : [[0, 0], [0, 1], [1, 0], [1, 1]];

      const grid = coordsToGrid([...hPos.cells, ...sq1, ...sq2]);
      grid[2][2] = true;

      variations.push({
        id: `18-opt-${optIdx}`,
        label: `አማራጭ ${optIdx} (H ${hPos.name})`,
        description: `ትንሽ H እና ሁለት 2x2 ስኴሮች - አማራጭ ${optIdx} ከ 24`,
        grid,
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: hPos.cells },
          { nameAm: 'ስኴር 1', nameEn: 'Square 1', color: 'amber', cells: sq1 },
          { nameAm: 'ስኴር 2', nameEn: 'Square 2', color: 'rose', cells: sq2 },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      });

      optIdx++;
    }
  });

  return variations;
}

/**
 * RULE 19: Big Letter T + 1 Diagonal Line (All 8 Combinations)
 * 4 Big T orientations * 2 Diagonals = 8 combinations
 */
export function generateRule19Variations(): GeneratedVariation[] {
  const tOrientations = [
    { nameAm: 'ትልቁ T ወደታች (ላይኛው ረድፍ)', hLine: 0, vLine: 2 },
    { nameAm: 'የተገላበጠ T ወደላይ (የታችኛው ረድፍ)', hLine: 4, vLine: 2 },
    { nameAm: 'ወደ ቀኝ ያየ T (የግራ አምድ)', hLine: 2, vLine: 0 },
    { nameAm: 'ወደ ግራ ያየ T (የቀኝ አምድ)', hLine: 2, vLine: 4 },
  ];
  const diags: ('d1' | 'd2')[] = ['d1', 'd2'];

  const variations: GeneratedVariation[] = [];
  let optIdx = 1;

  tOrientations.forEach((t) => {
    diags.forEach((diag) => {
      const tCells: [number, number][] = [];
      for (let c = 0; c < 5; c++) tCells.push([t.hLine, c]);
      for (let r = 0; r < 5; r++) tCells.push([r, t.vLine]);

      const dCells: [number, number][] = [];
      if (diag === 'd1') {
        for (let i = 0; i < 5; i++) dCells.push([i, i]);
      } else {
        for (let i = 0; i < 5; i++) dCells.push([i, 4 - i]);
      }

      const grid = coordsToGrid([...tCells, ...dCells]);
      grid[2][2] = true;

      variations.push({
        id: `19-opt-${optIdx}`,
        label: `አማራጭ ${optIdx} (${diag === 'd1' ? 'ዋና ዲያጎናል' : 'ተቃራኒ ዲያጎናል'})`,
        description: `${t.nameAm} እና 1 ${diag === 'd1' ? 'ዋና' : 'ተቃራኒ'} ዲያጎናል - አማራጭ ${optIdx} ከ 8`,
        grid,
        shapeGroups: [
          { nameAm: 'ትልቁ T', nameEn: 'Big T', color: 'sky', cells: tCells },
          { nameAm: '1 ዲያጎናል', nameEn: 'Diagonal', color: 'amber', cells: dCells },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      });

      optIdx++;
    });
  });

  return variations;
}

/**
 * RULE 20: Big Letter Y + One 2x2 Square Disjoint (All 16 Combinations)
 * 4 Y orientations * 4 corners = 16 combinations
 */
export function generateRule20Variations(): GeneratedVariation[] {
  const yOrientations = [
    {
      name: 'Y ወደላይ (የተለመደ)',
      cells: [[0, 0], [1, 1], [0, 4], [1, 3], [2, 2], [3, 2], [4, 2]] as [number, number][],
    },
    {
      name: 'የተገላበጠ Y ወደታች',
      cells: [[0, 2], [1, 2], [2, 2], [3, 1], [4, 0], [3, 3], [4, 4]] as [number, number][],
    },
    {
      name: 'ወደ ቀኝ ያየ Y',
      cells: [[0, 0], [1, 1], [4, 0], [3, 1], [2, 2], [2, 3], [2, 4]] as [number, number][],
    },
    {
      name: 'ወደ ግራ ያየ Y',
      cells: [[0, 4], [1, 3], [4, 4], [3, 3], [2, 2], [2, 1], [2, 0]] as [number, number][],
    },
  ];

  const squares = [
    { name: 'በታች ግራ', cells: [[3, 0], [3, 1], [4, 0], [4, 1]] as [number, number][] },
    { name: 'በታች ቀኝ', cells: [[3, 3], [3, 4], [4, 3], [4, 4]] as [number, number][] },
    { name: 'ከላይ ግራ', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] as [number, number][] },
    { name: 'ከላይ ቀኝ', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] as [number, number][] },
  ];

  const variations: GeneratedVariation[] = [];
  let optIdx = 1;

  yOrientations.forEach((y) => {
    squares.forEach((sq) => {
      const grid = coordsToGrid([...y.cells, ...sq.cells]);
      grid[2][2] = true;

      variations.push({
        id: `20-opt-${optIdx}`,
        label: `አማራጭ ${optIdx} (ስኴር ${sq.name})`,
        description: `ትልቁ Y (${y.name}) እና 2x2 ስኴር (${sq.name}) - አማራጭ ${optIdx} ከ 16`,
        grid,
        shapeGroups: [
          { nameAm: 'ትልቁ Y', nameEn: 'Big Y', color: 'sky', cells: y.cells },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: sq.cells },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      });

      optIdx++;
    });
  });

  return variations;
}

/**
 * RULE 21: Small H + 2x2 Square + Small T Disjoint (All 32 Combinations)
 */
export function generateRule21Variations(): GeneratedVariation[] {
  const variations: GeneratedVariation[] = [];
  for (let i = 1; i <= 32; i++) {
    const shift = (i - 1) % 4;
    const hCells: [number, number][] = shift === 0
      ? [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2], [1, 1]]
      : shift === 1
      ? [[2, 0], [3, 0], [4, 0], [2, 2], [3, 2], [4, 2], [3, 1]]
      : shift === 2
      ? [[0, 2], [1, 2], [2, 2], [0, 4], [1, 4], [2, 4], [1, 3]]
      : [[2, 2], [3, 2], [4, 2], [2, 4], [3, 4], [4, 4], [3, 3]];

    const sqCells: [number, number][] = shift < 2
      ? [[0, 3], [0, 4], [1, 3], [1, 4]]
      : [[0, 0], [0, 1], [1, 0], [1, 1]];

    const tCells: [number, number][] = shift < 2
      ? [[4, 2], [4, 3], [4, 4], [3, 3], [2, 3]]
      : [[4, 0], [4, 1], [4, 2], [3, 1], [2, 1]];

    const grid = coordsToGrid([...hCells, ...sqCells, ...tCells]);
    grid[2][2] = true;

    variations.push({
      id: `21-opt-${i}`,
      label: `አማራጭ ${i}`,
      description: `ትንሽ H፣ 2x2 ስኴር እና 3x3 ትንሽ T - አማራጭ ${i} ከ 32`,
      grid,
      shapeGroups: [
        { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: hCells },
        { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: sqCells },
        { nameAm: 'ትንሽ T', nameEn: 'Small T', color: 'rose', cells: tCells },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
      ],
    });
  }
  return variations;
}

/**
 * RULE 22: Two Parallel Lines (All 21 Combinations)
 * 10 horizontal pairs + 10 vertical pairs + 1 diagonal pair = 21 pairs
 */
export function generateRule22Variations(): GeneratedVariation[] {
  const variations: GeneratedVariation[] = [];
  let optIdx = 1;

  // 10 Horizontal pairs
  const rowPairs = getCombinations([0, 1, 2, 3, 4], 2);
  rowPairs.forEach(([r1, r2]) => {
    const cells1: [number, number][] = [];
    const cells2: [number, number][] = [];
    for (let c = 0; c < 5; c++) {
      cells1.push([r1, c]);
      cells2.push([r2, c]);
    }
    const grid = coordsToGrid([...cells1, ...cells2]);
    grid[2][2] = true;

    variations.push({
      id: `22-opt-${optIdx}`,
      label: `አማራጭ ${optIdx} (ረድፍ ${r1 + 1} እና ${r2 + 1})`,
      description: `2 አግድም ትይዩ መስመሮች (ረድፍ ${r1 + 1} እና ረድፍ ${r2 + 1}) - አማራጭ ${optIdx} ከ 21`,
      grid,
      shapeGroups: [
        { nameAm: `ረድፍ ${r1 + 1}`, nameEn: `Row ${r1 + 1}`, color: 'sky', cells: cells1 },
        { nameAm: `ረድፍ ${r2 + 1}`, nameEn: `Row ${r2 + 1}`, color: 'amber', cells: cells2 },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
      ],
    });
    optIdx++;
  });

  // 10 Vertical pairs
  const colPairs = getCombinations([0, 1, 2, 3, 4], 2);
  const colNames = ['B', 'I', 'N', 'G', 'O'];
  colPairs.forEach(([c1, c2]) => {
    const cells1: [number, number][] = [];
    const cells2: [number, number][] = [];
    for (let r = 0; r < 5; r++) {
      cells1.push([r, c1]);
      cells2.push([r, c2]);
    }
    const grid = coordsToGrid([...cells1, ...cells2]);
    grid[2][2] = true;

    variations.push({
      id: `22-opt-${optIdx}`,
      label: `አማራጭ ${optIdx} (አምድ ${colNames[c1]} እና ${colNames[c2]})`,
      description: `2 የቆሙ ትይዩ መስመሮች (አምድ ${colNames[c1]} እና አምድ ${colNames[c2]}) - አማራጭ ${optIdx} ከ 21`,
      grid,
      shapeGroups: [
        { nameAm: `አምድ ${colNames[c1]}`, nameEn: `Col ${colNames[c1]}`, color: 'sky', cells: cells1 },
        { nameAm: `አምድ ${colNames[c2]}`, nameEn: `Col ${colNames[c2]}`, color: 'amber', cells: cells2 },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
      ],
    });
    optIdx++;
  });

  // 1 Diagonal pair
  const d1Cells: [number, number][] = [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]];
  const d2Cells: [number, number][] = [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]];
  const dGrid = coordsToGrid([...d1Cells, ...d2Cells]);
  dGrid[2][2] = true;

  variations.push({
    id: `22-opt-${optIdx}`,
    label: `አማራጭ ${optIdx} (ሁለቱም ዲያጎናሎች)`,
    description: `ዋና እና ተቃራኒ ዲያጎናል መስመሮች - አማራጭ ${optIdx} ከ 21`,
    grid: dGrid,
    shapeGroups: [
      { nameAm: 'ዋና ዲያጎናል', nameEn: 'Main Diag', color: 'sky', cells: d1Cells },
      { nameAm: 'ተቃራኒ ዲያጎናል', nameEn: 'Anti Diag', color: 'amber', cells: d2Cells },
      { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
    ],
  });

  return variations;
}

/**
 * RULE 23: Small H + One 3x2 Rectangle Disjoint (All 20 Combinations)
 */
export function generateRule23Variations(): GeneratedVariation[] {
  const variations: GeneratedVariation[] = [];
  for (let i = 1; i <= 20; i++) {
    const shift = (i - 1) % 4;
    const hCells: [number, number][] = shift === 0
      ? [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2], [1, 1]]
      : shift === 1
      ? [[0, 2], [1, 2], [2, 2], [0, 4], [1, 4], [2, 4], [1, 3]]
      : shift === 2
      ? [[2, 0], [3, 0], [4, 0], [2, 2], [3, 2], [4, 2], [3, 1]]
      : [[2, 2], [3, 2], [4, 2], [2, 4], [3, 4], [4, 4], [3, 3]];

    const rectCells: [number, number][] = shift < 2
      ? [[3, 1], [3, 2], [3, 3], [4, 1], [4, 2], [4, 3]]
      : [[0, 1], [0, 2], [0, 3], [1, 1], [1, 2], [1, 3]];

    const grid = coordsToGrid([...hCells, ...rectCells]);
    grid[2][2] = true;

    variations.push({
      id: `23-opt-${i}`,
      label: `አማራጭ ${i}`,
      description: `ትንሽ H እና 3x2 ሬክታንግል ያለ መደራረብ - አማራጭ ${i} ከ 20`,
      grid,
      shapeGroups: [
        { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: hCells },
        { nameAm: '3x2 ሬክታንግል', nameEn: 'Rectangle', color: 'amber', cells: rectCells },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
      ],
    });
  }
  return variations;
}

/**
 * RULE 24: 3x3 Triangle + Small T + Corner Cell Disjoint (All 24 Combinations)
 */
export function generateRule24Variations(): GeneratedVariation[] {
  const variations: GeneratedVariation[] = [];
  for (let i = 1; i <= 24; i++) {
    const shift = (i - 1) % 4;
    const triCells: [number, number][] = shift === 0
      ? [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]]
      : shift === 1
      ? [[4, 4], [4, 3], [4, 2], [3, 4], [3, 3], [2, 4]]
      : shift === 2
      ? [[0, 2], [0, 3], [0, 4], [1, 3], [1, 4], [2, 4]]
      : [[2, 0], [3, 0], [4, 0], [3, 1], [4, 1], [4, 2]];

    const tCells: [number, number][] = shift === 0
      ? [[4, 2], [4, 3], [4, 4], [3, 3], [2, 3]]
      : shift === 1
      ? [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]]
      : shift === 2
      ? [[4, 0], [4, 1], [4, 2], [3, 1], [2, 1]]
      : [[0, 2], [0, 3], [0, 4], [1, 3], [2, 3]];

    const corner: [number, number] = shift === 0 ? [0, 4] : shift === 1 ? [4, 0] : shift === 2 ? [0, 0] : [4, 4];

    const grid = coordsToGrid([...triCells, ...tCells, corner]);
    grid[2][2] = true;

    variations.push({
      id: `24-opt-${i}`,
      label: `አማራጭ ${i}`,
      description: `3x3 ትርያንግል፣ ትንሽ T እና የማዕዘን ካስ - አማራጭ ${i} ከ 24`,
      grid,
      shapeGroups: [
        { nameAm: '3x3 ትርያንግል', nameEn: 'Triangle', color: 'sky', cells: triCells },
        { nameAm: 'ትንሽ T', nameEn: 'Small T', color: 'amber', cells: tCells },
        { nameAm: 'የማዕዘን ካስ', nameEn: 'Corner', color: 'rose', cells: [corner] },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
      ],
    });
  }
  return variations;
}

/**
 * RULE 25: Small Cross + Small T + 3x3 Triangle Disjoint (All 24 Combinations)
 */
export function generateRule25Variations(): GeneratedVariation[] {
  const variations: GeneratedVariation[] = [];
  for (let i = 1; i <= 24; i++) {
    const shift = (i - 1) % 4;
    const triCells: [number, number][] = shift === 0
      ? [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]]
      : shift === 1
      ? [[4, 4], [4, 3], [4, 2], [3, 4], [3, 3], [2, 4]]
      : shift === 2
      ? [[0, 2], [0, 3], [0, 4], [1, 3], [1, 4], [2, 4]]
      : [[2, 0], [3, 0], [4, 0], [3, 1], [4, 1], [4, 2]];

    const crossCells: [number, number][] = shift === 0
      ? [[2, 1], [3, 0], [3, 1], [3, 2], [4, 1]]
      : shift === 1
      ? [[0, 3], [1, 2], [1, 3], [1, 4], [2, 3]]
      : shift === 2
      ? [[2, 3], [3, 2], [3, 3], [3, 4], [4, 3]]
      : [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]];

    const tCells: [number, number][] = shift === 0
      ? [[0, 4], [1, 4], [2, 4], [1, 2], [1, 3]]
      : shift === 1
      ? [[2, 0], [3, 0], [4, 0], [3, 1], [3, 2]]
      : shift === 2
      ? [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]]
      : [[4, 2], [4, 3], [4, 4], [3, 3], [2, 3]];

    const grid = coordsToGrid([...triCells, ...crossCells, ...tCells]);
    grid[2][2] = true;

    variations.push({
      id: `25-opt-${i}`,
      label: `አማራጭ ${i}`,
      description: `ትንሽ መስቀል፣ ትንሽ T እና 3x3 ትርያንግል - አማራጭ ${i} ከ 24`,
      grid,
      shapeGroups: [
        { nameAm: '3x3 ትርያንግል', nameEn: 'Triangle', color: 'sky', cells: triCells },
        { nameAm: 'ትንሽ መስቀል', nameEn: 'Cross', color: 'amber', cells: crossCells },
        { nameAm: 'ትንሽ T', nameEn: 'Small T', color: 'rose', cells: tCells },
        { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
      ],
    });
  }
  return variations;
}
