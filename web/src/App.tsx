import { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isFinished } from './engine';
import type { Language } from './i18n';
import { loadGame, loadSoundOn, saveGame, saveLanguage, saveSoundOn } from './platform/web';
import { gameReducer, initialGameState } from './state/gameReducer';
import { useNow } from './state/useNow';
import { ResultsScreen } from './ui/ResultsScreen';
import { SetupScreen } from './ui/SetupScreen';
import { TableScreen } from './ui/TableScreen';
import './App.css';

export default function App() {
  const { t, i18n } = useTranslation();
  // 保存してあるトーナメントがあれば、そこから再開する
  const [state, dispatch] = useReducer(gameReducer, initialGameState, (s) => ({
    ...s,
    ...loadGame(),
  }));
  const [soundOn, setSoundOn] = useState(loadSoundOn);
  const now = useNow();
  const tournament = state.tournament;

  // 状態が変わるたびに自動保存（Undoの履歴も保存するので、再読み込みしても戻せる）
  useEffect(() => saveGame(tournament, state.past), [tournament, state.past]);

  useEffect(() => {
    document.title = t('app.title');
  }, [t]);

  function toggleSound() {
    setSoundOn(!soundOn);
    saveSoundOn(!soundOn);
  }

  // 選んだ言語は保存し、次回からはブラウザの言語設定より優先する
  function changeLanguage(language: Language) {
    saveLanguage(language);
    void i18n.changeLanguage(language);
  }

  return (
    <>
      {state.error && (
        <div className="toast" role="alert" onClick={() => dispatch({ type: 'dismissError' })}>
          {t(`errors.${state.error.code}`, state.error.params)}
        </div>
      )}
      {!tournament ? (
        <SetupScreen
          language={i18n.language as Language}
          onChangeLanguage={changeLanguage}
          onStart={(config, names, buttonSeat) =>
            dispatch({ type: 'create', config, names, buttonSeat, now: Date.now() })
          }
        />
      ) : isFinished(tournament, now) ? (
        <ResultsScreen tournament={tournament} dispatch={dispatch} />
      ) : (
        <TableScreen
          tournament={tournament}
          now={now}
          canUndo={state.past.length > 0}
          soundOn={soundOn}
          onToggleSound={toggleSound}
          onToggleLanguage={() => changeLanguage(i18n.language === 'ja' ? 'en' : 'ja')}
          dispatch={dispatch}
        />
      )}
    </>
  );
}
