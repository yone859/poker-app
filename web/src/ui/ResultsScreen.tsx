import { useTranslation } from 'react-i18next';
import { standings, type TournamentState } from '@holdem/shared/engine';

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
    <div className="screen results">
      <h1>{t('results.title')}</h1>
      {winner && <p className="winner">{t('results.winner', { name: winner.name })}</p>}
      <p className="muted">
        {t('results.hands', { count: tournament.handNumber })}
        {t('results.summarySeparator')}
        {t('results.entries', { count: totalEntries })}
      </p>

      <ul className="standings card">
        {rows.map((s) => {
          const p = tournament.players.find((x) => x.id === s.playerId)!;
          return (
            <li key={s.playerId}>
              {/* 英語では 1st, 2nd, 3rd... と序数で表示する */}
              <span className="place">{t('results.place', { count: s.place, ordinal: true })}</span>
              <span className="grow">
                {p.name}
                {p.entries > 1 && (
                  <span className="muted small">{t('results.entriesNote', { count: p.entries })}</span>
                )}
              </span>
              <span className="muted small">
                {s.eliminatedInHand
                  ? t('players.eliminatedIn', { n: s.eliminatedInHand })
                  : t('results.champion')}
              </span>
            </li>
          );
        })}
      </ul>

      <button className="primary big" onClick={onNewTournament}>
        {t('results.newTournament')}
      </button>
      <button onClick={onHome}>{t('results.home')}</button>
    </div>
  );
}
