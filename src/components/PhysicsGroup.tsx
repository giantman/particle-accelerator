import { RangeRow } from "./RangeRow";
import { fmt, type ScatterParams } from "../engine/params";

interface PhysicsGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
}

export function PhysicsGroup({ params, updateParam }: PhysicsGroupProps) {
  return (
    <div className="group">
      <h2>PHYSICS</h2>
      <RangeRow
        id="radius"
        label="BLAST RADIUS"
        min={0.04}
        max={0.3}
        step={0.01}
        value={params.radius}
        format={fmt.radius}
        onChange={(v) => updateParam("radius", v)}
      />
      <RangeRow
        id="strength"
        label="BLAST POWER"
        min={0}
        max={3}
        step={0.1}
        value={params.strength}
        format={fmt.strength}
        onChange={(v) => updateParam("strength", v)}
      />
      <RangeRow
        id="swirl"
        label="SWIRL"
        min={0}
        max={1}
        step={0.05}
        value={params.swirl}
        format={fmt.swirl}
        onChange={(v) => updateParam("swirl", v)}
      />
      <RangeRow
        id="spring"
        label="RETURN SPEED"
        min={0.2}
        max={3}
        step={0.1}
        value={params.spring}
        format={fmt.spring}
        onChange={(v) => updateParam("spring", v)}
      />
      <div className="row">
        <span className="check">
          <input
            type="checkbox"
            id="orbit"
            checked={params.orbit}
            onChange={(e) => updateParam("orbit", e.target.checked)}
          />
          <label htmlFor="orbit">ORBIT PARTICLES</label>
        </span>
      </div>
    </div>
  );
}
