import { useEffect, useReducer, useState } from 'react';
import { isFinished } from './engine';
import { loadGame, loadSoundOn, saveGame, saveSoundOn } from './platform/web';
import { gameReducer, initialGameState } from './state/gameReducer';
import { useNow } from './state/useNow';
import { ResultsScreen } from './ui/ResultsScreen';
import { SetupScreen } from './ui/SetupScreen';
import { TableScreen } from './ui/TableScreen';
import './App.css';

export default function App() {
  // 保存してあるトーナメントがあれば、そこから再開する
  const [state, dispatch] = useReducer(gameReducer, initialGameState, (s) => ({
    ...s,
    ...loadGame(),
  }));
  const [soundOn, setSoundOn] = useState(loadSoundOn);
  const now = useNow();
  const t = state.tournament;

  // 状態が変わるたびに自動保存（Undoの履歴も保存するので、再読み込みしても戻せる）
  useEffect(() => saveGame(t, state.past), [t, state.past]);

  function toggleSound() {
    setSoundOn(!soundOn);
    saveSoundOn(!soundOn);
  }

  return (
    <>
      {state.error && (
        <div className="toast" role="alert" onClick={() => dispatch({ type: 'dismissError' })}>
          {state.error}
        </div>
      )}
      {!t ? (
        <SetupScreen
          onStart={(config, names, buttonSeat) =>
            dispatch({ type: 'create', config, names, buttonSeat, now: Date.now() })
          }
        />
      ) : isFinished(t, now) ? (
        <ResultsScreen t={t} dispatch={dispatch} />
      ) : (
        <TableScreen
          t={t}
          now={now}
          canUndo={state.past.length > 0}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          dispatch={dispatch}
        />
      )}
    </>
  );
}
