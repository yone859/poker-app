// 単数形・複数形や順位（1st、2nd…）の出し分けに使う Intl.PluralRules を、ない環境（Hermes など）でだけ補う。
// PluralRules の補いが使う getCanonicalLocales・Locale も同じように補う（この順番で読み込む必要がある）。
// 翻訳より先に読み込む必要があるので、いちばん最初に置く
import '@formatjs/intl-getcanonicallocales/polyfill.js';
import '@formatjs/intl-locale/polyfill.js';
import '@formatjs/intl-pluralrules/polyfill.js';
import '@formatjs/intl-pluralrules/locale-data/de.js';
import '@formatjs/intl-pluralrules/locale-data/en.js';
import '@formatjs/intl-pluralrules/locale-data/es.js';
import '@formatjs/intl-pluralrules/locale-data/fr.js';
import '@formatjs/intl-pluralrules/locale-data/it.js';
import '@formatjs/intl-pluralrules/locale-data/ja.js';
import '@formatjs/intl-pluralrules/locale-data/ko.js';
import '@formatjs/intl-pluralrules/locale-data/pt.js';
import '@formatjs/intl-pluralrules/locale-data/ru.js';
import '@formatjs/intl-pluralrules/locale-data/vi.js';
import '@formatjs/intl-pluralrules/locale-data/zh.js';
import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import App from './src/App';

// 保存データを読み込み終わるまでスプラッシュ画面を出したままにする（Expo の推奨どおり、コンポーネントの外で呼ぶ）
void SplashScreen.preventAutoHideAsync();

// registerRootComponent は AppRegistry.registerComponent('main', () => App) を呼ぶ。
// Expo Go でもビルドしたアプリでも、同じように動く準備をしてくれる
registerRootComponent(App);
