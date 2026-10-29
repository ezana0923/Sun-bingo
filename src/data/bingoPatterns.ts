import { BingoRulePattern, ShapeGroup, Language, PatternVariation } from '../types/bingo';
import {
  generateRule1Variations,
  generateRule2Variations,
  generateRule3Variations,
  generateRule4Variations,
  generateRule5Variations,
  generateRule6Variations,
  generateRule7Variations,
  generateRule8Variations,
  generateRule9Variations,
  generateRule10Variations,
  generateRule11Variations,
  generateRule12Variations,
  generateRule13Variations,
  generateRule14Variations,
  generateRule15Variations,
  generateRule16Variations,
  generateRule17Variations,
  generateRule18Variations,
  generateRule19Variations,
  generateRule20Variations,
  generateRule21Variations,
  generateRule22Variations,
  generateRule23Variations,
  generateRule24Variations,
  generateRule25Variations,
  generateRule26Variations,
  generateRule27Variations,
} from './patternGenerators';

/**
 * Helper to create a 5x5 boolean grid from coordinate pairs [row, col] (0-indexed).
 * Note: Center cell (2, 2) is FREE and works in all patterns.
 */
function createGrid(coords: [number, number][]): boolean[][] {
  const grid = Array.from({ length: 5 }, () => Array(5).fill(false));
  for (const [r, c] of coords) {
    if (r >= 0 && r < 5 && c >= 0 && c < 5) {
      grid[r][c] = true;
    }
  }
  return grid;
}

function createLinesGrid(rows: number[], cols: number[], diag1 = false, diag2 = false): boolean[][] {
  const coords: [number, number][] = [];
  for (const r of rows) {
    for (let c = 0; c < 5; c++) coords.push([r, c]);
  }
  for (const c of cols) {
    for (let r = 0; r < 5; r++) coords.push([r, c]);
  }
  if (diag1) {
    for (let i = 0; i < 5; i++) coords.push([i, i]);
  }
  if (diag2) {
    for (let i = 0; i < 5; i++) coords.push([i, 4 - i]);
  }
  return createGrid(coords);
}

interface RawPlayerVariant {
  title: string;
  grid: boolean[][];
  description?: string;
  shapeGroups?: ShapeGroup[];
}

interface RawBingoRule {
  id: string;
  ruleNumber: number;
  code: string;
  nameAm: string;
  nameEn: string;
  shortDescAm: string;
  shortDescEn: string;
  playerVariants: RawPlayerVariant[];
  adminVariantsCount: number;
  category: 'square' | 'line' | 'shape' | 'special' | string;
}

