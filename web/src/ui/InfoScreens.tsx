import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import type { Language } from '@holdem/shared/i18n';
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
        <Segmented
          label={t('settings.language')}
          value={language}
          options={[
            { value: 'ja', label: '日本語' },
            { value: 'en', label: 'English' },
          ]}
          onChange={onChangeLanguage}
        />
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
