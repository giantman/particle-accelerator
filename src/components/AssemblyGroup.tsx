import { RangeRow } from "./RangeRow";
import { Button } from "@/components/ui/button";
import { fmt, type ScatterParams } from "../engine/params";

interface AssemblyGroupProps {
  params: ScatterParams;
  updateParam: <K extends keyof ScatterParams>(key: K, value: ScatterParams[K]) => void;
  replay: () => void;
}

export function AssemblyGroup({ params, updateParam, replay }: AssemblyGroupProps) {
  return (
    <>
      <RangeRow
        id="stagger"
        label="Build time"
        min={0.2}
        max={4}
        step={0.1}
        value={params.stagger}
        format={fmt.stagger}
        onChange={(v) => updateParam("stagger", v)}
      />
      <Button type="button" className="w-full" onClick={replay}>
        Replay assembly
      </Button>
    </>
  );
}
