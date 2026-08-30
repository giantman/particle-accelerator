import { RangeRow } from "./RangeRow";
import { CheckboxField } from "./CheckboxField";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, type LoopMode, type ScatterParams } from "../engine/params";

interface LoopGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
  plateCount: number;
}

export function LoopGroup({ params, updateParam, plateCount }: LoopGroupProps) {
  const canLoop = plateCount >= 2;
  return (
    <>
      <CheckboxField
        id="loopEnabled"
        label="Loop through plates"
        checked={params.loopEnabled}
        onCheckedChange={(v) => updateParam("loopEnabled", v)}
        disabled={!canLoop}
      />
      {!canLoop && <p className="text-xs text-muted-foreground">Upload at least 2 plates to loop.</p>}
      {params.loopEnabled && canLoop && (
        <>
          <RangeRow
            id="loopInterval"
            label="Hold time"
            min={0.5}
            max={10}
            step={0.5}
            value={params.loopInterval}
            format={fmt.loopInterval}
            onChange={(v) => updateParam("loopInterval", v)}
          />
          <div className="flex items-center justify-between gap-2.5">
            <Label htmlFor="loopMode" className="w-28 shrink-0 text-xs font-normal text-muted-foreground">
              Order
            </Label>
            <Select value={params.loopMode} onValueChange={(v) => updateParam("loopMode", v as LoopMode)}>
              <SelectTrigger id="loopMode" size="sm" className="flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="forward">Forward</SelectItem>
                <SelectItem value="pingpong">Ping-pong</SelectItem>
                <SelectItem value="shuffle">Shuffle</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </>
      )}
    </>
  );
}
