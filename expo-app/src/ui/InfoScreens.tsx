import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import type { Language } from '@holdem/shared/i18n';
import { APP_VERSION } from '@holdem/shared/version';
import { Card, Screen, ScreenHeader, Segmented, T } from './kit';

export function HowToScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const sections = t('howto.sections', { returnObjects: true });
  return (
    <Screen testID="howto">
      <ScreenHeader title={t('howto.title')} onBack={onBack} />
      {sections.map((section) => (
        <Card key={section.title} testID="howto-section">
          <T variant="h2">{section.title}</T>
          {section.items.map((item) => (
            <View key={item} style={styles.bullet}>
              <T>•</T>
              <T style={{ flex: 1 }}>{item}</T>
            </View>
          ))}
        </Card>
      ))}
    </Screen>
  );
}

interface SettingsProps {
  onBack: () => void;
  language: Language;
  onChangeLanguage: (language: Language) => void;
  soundOn: boolean;
  onChangeSound: (on: boolean) => void;
}

export function SettingsScreen({ onBack, language, onChangeLanguage, soundOn, onChangeSound }: SettingsProps) {
  const { t } = useTranslation();
  return (
    <Screen testID="settings">
      <ScreenHeader title={t('settings.title')} onBack={onBack} />
      <Card>
        <View style={styles.settingRow}>
          <T>{t('settings.language')}</T>
          <Segmented
            testID="setting-language"
            value={language}
            options={[
              { value: 'ja', label: '日本語' },
              { value: 'en', label: 'English' },
            ]}
            onChange={onChangeLanguage}
          />
        </View>
        <View style={styles.settingRow}>
          <T>{t('settings.sound')}</T>
          <Segmented
            testID="setting-sound"
            value={soundOn ? 'on' : 'off'}
            options={[
              { value: 'on', label: t('settings.on') },
              { value: 'off', label: t('settings.off') },
            ]}
            onChange={(v) => onChangeSound(v === 'on')}
          />
        </View>
      </Card>
    </Screen>
  );
}

export function AboutScreen({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  const blocks: [string, string][] = [
    [t('about.privacyTitle'), t('about.privacyBody')],
    [t('about.noticeTitle'), t('about.noticeBody')],
    [t('about.rulesTitle'), t('about.rulesBody')],
  ];
  return (
    <Screen testID="about">
      <ScreenHeader title={t('about.title')} onBack={onBack} />
      <Card>
        <T variant="h2">{t('app.title')}</T>
        <T variant="muted" testID="about-version">
          {t('about.version', { version: APP_VERSION })}
        </T>
      </Card>
      {blocks.map(([title, body]) => (
        <Card key={title}>
          <T variant="h2">{title}</T>
          <T>{body}</T>
        </Card>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  bullet: { flexDirection: 'row', gap: 8 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
    flexWrap: 'wrap',
  },
});
