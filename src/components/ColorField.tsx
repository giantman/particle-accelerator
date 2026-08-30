import { Label } from "@/components/ui/label";

interface ColorFieldProps {
  id?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function ColorField({ id, label, value, onChange }: ColorFieldProps) {
  return (
    <div className="flex items-center justify-between gap-2.5">
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
      <input
        type="color"
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-6 w-[34px] cursor-pointer border border-border bg-transparent p-0"
      />
    </div>
  );
}
