import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LANGUAGE_NAMES, LANGUAGES, type Language } from '@holdem/shared/i18n';
import { APP_VERSION } from '@holdem/shared/version';

function InfoLayout({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  const { t } = useTranslation();
  return (
    <div className="screen info">
      <div className="screen-header">
        <button className="link" onClick={onBack}>
          {t('common.back')}
        </button>
        <h1>{title}</h1>
      </div>
      {children}
    </div>
  );
}

export function HowToScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const sections = t('howto.sections', { returnObjects: true });
  return (
    <InfoLayout title={t('howto.title')} onBack={onBack}>
      {sections.map((section) => (
        <section key={section.title} className="card">
          <h2>{section.title}</h2>
          <ul className="bullets">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>
      ))}
    </InfoLayout>
  );
}

interface SettingsProps {
  onBack: () => void;
  language: Language;
  onChangeLanguage: (language: Language) => void;
  soundOn: boolean;
  onChangeSound: (on: boolean) => void;
}

/** 選択肢をボタンで並べる（スマホ版でも同じ作りにするため <select> を使わない） */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="setting-row">
      <span>{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            role="radio"
            aria-checked={o.value === value}
            className={o.value === value ? 'selected' : ''}
            onClick={() => onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SettingsScreen({ onBack, language, onChangeLanguage, soundOn, onChangeSound }: SettingsProps) {
  const { t } = useTranslation();
  return (
    <InfoLayout title={t('settings.title')} onBack={onBack}>
      <section className="card">
        <div className="setting-block">
          <span>{t('settings.language')}</span>
          {/* 言語が多いので、2列に並べる。言語名はその言語の字形で出す（lang） */}
          <div className="language-grid" role="radiogroup" aria-label={t('settings.language')}>
            {LANGUAGES.map((l) => (
              <button
                key={l}
                lang={l}
                role="radio"
                aria-checked={l === language}
                className={l === language ? 'selected' : ''}
                onClick={() => onChangeLanguage(l)}
              >
                {LANGUAGE_NAMES[l]}
              </button>
            ))}
          </div>
        </div>
        <Segmented
          label={t('settings.sound')}
          value={soundOn ? 'on' : 'off'}
          options={[
            { value: 'on', label: t('settings.on') },
            { value: 'off', label: t('settings.off') },
          ]}
          onChange={(v) => onChangeSound(v === 'on')}
        />
      </section>
    </InfoLayout>
  );
}

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <InfoLayout title={t('about.title')} onBack={onBack}>
      <section className="card">
        <h2>{t('app.title')}</h2>
        <p className="muted">{t('about.version', { version: APP_VERSION })}</p>
      </section>
      <section className="card">
        <h2>{t('about.privacyTitle')}</h2>
        <p>{t('about.privacyBody')}</p>
      </section>
      <section className="card">
        <h2>{t('about.noticeTitle')}</h2>
        <p>{t('about.noticeBody')}</p>
      </section>
      <section className="card">
        <h2>{t('about.rulesTitle')}</h2>
        <p>{t('about.rulesBody')}</p>
      </section>
    </InfoLayout>
  );
}
