import { useTranslation } from 'react-i18next';
import {
  isRegistrationOpen,
  levelForHand,
  levelNumber,
  syncClock,
  type TournamentState,
} from '@holdem/shared/engine';
import { blindsText, clockText } from '@holdem/shared/state/format';
import type { GameAction } from '@holdem/shared/state/gameReducer';

interface Props {
  tournament: TournamentState;
  now: number;
  soundOn: boolean;
  onToggleSound: () => void;
  onToggleLanguage: () => void;
  dispatch: (action: GameAction) => void;
}

const LAST_MINUTE_MS = 60_000;

export function ClockBar({ tournament, now, soundOn, onToggleSound, onToggleLanguage, dispatch }: Props) {
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
    <header className="clock-bar">
      <div className="clock-main">
        <div className="clock-level">
          {item.type === 'break' ? t('clock.break') : t('clock.level', { n: lvNo })}
        </div>
        <div className={`clock-time ${clock.running ? '' : 'paused'} ${lastMinute ? 'last-minute' : ''}`}>
          {clockText(clock.remainingMs)}
        </div>
        <div className="clock-buttons">
          <button
            className="icon"
            aria-label={t('clock.prevLevel')}
            disabled={clock.index === 0}
            onClick={() => dispatch({ type: 'clockJump', index: clock.index - 1, now: Date.now() })}
          >
            «
          </button>
          <button
            className={clock.running ? '' : 'primary'}
            aria-label={clock.running ? t('clock.pauseLabel') : t('clock.start')}
            onClick={() =>
              dispatch({ type: clock.running ? 'clockPause' : 'clockStart', now: Date.now() })
            }
          >
            {clock.running ? t('clock.pause') : t('clock.start')}
          </button>
          <button
            className="icon"
            aria-label={t('clock.nextLevel')}
            disabled={!nextItem}
            onClick={() => dispatch({ type: 'clockJump', index: clock.index + 1, now: Date.now() })}
          >
            »
          </button>
        </div>
      </div>
      <div className="clock-info">
        <span className="clock-blinds">{blindsText(item, t)}</span>
        {nextItem && <span>{t('clock.next', { blinds: blindsText(nextItem, t) })}</span>}
        {pending && <span className="warn">{t('clock.pending', { blinds: blindsText(handLevel, t) })}</span>}
        {reentry.enabled && (
          <span className={regOpen ? 'ok' : 'muted'}>
            {regOpen
              ? t('clock.registrationOpen', { n: reentry.lastLevel })
              : t('clock.registrationClosed')}
          </span>
        )}
        <span className="clock-toggles">
          <button className="link" onClick={onToggleSound}>
            {soundOn ? t('clock.soundOn') : t('clock.soundOff')}
          </button>
          <button className="link" onClick={onToggleLanguage}>
            {t('language.switchTo')}
          </button>
        </span>
      </div>
    </header>
  );
}
