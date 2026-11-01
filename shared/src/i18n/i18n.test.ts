import i18next from 'i18next';
import { describe, expect, it } from 'vitest';
import type { RuleErrorCode } from '../engine';
import type { SetupIssueCode } from '../state/validateSetup';
import { detectLanguage } from './index';
import en from './locales/en.json';
import ja from './locales/ja.json';

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

/** 単数形・複数形・序数の接尾辞（_one、_ordinal_two など）を取り除いた、元のキー */
const baseKey = (key: string) => key.replace(/_(ordinal_)?(zero|one|two|few|many|other)$/, '');
const placeholders = (text: string) => [...text.matchAll(/{{(\w+)}}/g)].map((m) => m[1]).sort();

const jaFlat = flatten(ja);
const enFlat = flatten(en);

function group(flat: Record<string, string>) {
  const map = new Map<string, string[]>();
  for (const [key, text] of Object.entries(flat)) {
    map.set(baseKey(key), [...(map.get(baseKey(key)) ?? []), text]);
  }
  return map;
}

describe('翻訳ファイル', () => {
  const jaGroups = group(jaFlat);
  const enGroups = group(enFlat);

  it('日本語と英語でキーに過不足がない', () => {
    expect([...enGroups.keys()].sort()).toEqual([...jaGroups.keys()].sort());
  });

  it('差し込む値（{{name}} など）が日本語と英語で同じ', () => {
    for (const [key, jaTexts] of jaGroups) {
      const expected = [...new Set(jaTexts.flatMap(placeholders))].sort();
      for (const text of enGroups.get(key) ?? []) {
        // 英語の単数形（"1 entry"）では {{count}} を省くこともあるので、余分がないことだけ確かめる
        expect(placeholders(text).every((p) => expected.includes(p)), `${key}: ${text}`).toBe(true);
      }
      const enAll = [...new Set((enGroups.get(key) ?? []).flatMap(placeholders))].sort();
      expect(enAll, key).toEqual(expected);
    }
  });

  it('空の翻訳がない', () => {
    for (const [key, text] of Object.entries({ ...jaFlat, ...enFlat })) {
      expect(text.trim().length, key).toBeGreaterThan(0);
    }
  });

  it('英語の複数形は one と other の両方がある', () => {
    for (const key of Object.keys(enFlat).filter((k) => k.endsWith('_one'))) {
      expect(enFlat, key).toHaveProperty([key.replace(/_one$/, '_other')]);
    }
  });

  it('エンジンのすべてのエラーコードに翻訳がある', () => {
    const codes: Record<RuleErrorCode, true> = {
      noBigBlind: true, noActor: true, cannotCheck: true, nothingToCall: true, cannotRaise: true,
      exceedsStack: true, belowMinimum: true, notShowdown: true, potNeedsWinner: true,
      winnerNotEligible: true, playerCount: true, handNotFinished: true, notEnoughPlayers: true,
      noHand: true, handNotComplete: true, cannotReenter: true, cannotAddDuringHand: true,
      registrationClosed: true, seatUnavailable: true, noTournament: true,
    };
    for (const code of Object.keys(codes)) {
      expect(jaFlat, code).toHaveProperty([`errors.${code}`]);
      expect(enFlat, code).toHaveProperty([`errors.${code}`]);
    }
  });

  it('設定画面のすべての入力チェックに翻訳がある', () => {
    const codes: Record<SetupIssueCode, true> = {
      playerCount: true, emptyName: true, duplicateName: true, minChip: true, startingStack: true,
      noLevels: true, minutes: true, blindOrder: true, blindMultiple: true, maxEntries: true,
      lastLevel: true,
    };
    for (const code of Object.keys(codes)) {
      expect(jaFlat, code).toHaveProperty([`validation.${code}`]);
      expect(enFlat, code).toHaveProperty([`validation.${code}`]);
    }
  });
});

describe('英語の単数形・複数形・序数', () => {
  const i18n = i18next.createInstance();
  void i18n.init({ resources: { en: { translation: en } }, lng: 'en', initAsync: false });
  const t = i18n.t;

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

describe('ブラウザの言語設定からの判定', () => {
  it('言語設定を上から順に見て、対応している言語を選ぶ', () => {
    expect(detectLanguage(['ja-JP', 'en-US'])).toBe('ja');
    expect(detectLanguage(['en-US', 'ja-JP'])).toBe('en');
    expect(detectLanguage(['fr-FR', 'ja'])).toBe('ja');
    expect(detectLanguage(['en-GB'])).toBe('en');
  });

  it('対応している言語がなければ英語', () => {
    expect(detectLanguage(['fr-FR', 'de-DE'])).toBe('en');
    expect(detectLanguage([])).toBe('en');
  });
});
