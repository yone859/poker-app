import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import type { RuleErrorCode } from '../engine';
import { chips } from '../state/format';
import type { SetupIssueCode } from '../state/validateSetup';
import { detectLanguage, i18n, initI18n, isLanguage, LANGUAGE_NAMES, LANGUAGES, RESOURCES, type Language } from './index';

type Json = string | Json[] | { [key: string]: Json };

/** { a: { b: 'x' }, c: ['y'] } → { 'a.b': 'x', 'c.0': 'y' }（配列は番号をキーにする） */
function flatten(value: Json, prefix = ''): Record<string, string> {
  if (typeof value === 'string') return { [prefix]: value };
  const entries: [string, Json][] = Array.isArray(value)
    ? value.map((v, i) => [String(i), v])
    : Object.entries(value);
  return entries.reduce<Record<string, string>>(
    (acc, [k, v]) => ({ ...acc, ...flatten(v, prefix ? `${prefix}.${k}` : k) }),
    {},
  );
}

const SUFFIX = /_(ordinal_)?(zero|one|two|few|many|other)$/;
/** 単数形・複数形・序数の接尾辞（_one、_ordinal_two など）を取り除いた、元のキー */
const baseKey = (key: string) => key.replace(SUFFIX, '');
const placeholders = (text: string) => [...text.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort();
/** <b> などのタグ（<Trans> で部品に置き換える） */
const tags = (text: string) => [...text.matchAll(/<\/?(\w+)>/g)].map((m) => m[0]).sort();

const flat = Object.fromEntries(LANGUAGES.map((l) => [l, flatten(RESOURCES[l] as Json)])) as Record<
  Language,
  Record<string, string>
>;

function group(texts: Record<string, string>) {
  const map = new Map<string, string[]>();
  for (const [key, text] of Object.entries(texts)) {
    map.set(baseKey(key), [...(map.get(baseKey(key)) ?? []), text]);
  }
  return map;
}

// 日本語を基準に、ほかの言語を比べる
const jaGroups = group(flat.ja);
/** 順位（序数）として使う言葉。英語の翻訳で _ordinal_ が付いているもの */
const ORDINAL_KEYS = new Set(Object.keys(flat.en).filter((k) => k.includes('_ordinal_')).map(baseKey));
const OTHERS = LANGUAGES.filter((l) => l !== 'ja');

describe('翻訳ファイル', () => {
  it('対応している言語すべてに、翻訳ファイルと言語名がある', () => {
    for (const lang of LANGUAGES) {
      expect(RESOURCES[lang], lang).toBeDefined();
      expect(LANGUAGE_NAMES[lang], lang).toBeTruthy();
    }
  });

  it.each(OTHERS)('%s：日本語とキーに過不足がない', (lang) => {
    expect([...group(flat[lang]).keys()].sort()).toEqual([...jaGroups.keys()].sort());
  });

  it.each(OTHERS)('%s：差し込む値（{{name}} など）とタグが日本語と同じ', (lang) => {
    const groups = group(flat[lang]);
    for (const [key, jaTexts] of jaGroups) {
      const expected = [...new Set(jaTexts.flatMap(placeholders))].sort();
      const texts = groups.get(key) ?? [];
      for (const text of texts) {
        // 単数形（"1 entry"）では {{count}} を省くこともあるので、余分がないことだけ確かめる
        expect(placeholders(text).every((p) => expected.includes(p)), `${key}: ${text}`).toBe(true);
        expect(tags(text), `${key}: ${text}`).toEqual(tags(jaTexts[0]));
      }
      expect([...new Set(texts.flatMap(placeholders))].sort(), key).toEqual(expected);
    }
  });

  it.each(LANGUAGES)('%s：空の翻訳がない', (lang) => {
    for (const [key, text] of Object.entries(flat[lang])) {
      // 桁区切りは空白（フランス語・ロシア語）のこともあるので、長さだけ見る
      const length = key === 'common.thousandsSeparator' ? text.length : text.trim().length;
      expect(length, key).toBeGreaterThan(0);
    }
  });

  it.each(LANGUAGES)('%s：単数形・複数形・序数は、その言語に必要な形がすべてそろっている', (lang) => {
    const cardinal = new Intl.PluralRules(lang).resolvedOptions().pluralCategories;
    const ordinal = new Intl.PluralRules(lang, { type: 'ordinal' }).resolvedOptions().pluralCategories;
    const keys = Object.keys(flat[lang]);
    for (const base of new Set(keys.filter((k) => SUFFIX.test(k)).map(baseKey))) {
      const isOrdinal = keys.some((k) => k.startsWith(`${base}_ordinal_`));
      const needed = (isOrdinal ? ordinal : cardinal).map((c) => `${base}_${isOrdinal ? 'ordinal_' : ''}${c}`);
      expect(keys.filter((k) => baseKey(k) === base).sort(), base).toEqual(needed.sort());
    }
    // 形が1つしかない言語（日本語・中国語など）以外は、英語で数え分けている言葉を数え分ける
    if (cardinal.length > 1) {
      const counted = Object.keys(flat.en).filter((k) => /[^_]+_one$/.test(k) && !k.includes('_ordinal_')).map(baseKey);
      for (const base of counted) expect(keys, `${lang}: ${base}`).toContain(`${base}_other`);
    }
  });

  it.each(LANGUAGES)('%s：エンジンのすべてのエラーコードと、設定画面のすべての入力チェックに翻訳がある', (lang) => {
    const errors: Record<RuleErrorCode, true> = {
      noBigBlind: true, noActor: true, cannotCheck: true, nothingToCall: true, cannotRaise: true,
      exceedsStack: true, belowMinimum: true, notShowdown: true, potNeedsWinner: true,
      winnerNotEligible: true, playerCount: true, handNotFinished: true, notEnoughPlayers: true,
      noHand: true, handNotComplete: true, cannotReenter: true, cannotAddDuringHand: true,
      registrationClosed: true, seatUnavailable: true, noTournament: true,
    };
    const issues: Record<SetupIssueCode, true> = {
      playerCount: true, emptyName: true, duplicateName: true, minChip: true, startingStack: true,
      noLevels: true, minutes: true, blindOrder: true, blindMultiple: true, maxEntries: true,
      lastLevel: true,
    };
    for (const code of Object.keys(errors)) expect(flat[lang], code).toHaveProperty([`errors.${code}`]);
    for (const code of Object.keys(issues)) expect(flat[lang], code).toHaveProperty([`validation.${code}`]);
  });

  it.each(LANGUAGES)('%s：英語に頼らず、その言語だけですべての表示ができる', async (lang) => {
    // 英語への切り替え（fallback）をなくすと、翻訳が見つからないときはキーがそのまま返る
    const instance = i18next.createInstance();
    await instance.init({
      resources: { [lang]: { translation: RESOURCES[lang] } },
      lng: lang,
      fallbackLng: false,
      load: 'currentOnly',
      interpolation: { escapeValue: false },
    });
    const t = instance.t as (key: string, options?: Record<string, unknown>) => string;
    for (const key of jaGroups.keys()) {
      if (key.startsWith('howto.sections')) continue; // 配列は下でまとめて見る
      // 順位は序数（1st、2nd…）、それ以外は個数として、いろいろな数で試す
      const ordinal = ORDINAL_KEYS.has(key);
      for (const count of [0, 1, 2, 3, 5, 11, 21, 22, 101, 1_000_000]) {
        const text = t(key, { count, ordinal, n: 1, name: 'A', names: 'A', amount: '1', min: '1', max: '2',
          pot: 1, row: 1, chip: 1, stack: '1', toCall: '1', blinds: '1', minutes: 5, hand: 1, level: 1, version: '1' });
        expect(text, `${key} (${count})`).not.toBe(key);
        expect(text, key).not.toMatch(/{{|}}|undefined/);
      }
    }
    const sections = instance.t('howto.sections', { returnObjects: true }) as unknown;
    expect(Array.isArray(sections), 'howto.sections').toBe(true);
  });
});

describe('英語の単数形・複数形・序数', () => {
  const instance = i18next.createInstance();
  void instance.init({ resources: { en: { translation: RESOURCES.en } }, lng: 'en', initAsync: false });
  const t = instance.t as (key: string, options?: Record<string, unknown>) => string;

  it('単数形と複数形を出し分ける', () => {
    expect(t('players.entries', { count: 1 })).toBe('1 entry');
    expect(t('players.entries', { count: 2 })).toBe('2 entries');
    expect(t('results.hands', { count: 1 })).toBe('1 hand');
    expect(t('results.hands', { count: 12 })).toBe('12 hands');
  });

  it('順位を序数で表示する', () => {
    const places = [1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 101].map((n) =>
      t('results.place', { count: n, ordinal: true }),
    );
    expect(places).toEqual(['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '101st']);
  });
});

describe('ほかの言語の数え分け', () => {
  async function tFor(lang: Language) {
    const instance = i18next.createInstance();
    await instance.init({ resources: { [lang]: { translation: RESOURCES[lang] } }, lng: lang, load: 'currentOnly' });
    return instance.t as (key: string, options?: Record<string, unknown>) => string;
  }

  it('ロシア語は 1・2〜4・5以上 で形が変わる', async () => {
    const t = await tFor('ru');
    expect([1, 2, 5, 11, 21, 22, 25].map((count) => t('results.hands', { count }))).toEqual([
      '1 раздача', '2 раздачи', '5 раздач', '11 раздач', '21 раздача', '22 раздачи', '25 раздач',
    ]);
  });

  it('フランス語の順位は 1er・2e', async () => {
    const t = await tFor('fr');
    expect([1, 2, 3].map((count) => t('results.place', { count, ordinal: true }))).toEqual(['1er', '2e', '3e']);
  });

  it('中国語・韓国語は数で形が変わらない', async () => {
    expect((await tFor('zh-Hans'))('results.place', { count: 1, ordinal: true })).toBe('第 1 名');
    expect((await tFor('ko'))('results.place', { count: 2, ordinal: true })).toBe('2위');
  });
});

describe('数字の桁区切り', () => {
  it('表示している言語に合わせて変わる', async () => {
    await initI18n('en');
    expect(chips(1234567)).toBe('1,234,567');
    await i18n.changeLanguage('de');
    expect(chips(25000)).toBe('25.000');
    await i18n.changeLanguage('fr');
    expect(chips(25000)).toBe('25 000');
    await i18n.changeLanguage('ja');
    expect(chips(25000)).toBe('25,000');
  });
});

describe('端末・ブラウザの言語設定からの判定', () => {
  it('言語設定を上から順に見て、対応している言語を選ぶ', () => {
    expect(detectLanguage(['ja-JP', 'en-US'])).toBe('ja');
    expect(detectLanguage(['en-US', 'ja-JP'])).toBe('en');
    expect(detectLanguage(['ar-SA', 'ja'])).toBe('ja');
    expect(detectLanguage(['en-GB'])).toBe('en');
    expect(detectLanguage(['fr-CA'])).toBe('fr');
    expect(detectLanguage(['de-AT'])).toBe('de');
    expect(detectLanguage(['ko-KR'])).toBe('ko');
    expect(detectLanguage(['es-MX'])).toBe('es');
    expect(detectLanguage(['ru-RU'])).toBe('ru');
    expect(detectLanguage(['vi-VN'])).toBe('vi');
    expect(detectLanguage(['it-IT'])).toBe('it');
  });

  it('中国語は簡体字か繁体字かを見分ける', () => {
    expect(detectLanguage(['zh-CN'])).toBe('zh-Hans');
    expect(detectLanguage(['zh-SG'])).toBe('zh-Hans');
    expect(detectLanguage(['zh'])).toBe('zh-Hans');
    expect(detectLanguage(['zh-Hans-HK'])).toBe('zh-Hans');
    expect(detectLanguage(['zh-TW'])).toBe('zh-Hant');
    expect(detectLanguage(['zh-HK'])).toBe('zh-Hant');
    expect(detectLanguage(['zh-Hant-TW'])).toBe('zh-Hant');
    expect(detectLanguage(['zh_TW'])).toBe('zh-Hant');
  });

  it('ポルトガル語はどの地域でもブラジルの翻訳を使う', () => {
    expect(detectLanguage(['pt-BR'])).toBe('pt-BR');
    expect(detectLanguage(['pt-PT'])).toBe('pt-BR');
  });

  it('対応している言語がなければ英語', () => {
    expect(detectLanguage(['ar-SA', 'he-IL'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });

  it('保存してある値が対応している言語か確かめる', () => {
    expect(isLanguage('zh-Hant')).toBe(true);
    expect(isLanguage('pt-BR')).toBe(true);
    expect(isLanguage('pt')).toBe(false);
    expect(isLanguage(null)).toBe(false);
  });
});
