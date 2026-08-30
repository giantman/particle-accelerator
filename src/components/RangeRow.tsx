import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

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
    <div className="flex items-center gap-2.5">
      <Label htmlFor={id} className="w-28 shrink-0 text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <Slider
        id={id}
        thumbLabel={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        className="flex-1"
      />
      <output htmlFor={id} className="w-11 shrink-0 text-right text-xs tabular-nums text-foreground">
        {format(value)}
      </output>
    </div>
  );
}
