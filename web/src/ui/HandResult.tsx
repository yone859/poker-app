import { useTranslation } from 'react-i18next';
import type { HandState, Player } from '@holdem/shared/engine';
import { chips, potLabel } from '@holdem/shared/state/format';
import type { GameAction } from '@holdem/shared/state/gameReducer';

interface Props {
  hand: HandState;
  players: Player[];
  dispatch: (action: GameAction) => void;
}

export function HandResult({ hand, players, dispatch }: Props) {
  const { t } = useTranslation();
  const nameOf = (id: string) => players.find((p) => p.id === id)!.name;
  const busted = hand.players.filter((p) => p.stack === 0);

  return (
    <div className="panel result-panel">
      <div className="panel-title">
        <strong>{t('result.title', { n: hand.handNumber })}</strong>
      </div>
      <ul className="award-list">
        {hand.awards.map((award) => (
          <li key={award.potIndex}>
            <span className="muted">{potLabel(award.potIndex, hand.awards.length, t)}</span>{' '}
            {Object.entries(award.shares)
              .map(([id, amount]) => `${nameOf(id)} +${chips(amount)}`)
              .join(t('common.listSeparator'))}
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
        <p className="notice">
          {t('result.eliminated', {
            names: busted.map((p) => nameOf(p.playerId)).join(t('common.listSeparator')),
          })}
        </p>
      )}
      <button className="primary" onClick={() => dispatch({ type: 'finishHand' })}>
        {t('result.next')}
      </button>
    </div>
  );
}
