import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { HandState, Player } from '../engine';
import { chips, potLabel } from '../state/format';
import type { GameAction } from '../state/gameReducer';

interface Props {
  hand: HandState;
  players: Player[];
  dispatch: (action: GameAction) => void;
}

/** オールインの後に開くのは、フロップ・ターン・リバーのどこからか */
type RunoutFrom = 'flop' | 'turn' | 'river';

export function ShowdownPanel({ hand, players, dispatch }: Props) {
  const { t } = useTranslation();
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
        <strong>{t('showdown.title')}</strong>
      </div>
      {hand.runout.length > 0 && (
        <p className="notice">{t(`showdown.runout.${hand.runout[0] as RunoutFrom}`)}</p>
      )}
      {showFirst && hand.runout.length === 0 && (
        <p className="notice">{t('showdown.showFirst', { name: nameOf(showFirst.playerId) })}</p>
      )}

      {hand.pots.map((pot, i) => (
        <div key={i} className="pot-choice">
          <div className="pot-choice-title">
            {potLabel(i, hand.pots.length, t)} <strong>{chips(pot.amount)}</strong>
          </div>
          {pot.eligible.length === 1 ? (
            <p className="muted">{t('showdown.uncontested', { name: nameOf(pot.eligible[0]) })}</p>
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
          {winners[i].length > 1 && (
            <p className="hint">{t('showdown.split', { count: winners[i].length })}</p>
          )}
        </div>
      ))}

      <button
        className="primary"
        disabled={!ready}
        onClick={() => dispatch({ type: 'showdown', winners })}
      >
        {t('showdown.confirm')}
      </button>
    </div>
  );
}
