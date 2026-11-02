import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { LANGUAGE_NAMES, LANGUAGES, type Language } from '@holdem/shared/i18n';
import { APP_VERSION } from '@holdem/shared/version';
import { Btn, Card, Screen, ScreenHeader, Segmented, T } from './kit';
import { colors } from './theme';

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
        <View style={styles.settingBlock}>
          <T>{t('settings.language')}</T>
          {/* 言語が多いので、2列に並べる */}
          <View style={styles.languageGrid} role="radiogroup" aria-label={t('settings.language')} testID="setting-language">
            {LANGUAGES.map((l) => (
              <Btn
                key={l}
                role="radio"
                variant={l === language ? 'primary' : 'default'}
                selected={l === language}
                onPress={() => onChangeLanguage(l)}
                style={[styles.languageButton, l !== language && { backgroundColor: colors.surface2 }]}
                textStyle={l === language ? undefined : { fontWeight: '400' }}
                testID={`setting-language-${l}`}
              >
                {LANGUAGE_NAMES[l]}
              </Btn>
            ))}
          </View>
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
  settingBlock: { gap: 8, paddingVertical: 8 },
  languageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  // 2列にする（48% にして、すき間の分は flexGrow で埋める）
  languageButton: { width: '48%', flexGrow: 1 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    minHeight: 48,
    flexWrap: 'wrap',
  },
});
