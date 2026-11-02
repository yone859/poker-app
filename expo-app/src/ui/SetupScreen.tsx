import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, View } from 'react-native';
import {
  levelNumber,
  PRESETS,
  TABLE_SIZE,
  type Preset,
  type StructureItem,
  type TournamentConfig,
} from '@holdem/shared/engine';
import { chips } from '@holdem/shared/state/format';
import { validateSetup } from '@holdem/shared/state/validateSetup';
import { Btn, Card, NumberInput, Row, Screen, ScreenHeader, Segmented, T, TextField } from './kit';
import { colors } from './theme';

interface Props {
  onBack: () => void;
  onStart: (config: TournamentConfig, names: string[], buttonSeat: number) => void;
}

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function SetupScreen({ onBack, onStart }: Props) {
  const { t } = useTranslation();
  const [presetId, setPresetId] = useState<Preset['id']>(PRESETS[0].id);
  const [config, setConfig] = useState<TournamentConfig>(() => copy(PRESETS[0].config));
  const [names, setNames] = useState(() =>
    [1, 2, 3, 4].map((n) => t('setup.defaultPlayerName', { n })),
  );
  /** -1 はランダム */
  const [buttonSeat, setButtonSeat] = useState(-1);
  const [showStructure, setShowStructure] = useState(false);

  const errors = validateSetup(config, names);
  const update = (patch: Partial<TournamentConfig>) => setConfig({ ...config, ...patch });

  function choosePreset(id: Preset['id']) {
    const preset = PRESETS.find((p) => p.id === id)!;
    setPresetId(id);
    setConfig(copy(preset.config));
  }

  function updateItem(index: number, patch: Partial<StructureItem>) {
    const structure = config.structure.map((item, i) =>
      i === index ? ({ ...item, ...patch } as StructureItem) : item,
    );
    update({ structure });
  }

  function addItem(type: StructureItem['type']) {
    const levels = config.structure.filter((s) => s.type === 'level');
    const last = levels[levels.length - 1];
    const item: StructureItem =
      type === 'break'
        ? { type: 'break', minutes: 10 }
        : last
          ? { ...last }
          : { type: 'level', smallBlind: 100, bigBlind: 200, ante: 200, minutes: 20 };
    update({ structure: [...config.structure, item] });
  }

  function start() {
    const trimmed = names.map((n) => n.trim());
    const seat = buttonSeat < 0 ? Math.floor(Math.random() * trimmed.length) : buttonSeat;
    onStart(config, trimmed, seat);
  }

  return (
    <Screen testID="setup">
      <ScreenHeader title={t('setup.title')} onBack={onBack} />

      <Card>
        <T variant="h2">{t('setup.blindStructure')}</T>
        {PRESETS.map((p) => (
          <Btn
            key={p.id}
            selected={p.id === presetId}
            onPress={() => choosePreset(p.id)}
            style={styles.preset}
            textStyle={{ textAlign: 'left' }}
            testID={`preset-${p.id}`}
          >
            <T style={[styles.presetName, p.id === presetId && { color: colors.accent }]}>
              {t(`presets.${p.id}.name`)}
            </T>
            {'\n'}
            <T variant="mutedSmall">{t(`presets.${p.id}.description`)}</T>
          </Btn>
        ))}

        <Btn variant="link" onPress={() => setShowStructure(!showStructure)} testID="toggle-structure">
          {showStructure ? t('setup.hideStructure') : t('setup.showStructure')}
        </Btn>

        {showStructure && (
          <View style={{ gap: 4 }} testID="structure">
            <View style={styles.structureRow}>
              <T variant="mutedSmall" style={styles.colLv}>{t('setup.colLevel')}</T>
              <T variant="mutedSmall" style={styles.colNum}>SB</T>
              <T variant="mutedSmall" style={styles.colNum}>BB</T>
              <T variant="mutedSmall" style={styles.colNum}>BBA</T>
              <T variant="mutedSmall" style={styles.colNum}>{t('setup.colMinutes')}</T>
              <View style={styles.colDel} />
            </View>
            {config.structure.map((item, i) => {
              const remove = () => update({ structure: config.structure.filter((_, j) => j !== i) });
              return item.type === 'level' ? (
                <View style={styles.structureRow} key={i} testID="structure-row">
                  <T variant="muted" style={styles.colLv}>{levelNumber(config.structure, i)}</T>
                  <NumberInput label="SB" value={item.smallBlind} style={styles.colNum} onChange={(v) => updateItem(i, { smallBlind: v })} />
                  <NumberInput label="BB" value={item.bigBlind} style={styles.colNum} onChange={(v) => updateItem(i, { bigBlind: v })} />
                  <NumberInput label="BBA" value={item.ante} style={styles.colNum} onChange={(v) => updateItem(i, { ante: v })} />
                  <NumberInput label={t('setup.colMinutes')} value={item.minutes} style={styles.colNum} onChange={(v) => updateItem(i, { minutes: v })} />
                  <Btn variant="icon" style={styles.colDel} onPress={remove} label={t('common.remove')}>×</Btn>
                </View>
              ) : (
                <View style={styles.structureRow} key={i} testID="structure-row">
                  <T variant="muted" style={styles.colLv}>{t('setup.breakShort')}</T>
                  <T style={[styles.colBreak, { color: colors.accent }]}>{t('clock.break')}</T>
                  <NumberInput label={t('setup.colMinutes')} value={item.minutes} style={styles.colNum} onChange={(v) => updateItem(i, { minutes: v })} />
                  <Btn variant="icon" style={styles.colDel} onPress={remove} label={t('common.remove')}>×</Btn>
                </View>
              );
            })}
            <Row>
              <Btn onPress={() => addItem('level')}>{t('setup.addLevel')}</Btn>
              <Btn onPress={() => addItem('break')}>{t('setup.addBreak')}</Btn>
            </Row>
          </View>
        )}

        <Row wrap style={{ alignItems: 'flex-start' }}>
          <View style={styles.field}>
            <T variant="mutedSmall">{t('setup.startingStack')}</T>
            <NumberInput value={config.startingStack} onChange={(v) => update({ startingStack: v })} testID="starting-stack" />
          </View>
          <View style={styles.field}>
            <T variant="mutedSmall">{t('setup.minChip')}</T>
            <NumberInput value={config.minChip} onChange={(v) => update({ minChip: v })} />
          </View>
        </Row>
      </Card>

      <Card>
        <T variant="h2">{t('setup.reentryTitle')}</T>
        <Row>
          <Switch
            testID="reentry-switch"
            value={config.reentry.enabled}
            onValueChange={(enabled) => update({ reentry: { ...config.reentry, enabled } })}
            trackColor={{ true: colors.accent, false: colors.surface2 }}
            thumbColor={colors.text}
          />
          <T style={{ flex: 1 }}>{t('setup.reentryEnabled')}</T>
        </Row>
        {config.reentry.enabled && (
          <Row wrap style={{ alignItems: 'flex-start' }}>
            <View style={styles.field}>
              <T variant="mutedSmall">{t('setup.reentryLastLevel')}</T>
              <NumberInput
                value={config.reentry.lastLevel}
                onChange={(v) => update({ reentry: { ...config.reentry, lastLevel: v } })}
              />
            </View>
            <View style={styles.field}>
              <T variant="mutedSmall">{t('setup.reentryMaxEntries')}</T>
              <NumberInput
                value={config.reentry.maxEntries ?? 0}
                onChange={(v) => update({ reentry: { ...config.reentry, maxEntries: v === 0 ? null : v } })}
              />
            </View>
          </Row>
        )}
      </Card>

      <Card>
        <T variant="h2">{t('setup.playersTitle', { count: names.length })}</T>
        <T variant="mutedSmall">{t('setup.seatingHint')}</T>
        {names.map((name, i) => (
          <Row key={i}>
            <T variant="muted" style={{ width: 24, textAlign: 'center' }}>{i + 1}</T>
            <TextField
              testID={`player-name-${i}`}
              value={name}
              onChange={(v) => setNames(names.map((n, j) => (j === i ? v : n)))}
            />
            <Btn
              variant="icon"
              label={t('common.remove')}
              disabled={names.length <= 2}
              testID={`remove-player-${i}`}
              onPress={() => {
                setNames(names.filter((_, j) => j !== i));
                setButtonSeat(-1);
              }}
            >
              ×
            </Btn>
          </Row>
        ))}
        <Btn
          disabled={names.length >= TABLE_SIZE}
          onPress={() => setNames([...names, t('setup.defaultPlayerName', { n: names.length + 1 })])}
          testID="add-player"
        >
          {t('setup.addPlayer')}
        </Btn>

        <T variant="mutedSmall">{t('setup.firstButton')}</T>
        <Segmented
          testID="first-button"
          wrap
          value={buttonSeat}
          options={[
            { value: -1, label: t('setup.randomButton') },
            ...names.map((n, i) => ({ value: i, label: n || t('common.seatN', { n: i + 1 }) })),
          ]}
          onChange={setButtonSeat}
        />
      </Card>

      {errors.length > 0 && (
        <View style={styles.errors} testID="setup-errors">
          {errors.map((e) => (
            <T key={`${e.code}-${e.params?.row ?? ''}`} style={{ color: colors.danger, fontSize: 14 }}>
              • {t(`validation.${e.code}`, e.params)}
            </T>
          ))}
        </View>
      )}

      <Btn variant="primary" big disabled={errors.length > 0} onPress={start} testID="start">
        {t('setup.start', { stack: chips(config.startingStack) })}
      </Btn>
    </Screen>
  );
}

const styles = StyleSheet.create({
  preset: { alignItems: 'flex-start', paddingVertical: 10, paddingHorizontal: 12 },
  presetName: { fontWeight: '700' },
  structureRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  colLv: { width: 28, textAlign: 'center' },
  colNum: { flex: 1, paddingHorizontal: 4, fontSize: 14, textAlign: 'right' },
  colBreak: { flex: 3, textAlign: 'center' },
  colDel: { width: 34, minWidth: 34 },
  field: { flexGrow: 1, flexBasis: 140, gap: 4 },
  errors: { padding: 10, borderRadius: 8, backgroundColor: colors.errorBg, gap: 2 },
});
