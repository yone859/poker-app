import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import {
  isRegistrationOpen,
  levelForHand,
  levelNumber,
  syncClock,
  type TournamentState,
} from '@holdem/shared/engine';
import { blindsText, clockText } from '@holdem/shared/state/format';
import type { GameAction } from '@holdem/shared/state/gameReducer';
import { Btn, T } from './kit';
import { colors } from './theme';

interface Props {
  tournament: TournamentState;
  now: number;
  soundOn: boolean;
  onToggleSound: () => void;
  dispatch: (action: GameAction) => void;
}

const LAST_MINUTE_MS = 60_000;

export function ClockBar({ tournament, now, soundOn, onToggleSound, dispatch }: Props) {
  const { t } = useTranslation();
  const { structure, reentry } = tournament.config;
  const clock = syncClock(tournament.clock, structure, now);
  const item = structure[clock.index];
  const nextItem = structure[clock.index + 1];
  const lvNo = levelNumber(structure, clock.index);
  const clockLevel = levelForHand(structure, clock.index);
  // 新しいレベルは次のハンドから（Rule 79）。プレイ中のハンドが前のレベルなら知らせる
  const handLevel = tournament.hand?.level;
  const pending = handLevel && handLevel.bigBlind !== clockLevel.bigBlind;
  const regOpen = isRegistrationOpen(structure, clock.index, reentry);
  const lastMinute = clock.running && nextItem && clock.remainingMs <= LAST_MINUTE_MS;

  return (
    <View style={styles.bar} testID="clock-bar">
      <View style={styles.main}>
        <T style={styles.level} testID="clock-level">
          {item.type === 'break' ? t('clock.break') : t('clock.level', { n: lvNo })}
        </T>
        <T
          testID="clock-time"
          style={[styles.time, !clock.running && { color: colors.muted }, lastMinute && { color: colors.warn }]}
        >
          {clockText(clock.remainingMs)}
        </T>
        <View style={styles.buttons}>
          <Btn
            variant="icon"
            label={t('clock.prevLevel')}
            disabled={clock.index === 0}
            onPress={() => dispatch({ type: 'clockJump', index: clock.index - 1, now: Date.now() })}
            testID="clock-prev"
          >
            «
          </Btn>
          <Btn
            variant={clock.running ? 'default' : 'primary'}
            label={clock.running ? t('clock.pauseLabel') : t('clock.start')}
            onPress={() => dispatch({ type: clock.running ? 'clockPause' : 'clockStart', now: Date.now() })}
            testID="clock-toggle"
          >
            {clock.running ? t('clock.pause') : t('clock.start')}
          </Btn>
          <Btn
            variant="icon"
            label={t('clock.nextLevel')}
            disabled={!nextItem}
            onPress={() => dispatch({ type: 'clockJump', index: clock.index + 1, now: Date.now() })}
            testID="clock-next"
          >
            »
          </Btn>
        </View>
      </View>
      <View style={styles.info}>
        <T variant="small" style={{ fontWeight: '600' }} testID="clock-blinds">
          {blindsText(item, t)}
        </T>
        {nextItem && <T variant="mutedSmall">{t('clock.next', { blinds: blindsText(nextItem, t) })}</T>}
        {pending && (
          <T variant="small" style={{ color: colors.warn }} testID="clock-pending">
            {t('clock.pending', { blinds: blindsText(handLevel, t) })}
          </T>
        )}
        {reentry.enabled && (
          <T variant="small" style={{ color: regOpen ? colors.ok : colors.muted }}>
            {regOpen ? t('clock.registrationOpen', { n: reentry.lastLevel }) : t('clock.registrationClosed')}
          </T>
        )}
        <View style={styles.toggles}>
          <Btn variant="link" onPress={onToggleSound} textStyle={styles.toggleText} style={styles.toggle} testID="sound-toggle">
            {soundOn ? t('clock.soundOn') : t('clock.soundOff')}
          </Btn>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  main: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  level: { fontWeight: '700', color: colors.accent, minWidth: 64 },
  time: { flex: 1, fontSize: 32, lineHeight: 40, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  buttons: { flexDirection: 'row', gap: 4 },
  info: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 2, alignItems: 'center' },
  toggles: { flexDirection: 'row', gap: 12, marginLeft: 'auto' },
  toggle: { minHeight: 24 },
  toggleText: { fontSize: 13 },
});
