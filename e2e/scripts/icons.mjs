// アプリのアイコン・スプラッシュ画像を、expo-app/assets/source/chip.svg から作り直す。
// 使い方（リポジトリのルートで）: npm --prefix e2e run icons
// 画像の変換に Playwright のブラウザ（Chromium）を使う
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '../..');
const ASSETS = path.join(ROOT, 'expo-app/assets');
const chip = fs.readFileSync(path.join(ASSETS, 'source/chip.svg'), 'utf8');
// Android の「テーマアイコン」用：白1色で、縁の模様と中央の円を「穴」として抜く。
// 透明な色で上から塗っても穴にはならないので、マスク（白＝残す、黒＝抜く）を使う
const spots = [...chip.matchAll(/<use href="#spot"[^>]*\/>/g)].map((m) => m[0]).join('');
const mono = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <g id="spot"><rect x="45" y="5.5" width="10" height="13" rx="2" /></g>
    <mask id="holes">
      <circle cx="50" cy="50" r="45" fill="#fff" />
      <g fill="#000">${spots}</g>
      <circle cx="50" cy="50" r="29" fill="#000" />
    </mask>
  </defs>
  <circle cx="50" cy="50" r="45" fill="#fff" mask="url(#holes)" />
  ${chip.match(/<circle cx="50" cy="50" r="29"[^>]*\/>/)[0].replace('fill="#17221c"', 'fill="none"').replace('stroke="#f2c14e"', 'stroke="#fff"')}
  ${chip.match(/<path[^>]*\/>/)[0].replace('#f2c14e', '#fff')}
</svg>`;
const FELT = 'radial-gradient(circle at 50% 40%, #2a8656 0%, #1f6b43 55%, #155232 100%)';

/** out: 出力先、size: 一辺の大きさ、chipRatio: チップの直径（画像に対する割合）、background: 背景（なしなら透明） */
const IMAGES = [
  { out: 'expo-app/assets/icon.png', size: 1024, chipRatio: 0.78, background: FELT },
  // Android のアイコンは「背景」と「前景」を重ねて、機種ごとの形（丸・角丸など）に切り抜く。
  // 前景は中央の 66% が必ず見える範囲なので、チップはその中に収める
  { out: 'expo-app/assets/android-icon-background.png', size: 512, chipRatio: 0, background: FELT },
  { out: 'expo-app/assets/android-icon-foreground.png', size: 512, chipRatio: 0.56 },
  { out: 'expo-app/assets/android-icon-monochrome.png', size: 432, chipRatio: 0.56, svg: mono },
  { out: 'expo-app/assets/splash-icon.png', size: 1024, chipRatio: 1 },
  { out: 'expo-app/assets/favicon.png', size: 48, chipRatio: 1 },
];

const browser = await chromium.launch();
const page = await browser.newPage();
for (const img of IMAGES) {
  await page.setViewportSize({ width: img.size, height: img.size });
  const d = Math.round(img.size * img.chipRatio);
  const svg = (img.svg ?? chip).replace('<svg ', `<svg width="${d}" height="${d}" `);
  await page.setContent(`<!doctype html><style>html,body{margin:0;width:100%;height:100%;background:${img.background ?? 'transparent'}}
    body{display:flex;align-items:center;justify-content:center}</style>${img.chipRatio ? svg : ''}`);
  await page.screenshot({ path: path.join(ROOT, img.out), omitBackground: !img.background });
  console.log('wrote', img.out);
}
await browser.close();

// Vite版のファビコンは SVG のまま使う
fs.copyFileSync(path.join(ASSETS, 'source/chip.svg'), path.join(ROOT, 'web/public/favicon.svg'));
console.log('wrote web/public/favicon.svg');
