import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { setThousandsSeparator } from '../state/format';
// t('...') のキーを型チェックする設定。読み込む側（web・expo-app）でも有効にするため、ここで読み込む
import type {} from './i18next-types';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ptBR from './locales/pt-BR.json';
import ru from './locales/ru.json';
import vi from './locales/vi.json';
import zhHans from './locales/zh-Hans.json';
import zhHant from './locales/zh-Hant.json';

/** 対応している言語（設定画面に並べる順番）。言語コードは BCP 47 の書き方 */
export const LANGUAGES = [
  'ja',
  'en',
  'zh-Hans',
  'zh-Hant',
  'ko',
  'es',
  'pt-BR',
  'fr',
  'de',
  'it',
  'ru',
  'vi',
] as const;
export type Language = (typeof LANGUAGES)[number];

/** 設定画面に出す言語名。どの言語で表示していても読めるように、その言語自身の書き方にする */
export const LANGUAGE_NAMES: Record<Language, string> = {
  ja: '日本語',
  en: 'English',
  'zh-Hans': '简体中文',
  'zh-Hant': '繁體中文',
  ko: '한국어',
  es: 'Español',
  'pt-BR': 'Português (Brasil)',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  ru: 'Русский',
  vi: 'Tiếng Việt',
};

export const RESOURCES: Record<Language, Record<string, unknown>> = {
  ja,
  en,
  'zh-Hans': zhHans,
  'zh-Hant': zhHant,
  ko,
  es,
  'pt-BR': ptBR,
  fr,
  de,
  it,
  ru,
  vi,
};

const FALLBACK: Language = 'en';

/** 保存しておいた値などが、対応している言語かどうか */
export function isLanguage(value: unknown): value is Language {
  return LANGUAGES.includes(value as Language);
}

/** 繁体字を使う地域（台湾・香港・マカオ） */
const HANT_REGIONS = ['tw', 'hk', 'mo'];

/** 1つの言語タグ（例：'zh-TW'）を、対応している言語に当てはめる。当てはまらなければ null */
function matchLanguage(tag: string): Language | null {
  const [base, ...rest] = tag.toLowerCase().split(/[-_]/);
  if (base === 'zh') {
    // 文字の種類（Hans/Hant）が書いてあればそれに従い、なければ地域で決める
    if (rest.includes('hans')) return 'zh-Hans';
    if (rest.includes('hant') || rest.some((r) => HANT_REGIONS.includes(r))) return 'zh-Hant';
    return 'zh-Hans';
  }
  // ポルトガル語はブラジルの書き方の翻訳だけを用意している
  if (base === 'pt') return 'pt-BR';
  return LANGUAGES.find((l) => l === base) ?? null;
}

/**
 * 端末の言語設定（例：['ja-JP', 'en-US']）から、対応している言語を選ぶ。
 * 上から順に見て、どれも対応していなければ英語。
 */
export function detectLanguage(deviceLanguages: readonly string[]): Language {
  for (const tag of deviceLanguages) {
    const match = matchLanguage(tag);
    if (match) return match;
  }
  return FALLBACK;
}

/** 初期化が終わると解決する Promise を返す（スマホ版は待ってから画面を出す） */
export function initI18n(language: Language): Promise<unknown> {
  // 数字の桁区切りを言語に合わせる。画面の描き直しより先に呼ばれるよう、初期化の前に登録する
  i18n.on('languageChanged', () => setThousandsSeparator(i18n.t('common.thousandsSeparator')));
  return i18n.use(initReactI18next).init({
    resources: Object.fromEntries(LANGUAGES.map((l) => [l, { translation: RESOURCES[l] }])),
    lng: language,
    fallbackLng: FALLBACK,
    // 'zh-Hans' の翻訳がないときに 'zh' を探しに行かない（用意しているのは言語コードどおりの翻訳だけ）
    load: 'currentOnly',
    // React が自動でエスケープするので、i18next 側では行わない
    interpolation: { escapeValue: false },
  });
}

export { i18n };
