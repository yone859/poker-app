import { describe, expect, it } from 'vitest';
import { legalActions } from './hand';
import { PRESETS } from './presets';
import {
  act,
  addPlayer,
  canReenter,
  createTournament,
  finishHand,
  isFinished,
  reenter,
  showdown,
  standings,
  startHand,
  type TournamentState,
} from './tournament';
import type { TournamentConfig } from './types';

const MIN = 60_000;
const config: TournamentConfig = {
  startingStack: 10_000,
  structure: [
    { type: 'level', smallBlind: 100, bigBlind: 200, ante: 200, minutes: 20 },
    { type: 'level', smallBlind: 200, bigBlind: 400, ante: 400, minutes: 20 },
  ],
  minChip: 100,
  reentry: { enabled: true, maxEntries: 2, lastLevel: 1 },
};

/** 全員オールイン → 指定した人がすべてのポットを取る */
function allInHand(t: TournamentState, winnerId: string): TournamentState {
  t = startHand(t, 0);
  while (t.hand!.phase === 'betting') {
    const legal = legalActions(t.hand!)!;
    t = act(
      t,
      legal.canRaise
        ? { type: 'raise', to: legal.maxTo }
        : legal.canCall
          ? { type: 'call' }
          : { type: 'check' },
    );
  }
  if (t.hand!.phase === 'showdown') {
    t = showdown(
      t,
      t.hand!.pots.map((pot) => (pot.eligible.includes(winnerId) ? [winnerId] : pot.eligible)),
    );
  }
  return finishHand(t);
}

describe('トーナメントの流れ', () => {
  it('ハンドが終わるとスタックが反映され、0になった人は脱落する', () => {
    let t = createTournament(config, ['A', 'B', 'C'], { now: 0 });
    t = allInHand(t, 'p1');
    expect(t.players.map((p) => p.stack)).toEqual([30_000, 0, 0]);
    expect(t.players.map((p) => p.isOut)).toEqual([false, true, true]);
    expect(t.history).toHaveLength(1);
  });

  it('同じハンドで脱落したら、開始時のチップが多い方が上位（Rule 126）', () => {
    let t = createTournament(config, ['A', 'B', 'C'], { now: 0 });
    // 1ハンド目（ボタン席0・SB席1・BB席2）：Aがレイズして2人が降りる
    t = startHand(t, 0);
    t = act(t, { type: 'raise', to: 600 });
    t = act(t, { type: 'fold' });
    t = act(t, { type: 'fold' });
    t = finishHand(t);
    expect(t.players.map((p) => p.stack)).toEqual([10_500, 9_900, 9_600]);

    // 2ハンド目：全員オールインでAの勝ち。BとCが同時に脱落し、開始時のチップが多いBが上位
    t = allInHand(t, 'p1');
    expect(standings(t).map((x) => [x.playerId, x.place])).toEqual([
      ['p1', 1],
      ['p2', 2],
      ['p3', 3],
    ]);
  });

  it('リエントリーすると満額で復帰し、前の脱落は順位から消える', () => {
    let t = createTournament(config, ['A', 'B', 'C'], { now: 0 });
    t = allInHand(t, 'p1');
    expect(isFinished(t, 0)).toBe(false); // まだリエントリーできる人がいる
    expect(canReenter(t, 'p2', 0)).toBe(true);

    t = reenter(t, 'p2', 0);
    expect(t.players[1]).toMatchObject({ stack: 10_000, entries: 2, isOut: false });
    expect(standings(t).find((s) => s.playerId === 'p2')!.eliminatedInHand).toBeNull();

    // エントリーの上限（2回）に達したらもうできない
    t = allInHand(t, 'p1');
    expect(canReenter(t, 'p2', 0)).toBe(false);
  });

  it('受付が締め切られたらリエントリーできず、1人残ればトーナメント終了', () => {
    let t = createTournament(config, ['A', 'B'], { now: 0 });
    t = allInHand(t, 'p1');
    const afterDeadline = 21 * MIN;
    // タイマーが動いていないので、まだレベル1
    expect(canReenter(t, 'p2', afterDeadline)).toBe(true);
    t = { ...t, clock: { ...t.clock, running: true } };
    expect(canReenter(t, 'p2', afterDeadline)).toBe(false);
    expect(isFinished(t, afterDeadline)).toBe(true);
    expect(standings(t)[0]).toMatchObject({ playerId: 'p1', place: 1 });
  });

  it('受付期間中なら空いている席にプレイヤーを追加できる', () => {
    let t = createTournament(config, ['A', 'B'], { now: 0 });
    t = addPlayer(t, 'D', 5, 0);
    expect(t.players[2]).toMatchObject({ id: 'p3', name: 'D', seat: 5, stack: 10_000 });
    expect(() => addPlayer(t, 'E', 5, 0)).toThrow();
  });

  it('タイマーでレベルが上がると、次のハンドから新しいブラインド（Rule 79）', () => {
    let t = createTournament(config, ['A', 'B', 'C'], { now: 0 });
    t = { ...t, clock: { ...t.clock, running: true } };
    t = startHand(t, 19 * MIN);
    expect(t.hand!.level.bigBlind).toBe(200);
    t = act(t, { type: 'fold' });
    t = act(t, { type: 'fold' });
    t = finishHand(t);
    t = startHand(t, 21 * MIN);
    expect(t.hand!.level.bigBlind).toBe(400);
  });
});

describe('プリセット', () => {
  it('どのプリセットもブラインドが単調に上がり、最小チップで割り切れる', () => {
    for (const preset of PRESETS) {
      const levels = preset.config.structure.filter((s) => s.type === 'level');
      levels.forEach((lv, i) => {
        expect(lv.smallBlind % preset.config.minChip).toBe(0);
        if (i > 0) expect(lv.bigBlind).toBeGreaterThan(levels[i - 1].bigBlind);
      });
    }
  });
});
