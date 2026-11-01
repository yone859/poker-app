import { describe, expect, it } from 'vitest';
import { nextPositions } from './positions';

describe('nextPositions', () => {
  it('最初のハンド：ボタンの左がSB、その左がBB', () => {
    expect(nextPositions(null, [0, 1, 2, 3], 2)).toEqual({ buttonSeat: 2, sbSeat: 3, bbSeat: 0 });
  });

  it('最初のハンドで2人ならボタンがSB', () => {
    expect(nextPositions(null, [3, 7], 3)).toEqual({ buttonSeat: 3, sbSeat: 3, bbSeat: 7 });
  });

  it('通常はすべて1つずつ進む', () => {
    const prev = { buttonSeat: 0, sbSeat: 1, bbSeat: 2 };
    expect(nextPositions(prev, [0, 1, 2, 3], 0)).toEqual({ buttonSeat: 1, sbSeat: 2, bbSeat: 3 });
  });

  it('前回のBBが脱落：SBは空席（デッドSB）になる（Rule 85）', () => {
    const prev = { buttonSeat: 0, sbSeat: 1, bbSeat: 2 };
    expect(nextPositions(prev, [0, 1, 3], 0)).toEqual({ buttonSeat: 1, sbSeat: 2, bbSeat: 3 });
  });

  it('前回のSBが脱落：ボタンは空席に置かれる（デッドボタン）', () => {
    const prev = { buttonSeat: 0, sbSeat: 1, bbSeat: 2 };
    expect(nextPositions(prev, [0, 2, 3], 0)).toEqual({ buttonSeat: 1, sbSeat: 2, bbSeat: 3 });
  });

  it('3人から2人になったら、BBを2回続けて払う人が出ないようにする（Rule 87）', () => {
    // 席0ボタン・席1 SB・席2 BB のハンドで席0が脱落
    const prev = { buttonSeat: 0, sbSeat: 1, bbSeat: 2 };
    expect(nextPositions(prev, [1, 2], 0)).toEqual({ buttonSeat: 2, sbSeat: 2, bbSeat: 1 });
  });

  it('ヘッズアップ中は交互にBBになる', () => {
    const prev = { buttonSeat: 2, sbSeat: 2, bbSeat: 1 };
    expect(nextPositions(prev, [1, 2], 0)).toEqual({ buttonSeat: 1, sbSeat: 1, bbSeat: 2 });
  });

  it('ヘッズアップから3人に戻っても、ボタン・SB・BBが重ならない', () => {
    // 席0（ボタン兼SB）と席2（BB）のヘッズアップに、席1がリエントリー
    const prev = { buttonSeat: 0, sbSeat: 0, bbSeat: 2 };
    expect(nextPositions(prev, [0, 1, 2], 0)).toEqual({ buttonSeat: 1, sbSeat: 2, bbSeat: 0 });
  });
});
