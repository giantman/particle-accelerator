import { RangeRow } from "./RangeRow";
import { fmt, type ScatterParams } from "../engine/params";

interface AssemblyGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
  replay: () => void;
}

export function AssemblyGroup({ params, updateParam, replay }: AssemblyGroupProps) {
  return (
    <div className="group">
      <h2>ASSEMBLY</h2>
      <RangeRow
        id="stagger"
        label="BUILD TIME"
        min={0.2}
        max={4}
        step={0.1}
        value={params.stagger}
        format={fmt.stagger}
        onChange={(v) => updateParam("stagger", v)}
      />
      <button className="btn" type="button" onClick={replay}>
        REPLAY ASSEMBLY
      </button>
    </div>
  );
}
