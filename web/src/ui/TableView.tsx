import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  activePlayers,
  nextPositions,
  totalPot,
  type Positions,
  type TournamentState,
} from '@holdem/shared/engine';
import { BOARD_CARDS, chips } from '@holdem/shared/state/format';

/** 席の右上のバッジ（D・SB・BB）は、席の枠より上にはみ出す（App.css の .badges の top） */
const BADGE_OVERHANG = 10;

/**
 * 席は中身（アクション・ベット額）によって背が伸びるので、描いたあとに実際の上端・下端を測り、
 * テーブルの枠からはみ出す分だけ上下に余白を取る（取らないと、上のタイマーや下のパネルに重なる）
 */
function useSeatOverflow() {
  const areaRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState({ top: 0, bottom: 0 });
  const measure = useCallback(() => {
    const area = areaRef.current;
    if (!area) return;
    const a = area.getBoundingClientRect();
    let top = 0;
    let bottom = 0;
    for (const seat of area.querySelectorAll('.seat')) {
      const r = seat.getBoundingClientRect();
      top = Math.max(top, BADGE_OVERHANG - (r.top - a.top));
      bottom = Math.max(bottom, r.bottom - a.bottom);
    }
    const next = { top: Math.ceil(top), bottom: Math.ceil(bottom) };
    setOverflow((prev) => (prev.top === next.top && prev.bottom === next.bottom ? prev : next));
  }, []);
  // 描き直すたび（席の中身が変わったとき）と、画面の大きさが変わったときに測る
  useLayoutEffect(measure);
  useEffect(() => {
    const observer = new ResizeObserver(measure);
    if (areaRef.current) observer.observe(areaRef.current);
    return () => observer.disconnect();
  }, [measure]);
  return { areaRef, overflow };
}

/** ハンドの間は、次のハンドのボタン位置を先に表示する */
function displayPositions(tournament: TournamentState): Positions | null {
  if (tournament.hand) return tournament.hand.positions;
  const active = activePlayers(tournament).map((p) => p.seat);
  return active.length >= 2
    ? nextPositions(tournament.positions, active, tournament.initialButtonSeat)
    : null;
}

export function TableView({ tournament }: { tournament: TournamentState }) {
  const { t } = useTranslation();
  const { areaRef, overflow } = useSeatOverflow();
  const hand = tournament.hand;
  const positions = displayPositions(tournament);
  const usedSeats = [
    ...tournament.players.map((p) => p.seat),
    ...(positions ? [positions.buttonSeat, positions.sbSeat, positions.bbSeat] : []),
  ];
  const size = Math.max(2, ...usedSeats.map((s) => s + 1));

  const street = hand?.street ?? 'preflop';
  const openCards = hand?.phase === 'showdown' || hand?.phase === 'complete'
    ? (hand.runout.length > 0 ? 5 : BOARD_CARDS[street])
    : BOARD_CARDS[street];

  return (
    <div className="table-frame" style={{ paddingTop: overflow.top, paddingBottom: overflow.bottom }}>
      <div className="table-area" ref={areaRef}>
        <div className="felt">
          <div className="felt-center">
            {hand ? (
              <>
                <div className="hand-no">{t('table.handNo', { n: hand.handNumber })}</div>
                <div className="street">{t(`streets.${street}`)}</div>
                <div className="board">
                  {Array.from({ length: 5 }, (_, i) => (
                    <span key={i} className={`card-slot ${i < openCards ? 'open' : ''}`} />
                  ))}
                </div>
                <div className="pot">{t('table.pot', { amount: chips(totalPot(hand)) })}</div>
              </>
            ) : (
              <div className="street muted">{t('table.nextHand', { n: tournament.handNumber + 1 })}</div>
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
          const player = tournament.players.find((p) => p.seat === seat);
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
                <span className="seat-name">
                  {player ? t('table.outSeat', { name: player.name }) : t('table.emptySeat')}
                </span>
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
                <span className="seat-status">{t('table.allIn')}</span>
              ) : hp?.folded ? (
                <span className="seat-status">{t('table.folded')}</span>
              ) : lastAction ? (
                <span className="seat-status">{t(`seatAction.${lastAction.kind}`)}</span>
              ) : null}
              {hp && hp.streetBet > 0 && <span className="bet-chip">{chips(hp.streetBet)}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
