import { useTranslation } from 'react-i18next';
import { standings, type TournamentState } from '@holdem/shared/engine';
import { Btn, Card, Row, Screen, T } from './kit';
import { colors } from './theme';

interface Props {
  tournament: TournamentState;
  /** トーナメントを片付けてホームへ */
  onHome: () => void;
  /** トーナメントを片付けて設定画面へ */
  onNewTournament: () => void;
}

export function ResultsScreen({ tournament, onHome, onNewTournament }: Props) {
  const { t } = useTranslation();
  const rows = standings(tournament);
  const totalEntries = tournament.players.reduce((sum, p) => sum + p.entries, 0);
  const winner = tournament.players.find((p) => p.id === rows[0]?.playerId);

  return (
    <Screen testID="results">
      <T variant="h1" testID="results-title">{t('results.title')}</T>
      {winner && (
        <T style={{ fontSize: 20, fontWeight: '700' }} testID="winner">
          {t('results.winner', { name: winner.name })}
        </T>
      )}
      <T variant="muted" testID="results-summary">
        {t('results.hands', { count: tournament.handNumber })}
        {t('results.summarySeparator')}
        {t('results.entries', { count: totalEntries })}
      </T>

      <Card>
        {rows.map((s) => {
          const p = tournament.players.find((x) => x.id === s.playerId)!;
          return (
            <Row key={s.playerId} style={{ minHeight: 36 }}>
              {/* 英語では 1st, 2nd, 3rd... と序数で表示する */}
              <T style={{ minWidth: 40, fontWeight: '700', color: colors.accent }} testID="place">
                {t('results.place', { count: s.place, ordinal: true })}
              </T>
              <T style={{ flex: 1 }}>
                {p.name}
                {p.entries > 1 && <T variant="mutedSmall">{t('results.entriesNote', { count: p.entries })}</T>}
              </T>
              <T variant="mutedSmall" testID="place-note">
                {s.eliminatedInHand
                  ? t('players.eliminatedIn', { n: s.eliminatedInHand })
                  : t('results.champion')}
              </T>
            </Row>
          );
        })}
      </Card>

      <Btn variant="primary" big onPress={onNewTournament} testID="results-new">
        {t('results.newTournament')}
      </Btn>
      <Btn onPress={onHome} testID="results-home">
        {t('results.home')}
      </Btn>
    </Screen>
  );
}