const RAW_BINGO_RULES_27: RawBingoRule[] = [
  {
    id: 'rule-1',
    ruleNumber: 1,
    code: 'FOUR_2X2_DISJOINT',
    nameAm: '(2×2) የሆነ ስኴር የጋራ ነጥብ የሌለው 4',
    nameEn: '4 Disjoint 2x2 Squares',
    shortDescAm: '4 ራሳቸውን የቻሉ (2x2) ስኴሮች ያለ መደራረብ',
    shortDescEn: 'Four independent 2x2 squares with no overlapping cells',
    playerVariants: [
      {
        title: 'አማራጭ 1 (4ቱ ማዕዘናት 2x2 ስኴሮች)',
        grid: [
          [true, true, false, true, true],
          [true, true, false, true, true],
          [false, false, true, false, false],
          [true, true, false, true, true],
          [true, true, false, true, true],
        ],
        description: 'በ 4ቱ ማዕዘናት ያሉ 4 ራሳቸውን የቻሉ (2x2) ስኴሮች፤ ማዕከላዊው F ሁሌም ነፃና የበራ ነው።',
        shapeGroups: [
          { nameAm: 'ስኴር 1 (ላይ ግራ)', nameEn: 'Square 1 (TL)', color: 'sky', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: 'ስኴር 2 (ላይ ቀኝ)', nameEn: 'Square 2 (TR)', color: 'amber', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'ስኴር 3 (ታች ግራ)', nameEn: 'Square 3 (BL)', color: 'rose', cells: [[3, 0], [3, 1], [4, 0], [4, 1]] },
          { nameAm: 'ስኴር 4 (ታች ቀኝ)', nameEn: 'Square 4 (BR)', color: 'purple', cells: [[3, 3], [3, 4], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (የተዘጉ የውስጥ ጠርዞች)',
        grid: [
          [false, true, true, true, true],
          [false, true, true, true, true],
          [false, false, true, false, false],
          [true, true, false, true, true],
          [true, true, false, true, true],
        ],
        description: 'በቀኝ እና በግራ የተዘዋወሩ 4 ስኴሮች ከ F ጋር',
        shapeGroups: [
          { nameAm: 'ስኴር 1', nameEn: 'Square 1', color: 'sky', cells: [[0, 1], [0, 2], [1, 1], [1, 2]] },
          { nameAm: 'ስኴር 2', nameEn: 'Square 2', color: 'amber', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'ስኴር 3', nameEn: 'Square 3', color: 'rose', cells: [[3, 0], [3, 1], [4, 0], [4, 1]] },
          { nameAm: 'ስኴር 4', nameEn: 'Square 4', color: 'purple', cells: [[3, 3], [3, 4], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (ቁመታዊ የጎን ስኴሮች)',
        grid: [
          [true, true, false, true, true],
          [true, true, false, true, true],
          [false, false, true, false, false],
          [false, true, true, true, true],
          [false, true, true, true, true],
        ],
        description: 'የታችኛው ክፍል የተስተካከለ አቀማመጥ ከ F ጋር',
        shapeGroups: [
          { nameAm: 'ስኴር 1', nameEn: 'Square 1', color: 'sky', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: 'ስኴር 2', nameEn: 'Square 2', color: 'amber', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'ስኴር 3', nameEn: 'Square 3', color: 'rose', cells: [[3, 1], [3, 2], [4, 1], [4, 2]] },
          { nameAm: 'ስኴር 4', nameEn: 'Square 4', color: 'purple', cells: [[3, 3], [3, 4], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (ሲሜትሪክ ማዕከላዊ ስኴሮች)',
        grid: [
          [true, true, true, true, false],
          [true, true, true, true, false],
          [false, false, true, false, false],
          [true, true, true, true, false],
          [true, true, true, true, false],
        ],
        description: 'በግራ በኩል የተከማቹ 4 ራሳቸውን የቻሉ ስኴሮች ከ F ጋር',
        shapeGroups: [
          { nameAm: 'ስኴር 1', nameEn: 'Square 1', color: 'sky', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: 'ስኴር 2', nameEn: 'Square 2', color: 'amber', cells: [[0, 2], [0, 3], [1, 2], [1, 3]] },
          { nameAm: 'ስኴር 3', nameEn: 'Square 3', color: 'rose', cells: [[3, 0], [3, 1], [4, 0], [4, 1]] },
          { nameAm: 'ስኴር 4', nameEn: 'Square 4', color: 'purple', cells: [[3, 2], [3, 3], [4, 2], [4, 3]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 9,
    category: 'square',
  },
  {
    id: 'rule-2',
    ruleNumber: 2,
    code: 'TWO_2X3_DISJOINT',
    nameAm: '(2×3) የሆነ ስኴር/ሬክታንግል የጋራ ነጥብ የሌላቸው 2',
    nameEn: '2 Disjoint 2x3 Rectangles',
    shortDescAm: '2 ራሳቸውን የቻሉ (2x3) ሬክታንግሎች ያለ መደራረብ',
    shortDescEn: 'Two independent 2x3 rectangles with no overlapping cells',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ላይ እና ታች አግድም 2x3)',
        grid: [
          [true, true, true, false, false],
          [true, true, true, false, false],
          [false, false, true, false, false],
          [false, false, true, true, true],
          [false, false, true, true, true],
        ],
        description: 'የላይኛው ግራ እና የታችኛው ቀኝ 2x3 ሬክታንግሎች ከ F ጋር',
        shapeGroups: [
          { nameAm: 'ሬክታንግል 1 (ላይ)', nameEn: 'Rectangle 1 (Top)', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
          { nameAm: 'ሬክታንግል 2 (ታች)', nameEn: 'Rectangle 2 (Bottom)', color: 'amber', cells: [[3, 2], [3, 3], [3, 4], [4, 2], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ግራ እና ቀኝ ቁመታዊ 3x2)',
        grid: [
          [true, true, false, false, false],
          [true, true, false, false, false],
          [true, true, true, true, true],
          [false, false, false, true, true],
          [false, false, false, true, true],
        ],
        description: 'በግራ እና በቀኝ የቆሙ ሁለት 3x2 ሬክታንግሎች ከ F ጋር',
        shapeGroups: [
          { nameAm: 'ሬክታንግል 1 (ግራ)', nameEn: 'Rectangle 1 (Left)', color: 'sky', cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
          { nameAm: 'ሬክታንግል 2 (ቀኝ)', nameEn: 'Rectangle 2 (Right)', color: 'amber', cells: [[2, 3], [2, 4], [3, 3], [3, 4], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (አግድም ማዕከላዊ ተቃራኒ)',
        grid: [
          [false, false, true, true, true],
          [false, false, true, true, true],
          [false, false, true, false, false],
          [true, true, true, false, false],
          [true, true, true, false, false],
        ],
        description: 'የላይኛው ቀኝ እና የታችኛው ግራ 2x3 ሬክታንግሎች',
        shapeGroups: [
          { nameAm: 'ሬክታንግል 1 (ቀኝ)', nameEn: 'Rectangle 1 (Right)', color: 'sky', cells: [[0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4]] },
          { nameAm: 'ሬክታንግል 2 (ግራ)', nameEn: 'Rectangle 2 (Left)', color: 'amber', cells: [[3, 0], [3, 1], [3, 2], [4, 0], [4, 1], [4, 2]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (ቁመታዊ የላይ እና የታች ተቃራኒ)',
        grid: [
          [false, false, false, true, true],
          [false, false, false, true, true],
          [true, true, true, true, true],
          [true, true, false, false, false],
          [true, true, false, false, false],
        ],
        description: 'በቁመት የተደረደሩ ሁለት 3x2 ሬክታንግሎች',
        shapeGroups: [
          { nameAm: 'ሬክታንግል 1', nameEn: 'Rectangle 1', color: 'sky', cells: [[0, 3], [0, 4], [1, 3], [1, 4], [2, 3], [2, 4]] },
          { nameAm: 'ሬክታንግል 2', nameEn: 'Rectangle 2', color: 'amber', cells: [[2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [4, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 5 (የተደባለቀ አግድም እና ቁመት)',
        grid: [
          [true, true, true, false, false],
          [true, true, true, false, false],
          [false, false, true, true, true],
          [false, false, false, true, true],
          [false, false, false, true, true],
        ],
        description: 'አንዱ አግድም አንዱ በቁመት የተደረደረ',
        shapeGroups: [
          { nameAm: 'ሬክታንግል 1 (አግድም)', nameEn: 'Rectangle 1 (H)', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
          { nameAm: 'ሬክታንግል 2 (ቁመት)', nameEn: 'Rectangle 2 (V)', color: 'amber', cells: [[2, 3], [2, 4], [3, 3], [3, 4], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 6 (የታችኛው ክፍል ጥምረት)',
        grid: [
          [false, true, true, true, false],
          [false, true, true, true, false],
          [false, false, true, false, false],
          [false, true, true, true, false],
          [false, true, true, true, false],
        ],
        description: 'በመሃል አግድም የተደረደሩ ሁለት 2x3 ሬክታንግሎች',
        shapeGroups: [
          { nameAm: 'ሬክታንግል 1', nameEn: 'Rectangle 1', color: 'sky', cells: [[0, 1], [0, 2], [0, 3], [1, 1], [1, 2], [1, 3]] },
          { nameAm: 'ሬክታንግል 2', nameEn: 'Rectangle 2', color: 'amber', cells: [[3, 1], [3, 2], [3, 3], [4, 1], [4, 2], [4, 3]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 18,
    category: 'square',
  },
  {
    id: 'rule-3',
    ruleNumber: 3,
    code: 'FIVE_LINES_NO_DIAG',
    nameAm: '5 መስመር ከዲያጎናል ውጪ',
    nameEn: '5 Lines without Diagonal',
    shortDescAm: 'ማንኛውም 5 የቆሙ ወይም የተኙ መስመሮች (ዲያጎናል ሳይጨምር)',
    shortDescEn: 'Any 5 straight rows or columns excluding diagonal lines',
    playerVariants: [
      {
        title: 'አማራጭ 1 (5ቱም የቆሙ መስመሮች)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: '5 የቆሙ አምዶች ሙሉ በሙሉ ሲሞሉ',
      },
      {
        title: 'አማራጭ 2 (3 የቆሙ + 2 የተኙ መስመሮች)',
        grid: [
          [true, true, true, true, true],
          [true, false, true, false, true],
          [true, false, true, false, true],
          [true, false, true, false, true],
          [true, true, true, true, true],
        ],
        description: '3 የቆሙ እና 2 የተኙ አግድም መስመሮች',
      },
      {
        title: 'አማራጭ 3 (2 የቆሙ + 3 የተኙ መስመሮች)',
        grid: [
          [true, true, true, true, true],
          [false, true, false, true, false],
          [true, true, true, true, true],
          [false, true, false, true, false],
          [true, true, true, true, true],
        ],
        description: '2 የቆሙ እና 3 የተኙ አግድም መስመሮች',
      },
      {
        title: 'አማራጭ 4 (4 የቆሙ + 1 የተኛ መስመር)',
        grid: [
          [true, true, false, true, true],
          [true, true, false, true, true],
          [true, true, true, true, true],
          [true, true, false, true, true],
          [true, true, false, true, true],
        ],
        description: '4 የቆሙ አምዶች እና 1 የተኛ አግድም መስመር',
      },
      {
        title: 'አማራጭ 5 (1 የቆመ + 4 የተኙ መስመሮች)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [false, false, true, false, false],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: '1 የቆመ አምድ እና 4 የተኙ መስመሮች',
      },
      {
        title: 'አማራጭ 6 (የተከታታይ 3 የተኙ + 2 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [false, false, false, true, true],
          [false, false, false, true, true],
        ],
        description: 'የተከታታይ 3 አግድም እና 2 የቆሙ መስመሮች',
      },
    ],
    adminVariantsCount: 252,
    category: 'line',
  },
  {
    id: 'rule-4',
    ruleNumber: 4,
    code: 'TWO_V_TWO_H_ONE_D',
    nameAm: '2 የቆሙ 2 የተኙ 1 ዲያጎናል መስመሮች',
    nameEn: '2 Vertical, 2 Horizontal, 1 Diagonal',
    shortDescAm: 'በአጠቃላይ 5 መስመሮች (2 የቆሙ፣ 2 የተኙ፣ 1 ዲያጎናል)',
    shortDescEn: 'Exactly 2 vertical, 2 horizontal, and 1 diagonal line',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ዋና ዲያጎናል + 2 የቆሙ + 2 የተኙ)',
        grid: [
          [true, true, true, true, true],
          [true, true, false, false, true],
          [true, false, true, false, true],
          [true, false, false, true, true],
          [true, true, true, true, true],
        ],
        description: 'ከግራ ወደ ቀኝ ዲያጎናል ከውጨኛ መስመሮች ጋር',
      },
      {
        title: 'አማራጭ 2 (ተቃራኒ ዲያጎናል + Cols 1,3 + Rows 1,3)',
        grid: [
          [false, true, false, true, true],
          [true, false, true, true, true],
          [false, true, true, true, false],
          [true, true, true, false, true],
          [true, true, false, true, false],
        ],
        description: 'ከቀኝ ወደ ግራ ዲያጎናል ከውስጠኛ መስመሮች ጋር',
      },
      {
        title: 'አማራጭ 3 (ዲያጎናል + Cols 0,2 + Rows 0,2)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, false, false],
          [true, true, true, true, true],
          [true, false, true, true, false],
          [true, false, true, false, true],
        ],
        description: 'ዋና ዲያጎናል ከመሃልና የግራ መስመሮች ጋር',
      },
      {
        title: 'አማራጭ 4 (ተቃራኒ ዲያጎናል + Cols 2,4 + Rows 2,4)',
        grid: [
          [false, false, true, false, true],
          [false, false, true, true, true],
          [true, true, true, true, true],
          [false, true, true, false, true],
          [true, true, true, true, true],
        ],
        description: 'ተቃራኒ ዲያጎናል ከመሃልና የቀኝ መስመሮች ጋር',
      },
      {
        title: 'አማራጭ 5 (ዋና ዲያጎናል + Cols 1,4 + Rows 0,3)',
        grid: [
          [true, true, true, true, true],
          [false, true, false, false, true],
          [false, true, true, false, true],
          [true, true, true, true, true],
          [false, true, false, false, true],
        ],
        description: 'የተለያየ አቅጣጫ ቅይጥ አቀማመጥ',
      },
    ],
    adminVariantsCount: 200,
    category: 'line',
  },
  {
    id: 'rule-5',
    ruleNumber: 5,
    code: 'HALF_HOUSE_15',
    nameAm: 'ግማሽ ቤት ወደ ሁሉም አቅጣጫ (ከ F ጋር 15 መጥቆር አለበት)',
    nameEn: 'Half House Any Direction (15 Cells with F)',
    shortDescAm: 'በቁመት፣ በጎን ወይም በዲያጎናል ግማሽ ቤት 15 ካስ መሙላት',
    shortDescEn: 'Any half board (vertical, horizontal, diagonal) with 15 covered cells including Free',
    playerVariants: [
      {
        title: 'አማራጭ 1 (የላይኛው ግማሽ 15 ካስ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [false, false, false, false, false],
          [false, false, false, false, false],
        ],
        description: 'የላይኛው 3 ረድፎች (Rows 1, 2, 3 ከ F ጋር)',
      },
      {
        title: 'አማራጭ 2 (የታችኛው ግማሽ 15 ካስ)',
        grid: [
          [false, false, false, false, false],
          [false, false, false, false, false],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: 'የታችኛው 3 ረድፎች (Rows 3, 4, 5 ከ F ጋር)',
      },
      {
        title: 'አማራጭ 3 (የግራ ግማሽ 15 ካስ)',
        grid: [
          [true, true, true, false, false],
          [true, true, true, false, false],
          [true, true, true, false, false],
          [true, true, true, false, false],
          [true, true, true, false, false],
        ],
        description: 'የግራ 3 አምዶች (B, I, N ከ F ጋር)',
      },
      {
        title: 'አማራጭ 4 (የቀኝ ግማሽ 15 ካስ)',
        grid: [
          [false, false, true, true, true],
          [false, false, true, true, true],
          [false, false, true, true, true],
          [false, false, true, true, true],
          [false, false, true, true, true],
        ],
        description: 'የቀኝ 3 አምዶች (N, G, O ከ F ጋር)',
      },
      {
        title: 'አማራጭ 5 (የላይኛው ግራ ዲያጎናል ግማሽ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, false],
          [true, true, true, false, false],
          [true, true, false, false, false],
          [true, false, false, false, false],
        ],
        description: 'የላይኛው ግራ ሶስት ማዕዘን ግማሽ ከ F ጋር',
      },
      {
        title: 'አማራጭ 6 (የታችኛው ቀኝ ዲያጎናል ግማሽ)',
        grid: [
          [false, false, false, false, true],
          [false, false, false, true, true],
          [false, false, true, true, true],
          [false, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: 'የታችኛው ቀኝ ሶስት ማዕዘን ግማሽ ከ F ጋር',
      },
    ],
    adminVariantsCount: 8,
    category: 'special',
  },
  {
    id: 'rule-6',
    ruleNumber: 6,
    code: 'FOUR_LINES_NO_FREE',
    nameAm: '4 ፊሪ (F) የማይነኩ መስመር ወደ ፈለጉት አቅጣጫ',
    nameEn: '4 Lines Not Touching Free Space',
    shortDescAm: 'መካከለኛውን F የማይነኩ 4 ማንኛቸውም መስመሮች',
    shortDescEn: 'Any 4 lines that completely bypass the central Free space',
    playerVariants: [
      {
        title: 'አማራጭ 1 (4ቱ ውጨኛ የተኙ መስመሮች)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [false, false, false, false, false],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: 'ረድፍ 1፣ 2፣ 4 እና 5 (መሃል Fን አይነካም)',
      },
      {
        title: 'አማራጭ 2 (4ቱ ውጨኛ የቆሙ መስመሮች)',
        grid: [
          [true, true, false, true, true],
          [true, true, false, true, true],
          [true, true, false, true, true],
          [true, true, false, true, true],
          [true, true, false, true, true],
        ],
        description: 'አምድ B፣ I፣ G እና O (መሃል Fን አይነካም)',
      },
      {
        title: 'አማራጭ 3 (2 የተኙ + 2 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, false, false, false, true],
          [true, false, false, false, true],
          [true, false, false, false, true],
          [true, true, true, true, true],
        ],
        description: 'ላይ እና ታች ረድፎች ከግራ እና ቀኝ አምዶች ጋር',
      },
      {
        title: 'አማራጭ 4 (3 የተኙ + 1 የቆመ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, false, false, false, false],
          [true, false, false, false, false],
          [true, true, true, true, true],
        ],
        description: '3 የተኙ መስመሮች ከአንድ የቆመ አምድ ጋር',
      },
      {
        title: 'አማራጭ 5 (1 የተኛ + 3 የቆሙ)',
        grid: [
          [true, true, false, false, true],
          [true, true, false, false, true],
          [true, true, false, false, true],
          [true, true, true, true, true],
          [true, true, false, false, true],
        ],
        description: '1 የተኛ መስመር ከ 3 የቆሙ አምዶች ጋር',
      },
      {
        title: 'አማራጭ 6 (የውስጥ ውጨኛ ጥምረት)',
        grid: [
          [false, true, false, true, false],
          [true, true, true, true, true],
          [false, true, false, true, false],
          [true, true, true, true, true],
          [false, true, false, true, false],
        ],
        description: 'ረድፍ 2 እና 4 ከአምድ 2 እና 4 ጋር',
      },
    ],
    adminVariantsCount: 70,
    category: 'line',
  },
  {
    id: 'rule-7',
    ruleNumber: 7,
    code: 'FIVE_LINES_ANY',
    nameAm: '5 መስመር ወደ ፈለጉት አቅጣጫ',
    nameEn: 'Any 5 Lines',
    shortDescAm: 'ማንኛውም 5 መስመሮች (በቆመ፣ በተኛ፣ ወይም በዲያጎናል)',
    shortDescEn: 'Any combination of 5 completed lines in any direction',
    playerVariants: [
      {
        title: 'አማራጭ 1 (2 ዲያጎናል + 3 አግድም)',
        grid: [
          [true, true, true, true, true],
          [false, true, false, true, false],
          [true, true, true, true, true],
          [false, true, false, true, false],
          [true, true, true, true, true],
        ],
        description: 'ሁለቱ ዲያጎናሎች ከ 3 አግድም መስመሮች ጋር',
      },
      {
        title: 'አማራጭ 2 (2 ዲያጎናል + 3 የቆሙ)',
        grid: [
          [true, false, true, false, true],
          [true, true, true, true, true],
          [true, false, true, false, true],
          [true, true, true, true, true],
          [true, false, true, false, true],
        ],
        description: 'ሁለቱ ዲያጎናሎች ከ 3 የቆሙ አምዶች ጋር',
      },
      {
        title: 'አማራጭ 3 (1 ዲያጎናል + 2 አግድም + 2 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, true, false, false, true],
          [true, false, true, false, true],
          [true, false, false, true, true],
          [true, true, true, true, true],
        ],
        description: '1 ዲያጎናል፣ 2 አግድም እና 2 የቆሙ መስመሮች',
      },
      {
        title: 'አማራጭ 4 (4 አግድም + 1 የቆመ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [false, false, true, false, false],
        ],
        description: '4 የተኙ እና 1 የቆመ መስመር',
      },
      {
        title: 'አማራጭ 5 (4 የቆሙ + 1 ዲያጎናል)',
        grid: [
          [true, true, false, true, true],
          [true, true, false, true, true],
          [true, true, true, true, true],
          [true, true, false, true, true],
          [true, true, false, true, true],
        ],
        description: '4 የቆሙ አምዶች እና ዋና ዲያጎናል',
      },
      {
        title: 'አማራጭ 6 (3 አግድም + 2 ዲያጎናል)',
        grid: [
          [true, false, false, false, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, false, false, false, true],
        ],
        description: '3 የውስጥ አግድም ረድፎች ከሁለቱም ዲያጎናል ጋር',
      },
    ],
    adminVariantsCount: 792,
    category: 'line',
  },
  {
    id: 'rule-8',
    ruleNumber: 8,
    code: 'SIX_LINES_ANY',
    nameAm: '6 መስመር ወደ ፈለጉት አቅጣጫ',
    nameEn: 'Any 6 Lines',
    shortDescAm: 'ማንኛውም 6 መስመሮች (በቆመ፣ በተኛ፣ ወይም በዲያጎናል)',
    shortDescEn: 'Any combination of 6 completed lines in any direction',
    playerVariants: [
      {
        title: 'አማራጭ 1 (2 ዲያጎናል + 2 አግድም + 2 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, true, false, true, true],
          [true, false, true, false, true],
          [true, true, false, true, true],
          [true, true, true, true, true],
        ],
        description: '2 ዲያጎናል፣ የውጨኛ 2 አግድም እና 2 የቆሙ መስመሮች',
      },
      {
        title: 'አማራጭ 2 (3 አግድም + 3 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, false, true, false, true],
          [true, true, true, true, true],
          [true, false, true, false, true],
          [true, true, true, true, true],
        ],
        description: '3 የተኙ እና 3 የቆሙ ፍርግርግ መስመሮች',
      },
      {
        title: 'አማራጭ 3 (1 ዲያጎናል + 3 አግድም + 2 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [false, true, true, true, false],
          [false, true, false, true, false],
          [true, true, true, true, true],
        ],
        description: '1 ዲያጎናል፣ 3 አግድም እና 2 የቆሙ መስመሮች',
      },
      {
        title: 'አማራጭ 4 (4 የቆሙ + 2 አግድም)',
        grid: [
          [true, true, false, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, false, true, true],
        ],
        description: '4 የቆሙ አምዶች ከ 2 አግድም ረድፎች ጋር',
      },
      {
        title: 'አማራጭ 5 (2 ዲያጎናል + 4 አግድም)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [false, false, true, false, false],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: '2 ዲያጎናል ከ 4 አግድም መስመሮች ጋር',
      },
      {
        title: 'አማራጭ 6 (2 ዲያጎናል + 4 የቆሙ)',
        grid: [
          [true, false, false, false, true],
          [true, true, false, true, true],
          [true, true, true, true, true],
          [true, true, false, true, true],
          [true, false, false, false, true],
        ],
        description: '2 ዲያጎናል ከ 4 የቆሙ አምዶች ጋር',
      },
    ],
    adminVariantsCount: 924,
    category: 'line',
  },
  {
    id: 'rule-9',
    ruleNumber: 9,
    code: 'SEVEN_LINES_ANY',
    nameAm: '7 መስመር ወደ ፈለጉት አቅጣጫ',
    nameEn: 'Any 7 Lines',
    shortDescAm: 'ማንኛውም 7 መስመሮች (በቆመ፣ በተኛ፣ ወይም በዲያጎናል)',
    shortDescEn: 'Any combination of 7 completed lines in any direction',
    playerVariants: [
      {
        title: 'አማራጭ 1 (2 ዲያጎናል + 3 አግድም + 2 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, true, false, true, true],
          [true, true, true, true, true],
          [true, true, false, true, true],
          [true, true, true, true, true],
        ],
        description: '2 ዲያጎናል፣ 3 አግድም እና 2 የቆሙ',
      },
      {
        title: 'አማራጭ 2 (4 አግድም + 3 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, false, true, false, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: '4 አግድም ረድፎች እና 3 የቆሙ አምዶች',
      },
      {
        title: 'አማራጭ 3 (5 አግድም + 2 ዲያጎናል)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: 'ሁሉም 5 አግድም እና ሁለቱ ዲያጎናሎች',
      },
      {
        title: 'አማራጭ 4 (5 የቆሙ + 2 ዲያጎናል)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: 'ሁሉም 5 የቆሙ እና ሁለቱ ዲያጎናሎች',
      },
      {
        title: 'አማራጭ 5 (1 ዲያጎናል + 3 አግድም + 3 የቆሙ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, false, true],
          [true, true, true, true, true],
          [true, false, true, true, true],
          [true, true, true, true, true],
        ],
        description: '1 ዲያጎናል፣ 3 አግድም እና 3 የቆሙ',
      },
      {
        title: 'አማራጭ 6 (2 ዲያጎናል + 5 አግድም/የቆመ ቅይጥ)',
        grid: [
          [true, false, true, false, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, false, true, false, true],
        ],
        description: 'መሃል የተጣመሩ 7 የቢንጎ መስመሮች',
      },
    ],
    adminVariantsCount: 792,
    category: 'line',
  },
  {
    id: 'rule-10',
    ruleNumber: 10,
    code: 'THREE_2X2_NO_3_CORNERS',
    nameAm: '(2×2) ስኴር የጋራ ነጥብ የሌለው 3 እና ከ3 የማዕዘናት ካስ ጋር የማይገናኙ',
    nameEn: '3 Disjoint 2x2 Squares avoiding 3 corners',
    shortDescAm: '3 ራሳቸውን የቻሉ ስኴሮች ቢያንስ 3 ማዕዘናትን የማይነኩ',
    shortDescEn: 'Three non-overlapping 2x2 squares avoiding at least 3 outer corners',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ስኴር 1 + ስኴር 2 + ስኴር 3 ከ F ጋር + 3 የማዕዘን ካሶች [0,0], [0,4], [4,0])',
        grid: [
          [true, true, true, false, true],
          [false, true, true, true, true],
          [false, true, true, true, true],
          [false, true, true, false, false],
          [true, false, false, false, false],
        ],
        description: '3 ራሳቸውን የቻሉ (2x2) ስኴሮች (ስኴር 3 F ን ያካትታል) እና 3 የማዕዘን ካሶች ([0,0], [0,4], [4,0]) ሙሉ በሙሉ ሳይገናኙ',
        shapeGroups: [
          { nameAm: 'ስኴር 1 (2x2)', nameEn: 'Square 1', color: 'sky', cells: [[0, 1], [0, 2], [1, 1], [1, 2]] },
          { nameAm: 'ስኴር 2 (2x2)', nameEn: 'Square 2', color: 'purple', cells: [[1, 3], [1, 4], [2, 3], [2, 4]] },
          { nameAm: 'ስኴር 3 (2x2 ከ F ጋር)', nameEn: 'Square 3 (with F)', color: 'amber', cells: [[2, 1], [2, 2], [3, 1], [3, 2]] },
          { nameAm: '3 የማዕዘን ካሶች', nameEn: '3 Corner Cells', color: 'rose', cells: [[0, 0], [0, 4], [4, 0]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ስኴር 1 + ስኴር 2 + ስኴር 3 ከ F ጋር + 3 የማዕዘን ካሶች [0,0], [0,4], [4,4])',
        grid: [
          [true, true, true, false, true],
          [false, true, true, false, false],
          [true, true, true, true, false],
          [true, true, true, true, false],
          [false, false, false, false, true],
        ],
        description: '3 ራሳቸውን የቻሉ ስኴሮች (ስኴር 3 ከ F ጋር) እና 3 የማዕዘን ካሶች ([0,0], [0,4], [4,4]) ሳይገናኙ',
        shapeGroups: [
          { nameAm: 'ስኴር 1 (2x2)', nameEn: 'Square 1', color: 'sky', cells: [[0, 1], [0, 2], [1, 1], [1, 2]] },
          { nameAm: 'ስኴር 2 (2x2)', nameEn: 'Square 2', color: 'purple', cells: [[2, 0], [2, 1], [3, 0], [3, 1]] },
          { nameAm: 'ስኴር 3 (2x2 ከ F ጋር)', nameEn: 'Square 3 (with F)', color: 'amber', cells: [[2, 2], [2, 3], [3, 2], [3, 3]] },
          { nameAm: '3 የማዕዘን ካሶች', nameEn: '3 Corner Cells', color: 'rose', cells: [[0, 0], [0, 4], [4, 4]] },
        ],
      },
      {
        title: 'አማራጭ 3 (ስኴር 1 + ስኴር 2 + ስኴር 3 ከ F ጋር + 3 የማዕዘን ካሶች [0,0], [4,0], [4,4])',
        grid: [
          [true, true, true, true, true],
          [false, true, true, true, true],
          [false, true, true, false, false],
          [false, true, true, false, false],
          [true, false, false, false, true],
        ],
        description: '3 ራሳቸውን የቻሉ ስኴሮች (ስኴር 3 ከ F ጋር) እና 3 የማዕዘን ካሶች ([0,0], [4,0], [4,4]) ሳይገናኙ',
        shapeGroups: [
          { nameAm: 'ስኴር 1 (2x2)', nameEn: 'Square 1', color: 'sky', cells: [[0, 1], [0, 2], [1, 1], [1, 2]] },
          { nameAm: 'ስኴር 2 (2x2)', nameEn: 'Square 2', color: 'purple', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'ስኴር 3 (2x2 ከ F ጋር)', nameEn: 'Square 3 (with F)', color: 'amber', cells: [[2, 1], [2, 2], [3, 1], [3, 2]] },
          { nameAm: '3 የማዕዘን ካሶች', nameEn: '3 Corner Cells', color: 'rose', cells: [[0, 0], [4, 0], [4, 4]] },
        ],
      },
      {
        title: 'አማራጭ 4 (ስኴር 1 + ስኴር 2 + ስኴር 3 ከ F ጋር + 3 የማዕዘን ካሶች [0,4], [4,0], [4,4])',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, false],
          [false, true, true, false, false],
          [false, true, true, false, false],
          [true, false, false, false, true],
        ],
        description: '3 ራሳቸውን የቻሉ ስኴሮች (ስኴር 3 ከ F ጋር) እና 3 የማዕዘን ካሶች ([0,4], [4,0], [4,4]) ሳይገናኙ',
        shapeGroups: [
          { nameAm: 'ስኴር 1 (2x2)', nameEn: 'Square 1', color: 'sky', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: 'ስኴር 2 (2x2)', nameEn: 'Square 2', color: 'purple', cells: [[0, 2], [0, 3], [1, 2], [1, 3]] },
          { nameAm: 'ስኴር 3 (2x2 ከ F ጋር)', nameEn: 'Square 3 (with F)', color: 'amber', cells: [[2, 1], [2, 2], [3, 1], [3, 2]] },
          { nameAm: '3 የማዕዘን ካሶች', nameEn: '3 Corner Cells', color: 'rose', cells: [[0, 4], [4, 0], [4, 4]] },
        ],
      },
      {
        title: 'አማራጭ 5 (ስኴር 1 + ስኴር 2 + ስኴር 3 ከ F ጋር + 3 የማዕዘን ካሶች [0,0], [0,4], [4,0])',
        grid: [
          [true, true, true, false, true],
          [false, true, true, false, false],
          [false, true, true, true, true],
          [false, true, true, true, true],
          [true, false, false, false, false],
        ],
        description: '3 ራሳቸውን የቻሉ ስኴሮች እና 3 የማዕዘን ካሶች ([0,0], [0,4], [4,0]) ሙሉ በሙሉ ሳይገናኙ',
        shapeGroups: [
          { nameAm: 'ስኴር 1 (2x2)', nameEn: 'Square 1', color: 'sky', cells: [[0, 1], [0, 2], [1, 1], [1, 2]] },
          { nameAm: 'ስኴር 2 (2x2)', nameEn: 'Square 2', color: 'purple', cells: [[2, 3], [2, 4], [3, 3], [3, 4]] },
          { nameAm: 'ስኴር 3 (2x2 ከ F ጋር)', nameEn: 'Square 3 (with F)', color: 'amber', cells: [[2, 1], [2, 2], [3, 1], [3, 2]] },
          { nameAm: '3 የማዕዘን ካሶች', nameEn: '3 Corner Cells', color: 'rose', cells: [[0, 0], [0, 4], [4, 0]] },
        ],
      },
      {
        title: 'አማራጭ 6 (ስኴር 1 + ስኴር 2 + ስኴር 3 ከ F ጋር + 3 የማዕዘን ካሶች [0,0], [4,0], [4,4])',
        grid: [
          [true, true, true, true, true],
          [false, true, true, true, true],
          [false, false, true, true, false],
          [false, false, true, true, false],
          [true, false, false, false, true],
        ],
        description: '3 ራሳቸውን የቻሉ ስኴሮች እና 3 የማዕዘን ካሶች ([0,0], [4,0], [4,4]) ሙሉ በሙሉ ሳይገናኙ',
        shapeGroups: [
          { nameAm: 'ስኴር 1 (2x2)', nameEn: 'Square 1', color: 'sky', cells: [[0, 1], [0, 2], [1, 1], [1, 2]] },
          { nameAm: 'ስኴር 2 (2x2)', nameEn: 'Square 2', color: 'purple', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'ስኴር 3 (2x2 ከ F ጋር)', nameEn: 'Square 3 (with F)', color: 'amber', cells: [[2, 2], [2, 3], [3, 2], [3, 3]] },
          { nameAm: '3 የማዕዘን ካሶች', nameEn: '3 Corner Cells', color: 'rose', cells: [[0, 0], [4, 0], [4, 4]] },
        ],
      },
    ],
    adminVariantsCount: 12,
    category: 'square',
  },
  {
    id: 'rule-11',
    ruleNumber: 11,
    code: 'BIG_CROSS',
    nameAm: 'ትልቁ መስቀል',
    nameEn: 'Big Cross',
    shortDescAm: 'መሀል መስቀል (1 አማራጭ ብቻ)',
    shortDescEn: 'Center cross pattern (+)',
    playerVariants: [
      {
        title: 'መሀል መስቀል (Center Cross)',
        grid: [
          [false, false, true, false, false],
          [false, false, true, false, false],
          [true,  true,  true, true,  true],
          [false, false, true, false, false],
          [false, false, true, false, false],
        ],
        description: 'መካከለኛው አምድ N እና ረድፍ 3 አንድ ላይ ተደምረው (+)',
      },
    ],
    adminVariantsCount: 1,
    category: 'shape',
  },
  {
    id: 'rule-12',
    ruleNumber: 12,
    code: 'LETTER_H',
    nameAm: 'ትልቁ H',
    nameEn: 'Big Letter H',
    shortDescAm: 'ቋሚ ወይም አግድም H (2 አማራጮች)',
    shortDescEn: 'Vertical or horizontal letter H (2 variations)',
    playerVariants: [
      {
        title: 'ቋሚ H (Vertical H)',
        grid: [
          [true, false, false, false, true],
          [true, false, false, false, true],
          [true, true,  true,  true,  true],
          [true, false, false, false, true],
          [true, false, false, false, true],
        ],
        description: 'አምድ B እና O ሙሉ ሆነው በመካከለኛው መስመር የተገናኙ',
      },
      {
        title: 'አግድም H (Horizontal H)',
        grid: [
          [true,  true,  true,  true,  true],
          [false, false, true,  false, false],
          [false, false, true,  false, false],
          [false, false, true,  false, false],
          [true,  true,  true,  true,  true],
        ],
        description: 'የላይ እና የታች ረድፎች በመካከለኛው አምድ N የተገናኙ',
      },
    ],
    adminVariantsCount: 2,
    category: 'shape',
  },
  {
    id: 'rule-13',
    ruleNumber: 13,
    code: 'BIG_LETTER_O_FRAME',
    nameAm: 'ትልቁ O ፊደል / ፍሬም (Big Letter O / Frame)',
    nameEn: 'Big Letter O / Outer Frame',
    shortDescAm: 'የውጭ ዙሪያ 16 ካሶች ሙሉ ፍሬም (1 አማራጭ ብቻ)',
    shortDescEn: 'All 16 perimeter edge cells (Only 1 option)',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትልቁ O ፊደል / የውጭ ፍሬም)',
        grid: [
          [true, true, true, true, true],
          [true, false, false, false, true],
          [true, false, false, false, true],
          [true, false, false, false, true],
          [true, true, true, true, true],
        ],
        description: 'የውጭ 16ቱ ካሶች ዙሪያውን ፍሬም የሰሩበት (መሃሉ ክፍት)',
      },
    ],
    adminVariantsCount: 1,
    category: 'shape',
  },
  {
    id: 'rule-14',
    ruleNumber: 14,
    code: 'BIG_X',
    nameAm: 'ትልቁ X',
    nameEn: 'Big Letter X',
    shortDescAm: 'ዋና ዲያጎናል X (1 አማራጭ ብቻ)',
    shortDescEn: 'Main diagonals forming X pattern (1 option)',
    playerVariants: [
      {
        title: 'ዋና ዲያጎናል X (Main X)',
        grid: [
          [true,  false, false, false, true],
          [false, true,  false, true,  false],
          [false, false, true,  false, false],
          [false, true,  false, true,  false],
          [true,  false, false, false, true],
        ],
        description: 'ሁለቱም ዋና ዲያጎናል መስመሮች ተገናኝተው X ሲሰሩ',
      },
    ],
    adminVariantsCount: 1,
    category: 'shape',
  },
  {
    id: 'rule-15',
    ruleNumber: 15,
    code: 'FOUR_CORNERS_CENTER',
    nameAm: '4ቱ ማዕዘናት እና መካከለኛው F (4 Corners + Center)',
    nameEn: 'Four Corners and Center',
    shortDescAm: '4ቱ የካርቴላው ጥጎች እና መካከለኛው F (1 አማራጭ)',
    shortDescEn: '4 outermost corners plus the central Free space',
    playerVariants: [
      {
        title: 'አማራጭ 1 (4 ማዕዘናት እና ነፃ ካስ)',
        grid: [
          [true, false, false, false, true],
          [false, false, false, false, false],
          [false, false, true, false, false],
          [false, false, false, false, false],
          [true, false, false, false, true],
        ],
        description: '4ቱ የካርቴላው ጥጎች እና መካከለኛው F',
      },
    ],
    adminVariantsCount: 1,
    category: 'special',
  },
  {
    id: 'rule-16',
    ruleNumber: 16,
    code: 'FULL_HOUSE_BLACKOUT',
    nameAm: 'ሙሉ ቤት (Full House / 25 ካስ)',
    nameEn: 'Full House / Blackout',
    shortDescAm: 'ሁሉንም 25 ካሶች ሙሉ በሙሉ መሙላት (1 አማራጭ)',
    shortDescEn: 'All 25 spaces on the cartela must be covered',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ሙሉ ቤት / 25 ካስ)',
        grid: [
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
          [true, true, true, true, true],
        ],
        description: 'ሁሉንም 25 ካሶች ሙሉ በሙሉ መሙላት',
      },
    ],
    adminVariantsCount: 1,
    category: 'special',
  },
  {
    id: 'rule-17',
    ruleNumber: 17,
    code: 'TWO_SMALL_CROSSES_2_CORNERS',
    nameAm: 'ትናንሽ 2 መስቀሎች ከ2 የመአዝን ካስ የማይገናኙ',
    nameEn: 'Two Small Crosses and 2 Corner Cells Disjoint',
    shortDescAm: 'ሁለት ትናንሽ መስቀሎች እና 2 የማዕዘን ካሶች የጋራ ነጥብ የሌላቸው (ከ F ጋር ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'Two small crosses and 2 corner cells disjoint with no overlapping cells and central F',
    playerVariants: [
      {
        title: 'አማራጭ 1 (መስቀል 1 ከላይ ግራ + መስቀል 2 ከታች ቀኝ + 2 የማዕዘን ካሶች [0,4] እና [4,0])',
        grid: [
          [false, true, false, false, true],
          [true, true, true, false, false],
          [false, true, true, true, false],
          [false, false, true, true, true],
          [true, false, false, true, false],
        ],
        description: 'ሁለት ትናንሽ መስቀሎች፣ ሁለት የማዕዘን ካሶች ([0,4], [4,0]) እና ማዕከላዊ F ያለ መደራረብ',
        shapeGroups: [
          { nameAm: 'ትንሽ መስቀል 1', nameEn: 'Small Cross 1', color: 'sky', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
          { nameAm: 'ትንሽ መስቀል 2', nameEn: 'Small Cross 2', color: 'amber', cells: [[2, 3], [3, 2], [3, 3], [3, 4], [4, 3]] },
          { nameAm: '2 የማዕዘን ካሶች', nameEn: '2 Corner Cells', color: 'rose', cells: [[0, 4], [4, 0]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (መስቀል 1 ከላይ ቀኝ + መስቀል 2 ከታች ግራ + 2 የማዕዘን ካሶች [0,0] እና [4,4])',
        grid: [
          [true, false, false, true, false],
          [false, false, true, true, true],
          [false, true, true, true, false],
          [true, true, true, false, false],
          [false, true, false, false, true],
        ],
        description: 'ሁለት ትናንሽ መስቀሎች በዲያጎናል፣ ሁለት የማዕዘን ካሶች ([0,0], [4,4]) እና ማዕከላዊ F',
        shapeGroups: [
          { nameAm: 'ትንሽ መስቀል 1', nameEn: 'Small Cross 1', color: 'sky', cells: [[0, 3], [1, 2], [1, 3], [1, 4], [2, 3]] },
          { nameAm: 'ትንሽ መስቀል 2', nameEn: 'Small Cross 2', color: 'amber', cells: [[2, 1], [3, 0], [3, 1], [3, 2], [4, 1]] },
          { nameAm: '2 የማዕዘን ካሶች', nameEn: '2 Corner Cells', color: 'rose', cells: [[0, 0], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (መስቀል 1 ከላይ ግራ + መስቀል 2 ከታች ቀኝ + 2 የማዕዘን ካሶች [0,0] እና [4,4])',
        grid: [
          [true, true, false, false, false],
          [true, true, true, false, false],
          [false, true, true, true, false],
          [false, false, true, true, true],
          [false, false, false, true, true],
        ],
        description: 'ሁለት ትናንሽ መስቀሎች እና ሁለት የማዕዘን ካሶች ([0,0], [4,4]) ሙሉ በሙሉ የማይገናኙ',
        shapeGroups: [
          { nameAm: 'ትንሽ መስቀል 1', nameEn: 'Small Cross 1', color: 'sky', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
          { nameAm: 'ትንሽ መስቀል 2', nameEn: 'Small Cross 2', color: 'amber', cells: [[2, 3], [3, 2], [3, 3], [3, 4], [4, 3]] },
          { nameAm: '2 የማዕዘን ካሶች', nameEn: '2 Corner Cells', color: 'rose', cells: [[0, 0], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (መስቀል 1 ከላይ ቀኝ + መስቀል 2 ከታች ግራ + 2 የማዕዘን ካሶች [0,4] እና [4,0])',
        grid: [
          [false, false, false, true, true],
          [false, false, true, true, true],
          [false, true, true, true, false],
          [true, true, true, false, false],
          [true, true, false, false, false],
        ],
        description: 'ሁለት መስቀሎች ከተቃራኒ 2 የማዕዘን ካሶች ጋር',
        shapeGroups: [
          { nameAm: 'ትንሽ መስቀል 1', nameEn: 'Small Cross 1', color: 'sky', cells: [[0, 3], [1, 2], [1, 3], [1, 4], [2, 3]] },
          { nameAm: 'ትንሽ መስቀል 2', nameEn: 'Small Cross 2', color: 'amber', cells: [[2, 1], [3, 0], [3, 1], [3, 2], [4, 1]] },
          { nameAm: '2 የማዕዘን ካሶች', nameEn: '2 Corner Cells', color: 'rose', cells: [[0, 4], [4, 0]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 5 (መስቀል 1 ከላይ ግራ + መስቀል 2 ከታች ቀኝ + 2 የቀኝ ማዕዘናት [0,4] እና [4,4])',
        grid: [
          [false, true, false, false, true],
          [true, true, true, false, false],
          [false, true, true, true, false],
          [false, false, true, true, true],
          [false, false, false, true, true],
        ],
        description: 'ሁለት ትናንሽ መስቀሎች እና ሁለት የማዕዘን ካሶች በቀኝ ጥግ',
        shapeGroups: [
          { nameAm: 'ትንሽ መስቀል 1', nameEn: 'Small Cross 1', color: 'sky', cells: [[0, 1], [1, 0], [1, 1], [1, 2], [2, 1]] },
          { nameAm: 'ትንሽ መስቀል 2', nameEn: 'Small Cross 2', color: 'amber', cells: [[2, 3], [3, 2], [3, 3], [3, 4], [4, 3]] },
          { nameAm: '2 የማዕዘን ካሶች', nameEn: '2 Corner Cells', color: 'rose', cells: [[0, 4], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 16,
    category: 'shape',
  },
  {
    id: 'rule-18',
    ruleNumber: 18,
    code: 'SMALL_H_TWO_2X2_DISJOINT',
    nameAm: 'ትንሽ H እና 2×2 ስኴር 2 የማይገናኙ',
    nameEn: 'Small H and Two 2x2 Squares Disjoint',
    shortDescAm: 'አንድ ትንሽ H እና ሁለት 2x2 ስኴሮች የጋራ ነጥብ የሌላቸው (ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'One small letter H and two 2x2 squares with no overlapping cells in any direction',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትንሽ H በግራ + 2 ስኴሮች በቀኝ)',
        grid: [
          [true, false, true, true, true],
          [true, true, true, true, true],
          [true, false, true, false, false],
          [false, false, false, true, true],
          [false, false, false, true, true],
        ],
        description: 'ትንሽ H በግራ በኩል ከሁለት 2x2 ስኴሮች ጋር ያለ መደራረብ (ከ F ጋር)',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2], [1, 1]] },
          { nameAm: '2x2 ስኴር 1', nameEn: 'Square 1', color: 'amber', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: '2x2 ስኴር 2', nameEn: 'Square 2', color: 'rose', cells: [[3, 3], [3, 4], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ትንሽ H በቀኝ + 2 ስኴሮች በግራ)',
        grid: [
          [true, true, true, false, true],
          [true, true, true, true, true],
          [false, false, true, false, true],
          [true, true, false, false, false],
          [true, true, false, false, false],
        ],
        description: 'ትንሽ H በቀኝ በኩል እና ሁለት 2x2 ስኴሮች በግራ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[0, 2], [1, 2], [2, 2], [0, 4], [1, 4], [2, 4], [1, 3]] },
          { nameAm: '2x2 ስኴር 1', nameEn: 'Square 1', color: 'amber', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: '2x2 ስኴር 2', nameEn: 'Square 2', color: 'rose', cells: [[3, 0], [3, 1], [4, 0], [4, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (ትንሽ H በታች ግራ + 2 ስኴሮች ከላይ)',
        grid: [
          [true, true, false, true, true],
          [true, true, false, true, true],
          [true, false, true, false, false],
          [true, true, true, false, false],
          [true, false, true, false, false],
        ],
        description: 'ትንሽ H በታች ግራ እና ሁለት 2x2 ስኴሮች ከላይ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[2, 0], [3, 0], [4, 0], [2, 2], [3, 2], [4, 2], [3, 1]] },
          { nameAm: '2x2 ስኴር 1', nameEn: 'Square 1', color: 'amber', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: '2x2 ስኴር 2', nameEn: 'Square 2', color: 'rose', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (ትንሽ H በታች ቀኝ + 2 ስኴሮች ከላይ)',
        grid: [
          [true, true, false, true, true],
          [true, true, false, true, true],
          [false, false, true, false, true],
          [false, false, true, true, true],
          [false, false, true, false, true],
        ],
        description: 'ትንሽ H በታች ቀኝ እና ሁለት 2x2 ስኴሮች ከላይ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[2, 2], [3, 2], [4, 2], [2, 4], [3, 4], [4, 4], [3, 3]] },
          { nameAm: '2x2 ስኴር 1', nameEn: 'Square 1', color: 'amber', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: '2x2 ስኴር 2', nameEn: 'Square 2', color: 'rose', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 24,
    category: 'shape',
  },
  {
    id: 'rule-19',
    ruleNumber: 19,
    code: 'BIG_T_AND_DIAGONAL',
    nameAm: 'ትልቁ T እና 1 ዲያጎናል',
    nameEn: 'Big Letter T and 1 Diagonal Line',
    shortDescAm: 'ትልቁ የ T ፊደል ከአንድ ዲያጎናል መስመር ጋር (ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'Big letter T pattern combined with any 1 complete diagonal line in any direction',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትልቁ T ወደታች + ዋና ዲያጎናል)',
        grid: [
          [true, true, true, true, true],
          [false, true, true, false, false],
          [false, false, true, false, false],
          [false, false, true, true, false],
          [false, false, true, false, true],
        ],
        description: 'የላይኛው አግድም T ከመሃል አምድ እና ዋና ዲያጎናል ጋር ከ F ጋር',
        shapeGroups: [
          { nameAm: 'ትልቁ T', nameEn: 'Big T', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 2], [3, 2], [4, 2]] },
          { nameAm: '1 ዲያጎናል', nameEn: '1 Diagonal', color: 'amber', cells: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ትልቁ T ወደታች + ተቃራኒ ዲያጎናል)',
        grid: [
          [true, true, true, true, true],
          [false, false, true, true, false],
          [false, false, true, false, false],
          [false, true, true, false, false],
          [true, false, true, false, false],
        ],
        description: 'ትልቁ T ከተቃራኒ ዲያጎናል ጋር',
        shapeGroups: [
          { nameAm: 'ትልቁ T', nameEn: 'Big T', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [2, 2], [3, 2], [4, 2]] },
          { nameAm: 'ተቃራኒ ዲያጎናል', nameEn: 'Anti Diagonal', color: 'amber', cells: [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (የተገላበጠ T ወደላይ + ዋና ዲያጎናል)',
        grid: [
          [true, false, true, false, false],
          [false, true, true, false, false],
          [false, false, true, false, false],
          [false, false, true, true, false],
          [true, true, true, true, true],
        ],
        description: 'የታችኛው አግድም T ከመሃል አምድ እና ዲያጎናል ጋር',
        shapeGroups: [
          { nameAm: 'የተገላበጠ T', nameEn: 'Inverted Big T', color: 'sky', cells: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4], [0, 2], [1, 2], [2, 2], [3, 2]] },
          { nameAm: 'ዲያጎናል', nameEn: 'Diagonal', color: 'amber', cells: [[0, 0], [1, 1], [2, 2], [3, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (ወደ ቀኝ የዞረ T + ተቃራኒ ዲያጎናል)',
        grid: [
          [true, false, false, false, true],
          [true, false, false, true, false],
          [true, true, true, true, true],
          [true, true, false, false, false],
          [true, false, false, false, false],
        ],
        description: 'ወደ ጎን የዞረ ትልቁ T ከተቃራኒ ዲያጎናል ጋር',
        shapeGroups: [
          { nameAm: 'ወደ ጎን የዞረ T', nameEn: 'Sideways T', color: 'sky', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [2, 1], [2, 2], [2, 3], [2, 4]] },
          { nameAm: 'ዲያጎናል', nameEn: 'Diagonal', color: 'amber', cells: [[0, 4], [1, 3], [2, 2], [3, 1], [4, 0]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 8,
    category: 'shape',
  },
  {
    id: 'rule-20',
    ruleNumber: 20,
    code: 'BIG_Y_AND_2X2_DISJOINT',
    nameAm: 'ትልቁ Y እና 2×2 ስኴር 1 የማይገናኙ',
    nameEn: 'Big Letter Y and One 2x2 Square Disjoint',
    shortDescAm: 'ትልቁ የ Y ፊደል እና አንድ 2x2 ስኴር የጋራ ነጥብ የሌላቸው (ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'Big letter Y pattern and one disjoint 2x2 square with no overlapping cells in any direction',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትልቁ Y ወደላይ + ስኴር በታች ግራ)',
        grid: [
          [true, false, false, false, true],
          [false, true, false, true, false],
          [false, false, true, false, false],
          [true, true, true, false, false],
          [true, true, true, false, false],
        ],
        description: 'ትልቁ Y ፊደል ከታችኛው ግራ 2x2 ስኴር ጋር ያለ መደራረብ (ከ F ጋር)',
        shapeGroups: [
          { nameAm: 'ትልቁ Y', nameEn: 'Big Y', color: 'sky', cells: [[0, 0], [1, 1], [0, 4], [1, 3], [2, 2], [3, 2], [4, 2]] },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: [[3, 0], [3, 1], [4, 0], [4, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ትልቁ Y ወደላይ + ስኴር በታች ቀኝ)',
        grid: [
          [true, false, false, false, true],
          [false, true, false, true, false],
          [false, false, true, false, false],
          [false, false, true, true, true],
          [false, false, true, true, true],
        ],
        description: 'ትልቁ Y ከታችኛው ቀኝ 2x2 ስኴር ጋር',
        shapeGroups: [
          { nameAm: 'ትልቁ Y', nameEn: 'Big Y', color: 'sky', cells: [[0, 0], [1, 1], [0, 4], [1, 3], [2, 2], [3, 2], [4, 2]] },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: [[3, 3], [3, 4], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (የተገላበጠ Y + ስኴር ከላይ ግራ)',
        grid: [
          [true, true, true, false, false],
          [true, true, true, false, false],
          [false, false, true, false, false],
          [false, true, false, true, false],
          [true, false, false, false, true],
        ],
        description: 'የተገላበጠ Y ፊደል ከላይኛው ግራ 2x2 ስኴር ጋር',
        shapeGroups: [
          { nameAm: 'የተገላበጠ Y', nameEn: 'Inverted Y', color: 'sky', cells: [[0, 2], [1, 2], [2, 2], [3, 1], [4, 0], [3, 3], [4, 4]] },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (የተገላበጠ Y + ስኴር ከላይ ቀኝ)',
        grid: [
          [false, false, true, true, true],
          [false, false, true, true, true],
          [false, false, true, false, false],
          [false, true, false, true, false],
          [true, false, false, false, true],
        ],
        description: 'የተገላበጠ Y ፊደል ከላይኛው ቀኝ 2x2 ስኴር ጋር',
        shapeGroups: [
          { nameAm: 'የተገላበጠ Y', nameEn: 'Inverted Y', color: 'sky', cells: [[0, 2], [1, 2], [2, 2], [3, 1], [4, 0], [3, 3], [4, 4]] },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 16,
    category: 'shape',
  },
  {
    id: 'rule-21',
    ruleNumber: 21,
    code: 'SMALL_H_2X2_SMALL_T_DISJOINT',
    nameAm: 'ትንሽ H እና 2×2 ስኴር 1 እና ትንሽ T 1 የማይገናኙ',
    nameEn: 'Small H, One 2x2 Square, and One Small T Disjoint',
    shortDescAm: 'ትንሽ H፣ 2x2 ስኴር 1 እና ትንሽ T 1 (3x3) የጋራ ነጥብ የሌላቸው (ከ F ጋር ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'One small H, one 2x2 square, and one small T (3x3) with no common points and central F',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትንሽ H በግራ + ስኴር ከላይ ቀኝ + 3x3 ትንሽ T በታች ቀኝ)',
        grid: [
          [true, false, true, true, true],
          [true, true, true, true, true],
          [true, false, true, true, false],
          [false, false, false, true, false],
          [false, false, true, true, true],
        ],
        description: 'ትንሽ H፣ 2x2 ስኴር እና 3x3 ትንሽ T ያለ ምንም መደራረብ (ከ F ጋር)',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2], [1, 1]] },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: [[0, 3], [0, 4], [1, 3], [1, 4]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'rose', cells: [[4, 2], [4, 3], [4, 4], [3, 3], [2, 3]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ትንሽ H በታች ግራ + ስኴር በታች ቀኝ + 3x3 ትንሽ T ከላይ ቀኝ)',
        grid: [
          [false, false, true, true, true],
          [false, false, false, true, false],
          [true, false, true, true, false],
          [true, true, true, true, true],
          [true, false, true, true, true],
        ],
        description: 'ትንሽ H በታች ግራ፣ ስኴር በታች ቀኝ እና 3x3 ትንሽ T ከላይ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[2, 0], [3, 0], [4, 0], [2, 2], [3, 2], [4, 2], [3, 1]] },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: [[3, 3], [3, 4], [4, 3], [4, 4]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'rose', cells: [[0, 2], [0, 3], [0, 4], [1, 3], [2, 3]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (ትንሽ H በቀኝ + ስኴር ከላይ ግራ + 3x3 ትንሽ T በታች ግራ)',
        grid: [
          [true, true, true, false, true],
          [true, true, true, true, true],
          [false, true, true, false, true],
          [false, true, false, false, false],
          [true, true, true, false, false],
        ],
        description: 'ትንሽ H በቀኝ፣ ስኴር ከላይ ግራ እና 3x3 ትንሽ T በታች ግራ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[0, 2], [1, 2], [2, 2], [0, 4], [1, 4], [2, 4], [1, 3]] },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: [[0, 0], [0, 1], [1, 0], [1, 1]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'rose', cells: [[4, 0], [4, 1], [4, 2], [3, 1], [2, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (ትንሽ H በታች ቀኝ + ስኴር በታች ግራ + 3x3 ትንሽ T ከላይ ግራ)',
        grid: [
          [true, true, true, false, false],
          [false, true, false, false, false],
          [false, true, true, false, true],
          [true, true, true, true, true],
          [true, true, true, false, true],
        ],
        description: 'ትንሽ H በታች ቀኝ፣ ስኴር በታች ግራ እና 3x3 ትንሽ T ከላይ ግራ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[2, 2], [3, 2], [4, 2], [2, 4], [3, 4], [4, 4], [3, 3]] },
          { nameAm: '2x2 ስኴር', nameEn: '2x2 Square', color: 'amber', cells: [[3, 0], [3, 1], [4, 0], [4, 1]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'rose', cells: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 32,
    category: 'shape',
  },
  {
    id: 'rule-22',
    ruleNumber: 22,
    code: 'TWO_PARALLEL_LINES',
    nameAm: '2 ትይዩ የሆኑ መስመሮች',
    nameEn: 'Two Parallel Lines Any Direction',
    shortDescAm: 'ማንኛውም 2 ትይዩ የሆኑ መስመሮች (አግድም፣ ቁመት ወይም ዲያጎናል ከ F ጋር)',
    shortDescEn: 'Any two parallel lines across the board with central F',
    playerVariants: [
      {
        title: 'አማራጭ 1 (2 የውጨኛ አግድም ትይዩ መስመሮች: ረድፍ 1 እና ረድፍ 5)',
        grid: [
          [true, true, true, true, true],
          [false, false, false, false, false],
          [false, false, true, false, false],
          [false, false, false, false, false],
          [true, true, true, true, true],
        ],
        description: 'የላይኛው እና የታችኛው አግድም ትይዩ መስመሮች ከ F ጋር',
        shapeGroups: [
          { nameAm: 'ትይዩ መስመር 1 (ላይ)', nameEn: 'Parallel Line 1 (Top)', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]] },
          { nameAm: 'ትይዩ መስመር 2 (ታች)', nameEn: 'Parallel Line 2 (Bottom)', color: 'amber', cells: [[4, 0], [4, 1], [4, 2], [4, 3], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (2 የውጨኛ የቆሙ ትይዩ መስመሮች: አምድ B እና አምድ O)',
        grid: [
          [true, false, false, false, true],
          [true, false, false, false, true],
          [true, false, true, false, true],
          [true, false, false, false, true],
          [true, false, false, false, true],
        ],
        description: 'አምድ B እና አምድ O የቆሙ ትይዩ መስመሮች',
        shapeGroups: [
          { nameAm: 'ትይዩ መስመር 1 (ግራ)', nameEn: 'Parallel Line 1 (Left)', color: 'sky', cells: [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]] },
          { nameAm: 'ትይዩ መስመር 2 (ቀኝ)', nameEn: 'Parallel Line 2 (Right)', color: 'amber', cells: [[0, 4], [1, 4], [2, 4], [3, 4], [4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (2 የውስጥ አግድም ትይዩ መስመሮች: ረድፍ 2 እና ረድፍ 4)',
        grid: [
          [false, false, false, false, false],
          [true, true, true, true, true],
          [false, false, true, false, false],
          [true, true, true, true, true],
          [false, false, false, false, false],
        ],
        description: 'ረድፍ 2 እና ረድፍ 4 አግድም ትይዩ መስመሮች',
        shapeGroups: [
          { nameAm: 'ትይዩ መስመር 1', nameEn: 'Parallel Line 1', color: 'sky', cells: [[1, 0], [1, 1], [1, 2], [1, 3], [1, 4]] },
          { nameAm: 'ትይዩ መስመር 2', nameEn: 'Parallel Line 2', color: 'amber', cells: [[3, 0], [3, 1], [3, 2], [3, 3], [3, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (2 የውስጥ የቆሙ ትይዩ መስመሮች: አምድ I እና አምድ G)',
        grid: [
          [false, true, false, true, false],
          [false, true, false, true, false],
          [false, true, true, true, false],
          [false, true, false, true, false],
          [false, true, false, true, false],
        ],
        description: 'አምድ I እና አምድ G የቆሙ ትይዩ መስመሮች',
        shapeGroups: [
          { nameAm: 'ትይዩ መስመር 1', nameEn: 'Parallel Line 1', color: 'sky', cells: [[0, 1], [1, 1], [2, 1], [3, 1], [4, 1]] },
          { nameAm: 'ትይዩ መስመር 2', nameEn: 'Parallel Line 2', color: 'amber', cells: [[0, 3], [1, 3], [2, 3], [3, 3], [4, 3]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 20,
    category: 'line',
  },
  {
    id: 'rule-23',
    ruleNumber: 23,
    code: 'SMALL_H_AND_3X2_DISJOINT',
    nameAm: 'ትንሽ H እና 3×2 ስኴር/ሬክታንግል 1 የማይገናኙ',
    nameEn: 'Small H and One 3x2 Rectangle Disjoint',
    shortDescAm: 'ትንሽ H እና አንድ 3x2 ስኴር/ሬክታንግል የጋራ ነጥብ የሌላቸው (ከ F ጋር ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'One small letter H and one 3x2 rectangle with no common cells and central F',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትንሽ H በግራ + 3x2 ሬክታንግል በቀኝ)',
        grid: [
          [true, false, true, true, true],
          [true, true, true, true, true],
          [true, false, true, true, true],
          [false, false, false, false, false],
          [false, false, false, false, false],
        ],
        description: 'ትንሽ H በግራ እና 3x2 ሬክታንግል በቀኝ በኩል ያለ መደራረብ (ከ F ጋር)',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[0, 0], [1, 0], [2, 0], [0, 2], [1, 2], [2, 2], [1, 1]] },
          { nameAm: '3x2 ሬክታንግል', nameEn: '3x2 Rectangle', color: 'amber', cells: [[0, 3], [0, 4], [1, 3], [1, 4], [2, 3], [2, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ትንሽ H በቀኝ + 3x2 ሬክታንግል በግራ)',
        grid: [
          [true, true, true, false, true],
          [true, true, true, true, true],
          [true, true, true, false, true],
          [false, false, false, false, false],
          [false, false, false, false, false],
        ],
        description: 'ትንሽ H በቀኝ እና 3x2 በግራ ያለ መደራረብ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[0, 2], [1, 2], [2, 2], [0, 4], [1, 4], [2, 4], [1, 3]] },
          { nameAm: '3x2 ሬክታንግል', nameEn: '3x2 Rectangle', color: 'amber', cells: [[0, 0], [0, 1], [1, 0], [1, 1], [2, 0], [2, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (ትንሽ H በታች ግራ + 3x2 ሬክታንግል ከላይ ግራ)',
        grid: [
          [true, true, true, false, false],
          [true, true, true, false, false],
          [true, false, true, false, false],
          [true, true, true, false, false],
          [true, false, true, false, false],
        ],
        description: 'ትንሽ H በታች ግራ እና 2x3 አግድም ሬክታንግል ከላይ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[2, 0], [3, 0], [4, 0], [2, 2], [3, 2], [4, 2], [3, 1]] },
          { nameAm: '3x2 ሬክታንግል', nameEn: '3x2 Rectangle', color: 'amber', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (ትንሽ H በታች ቀኝ + 3x2 ሬክታንግል በታች ግራ)',
        grid: [
          [false, false, false, false, false],
          [false, false, false, false, false],
          [true, true, true, false, true],
          [true, true, true, true, true],
          [true, true, true, false, true],
        ],
        description: 'ትንሽ H በታች ቀኝ እና 3x2 በታች ግራ',
        shapeGroups: [
          { nameAm: 'ትንሽ H', nameEn: 'Small H', color: 'sky', cells: [[2, 2], [3, 2], [4, 2], [2, 4], [3, 4], [4, 4], [3, 3]] },
          { nameAm: '3x2 ሬክታንግል', nameEn: '3x2 Rectangle', color: 'amber', cells: [[2, 0], [2, 1], [3, 0], [3, 1], [4, 0], [4, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 20,
    category: 'square',
  },
  {
    id: 'rule-24',
    ruleNumber: 24,
    code: 'TRIANGLE_3X3_SMALL_T_CORNER_DISJOINT',
    nameAm: '(3×3) ትርያንግል 1 እና ትንሽ T 1 እና የማዕዘን ካስ 1 የማይገናኙ',
    nameEn: '3x3 Triangle, Small T, and One Corner Cell Disjoint',
    shortDescAm: 'አንድ 3x3 ትርያንግል፣ ትንሽ T 1 (3x3) እና 1 የማዕዘን ካስ የጋራ ነጥብ የሌላቸው (ከ F ጋር ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'One 3x3 triangle, one small T (3x3), and one outer corner cell with no overlapping cells and central F',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትርያንግል ከላይ ግራ + 3x3 ትንሽ T በታች ቀኝ + የማዕዘን ካስ [0,4])',
        grid: [
          [true, true, true, false, true],
          [true, true, false, false, false],
          [true, false, true, true, false],
          [false, false, false, true, false],
          [false, false, true, true, true],
        ],
        description: '3x3 ትርያንግል፣ 3x3 ትንሽ T፣ አንድ የማዕዘን ካስ ([0,4]) እና ማዕከላዊ F ያለ መደራረብ',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል', nameEn: '3x3 Triangle', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'amber', cells: [[4, 2], [4, 3], [4, 4], [3, 3], [2, 3]] },
          { nameAm: 'የማዕዘን ካስ [0,4]', nameEn: 'Corner Cell [0,4]', color: 'rose', cells: [[0, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ትርያንግል ከታች ቀኝ + 3x3 ትንሽ T ከላይ ግራ + የማዕዘን ካስ [4,0])',
        grid: [
          [true, true, true, false, false],
          [false, true, false, false, false],
          [false, true, true, false, true],
          [false, false, false, true, true],
          [true, false, true, true, true],
        ],
        description: 'ትርያንግል ከታች ቀኝ፣ 3x3 ትንሽ T ከላይ ግራ እና የማዕዘን ካስ [4,0]',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል', nameEn: '3x3 Triangle', color: 'sky', cells: [[4, 4], [4, 3], [4, 2], [3, 4], [3, 3], [2, 4]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'amber', cells: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },
          { nameAm: 'የማዕዘን ካስ [4,0]', nameEn: 'Corner Cell [4,0]', color: 'rose', cells: [[4, 0]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (ትርያንግል ከላይ ቀኝ + 3x3 ትንሽ T በታች ግራ + የማዕዘን ካስ [0,0])',
        grid: [
          [true, false, true, true, true],
          [false, false, false, true, true],
          [false, true, true, false, true],
          [false, true, false, false, false],
          [true, true, true, false, false],
        ],
        description: 'ትርያንግል ከላይ ቀኝ፣ 3x3 ትንሽ T በታች ግራ እና የማዕዘን ካስ [0,0]',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል', nameEn: '3x3 Triangle', color: 'sky', cells: [[0, 2], [0, 3], [0, 4], [1, 3], [1, 4], [2, 4]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'amber', cells: [[4, 0], [4, 1], [4, 2], [3, 1], [2, 1]] },
          { nameAm: 'የማዕዘን ካስ [0,0]', nameEn: 'Corner Cell [0,0]', color: 'rose', cells: [[0, 0]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (ትርያንግል ከታች ግራ + 3x3 ትንሽ T ከላይ ቀኝ + የማዕዘን ካስ [4,4])',
        grid: [
          [false, false, true, true, true],
          [false, false, false, true, false],
          [true, false, true, true, false],
          [true, true, false, false, false],
          [true, true, true, false, true],
        ],
        description: 'ትርያንግል ከታች ግራ፣ 3x3 ትንሽ T ከላይ ቀኝ እና የማዕዘን ካስ [4,4]',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል', nameEn: '3x3 Triangle', color: 'sky', cells: [[2, 0], [3, 0], [4, 0], [3, 1], [4, 1], [4, 2]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'amber', cells: [[0, 2], [0, 3], [0, 4], [1, 3], [2, 3]] },
          { nameAm: 'የማዕዘን ካስ [4,4]', nameEn: 'Corner Cell [4,4]', color: 'rose', cells: [[4, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 24,
    category: 'shape',
  },
  {
    id: 'rule-25',
    ruleNumber: 25,
    code: 'SMALL_CROSS_SMALL_T_TRIANGLE_DISJOINT',
    nameAm: 'ትንሽ መስቀል 1 እና ትንሽ T 1 እና (3×3) ትርያንግል 1 የማይገናኙ',
    nameEn: 'Small Cross, Small T, and 3x3 Triangle Disjoint',
    shortDescAm: 'አንድ ትንሽ መስቀል፣ ትንሽ T 1 (3x3) እና 3x3 ትርያንግል 1 የጋራ ነጥብ የሌላቸው (ከ F ጋር ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'One small cross, one small T (3x3), and one 3x3 triangle with no common cells and central F',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትርያንግል ከላይ ግራ + መስቀል በታች ግራ + 3x3 ትንሽ T በቀኝ)',
        grid: [
          [true, true, true, false, true],
          [true, true, true, true, true],
          [true, true, true, false, true],
          [true, true, true, false, false],
          [false, true, false, false, false],
        ],
        description: '3x3 ትርያንግል፣ ትንሽ መስቀል እና 3x3 ትንሽ T ያለ መደራረብ (ከ F ጋር)',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል', nameEn: '3x3 Triangle', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]] },
          { nameAm: 'ትንሽ መስቀል', nameEn: 'Small Cross', color: 'amber', cells: [[2, 1], [3, 0], [3, 1], [3, 2], [4, 1]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'rose', cells: [[0, 4], [1, 4], [2, 4], [1, 2], [1, 3]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ትርያንግል ከታች ቀኝ + መስቀል ከላይ ቀኝ + 3x3 ትንሽ T በግራ)',
        grid: [
          [false, false, false, true, false],
          [false, false, true, true, true],
          [true, false, true, true, true],
          [true, true, true, true, true],
          [true, false, true, true, true],
        ],
        description: 'ትርያንግል ከታች ቀኝ፣ መስቀል ከላይ ቀኝ እና 3x3 ትንሽ T በግራ',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል', nameEn: '3x3 Triangle', color: 'sky', cells: [[4, 4], [4, 3], [4, 2], [3, 4], [3, 3], [2, 4]] },
          { nameAm: 'ትንሽ መስቀል', nameEn: 'Small Cross', color: 'amber', cells: [[0, 3], [1, 2], [1, 3], [1, 4], [2, 3]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'rose', cells: [[2, 0], [3, 0], [4, 0], [3, 1], [3, 2]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (ትርያንግል ከላይ ቀኝ + መስቀል በታች ቀኝ + 3x3 ትንሽ T ከላይ ግራ)',
        grid: [
          [true, false, true, true, true],
          [true, true, true, true, true],
          [true, false, true, true, true],
          [false, false, true, true, true],
          [false, false, false, true, false],
        ],
        description: 'ትርያንግል ከላይ ቀኝ፣ መስቀል በታች ቀኝ እና 3x3 ትንሽ T ከላይ ግራ',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል', nameEn: '3x3 Triangle', color: 'sky', cells: [[0, 2], [0, 3], [0, 4], [1, 3], [1, 4], [2, 4]] },
          { nameAm: 'ትንሽ መስቀል', nameEn: 'Small Cross', color: 'amber', cells: [[2, 3], [3, 2], [3, 3], [3, 4], [4, 3]] },
          { nameAm: 'ትንሽ T (3x3)', nameEn: 'Small T (3x3)', color: 'rose', cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 24,
    category: 'shape',
  },
  {
    id: 'rule-26',
    ruleNumber: 26,
    code: 'TWO_3X3_TRIANGLES_DISJOINT',
    nameAm: '(3×3) ትርያንግል የጋራ ነጥብ የሌለዉ 2',
    nameEn: 'Two 3x3 Triangles Disjoint',
    shortDescAm: 'ሁለት 3x3 ትርያንግሎች የጋራ ነጥብ የሌላቸው (ከ F ጋር ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'Two 3x3 triangles with no overlapping cells in any direction and central F',
    playerVariants: [
      {
        title: 'አማራጭ 1 (ትርያንግል 1 ከላይ ግራ + ትርያንግል 2 ከታች ቀኝ)',
        grid: [
          [true, true, true, false, false],
          [true, true, false, false, false],
          [true, false, true, false, true],
          [false, false, false, true, true],
          [false, false, true, true, true],
        ],
        description: 'ሁለት 3x3 ትርያንግሎች በዲያጎናል ተቃራኒ ማዕዘናት ያለ ምንም የጋራ ነጥብ (ከ F ጋር)',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል 1', nameEn: '3x3 Triangle 1', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]] },
          { nameAm: '3x3 ትርያንግል 2', nameEn: '3x3 Triangle 2', color: 'amber', cells: [[4, 4], [4, 3], [4, 2], [3, 4], [3, 3], [2, 4]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (ትርያንግል 1 ከላይ ቀኝ + ትርያንግል 2 ከታች ግራ)',
        grid: [
          [false, false, true, true, true],
          [false, false, false, true, true],
          [true, false, true, false, true],
          [true, true, false, false, false],
          [true, true, true, false, false],
        ],
        description: 'የላይኛው ቀኝ እና የታችኛው ግራ ሁለት 3x3 ትርያንግሎች',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል 1', nameEn: '3x3 Triangle 1', color: 'sky', cells: [[0, 2], [0, 3], [0, 4], [1, 3], [1, 4], [2, 4]] },
          { nameAm: '3x3 ትርያንግል 2', nameEn: '3x3 Triangle 2', color: 'amber', cells: [[2, 0], [3, 0], [3, 1], [4, 0], [4, 1], [4, 2]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (ትርያንግል 1 ከላይ ግራ + ትርያንግል 2 ወደ ውስጥ ያየ)',
        grid: [
          [true, true, true, false, false],
          [true, true, false, false, false],
          [true, false, true, false, true],
          [false, false, false, true, true],
          [false, false, true, true, true],
        ],
        description: 'ሁለት 3x3 ትርያንግሎች 100% ያለ መደራረብ',
        shapeGroups: [
          { nameAm: '3x3 ትርያንግል 1', nameEn: '3x3 Triangle 1', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [2, 0]] },
          { nameAm: '3x3 ትርያንግል 2', nameEn: '3x3 Triangle 2', color: 'amber', cells: [[2, 4], [3, 4], [4, 4], [3, 3], [4, 3], [4, 2]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 16,
    category: 'shape',
  },
  {
    id: 'rule-27',
    ruleNumber: 27,
    code: 'THREE_SMALL_T_DISJOINT',
    nameAm: 'ትናንሽ T ፊደል የጋራ ነጥብ የሌለዉ 3',
    nameEn: 'Three Small T Letters Disjoint',
    shortDescAm: 'ሦስት ትናንሽ T ፊደላት (እያንዳንዱ 3x3) የጋራ ነጥብ የሌላቸው (ከ F ጋር ወደ ፈለጉት አቅጣጫ)',
    shortDescEn: 'Three small 3x3 letter T patterns with no common points in any direction and central F',
    playerVariants: [
      {
        title: 'አማራጭ 1 (T1 ከላይ ግራ + T2 ከላይ ቀኝ + T3 በታች ግራ)',
        grid: [
          [true, true, true, false, true],
          [false, true, true, true, true],
          [true, true, true, false, true],
          [true, true, true, false, false],
          [true, false, false, false, false],
        ],
        description: '3 ትናንሽ T ፊደላት (እያንዳንዱ 3x3) ያለ መደራረብ (ከ F ጋር)',
        shapeGroups: [
          { nameAm: 'ትንሽ T 1 (3x3)', nameEn: 'Small T 1 (3x3)', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },
          { nameAm: 'ትንሽ T 2 (3x3)', nameEn: 'Small T 2 (3x3)', color: 'amber', cells: [[0, 4], [1, 4], [2, 4], [1, 2], [1, 3]] },
          { nameAm: 'ትንሽ T 3 (3x3)', nameEn: 'Small T 3 (3x3)', color: 'rose', cells: [[2, 0], [3, 0], [4, 0], [3, 1], [3, 2]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 2 (T1 ከላይ ግራ + T2 ከላይ ቀኝ + T3 በታች ቀኝ)',
        grid: [
          [true, true, true, false, true],
          [false, true, true, true, true],
          [false, true, true, true, true],
          [false, false, false, true, false],
          [false, false, true, true, true],
        ],
        description: '3 ትናንሽ 3x3 T ፊደላት በሦስቱ ጥጎች',
        shapeGroups: [
          { nameAm: 'ትንሽ T 1 (3x3)', nameEn: 'Small T 1 (3x3)', color: 'sky', cells: [[0, 0], [0, 1], [0, 2], [1, 1], [2, 1]] },
          { nameAm: 'ትንሽ T 2 (3x3)', nameEn: 'Small T 2 (3x3)', color: 'amber', cells: [[0, 4], [1, 4], [2, 4], [1, 2], [1, 3]] },
          { nameAm: 'ትንሽ T 3 (3x3)', nameEn: 'Small T 3 (3x3)', color: 'rose', cells: [[4, 2], [4, 3], [4, 4], [3, 3], [2, 3]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 3 (T1 ከላይ ቀኝ + T2 በታች ቀኝ + T3 በታች ግራ)',
        grid: [
          [false, false, true, true, true],
          [false, false, false, true, false],
          [false, true, true, true, true],
          [false, true, true, true, true],
          [true, true, true, false, true],
        ],
        description: '3 ትናንሽ 3x3 T ፊደላት በቀኝ እና በታች የተደረደሩ',
        shapeGroups: [
          { nameAm: 'ትንሽ T 1 (3x3)', nameEn: 'Small T 1 (3x3)', color: 'sky', cells: [[0, 2], [0, 3], [0, 4], [1, 3], [2, 3]] },
          { nameAm: 'ትንሽ T 2 (3x3)', nameEn: 'Small T 2 (3x3)', color: 'amber', cells: [[2, 4], [3, 4], [4, 4], [3, 2], [3, 3]] },
          { nameAm: 'ትንሽ T 3 (3x3)', nameEn: 'Small T 3 (3x3)', color: 'rose', cells: [[4, 0], [4, 1], [4, 2], [3, 1], [2, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
      {
        title: 'አማራጭ 4 (T1 ከላይ ግራ + T2 ከላይ ቀኝ + T3 በታች ግራ)',
        grid: [
          [true, false, true, true, true],
          [true, true, true, true, false],
          [true, true, true, true, false],
          [false, true, false, false, false],
          [true, true, true, false, false],
        ],
        description: '3 ትናንሽ 3x3 T ፊደላት በተለያየ አቅጣጫ የተደረደሩ',
        shapeGroups: [
          { nameAm: 'ትንሽ T 1 (3x3)', nameEn: 'Small T 1 (3x3)', color: 'sky', cells: [[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]] },
          { nameAm: 'ትንሽ T 2 (3x3)', nameEn: 'Small T 2 (3x3)', color: 'amber', cells: [[0, 2], [0, 3], [0, 4], [1, 3], [2, 3]] },
          { nameAm: 'ትንሽ T 3 (3x3)', nameEn: 'Small T 3 (3x3)', color: 'rose', cells: [[4, 0], [4, 1], [4, 2], [3, 1], [2, 1]] },
          { nameAm: 'F ነፃ ካስ', nameEn: 'Free Center', color: 'emerald', cells: [[2, 2]] },
        ],
      },
    ],
    adminVariantsCount: 30,
    category: 'shape',
  },
];

const RULE_I18N: Record<number, { titleTi: string; titleOm: string; descTi?: string; descOm?: string }> = {
  1: {
    titleTi: '(2×2) ስኴር ናይ ሓባር ነጥቢ ዘይብሉ 4',
    titleOm: 'Ispoortii 2x2 Wal Hin Qabannee 4 (4 Disjoint 2x2)',
    descTi: '4 ናይ ባዕሎም (2x2) ስኴራት ብዘይ ምድብላቕ ምስ ነፃ F',
    descOm: 'Ispoortii 2x2 of danda\'an 4 wal irra hin dhangalaane giddu-galeessa F waliin',
  },
  2: {
    titleTi: '(2×3) ስኴር/ሬክታንግል ናይ ሓባር ነጥቢ ዘይብሎም 2',
    titleOm: 'Rektaangilii 2x3 Wal Hin Qabannee 2 (2 Disjoint 2x3)',
    descTi: '2 ናይ ባዕሎም (2x3) ሬክታንግላት ብዘይ ምድብላቕ',
    descOm: 'Rektaangilii 2x3 of danda\'an 2 wal irra hin buune',
  },
  3: {
    titleTi: '(2×2) ስኴር 3 መኣዝን ዘይሓዘ 3',
    titleOm: 'Ispoortii 2x2 Golee 3 Hin Qabne 3',
    descTi: '3 ናይ ባዕሎም (2x2) ስኴራት ኣብ 3 መኣዝናት ጥራይ ዘይኮኑ',
    descOm: 'Ispoortii 2x2 sadii golee 3 qofa irratti hin hundoofne',
  },
  4: {
    titleTi: '2 ትይዩ/ተመጣጣኒ መስመራት (Two Parallel Lines)',
    titleOm: 'Sararoota Qajeelaa 2 (Two Parallel Lines)',
    descTi: '2 ዝደቀሱ፣ 2 ዝቖሙ ወይ 2 ዲያጎናል መስመራት',
    descOm: 'Sararoota diriiraa 2, dhaabbataa 2 ykn diyoogonaalii 2',
  },
  5: {
    titleTi: 'ዓቢ ፊደል X ኮከብ (Big Letter X)',
    titleOm: 'Qubee Guddaa X (Big Letter X Star)',
    descTi: 'ክልቲኦም ዲያጎናል መስመራት ብማእከል F ኣቢሎም',
    descOm: 'Diyoogonaalota lamaan giddu-galeessa F waliin',
  },
  6: {
    titleTi: 'ዓቢ ፊደል H (Big Letter H)',
    titleOm: 'Qubee Guddaa H (Big Letter H)',
    descTi: '2 ዝቖሙ መስመራትን 1 ዝደቀሰ መስመርን',
    descOm: 'Sarara dhaabbataa 2 fi diriiraa 1',
  },
  7: {
    titleTi: 'ዓቢ መስቀል (Big Cross +)',
    titleOm: 'Fannoo Guddaa (Big Cross +)',
    descTi: '1 ማእከላይ ዝደቀሰን 1 ማእከላይ ዝቖመን መስመር',
    descOm: 'Sarara diriiraa 1 fi dhaabbataa 1 gidduutti',
  },
  8: {
    titleTi: 'ዓቢ ፊደል O ፍሬም (Big Letter O Frame)',
    titleOm: 'Firiimii Qubee O (Big Letter O Frame)',
    descTi: 'ናይ ደገ 4 ጫፋት ዘለዎም 16 ካሶች',
    descOm: 'Goleewwan ala jiran 16 guutummaatti',
  },
  9: {
    titleTi: '4 መኣዝናት ካስ ምስ ማእከል F',
    titleOm: 'Goleewwan 4 Giddu-galeessa F Waliin',
    descTi: '4ቱ መኣዝናት ካስ ምስ ማእከላዊ ነፃ ካስ (F)',
    descOm: 'Goleewwan 4 fi kaardii bilisaa (F) gidduu',
  },
  10: {
    titleTi: '5 መስመራት ብዘይ ዲያጎናል (5 Lines No Diag)',
    titleOm: 'Sararoota 5 Diyoogonaal Malee (5 Lines)',
    descTi: 'ዝኾኑ 5 ዝደቀሱ ወይ ዝቖሙ መስመራት',
    descOm: 'Sararoota diriiraa fi dhaabbataa 5 kamiyyuu',
  },
  11: {
    titleTi: 'ዓቢ መስቀል (Big Cross)',
    titleOm: 'Fannoo Guddaa (Big Cross)',
    descTi: '1 ማእከላይ ዝደቀሰን 1 ማእከላይ ዝቖመን መስመር',
    descOm: 'Sarara diriiraa 1 fi dhaabbataa 1 gidduutti',
  },
  12: {
    titleTi: 'ዓቢ ፊደል H (Big Letter H)',
    titleOm: 'Qubee Guddaa H (Big Letter H)',
    descTi: '2 ዝቖሙ መስመራትን 1 ዝደቀሰ መስመርን',
    descOm: 'Sarara dhaabbataa 2 fi diriiraa 1',
  },
  13: {
    titleTi: 'ዝኾኑ 5 መስመራት (Any 5 Lines)',
    titleOm: 'Sararoota 5 Kamiyyuu (Any 5 Lines)',
    descTi: 'ዝኾኑ 5 መስመራት (ዝደቀሱ፣ ዝቖሙ ወይ ዲያጎናል)',
    descOm: 'Sararoota 5 kamiyyuu guutummaatti',
  },
  14: {
    titleTi: 'ዓቢ ፊደል X (Big Letter X)',
    titleOm: 'Qubee Guddaa X (Big Letter X)',
    descTi: 'ክልቲኦም ዲያጎናል መስመራት ብማእከል F ኣቢሎም',
    descOm: 'Diyoogonaalota lamaan giddu-galeessa F waliin',
  },
  15: {
    titleTi: 'ዝኾኑ 7 መስመራት (Any 7 Lines)',
    titleOm: 'Sararoota 7 Kamiyyuu (Any 7 Lines)',
    descTi: 'ዝኾኑ 7 መስመራት ብሓባር',
    descOm: 'Sararoota 7 kamiyyuu guutummaatti',
  },
  16: {
    titleTi: 'ፍርቂ ቤት 15 ካስ (Half House 15)',
    titleOm: 'Mana Walakkaa 15 (Half House 15)',
    descTi: 'ዝኾኑ 15 ካሶች ምስ F ማእከል',
    descOm: 'Kaardiiwwan 15 kamiyyuu F waliin',
  },
  17: {
    titleTi: 'ምሉእ ቤት (Full House / Blackout)',
    titleOm: 'Mana Guutuu (Full House / Blackout)',
    descTi: 'ኩሎም 24ቱ ካሶች ምስ ነፃ F ማእከል ምሉእ ብምሉእ',
    descOm: 'Kaardiiwwan 24 hundi F waliin yoo guutaman',
  },
  18: {
    titleTi: '4 ንኣሽቱ ዳይመንድ (4 Small Diamonds)',
    titleOm: 'Daayimondii Xixinnoo 4 (4 Small Diamonds)',
    descTi: '4 ራሶም ዝኸኣሉ ንኣሽቱ ዳይመንድ ቅርጽታት ምስ F',
    descOm: 'Boca daayimondii xixinnoo 4 F waliin',
  },
  19: {
    titleTi: '2 ዓበይቲ ዳይመንድ (2 Big Diamonds)',
    titleOm: 'Daayimondii Guguddoo 2 (2 Big Diamonds)',
    descTi: '2 ዓበይቲ ዳይመንድ ቅርጽታት ኣብ ሰሌዳ',
    descOm: 'Boca daayimondii guguddoo 2',
  },
  20: {
    titleTi: '3 ንኣሽቱ መስቀላት (Three Small Crosses)',
    titleOm: 'Fannoo Xixinnoo 3 (Three Small Crosses)',
    descTi: '3 ንኣሽቱ 3x3 መስቀላት ናይ ሓባር ነጥቢ ዘይብሎም',
    descOm: 'Fannoo xixinnoo 3x3 sadii wal hin tuqne',
  },
  21: {
    titleTi: '4 ናይ ምድማር ምልክታት (Four Plus Signs +)',
    titleOm: 'Mallattoolee Ida\'uu 4 (Four Plus Signs +)',
    descTi: '4 ናይ ባዕሎም ናይ ምድማር ቅርጽታት ምስ F',
    descOm: 'Mallattoolee ida\'uu (+) 4 of danda\'an F waliin',
  },
  22: {
    titleTi: '3 ንኣሽቱ H ፊደላት (Three Small H Letters)',
    titleOm: 'Qubee Xixinnoo H 3 (Three Small H Letters)',
    descTi: '3 ንኣሽቱ (3x3) H ፊደላት ናይ ሓባር ነጥቢ ዘይብሎም',
    descOm: 'Qubee H xixinnoo 3x3 sadii wal hin tuqne',
  },
  23: {
    titleTi: '3 ንኣሽቱ X ፊደላት (Three Small X Letters)',
    titleOm: 'Qubee Xixinnoo X 3 (Three Small X Letters)',
    descTi: '3 ንኣሽቱ (3x3) X ፊደላት ናይ ሓባር ነጥቢ ዘይብሎም',
    descOm: 'Qubee X xixinnoo 3x3 sadii wal hin tuqne',
  },
  24: {
    titleTi: '3 ንኣሽቱ O ፍሬማት (Three Small O Frames)',
    titleOm: 'Firiimii Xixinnoo O 3 (Three Small O Frames)',
    descTi: '3 ንኣሽቱ (3x3) O ፍሬማት ናይ ሓባር ነጥቢ ዘይብሎም',
    descOm: 'Firiimii O xixinnoo 3x3 sadii wal hin tuqne',
  },
  25: {
    titleTi: '3 ንኣሽቱ C ፊደላት (Three Small C Letters)',
    titleOm: 'Qubee Xixinnoo C 3 (Three Small C Letters)',
    descTi: '3 ንኣሽቱ (3x3) C ፊደላት ናይ ሓባር ነጥቢ ዘይብሎም',
    descOm: 'Qubee C xixinnoo 3x3 sadii wal hin tuqne',
  },
  26: {
    titleTi: '3 ንኣሽቱ U ፊደላት (Three Small U Letters)',
    titleOm: 'Qubee Xixinnoo U 3 (Three Small U Letters)',
    descTi: '3 ንኣሽቱ (3x3) U ፊደላት ናይ ሓባር ነጥቢ ዘይብሎም',
    descOm: 'Qubee U xixinnoo 3x3 sadii wal hin tuqne',
  },
  27: {
    titleTi: '3 ንኣሽቱ T ፊደላት (Three Small T Letters)',
    titleOm: 'Qubee Xixinnoo T 3 (Three Small T Letters)',
    descTi: '3 ንኣሽቱ (3x3) T ፊደላት ናይ ሓባር ነጥቢ ዘይብሎም',
    descOm: 'Qubee T xixinnoo 3x3 sadii wal hin tuqne',
  },
};

const RULE_GENERATORS: Record<number, () => PatternVariation[]> = {
  1: generateRule1Variations,
  2: generateRule2Variations,
  3: generateRule3Variations,
  4: generateRule4Variations,
  5: generateRule5Variations,
  6: generateRule6Variations,
  7: generateRule7Variations,
  8: generateRule8Variations,
  9: generateRule9Variations,
  10: generateRule10Variations,
  11: generateRule11Variations,
  12: generateRule12Variations,
  13: generateRule13Variations,
  14: generateRule14Variations,
  15: generateRule15Variations,
  16: generateRule16Variations,
  17: generateRule17Variations,
  18: generateRule18Variations,
  19: generateRule19Variations,
  20: generateRule20Variations,
  21: generateRule21Variations,
  22: generateRule22Variations,
  23: generateRule23Variations,
  24: generateRule24Variations,
  25: generateRule25Variations,
  26: generateRule26Variations,
  27: generateRule27Variations,
};

export const BINGO_PATTERNS: BingoRulePattern[] = RAW_BINGO_RULES_27.map((rule) => {
  const i18n = RULE_I18N[rule.ruleNumber];
  const generator = RULE_GENERATORS[rule.ruleNumber];

  let variations: PatternVariation[] = [];
  if (generator) {
    variations = generator();
  } else {
    variations = rule.playerVariants.map((pv, idx) => ({
      id: `${rule.ruleNumber}-v${idx + 1}`,
      label: pv.title,
      description: pv.description,
      shapeGroups: pv.shapeGroups,
      grid: pv.grid,
    }));
  }

  return {
    id: rule.ruleNumber,
    code: rule.code,
    titleAm: rule.nameAm,
    titleTi: i18n?.titleTi || rule.nameAm,
    titleOm: i18n?.titleOm || rule.nameEn,
    titleEn: rule.nameEn,
    descAm: rule.shortDescAm,
    descEn: rule.shortDescEn,
    adminVariantsCount: variations.length,
    category: rule.category,
    variations,
  };
});

export function getRuleTitleByLang(pattern?: BingoRulePattern | null, lang: Language = 'am'): string {
  if (!pattern) return '';
  if (lang === 'ti') return pattern.titleTi || pattern.titleAm;
  if (lang === 'om') return pattern.titleOm || pattern.titleEn || pattern.titleAm;
  if (lang === 'en') return pattern.titleEn || pattern.titleAm;
  return pattern.titleAm;
}

export function getRuleDescByLang(pattern?: BingoRulePattern | null, lang: Language = 'am'): string {
  if (!pattern) return '';
  const i18n = RULE_I18N[pattern.id];
  if (lang === 'ti') return i18n?.descTi || pattern.descAm;
  if (lang === 'om') return i18n?.descOm || pattern.descEn || pattern.descAm;
  if (lang === 'en') return pattern.descEn || pattern.descAm;
  return pattern.descAm;
}

/**
 * Dedicated Rule for the Separate FAST BINGO APP (ኢዚ ፈጣን ቢንጎ አፕ):
 * 1 Line (Horizontal, Vertical, Diagonal) OR 4 Corners (4ቱ የማዕዘን ካስ)
 */
export const FAST_BINGO_RULE_PATTERN: BingoRulePattern = {
  id: 1,
  code: 'FAST_ONE_LINE_OR_FOUR_CORNERS',
  isFastBingo: true,
  titleAm: '1 መስመር (Horizontal, Vertical, Diagonal) ወይም 4ቱ የማዕዘን ካስ',
  titleTi: '1 መስመር (Horizontal, Vertical, Diagonal) ወይ 4 መኣዝን ካስ',
  titleOm: 'Sarara 1 (Horizontal, Vertical, Diagonal) ykn Golee 4 (4 Corners)',
  titleEn: '1 Line (Horizontal, Vertical, Diagonal) OR 4 Corners',
  descAm:
    'የፈጣን ቢንጎ ሕግ፦ ማንኛውም 1 የተኛ መስመር (Horizontal)፣ ወይም 1 የቆመ መስመር (Vertical)፣ ወይም 1 ዲያጎናል መስመር (Diagonal ከ F ጋር)፣ ወይም 4ቱ የማዕዘን ካሶች (4 Corners) ሲጠቁሩ ወዲያውኑ ያሸንፋሉ!',
  descEn:
    'Fast Bingo Rule: Complete any 1 Horizontal line, 1 Vertical line, 1 Diagonal line (with FREE center), OR all 4 Corner cells to win immediately!',
  variations: [
    {
      id: 'fast-corners',
      label: '4ቱ የማዕዘን ካስ (4 Corners)',
      grid: createGrid([
        [0, 0],
        [0, 4],
        [4, 0],
        [4, 4],
      ]),
    },
    {
      id: 'fast-h-mid',
      label: 'Horizontal (የተኛ መስመር ከ F ጋር)',
      grid: createLinesGrid([2], []),
    },
    {
      id: 'fast-h-top',
      label: 'Horizontal (የላይኛው የተኛ መስመር)',
      grid: createLinesGrid([0], []),
    },
    {
      id: 'fast-h-bot',
      label: 'Horizontal (የታችኛው የተኛ መስመር)',
      grid: createLinesGrid([4], []),
    },
    {
      id: 'fast-v-mid',
      label: 'Vertical (የቆመ መስመር ከ F ጋር)',
      grid: createLinesGrid([], [2]),
    },
    {
      id: 'fast-v-left',
      label: 'Vertical (የግራ የቆመ መስመር)',
      grid: createLinesGrid([], [0]),
    },
    {
      id: 'fast-v-right',
      label: 'Vertical (የቀኝ የቆመ መስመር)',
      grid: createLinesGrid([], [4]),
    },
    {
      id: 'fast-diag-1',
      label: 'Diagonal 1 (ዋና ዲያጎናል ከ F ጋር)',
      grid: createLinesGrid([], [], true, false),
    },
    {
      id: 'fast-diag-2',
      label: 'Diagonal 2 (ሁለተኛ ዲያጎናል ከ F ጋር)',
      grid: createLinesGrid([], [], false, true),
    },
    {
      id: 'fast-h-2',
      label: 'Horizontal (2ኛው የተኛ መስመር)',
      grid: createLinesGrid([1], []),
    },
    {
      id: 'fast-h-4',
      label: 'Horizontal (4ኛው የተኛ መስመር)',
      grid: createLinesGrid([3], []),
    },
    {
      id: 'fast-v-2',
      label: 'Vertical (I የቆመ መስመር)',
      grid: createLinesGrid([], [1]),
    },
    {
      id: 'fast-v-3',
      label: 'Vertical (G የቆመ መስመር)',
      grid: createLinesGrid([], [3]),
    },
  ],
};
