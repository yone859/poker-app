import { useState } from 'react';
import { levelNumber, PRESETS, TABLE_SIZE, type StructureItem, type TournamentConfig } from '../engine';
import { chips } from '../state/format';
import { validateSetup } from '../state/validateSetup';
import { NumberField } from './NumberField';

interface Props {
  onStart: (config: TournamentConfig, names: string[], buttonSeat: number) => void;
}

const copy = <T,>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

export function SetupScreen({ onStart }: Props) {
  const [presetId, setPresetId] = useState(PRESETS[0].id);
  const [config, setConfig] = useState<TournamentConfig>(() => copy(PRESETS[0].config));
  const [names, setNames] = useState(['プレイヤー1', 'プレイヤー2', 'プレイヤー3', 'プレイヤー4']);
  /** -1 はランダム */
  const [buttonSeat, setButtonSeat] = useState(-1);
  const [showStructure, setShowStructure] = useState(false);

  const errors = validateSetup(config, names);
  const update = (patch: Partial<TournamentConfig>) => setConfig({ ...config, ...patch });

  function choosePreset(id: string) {
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
      <h1>ホールデム点数付け</h1>

      <section className="card">
        <h2>ブラインド表</h2>
        <div className="preset-list">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              className={`preset ${p.id === presetId ? 'selected' : ''}`}
              onClick={() => choosePreset(p.id)}
            >
              <span className="preset-name">{p.name}</span>
              <span className="preset-desc">{p.description}</span>
            </button>
          ))}
        </div>

        <button className="link" onClick={() => setShowStructure(!showStructure)}>
          {showStructure ? '▲ ブラインド表を閉じる' : '▼ ブラインド表を見る・編集する'}
        </button>

        {showStructure && (
          <div className="structure">
            <div className="structure-row header">
              <span>Lv</span>
              <span>SB</span>
              <span>BB</span>
              <span>BBA</span>
              <span>分</span>
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
                  <NumberField label="BBアンティ" value={item.ante} step={config.minChip}
                    onChange={(v) => updateItem(i, { ante: v })} />
                  <NumberField label="分" value={item.minutes}
                    onChange={(v) => updateItem(i, { minutes: v })} />
                  <button className="icon" aria-label="削除" onClick={remove}>×</button>
                </div>
              ) : (
                <div className="structure-row break" key={i}>
                  <span>休</span>
                  <span className="break-label">休憩</span>
                  <NumberField label="分" value={item.minutes}
                    onChange={(v) => updateItem(i, { minutes: v })} />
                  <button className="icon" aria-label="削除" onClick={remove}>×</button>
                </div>
              );
            })}
            <div className="row gap">
              <button onClick={() => addItem('level')}>＋ レベル</button>
              <button onClick={() => addItem('break')}>＋ 休憩</button>
            </div>
          </div>
        )}

        <div className="field-grid">
          <label>
            初期スタック
            <NumberField value={config.startingStack} step={config.minChip}
              onChange={(v) => update({ startingStack: v })} />
          </label>
          <label>
            最小チップ
            <NumberField value={config.minChip} onChange={(v) => update({ minChip: v })} />
          </label>
        </div>
      </section>

      <section className="card">
        <h2>リエントリー</h2>
        <label className="check">
          <input
            type="checkbox"
            checked={config.reentry.enabled}
            onChange={(e) => update({ reentry: { ...config.reentry, enabled: e.target.checked } })}
          />
          リエントリー・途中参加を受け付ける
        </label>
        {config.reentry.enabled && (
          <div className="field-grid">
            <label>
              締切（このレベルの終わりまで）
              <NumberField value={config.reentry.lastLevel} min={1}
                onChange={(v) => update({ reentry: { ...config.reentry, lastLevel: v } })} />
            </label>
            <label>
              1人の最大エントリー数（0＝無制限）
              <NumberField value={config.reentry.maxEntries ?? 0}
                onChange={(v) =>
                  update({ reentry: { ...config.reentry, maxEntries: v === 0 ? null : v } })
                } />
            </label>
          </div>
        )}
      </section>

      <section className="card">
        <h2>プレイヤー（{names.length}人）</h2>
        <p className="hint">上から順に時計回りで座ります。</p>
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
              aria-label="削除"
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
          onClick={() => setNames([...names, `プレイヤー${names.length + 1}`])}
        >
          ＋ プレイヤーを追加
        </button>

        <label className="stacked">
          最初のボタン
          <select value={buttonSeat} onChange={(e) => setButtonSeat(Number(e.target.value))}>
            <option value={-1}>ランダムに決める</option>
            {names.map((n, i) => (
              <option key={i} value={i}>
                {n || `席${i + 1}`}
              </option>
            ))}
          </select>
        </label>
      </section>

      {errors.length > 0 && (
        <ul className="errors">
          {errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}

      <button className="primary big" disabled={errors.length > 0} onClick={start}>
        {chips(config.startingStack)}点でスタート
      </button>
    </div>
  );
}
