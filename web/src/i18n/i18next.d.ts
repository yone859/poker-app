import 'i18next';
import type ja from './locales/ja.json';

// 日本語の翻訳ファイルを基準に、t('...') のキーを型チェックする（存在しないキーはエラーになる）
declare module 'i18next' {
  interface CustomTypeOptions {
    resources: { translation: typeof ja };
  }
}
