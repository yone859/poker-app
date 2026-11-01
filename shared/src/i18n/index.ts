import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
// t('...') のキーを型チェックする設定。読み込む側（web・expo-app）でも有効にするため、ここで読み込む
import type {} from './i18next-types';
import en from './locales/en.json';
import ja from './locales/ja.json';

export const LANGUAGES = ['ja', 'en'] as const;
export type Language = (typeof LANGUAGES)[number];

const FALLBACK: Language = 'en';

/**
 * 端末の言語設定（例：['ja-JP', 'en-US']）から、対応している言語を選ぶ。
 * 地域の部分（-JP など）は見ずに言語だけで判断し、どれも対応していなければ英語。
 */
export function detectLanguage(deviceLanguages: readonly string[]): Language {
  for (const tag of deviceLanguages) {
    const base = tag.toLowerCase().split('-')[0];
    const match = LANGUAGES.find((l) => l === base);
    if (match) return match;
  }
  return FALLBACK;
}

export function initI18n(language: Language): void {
  void i18n.use(initReactI18next).init({
    resources: { ja: { translation: ja }, en: { translation: en } },
    lng: language,
    fallbackLng: FALLBACK,
    // React が自動でエスケープするので、i18next 側では行わない
    interpolation: { escapeValue: false },
  });
}

export { i18n };
