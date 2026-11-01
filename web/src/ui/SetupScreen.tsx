import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  levelNumber,
  PRESETS,
  TABLE_SIZE,
  type Preset,
  type StructureItem,
  type TournamentConfig,
} from '../engine';
import type { Language } from '../i18n';
import { chips } from '../state/format';
import { validateSetup } from '../state/validateSetup';
import { NumberField } from './NumberField';

interface Props {
  language: Language;
  onChangeLanguage: (language: Language) => void;
  onStart: (config: TournamentConfig, names: string[], buttonSeat: number) => void;
}

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function SetupScreen({ language, onChangeLanguage, onStart }: Props) {
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
    <div className="screen setup">
      <div className="row between gap">
        <h1>{t('app.title')}</h1>
        <select
          className="language-select"
          aria-label={t('language.label')}
          value={language}
          onChange={(e) => onChangeLanguage(e.target.value as Language)}
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
      </div>

      <section className="card">
        <h2>{t('setup.blindStructure')}</h2>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset ${p.id === presetId ? 'selected' : ''}`}
              onClick={() => choosePreset(p.id)}
            >
              <span className="preset-name">{t(`presets.${p.id}.name`)}</span>
              <span className="preset-desc">{t(`presets.${p.id}.description`)}</span>
            </button>
          ))}
        </div>

        <button className="link" onClick={() => setShowStructure(!showStructure)}>
          {showStructure ? t('setup.hideStructure') : t('setup.showStructure')}
        </button>

        {showStructure && (
          <div className="structure">
            <div className="structure-row header">
              <span>{t('setup.colLevel')}</span>
              <span>SB</span>
              <span>BB</span>
              <span>BBA</span>
              <span>{t('setup.colMinutes')}</span>
              <span />
            </div>
            {config.structure.map((item, i) => {
              const remove = () =>
                update({ structure: config.structure.filter((_, j) => j !== i) });
              return item.type === 'level' ? (
                <div className="structure-row" key={i}>
                  <span>{levelNumber(config.structure, i)}</span>
                  <NumberField label="SB" value={item.smallBlind} step={config.minChip}
                    onChange={(v) => updateItem(i, { smallBlind: v })} />
                  <NumberField label="BB" value={item.bigBlind} step={config.minChip}
                    onChange={(v) => updateItem(i, { bigBlind: v })} />
                  <NumberField label="BBA" value={item.ante} step={config.minChip}
                    onChange={(v) => updateItem(i, { ante: v })} />
                  <NumberField label={t('setup.colMinutes')} value={item.minutes}
                    onChange={(v) => updateItem(i, { minutes: v })} />
                  <button className="icon" aria-label={t('common.remove')} onClick={remove}>×</button>
                </div>
              ) : (
                <div className="structure-row break" key={i}>
                  <span>{t('setup.breakShort')}</span>
                  <span className="break-label">{t('clock.break')}</span>
                  <NumberField label={t('setup.colMinutes')} value={item.minutes}
                    onChange={(v) => updateItem(i, { minutes: v })} />
                  <button className="icon" aria-label={t('common.remove')} onClick={remove}>×</button>
                </div>
              );
            })}
            <div className="row gap">
              <button onClick={() => addItem('level')}>{t('setup.addLevel')}</button>
              <button onClick={() => addItem('break')}>{t('setup.addBreak')}</button>
            </div>
          </div>
        )}

        <div className="field-grid">
          <label>
            {t('setup.startingStack')}
            <NumberField value={config.startingStack} step={config.minChip}
              onChange={(v) => update({ startingStack: v })} />
          </label>
          <label>
            {t('setup.minChip')}
            <NumberField value={config.minChip} onChange={(v) => update({ minChip: v })} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>{t('setup.reentryTitle')}</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={config.reentry.enabled}
            onChange={(e) => update({ reentry: { ...config.reentry, enabled: e.target.checked } })}
          />
          {t('setup.reentryEnabled')}
        </label>
        {config.reentry.enabled && (
          <div className="field-grid">
            <label>
              {t('setup.reentryLastLevel')}
              <NumberField value={config.reentry.lastLevel} min={1}
                onChange={(v) => update({ reentry: { ...config.reentry, lastLevel: v } })} />
            </label>
            <label>
              {t('setup.reentryMaxEntries')}
              <NumberField value={config.reentry.maxEntries ?? 0}
                onChange={(v) =>
                  update({ reentry: { ...config.reentry, maxEntries: v === 0 ? null : v } })
                } />
            </label>
          </div>
        )}
      </section>

      <section className="card">
        <h2>{t('setup.playersTitle', { count: names.length })}</h2>
        <p className="hint">{t('setup.seatingHint')}</p>
        {names.map((name, i) => (
          <div className="row gap" key={i}>
            <span className="seat-no">{i + 1}</span>
            <input
              className="text-field"
              value={name}
              onChange={(e) => setNames(names.map((n, j) => (j === i ? e.target.value : n)))}
            />
            <button
              className="icon"
              aria-label={t('common.remove')}
              disabled={names.length <= 2}
              onClick={() => {
                setNames(names.filter((_, j) => j !== i));
                setButtonSeat(-1);
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          disabled={names.length >= TABLE_SIZE}
          onClick={() => setNames([...names, t('setup.defaultPlayerName', { n: names.length + 1 })])}
        >
          {t('setup.addPlayer')}
        </button>

        <label className="stacked">
          {t('setup.firstButton')}
          <select value={buttonSeat} onChange={(e) => setButtonSeat(Number(e.target.value))}>
            <option value={-1}>{t('setup.randomButton')}</option>
            {names.map((n, i) => (
              <option key={i} value={i}>
                {n || t('common.seatN', { n: i + 1 })}
              </option>
            ))}
          </select>
        </label>
      </section>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e) => (
            <li key={`${e.code}-${e.params?.row ?? ''}`}>{t(`validation.${e.code}`, e.params)}</li>
          ))}
        </ul>
      )}

      <button className="primary big" disabled={errors.length > 0} onClick={start}>
        {t('setup.start', { stack: chips(config.startingStack) })}
      </button>
    </div>
  );
}
