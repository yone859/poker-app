/**
 * 画面の通し確認で使う道具（Vite版・Expo版で共通）。
 * - check()：表示を期待値と比べる。失敗しても最後まで進め、まとめて報告する
 * - shot()：画面全体を調べ（scan）、スクリーンショットを test-results/ に保存する
 */
import fs from 'node:fs';
import path from 'node:path';
import type { Browser, Page, TestInfo } from '@playwright/test';
import { BROWSER_LOCALE, FONT, LANGUAGE_NAMES, type Lang } from './expectations';

const FONT_DIR = path.resolve(import.meta.dirname, '../../node_modules/@fontsource');

/** 翻訳キーがそのまま画面に出ていないか（例：table.undo） */
const KEY_LEAK =
  /\b(app|common|language|presets|setup|validation|errors|clock|levelAlert|streets|pot|table|seatAction|action|showdown|result|players|results|history|home|settings|about|howto)\.[a-zA-Z][\w.-]*/;

export const norm = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ');

/**
 * @param fontSelector スクリーンショット用のフォントを当てる CSS セレクタ。
 *   端末によってフォントが違うと文字の幅も変わるので、どの環境でも同じフォントで確かめる
 */
/** テーブルの部品の場所（Vite版は CSS のクラス、Expo版は testID で探す） */
export interface TableSelectors {
  table: string;
  seat: string;
}

