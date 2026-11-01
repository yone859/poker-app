import { describe, expect, it } from 'vitest';
import { PRESETS } from '../engine';
import { gameReducer, initialGameState, UNDO_LIMIT, type GameAction, type GameState } from './gameReducer';
import { deserialize, serialize } from './persistence';

const config = PRESETS[0].config;

function run(...actions: GameAction[]): GameState {
  return actions.reduce(gameReducer, initialGameState);
}

const create: GameAction = { type: 'create', config, names: ['A', 'B', 'C'], buttonSeat: 0, now: 0 };
const fold: GameAction = { type: 'act', action: { type: 'fold' } };

describe('Undo', () => {
  it('直前の操作を取り消せる', () => {
    const state = run(create, { type: 'startHand', now: 0 }, fold);
    expect(state.tournament!.hand!.toActSeat).toBe(1);
    const undone = gameReducer(state, { type: 'undo' });
    expect(undone.tournament!.hand!.toActSeat).toBe(0);
    expect(undone.past).toHaveLength(state.past.length - 1);
  });

  it('ハンドの開始まで戻れる', () => {
    let state = run(create, { type: 'startHand', now: 0 }, fold, fold, { type: 'finishHand' });
    for (let i = 0; i < 4; i++) state = gameReducer(state, { type: 'undo' });
    expect(state.tournament!.hand).toBeNull();
    expect(state.tournament!.handNumber).toBe(0);
    expect(gameReducer(state, { type: 'undo' })).toBe(state); // これ以上は戻れない
  });

  it('タイマーは戻さない', () => {
    let state = run(create, { type: 'startHand', now: 0 });
    state = gameReducer(state, { type: 'clockPause', now: 5 * 60_000 });
    state = gameReducer(state, fold);
    const undone = gameReducer(state, { type: 'undo' });
    expect(undone.tournament!.clock).toEqual(state.tournament!.clock);
  });

  it('タイマーの操作とエラーになった操作は、Undoの履歴に積まない', () => {
    const state = run(create, { type: 'clockStart', now: 0 }, { type: 'finishHand' });
    expect(state.past).toHaveLength(0);
    expect(state.error).not.toBeNull();
  });

  it(`履歴は最大${UNDO_LIMIT}件`, () => {
    let state = run(create);
    for (let i = 0; i < UNDO_LIMIT + 10; i++) {
      state = gameReducer(state, { type: 'startHand', now: 0 });
      state = gameReducer(state, { type: 'undo' });
      state = gameReducer(state, { type: 'startHand', now: 0 });
      state = gameReducer(state, fold);
      state = gameReducer(state, fold);
      state = gameReducer(state, { type: 'finishHand' });
    }
    expect(state.past).toHaveLength(UNDO_LIMIT);
  });

  it('新しいトーナメントを作るとUndoの履歴は消える', () => {
    const state = run(create, { type: 'startHand', now: 0 }, create);
    expect(state.past).toHaveLength(0);
  });
});

describe('保存と復元', () => {
  it('保存した状態とUndoの履歴をそのまま復元できる', () => {
    const state = run(
      create,
      { type: 'startHand', now: 0 },
      fold,
      fold,
      { type: 'finishHand' },
      { type: 'startHand', now: 0 },
      fold,
    );
    const saved = deserialize(serialize(state.tournament!, state.past))!;
    expect(saved.tournament).toEqual(state.tournament);
    expect(saved.past).toEqual(state.past);
  });

  it('過去の状態のハンド履歴は、件数だけを保存する', () => {
    const state = run(create, { type: 'startHand', now: 0 }, fold, fold, { type: 'finishHand' });
    const raw = JSON.parse(serialize(state.tournament!, state.past));
    expect(raw.past.every((p: object) => !('history' in p))).toBe(true);
    expect(raw.past.map((p: { historyLength: number }) => p.historyLength)).toEqual([0, 0, 0, 0]);
  });

  it('壊れたデータや形式の違うデータは読み込まない', () => {
    expect(deserialize(null)).toBeNull();
    expect(deserialize('{壊れた')).toBeNull();
    expect(deserialize(JSON.stringify({ version: 999, tournament: {} }))).toBeNull();
  });
});
