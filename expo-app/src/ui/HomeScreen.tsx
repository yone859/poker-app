import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { TournamentState } from '@holdem/shared/engine';
import { summarize } from '@holdem/shared/state/summary';
import { Btn, Card, ConfirmDialog, Screen, T } from './kit';
import { colors } from './theme';

export type InfoScreen = 'howto' | 'settings' | 'about';

interface Props {
  tournament: TournamentState | null;
  now: number;
  onResume: () => void;
  onNewTournament: () => void;
  onDiscard: () => void;
  onOpen: (screen: InfoScreen) => void;
}

export function HomeScreen({ tournament, now, onResume, onNewTournament, onDiscard, onOpen }: Props) {
  const { t } = useTranslation();
  const [confirm, setConfirm] = useState<'new' | 'discard' | null>(null);
  const summary = tournament ? summarize(tournament, now) : null;

  const summaryText =
    summary?.status === 'finished'
      ? t('home.summaryFinished', { name: summary.winnerName })
      : summary?.status === 'playing'
        ? t('home.summaryPlaying', {
            hand: summary.handNumber,
            level: summary.levelNumber,
            count: summary.playersLeft,
          })
        : summary
          ? t('home.summaryNotStarted', { count: summary.playersLeft })
          : null;

  return (
    <Screen testID="home">
      <View style={styles.logo}>
        <View style={styles.suits} aria-hidden>
          <T style={styles.suit}>♠</T>
          <T style={[styles.suit, styles.red]}>♥</T>
          <T style={[styles.suit, styles.red]}>♦</T>
          <T style={styles.suit}>♣</T>
        </View>
        <T variant="h1" testID="home-title" style={{ textAlign: 'center' }}>
          {t('app.title')}
        </T>
      </View>

      {summary && (
        <Card testID="resume-card">
          <Btn variant="primary" big onPress={onResume} testID="resume">
            {t('home.resumeTitle')}
          </Btn>
          <T variant="muted" style={{ textAlign: 'center' }} testID="resume-summary">
            {summaryText}
          </T>
          <Btn
            variant="link"
            style={{ alignSelf: 'center', alignItems: 'center' }}
            textStyle={{ color: colors.danger }}
            onPress={() => setConfirm('discard')}
            testID="discard"
          >
            {t('home.discard')}
          </Btn>
        </Card>
      )}

      <View style={styles.menu} testID="home-menu">
        <Btn
          variant={summary ? 'default' : 'primary'}
          big
          onPress={() => (summary ? setConfirm('new') : onNewTournament())}
          testID="menu-new"
        >
          {t('home.newTournament')}
        </Btn>
        <Btn style={styles.menuItem} onPress={() => onOpen('howto')} testID="menu-howto">
          {t('home.howTo')}
        </Btn>
        <Btn style={styles.menuItem} onPress={() => onOpen('settings')} testID="menu-settings">
          {t('home.settings')}
        </Btn>
        <Btn style={styles.menuItem} onPress={() => onOpen('about')} testID="menu-about">
          {t('home.about')}
        </Btn>
      </View>

      {confirm === 'new' && (
        <ConfirmDialog
          message={t('home.confirmNew')}
          confirmLabel={t('home.confirmNewOk')}
          onConfirm={() => {
            setConfirm(null);
            onNewTournament();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
      {confirm === 'discard' && (
        <ConfirmDialog
          message={t('home.confirmDiscard')}
          confirmLabel={t('home.confirmDiscardOk')}
          danger
          onConfirm={() => {
            setConfirm(null);
            onDiscard();
          }}
          onCancel={() => setConfirm(null)}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  logo: { alignItems: 'center', gap: 4, paddingTop: 32, paddingBottom: 16 },
  suits: { flexDirection: 'row', gap: 10 },
  suit: { fontSize: 36, lineHeight: 42 },
  red: { color: colors.danger },
  menu: { gap: 8 },
  menuItem: { minHeight: 48 },
});
