import { registerRootComponent } from 'expo';
import * as SplashScreen from 'expo-splash-screen';
import App from './src/App';

// 保存データを読み込み終わるまでスプラッシュ画面を出したままにする（Expo の推奨どおり、コンポーネントの外で呼ぶ）
void SplashScreen.preventAutoHideAsync();

// registerRootComponent は AppRegistry.registerComponent('main', () => App) を呼ぶ。
// Expo Go でもビルドしたアプリでも、同じように動く準備をしてくれる
registerRootComponent(App);
