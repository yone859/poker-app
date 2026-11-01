import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  canReenter,
  registrationOpen,
  standings,
  TABLE_SIZE,
  type TournamentState,
} from '@holdem/shared/engine';
import { chips } from '@holdem/shared/state/format';
import type { GameAction } from '@holdem/shared/state/gameReducer';

interface Props {
  tournament: TournamentState;
  now: number;
  dispatch: (action: GameAction) => void;
  onClose: () => void;
}

export function PlayersModal({ tournament, now, dispatch, onClose }: Props) {
  const { t } = useTranslation();
  const freeSeats = Array.from({ length: TABLE_SIZE }, (_, i) => i).filter(
    (s) => !tournament.players.some((p) => p.seat === s),
  );
  const [newName, setNewName] = useState('');
  const [newSeat, setNewSeat] = useState(freeSeats[0] ?? -1);
  const open = registrationOpen(tournament, now);
  const rows = standings(tournament);
  const nameTaken = tournament.players.some((p) => p.name === newName.trim());

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>{t('players.title')}</h2>
          <button className="icon" aria-label={t('common.close')} onClick={onClose}>×</button>
        </div>

        <ul className="standings">
          {rows.map((s) => {
            const p = tournament.players.find((x) => x.id === s.playerId)!;
            return (
              <li key={s.playerId} className={p.isOut ? 'out' : ''}>
                <span className="place">{s.place}</span>
                <span className="grow">
                  {p.name}
                  <span className="muted small">
                    {' '}
                    {t('common.seatN', { n: p.seat + 1 })}
                    {p.entries > 1 && `${t('common.dot')}${t('players.entries', { count: p.entries })}`}
                  </span>
                </span>
                {p.isOut ? (
                  canReenter(tournament, p.id, now) ? (
                    <button onClick={() => dispatch({ type: 'reenter', playerId: p.id, now: Date.now() })}>
                      {t('players.reenter')}
                    </button>
                  ) : (
                    <span className="muted small">
                      {t('players.eliminatedIn', { n: s.eliminatedInHand })}
                    </span>
                  )
                ) : (
                  <span>{chips(s.stack)}</span>
                )}
              </li>
            );
          })}
        </ul>
        {tournament.hand && <p className="hint">{t('players.reenterBetweenHands')}</p>}

        {open && freeSeats.length > 0 && (
          <div className="add-player">
            <h3>{t('players.lateRegistration')}</h3>
            <div className="row gap">
              <input
                className="text-field"
                placeholder={t('players.namePlaceholder')}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select value={newSeat} onChange={(e) => setNewSeat(Number(e.target.value))}>
                {freeSeats.map((s) => (
                  <option key={s} value={s}>{t('common.seatN', { n: s + 1 })}</option>
                ))}
              </select>
              <button
                disabled={!newName.trim() || nameTaken || !!tournament.hand}
                onClick={() => {
                  dispatch({ type: 'addPlayer', name: newName.trim(), seat: newSeat, now: Date.now() });
                  setNewName('');
                  setNewSeat(freeSeats.find((s) => s !== newSeat) ?? -1);
                }}
              >
                {t('players.add')}
              </button>
            </div>
            {nameTaken && <p className="hint warn">{t('players.nameTaken')}</p>}
            <p className="hint">
              {t('players.lateRegistrationStack', { stack: chips(tournament.config.startingStack) })}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
