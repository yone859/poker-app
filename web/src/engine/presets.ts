import type { StructureItem, TournamentConfig } from './types';

// WSOPのNLHEイベントに近い上がり方（BBアンティ＝BBの額）。[SB, BB]
const WSOP_BLINDS: [number, number][] = [
  [100, 200],
  [200, 300],
  [200, 400],
  [300, 600],
  [400, 800],
  [500, 1000],
  [600, 1200],
  [800, 1600],
  [1000, 2000],
  [1200, 2400],
  [1500, 3000],
  [2000, 4000],
  [2500, 5000],
  [3000, 6000],
  [4000, 8000],
  [5000, 10000],
  [6000, 12000],
  [8000, 16000],
  [10000, 20000],
  [12000, 24000],
  [15000, 30000],
  [20000, 40000],
  [25000, 50000],
  [30000, 60000],
];

function buildStructure(levelMinutes: number, breakEvery: number, breakMinutes: number): StructureItem[] {
  return WSOP_BLINDS.flatMap(([sb, bb], i): StructureItem[] => {
    const level: StructureItem = { type: 'level', smallBlind: sb, bigBlind: bb, ante: bb, minutes: levelMinutes };
    const isLast = i === WSOP_BLINDS.length - 1;
    return (i + 1) % breakEvery === 0 && !isLast
      ? [level, { type: 'break', minutes: breakMinutes }]
      : [level];
  });
}

export interface Preset {
  id: string;
  name: string;
  description: string;
  config: TournamentConfig;
}

export const PRESETS: Preset[] = [
  {
    id: 'wsop-standard',
    name: 'WSOP風 スタンダード',
    description: '25,000点スタート・1レベル20分・4レベルごとに10分休憩（目安 3〜4時間）',
    config: {
      startingStack: 25_000,
      structure: buildStructure(20, 4, 10),
      minChip: 100,
      reentry: { enabled: true, maxEntries: 2, lastLevel: 8 },
    },
  },
  {
    id: 'wsop-turbo',
    name: 'WSOP風 ターボ',
    description: '25,000点スタート・1レベル10分・6レベルごとに5分休憩（目安 1.5〜2時間）',
    config: {
      startingStack: 25_000,
      structure: buildStructure(10, 6, 5),
      minChip: 100,
      reentry: { enabled: true, maxEntries: 2, lastLevel: 6 },
    },
  },
  {
    id: 'wsop-deep',
    name: 'WSOP風 ディープスタック',
    description: '50,000点スタート・1レベル30分・4レベルごとに15分休憩（じっくり遊ぶ）',
    config: {
      startingStack: 50_000,
      structure: buildStructure(30, 4, 15),
      minChip: 100,
      reentry: { enabled: true, maxEntries: 2, lastLevel: 8 },
    },
  },
];
