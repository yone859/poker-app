import { describe, expect, it } from 'vitest';
import {
  act,
  createTournament,
  finishHand,
  showdown,
  startHand,
  type TournamentConfig,
  type TournamentState,
} from '../engine';
import { summarize } from './summary';

const MIN = 60_000;
const config: TournamentConfig = {
  startingStack: 10_000,
  structure: [
    { type: 'level', smallBlind: 100, bigBlind: 200, ante: 200, minutes: 20 },
    { type: 'level', smallBlind: 200, bigBlind: 400, ante: 400, minutes: 20 },
  ],
  minChip: 100,
  reentry: { enabled: false, maxEntries: null, lastLevel: 1 },
};

function newTournament(): TournamentState {
  return createTournament(config, ['A', 'B', 'C'], { buttonSeat: 0, now: 0 });
}

describe('summarize', () => {
  it('ハンドを始める前', () => {
    expect(summarize(newTournament(), 0)).toEqual({
      status: 'notStarted',
      handNumber: 0,
      levelNumber: 1,
      playersLeft: 3,
      winnerName: null,
    });
  });

  it('プレイ中はハンド番号・レベル・残り人数', () => {
    let t = startHand(newTournament(), 0);
    t = act(t, { type: 'fold' });
    t = act(t, { type: 'fold' });
    t = finishHand(t);
    // 最初のハンドでタイマーが動き出しているとみなし、25分後はレベル2
    t = { ...t, clock: { ...t.clock, running: true } };
    expect(summarize(t, 25 * MIN)).toMatchObject({ status: 'playing', handNumber: 1, levelNumber: 2, playersLeft: 3 });
  });

  it('終わったら優勝者の名前', () => {
    let t = startHand(newTournament(), 0);
    t = act(t, { type: 'raise', to: 10_000 }); // A オールイン
    t = act(t, { type: 'call' }); // B
    t = act(t, { type: 'call' }); // C
    t = showdown(t, t.hand!.pots.map((pot) => (pot.eligible.includes('p1') ? ['p1'] : pot.eligible)));
    t = finishHand(t);
    expect(summarize(t, 0)).toMatchObject({ status: 'finished', playersLeft: 1, winnerName: 'A' });
  });
});
