import type { HandState, Player } from '../engine';
import { chips, potLabel } from '../state/format';
import type { GameAction } from '../state/gameReducer';

interface Props {
  hand: HandState;
  players: Player[];
  dispatch: (action: GameAction) => void;
}

export function HandResult({ hand, players, dispatch }: Props) {
  const nameOf = (id: string) => players.find((p) => p.id === id)!.name;
  const busted = hand.players.filter((p) => p.stack === 0);

  return (
    <div className="panel result-panel">
      <div className="panel-title">
        <strong>Hand #{hand.handNumber} の結果</strong>
      </div>
      <ul className="award-list">
        {hand.awards.map((award) => (
          <li key={award.potIndex}>
            <span className="muted">{potLabel(award.potIndex, hand.awards.length)}</span>{' '}
            {Object.entries(award.shares)
              .map(([id, amount]) => `${nameOf(id)} +${chips(amount)}`)
              .join('、')}
          </li>
        ))}
      </ul>
      <ul className="delta-list">
        {hand.players.map((p) => {
          const delta = p.stack - p.startingStack;
          return (
            <li key={p.playerId} className={delta > 0 ? 'plus' : delta < 0 ? 'minus' : ''}>
              <span>{nameOf(p.playerId)}</span>
              <span>
                {delta > 0 ? '+' : ''}
                {chips(delta)} → {chips(p.stack)}
              </span>
            </li>
          );
        })}
      </ul>
      {busted.length > 0 && (
        <p className="notice">{busted.map((p) => nameOf(p.playerId)).join('、')} が脱落しました</p>
      )}
      <button className="primary" onClick={() => dispatch({ type: 'finishHand' })}>
        次へ
      </button>
    </div>
  );
}
