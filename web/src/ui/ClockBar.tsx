import {
  isRegistrationOpen,
  levelForHand,
  levelNumber,
  syncClock,
  type TournamentState,
} from '../engine';
import { blindsText, clockText } from '../state/format';
import type { GameAction } from '../state/gameReducer';

interface Props {
  t: TournamentState;
  now: number;
  soundOn: boolean;
  onToggleSound: () => void;
  dispatch: (action: GameAction) => void;
}

const LAST_MINUTE_MS = 60_000;

export function ClockBar({ t, now, soundOn, onToggleSound, dispatch }: Props) {
  const { structure, reentry } = t.config;
  const clock = syncClock(t.clock, structure, now);
  const item = structure[clock.index];
  const nextItem = structure[clock.index + 1];
  const lvNo = levelNumber(structure, clock.index);
  const clockLevel = levelForHand(structure, clock.index);
  // 新しいレベルは次のハンドから（Rule 79）。プレイ中のハンドが前のレベルなら知らせる
  const handLevel = t.hand?.level;
  const pending = handLevel && handLevel.bigBlind !== clockLevel.bigBlind;
  const regOpen = isRegistrationOpen(structure, clock.index, reentry);
  const lastMinute = clock.running && nextItem && clock.remainingMs <= LAST_MINUTE_MS;

  return (
    <header className="clock-bar">
      <div className="clock-main">
        <div className="clock-level">{item.type === 'break' ? '休憩' : `Level ${lvNo}`}</div>
        <div className={`clock-time ${clock.running ? '' : 'paused'} ${lastMinute ? 'last-minute' : ''}`}>
          {clockText(clock.remainingMs)}
        </div>
        <div className="clock-buttons">
          <button
            className="icon"
            aria-label="前のレベル"
            disabled={clock.index === 0}
            onClick={() => dispatch({ type: 'clockJump', index: clock.index - 1, now: Date.now() })}
          >
            «
          </button>
          <button
            className={clock.running ? '' : 'primary'}
            aria-label={clock.running ? '一時停止' : '開始'}
            onClick={() =>
              dispatch({ type: clock.running ? 'clockPause' : 'clockStart', now: Date.now() })
            }
          >
            {clock.running ? '停止' : '開始'}
          </button>
          <button
            className="icon"
            aria-label="次のレベル"
            disabled={!nextItem}
            onClick={() => dispatch({ type: 'clockJump', index: clock.index + 1, now: Date.now() })}
          >
            »
          </button>
        </div>
      </div>
      <div className="clock-info">
        <span className="clock-blinds">{blindsText(item)}</span>
        {nextItem && <span>次：{blindsText(nextItem)}</span>}
        {pending && <span className="warn">このハンドは {blindsText(handLevel)}（次のハンドから新レベル）</span>}
        {reentry.enabled && (
          <span className={regOpen ? 'ok' : 'muted'}>
            {regOpen ? `リエントリー受付中（Lv${reentry.lastLevel}まで）` : 'リエントリー締切'}
          </span>
        )}
        <button className="link sound" onClick={onToggleSound}>
          {soundOn ? '音：ON' : '音：OFF'}
        </button>
      </div>
    </header>
  );
}
