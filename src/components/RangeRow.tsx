interface RangeRowProps {
  id: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}

export function RangeRow({ id, label, min, max, step, value, format, onChange }: RangeRowProps) {
  return (
    <div className="row">
      <label htmlFor={id}>{label}</label>
      <input
        type="range"
        id={id}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(+e.target.value)}
      />
      <output htmlFor={id}>{format(value)}</output>
    </div>
  );
}
