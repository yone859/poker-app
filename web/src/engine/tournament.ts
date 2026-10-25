import { clone } from './clone';
import {
  initialClock,
  isRegistrationOpen,
  levelForHand,
  syncClock,
  type ClockState,
} from './clock';
import { applyAction, createHand, resolveShowdown, RuleError } from './hand';
import { TABLE_SIZE } from './pots';
import { nextPositions } from './positions';
import type {
  Action,
  Elimination,
  HandState,
  Player,
  Positions,
  TournamentConfig,
} from './types';

export interface TournamentState {
  config: TournamentConfig;
  players: Player[];
  handNumber: number;
  initialButtonSeat: number;
  /** 直前のハンドのボタン・SB・BB */
  positions: Positions | null;
  hand: HandState | null;
  history: HandState[];
  eliminations: Elimination[];
  clock: ClockState;
}

/**
 * 終わったハンドの履歴は二度と変わらないので、コピーせずに前の状態と共有する。
 * こうするとUndo用に過去の状態をたくさん持っても、メモリをあまり使わない。
 */
function cloneTournament(state: TournamentState): TournamentState {
  return { ...clone({ ...state, history: [] }), history: state.history };
}

export function createTournament(
  config: TournamentConfig,
  names: string[],
  options: { buttonSeat?: number; now: number },
): TournamentState {
  if (names.length < 2 || names.length > TABLE_SIZE) {
    throw new RuleError(`プレイヤーは2〜${TABLE_SIZE}人です`);
  }
  return {
    config,
    players: names.map((name, i) => ({
      id: `p${i + 1}`,
      name,
      seat: i,
      stack: config.startingStack,
      entries: 1,
      isOut: false,
    })),
    handNumber: 0,
    initialButtonSeat: options.buttonSeat ?? 0,
    positions: null,
    hand: null,
    history: [],
    eliminations: [],
    clock: initialClock(config.structure, options.now),
  };
}

export function activePlayers(t: TournamentState): Player[] {
  return t.players.filter((p) => !p.isOut);
}

// ---------- ハンドの進行 ----------

export function startHand(state: TournamentState, now: number): TournamentState {
  if (state.hand) throw new RuleError('前のハンドが終わっていません');
  const active = activePlayers(state);
  if (active.length < 2) throw new RuleError('プレイヤーが2人以上必要です');

  const t = cloneTournament(state);
  t.clock = syncClock(t.clock, t.config.structure, now);
  const positions = nextPositions(
    t.positions,
    active.map((p) => p.seat),
    t.initialButtonSeat,
  );
  t.handNumber += 1;
  t.positions = positions;
  t.hand = createHand({
    handNumber: t.handNumber,
    level: levelForHand(t.config.structure, t.clock.index),
    minChip: t.config.minChip,
    positions,
    players: active.map((p) => ({ playerId: p.id, seat: p.seat, stack: p.stack })),
  });
  return t;
}

export function act(state: TournamentState, action: Action): TournamentState {
  if (!state.hand) throw new RuleError('ハンドが始まっていません');
  return { ...state, hand: applyAction(state.hand, action) };
}

export function showdown(
  state: TournamentState,
  winners: (string[] | undefined)[],
): TournamentState {
  if (!state.hand) throw new RuleError('ハンドが始まっていません');
  return { ...state, hand: resolveShowdown(state.hand, winners) };
}

/** 終わったハンドの結果をスタックに反映し、チップが0になった人を脱落させる */
export function finishHand(state: TournamentState): TournamentState {
  if (state.hand?.phase !== 'complete') throw new RuleError('ハンドがまだ終わっていません');
  const t = cloneTournament(state);
  const hand = t.hand!;
  for (const hp of hand.players) {
    const p = t.players.find((x) => x.id === hp.playerId)!;
    p.stack = hp.stack;
    if (p.stack === 0) {
      p.isOut = true;
      t.eliminations.push({
        playerId: p.id,
        handNumber: hand.handNumber,
        startingStack: hp.startingStack,
        reentered: false,
      });
    }
  }
  t.history = [...t.history, hand];
  t.hand = null;
  return t;
}

// ---------- リエントリー・途中参加 ----------

export function registrationOpen(t: TournamentState, now: number): boolean {
  const clock = syncClock(t.clock, t.config.structure, now);
  return isRegistrationOpen(t.config.structure, clock.index, t.config.reentry);
}

export function canReenter(t: TournamentState, playerId: string, now: number): boolean {
  const p = t.players.find((x) => x.id === playerId);
  const { maxEntries } = t.config.reentry;
  return (
    !!p &&
    p.isOut &&
    !t.hand &&
    (maxEntries === null || p.entries < maxEntries) &&
    registrationOpen(t, now)
  );
}

/** チップが0になった人が、満額のスタックで再参加する（Rule 13）。席はそのまま */
export function reenter(state: TournamentState, playerId: string, now: number): TournamentState {
  if (!canReenter(state, playerId, now)) throw new RuleError('リエントリーできません');
  const t = cloneTournament(state);
  const p = t.players.find((x) => x.id === playerId)!;
  p.isOut = false;
  p.stack = t.config.startingStack;
  p.entries += 1;
  const last = [...t.eliminations].reverse().find((e) => e.playerId === playerId && !e.reentered);
  if (last) last.reentered = true;
  return t;
}

/** 遅れて来た人を空いている席に追加する（Rule 12・14） */
export function addPlayer(
  state: TournamentState,
  name: string,
  seat: number,
  now: number,
): TournamentState {
  if (state.hand) throw new RuleError('ハンドの間は追加できません');
  if (!registrationOpen(state, now)) throw new RuleError('登録の受付は終わっています');
  if (seat < 0 || seat >= TABLE_SIZE || state.players.some((p) => p.seat === seat)) {
    throw new RuleError('その席は使えません');
  }
  const t = cloneTournament(state);
  t.players.push({
    id: `p${t.players.length + 1}`,
    name,
    seat,
    stack: t.config.startingStack,
    entries: 1,
    isOut: false,
  });
  return t;
}

// ---------- 順位 ----------

export interface Standing {
  playerId: string;
  place: number;
  stack: number;
  eliminatedInHand: number | null;
}

/**
 * 残っている人はチップの多い順、脱落した人は後に脱落した人ほど上位。
 * 同じハンドで脱落した人は、そのハンド開始時のチップが多い人が上位（Rule 126）。同額なら同順位。
 */
export function standings(t: TournamentState): Standing[] {
  const alive = activePlayers(t)
    .sort((a, b) => b.stack - a.stack)
    .map((p, i) => ({ playerId: p.id, place: i + 1, stack: p.stack, eliminatedInHand: null }));

  const out = t.eliminations
    .filter((e) => !e.reentered)
    .sort((a, b) => b.handNumber - a.handNumber || b.startingStack - a.startingStack);

  const result: Standing[] = [...alive];
  out.forEach((e, i) => {
    const prev = out[i - 1];
    const tied = prev && prev.handNumber === e.handNumber && prev.startingStack === e.startingStack;
    result.push({
      playerId: e.playerId,
      place: tied ? result[result.length - 1].place : alive.length + i + 1,
      stack: 0,
      eliminatedInHand: e.handNumber,
    });
  });
  return result;
}

/** 残りが1人で、誰もリエントリーできなければトーナメント終了 */
export function isFinished(t: TournamentState, now: number): boolean {
  return (
    !t.hand &&
    activePlayers(t).length <= 1 &&
    !t.players.some((p) => canReenter(t, p.id, now))
  );
}
