import { RangeRow } from "./RangeRow";
import { CheckboxField } from "./CheckboxField";
import { Button } from "@/components/ui/button";
import { fmt, type ScatterParams } from "../engine/params";

interface FieldGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
  wellCount: number;
  onClearWells: () => void;
}

export function FieldGroup({ params, updateParam, wellCount, onClearWells }: FieldGroupProps) {
  return (
    <>
      <CheckboxField
        id="windEnabled"
        label="Wind"
        checked={params.windEnabled}
        onCheckedChange={(v) => updateParam("windEnabled", v)}
      />
      {params.windEnabled && (
        <>
          <RangeRow
            id="windStrength"
            label="Wind strength"
            min={0}
            max={3}
            step={0.1}
            value={params.windStrength}
            format={fmt.windStrength}
            onChange={(v) => updateParam("windStrength", v)}
          />
          <RangeRow
            id="windSpeed"
            label="Wind speed"
            min={0.1}
            max={3}
            step={0.1}
            value={params.windSpeed}
            format={fmt.windSpeed}
            onChange={(v) => updateParam("windSpeed", v)}
          />
          <RangeRow
            id="windAngle"
            label="Wind direction"
            min={0}
            max={360}
            step={5}
            value={params.windAngle}
            format={fmt.windAngle}
            onChange={(v) => updateParam("windAngle", v)}
          />
        </>
      )}

      <CheckboxField
        id="magnetEnabled"
        label="Cursor magnet"
        checked={params.magnetEnabled}
        onCheckedChange={(v) => updateParam("magnetEnabled", v)}
      />
      {params.magnetEnabled && (
        <>
          <RangeRow
            id="magnetStrength"
            label="Magnet strength"
            min={0}
            max={3}
            step={0.1}
            value={params.magnetStrength}
            format={fmt.magnetStrength}
            onChange={(v) => updateParam("magnetStrength", v)}
          />
          <RangeRow
            id="magnetRadius"
            label="Magnet radius"
            min={0.04}
            max={0.4}
            step={0.01}
            value={params.magnetRadius}
            format={fmt.magnetRadius}
            onChange={(v) => updateParam("magnetRadius", v)}
          />
          <CheckboxField
            id="magnetAttract"
            label="Attract (uncheck to repel)"
            checked={params.magnetAttract}
            onCheckedChange={(v) => updateParam("magnetAttract", v)}
          />
        </>
      )}

      <CheckboxField
        id="rippleEnabled"
        label="Click ripples"
        checked={params.rippleEnabled}
        onCheckedChange={(v) => updateParam("rippleEnabled", v)}
      />
      {params.rippleEnabled && (
        <>
          <RangeRow
            id="rippleStrength"
            label="Ripple strength"
            min={0}
            max={3}
            step={0.1}
            value={params.rippleStrength}
            format={fmt.rippleStrength}
            onChange={(v) => updateParam("rippleStrength", v)}
          />
          <RangeRow
            id="rippleSpeed"
            label="Ripple speed"
            min={0.3}
            max={3}
            step={0.1}
            value={params.rippleSpeed}
            format={fmt.rippleSpeed}
            onChange={(v) => updateParam("rippleSpeed", v)}
          />
        </>
      )}

      <CheckboxField
        id="wellsEnabled"
        label="Gravity wells"
        checked={params.wellsEnabled}
        onCheckedChange={(v) => updateParam("wellsEnabled", v)}
      />
      {params.wellsEnabled && (
        <>
          <p className="text-xs text-muted-foreground">
            Click the canvas to drop a well · {wellCount}/3 placed
          </p>
          <RangeRow
            id="wellStrength"
            label="Well strength"
            min={0}
            max={3}
            step={0.1}
            value={params.wellStrength}
            format={fmt.wellStrength}
            onChange={(v) => updateParam("wellStrength", v)}
          />
          <RangeRow
            id="wellRadius"
            label="Well radius"
            min={0.08}
            max={0.6}
            step={0.02}
            value={params.wellRadius}
            format={fmt.wellRadius}
            onChange={(v) => updateParam("wellRadius", v)}
          />
          <CheckboxField
            id="wellAttract"
            label="Attract (uncheck to repel)"
            checked={params.wellAttract}
            onCheckedChange={(v) => updateParam("wellAttract", v)}
          />
          <Button type="button" variant="outline" size="sm" onClick={onClearWells} disabled={wellCount === 0}>
            Clear wells
          </Button>
        </>
      )}
    </>
  );
}
