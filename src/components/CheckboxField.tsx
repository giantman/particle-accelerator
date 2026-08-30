import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface CheckboxFieldProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
}

export function CheckboxField({ id, label, checked, onCheckedChange, disabled }: CheckboxFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(c) => onCheckedChange(c === true)}
        disabled={disabled}
      />
      <Label htmlFor={id} className="text-xs font-normal text-muted-foreground">
        {label}
      </Label>
    </div>
  );
}
