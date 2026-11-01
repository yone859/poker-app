import { describe, expect, it } from 'vitest';
import {
  initialClock,
  isRegistrationOpen,
  jumpToLevel,
  levelForHand,
  levelNumber,
  pauseClock,
  startClock,
  syncClock,
} from './clock';
import type { StructureItem } from './types';

const MIN = 60_000;
const structure: StructureItem[] = [
  { type: 'level', smallBlind: 100, bigBlind: 200, ante: 200, minutes: 20 },
  { type: 'level', smallBlind: 200, bigBlind: 400, ante: 400, minutes: 20 },
  { type: 'break', minutes: 10 },
  { type: 'level', smallBlind: 300, bigBlind: 600, ante: 600, minutes: 20 },
];

describe('ブラインドタイマー', () => {
  it('止まっている間は時間が減らない', () => {
    const clock = syncClock(initialClock(structure, 0), structure, 5 * MIN);
    expect(clock.remainingMs).toBe(20 * MIN);
  });

  it('時間が切れると次のレベル、さらに休憩へ進む', () => {
    let clock = startClock(initialClock(structure, 0), structure, 0);
    clock = syncClock(clock, structure, 25 * MIN);
    expect(clock.index).toBe(1);
    expect(clock.remainingMs).toBe(15 * MIN);
    clock = syncClock(clock, structure, 45 * MIN);
    expect(clock.index).toBe(2);
    expect(clock.remainingMs).toBe(5 * MIN);
  });

  it('一時停止すると、その時点の残り時間で止まる', () => {
    let clock = startClock(initialClock(structure, 0), structure, 0);
    clock = pauseClock(clock, structure, 3 * MIN);
    clock = syncClock(clock, structure, 60 * MIN);
    expect(clock.index).toBe(0);
    expect(clock.remainingMs).toBe(17 * MIN);
  });

  it('最後のレベルでは0で止まる', () => {
    let clock = startClock(initialClock(structure, 0), structure, 0);
    clock = syncClock(clock, structure, 999 * MIN);
    expect(clock.index).toBe(3);
    expect(clock.remainingMs).toBe(0);
  });

  it('レベルを飛ばせる', () => {
    const clock = jumpToLevel(initialClock(structure, 0), structure, 3, 0);
    expect(clock.index).toBe(3);
    expect(clock.remainingMs).toBe(20 * MIN);
  });
});

describe('レベル番号とハンドのブラインド', () => {
  it('休憩はレベル番号に数えない', () => {
    expect(levelNumber(structure, 1)).toBe(2);
    expect(levelNumber(structure, 2)).toBe(2);
    expect(levelNumber(structure, 3)).toBe(3);
  });

  it('休憩中にハンドを始めたら、直前のレベルのブラインド', () => {
    expect(levelForHand(structure, 2).bigBlind).toBe(400);
  });
});

describe('リエントリーの受付（Rule 12）', () => {
  const rule = { enabled: true, maxEntries: 2, lastLevel: 2 };

  it('締切レベルまでは受け付ける', () => {
    expect(isRegistrationOpen(structure, 1, rule)).toBe(true);
  });

  it('締切レベルの直後が休憩なら、休憩中も受け付ける', () => {
    expect(isRegistrationOpen(structure, 2, rule)).toBe(true);
  });

  it('次のレベルが始まったら締め切り', () => {
    expect(isRegistrationOpen(structure, 3, rule)).toBe(false);
  });

  it('リエントリーなしの設定なら受け付けない', () => {
    expect(isRegistrationOpen(structure, 0, { ...rule, enabled: false })).toBe(false);
  });
});
