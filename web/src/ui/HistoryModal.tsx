import type { TFunction } from 'i18next';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ActionLog, HandState, Player, Street } from '../engine';
import { blindsText, chips, potLabel } from '../state/format';

interface Props {
  hands: HandState[];
  players: Player[];
  onClose: () => void;
}

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

function describe(a: ActionLog, t: TFunction): string {
  const allIn = a.allIn ? t('history.allInSuffix') : '';
  switch (a.kind) {
    case 'sb':
    case 'bb':
    case 'ante':
      return t(`history.${a.kind}`, { amount: chips(a.amount) }) + allIn;
    case 'fold':
    case 'check':
      return t(`history.${a.kind}`);
    case 'call':
    case 'bet':
    case 'raise':
      return t(`history.${a.kind}`, { amount: chips(a.streetBet) }) + allIn;
  }
}

export function HistoryModal({ hands, players, onClose }: Props) {
  const { t } = useTranslation();
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const newestFirst = [...hands].reverse();
  const [openHand, setOpenHand] = useState<number | null>(newestFirst[0]?.handNumber ?? null);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>{t('history.title')}</h2>
          <button className="icon" aria-label={t('common.close')} onClick={onClose}>×</button>
        </div>
        {newestFirst.length === 0 && <p className="hint">{t('history.empty')}</p>}

        <ul className="history">
          {newestFirst.map((hand) => {
            const open = openHand === hand.handNumber;
            const winners = hand.awards.flatMap((a) => Object.keys(a.shares));
            return (
              <li key={hand.handNumber}>
                <button
                  className="history-head"
                  onClick={() => setOpenHand(open ? null : hand.handNumber)}
                >
                  <span>
                    {open ? '▼' : '▶'} {t('table.handNo', { n: hand.handNumber })}
                  </span>
                  <span className="muted small">{blindsText(hand.level, t)}</span>
                  <span className="grow history-winner">
                    {hand.phase === 'complete'
                      ? [...new Set(winners)].map(nameOf).join(t('common.dot'))
                      : t('history.inProgress')}
                  </span>
                </button>

                {open && (
                  <div className="history-body">
                    {STREETS.map((street) => {
                      const actions = hand.actions.filter((a) => a.street === street);
                      if (actions.length === 0) return null;
                      return (
                        <div key={street}>
                          <div className="history-street">{t(`streets.${street}`)}</div>
                          <ul>
                            {actions.map((a, i) => (
                              <li key={i}>
                                <span>{nameOf(a.playerId)}</span>
                                <span>{describe(a, t)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    {hand.awards.map((award) => (
                      <div key={award.potIndex} className="history-award">
                        {potLabel(award.potIndex, hand.awards.length, t)}
                        {t('history.awardSeparator')}
                        {Object.entries(award.shares)
                          .map(([id, amount]) => `${nameOf(id)} +${chips(amount)}`)
                          .join(t('common.listSeparator'))}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
