import type { HandPlayer, Pot } from './types';

export const TABLE_SIZE = 10;

/**
 * 各プレイヤーが出した合計額から、メインポットとサイドポットを作る（Rule 74）。
 * 誰もコールしていない分は、呼び出す前に返却しておくこと。
 */
export function computePots(players: HandPlayer[], deadMoney: number): Pot[] {
  const levels = [...new Set(players.map((p) => p.totalBet).filter((v) => v > 0))].sort(
    (a, b) => a - b,
  );
  const pots: Pot[] = [];
  let prev = 0;

  for (const level of levels) {
    const amount = players.reduce(
      (sum, p) => sum + Math.min(p.totalBet, level) - Math.min(p.totalBet, prev),
      0,
    );
    const eligible = players.filter((p) => !p.folded && p.totalBet >= level).map((p) => p.playerId);
    const last = pots[pots.length - 1];

    if (last && (eligible.length === 0 || sameMembers(last.eligible, eligible))) {
      last.amount += amount;
    } else {
      pots.push({ amount, eligible });
    }
    prev = level;
  }

  if (deadMoney > 0) {
    if (pots.length === 0) {
      pots.push({ amount: 0, eligible: players.filter((p) => !p.folded).map((p) => p.playerId) });
    }
    pots[0].amount += deadMoney;
  }
  return pots;
}

function sameMembers(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * 引き分けのときにポットを分ける（Rule 73）。
 * 一番小さいチップ単位で等分し、割り切れない分はボタンの左に近い勝者から1枚ずつ配る。
 * 戻り値は 席番号 → 受け取る額。
 */
export function splitPot(
  amount: number,
  winnerSeats: number[],
  buttonSeat: number,
  minChip: number,
): Map<number, number> {
  const ordered = [...winnerSeats].sort(
    (a, b) => distanceFromButton(a, buttonSeat) - distanceFromButton(b, buttonSeat),
  );
  const units = Math.floor(amount / minChip);
  const leftover = amount - units * minChip;
  const base = Math.floor(units / ordered.length);
  const extra = units % ordered.length;

  const shares = new Map<number, number>();
  ordered.forEach((seat, i) => {
    shares.set(seat, (base + (i < extra ? 1 : 0)) * minChip + (i === 0 ? leftover : 0));
  });
  return shares;
}

/** ボタンの左隣を1として、時計回りに何席目か */
export function distanceFromButton(seat: number, buttonSeat: number): number {
  const d = (seat - buttonSeat + TABLE_SIZE) % TABLE_SIZE;
  return d === 0 ? TABLE_SIZE : d;
}
