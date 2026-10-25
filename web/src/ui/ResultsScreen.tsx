import { standings, type TournamentState } from '../engine';
import type { GameAction } from '../state/gameReducer';

interface Props {
  t: TournamentState;
  dispatch: (action: GameAction) => void;
}

export function ResultsScreen({ t, dispatch }: Props) {
  const rows = standings(t);
  const totalEntries = t.players.reduce((sum, p) => sum + p.entries, 0);
  const winner = t.players.find((p) => p.id === rows[0]?.playerId);

  return (
    <div className="screen results">
      <h1>トーナメント終了</h1>
      {winner && <p className="winner">{winner.name} の優勝！</p>}
      <p className="muted">
        {t.handNumber}ハンド・{totalEntries}エントリー
      </p>

      <ul className="standings card">
        {rows.map((s) => {
          const p = t.players.find((x) => x.id === s.playerId)!;
          return (
            <li key={s.playerId}>
              <span className="place">{s.place}位</span>
              <span className="grow">
                {p.name}
                {p.entries > 1 && <span className="muted small">（{p.entries}エントリー）</span>}
              </span>
              <span className="muted small">
                {s.eliminatedInHand ? `Hand #${s.eliminatedInHand} で脱落` : '優勝'}
              </span>
            </li>
          );
        })}
      </ul>

      <button className="primary big" onClick={() => dispatch({ type: 'reset' })}>
        新しいトーナメント
      </button>
    </div>
  );
}
