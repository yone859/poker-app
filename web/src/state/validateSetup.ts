import { TABLE_SIZE, type TournamentConfig } from '../engine';

/** 設定画面の入力チェック。問題がなければ空の配列。空欄（NaN）も弾けるよう「> 0 でない」の形で比べる */
export function validateSetup(config: TournamentConfig, names: string[]): string[] {
  const errors: string[] = [];
  const { minChip, startingStack, structure, reentry } = config;
  const trimmed = names.map((n) => n.trim());

  if (trimmed.length < 2 || trimmed.length > TABLE_SIZE) {
    errors.push(`プレイヤーは2〜${TABLE_SIZE}人にしてください`);
  }
  if (trimmed.some((n) => n === '')) errors.push('名前が空のプレイヤーがいます');
  if (new Set(trimmed).size !== trimmed.length) errors.push('同じ名前のプレイヤーがいます');

  if (!(minChip > 0)) errors.push('最小チップは1以上にしてください');
  if (!(startingStack > 0) || startingStack % minChip !== 0) {
    errors.push('初期スタックは最小チップで割り切れる額にしてください');
  }

  const levels = structure.filter((s) => s.type === 'level');
  if (levels.length === 0) errors.push('ブラインド表にレベルが1つ以上必要です');
  structure.forEach((item, i) => {
    const row = `ブラインド表の${i + 1}行目`;
    if (!(item.minutes > 0)) errors.push(`${row}：時間は1分以上にしてください`);
    if (item.type === 'break') return;
    if (!(item.smallBlind > 0) || !(item.bigBlind > item.smallBlind)) {
      errors.push(`${row}：BBはSBより大きくしてください`);
    }
    if ([item.smallBlind, item.bigBlind, item.ante].some((v) => v % minChip !== 0)) {
      errors.push(`${row}：額は最小チップ（${minChip}）で割り切れるようにしてください`);
    }
  });

  if (reentry.enabled) {
    if (reentry.maxEntries !== null && !(reentry.maxEntries >= 2)) {
      errors.push('リエントリーありの場合、最大エントリー数は2以上にしてください');
    }
    if (!(reentry.lastLevel >= 1)) errors.push('リエントリーの締切レベルは1以上にしてください');
  }
  return errors;
}
