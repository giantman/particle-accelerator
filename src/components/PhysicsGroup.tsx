import { RangeRow } from "./RangeRow";
import { CheckboxField } from "./CheckboxField";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt, type OrbitPath, type ScatterParams } from "../engine/params";

interface PhysicsGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
}

export function PhysicsGroup({ params, updateParam }: PhysicsGroupProps) {
  return (
    <>
      <CheckboxField
        id="blastEnabled"
        label="Blast"
        checked={params.blastEnabled}
        onCheckedChange={(v) => updateParam("blastEnabled", v)}
      />
      {params.blastEnabled && (
        <>
          <RangeRow
            id="radius"
            label="Blast radius"
            min={0.04}
            max={0.3}
            step={0.01}
            value={params.radius}
            format={fmt.radius}
            onChange={(v) => updateParam("radius", v)}
          />
          <RangeRow
            id="strength"
            label="Blast power"
            min={0}
            max={3}
            step={0.1}
            value={params.strength}
            format={fmt.strength}
            onChange={(v) => updateParam("strength", v)}
          />
          <RangeRow
            id="falloff"
            label="Falloff"
            min={0}
            max={1}
            step={0.05}
            value={params.falloff}
            format={fmt.falloff}
            onChange={(v) => updateParam("falloff", v)}
          />
          <RangeRow
            id="swirl"
            label="Swirl"
            min={0}
            max={3}
            step={0.1}
            value={params.swirl}
            format={fmt.swirl}
            onChange={(v) => updateParam("swirl", v)}
          />
          <CheckboxField
            id="attract"
            label="Attract (magnet)"
            checked={params.attract}
            onCheckedChange={(v) => updateParam("attract", v)}
          />
        </>
      )}
      <RangeRow
        id="spring"
        label="Return speed"
        min={0.2}
        max={3}
        step={0.1}
        value={params.spring}
        format={fmt.spring}
        onChange={(v) => updateParam("spring", v)}
      />
      <CheckboxField
        id="orbit"
        label="Orbit particles"
        checked={params.orbit}
        onCheckedChange={(v) => updateParam("orbit", v)}
      />
      {params.orbit && (
        <>
          <RangeRow
            id="orbitStrength"
            label="Orbit strength"
            min={0}
            max={8}
            step={0.2}
            value={params.orbitStrength}
            format={fmt.orbitStrength}
            onChange={(v) => updateParam("orbitStrength", v)}
          />
          <RangeRow
            id="orbitSpeed"
            label="Orbit speed"
            min={0.1}
            max={4}
            step={0.1}
            value={params.orbitSpeed}
            format={fmt.orbitSpeed}
            onChange={(v) => updateParam("orbitSpeed", v)}
          />
          <div className="flex items-center justify-between gap-2.5">
            <Label htmlFor="orbitPath" className="w-28 shrink-0 text-xs font-normal text-muted-foreground">
              Orbit path
            </Label>
            <Select value={params.orbitPath} onValueChange={(v) => updateParam("orbitPath", v as OrbitPath)}>
              <SelectTrigger id="orbitPath" size="sm" className="flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="circle">Circle</SelectItem>
                <SelectItem value="figure8">Figure 8</SelectItem>
                <SelectItem value="noisy">Noisy</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <RangeRow
            id="orbitEccentricity"
            label="Orbit eccentricity"
            min={0}
            max={0.9}
            step={0.05}
            value={params.orbitEccentricity}
            format={fmt.orbitEccentricity}
            onChange={(v) => updateParam("orbitEccentricity", v)}
          />
          {params.orbitEccentricity > 0 && (
            <RangeRow
              id="orbitAngle"
              label="Orbit angle"
              min={0}
              max={180}
              step={5}
              value={params.orbitAngle}
              format={fmt.orbitAngle}
              onChange={(v) => updateParam("orbitAngle", v)}
            />
          )}
          <RangeRow
            id="orbitDepthLink"
            label="Orbit depth link"
            min={0}
            max={1}
            step={0.05}
            value={params.orbitDepthLink}
            format={fmt.orbitDepthLink}
            onChange={(v) => updateParam("orbitDepthLink", v)}
          />
        </>
      )}
      <RangeRow
        id="turbulence"
        label="Turbulence"
        min={0}
        max={1}
        step={0.05}
        value={params.turbulence}
        format={fmt.turbulence}
        onChange={(v) => updateParam("turbulence", v)}
      />
      <RangeRow
        id="gravity"
        label="Gravity"
        min={0}
        max={2}
        step={0.1}
        value={params.gravity}
        format={fmt.gravity}
        onChange={(v) => updateParam("gravity", v)}
      />
      {params.gravity > 0 && (
        <RangeRow
          id="gravityAngle"
          label="Gravity angle"
          min={0}
          max={360}
          step={5}
          value={params.gravityAngle}
          format={fmt.gravityAngle}
          onChange={(v) => updateParam("gravityAngle", v)}
        />
      )}
      <RangeRow
        id="depthWeight"
        label="Depth weight"
        min={0}
        max={1}
        step={0.05}
        value={params.depthWeight}
        format={fmt.depthWeight}
        onChange={(v) => updateParam("depthWeight", v)}
      />
    </>
  );
}
