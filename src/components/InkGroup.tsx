import { CheckboxField } from "./CheckboxField";
import { ColorField } from "./ColorField";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { MAX_RAMP_STOPS, MIN_RAMP_STOPS, type ScatterParams } from "../engine/params";

interface InkGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
  swapInks: () => void;
}

export function InkGroup({ params, updateParam, swapInks }: InkGroupProps) {
  const stops = params.rampColors;

  const setStop = (i: number, color: string) => {
    const next = [...stops];
    next[i] = color;
    updateParam("rampColors", next);
  };
  const addStop = () => {
    if (stops.length >= MAX_RAMP_STOPS) return;
    updateParam("rampColors", [...stops, stops[stops.length - 1]]);
  };
  const removeStop = (i: number) => {
    if (stops.length <= MIN_RAMP_STOPS) return;
    updateParam(
      "rampColors",
      stops.filter((_, idx) => idx !== i)
    );
  };

  return (
    <>
      {!params.depthRamp && (
        <ColorField id="inkColor" label="Ink" value={params.ink} onChange={(v) => updateParam("ink", v)} />
      )}
      <ColorField id="paperColor" label="Paper" value={params.paper} onChange={(v) => updateParam("paper", v)} />
      <Button type="button" variant="outline" className="w-full" onClick={swapInks} disabled={params.depthRamp}>
        Swap inks
      </Button>

      <CheckboxField
        id="depthRamp"
        label="Depth ramp"
        checked={params.depthRamp}
        onCheckedChange={(v) => updateParam("depthRamp", v)}
      />

      {params.depthRamp && (
        <>
          {stops.map((color, i) => (
            <div className="flex items-center justify-between gap-2.5" key={i}>
              <Label className="w-28 shrink-0 text-xs font-normal text-muted-foreground">Stop {i + 1}</Label>
              <input
                type="color"
                value={color}
                onChange={(e) => setStop(i, e.target.value)}
                className="h-6 w-[34px] cursor-pointer border border-border bg-transparent p-0"
              />
              {stops.length > MIN_RAMP_STOPS && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon-sm"
                  aria-label={`Remove stop ${i + 1}`}
                  onClick={() => removeStop(i)}
                >
                  ×
                </Button>
              )}
            </div>
          ))}
          {stops.length < MAX_RAMP_STOPS && (
            <Button type="button" variant="outline" className="w-full" onClick={addStop}>
              Add color
            </Button>
          )}
        </>
      )}
    </>
  );
}
