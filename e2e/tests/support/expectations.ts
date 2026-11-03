/**
 * 画面の通し確認で使う「期待する表示」。
 * 日本語・英語は手で書いた値と比べる（翻訳ファイルが変わっても気づける）。
 * ほかの言語は翻訳ファイルから作る（翻訳の中身そのものは shared のユニットテストで確かめている）。
 */
import fs from 'node:fs';
import path from 'node:path';
import i18next from 'i18next';

const LOCALES = path.resolve(import.meta.dirname, '../../../shared/src/i18n/locales');

export const LANGS = ['ja', 'en', 'zh-Hans', 'zh-Hant', 'ko', 'es', 'pt-BR', 'fr', 'de', 'it', 'ru', 'vi'] as const;
export type Lang = (typeof LANGS)[number];
export const LANGUAGE_NAMES: Record<Lang, string> = {
  ja: '日本語', en: 'English', 'zh-Hans': '简体中文', 'zh-Hant': '繁體中文', ko: '한국어', es: 'Español',
  'pt-BR': 'Português (Brasil)', fr: 'Français', de: 'Deutsch', it: 'Italiano', ru: 'Русский', vi: 'Tiếng Việt',
};
/** ブラウザの言語設定（自動判定の確認も兼ねる） */
export const BROWSER_LOCALE: Record<Lang, string> = {
  ja: 'ja-JP', en: 'en-US', 'zh-Hans': 'zh-CN', 'zh-Hant': 'zh-TW', ko: 'ko-KR', es: 'es-ES', 'pt-BR': 'pt-BR',
  fr: 'fr-FR', de: 'de-DE', it: 'it-IT', ru: 'ru-RU', vi: 'vi-VN',
};
/** スクリーンショット用のフォント（@fontsource のパッケージ名とフォント名） */
export const FONT: Partial<Record<Lang, [string, string]>> = {
  ja: ['noto-sans-jp', 'Noto Sans JP'], 'zh-Hans': ['noto-sans-sc', 'Noto Sans SC'],
  'zh-Hant': ['noto-sans-tc', 'Noto Sans TC'], ko: ['noto-sans-kr', 'Noto Sans KR'],
};

const HAND: Record<string, any> = {
  ja: {
    title: 'ホールデム点数付け', setupTitle: '新しいトーナメント', p: (n) => `プレイヤー${n}`, start: '25,000点でスタート',
    emptyName: '• 名前が空のプレイヤーがいます', deal: (n) => `Hand #${n} を始める`,
    toAct: (n) => `プレイヤー${n} の番`, facing: (c, s) => `コール ${c}・残り ${s}`, noBet: (s) => `賭けなし・残り ${s}`,
    pot: (a) => `ポット ${a}`, raise: (a) => `レイズ ${a}`, allIn: (a) => `オールイン ${a}`, call: (a) => `コール ${a}`,
    callAllIn: (a) => `オールイン ${a}`, flop: 'フロップ', showFirst: (n) => `最初に見せる人：プレイヤー${n}`,
    mainPot: 'メインポット', resultTitle: (n) => `Hand #${n} の結果`, eliminated: (n) => `プレイヤー${n} が脱落しました`,
    outSeat: (n) => `プレイヤー${n}（OUT）`, entries2: '・2エントリー',
    histAward: 'メインポット：プレイヤー1 +74,700',
    levelAlert: 'Level 2 になりました：200 / 300 (BBA 300)（次のハンドから）',
    runout: '全員の手札を表向きにして、フロップ・ターン・リバーを開いてください',
    resultsTitle: 'トーナメント終了', winner: 'プレイヤー1 の優勝！', summary: '1ハンド・2エントリー',
    places: ['1位', '2位'], outIn: 'Hand #1 で脱落', champion: '優勝',
    presets: ['スタンダード', 'ターボ', 'ディープスタック'],
    menu: '新しいトーナメント|使い方|設定|このアプリについて',
    resumeSummary: 'Hand #1・Level 2・残り4人', notStarted: '開始前・2人',
    howtoTitle: '使い方', settingsTitle: '設定', aboutTitle: 'このアプリについて', version: 'バージョン 1.0.0',
    soundOff: '音：OFF', soundOnSetting: 'ON', home: 'ホーム',
    H: { sb: 'SB 100', bb: 'BB 200', ante: 'BBアンティ 200', call: (a) => `コール ${a}`, raise: (a) => `レイズ ${a}`,
      fold: 'フォールド', check: 'チェック', betAllIn: (a) => `ベット ${a}（オールイン）` },
  },
  en: {
    title: "Hold'em Chip Tracker", setupTitle: 'New tournament', p: (n) => `Player ${n}`, start: 'Start with 25,000 chips',
    emptyName: '• Every player needs a name.', deal: (n) => `Deal Hand #${n}`,
    toAct: (n) => `Player ${n} to act`, facing: (c, s) => `${c} to call · ${s} behind`, noBet: (s) => `No bet · ${s} behind`,
    pot: (a) => `Pot ${a}`, raise: (a) => `Raise to ${a}`, allIn: (a) => `All-in ${a}`, call: (a) => `Call ${a}`,
    callAllIn: (a) => `Call ${a} (all-in)`, flop: 'Flop', showFirst: (n) => `Player ${n} shows first`,
    mainPot: 'Main pot', resultTitle: (n) => `Hand #${n} result`, eliminated: (n) => `Eliminated: Player ${n}`,
    outSeat: (n) => `Player ${n} (out)`, entries2: ' · 2 entries',
    histAward: 'Main pot: Player 1 +74,700',
    levelAlert: 'Level 2: 200 / 300 (BBA 300) — starts next hand',
    runout: 'All hands face up. Deal the flop, turn and river.',
    resultsTitle: 'Tournament over', winner: 'Player 1 wins!', summary: '1 hand · 2 entries',
    places: ['1st', '2nd'], outIn: 'Out in Hand #1', champion: 'Winner',
    presets: ['Standard', 'Turbo', 'Deep Stack'],
    menu: 'New tournament|How to use|Settings|About',
    resumeSummary: 'Hand #1 · Level 2 · 4 players left', notStarted: 'Not started · 2 players',
    howtoTitle: 'How to use', settingsTitle: 'Settings', aboutTitle: 'About', version: 'Version 1.0.0',
    soundOff: 'Sound: Off', soundOnSetting: 'On', home: 'Home',
    H: { sb: 'Posts SB 100', bb: 'Posts BB 200', ante: 'Posts BB ante 200', call: (a) => `Calls ${a}`,
      raise: (a) => `Raises to ${a}`, fold: 'Folds', check: 'Checks', betAllIn: (a) => `Bets ${a} (all-in)` },
  },
};

