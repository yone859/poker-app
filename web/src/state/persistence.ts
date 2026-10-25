import type { TournamentState } from '../engine';

export const STORAGE_KEY = 'holdem-tracker/game';
const VERSION = 1;

export interface SavedGame {
  tournament: TournamentState;
  past: TournamentState[];
}

/** Undo用の過去の状態は、ハンド履歴の代わりに件数だけを持つ */
type SavedPast = Omit<TournamentState, 'history'> & { historyLength: number };

/**
 * 保存する文字列に変換する。データの形を変えたら VERSION を上げる。
 * 過去の状態のハンド履歴は、必ず今の履歴の先頭部分と同じなので、件数だけ保存すれば復元できる。
 */
export function serialize(tournament: TournamentState, past: TournamentState[]): string {
  const savedPast: SavedPast[] = past.map(({ history, ...rest }) => ({
    ...rest,
    historyLength: history.length,
  }));
  return JSON.stringify({ version: VERSION, tournament, past: savedPast });
}

/** 保存した文字列から戻す。壊れている・古い形式なら null */
export function deserialize(raw: string | null): SavedGame | null {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (data?.version !== VERSION || !data.tournament) return null;
    const tournament = data.tournament as TournamentState;
    const past = ((data.past ?? []) as SavedPast[]).map(({ historyLength, ...rest }) => ({
      ...rest,
      history: tournament.history.slice(0, historyLength),
    }));
    return { tournament, past };
  } catch {
    return null;
  }
}
