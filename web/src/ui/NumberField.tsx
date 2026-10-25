interface Props {
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
  label?: string;
}

export function NumberField({ value, onChange, step = 1, min = 0, label }: Props) {
  return (
    <input
      className="number-field"
      type="number"
      inputMode="numeric"
      aria-label={label}
      value={Number.isNaN(value) ? '' : value}
      step={step}
      min={min}
      onChange={(e) => onChange(e.target.value === '' ? NaN : Number(e.target.value))}
    />
  );
}
