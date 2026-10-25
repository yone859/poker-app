import {
  activePlayers,
  nextPositions,
  totalPot,
  type ActionLog,
  type Positions,
  type TournamentState,
} from '../engine';
import { BOARD_CARDS, chips, STREET_LABEL } from '../state/format';

const ACTION_LABEL: Record<ActionLog['kind'], string> = {
  sb: 'SB',
  bb: 'BB',
  ante: 'BB',
  fold: 'フォールド',
  check: 'チェック',
  call: 'コール',
  bet: 'ベット',
  raise: 'レイズ',
};

/** ハンドの間は、次のハンドのボタン位置を先に表示する */
function displayPositions(t: TournamentState): Positions | null {
  if (t.hand) return t.hand.positions;
  const active = activePlayers(t).map((p) => p.seat);
  return active.length >= 2 ? nextPositions(t.positions, active, t.initialButtonSeat) : null;
}

export function TableView({ t }: { t: TournamentState }) {
  const hand = t.hand;
  const positions = displayPositions(t);
  const usedSeats = [
    ...t.players.map((p) => p.seat),
    ...(positions ? [positions.buttonSeat, positions.sbSeat, positions.bbSeat] : []),
  ];
  const size = Math.max(2, ...usedSeats.map((s) => s + 1));

  const street = hand?.street ?? 'preflop';
  const openCards = hand?.phase === 'showdown' || hand?.phase === 'complete'
    ? (hand.runout.length > 0 ? 5 : BOARD_CARDS[street])
    : BOARD_CARDS[street];

  return (
    <div className="table-area">
      <div className="felt">
        <div className="felt-center">
          {hand ? (
            <>
              <div className="hand-no">Hand #{hand.handNumber}</div>
              <div className="street">{STREET_LABEL[street]}</div>
              <div className="board">
                {Array.from({ length: 5 }, (_, i) => (
                  <span key={i} className={`card-slot ${i < openCards ? 'open' : ''}`} />
                ))}
              </div>
              <div className="pot">ポット {chips(totalPot(hand))}</div>
            </>
          ) : (
            <div className="street muted">次のハンド #{t.handNumber + 1}</div>
          )}
        </div>
      </div>

      {Array.from({ length: size }, (_, seat) => {
        // 席0を画面の下にして、時計回りに並べる
        const angle = Math.PI / 2 + (seat * 2 * Math.PI) / size;
        const style = {
          left: `${50 + 37 * Math.cos(angle)}%`,
          top: `${50 + 43 * Math.sin(angle)}%`,
        };
        const player = t.players.find((p) => p.seat === seat);
        const hp = hand?.players.find((p) => p.seat === seat);
        // ヘッズアップではボタンとSBが同じ席になる（Rule 87）
        const badges = positions
          ? [
              positions.buttonSeat === seat && 'D',
              positions.sbSeat === seat && 'SB',
              positions.bbSeat === seat && 'BB',
            ].filter(Boolean)
          : [];

        if (!player || (player.isOut && !hp)) {
          return (
            <div key={seat} className="seat empty" style={style}>
              {badges.map((b) => (
                <span key={String(b)} className={`badge b-${b}`}>{b}</span>
              ))}
              <span className="seat-name">{player ? `${player.name}（OUT）` : '空席'}</span>
            </div>
          );
        }

        const lastAction = hand?.actions
          .filter((a) => a.seat === seat && a.street === hand.street && a.kind !== 'ante')
          .at(-1);
        const classes = [
          'seat',
          hand?.toActSeat === seat && 'to-act',
          hp?.folded && 'folded',
          hp?.allIn && 'all-in',
        ].filter(Boolean).join(' ');

        return (
          <div key={seat} className={classes} style={style}>
            <div className="badges">
              {badges.map((b) => (
                <span key={String(b)} className={`badge b-${b}`}>{b}</span>
              ))}
            </div>
            <span className="seat-name">{player.name}</span>
            <span className="seat-stack">{chips(hp ? hp.stack : player.stack)}</span>
            {hp?.allIn ? (
              <span className="seat-status">ALL IN</span>
            ) : hp?.folded ? (
              <span className="seat-status">FOLD</span>
            ) : lastAction ? (
              <span className="seat-status">{ACTION_LABEL[lastAction.kind]}</span>
            ) : null}
            {hp && hp.streetBet > 0 && <span className="bet-chip">{chips(hp.streetBet)}</span>}
          </div>
        );
      })}
    </div>
  );
}
