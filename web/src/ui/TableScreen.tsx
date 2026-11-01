import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { activePlayers, syncClock, type TournamentState } from '@holdem/shared/engine';
import { useKeepAwake } from '../platform/web';
import type { GameAction } from '@holdem/shared/state/gameReducer';
import { ActionPanel } from './ActionPanel';
import { ClockBar } from './ClockBar';
import { HandResult } from './HandResult';
import { HistoryModal } from './HistoryModal';
import { PlayersModal } from './PlayersModal';
import { ShowdownPanel } from './ShowdownPanel';
import { TableView } from './TableView';
import { useLevelAlert } from './useLevelAlert';

interface Props {
  tournament: TournamentState;
  now: number;
  canUndo: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  onToggleLanguage: () => void;
  dispatch: (action: GameAction) => void;
}

export function TableScreen({
  tournament,
  now,
  canUndo,
  soundOn,
  onToggleSound,
  onToggleLanguage,
  dispatch,
}: Props) {
  const { t } = useTranslation();
  const [modal, setModal] = useState<'players' | 'history' | null>(null);
  const hand = tournament.hand;
  const { structure } = tournament.config;
  const clockIndex = syncClock(tournament.clock, structure, now).index;
  const onBreak = structure[clockIndex].type === 'break';
  const levelAlert = useLevelAlert(clockIndex, structure, soundOn);
  useKeepAwake();

  // 手番が変わるたびに ActionPanel を作り直すための key
  const turnKey = hand ? `${hand.handNumber}-${hand.actions.length}` : '';

  return (
    <div className="screen table-screen">
      <ClockBar
        tournament={tournament}
        now={now}
        soundOn={soundOn}
        onToggleSound={onToggleSound}
        onToggleLanguage={onToggleLanguage}
        dispatch={dispatch}
      />
      {levelAlert.message && (
        <button className="level-alert" onClick={levelAlert.dismiss}>
          {levelAlert.message}
        </button>
      )}
      <TableView tournament={tournament} />

      <div className="bottom">
        {!hand && (
          <div className="panel">
            {onBreak && <p className="notice">{t('table.onBreak')}</p>}
            {activePlayers(tournament).length < 2 && <p className="notice">{t('table.oneLeft')}</p>}
            <button
              className="primary big"
              disabled={activePlayers(tournament).length < 2}
              onClick={() => dispatch({ type: 'startHand', now: Date.now() })}
            >
              {t('table.startHand', { n: tournament.handNumber + 1 })}
            </button>
          </div>
        )}
        {hand?.phase === 'betting' && (
          <ActionPanel key={turnKey} hand={hand} players={tournament.players} dispatch={dispatch} />
        )}
        {hand?.phase === 'showdown' && (
          <ShowdownPanel key={hand.handNumber} hand={hand} players={tournament.players} dispatch={dispatch} />
        )}
        {hand?.phase === 'complete' && (
          <HandResult hand={hand} players={tournament.players} dispatch={dispatch} />
        )}

        <div className="row gap toolbar">
          <button disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })}>
            {t('table.undo')}
          </button>
          <button onClick={() => setModal('history')}>{t('table.history')}</button>
          <button onClick={() => setModal('players')}>{t('table.standings')}</button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm(t('table.confirmEnd'))) dispatch({ type: 'reset' });
            }}
          >
            {t('table.end')}
          </button>
        </div>
      </div>

      {modal === 'players' && (
        <PlayersModal tournament={tournament} now={now} dispatch={dispatch} onClose={() => setModal(null)} />
      )}
      {modal === 'history' && (
        <HistoryModal
          hands={hand ? [...tournament.history, hand] : tournament.history}
          players={tournament.players}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
