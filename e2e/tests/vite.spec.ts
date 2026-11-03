/**
 * Vite版（web/）の画面の通し確認。CSS のクラス名で操作する。
 * 4人のトーナメント（脱落・リエントリー・途中参加・履歴・Undo・保存・言語の切り替え）と、
 * 2人で結果画面まで進めるシナリオを、12言語それぞれで行う。
 */
import { test } from '@playwright/test';
import { expectationsFor, LANGS } from './support/expectations';
import { createHarness, norm } from './support/harness';

for (const LANG of LANGS) {
  test(`Vite版 ${LANG}`, async ({ browser, baseURL }, testInfo) => {
    const URL = baseURL!;
    const E = await expectationsFor(LANG);
    const f = E.f;
    const { page, check, scan, shot, finish } = await createHarness(browser, LANG, testInfo, ':root,button,input,select', { table: '.table-frame', seat: '.seat' });

    const text = async (sel) => norm(await page.locator(sel).first().textContent());
    const texts = async (sel) => (await page.locator(sel).allTextContents()).map(norm);
    const q = {
      menu: (n) => `.home .menu button:nth-child(${n})`, resume: '.resume-card button.primary',
      discard: '.resume-card button.link', resumeSummary: '.resume-summary',
      dialogCancel: '.dialog button:nth-child(1)', dialogOk: '.dialog button:nth-child(2)',
      back: '.screen-header button.link',
      start: '.screen.setup > button.primary.big', deal: '.bottom > .panel button.primary.big',
      fold: '.act.fold', check: '.act.check', call: '.act.call', raise: '.act.raise',
      quick: (n) => `.quick button:nth-child(${n})`, title: '.action-panel .panel-title',
      pot: '.felt .pot', street: '.felt .street', confirm: '.showdown-panel button.primary',
      next: '.result-panel button.primary', tool: (n) => `.toolbar button:nth-child(${n})`,
      nextLevel: '.clock-buttons button:nth-child(3)', soundToggle: '.clock-toggles button:nth-child(1)',
    };
    const seat = (n) => page.locator('.seat').nth(n);
    const selectedIn = (n) => page.locator('.segmented').nth(n).locator('[aria-checked="true"]');

    // ================= ホーム（保存データなし） =================
    await page.goto(URL);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    check('html lang', await page.evaluate(() => document.documentElement.lang), E.htmlLang);
    check('document.title', await page.title(), E.title);
    check('home title', await text('.home h1'), E.title);
    check('no resume card', String(await page.locator('.resume-card').count()), '0');
    check('home menu', (await texts('.home .menu button')).join('|'), E.menu);
    await shot('home-empty');

    await page.locator(q.menu(2)).click();
    check('howto title', await text('.screen-header h1'), E.howtoTitle);
    check('howto sections', String(await page.locator('.info section').count()), '8');
    await shot('howto');
    await page.locator(q.back).click();
    await page.locator(q.menu(4)).click();
    check('about title', await text('.screen-header h1'), E.aboutTitle);
    check('about version', await text('.info section .muted'), E.version);
    await shot('about');
    await page.locator(q.back).click();

    await page.locator(q.menu(3)).click();
    check('settings title', await text('.screen-header h1'), E.settingsTitle);
    check('settings language selected', norm(await page.locator('.language-grid [aria-checked="true"]').textContent()), E.languageName);
    check('settings language count', String(await page.locator('.language-grid [role="radio"]').count()), '12');
    check('settings sound selected', norm(await selectedIn(0).textContent()), E.soundOnSetting);
    await shot('settings');
    await page.locator(q.back).click();

    // ================= シナリオ1：4人・脱落・リエントリー・途中参加・履歴・Undo・保存 =================
    await page.locator(q.menu(1)).click();
    check('no dialog without saved game (1)', String(await page.locator('.dialog').count()), '0');
    check('setup title', await text('.screen-header h1'), E.setupTitle);
    check('default player name', await page.locator('.text-field').first().inputValue(), E.p(1));
    check('start button', await text(q.start), E.start);
    check('preset names', (await texts('.preset-name')).join('|'), E.presets.join('|'));
    await shot('setup');

    await page.locator('.text-field').first().fill('');
    // Vite版は <li> の記号で「•」を出すので、文字としては含まない
    check('validation message', await text('.errors li'), E.emptyName.replace(/^• /, ''));
    check('start disabled', String(await page.locator(q.start).isDisabled()), 'true');
    await page.locator('.text-field').first().fill(E.p(1));
    check('start enabled again', String(await page.locator(q.start).isDisabled()), 'false');

    await page.locator('.setup button.link').nth(1).click(); // ブラインド表（0番目は「戻る」）
    check('structure rows', String(await page.locator('.structure-row').count()), String(1 + 24 + 5));
    await shot('setup-structure');
    await page.locator('.setup button.link').nth(1).click();

    await page.locator(q.back).click();
    check('back to home from setup', await text('.home h1'), E.title);
    check('no tournament created by back', String(await page.locator('.resume-card').count()), '0');
    await page.locator(q.menu(1)).click();

    await page.locator('label.stacked select').selectOption('0');
    await page.locator(q.start).click();
    check('deal button', await text(q.deal), E.deal(1));
    check('next hand D badge on seat0', await seat(0).locator('.badge').first().textContent(), 'D');
    check('toolbar home', (await texts('.toolbar button')).at(-1), E.home);
    await shot('table-idle');

    await page.locator(q.deal).click();
    check('to act', await text(`${q.title} > span:first-child`), E.toAct(4));
    check('facing', await text(`${q.title} .muted`), E.facing('200', f(25000)));
    check('pot preflop', await text(q.pot), E.pot('500'));
    await shot('preflop');

    await page.locator(q.call).click();
    await page.locator(q.quick(1)).click();
    check('min raise label', await text(q.raise), E.raise('400'));
    await page.locator(q.raise).click();
    // 下の席（プレイヤー1）が「レイズ」とベット額を出して、いちばん背が高くなったところ
    await scan('preflop-after-raise');
    await page.locator(q.fold).click();
    await page.locator(q.call).click();
    await page.locator(q.call).click();
    check('street flop', await text(q.street), E.flop);
    check('pot flop', await text(q.pot), E.pot(f(1500)));
    check('flop to act', await text(`${q.title} > span:first-child`), E.toAct(3));
    check('flop no bet', await text(`${q.title} .muted`), E.noBet(f(24400)));

    await page.locator(q.quick(4)).click();
    check('all-in label', await text(q.raise), E.allIn(f(24400)));
    await page.locator(q.raise).click();
    check('call label', await text(q.call), E.call(f(24400)));
    await shot('facing-allin');
    await page.locator(q.call).click();
    await page.locator(q.call).click();
    for (let i = 0; i < 4; i++) await page.locator(q.check).click();
    check('show first', await text('.showdown-panel .notice'), E.showFirst(3));
    check('pot label', await text('.pot-choice-title'), `${E.mainPot} ${f(74700)}`);
    await page.locator('.chip-toggle').first().click();
    await shot('showdown');
    await page.locator(q.confirm).click();

    check('result title', await text('.result-panel .panel-title'), E.resultTitle(1));
    check('award', await text('.award-list li'), `${E.mainPot} ${E.p(1)} +${f(74700)}`);
    check('delta P1', (await texts('.delta-list li'))[0], `${E.p(1)}+${f(49900)} → ${f(74900)}`);
    check('delta P3', (await texts('.delta-list li'))[2], `${E.p(3)}-${f(25000)} → 0`);
    check('eliminated', await text('.result-panel .notice'), E.eliminated(3));
    await shot('result');
    await page.locator(q.next).click();

    check('dead SB seat', await text('.seat.empty .seat-name'), E.outSeat(3));
    check('dead SB badge', await page.locator('.seat.empty .badge').first().textContent(), 'SB');

    await page.locator(q.tool(3)).click();
    check('standings stacks', (await texts('.standings li > span:last-child')).slice(0, 3).join('|'), [f(74900), f(24900), '200'].join('|'));
    await page.locator('.standings li button').click();
    check('reentered entries', (await texts('.standings li .muted.small')).find((s) => s.includes('2')) ?? '', new RegExp(`${E.entries2.replace(/[·()]/g, '.')}$`));
    await page.locator('.add-player .text-field').fill('Dave');
    await page.locator('.add-player button').click();
    check('players after late reg', String(await page.locator('.standings li').count()), '5');
    await shot('standings');
    await page.locator('.modal button.icon').click();

    await page.locator(q.tool(1)).click();
    await page.locator(q.tool(3)).click();
    check('undo late reg', String(await page.locator('.standings li').count()), '4');
    await page.locator('.modal button.icon').click();

    await page.locator(q.tool(2)).click();
    const hist = await texts('.history-body li');
    const H = E.H;
    const expectedHistory = [
      [2, H.sb], [3, H.bb], [3, H.ante], [4, H.call('200')], [1, H.raise('400')], [2, H.fold],
      [3, H.call('200')], [4, H.call('200')],
      [3, H.betAllIn(f(24400))], [4, H.call(f(24400))], [1, H.call(f(24400))],
      [4, H.check], [1, H.check], [4, H.check], [1, H.check],
    ].map(([p, act]) => `${E.p(p)}${act}`);
    check('history rows', hist.join('\n'), expectedHistory.join('\n'));
    check('history award', (await text('.history-award')).replace(/\s/g, ''), E.histAward.replace(/\s/g, ''));
    await shot('history');
    await page.locator('.modal button.icon').click();

    await page.locator(q.nextLevel).click();
    check('level alert', await text('.level-alert'), E.levelAlert);
    await shot('level-alert');

    // ホームへ → 続きから再開
    await page.locator(q.tool(4)).click();
    check('resume summary', await text(q.resumeSummary), E.resumeSummary);
    await shot('home-resume');
    await page.locator(q.resume).click();
    check('resumed', await text(q.deal), E.deal(2));

    // 再読み込みするとホームから。続きから再開でき、Undo も使える
    await page.reload();
    check('reload shows home with resume', await text(q.resumeSummary), E.resumeSummary);
    await page.locator(q.resume).click();
    check('after reload', await text(q.deal), E.deal(2));
    check('undo enabled after reload', String(await page.locator(q.tool(1)).isEnabled()), 'true');

    // テーブル画面の言語ボタンはなくした。設定画面で切り替える → 再読み込みしても保持
    check('no language toggle on table', String(await page.locator('.clock-toggles button').count()), '1');
    const OTHER = LANG === 'ja' ? 'en' : 'ja';
    const otherDeal = OTHER === 'ja' ? 'Hand #2 を始める' : 'Deal Hand #2';
    const langButton = (l) => page.locator(`.language-grid button[lang="${l}"]`);
    await page.locator(q.tool(4)).click();
    await page.locator(q.menu(3)).click();
    await langButton(OTHER).click();
    check('settings switched language', await text('.screen-header h1'), OTHER === 'ja' ? '設定' : 'Settings');
    check('html lang switched', await page.evaluate(() => document.documentElement.lang), OTHER);
    check('title switched', await page.title(), OTHER === 'ja' ? 'ホールデム点数付け' : "Hold'em Chip Tracker");
    await page.locator(q.back).click();
    await page.locator(q.resume).click();
    check('switched language', await text(q.deal), otherDeal);
    await page.reload();
    await page.locator(q.resume).click();
    check('language persisted', await text(q.deal), otherDeal);
    await page.locator(q.tool(4)).click();
    await page.locator(q.menu(3)).click();
    await langButton(LANG).click();
    await page.locator(q.back).click();
    await page.locator(q.resume).click();
    check('switched back', await text(q.deal), E.deal(2));

    // 設定で音をOFF → テーブル画面にも反映
    await page.locator(q.tool(4)).click();
    await page.locator(q.menu(3)).click();
    await page.locator('.segmented').nth(0).locator('button').nth(1).click();
    await page.locator(q.back).click();
    await page.locator(q.resume).click();
    check('sound off reflected', await text(q.soundToggle), E.soundOff);
    await page.locator(q.soundToggle).click();

    // 保存データがあるときの「新しいトーナメント」は確認ダイアログ → キャンセルで何も起きない
    await page.locator(q.tool(4)).click();
    await page.locator(q.menu(1)).click();
    check('confirm dialog shown', String(await page.locator('.dialog').count()), '1');
    await shot('confirm-new');
    await page.locator(q.dialogCancel).click();
    check('still home with resume', await text(q.resumeSummary), E.resumeSummary);

    // 「このトーナメントを終了する」→ 確認 → 保存データが消える
    await page.locator(q.discard).click();
    await shot('confirm-discard');
    await page.locator(q.dialogOk).click();
    check('resume card gone', String(await page.locator('.resume-card').count()), '0');
    await page.reload();
    check('discard persisted', String(await page.locator('.resume-card').count()), '0');

    // ================= シナリオ2：2人・ヘッズアップ・結果画面 =================
    await page.locator(q.menu(1)).click();
    check('no dialog without saved game (2)', String(await page.locator('.dialog').count()), '0');
    await page.locator('label.check input').uncheck();
    await page.locator('.text-field').nth(3).locator('xpath=..').locator('button').click();
    await page.locator('.text-field').nth(2).locator('xpath=..').locator('button').click();
    await page.locator('label.stacked select').selectOption('0');
    await page.locator(q.start).click();
    await page.locator(q.tool(4)).click();
    check('not started summary', await text(q.resumeSummary), E.notStarted);
    await page.locator(q.resume).click();
    await page.locator(q.deal).click();
    await page.locator(q.quick(4)).click();
    await page.locator(q.raise).click();
    check('call all-in label', await text(q.call), E.callAllIn(f(24600)));
    await page.locator(q.call).click();
    check('runout notice', await text('.showdown-panel .notice'), E.runout);
    await page.locator('.chip-toggle').first().click();
    await page.locator(q.confirm).click();
    await page.locator(q.next).click();
    check('results title', await text('h1'), E.resultsTitle);
    check('winner', await text('.winner'), E.winner);
    check('summary', await text('.results > p.muted'), E.summary);
    check('places', (await texts('.standings .place')).join('|'), E.places.join('|'));
    check('out in', (await texts('.standings li > span:last-child'))[1], E.outIn);
    check('champion', (await texts('.standings li > span:last-child'))[0], E.champion);
    await shot('results');
    await page.locator('.results > button.primary.big').click();
    check('results → setup', await text('.screen-header h1'), E.setupTitle);
    await page.locator(q.back).click();
    check('tournament cleared after results', String(await page.locator('.resume-card').count()), '0');

    // ================= 対応していない言語 → English。設定で選び直すと保存される =================
    const ctx2 = await browser.newContext({ locale: 'ar-SA' });
    const p2 = await ctx2.newPage();
    await p2.goto(URL);
    check('ar-SA falls back to English', norm(await p2.locator('.home h1').textContent()), "Hold'em Chip Tracker");
    await p2.locator('.home .menu button:nth-child(3)').click();
    check('ar-SA settings shows English', norm(await p2.locator('.language-grid [aria-checked="true"]').textContent()), 'English');
    await p2.locator('.language-grid button[lang="ja"]').click();
    check('switched to ja', norm(await p2.locator('.screen-header h1').textContent()), '設定');
    await p2.reload();
    check('chosen language persisted', norm(await p2.locator('.home h1').textContent()), 'ホールデム点数付け');
    await ctx2.close();

    await finish();
  });
}