export async function createHarness(
  browser: Browser,
  lang: Lang,
  testInfo: TestInfo,
  fontSelector: string,
  tableSelectors: TableSelectors,
) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    locale: BROWSER_LOCALE[lang],
  });
  const page = await ctx.newPage();

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  page.on('dialog', (d) => {
    errors.push(`unexpected native dialog: ${d.message()}`);
    void d.dismiss();
  });

  const [fontPkg, fontName] = FONT[lang] ?? ['noto-sans', 'Noto Sans'];
  const fontDir = path.join(FONT_DIR, fontPkg);
  const fontCss =
    ['400.css', '700.css']
      .map((f) => fs.readFileSync(path.join(fontDir, f), 'utf8'))
      .join('\n')
      .replaceAll('./files/', '/__fonts/files/') + `${fontSelector}{font-family:"${fontName}",sans-serif !important}`;
  await page.route('**/__fonts/**', (route) =>
    route.fulfill({ path: path.join(fontDir, route.request().url().split('/__fonts/')[1]), contentType: 'font/woff2' }),
  );

  let checks = 0;
  const failures: string[] = [];

  function check(name: string, actual: string | null | undefined, expected: string | RegExp) {
    checks++;
    // 改行しない空白（フランス語・ロシア語の桁区切り）は、ふつうの空白とみなして比べる
    const a = (actual ?? '').replace(/ /g, ' ');
    const ok = expected instanceof RegExp ? expected.test(a) : a === expected.replace(/ /g, ' ');
    if (!ok) failures.push(`${name}\n    expected: ${expected}\n    actual:   ${a}`);
  }

  async function scan(step: string) {
    const body = await page.locator('body').innerText();
    checks += 3;
    const leak = body.match(KEY_LEAK);
    if (leak) failures.push(`[${step}] 翻訳キーがそのまま表示: ${leak[0]}`);
    const wsop = body.match(/WSOP|Rule \d+/);
    if (wsop) failures.push(`[${step}] WSOP またはルール番号が表示: ${wsop[0]}`);
    const bad = body.match(/undefined|NaN|{{|}}|\[object/);
    if (bad) failures.push(`[${step}] 不正な表示: ${bad[0]}`);

    // 言語名（設定画面の一覧）以外に、ほかの言語の文字が混ざっていないか
    const names = Object.values(LANGUAGE_NAMES);
    const words = (re: RegExp) => (body.match(re) ?? []).filter((w) => !names.some((n) => n.includes(w)));
    const mixed: [string, boolean, RegExp][] = [
      ['日本語のかな', lang !== 'ja', /[ぁ-んァ-ヶー]+/g],
      ['漢字・全角記号', !['ja', 'zh-Hans', 'zh-Hant'].includes(lang), /[一-龠々（）：、]+/g],
      ['ハングル', lang !== 'ko', /[가-힣]+/g],
      ['キリル文字', lang !== 'ru', /[А-Яа-яЁё]+/g],
    ];
    for (const [label, applies, re] of mixed) {
      checks++;
      const found = applies ? words(re) : [];
      if (found.length) failures.push(`[${step}] ${label}が混ざっている: ${found.join(' / ')}`);
    }

    // 画面が横にはみ出していないか（長い言語で起こりやすい）
    checks++;
    const overflow = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const out: string[] = [];
      for (const el of document.querySelectorAll('body *')) {
        const r = el.getBoundingClientRect();
        if (r.width && (r.right > vw + 1 || r.left < -1)) {
          if (getComputedStyle(el).position !== 'fixed' && el.closest('[aria-hidden="true"]') === null) {
            out.push(`${el.getAttribute('data-testid') ?? el.tagName}:${Math.round(r.left)}-${Math.round(r.right)} "${(el.textContent ?? '').slice(0, 30)}"`);
          }
        }
      }
      return { scroll: document.documentElement.scrollWidth > vw, out: out.slice(0, 5) };
    });
    if (overflow.scroll || overflow.out.length) failures.push(`[${step}] 横にはみ出している: ${overflow.out.join(' | ')}`);

    // ボタンの文字がボタンの枠からはみ出していないか
    checks++;
    const clipped = await page.evaluate(() => {
      const out: string[] = [];
      for (const b of document.querySelectorAll('[role="button"], [role="radio"], button')) {
        const br = b.getBoundingClientRect();
        if (!br.width) continue;
        for (const el of b.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.width && (r.right > br.right + 1 || r.left < br.left - 1 || r.bottom > br.bottom + 1)) {
            out.push(`${b.getAttribute('data-testid') ?? ''} "${(b.textContent ?? '').trim().slice(0, 30)}"`);
            break;
          }
        }
      }
      return out;
    });
    if (clipped.length) failures.push(`[${step}] ボタンの文字がはみ出している: ${[...new Set(clipped)].join(' | ')}`);

    // 席がテーブルの枠からはみ出していないか（はみ出すと、下のパネルや上のタイマーに重なる）
    checks++;
    const seatsOut = await page.evaluate(({ table, seat }) => {
      const area = document.querySelector(table);
      if (!area) return [];
      const a = area.getBoundingClientRect();
      return [...area.querySelectorAll(seat)].flatMap((el) => {
        const r = el.getBoundingClientRect();
        return r.top < a.top - 1 || r.bottom > a.bottom + 1
          ? [`${(el.textContent ?? '').trim().slice(0, 20)}: ${Math.round(r.top - a.top)}〜${Math.round(r.bottom - a.top)}（枠は 0〜${Math.round(a.height)}）`]
          : [];
      });
    }, tableSelectors);
    if (seatsOut.length) failures.push(`[${step}] 席がテーブルの枠からはみ出している: ${seatsOut.join(' | ')}`);
  }

  let shotNo = 0;
  async function shot(name: string) {
    await page.addStyleTag({ content: fontCss });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(250);
    await scan(name);
    await page.screenshot({ path: testInfo.outputPath(`${String(++shotNo).padStart(2, '0')}-${name}.png`), fullPage: true });
  }

  /** 最後に呼ぶ。失敗とコンソールエラーをまとめて報告する */
  async function finish() {
    await ctx.close();
    testInfo.annotations.push({ type: 'checks', description: String(checks) });
    const report = [...failures, ...errors.map((e) => `console error: ${e}`)];
    if (report.length) throw new Error(`[${lang}] ${checks} 項目中 ${failures.length} 件の失敗、コンソールエラー ${errors.length} 件\n\n${report.join('\n\n')}`);
  }

  return { page, check, scan, shot, finish, checkCount: () => checks };
}
