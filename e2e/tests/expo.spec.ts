/**
 * Expo版（expo-app/ の Web出力）の画面の通し確認。部品に付けた testID で操作する。
 * Vite版と同じシナリオを、12言語それぞれで行う。
 */
import { test } from '@playwright/test';
import { expectationsFor, LANGS } from './support/expectations';
import { createHarness, norm } from './support/harness';

for (const LANG of LANGS) {
  test(`Expo版 ${LANG}`, async ({ browser, baseURL }, testInfo) => {
    const URL = baseURL!;
    const E = await expectationsFor(LANG);
    const f = E.f;
    const { page, check, scan, shot, finish } = await createHarness(browser, LANG, testInfo, '*', { table: '[data-testid="table"]', seat: '[data-testid^="seat-"]' });

    const id = (testId) => page.locator(`[data-testid="${testId}"]`);
    const tx = async (testId) => norm(await id(testId).first().textContent());
    const txs = async (testId) => (await id(testId).allTextContents()).map(norm);
    const click = (testId) => id(testId).first().click();
    const checked = (testId) => page.locator(`[data-testid^="${testId}-"][aria-checked="true"]`);

    // ================= ホーム（保存データなし） =================
    await page.goto(URL);
    await id('home').waitFor();
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await id('home').waitFor();
    check('html lang', await page.evaluate(() => document.documentElement.lang), E.htmlLang);
    check('document.title', await page.title(), E.title);
    check('home title', await tx('home-title'), E.title);
    check('no resume card', String(await id('resume-card').count()), '0');
    check('home menu', [await tx('menu-new'), await tx('menu-howto'), await tx('menu-settings'), await tx('menu-about')].join('|'), E.menu);
    await shot('home-empty');

    await click('menu-howto');
    check('howto title', await tx('screen-title'), E.howtoTitle);
    check('howto sections', String(await id('howto-section').count()), '8');
    await shot('howto');
    await click('back');
    await click('menu-about');
    check('about title', await tx('screen-title'), E.aboutTitle);
    check('about version', await tx('about-version'), E.version);
    await shot('about');
    await click('back');

    await click('menu-settings');
    check('settings title', await tx('screen-title'), E.settingsTitle);
    check('settings language selected', norm(await checked('setting-language').textContent()), E.languageName);
    check('settings language count', String(await id('setting-language').locator('[role="radio"]').count()), '12');
    check('settings sound selected', norm(await checked('setting-sound').textContent()), E.soundOnSetting);
    await shot('settings');
    await click('back');

    // ================= シナリオ1 =================
    await click('menu-new');
    check('no dialog without saved game (1)', String(await id('dialog').count()), '0');
    check('setup title', await tx('screen-title'), E.setupTitle);
    check('default player name', await id('player-name-0').inputValue(), E.p(1));
    check('start button', await tx('start'), E.start);
    for (const [i, pid] of ['standard', 'turbo', 'deep'].entries()) {
      check(`preset name ${pid}`, (await tx(`preset-${pid}`)).startsWith(E.presets[i]) ? 'ok' : await tx(`preset-${pid}`), 'ok');
    }
    await shot('setup');

    await id('player-name-0').fill('');
    check('validation message', await tx('setup-errors'), E.emptyName);
    check('start disabled', String(await id('start').getAttribute('aria-disabled')), 'true');
    await id('player-name-0').fill(E.p(1));
    check('start enabled again', String(await id('setup-errors').count()), '0');

    await click('toggle-structure');
    check('structure rows', String(await id('structure-row').count()), String(24 + 5));
    await shot('setup-structure');
    await click('toggle-structure');

    await click('back');
    check('back to home from setup', await tx('home-title'), E.title);
    check('no tournament created by back', String(await id('resume-card').count()), '0');
    await click('menu-new');

    await click('first-button-0');
    await click('start');
    check('deal button', await tx('deal'), E.deal(1));
    // 席の位置はテーブルの大きさが決まってから計算されるので、バッジが出るまで待つ
    await id('seat-0').locator('[data-testid="badge-D"]').waitFor({ timeout: 3000 }).catch(() => {});
    check('next hand D badge on seat0', String(await id('seat-0').locator('[data-testid="badge-D"]').count()), '1');
    check('toolbar home', await tx('tool-home'), E.home);
    await shot('table-idle');

    await click('deal');
    check('to act', await tx('to-act'), E.toAct(4));
    check('facing', await tx('to-act-info'), E.facing('200', f(25000)));
    check('pot preflop', await tx('pot'), E.pot('500'));
    await shot('preflop');

    await click('act-call');
    await click('quick-0');
    check('min raise label', await tx('act-raise'), E.raise('400'));
    await click('act-raise');
    // 下の席（プレイヤー1）が「レイズ」とベット額を出して、いちばん背が高くなったところ
    await scan('preflop-after-raise');
    await click('act-fold');
    await click('act-call');
    await click('act-call');
    check('street flop', await tx('street'), E.flop);
    check('pot flop', await tx('pot'), E.pot(f(1500)));
    check('flop to act', await tx('to-act'), E.toAct(3));
    check('flop no bet', await tx('to-act-info'), E.noBet(f(24400)));

    await click('quick-3');
    check('all-in label', await tx('act-raise'), E.allIn(f(24400)));
    await click('act-raise');
    check('call label', await tx('act-call'), E.call(f(24400)));
    await shot('facing-allin');
    await click('act-call');
    await click('act-call');
    for (let i = 0; i < 4; i++) await click('act-check');
    check('show first', await tx('showdown-notice'), E.showFirst(3));
    check('pot label', await tx('pot-title'), `${E.mainPot} ${f(74700)}`);
    await click('winner-0-p1');
    await shot('showdown');
    await click('confirm-winners');

    check('result title', await tx('result-title'), E.resultTitle(1));
    check('award', await tx('award'), `${E.mainPot} ${E.p(1)} +${f(74700)}`);
    const names = await txs('delta-name');
    const values = await txs('delta-value');
    check('delta P1', `${names[0]}${values[0]}`, `${E.p(1)}+${f(49900)} → ${f(74900)}`);
    check('delta P3', `${names[2]}${values[2]}`, `${E.p(3)}-${f(25000)} → 0`);
    check('eliminated', await tx('eliminated'), E.eliminated(3));
    await shot('result');
    await click('next');

    check('dead SB seat', await id('seat-2').locator('[data-testid="seat-name"]').textContent().then(norm), E.outSeat(3));
    check('dead SB badge', String(await id('seat-2').locator('[data-testid="badge-SB"]').count()), '1');

    await click('tool-standings');
    check('standings stacks', (await txs('standing-stack')).slice(0, 3).join('|'), [f(74900), f(24900), '200'].join('|'));
    await click('reenter-p3');
    check('reentered entries', (await txs('standing-meta')).find((s) => s.includes('2')) ?? '', new RegExp(`${E.entries2.replace(/[·()]/g, '.')}$`));
    await id('late-name').fill('Dave');
    await click('late-add');
    check('players after late reg', String(await id('standing-name').count()), '5');
    await shot('standings');
    await click('sheet-close');

    await click('tool-undo');
    await click('tool-standings');
    check('undo late reg', String(await id('standing-name').count()), '4');
    await click('sheet-close');

    await click('tool-history');
    const hist = await txs('history-line');
    const H = E.H;
    const expectedHistory = [
      [2, H.sb], [3, H.bb], [3, H.ante], [4, H.call('200')], [1, H.raise('400')], [2, H.fold],
      [3, H.call('200')], [4, H.call('200')],
      [3, H.betAllIn(f(24400))], [4, H.call(f(24400))], [1, H.call(f(24400))],
      [4, H.check], [1, H.check], [4, H.check], [1, H.check],
    ].map(([p, act]) => `${E.p(p)}${act}`);
    check('history rows', hist.join('\n'), expectedHistory.join('\n'));
    check('history award', (await tx('history-award')).replace(/\s/g, ''), E.histAward.replace(/\s/g, ''));
    await shot('history');
    await click('sheet-close');

    await click('clock-next');
    check('level alert', await tx('level-alert'), E.levelAlert);
    await shot('level-alert');

    await click('tool-home');
    check('resume summary', await tx('resume-summary'), E.resumeSummary);
    await shot('home-resume');
    await click('resume');
    check('resumed', await tx('deal'), E.deal(2));

    await page.reload();
    await id('home').waitFor();
    check('reload shows home with resume', await tx('resume-summary'), E.resumeSummary);
    await click('resume');
    check('after reload', await tx('deal'), E.deal(2));
    check('undo enabled after reload', String((await id('tool-undo').getAttribute('aria-disabled')) === 'true'), 'false');

    // テーブル画面の言語ボタンはなくした。設定画面で切り替える
    check('no language toggle on table', String(await id('language-toggle').count()), '0');
    const OTHER = LANG === 'ja' ? 'en' : 'ja';
    const otherDeal = OTHER === 'ja' ? 'Hand #2 を始める' : 'Deal Hand #2';
    await click('tool-home');
    await click('menu-settings');
    await click(`setting-language-${OTHER}`);
    check('settings switched language', await tx('screen-title'), OTHER === 'ja' ? '設定' : 'Settings');
    check('html lang switched', await page.evaluate(() => document.documentElement.lang), OTHER);
    await click('back');
    await click('resume');
    check('switched language', await tx('deal'), otherDeal);
    await page.reload();
    await id('home').waitFor();
    await click('resume');
    check('language persisted', await tx('deal'), otherDeal);
    await click('tool-home');
    await click('menu-settings');
    await click(`setting-language-${LANG}`);
    await click('back');
    await click('resume');
    check('switched back', await tx('deal'), E.deal(2));

    await click('tool-home');
    await click('menu-settings');
    await click('setting-sound-off');
    await click('back');
    await click('resume');
    check('sound off reflected', await tx('sound-toggle'), E.soundOff);
    await click('sound-toggle');

    await click('tool-home');
    await click('menu-new');
    check('confirm dialog shown', String(await id('dialog').count()), '1');
    await shot('confirm-new');
    await click('dialog-cancel');
    check('still home with resume', await tx('resume-summary'), E.resumeSummary);

    await click('discard');
    await shot('confirm-discard');
    await click('dialog-ok');
    check('resume card gone', String(await id('resume-card').count()), '0');
    await page.reload();
    await id('home').waitFor();
    check('discard persisted', String(await id('resume-card').count()), '0');

    // ================= シナリオ2 =================
    await click('menu-new');
    check('no dialog without saved game (2)', String(await id('dialog').count()), '0');
    await click('reentry-switch');
    await click('remove-player-3');
    await click('remove-player-2');
    await click('first-button-0');
    await click('start');
    await click('tool-home');
    check('not started summary', await tx('resume-summary'), E.notStarted);
    await click('resume');
    await click('deal');
    await click('quick-3');
    await click('act-raise');
    check('call all-in label', await tx('act-call'), E.callAllIn(f(24600)));
    await click('act-call');
    check('runout notice', await tx('showdown-notice'), E.runout);
    await click('winner-0-p1');
    await click('confirm-winners');
    await click('next');
    check('results title', await tx('results-title'), E.resultsTitle);
    check('winner', await tx('winner'), E.winner);
    check('summary', await tx('results-summary'), E.summary);
    check('places', (await txs('place')).join('|'), E.places.join('|'));
    check('out in', (await txs('place-note'))[1], E.outIn);
    check('champion', (await txs('place-note'))[0], E.champion);
    await shot('results');
    await click('results-new');
    check('results → setup', await tx('screen-title'), E.setupTitle);
    await click('back');
    check('tournament cleared after results', String(await id('resume-card').count()), '0');

    // ================= 対応していない言語 → English =================
    const ctx2 = await browser.newContext({ locale: 'ar-SA' });
    const p2 = await ctx2.newPage();
    await p2.goto(URL);
    const id2 = (t) => p2.locator(`[data-testid="${t}"]`);
    await id2('home').waitFor();
    check('ar-SA falls back to English', norm(await id2('home-title').textContent()), "Hold'em Chip Tracker");
    await id2('menu-settings').click();
    check('ar-SA settings shows English', norm(await p2.locator('[data-testid^="setting-language-"][aria-checked="true"]').textContent()), 'English');
    await id2('setting-language-ja').click();
    check('switched to ja', norm(await id2('screen-title').textContent()), '設定');
    await p2.reload();
    await id2('home').waitFor();
    check('chosen language persisted', norm(await id2('home-title').textContent()), 'ホールデム点数付け');
    await ctx2.close();

    await finish();
  });
}
