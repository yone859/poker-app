import { useState } from 'react';
import type { ActionLog, HandState, Player, Street } from '../engine';
import { blindsText, chips, potLabel, STREET_LABEL } from '../state/format';

interface Props {
  hands: HandState[];
  players: Player[];
  onClose: () => void;
}

const STREETS: Street[] = ['preflop', 'flop', 'turn', 'river'];

function describe(a: ActionLog): string {
  const allIn = a.allIn ? '（オールイン）' : '';
  switch (a.kind) {
    case 'sb':
      return `SB ${chips(a.amount)}${allIn}`;
    case 'bb':
      return `BB ${chips(a.amount)}${allIn}`;
    case 'ante':
      return `BBアンティ ${chips(a.amount)}${allIn}`;
    case 'fold':
      return 'フォールド';
    case 'check':
      return 'チェック';
    case 'call':
      return `コール ${chips(a.streetBet)}${allIn}`;
    case 'bet':
      return `ベット ${chips(a.streetBet)}${allIn}`;
    case 'raise':
      return `レイズ ${chips(a.streetBet)}${allIn}`;
  }
}

export function HistoryModal({ hands, players, onClose }: Props) {
  const nameOf = (id: string) => players.find((p) => p.id === id)?.name ?? id;
  const newestFirst = [...hands].reverse();
  const [openHand, setOpenHand] = useState<number | null>(newestFirst[0]?.handNumber ?? null);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="row between">
          <h2>ハンド履歴</h2>
          <button className="icon" aria-label="閉じる" onClick={onClose}>×</button>
        </div>
        {newestFirst.length === 0 && <p className="hint">まだハンドがありません。</p>}

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
                    {open ? '▼' : '▶'} Hand #{hand.handNumber}
                  </span>
                  <span className="muted small">{blindsText(hand.level)}</span>
                  <span className="grow history-winner">
                    {hand.phase === 'complete'
                      ? [...new Set(winners)].map(nameOf).join('・')
                      : 'プレイ中'}
                  </span>
                </button>

                {open && (
                  <div className="history-body">
                    {STREETS.map((street) => {
                      const actions = hand.actions.filter((a) => a.street === street);
                      if (actions.length === 0) return null;
                      return (
                        <div key={street}>
                          <div className="history-street">{STREET_LABEL[street]}</div>
                          <ul>
                            {actions.map((a, i) => (
                              <li key={i}>
                                <span>{nameOf(a.playerId)}</span>
                                <span>{describe(a)}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })}
                    {hand.awards.map((award) => (
                      <div key={award.potIndex} className="history-award">
                        {potLabel(award.potIndex, hand.awards.length)}：
                        {Object.entries(award.shares)
                          .map(([id, amount]) => `${nameOf(id)} +${chips(amount)}`)
                          .join('、')}
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
