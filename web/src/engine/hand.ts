import { clone } from './clone';
import { RuleError } from './errors';
import { computePots, distanceFromButton, splitPot } from './pots';
import type {
  Action,
  ActionLog,
  BlindLevel,
  HandPlayer,
  HandState,
  LegalActions,
  Positions,
  Street,
} from './types';

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

export interface HandSetup {
  handNumber: number;
  level: BlindLevel;
  minChip: number;
  positions: Positions;
  players: { playerId: string; seat: number; stack: number }[];
}

// ---------- ハンドの開始 ----------

export function createHand(setup: HandSetup): HandState {
  const { level, positions } = setup;
  const players: HandPlayer[] = [...setup.players]
    .sort((a, b) => a.seat - b.seat)
    .map((p) => ({
      playerId: p.playerId,
      seat: p.seat,
      startingStack: p.stack,
      stack: p.stack,
      streetBet: 0,
      totalBet: 0,
      folded: false,
      allIn: false,
      acted: false,
      actedAt: 0,
    }));

  const hand: HandState = {
    handNumber: setup.handNumber,
    level,
    minChip: setup.minChip,
    positions,
    players,
    street: 'preflop',
    phase: 'betting',
    // BBの人のスタックが足りなくても、コールする額はBBの額（足りない分は後でサイドポットになる）
    currentBet: level.bigBlind,
    minRaise: level.bigBlind,
    toActSeat: null,
    deadMoney: 0,
    lastAggressorSeat: null,
    actions: [],
    pots: [],
    awards: [],
    showFirstSeat: null,
    runout: [],
  };

  const sb = players.find((p) => p.seat === positions.sbSeat);
  const bb = players.find((p) => p.seat === positions.bbSeat);
  if (!bb) throw new RuleError('noBigBlind');

  // SBの席が空いていればSBは払われない（デッドSB。Rule 85）
  if (sb && sb !== bb) post(hand, sb, level.smallBlind, 'sb');
  post(hand, bb, level.bigBlind, 'bb');
  // BBアンティはブラインドより後に払う。メインポットに入るデッドマネー
  const ante = Math.min(level.ante, bb.stack);
  if (ante > 0) {
    bb.stack -= ante;
    hand.deadMoney += ante;
    if (bb.stack === 0) bb.allIn = true;
    log(hand, bb, 'ante', ante);
  }

  // プリフロップはBBの左隣から。ヘッズアップでもBBの次はSB（ボタン）になるので同じ式でよい（Rule 87）
  return settle(hand, positions.bbSeat);
}

function post(hand: HandState, p: HandPlayer, amount: number, kind: 'sb' | 'bb') {
  const paid = Math.min(amount, p.stack);
  move(p, paid);
  log(hand, p, kind, paid);
}

// ---------- アクション ----------

export function currentPlayer(hand: HandState): HandPlayer | null {
  return hand.players.find((p) => p.seat === hand.toActSeat) ?? null;
}

export function legalActions(hand: HandState): LegalActions | null {
  const p = currentPlayer(hand);
  if (!p || hand.phase !== 'betting') return null;

  const toCall = hand.currentBet - p.streetBet;
  const maxTo = p.streetBet + p.stack;
  const othersCanRespond = hand.players.some((o) => o !== p && !o.folded && !o.allIn);
  // すでにアクションした人は、その後にフルレイズ分以上の上乗せがない限りレイズできない（Rule 96）
  const reopened = !p.acted || hand.currentBet - p.actedAt >= hand.minRaise;

  return {
    canCheck: toCall <= 0,
    canCall: toCall > 0,
    callAmount: Math.min(Math.max(toCall, 0), p.stack),
    canRaise: othersCanRespond && reopened && maxTo > hand.currentBet,
    isBet: hand.currentBet === 0,
    minTo: Math.min(hand.currentBet + hand.minRaise, maxTo),
    maxTo,
  };
}

