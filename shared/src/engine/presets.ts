import type { StructureItem, TournamentConfig } from './types';

// WSOPのNLHEイベントに近い上がり方（BBアンティ＝BBの額）。[SB, BB]
const TOURNAMENT_BLINDS: [number, number][] = [
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
  return TOURNAMENT_BLINDS.flatMap(([sb, bb], i): StructureItem[] => {
    const level: StructureItem = { type: 'level', smallBlind: sb, bigBlind: bb, ante: bb, minutes: levelMinutes };
    const isLast = i === TOURNAMENT_BLINDS.length - 1;
    return (i + 1) % breakEvery === 0 && !isLast
      ? [level, { type: 'break', minutes: breakMinutes }]
      : [level];
  });
}

/** 名前と説明は画面側の翻訳ファイル（presets.<id>）に置く */
export interface Preset {
  id: 'standard' | 'turbo' | 'deep';
  config: TournamentConfig;
}

export const PRESETS: Preset[] = [
  {
    id: 'standard',
    config: {
      startingStack: 25_000,
      structure: buildStructure(20, 4, 10),
      minChip: 100,
      reentry: { enabled: true, maxEntries: 2, lastLevel: 8 },
    },
  },
  {
    id: 'turbo',
    config: {
      startingStack: 25_000,
      structure: buildStructure(10, 6, 5),
      minChip: 100,
      reentry: { enabled: true, maxEntries: 2, lastLevel: 6 },
    },
  },
  {
    id: 'deep',
    config: {
      startingStack: 50_000,
      structure: buildStructure(30, 4, 15),
      minChip: 100,
      reentry: { enabled: true, maxEntries: 2, lastLevel: 8 },
    },
  },
];
