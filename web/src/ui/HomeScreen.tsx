import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TournamentState } from '@holdem/shared/engine';
import { summarize } from '@holdem/shared/state/summary';
import { ConfirmDialog } from './ConfirmDialog';

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
    <div className="screen home">
      <div className="logo">
        <div className="logo-suits" aria-hidden="true">
          <span>♠</span>
          <span className="red">♥</span>
          <span className="red">♦</span>
          <span>♣</span>
        </div>
        <h1>{t('app.title')}</h1>
      </div>

      {summary && (
        <div className="card resume-card">
          <button className="primary big" onClick={onResume}>
            {t('home.resumeTitle')}
          </button>
          <p className="resume-summary">{summaryText}</p>
          <button className="link danger-text" onClick={() => setConfirm('discard')}>
            {t('home.discard')}
          </button>
        </div>
      )}

      <div className="menu">
        <button
          className={summary ? 'big' : 'primary big'}
          onClick={() => (summary ? setConfirm('new') : onNewTournament())}
        >
          {t('home.newTournament')}
        </button>
        <button onClick={() => onOpen('howto')}>{t('home.howTo')}</button>
        <button onClick={() => onOpen('settings')}>{t('home.settings')}</button>
        <button onClick={() => onOpen('about')}>{t('home.about')}</button>
      </div>

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
    </div>
  );
}
