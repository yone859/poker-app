import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, Platform, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { isFinished } from '@holdem/shared/engine';
import { detectLanguage, initI18n, type Language } from '@holdem/shared/i18n';
import { gameReducer, initialGameState } from '@holdem/shared/state/gameReducer';
import type { SavedGame } from '@holdem/shared/state/persistence';
import { useNow } from '@holdem/shared/state/useNow';
import {
  getDeviceLanguages,
  loadGame,
  loadLanguage,
  loadSoundOn,
  saveGame,
  saveLanguage,
  saveSoundOn,
  setDocumentLanguage,
} from './platform';
import { HomeScreen, type InfoScreen } from './ui/HomeScreen';
import { AboutScreen, HowToScreen, SettingsScreen } from './ui/InfoScreens';
import { T } from './ui/kit';
import { ResultsScreen } from './ui/ResultsScreen';
import { SetupScreen } from './ui/SetupScreen';
import { TableScreen } from './ui/TableScreen';
import { colors } from './ui/theme';

interface Boot {
  saved: SavedGame | null;
  soundOn: boolean;
}

/**
 * 起動時に、保存データ・言語・音の設定を読み込む。
 * AsyncStorage は非同期なので、読み込みが終わるまではスプラッシュ画面（index.ts で表示したまま）を見せておく。
 */
export default function App() {
  const [boot, setBoot] = useState<Boot | null>(null);

  useEffect(() => {
    void (async () => {
      const [saved, language, soundOn] = await Promise.all([loadGame(), loadLanguage(), loadSoundOn()]);
      // 利用者が選んだ言語 → 端末の言語設定 → 英語 の順
      await initI18n(language ?? detectLanguage(getDeviceLanguages()));
      setBoot({ saved, soundOn });
    })();
  }, []);

  useEffect(() => {
    if (boot) void SplashScreen.hideAsync();
  }, [boot]);

  if (!boot) return null;
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Main boot={boot} />
    </SafeAreaProvider>
  );
}

/** 'game' はテーブル画面（終わっていれば結果画面） */
type Screen = 'home' | 'setup' | 'game' | InfoScreen;

function Main({ boot }: { boot: Boot }) {
  const { t, i18n } = useTranslation();
  // 読み込んだ保存データから始める（Web版と同じ reducer を使う）
  const [state, dispatch] = useReducer(gameReducer, initialGameState, (s) => ({ ...s, ...boot.saved }));
  const [screen, setScreen] = useState<Screen>('home');
  const [soundOn, setSoundOn] = useState(boot.soundOn);
  const now = useNow();
  const insets = useSafeAreaInsets();
  const tournament = state.tournament;

  // 状態が変わるたびに自動保存（Undoの履歴も保存するので、アプリを閉じても戻せる）
  useEffect(() => {
    void saveGame(tournament, state.past);
  }, [tournament, state.past]);

  useEffect(() => {
    setDocumentLanguage(i18n.language as Language, t('app.title'));
  }, [i18n.language, t]);

  // Android の「戻る」：ホーム以外ではホームへ戻る（トーナメントは保存されたまま）。ホームではアプリを閉じる。
  // 「戻る」ボタンは Android にしかなく、Web で登録するとエラーになるので Android だけで登録する
  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (screen === 'home') return false;
      setScreen('home');
      return true;
    });
    return () => sub.remove();
  }, [screen]);

  function changeSound(on: boolean) {
    setSoundOn(on);
    void saveSoundOn(on);
  }

  // 選んだ言語は保存し、次回からは端末の言語設定より優先する
  function changeLanguage(language: Language) {
    void saveLanguage(language);
    void i18n.changeLanguage(language);
  }

  const goHome = () => setScreen('home');
  // トーナメントがないのにテーブル画面を開こうとしたら、ホームを出す
  const current: Screen = screen === 'game' && !tournament ? 'home' : screen;

  return (
    <View style={styles.root}>
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

      {state.error && (
        <Pressable
          style={[styles.toast, { top: insets.top + 12 }]}
          onPress={() => dispatch({ type: 'dismissError' })}
          role="alert"
          testID="toast"
        >
          <T style={{ color: colors.white, fontWeight: '600' }}>
            {t(`errors.${state.error.code}`, state.error.params)}
          </T>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    maxWidth: '90%',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: colors.danger,
  },
});
