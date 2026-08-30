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
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2.5">
        <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
          {label}
        </Label>
        <output htmlFor={id} className="text-xs tabular-nums text-foreground">
          {format(value)}
        </output>
      </div>
      <Slider
        id={id}
        thumbLabel={label}
        min={min}
        max={max}
        step={step}
        value={[value]}
        onValueChange={([v]) => onChange(v)}
      />
    </div>
  );
}
