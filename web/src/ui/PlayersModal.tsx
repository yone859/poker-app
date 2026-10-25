import { useState } from 'react';
import {
  canReenter,
  registrationOpen,
  standings,
  TABLE_SIZE,
  type TournamentState,
} from '../engine';
import { chips } from '../state/format';
import type { GameAction } from '../state/gameReducer';

interface Props {
  t: TournamentState;
  now: number;
  dispatch: (action: GameAction) => void;
  onClose: () => void;
}

export function PlayersModal({ t, now, dispatch, onClose }: Props) {
  const freeSeats = Array.from({ length: TABLE_SIZE }, (_, i) => i).filter(
    (s) => !t.players.some((p) => p.seat === s),
  );
  const [newName, setNewName] = useState('');
  const [newSeat, setNewSeat] = useState(freeSeats[0] ?? -1);
  const open = registrationOpen(t, now);
  const rows = standings(t);
  const nameTaken = t.players.some((p) => p.name === newName.trim());

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>プレイヤー</h2>
          <button className="icon" aria-label="閉じる" onClick={onClose}>×</button>
        </div>

        <ul className="standings">
          {rows.map((s) => {
            const p = t.players.find((x) => x.id === s.playerId)!;
            return (
              <li key={s.playerId} className={p.isOut ? 'out' : ''}>
                <span className="place">{s.place}</span>
                <span className="grow">
                  {p.name}
                  <span className="muted small">
                    {' '}席{p.seat + 1}
                    {p.entries > 1 && `・${p.entries}エントリー`}
                  </span>
                </span>
                {p.isOut ? (
                  canReenter(t, p.id, now) ? (
                    <button onClick={() => dispatch({ type: 'reenter', playerId: p.id, now: Date.now() })}>
                      リエントリー
                    </button>
                  ) : (
                    <span className="muted small">Hand #{s.eliminatedInHand} で脱落</span>
                  )
                ) : (
                  <span>{chips(s.stack)}</span>
                )}
              </li>
            );
          })}
        </ul>
        {t.hand && <p className="hint">リエントリーはハンドとハンドの間にできます。</p>}

        {open && freeSeats.length > 0 && (
          <div className="add-player">
            <h3>途中参加</h3>
            <div className="row gap">
              <input
                className="text-field"
                placeholder="名前"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <select value={newSeat} onChange={(e) => setNewSeat(Number(e.target.value))}>
                {freeSeats.map((s) => (
                  <option key={s} value={s}>席{s + 1}</option>
                ))}
              </select>
              <button
                disabled={!newName.trim() || nameTaken || !!t.hand}
                onClick={() => {
                  dispatch({ type: 'addPlayer', name: newName.trim(), seat: newSeat, now: Date.now() });
                  setNewName('');
                  setNewSeat(freeSeats.find((s) => s !== newSeat) ?? -1);
                }}
              >
                追加
              </button>
            </div>
            {nameTaken && <p className="hint warn">同じ名前のプレイヤーがいます</p>}
            <p className="hint">{chips(t.config.startingStack)}点で参加します（Rule 14）。</p>
          </div>
        )}
      </div>
    </div>
  );
}
