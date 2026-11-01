import { describe, expect, it } from 'vitest';
import {
  applyAction,
  contestedPots,
  createHand,
  currentPlayer,
  legalActions,
  resolveShowdown,
  totalPot,
} from './hand';
import type { Action, BlindLevel, HandState, Positions } from './types';

const LEVEL: BlindLevel = { type: 'level', smallBlind: 100, bigBlind: 200, ante: 200, minutes: 20 };

/** 席0から順に stacks のプレイヤー（id は 's0', 's1', ...）を座らせる */
function newHand(stacks: number[], positions: Positions): HandState {
  return createHand({
    handNumber: 1,
    level: LEVEL,
    minChip: 100,
    positions,
    players: stacks.map((stack, seat) => ({ playerId: `s${seat}`, seat, stack })),
  });
}

function play(hand: HandState, ...actions: Action[]): HandState {
  return actions.reduce(applyAction, hand);
}

const fold: Action = { type: 'fold' };
const check: Action = { type: 'check' };
const call: Action = { type: 'call' };
const raise = (to: number): Action => ({ type: 'raise', to });

const stackOf = (hand: HandState, seat: number) => hand.players.find((p) => p.seat === seat)!.stack;

describe('ハンドの開始', () => {
  it('SB・BB・BBアンティを集め、BBの左隣から始まる', () => {
    const hand = newHand([10000, 10000, 10000, 10000], { buttonSeat: 0, sbSeat: 1, bbSeat: 2 });
    expect(stackOf(hand, 1)).toBe(9900);
    expect(stackOf(hand, 2)).toBe(9600);
    expect(totalPot(hand)).toBe(500);
    expect(hand.toActSeat).toBe(3);
  });

  it('SBの席が空いているときはSBなし（デッドSB）', () => {
    const hand = newHand([10000, 10000, 10000], { buttonSeat: 0, sbSeat: 5, bbSeat: 1 });
    expect(totalPot(hand)).toBe(400);
    expect(hand.toActSeat).toBe(2);
  });

  it('BBのチップが足りなければ、ブラインドを先に払い、残りをアンティにする', () => {
    const hand = newHand([10000, 10000, 300], { buttonSeat: 0, sbSeat: 1, bbSeat: 2 });
    const bb = hand.players[2];
    expect(bb.streetBet).toBe(200);
    expect(hand.deadMoney).toBe(100);
    expect(bb.allIn).toBe(true);
  });
});

describe('プリフロップ', () => {
  const positions = { buttonSeat: 0, sbSeat: 1, bbSeat: 2 };

  it('全員が降りたらBBの勝ち。誰もコールしていないBBの一部は戻る', () => {
    const hand = play(newHand([10000, 10000, 10000], positions), fold, fold);
    expect(hand.phase).toBe('complete');
    // BBは400払い、SBの100とアンティ200と自分のBB200（＝500）を受け取る
    expect(stackOf(hand, 2)).toBe(10100);
    expect(stackOf(hand, 1)).toBe(9900);
  });

  it('全員がリンプしてもBBにはチェックかレイズの権利がある（BBのオプション）', () => {
    const hand = play(newHand([10000, 10000, 10000], positions), call, call);
    expect(hand.toActSeat).toBe(2);
    const legal = legalActions(hand)!;
    expect(legal.canCheck).toBe(true);
    expect(legal.canRaise).toBe(true);
    expect(legal.minTo).toBe(400);
  });

  it('BBがチェックしたらフロップへ進み、ボタンの左隣（SB）から', () => {
    const hand = play(newHand([10000, 10000, 10000], positions), call, call, check);
    expect(hand.street).toBe('flop');
    expect(hand.toActSeat).toBe(1);
    expect(hand.currentBet).toBe(0);
    expect(legalActions(hand)!.isBet).toBe(true);
  });

  it('ミニマムレイズは直前の上乗せ額以上（Rule 96）', () => {
    let hand = newHand([10000, 10000, 10000, 10000], positions);
    hand = play(hand, raise(600)); // 上乗せ400
    expect(legalActions(hand)!.minTo).toBe(1000);
    expect(() => applyAction(hand, raise(900))).toThrow();
    hand = play(hand, raise(1500)); // 上乗せ900
    expect(legalActions(hand)!.minTo).toBe(2400);
  });
});

