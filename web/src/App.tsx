import { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isFinished } from '@holdem/shared/engine';
import type { Language } from '@holdem/shared/i18n';
import { gameReducer, initialGameState } from '@holdem/shared/state/gameReducer';
import { useNow } from '@holdem/shared/state/useNow';
import { loadGame, loadSoundOn, saveGame, saveLanguage, saveSoundOn } from './platform/web';
import { HomeScreen, type InfoScreen } from './ui/HomeScreen';
import { AboutScreen, HowToScreen, SettingsScreen } from './ui/InfoScreens';
import { ResultsScreen } from './ui/ResultsScreen';
import { SetupScreen } from './ui/SetupScreen';
import { TableScreen } from './ui/TableScreen';
import './App.css';

/** 'game' はテーブル画面（終わっていれば結果画面） */
type Screen = 'home' | 'setup' | 'game' | InfoScreen;

export default function App() {
  const { t, i18n } = useTranslation();
  // 保存してあるトーナメントがあれば読み込んでおき、ホーム画面の「続きから再開」で使う
  const [state, dispatch] = useReducer(gameReducer, initialGameState, (s) => ({
    ...s,
    ...loadGame(),
  }));
  const [screen, setScreen] = useState<Screen>('home');
  const [soundOn, setSoundOn] = useState(loadSoundOn);
  const now = useNow();
  const tournament = state.tournament;

  // 状態が変わるたびに自動保存（Undoの履歴も保存するので、再読み込みしても戻せる）
  useEffect(() => saveGame(tournament, state.past), [tournament, state.past]);

  useEffect(() => {
    document.title = t('app.title');
  }, [t]);

  function changeSound(on: boolean) {
    setSoundOn(on);
    saveSoundOn(on);
  }

  // 選んだ言語は保存し、次回からはブラウザの言語設定より優先する
  function changeLanguage(language: Language) {
    saveLanguage(language);
    void i18n.changeLanguage(language);
  }

  const goHome = () => setScreen('home');
  // トーナメントがないのにテーブル画面を開こうとしたら、ホームを出す
  const current: Screen = screen === 'game' && !tournament ? 'home' : screen;

  return (
    <>
      {state.error && (
        <div className="toast" role="alert" onClick={() => dispatch({ type: 'dismissError' })}>
          {t(`errors.${state.error.code}`, state.error.params)}
        </div>
      )}

      {current === 'home' && (
        <HomeScreen
          tournament={tournament}
          now={now}
          onResume={() => setScreen('game')}
          onNewTournament={() => setScreen('setup')}
          onDiscard={() => dispatch({ type: 'reset' })}
          onOpen={setScreen}
        />
      )}
      {current === 'setup' && (
        <SetupScreen
          onBack={goHome}
          onStart={(config, names, buttonSeat) => {
            dispatch({ type: 'create', config, names, buttonSeat, now: Date.now() });
            setScreen('game');
          }}
        />
      )}
      {current === 'game' && tournament && (
        isFinished(tournament, now) ? (
          <ResultsScreen
            tournament={tournament}
            onHome={() => {
              dispatch({ type: 'reset' });
              goHome();
            }}
            onNewTournament={() => {
              dispatch({ type: 'reset' });
              setScreen('setup');
            }}
          />
        ) : (
          <TableScreen
            tournament={tournament}
            now={now}
            canUndo={state.past.length > 0}
            soundOn={soundOn}
            onToggleSound={() => changeSound(!soundOn)}
            onToggleLanguage={() => changeLanguage(i18n.language === 'ja' ? 'en' : 'ja')}
            onHome={goHome}
            dispatch={dispatch}
          />
        )
      )}
      {current === 'howto' && <HowToScreen onBack={goHome} />}
      {current === 'settings' && (
        <SettingsScreen
          onBack={goHome}
          language={i18n.language as Language}
          onChangeLanguage={changeLanguage}
          soundOn={soundOn}
          onChangeSound={changeSound}
        />
      )}
      {current === 'about' && <AboutScreen onBack={goHome} />}
    </>
  );
}
