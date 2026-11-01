import {
  activePlayers,
  isFinished,
  levelNumber,
  standings,
  syncClock,
  type TournamentState,
} from '../engine';

export interface TournamentSummary {
  status: 'notStarted' | 'playing' | 'finished';
  handNumber: number;
  levelNumber: number;
  playersLeft: number;
  winnerName: string | null;
}

/** ホーム画面の「続きから再開」に出す要約 */
export function summarize(t: TournamentState, now: number): TournamentSummary {
  const finished = isFinished(t, now);
  const winnerId = finished ? standings(t)[0]?.playerId : undefined;
  return {
    status: finished ? 'finished' : t.handNumber === 0 ? 'notStarted' : 'playing',
    handNumber: t.handNumber,
    levelNumber: levelNumber(t.config.structure, syncClock(t.clock, t.config.structure, now).index),
    playersLeft: activePlayers(t).length,
    winnerName: t.players.find((p) => p.id === winnerId)?.name ?? null,
  };
}
