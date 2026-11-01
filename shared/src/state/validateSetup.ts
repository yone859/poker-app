import { TABLE_SIZE, type TournamentConfig } from '../engine';

export type SetupIssueCode =
  | 'playerCount'
  | 'emptyName'
  | 'duplicateName'
  | 'minChip'
  | 'startingStack'
  | 'noLevels'
  | 'minutes'
  | 'blindOrder'
  | 'blindMultiple'
  | 'maxEntries'
  | 'lastLevel';

/** 画面側で validation.<code> を翻訳して表示する */
export interface SetupIssue {
  code: SetupIssueCode;
  params?: Record<string, number>;
}

/** 設定画面の入力チェック。問題がなければ空の配列。空欄（NaN）も弾けるよう「> 0 でない」の形で比べる */
export function validateSetup(config: TournamentConfig, names: string[]): SetupIssue[] {
  const issues: SetupIssue[] = [];
  const { minChip, startingStack, structure, reentry } = config;
  const trimmed = names.map((n) => n.trim());

  if (trimmed.length < 2 || trimmed.length > TABLE_SIZE) {
    issues.push({ code: 'playerCount', params: { max: TABLE_SIZE } });
  }
  if (trimmed.some((n) => n === '')) issues.push({ code: 'emptyName' });
  if (new Set(trimmed).size !== trimmed.length) issues.push({ code: 'duplicateName' });

  if (!(minChip > 0)) issues.push({ code: 'minChip' });
  if (!(startingStack > 0) || startingStack % minChip !== 0) issues.push({ code: 'startingStack' });

  const levels = structure.filter((s) => s.type === 'level');
  if (levels.length === 0) issues.push({ code: 'noLevels' });
  structure.forEach((item, i) => {
    const row = i + 1;
    if (!(item.minutes > 0)) issues.push({ code: 'minutes', params: { row } });
    if (item.type === 'break') return;
    if (!(item.smallBlind > 0) || !(item.bigBlind > item.smallBlind)) {
      issues.push({ code: 'blindOrder', params: { row } });
    }
    if ([item.smallBlind, item.bigBlind, item.ante].some((v) => v % minChip !== 0)) {
      issues.push({ code: 'blindMultiple', params: { row, chip: minChip } });
    }
  });

  if (reentry.enabled) {
    if (reentry.maxEntries !== null && !(reentry.maxEntries >= 2)) issues.push({ code: 'maxEntries' });
    if (!(reentry.lastLevel >= 1)) issues.push({ code: 'lastLevel' });
  }
  return issues;
}
