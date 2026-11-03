import { defineConfig } from '@playwright/test';

// Vite版・Expo版を本番用にビルドしてから、それぞれ別のポートで配って確かめる。
// 開発モードでしか出ないエラーもあるので、利用者に届くのと同じ本番用ビルドで確認する
const VITE_PORT = 4173;
const EXPO_PORT = 4174;

export default defineConfig({
  testDir: './tests',
  // 1言語の通し確認に数十秒かかる
  timeout: 180_000,
  fullyParallel: true,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    browserName: 'chromium',
    // 失敗したときの画面と操作の記録を残す（npx playwright show-report で見られる）
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'vite', testMatch: 'vite.spec.ts', use: { baseURL: `http://127.0.0.1:${VITE_PORT}/` } },
    { name: 'expo', testMatch: 'expo.spec.ts', use: { baseURL: `http://127.0.0.1:${EXPO_PORT}/` } },
  ],
  webServer: [
    {
      command: `npm --prefix .. run build:web && node serve.mjs ../web/dist ${VITE_PORT}`,
      url: `http://127.0.0.1:${VITE_PORT}/`,
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `cd ../expo-app && npx expo export --platform web && cd ../e2e && node serve.mjs ../expo-app/dist ${EXPO_PORT}`,
      url: `http://127.0.0.1:${EXPO_PORT}/`,
      timeout: 300_000,
      reuseExistingServer: false,
    },
  ],
});