export function applyAction(state: HandState, action: Action): HandState {
  const hand = clone(state);
  const p = currentPlayer(hand);
  const legal = legalActions(hand);
  if (!p || !legal) throw new RuleError('noActor');

  switch (action.type) {
    case 'fold':
      p.folded = true;
      log(hand, p, 'fold', 0);
      break;

    case 'check':
      if (!legal.canCheck) throw new RuleError('cannotCheck');
      log(hand, p, 'check', 0);
      break;

    case 'call': {
      if (!legal.canCall) throw new RuleError('nothingToCall');
      move(p, legal.callAmount);
      log(hand, p, 'call', legal.callAmount);
      break;
    }

    case 'raise': {
      const { to } = action;
      if (!legal.canRaise) throw new RuleError('cannotRaise');
      if (to > legal.maxTo) throw new RuleError('exceedsStack');
      // 最低額に届かないのはオールインのときだけ許される
      if (to < legal.minTo && to !== legal.maxTo) {
        throw new RuleError('belowMinimum', { min: legal.minTo });
      }
      const increment = to - hand.currentBet;
      // フルレイズのときだけ、次の最低上乗せ額が更新される（ショートオールインでは変わらない）
      if (increment >= hand.minRaise) hand.minRaise = increment;
      const kind = legal.isBet ? 'bet' : 'raise';
      const paid = to - p.streetBet;
      hand.currentBet = to;
      hand.lastAggressorSeat = p.seat;
      move(p, paid);
      log(hand, p, kind, paid);
      break;
    }
  }

  p.acted = true;
  p.actedAt = hand.currentBet;
  return settle(hand, p.seat);
}

// ---------- 進行の判定 ----------

function needsToAct(hand: HandState, p: HandPlayer): boolean {
  return !p.folded && !p.allIn && (!p.acted || p.streetBet < hand.currentBet);
}

function isRoundComplete(hand: HandState): boolean {
  const live = hand.players.filter((p) => !p.folded && !p.allIn);
  if (live.length === 0) return true;
  // 他が全員オールインで、残る1人がすでに額をそろえているなら、もう誰もアクションしなくてよい
  if (live.length === 1 && live[0].streetBet >= hand.currentBet) return true;
  return !hand.players.some((p) => needsToAct(hand, p));
}

function nextToAct(hand: HandState, fromSeat: number): number | null {
  const ordered = [...hand.players].sort(
    (a, b) => distanceFromButton(a.seat, fromSeat) - distanceFromButton(b.seat, fromSeat),
  );
  return ordered.find((p) => needsToAct(hand, p))?.seat ?? null;
}

function settle(hand: HandState, lastSeat: number): HandState {
  const inHand = hand.players.filter((p) => !p.folded);

  if (inHand.length === 1) {
    returnUncalled(hand);
    hand.pots = computePots(hand.players, hand.deadMoney);
    award(
      hand,
      hand.pots.map(() => [inHand[0].playerId]),
    );
    return hand;
  }

  if (!isRoundComplete(hand)) {
    hand.toActSeat = nextToAct(hand, lastSeat);
    return hand;
  }

  returnUncalled(hand);
  const live = inHand.filter((p) => !p.allIn);
  if (hand.street === 'river' || live.length <= 1) {
    goToShowdown(hand);
    return hand;
  }

  startNextStreet(hand);
  return hand;
}

/** 誰もコールしていない分を、出した本人に返す */
function returnUncalled(hand: HandState) {
  const sorted = [...hand.players].sort((a, b) => b.streetBet - a.streetBet);
  const top = sorted[0];
  const second = sorted[1]?.streetBet ?? 0;
  const refund = top.streetBet - second;
  if (refund > 0) {
    top.streetBet -= refund;
    top.totalBet -= refund;
    top.stack += refund;
    top.allIn = false;
  }
}

