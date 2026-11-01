import type { BlindLevel, ReentryRule, StructureItem } from './types';

/**
 * ブラインドタイマー。現在時刻（ミリ秒）は引数で受け取るので、テストでも時間を自由に進められる。
 */
export interface ClockState {
  index: number;
  remainingMs: number;
  running: boolean;
  /** remainingMs を最後に計算した時刻 */
  updatedAt: number;
}

const minutesToMs = (m: number) => m * 60_000;

export function initialClock(structure: StructureItem[], now: number): ClockState {
  return { index: 0, remainingMs: minutesToMs(structure[0].minutes), running: false, updatedAt: now };
}

/** 経過時間を反映する。時間が切れたら次のレベル（または休憩）へ進む */
export function syncClock(clock: ClockState, structure: StructureItem[], now: number): ClockState {
  if (!clock.running) return { ...clock, updatedAt: now };
  let { index, remainingMs } = clock;
  remainingMs -= now - clock.updatedAt;
  while (remainingMs <= 0 && index < structure.length - 1) {
    index += 1;
    remainingMs += minutesToMs(structure[index].minutes);
  }
  return { index, remainingMs: Math.max(remainingMs, 0), running: clock.running, updatedAt: now };
}

export function startClock(clock: ClockState, structure: StructureItem[], now: number): ClockState {
  return { ...syncClock(clock, structure, now), running: true };
}

export function pauseClock(clock: ClockState, structure: StructureItem[], now: number): ClockState {
  return { ...syncClock(clock, structure, now), running: false };
}

/** 指定したレベル（または休憩）の最初に移動する */
export function jumpToLevel(
  clock: ClockState,
  structure: StructureItem[],
  index: number,
  now: number,
): ClockState {
  const i = Math.min(Math.max(index, 0), structure.length - 1);
  return { index: i, remainingMs: minutesToMs(structure[i].minutes), running: clock.running, updatedAt: now };
}

/** レベル番号（休憩は数えない）。休憩中は直前のレベルの番号 */
export function levelNumber(structure: StructureItem[], index: number): number {
  return structure.slice(0, index + 1).filter((s) => s.type === 'level').length;
}

/**
 * ハンドに使うブラインド。新しいレベルは次のハンドから適用する（Rule 79）ので、
 * ハンドの開始時にこの関数で決めて、そのハンドの間は変えない。
 * 休憩中なら直前のレベルを使う。
 */
export function levelForHand(structure: StructureItem[], index: number): BlindLevel {
  for (let i = index; i >= 0; i--) {
    const item = structure[i];
    if (item.type === 'level') return item;
  }
  const next = structure.find((s): s is BlindLevel => s.type === 'level');
  if (!next) throw new Error('structure has no levels');
  return next;
}

/** リエントリー・途中参加ができる期間か（Rule 12・13） */
export function isRegistrationOpen(
  structure: StructureItem[],
  index: number,
  rule: ReentryRule,
): boolean {
  // 休憩中は直前のレベル番号になるので、締切レベルの直後の休憩中も受け付けられる
  return rule.enabled && levelNumber(structure, index) <= rule.lastLevel;
}
