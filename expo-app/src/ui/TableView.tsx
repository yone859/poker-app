import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import {
  activePlayers,
  nextPositions,
  totalPot,
  type Positions,
  type TournamentState,
} from '@holdem/shared/engine';
import { BOARD_CARDS, chips } from '@holdem/shared/state/format';
import { T } from './kit';
import { colors } from './theme';

const SEAT_WIDTH = 88;
const SEAT_HEIGHT = 64;
/** 席の右上のバッジ（D・SB・BB）は、席の枠より上にはみ出す（styles.badges の top） */
const BADGE_OVERHANG = 10;

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
  const window = useWindowDimensions();
  const [width, setWidth] = useState(0);
  // 席は中身（アクション・ベット額）によって下に伸びるので、実際の上端・下端を測っておく
  const [seatEdges, setSeatEdges] = useState<Record<number, { top: number; bottom: number }>>({});
  // Web版の aspect-ratio: 4/5 と max-height: 58vh に合わせる
  const tableWidth = Math.min(width, (window.height * 0.58 * 4) / 5);
  const tableHeight = (tableWidth * 5) / 4;

  const hand = tournament.hand;
  const positions = displayPositions(tournament);
  const usedSeats = [
    ...tournament.players.map((p) => p.seat),
    ...(positions ? [positions.buttonSeat, positions.sbSeat, positions.bbSeat] : []),
  ];
  const size = Math.max(2, ...usedSeats.map((s) => s + 1));

  const street = hand?.street ?? 'preflop';
  const openCards =
    hand?.phase === 'showdown' || hand?.phase === 'complete'
      ? hand.runout.length > 0
        ? 5
        : BOARD_CARDS[street]
      : BOARD_CARDS[street];

  // 席がテーブルの枠からはみ出す分だけ、上下に余白を取る（取らないと、上のタイマーや下のパネルに重なる）
  const edges = Object.values(seatEdges);
  const overTop = Math.max(0, ...edges.map((e) => BADGE_OVERHANG - e.top));
  const overBottom = Math.max(0, ...edges.map((e) => e.bottom - tableHeight));
  const measureSeat = (seat: number) => (e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    setSeatEdges((prev) =>
      prev[seat]?.top === y && prev[seat]?.bottom === y + height ? prev : { ...prev, [seat]: { top: y, bottom: y + height } },
    );
  };

  return (
    <View style={styles.area} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
      {tableWidth > 0 && (
        <View style={{ paddingTop: overTop, paddingBottom: overBottom }} testID="table">
          <View style={{ width: tableWidth, height: tableHeight }}>
            <View
              style={[
                styles.felt,
                {
                  left: tableWidth * 0.15,
                  right: tableWidth * 0.15,
                  top: tableHeight * 0.13,
                  bottom: tableHeight * 0.13,
                },
              ]}
            >
              {hand ? (
                <View style={styles.center}>
                  <T variant="small" style={{ color: 'rgba(255,255,255,0.7)' }}>
                    {t('table.handNo', { n: hand.handNumber })}
                  </T>
                  <T style={{ fontWeight: '700' }} testID="street">
                    {t(`streets.${street}`)}
                  </T>
                  <View style={styles.board}>
                    {Array.from({ length: 5 }, (_, i) => (
                      <View key={i} style={[styles.card, i < openCards && styles.cardOpen]} />
                    ))}
                  </View>
                  <T style={styles.pot} testID="pot">
                    {t('table.pot', { amount: chips(totalPot(hand)) })}
                  </T>
                </View>
              ) : (
                <T variant="muted" style={{ fontWeight: '700' }} testID="street">
                  {t('table.nextHand', { n: tournament.handNumber + 1 })}
                </T>
              )}
            </View>

            {Array.from({ length: size }, (_, seat) => {
              // 席0を画面の下にして、時計回りに並べる
              const angle = Math.PI / 2 + (seat * 2 * Math.PI) / size;
              const cx = tableWidth * (0.5 + 0.37 * Math.cos(angle));
              const cy = tableHeight * (0.5 + 0.43 * Math.sin(angle));
              const pos = { left: cx - SEAT_WIDTH / 2, top: cy - SEAT_HEIGHT / 2 };
              const player = tournament.players.find((p) => p.seat === seat);
              const hp = hand?.players.find((p) => p.seat === seat);
              // ヘッズアップではボタンとSBが同じ席になる（Rule 87）
              const badges = positions
                ? ([
                    positions.buttonSeat === seat && 'D',
                    positions.sbSeat === seat && 'SB',
                    positions.bbSeat === seat && 'BB',
                  ].filter(Boolean) as ('D' | 'SB' | 'BB')[])
                : [];
              const badgeView = (
                <View style={styles.badges}>
                  {badges.map((b) => (
                    <View key={b} style={[styles.badge, badgeColors[b]]} testID={`badge-${b}`}>
                      <T style={[styles.badgeText, b === 'D' && { color: '#111' }]}>{b}</T>
                    </View>
                  ))}
                </View>
              );

              if (!player || (player.isOut && !hp)) {
                return (
                  <View key={seat} style={[styles.seat, styles.empty, pos]} onLayout={measureSeat(seat)} testID={`seat-${seat}`}>
                    {badgeView}
                    <T variant="mutedSmall" numberOfLines={1} testID="seat-name">
                      {player ? t('table.outSeat', { name: player.name }) : t('table.emptySeat')}
                    </T>
                  </View>
                );
              }

              const lastAction = hand?.actions
                .filter((a) => a.seat === seat && a.street === hand.street && a.kind !== 'ante')
                .at(-1);
              const toAct = hand?.toActSeat === seat;

              return (
                <View
                  key={seat}
                  style={[styles.seat, pos, toAct && styles.toAct, hp?.folded && { opacity: 0.45 }]}
                  onLayout={measureSeat(seat)}
                  testID={`seat-${seat}`}
                >
                  {badgeView}
                  <T variant="small" style={{ fontWeight: '600' }} numberOfLines={1} testID="seat-name">
                    {player.name}
                  </T>
                  <T variant="small" style={{ fontVariant: ['tabular-nums'] }} testID="seat-stack">
                    {chips(hp ? hp.stack : player.stack)}
                  </T>
                  {hp?.allIn ? (
                    <T style={[styles.status, { color: colors.raise, fontWeight: '700' }]}>{t('table.allIn')}</T>
                  ) : hp?.folded ? (
                    <T style={styles.status}>{t('table.folded')}</T>
                  ) : lastAction ? (
                    <T style={styles.status}>{t(`seatAction.${lastAction.kind}`)}</T>
                  ) : null}
                  {hp && hp.streetBet > 0 && (
                    <View style={styles.betChip}>
                      <T style={styles.betText}>{chips(hp.streetBet)}</T>
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
}

const badgeColors = StyleSheet.create({
  D: { backgroundColor: colors.white },
  SB: { backgroundColor: colors.call },
  BB: { backgroundColor: colors.raise },
});

const styles = StyleSheet.create({
  area: { width: '100%', alignItems: 'center' },
  felt: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: colors.felt,
    borderWidth: 6,
    borderColor: colors.feltEdge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { alignItems: 'center', gap: 4 },
  board: { flexDirection: 'row', gap: 3 },
  card: { width: 16, height: 22, borderRadius: 3, borderWidth: 1, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.35)' },
  cardOpen: { borderStyle: 'solid', borderColor: colors.white, backgroundColor: '#f4f4f4' },
  pot: { fontWeight: '700', fontSize: 18, color: colors.accent },
  seat: {
    position: 'absolute',
    width: SEAT_WIDTH,
    minHeight: SEAT_HEIGHT,
    paddingVertical: 6,
    paddingHorizontal: 4,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
  },
  empty: { backgroundColor: 'transparent', borderStyle: 'dashed', justifyContent: 'center' },
  toAct: { borderColor: colors.accent },
  status: { fontSize: 11, lineHeight: 14, color: colors.muted },
  badges: { position: 'absolute', top: -10, right: -6, flexDirection: 'row', gap: 2 },
  badge: { minWidth: 20, height: 20, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, lineHeight: 14, fontWeight: '700', color: colors.white },
  betChip: { marginTop: 2, paddingHorizontal: 8, borderRadius: 10, backgroundColor: colors.accent },
  betText: { fontSize: 12, lineHeight: 18, fontWeight: '700', color: colors.accentText },
});
