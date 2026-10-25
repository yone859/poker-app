import { useState } from 'react';
import { activePlayers, syncClock, type TournamentState } from '../engine';
import { useKeepAwake } from '../platform/web';
import type { GameAction } from '../state/gameReducer';
import { ActionPanel } from './ActionPanel';
import { ClockBar } from './ClockBar';
import { HandResult } from './HandResult';
import { HistoryModal } from './HistoryModal';
import { PlayersModal } from './PlayersModal';
import { ShowdownPanel } from './ShowdownPanel';
import { TableView } from './TableView';
import { useLevelAlert } from './useLevelAlert';

interface Props {
  t: TournamentState;
  now: number;
  canUndo: boolean;
  soundOn: boolean;
  onToggleSound: () => void;
  dispatch: (action: GameAction) => void;
}

export function TableScreen({ t, now, canUndo, soundOn, onToggleSound, dispatch }: Props) {
  const [modal, setModal] = useState<'players' | 'history' | null>(null);
  const hand = t.hand;
  const { structure } = t.config;
  const clockIndex = syncClock(t.clock, structure, now).index;
  const onBreak = structure[clockIndex].type === 'break';
  const levelAlert = useLevelAlert(clockIndex, structure, soundOn);
  useKeepAwake();

  // 手番が変わるたびに ActionPanel を作り直すための key
  const turnKey = hand ? `${hand.handNumber}-${hand.actions.length}` : '';

  return (
    <div className="screen table-screen">
      <ClockBar t={t} now={now} soundOn={soundOn} onToggleSound={onToggleSound} dispatch={dispatch} />
      {levelAlert.message && (
        <button className="level-alert" onClick={levelAlert.dismiss}>
          {levelAlert.message}
        </button>
      )}
      <TableView t={t} />

      <div className="bottom">
        {!hand && (
          <div className="panel">
            {onBreak && <p className="notice">休憩中です。再開したらハンドを始めてください。</p>}
            {activePlayers(t).length < 2 && (
              <p className="notice">残りは1人です。リエントリーする人は「プレイヤー・順位」から手続きしてください。</p>
            )}
            <button
              className="primary big"
              disabled={activePlayers(t).length < 2}
              onClick={() => dispatch({ type: 'startHand', now: Date.now() })}
            >
              Hand #{t.handNumber + 1} を始める
            </button>
          </div>
        )}
        {hand?.phase === 'betting' && (
          <ActionPanel key={turnKey} hand={hand} players={t.players} dispatch={dispatch} />
        )}
        {hand?.phase === 'showdown' && (
          <ShowdownPanel key={hand.handNumber} hand={hand} players={t.players} dispatch={dispatch} />
        )}
        {hand?.phase === 'complete' && <HandResult hand={hand} players={t.players} dispatch={dispatch} />}

        <div className="row gap toolbar">
          <button disabled={!canUndo} onClick={() => dispatch({ type: 'undo' })}>
            ↶ 戻す
          </button>
          <button onClick={() => setModal('history')}>履歴</button>
          <button onClick={() => setModal('players')}>順位</button>
          <button
            className="danger"
            onClick={() => {
              if (window.confirm('トーナメントを終了して設定画面に戻りますか？')) dispatch({ type: 'reset' });
            }}
          >
            終了
          </button>
        </div>
      </div>

      {modal === 'players' && (
        <PlayersModal t={t} now={now} dispatch={dispatch} onClose={() => setModal(null)} />
      )}
      {modal === 'history' && (
        <HistoryModal
          hands={hand ? [...t.history, hand] : t.history}
          players={t.players}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
