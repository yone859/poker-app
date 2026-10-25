import type { Street, StructureItem } from '../engine';

/** 1234567 → "1,234,567"（Intlに頼らないのでReact Nativeでも同じ表示になる） */
export function chips(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** ミリ秒 → "mm:ss" */
export function clockText(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export const STREET_LABEL: Record<Street, string> = {
  preflop: 'プリフロップ',
  flop: 'フロップ',
  turn: 'ターン',
  river: 'リバー',
};

/** そのストリートで開いているボードの枚数 */
export const BOARD_CARDS: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

export function blindsText(item: StructureItem): string {
  if (item.type === 'break') return '休憩';
  const ante = item.ante > 0 ? ` (BBA ${chips(item.ante)})` : '';
  return `${chips(item.smallBlind)} / ${chips(item.bigBlind)}${ante}`;
}

export function potLabel(index: number, count: number): string {
  if (count === 1 || index === 0) return 'メインポット';
  return `サイドポット${count > 2 ? index : ''}`;
}