function startNextStreet(hand: HandState) {
  hand.street = STREETS[STREETS.indexOf(hand.street) + 1];
  hand.currentBet = 0;
  hand.minRaise = hand.level.bigBlind;
  hand.lastAggressorSeat = null;
  for (const p of hand.players) {
    p.streetBet = 0;
    p.acted = false;
    p.actedAt = 0;
  }
  // フロップ以降はボタンの左隣から（Rule 72）
  hand.toActSeat = nextToAct(hand, hand.positions.buttonSeat);
}

function goToShowdown(hand: HandState) {
  hand.phase = 'showdown';
  hand.toActSeat = null;
  hand.runout = STREETS.slice(STREETS.indexOf(hand.street) + 1);
  hand.pots = computePots(hand.players, hand.deadMoney);

  // 最後のラウンドで最後にベット／レイズした人が最初に見せる。いなければボタンの左から（Rule 72）
  const inHand = hand.players.filter((p) => !p.folded);
  const aggressor = inHand.find((p) => p.seat === hand.lastAggressorSeat);
  hand.showFirstSeat =
    hand.runout.length === 0 && aggressor
      ? aggressor.seat
      : [...inHand].sort(
          (a, b) =>
            distanceFromButton(a.seat, hand.positions.buttonSeat) -
            distanceFromButton(b.seat, hand.positions.buttonSeat),
        )[0].seat;

  // 参加者が1人だけのポット（他の人が降りたサイドポットなど）はすぐに渡す
  if (hand.pots.every((pot) => pot.eligible.length === 1)) {
    award(
      hand,
      hand.pots.map((pot) => pot.eligible),
    );
  }
}

// ---------- ショーダウン ----------

/** 選ぶ必要があるポット（参加者が2人以上）の番号 */
export function contestedPots(hand: HandState): number[] {
  return hand.pots.flatMap((pot, i) => (pot.eligible.length > 1 ? [i] : []));
}

/**
 * ショーダウンの結果を入力する。winners[i] は i 番目のポットの勝者（引き分けなら複数人）。
 * 参加者が1人だけのポットは省略してよい。
 */
export function resolveShowdown(state: HandState, winners: (string[] | undefined)[]): HandState {
  if (state.phase !== 'showdown') throw new RuleError('notShowdown');
  const hand = clone(state);
  const resolved = hand.pots.map((pot, i) => {
    const w = pot.eligible.length === 1 ? pot.eligible : (winners[i] ?? []);
    if (w.length === 0) throw new RuleError('potNeedsWinner', { pot: i + 1 });
    if (!w.every((id) => pot.eligible.includes(id))) {
      throw new RuleError('winnerNotEligible', { pot: i + 1 });
    }
    return w;
  });
  award(hand, resolved);
  return hand;
}

function award(hand: HandState, winners: string[][]) {
  hand.awards = hand.pots.map((pot, potIndex) => {
    const seats = winners[potIndex].map(
      (id) => hand.players.find((p) => p.playerId === id)!.seat,
    );
    const bySeat = splitPot(pot.amount, seats, hand.positions.buttonSeat, hand.minChip);
    const shares: Record<string, number> = {};
    for (const [seat, amount] of bySeat) {
      const p = hand.players.find((x) => x.seat === seat)!;
      p.stack += amount;
      shares[p.playerId] = amount;
    }
    return { potIndex, winners: winners[potIndex], shares };
  });
  hand.phase = 'complete';
  hand.toActSeat = null;
}

// ---------- 共通 ----------

function move(p: HandPlayer, amount: number) {
  p.stack -= amount;
  p.streetBet += amount;
  p.totalBet += amount;
  if (p.stack === 0) p.allIn = true;
}

function log(hand: HandState, p: HandPlayer, kind: ActionLog['kind'], amount: number) {
  hand.actions.push({
    seat: p.seat,
    playerId: p.playerId,
    street: hand.street,
    kind,
    amount,
    streetBet: p.streetBet,
    allIn: p.allIn,
  });
}

/** ポットの合計（まだポットにまとめていない、このストリートのベットも含む） */
export function totalPot(hand: HandState): number {
  return hand.deadMoney + hand.players.reduce((sum, p) => sum + p.totalBet, 0);
}
