import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { detectLanguage, i18n, initI18n, type Language } from '@holdem/shared/i18n'
import { getDeviceLanguages, loadLanguage, setDocumentLanguage } from './platform/web'

// 画面を描く前に言語を決める（利用者が選んだ言語 → ブラウザの言語設定 → 英語 の順）
const language = loadLanguage() ?? detectLanguage(getDeviceLanguages())
i18n.on('languageChanged', (lng) => setDocumentLanguage(lng as Language, i18n.t('app.title')))
void initI18n(language)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
