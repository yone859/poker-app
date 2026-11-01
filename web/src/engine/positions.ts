import { distanceFromButton } from './pots';
import type { Positions } from './types';

function nextActive(activeSeats: number[], from: number): number {
  return [...activeSeats].sort(
    (a, b) => distanceFromButton(a, from) - distanceFromButton(b, from),
  )[0];
}

function prevActive(activeSeats: number[], from: number): number {
  return [...activeSeats].sort(
    (a, b) => distanceFromButton(b, from) - distanceFromButton(a, from),
  )[activeSeats.includes(from) ? 1 : 0];
}

/**
 * 次のハンドのボタン・SB・BBの席を決める。
 * デッドボタン方式（Rule 85）：BBは必ず次の生きている人へ進み、SBは前回のBBの席、ボタンは前回のSBの席。
 * そのため、脱落者がいるとSBが払われない（デッドSB）ことや、ボタンが空席に置かれることがある。
 * 2人のときはSBがボタンを持つ（Rule 87）。
 */
export function nextPositions(
  prev: Positions | null,
  activeSeats: number[],
  initialButtonSeat: number,
): Positions {
  if (activeSeats.length < 2) throw new Error('nextPositions requires at least 2 active seats');
  const headsUp = activeSeats.length === 2;

  if (!prev) {
    const button = activeSeats.includes(initialButtonSeat)
      ? initialButtonSeat
      : nextActive(activeSeats, initialButtonSeat);
    if (headsUp) {
      return { buttonSeat: button, sbSeat: button, bbSeat: nextActive(activeSeats, button) };
    }
    const sb = nextActive(activeSeats, button);
    return { buttonSeat: button, sbSeat: sb, bbSeat: nextActive(activeSeats, sb) };
  }

  const bb = nextActive(activeSeats, prev.bbSeat);
  if (headsUp) {
    const sb = activeSeats.find((s) => s !== bb)!;
    return { buttonSeat: sb, sbSeat: sb, bbSeat: bb };
  }

  const sb = prev.bbSeat;
  let button = prev.sbSeat;
  // ヘッズアップから3人以上に戻ったとき（リエントリーなど）は、ボタンがBBと重なることがある
  if (button === bb || button === sb) button = prevActive(activeSeats, sb);
  return { buttonSeat: button, sbSeat: sb, bbSeat: bb };
}
