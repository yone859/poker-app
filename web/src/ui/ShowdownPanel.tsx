import { useState } from 'react';
import type { HandState, Player } from '../engine';
import { chips, potLabel, STREET_LABEL } from '../state/format';
import type { GameAction } from '../state/gameReducer';

interface Props {
  hand: HandState;
  players: Player[];
  dispatch: (action: GameAction) => void;
}

export function ShowdownPanel({ hand, players, dispatch }: Props) {
  const nameOf = (id: string) => players.find((p) => p.id === id)!.name;
  const [winners, setWinners] = useState<string[][]>(() => hand.pots.map(() => []));
  const showFirst = hand.players.find((p) => p.seat === hand.showFirstSeat);

  function toggle(potIndex: number, playerId: string) {
    const selected = winners[potIndex];
    const updated = selected.includes(playerId)
      ? selected.filter((id) => id !== playerId)
      : [...selected, playerId];
    setWinners(
      winners.map((w, i) => {
        if (i === potIndex) return updated;
        // 後ろのサイドポットがまだ空なら、同じ人を先に選んでおく（一番強い手はそのまま他のポットも取ることが多い）
        if (i > potIndex && w.length === 0) {
          return updated.filter((id) => hand.pots[i].eligible.includes(id));
        }
        return w;
      }),
    );
  }

  const ready = hand.pots.every((pot, i) => pot.eligible.length === 1 || winners[i].length > 0);

  return (
    <div className="panel showdown-panel">
      <div className="panel-title">
        <strong>ショーダウン</strong>
      </div>
      {hand.runout.length > 0 && (
        <p className="notice">
          全員の手札を表向きにして（Rule 70）、
          {hand.runout.map((s) => STREET_LABEL[s]).join('・')}を開いてください
        </p>
      )}
      {showFirst && hand.runout.length === 0 && (
        <p className="notice">最初に見せる人：{nameOf(showFirst.playerId)}（Rule 72）</p>
      )}

      {hand.pots.map((pot, i) => (
        <div key={i} className="pot-choice">
          <div className="pot-choice-title">
            {potLabel(i, hand.pots.length)} <strong>{chips(pot.amount)}</strong>
          </div>
          {pot.eligible.length === 1 ? (
            <p className="muted">{nameOf(pot.eligible[0])} が受け取ります</p>
          ) : (
            <div className="row gap wrap">
              {pot.eligible.map((id) => (
                <button
                  key={id}
                  className={`chip-toggle ${winners[i].includes(id) ? 'selected' : ''}`}
                  onClick={() => toggle(i, id)}
                >
                  {nameOf(id)}
                </button>
              ))}
            </div>
          )}
          {winners[i].length > 1 && <p className="hint">引き分け：{winners[i].length}人で分けます</p>}
        </div>
      ))}

      <button
        className="primary"
        disabled={!ready}
        onClick={() => dispatch({ type: 'showdown', winners })}
      >
        勝者を確定
      </button>
    </div>
  );
}
