import {
  act,
  addPlayer,
  createTournament,
  finishHand,
  jumpToLevel,
  pauseClock,
  reenter,
  RuleError,
  showdown,
  startClock,
  startHand,
  type Action,
  type TournamentConfig,
  type TournamentState,
} from '../engine';

export interface GameState {
  tournament: TournamentState | null;
  /** Undo用の過去の状態（新しいものが最後） */
  past: TournamentState[];
  /** ルール上できない操作をしたときのメッセージ */
  error: string | null;
}

export const UNDO_LIMIT = 50;

export type GameAction =
  | { type: 'create'; config: TournamentConfig; names: string[]; buttonSeat: number; now: number }
  | { type: 'startHand'; now: number }
  | { type: 'act'; action: Action }
  | { type: 'showdown'; winners: (string[] | undefined)[] }
  | { type: 'finishHand' }
  | { type: 'reenter'; playerId: string; now: number }
  | { type: 'addPlayer'; name: string; seat: number; now: number }
  | { type: 'clockStart'; now: number }
  | { type: 'clockPause'; now: number }
  | { type: 'clockJump'; index: number; now: number }
  | { type: 'undo' }
  | { type: 'reset' }
  | { type: 'dismissError' };

export const initialGameState: GameState = { tournament: null, past: [], error: null };

/** タイマーの操作は時間に関わるので、Undoの対象にしない */
const NOT_UNDOABLE: GameAction['type'][] = ['clockStart', 'clockPause', 'clockJump', 'dismissError'];

/**
 * 画面からの操作を受け取り、エンジンの関数で次の状態を作る。
 * Reactにもブラウザにも依存しないので、Expo版でもそのまま使える。
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  if (action.type === 'undo') return undo(state);
  try {
    const tournament = next(state.tournament, action);
    if (action.type === 'create' || action.type === 'reset') {
      return { tournament, past: [], error: null };
    }
    const past =
      NOT_UNDOABLE.includes(action.type) || !state.tournament
        ? state.past
        : [...state.past, state.tournament].slice(-UNDO_LIMIT);
    return { tournament, past, error: null };
  } catch (e) {
    if (e instanceof RuleError) return { ...state, error: e.message };
    throw e;
  }
}

function next(t: TournamentState | null, action: GameAction): TournamentState | null {
  if (action.type === 'create') {
    return createTournament(action.config, action.names, {
      buttonSeat: action.buttonSeat,
      now: action.now,
    });
  }
  if (action.type === 'reset') return null;
  if (action.type === 'dismissError' || action.type === 'undo') return t;
  if (!t) throw new RuleError('トーナメントが始まっていません');

  const { structure } = t.config;
  switch (action.type) {
    case 'startHand': {
      // 最初のハンドを始めたら、タイマーも自動で動かす
      const base =
        t.handNumber === 0 && !t.clock.running
          ? { ...t, clock: startClock(t.clock, structure, action.now) }
          : t;
      return startHand(base, action.now);
    }
    case 'act':
      return act(t, action.action);
    case 'showdown':
      return showdown(t, action.winners);
    case 'finishHand':
      return finishHand(t);
    case 'reenter':
      return reenter(t, action.playerId, action.now);
    case 'addPlayer':
      return addPlayer(t, action.name, action.seat, action.now);
    case 'clockStart':
      return { ...t, clock: startClock(t.clock, structure, action.now) };
    case 'clockPause':
      return { ...t, clock: pauseClock(t.clock, structure, action.now) };
    case 'clockJump':
      return { ...t, clock: jumpToLevel(t.clock, structure, action.index, action.now) };
  }
}

function undo(state: GameState): GameState {
  const previous = state.past[state.past.length - 1];
  if (!previous || !state.tournament) return state;
  return {
    // タイマーは戻さない（実際に経過した時間は取り消せない）
    tournament: { ...previous, clock: state.tournament.clock },
    past: state.past.slice(0, -1),
    error: null,
  };
}