describe('ショートオールイン（Rule 96）', () => {
  /** 席0がボタン。全員がリンプしてフロップへ。フロップは席1 → 2 → 3 → 4 → 0 の順 */
  function toFlop(stacks: number[]): HandState {
    const hand = play(
      newHand(stacks, { buttonSeat: 0, sbSeat: 1, bbSeat: 2 }),
      call, // 席3
      call, // 席4
      call, // 席0
      call, // 席1（SB）
      check, // 席2（BB）
    );
    expect(hand.street).toBe('flop');
    return hand;
  }

  it('フルレイズに届かないオールインでは、すでにアクションした人はレイズできない', () => {
    // 席3はフロップで700しか残っていない
    let hand = toFlop([10000, 10000, 10000, 900, 10000]);
    hand = play(hand, raise(500), call, raise(700)); // A=席1ベット500、B=席2コール、席3が700オールイン
    hand = play(hand, fold, fold); // 席4、席0
    expect(currentPlayer(hand)!.seat).toBe(1);
    const legal = legalActions(hand)!;
    expect(legal.canCall).toBe(true);
    expect(legal.canRaise).toBe(false);
  });

  it('ルール資料5-9の例：オールインが続いて合計がフルレイズを超えると、BとCにレイズの権利が戻る', () => {
    // A=席1、B=席2、C=席3、D=席4（残り1,300）、E=席0（残り1,700）
    let hand = toFlop([1900, 10000, 10000, 10000, 1500]);
    hand = play(hand, raise(500), raise(1000), call, raise(1300), raise(1700));
    expect(currentPlayer(hand)!.seat).toBe(1);
    hand = play(hand, call); // A
    expect(currentPlayer(hand)!.seat).toBe(2);
    const legal = legalActions(hand)!; // B
    expect(legal.canRaise).toBe(true);
    expect(legal.minTo).toBe(2200);
  });
});

describe('ヘッズアップ（Rule 87）', () => {
  const positions = { buttonSeat: 0, sbSeat: 0, bbSeat: 1 };

  it('SB（ボタン）がプリフロップで先、フロップ以降は後', () => {
    let hand = newHand([10000, 10000], positions);
    expect(hand.toActSeat).toBe(0);
    hand = play(hand, call, check);
    expect(hand.street).toBe('flop');
    expect(hand.toActSeat).toBe(1);
  });
});

describe('オールインとサイドポット', () => {
  it('プリフロップで全員オールイン → 残りのボードを開いてショーダウン', () => {
    // 席0=ボタン 3,000、席1=SB 5,000、席2=BB 10,000
    let hand = newHand([3000, 5000, 10000], { buttonSeat: 0, sbSeat: 1, bbSeat: 2 });
    hand = play(hand, raise(3000), raise(5000), call);
    expect(hand.phase).toBe('showdown');
    expect(hand.runout).toEqual(['flop', 'turn', 'river']);
    // BBはSBの5,000にコールしただけ（＋アンティ200）なので、残りのチップは手元に残る
    expect(stackOf(hand, 2)).toBe(10000 - 5000 - 200);
    expect(hand.pots).toEqual([
      { amount: 3000 * 3 + 200, eligible: ['s0', 's1', 's2'] },
      { amount: 2000 * 2, eligible: ['s1', 's2'] },
    ]);
    expect(contestedPots(hand)).toEqual([0, 1]);

    // メインは席0、サイドは席2が勝つ
    hand = resolveShowdown(hand, [['s0'], ['s2']]);
    expect(hand.phase).toBe('complete');
    expect(stackOf(hand, 0)).toBe(9200);
    expect(stackOf(hand, 1)).toBe(0);
    expect(stackOf(hand, 2)).toBe(4800 + 4000);
  });

  it('引き分けはポットを分け、端数はボタンの左に近い人へ', () => {
    let hand = newHand([10000, 10000, 10000], { buttonSeat: 0, sbSeat: 1, bbSeat: 2 });
    hand = play(hand, fold, call, check); // SBとBBだけ。ポット 200+200+200=600
    hand = play(hand, check, check, check, check, check, check);
    expect(hand.phase).toBe('showdown');
    hand = resolveShowdown(hand, [['s1', 's2']]);
    expect(stackOf(hand, 1)).toBe(9800 + 300);
    expect(stackOf(hand, 2)).toBe(9600 + 300);
  });

  it('勝者の選択は、そのポットに参加している人だけ', () => {
    let hand = newHand([3000, 5000, 10000], { buttonSeat: 0, sbSeat: 1, bbSeat: 2 });
    hand = play(hand, raise(3000), raise(5000), call);
    expect(() => resolveShowdown(hand, [['s0'], ['s0']])).toThrow();
    expect(() => resolveShowdown(hand, [['s0']])).toThrow();
  });
});

describe('ショーダウンで最初に見せる人（Rule 72）', () => {
  const positions = { buttonSeat: 0, sbSeat: 1, bbSeat: 2 };

  it('リバーで最後にベットした人が最初', () => {
    let hand = play(newHand([10000, 10000, 10000], positions), call, call, check);
    hand = play(hand, check, check, check, check, check, check); // フロップ・ターン
    hand = play(hand, check, raise(1000), call, call); // リバーで席2がベット
    expect(hand.phase).toBe('showdown');
    expect(hand.showFirstSeat).toBe(2);
  });

  it('リバーで誰も賭けなければ、ボタンの左から', () => {
    let hand = play(newHand([10000, 10000, 10000], positions), call, call, check);
    hand = play(hand, check, check, check, check, check, check, check, check, check);
    expect(hand.showFirstSeat).toBe(1);
  });
});
