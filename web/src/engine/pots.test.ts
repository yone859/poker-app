import { describe, expect, it } from 'vitest';
import { computePots, splitPot } from './pots';
import type { HandPlayer } from './types';

function hp(playerId: string, seat: number, totalBet: number, folded = false): HandPlayer {
  return {
    playerId,
    seat,
    startingStack: 0,
    stack: 0,
    streetBet: 0,
    totalBet,
    folded,
    allIn: false,
    acted: false,
    actedAt: 0,
  };
}

describe('computePots', () => {
  it('ルール資料6-3の例：A 2,000・B 5,000のオールインにCがコール', () => {
    // Cの10,000のうち誰もコールしていない5,000は返却済みとする
    const pots = computePots([hp('A', 0, 2000), hp('B', 1, 5000), hp('C', 2, 5000)], 0);
    expect(pots).toEqual([
      { amount: 6000, eligible: ['A', 'B', 'C'] },
      { amount: 6000, eligible: ['B', 'C'] },
    ]);
  });

  it('降りた人の出した額もポットに入るが、その人は受け取れない', () => {
    const pots = computePots([hp('A', 0, 600), hp('B', 1, 600), hp('C', 2, 200, true)], 0);
    expect(pots).toEqual([{ amount: 1400, eligible: ['A', 'B'] }]);
  });

  it('BBアンティはメインポットに入る', () => {
    const pots = computePots([hp('A', 0, 300), hp('B', 1, 1000), hp('C', 2, 1000)], 200);
    expect(pots[0]).toEqual({ amount: 1100, eligible: ['A', 'B', 'C'] });
    expect(pots[1]).toEqual({ amount: 1400, eligible: ['B', 'C'] });
  });
});

describe('splitPot', () => {
  it('ルール資料6-3の例：1,500を2人で分けると、端数の100はボタンの左に近い人へ', () => {
    // ボタンは席0。席1の方が席3よりボタンの左に近い
    const shares = splitPot(1500, [3, 1], 0, 100);
    expect(shares.get(1)).toBe(800);
    expect(shares.get(3)).toBe(700);
  });

  it('ボタンをまたいで数える', () => {
    // ボタンは席8。席9 → 席0 → 席2 の順に近い
    const shares = splitPot(1000, [2, 0, 9], 8, 100);
    expect(shares.get(9)).toBe(400);
    expect(shares.get(0)).toBe(300);
    expect(shares.get(2)).toBe(300);
  });
});