const norm = (s: string) => s.trim().replace(/\s+/g, ' ');
const stripTags = (s: string) => s.replace(/<\/?\w+>/g, '');

/** 翻訳ファイルから、手書きと同じ形の期待値を作る */
async function fromLocale(lang: Lang) {
  const resources = JSON.parse(fs.readFileSync(`${LOCALES}/${lang}.json`, 'utf8'));
  const i18n = i18next.createInstance();
  await i18n.init({ resources: { [lang]: { translation: resources } }, lng: lang, fallbackLng: false, load: 'currentOnly',
    interpolation: { escapeValue: false } });
  const t = (k: string, o?: Record<string, unknown>) => norm(stripTags(i18n.t(k, o) as string));
  const sep = resources.common.thousandsSeparator;
  const f = (x: number) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  const p = (n: number) => t('setup.defaultPlayerName', { n });
  return {
    title: t('app.title'), setupTitle: t('setup.title'), p, start: t('setup.start', { stack: f(25000) }),
    emptyName: `• ${t('validation.emptyName')}`, deal: (n) => t('table.startHand', { n }),
    toAct: (n) => t('action.toAct', { name: p(n) }), facing: (c, s) => t('action.facingBet', { toCall: c, stack: s }),
    noBet: (s) => t('action.noBet', { stack: s }),
    pot: (a) => t('table.pot', { amount: a }), raise: (a) => t('action.raise', { amount: a }),
    allIn: (a) => t('action.allIn', { amount: a }), call: (a) => t('action.call', { amount: a }),
    callAllIn: (a) => t('action.callAllIn', { amount: a }), flop: t('streets.flop'),
    showFirst: (n) => t('showdown.showFirst', { name: p(n) }), mainPot: t('pot.main'),
    resultTitle: (n) => t('result.title', { n }), eliminated: (n) => t('result.eliminated', { names: p(n) }),
    outSeat: (n) => t('table.outSeat', { name: p(n) }),
    entries2: resources.common.dot + i18n.t('players.entries', { count: 2 }),
    histAward: `${t('pot.main')}${resources.history.awardSeparator}${p(1)} +${f(74700)}`,
    levelAlert: t('levelAlert.level', { n: 2, blinds: `200 / 300 (BBA 300)` }),
    runout: t('showdown.runout.flop'),
    resultsTitle: t('results.title'), winner: t('results.winner', { name: p(1) }),
    summary: norm([i18n.t('results.hands', { count: 1 }), i18n.t('results.entries', { count: 2 })].join(resources.results.summarySeparator)),
    places: [1, 2].map((count) => t('results.place', { count, ordinal: true })),
    outIn: t('players.eliminatedIn', { n: 1 }), champion: t('results.champion'),
    presets: ['standard', 'turbo', 'deep'].map((id) => t(`presets.${id}.name`)),
    menu: ['home.newTournament', 'home.howTo', 'home.settings', 'home.about'].map((k) => t(k)).join('|'),
    resumeSummary: t('home.summaryPlaying', { hand: 1, level: 2, count: 4 }),
    notStarted: t('home.summaryNotStarted', { count: 2 }),
    howtoTitle: t('howto.title'), settingsTitle: t('settings.title'), aboutTitle: t('about.title'),
    version: t('about.version', { version: '1.0.0' }), soundOff: t('clock.soundOff'), soundOnSetting: t('settings.on'),
    home: t('table.home'),
    H: {
      sb: t('history.sb', { amount: '100' }), bb: t('history.bb', { amount: '200' }), ante: t('history.ante', { amount: '200' }),
      call: (a) => t('history.call', { amount: a }), raise: (a) => t('history.raise', { amount: a }),
      fold: t('history.fold'), check: t('history.check'),
      betAllIn: (a) => norm(i18n.t('history.bet', { amount: a }) + resources.history.allInSuffix),
    },
    sep,
  };
}

export async function expectationsFor(lang: Lang) {
  const base = HAND[lang] ?? (await fromLocale(lang));
  const sep = base.sep ?? ',';
  return {
    ...base,
    sep,
    /** チップ額を、その言語の桁区切りで書く */
    f: (x: number) => String(x).replace(/\B(?=(\d{3})+(?!\d))/g, sep),
    htmlLang: lang,
    languageName: LANGUAGE_NAMES[lang],
  };
}
