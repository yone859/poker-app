import type { TFunction } from 'i18next';
import type { Street, StructureItem } from '../engine';

// 桁区切りの記号。言語ごとに違う（英語 "1,234"、ドイツ語 "1.234"、フランス語 "1 234"）
let thousandsSeparator = ',';

/** 言語を切り替えたときに、翻訳ファイルの common.thousandsSeparator を設定する（i18n/index.ts から呼ぶ） */
export function setThousandsSeparator(separator: string): void {
  thousandsSeparator = separator;
}

/** 1234567 → "1,234,567"（Intlに頼らないのでReact Nativeでも同じ表示になる） */
export function chips(n: number): string {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSeparator);
}

/** ミリ秒 → "mm:ss" */
export function clockText(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** そのストリートで開いているボードの枚数 */
export const BOARD_CARDS: Record<Street, number> = { preflop: 0, flop: 3, turn: 4, river: 5 };

export function blindsText(item: StructureItem, t: TFunction): string {
  if (item.type === 'break') return t('clock.break');
  const ante = item.ante > 0 ? ` (BBA ${chips(item.ante)})` : '';
  return `${chips(item.smallBlind)} / ${chips(item.bigBlind)}${ante}`;
}

export function potLabel(index: number, count: number, t: TFunction): string {
  if (count === 1 || index === 0) return t('pot.main');
  return count > 2 ? t('pot.sideN', { n: index }) : t('pot.side');
}
